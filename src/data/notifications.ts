export type NotificationType = "late" | "absent" | "info" | "success";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export const notifications: any[] = [];

export const notificationMeta: Record<
  NotificationType,
  { color: string; bg: string; icon: string }
> = {
  late: { color: "#ff3300", bg: "rgba(255, 51, 0, 0.12)", icon: "schedule" },
  absent: { color: "#ba1a1a", bg: "rgba(186, 26, 26, 0.12)", icon: "person_off" },
  info: { color: "#0066cc", bg: "rgba(0, 102, 204, 0.12)", icon: "info" },
  success: { color: "#339933", bg: "rgba(51, 153, 51, 0.12)", icon: "check_circle" },
};
