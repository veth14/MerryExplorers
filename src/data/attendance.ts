export type AttendanceStatus = "On Time" | "Late" | "Absent" | "Completed";

export type StaffAttendance = {
  id: string;
  name: string;
  avatarInitials?: string;
  avatarColor?: string;
  avatarImage?: string;
  group: string;
  timeIn: string;
  timeOut: string;
  status: AttendanceStatus;
};

export const attendanceMetrics = [
  {
    label: "TOTAL PRESENT",
    value: "3",
    type: "present" as const,
  },
  {
    label: "LATE ARRIVALS",
    value: "1",
    type: "late" as const,
  },
  {
    label: "ABSENT",
    value: "1",
    type: "absent" as const,
  },
  {
    label: "ON LEAVE",
    value: "0",
    type: "leave" as const,
  },
] as const;

export const attendanceRoster: StaffAttendance[] = [
  {
    id: "1",
    name: "Sarah Jenkins",
    avatarImage: "/avatars/sarah.jpg", // We can just use initials or a placeholder color if image not found
    avatarInitials: "SJ",
    avatarColor: "#2da05b",
    group: "Toddlers",
    timeIn: "07:45 AM",
    timeOut: "-",
    status: "On Time",
  },
  {
    id: "2",
    name: "Michael Ross",
    avatarInitials: "MR",
    avatarColor: "#ffcc00",
    group: "Pre-K",
    timeIn: "08:15 AM",
    timeOut: "-",
    status: "Late",
  },
  {
    id: "3",
    name: "David Chen",
    avatarImage: "/avatars/david.jpg",
    avatarInitials: "DC",
    avatarColor: "#e53935",
    group: "Nursery",
    timeIn: "-",
    timeOut: "-",
    status: "Absent",
  },
  {
    id: "4",
    name: "Emma Lopez",
    avatarInitials: "EL",
    avatarColor: "#e0e0e0",
    group: "Kindergarten",
    timeIn: "07:30 AM",
    timeOut: "03:30 PM",
    status: "Completed",
  },
];
