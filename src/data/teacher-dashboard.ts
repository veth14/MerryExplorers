export const teacherNavItems = [
  { label: "Dashboard", href: "/teacher" },
  { label: "Clock In/Out", href: "/teacher/clock" },
  { label: "History", href: "/teacher/history" },
  { label: "Leaves", href: "/teacher/leaves" },
  { label: "Profile", href: "/teacher/profile" },
] as const;

// ── Clock page types ──────────────────────────────────────────────

export type BreakEntry = { start: Date; end?: Date };

export type ActivityEntry = {
  id: string;
  time: string; // formatted display, e.g. "8:00 AM"
  action: "clock-in" | "clock-out" | "break-start" | "break-end";
  label: string; // e.g. "Clocked In"
  duration?: string; // e.g. "4h 30m" — set on clock-out or break-end
};

// ── History page types ────────────────────────────────────────────

export type ShiftStatus = "Completed" | "In Progress" | "Absent" | "On Leave";

export type ShiftRecord = {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakDuration: string;
  totalHours: string;
  status: ShiftStatus;
};
