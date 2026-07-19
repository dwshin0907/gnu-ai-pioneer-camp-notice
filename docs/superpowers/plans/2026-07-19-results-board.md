# GNU AI Pioneer 결과물 게시판 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 캠프 안내 페이지에 참가자 코드로 보호되는 결과물 제출 폼과 R2 기반 공개 결과물 게시판을 추가한다.

**Architecture:** Pages Advanced Mode의 `_worker.js`가 `/api/*` 요청을 처리하고 나머지 요청은 `env.ASSETS.fetch()`로 전달한다. 게시글 JSON과 첨부 파일은 비공개 R2 버킷에 저장하며, 브라우저는 같은 출처 API만 사용한다.

**Tech Stack:** HTML, CSS, browser JavaScript, Cloudflare Pages Functions/Workers, R2, Node.js 내장 테스트, Wrangler

---

### Task 1: Worker API와 R2 저장 계층

**Files:**
- Create: `worker.mjs`
- Create: `tests/results-board.test.mjs`

- [ ] **Step 1: 정상 제출과 목록 조회의 실패 테스트 작성**

`tests/results-board.test.mjs`에 메모리 R2 대역을 만들고 다음 요청을 검증한다.

```js
test('참가자 코드로 링크 결과물을 등록하고 최신순으로 조회한다', async () => {
  const env = makeEnv();
  const form = validForm();
  const created = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST',
    body: form
  }), env);
  assert.equal(created.status, 201);

  const listed = await worker.fetch(
    new Request('https://camp.test/api/submissions'),
    env
  );
  const body = await listed.json();
  assert.equal(body.submissions.length, 1);
  assert.equal(body.submissions[0].title, 'AI 굿즈 스튜디오');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/results-board.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND`로 실패한다.

- [ ] **Step 3: 최소 Worker 라우팅과 저장 구현**

`worker.mjs`는 아래 공개 인터페이스를 제공한다.

```js
export const limits = { maxFileBytes: 20 * 1024 * 1024 };
export async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/submissions' && request.method === 'GET') {
    return listSubmissions(env);
  }
  if (url.pathname === '/api/submissions' && request.method === 'POST') {
    return createSubmission(request, env);
  }
  if (url.pathname.startsWith('/api/files/') && request.method === 'GET') {
    return downloadSubmission(url.pathname.split('/').pop(), env);
  }
  if (url.pathname.startsWith('/api/submissions/') && request.method === 'DELETE') {
    return deleteSubmission(url.pathname.split('/').pop(), request, env);
  }
  return Response.json({ error: 'API를 찾을 수 없습니다.' }, { status: 404 });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/')
      ? handleRequest(request, env)
      : env.ASSETS.fetch(request);
  }
};
```

POST는 `team`, `submitter`, `title`, `summary`, `liveUrl`, `githubUrl`, `file`, `submissionCode`를 읽는다. `records/{uuid}.json`과 선택적 `files/{uuid}/{sanitizedName}`을 저장하고 201을 반환한다. GET은 `records/`를 읽어 `createdAt` 내림차순으로 반환한다.

- [ ] **Step 4: 정상 제출 테스트 통과 확인**

Run: `node --test tests/results-board.test.mjs`

Expected: 정상 제출과 목록 테스트가 통과한다.

- [ ] **Step 5: 검증·다운로드·삭제 실패 테스트 추가**

다음 케이스를 독립 테스트로 추가한다.

```js
test('잘못된 참가자 코드는 403을 반환한다', async () => {
  const env = makeEnv();
  const form = validForm();
  form.set('submissionCode', 'wrong-code');
  const response = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST', body: form
  }), env);
  assert.equal(response.status, 403);
});

test('관리자 코드 없이는 삭제할 수 없고 올바른 코드로 삭제한다', async () => {
  const env = makeEnv();
  const created = await createValidSubmission(env);
  const denied = await worker.fetch(
    new Request(`https://camp.test/api/submissions/${created.id}`, { method: 'DELETE' }),
    env
  );
  assert.equal(denied.status, 403);
  const deleted = await worker.fetch(new Request(
    `https://camp.test/api/submissions/${created.id}`,
    { method: 'DELETE', headers: { 'x-admin-code': 'admin-secret' } }
  ), env);
  assert.equal(deleted.status, 200);
});
```

같은 파일에서 배포 URL·파일 동시 누락은 400, 20MB 초과와 차단 확장자는 400, 정상 첨부 다운로드는 `attachment`·`nosniff`, 비 API 요청은 `env.ASSETS.fetch()` 응답과 일치하는지 각각 검증한다.

- [ ] **Step 6: 실패 확인 후 검증·다운로드·삭제 구현**

Run: `node --test tests/results-board.test.mjs`

Expected: 새 케이스가 해당 기능 부재로 실패한다.

구현은 SHA-256 다이제스트의 바이트 비교로 비밀값을 검사하고, URL·문자 길이·파일 확장자·MIME·크기를 서버에서 검증한다. 다운로드는 `Content-Disposition: attachment`와 `X-Content-Type-Options: nosniff`를 설정한다. DELETE는 `x-admin-code` 헤더를 확인한 뒤 레코드와 파일을 함께 삭제한다.

- [ ] **Step 7: Worker 전체 테스트 통과 확인**

Run: `node --test tests/results-board.test.mjs`

Expected: Worker 테스트가 모두 통과한다.

- [ ] **Step 8: Worker 커밋**

```bash
git add worker.mjs tests/results-board.test.mjs
git commit -m "feat: add R2 results board API"
```

### Task 2: 결과물 제출과 게시판 UI

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `script.js`
- Modify: `tests/notice.test.js`

- [ ] **Step 1: UI 구조 실패 테스트 작성**

`tests/notice.test.js`에 제출 폼, 접근성 상태, 결과 목록을 확인한다.

```js
test('결과물 제출 폼과 게시판을 제공한다', () => {
  for (const id of ['results', 'result-form', 'result-list', 'result-status']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /name="team"[^>]+required/);
  assert.match(html, /name="submissionCode"[^>]+required/);
  assert.match(html, /accept="[^"]*\.pdf[^"]*\.zip/);
  assert.match(html, /aria-live="polite"/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/notice.test.js`

Expected: `results` 섹션이 없어 실패한다.

- [ ] **Step 3: HTML과 반응형 스타일 구현**

빠른 메뉴에 `결과물` 링크를 추가한다. `#results`에 제출 폼, 업로드 규칙, 상태 영역, 결과 목록, 관리자 모드 버튼을 배치한다. 기존 청색·연두색 종이 안내서 스타일을 이어가고 모바일에서는 단일 열, 700px 이상에서는 폼과 안내가 2열이 되도록 한다.

- [ ] **Step 4: DOM 동작 실패 테스트 작성**

정적 검사로 다음 안전 규칙을 추가한다.

```js
test('결과물 스크립트는 API를 사용하고 사용자 입력을 HTML로 삽입하지 않는다', () => {
  assert.match(script, /fetch\('\/api\/submissions/);
  assert.match(script, /textContent/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
});
```

- [ ] **Step 5: 실패 확인 후 클라이언트 동작 구현**

Run: `node --test tests/notice.test.js`

Expected: API 호출 코드가 없어 실패한다.

`script.js`에 `loadSubmissions`, `renderSubmissions`, `submitResult`, `enableAdminMode`, `deleteSubmission`을 추가한다. 모든 사용자 값은 `textContent`와 `href` 속성으로만 넣고, 성공 시 폼을 초기화하고 목록을 새로 불러온다.

- [ ] **Step 6: UI 테스트와 전체 회귀 확인**

Run: `npm test`

Expected: 기존 공지 테스트와 새 UI·Worker 테스트가 모두 통과한다.

- [ ] **Step 7: UI 커밋**

```bash
git add index.html styles.css script.js tests/notice.test.js
git commit -m "feat: add camp result submission UI"
```

### Task 3: 빌드와 Cloudflare 구성

**Files:**
- Create: `scripts/build.mjs`
- Create: `wrangler.jsonc`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `tests/build.test.mjs`

- [ ] **Step 1: 배포 묶음 실패 테스트 작성**

```js
test('빌드는 정적 파일과 Advanced Mode Worker를 dist에 생성한다', () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  for (const file of ['index.html', 'styles.css', 'script.js', 'team-seating.png', '_worker.js']) {
    assert.ok(existsSync(path.join(root, 'dist', file)), `${file}이 필요합니다`);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/build.test.mjs`

Expected: `scripts/build.mjs`이 없어 실패한다.

- [ ] **Step 3: 빌드 스크립트와 Wrangler 구성 구현**

`scripts/build.mjs`은 `dist` 내부의 알려진 배포 파일만 정리한 뒤 정적 파일을 복사하고 `worker.mjs`를 `dist/_worker.js`로 복사한다. `wrangler.jsonc`은 다음 구성을 사용한다.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "gnu-ai-pioneer-camp-notice",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2026-07-19",
  "r2_buckets": [
    {
      "binding": "RESULTS_BUCKET",
      "bucket_name": "gnu-ai-pioneer-camp-results"
    }
  ]
}
```

`package.json`에는 `"build": "node scripts/build.mjs"`를 추가한다.

- [ ] **Step 4: 빌드와 전체 테스트 확인**

Run: `npm test && npm run build`

Expected: 테스트가 모두 통과하고 `dist/_worker.js`가 존재한다.

- [ ] **Step 5: 구성 커밋**

```bash
git add scripts/build.mjs wrangler.jsonc package.json .gitignore tests/build.test.mjs
git commit -m "chore: configure Pages results storage"
```

### Task 4: R2 생성, 비밀값 설정, 배포 검증

**Files:**
- Source changes: none

- [ ] **Step 1: 최종 로컬 검증**

Run: `npm test && npm run build && git diff --check && git status --short`

Expected: 모든 테스트가 통과하고 문서화된 변경 외 예기치 않은 파일이 없다.

- [ ] **Step 2: R2 버킷 생성**

Run: `npx --yes wrangler r2 bucket create gnu-ai-pioneer-camp-results`

Expected: 버킷이 생성되거나 이미 존재한다는 확인을 받는다.

- [ ] **Step 3: 비밀값 설정**

PowerShell에서 암호학적 난수로 참가자 코드와 관리자 코드를 생성하고 다음 명령의 표준입력으로 전달한다.

```powershell
$submissionCode | npx --yes wrangler pages secret put SUBMISSION_CODE --project-name gnu-ai-pioneer-camp-notice
$adminCode | npx --yes wrangler pages secret put ADMIN_CODE --project-name gnu-ai-pioneer-camp-notice
```

Expected: 두 비밀값이 Pages 프로젝트에 저장된다. 코드 원문은 저장소나 로그에 기록하지 않고 최종 인계에서 사용자에게 한 번만 전달한다.

- [ ] **Step 4: 푸시와 Pages 배포**

```powershell
git push origin main
npx --yes wrangler pages deploy dist --project-name gnu-ai-pioneer-camp-notice --branch main --commit-hash (git rev-parse HEAD)
```

Expected: 배포 URL이 반환된다.

- [ ] **Step 5: 공개 환경 스모크 테스트**

공개 주소에서 정적 페이지와 `GET /api/submissions`가 200인지 확인한다. 잘못된 제출코드는 403인지 확인한다. 생성한 코드로 작은 링크 전용 테스트 게시물을 등록해 목록에 나타나는지 확인한 뒤 관리자 코드로 삭제하고 목록에서 사라지는지 확인한다.

- [ ] **Step 6: 최종 상태 확인**

Run: `git status --short && git log -5 --oneline`

Expected: 작업 트리가 깨끗하고 결과물 게시판 관련 커밋이 원격 `main`에 반영되어 있다.
