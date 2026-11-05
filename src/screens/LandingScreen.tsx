import {
  ArrowUpRight,
  Check,
  LockKeyhole,
  ListChecks,
  ChartNoAxesCombined,
  Sparkles,
} from "lucide-solid";
import { PrimaryButton } from "../components/ui";
export default function LandingScreen(props: {
  onStart: () => void;
  onGuestbook: () => void;
}) {
  return (
    <div class="landing">
      <div class="eyebrow">
        <span class="status-dot" /> 나를 돌아보는 3분
      </div>
      <h1 tabIndex={-1}>
        당신의 믿음,
        <br />
        <span class="blue">몇 점입니까?</span>
      </h1>
      <p class="lead">
        익숙한 신앙생활을 새로운 시선으로.
        <br />
        12개의 질문으로 나의 활동지표를 확인해 보세요.
      </p>
      <div class="preview-card" aria-hidden="true">
        <div class="flex justify-between items-center">
          <span class="mini-label">나의 신앙활동 리포트</span>
          <ArrowUpRight size={20} />
        </div>
        <div class="preview-number">
          ???<span>점</span>
        </div>
        <div class="preview-gauge">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div class="flex justify-between mini-label">
          <span>숫자로 돌아보고</span>
          <span>그 너머를 발견하세요</span>
        </div>
        <div class="preview-seal">
          <Sparkles size={17} /> 숫자 너머의 이야기
        </div>
      </div>
      <div class="landing-facts">
        <span>
          <Check size={15} /> 12문항
        </span>
        <span>
          <Check size={15} /> 약 3분
        </span>
        <span>
          <LockKeyhole size={14} /> 가입 없이
        </span>
      </div>
      <PrimaryButton onClick={props.onStart}>
        내 신앙점수 조회하기
      </PrimaryButton>
      <p class="micro center">신앙활동을 돌아보는 가상 시뮬레이션입니다.</p>
      <div class="steps">
        <div>
          <ListChecks size={20} />
          <span>
            솔직하게 답하고<small>나의 일상 돌아보기</small>
          </span>
        </div>
        <div>
          <ChartNoAxesCombined size={20} />
          <span>
            리포트를 확인하고<small>5개 영역의 활동지표</small>
          </span>
        </div>
        <div>
          <Sparkles size={20} />
          <span>
            새로운 질문 만나기<small>숫자 너머의 성찰</small>
          </span>
        </div>
      </div>
      <button
        type="button"
        class="text-button restart"
        onClick={props.onGuestbook}
      >
        함께 돌아본 발자취
      </button>
    </div>
  );
}
