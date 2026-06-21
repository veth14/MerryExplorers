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
};

export const teacherMetrics = [
  {
    label: "Total Teachers",
    value: "24",
    meta: "+2 this month",
    type: "total" as const,
  },
  {
    label: "Active Today",
    value: "18",
    meta: "4 scheduled off",
    type: "active" as const,
  },
  {
    label: "On Leave",
    value: "2",
    meta: "Returning next week",
    type: "leave" as const,
  },
] as const;

export const teachers: Teacher[] = [
  {
    id: "1",
    name: "Iya Abeleda",
    initials: "IA",
    role: "Lead Teacher",
    status: "active",
    classAssigned: "Pre-K Explorers",
    email: "iyabeleda@gmail.com",
    phone: "(555) 123-4567",
    avatarColor: "#ffb347",
  },
  {
    id: "2",
    name: "Michael Chang",
    initials: "MC",
    role: "Assistant Teacher",
    status: "active",
    classAssigned: "Toddler Turtles",
    email: "m.chang@merryexplorers.com",
    phone: "(555) 234-5678",
    avatarColor: "#4a90d9",
  },
  {
    id: "3",
    name: "Elena Rodriguez",
    initials: "ER",
    role: "Lead Teacher",
    status: "on-leave",
    classAssigned: null,
    email: "e.rodriguez@merryexplorers.com",
    phone: "(555) 345-6789",
    avatarColor: "#9b9b9b",
  },
  {
    id: "4",
    name: "James Wilson",
    initials: "JW",
    role: "Lead Teacher",
    status: "active",
    classAssigned: "Little Explorers",
    email: "j.wilson@merryexplorers.com",
    phone: "(555) 456-7890",
    avatarColor: "#6c5ce7",
  },
  {
    id: "5",
    name: "Priya Patel",
    initials: "PP",
    role: "Assistant Teacher",
    status: "active",
    classAssigned: "Sunshine Room",
    email: "p.patel@merryexplorers.com",
    phone: "(555) 567-8901",
    avatarColor: "#e17055",
  },
  {
    id: "6",
    name: "Laura Kim",
    initials: "LK",
    role: "Lead Teacher",
    status: "active",
    classAssigned: "Rainbow Room",
    email: "l.kim@merryexplorers.com",
    phone: "(555) 678-9012",
    avatarColor: "#00b894",
  },
];
