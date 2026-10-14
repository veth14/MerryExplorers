import type { Metadata } from "next";
import { DiscoveryQuiz } from "./DiscoveryQuiz";

export const metadata: Metadata = {
  title: "Discovery Day Quiz — Merry Explorers",
  description:
    "Find the perfect program for your little explorer. Answer a few questions to discover whether Curious Explorer, Creative Explorer, or Trailblazer is the best fit for your child.",
};

export default function DiscoveryDayPage() {
  return <DiscoveryQuiz />;
}
