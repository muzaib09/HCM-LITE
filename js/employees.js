// js/employees.js
// Employee rules. An employee IS a user record with role "employee",
// so the login account and the employee record can never get out of sync.

function getEmployees() {
  const users = getUsers();
  const employees = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].role === "employee") {
      employees.push(users[i]);
    }
  }
  return employees;
}

function getUserById(id) {
  const users = getUsers();
  for (let i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      return users[i];
    }
  }
  return null;
}

function getEmployeeById(id) {
  const user = getUserById(id);
  return user !== null && user.role === "employee" ? user : null;
}

// data = { name, email, password, department, designation, salary, joinDate }
// editingId = "" when adding a new employee.
function validateEmployeeData(data, editingId) {
  const errors = {};
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const salaryText = String(data.salary).trim();

  if (name === "") {
    errors.name = "Enter the employee's full name.";
  }
  if (email === "") {
    errors.email = "Enter an email address.";
  } else if (!isEmailFormatValid(email)) {
    errors.email = "Enter a valid email, like name@company.com.";
  } else {
    const existing = findUserByEmail(email);
    if (existing !== null && existing.id !== editingId) {
      errors.email = "Another account already uses this email.";
    }
  }
  const mustSetPassword = editingId === "" || data.password !== "";
  if (mustSetPassword) {
    const problem = getPasswordProblem(data.password);
    if (problem !== "") {
      errors.password = problem;
    }
  }
  if (data.department.trim() === "") {
    errors.department = "Enter a department.";
  }
  if (salaryText === "") {
    errors.salary = "Enter the monthly salary.";
  } else if (!isFinite(Number(salaryText)) || Number(salaryText) <= 0) {
    errors.salary = "Salary must be a number greater than zero.";
  }
  if (!isValidDateString(data.joinDate)) {
    errors.joinDate = "Choose a valid joining date.";
  }
  return errors;
}

async function createEmployee(data) {
  const errors = validateEmployeeData(data, "");
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors };
  }
  const salt = makeSalt();
  const employee = {
    id: newId("usr"),
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: "employee",
    department: data.department.trim(),
    designation: data.designation.trim(),
    salary: Number(data.salary),
    joinDate: data.joinDate,
    salt: salt,
    passwordHash: await hashPassword(data.password, salt),
    createdAt: new Date().toISOString()
  };
  upsertRecord(KEYS.users, employee);
  return { ok: true, employee: employee };
}

async function updateEmployee(id, data) {
  const employee = getEmployeeById(id);
  if (employee === null) {
    return { ok: false, errors: { form: "This employee no longer exists." } };
  }
  const errors = validateEmployeeData(data, id);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors };
  }
  employee.name = data.name.trim();
  employee.email = data.email.trim().toLowerCase();
  employee.department = data.department.trim();
  employee.designation = data.designation.trim();
  employee.salary = Number(data.salary);
  employee.joinDate = data.joinDate;
  if (data.password !== "") {
    employee.salt = makeSalt();
    employee.passwordHash = await hashPassword(data.password, employee.salt);
  }
  upsertRecord(KEYS.users, employee);
  return { ok: true, employee: employee };
}

// Deleting an employee also deletes THEIR attendance and leave records (nobody else's).
function deleteEmployee(id) {
  const employee = getEmployeeById(id);
  if (employee === null) {
    return false;
  }
  const attendanceKept = [];
  const attendance = getAttendanceList();
  for (let i = 0; i < attendance.length; i++) {
    if (attendance[i].userId !== id) {
      attendanceKept.push(attendance[i]);
    }
  }
  const leavesKept = [];
  const leaves = getLeaves();
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].userId !== id) {
      leavesKept.push(leaves[i]);
    }
  }
  writeJson(KEYS.attendance, attendanceKept);
  writeJson(KEYS.leaves, leavesKept);
  removeById(KEYS.users, id);
  return true;
}

function getDepartments() {
  const employees = getEmployees();
  const names = [];
  for (let i = 0; i < employees.length; i++) {
    if (!names.includes(employees[i].department)) {
      names.push(employees[i].department);
    }
  }
  names.sort();
  return names;
}

function filterEmployees(employees, searchText, department) {
  const search = searchText.trim().toLowerCase();
  const result = [];
  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const matchesDepartment = department === "" || employee.department === department;
    const matchesSearch =
      search === "" ||
      employee.name.toLowerCase().includes(search) ||
      employee.email.toLowerCase().includes(search) ||
      employee.department.toLowerCase().includes(search);
    if (matchesDepartment && matchesSearch) {
      result.push(employee);
    }
  }
  return result;
}
