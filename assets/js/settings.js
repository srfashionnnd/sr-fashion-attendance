/**
 * settings.js
 * ------------------------------------------------------------
 * Three independent panels on this page:
 *  1. Company & Shift settings (ShiftStart/ShiftEnd/GraceMinutes/
 *     WeeklyOffDay/CompanyName) — stored as key/value in Settings sheet.
 *  2. Change admin password.
 *  3. Holiday list — add/delete.
 * ------------------------------------------------------------
 */

let holidaysCache = [];

// ---------------- Company & Shift Settings ----------------

async function loadSettings() {
  const res = await callApiGet('getSettings');
  if (!res.success) {
    showToast(res.error || 'Could not load settings.', 'error');
    return;
  }
  const s = res.settings;
  document.getElementById('sCompanyName').value = s.CompanyName || '';
  document.getElementById('sWeeklyOffDay').value = s.WeeklyOffDay || 'Sunday';
  document.getElementById('sShiftStart').value = s.ShiftStart || '12:00';
  document.getElementById('sShiftEnd').value = s.ShiftEnd || '22:00';
  document.getElementById('sGraceMinutes').value = s.GraceMinutes || 15;
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSaveSettings');
  btn.disabled = true;

  const res = await callApi('updateSettings', {
    CompanyName: document.getElementById('sCompanyName').value.trim(),
    WeeklyOffDay: document.getElementById('sWeeklyOffDay').value,
    ShiftStart: document.getElementById('sShiftStart').value,
    ShiftEnd: document.getElementById('sShiftEnd').value,
    GraceMinutes: document.getElementById('sGraceMinutes').value
  });

  btn.disabled = false;

  if (res.success) {
    showToast('Settings saved.', 'success');
  } else {
    showToast(res.error || 'Could not save settings.', 'error');
  }
});

// ---------------- Change Password ----------------

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnChangePassword');
  const oldPassword = document.getElementById('pOldPassword').value;
  const newPassword = document.getElementById('pNewPassword').value;

  btn.disabled = true;
  const res = await callApi('changePassword', { oldPassword, newPassword });
  btn.disabled = false;

  if (res.success) {
    showToast('Password updated.', 'success');
    document.getElementById('passwordForm').reset();
  } else {
    showToast(res.error || 'Could not update password.', 'error');
  }
});

// ---------------- Holidays ----------------

const holidayModalBackdrop = document.getElementById('holidayModalBackdrop');
const holidayTableBody = document.getElementById('holidayTableBody');
const holidayEmptyNote = document.getElementById('holidayEmptyNote');

function openHolidayModal() {
  document.getElementById('holidayForm').reset();
  holidayModalBackdrop.classList.add('visible');
}
function closeHolidayModal() {
  holidayModalBackdrop.classList.remove('visible');
}

document.getElementById('btnAddHoliday').addEventListener('click', openHolidayModal);
document.getElementById('btnCloseHolidayModal').addEventListener('click', closeHolidayModal);
document.getElementById('btnCancelHoliday').addEventListener('click', closeHolidayModal);
holidayModalBackdrop.addEventListener('click', (e) => { if (e.target === holidayModalBackdrop) closeHolidayModal(); });

function renderHolidays() {
  const sorted = [...holidaysCache].sort((a, b) => a.date.localeCompare(b.date));
  holidayTableBody.innerHTML = sorted.map(h => `
    <tr>
      <td>${h.date}</td>
      <td>${h.name}</td>
      <td><span class="badge early">${h.type}</span></td>
      <td>
        <button class="btn btn-danger btn-small" onclick="removeHoliday('${h.date}', '${h.name.replace(/'/g, "\\'")}')">Delete</button>
      </td>
    </tr>
  `).join('');
  holidayEmptyNote.style.display = sorted.length ? 'none' : 'block';
}

async function loadHolidays() {
  const res = await callApiGet('getHolidays');
  if (!res.success) {
    showToast(res.error || 'Could not load holidays.', 'error');
    return;
  }
  holidaysCache = res.holidays;
  renderHolidays();
}

document.getElementById('holidayForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    date: document.getElementById('hDate').value,
    name: document.getElementById('hName').value.trim(),
    type: document.getElementById('hType').value
  };
  const res = await callApi('addHoliday', payload);
  if (res.success) {
    showToast('Holiday added.', 'success');
    closeHolidayModal();
    loadHolidays();
  } else {
    showToast(res.error || 'Could not add holiday.', 'error');
  }
});

async function removeHoliday(date, name) {
  if (!confirm('Delete holiday "' + name + '" on ' + date + '?')) return;
  const res = await callApi('deleteHoliday', { date, name });
  if (res.success) {
    showToast('Holiday deleted.', 'success');
    loadHolidays();
  } else {
    showToast(res.error || 'Could not delete holiday.', 'error');
  }
}

// ---------------- Init ----------------

loadSettings();
loadHolidays();