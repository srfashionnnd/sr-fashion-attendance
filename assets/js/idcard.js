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
  staffList = res.staff.filter(s => s.Status === 'Active');
  employeeSelect.innerHTML = staffList.map(s =>
    `<option value="${s.EmployeeID}">${s.EmployeeID} — ${s.Name}</option>`
  ).join('');

  if (staffList.length) renderCard(staffList[0]);
}

function renderCard(staff) {
  document.getElementById('cardName').textContent = staff.Name || '—';
  document.getElementById('cardDesignation').textContent = staff.Designation || '—';
  document.getElementById('cardEmployeeId').textContent = staff.EmployeeID;
  document.getElementById('cardBloodGroup').textContent = staff.BloodGroup || '—';
  document.getElementById('cardEmergencyContact').textContent = staff.EmergencyContact || '—';

  const photoBox = document.getElementById('photoBox');
  if (staff.PhotoURL) {
    photoBox.innerHTML = `<img src="${staff.PhotoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:1.5mm;">`;
  } else {
    photoBox.innerHTML = '<span>STICK YOUR<br>PHOTO HERE</span>';
  }

  try {
    JsBarcode('#cardBarcode', staff.Barcode || staff.EmployeeID, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 10,
      height: 30,
      margin: 0,
      background: 'transparent',
      lineColor: '#f5f3ee'
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