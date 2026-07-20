const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'styles.css');
const scriptPath = path.join(root, 'script.js');
const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const script = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '';

test('학생 공지 페이지 파일이 존재한다', () => {
  assert.ok(fs.existsSync(htmlPath), 'index.html이 필요합니다');
  assert.ok(fs.existsSync(cssPath), 'styles.css가 필요합니다');
  assert.ok(fs.existsSync(scriptPath), 'script.js가 필요합니다');
});

test('문자 링크 미리보기에 집결 핵심 정보를 제공한다', () => {
  assert.match(html, /<html[^>]+lang="ko"/);
  assert.match(html, /<title>[^<]*09:40[^<]*월계관[^<]*<\/title>/);
  assert.match(html, /property="og:title"[^>]+content="내일 09:40 월계관 앞 집결"/);
  assert.match(html, /name="description"[^>]+09:40[^>]+10:00/);
});

test('집결과 버스 출발 정보를 정확히 안내한다', () => {
  for (const text of ['09:40', '10:00', '월계관', '체육관', '가좌캠퍼스', '버스는 10:00 출발']) {
    assert.ok(html.includes(text), `${text} 안내가 필요합니다`);
  }
  assert.match(html, /href="tel:010-6293-0916"/);
  assert.match(html, /김기현/);
});

test('캠프 개요와 연수원 내 전 일정 진행을 안내한다', () => {
  for (const text of [
    '2026. 7. 20.',
    '2026. 7. 21.',
    'KB손해보험 인재니움 사천연수원',
    '402호',
    '1인 1실',
    '식사 4식',
    '연수원 밖 외부 이동은 없습니다'
  ]) {
    assert.ok(html.includes(text), `${text} 안내가 필요합니다`);
  }
});

test('학생 준비물을 빠짐없이 안내한다', () => {
  for (const text of ['노트북', '충전기', '신분증', '세면도구', '개인 상비약']) {
    assert.ok(html.includes(text), `${text} 준비물 안내가 필요합니다`);
  }
  assert.match(html, /data-check-item/g);
});

test('1일차 전체 타임테이블을 안내한다', () => {
  const items = [
    ['10:00', '버스 출발'],
    ['10:40', '도착·접수'],
    ['11:00', '오리엔테이션'],
    ['12:00', '중식'],
    ['13:00', 'AI 창업 트렌드'],
    ['14:00', 'ChatGPT·Claude'],
    ['15:30', 'AI 디지털 콘텐츠'],
    ['18:00', '석식'],
    ['19:30', '정규 일정 종료']
  ];
  for (const [time, label] of items) {
    assert.ok(html.includes(time) && html.includes(label), `${time} ${label} 일정이 필요합니다`);
  }
});

test('2일차 전체 타임테이블을 안내한다', () => {
  const items = [
    ['07:30', '조식·체크아웃'],
    ['09:00', 'Codex·Claude Code'],
    ['10:30', '판매 홈페이지'],
    ['12:00', '중식'],
    ['13:00', '비즈니스 자동화'],
    ['14:30', 'AI 스타트업 데모데이'],
    ['15:30', '수료식·퇴소'],
    ['16:00', '복귀 버스']
  ];
  for (const [time, label] of items) {
    assert.ok(html.includes(time) && html.includes(label), `${time} ${label} 일정이 필요합니다`);
  }
});

test('연수원 핵심 이용 규정을 안내한다', () => {
  for (const text of ['명찰 상시 패용', '음식·주류 반입 금지', 'QR코드', '09:00까지 객실 퇴실']) {
    assert.ok(html.includes(text), `${text} 규정 안내가 필요합니다`);
  }
});

test('필수 리소스와 접근성 구조를 연결한다', () => {
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="script\.js"[^>]*defer/);
  assert.match(html, /href="#main"[^>]*>본문으로 바로가기/);
  assert.match(html, /<main[^>]+id="main"/);
  assert.match(html, /aria-label="1일차 전체 일정"/);
  assert.match(html, /aria-label="2일차 전체 일정"/);
});

test('학생에게 불필요한 운영 연락처는 공개하지 않는다', () => {
  for (const phone of ['010-8831-0705', '010-8911-9800', '010-4951-0699', '010-3835-1145', '055-851-7216']) {
    assert.ok(!html.includes(phone), `${phone}는 학생 공지에서 제외해야 합니다`);
  }
});

test('고정 전화 버튼은 탑승권 연락처가 화면에 보일 때 내용을 가리지 않는다', () => {
  assert.match(html, /<section class="boarding-pass"[^>]+data-hero-contact/);
  assert.match(html, /data-floating-call/);
  assert.match(css, /\.mobile-call\s*\{[\s\S]*?opacity:\s*0/);
  assert.match(css, /\.mobile-call\.is-visible/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /classList\.toggle\('is-visible'/);
});

test('최종 참가 준비 문구와 운영 주체 표현을 사용한다', () => {
  for (const text of [
    '신분증 또는 학생증',
    'Gmail 계정',
    'Chrome 브라우저',
    '김기현 선생님',
    '한국AI교육진흥원',
    '버스는 10:00 출발'
  ]) {
    assert.ok(html.includes(text), `${text} 문구가 필요합니다`);
  }
});

test('8개 조편성과 좌석배치도를 제공한다', () => {
  assert.equal((html.match(/data-team="\d"/g) || []).length, 8);
  assert.match(html, /src="team-seating\.png"/);
  assert.ok(fs.existsSync(path.join(root, 'team-seating.png')), '좌석배치 이미지가 필요합니다');
});

test('결과물 제출 폼과 게시판을 제공한다', () => {
  for (const id of ['results', 'result-form', 'result-list', 'result-status']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} 영역이 필요합니다`);
  }
  assert.match(html, /href="#results"[^>]*>결과물/);
  assert.match(html, /name="team"[^>]+required/);
  assert.match(html, /name="submissionCode"[^>]+required/);
  assert.match(html, /accept="[^"]*\.pdf[^"]*\.zip/);
  assert.match(html, /aria-live="polite"/);
});

test('결과물 스크립트는 API를 안전하게 사용한다', () => {
  assert.match(script, /fetch\('\/api\/submissions'/);
  assert.match(script, /new FormData/);
  assert.match(script, /textContent/);
  assert.match(script, /x-admin-code/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
});

test('오리엔테이션 자료를 가벼운 PPTX 첨부파일로 제공한다', () => {
  assert.match(html, /href="#resources"[^>]*>자료·계정/);
  assert.match(html, /<section[^>]+id="resources"/);
  assert.match(
    html,
    /href="GNU_AI_Pioneer_캠프_오리엔테이션_16x9\.pptx"[^>]+download/
  );
  assert.ok(html.includes('217KB'), '학생에게 파일 크기를 안내해야 합니다');
});

test('자료 영역에서 노션 실습페이지를 안전하게 새 탭으로 연다', () => {
  assert.match(
    html,
    /<a[^>]+href="https:\/\/m\.site\.naver\.com\/2akZH"[^>]+target="_blank"[^>]+rel="noopener noreferrer"[^>]*>[\s\S]*?노션 실습페이지 열기[\s\S]*?<\/a>/
  );
  assert.match(
    css,
    /\.resource-download--notion\s+small\s*\{[^}]*color:\s*var\(--white\)/s
  );
});

test('조장이 GPT 초대 이메일을 관리자에게 보낼 수 있다', () => {
  assert.match(html, /id="leader-email-form"/);
  assert.match(html, /name="leaderTeam"[^>]+required/);
  assert.match(html, /name="leaderName"[^>]+required/);
  assert.match(html, /name="inviteEmail"[^>]+type="email"[^>]+required/);
  assert.match(html, /name="privacyConsent"[^>]+type="checkbox"[^>]+required/);
  assert.match(html, /id="leader-email-status"[^>]+aria-live="polite"/);
  assert.ok(html.includes('whoareyoukh@naver.com'), '운영총괄 수신 주소가 필요합니다');
  assert.match(html, /메일 앱에서[^<]*보내기/);
});

test('상단에서 강의실 와이파이 접속 정보를 안내한다', () => {
  assert.match(html, /href="#wifi"[^>]*>와이파이/);
  assert.match(html, /<section[^>]+id="wifi"[^>]+aria-labelledby="wifi-title"/);
  assert.match(html, /<h2 id="wifi-title">강의실 Wi‑Fi<\/h2>/);
  assert.match(html, /<dt>네트워크 ID<\/dt>\s*<dd><code>kb_sc<\/code><\/dd>/);
  assert.match(html, /<dt>비밀번호<\/dt>\s*<dd><code>kbsc4000<\/code><\/dd>/);

  const wifiTab = html.indexOf('href="#wifi"');
  const prepareTab = html.indexOf('href="#prepare"');
  const wifiSection = html.indexOf('id="wifi"');
  const overviewSection = html.indexOf('<section class="overview');
  assert.ok(wifiTab > -1 && wifiTab < prepareTab, '와이파이는 첫 번째 상단 탭이어야 합니다');
  assert.ok(wifiSection > wifiTab && wifiSection < overviewSection, '와이파이 카드는 첫 콘텐츠여야 합니다');
});
