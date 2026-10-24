// js/pages/admin.js - admin dashboard. Every number is calculated from saved records.

const adminUser = requireRole(["admin"]);

function renderStats() {
  const summary = getTodaySummary();
  const pending = countLeavesByStatus("Pending");
  const cards = [
    { label: "Total employees", value: summary.totalEmployees, icon: "users", tone: "" },
    { label: "Present today", value: summary.present.length, icon: "check", tone: "good" },
    { label: "On leave today", value: summary.onLeave.length, icon: "calendar", tone: "info" },
    { label: "Late today", value: summary.late.length, icon: "clock", tone: "warn" },
    { label: "Absent today", value: summary.absent.length, icon: "alert", tone: "bad" },
    { label: "Pending leave requests", value: pending, icon: "inbox", tone: "warn" },
    { label: "Departments", value: getDepartments().length, icon: "building", tone: "" },
    { label: "Still working now", value: summary.stillWorking.length, icon: "clock", tone: "info" }
  ];
  let html = "";
  for (let i = 0; i < cards.length; i++) {
    html +=
      '<div class="stat"><span class="stat-icon ' + cards[i].tone + '">' + icon(cards[i].icon) + "</span>" +
      '<div><div class="stat-value">' + cards[i].value + '</div><div class="stat-label">' + cards[i].label + "</div></div></div>";
  }
  document.getElementById("statGrid").innerHTML = html;

  const banner = document.getElementById("todayBanner");
  if (!summary.isWorkingDay) {
    banner.hidden = false;
    banner.className = "notice";
    banner.innerHTML = icon("calendar") + "<span>Today is a day off, so nobody is counted as absent.</span>";
  } else if (summary.totalEmployees === 0) {
    banner.hidden = false;
    banner.className = "notice";
    banner.innerHTML = icon("users") + '<span>No employees yet. <a href="employees.html">Add your first employee</a> to start tracking attendance.</span>';
  } else {
    banner.hidden = true;
  }
}

function renderRecentAttendance() {
  const records = getAttendanceList();
  records.sort((a, b) => (a.checkInAt < b.checkInAt ? 1 : -1));
  if (records.length === 0) {
    document.getElementById("recentAttendance").innerHTML = emptyState("clock", "No attendance yet", "Records appear here as soon as employees check in.");
    return;
  }
  let rows = "";
  const limit = Math.min(records.length, 8);
  for (let i = 0; i < limit; i++) {
    const user = getUserById(records[i].userId);
    rows +=
      "<tr><td>" + escapeHtml(user ? user.name : "Removed employee") + "</td><td>" + formatDisplayDate(records[i].date) + "</td><td>" +
      formatTime(records[i].checkIn) + "</td><td>" + formatTime(records[i].checkOut) + "</td><td>" + statusBadge(getRecordLabel(records[i])) + "</td></tr>";
  }
  document.getElementById("recentAttendance").innerHTML =
    '<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Date</th><th>In</th><th>Out</th><th>Status</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}

function renderPendingLeaves() {
  const leaves = getLeaves();
  let items = "";
  let count = 0;
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].status !== "Pending") {
      continue;
    }
    count++;
    if (count > 6) {
      continue;
    }
    const user = getUserById(leaves[i].userId);
    items +=
      "<li><div><strong>" + escapeHtml(user ? user.name : "Removed employee") + "</strong><small>" + escapeHtml(leaves[i].type) + " | " +
      formatDisplayDate(leaves[i].startDate) + " to " + formatDisplayDate(leaves[i].endDate) + "</small></div>" +
      '<span class="badge badge-warn">' + leaves[i].days + " day(s)</span></li>";
  }
  document.getElementById("pendingLeaves").innerHTML = count === 0
    ? emptyState("inbox", "Nothing to review", "New leave requests will show up here.")
    : '<ul class="list">' + items + "</ul>";
}

function renderDepartmentSummary() {
  const employees = getEmployees();
  const departments = getDepartments();
  if (departments.length === 0) {
    document.getElementById("departmentSummary").innerHTML = emptyState("building", "No departments yet", "Departments appear when you add employees.");
    return;
  }
  const summary = getTodaySummary();
  let rows = "";
  for (let i = 0; i < departments.length; i++) {
    let total = 0;
    let present = 0;
    let onLeave = 0;
    for (let j = 0; j < employees.length; j++) {
      if (employees[j].department === departments[i]) {
        total++;
      }
    }
    for (let j = 0; j < summary.present.length; j++) {
      if (summary.present[j].department === departments[i]) {
        present++;
      }
    }
    for (let j = 0; j < summary.onLeave.length; j++) {
      if (summary.onLeave[j].department === departments[i]) {
        onLeave++;
      }
    }
    rows += "<tr><td>" + escapeHtml(departments[i]) + '</td><td class="num">' + total + '</td><td class="num">' + present + '</td><td class="num">' + onLeave + "</td></tr>";
  }
  document.getElementById("departmentSummary").innerHTML =
    '<div class="table-wrap"><table><thead><tr><th>Department</th><th class="num">Employees</th><th class="num">Present</th><th class="num">On leave</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}

function renderAnnouncements() {
  const list = getAnnouncements();
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const box = document.getElementById("announcementList");
  if (list.length === 0) {
    box.innerHTML = emptyState("megaphone", "No announcements yet", "Post one above and every employee will see it.");
    return;
  }
  let html = "";
  for (let i = 0; i < list.length; i++) {
    html +=
      '<article class="announce"><header><strong>' + escapeHtml(list[i].title) + "</strong><small>" + formatDisplayDate(list[i].createdAt.slice(0, 10)) + "</small></header>" +
      "<p>" + escapeHtml(list[i].message) + '</p><button type="button" class="btn btn-ghost btn-small delete-announcement" data-id="' + escapeHtml(list[i].id) + '" style="margin-top:8px">' + icon("trash") + "Delete</button></article>";
  }
  box.innerHTML = html;
  const buttons = box.getElementsByClassName("delete-announcement");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].onclick = () => {
      const id = buttons[i].dataset.id;
      confirmDialog("Delete announcement?", "Employees will no longer see it.", "Delete", () => {
        removeById(KEYS.announcements, id);
        renderAnnouncements();
        showToast("Announcement deleted.");
      });
    };
  }
}

function setupAnnouncementForm() {
  document.getElementById("announcementForm").onsubmit = (event) => {
    event.preventDefault();
    clearFormErrors("announcementForm");
    const title = document.getElementById("annTitle").value.trim();
    const message = document.getElementById("annMessage").value.trim();
    const errors = {};
    if (title === "") {
      errors.title = "Enter a title.";
    }
    if (message === "") {
      errors.message = "Write the announcement message.";
    }
    if (Object.keys(errors).length > 0) {
      showFormErrors("ann", errors);
      return;
    }
    upsertRecord(KEYS.announcements, {
      id: newId("ann"),
      title: title,
      message: message,
      authorId: adminUser.id,
      createdAt: new Date().toISOString()
    });
    event.target.reset();
    renderAnnouncements();
    showToast("Announcement posted.");
  };
}

if (adminUser) {
  buildLayout(adminUser, "admin", "Dashboard");
  renderStats();
  renderRecentAttendance();
  renderPendingLeaves();
  renderDepartmentSummary();
  renderAnnouncements();
  setupAnnouncementForm();
  setupChatBox("admin", adminUser);
}
