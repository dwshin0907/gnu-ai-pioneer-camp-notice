# Orientation Download and Leader Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight orientation PPTX download and a privacy-preserving team-leader email handoff to the existing camp notice site, then rotate the student submission code.

**Architecture:** Keep the site static and reuse the existing Cloudflare Pages Worker only for the current result board. The new email form builds an encoded `mailto:` URL in the browser so personal data is sent by the student's own mail app and never stored by the site. The PPTX is shipped as a static deployment asset.

**Tech Stack:** HTML, CSS, browser JavaScript, Node.js test runner, Cloudflare Pages/Wrangler

---

### Task 1: Add failing content and build tests

**Files:**
- Modify: `tests/notice.test.js`
- Modify: `tests/build.test.mjs`

- [ ] **Step 1: Add failing notice tests**

Assert that `index.html` contains `#resources`, a download link to `GNU_AI_Pioneer_캠프_오리엔테이션_16x9.pptx`, the `download` attribute, `leader-email-form`, fields named `team`, `leaderName`, and `inviteEmail`, a required consent checkbox, and the recipient `whoareyoukh@naver.com`. Assert that `script.js` contains `encodeURIComponent`, `mailto:`, and no `innerHTML` assignment.

- [ ] **Step 2: Add a failing build test**

Add the PPTX filename to the expected `dist` files and compare the built file size with the source asset.

- [ ] **Step 3: Verify the tests fail for missing functionality**

Run: `npm test`

Expected: failures naming the missing resource section, email form, or PPTX deployment asset.

### Task 2: Ship the orientation attachment

**Files:**
- Create: `GNU_AI_Pioneer_캠프_오리엔테이션_16x9.pptx`
- Modify: `scripts/build.mjs`

- [ ] **Step 1: Copy the verified presentation into the site**

Copy `../outputs/GNU_AI_Pioneer_캠프_오리엔테이션_16x9.pptx` byte-for-byte to the project root.

- [ ] **Step 2: Include the attachment in builds**

Add this entry to the build file map:

```js
['GNU_AI_Pioneer_캠프_오리엔테이션_16x9.pptx', 'GNU_AI_Pioneer_캠프_오리엔테이션_16x9.pptx'],
```

### Task 3: Add the resource and leader-email interface

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `script.js`

- [ ] **Step 1: Add the resource section markup**

Add `자료·계정` to the quick navigation. Insert `#resources` with a PPTX download card and `#leader-email-form`. The form contains required team, leader name, invitation email, and consent controls plus an ARIA live status region.

- [ ] **Step 2: Add mailto behavior**

On valid submission, build this logical payload with `encodeURIComponent`:

```text
To: whoareyoukh@naver.com
Subject: [GNU AI Pioneer 캠프] {team} 조장 GPT 초대 이메일
Body: 조 / 조장 이름 / 초대받을 이메일 / 이용 목적
```

Set `window.location.href` to the resulting `mailto:` URL and show the send-completion reminder. Reject invalid email values and missing consent before opening the mail app.

- [ ] **Step 3: Match the existing visual system**

Use the existing GNU blue, signal orange, rounded cards, grid motif, mobile-first single-column layout, and a two-column layout at 600px. Preserve keyboard focus and reduced-motion behavior.

- [ ] **Step 4: Verify green tests**

Run: `npm test`

Expected: all tests pass.

### Task 4: Rotate the submission code and deploy

**Files:**
- No source file contains the secret value.

- [ ] **Step 1: Build the exact deployment output**

Run: `npm run build`

Expected: the build reports six deployment files and the PPTX exists in `dist`.

- [ ] **Step 2: Set the production student code**

Write `GNU-PIONEER-0721` to the Cloudflare Pages `SUBMISSION_CODE` secret. Do not modify or reveal `ADMIN_CODE`.

- [ ] **Step 3: Commit and push validated source**

Commit only the spec, plan, tests, attachment, and site changes, then push `main` so the existing Pages production project deploys them.

- [ ] **Step 4: Verify production**

Confirm the production page includes the resource section, the PPTX responds successfully with the expected file size, the result API still responds, and a wrong submission code remains rejected. Do not send a real leader email during verification.

