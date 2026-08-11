export type TeacherRole = "Lead Teacher" | "Assistant Teacher";
export type UserStatus = "active" | "inactive" | "on-leave";
export type EmploymentType = "full-time" | "part-time";

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

export type UserAccount = {
  id: string;
  // Profile card
  avatarUrl: string;         // URL or "" for initials fallback
  avatarColor: string;       // fallback bg color for initials avatar
  initials: string;
  tags: string[];            // e.g. ["Early Childhood Ed", "CPR Certified"]
  joinDate: string;
  status: UserStatus;

  // Personal info
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  homeAddress: string;

  // Work details
  role: TeacherRole;
  assignedRoom: string;
  employeeId: string;

  /** Structured work schedule — replaces the old free-text scheduleType */
  workDays: string[];              // e.g. ["Mon","Tue","Wed","Thu","Fri"]
  employmentType: EmploymentType;  // "full-time" | "part-time"
  shiftTime: string;               // display string e.g. "08:30 AM - 03:00 PM"

  /**
   * When true, this employee is exempt from late/absent checks.
   * Used for employees who do not log clock-in/out on their regular days.
   */
  noTimeLog: boolean;

  /**
   * For OJT / intern staff who track total weekly hours rather than daily
   * presence. null means not applicable (standard daily tracking).
   * e.g. 8 means they need 8 hours per week total.
   */
  weeklyHoursTarget: number | null;

  // Payroll details
  monthlyRate?: number;
  dailyRate?: number;
  sssContribution?: number;
  philhealthContribution?: number;
  pagibigContribution?: number;
  communicationAllowance?: number;
  perfectAttendanceIncentive?: number;
  birthdayGift?: number;

  // Emergency contacts (optional)
  emergencyContacts: EmergencyContact[];
};


export const userAccounts: any[] = [];
