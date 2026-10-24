// js/pages/settings-page.js - admin: company settings

const adminUser = requireRole(["admin"]);

function buildWeekendChecks(company) {
  let html = "";
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const checked = company.weekendDays.includes(i) ? " checked" : "";
    html += '<label class="check"><input type="checkbox" id="wd' + i + '" value="' + i + '"' + checked + ">" + DAY_NAMES[i] + "</label>";
  }
  document.getElementById("weekendChecks").innerHTML = html;
}

function loadSettingsForm() {
  const company = getCompany();
  document.getElementById("setCompanyName").value = company.name;
  document.getElementById("setOfficeStart").value = company.officeStart;
  document.getElementById("setGraceMinutes").value = company.graceMinutes;
  document.getElementById("setLeaveQuota").value = company.yearlyLeaveQuota;
  buildWeekendChecks(company);
}

function saveSettings(event) {
  event.preventDefault();
  clearFormErrors("settingsForm");
  const errors = {};
  const name = document.getElementById("setCompanyName").value.trim();
  const officeStart = document.getElementById("setOfficeStart").value;
  const graceText = document.getElementById("setGraceMinutes").value.trim();
  const quotaText = document.getElementById("setLeaveQuota").value.trim();
  const weekendDays = [];
  for (let i = 0; i < 7; i++) {
    if (document.getElementById("wd" + i).checked) {
      weekendDays.push(i);
    }
  }

  if (name === "") {
    errors.companyName = "Enter the company name.";
  }
  if (!/^\d{2}:\d{2}$/.test(officeStart)) {
    errors.officeStart = "Choose the office start time.";
  }
  const grace = Number(graceText);
  if (graceText === "" || !Number.isInteger(grace) || grace < 0 || grace > 180) {
    errors.graceMinutes = "Enter whole minutes from 0 to 180.";
  }
  const quota = Number(quotaText);
  if (quotaText === "" || !Number.isInteger(quota) || quota < 1 || quota > 365) {
    errors.leaveQuota = "Enter a whole number of days from 1 to 365.";
  }
  if (weekendDays.length >= 7) {
    errors.weekendDays = "Keep at least one working day.";
  }
  if (Object.keys(errors).length > 0) {
    showFormErrors("set", errors);
    return;
  }

  const company = getCompany();
  company.name = name;
  company.officeStart = officeStart;
  company.graceMinutes = grace;
  company.yearlyLeaveQuota = quota;
  company.weekendDays = weekendDays;
  if (!saveCompany(company)) {
    showToast("Could not save settings in this browser.", "error");
    return;
  }
  buildLayout(adminUser, "settings", "Settings"); // refresh the company name in the sidebar
  showToast("Settings saved. They apply to new activity from now on.");
}

if (adminUser) {
  buildLayout(adminUser, "settings", "Settings");
  loadSettingsForm();
  document.getElementById("settingsForm").onsubmit = saveSettings;
  setupChangePasswordForm(adminUser.id);
}
