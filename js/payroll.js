// js/payroll.js
// Monthly payslip maths (same rules as the brief):
//   per-day salary = monthly salary / working days in the month
//   deduction      = per-day salary x (absent days + 0.5 x half days)
//   net salary     = monthly salary - deduction
//
// Day meanings come from getDayStatus() in attendance.js:
//   - Day off (weekend)            -> not counted at all
//   - Present / Late               -> no deduction
//   - Half Day or Incomplete       -> counts as a half day
//   - On Leave (approved)          -> paid, no deduction
//   - Absent (past working day with no record and no approved leave) -> full day deduction
//   - Today, future days, days before the joining date -> not counted yet (no deduction)

function calculatePayslip(user, year, month) {
  const company = getCompany();
  const attendance = getAttendanceList();
  const leaves = getLeaves();
  const today = todayString();
  const dates = getMonthDates(year, month);

  const result = {
    year: year,
    month: month,
    workingDays: 0,
    presentDays: 0,
    lateDays: 0,
    halfDays: 0,
    incompleteDays: 0,
    leaveDays: 0,
    absentDays: 0,
    notCountedDays: 0,
    absentDates: [],
    monthlySalary: Number(user.salary),
    perDaySalary: 0,
    deduction: 0,
    netSalary: Number(user.salary)
  };

  for (let i = 0; i < dates.length; i++) {
    if (!isWorkingDay(dates[i], company)) {
      continue;
    }
    result.workingDays++;
    const status = getDayStatus(user, dates[i], attendance, leaves, company, today);
    if (status === "Present") {
      result.presentDays++;
    } else if (status === "Late") {
      result.presentDays++;
      result.lateDays++;
    } else if (status === "Half Day") {
      result.halfDays++;
    } else if (status === "Incomplete") {
      result.halfDays++;
      result.incompleteDays++;
    } else if (status === "On Leave") {
      result.leaveDays++;
    } else if (status === "Absent") {
      result.absentDays++;
      result.absentDates.push(dates[i]);
    } else {
      result.notCountedDays++; // Upcoming, Not checked in (today), Before joining
    }
  }

  if (result.workingDays > 0) {
    result.perDaySalary = result.monthlySalary / result.workingDays;
  }
  result.deduction = round2(result.perDaySalary * (result.absentDays + 0.5 * result.halfDays));
  result.netSalary = round2(result.monthlySalary - result.deduction);
  result.perDaySalary = round2(result.perDaySalary);
  return result;
}
