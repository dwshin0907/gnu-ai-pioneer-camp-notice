const RECORD_PREFIX = 'records/';
const FILE_PREFIX = 'files/';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};
const ALLOWED_FILES = new Map([
  ['pdf', new Set(['application/pdf'])],
  ['pptx', new Set([
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/octet-stream',
  ])],
  ['zip', new Set([
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ])],
  ['png', new Set(['image/png'])],
  ['jpg', new Set(['image/jpeg'])],
  ['jpeg', new Set(['image/jpeg'])],
  ['webp', new Set(['image/webp'])],
]);

export const limits = Object.freeze({
  maxFileBytes: 20 * 1024 * 1024,
  submitter: 30,
  title: 60,
  summary: 160,
  url: 500,
});


function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function fail(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

function textField(form, name) {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function validateRequiredText(label, value, maxLength) {
  if (!value) return `${label}을(를) 입력해 주세요.`;
  if (value.length > maxLength) return `${label}은(는) ${maxLength}자 이내로 입력해 주세요.`;
  return null;
}

function parseHttpUrl(value, githubOnly = false) {
  if (!value) return null;
  if (value.length > limits.url) throw new Error('URL은 500자 이내로 입력해 주세요.');
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('URL 형식을 확인해 주세요.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL은 http 또는 https 주소만 사용할 수 있습니다.');
  }
  if (githubOnly) {
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(hostname)) {
      throw new Error('GitHub URL은 https://github.com 주소를 입력해 주세요.');
    }
  }
  return parsed.toString();
}

async function digestSecret(value) {
  return new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(value ?? ''))
  ));
}

async function secretsEqual(expected, received) {
  if (!expected || !received) return false;
  const [left, right] = await Promise.all([
    digestSecret(expected),
    digestSecret(received),
  ]);
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

function isUploadedFile(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof value.name === 'string'
    && typeof value.size === 'number'
    && value.size > 0
    && typeof value.arrayBuffer === 'function'
  );
}

function fileExtension(name) {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function sanitizeFileName(name) {
  const baseName = String(name)
    .normalize('NFKC')
    .split(/[\\/]/)
    .pop()
    .replace(/[^\p{L}\p{N}._()\- ]/gu, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (baseName || 'result-file').slice(0, 120);
}

function validateFile(file) {
  if (file.size > limits.maxFileBytes) {
    return '첨부 파일은 20MB 이하만 업로드할 수 있습니다.';
  }
  const extension = fileExtension(file.name);
  const allowedTypes = ALLOWED_FILES.get(extension);
  if (!allowedTypes) {
    return 'PDF, PPTX, ZIP, PNG, JPG, JPEG, WEBP 파일만 업로드할 수 있습니다.';
  }
  if (file.type && !allowedTypes.has(file.type.toLowerCase())) {
    return '파일 형식과 확장자가 일치하지 않습니다.';
  }
  return null;
}

function recordKey(id) {
  return `${RECORD_PREFIX}${id}.json`;
}

function isValidId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function toPublicRecord(record) {
  return {
    id: record.id,
    team: record.team,
    submitter: record.submitter,
    title: record.title,
    summary: record.summary,
    liveUrl: record.liveUrl || null,
    githubUrl: record.githubUrl || null,
    createdAt: record.createdAt,
    fileName: record.fileName || null,
    fileSize: record.fileSize || null,
    downloadUrl: record.fileKey ? `/api/files/${record.id}` : null,
  };
}

async function getRecord(env, id) {
  const stored = await env.RESULTS_STORE.get(recordKey(id));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Invalid result record', id, error);
    return null;
  }
}

async function createSubmission(request, env) {
  if (!env.RESULTS_STORE || !env.SUBMISSION_CODE) {
    return fail('결과물 저장소가 아직 준비되지 않았습니다.', 503);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail('제출 내용을 읽을 수 없습니다. 파일 크기와 입력값을 확인해 주세요.');
  }

  if (!await secretsEqual(env.SUBMISSION_CODE, textField(form, 'submissionCode'))) {
    return fail('제출코드가 올바르지 않습니다.', 403);
  }

  const team = textField(form, 'team');
  const submitter = textField(form, 'submitter');
  const title = textField(form, 'title');
  const summary = textField(form, 'summary');
  const rawLiveUrl = textField(form, 'liveUrl');
  const rawGithubUrl = textField(form, 'githubUrl');
  const file = form.get('file');
  const hasFile = isUploadedFile(file);

  if (!/^[1-8]조$/.test(team)) return fail('조를 선택해 주세요.');
  for (const [label, value, maxLength] of [
    ['제출자 이름', submitter, limits.submitter],
    ['프로젝트명', title, limits.title],
    ['한 줄 소개', summary, limits.summary],
  ]) {
    const error = validateRequiredText(label, value, maxLength);
    if (error) return fail(error);
  }
  if (!rawLiveUrl && !hasFile) {
    return fail('배포 URL 또는 첨부 파일 중 하나 이상을 등록해 주세요.');
  }

  let liveUrl;
  let githubUrl;
  try {
    liveUrl = parseHttpUrl(rawLiveUrl);
    githubUrl = parseHttpUrl(rawGithubUrl, true);
  } catch (error) {
    return fail(error.message);
  }

  if (hasFile) {
    const fileError = validateFile(file);
    if (fileError) return fail(fileError);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const safeFileName = hasFile ? sanitizeFileName(file.name) : null;
  const storedFileKey = hasFile
    ? `${FILE_PREFIX}${id}/${safeFileName}`
    : null;
  const record = {
    id,
    team,
    submitter,
    title,
    summary,
    liveUrl,
    githubUrl,
    createdAt,
    fileName: safeFileName,
    fileSize: hasFile ? file.size : null,
    fileType: hasFile ? (file.type || 'application/octet-stream') : null,
    fileKey: storedFileKey,
  };

  try {
    if (hasFile) {
      await env.RESULTS_STORE.put(storedFileKey, await file.arrayBuffer());
    }
    try {
      await env.RESULTS_STORE.put(recordKey(id), JSON.stringify(record));
    } catch (error) {
      if (storedFileKey) await env.RESULTS_STORE.delete(storedFileKey);
      throw error;
    }
  } catch (error) {
    console.error('Result upload failed', error);
    return fail('결과물을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }

  return jsonResponse({ submission: toPublicRecord(record) }, 201);
}

async function listSubmissions(env) {
  if (!env.RESULTS_STORE) return fail('결과물 저장소가 아직 준비되지 않았습니다.', 503);
  try {
    const listed = await env.RESULTS_STORE.list({ prefix: RECORD_PREFIX });
    const submissions = [];
    for (const key of listed.keys) {
      const stored = await env.RESULTS_STORE.get(key.name);
      if (!stored) continue;
      try {
        submissions.push(toPublicRecord(JSON.parse(stored)));
      } catch (error) {
        console.error('Skipping invalid result record', key.name, error);
      }
    }
    submissions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return jsonResponse({ submissions });
  } catch (error) {
    console.error('Result listing failed', error);
    return fail('결과물 목록을 불러오지 못했습니다.', 500);
  }
}

async function downloadSubmission(id, env) {
  if (!env.RESULTS_STORE) return fail('결과물 저장소가 아직 준비되지 않았습니다.', 503);
  if (!isValidId(id)) return fail('첨부 파일을 찾을 수 없습니다.', 404);
  const record = await getRecord(env, id);
  if (!record?.fileKey) return fail('첨부 파일을 찾을 수 없습니다.', 404);
  const file = await env.RESULTS_STORE.get(record.fileKey, 'arrayBuffer');
  if (!file) return fail('첨부 파일을 찾을 수 없습니다.', 404);

  const encodedName = encodeURIComponent(record.fileName).replace(/'/g, '%27');
  return new Response(file, {
    status: 200,
    headers: {
      'content-type': record.fileType || 'application/octet-stream',
      'content-length': String(record.fileSize || file.byteLength),
      'content-disposition': `attachment; filename="result-file"; filename*=UTF-8''${encodedName}`,
      'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function deleteSubmission(id, request, env) {
  if (!env.RESULTS_STORE || !env.ADMIN_CODE) {
    return fail('관리자 기능이 아직 준비되지 않았습니다.', 503);
  }
  if (!await secretsEqual(env.ADMIN_CODE, request.headers.get('x-admin-code'))) {
    return fail('관리자 코드가 올바르지 않습니다.', 403);
  }
  if (!isValidId(id)) return fail('결과물을 찾을 수 없습니다.', 404);
  const record = await getRecord(env, id);
  if (!record) return fail('결과물을 찾을 수 없습니다.', 404);
  const keys = [recordKey(id)];
  if (record.fileKey) keys.push(record.fileKey);
  await Promise.all(keys.map((key) => env.RESULTS_STORE.delete(key)));
  return jsonResponse({ deleted: true });
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/submissions' && request.method === 'GET') {
    return listSubmissions(env);
  }
  if (url.pathname === '/api/submissions' && request.method === 'POST') {
    return createSubmission(request, env);
  }
  const fileMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/);
  if (fileMatch && request.method === 'GET') {
    return downloadSubmission(decodeURIComponent(fileMatch[1]), env);
  }
  const submissionMatch = url.pathname.match(/^\/api\/submissions\/([^/]+)$/);
  if (submissionMatch && request.method === 'DELETE') {
    return deleteSubmission(decodeURIComponent(submissionMatch[1]), request, env);
  }
  return fail('API를 찾을 수 없습니다.', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
