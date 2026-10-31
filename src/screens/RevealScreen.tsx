import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import type { FaithReport } from '../domain/types';
import { useReducedMotion } from '../components/ui';
// Relative milliseconds; kept in one place for tuning the complete timeline.
export const revealTiming = { question: 500, dissolve: 1500, transition: 2500, reveal: 3500, reflection: 5200 } as const;
type Phase = 'focus-score' | 'question' | 'dissolve-score' | 'transition' | 'reveal';
export default function RevealScreen(props: { report: FaithReport; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = createSignal<Phase>('focus-score');
  createEffect(() => {
    if (reduced()) { props.onDone(); return; }
    const timers = [
      setTimeout(() => setPhase('question'), revealTiming.question),
      setTimeout(() => setPhase('dissolve-score'), revealTiming.dissolve),
      setTimeout(() => setPhase('transition'), revealTiming.transition),
      setTimeout(() => setPhase('reveal'), revealTiming.reveal),
      setTimeout(props.onDone, revealTiming.reflection),
    ];
    onCleanup(() => timers.forEach(clearTimeout));
  });
  const showScore = () => ['focus-score', 'question', 'dissolve-score'].includes(phase());
  return <div class="reveal-screen" data-phase={phase()}><div class="reveal-stage">
    <Show when={showScore()}><div class="dissolving-score" classList={{ dissolving: phase() === 'dissolve-score' }}><p class="eyebrow">나의 신앙활동 평가점수</p><div class="score">{props.report.score.toLocaleString('ko-KR')}<span>점</span></div><span class="grade">가상 {props.report.grade}등급</span></div></Show>
    <div class="reveal-question" role="status"><Show when={phase() === 'question' || phase() === 'dissolve-score'}>그런데 이 점수는<br/>무엇을 의미할까요?</Show></div>
    <Show when={phase() === 'reveal'}><div class="reveal-message"><h1 tabIndex={-1}>측정 불가</h1><p>은혜는 점수로 얻을 수 없습니다.</p></div></Show>
  </div><button class="text-button reveal-skip" onClick={props.onDone}>애니메이션 건너뛰기</button></div>;
}
