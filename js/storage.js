// js/storage.js
// Every read/write of localStorage goes through this file.
// Records are stored as JSON. When we save ONE record we re-read the latest list first,
// so we never overwrite other records by accident.

const KEYS = {
  company: "hcm_company",
  users: "hcm_users",
  attendance: "hcm_attendance",
  leaves: "hcm_leaves",
  session: "hcm_session",
  announcements: "hcm_announcements"
};

// Used to fill in anything missing from the saved company settings.
const DEFAULT_COMPANY_SETTINGS = {
  name: "",
  officeStart: "09:00",
  graceMinutes: 15,
  yearlyLeaveQuota: 20,
  weekendDays: [0, 6] // 0 = Sunday ... 6 = Saturday
};

// Read JSON safely. Missing or broken data returns the fallback instead of crashing.
function readJson(key, fallback) {
  let text = null;
  try {
    text = localStorage.getItem(key);
  } catch (error) {
    return fallback;
  }
  if (text === null) {
    return fallback;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Could not save " + key, error);
    return false;
  }
}

// Reads a list (array). Anything that is not an array becomes an empty list.
function readList(key) {
  const data = readJson(key, []);
  return Array.isArray(data) ? data : [];
}

// ---------- Company ----------
function getCompany() {
  const saved = readJson(KEYS.company, null);
  if (saved === null || typeof saved !== "object" || Array.isArray(saved)) {
    return null;
  }
  const company = {};
  for (const key in DEFAULT_COMPANY_SETTINGS) {
    company[key] = saved[key] !== undefined ? saved[key] : DEFAULT_COMPANY_SETTINGS[key];
  }
  if (!Array.isArray(company.weekendDays)) {
    company.weekendDays = [0, 6];
  }
  company.createdAt = saved.createdAt || "";
  return company;
}

function saveCompany(company) {
  return writeJson(KEYS.company, company);
}

// ---------- Lists ----------
function getUsers() {
  return readList(KEYS.users);
}

function getAttendanceList() {
  return readList(KEYS.attendance);
}

function getLeaves() {
  return readList(KEYS.leaves);
}

function getAnnouncements() {
  return readList(KEYS.announcements);
}

// Add a record, or replace the record that has the same id.
function upsertRecord(key, record) {
  const list = readList(key);
  let found = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === record.id) {
      list[i] = record;
      found = true;
      break;
    }
  }
  if (!found) {
    list.push(record);
  }
  return writeJson(key, list);
}

function removeById(key, id) {
  const list = readList(key);
  const kept = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].id !== id) {
      kept.push(list[i]);
    }
  }
  return writeJson(key, kept);
}

// ---------- Session (stores only the logged-in user's id) ----------
function getSessionUserId() {
  try {
    return localStorage.getItem(KEYS.session);
  } catch (error) {
    return null;
  }
}

function setSessionUserId(userId) {
  try {
    localStorage.setItem(KEYS.session, userId);
  } catch (error) {
    console.error("Could not save session", error);
  }
}

function clearSession() {
  try {
    localStorage.removeItem(KEYS.session);
  } catch (error) {
    console.error("Could not clear session", error);
  }
}

// Creates ids like "att_lq3k9x2abc"
function newId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
