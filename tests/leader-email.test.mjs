import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = path.join(root, 'leader-email.mjs');


test('조장 이메일 주소를 검증한다', async () => {
  assert.ok(existsSync(helperPath), 'leader-email.mjs가 필요합니다');
  const { isValidInviteEmail } = await import(pathToFileURL(helperPath));

  assert.equal(isValidInviteEmail('leader@example.com'), true);
  assert.equal(isValidInviteEmail(' leader@example.com '), true);
  assert.equal(isValidInviteEmail('leader.example.com'), false);
  assert.equal(isValidInviteEmail(''), false);
});

test('관리자 수신 주소와 입력값을 안전하게 인코딩한 메일 링크를 만든다', async () => {
  assert.ok(existsSync(helperPath), 'leader-email.mjs가 필요합니다');
  const { buildLeaderMailto } = await import(pathToFileURL(helperPath));

  const mailto = buildLeaderMailto({
    team: '3조',
    leaderName: '김 조장',
    inviteEmail: 'leader+camp@example.com',
  });

  assert.match(mailto, /^mailto:whoareyoukh@naver\.com\?/);
  assert.ok(mailto.includes(encodeURIComponent('[GNU AI Pioneer 캠프] 3조 조장 GPT 초대 이메일')));
  assert.ok(mailto.includes(encodeURIComponent('leader+camp@example.com')));
  assert.ok(!mailto.includes('김 조장'), '사용자 입력은 URL 인코딩되어야 합니다');
});

test('필수 조장 정보가 없거나 이메일 형식이 틀리면 메일 링크를 만들지 않는다', async () => {
  assert.ok(existsSync(helperPath), 'leader-email.mjs가 필요합니다');
  const { buildLeaderMailto } = await import(pathToFileURL(helperPath));

  assert.throws(() => buildLeaderMailto({ team: '', leaderName: '김조장', inviteEmail: 'a@b.com' }));
  assert.throws(() => buildLeaderMailto({ team: '1조', leaderName: '', inviteEmail: 'a@b.com' }));
  assert.throws(() => buildLeaderMailto({ team: '1조', leaderName: '김조장', inviteEmail: 'not-an-email' }));
});
