import { NumberTrailWorkspace } from "@/games/number-trail";

export const metadata = {
  title: "Number Trail Adventure | Admin | Merry Explorers",
  description: "Preschool number recognition and counting game for classroom play and activity analytics.",
};

export default function AdminNumberTrailPage() {
  return <NumberTrailWorkspace mode="admin" />;
}

