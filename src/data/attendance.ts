export type AttendanceStatus = "On Time" | "Late" | "Absent" | "Exempt" | "Completed" | "Suspended";

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
  clockInPhotoUrl?: string;
  clockOutPhotoUrl?: string;
  isExempt?: boolean;
};

export const attendanceMetrics: any[] = [];

export const attendanceRoster: any[] = [];
