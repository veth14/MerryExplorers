export const teacherNavItems = [
  { label: "Dashboard", href: "/teacher" },
  { label: "Clock In/Out", href: "/teacher/clock" },
  { label: "History", href: "/teacher/history" },
  { label: "Profile", href: "/teacher/profile" },
] as const;

export const teacherAnnouncements = [
  {
    id: "1",
    title: "Fire Drill Practice Tomorrow",
    timeAgo: "2 hrs ago",
    content:
      "Please ensure all toddlers are familiarized with the exit routes. Practice will be at 10:30 AM.",
    type: "alert",
  },
  {
    id: "2",
    title: "Staff Meeting Moved",
    timeAgo: "Yesterday",
    content:
      "The Friday staff meeting has been moved to Thursday afternoon during nap time (1:00 PM) in the main hall.",
    type: "info",
  },
] as const;

export const currentShift = {
  status: "Clocked In",
  since: "Since 07:55 AM",
  timeRange: "08:00 AM - 01:00 PM",
  type: "Morning Shift",
  group: "Toddlers (2-3y)",
  students: "14 / 15",
  coTeacher: "Emily R.",
};

// ── Clock page types ──────────────────────────────────────────────

export type BreakEntry = { start: Date; end?: Date };

export type ActivityEntry = {
  id: string;
  time: string; // formatted display, e.g. "8:00 AM"
  action: "clock-in" | "clock-out" | "break-start" | "break-end";
  label: string; // e.g. "Clocked In"
  duration?: string; // e.g. "4h 30m" — set on clock-out or break-end
};

// ── History page types & data ────────────────────────────────────

export type ShiftStatus = "Completed" | "In Progress" | "Absent" | "On Leave";

export type ShiftRecord = {
  id: string;
  date: string; // e.g. "Mon, Jun 16"
  clockIn: string;
  clockOut: string;
  breakDuration: string;
  totalHours: string;
  status: ShiftStatus;
};

export const historyMetrics = [
  { label: "TOTAL HOURS THIS WEEK", value: "32h 15m", type: "hours" as const },
  {
    label: "SHIFTS COMPLETED",
    value: "5 / 6",
    type: "shifts" as const,
  },
  {
    label: "AVG CLOCK-IN",
    value: "7:52 AM",
    type: "avg" as const,
  },
  {
    label: "ON-TIME RATE",
    value: "94%",
    type: "rate" as const,
  },
] as const;

export const shiftHistory: ShiftRecord[] = [
  {
    id: "1",
    date: "Mon, Jun 16",
    clockIn: "7:48 AM",
    clockOut: "1:05 PM",
    breakDuration: "20m",
    totalHours: "4h 57m",
    status: "Completed",
  },
  {
    id: "2",
    date: "Tue, Jun 17",
    clockIn: "7:50 AM",
    clockOut: "1:00 PM",
    breakDuration: "15m",
    totalHours: "4h 55m",
    status: "Completed",
  },
  {
    id: "3",
    date: "Wed, Jun 18",
    clockIn: "7:55 AM",
    clockOut: "1:10 PM",
    breakDuration: "30m",
    totalHours: "4h 45m",
    status: "Completed",
  },
  {
    id: "4",
    date: "Thu, Jun 19",
    clockIn: "8:15 AM",
    clockOut: "1:00 PM",
    breakDuration: "10m",
    totalHours: "4h 35m",
    status: "Completed",
  },
  {
    id: "5",
    date: "Fri, Jun 20",
    clockIn: "7:45 AM",
    clockOut: "1:15 PM",
    breakDuration: "25m",
    totalHours: "5h 05m",
    status: "Completed",
  },
  {
    id: "6",
    date: "Sat, Jun 21",
    clockIn: "7:58 AM",
    clockOut: "—",
    breakDuration: "—",
    totalHours: "—",
    status: "In Progress",
  },
];
