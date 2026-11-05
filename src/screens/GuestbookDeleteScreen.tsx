import { Show, createSignal } from "solid-js";
import { guestbookRequest } from "../services/guestbook";
export default function GuestbookDeleteScreen(props: { onBack: () => void }) {
  const match =
    /^#\/guestbook\/delete\/([A-Za-z0-9_-]{20,80})\/([A-Za-z0-9_-]{43})$/.exec(
      location.hash,
    );
  const [busy, setBusy] = createSignal(false),
    [done, setDone] = createSignal(false),
    [error, setError] = createSignal("");
  async function remove() {
    if (!match || busy()) return;
    setBusy(true);
    setError("");
    try {
      await guestbookRequest({
        action: "delete",
        id: match[1],
        token: match[2],
      });
      setDone(true);
      // Remove the capability from the current browser history entry after use.
      history.replaceState(null, "", `${location.pathname}#/guestbook/delete`);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div class="guestbook">
      <h1 tabIndex={-1}>발자취 삭제</h1>
      <Show
        when={!done()}
        fallback={
          <p role="status" class="lead">
            발자취가 삭제되었습니다.
          </p>
        }
      >
        <Show
          when={match}
          fallback={
            <p role="alert" class="error">
              삭제 링크를 확인해 주세요. 분실 시 운영자에게 문의해 주세요.
            </p>
          }
        >
          <p class="lead">
            이 링크로 남긴 글을 영구 삭제할까요? 삭제 후에는 복구할 수 없습니다.
            방문만으로 삭제되지는 않습니다.
          </p>
          <button
            type="button"
            class="button warm-button"
            disabled={busy()}
            onClick={() => void remove()}
          >
            {busy() ? "삭제 중…" : "확인하고 영구 삭제하기"}
          </button>
        </Show>
      </Show>
      <Show when={error()}>
        <p class="error" role="alert">
          {error()}
        </p>
      </Show>
      <button type="button" class="text-button" onClick={props.onBack}>
        발자취로 돌아가기
      </button>
    </div>
  );
}
