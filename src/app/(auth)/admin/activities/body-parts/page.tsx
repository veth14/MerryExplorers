import { BodyPartsExplorerWorkspace } from "@/games/body-parts";

export const metadata = {
  title: "Body Parts Adventure | Admin | Merry Explorers",
  description: "Explore body parts through picture choices and interactive body map with analytics.",
};

export default function BodyPartsGamePage() {
  return <BodyPartsExplorerWorkspace mode="admin" />;
}
