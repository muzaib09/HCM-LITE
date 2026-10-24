// js/pages/employee-page.js - employee self-service dashboard (only the logged-in employee's own data)

const employeeUser = requireRole(["employee"]);

function renderToday() {
  const company = getCompany();
  const today = todayString();
  const record = getTodayRecord(employeeUser.id);
  const openRecord = getOpenRecord(employeeUser.id);
  const dayOff = !isWorkingDay(today, company);
  const onLeave = hasApprovedLeaveIn(getLeaves(), employeeUser.id, today);

  document.getElementById("todayDate").textContent = formatLongDate(today);
  const checkInButton = document.getElementById("checkInBtn");
  const checkOutButton = document.getElementById("checkOutBtn");
  checkInButton.innerHTML = icon("clock") + "Check in";
  checkOutButton.innerHTML = icon("logout") + "Check out";
  checkInButton.disabled = record !== null || dayOff || onLeave || openRecord !== null;
  checkOutButton.disabled = openRecord === null;

  let status = "";
  if (record !== null) {
    status = "Checked in at " + formatTime(record.checkIn) + " " + statusBadge(getRecordLabel(record));
    if (record.checkOut) {
      status += " <span>Checked out at " + formatTime(record.checkOut) + " (" + formatHours(record.hoursWorked) + ")</span>";
    }
  } else if (openRecord !== null) {
    status = "Your shift from " + formatDisplayDate(openRecord.date) + " is still open. Please check out.";
  } else if (dayOff) {
    status = "Today is a day off.";
  } else if (onLeave) {
    status = statusBadge("On Leave") + " You are on approved leave today.";
  } else {
    status = "Not checked in yet. Office starts at " + formatTime(company.officeStart) + " (" + company.graceMinutes + " min grace).";
  }
  document.getElementById("todayStatus").innerHTML = status;
}

function renderStats() {
  const now = new Date();
  const usage = getLeaveUsage(employeeUser.id, now.getFullYear());
  const month = calculatePayslip(employeeUser, now.getFullYear(), now.getMonth() + 1);
  const cards = [
    { label: "Leave days left in " + usage.year, value: usage.remaining, icon: "calendar", tone: "info" },
    { label: "Hours worked this week", value: formatHours(getWeekHours(employeeUser.id)), icon: "clock", tone: "" },
    { label: "Days present this month (" + month.lateDays + " late)", value: month.presentDays, icon: "check", tone: "good" },
    { label: "Absences this month", value: month.absentDays, icon: "alert", tone: month.absentDays > 0 ? "bad" : "" }
  ];
  let html = "";
  for (let i = 0; i < cards.length; i++) {
    html +=
      '<div class="stat"><span class="stat-icon ' + cards[i].tone + '">' + icon(cards[i].icon) + "</span>" +
      '<div><div class="stat-value">' + cards[i].value + '</div><div class="stat-label">' + cards[i].label + "</div></div></div>";
  }
  document.getElementById("employeeStats").innerHTML = html;
}

function renderMyAttendance() {
  const records = getUserAttendance(employeeUser.id);
  const box = document.getElementById("myAttendance");
  if (records.length === 0) {
    box.innerHTML = emptyState("clock", "No attendance yet", "Use Check in above when you start work.");
    return;
  }
  let rows = "";
  const limit = Math.min(records.length, 10);
  for (let i = 0; i < limit; i++) {
    rows +=
      "<tr><td>" + formatDisplayDate(records[i].date) + "</td><td>" + formatTime(records[i].checkIn) + "</td><td>" + formatTime(records[i].checkOut) +
      "</td><td>" + (records[i].checkOut ? formatHours(records[i].hoursWorked) : "-") + "</td><td>" + statusBadge(getRecordLabel(records[i])) + "</td></tr>";
  }
  box.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Worked</th><th>Status</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}

function renderMyLeave() {
  const leaves = getUserLeaves(employeeUser.id);
  leaves.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const usage = getLeaveUsage(employeeUser.id, new Date().getFullYear());
  let html = '<p class="muted" style="margin-bottom:10px">' + usage.remaining + " of " + usage.quota + " days left in " + usage.year + " (" + usage.pending + " pending).</p>";
  if (leaves.length === 0) {
    html += emptyState("calendar", "No leave requests", "Requests you send will appear here with their status.");
  } else {
    let items = "";
    const limit = Math.min(leaves.length, 5);
    for (let i = 0; i < limit; i++) {
      items +=
        "<li><div><strong>" + escapeHtml(leaves[i].type) + "</strong><small>" + formatDisplayDate(leaves[i].startDate) + " to " + formatDisplayDate(leaves[i].endDate) + " (" + leaves[i].days + " day(s))</small>" +
        (leaves[i].adminComment ? "<small>Admin: " + escapeHtml(leaves[i].adminComment) + "</small>" : "") + "</div>" + statusBadge(leaves[i].status) + "</li>";
    }
    html += '<ul class="list">' + items + "</ul>";
  }
  document.getElementById("myLeaveSummary").innerHTML = html;
}

function renderAnnouncements() {
  const list = getAnnouncements();
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const box = document.getElementById("announcementList");
  if (list.length === 0) {
    box.innerHTML = emptyState("megaphone", "No announcements", "Company news will show up here.");
    return;
  }
  let html = "";
  for (let i = 0; i < list.length; i++) {
    html += '<article class="announce"><header><strong>' + escapeHtml(list[i].title) + "</strong><small>" + formatDisplayDate(list[i].createdAt.slice(0, 10)) + "</small></header><p>" + escapeHtml(list[i].message) + "</p></article>";
  }
  box.innerHTML = html;
}

function refreshAll() {
  renderToday();
  renderStats();
  renderMyAttendance();
  renderMyLeave();
}

if (employeeUser) {
  buildLayout(employeeUser, "employee", "My dashboard");
  refreshAll();
  renderAnnouncements();
  setupChatBox("employee", employeeUser);
  setupChangePasswordForm(employeeUser.id);

  document.getElementById("checkInBtn").onclick = () => {
    const result = checkIn(employeeUser.id);
    showToast(result.message, result.ok ? "success" : "error");
    refreshAll();
  };
  document.getElementById("checkOutBtn").onclick = () => {
    const result = checkOut(employeeUser.id);
    showToast(result.message, result.ok ? "success" : "error");
    refreshAll();
  };
}
