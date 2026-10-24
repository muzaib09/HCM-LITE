// js/attendance.js
// Attendance rules:
//  - One record per employee per day. Check-in once; check-out only after check-in.
//  - Late  = checked in AFTER (office start time + grace minutes). Otherwise Present.
//  - Half Day = completed work under 5 hours (decided at check-out). A late person who works under 5 hours
//    is "Half Day" but the record still remembers late = true.
//  - Check-in is closed on weekends (days off) and on days of approved leave.
//  - Hours are calculated from full timestamps, so a shift that passes midnight still works:
//    an open record from yesterday can be closed within 16 hours.
//  - ABSENT = a working day, before today, on/after the joining date, with no attendance record
//    and no approved leave. Nothing is saved for absences: they are worked out when needed.
//  - A past day with a check-in but no check-out is "Incomplete" and is treated as a Half Day.

const MIN_FULL_DAY_HOURS = 5;
const MAX_OPEN_SHIFT_HOURS = 16;

function findAttendanceRecord(list, userId, dateText) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].userId === userId && list[i].date === dateText) {
      return list[i];
    }
  }
  return null;
}

function getUserAttendance(userId) {
  const list = getAttendanceList();
  const mine = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].userId === userId) {
      mine.push(list[i]);
    }
  }
  // newest first
  mine.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return mine;
}

function getTodayRecord(userId) {
  return findAttendanceRecord(getAttendanceList(), userId, todayString());
}

// The record the person can still check out of (today's, or yesterday's night shift).
function getOpenRecord(userId) {
  const list = getAttendanceList();
  const today = todayString();
  const yesterday = addDays(today, -1);
  const now = new Date();
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    if (record.userId !== userId || record.checkOut) {
      continue;
    }
    if (record.date === today) {
      return record;
    }
    if (record.date === yesterday) {
      const hoursOpen = (now - new Date(record.checkInAt)) / 3600000;
      if (hoursOpen <= MAX_OPEN_SHIFT_HOURS) {
        return record;
      }
    }
  }
  return null;
}

function checkIn(userId) {
  const company = getCompany();
  const now = new Date();
  const today = formatDateString(now);

  if (!isWorkingDay(today, company)) {
    return { ok: false, message: "Today is a day off, so check-in is closed." };
  }
  if (hasApprovedLeaveIn(getLeaves(), userId, today)) {
    return { ok: false, message: "You are on approved leave today." };
  }
  if (findAttendanceRecord(getAttendanceList(), userId, today) !== null) {
    return { ok: false, message: "You have already checked in today." };
  }
  if (getOpenRecord(userId) !== null) {
    return { ok: false, message: "Please check out of your previous shift first." };
  }
  const time = nowTimeString(now);
  const lateAfter = timeToMinutes(company.officeStart) + Number(company.graceMinutes);
  const isLate = timeToMinutes(time) > lateAfter;
  const record = {
    id: newId("att"),
    userId: userId,
    date: today,
    checkIn: time,
    checkInAt: now.toISOString(),
    checkOut: null,
    checkOutAt: null,
    hoursWorked: 0,
    late: isLate,
    status: isLate ? "Late" : "Present"
  };
  upsertRecord(KEYS.attendance, record);
  return { ok: true, record: record, message: isLate ? "Checked in at " + formatTime(time) + " (marked Late)." : "Checked in at " + formatTime(time) + "." };
}

function checkOut(userId) {
  const record = getOpenRecord(userId);
  if (record === null) {
    const todayRecord = getTodayRecord(userId);
    if (todayRecord !== null && todayRecord.checkOut) {
      return { ok: false, message: "You have already checked out today." };
    }
    return { ok: false, message: "Check in first, then you can check out." };
  }
  const now = new Date();
  const hours = round2((now - new Date(record.checkInAt)) / 3600000);
  record.checkOut = nowTimeString(now);
  record.checkOutAt = now.toISOString();
  record.hoursWorked = hours;
  if (hours < MIN_FULL_DAY_HOURS) {
    record.status = "Half Day";
  } else {
    record.status = record.late ? "Late" : "Present";
  }
  upsertRecord(KEYS.attendance, record);
  return { ok: true, record: record, message: "Checked out at " + formatTime(record.checkOut) + ". You worked " + formatHours(hours) + " (" + record.status + ")." };
}

// Label shown in tables: past days without check-out are "Incomplete".
function getRecordLabel(record) {
  if (!record.checkOut && record.date < todayString()) {
    return "Incomplete";
  }
  return record.status;
}

// Hours worked from Monday of this week until today (completed records only).
function getWeekHours(userId) {
  const today = todayString();
  const weekStart = getWeekStart(today);
  const list = getAttendanceList();
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    if (record.userId === userId && record.date >= weekStart && record.date <= today && record.checkOut) {
      total += Number(record.hoursWorked) || 0;
    }
  }
  return round2(total);
}

// One function decides what a day means for an employee. Dashboards, helper chat and payslips all use it.
// Returns one of: "Day off", "Before joining", "Present", "Late", "Half Day", "Incomplete",
//                 "On Leave", "Upcoming", "Not checked in", "Absent"
function getDayStatus(user, dateText, attendanceList, leaveList, company, today) {
  if (!isWorkingDay(dateText, company)) {
    return "Day off";
  }
  if (dateText < user.joinDate) {
    return "Before joining";
  }
  const record = findAttendanceRecord(attendanceList, user.id, dateText);
  if (record !== null) {
    if (!record.checkOut && record.date < today) {
      return "Incomplete";
    }
    return record.status;
  }
  if (hasApprovedLeaveIn(leaveList, user.id, dateText)) {
    return "On Leave";
  }
  if (dateText > today) {
    return "Upcoming";
  }
  if (dateText === today) {
    return "Not checked in"; // today is not over, so it is not an absence yet
  }
  return "Absent";
}

// Live numbers for today. Used by the admin dashboard and the admin helper chat.
function getTodaySummary() {
  const company = getCompany();
  const today = todayString();
  const employees = getEmployees();
  const attendance = getAttendanceList();
  const leaves = getLeaves();
  const summary = {
    date: today,
    isWorkingDay: isWorkingDay(today, company),
    totalEmployees: employees.length,
    present: [],
    late: [],
    onLeave: [],
    absent: [],
    stillWorking: []
  };
  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const record = findAttendanceRecord(attendance, employee.id, today);
    if (record !== null) {
      summary.present.push(employee);
      if (record.late) {
        summary.late.push(employee);
      }
      if (!record.checkOut) {
        summary.stillWorking.push(employee);
      }
    } else {
      const status = getDayStatus(employee, today, attendance, leaves, company, today);
      if (status === "On Leave") {
        summary.onLeave.push(employee);
      } else if (status === "Not checked in") {
        summary.absent.push(employee);
      }
    }
  }
  return summary;
}
