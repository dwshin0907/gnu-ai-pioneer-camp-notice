import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../worker.mjs';


class MemoryR2Object {
  constructor(key, entry) {
    this.key = key;
    this.size = entry.bytes.byteLength;
    this.httpMetadata = entry.httpMetadata ?? {};
    this.customMetadata = entry.customMetadata ?? {};
    this.body = entry.bytes;
    this._bytes = entry.bytes;
  }

  async text() {
    return new TextDecoder().decode(this._bytes);
  }

  async arrayBuffer() {
    return this._bytes.buffer.slice(
      this._bytes.byteOffset,
      this._bytes.byteOffset + this._bytes.byteLength
    );
  }
}

class MemoryR2Bucket {
  constructor() {
    this.entries = new Map();
  }

  async put(key, value, options = {}) {
    let bytes;
    if (typeof value === 'string') {
      bytes = new TextEncoder().encode(value);
    } else if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value);
    } else if (ArrayBuffer.isView(value)) {
      bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } else {
      bytes = new Uint8Array(await new Response(value).arrayBuffer());
    }
    this.entries.set(key, {
      bytes: new Uint8Array(bytes),
      httpMetadata: options.httpMetadata,
      customMetadata: options.customMetadata,
    });
    return { key, size: bytes.byteLength };
  }

  async get(key) {
    const entry = this.entries.get(key);
    return entry ? new MemoryR2Object(key, entry) : null;
  }

  async list({ prefix = '' } = {}) {
    return {
      objects: [...this.entries]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, entry]) => new MemoryR2Object(key, entry)),
      truncated: false,
    };
  }

  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.entries.delete(key);
    }
  }
}

function makeEnv() {
  return {
    RESULTS_BUCKET: new MemoryR2Bucket(),
    SUBMISSION_CODE: 'student-secret',
    ADMIN_CODE: 'admin-secret',
    ASSETS: {
      fetch: async () => new Response('static asset', { status: 200 }),
    },
  };
}

function validForm() {
  const form = new FormData();
  form.set('team', '1조');
  form.set('submitter', '이창민');
  form.set('title', 'AI 굿즈 스튜디오');
  form.set('summary', '아이디어를 굿즈 판매 페이지로 만드는 서비스');
  form.set('liveUrl', 'https://example.com/demo');
  form.set('githubUrl', 'https://github.com/example/demo');
  form.set('submissionCode', 'student-secret');
  return form;
}

async function createValidSubmission(env, form = validForm()) {
  const response = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST',
    body: form,
  }), env);
  assert.equal(response.status, 201);
  return (await response.json()).submission;
}

test('참가자 코드로 링크 결과물을 등록하고 최신순으로 조회한다', async () => {
  const env = makeEnv();
  const created = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST',
    body: validForm(),
  }), env);

  assert.equal(created.status, 201);

  const listed = await worker.fetch(
    new Request('https://camp.test/api/submissions'),
    env
  );
  const body = await listed.json();

  assert.equal(listed.status, 200);
  assert.equal(body.submissions.length, 1);
  assert.equal(body.submissions[0].title, 'AI 굿즈 스튜디오');
  assert.equal(body.submissions[0].team, '1조');
  assert.equal(body.submissions[0].submissionCode, undefined);
});

test('잘못된 참가자 코드는 등록을 거절한다', async () => {
  const env = makeEnv();
  const form = validForm();
  form.set('submissionCode', 'wrong-code');

  const response = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST',
    body: form,
  }), env);

  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /제출코드/);
});

test('배포 URL과 첨부 파일이 모두 없으면 등록을 거절한다', async () => {
  const env = makeEnv();
  const form = validForm();
  form.delete('liveUrl');

  const response = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST',
    body: form,
  }), env);

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /배포 URL|첨부 파일/);
});

test('허용되지 않은 첨부 확장자와 20MB 초과 파일을 거절한다', async () => {
  const env = makeEnv();
  const executable = validForm();
  executable.set('file', new File(['danger'], 'result.exe', {
    type: 'application/octet-stream',
  }));
  const extensionResponse = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST',
    body: executable,
  }), env);
  assert.equal(extensionResponse.status, 400);

  const oversized = validForm();
  oversized.set('file', new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'result.zip', {
    type: 'application/zip',
  }));
  const sizeResponse = await worker.fetch(new Request('https://camp.test/api/submissions', {
    method: 'POST',
    body: oversized,
  }), env);
  assert.equal(sizeResponse.status, 400);
  assert.match((await sizeResponse.json()).error, /20MB/);
});

test('첨부 파일을 안전한 다운로드 응답으로 제공한다', async () => {
  const env = makeEnv();
  const form = validForm();
  form.set('file', new File([new Uint8Array([1, 2, 3, 4])], 'demo result.zip', {
    type: 'application/zip',
  }));
  const submission = await createValidSubmission(env, form);

  const response = await worker.fetch(
    new Request(`https://camp.test/api/files/${submission.id}`),
    env
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.match(response.headers.get('content-disposition'), /demo%20result\.zip/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3, 4]));
});

test('관리자 코드 없이는 삭제할 수 없고 올바른 코드로 삭제한다', async () => {
  const env = makeEnv();
  const submission = await createValidSubmission(env);

  const denied = await worker.fetch(new Request(
    `https://camp.test/api/submissions/${submission.id}`,
    { method: 'DELETE' }
  ), env);
  assert.equal(denied.status, 403);

  const deleted = await worker.fetch(new Request(
    `https://camp.test/api/submissions/${submission.id}`,
    { method: 'DELETE', headers: { 'x-admin-code': 'admin-secret' } }
  ), env);
  assert.equal(deleted.status, 200);

  const listed = await worker.fetch(
    new Request('https://camp.test/api/submissions'),
    env
  );
  assert.equal((await listed.json()).submissions.length, 0);
});

test('API가 아닌 요청은 정적 에셋 바인딩으로 전달한다', async () => {
  const response = await worker.fetch(new Request('https://camp.test/index.html'), makeEnv());

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'static asset');
});
