/**
 * reports.js
 * ------------------------------------------------------------
 * Every report type is computed in the browser from three raw
 * sources: staff list, attendance logs (date range), holidays,
 * and settings (weekly off day). This keeps the backend simple —
 * one generic "give me the logs between these dates" action
 * covers every report on this page.
 * ------------------------------------------------------------
 */

let staffCache = [];
let holidaysCache = [];
let settingsCache = {};
let currentReport = null; // { headers: [...], rows: [[...]] }

const reportTypeEl = document.getElementById('reportType');
const inputDate = document.getElementById('inputDate');
const inputMonth = document.getElementById('inputMonth');
const inputYear = document.getElementById('inputYear');
const inputRangeStart = document.getElementById('inputRangeStart');
const inputRangeEnd = document.getElementById('inputRangeEnd');
const inputEmployee = document.getElementById('inputEmployee');

const fieldDate = document.getElementById('fieldDate');
const fieldMonth = document.getElementById('fieldMonth');
const fieldYear = document.getElementById('fieldYear');
const fieldRange = document.getElementById('fieldRange');
const fieldRangeEnd = document.getElementById('fieldRangeEnd');
const fieldEmployee = document.getElementById('fieldEmployee');

const resultPanel = document.getElementById('resultPanel');
const resultTitle = document.getElementById('resultTitle');
const reportTableWrap = document.getElementById('reportTableWrap');
const reportEmptyNote = document.getElementById('reportEmptyNote');

// ---------------- Field visibility per report type ----------------

const FIELD_MAP = {
  daily:        ['date'],
  monthly:      ['month'],
  yearly:       ['year'],
  individual:   ['range', 'employee'],
  late:         ['range'],
  absent:       ['range'],
  holiday:      ['range'],
  workingHours: ['range'],
  missingPunch: ['range']
};

function updateVisibleFields() {
  const needed = FIELD_MAP[reportTypeEl.value] || [];
  fieldDate.style.display = needed.includes('date') ? '' : 'none';
  fieldMonth.style.display = needed.includes('month') ? '' : 'none';
  fieldYear.style.display = needed.includes('year') ? '' : 'none';
  fieldRange.style.display = needed.includes('range') ? '' : 'none';
  fieldRangeEnd.style.display = needed.includes('range') ? '' : 'none';
  fieldEmployee.style.display = needed.includes('employee') ? '' : 'none';
}
reportTypeEl.addEventListener('change', updateVisibleFields);

// ---------------- Helpers ----------------

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function dateRangeArray(start, end) {
  const dates = [];
  let cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0'));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function dayNameOf(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}

function isHoliday(dateStr) {
  return holidaysCache.find(h => h.date === dateStr);
}

function isWeeklyOff(dateStr) {
  return dayNameOf(dateStr) === (settingsCache.WeeklyOffDay || 'Sunday');
}

function workingHoursToMinutes(str) {
  if (!str) return 0;
  const m = String(str).match(/(\d+)h\s*(\d+)m/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function minutesToHM(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h + 'h ' + m + 'm';
}

function activeStaff() {
  return staffCache.filter(s => s.Status === 'Active');
}

// ---------------- Data loading ----------------

async function loadReferenceData() {
  const [staffRes, holidaysRes, settingsRes] = await Promise.all([
    callApiGet('getStaffList'),
    callApiGet('getHolidays'),
    callApiGet('getSettings')
  ]);
  if (staffRes.success) staffCache = staffRes.staff;
  if (holidaysRes.success) holidaysCache = holidaysRes.holidays;
  if (settingsRes.success) settingsCache = settingsRes.settings;

  inputEmployee.innerHTML = activeStaff().map(s => `<option value="${s.EmployeeID}">${s.EmployeeID} — ${s.Name}</option>`).join('');

  // sensible defaults
  inputDate.value = todayStr();
  const now = new Date();
  inputMonth.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  inputYear.value = now.getFullYear();
  inputRangeStart.value = todayStr();
  inputRangeEnd.value = todayStr();
}

async function fetchLogs(start, end) {
  const res = await callApiGet('getAttendanceRange', { start, end });
  return res.success ? res.records : [];
}

// ---------------- Report builders ----------------
// Each builder returns { headers: [...], rows: [[...cells]] }

async function buildDailyReport(date) {
  const logs = await fetchLogs(date, date);
  const holiday = isHoliday(date);
  const weeklyOff = isWeeklyOff(date);

  const rows = activeStaff().map(s => {
    const logsForStaff = logs.filter(l => String(l.EmployeeID) === String(s.EmployeeID));
    const inLog = logsForStaff.find(l => l.Type === 'In');
    const outLog = logsForStaff.find(l => l.Type === 'Out');

    let status;
    if (inLog) status = inLog.Status;
    else if (holiday) status = 'Holiday';
    else if (weeklyOff) status = 'Weekly Off';
    else status = 'Absent';

    return [s.EmployeeID, s.Name, inLog ? inLog.Time : '—', outLog ? outLog.Time : '—', status, outLog ? outLog.WorkingHours : '—'];
  });

  return { headers: ['ID', 'Name', 'Punch In', 'Punch Out', 'Status', 'Working Hours'], rows };
}

async function buildAggregateReport(start, end) {
  const logs = await fetchLogs(start, end);
  const days = dateRangeArray(start, end).filter(d => d <= todayStr());

  const rows = activeStaff().map(s => {
    let present = 0, absent = 0, late = 0, holiday = 0, totalMins = 0;

    days.forEach(day => {
      const dayLogs = logs.filter(l => l.Date === day && String(l.EmployeeID) === String(s.EmployeeID));
      const inLog = dayLogs.find(l => l.Type === 'In');
      const outLog = dayLogs.find(l => l.Type === 'Out');

      if (inLog) {
        present++;
        if (inLog.Status === 'Late') late++;
        if (outLog) totalMins += workingHoursToMinutes(outLog.WorkingHours);
      } else if (isHoliday(day)) {
        holiday++;
      } else if (!isWeeklyOff(day)) {
        absent++;
      }
    });

    return [s.EmployeeID, s.Name, present, absent, late, holiday, minutesToHM(totalMins)];
  });

  return { headers: ['ID', 'Name', 'Present Days', 'Absent Days', 'Late Days', 'Holiday Days', 'Total Working Hours'], rows };
}

async function buildIndividualReport(employeeId, start, end) {
  const logs = await fetchLogs(start, end);
  const staff = staffCache.find(s => s.EmployeeID === employeeId);
  const days = dateRangeArray(start, end).filter(d => d <= todayStr());

  const rows = days.map(day => {
    const dayLogs = logs.filter(l => l.Date === day && String(l.EmployeeID) === String(employeeId));
    const inLog = dayLogs.find(l => l.Type === 'In');
    const outLog = dayLogs.find(l => l.Type === 'Out');
    let status;
    if (inLog) status = inLog.Status;
    else if (isHoliday(day)) status = 'Holiday';
    else if (isWeeklyOff(day)) status = 'Weekly Off';
    else status = 'Absent';
    return [day, inLog ? inLog.Time : '—', outLog ? outLog.Time : '—', status, outLog ? outLog.WorkingHours : '—'];
  });

  return {
    headers: ['Date', 'Punch In', 'Punch Out', 'Status', 'Working Hours'],
    rows,
    title: staff ? staff.Name + ' (' + staff.EmployeeID + ')' : employeeId
  };
}

async function buildLateReport(start, end) {
  const logs = await fetchLogs(start, end);
  const rows = logs
    .filter(l => l.Type === 'In' && l.Status === 'Late')
    .map(l => [l.Date, l.EmployeeID, l.Name, l.Time]);
  return { headers: ['Date', 'ID', 'Name', 'Punch In Time'], rows };
}

async function buildAbsentReport(start, end) {
  const logs = await fetchLogs(start, end);
  const days = dateRangeArray(start, end).filter(d => d <= todayStr());
  const rows = [];

  activeStaff().forEach(s => {
    days.forEach(day => {
      if (isHoliday(day) || isWeeklyOff(day)) return;
      const hasLog = logs.some(l => l.Date === day && String(l.EmployeeID) === String(s.EmployeeID));
      if (!hasLog) rows.push([day, s.EmployeeID, s.Name]);
    });
  });

  return { headers: ['Date', 'ID', 'Name'], rows };
}

async function buildHolidayReport(start, end) {
  const rows = holidaysCache
    .filter(h => h.date >= start && h.date <= end)
    .map(h => [h.date, h.name, h.type]);
  return { headers: ['Date', 'Name', 'Type'], rows };
}

async function buildWorkingHoursReport(start, end) {
  const logs = await fetchLogs(start, end);
  const rows = activeStaff().map(s => {
    const outLogs = logs.filter(l => l.Type === 'Out' && String(l.EmployeeID) === String(s.EmployeeID));
    const totalMins = outLogs.reduce((sum, l) => sum + workingHoursToMinutes(l.WorkingHours), 0);
    const avgMins = outLogs.length ? totalMins / outLogs.length : 0;
    return [s.EmployeeID, s.Name, outLogs.length, minutesToHM(totalMins), minutesToHM(avgMins)];
  });
  return { headers: ['ID', 'Name', 'Days Worked', 'Total Hours', 'Average Hours/Day'], rows };
}

async function buildMissingPunchReport(start, end) {
  const logs = await fetchLogs(start, end);
  const rows = [];
  const days = dateRangeArray(start, end);

  days.forEach(day => {
    activeStaff().forEach(s => {
      const dayLogs = logs.filter(l => l.Date === day && String(l.EmployeeID) === String(s.EmployeeID));
      const hasIn = dayLogs.some(l => l.Type === 'In');
      const hasOut = dayLogs.some(l => l.Type === 'Out');
      if (hasIn && !hasOut) rows.push([day, s.EmployeeID, s.Name, dayLogs.find(l => l.Type === 'In').Time]);
    });
  });

  return { headers: ['Date', 'ID', 'Name', 'Punch In Time'], rows };
}

// ---------------- Generate button ----------------

document.getElementById('btnGenerate').addEventListener('click', async () => {
  const type = reportTypeEl.value;
  let report;

  try {
    if (type === 'daily') {
      report = await buildDailyReport(inputDate.value);
      resultTitle.textContent = 'Daily Report — ' + inputDate.value;
    } else if (type === 'monthly') {
      const [y, m] = inputMonth.value.split('-').map(Number);
      const start = y + '-' + String(m).padStart(2, '0') + '-01';
      const end = new Date(y, m, 0).toISOString().slice(0, 10);
      report = await buildAggregateReport(start, end);
      resultTitle.textContent = 'Monthly Report — ' + inputMonth.value;
    } else if (type === 'yearly') {
      const y = inputYear.value;
      report = await buildAggregateReport(y + '-01-01', y + '-12-31');
      resultTitle.textContent = 'Yearly Report — ' + y;
    } else if (type === 'individual') {
      report = await buildIndividualReport(inputEmployee.value, inputRangeStart.value, inputRangeEnd.value);
      resultTitle.textContent = 'Individual Report — ' + report.title;
    } else if (type === 'late') {
      report = await buildLateReport(inputRangeStart.value, inputRangeEnd.value);
      resultTitle.textContent = 'Late Report';
    } else if (type === 'absent') {
      report = await buildAbsentReport(inputRangeStart.value, inputRangeEnd.value);
      resultTitle.textContent = 'Absent Report';
    } else if (type === 'holiday') {
      report = await buildHolidayReport(inputRangeStart.value, inputRangeEnd.value);
      resultTitle.textContent = 'Holiday Report';
    } else if (type === 'workingHours') {
      report = await buildWorkingHoursReport(inputRangeStart.value, inputRangeEnd.value);
      resultTitle.textContent = 'Working Hours Report';
    } else if (type === 'missingPunch') {
      report = await buildMissingPunchReport(inputRangeStart.value, inputRangeEnd.value);
      resultTitle.textContent = 'Missing Punch Report';
    }
  } catch (err) {
    showToast('Could not generate report: ' + err.message, 'error');
    return;
  }

  currentReport = report;
  renderReportTable(report);
  resultPanel.style.display = '';
});

function renderReportTable(report) {
  if (!report.rows.length) {
    reportTableWrap.innerHTML = '';
    reportEmptyNote.style.display = 'block';
    return;
  }
  reportEmptyNote.style.display = 'none';
  const thead = '<thead><tr>' + report.headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
  const tbody = '<tbody>' + report.rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody>';
  reportTableWrap.innerHTML = `<table>${thead}${tbody}</table>`;
}

// ---------------- Export: CSV ----------------

document.getElementById('btnExportCsv').addEventListener('click', () => {
  if (!currentReport) return;
  const lines = [currentReport.headers.join(',')]
    .concat(currentReport.rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, resultTitle.textContent.replace(/\s+/g, '_') + '.csv');
});

// ---------------- Export: Excel ----------------

document.getElementById('btnExportExcel').addEventListener('click', () => {
  if (!currentReport) return;
  const ws = XLSX.utils.aoa_to_sheet([currentReport.headers, ...currentReport.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, resultTitle.textContent.replace(/\s+/g, '_') + '.xlsx');
});

// ---------------- Export: PDF (via print) ----------------

document.getElementById('btnExportPdf').addEventListener('click', () => {
  window.print();
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------- WhatsApp share ----------------

document.getElementById('btnWhatsapp').addEventListener('click', () => {
  if (!currentReport) return;
  let text = 'SR Fashion Attendance\n' + resultTitle.textContent + '\n\n';
  text += currentReport.headers.join(' | ') + '\n';
  currentReport.rows.slice(0, 25).forEach(r => { text += r.join(' | ') + '\n'; });
  if (currentReport.rows.length > 25) text += '...and ' + (currentReport.rows.length - 25) + ' more rows.\n';

  const url = 'https://wa.me/?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
});

// ---------------- Init ----------------

(async function init() {
  updateVisibleFields();
  await loadReferenceData();
})();