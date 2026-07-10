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

  // Emergency contacts (optional)
  emergencyContacts: EmergencyContact[];
};

export const userAccounts: UserAccount[] = [
  {
    id: "1",
    avatarUrl: "",
    avatarColor: "#ffb347",
    initials: "IA",
    tags: ["Early Childhood Ed", "CPR Certified"],
    joinDate: "Aug 2023",
    status: "active",
    fullName: "Iya Abeleda",
    dateOfBirth: "May 1, 2002",
    email: "iya.a@merryexplorers.edu",
    phone: "(555) 123-4567",
    homeAddress: "123 Maple Street, Apt 4B, Springfield, IL 62704",
    role: "Lead Teacher",
    assignedRoom: "Sunshine Room (Toddlers)",
    employeeId: "ME-2021-042",
    scheduleType: "Full-Time (M–F)",
    emergencyContacts: [
      { name: "David Jenkins", relationship: "Spouse", phone: "(555) 987-6543" },
      { name: "Martha Jenkins", relationship: "Mother", phone: "(555) 456-7890" },
    ],
  },
  {
    id: "2",
    avatarUrl: "",
    avatarColor: "#4a90d9",
    initials: "MC",
    tags: ["Child Development"],
    joinDate: "Apr 2023",
    status: "active",
    fullName: "Michael Chang",
    dateOfBirth: "Mar 15, 1995",
    email: "m.chang@merryexplorers.edu",
    phone: "(555) 234-5678",
    homeAddress: "45 Oak Avenue, Chicago, IL 60601",
    role: "Assistant Teacher",
    assignedRoom: "Toddler Turtles",
    employeeId: "ME-2022-018",
    scheduleType: "Full-Time (M–F)",
    emergencyContacts: [],
  },
  {
    id: "3",
    avatarUrl: "",
    avatarColor: "#9b9b9b",
    initials: "ER",
    tags: ["Special Needs", "CPR Certified"],
    joinDate: "May 2023",
    status: "on-leave",
    fullName: "Elena Rodriguez",
    dateOfBirth: "Jul 22, 1988",
    email: "e.rodriguez@merryexplorers.edu",
    phone: "(555) 345-6789",
    homeAddress: "78 Pine Blvd, Springfield, IL 62705",
    role: "Lead Teacher",
    assignedRoom: "Rainbow Room",
    employeeId: "ME-2020-005",
    scheduleType: "Full-Time (M–F)",
    emergencyContacts: [
      { name: "Carlos Rodriguez", relationship: "Spouse", phone: "(555) 999-1234" },
    ],
  },
  {
    id: "4",
    avatarUrl: "",
    avatarColor: "#6c5ce7",
    initials: "JW",
    tags: ["Early Childhood Ed"],
    joinDate: "Feb 2023",
    status: "active",
    fullName: "James Wilson",
    dateOfBirth: "Nov 8, 1990",
    email: "j.wilson@merryexplorers.edu",
    phone: "(555) 456-7890",
    homeAddress: "12 Birch Lane, Peoria, IL 61602",
    role: "Lead Teacher",
    assignedRoom: "Little Explorers",
    employeeId: "ME-2019-031",
    scheduleType: "Full-Time (M–F)",
    emergencyContacts: [],
  },
  {
    id: "5",
    avatarUrl: "",
    avatarColor: "#e17055",
    initials: "PP",
    tags: ["Montessori Trained"],
    joinDate: "Jun 2024",
    status: "active",
    fullName: "Priya Patel",
    dateOfBirth: "Feb 14, 1997",
    email: "p.patel@merryexplorers.edu",
    phone: "(555) 567-8901",
    homeAddress: "300 Elm St, Bloomington, IL 61701",
    role: "Assistant Teacher",
    assignedRoom: "Sunshine Room (Toddlers)",
    employeeId: "ME-2023-054",
    scheduleType: "Part-Time (M/W/F)",
    emergencyContacts: [
      { name: "Raj Patel", relationship: "Father", phone: "(555) 111-2222" },
    ],
  },
  {
    id: "6",
    avatarUrl: "",
    avatarColor: "#00b894",
    initials: "LK",
    tags: ["CPR Certified", "Art Specialist"],
    joinDate: "Jan 2022",
    status: "active",
    fullName: "Laura Kim",
    dateOfBirth: "Sep 30, 1993",
    email: "l.kim@merryexplorers.edu",
    phone: "(555) 678-9012",
    homeAddress: "55 Cedar Dr, Springfield, IL 62706",
    role: "Lead Teacher",
    assignedRoom: "Rainbow Room",
    employeeId: "ME-2018-007",
    scheduleType: "Full-Time (M–F)",
    emergencyContacts: [],
  },
];
