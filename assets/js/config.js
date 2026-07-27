/**
 * config.js
 * ------------------------------------------------------------
 * EDIT THIS FILE ONLY when you need to change a setting.
 * No other file in the project should need touching for the
 * basics below.
 * ------------------------------------------------------------
 */

const CONFIG = {
  // Paste your Apps Script Web App URL here (ends in /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbzSiQN0q7oFJ2MZEg6PUPint_fIr5L1FPU2DQsGjksORzBLqXN-5J_-c7uYuaRPMWj-Zg/exec',

  COMPANY_NAME: 'SR Fashion',
  COMPANY_PHONE: '7588756669',
  COMPANY_INSTAGRAM: 'srfashion_nanded',
  COMPANY_ADDRESS: 'Eidgah Kaman Road, Deglur Naka, Nanded',

  // How often the kiosk re-focuses its hidden scan input (ms)
  SCAN_INPUT_REFOCUS_MS: 400,

  // How long a scan result stays on screen before returning to the
  // "Scan Your Staff ID" idle state (ms)
  RESULT_DISPLAY_MS: 2000,

  // Session key names (sessionStorage, cleared when the browser/tab closes)
  SESSION_KEY: 'srf_admin_session'
};
