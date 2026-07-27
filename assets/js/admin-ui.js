/**
 * admin-ui.js
 * ------------------------------------------------------------
 * Tiny shared helpers used by every admin page.
 * ------------------------------------------------------------
 */

function showToast(message, type) {
  let toast = document.getElementById('sharedToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sharedToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast visible' + (type ? ' ' + type : '');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}

function statusBadgeClass(status) {
  const map = {
    'On Time': 'on-time', 'Early': 'early', 'Late': 'late',
    'Active': 'active', 'Inactive': 'inactive'
  };
  return map[status] || '';
}
