// js/helper.js
// Small reusable helpers: safe text, icons, dates, money, toasts and form errors.

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ---------- Safe text ----------
// Always use this before putting user-typed text inside innerHTML.
function escapeHtml(value) {
  const text = String(value === undefined || value === null ? "" : value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getInitials(name) {
  const parts = String(name).trim().split(" ");
  let initials = parts[0].charAt(0);
  if (parts.length > 1) {
    initials += parts[parts.length - 1].charAt(0);
  }
  return initials.toUpperCase();
}

function round2(number) {
  return Math.round(number * 100) / 100;
}

// ---------- Icons (inline SVG, Lucide style) ----------
const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'
};

function icon(name) {
  const paths = ICON_PATHS[name] || "";
  return '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
}

// ---------- Dates (we store dates as "YYYY-MM-DD" text) ----------
function padTwo(number) {
  return number < 10 ? "0" + number : String(number);
}

function formatDateString(date) {
  return date.getFullYear() + "-" + padTwo(date.getMonth() + 1) + "-" + padTwo(date.getDate());
}

function todayString() {
  return formatDateString(new Date());
}

// "2026-10-24" -> a Date at local midnight (avoids timezone surprises of new Date("2026-10-24"))
function parseDateString(text) {
  const parts = text.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function isValidDateString(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  // Round trip catches impossible dates like 2026-02-31
  return formatDateString(parseDateString(text)) === text;
}

function addDays(text, amount) {
  const date = parseDateString(text);
  date.setDate(date.getDate() + amount);
  return formatDateString(date);
}

// Monday of the week that contains the given date
function getWeekStart(text) {
  const dayOfWeek = parseDateString(text).getDay(); // 0 = Sunday
  const stepsBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return addDays(text, -stepsBack);
}

// All dates of a month. month is 1-12.
function getMonthDates(year, month) {
  const dates = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    dates.push(year + "-" + padTwo(month) + "-" + padTwo(day));
  }
  return dates;
}

function isWorkingDay(text, company) {
  const dayOfWeek = parseDateString(text).getDay();
  for (let i = 0; i < company.weekendDays.length; i++) {
    if (Number(company.weekendDays[i]) === dayOfWeek) {
      return false;
    }
  }
  return true;
}

// Counts working days from start to end (both included), skipping weekends.
function countWorkingDays(startText, endText, company) {
  let count = 0;
  let current = startText;
  while (current <= endText) {
    if (isWorkingDay(current, company)) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

function formatDisplayDate(text) {
  if (!isValidDateString(text)) {
    return text || "-";
  }
  const date = parseDateString(text);
  return date.getDate() + " " + MONTH_NAMES[date.getMonth()].slice(0, 3) + " " + date.getFullYear();
}

function formatLongDate(text) {
  const date = parseDateString(text);
  return DAY_NAMES[date.getDay()] + ", " + date.getDate() + " " + MONTH_NAMES[date.getMonth()] + " " + date.getFullYear();
}

// ---------- Times ----------
function nowTimeString(date) {
  const now = date || new Date();
  return padTwo(now.getHours()) + ":" + padTwo(now.getMinutes());
}

function timeToMinutes(text) {
  const parts = text.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function formatTime(text) {
  if (!text) {
    return "-";
  }
  const parts = text.split(":");
  let hour = Number(parts[0]);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 === 0 ? 12 : hour % 12;
  return hour + ":" + parts[1] + " " + suffix;
}

// 7.5 -> "7h 30m"
function formatHours(hours) {
  const totalMinutes = Math.round(Number(hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h + "h " + padTwo(m) + "m";
}

function formatMoney(amount) {
  return "Rs " + Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Badges and empty states ----------
const BADGE_CLASSES = {
  "Present": "good",
  "Late": "warn",
  "Half Day": "warn",
  "Incomplete": "neutral",
  "Absent": "bad",
  "Not checked in": "bad",
  "On Leave": "info",
  "Approved": "good",
  "Rejected": "bad",
  "Pending": "warn"
};

function statusBadge(status) {
  const kind = BADGE_CLASSES[status] || "neutral";
  return '<span class="badge badge-' + kind + '">' + escapeHtml(status) + "</span>";
}

function emptyState(iconName, title, text) {
  return '<div class="empty">' + icon(iconName) + "<strong>" + escapeHtml(title) + "</strong><p>" + escapeHtml(text) + "</p></div>";
}

// ---------- Toasts ----------
function showToast(message, type) {
  const kind = type || "success";
  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = "toast toast-" + kind;
  toast.innerHTML = icon(kind === "error" ? "alert" : "success") + "<span></span>";
  toast.getElementsByTagName("span")[0].textContent = message; // textContent = safe
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3800);
}

// ---------- Form errors ----------
// Each input has an error box with the id: inputId + "Error"
function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorBox = document.getElementById(inputId + "Error");
  if (input) {
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", inputId + "Error");
  }
  if (errorBox) {
    errorBox.textContent = message;
  }
  return Boolean(input || errorBox);
}

function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) {
    return;
  }
  const boxes = form.getElementsByClassName("field-error");
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].textContent = "";
  }
  const badInputs = form.querySelectorAll(".invalid");
  for (let i = 0; i < badInputs.length; i++) {
    badInputs[i].classList.remove("invalid");
    badInputs[i].removeAttribute("aria-invalid");
  }
}

// errors looks like { email: "Email is required." }
// With prefix "setup", the key "email" is shown next to the input with id "setupEmail".
// The key "form" (or any key without an input) is shown as a toast.
function showFormErrors(prefix, errors) {
  let toastMessage = "";
  let firstInputId = "";
  for (const key in errors) {
    const inputId = prefix + capitalize(key);
    const shown = key === "form" ? false : setFieldError(inputId, errors[key]);
    if (!shown) {
      toastMessage = errors[key];
    } else if (firstInputId === "") {
      firstInputId = inputId;
    }
  }
  if (toastMessage !== "") {
    showToast(toastMessage, "error");
  }
  const firstInput = document.getElementById(firstInputId);
  if (firstInput) {
    firstInput.focus();
  }
}
