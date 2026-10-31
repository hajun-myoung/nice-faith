import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { reflectionFor } from '../data/reflectionCopy';
import { publicShareUrl, sharePayload, downloadShareCard } from '../domain/sharing';
import ReflectionScreen from '../screens/ReflectionScreen';
describe('reflection and privacy', () => {
  it('selects all personalized messages and safe unanswered defaults', () => {
    expect(reflectionFor({})).toEqual(reflectionFor({ 11: 3, 12: 3 }));
    expect(new Set([0,1,2,3].map(i => reflectionFor({ 12: i as 0|1|2|3 }).primary)).size).toBe(4);
    expect(new Set([0,1,2,3].map(i => reflectionFor({ 11: i as 0|1|2|3 }).secondary)).size).toBe(4);
    expect(reflectionFor({ 12: 0 }).primary).toContain('보상이 아닙니다');
    expect(reflectionFor({ 11: 0 }).secondary).toContain('실패로 단정할 수는 없습니다');
  });
  it('strips both query and hash from shared URLs', () => {
    expect(publicShareUrl('https://faith.example/app/?score=1000&answers=secret#/report')).toBe('https://faith.example/app/');
    expect(sharePayload('https://faith.example/?answer=secret#/reflection')).toEqual({ title: 'NICE FAITH', text: '내 점수를 조회하고 나서야, 더 중요한 질문을 발견했습니다.', url: 'https://faith.example/' });
  });
  it('renders personalized content with no score, grade or graph', () => {
    const { container } = render(() => <ReflectionScreen answers={{ 11: 0, 12: 0 }} onRestart={() => {}}/>);
    expect(screen.getByRole('heading', { name: '측정 불가' })).toBeTruthy();
    expect(screen.getByText(reflectionFor({12:0}).primary)).toBeTruthy();
    expect(container.querySelector('.score,.grade,[role="meter"]')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
  });
  it('copies only the clean URL, with a manual fallback on denial', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    history.replaceState(null, '', '/?answers=secret#/reflection');
    render(() => <ReflectionScreen answers={{12:0}} onRestart={() => {}}/>);
    await fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));
    const input = await screen.findByRole('textbox', { name: '공유 주소' }) as HTMLInputElement;
    expect(input.value).not.toContain('secret');
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/`);
  });
  it('uses native sharing with static text and does not copy on user cancellation', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(() => <ReflectionScreen answers={{12:0}} onRestart={() => {}}/>);
    await fireEvent.click(screen.getByRole('button', { name: '질문 나누기' }));
    expect(share).toHaveBeenCalledWith(sharePayload(location.href));
    expect(writeText).not.toHaveBeenCalled();
    delete (navigator as Partial<Navigator>).share;
  });
  it('downloads a PNG containing only fixed text and revokes its URL', async () => {
    vi.useFakeTimers();
    const text = vi.fn();
    const context = { fillRect: vi.fn(), fillText: text, beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], {type:'image/png'})));
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn().mockReturnValue('blob:card') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadShareCard();
    expect(click).toHaveBeenCalledOnce();
    const lines = text.mock.calls.map(call => call[0]).join(' ');
    expect(lines).toContain('은혜는 점수로 얻을 수 없습니다.');
    expect(lines).not.toContain('1000');
    expect(lines).not.toContain(reflectionFor({12:0}).primary);
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:card');
  });
});
