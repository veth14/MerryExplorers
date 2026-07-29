export type TeacherRole = "Lead Teacher" | "Assistant Teacher";
export type UserStatus = "active" | "inactive" | "on-leave";

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
  scheduleType: string;
  shiftTime: string;

  // Emergency contacts (optional)
  emergencyContacts: EmergencyContact[];
};

export const userAccounts: any[] = [];
