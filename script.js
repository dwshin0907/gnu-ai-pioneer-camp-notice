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
})();
