import { NumberTrailWorkspace } from "@/games/number-trail";

export const metadata = {
  title: "Number Trail Adventure | Teacher | Merry Explorers",
  description: "Preschool number recognition and counting game for classroom play.",
};

export default function TeacherNumberTrailPage() {
  return <NumberTrailWorkspace mode="teacher" />;
}
