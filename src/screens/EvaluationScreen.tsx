import { createEffect, createSignal, onCleanup, For } from "solid-js";
import { Check, LoaderCircle } from "lucide-solid";
import { useReducedMotion } from "../components/ui";
export const evaluationLabels = [
  "예배 참여 기록 분석 중...",
  "기도 생활 패턴 확인 중...",
  "신앙활동 지표 계산 중...",
  "최종 등급 산정 중...",
];
export default function EvaluationScreen(props: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const reduced = useReducedMotion();
  const [step, setStep] = createSignal(0);
  createEffect(() => {
    if (reduced()) {
      props.onDone();
      return;
    }
    const timer = window.setInterval(
      () => setStep((value) => Math.min(3, value + 1)),
      650,
    );
    const done = window.setTimeout(props.onDone, 2800);
    onCleanup(() => {
      clearInterval(timer);
      clearTimeout(done);
    });
  });
  return (
    <div class="evaluation center">
      <div class="analysis-orbit" aria-hidden="true">
        <LoaderCircle size={42} />
      </div>
      <p class="eyebrow">나의 활동을 한눈에</p>
      <h1 tabIndex={-1}>리포트를 준비하고 있어요</h1>
      <p class="muted">
        직접 응답한 내용만 분석합니다.
        <br />
        외부 교회 기록에는 접근하지 않습니다.
      </p>
      <p role="status" class="sr-only">
        {evaluationLabels[step()]}
      </p>
      <ol class="analysis-list">
        <For each={evaluationLabels}>
          {(label, index) => (
            <li classList={{ active: index() <= step() }}>
              <Check size={17} aria-hidden="true" />
              {label}
            </li>
          )}
        </For>
      </ol>
      <button class="text-button" onClick={props.onCancel}>
        분석 취소 · 답변 수정
      </button>
    </div>
  );
}
