import { Show, createSignal } from "solid-js";
import { Share2, Link } from "lucide-solid";
import { sharePayload } from "../domain/sharing";
export default function ShareControls(props: { score?: number }) {
  const [name, setName] = createSignal("");
  const [status, setStatus] = createSignal("");
  const [manualCopy, setManualCopy] = createSignal<{
    text: string;
    withMessage: boolean;
  }>();
  const [busy, setBusy] = createSignal(false);
  const payload = () =>
    sharePayload(
      location.href,
      props.score === undefined
        ? undefined
        : { score: props.score, name: name() },
    );
  const copy = async (withMessage: boolean) => {
    const data = payload();
    const text = withMessage ? `${data.text}\n\n${data.url}` : data.url!;
    try {
      await navigator.clipboard.writeText(text);
      setManualCopy(undefined);
      setStatus(
        withMessage
          ? "공유 메시지와 주소를 복사했습니다. 카카오톡에 붙여 넣어 주세요."
          : "공유 주소를 복사했습니다.",
      );
    } catch {
      setManualCopy({ text, withMessage });
      setStatus(
        withMessage
          ? "아래 메시지와 주소를 선택해 직접 복사해 주세요."
          : "아래 주소를 선택해 직접 복사해 주세요.",
      );
    }
  };
  const share = async () => {
    if (busy()) return;
    setBusy(true);
    try {
      if (!navigator.share) {
        await copy(true);
        return;
      }
      await navigator.share(payload());
      setStatus("공유를 완료했습니다.");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        await copy(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="share-controls">
      <Show when={props.score !== undefined}>
        <label class="share-name">
          공유 이름 <span>(선택 · 별명 가능)</span>
          <input
            type="text"
            maxlength={20}
            value={name()}
            onInput={(event) => {
              setName(event.currentTarget.value);
              setManualCopy(undefined);
              setStatus("");
            }}
            placeholder="이름 없이 공유해도 괜찮아요"
            autocomplete="off"
          />
        </label>
        <p class="micro">
          공유 링크에는 점수와 입력한 이름만 담깁니다. 링크를 받은 누구나 볼 수
          있습니다. 설문 답변과 개인화 성찰은 포함하지 않습니다.
        </p>
      </Show>
      <div class="share-actions">
        <button
          type="button"
          class="button primary"
          disabled={busy()}
          onClick={share}
        >
          <Share2 size={17} aria-hidden="true" />
          {props.score === undefined ? "테스트 공유하기" : "공유하기"}
        </button>
        <button
          type="button"
          class="button secondary"
          onClick={() => copy(false)}
        >
          <Link size={17} aria-hidden="true" /> 주소 복사
        </button>
      </div>
      <p class="micro" role="status">
        {status()}
      </p>
      <Show when={manualCopy()}>
        {(value) => (
          <label class="manual-url">
            {value().withMessage ? "공유 메시지" : "공유 주소"}
            <Show
              when={value().withMessage}
              fallback={
                <input
                  type="url"
                  readonly
                  value={value().text}
                  onFocus={(event) => event.currentTarget.select()}
                />
              }
            >
              <textarea
                rows={5}
                readonly
                value={value().text}
                onFocus={(event) => event.currentTarget.select()}
              />
            </Show>
          </label>
        )}
      </Show>
    </div>
  );
}
