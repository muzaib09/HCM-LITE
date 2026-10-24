// js/pages/employees-page.js - admin: add, edit, delete, search and filter employees

const adminUser = requireRole(["admin"]);
let editingId = ""; // "" means we are adding a new employee

function fillDepartmentChoices() {
  const select = document.getElementById("departmentFilter");
  const keep = select.value;
  const departments = getDepartments();
  let options = '<option value="">All departments</option>';
  let datalist = "";
  for (let i = 0; i < departments.length; i++) {
    options += '<option value="' + escapeHtml(departments[i]) + '">' + escapeHtml(departments[i]) + "</option>";
    datalist += '<option value="' + escapeHtml(departments[i]) + '"></option>';
  }
  select.innerHTML = options;
  select.value = departments.includes(keep) ? keep : "";
  document.getElementById("departmentList").innerHTML = datalist;
}

function renderEmployeeTable() {
  const all = getEmployees();
  const shown = filterEmployees(all, document.getElementById("searchInput").value, document.getElementById("departmentFilter").value);
  const box = document.getElementById("employeeTable");

  if (all.length === 0) {
    box.innerHTML = emptyState("users", "No employees yet", "Choose Add employee to create the first one. Their login is created automatically.");
    return;
  }
  if (shown.length === 0) {
    box.innerHTML = emptyState("search", "No matches", "Try a different search or department.");
    return;
  }
  let rows = "";
  for (let i = 0; i < shown.length; i++) {
    const e = shown[i];
    rows +=
      '<tr><td class="cell-person"><strong>' + escapeHtml(e.name) + "</strong><small>" + escapeHtml(e.email) + "</small></td>" +
      "<td>" + escapeHtml(e.department) + "<small> " + escapeHtml(e.designation || "") + "</small></td>" +
      "<td>" + formatDisplayDate(e.joinDate) + '</td><td class="num">' + formatMoney(e.salary) + "</td>" +
      '<td><div class="row-actions">' +
      '<button type="button" class="btn btn-ghost btn-small edit-btn" data-id="' + escapeHtml(e.id) + '" aria-label="Edit ' + escapeHtml(e.name) + '">' + icon("edit") + "Edit</button>" +
      '<button type="button" class="btn btn-ghost btn-small delete-btn" data-id="' + escapeHtml(e.id) + '" aria-label="Delete ' + escapeHtml(e.name) + '">' + icon("trash") + "Delete</button>" +
      "</div></td></tr>";
  }
  box.innerHTML =
    '<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Department</th><th>Joined</th><th class="num">Monthly salary</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
    '<p class="hint" style="margin-top:10px">Showing ' + shown.length + " of " + all.length + " employee(s).</p>";

  const editButtons = box.getElementsByClassName("edit-btn");
  for (let i = 0; i < editButtons.length; i++) {
    editButtons[i].onclick = () => openEmployeeDialog(editButtons[i].dataset.id);
  }
  const deleteButtons = box.getElementsByClassName("delete-btn");
  for (let i = 0; i < deleteButtons.length; i++) {
    deleteButtons[i].onclick = () => askToDelete(deleteButtons[i].dataset.id);
  }
}

function openEmployeeDialog(id) {
  clearFormErrors("employeeForm");
  editingId = id;
  const form = document.getElementById("employeeForm");
  form.reset();
  if (id === "") {
    document.getElementById("employeeDialogTitle").textContent = "Add employee";
    document.getElementById("empPasswordLabel").textContent = "Password";
    document.getElementById("empPasswordHint").textContent = "At least 8 characters with a letter and a number.";
    document.getElementById("empJoinDate").value = todayString();
  } else {
    const employee = getEmployeeById(id);
    if (employee === null) {
      showToast("This employee no longer exists.", "error");
      return;
    }
    document.getElementById("employeeDialogTitle").textContent = "Edit employee";
    document.getElementById("empName").value = employee.name;
    document.getElementById("empEmail").value = employee.email;
    document.getElementById("empDepartment").value = employee.department;
    document.getElementById("empDesignation").value = employee.designation || "";
    document.getElementById("empSalary").value = employee.salary;
    document.getElementById("empJoinDate").value = employee.joinDate;
    document.getElementById("empPasswordLabel").textContent = "New password (optional)";
    document.getElementById("empPasswordHint").textContent = "Leave empty to keep the current password.";
  }
  document.getElementById("employeeDialog").showModal();
  document.getElementById("empName").focus();
}

function askToDelete(id) {
  const employee = getEmployeeById(id);
  if (employee === null) {
    return;
  }
  confirmDialog(
    "Delete " + employee.name + "?",
    "This removes their login, attendance and leave records. Other employees are not affected. This cannot be undone.",
    "Delete employee",
    () => {
      deleteEmployee(id);
      fillDepartmentChoices();
      renderEmployeeTable();
      showToast("Employee deleted.");
    }
  );
}

function setupEmployeePage() {
  document.getElementById("searchIcon").innerHTML = icon("search");
  document.getElementById("addEmployeeBtn").innerHTML = icon("plus") + "Add employee";
  document.getElementById("employeeDialogClose").innerHTML = icon("close");
  setupDialogClose("employeeDialog");

  document.getElementById("addEmployeeBtn").onclick = () => openEmployeeDialog("");
  document.getElementById("searchInput").oninput = () => renderEmployeeTable();
  document.getElementById("departmentFilter").onchange = () => renderEmployeeTable();

  document.getElementById("employeeForm").onsubmit = async (event) => {
    event.preventDefault();
    clearFormErrors("employeeForm");
    const data = {
      name: document.getElementById("empName").value,
      email: document.getElementById("empEmail").value,
      password: document.getElementById("empPassword").value,
      department: document.getElementById("empDepartment").value,
      designation: document.getElementById("empDesignation").value,
      salary: document.getElementById("empSalary").value,
      joinDate: document.getElementById("empJoinDate").value
    };
    const saveButton = document.getElementById("employeeSaveBtn");
    saveButton.disabled = true;
    const result = editingId === "" ? await createEmployee(data) : await updateEmployee(editingId, data);
    saveButton.disabled = false;
    if (!result.ok) {
      showFormErrors("emp", result.errors);
      return;
    }
    document.getElementById("employeeDialog").close();
    fillDepartmentChoices();
    renderEmployeeTable();
    showToast(editingId === "" ? "Employee added. They can log in with their email and password." : "Employee updated.");
  };
}

if (adminUser) {
  buildLayout(adminUser, "employees", "Employees");
  setupEmployeePage();
  fillDepartmentChoices();
  renderEmployeeTable();
}
