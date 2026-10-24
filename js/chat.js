// js/chat.js
// "HCM Helper": a small question-and-answer box.
// It does NOT use AI. It lowercases the question, looks for keywords with includes(),
// and builds the answer from the real data saved in localStorage.
// Employees can only ever get answers about themselves.

// Turns "Who's late today?" into ["who", "s", "late", "today"]
function getWords(question) {
  const cleaned = question.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  const parts = cleaned.split(" ");
  const words = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] !== "") {
      words.push(parts[i]);
    }
  }
  return words;
}

// True if the question contains at least one of the keywords as a whole word.
function hasAny(words, keywords) {
  for (let i = 0; i < keywords.length; i++) {
    if (words.includes(keywords[i])) {
      return true;
    }
  }
  return false;
}

function listNames(people) {
  const names = [];
  for (let i = 0; i < people.length; i++) {
    names.push(people[i].name);
  }
  return names.join(", ");
}

function answerWithPeople(sentenceForCount, people, emptyText) {
  if (people.length === 0) {
    return emptyText;
  }
  return sentenceForCount + "\n" + listNames(people);
}

// ---------- Admin ----------
function answerAdminQuestion(question) {
  const words = getWords(question);
  const summary = getTodaySummary();
  const employees = getEmployees();

  if (employees.length === 0 && !hasAny(words, ["hello", "hi", "hey", "help"])) {
    return "There are no employees yet. Add your first employee from the Employees page and I can answer questions about them.";
  }
  if (hasAny(words, ["hello", "hi", "hey", "help"])) {
    return "Hi! Ask me things like: How many employees do we have? Who is on leave today? Who was late today?";
  }
  if (hasAny(words, ["pending"])) {
    const count = countLeavesByStatus("Pending");
    return count === 0 ? "No leave requests are waiting for review." : count + " leave request(s) are waiting for review on the Leave page.";
  }
  if (hasAny(words, ["late", "lates"])) {
    return answerWithPeople(summary.late.length + " employee(s) checked in late today:", summary.late, "Nobody has checked in late today.");
  }
  if (hasAny(words, ["absent", "absentees", "missing"])) {
    if (!summary.isWorkingDay) {
      return "Today is a day off, so nobody is counted as absent.";
    }
    return answerWithPeople(summary.absent.length + " employee(s) have not checked in yet today:", summary.absent, "Everyone has checked in or is on leave today.");
  }
  if (hasAny(words, ["leave", "leaves", "vacation", "off"])) {
    return answerWithPeople(summary.onLeave.length + " employee(s) are on approved leave today:", summary.onLeave, "Nobody is on approved leave today.");
  }
  if (hasAny(words, ["present", "attendance", "checked", "working"])) {
    if (!summary.isWorkingDay) {
      return "Today is a day off. " + summary.present.length + " employee(s) have checked in anyway.";
    }
    return summary.present.length + " of " + summary.totalEmployees + " employee(s) have checked in today. " + summary.stillWorking.length + " still working.";
  }
  if (hasAny(words, ["department", "departments"])) {
    const departments = getDepartments();
    if (departments.length === 0) {
      return "No departments yet.";
    }
    const lines = [];
    for (let i = 0; i < departments.length; i++) {
      let count = 0;
      for (let j = 0; j < employees.length; j++) {
        if (employees[j].department === departments[i]) {
          count++;
        }
      }
      lines.push(departments[i] + ": " + count);
    }
    return "Employees per department:\n" + lines.join("\n");
  }
  if (hasAny(words, ["announcement", "announcements"])) {
    return "There are " + getAnnouncements().length + " announcement(s) posted.";
  }
  if (hasAny(words, ["employee", "employees", "staff", "headcount", "team", "people"])) {
    return "You have " + employees.length + " employee(s) across " + getDepartments().length + " department(s).";
  }
  return "Sorry, I can't answer that yet. Try: How many employees do we have? Who is on leave today? Who was late today? How many leave requests are pending?";
}

// ---------- Employee (only their own data) ----------
function questionMentionsSomeoneElse(question, user) {
  const text = question.toLowerCase();
  const words = getWords(question);
  if (hasAny(words, ["everyone", "everybody", "colleague", "colleagues", "coworker", "others", "company", "employees"])) {
    return true;
  }
  const employees = getEmployees();
  for (let i = 0; i < employees.length; i++) {
    if (employees[i].id === user.id) {
      continue;
    }
    const fullName = employees[i].name.toLowerCase();
    const firstName = fullName.split(" ")[0];
    if (text.includes(fullName) || (firstName.length >= 3 && words.includes(firstName))) {
      return true;
    }
  }
  return false;
}

function answerEmployeeQuestion(question, user) {
  const words = getWords(question);
  const company = getCompany();

  if (questionMentionsSomeoneElse(question, user)) {
    return "I can only answer questions about your own attendance and leave.";
  }
  if (hasAny(words, ["hello", "hi", "hey", "help"])) {
    return "Hi " + user.name.split(" ")[0] + "! Ask me: How many leave days do I have left? Was I late today? How many hours did I work this week?";
  }
  if (hasAny(words, ["leave", "leaves", "balance"]) && hasAny(words, ["pending"])) {
    const pending = getLeaveUsage(user.id, new Date().getFullYear()).pending;
    return pending === 0 ? "You have no pending leave days." : "You have " + pending + " leave day(s) waiting for approval.";
  }
  if (hasAny(words, ["leave", "leaves", "balance", "days"]) && hasAny(words, ["left", "remain", "remaining", "balance", "many", "much", "have"])) {
    const usage = getLeaveUsage(user.id, new Date().getFullYear());
    return "You have " + usage.remaining + " leave day(s) remaining in " + usage.year + " (quota " + usage.quota + ", approved " + usage.approved + ", pending " + usage.pending + ").";
  }
  if (hasAny(words, ["late"])) {
    const record = getTodayRecord(user.id);
    if (record === null) {
      return "You haven't checked in today yet, so you're not marked late.";
    }
    const cutoff = timeToMinutes(company.officeStart) + Number(company.graceMinutes);
    const cutoffText = formatTime(padTwo(Math.floor(cutoff / 60)) + ":" + padTwo(cutoff % 60));
    return record.late
      ? "Yes. You checked in at " + formatTime(record.checkIn) + ", after the " + cutoffText + " cutoff."
      : "No. You checked in at " + formatTime(record.checkIn) + ", on time (cutoff " + cutoffText + ").";
  }
  if (hasAny(words, ["hours", "hour", "worked", "week"])) {
    return "You have worked " + formatHours(getWeekHours(user.id)) + " this week (completed days since Monday).";
  }
  if (hasAny(words, ["today", "checked", "status", "attendance"])) {
    const record = getTodayRecord(user.id);
    if (record === null) {
      return "You haven't checked in today.";
    }
    return record.checkOut
      ? "You checked in at " + formatTime(record.checkIn) + " and out at " + formatTime(record.checkOut) + " (" + record.status + ")."
      : "You checked in at " + formatTime(record.checkIn) + " and haven't checked out yet.";
  }
  if (hasAny(words, ["announcement", "announcements", "news"])) {
    const list = getAnnouncements();
    return list.length === 0 ? "There are no announcements right now." : "There are " + list.length + " announcement(s). Check the Announcements card on your dashboard.";
  }
  return "Sorry, I can't answer that yet. Try: How many leave days do I have left? Was I late today? How many hours did I work this week?";
}

// ---------- The chat box on the page ----------
function addChatMessage(text, who) {
  const box = document.getElementById("chatMessages");
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble chat-" + who;
  bubble.textContent = text; // textContent keeps typed text safe
  box.appendChild(bubble);
  box.scrollTop = box.scrollHeight;
}

// role: "admin" or "employee". user: the logged-in user.
function setupChatBox(role, user) {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const chips = document.getElementById("chatChips");
  if (!form || !input) {
    return;
  }
  const suggestions = role === "admin"
    ? ["How many employees do we have?", "Who is on leave today?", "Who was late today?", "How many requests are pending?"]
    : ["How many leave days do I have left?", "Was I late today?", "How many hours did I work this week?"];

  const ask = (question) => {
    const clean = question.trim();
    if (clean === "") {
      return;
    }
    addChatMessage(clean, "user");
    // Read the user again so answers always use the latest saved data
    const answer = role === "admin" ? answerAdminQuestion(clean) : answerEmployeeQuestion(clean, user);
    addChatMessage(answer, "bot");
  };

  addChatMessage(role === "admin" ? "Hi! Ask me about your team's attendance and leave." : "Hi! Ask me about your own attendance and leave balance.", "bot");

  if (chips) {
    chips.innerHTML = "";
    for (let i = 0; i < suggestions.length; i++) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = suggestions[i];
      chip.onclick = () => ask(suggestions[i]);
      chips.appendChild(chip);
    }
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    ask(input.value);
    input.value = "";
    input.focus();
  };
}
