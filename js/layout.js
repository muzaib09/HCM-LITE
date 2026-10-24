// js/layout.js
// Builds the shared sidebar + top bar on every logged-in page, and the confirm dialog.

const ADMIN_LINKS = [
  { page: "admin", href: "admin.html", label: "Dashboard", icon: "dashboard" },
  { page: "employees", href: "employees.html", label: "Employees", icon: "users" },
  { page: "leaves", href: "leaves.html", label: "Leave requests", icon: "calendar" },
  { page: "payslip", href: "payslip.html", label: "Payslips", icon: "file" },
  { page: "settings", href: "settings.html", label: "Settings", icon: "settings" }
];

const EMPLOYEE_LINKS = [
  { page: "employee", href: "employee.html", label: "My dashboard", icon: "dashboard" },
  { page: "leaves", href: "leaves.html", label: "My leave", icon: "calendar" },
  { page: "payslip", href: "payslip.html", label: "My payslip", icon: "file" }
];

function openMobileMenu() {
  document.body.classList.add("nav-open");
  const button = document.getElementById("menuBtn");
  if (button) {
    button.setAttribute("aria-expanded", "true");
  }
}

function closeMobileMenu() {
  document.body.classList.remove("nav-open");
  const button = document.getElementById("menuBtn");
  if (button) {
    button.setAttribute("aria-expanded", "false");
  }
}

// activePage matches the "page" value in the link lists above.
function buildLayout(user, activePage, pageTitle) {
  const company = getCompany();
  const links = user.role === "admin" ? ADMIN_LINKS : EMPLOYEE_LINKS;

  let linksHtml = "";
  for (let i = 0; i < links.length; i++) {
    const isActive = links[i].page === activePage;
    linksHtml +=
      '<a class="nav-link' + (isActive ? " active" : "") + '" href="' + links[i].href + '"' +
      (isActive ? ' aria-current="page"' : "") + ">" + icon(links[i].icon) + "<span>" + links[i].label + "</span></a>";
  }

  document.getElementById("sidebar").innerHTML =
    '<div class="brand"><span class="brand-mark">' + icon("building") + "</span>" +
    "<div><strong>HCM Lite</strong><small>" + escapeHtml(company.name) + "</small></div></div>" +
    '<nav class="nav" aria-label="Main navigation">' + linksHtml + "</nav>" +
    '<div class="sidebar-foot">' +
    '<div class="user-chip"><span class="avatar">' + escapeHtml(getInitials(user.name)) + "</span>" +
    "<div><strong>" + escapeHtml(user.name) + "</strong><small>" + (user.role === "admin" ? "Administrator" : escapeHtml(user.department)) + "</small></div></div>" +
    '<button type="button" class="nav-link logout-btn" id="logoutBtn">' + icon("logout") + "<span>Log out</span></button></div>";

  document.getElementById("topbar").innerHTML =
    '<button type="button" class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="sidebar">' + icon("menu") + "</button>" +
    "<h1>" + escapeHtml(pageTitle) + "</h1>" +
    '<div class="topbar-right"><button type="button" class="icon-btn" id="themeToggle"></button></div>';

  document.getElementById("logoutBtn").onclick = () => {
    logoutUser();
  };
  document.getElementById("menuBtn").onclick = () => {
    openMobileMenu();
  };
  document.getElementById("overlay").onclick = () => {
    closeMobileMenu();
  };
  document.onkeydown = (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  };
  setupThemeButton("themeToggle");
  document.title = pageTitle + " | HCM Lite";
}

// A simple "Are you sure?" popup (replaces the browser's confirm box).
function confirmDialog(title, message, confirmLabel, onConfirm) {
  let dialog = document.getElementById("confirmDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "confirmDialog";
    dialog.className = "dialog dialog-small";
    document.body.appendChild(dialog);
  }
  dialog.innerHTML =
    '<div class="dialog-body"><h2>' + escapeHtml(title) + "</h2><p>" + escapeHtml(message) + "</p></div>" +
    '<div class="dialog-actions"><button type="button" class="btn btn-ghost" id="confirmCancel">Cancel</button>' +
    '<button type="button" class="btn btn-danger" id="confirmOk">' + escapeHtml(confirmLabel) + "</button></div>";
  document.getElementById("confirmCancel").onclick = () => {
    dialog.close();
  };
  document.getElementById("confirmOk").onclick = () => {
    dialog.close();
    onConfirm();
  };
  dialog.showModal();
}

// Lets the little X / Cancel buttons and a click on the dark backdrop close a <dialog>.
function setupDialogClose(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (!dialog) {
    return;
  }
  const closers = dialog.getElementsByClassName("dialog-close");
  for (let i = 0; i < closers.length; i++) {
    closers[i].onclick = () => {
      dialog.close();
    };
  }
  dialog.onclick = (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  };
}
