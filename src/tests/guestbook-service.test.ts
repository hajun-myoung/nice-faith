// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { GuestbookService } from "../../server/guestbook/service";

const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe.skipIf(!enabled)("Firestore Emulator: guestbook invariants", () => {
  const app = initializeApp(
    { projectId: "demo-nice-faith" },
    "guestbook-tests",
  );
  const db = getFirestore(app);
  let now = Date.UTC(2026, 10, 5, 16);
  const service = new GuestbookService(
    db,
    "test-secret-at-least-thirty-two-characters",
    () => now,
  );
  const input = {
    visitType: "personal",
    nickname: "",
    community: "",
    message: "함께 돌아봤어요.",
    consent: true,
    website: "",
  };
  const submission = (id = "request_12345678901234567890") => ({
    requestId: createHash("sha256").update(id).digest("hex"),
    submittedAt: now,
    input,
  });
  async function publish(id: string) {
    await db
      .collection("guestbookEntries")
      .doc(id)
      .update({
        status: "published",
        publishedAt: Timestamp.fromMillis(now),
        expiresAt: null,
      });
  }
  beforeEach(async () => {
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-nice-faith/databases/(default)/documents`,
      { method: "DELETE" },
    );
    now = Date.UTC(2026, 10, 5, 16);
  });
  afterAll(async () => {
    await db.terminate();
    await deleteApp(app);
  });
  it("denies direct unauthenticated client reads and writes", async () => {
    const url = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-nice-faith/databases/(default)/documents/guestbookEntries`;
    expect((await fetch(url)).status).toBe(403);
    expect(
      (
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: { message: { stringValue: "client" } },
          }),
        })
      ).status,
    ).toBe(403);
  });
  it("saves pending, stores only token hash, and returns an allowlist after approval", async () => {
    const created = await service.create(submission(), "visitor", "127.0.0.1");
    const stored = (
      await db.collection("guestbookEntries").doc(created.id).get()
    ).data()!;
    expect(stored.status).toBe("pending");
    expect(stored.deleteTokenHash).not.toBe(created.token);
    expect(JSON.stringify(stored)).not.toContain(created.token);
    expect((await service.list()).entries).toEqual([]);
    await publish(created.id);
    const page = await service.list();
    expect(page.entries).toEqual([
      {
        id: created.id,
        nickname: "이름 없는 방문자",
        visitType: "personal",
        community: "",
        message: input.message,
        date: "2026-11-06",
      },
    ]);
    expect(Object.keys(page.entries[0]).sort()).toEqual(
      ["id", "nickname", "visitType", "community", "message", "date"].sort(),
    );
    await db
      .collection("guestbookEntries")
      .doc(created.id)
      .update({ status: "hidden" });
    expect((await service.list()).entries).toEqual([]);
  });
  it("uses one transaction for concurrent retries and recovers the deletion capability", async () => {
    const request = submission();
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        service.create(request, "visitor", "127.0.0.1"),
      ),
    );
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(
      1,
    );
    expect((await db.collection("guestbookEntries").get()).size).toBe(1);
    const rotated = new GuestbookService(
      db,
      "different-test-secret-with-thirty-two-characters",
      () => now,
    );
    expect(
      await rotated.create(request, "new-cookie-identity", "new-ip"),
    ).toEqual(results[0]);
    await expect(
      service.create(
        { ...request, input: { ...input, message: "변경" } },
        "visitor",
        "127.0.0.1",
      ),
    ).rejects.toMatchObject({ status: 409 });
    await service.remove(results[0].id, results[0].token);
    await expect(
      service.create(request, "visitor", "127.0.0.1"),
    ).rejects.toMatchObject({ status: 410 });
    now += 86_400_001;
    await service.cleanup();
    await expect(
      service.create(request, "new-cookie", "ip"),
    ).rejects.toMatchObject({ status: 400 });
    expect((await db.collection("guestbookEntries").get()).empty).toBe(true);
  });
  it("rejects invalid input, extra survey fields, stale requests, and honeypots", async () => {
    for (const change of [
      { message: " \n " },
      { message: "가".repeat(301) },
      { nickname: "가".repeat(21) },
      { community: "가".repeat(41) },
      { visitType: "admin" },
      { consent: false },
      { website: "spam" },
      { score: 100 },
    ])
      await expect(
        service.create(
          { ...submission(), input: { ...input, ...change } },
          "visitor",
          "ip",
        ),
      ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.create({ ...submission(), score: 1 }, "visitor", "ip"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.create(
        { ...submission(), submittedAt: now - 86_400_000 },
        "visitor",
        "ip",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect((await db.collection("guestbookEntries").get()).size).toBe(0);
  });
  it("enforces shared creation limits and logically expires them", async () => {
    for (let i = 0; i < 3; i++)
      await service.create(
        submission(`request_1234567890123456789${i}`),
        "visitor",
        "ip",
      );
    await expect(
      service.create(
        submission("request_12345678901234567894"),
        "visitor",
        "ip",
      ),
    ).rejects.toMatchObject({ status: 429 });
    now += 600_000;
    await service.create(
      submission("request_12345678901234567895"),
      "visitor",
      "ip",
    );
    expect((await db.collection("guestbookEntries").get()).size).toBe(4);
  });
  it("paginates equal timestamps by ID without publishing expired or invalid records", async () => {
    const batch = db.batch();
    for (let i = 0; i < 24; i++)
      batch.set(
        db
          .collection("guestbookEntries")
          .doc(`entry_1234567890123456${String(i).padStart(2, "0")}`),
        {
          ...input,
          status: "published",
          createdAt: Timestamp.fromMillis(now),
          expiresAt: i === 23 ? Timestamp.fromMillis(now - 1) : null,
          privateValue: "secret",
        },
      );
    await batch.commit();
    const first = await service.list();
    expect(first.entries).toHaveLength(19);
    expect(first.nextCursor).toBeTruthy();
    const second = await service.list(first.nextCursor!);
    expect(second.entries).toHaveLength(4);
    expect(second.nextCursor).toBeNull();
    expect(
      new Set([...first.entries, ...second.entries].map((entry) => entry.id))
        .size,
    ).toBe(23);
    await expect(service.list("invalid")).rejects.toMatchObject({
      status: 400,
    });
  });
  it("authorizes deletion, clears linked reports, and never changes publication on report", async () => {
    const created = await service.create(submission(), "visitor", "ip");
    await expect(
      service.report(created.id, "spam", "reporter", "ip"),
    ).rejects.toMatchObject({ status: 404 });
    await publish(created.id);
    await service.report(created.id, "privacy", "reporter", "ip");
    await expect(
      service.report(created.id, "spam", "reporter", "ip"),
    ).rejects.toMatchObject({ status: 429 });
    expect((await service.list()).entries).toHaveLength(1);
    expect((await db.collection("guestbookReports").get()).size).toBe(1);
    await expect(
      service.remove(created.id, "x".repeat(43)),
    ).rejects.toMatchObject({ status: 403 });
    await service.remove(created.id, created.token);
    await service.remove(created.id, created.token);
    expect((await service.list()).entries).toEqual([]);
    expect((await db.collection("guestbookReports").get()).empty).toBe(true);
    await expect(
      service.report(created.id, "spam", "another", "ip"),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("limits total reports, then allows a previously reported entry after 24h", async () => {
    const batch = db.batch();
    for (let i = 0; i < 11; i++)
      batch.set(
        db.collection("guestbookEntries").doc(`entry_1234567890123456789${i}`),
        {
          ...input,
          status: "published",
          createdAt: Timestamp.fromMillis(now),
          expiresAt: null,
        },
      );
    await batch.commit();
    for (let i = 0; i < 10; i++)
      await service.report(
        `entry_1234567890123456789${i}`,
        "spam",
        "reporter",
        "ip",
      );
    await expect(
      service.report("entry_123456789012345678910", "spam", "reporter", "ip"),
    ).rejects.toMatchObject({ status: 429 });
    now += 86_400_001;
    await service.report(
      "entry_12345678901234567890",
      "other",
      "reporter",
      "ip",
    );
    expect((await db.collection("guestbookReports").get()).size).toBe(11);
  });
  it("rechecks expiry inside cleanup transactions and removes console-deletion orphans", async () => {
    const created = await service.create(submission(), "visitor", "ip");
    await publish(created.id);
    await service.report(created.id, "privacy", "reporter", "ip");
    await db.collection("guestbookEntries").doc(created.id).delete();
    const pending = await service.create(
      submission("request_12345678901234567891"),
      "other",
      "ip",
    );
    now += 31 * 86_400_000;
    const result = await service.cleanup();
    expect(result.deleted).toBeGreaterThan(0);
    expect(
      (await db.collection("guestbookEntries").doc(pending.id).get()).exists,
    ).toBe(false);
    expect((await db.collection("guestbookReports").get()).empty).toBe(true);
    expect(
      (await db.collection("guestbookRequestGuards").get()).docs.map(
        (doc) => doc.id,
      ),
    ).toEqual(["cleanup-report-cursor"]);
  });
  it("does not resurrect an entry while console approval races author deletion", async () => {
    const created = await service.create(submission(), "visitor", "ip");
    const entry = db.collection("guestbookEntries").doc(created.id);
    await Promise.allSettled([
      service.remove(created.id, created.token),
      entry.update({ status: "published", expiresAt: null }),
    ]);
    expect((await entry.get()).exists).toBe(false);
    expect((await service.list()).entries).toEqual([]);
    await expect(
      service.create(submission(), "visitor", "ip"),
    ).rejects.toMatchObject({ status: 410 });
  });
});
