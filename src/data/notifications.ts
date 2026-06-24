export type NotificationType = "late" | "absent" | "info" | "success";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export const notifications: AppNotification[] = [
  {
    id: "n1",
    type: "late",
    title: "Late clock-in",
    message: "Mr. David clocked in 15 minutes late today.",
    time: "5 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "absent",
    title: "Absent teacher",
    message: "Ms. Rachel is marked absent for today's session.",
    time: "32 min ago",
    read: false,
  },
  {
    id: "n3",
    type: "success",
    title: "All classes started",
    message: "Every class began on time this morning.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "n4",
    type: "info",
    title: "Weekly report ready",
    message: "The punctuality report for W4 is available to download.",
    time: "3 hours ago",
    read: true,
  },
  {
    id: "n5",
    type: "info",
    title: "Schedule updated",
    message: "Tomorrow's roster has been updated by Admin.",
    time: "Yesterday",
    read: true,
  },
];

export const notificationMeta: Record<
  NotificationType,
  { color: string; bg: string; icon: string }
> = {
  late: { color: "#ff3300", bg: "rgba(255, 51, 0, 0.12)", icon: "schedule" },
  absent: { color: "#ba1a1a", bg: "rgba(186, 26, 26, 0.12)", icon: "person_off" },
  info: { color: "#0066cc", bg: "rgba(0, 102, 204, 0.12)", icon: "info" },
  success: { color: "#339933", bg: "rgba(51, 153, 51, 0.12)", icon: "check_circle" },
};
