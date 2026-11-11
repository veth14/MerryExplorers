import { NumberDifficulty, NumberItem, PlayerAvatar, ChallengeMode } from "./types";

export const NUMBERS_DATA: Record<number, NumberItem> = {
  1: {
    numeral: 1,
    word: "One",
    dotsEmoji: "⭐",
    funFact: "You have 1 nose and 1 mouth!",
    praise: "Number one! Fantastic job!",
  },
  2: {
    numeral: 2,
    word: "Two",
    dotsEmoji: "👀",
    funFact: "You have 2 eyes and 2 ears!",
    praise: "Terrific two! That was super fast!",
  },
  3: {
    numeral: 3,
    word: "Three",
    dotsEmoji: "🎈",
    funFact: "A triangle has 3 sides!",
    praise: "Three cheers for you! Wonderful!",
  },
  4: {
    numeral: 4,
    word: "Four",
    dotsEmoji: "🍀",
    funFact: "A lucky clover has 4 leaves!",
    praise: "Fabulous four! You're a math star!",
  },
  5: {
    numeral: 5,
    word: "Five",
    dotsEmoji: "✋",
    funFact: "High five! You have 5 fingers on each hand!",
    praise: "High five! You got it right!",
  },
  6: {
    numeral: 6,
    word: "Six",
    dotsEmoji: "🎲",
    funFact: "An insect has 6 little legs!",
    praise: "Super six! You counted them all!",
  },
  7: {
    numeral: 7,
    word: "Seven",
    dotsEmoji: "🌈",
    funFact: "There are 7 colors in a rainbow!",
    praise: "Rainbow seven! Brilliant explorer!",
  },
  8: {
    numeral: 8,
    word: "Eight",
    dotsEmoji: "🐙",
    funFact: "An octopus has 8 wiggly arms!",
    praise: "Awesome eight! You did it!",
  },
  9: {
    numeral: 9,
    word: "Nine",
    dotsEmoji: "🌸",
    funFact: "Nine is almost ten! Great counting!",
    praise: "Neat nine! Spectacular work!",
  },
  10: {
    numeral: 10,
    word: "Ten",
    dotsEmoji: "🔟",
    funFact: "You have 10 fingers and 10 toes!",
    praise: "Perfect ten! Out of this world!",
  },
  11: {
    numeral: 11,
    word: "Eleven",
    dotsEmoji: "🚀",
    funFact: "One and one make eleven!",
    praise: "Exciting eleven! Keep rockin'!",
  },
  12: {
    numeral: 12,
    word: "Twelve",
    dotsEmoji: "🍩",
    funFact: "Twelve is called a dozen!",
    praise: "Delicious twelve! You got it!",
  },
  13: {
    numeral: 13,
    word: "Thirteen",
    dotsEmoji: "🍓",
    funFact: "Thirteen delicious strawberries!",
    praise: "Thirteen! Super smart explorer!",
  },
  14: {
    numeral: 14,
    word: "Fourteen",
    dotsEmoji: "🦋",
    funFact: "Fourteen fluttering butterflies!",
    praise: "Fourteen! You're unstoppable!",
  },
  15: {
    numeral: 15,
    word: "Fifteen",
    dotsEmoji: "🍎",
    funFact: "Three hands of five make fifteen!",
    praise: "Fifteen! Fantastic counting!",
  },
  16: {
    numeral: 16,
    word: "Sixteen",
    dotsEmoji: "🧁",
    funFact: "Sweet sixteen little cupcakes!",
    praise: "Sweet sixteen! Awesome!",
  },
  17: {
    numeral: 17,
    word: "Seventeen",
    dotsEmoji: "⛵",
    funFact: "Seventeen boats sailing across the lake!",
    praise: "Seventeen! Smooth sailing!",
  },
  18: {
    numeral: 18,
    word: "Eighteen",
    dotsEmoji: "🚗",
    funFact: "Eighteen zooming little race cars!",
    praise: "Eighteen! Speedy fast!",
  },
  19: {
    numeral: 19,
    word: "Nineteen",
    dotsEmoji: "🔔",
    funFact: "Nineteen ringing little bells!",
    praise: "Nineteen! Ding ding ding, you got it!",
  },
  20: {
    numeral: 20,
    word: "Twenty",
    dotsEmoji: "🏆",
    funFact: "Twenty! Two whole hands and two whole feet!",
    praise: "Champion twenty! You conquered the trail!",
  },
};

export const COUNTING_OBJECTS = [
  { emoji: "🍎", name: "apples" },
  { emoji: "⭐", name: "stars" },
  { emoji: "🎈", name: "balloons" },
  { emoji: "🐱", name: "kittens" },
  { emoji: "🚗", name: "cars" },
  { emoji: "🍓", name: "berries" },
  { emoji: "🧁", name: "cupcakes" },
  { emoji: "🐸", name: "frogs" },
  { emoji: "🐠", name: "fish" },
  { emoji: "🦋", name: "butterflies" },
];

export const DIFFICULTY_RANGES: Record<NumberDifficulty, { min: number; max: number; label: string; badge: string; desc: string }> = {
  easy: {
    min: 1,
    max: 5,
    label: "Little Explorers (1–5)",
    badge: "Ages 2–3",
    desc: "First numbers with big counters and gentle prompts",
  },
  medium: {
    min: 1,
    max: 10,
    label: "Adventurers (1–10)",
    badge: "Ages 3–4",
    desc: "Count up to 10 with sequencing and comparisons",
  },
  explorer: {
    min: 1,
    max: 20,
    label: "Trail Champions (1–20)",
    badge: "Ages 4–6",
    desc: "Full number mastery up to 20 for advanced learners",
  },
};

export const MODE_METADATA: Record<
  ChallengeMode,
  { title: string; subtitle: string; icon: string; badgeColor: string }
> = {
  recognition: {
    title: "Find the Number",
    subtitle: "Listen or read the number and spot the matching card",
    icon: "🔢",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
  },
  count_match: {
    title: "Count & Match",
    subtitle: "Count the cute items on screen and pick the total",
    icon: "🍎",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  sequence: {
    title: "What Comes Next?",
    subtitle: "Follow the trail order and fill in the missing number",
    icon: "👣",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
  },
  more_or_less: {
    title: "More or Less?",
    subtitle: "Compare two groups of items and pick the winner",
    icon: "⚖️",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
  },
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
];

export const CHEER_PHRASES = [
  "Awesome counting!",
  "Superstar math explorer!",
  "You're amazing!",
  "Great job on the trail!",
  "Look at you go!",
  "Brilliant!",
  "Woohoo! Stepping forward!",
  "Spectacular!",
  "High five, number master!",
];
