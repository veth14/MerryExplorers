export type BodyPartId =
  | "head"
  | "hair"
  | "eyes"
  | "ears"
  | "nose"
  | "mouth"
  | "shoulders"
  | "arms"
  | "elbows"
  | "hands"
  | "knees"
  | "feet";

export type BodyPartItem = {
  id: BodyPartId;
  name: string;
  emoji: string;
  category: "face" | "upper" | "lower";
  hint: string;
  actionPrompt: string;
  praise: string;
};

export type PlayerAvatar = {
  emoji: string;
  name: string;
  color: string;
  bgLight: string;
  borderColor: string;
};

export type GamePlayer = {
  studentId: string | null;
  name: string;
  avatar: string;
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
  isTestAccount?: boolean;
};

export type TrailblazerStudent = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  fullName: string;
  displayName: string;
  program: string;
  status: string;
  isTestAccount?: boolean;
};

export type GameSessionRecord = {
  id: string;
  gameTitle: string;
  roundsTotal: number;
  playersCount: number;
  players: GamePlayer[];
  winner: GamePlayer | null;
  notes?: string;
  playedAt: string;
  recordedByEmail?: string;
};

