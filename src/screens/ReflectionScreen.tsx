import { For, Show, createSignal } from 'solid-js';
import { Share2, Download, Link, Sprout, RotateCcw } from 'lucide-solid';
import { reflectionFor, reflectionPrompts } from '../data/reflectionCopy';
import { downloadShareCard, publicShareUrl, sharePayload } from '../domain/sharing';
import type { Answers } from '../domain/types';
export default function ReflectionScreen(props: { answers: Answers; onRestart: () => void }) {
  const copy = () => reflectionFor(props.answers);
  const [status, setStatus] = createSignal('');
  const [manualUrl, setManualUrl] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const copyUrl = async () => {
    const url = publicShareUrl(location.href);
    try { await navigator.clipboard.writeText(url); setStatus('주소를 복사했습니다. 점수와 답변은 포함되지 않습니다.'); }
    catch { setManualUrl(url); setStatus('주소를 선택한 후 직접 복사해 주세요.'); }
  };
  const share = async () => {
    if (!navigator.share) { await copyUrl(); return; }
    try { await navigator.share(sharePayload(location.href)); setStatus('공유를 완료했습니다.'); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) await copyUrl(); }
  };
  const save = async () => {
    setSaving(true);
    try { await downloadShareCard(); setStatus('공유 이미지를 저장했습니다.'); }
    catch { setStatus('이미지를 저장하지 못했습니다. 주소 공유를 이용해 주세요.'); }
    finally { setSaving(false); }
  };
  return <div class="reflection">
    <header class="reflection-hero"><span class="reflection-icon" aria-hidden="true"><Sprout size={32}/></span><p class="eyebrow">숫자가 멈춘 자리에서</p><h1 tabIndex={-1}>측정 불가</h1><p class="reflection-statement">은혜는 점수로<br/>얻을 수 없습니다.</p></header>
    <p class="reflection-body">우리는 얼마나 예배했는지, 얼마나 기도했는지, 얼마나 봉사했는지 기록할 수 있습니다. 그러나 그 기록으로 하나님의 사랑이나 구원의 자격을 계산할 수는 없습니다.</p>
    <section class="scripture"><h2>은혜로 시작되는 삶</h2><p>구원은 하나님의 선물이며, 우리는 선한 일을 위해 지음받았습니다.</p><p class="micro">에베소서 2:8–10의 뜻을 풀어 쓴 설명</p><a href="https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book=eph&chap=2" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">에베소서 2:8–10 읽기 ↗</a></section>
    <p class="reflection-body">선한 행위는 은혜를 얻기 위한 거래가 아니라, 은혜를 받은 삶에서 맺는 열매입니다.</p>
    <section class="personal-reflection"><h2>당신에게 건네는 이야기</h2><p class="personal-primary">{copy().primary}</p><p class="personal-secondary">{copy().secondary}</p></section>
    <section class="reflection-prompts"><h2>잠시, 마음에 남겨 보세요</h2><p class="muted">답을 적거나 제출할 필요는 없습니다.</p><For each={reflectionPrompts}>{(prompt, index) => <div class="reflection-prompt"><span aria-hidden="true">0{index() + 1}</span><p>{prompt}</p></div>}</For></section>
    <section class="share-section"><h2>더 중요한 질문을 함께</h2><p class="muted">점수·등급·답변·개인화 메시지는 공유되지 않습니다.</p><button class="button warm-button" onClick={share}><Share2 size={18} aria-hidden="true"/> 질문 나누기</button><div class="share-actions"><button class="button secondary" onClick={copyUrl}><Link size={17} aria-hidden="true"/> 주소 복사</button><button class="button secondary" disabled={saving()} onClick={save}><Download size={17} aria-hidden="true"/> {saving() ? '저장 중...' : '이미지 저장'}</button></div><p class="micro" role="status">{status()}</p><Show when={manualUrl()}><label class="manual-url">공유 주소<input type="url" readonly value={manualUrl()} onFocus={event => event.currentTarget.select()}/></label></Show></section>
    <button class="text-button restart" onClick={props.onRestart}><RotateCcw size={16} aria-hidden="true"/> 처음부터 다시 돌아보기</button>
  </div>;
}
