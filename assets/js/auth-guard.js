/**
 * auth-guard.js
 * ------------------------------------------------------------
 * Include this on every admin-only page, right after config.js.
 * Redirects to login.html if there's no active session.
 * ------------------------------------------------------------
 */
(function () {
  if (!sessionStorage.getItem(CONFIG.SESSION_KEY)) {
    window.location.href = 'login.html';
  }
})();

function logout() {
  sessionStorage.removeItem(CONFIG.SESSION_KEY);
  window.location.href = 'login.html';
}
