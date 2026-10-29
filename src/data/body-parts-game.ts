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

export const BODY_PARTS: BodyPartItem[] = [
  {
    id: "head",
    name: "Head",
    emoji: "👦",
    category: "face",
    hint: "Your head is at the top.",
    actionPrompt: "Touch your head!",
    praise: "Smart thinking! That's the head!",
  },
  {
    id: "hair",
    name: "Hair",
    emoji: "💇",
    category: "face",
    hint: "Your hair grows on your head.",
    actionPrompt: "Touch your hair!",
    praise: "You got it! Silly soft hair!",
  },
  {
    id: "eyes",
    name: "Eyes",
    emoji: "👀",
    category: "face",
    hint: "Your eyes help you see.",
    actionPrompt: "Point to your eyes!",
    praise: "Super vision! Those are the eyes!",
  },
  {
    id: "ears",
    name: "Ears",
    emoji: "👂",
    category: "face",
    hint: "Your ears help you hear.",
    actionPrompt: "Touch your ears!",
    praise: "Great listening! Those are the ears!",
  },
  {
    id: "nose",
    name: "Nose",
    emoji: "👃",
    category: "face",
    hint: "Your nose helps you smell.",
    actionPrompt: "Point to your nose!",
    praise: "Beep beep! You found the nose!",
  },
  {
    id: "mouth",
    name: "Mouth",
    emoji: "👄",
    category: "face",
    hint: "Your mouth helps you talk and eat.",
    actionPrompt: "Open your mouth and smile!",
    praise: "Big smile! That is the mouth!",
  },
  {
    id: "shoulders",
    name: "Shoulders",
    emoji: "🥋",
    category: "upper",
    hint: "Your shoulders are below your neck.",
    actionPrompt: "Lift your shoulders!",
    praise: "Strong explorer shoulders!",
  },
  {
    id: "arms",
    name: "Arms",
    emoji: "💪",
    category: "upper",
    hint: "Your arms help you reach and hug.",
    actionPrompt: "Wave your arms!",
    praise: "Hooray! Big hug arms!",
  },
  {
    id: "elbows",
    name: "Elbows",
    emoji: "🦾",
    category: "upper",
    hint: "Your elbows help your arms bend.",
    actionPrompt: "Bend your elbows!",
    praise: "Bendy and fun! Those are elbows!",
  },
  {
    id: "hands",
    name: "Hands",
    emoji: "✋",
    category: "upper",
    hint: "Your hands help you clap and play.",
    actionPrompt: "Clap your hands!",
    praise: "High five! You found the hands!",
  },
  {
    id: "knees",
    name: "Knees",
    emoji: "🦵",
    category: "lower",
    hint: "Your knees help your legs bend.",
    actionPrompt: "Bend your knees!",
    praise: "Boing boing! Those are the knees!",
  },
  {
    id: "feet",
    name: "Feet",
    emoji: "👟",
    category: "lower",
    hint: "Your feet help you stand and walk.",
    actionPrompt: "Stomp your feet!",
    praise: "Stomp stomp! You found the feet!",
  },
];

export type PlayerAvatar = {
  emoji: string;
  name: string;
  color: string;
  bgLight: string;
  borderColor: string;
};

export const DEFAULT_AVATARS: PlayerAvatar[] = [
  { emoji: "🦁", name: "Leo Lion", color: "#d97706", bgLight: "#fef3c7", borderColor: "#f59e0b" },
  { emoji: "🐰", name: "Bella Bunny", color: "#db2777", bgLight: "#fce7f3", borderColor: "#ec4899" },
  { emoji: "🦊", name: "Felix Fox", color: "#ea580c", bgLight: "#ffedd5", borderColor: "#f97316" },
  { emoji: "🐼", name: "Penny Panda", color: "#0284c7", bgLight: "#e0f2fe", borderColor: "#0ea5e9" },
  { emoji: "🐻", name: "Barnaby Bear", color: "#4f46e5", bgLight: "#e0e7ff", borderColor: "#6366f1" },
  { emoji: "🐯", name: "Toby Tiger", color: "#059669", bgLight: "#d1fae5", borderColor: "#10b981" },
  { emoji: "🐶", name: "Poppy Puppy", color: "#a16207", bgLight: "#fef9c3", borderColor: "#eab308" },
  { emoji: "🐱", name: "Mittens Cat", color: "#7c3aed", bgLight: "#ede9fe", borderColor: "#8b5cf6" },
  { emoji: "🐨", name: "Koko Koala", color: "#475569", bgLight: "#e2e8f0", borderColor: "#64748b" },
  { emoji: "🦄", name: "Sunny Unicorn", color: "#c026d3", bgLight: "#fae8ff", borderColor: "#d946ef" },
  { emoji: "🐸", name: "Freddy Frog", color: "#15803d", bgLight: "#dcfce7", borderColor: "#22c55e" },
  { emoji: "🐧", name: "Pip Penguin", color: "#0369a1", bgLight: "#e0f2fe", borderColor: "#38bdf8" },
  { emoji: "🐢", name: "Tilly Turtle", color: "#047857", bgLight: "#d1fae5", borderColor: "#34d399" },
  { emoji: "🦒", name: "Gigi Giraffe", color: "#b45309", bgLight: "#fef3c7", borderColor: "#fbbf24" },
  { emoji: "🐵", name: "Momo Monkey", color: "#9a3412", bgLight: "#ffedd5", borderColor: "#fb923c" },
  { emoji: "🐬", name: "Dolly Dolphin", color: "#0369a1", bgLight: "#e0f2fe", borderColor: "#0ea5e9" },
  { emoji: "🦉", name: "Olive Owl", color: "#6d28d9", bgLight: "#ede9fe", borderColor: "#a78bfa" },
  { emoji: "🦋", name: "Bibi Butterfly", color: "#be185d", bgLight: "#fce7f3", borderColor: "#f472b6" },
  { emoji: "🐳", name: "Wally Whale", color: "#1d4ed8", bgLight: "#dbeafe", borderColor: "#60a5fa" },
  { emoji: "🐝", name: "Bea Bee", color: "#a16207", bgLight: "#fef9c3", borderColor: "#facc15" },
];

export const CHEER_PHRASES = [
  "Awesome job!",
  "Superstar!",
  "You're amazing!",
  "Great eye!",
  "Fantastic explorer!",
  "Brilliant!",
  "Woohoo!",
  "Spectacular!",
];

