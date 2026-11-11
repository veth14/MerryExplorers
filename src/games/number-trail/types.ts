export type NumberDifficulty = "easy" | "medium" | "explorer";

export type ChallengeMode =
  | "recognition"
  | "count_match"
  | "sequence"
  | "more_or_less";

export type NumberItem = {
  numeral: number; // 1 to 20
  word: string; // "One", "Two", etc.
  iconId: string; // "apple", "star", etc.
  funFact: string; // kid-friendly fact
  praise: string; // celebration phrase
};

export type NumberChoice = {
  id: string; // unique key
  numeral: number;
  label?: string;
  sublabel?: string;
  isCorrect: boolean;
};

export type SequenceItem = {
  value: number | null; // null = blank / missing spot
  display: string; // "1", "2", or "?"
};

export type ComparisonGroup = {
  id: "A" | "B";
  count: number;
  iconId: string;
  label: string;
};

export type NumberChallenge = {
  id: string;
  mode: ChallengeMode;
  targetNumber: number;
  targetWord?: string;
  promptText: string;
  spokenPrompt: string;
  choices: NumberChoice[];
  // Mode-specific extras:
  dotCount?: number;
  dotIconId?: string;
  sequence?: SequenceItem[];
  missingIndex?: number;
  comparison?: {
    groupA: ComparisonGroup;
    groupB: ComparisonGroup;
    comparisonType: "more" | "less";
    correctGroupId: "A" | "B";
  };
};

export type PlayerAvatar = {
  id: string;
  name: string;
  color: string;
  bgLight: string;
  borderColor: string;
};

export type GamePlayer = {
  studentId: string | null;
  name: string;
  avatar: string; // avatar identifier or icon id
  petName: string;
  color: string;
  bgLight: string;
  borderColor: string;
  score: number;
  correctCount: number;
  mistakesCount: number;
  streak: number;
  maxStreak: number;
  rank?: number;
};

export type TrailblazerStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  fullName: string;
  displayName: string;
  gender?: string;
  favoriteColor?: string | null;
  favoriteCharacter?: string | null;
  program: string;
  status: string;
};

export type GamePhase = "setup" | "playing" | "racing" | "game_over";

export type GameSessionRecord = {
  id: string;
  gameType: string;
  gameTitle: string;
  roundsTotal: number;
  playersCount: number;
  players: GamePlayer[];
  winner: GamePlayer | null;
  notes?: string;
  playedAt: string;
  recordedByEmail?: string;
};

export type LeaderboardEntry = {
  name: string;
  avatar: string;
  totalStars: number;
  gamesPlayed: number;
  wins: number;
};
