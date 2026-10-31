import { For, Show } from "solid-js";
import { ArrowUpRight, ArrowDownRight, CircleCheck } from "lucide-solid";
import type { FaithReport, ScoreFactor } from "../domain/types";
import { Bar, PrimaryButton } from "../components/ui";
import ShareControls from "../components/ShareControls";
function Factor(props: { factor: ScoreFactor }) {
  return (
    <li class="factor">
      <span>
        {props.factor.impact > 0 ? (
          <ArrowUpRight size={18} aria-hidden="true" />
        ) : (
          <ArrowDownRight size={18} aria-hidden="true" />
        )}
        {props.factor.label}
      </span>
      <strong
        classList={{
          positive: props.factor.impact > 0,
          negative: props.factor.impact < 0,
        }}
      >
        {props.factor.impact > 0 ? "+" : ""}
        {props.factor.impact}점
      </strong>
    </li>
  );
}
export default function ResultReportScreen(props: {
  report: FaithReport;
  onReveal: () => void;
  onRevise: () => void;
  onRestart: () => void;
}) {
  return (
    <div class="report">
      <div class="report-status">
        <span>
          신앙활동 평가 리포트
          <small class="report-label">FAITH ACTIVITY REPORT</small>
        </span>
        <span>
          <CircleCheck size={14} aria-hidden="true" /> 분석 완료
        </span>
      </div>
      <section class="card score-card compact">
        <p class="eyebrow">나의 신앙활동 평가점수</p>
        <h1 tabIndex={-1} class="score">
          {props.report.score.toLocaleString("ko-KR")}
          <span>점</span>
        </h1>
        <span class="grade">
          가상 {props.report.grade}등급 · {props.report.gradeLabel}
        </span>
        <Bar
          label="가상 신앙활동 평가점수"
          value={props.report.score}
          max={1000}
        />
        <div class="scale">
          <span>1점</span>
          <span>1,000점</span>
        </div>
      </section>
      <section class="report-top-actions">
        <PrimaryButton onClick={props.onReveal}>
          이 점수의 의미 확인하기
        </PrimaryButton>
      </section>
      <details class="score-share card">
        <summary>내 점수 공유하기</summary>
        <ShareControls score={props.report.score} />
      </details>
      <details class="report-details">
        <summary>활동 분석 · 상세 리포트 펼치기</summary>
        <section class="card">
          <div class="summary">
            <h2>활동 분석 요약</h2>
            <strong>{props.report.headline}</strong>
            <p>{props.report.summary}</p>
          </div>
        </section>
        <section class="card">
          <h2>영역별 평가 현황</h2>
          <p class="muted">각 영역은 100점 만점, 동일한 20% 비중입니다.</p>
          <div class="domains">
            <For each={props.report.domains}>
              {(domain) => (
                <div>
                  <div class="flex justify-between domain-label">
                    <span>{domain.label}</span>
                    <strong>{domain.score}점</strong>
                  </div>
                  <Bar label={domain.label} value={domain.score} />
                  <Show when={domain.evaluated < 2}>
                    <p class="micro">
                      미평가 {2 - domain.evaluated}문항에 중립값 50을
                      적용했습니다.
                    </p>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </section>
        <section class="card">
          <h2>점수에 영향을 준 주요 항목</h2>
          <p class="muted">문항별 중립값 50 대비 기여도입니다.</p>
          <Show
            when={
              props.report.positiveFactors.length +
                props.report.negativeFactors.length >
              0
            }
            fallback={
              <p class="muted">표시할 주요 점수 영향 요인이 없습니다.</p>
            }
          >
            <ul class="factors">
              <For each={props.report.positiveFactors}>
                {(factor) => <Factor factor={factor} />}
              </For>
              <For each={props.report.negativeFactors}>
                {(factor) => <Factor factor={factor} />}
              </For>
            </ul>
          </Show>
          <p class="micro">
            최대 상승·하락 요인 각 3개를 표시합니다. 과거 점수와의 변화가
            아닙니다. 개별 기여도의 합은 반올림과 일부 항목 생략으로 총점의 기준
            대비 차이와 다를 수 있습니다.
          </p>
        </section>
        <section class="card">
          <h2>상세 평가 정보</h2>
          <dl class="metadata">
            <div>
              <dt>평가 항목</dt>
              <dd>5개 영역 · 10문항</dd>
            </div>
            <div>
              <dt>실제 채점 응답</dt>
              <dd>{props.report.evaluatedCount}개</dd>
            </div>
            <div>
              <dt>미평가 항목</dt>
              <dd>{props.report.unevaluatedCount}개</dd>
            </div>
          </dl>
          <details>
            <summary>평가 산정 방식 알아보기</summary>
            <div class="method">
              <p>
                각 영역의 두 문항 평균에 동일한 20% 비중을 적용합니다. 중간값을
                반올림하지 않고 1~1,000점으로 환산합니다.
              </p>
              <p>
                미응답과 평가 제외 응답에는 중립값 50을 적용합니다. 마지막 두
                질문은 모든 수치와 등급에 영향을 주지 않습니다.
              </p>
              <p>
                본 결과는 신앙활동을 숫자로 환산한 가상 시뮬레이션이며, 실제
                신앙이나 구원의 상태를 판단하지 않습니다.
              </p>
            </div>
          </details>
        </section>
      </details>
      <div class="flex justify-center">
        <button class="text-button" onClick={props.onRevise}>
          답변 수정하기
        </button>
        <button class="text-button" onClick={props.onRestart}>
          처음부터 다시
        </button>
      </div>
    </div>
  );
}
