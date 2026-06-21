export const sidebarItems = [
  { label: "Dashboard", active: true },
  { label: "Teachers" },
  { label: "Attendance" },
  { label: "Reports" },
] as const;

export const metrics = [
  {
    label: "Total Teachers",
    value: "12",
    meta: "All present today",
    type: "teachers",
  },
  {
    label: "Active Sessions",
    value: "10/12",
    meta: "Teachers timed-in",
    type: "sessions",
  },
  {
    label: "Punctuality Rate",
    value: "94%",
    meta: "+1% from last week",
    type: "punctuality",
  },
  {
    label: "Total Clock-Ins",
    value: "24",
    meta: "Total today",
    type: "clockins",
  },
] as const;

export const teamMembers = [
  {
    name: "Ms. Iya",
    initials: "IA",
    status: "WORKING" as const,
    hours: "6.5 hrs",
    color: "#2da05b",
  },
  {
    name: "Mr. Michael",
    initials: "M",
    status: "ON BREAK" as const,
    hours: "4.2 hrs",
    color: "#ffb800",
  },
  {
    name: "Ms. Emily",
    initials: "E",
    status: "WORKING" as const,
    hours: "5.8 hrs",
    color: "#2da05b",
  },
  {
    name: "Mr. James",
    initials: "J",
    status: "NOT STARTED" as const,
    hours: "0.0 hrs",
    color: "#1a1a1a",
    avatar: "black",
  },
  {
    name: "Ms. Anna",
    initials: "A",
    status: "WORKING" as const,
    hours: "7.1 hrs",
    color: "#2da05b",
    isLogo: true,
  },
] as const;

export const activeStatus = [
  {
    name: "Ms. Iya",
    time: "In: 7:45 AM",
    status: "ON TIME" as const,
  },
  {
    name: "Mr. Michael",
    time: "In: 8:15 AM",
    status: "LATE (5M)" as const,
  },
  {
    name: "Ms. Emily",
    time: "In: 7:55 AM",
    status: "ON TIME" as const,
  },
] as const;

export const todayHistory = [
  {
    name: "Ms. Iya Clocked In",
    time: "8:02 AM",
    type: "in" as const,
  },
  {
    name: "Mr. Michael Clocked In",
    time: "7:58 AM",
    type: "in" as const,
  },
  {
    name: "Ms. Emily Clocked Out",
    time: "7:45 AM",
    type: "out" as const,
  },
] as const;

// Legacy exports kept for compatibility
export const chartPoints = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 45 },
  { day: "Wed", value: 43 },
  { day: "Thu", value: 46 },
  { day: "Fri", value: 45 },
  { day: "Sat", value: 0 },
  { day: "Sun", value: 0 },
] as const;

export const activityStars = [
  { name: "Ms. Iya", place: "Little Explorers (Morning)", posts: 15 },
  { name: "Mr. Michael", place: "Tiny Explorers", posts: 12 },
  { name: "Ms. Emily", place: "Little Explorers (Afternoon)", posts: 9 },
] as const;

export const recentActivity = [
  {
    id: "1",
    author: "Ms. Iya",
    authorRole: "Little Explorers",
    timeAgo: "10m ago",
    content: "Morning art session was a messy success! 🎨 ✨",
    images: ["/next.svg", "/next.svg"],
    likes: 12,
    comments: 3,
  },
  {
    id: "2",
    author: "Mr. Michael",
    authorRole: "Tiny Explorers",
    timeAgo: "1h ago",
    content: "Story time with the little ones. 📚",
    images: ["/next.svg"],
    likes: 8,
    comments: 1,
  },
] as const;
