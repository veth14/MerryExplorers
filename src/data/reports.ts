export const reportMetrics = [
  {
    label: "AVG PUNCTUALITY",
    value: "92",
    unit: "%",
    type: "punctuality" as const,
  },
  {
    label: "TOTAL CLOCK-INS",
    value: "428",
    type: "clockins" as const,
  },
  {
    label: "DAILY ATTENDANCE",
    value: "18",
    unit: "/20",
    type: "attendance" as const,
  },
];

export const punctualityTrends = [
  { week: "W1", value: 85, color: "#92bdf2", clockIns: 96, onTime: 82 },
  { week: "W2", value: 90, color: "#92bdf2", clockIns: 104, onTime: 94 },
  { week: "W3", value: 65, color: "#ffb800", clockIns: 88, onTime: 57 },
  { week: "W4", value: 88, color: "#92bdf2", clockIns: 100, onTime: 88 },
];

export type LogStatus = "ON TIME" | "LATE";

export const detailedLogs: {
  id: string;
  date: string;
  teacherName: string;
  initials: string;
  scheduledIn: string;
  actualIn: string;
  status: LogStatus;
  totalHours: string;
  color: string;
}[] = [
  { id: "1",  date: "Oct 24, 2024", teacherName: "Ms. Sarah",  initials: "S", scheduledIn: "07:30 AM", actualIn: "07:28 AM", status: "ON TIME", totalHours: "8h",   color: "#0066cc" },
  { id: "2",  date: "Oct 24, 2024", teacherName: "Mr. David",  initials: "D", scheduledIn: "08:00 AM", actualIn: "08:15 AM", status: "LATE",    totalHours: "7.5h", color: "#ffb800" },
  { id: "3",  date: "Oct 23, 2024", teacherName: "Ms. Emily",  initials: "E", scheduledIn: "07:30 AM", actualIn: "07:30 AM", status: "ON TIME", totalHours: "8h",   color: "#339933" },
  { id: "4",  date: "Oct 23, 2024", teacherName: "Mr. James",  initials: "J", scheduledIn: "08:00 AM", actualIn: "07:55 AM", status: "ON TIME", totalHours: "7h",   color: "#9333ea" },
  { id: "5",  date: "Oct 22, 2024", teacherName: "Ms. Rachel", initials: "R", scheduledIn: "07:30 AM", actualIn: "07:45 AM", status: "LATE",    totalHours: "7.5h", color: "#ef4444" },
  { id: "6",  date: "Oct 22, 2024", teacherName: "Mr. Carlos", initials: "C", scheduledIn: "08:00 AM", actualIn: "08:00 AM", status: "ON TIME", totalHours: "8h",   color: "#0891b2" },
  { id: "7",  date: "Oct 21, 2024", teacherName: "Ms. Aisha",  initials: "A", scheduledIn: "07:30 AM", actualIn: "07:25 AM", status: "ON TIME", totalHours: "8.5h", color: "#d97706" },
  { id: "8",  date: "Oct 21, 2024", teacherName: "Mr. Leo",    initials: "L", scheduledIn: "08:00 AM", actualIn: "08:10 AM", status: "LATE",    totalHours: "7h",   color: "#16a34a" },
  { id: "9",  date: "Oct 20, 2024", teacherName: "Ms. Nina",   initials: "N", scheduledIn: "07:30 AM", actualIn: "07:30 AM", status: "ON TIME", totalHours: "8h",   color: "#7c3aed" },
  { id: "10", date: "Oct 20, 2024", teacherName: "Mr. Ben",    initials: "B", scheduledIn: "08:00 AM", actualIn: "07:58 AM", status: "ON TIME", totalHours: "8h",   color: "#be185d" },
  { id: "11", date: "Oct 19, 2024", teacherName: "Ms. Lara",   initials: "L", scheduledIn: "07:30 AM", actualIn: "07:50 AM", status: "LATE",    totalHours: "7.5h", color: "#0369a1" },
  { id: "12", date: "Oct 19, 2024", teacherName: "Mr. Sam",    initials: "S", scheduledIn: "08:00 AM", actualIn: "08:00 AM", status: "ON TIME", totalHours: "8h",   color: "#065f46" },
  { id: "13", date: "Oct 18, 2024", teacherName: "Ms. Priya",  initials: "P", scheduledIn: "07:30 AM", actualIn: "07:28 AM", status: "ON TIME", totalHours: "8h",   color: "#c026d3" },
  { id: "14", date: "Oct 18, 2024", teacherName: "Mr. Owen",   initials: "O", scheduledIn: "08:00 AM", actualIn: "08:22 AM", status: "LATE",    totalHours: "7h",   color: "#ea580c" },
  { id: "15", date: "Oct 17, 2024", teacherName: "Ms. Grace",  initials: "G", scheduledIn: "07:30 AM", actualIn: "07:30 AM", status: "ON TIME", totalHours: "8h",   color: "#0d9488" },
  { id: "16", date: "Oct 17, 2024", teacherName: "Mr. Felix",  initials: "F", scheduledIn: "08:00 AM", actualIn: "07:59 AM", status: "ON TIME", totalHours: "8h",   color: "#4f46e5" },
];