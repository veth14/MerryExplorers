import { BodyPartsExplorerWorkspace } from "@/games/body-parts";

export const metadata = {
  title: "Body Parts Adventure | Teacher | Merry Explorers",
  description: "Explore body parts through picture choices and interactive body map.",
};

export default function TeacherBodyPartsGamePage() {
  return <BodyPartsExplorerWorkspace mode="teacher" />;
}
