// js/pages/payslip-page.js - monthly payslip. Admin can pick any employee; an employee only sees their own.

const payUser = requireRole(["admin", "employee"]);

function getSelectedEmployee() {
  if (payUser.role === "employee") {
    return payUser; // employees can never view anyone else, whatever is in the URL
  }
  return getEmployeeById(document.getElementById("payEmployee").value);
}

function row(label, value) {
  return "<tr><td>" + label + '</td><td class="num">' + value + "</td></tr>";
}

function renderPayslip() {
  const stage = document.getElementById("payslipStage");
  const printButton = document.getElementById("printBtn");
  const employee = getSelectedEmployee();
  const year = Number(document.getElementById("payYear").value);
  const month = Number(document.getElementById("payMonth").value);
  const now = new Date();

  printButton.disabled = true;
  if (employee === null) {
    stage.innerHTML = '<section class="card">' + emptyState("users", "No employee selected", "Add an employee first, then come back to see their payslip.") + "</section>";
    return;
  }
  if (year * 12 + month > now.getFullYear() * 12 + (now.getMonth() + 1)) {
    stage.innerHTML = '<section class="card">' + emptyState("calendar", "That month has not started", "Choose the current month or an earlier one.") + "</section>";
    return;
  }

  const company = getCompany();
  const slip = calculatePayslip(employee, year, month);
  if (slip.workingDays === 0) {
    stage.innerHTML = '<section class="card">' + emptyState("calendar", "No working days", "Every day of this month is a day off in your settings.") + "</section>";
    return;
  }

  let absentList = "";
  for (let i = 0; i < slip.absentDates.length; i++) {
    absentList += (i > 0 ? ", " : "") + formatDisplayDate(slip.absentDates[i]);
  }
  const monthName = MONTH_NAMES[month - 1] + " " + year;

  stage.innerHTML =
    '<article class="payslip" id="payslipDocument">' +
    '<div class="payslip-head"><div><h2>' + escapeHtml(company.name) + "</h2><small>Payslip</small></div>" +
    '<div class="payslip-period"><small>Salary month</small><br><strong>' + monthName + "</strong></div></div>" +
    '<div class="payslip-info">' +
    "<div><small>Employee</small><strong>" + escapeHtml(employee.name) + "</strong></div>" +
    "<div><small>Email</small>" + escapeHtml(employee.email) + "</div>" +
    "<div><small>Department</small>" + escapeHtml(employee.department) + "</div>" +
    "<div><small>Job title</small>" + escapeHtml(employee.designation || "-") + "</div>" +
    "<div><small>Joined</small>" + formatDisplayDate(employee.joinDate) + "</div>" +
    "<div><small>Employee ID</small>" + escapeHtml(employee.id) + "</div></div>" +
    '<table><thead><tr><th>Salary</th><th class="num">Amount</th></tr></thead><tbody>' +
    row("Monthly salary", formatMoney(slip.monthlySalary)) +
    row("Working days in " + monthName, slip.workingDays) +
    row("Per-day salary", formatMoney(slip.perDaySalary)) +
    row("Deduction (" + slip.absentDays + " absent + " + slip.halfDays + " half day x 0.5)", "- " + formatMoney(slip.deduction)) +
    '<tr class="total-row"><td>Net salary</td><td class="num">' + formatMoney(slip.netSalary) + "</td></tr></tbody></table>" +
    '<table><thead><tr><th>Attendance summary</th><th class="num">Days</th></tr></thead><tbody>' +
    row("Present (including late)", slip.presentDays) +
    row("Of which late", slip.lateDays) +
    row("Half days (including " + slip.incompleteDays + " without check-out)", slip.halfDays) +
    row("Approved leave (paid)", slip.leaveDays) +
    row("Absent days", slip.absentDays) +
    row("Not counted yet (today, upcoming, before joining)", slip.notCountedDays) +
    "</tbody></table>" +
    '<div class="payslip-notes">' +
    (absentList !== "" ? "<p>Absent on: " + absentList + ".</p>" : "") +
    "<p>Deduction = per-day salary x (absent days + 0.5 x half days). Day-off days are not counted. Approved leave is paid. Past days with a check-in but no check-out count as half days. Today and future days are never counted as absences.</p>" +
    "<p>Generated on " + formatDisplayDate(todayString()) + " by HCM Lite (learning project, not an official payroll document).</p></div></article>";
  printButton.disabled = false;
}

function setupPayslipPage() {
  const now = new Date();
  let monthOptions = "";
  for (let i = 0; i < 12; i++) {
    monthOptions += '<option value="' + (i + 1) + '">' + MONTH_NAMES[i] + "</option>";
  }
  document.getElementById("payMonth").innerHTML = monthOptions;
  let yearOptions = "";
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    yearOptions += '<option value="' + y + '">' + y + "</option>";
  }
  document.getElementById("payYear").innerHTML = yearOptions;
  document.getElementById("payMonth").value = String(now.getMonth() + 1);
  document.getElementById("payYear").value = String(now.getFullYear());

  const picker = document.getElementById("employeePickerField");
  if (payUser.role === "admin") {
    const employees = getEmployees();
    let employeeOptions = "";
    for (let i = 0; i < employees.length; i++) {
      employeeOptions += '<option value="' + escapeHtml(employees[i].id) + '">' + escapeHtml(employees[i].name) + "</option>";
    }
    document.getElementById("payEmployee").innerHTML = employeeOptions;
    // Optional links like payslip.html?employee=ID&month=2026-10 (admin only; ignored if invalid)
    const params = new URLSearchParams(window.location.search);
    const wantedId = params.get("employee");
    if (wantedId && getEmployeeById(wantedId) !== null) {
      document.getElementById("payEmployee").value = wantedId;
    }
    const wantedMonth = params.get("month");
    if (wantedMonth && /^\d{4}-\d{2}$/.test(wantedMonth)) {
      const wantedYear = wantedMonth.slice(0, 4);
      if (document.getElementById("payYear").querySelector('option[value="' + wantedYear + '"]')) {
        document.getElementById("payYear").value = wantedYear;
        document.getElementById("payMonth").value = String(Number(wantedMonth.slice(5, 7)));
      }
    }
  } else {
    picker.hidden = true;
  }

  document.getElementById("payEmployee").onchange = renderPayslip;
  document.getElementById("payMonth").onchange = renderPayslip;
  document.getElementById("payYear").onchange = renderPayslip;
  document.getElementById("printBtn").innerHTML = icon("printer") + "Print / Save as PDF";
  document.getElementById("printBtn").onclick = () => window.print();
}

if (payUser) {
  buildLayout(payUser, "payslip", payUser.role === "admin" ? "Payslips" : "My payslip");
  setupPayslipPage();
  renderPayslip();
}
