import { For, Show } from 'solid-js';
import { ArrowLeft, Check } from 'lucide-solid';
import { questions, domainDefinitions } from '../data/questions';
import type { Answers, ChoiceIndex } from '../domain/types';
import { PrimaryButton } from '../components/ui';
export default function QuestionnaireScreen(props: { question: number; answers: Answers; error: string; onAnswer: (id: number, value: ChoiceIndex | undefined) => void; onMove: (question: number) => void; onComplete: () => void }) {
  const question = () => questions[props.question - 1];
  const advance = () => props.question === 12 ? props.onComplete() : props.onMove(props.question + 1);
  const skip = () => { props.onAnswer(question().id, undefined); advance(); };
  return <div class="question-screen">
    <div class="flex justify-between mini-label"><span>나의 신앙활동 돌아보기</span><span>{props.question} / 12</span></div>
    <progress class="question-progress" aria-label="설문 진행" value={props.question} max={12}/>
    <div class="question-body">
      <p class="eyebrow">{question().scored ? domainDefinitions.find(domain => domain.id === question().domain)?.label : '조금 더 깊은 질문'}</p>
      <fieldset><legend><h1 tabIndex={-1}>{question().prompt}</h1></legend>
        <p class="muted question-note">{question().description ?? '지금의 모습에 가까운 답을 골라주세요. 건너뛰어도 괜찮습니다.'}</p>
        <div class="choices"><For each={question().choices}>{(choice, index) => <label class="choice" classList={{ selected: props.answers[question().id] === index() }}>
          <input type="radio" name={`question-${question().id}`} value={index()} checked={props.answers[question().id] === index()} onChange={() => props.onAnswer(question().id, index() as ChoiceIndex)}/>
          <span class="choice-indicator" aria-hidden="true">{props.answers[question().id] === index() ? <Check size={16}/> : index() + 1}</span><span>{choice.label}</span>
        </label>}</For></div>
      </fieldset>
      <Show when={props.error}><div class="error" role="alert">{props.error}<button class="text-button" onClick={() => props.onMove(1)}>첫 채점 질문으로 돌아가기</button></div></Show>
    </div>
    <div class="question-actions"><button class="button secondary" onClick={() => props.onMove(props.question - 1)}><ArrowLeft size={18} aria-hidden="true"/> 이전</button><PrimaryButton disabled={props.answers[question().id] === undefined} onClick={advance}>{props.question === 12 ? '리포트 확인하기' : '다음 질문'}</PrimaryButton></div>
    <button class="text-button skip" onClick={skip}>이 질문 건너뛰기</button>
  </div>;
}
