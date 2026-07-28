/**
 * idcard.js
 * ------------------------------------------------------------
 * Renders the selected staff member's details onto the card
 * preview (front + back) and exports both sides as a print-ready
 * PDF sized exactly to CR80 (85.6mm x 54mm).
 * ------------------------------------------------------------
 */

let staffList = [];

const employeeSelect = document.getElementById('employeeSelect');

async function loadStaffOptions() {
  const res = await callApiGet('getStaffList');
  if (!res.success) {
    showToast(res.error || 'Could not load staff.', 'error');
    return;
  }
  staffList = res.staff;
  employeeSelect.innerHTML = staffList.map(s =>
    `<option value="${s.EmployeeID}">${s.EmployeeID} — ${s.Name}</option>`
  ).join('');

  if (staffList.length) renderCard(staffList[0]);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderCard(staff) {
  document.getElementById('cardName').textContent = staff.Name || '—';
  document.getElementById('cardDesignation').textContent = staff.Designation || '—';
  document.getElementById('cardEmployeeId').textContent = staff.EmployeeID;
  document.getElementById('cardDepartment').textContent = staff.Department || '—';
  document.getElementById('cardJoiningDate').textContent = formatDate(staff.JoiningDate);
  document.getElementById('cardBloodGroup').textContent = staff.BloodGroup || '—';
  document.getElementById('cardMobile').textContent = staff.Mobile || '—';
  document.getElementById('cardEmergencyContact').textContent = staff.EmergencyContact || '—';

  const statusBadge = document.getElementById('statusBadge');
  statusBadge.textContent = staff.Status === 'Active' ? 'ACTIVE' : 'INACTIVE';
  statusBadge.classList.toggle('inactive', staff.Status !== 'Active');

  const photoBox = document.getElementById('photoBox');
  if (staff.PhotoURL) {
    photoBox.innerHTML = `<img src="${staff.PhotoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:1.5mm;">`;
  } else {
    photoBox.innerHTML = '<span>STICK YOUR<br>PHOTO HERE</span>';
  }

  try {
    // CODE39 is used deliberately over CODE128: nearly every hardware
    // barcode scanner has CODE39 enabled by default (CODE128 sometimes
    // needs to be turned on via a scanner configuration sheet), and its
    // wider bars are more forgiving of small print-quality variations.
    JsBarcode('#cardBarcode', staff.Barcode || staff.EmployeeID, {
      format: 'CODE39',
      displayValue: true,
      fontSize: 30,
      fontOptions: 'bold',
      textMargin: 4,
      height: 110,
      width: 3,
      margin: 14, // quiet zone — required for real scanners to lock on; do not set to 0
      background: '#ffffff',
      lineColor: '#000000'
    });
  } catch (err) {
    // barcode library failed to load / invalid value — card still shows the ID as text
  }
}

employeeSelect.addEventListener('change', () => {
  const staff = staffList.find(s => s.EmployeeID === employeeSelect.value);
  if (staff) renderCard(staff);
});

document.getElementById('btnPrint').addEventListener('click', () => window.print());

document.getElementById('btnDownloadPdf').addEventListener('click', async () => {
  const btn = document.getElementById('btnDownloadPdf');
  btn.disabled = true;
  btn.textContent = 'Generating…';

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [85.6, 54], orientation: 'landscape' });

    const frontCanvas = await html2canvas(document.getElementById('cardFront'), { scale: 4, backgroundColor: null });
    doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);

    doc.addPage([85.6, 54], 'landscape');
    const backCanvas = await html2canvas(document.getElementById('cardBack'), { scale: 4, backgroundColor: null });
    doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);

    const employeeId = employeeSelect.value || 'staff';
    doc.save(employeeId + '_IDCard.pdf');
  } catch (err) {
    showToast('Could not generate PDF: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download ID Card (PDF)';
  }
});

loadStaffOptions();