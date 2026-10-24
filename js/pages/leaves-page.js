// js/pages/leaves-page.js - leave management. Employees apply; the admin reviews.

const leaveUser = requireRole(["admin", "employee"]);
let reviewingId = "";

// ================= Employee side =================
function renderBalance() {
  const usage = getLeaveUsage(leaveUser.id, new Date().getFullYear());
  const cards = [
    { label: "Yearly quota (" + usage.year + ")", value: usage.quota, icon: "calendar", tone: "" },
    { label: "Approved days used", value: usage.approved, icon: "check", tone: "good" },
    { label: "Pending days", value: usage.pending, icon: "clock", tone: "warn" },
    { label: "Days remaining", value: usage.remaining, icon: "inbox", tone: "info" }
  ];
  let html = "";
  for (let i = 0; i < cards.length; i++) {
    html +=
      '<div class="stat"><span class="stat-icon ' + cards[i].tone + '">' + icon(cards[i].icon) + "</span>" +
      '<div><div class="stat-value">' + cards[i].value + '</div><div class="stat-label">' + cards[i].label + "</div></div></div>";
  }
  document.getElementById("leaveBalance").innerHTML = html;
}

function renderMyLeaves() {
  const leaves = getUserLeaves(leaveUser.id);
  leaves.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const box = document.getElementById("myLeaves");
  if (leaves.length === 0) {
    box.innerHTML = emptyState("calendar", "No requests yet", "Send your first leave request using the form.");
    return;
  }
  let rows = "";
  for (let i = 0; i < leaves.length; i++) {
    rows +=
      "<tr><td>" + escapeHtml(leaves[i].type) + "</td><td>" + formatDisplayDate(leaves[i].startDate) + " to " + formatDisplayDate(leaves[i].endDate) +
      '</td><td class="num">' + leaves[i].days + "</td><td>" + statusBadge(leaves[i].status) + '</td><td class="wrap-cell">' +
      escapeHtml(leaves[i].adminComment || "-") + "</td></tr>";
  }
  box.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Type</th><th>Dates</th><th class="num">Days</th><th>Status</th><th>Admin comment</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}

function updateDaysPreview() {
  const start = document.getElementById("leaveStartDate").value;
  const end = document.getElementById("leaveEndDate").value;
  const preview = document.getElementById("leaveDaysPreview");
  preview.textContent = "";
  if (!isValidDateString(start) || !isValidDateString(end) || start > end || start.slice(0, 4) !== end.slice(0, 4)) {
    return;
  }
  const days = countWorkingDays(start, end, getCompany());
  const usage = getLeaveUsage(leaveUser.id, Number(start.slice(0, 4)));
  preview.textContent = "This covers " + days + " working day(s). You have " + Math.max(usage.available, 0) + " available for " + usage.year + ".";
}

function setupEmployeeLeaveView() {
  document.getElementById("employeeLeaveView").hidden = false;
  let options = '<option value="">Choose type</option>';
  for (let i = 0; i < LEAVE_TYPES.length; i++) {
    options += '<option value="' + LEAVE_TYPES[i] + '">' + LEAVE_TYPES[i] + "</option>";
  }
  document.getElementById("leaveType").innerHTML = options;
  document.getElementById("leaveStartDate").onchange = updateDaysPreview;
  document.getElementById("leaveEndDate").onchange = updateDaysPreview;

  document.getElementById("leaveForm").onsubmit = (event) => {
    event.preventDefault();
    clearFormErrors("leaveForm");
    const result = applyForLeave(leaveUser.id, {
      type: document.getElementById("leaveType").value,
      startDate: document.getElementById("leaveStartDate").value,
      endDate: document.getElementById("leaveEndDate").value,
      reason: document.getElementById("leaveReason").value
    });
    if (!result.ok) {
      showFormErrors("leave", result.errors);
      return;
    }
    event.target.reset();
    updateDaysPreview();
    renderBalance();
    renderMyLeaves();
    showToast("Leave request sent for approval (" + result.leave.days + " working day(s)).");
  };
  renderBalance();
  renderMyLeaves();
}

// ================= Admin side =================
function renderAllLeaves() {
  const filter = document.getElementById("leaveStatusFilter").value;
  const leaves = getLeaves();
  leaves.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const pending = countLeavesByStatus("Pending");
  document.getElementById("leaveCounts").textContent =
    pending + " pending, " + countLeavesByStatus("Approved") + " approved, " + countLeavesByStatus("Rejected") + " rejected";

  let rows = "";
  let shown = 0;
  for (let i = 0; i < leaves.length; i++) {
    const leave = leaves[i];
    if (filter !== "All" && leave.status !== filter) {
      continue;
    }
    shown++;
    const person = getUserById(leave.userId);
    const action = leave.status === "Pending"
      ? '<button type="button" class="btn btn-primary btn-small review-btn" data-id="' + escapeHtml(leave.id) + '">Review</button>'
      : "";
    rows +=
      '<tr><td class="cell-person"><strong>' + escapeHtml(person ? person.name : "Removed employee") + "</strong><small>" + escapeHtml(person ? person.department : "") + "</small></td>" +
      "<td>" + escapeHtml(leave.type) + "</td><td>" + formatDisplayDate(leave.startDate) + " to " + formatDisplayDate(leave.endDate) +
      '</td><td class="num">' + leave.days + '</td><td class="wrap-cell">' + escapeHtml(leave.reason) + "</td><td>" + statusBadge(leave.status) +
      '</td><td class="wrap-cell">' + escapeHtml(leave.adminComment || "-") + '</td><td><div class="row-actions">' + action + "</div></td></tr>";
  }
  const box = document.getElementById("allLeaves");
  if (shown === 0) {
    box.innerHTML = filter === "Pending"
      ? emptyState("inbox", "Nothing to review", "There are no pending leave requests.")
      : emptyState("calendar", "No requests here", "No leave requests match this filter.");
    return;
  }
  box.innerHTML =
    '<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th class="num">Days</th><th>Reason</th><th>Status</th><th>Comment</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  const buttons = box.getElementsByClassName("review-btn");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].onclick = () => openReview(buttons[i].dataset.id);
  }
}

function openReview(id) {
  const leaves = getLeaves();
  let leave = null;
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].id === id) {
      leave = leaves[i];
    }
  }
  if (leave === null || leave.status !== "Pending") {
    showToast("This request is no longer pending.", "error");
    renderAllLeaves();
    return;
  }
  reviewingId = id;
  const person = getUserById(leave.userId);
  const usage = getLeaveUsage(leave.userId, Number(leave.startDate.slice(0, 4)));
  clearFormErrors("reviewForm");
  document.getElementById("reviewComment").value = "";
  document.getElementById("reviewSummary").innerHTML =
    "<div><strong>" + escapeHtml(person ? person.name : "Removed employee") + "</strong> asks for " + escapeHtml(leave.type) + " leave</div>" +
    "<div>" + formatDisplayDate(leave.startDate) + " to " + formatDisplayDate(leave.endDate) + " (" + leave.days + " working day(s))</div>" +
    "<div>Reason: " + escapeHtml(leave.reason) + "</div>" +
    '<div class="muted">Approved so far in ' + usage.year + ": " + usage.approved + " of " + usage.quota + " days</div>";
  document.getElementById("reviewDialog").showModal();
}

function finishReview(decision) {
  clearFormErrors("reviewForm");
  const result = reviewLeave(reviewingId, decision, document.getElementById("reviewComment").value, leaveUser.id);
  if (!result.ok) {
    if (result.message.includes("comment")) {
      setFieldError("reviewComment", result.message);
    } else {
      showToast(result.message, "error");
      document.getElementById("reviewDialog").close();
      renderAllLeaves();
    }
    return;
  }
  document.getElementById("reviewDialog").close();
  renderAllLeaves();
  showToast("Request " + decision.toLowerCase() + ".");
}

function setupAdminEmergencyLeaveForm() {
  const employeeSelect = document.getElementById("adminLeaveEmployee");
  const typeSelect = document.getElementById("adminLeaveType");
  const employees = getEmployees();
  for (let i = 0; i < employees.length; i++) {
    employeeSelect.insertAdjacentHTML("beforeend", '<option value="' + escapeHtml(employees[i].id) + '">' + escapeHtml(employees[i].name) + "</option>");
  }
  for (let i = 0; i < LEAVE_TYPES.length; i++) {
    typeSelect.insertAdjacentHTML("beforeend", '<option value="' + escapeHtml(LEAVE_TYPES[i]) + '">' + escapeHtml(LEAVE_TYPES[i]) + "</option>");
  }
  document.getElementById("adminLeaveForm").onsubmit = (event) => {
    event.preventDefault();
    clearFormErrors("adminLeaveForm");
    const employeeId = employeeSelect.value;
    if (!employeeId || !getUserById(employeeId)) {
      setFieldError("adminLeaveEmployee", "Choose an employee.");
      return;
    }
    const result = applyForLeave(employeeId, {
      type: typeSelect.value,
      startDate: document.getElementById("adminLeaveStartDate").value,
      endDate: document.getElementById("adminLeaveEndDate").value,
      reason: document.getElementById("adminLeaveReason").value
    });
    if (!result.ok) {
      showFormErrors("adminLeave", result.errors);
      return;
    }
    const reviewed = reviewLeave(result.leave.id, "Approved", "Emergency leave recorded by admin.", leaveUser.id);
    if (!reviewed.ok) {
      showToast(reviewed.message, "error");
      renderAllLeaves();
      return;
    }
    event.target.reset();
    renderAllLeaves();
    showToast("Emergency leave recorded and approved.");
  };
}

function setupAdminLeaveView() {
  document.getElementById("adminLeaveView").hidden = false;
  setupAdminEmergencyLeaveForm();
  document.getElementById("reviewClose").innerHTML = icon("close");
  setupDialogClose("reviewDialog");
  document.getElementById("leaveStatusFilter").onchange = renderAllLeaves;
  document.getElementById("approveBtn").onclick = () => finishReview("Approved");
  document.getElementById("rejectBtn").onclick = () => finishReview("Rejected");
  document.getElementById("reviewForm").onsubmit = (event) => event.preventDefault();
  renderAllLeaves();
}

if (leaveUser) {
  if (leaveUser.role === "admin") {
    buildLayout(leaveUser, "leaves", "Leave requests");
    setupAdminLeaveView();
  } else {
    buildLayout(leaveUser, "leaves", "My leave");
    setupEmployeeLeaveView();
  }
}
