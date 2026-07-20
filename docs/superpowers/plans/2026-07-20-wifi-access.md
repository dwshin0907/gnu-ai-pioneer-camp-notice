# Wi-Fi Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top navigation tab and immediately visible Wi‑Fi credential card to the camp notice site.

**Architecture:** Keep the feature entirely static. Add semantic HTML to `index.html`, style it with the existing design tokens in `styles.css`, and protect the exact content with the existing Node test suite.

**Tech Stack:** HTML, CSS, Node.js test runner, Cloudflare Pages

---

### Task 1: Test and implement the Wi‑Fi card

**Files:**
- Modify: `tests/notice.test.js`
- Modify: `index.html`
- Modify: `styles.css`

- [ ] **Step 1: Write the failing test**

Add this test to `tests/notice.test.js`:

```js
test('상단에서 강의실 와이파이 접속 정보를 안내한다', () => {
  assert.match(html, /href="#wifi"[^>]*>와이파이/);
  assert.match(html, /<section[^>]+id="wifi"/);
  assert.match(html, /<dt>네트워크 ID<\/dt>\s*<dd><code>kb_sc<\/code><\/dd>/);
  assert.match(html, /<dt>비밀번호<\/dt>\s*<dd><code>kbsc4000<\/code><\/dd>/);
});
```

- [ ] **Step 2: Verify the test fails**

Run: `node --test tests/notice.test.js`

Expected: one failure because `#wifi`, `kb_sc`, and `kbsc4000` do not exist yet.

- [ ] **Step 3: Add the tab and semantic card**

Insert `<a href="#wifi">와이파이</a>` as the first quick-navigation link. Directly after the navigation, add `section.wifi-access#wifi` with a `dl` containing these exact pairs:

```html
<div><dt>네트워크 ID</dt><dd><code>kb_sc</code></dd></div>
<div><dt>비밀번호</dt><dd><code>kbsc4000</code></dd></div>
```

- [ ] **Step 4: Style the card**

Use existing `--gnu-blue`, `--signal`, `--paper`, and `--radius` tokens. Keep the card single-column on narrow screens and display the two credential fields side by side from 600px.

- [ ] **Step 5: Verify tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and seven deployment files are built.

- [ ] **Step 6: Commit and deploy**

Commit the HTML, CSS, test, spec, and plan; push `main`; deploy `dist` to the existing `gnu-ai-pioneer-camp-notice` Cloudflare Pages project. Verify the production page returns 200 and contains `id="wifi"`, `kb_sc`, and `kbsc4000`.

