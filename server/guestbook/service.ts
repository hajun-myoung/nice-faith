import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  FieldPath,
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import {
  validateEntry,
  visitTypes,
  type EntryPage,
  type PublicEntry,
  type ReportReason,
  reportReasons,
} from "../../src/domain/guestbook.js";

const DAY = 86_400_000;
const WINDOW = 600_000;
export class GuestbookError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export function secureEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export const validId = (id: unknown): id is string =>
  typeof id === "string" && /^[a-zA-Z0-9_-]{20,80}$/.test(id);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const expired = (value: unknown, now: number) =>
  value instanceof Timestamp && value.toMillis() <= now;
export class GuestbookService {
  constructor(
    private db: Firestore,
    private secret: string,
    private clock = Date.now,
  ) {}
  sign(value: string) {
    return createHmac("sha256", this.secret).update(value).digest("base64url");
  }
  private guards() {
    return this.db.collection("guestbookRequestGuards");
  }
  private entries() {
    return this.db.collection("guestbookEntries");
  }
  private reports() {
    return this.db.collection("guestbookReports");
  }
  private async limits(
    tx: Transaction,
    identity: string,
    ip: string,
    action: "create" | "report",
    now: number,
  ) {
    const bucket = Math.floor(now / WINDOW);
    const day = Math.floor(now / DAY);
    const refs = [
      this.guards().doc(this.sign(`${action}:anon:${identity}:${bucket}`)),
      this.guards().doc(
        this.sign(`${action}:ip:${this.sign(`ip-day:${day}`)}:${ip}:${bucket}`),
      ),
    ];
    const snapshots = await tx.getAll(...refs);
    const maxima = action === "create" ? [3, 60] : [10, 120];
    snapshots.forEach((snapshot, index) => {
      if ((snapshot.data()?.count ?? 0) >= maxima[index])
        throw new GuestbookError(
          429,
          "요청이 많습니다. 10분 뒤 다시 시도해 주세요.",
        );
    });
    return () =>
      snapshots.forEach((snapshot, index) =>
        tx.set(refs[index], {
          count: (snapshot.data()?.count ?? 0) + 1,
          expiresAt: Timestamp.fromMillis((bucket + 1) * WINDOW),
        }),
      );
  }
  async create(raw: unknown, identity: string, ip: string) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new GuestbookError(400, "입력 내용을 확인해 주세요.");
    const data = raw as Record<string, unknown>;
    if (
      Object.keys(data).some(
        (key) => !["requestId", "submittedAt", "input"].includes(key),
      ) ||
      typeof data.requestId !== "string" ||
      !/^[a-f0-9]{64}$/.test(data.requestId) ||
      typeof data.submittedAt !== "number" ||
      !Number.isSafeInteger(data.submittedAt)
    )
      throw new GuestbookError(400, "잘못된 등록 요청입니다.");
    const validated = validateEntry(data.input);
    if (!validated.input)
      throw new GuestbookError(
        400,
        "입력 내용을 확인해 주세요.",
        validated.errors,
      );
    const now = this.clock();
    if (data.submittedAt > now)
      throw new GuestbookError(
        400,
        "요청 시각이 올바르지 않습니다. 기기 시계를 확인해 주세요.",
      );
    if (data.submittedAt <= now - DAY)
      throw new GuestbookError(
        400,
        "재시도 기간(24시간)이 지났습니다. 새로 작성해 주세요.",
      );
    const input = validated.input;
    // The high-entropy request seed is a private retry capability. Hash it independently
    // of cookies and server key rotation so an interrupted submission keeps its rights.
    const key = hash(`create:${data.requestId}`);
    const guard = this.guards().doc(key);
    const entry = this.entries().doc(key);
    const token = createHash("sha256")
      .update(`delete:${data.requestId}`)
      .digest("base64url");
    const digest = hash(JSON.stringify([input, data.submittedAt]));
    return this.db.runTransaction(async (tx) => {
      const previous = await tx.get(guard);
      if (previous.exists) {
        if (previous.data()?.digest !== digest)
          throw new GuestbookError(
            409,
            "이미 사용한 요청입니다. 새로 작성해 주세요.",
          );
        if (!(await tx.get(entry)).exists)
          throw new GuestbookError(410, "이미 삭제된 발자취입니다.");
        return { id: entry.id, token };
      }
      // A surviving document also prevents recreation when a guard was manually removed.
      if ((await tx.get(entry)).exists)
        throw new GuestbookError(409, "이미 사용한 요청입니다.");
      const applyLimits = await this.limits(tx, identity, ip, "create", now);
      applyLimits();
      tx.create(entry, {
        visitType: input.visitType,
        nickname: input.nickname,
        community: input.community,
        message: input.message,
        status: "pending",
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + 30 * DAY),
        deleteTokenHash: hash(token),
      });
      tx.create(guard, {
        digest,
        expiresAt: Timestamp.fromMillis((data.submittedAt as number) + DAY),
      });
      return { id: entry.id, token };
    });
  }
  private cursorKey() {
    return createHash("sha256").update(`cursor:${this.secret}`).digest();
  }
  private encodeCursor(timestamp: Timestamp, id: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.cursorKey(), nonce);
    const encrypted = Buffer.concat([
      cipher.update(
        JSON.stringify([timestamp.seconds, timestamp.nanoseconds, id]),
        "utf8",
      ),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString(
      "base64url",
    );
  }
  private decodeCursor(cursor: string) {
    if (cursor.length > 400) throw new Error("Invalid cursor");
    const bytes = Buffer.from(cursor, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.cursorKey(),
      bytes.subarray(0, 12),
    );
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
  }
  async list(cursor?: string): Promise<EntryPage> {
    let query = this.entries()
      .where("status", "==", "published")
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (cursor) {
      try {
        // Keep the precise creation time out of the public response, including cursors.
        const [seconds, nanos, id] = this.decodeCursor(cursor);
        if (
          !Number.isSafeInteger(seconds) ||
          !Number.isInteger(nanos) ||
          nanos < 0 ||
          nanos >= 1e9 ||
          !validId(id)
        )
          throw new Error();
        query = query.startAfter(new Timestamp(seconds, nanos), id);
      } catch {
        throw new GuestbookError(
          400,
          "목록 위치가 올바르지 않습니다. 처음부터 다시 조회해 주세요.",
        );
      }
    }
    const snapshot = await query.limit(20).get();
    const now = this.clock();
    const entries: PublicEntry[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (
        data.status !== "published" ||
        (data.expiresAt != null &&
          (!(data.expiresAt instanceof Timestamp) ||
            expired(data.expiresAt, now))) ||
        !(data.createdAt instanceof Timestamp)
      )
        continue;
      const valid = validateEntry({
        visitType: data.visitType,
        nickname: data.nickname,
        community: data.community,
        message: data.message,
        consent: true,
        website: "",
      }).input;
      if (!valid || !Object.hasOwn(visitTypes, valid.visitType)) continue;
      const date = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(data.createdAt.toDate());
      entries.push({
        id: doc.id,
        visitType: valid.visitType,
        nickname: valid.nickname || "이름 없는 방문자",
        community: valid.community,
        message: valid.message,
        date,
      });
    }
    const last = snapshot.docs.at(-1);
    const timestamp = last?.data().createdAt as Timestamp | undefined;
    return {
      entries,
      nextCursor:
        snapshot.size === 20 && last && timestamp
          ? this.encodeCursor(timestamp, last.id)
          : null,
    };
  }
  async remove(id: unknown, token: unknown) {
    if (
      !validId(id) ||
      typeof token !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(token)
    )
      throw new GuestbookError(403, "삭제 링크를 확인해 주세요.");
    const ref = this.entries().doc(id);
    await this.db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      // Missing entries remain missing; retries return the same success without creating anything.
      if (!doc.exists) return;
      if (
        typeof doc.data()?.deleteTokenHash !== "string" ||
        !secureEqual(doc.data()!.deleteTokenHash, hash(token))
      )
        throw new GuestbookError(403, "삭제 링크를 확인해 주세요.");
      tx.delete(ref);
    });
    await this.removeReports(id);
  }
  private async removeReports(id: string) {
    // API report creation reads the entry transactionally, so no new reports can follow deletion.
    let remaining = true;
    while (remaining) {
      const reports = await this.reports()
        .where("entryId", "==", id)
        .limit(200)
        .get();
      if (reports.empty) break;
      const batch = this.db.batch();
      reports.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      remaining = reports.size === 200;
    }
  }
  async report(id: unknown, reason: unknown, identity: string, ip: string) {
    if (
      !validId(id) ||
      typeof reason !== "string" ||
      !Object.hasOwn(reportReasons, reason)
    )
      throw new GuestbookError(400, "신고 사유를 확인해 주세요.");
    const now = this.clock();
    const duplicate = this.guards().doc(this.sign(`report:${identity}:${id}`));
    const report = this.reports().doc();
    await this.db.runTransaction(async (tx) => {
      const entry = await tx.get(this.entries().doc(id));
      if (
        !entry.exists ||
        entry.data()?.status !== "published" ||
        expired(entry.data()?.expiresAt, now)
      )
        throw new GuestbookError(404, "현재 공개된 글이 아닙니다.");
      const previous = await tx.get(duplicate);
      if (previous.exists && !expired(previous.data()?.expiresAt, now))
        throw new GuestbookError(
          429,
          "이미 신고한 글입니다. 24시간 뒤 다시 접수할 수 있습니다.",
        );
      const applyLimits = await this.limits(tx, identity, ip, "report", now);
      applyLimits();
      tx.set(duplicate, { expiresAt: Timestamp.fromMillis(now + DAY) });
      tx.create(report, {
        entryId: id,
        reason: reason as ReportReason,
        status: "pending",
        createdAt: Timestamp.fromMillis(now),
        expiresAt: null,
      });
    });
  }
  async cleanup() {
    const now = this.clock();
    let deleted = 0;
    let moreExpiredMayRemain = false;
    // Bound each run so the free daily schedule cannot consume an unbounded quota.
    for (const collection of [this.entries(), this.guards(), this.reports()]) {
      const docs = await collection
        .where("expiresAt", "<=", Timestamp.fromMillis(now))
        .limit(100)
        .get();
      moreExpiredMayRemain ||= docs.size === 100;
      for (const doc of docs.docs) {
        const removed = await this.db.runTransaction(async (tx) => {
          const current = await tx.get(doc.ref);
          if (!current.exists || !expired(current.data()?.expiresAt, now))
            return false;
          tx.delete(doc.ref);
          return true;
        });
        if (removed) deleted++;
      }
    }
    // Scan a rotating, bounded page to remove reports orphaned by console deletion.
    const checkpoint = this.guards().doc("cleanup-report-cursor");
    const position = (await checkpoint.get()).data()?.after;
    let query = this.reports().orderBy(FieldPath.documentId()).limit(100);
    if (typeof position === "string") query = query.startAfter(position);
    const reports = await query.get();
    for (const report of reports.docs) {
      const removed = await this.db.runTransaction(async (tx) => {
        const current = await tx.get(report.ref);
        if (!current.exists) return false;
        const id = current.data()?.entryId;
        if (!validId(id) || !(await tx.get(this.entries().doc(id))).exists) {
          tx.delete(report.ref);
          return true;
        }
        return false;
      });
      if (removed) deleted++;
    }
    await checkpoint.set({
      after: reports.size === 100 ? reports.docs.at(-1)!.id : null,
    });
    return {
      deleted,
      moreExpiredMayRemain: moreExpiredMayRemain || reports.size === 100,
    };
  }
}
export function newIdentity() {
  return randomBytes(24).toString("base64url");
}
