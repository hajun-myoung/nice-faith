import { For } from "solid-js";
import { Sprout, RotateCcw } from "lucide-solid";
import { reflectionFor, reflectionPrompts } from "../data/reflectionCopy";
import ShareControls from "../components/ShareControls";
import type { Answers } from "../domain/types";
export default function ReflectionScreen(props: {
  answers: Answers;
  score?: number;
  onRestart: () => void;
}) {
  const copy = () => reflectionFor(props.answers);
  return (
    <div class="reflection">
      <header class="reflection-hero">
        <span class="reflection-icon" aria-hidden="true">
          <Sprout size={32} />
        </span>
        <p class="eyebrow">숫자가 멈춘 자리에서</p>
        <h1 tabIndex={-1}>측정 불가</h1>
        <p class="reflection-statement">
          은혜는 점수로
          <br />
          얻을 수 없습니다.
        </p>
      </header>
      <p class="reflection-body">
        우리는 얼마나 예배했는지, 얼마나 기도했는지, 얼마나 봉사했는지 기록할 수
        있습니다. 그러나 그 기록으로 하나님의 사랑이나 구원의 자격을 계산할 수는
        없습니다.
      </p>
      <section class="scripture">
        <h2>은혜로 시작되는 삶</h2>
        <p>구원은 하나님의 선물이며, 우리는 선한 일을 위해 지음받았습니다.</p>
        <p class="micro">에베소서 2:8–10의 뜻을 풀어 쓴 설명</p>
        <a
          href="https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book=eph&chap=2"
          target="_blank"
          rel="noopener noreferrer"
          referrerpolicy="no-referrer"
        >
          에베소서 2:8–10 읽기 ↗
        </a>
      </section>
      <p class="reflection-body">
        선한 행위는 은혜를 얻기 위한 거래가 아니라, 은혜를 받은 삶에서 맺는
        열매입니다.
      </p>
      <section class="personal-reflection">
        <h2>당신에게 건네는 이야기</h2>
        <p class="personal-primary">{copy().primary}</p>
        <p class="personal-secondary">{copy().secondary}</p>
      </section>
      <section class="reflection-prompts">
        <h2>잠시, 마음에 남겨 보세요</h2>
        <p class="muted">답을 적거나 제출할 필요는 없습니다.</p>
        <For each={reflectionPrompts}>
          {(prompt, index) => (
            <div class="reflection-prompt">
              <span aria-hidden="true">0{index() + 1}</span>
              <p>{prompt}</p>
            </div>
          )}
        </For>
      </section>
      <section class="share-section">
        <h2>나의 결과를 친구와 함께</h2>
        <ShareControls score={props.score} />
      </section>
      <button class="text-button restart" onClick={props.onRestart}>
        <RotateCcw size={16} aria-hidden="true" /> 처음부터 다시 돌아보기
      </button>
    </div>
  );
}
