import { Match, Switch, Show, createSignal, createMemo, createEffect, onMount } from 'solid-js';
import { useNavigation } from './navigation';
import type { Answers, ChoiceIndex } from '../domain/types';
import { buildFaithReport } from '../domain/scoring';
import { Brand, Disclaimer } from '../components/ui';
import LandingScreen from '../screens/LandingScreen';
import QuestionnaireScreen from '../screens/QuestionnaireScreen';
import EvaluationScreen from '../screens/EvaluationScreen';
import ResultReportScreen from '../screens/ResultReportScreen';
import RevealScreen from '../screens/RevealScreen';
import ReflectionScreen from '../screens/ReflectionScreen';
export default function App() {
  const { route, navigate } = useNavigation();
  const [answers, setAnswers] = createSignal<Answers>({});
  const [error, setError] = createSignal('');
  const report = createMemo(() => buildFaithReport(answers()));
  const warm = () => route().view === 'reflection' || route().view === 'reveal';
  const finishReveal = () => navigate('reflection', 1, true);
  const restart = () => { setAnswers({}); setError(''); navigate('landing', 1, true); };
  const answer = (id: number, value: ChoiceIndex | undefined) => {
    setAnswers(previous => { const next = { ...previous }; if (value === undefined) delete next[id]; else next[id] = value; return next; });
    setError('');
  };
  const complete = () => {
    if (!report()) { setError('아직 점수를 만들 수 없습니다. 앞의 10개 질문 중 채점 가능한 답변을 하나 이상 선택해 주세요.'); return; }
    navigate('evaluation');
  };
  createEffect(() => {
    const view = route().view;
    if (!report() && ['report', 'evaluation', 'reveal'].includes(view)) navigate('questionnaire', 1, true);
  });
  const focusHeading = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  };
  onMount(() => queueMicrotask(focusHeading));
  createEffect(() => { route(); queueMicrotask(focusHeading); });
  return <div class="app-shell" classList={{ 'warm-shell': warm(), 'revealing-shell': route().view === 'reveal' }}>
    <a class="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>본문으로 바로가기</a>
    <div class="app-column"><header class="app-header"><Brand/><span class="lab-label">LAB</span></header>
      <main id="main-content" tabIndex={-1}><Switch>
        <Match when={route().view === 'landing'}><LandingScreen onStart={() => navigate('questionnaire')}/></Match>
        <Match when={route().view === 'questionnaire'}><QuestionnaireScreen question={route().question} answers={answers()} error={error()} onAnswer={answer} onMove={question => question < 1 ? navigate('landing') : navigate('questionnaire', question)} onComplete={complete}/></Match>
        <Match when={route().view === 'evaluation' && report()}><EvaluationScreen onDone={() => navigate('report', 1, true)} onCancel={() => navigate('questionnaire', 12, true)}/></Match>
        <Match when={route().view === 'report'}><Show when={report()}>{current => <ResultReportScreen report={current()} onReveal={() => navigate('reveal')} onRevise={() => navigate('questionnaire')} onRestart={restart}/>}</Show></Match>
        <Match when={route().view === 'reveal'}><Show when={report()}>{current => <RevealScreen report={current()} onDone={finishReveal}/>}</Show></Match>
        <Match when={route().view === 'reflection'}><ReflectionScreen answers={answers()} onRestart={restart}/></Match>
      </Switch></main><Show when={route().view !== 'reveal'}><Disclaimer/></Show>
    </div>
  </div>;
}
