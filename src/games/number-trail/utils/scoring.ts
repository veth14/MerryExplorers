import { GamePlayer } from "../types";

export type ScoreCalculationResult = {
  points: number;
  basePoints: number;
  streakBonus: number;
  speedBonus: number;
  cheerPhrase: string;
};

export function calculateAnswerScore(
  streak: number,
  timeTakenMs: number,
  cheerList: string[] = []
): ScoreCalculationResult {
  const basePoints = 100;
  const streakBonus = streak > 1 ? (streak - 1) * 25 : 0;
  const speedBonus = timeTakenMs < 3000 ? 20 : timeTakenMs < 6000 ? 10 : 0;
  const points = basePoints + streakBonus + speedBonus;

  const phrase =
    cheerList.length > 0
      ? cheerList[Math.floor(Math.random() * cheerList.length)]
      : "Awesome job!";

  return {
    points,
    basePoints,
    streakBonus,
    speedBonus,
    cheerPhrase: phrase,
  };
}

export function rankPlayers(players: GamePlayer[]): GamePlayer[] {
  const sorted = [...players].sort((a, b) => {
    // 1. Primary: Score descending
    if (b.score !== a.score) return b.score - a.score;
    // 2. Secondary: Correct count descending
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    // 3. Tertiary: Mistakes ascending
    return a.mistakesCount - b.mistakesCount;
  });

  return sorted.map((p, idx) => ({
    ...p,
    rank: idx + 1,
  }));
}

