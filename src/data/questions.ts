import type { Choice, Question } from '../domain/types';
const choices = (labels: readonly [string, string, string, string], scores: readonly [number | null, number | null, number | null, number | null]): [Choice, Choice, Choice, Choice] =>
  labels.map((label, i) => ({ label, score: scores[i] })) as [Choice, Choice, Choice, Choice];
export const questions: readonly Question[] = [
  { id: 1, domain: 'worship', scored: true, prompt: '최근 4주 동안 주일예배에 얼마나 참석하셨나요?', choices: choices(['4회', '3회', '1~2회', '참석하지 못함'], [100, 75, 40, 0]) },
  { id: 2, domain: 'worship', scored: true, prompt: '예배 시간에는 보통 어떤 모습인가요?', choices: choices(['집중하여 예배에 참여한다', '대체로 집중하지만 가끔 흐트러진다', '자주 다른 생각이나 스마트폰에 주의가 간다', '집중하기 어려운 경우가 많다'], [100, 75, 35, 10]) },
  { id: 3, domain: 'prayer', scored: true, prompt: '개인적으로 기도하는 빈도는 어느 정도인가요?', choices: choices(['거의 매일', '일주일에 3~5일', '일주일에 1~2일', '거의 하지 않는다'], [100, 75, 40, 0]) },
  { id: 4, domain: 'prayer', scored: true, prompt: '평소 개인 기도에 사용하는 시간은 얼마나 되나요?', choices: choices(['20분 이상', '10~20분 미만', '5~10분 미만', '5분 미만 또는 따로 시간을 정하지 않음'], [100, 75, 45, 15]) },
  { id: 5, domain: 'word', scored: true, prompt: '성경을 개인적으로 읽는 빈도는 어느 정도인가요?', choices: choices(['거의 매일', '일주일에 3~5일', '일주일에 1~2일', '거의 읽지 않는다'], [100, 75, 40, 0]) },
  { id: 6, domain: 'word', scored: true, prompt: '성경을 읽은 후 내용을 되새기거나 삶에 적용하려고 하나요?', choices: choices(['자주 실천하려 한다', '때때로 돌아본다', '읽는 데 집중하고 적용은 드물다', '잘 모르겠다'], [100, 75, 40, 20]) },
  { id: 7, domain: 'community', scored: true, prompt: '교회 또는 신앙 공동체의 모임에 얼마나 참여하나요?', choices: choices(['정기적으로 참여한다', '월 1~2회 참여한다', '가끔 참여한다', '현재 참여하지 않는다'], [100, 70, 35, 0]) },
  { id: 8, domain: 'community', scored: true, prompt: '교회 또는 이웃을 위한 봉사에 얼마나 참여하나요?', choices: choices(['정기적으로 봉사한다', '가끔 봉사한다', '기회가 있을 때 참여한다', '현재 참여하지 않는다'], [100, 65, 35, 0]) },
  { id: 9, domain: 'daily', scored: true, prompt: '최근 다른 사람을 용서하거나 화해해야 하는 상황에서 어떻게 행동했나요?', choices: choices(['화해와 용서를 위해 행동했다', '노력 중이지만 여전히 어렵다', '필요성은 알지만 아직 행동하지 못했다', '그런 상황이 없었거나 답하기 어렵다'], [100, 85, 50, null]) },
  { id: 10, domain: 'daily', scored: true, prompt: '다른 사람의 신앙생활을 보며 자신의 믿음을 비교한 적 있나요?', choices: choices(['비교하지 않으려고 의식적으로 노력한다', '가끔 비교하지만 돌아보려 한다', '자주 비교하며 우월감이나 열등감을 느낀다', '잘 모르겠다'], [100, 85, 35, null]) },
  { id: 11, domain: 'reflection', scored: false, prompt: '하나님이 멀게 느껴지거나 신앙에 의문이 생긴 적 있나요?', description: '이 질문은 점수에 반영되지 않습니다.', choices: choices(['자주 있다', '가끔 있다', '거의 없다', '잘 모르겠다'], [null, null, null, null]) },
  { id: 12, domain: 'reflection', scored: false, prompt: '신앙생활을 열심히 할수록 하나님께 더 사랑받는다고 생각하나요?', description: '이 질문은 점수에 반영되지 않습니다.', choices: choices(['매우 그렇다', '어느 정도 그렇다', '그렇지 않다', '잘 모르겠다'], [null, null, null, null]) },
];
export const domainDefinitions = [
  { id: 'worship', label: '예배' }, { id: 'prayer', label: '기도' },
  { id: 'word', label: '말씀' }, { id: 'community', label: '공동체' },
  { id: 'daily', label: '일상과 내면' },
] as const;
export const factorLabels = ['주일예배 참여', '예배 집중', '기도 빈도', '기도 시간', '성경 읽기', '말씀 적용', '공동체 참여', '이웃을 위한 봉사', '용서와 화해', '비교에 대한 성찰'] as const;
