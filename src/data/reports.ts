export const reportMetrics = [
  {
    label: "AVG PUNCTUALITY",
    value: "92",
    unit: "%",
    type: "punctuality",
  },
  {
    label: "TOTAL CLOCK-INS",
    value: "428",
    type: "clockins",
  },
  {
    label: "DAILY ATTENDANCE",
    value: "18",
    unit: "/20",
    type: "attendance",
  },
] as const;

export const punctualityTrends = [
  { week: "W1", value: 85, color: "#92bdf2" },
  { week: "W2", value: 90, color: "#92bdf2" },
  { week: "W3", value: 65, color: "#ffb800" }, // yellow
  { week: "W4", value: 88, color: "#92bdf2" },
] as const;

export type LogStatus = "ON TIME" | "LATE";

export const detailedLogs = [
  {
    id: "1",
    date: "Oct 24, 2024",
    teacherName: "Ms. Sarah",
    initials: "S",
    scheduledIn: "07:30 AM",
    actualIn: "07:28 AM",
    status: "ON TIME" as LogStatus,
    totalHours: "8h",
    color: "#2da05b", // green or blue depending on theme, but teacher avatar color is blue or green. We'll use blue from design. Wait, in attendance S was green, let's use a nice default.
  },
  {
    id: "2",
    date: "Oct 24, 2024",
    teacherName: "Mr. David",
    initials: "D",
    scheduledIn: "08:00 AM",
    actualIn: "08:15 AM",
    status: "LATE" as LogStatus,
    totalHours: "7.5h",
    color: "#ffb800", // yellow avatar in attendance
  },
  {
    id: "3",
    date: "Oct 23, 2024",
    teacherName: "Ms. Emily",
    initials: "E",
    scheduledIn: "07:30 AM",
    actualIn: "07:30 AM",
    status: "ON TIME" as LogStatus,
    totalHours: "8h",
    color: "#2da05b",
  },
] as const;
