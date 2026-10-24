// js/pages/index.js - first-run setup and login page

document.getElementById("brandMark").innerHTML = icon("building");
document.getElementById("pointIcon1").innerHTML = icon("clock");
document.getElementById("pointIcon2").innerHTML = icon("calendar");
document.getElementById("pointIcon3").innerHTML = icon("file");
setupThemeButton("themeToggle");

// Already logged in? Go straight to the right dashboard.
const alreadyLoggedIn = getCurrentUser();
if (alreadyLoggedIn !== null && getCompany() !== null) {
  window.location.replace(getHomePage(alreadyLoggedIn));
} else if (isSetupComplete()) {
  document.getElementById("loginCard").hidden = false;
  document.getElementById("loginSubtitle").textContent = "Log in to " + getCompany().name + ".";
} else {
  document.getElementById("setupCard").hidden = false;
}

document.getElementById("setupForm").onsubmit = async (event) => {
  event.preventDefault();
  clearFormErrors("setupForm");
  const button = document.getElementById("setupBtn");
  button.disabled = true;
  const result = await setupCompany({
    companyName: document.getElementById("setupCompanyName").value,
    name: document.getElementById("setupName").value,
    email: document.getElementById("setupEmail").value,
    password: document.getElementById("setupPassword").value,
    confirm: document.getElementById("setupConfirm").value
  });
  button.disabled = false;
  if (!result.ok) {
    showFormErrors("setup", result.errors);
    return;
  }
  window.location.href = "admin.html";
};

document.getElementById("loginForm").onsubmit = async (event) => {
  event.preventDefault();
  clearFormErrors("loginForm");
  const button = document.getElementById("loginBtn");
  button.disabled = true;
  const result = await loginUser(
    document.getElementById("loginEmail").value,
    document.getElementById("loginPassword").value
  );
  button.disabled = false;
  if (!result.ok) {
    showFormErrors("login", result.errors);
    return;
  }
  window.location.href = getHomePage(result.user);
};
