// 챌린지 기간 설정
export const CHALLENGE_START = new Date(2026, 3, 6); // April 6, 2026
export const CHALLENGE_END = new Date(2026, 3, 18);  // April 18, 2026
export const TOTAL_DAYS = 13;

// 스탬프 이모지
export const STAMP_EMOJIS = ['🙏', '✝️', '📖', '🕊️', '❤️', '🌟', '🌸', '☀️', '🌈', '🎵', '🕯️', '⭐', '🏡'];

// 뱃지 정의 (클라이언트용)
export const BADGES = [
  { code: 'first_step', days: 1, emoji: '🌱', name: '첫걸음', msg: '첫 번째 예배를 드렸어요!' },
  { code: 'sprout', days: 3, emoji: '🌿', name: '새싹 예배자', msg: '3일 연속 예배 달성!' },
  { code: 'steady', days: 5, emoji: '🌻', name: '꾸준한 가정', msg: '5일 연속! 습관이 시작됩니다' },
  { code: 'week', days: 7, emoji: '🌟', name: '일주일 동행', msg: '일주일 연속 예배! 놀라워요 🎉' },
  { code: 'faithful', days: 10, emoji: '👑', name: '신실한 예배자', msg: '10일 연속! 진정한 예배자!' },
  { code: 'complete', days: 13, emoji: '🏆', name: '완주 가정', msg: '13일 완주! 하나님이 기뻐하십니다 💫' },
];

// 오늘의 말씀
export const TODAY_VERSE = {
  text: '"오늘 내가 네게 명하는 이 말씀을 너는 마음에 새기고 네 자녀에게 부지런히 가르치며 집에 앉았을 때에든지 길을 갈 때에든지 누워 있을 때에든지 일어날 때에든지 이 말씀을 강론할 것이며"',
  ref: '신명기 6:6-7',
};

// 날짜 유틸리티
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateKST(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

export function createChallengeDateKey(year: number, monthIndex: number, day: number): string {
  return formatDate(new Date(year, monthIndex, day));
}

export function getTodayKST(): string {
  return formatDateKST(new Date());
}

export function isInChallengePeriod(dateStr: string): boolean {
  // 문자열 비교: 'YYYY-MM-DD' 포맷이므로 UTC 파싱 시차 문제 없음
  return dateStr >= '2026-04-06' && dateStr <= '2026-04-18';
}

export function getChallengeDay(dateStr: string): number {
  const date = new Date(dateStr);
  const start = new Date('2026-04-06');
  const diff = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}
