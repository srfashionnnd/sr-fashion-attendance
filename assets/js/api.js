/**
 * api.js
 * ------------------------------------------------------------
 * One shared function for talking to the Apps Script backend.
 * Every page includes this file instead of writing its own fetch calls.
 * ------------------------------------------------------------
 */

/**
 * Calls a backend action.
 * @param {string} action - e.g. 'recordPunch', 'login', 'getStaffList'
 * @param {object} payload - extra fields the action needs
 * @returns {Promise<object>} the parsed JSON response
 */
async function callApi(action, payload) {
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      // text/plain avoids a CORS preflight request, which Apps Script
      // web apps do not handle. Code.gs still parses this as JSON.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, payload || {}))
    });
    return await response.json();
  } catch (err) {
    return { success: false, error: 'Network error: could not reach the server.' };
  }
}

/**
 * Calls a read-only backend action via GET (used for simple polling
 * like dashboard refresh, where a plain URL works fine).
 */
async function callApiGet(action, params) {
  try {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const response = await fetch(url.toString());
    return await response.json();
  } catch (err) {
    return { success: false, error: 'Network error: could not reach the server.' };
  }
}
