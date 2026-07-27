/**
 * dashboard.js
 * ------------------------------------------------------------
 * Pulls the live dashboard numbers and recent attendance from
 * the backend and renders them. Refreshes automatically.
 * ------------------------------------------------------------
 */

const REFRESH_MS = 15000;

const cardGrid = document.getElementById('cardGrid');
const todayDateEl = document.getElementById('todayDate');
const lateBody = document.getElementById('lateTableBody');
const lateEmptyNote = document.getElementById('lateEmptyNote');
const missingBody = document.getElementById('missingTableBody');
const missingEmptyNote = document.getElementById('missingEmptyNote');
const recentBody = document.getElementById('recentTableBody');
const recentEmptyNote = document.getElementById('recentEmptyNote');

function renderCards(s) {
  const cards = [
    { label: 'Total Staff', value: s.totalStaff, cls: '' },
    { label: 'Present', value: s.present, cls: 'good' },
    { label: 'Absent', value: s.absent, cls: 'danger' },
    { label: 'Late', value: s.late, cls: 'warn' },
    { label: 'Holiday Today', value: s.isHoliday ? 'Yes' : 'No', cls: s.isHoliday ? 'accent' : '' },
    { label: 'Weekly Off', value: s.isWeeklyOff ? 'Yes' : 'No', cls: s.isWeeklyOff ? 'accent' : '' },
    { label: 'Currently Working', value: s.currentlyWorking.length, cls: 'good' },
    { label: 'Average In Time', value: s.averageInTime, cls: 'accent' }
  ];

  cardGrid.innerHTML = cards.map(c => `
    <div class="stat-card glass ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
    </div>
  `).join('');
}

function renderLate(list) {
  lateBody.innerHTML = list.map(e => `
    <tr><td>${e.name}</td><td>${e.time}</td></tr>
  `).join('');
  lateEmptyNote.style.display = list.length ? 'none' : 'block';
}

function renderMissing(list) {
  missingBody.innerHTML = list.map(e => `
    <tr><td>${e.name}</td></tr>
  `).join('');
  missingEmptyNote.style.display = list.length ? 'none' : 'block';
}

function renderRecent(records) {
  recentBody.innerHTML = records.map(r => `
    <tr>
      <td>${r.Name}</td>
      <td>${r.Type === 'In' ? 'Punch In' : 'Punch Out'}</td>
      <td>${r.Time}</td>
      <td>${r.Status ? `<span class="badge ${statusBadgeClass(r.Status)}">${r.Status}</span>` : '—'}</td>
    </tr>
  `).join('');
  recentEmptyNote.style.display = records.length ? 'none' : 'block';
}

async function refreshDashboard() {
  const summary = await callApiGet('getDashboardSummary');
  if (summary.success) {
    todayDateEl.textContent = new Date(summary.date).toDateString();
    renderCards(summary);
    renderLate(summary.lateEmployeesToday);
    renderMissing(summary.missingPunchOut);
  } else {
    showToast(summary.error || 'Could not load dashboard.', 'error');
  }

  const recent = await callApiGet('getRecentAttendance', { limit: 20 });
  if (recent.success) {
    renderRecent(recent.records);
  }
}

refreshDashboard();
setInterval(refreshDashboard, REFRESH_MS);
