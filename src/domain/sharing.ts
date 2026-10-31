// Deliberately accepts no report or answers: all outbound content is static.
export const shareCardLines = ['당신의 신앙점수는 몇 점입니까?', '내 점수를 조회하고 나서야,', '더 중요한 질문을 발견했습니다.', '은혜는 점수로 얻을 수 없습니다.'] as const;
export function publicShareUrl(current: string): string {
  const url = new URL(current);
  return `${url.origin}${url.pathname}`;
}
export function sharePayload(current: string): ShareData {
  return { title: 'NICE FAITH', text: '내 점수를 조회하고 나서야, 더 중요한 질문을 발견했습니다.', url: publicShareUrl(current) };
}
export async function downloadShareCard(): Promise<void> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지 저장을 지원하지 않는 브라우저입니다.');
  context.fillStyle = '#F7F4EB'; context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = '#615C52'; context.font = 'bold 25px sans-serif'; context.fillText('NICE FAITH LAB', 90, 120);
  context.fillStyle = '#292720'; context.font = 'bold 52px sans-serif';
  context.fillText('당신의 신앙점수는', 90, 340); context.fillText('몇 점입니까?', 90, 420);
  context.font = '34px sans-serif'; context.fillText(shareCardLines[1], 90, 590); context.fillText(shareCardLines[2], 90, 650);
  context.strokeStyle = '#D9D2C5'; context.beginPath(); context.moveTo(90, 790); context.lineTo(990, 790); context.stroke();
  context.font = 'bold 43px serif'; context.fillText(shareCardLines[3], 90, 930);
  context.fillStyle = '#615C52'; context.font = '25px sans-serif'; context.fillText('독립 교육용 패러디 · 실제 신앙을 평가하지 않습니다.', 90, 1230);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('이미지를 만들지 못했습니다.')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'nice-faith-reflection.png';
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
