# Notion Practice Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clearly labeled Notion practice page link to the existing resource card and publish it.

**Architecture:** Extend the existing static `resources` section with one semantic external anchor. Reuse the card action pattern with a small modifier class, and cover the exact destination and link safety attributes in the existing HTML test suite.

**Tech Stack:** Static HTML, CSS, Node.js built-in test runner, existing Cloudflare Pages deployment

---

### Task 1: Add the Notion link contract test

**Files:**
- Modify: `tests/notice.test.js`

- [ ] **Step 1: Write the failing test**

Add a test that asserts `노션 실습페이지 열기`, the exact `https://m.site.naver.com/2akZH` URL, `target="_blank"`, and `rel="noopener noreferrer"`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/notice.test.js`

Expected: FAIL because the Notion URL is not present yet.

- [ ] **Step 3: Commit the failing test together with the implementation after GREEN**

Do not commit a deliberately failing branch state.

### Task 2: Implement the resource button

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Test: `tests/notice.test.js`

- [ ] **Step 1: Add the external anchor**

Insert this action under the PPTX download action:

```html
<a class="resource-download resource-download--notion" href="https://m.site.naver.com/2akZH" target="_blank" rel="noopener noreferrer">
  <span><small>실습 바로가기</small>노션 실습페이지 열기</span>
  <i aria-hidden="true">↗</i>
</a>
```

- [ ] **Step 2: Add the minimal modifier style**

Give `.resource-download--notion` a 10px top gap, white text, a translucent blue background, and a subtle white border. Set its `small` label to a light blue.

- [ ] **Step 3: Update the resource introduction**

Mention the Notion practice page in the resource section description.

- [ ] **Step 4: Run focused and full verification**

Run: `node --test tests/notice.test.js`, then `npm test`, then `npm run build`, then `git diff --check`.

Expected: all tests pass, the build succeeds, and the diff has no whitespace errors.

- [ ] **Step 5: Commit**

```text
feat: add Notion practice page link
```

### Task 3: Publish and verify

**Files:**
- No source changes expected

- [ ] **Step 1: Merge the verified feature branch into `main`**

Use a fast-forward merge and rerun `npm test` plus `npm run build` on the merged result.

- [ ] **Step 2: Push and deploy**

Push `main` to the existing origin and deploy the validated `dist` directory to the existing Cloudflare Pages project.

- [ ] **Step 3: Verify production**

Request the public site and assert HTTP 200, the exact Notion URL, the link label, and the existing submissions API response.
