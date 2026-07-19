import { buildLeaderMailto, isValidInviteEmail } from './leader-email.mjs';


(function () {
  const storageKey = 'gnu-camp-prep';
  const items = [...document.querySelectorAll('[data-check-item]')];
  let saved = {};

  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch {
    saved = {};
  }

  items.forEach((item) => {
    item.checked = Boolean(saved[item.value]);

    item.addEventListener('change', () => {
      saved[item.value] = item.checked;

      try {
        localStorage.setItem(storageKey, JSON.stringify(saved));
      } catch {
        // 저장이 차단된 브라우저에서도 체크 기능 자체는 계속 동작합니다.
      }
    });
  });

  const heroContact = document.querySelector('[data-hero-contact]');
  const floatingCall = document.querySelector('[data-floating-call]');

  if (heroContact && floatingCall) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        floatingCall.classList.toggle('is-visible', !entry.isIntersecting);
      }, { threshold: 0.1 });

      observer.observe(heroContact);
    } else {
      floatingCall.classList.add('is-visible');
    }
  }

  const leaderEmailForm = document.querySelector('#leader-email-form');
  const leaderEmailStatus = document.querySelector('#leader-email-status');

  function setLeaderEmailStatus(message, tone = '') {
    if (!leaderEmailStatus) return;
    leaderEmailStatus.textContent = message;
    leaderEmailStatus.classList.remove('is-error', 'is-success');
    if (tone) leaderEmailStatus.classList.add(`is-${tone}`);
  }

  function submitLeaderEmail(event) {
    event.preventDefault();
    const teamInput = leaderEmailForm.elements.namedItem('leaderTeam');
    const nameInput = leaderEmailForm.elements.namedItem('leaderName');
    const emailInput = leaderEmailForm.elements.namedItem('inviteEmail');
    const consentInput = leaderEmailForm.elements.namedItem('privacyConsent');
    const inviteEmail = emailInput.value.trim();

    if (!isValidInviteEmail(inviteEmail)) {
      setLeaderEmailStatus('초대받을 이메일 주소를 다시 확인해 주세요.', 'error');
      emailInput.focus();
      return;
    }
    if (!consentInput.checked) {
      setLeaderEmailStatus('이메일 전달 동의를 확인해 주세요.', 'error');
      consentInput.focus();
      return;
    }

    try {
      const mailto = buildLeaderMailto({
        team: teamInput.value,
        leaderName: nameInput.value,
        inviteEmail,
      });
      setLeaderEmailStatus('메일 앱을 열었습니다. 받는 사람과 내용을 확인한 뒤 보내기를 눌러주세요.', 'success');
      window.location.href = mailto;
    } catch (error) {
      setLeaderEmailStatus(error.message, 'error');
    }
  }

  leaderEmailForm?.addEventListener('submit', submitLeaderEmail);

  const resultForm = document.querySelector('#result-form');
  const resultList = document.querySelector('#result-list');
  const resultStatus = document.querySelector('#result-status');
  const resultCount = document.querySelector('#result-count');
  const adminToggle = document.querySelector('#result-admin-toggle');
  let submissions = [];
  let adminCode = '';

  function setResultStatus(message, tone = '') {
    if (!resultStatus) return;
    resultStatus.textContent = message;
    resultStatus.classList.remove('is-error', 'is-success');
    if (tone) resultStatus.classList.add(`is-${tone}`);
  }

  function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatSubmittedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '제출 시간 확인 중';
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  function externalUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function appendActionLink(container, label, href, options = {}) {
    const link = makeElement('a', '', label);
    link.href = href;
    if (options.external) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    if (options.download) link.setAttribute('download', '');
    container.append(link);
  }

  function renderSubmissions() {
    if (!resultList || !resultCount) return;
    resultList.replaceChildren();
    resultList.classList.toggle('is-admin', Boolean(adminCode));
    resultList.setAttribute('aria-busy', 'false');
    resultCount.textContent = `${submissions.length}개 프로젝트`;

    if (submissions.length === 0) {
      const empty = makeElement('div', 'result-empty');
      empty.append(
        makeElement('strong', '', '첫 번째 결과물을 기다리고 있습니다.'),
        makeElement('span', '', '배포가 끝난 팀부터 위의 제출 데스크를 이용해 주세요.')
      );
      resultList.append(empty);
      return;
    }

    submissions.forEach((submission) => {
      const card = makeElement('article', 'result-card');
      const meta = makeElement('div', 'result-card__meta');
      meta.append(
        makeElement('span', 'result-card__team', submission.team),
        makeElement('time', 'result-card__time', formatSubmittedAt(submission.createdAt))
      );

      const title = makeElement('h4', '', submission.title);
      const summary = makeElement('p', 'result-card__summary', submission.summary);
      const submitter = makeElement('p', 'result-card__submitter', `제출자 ${submission.submitter}`);
      const actions = makeElement('div', 'result-card__actions');
      const liveUrl = externalUrl(submission.liveUrl);
      const githubUrl = externalUrl(submission.githubUrl);
      if (liveUrl) appendActionLink(actions, '배포 페이지 ↗', liveUrl, { external: true });
      if (githubUrl) appendActionLink(actions, 'GitHub ↗', githubUrl, { external: true });
      if (submission.downloadUrl) {
        appendActionLink(actions, `첨부 · ${submission.fileName}`, submission.downloadUrl, { download: true });
      }

      const deleteButton = makeElement('button', 'result-card__delete', '삭제');
      deleteButton.type = 'button';
      deleteButton.addEventListener('click', () => deleteSubmission(submission));
      actions.append(deleteButton);

      card.append(meta, title, summary, submitter, actions);
      resultList.append(card);
    });
  }

  async function responseError(response, fallback) {
    try {
      const body = await response.json();
      return body.error || fallback;
    } catch {
      return fallback;
    }
  }

  async function loadSubmissions(successMessage = '') {
    if (!resultList) return;
    resultList.setAttribute('aria-busy', 'true');
    if (!successMessage) setResultStatus('결과물을 불러오는 중입니다.');
    try {
      const response = await fetch('/api/submissions', {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await responseError(response, '목록을 불러오지 못했습니다.'));
      const body = await response.json();
      submissions = Array.isArray(body.submissions) ? body.submissions : [];
      renderSubmissions();
      setResultStatus(
        successMessage || (submissions.length ? '최신 결과물 순으로 표시합니다.' : '아직 등록된 결과물이 없습니다.'),
        successMessage ? 'success' : ''
      );
    } catch (error) {
      resultList.setAttribute('aria-busy', 'false');
      setResultStatus(`${error.message} 잠시 후 새로고침해 주세요.`, 'error');
    }
  }

  async function submitResult(event) {
    event.preventDefault();
    const fileInput = resultForm.elements.namedItem('file');
    const liveUrlInput = resultForm.elements.namedItem('liveUrl');
    const file = fileInput.files[0];
    if (!liveUrlInput.value.trim() && !file) {
      setResultStatus('배포 URL 또는 첨부 파일 중 하나 이상을 등록해 주세요.', 'error');
      liveUrlInput.focus();
      return;
    }
    if (file && file.size > 20 * 1024 * 1024) {
      setResultStatus('첨부 파일은 20MB 이하만 업로드할 수 있습니다.', 'error');
      fileInput.focus();
      return;
    }

    const submitButton = resultForm.querySelector('button[type="submit"]');
    const buttonLabel = submitButton.querySelector('span');
    submitButton.disabled = true;
    buttonLabel.textContent = '게시하는 중입니다';
    setResultStatus('파일과 프로젝트 정보를 안전하게 전송하고 있습니다.');

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: new FormData(resultForm),
      });
      if (!response.ok) throw new Error(await responseError(response, '결과물을 게시하지 못했습니다.'));
      resultForm.reset();
      await loadSubmissions('결과물을 게시했습니다. 목록에서 확인해 주세요.');
    } catch (error) {
      setResultStatus(error.message, 'error');
    } finally {
      submitButton.disabled = false;
      buttonLabel.textContent = '결과물 게시하기';
    }
  }

  async function deleteSubmission(submission) {
    if (!adminCode) return;
    if (!window.confirm(`“${submission.title}” 결과물을 삭제할까요?`)) return;
    setResultStatus(`${submission.title} 결과물을 삭제하는 중입니다.`);
    try {
      const response = await fetch(`/api/submissions/${encodeURIComponent(submission.id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-code': adminCode },
      });
      if (!response.ok) {
        if (response.status === 403) {
          adminCode = '';
          adminToggle.textContent = '관리자 모드';
          renderSubmissions();
        }
        throw new Error(await responseError(response, '결과물을 삭제하지 못했습니다.'));
      }
      await loadSubmissions('결과물을 삭제했습니다.');
    } catch (error) {
      setResultStatus(error.message, 'error');
    }
  }

  function enableAdminMode() {
    if (adminCode) {
      adminCode = '';
      adminToggle.textContent = '관리자 모드';
      renderSubmissions();
      setResultStatus('관리자 모드를 종료했습니다.');
      return;
    }
    const code = window.prompt('관리자 코드를 입력하세요.');
    if (!code) return;
    adminCode = code;
    adminToggle.textContent = '관리자 모드 종료';
    renderSubmissions();
    setResultStatus('각 결과물 카드에서 삭제할 수 있습니다.', 'success');
  }

  if (resultForm && resultList && resultStatus && resultCount) {
    resultForm.addEventListener('submit', submitResult);
    adminToggle?.addEventListener('click', enableAdminMode);
    loadSubmissions();
  }
})();
