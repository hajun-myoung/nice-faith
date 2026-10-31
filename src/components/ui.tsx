import { onCleanup, createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { ArrowRight, ShieldCheck } from "lucide-solid";
export function Brand() {
  return (
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        nf<span>·</span>
      </span>
      <span>
        NICE FAITH<small>신앙을 돌아보는 새로운 질문</small>
      </span>
    </div>
  );
}
export function PrimaryButton(props: {
  children: JSX.Element;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      class="button primary"
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}
export function Disclaimer() {
  return (
    <footer class="disclaimer">
      <ShieldCheck size={16} aria-hidden="true" />
      <p>
        NICE FAITH LAB · 독립 교육용 패러디
        <br />
        실제 NICE 신용평가사와 관련이 없습니다.
        <br />
        실제 신앙이나 구원의 상태를 판단하지 않습니다.
        <br />
        응답은 이 브라우저 메모리에만 보관됩니다.
      </p>
    </footer>
  );
}
export function Bar(props: { label: string; value: number; max?: number }) {
  return (
    <div
      class="bar"
      role="meter"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={props.max ?? 100}
      aria-valuenow={props.value}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, (props.value / (props.max ?? 100)) * 100))}%`,
        }}
      />
    </div>
  );
}
export function useReducedMotion() {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const [reduced, setReduced] = createSignal(media.matches);
  const changed = () => setReduced(media.matches);
  media.addEventListener("change", changed);
  onCleanup(() => media.removeEventListener("change", changed));
  return reduced;
}
