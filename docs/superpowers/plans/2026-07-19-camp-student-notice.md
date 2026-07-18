# GNU AI Pioneer 캠프 학생 공지 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문자로 공유할 GNU AI Pioneer 캠프 학생 공지 페이지를 제작해 GitHub와 Cloudflare Pages에 공개한다.

**Architecture:** 외부 프레임워크가 없는 정적 사이트다. HTML은 모든 핵심 정보를 담고, CSS는 모바일 우선 반응형 디자인을 담당하며, 자바스크립트는 준비물 체크 상태 저장만 점진적으로 추가한다. Node 내장 테스트 러너와 문자열·DOM 구조 검사를 사용해 내용 누락을 막는다.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript, Node.js test runner, Cloudflare Pages, GitHub

---

## 파일 구조

- `index.html`: 공유 메타데이터, 모든 공지 콘텐츠와 의미 구조
- `styles.css`: 색상 토큰, 탑승권형 히어로, 타임라인, 반응형·접근성 스타일
- `script.js`: 준비물 체크 상태를 `localStorage`에 저장·복원
- `tests/notice.test.js`: 필수 일정·연락처·메타데이터·파일 연결 검증
- `package.json`: 테스트와 로컬 미리보기 명령
- `wrangler.jsonc`: Cloudflare Pages 프로젝트용 정적 자산 설정
- `.gitignore`: 로컬 임시물과 의존성 제외

### Task 1: 필수 공지 콘텐츠 계약

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/notice.test.js`에서 `index.html`을 읽고 다음 계약을 검사한다.

```js
test('집결과 출발 정보를 정확히 안내한다', () => {
  for (const text of ['09:40', '10:00', '월계관', '체육관', '010-6293-0916']) {
    assert.match(html, new RegExp(text.replaceAll('-', '\\-')));
  }
});

test('전체 타임테이블을 빠짐없이 안내한다', () => {
  for (const time of ['10:40', '11:00', '12:00', '13:00', '14:00', '15:30', '18:00', '19:30', '07:30', '09:00', '10:30', '14:30', '16:00']) {
    assert.match(html, new RegExp(time.replace(':', '\\:')));
  }
});
```

- [ ] **Step 2: RED 확인**

Run: `npm test`
Expected: FAIL — `index.html`이 아직 없어 테스트가 실패한다.

- [ ] **Step 3: 프로젝트 최소 설정 작성**

`package.json`에 `"test": "node --test"`를 정의하고 `.gitignore`에 `node_modules/`, `.wrangler/`, `screenshots/`를 추가한다.

- [ ] **Step 4: 다시 RED 확인**

Run: `npm test`
Expected: FAIL — 필수 공지 HTML이 아직 없다.

### Task 2: 공지 페이지 구현

- [ ] **Step 1: 의미 있는 HTML 작성**

`index.html`에 건너뛰기 링크, 집결 히어로, 네 가지 핵심 정보, 준비물 체크리스트, 1·2일차 전체 타임라인, 연수원 규칙, 복귀 및 연락 푸터를 작성한다. 공유 메타데이터는 다음 값을 사용한다.

```html
<title>7/20(월) 09:40 월계관 앞 집결 | GNU AI Pioneer 캠프</title>
<meta name="description" content="GNU AI Pioneer 캠프 참가 안내: 7월 20일(월) 09:40까지 경상국립대학교 가좌캠퍼스 월계관(체육관) 앞 집결, 10:00 정각 출발">
<meta property="og:title" content="내일 09:40 월계관 앞 집결">
<meta property="og:description" content="GNU AI Pioneer 캠프 1차 참가 안내 · 10:00 버스 정각 출발">
```

- [ ] **Step 2: 모바일 우선 스타일 작성**

`styles.css`에 설계 색상 토큰, 360px부터 안전한 레이아웃, 44px 터치 영역, 키보드 포커스, 탑승권 절취선, 시간표 카드, 고정 전화 버튼, 인쇄 스타일과 reduced-motion 대응을 작성한다.

- [ ] **Step 3: 준비물 체크 기능 작성**

`script.js`에서 `[data-check-item]` 체크박스 상태를 `gnu-camp-prep` 키로 저장하고 오류가 나도 페이지가 계속 동작하게 한다.

```js
const key = 'gnu-camp-prep';
const items = [...document.querySelectorAll('[data-check-item]')];
let saved = {};
try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { saved = {}; }
items.forEach((item) => {
  item.checked = Boolean(saved[item.value]);
  item.addEventListener('change', () => {
    saved[item.value] = item.checked;
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch {}
  });
});
```

- [ ] **Step 4: GREEN 확인**

Run: `npm test`
Expected: 모든 공지 계약 테스트 PASS.

- [ ] **Step 5: 구현 커밋**

```bash
git add index.html styles.css script.js package.json .gitignore tests/notice.test.js
git commit -m "feat: build mobile camp student notice"
```

### Task 3: 브라우저·접근성 검증

- [ ] **Step 1: 정적 서버 실행**

Run: `npx serve . -l 4173`
Expected: `http://localhost:4173`에서 HTTP 200.

- [ ] **Step 2: 모바일·데스크톱 캡처**

Chromium으로 390×844 및 1440×1000 화면을 캡처하고 가로 넘침, 텍스트 겹침, 고정 전화 버튼 가림을 확인한다.

- [ ] **Step 3: 자동 접근성 및 링크 확인**

Run: `npx --yes html-validate index.html`
Expected: 오류 0건.

- [ ] **Step 4: 최종 회귀 확인**

Run: `npm test`
Expected: 모든 테스트 PASS.

### Task 4: GitHub·Cloudflare 배포

- [ ] **Step 1: 배포 설정 작성**

`wrangler.jsonc`에 Pages 직접 배포용 프로젝트 정보를 기록하고 정적 출력 디렉터리를 현재 디렉터리로 둔다.

- [ ] **Step 2: GitHub 저장소 생성·푸시**

Run: `gh repo create gnu-ai-pioneer-camp-notice --public --source . --remote origin --push`
Expected: `main` 브랜치가 GitHub 원격에 생성된다.

- [ ] **Step 3: Cloudflare Pages 배포**

Run: `npx wrangler pages deploy . --project-name gnu-ai-pioneer-camp-notice --branch main --commit-dirty=true`
Expected: `*.pages.dev` 배포 URL이 출력된다.

- [ ] **Step 4: 공개 URL 검증**

공개 URL을 요청해 HTTP 200, `09:40`, `월계관`, `010-6293-0916`을 확인한다.

- [ ] **Step 5: 배포 설정 커밋·푸시**

```bash
git add wrangler.jsonc
git commit -m "chore: configure Cloudflare Pages deployment"
git push origin main
```
