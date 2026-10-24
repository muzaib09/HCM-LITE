// js/leave.js
// Leave rules (the same rules are used on every page):
//  - Only WORKING days count (company weekend days are skipped).
//  - The quota year is the calendar year of the START date. A request must start and end in the same year.
//  - Pending + Approved requests both count when checking a NEW request against the yearly quota,
//    so nobody can request more than the quota.
//  - The balance shown to people ("remaining") counts APPROVED days only.
//  - Days are calculated once when the request is made and saved in the record,
//    so changing settings later does not rewrite old requests.
//  - Approved leave is paid: it is not an absence and does not reduce salary.

const LEAVE_TYPES = ["Annual", "Sick", "Casual", "Emergency"];

function getUserLeaves(userId) {
  const leaves = getLeaves();
  const mine = [];
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].userId === userId) {
      mine.push(leaves[i]);
    }
  }
  return mine;
}

function getLeaveUsage(userId, year) {
  const company = getCompany();
  const leaves = getUserLeaves(userId);
  let approved = 0;
  let pending = 0;
  for (let i = 0; i < leaves.length; i++) {
    if (Number(leaves[i].startDate.slice(0, 4)) !== year) {
      continue;
    }
    if (leaves[i].status === "Approved") {
      approved += leaves[i].days;
    } else if (leaves[i].status === "Pending") {
      pending += leaves[i].days;
    }
  }
  const quota = Number(company.yearlyLeaveQuota);
  return {
    year: year,
    quota: quota,
    approved: approved,
    pending: pending,
    remaining: quota - approved,
    available: quota - approved - pending
  };
}

// Finds a Pending/Approved request of this user that shares any date with start..end.
function findLeaveOverlap(userId, startDate, endDate) {
  const leaves = getUserLeaves(userId);
  for (let i = 0; i < leaves.length; i++) {
    const leave = leaves[i];
    const isActive = leave.status === "Pending" || leave.status === "Approved";
    if (isActive && startDate <= leave.endDate && endDate >= leave.startDate) {
      return leave;
    }
  }
  return null;
}

// data = { type, startDate, endDate, reason }
function validateLeaveRequest(userId, data) {
  const errors = {};
  const company = getCompany();
  const reason = data.reason.trim();

  if (!LEAVE_TYPES.includes(data.type)) {
    errors.type = "Choose a leave type.";
  }
  if (reason.length < 3) {
    errors.reason = "Please give a short reason (at least 3 characters).";
  }
  const startOk = isValidDateString(data.startDate);
  const endOk = isValidDateString(data.endDate);
  if (!startOk) {
    errors.startDate = "Choose a valid start date.";
  }
  if (!endOk) {
    errors.endDate = "Choose a valid end date.";
  }
  if (!startOk || !endOk) {
    return errors;
  }
  if (data.startDate > data.endDate) {
    errors.endDate = "End date must be on or after the start date.";
    return errors;
  }
  if (data.startDate.slice(0, 4) !== data.endDate.slice(0, 4)) {
    errors.endDate = "Leave must start and end in the same year. Please send one request per year.";
    return errors;
  }
  const days = countWorkingDays(data.startDate, data.endDate, company);
  if (days <= 0) {
    errors.endDate = "These dates only include days off, so there are no working days to take as leave.";
    return errors;
  }
  const overlap = findLeaveOverlap(userId, data.startDate, data.endDate);
  if (overlap !== null) {
    errors.startDate =
      "These dates overlap your " + overlap.status.toLowerCase() + " " + overlap.type + " leave (" +
      formatDisplayDate(overlap.startDate) + " to " + formatDisplayDate(overlap.endDate) + ").";
    return errors;
  }
  const usage = getLeaveUsage(userId, Number(data.startDate.slice(0, 4)));
  if (days > usage.available) {
    errors.endDate =
      "This request needs " + days + " working day(s), but only " + Math.max(usage.available, 0) +
      " are available for " + usage.year + " (yearly quota " + usage.quota + ", including " +
      usage.pending + " pending).";
  }
  return errors;
}

function applyForLeave(userId, data) {
  const errors = validateLeaveRequest(userId, data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors: errors };
  }
  const leave = {
    id: newId("lv"),
    userId: userId,
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate,
    days: countWorkingDays(data.startDate, data.endDate, getCompany()),
    reason: data.reason.trim(),
    status: "Pending",
    adminComment: "",
    reviewedAt: "",
    reviewedBy: "",
    createdAt: new Date().toISOString()
  };
  upsertRecord(KEYS.leaves, leave);
  return { ok: true, leave: leave };
}

// decision is "Approved" or "Rejected". Only a Pending request can be reviewed (once).
function reviewLeave(leaveId, decision, comment, adminId) {
  const leaves = getLeaves();
  let leave = null;
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].id === leaveId) {
      leave = leaves[i];
    }
  }
  if (leave === null) {
    return { ok: false, message: "This request no longer exists." };
  }
  if (leave.status !== "Pending") {
    return { ok: false, message: "This request was already " + leave.status.toLowerCase() + "." };
  }
  if (decision !== "Approved" && decision !== "Rejected") {
    return { ok: false, message: "Choose approve or reject." };
  }
  const cleanComment = comment.trim();
  if (decision === "Rejected" && cleanComment === "") {
    return { ok: false, message: "Please add a comment explaining the rejection." };
  }
  if (decision === "Approved") {
    const usage = getLeaveUsage(leave.userId, Number(leave.startDate.slice(0, 4)));
    if (usage.approved + leave.days > usage.quota) {
      return { ok: false, message: "Approving would go over this employee's yearly quota (" + usage.quota + " days)." };
    }
  }
  leave.status = decision;
  leave.adminComment = cleanComment;
  leave.reviewedAt = new Date().toISOString();
  leave.reviewedBy = adminId;
  upsertRecord(KEYS.leaves, leave);
  return { ok: true, leave: leave };
}

function hasApprovedLeaveIn(leaveList, userId, dateText) {
  for (let i = 0; i < leaveList.length; i++) {
    const leave = leaveList[i];
    if (leave.userId === userId && leave.status === "Approved" && dateText >= leave.startDate && dateText <= leave.endDate) {
      return true;
    }
  }
  return false;
}

function countLeavesByStatus(status) {
  const leaves = getLeaves();
  let count = 0;
  for (let i = 0; i < leaves.length; i++) {
    if (leaves[i].status === status) {
      count++;
    }
  }
  return count;
}
