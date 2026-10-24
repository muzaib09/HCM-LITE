// js/theme.js
// Loaded in the <head> of every page so the right theme is applied BEFORE the page paints
// (this avoids a white flash when the saved theme is dark).

const THEME_KEY = "hcm_theme";

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

// Saved choice wins. If there is none, follow the system preference.
function getStartingTheme() {
  const saved = getSavedTheme();
  if (saved === "dark" || saved === "light") {
    return saved;
  }
  const systemIsDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemIsDark ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) {
    console.error("Could not save theme", error);
  }
  applyTheme(next);
  return next;
}

// Shows a sun or moon icon inside the button and makes it work.
// icon() comes from helper.js, which is loaded later (it is only called after the page loads).
function setupThemeButton(buttonId) {
  const button = document.getElementById(buttonId);
  if (!button) {
    return;
  }
  const refreshButton = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    button.innerHTML = icon(isDark ? "sun" : "moon");
    button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    button.title = isDark ? "Switch to light theme" : "Switch to dark theme";
  };
  button.onclick = () => {
    toggleTheme();
    refreshButton();
  };
  refreshButton();
}

applyTheme(getStartingTheme());
