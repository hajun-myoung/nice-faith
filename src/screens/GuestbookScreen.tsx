import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import {
  reportReasons,
  textLength,
  validateEntry,
  visitTypes,
  type EntryInput,
  type FieldErrors,
  type PublicEntry,
  type ReportReason,
  type VisitType,
} from "../domain/guestbook";
import {
  GuestbookApiError,
  guestbookRequest,
  loadEntries,
} from "../services/guestbook";

export default function GuestbookScreen(props: { onBack: () => void }) {
  const [entries, setEntries] = createSignal<PublicEntry[]>([]);
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [loaded, setLoaded] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [listError, setListError] = createSignal("");
  const [writing, setWriting] = createSignal(false);
  const [visitType, setVisitType] = createSignal<VisitType>("personal");
  const [nickname, setNickname] = createSignal("");
  const [community, setCommunity] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [website, setWebsite] = createSignal("");
  const [consent, setConsent] = createSignal(false);
  const [errors, setErrors] = createSignal<FieldErrors>({});
  const [submitError, setSubmitError] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [deleteUrl, setDeleteUrl] = createSignal("");
  let attempted:
    { requestId: string; submittedAt: number; input: EntryInput } | undefined;
  let active = true;
  const dirty = () =>
    writing() &&
    Boolean(
      nickname() ||
      community() ||
      message() ||
      consent() ||
      visitType() !== "personal",
    );
  const warn = (event: Event) => {
    if (
      (dirty() || submitting()) &&
      !window.confirm(
        submitting()
          ? "등록 결과를 아직 확인하지 못했습니다. 이동하면 삭제 링크를 받지 못할 수 있습니다. 이동할까요?"
          : "작성 중인 내용이 사라집니다. 이동할까요?",
      )
    )
      event.preventDefault();
  };
  const unload = (event: BeforeUnloadEvent) => {
    if (dirty() || submitting()) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  onMount(() => {
    window.addEventListener("nice-faith:before-navigate", warn);
    window.addEventListener("beforeunload", unload);
    void load();
  });
  onCleanup(() => {
    active = false;
    window.removeEventListener("nice-faith:before-navigate", warn);
    window.removeEventListener("beforeunload", unload);
  });
  async function load(more = false) {
    if (loading()) return;
    setLoading(true);
    setListError("");
    try {
      const page = await loadEntries(
        more ? (cursor() ?? undefined) : undefined,
      );
      if (!active) return;
      setEntries((previous) =>
        more
          ? [
              ...previous,
              ...page.entries.filter(
                (entry) => !previous.some((old) => old.id === entry.id),
              ),
            ]
          : page.entries,
      );
      setCursor(page.nextCursor);
      setLoaded(true);
    } catch (error) {
      if (active) setListError((error as Error).message);
    } finally {
      if (active) setLoading(false);
    }
  }
  const openForm = () => {
    setWriting(true);
    queueMicrotask(() => document.getElementById("guestbook-message")?.focus());
  };
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (submitting()) return;
    const result = validateEntry({
      visitType: visitType(),
      nickname: nickname(),
      community: visitType() === "community" ? community() : "",
      message: message(),
      consent: consent(),
      website: website(),
    });
    setErrors(result.errors);
    setSubmitError("");
    if (!result.input) {
      queueMicrotask(() =>
        document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(),
      );
      return;
    }
    if (
      !attempted ||
      JSON.stringify(attempted.input) !== JSON.stringify(result.input)
    )
      attempted = {
        requestId: Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join(""),
        submittedAt: Date.now(),
        input: result.input,
      };
    setSubmitting(true);
    try {
      const created = await guestbookRequest<{ id: string; token: string }>({
        action: "create",
        ...attempted,
      });
      if (!active) return;
      setDeleteUrl(
        `${location.origin}${location.pathname}#/guestbook/delete/${created.id}/${created.token}`,
      );
      setWriting(false);
      setMessage("");
      setNickname("");
      setCommunity("");
      setConsent(false);
      attempted = undefined;
      queueMicrotask(() =>
        document.getElementById("guestbook-success")?.focus(),
      );
    } catch (error) {
      if (active) {
        setSubmitError((error as Error).message);
        if (error instanceof GuestbookApiError) {
          setErrors(error.fields);
          // A 400 response guarantees validation rejected the request before a write.
          if (error.status === 400) attempted = undefined;
        }
      }
    } finally {
      if (active) setSubmitting(false);
    }
  }
  return (
    <div class="guestbook">
      <button type="button" class="text-button" onClick={props.onBack}>
        ← 돌아가기
      </button>
      <p class="eyebrow">함께 돌아본 우리의 발자취</p>
      <h1 tabIndex={-1}>발자취</h1>
      <p class="lead">
        혼자 잠시 들렀어도, 공동체와 함께 사용했어도 괜찮아요. 마음에 남은 한
        문장을 남겨 주세요.
      </p>
      <Show when={deleteUrl()}>
        <section
          class="card guestbook-success"
          id="guestbook-success"
          tabIndex={-1}
          role="status"
        >
          <h2>발자취를 남겼습니다.</h2>
          <p>운영자 확인 후 공개됩니다.</p>
          <label class="guestbook-field">
            삭제용 비공개 링크
            <input
              readonly
              value={deleteUrl()}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p class="micro">
            이 화면에서 한 번만 제공합니다. 지금 복사해 안전하게 보관하세요.
            링크를 가진 사람은 글을 삭제할 수 있습니다. 분실 시 운영 문의로
            삭제를 요청해 주세요.
          </p>
        </section>
      </Show>
      <Show when={!writing()}>
        <button type="button" class="button warm-button" onClick={openForm}>
          발자취 남기기
        </button>
      </Show>
      <Show when={writing()}>
        <form class="card guestbook-form" onSubmit={submit} noValidate>
          <h2>발자취 남기기</h2>
          <p class="muted">
            승인된 글은 누구나 볼 수 있습니다. 실명, 연락처, 다른 사람의
            개인정보나 민감한 신앙 상담 내용은 적지 말아 주세요. 교회·모임명은
            공개해도 괜찮은 경우에만 입력해 주세요.
          </p>
          <p class="muted">
            민감한 내용이 포함되어있는 경우, 관리자가 임의로 삭제할 수 있습니다.
          </p>
          <fieldset disabled={submitting()}>
            <label class="guestbook-field" for="guestbook-type">
              방문 유형
            </label>
            <select
              id="guestbook-type"
              value={visitType()}
              onChange={(event) =>
                setVisitType(event.currentTarget.value as VisitType)
              }
              aria-invalid={Boolean(errors().visitType)}
              aria-describedby="type-error"
            >
              <For each={Object.entries(visitTypes)}>
                {([value, label]) => <option value={value}>{label}</option>}
              </For>
            </select>
            <p id="type-error" class="field-error">
              {errors().visitType}
            </p>
            <label class="guestbook-field" for="guestbook-nickname">
              별명 (선택 · 최대 20자)
            </label>
            <input
              id="guestbook-nickname"
              value={nickname()}
              onInput={(event) => setNickname(event.currentTarget.value)}
              aria-invalid={Boolean(errors().nickname)}
              aria-describedby="nickname-error"
              autocomplete="off"
            />
            <p id="nickname-error" class="field-error">
              {errors().nickname}
            </p>
            <Show when={visitType() === "community"}>
              <label class="guestbook-field" for="guestbook-community">
                교회·모임명 (선택 · 최대 40자)
              </label>
              <input
                id="guestbook-community"
                value={community()}
                onInput={(event) => setCommunity(event.currentTarget.value)}
                aria-invalid={Boolean(errors().community)}
                aria-describedby="community-note community-error"
                autocomplete="off"
              />
              <p id="community-note" class="micro">
                직접 적은 정보이며, 공식 참여·제휴·대표자 인증을 뜻하지
                않습니다. 비워 두어도 괜찮아요.
              </p>
              <p id="community-error" class="field-error">
                {errors().community}
              </p>
            </Show>
            <label class="guestbook-field" for="guestbook-message">
              한마디 (필수 · 1~300자)
            </label>
            <textarea
              id="guestbook-message"
              rows={5}
              value={message()}
              onInput={(event) => setMessage(event.currentTarget.value)}
              placeholder="오늘 어떤 마음이 남았나요? 함께 사용한 이야기나 짧은 인사를 남겨 주세요."
              aria-invalid={Boolean(errors().message)}
              aria-describedby="message-count message-error"
            />
            <p id="message-count" class="micro">
              {textLength(message())} / 300자 · 앞뒤 공백을 뺀 글자 수
            </p>
            <p id="message-error" class="field-error">
              {errors().message}
            </p>
            <div class="guestbook-trap" aria-hidden="true">
              <label>
                웹사이트
                <input
                  tabIndex={-1}
                  autocomplete="off"
                  value={website()}
                  onInput={(event) => setWebsite(event.currentTarget.value)}
                />
              </label>
            </div>
            <label class="guestbook-consent">
              <input
                type="checkbox"
                checked={consent()}
                onChange={(event) => setConsent(event.currentTarget.checked)}
                aria-invalid={Boolean(errors().consent)}
                aria-describedby="consent-error"
              />
              별명·선택 모임명·내용·작성일의 공개 및 운영 목적 저장에
              동의합니다. (필수)
            </label>
            <p id="consent-error" class="field-error">
              {errors().consent}
            </p>
            <button
              class="button warm-button"
              type="submit"
              disabled={submitting()}
            >
              {submitting() ? "등록 중…" : "공개 동의하고 등록하기"}
            </button>
          </fieldset>
          <Show when={submitError()}>
            <p class="error" role="alert">
              {submitError()}
            </p>
          </Show>
          <Show when={Object.keys(errors()).length}>
            <p role="alert" class="field-error">
              입력 항목을 확인해 주세요. {errors().website}
            </p>
          </Show>
        </form>
      </Show>
      <details class="guestbook-privacy">
        <summary>개인정보·보관·삭제 안내</summary>
        <div class="method">
          <p>
            설문 답변·점수·개인화 성찰은 전송하지 않습니다. 직접 입력한 발자취만
            별도로 저장합니다. 공개 글은 삭제 요청 또는 서비스 종료까지, 대기
            글은 30일, 숨긴 글은 처리 후 30일 보관합니다. 신고는 대상 글 삭제 시
            또는 처리 완료 후 30일에 삭제합니다.
          </p>
          <p>
            도배 방지를 위해 24시간짜리 보안 쿠키를 사용합니다. IP 원문은 방명록
            DB에 저장하지 않고 매일 바뀌는 비밀값으로 해시한 요청 제한 키를
            사용합니다. 제한·중복 요청 기록은 24시간 안에 논리 만료하며 하루 한
            번 정리합니다. 정상 실행 시 최대 약 48시간 및 스케줄 지연만큼 남을
            수 있습니다. 실패하면 운영자가 다시 정리합니다.
          </p>
          <p>
            삭제 링크 방문만으로 삭제되지 않습니다. 링크를 분실했거나 개인정보
            삭제가 필요하면{" "}
            <a href="mailto:fe.dev.denver@gmail.com">운영자에게 문의</a>해
            주세요. 자동 백업·시점 복구는 제공하지 않습니다. 인프라 접근 로그의
            보관 범위는 출시 전 운영 확인이 필요합니다.
          </p>
        </div>
      </details>
      <section
        class="guestbook-list"
        aria-label="공개된 발자취"
        aria-busy={loading()}
      >
        <h2>함께 남긴 이야기</h2>
        <Show when={loading()}>
          <p role="status" class="muted">
            발자취를 불러오고 있어요.
          </p>
        </Show>
        <Show when={listError()}>
          <div class="error" role="alert">
            <p>{listError()}</p>
            <button
              type="button"
              class="text-button"
              onClick={() => void load(loaded())}
            >
              목록 다시 시도
            </button>
            <Show when={loaded()}>
              <button
                type="button"
                class="text-button"
                onClick={() => void load()}
              >
                처음부터 다시 보기
              </button>
            </Show>
          </div>
        </Show>
        <Show
          when={loaded() && !entries().length && !listError() && !loading()}
        >
          <p class="muted">
            {cursor()
              ? "이 페이지에 공개할 발자취가 없습니다. 더 보기를 눌러 주세요."
              : "아직 첫 발자취를 기다리고 있어요."}
          </p>
        </Show>
        <For each={entries()}>{(entry) => <EntryCard entry={entry} />}</For>
        <Show when={cursor()}>
          <button
            type="button"
            class="button secondary"
            disabled={loading()}
            onClick={() => void load(true)}
          >
            더 보기
          </button>
        </Show>
      </section>
    </div>
  );
}
function EntryCard(props: { entry: PublicEntry }) {
  const [reporting, setReporting] = createSignal(false);
  const [reason, setReason] = createSignal<ReportReason>("privacy");
  const [busy, setBusy] = createSignal(false);
  const [status, setStatus] = createSignal("");
  const [error, setError] = createSignal("");
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (busy()) return;
    setBusy(true);
    setError("");
    try {
      await guestbookRequest({
        action: "report",
        id: props.entry.id,
        reason: reason(),
      });
      setStatus("신고를 접수했습니다. 운영자가 검토합니다.");
      setReporting(false);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article class="card guestbook-entry">
      <h3>{props.entry.nickname}</h3>
      <p class="micro">
        {props.entry.community || visitTypes[props.entry.visitType]} ·{" "}
        <time dateTime={props.entry.date}>
          {props.entry.date.replaceAll("-", ".")}
        </time>
      </p>
      <p class="guestbook-message">{props.entry.message}</p>
      <Show when={!status()}>
        <button
          type="button"
          class="text-button"
          aria-expanded={reporting()}
          aria-label={`${props.entry.nickname}님의 글 신고`}
          onClick={() => setReporting(!reporting())}
        >
          신고
        </button>
      </Show>
      <Show when={reporting()}>
        <form onSubmit={submit}>
          <label class="guestbook-field" for={`reason-${props.entry.id}`}>
            신고 사유
          </label>
          <select
            id={`reason-${props.entry.id}`}
            value={reason()}
            onChange={(event) =>
              setReason(event.currentTarget.value as ReportReason)
            }
            disabled={busy()}
          >
            <For each={Object.entries(reportReasons)}>
              {([value, label]) => <option value={value}>{label}</option>}
            </For>
          </select>
          <button type="submit" class="button secondary" disabled={busy()}>
            신고 접수하기
          </button>
          <Show when={error()}>
            <p role="alert" class="error">
              {error()}
            </p>
          </Show>
        </form>
      </Show>
      <p role="status" class="micro">
        {status()}
      </p>
    </article>
  );
}
