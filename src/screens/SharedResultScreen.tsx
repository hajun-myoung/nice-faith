import { gradeForScore } from "../domain/scoring";
import type { SharedResult } from "../domain/sharing";
import { PrimaryButton } from "../components/ui";
export default function SharedResultScreen(props: {
  result: SharedResult;
  onStart: () => void;
}) {
  const grade = () => gradeForScore(props.result.score);
  return (
    <div class="shared-result center">
      <p class="eyebrow">친구가 공유한 신앙활동 리포트</p>
      <section class="card score-card">
        <h1 tabIndex={-1}>
          {props.result.name ? `${props.result.name}님의` : "친구의"} 신앙활동
          점수
        </h1>
        <div class="score">
          {props.result.score.toLocaleString("ko-KR")}
          <span>점</span>
        </div>
        <span class="grade">
          가상 {grade().grade}등급 · {grade().label}
        </span>
        <p class="muted">{grade().headline}</p>
      </section>
      <PrimaryButton onClick={props.onStart}>나도 측정해보기</PrimaryButton>
      <p class="micro">
        공유 링크에 담긴 가상 활동지표입니다.
        <br />
        링크의 점수는 수정할 수 있으며 인증된 결과가 아닙니다.
        <br />
        실제 신앙이나 구원의 상태를 판단하지 않습니다.
      </p>
    </div>
  );
}
