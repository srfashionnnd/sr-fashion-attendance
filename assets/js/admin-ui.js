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

/**
 * Opens/closes the mobile sidebar drawer.
 * Call with no args to toggle, or toggleSidebar(true)/toggleSidebar(false)
 * to force a specific state.
 */
function toggleSidebar(forceState) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  const shouldOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', shouldOpen);
  if (overlay) overlay.classList.toggle('visible', shouldOpen);
  document.body.style.overflow = shouldOpen ? 'hidden' : '';
}

document.addEventListener('DOMContentLoaded', () => {
  // Close the drawer automatically once a nav link is tapped on mobile
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => toggleSidebar(false));
  });
});