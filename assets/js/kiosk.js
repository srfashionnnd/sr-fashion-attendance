/**
 * kiosk.js
 * ------------------------------------------------------------
 * Continuous scanning mode:
 *  - A hidden input stays focused at all times.
 *  - The USB barcode scanner types the code + presses Enter.
 *  - We read the value on Enter, send it to the backend, show the
 *    result, then automatically return to the idle "scan" screen.
 * ------------------------------------------------------------
 */

(function () {
  const scanInput = document.getElementById('scanInput');
  const idleState = document.getElementById('idleState');
  const overlay = document.getElementById('resultOverlay');
  const resultIcon = document.getElementById('resultIcon');
  const resultGreeting = document.getElementById('resultGreeting');
  const resultName = document.getElementById('resultName');
  const resultStatus = document.getElementById('resultStatus');
  const resultDetail = document.getElementById('resultDetail');
  const idleClock = document.getElementById('idleClock');

  let busy = false; // true while a result is being shown / a scan is in flight

  function focusScanInput() {
    scanInput.focus({ preventScroll: true });
  }

  // Keep the hidden input focused no matter what the user/scanner does
  setInterval(focusScanInput, CONFIG.SCAN_INPUT_REFOCUS_MS);
  document.addEventListener('click', focusScanInput);
  focusScanInput();

  function updateClock() {
    idleClock.textContent = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  updateClock();
  setInterval(updateClock, 1000);

  function showResult({ type, greeting, name, status, detail }) {
    resultIcon.className = 'result-icon ' + type;
    resultIcon.textContent = type === 'success' ? '✓' : (type === 'warn' ? '!' : '×');
    resultGreeting.textContent = greeting || '';
    resultName.textContent = name || '';
    resultStatus.textContent = status || '';
    resultDetail.textContent = detail || '';

    idleState.classList.add('hidden');
    overlay.classList.add('visible');

    setTimeout(() => {
      overlay.classList.remove('visible');
      idleState.classList.remove('hidden');
      busy = false;
      focusScanInput();
    }, CONFIG.RESULT_DISPLAY_MS);
  }

  async function handleScan(barcode) {
    if (busy || !barcode) return;
    busy = true;

    const res = await callApi('recordPunch', { barcode });

    if (!res.success) {
      if (res.duplicate) {
        showResult({
          type: 'warn',
          greeting: res.employeeName || '',
          name: 'Already Recorded',
          detail: 'This attendance was just captured.'
        });
      } else {
        showResult({
          type: 'error',
          greeting: res.employeeName ? res.employeeName : '',
          name: res.error && res.error.indexOf('Completed') !== -1 ? 'Attendance Completed' : 'Scan Not Recognised',
          detail: res.error || 'Please try again or contact admin.'
        });
      }
      return;
    }

    if (res.type === 'IN') {
      showResult({
        type: 'success',
        greeting: 'Welcome',
        name: res.employeeName,
        status: 'Punch In Successful — ' + res.status,
        detail: 'Time: ' + res.time
      });
    } else {
      showResult({
        type: 'success',
        greeting: 'Good Bye',
        name: res.employeeName,
        status: 'Punch Out Successful',
        detail: 'Working Hours: ' + res.workingHours + '  ·  Time: ' + res.time
      });
    }
  }

  scanInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = scanInput.value.trim();
      scanInput.value = '';
      handleScan(value);
    }
  });
})();
