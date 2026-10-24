# HCM Lite

A small human-capital-management web app built with plain **HTML, CSS and vanilla JavaScript** for the Saylani Hackathon (Beginner Track).
Admins set up a company, add employees, and manage leave and settings. Employees check in and out, apply for leave, read announcements and open their own payslip.
All data is saved in the browser with `localStorage`. There is no backend, no database and no API key.

> **Not for real HR data.** Everything lives in the browser. Anyone with access to this browser can read or edit it in DevTools, including the saved login session. See [Limitations](#limitations).

## How to run locally

1. Download or unzip the project folder.
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
   Better: serve the folder so password hashing uses the browser's secure crypto, for example
   `python3 -m http.server 8000` and visit `http://localhost:8000`, or use the VS Code "Live Server" extension.
3. The Google Fonts link needs internet. Without it the app falls back to system fonts and still works.

## First-run setup and logging in

1. On the first visit `index.html` shows **Set up your company**. Enter the company name and the admin's name, email and password, then choose **Create company**. You land on the admin dashboard.
2. After setup, `index.html` always shows the **login** form.
3. The admin opens **Employees** and adds people. Adding an employee creates their login automatically (their email + the password the admin typed). Give them those details.
4. Employees log in on `index.html` and land on their own dashboard. Admins land on the admin dashboard.
5. Anyone can change their own password (admin: Settings page, employee: dashboard).

Passwords must be at least 8 characters with a letter and a number.

## File structure

```
index.html        first-run setup + login
admin.html        admin dashboard (stats, recent attendance, pending leave, departments, announcements, helper chat)
employees.html    admin: add / edit / delete / search / filter employees
leaves.html       employees apply for leave; admin reviews requests
settings.html     admin: company settings + change password
employee.html     employee dashboard (check in/out, history, leave, announcements, helper chat)
payslip.html      monthly payslip (admin: any employee, employee: own only)
css/style.css     the whole design system (CSS variables, light + dark themes, print rules)
js/theme.js       dark/light theme (loaded in <head> so there is no flash)
js/storage.js     all localStorage reading/writing
js/helper.js      escaping, icons, date/time/money helpers, toasts, form errors
js/auth.js        setup, login, logout, hashing, role protection, change password
js/employees.js   employee rules (an employee is a user record with role "employee")
js/attendance.js  check-in/out rules, day status, today's summary
js/leave.js       leave rules, quota, overlap, approval
js/payroll.js     payslip calculation
js/chat.js        keyword-based helper chat
js/layout.js      sidebar, top bar, mobile menu, confirm dialog
js/pages/*.js     one small script per page
```

## Key business rules

- **Late**: check-in after *office start time + grace minutes* (both set by the admin). Otherwise **Present**.
- **Half Day**: completed work under **5 hours** (decided at check-out). A late person who works under 5 hours is marked Half Day, and the record still remembers they were late.
- **Check-in** is allowed once per day. **Check-out** only after check-in. Check-in is closed on days off and on days of approved leave.
- **Hours** come from full timestamps, so a shift that passes midnight works: yesterday's open shift can be closed within 16 hours.
- **Absent**: a working day, *before today*, on or after the joining date, with no attendance record and no approved leave. Absences are calculated when needed, never saved as fake records. Weekends are never absent. Today is shown as "absent today / not checked in" on the admin dashboard but is **not** deducted on a payslip because the day is not over.
- **Incomplete**: a past day with a check-in but no check-out is shown as Incomplete and treated as a **half day** everywhere.
- **Leave days** count working days only (weekend days from settings are skipped). The quota year is the calendar year of the start date; a request must start and end in the same year.
- **Quota check** when applying: approved + pending + new request must not exceed the yearly quota. The **remaining balance** shown to people counts **approved** days only.
- **Overlap**: a new request is rejected if it shares a date with any of that employee's pending or approved requests.
- **Review**: only a Pending request can be approved or rejected, once. Rejection needs a comment; approval comment is optional. Approved leave is paid (no deduction).
- **Payslip**: per-day salary = monthly salary / working days in the month. Deduction = per-day salary x (absent days + 0.5 x half days). Net = salary - deduction. Today, future days and days before the joining date are not counted.
- **Settings changes** apply from then on. Saved attendance statuses and leave day counts are not rewritten. Payslips use the current weekend setting to decide which days of a month are working days.
- **Deleting an employee** removes their login, attendance and leave records only.

## localStorage keys

| Key | Contents |
| --- | --- |
| `hcm_company` | company name, office start, grace minutes, yearly leave quota, weekend days |
| `hcm_users` | admin and employees (id, name, email, role, department, salary, joinDate, salt, passwordHash) |
| `hcm_attendance` | one record per employee per day |
| `hcm_leaves` | leave requests with status and admin comment |
| `hcm_session` | the logged-in user's id |
| `hcm_announcements` | announcements posted by the admin |
| `hcm_theme` | `light` or `dark` |

Nothing is pre-filled. The app starts empty until the admin creates the company and employees.

## Limitations

- **localStorage is not secure.** A user can open DevTools, edit `hcm_session` or `hcm_users`, and become an admin. Role checks in this project keep honest users on the right pages; they are not real security.
- Passwords are stored as a **salted SHA-256 hash**, never as plain text. One fast hash is not proper password hashing (real apps use bcrypt/argon2 on a server). If the browser has no `crypto.subtle`, a much weaker fallback hash is used.
- Data exists only in one browser on one device. Clearing site data deletes everything. There is no export, backup or sync.
- Do not use this for real, sensitive HR data or as a production system.

## Manual testing checklist

1. Fresh browser: `index.html` shows setup. Submit empty, bad email, short password, mismatched confirm: errors appear next to fields.
2. Create the company. You reach the admin dashboard with all counts at 0 and empty states.
3. Open `employees.html` directly while logged out (use a private window): you are sent to the login/setup page.
4. Add an employee with salary 0 and with the admin's email: both are rejected. Add two valid employees. Search and filter by department. Edit one. Delete one (confirm dialog).
5. Settings: set office start 09:00, grace 15, quota 20, weekend Sat+Sun. Try grace -1 and all seven days off: rejected.
6. Log out, log in as an employee. Visit `admin.html`, `employees.html`, `settings.html`: you are sent back to your dashboard.
7. Check in. After 09:15 you are Late. Check out less than 5 hours later: Half Day. Check-in again and check-out again are blocked.
8. Leave: end before start, weekend-only range, overlapping range, a range bigger than the remaining quota, a range across two years: each shows a clear error. A valid range becomes Pending.
9. As admin: reject without a comment (blocked), reject with a comment, approve another. Employee sees the status and comment. The balance drops by approved days only.
10. Admin posts an announcement; the employee sees it. Ask the helper chat on both dashboards. Ask the employee helper about another person: it refuses.
11. Payslip: pick an employee and month. Check working days, absent days, half days, deduction, net. Print / Save as PDF: menu and buttons are hidden.
12. Toggle dark theme, move between pages and reload: it stays. Resize to phone width: the menu button opens the sidebar.

### Demo without shipping dummy data

To show a payslip with absences quickly, create an employee with a joining date earlier this month, check in on a few days by changing your computer clock or in DevTools, or just let a few real working days pass. Absences appear automatically for past working days with no check-in.
