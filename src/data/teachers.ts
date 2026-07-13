export type TeacherRole = "Lead Teacher" | "Assistant Teacher";
export type TeacherStatus = "active" | "on-leave";
export type FilterTab = "All Staff" | "Lead Teachers" | "Assistants";

export type Teacher = {
  id: string;
  name: string;
  initials: string;
  role: TeacherRole;
  status: TeacherStatus;
  classAssigned: string | null;
  email: string;
  phone: string;
  avatarColor: string;
  avatarUrl?: string;
};

export const teacherMetrics: any[] = [];

export const teachers: any[] = [];
