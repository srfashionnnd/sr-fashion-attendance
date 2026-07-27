/**
 * staff.js
 * ------------------------------------------------------------
 * Staff list rendering, search filter, and the add/edit modal.
 * ------------------------------------------------------------
 */

let allStaff = [];

const tableBody = document.getElementById('staffTableBody');
const emptyNote = document.getElementById('staffEmptyNote');
const countNote = document.getElementById('staffCountNote');
const searchInput = document.getElementById('searchInput');

const modalBackdrop = document.getElementById('staffModalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const staffForm = document.getElementById('staffForm');

function openModal(staff) {
  staffForm.reset();
  document.getElementById('fEmployeeId').value = staff ? staff.EmployeeID : '';
  document.getElementById('fName').value = staff ? staff.Name : '';
  document.getElementById('fDesignation').value = staff ? staff.Designation : '';
  document.getElementById('fDepartment').value = staff ? staff.Department : '';
  document.getElementById('fMobile').value = staff ? staff.Mobile : '';
  document.getElementById('fJoiningDate').value = staff ? staff.JoiningDate : '';
  document.getElementById('fBloodGroup').value = staff ? staff.BloodGroup : '';
  document.getElementById('fEmergencyContact').value = staff ? staff.EmergencyContact : '';
  modalTitle.textContent = staff ? 'Edit Staff — ' + staff.EmployeeID : 'Add Staff';
  modalBackdrop.classList.add('visible');
}

function closeModal() {
  modalBackdrop.classList.remove('visible');
}

document.getElementById('btnAddStaff').addEventListener('click', () => openModal(null));
document.getElementById('btnCloseModal').addEventListener('click', closeModal);
document.getElementById('btnCancelModal').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

function renderTable(list) {
  tableBody.innerHTML = list.map(s => `
    <tr>
      <td>${s.EmployeeID}</td>
      <td>${s.Name}</td>
      <td>${s.Designation || '—'}</td>
      <td>${s.Department || '—'}</td>
      <td>${s.Mobile || '—'}</td>
      <td><span class="badge ${statusBadgeClass(s.Status)}">${s.Status}</span></td>
      <td style="white-space:nowrap;">
        <button class="btn btn-ghost btn-small" onclick="editStaff('${s.EmployeeID}')">Edit</button>
        ${s.Status === 'Active'
          ? `<button class="btn btn-ghost btn-small" onclick="toggleStatus('${s.EmployeeID}', 'deactivate')">Deactivate</button>`
          : `<button class="btn btn-ghost btn-small" onclick="toggleStatus('${s.EmployeeID}', 'activate')">Activate</button>`}
        <button class="btn btn-danger btn-small" onclick="removeStaff('${s.EmployeeID}', '${s.Name}')">Delete</button>
      </td>
    </tr>
  `).join('');
  emptyNote.style.display = list.length ? 'none' : 'block';
}

function applyFilter() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { renderTable(allStaff); return; }
  const filtered = allStaff.filter(s =>
    String(s.Name || '').toLowerCase().includes(q) ||
    String(s.EmployeeID || '').toLowerCase().includes(q) ||
    String(s.Barcode || '').toLowerCase().includes(q) ||
    String(s.Mobile || '').toLowerCase().includes(q)
  );
  renderTable(filtered);
}

searchInput.addEventListener('input', applyFilter);

async function loadStaff() {
  const res = await callApiGet('getStaffList');
  if (!res.success) {
    showToast(res.error || 'Could not load staff list.', 'error');
    return;
  }
  allStaff = res.staff;
  countNote.textContent = allStaff.length + ' staff on record';
  applyFilter();
}

function editStaff(employeeId) {
  const staff = allStaff.find(s => s.EmployeeID === employeeId);
  if (staff) openModal(staff);
}

async function toggleStatus(employeeId, action) {
  const res = await callApi(action === 'activate' ? 'activateStaff' : 'deactivateStaff', { employeeId });
  if (res.success) {
    showToast('Staff ' + (action === 'activate' ? 'activated' : 'deactivated') + '.', 'success');
    loadStaff();
  } else {
    showToast(res.error || 'Could not update status.', 'error');
  }
}

async function removeStaff(employeeId, name) {
  if (!confirm('Delete ' + name + ' (' + employeeId + ')? This cannot be undone.')) return;
  const res = await callApi('deleteStaff', { employeeId });
  if (res.success) {
    showToast('Staff deleted.', 'success');
    loadStaff();
  } else {
    showToast(res.error || 'Could not delete staff.', 'error');
  }
}

staffForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const employeeId = document.getElementById('fEmployeeId').value;
  const payload = {
    name: document.getElementById('fName').value.trim(),
    designation: document.getElementById('fDesignation').value.trim(),
    department: document.getElementById('fDepartment').value.trim(),
    mobile: document.getElementById('fMobile').value.trim(),
    joiningDate: document.getElementById('fJoiningDate').value,
    bloodGroup: document.getElementById('fBloodGroup').value,
    emergencyContact: document.getElementById('fEmergencyContact').value.trim()
  };

  const saveBtn = document.getElementById('btnSaveStaff');
  saveBtn.disabled = true;

  let res;
  if (employeeId) {
    res = await callApi('editStaff', Object.assign({ employeeId }, payload));
  } else {
    res = await callApi('addStaff', payload);
  }

  saveBtn.disabled = false;

  if (res.success) {
    showToast(employeeId ? 'Staff updated.' : 'Staff added — ID ' + res.employeeId, 'success');
    closeModal();
    loadStaff();
  } else {
    showToast(res.error || 'Could not save staff.', 'error');
  }
});

loadStaff();
