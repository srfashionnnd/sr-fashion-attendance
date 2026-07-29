/**
 * login.js
 * ------------------------------------------------------------
 * Handles PIN entry (via on-screen keypad or physical keyboard)
 * and calls the backend to verify it.
 * ------------------------------------------------------------
 */

(function () {
  const MAX_DIGITS = 4;
  let pin = '';

  const dotsEl = document.getElementById('pinDots');
  const dots = dotsEl.querySelectorAll('.dot');
  const errorEl = document.getElementById('pinError');
  const enterBtn = document.getElementById('btnEnter');
  const keypad = document.getElementById('keypad');

  // If already logged in this session, skip straight to dashboard
  if (sessionStorage.getItem(CONFIG.SESSION_KEY)) {
    window.location.href = 'dashboard.html';
  }

  function renderDots() {
    dots.forEach((dot, i) => dot.classList.toggle('filled', i < pin.length));
    enterBtn.disabled = pin.length !== MAX_DIGITS;
  }

  function addDigit(d) {
    if (pin.length >= MAX_DIGITS) return;
    pin += d;
    errorEl.textContent = '';
    renderDots();
    if (pin.length === MAX_DIGITS) attemptLogin();
  }

  function backspace() {
    pin = pin.slice(0, -1);
    errorEl.textContent = '';
    renderDots();
  }

  function clearPin() {
    pin = '';
    errorEl.textContent = '';
    renderDots();
  }

  function showError(message) {
    errorEl.textContent = message;
    dotsEl.classList.add('shake');
    setTimeout(() => dotsEl.classList.remove('shake'), 400);
    pin = '';
    renderDots();
  }

  async function attemptLogin() {
    enterBtn.disabled = true;
    enterBtn.classList.add('loading');
    const result = await callApi('login', { password: pin });
    enterBtn.classList.remove('loading');
    if (result.success) {
      sessionStorage.setItem(CONFIG.SESSION_KEY, '1');
      window.location.href = 'dashboard.html';
    } else {
      showError('Incorrect PIN. Try again.');
    }
  }

  // ---- On-screen keypad ----
  keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === 'clear') clearPin();
    else if (key === 'back') backspace();
    else addDigit(key);
  });

  enterBtn.addEventListener('click', () => {
    if (pin.length === MAX_DIGITS) attemptLogin();
  });

  // ---- Physical keyboard support ----
  document.addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key)) addDigit(e.key);
    else if (e.key === 'Backspace') backspace();
    else if (e.key === 'Escape') clearPin();
    else if (e.key === 'Enter' && pin.length === MAX_DIGITS) attemptLogin();
  });

  renderDots();
})();