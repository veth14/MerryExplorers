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

export const attendanceMetrics: any[] = [];

export const attendanceRoster: any[] = [];
