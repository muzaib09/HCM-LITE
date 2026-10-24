// js/auth.js
// Setup, login, logout, password hashing and page protection.
//
// IMPORTANT - READ THIS:
// This is a frontend-only learning project. Everything lives in the browser's localStorage,
// which anyone using this browser (or anyone who can open DevTools) can read and edit.
// Passwords are never stored as plain text: we store a salted SHA-256 hash.
// That is better than plain text, but it is NOT secure authentication:
//   - a user can edit hcm_users or hcm_session in DevTools and make themselves an admin
//   - one fast SHA-256 round is not a proper password hashing method (real apps use bcrypt/argon2 on a server)
// Do not use this app for real, sensitive HR data.

const PASSWORD_HINT = "Use at least 8 characters with at least one letter and one number.";

// ---------- Hashing ----------
function makeSalt() {
  const bytes = new Uint8Array(16);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let salt = "";
  for (let i = 0; i < bytes.length; i++) {
    salt += bytes[i].toString(16).padStart(2, "0");
  }
  return salt;
}

// Tiny fallback hash, only used if the browser has no crypto.subtle. Not secure at all.
function simpleHash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

// "async" functions can use "await" to wait for the browser's crypto to finish.
async function hashWithMethod(method, text) {
  if (method === "sha256" && window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(text);
    const buffer = await window.crypto.subtle.digest("SHA-256", bytes);
    const array = new Uint8Array(buffer);
    let hex = "";
    for (let i = 0; i < array.length; i++) {
      hex += array[i].toString(16).padStart(2, "0");
    }
    return "sha256:" + hex;
  }
  return "basic:" + simpleHash(text);
}

async function hashPassword(password, salt) {
  const method = window.crypto && window.crypto.subtle ? "sha256" : "basic";
  return hashWithMethod(method, salt + ":" + password);
}

async function passwordMatches(user, password) {
  if (!user.passwordHash || !user.salt) {
    return false;
  }
  const method = user.passwordHash.split(":")[0]; // use the same method that created the hash
  const hash = await hashWithMethod(method, user.salt + ":" + password);
  return hash === user.passwordHash;
}

// ---------- Validation ----------
function isEmailFormatValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Returns "" when the password is fine, otherwise a message.
function getPasswordProblem(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password needs at least one letter and one number.";
  }
  return "";
}

function findUserByEmail(email) {
  const wanted = email.trim().toLowerCase();
  const users = getUsers();
  for (let i = 0; i < users.length; i++) {
    if (users[i].email === wanted) {
      return users[i];
    }
  }
  return null;
}

// ---------- First-run setup ----------
function isSetupComplete() {
  if (getCompany() === null) {
    return false;
  }
  const users = getUsers();
  for (let i = 0; i < users.length; i++) {
    if (users[i].role === "admin") {
      return true;
    }
  }
  return false;
}

async function setupCompany(data) {
  const errors = {};
  const companyName = data.companyName.trim();
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();

  if (isSetupComplete()) {
    return { ok: false, errors: { form: "Setup is already finished. Please log in." } };
  }
  if (companyName === "") {
    errors.companyName = "Enter your company name.";
  }
  if (name === "") {
    errors.name = "Enter the admin's name.";
  }
  if (email === "") {
    errors.email = "Enter an email address.";
  } else if (!isEmailFormatValid(email)) {
    errors.email = "Enter a valid email, like name@company.com.";
  }
  const passwordProblem = getPasswordProblem(data.password);
  if (passwordProblem !== "") {
    errors.password = passwordProblem;
  }
  if (data.confirm !== data.password) {
    errors.confirm = "Passwords do not match.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors };
  }

  const salt = makeSalt();
  const admin = {
    id: newId("usr"),
    name: name,
    email: email,
    role: "admin",
    department: "Administration",
    designation: "Administrator",
    salary: 0,
    joinDate: todayString(),
    salt: salt,
    passwordHash: await hashPassword(data.password, salt),
    createdAt: new Date().toISOString()
  };
  const company = {
    name: companyName,
    officeStart: DEFAULT_COMPANY_SETTINGS.officeStart,
    graceMinutes: DEFAULT_COMPANY_SETTINGS.graceMinutes,
    yearlyLeaveQuota: DEFAULT_COMPANY_SETTINGS.yearlyLeaveQuota,
    weekendDays: DEFAULT_COMPANY_SETTINGS.weekendDays.slice(),
    createdAt: new Date().toISOString()
  };
  const savedCompany = saveCompany(company);
  const savedUser = upsertRecord(KEYS.users, admin);
  if (!savedCompany || !savedUser) {
    return { ok: false, errors: { form: "Could not save to this browser. Check that storage is allowed." } };
  }
  setSessionUserId(admin.id);
  return { ok: true, user: admin };
}

// ---------- Login / logout ----------
async function loginUser(email, password) {
  const errors = {};
  if (email.trim() === "") {
    errors.email = "Enter your email.";
  }
  if (password === "") {
    errors.password = "Enter your password.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors };
  }
  const user = findUserByEmail(email);
  // Same message for "no such user" and "wrong password" so we do not reveal which emails exist.
  if (user === null || !(await passwordMatches(user, password))) {
    return { ok: false, errors: { form: "Email or password is not correct." } };
  }
  setSessionUserId(user.id);
  return { ok: true, user: user };
}

function logoutUser() {
  clearSession();
  window.location.href = "index.html";
}

function getCurrentUser() {
  const id = getSessionUserId();
  if (!id) {
    return null;
  }
  const users = getUsers();
  for (let i = 0; i < users.length; i++) {
    if (users[i].id === id) {
      return users[i];
    }
  }
  clearSession(); // session points to a user that no longer exists
  return null;
}

function getHomePage(user) {
  return user.role === "admin" ? "admin.html" : "employee.html";
}

// Call this first on every protected page.
// Logged-out users go to index.html. Users with the wrong role go to their own dashboard.
// The page stays hidden (body.auth-pending) until the check passes.
function requireRole(allowedRoles) {
  const user = getCurrentUser();
  if (user === null || getCompany() === null) {
    window.location.replace("index.html");
    return null;
  }
  if (!allowedRoles.includes(user.role)) {
    window.location.replace(getHomePage(user));
    return null;
  }
  document.body.classList.remove("auth-pending");
  return user;
}

// ---------- Change password ----------
async function changePassword(userId, current, newPassword, confirm) {
  const errors = {};
  const users = getUsers();
  let user = null;
  for (let i = 0; i < users.length; i++) {
    if (users[i].id === userId) {
      user = users[i];
    }
  }
  if (user === null) {
    return { ok: false, errors: { form: "Account not found." } };
  }
  if (current === "") {
    errors.current = "Enter your current password.";
  } else if (!(await passwordMatches(user, current))) {
    errors.current = "Current password is not correct.";
  }
  const problem = getPasswordProblem(newPassword);
  if (problem !== "") {
    errors.new = problem;
  } else if (newPassword === current) {
    errors.new = "Choose a password different from the current one.";
  }
  if (confirm !== newPassword) {
    errors.confirm = "Passwords do not match.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors };
  }
  user.salt = makeSalt();
  user.passwordHash = await hashPassword(newPassword, user.salt);
  upsertRecord(KEYS.users, user);
  return { ok: true };
}

// Connects the "Change password" card (same ids on the admin and employee pages).
function setupChangePasswordForm(userId) {
  const form = document.getElementById("changePasswordForm");
  if (!form) {
    return;
  }
  form.onsubmit = async (event) => {
    event.preventDefault();
    clearFormErrors("changePasswordForm");
    const result = await changePassword(
      userId,
      document.getElementById("pwCurrent").value,
      document.getElementById("pwNew").value,
      document.getElementById("pwConfirm").value
    );
    if (!result.ok) {
      showFormErrors("pw", result.errors);
      return;
    }
    form.reset();
    showToast("Password updated.");
  };
}
