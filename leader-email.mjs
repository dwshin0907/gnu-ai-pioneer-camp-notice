export const LEADER_EMAIL_RECIPIENT = 'whoareyoukh@naver.com';


export function isValidInviteEmail(value) {
  const email = String(value ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildLeaderMailto({ team, leaderName, inviteEmail }) {
  const cleanTeam = String(team ?? '').trim();
  const cleanName = String(leaderName ?? '').trim();
  const cleanEmail = String(inviteEmail ?? '').trim();

  if (!/^[1-8]조$/.test(cleanTeam)) {
    throw new Error('조를 선택해 주세요.');
  }
  if (!cleanName) {
    throw new Error('조장 이름을 입력해 주세요.');
  }
  if (!isValidInviteEmail(cleanEmail)) {
    throw new Error('초대받을 이메일 주소를 다시 확인해 주세요.');
  }

  const subject = `[GNU AI Pioneer 캠프] ${cleanTeam} 조장 GPT 초대 이메일`;
  const body = [
    'GNU AI Pioneer 캠프 GPT 유료 계정 초대 요청',
    '',
    `조: ${cleanTeam}`,
    `조장 이름: ${cleanName}`,
    `초대받을 이메일: ${cleanEmail}`,
    '',
    '이용 목적: 캠프 실습용 GPT 유료 계정 초대',
  ].join('\n');

  return `mailto:${LEADER_EMAIL_RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
