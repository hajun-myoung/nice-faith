import { For, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { ArrowLeft, Check } from "lucide-solid";
import { questions, domainDefinitions } from "../data/questions";
import type { Answers, ChoiceIndex } from "../domain/types";
import { useReducedMotion } from "../components/ui";
export default function QuestionnaireScreen(props: {
  question: number;
  answers: Answers;
  error: string;
  onAnswer: (id: number, value: ChoiceIndex | undefined) => void;
  onMove: (question: number) => void;
  onComplete: () => void;
}) {
  const reduced = useReducedMotion();
  const [advancing, setAdvancing] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelAdvance = () => {
    clearTimeout(timer);
    setAdvancing(false);
  };
  createEffect(() => {
    props.question;
    cancelAdvance();
  });
  onCleanup(cancelAdvance);
  const select = (value: ChoiceIndex) => {
    if (advancing()) return;
    props.onAnswer(props.question, value);
    if (props.question === 12) return;
    const current = props.question;
    setAdvancing(true);
    timer = setTimeout(
      () => {
        setAdvancing(false);
        if (props.question === current) props.onMove(current + 1);
      },
      reduced() ? 0 : 300,
    );
  };
  const move = (question: number) => {
    cancelAdvance();
    props.onMove(question);
  };
  const question = () => questions[props.question - 1];
  const advance = () => {
    cancelAdvance();
    props.question === 12
      ? props.onComplete()
      : props.onMove(props.question + 1);
  };
  const skip = () => {
    props.onAnswer(question().id, undefined);
    advance();
  };
  return (
    <div class="question-screen">
      <div class="flex justify-between mini-label">
        <span>
          {question().scored
            ? domainDefinitions.find(
                (domain) => domain.id === question().domain,
              )?.label
            : "조금 더 깊은 질문"}
        </span>
        <span>{props.question} / 12</span>
      </div>
      <progress
        class="question-progress"
        aria-label="설문 진행"
        value={props.question}
        max={12}
      />
      <div class="question-body">
        <fieldset>
          <legend>
            <h1 tabIndex={-1}>{question().prompt}</h1>
          </legend>
          <p class="muted question-note">
            {question().description}{" "}
            {props.question < 12
              ? "선택하면 다음 질문으로 이동합니다."
              : "선택 후 결과 확인하기를 눌러주세요."}
          </p>
          <div class="choices">
            <For each={question().choices}>
              {(choice, index) => (
                <label
                  class="choice"
                  classList={{
                    selected: props.answers[question().id] === index(),
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${question().id}`}
                    value={index()}
                    checked={props.answers[question().id] === index()}
                    disabled={advancing()}
                    onChange={() => select(index() as ChoiceIndex)}
                  />
                  <span class="choice-indicator" aria-hidden="true">
                    {props.answers[question().id] === index() ? (
                      <Check size={16} />
                    ) : (
                      index() + 1
                    )}
                  </span>
                  <span>{choice.label}</span>
                </label>
              )}
            </For>
          </div>
        </fieldset>
        <Show when={props.error}>
          <div class="error" role="alert">
            {props.error}
            <button class="text-button" onClick={() => props.onMove(1)}>
              첫 채점 질문으로 돌아가기
            </button>
          </div>
        </Show>
      </div>
      <p class="sr-only" role="status">
        {advancing() ? "답변을 선택했습니다. 다음 질문으로 이동합니다." : ""}
      </p>
      <div class="question-actions">
        <button
          class="button previous-button"
          onClick={() => move(props.question - 1)}
        >
          <ArrowLeft size={18} aria-hidden="true" /> 이전으로 가기
        </button>
        <button
          class="button"
          classList={{
            secondary: props.question !== 12,
            primary: props.question === 12,
          }}
          disabled={advancing() || props.answers[question().id] === undefined}
          onClick={advance}
        >
          {props.question === 12 ? "결과 확인하기" : "다음 질문"}
        </button>
      </div>
      <button class="text-button skip" onClick={skip}>
        이 질문 건너뛰기
      </button>
    </div>
  );
}
