import { NumberDifficulty, NumberItem, PlayerAvatar, ChallengeMode } from "./types";

export const NUMBERS_DATA: Record<number, NumberItem> = {
  1: {
    numeral: 1,
    word: "One",
    iconId: "star",
    funFact: "You have 1 nose and 1 mouth!",
    praise: "Number one! Fantastic job!",
  },
  2: {
    numeral: 2,
    word: "Two",
    iconId: "apple",
    funFact: "You have 2 eyes and 2 ears!",
    praise: "Terrific two! That was super fast!",
  },
  3: {
    numeral: 3,
    word: "Three",
    iconId: "balloon",
    funFact: "A triangle has 3 sides!",
    praise: "Three cheers for you! Wonderful!",
  },
  4: {
    numeral: 4,
    word: "Four",
    iconId: "flower",
    funFact: "A lucky clover has 4 leaves!",
    praise: "Fabulous four! You're a math star!",
  },
  5: {
    numeral: 5,
    word: "Five",
    iconId: "star",
    funFact: "High five! You have 5 fingers on each hand!",
    praise: "High five! You got it right!",
  },
  6: {
    numeral: 6,
    word: "Six",
    iconId: "gem",
    funFact: "An insect has 6 little legs!",
    praise: "Super six! You counted them all!",
  },
  7: {
    numeral: 7,
    word: "Seven",
    iconId: "car",
    funFact: "There are 7 colors in a rainbow!",
    praise: "Rainbow seven! Brilliant explorer!",
  },
  8: {
    numeral: 8,
    word: "Eight",
    iconId: "apple",
    funFact: "An octopus has 8 wiggly arms!",
    praise: "Awesome eight! You did it!",
  },
  9: {
    numeral: 9,
    word: "Nine",
    iconId: "balloon",
    funFact: "Nine is almost ten! Great counting!",
    praise: "Neat nine! Spectacular work!",
  },
  10: {
    numeral: 10,
    word: "Ten",
    iconId: "star",
    funFact: "You have 10 fingers and 10 toes!",
    praise: "Perfect ten! Out of this world!",
  },
  11: {
    numeral: 11,
    word: "Eleven",
    iconId: "flower",
    funFact: "One and one make eleven!",
    praise: "Exciting eleven! Keep rockin'!",
  },
  12: {
    numeral: 12,
    word: "Twelve",
    iconId: "gem",
    funFact: "Twelve is called a dozen!",
    praise: "Delicious twelve! You got it!",
  },
  13: {
    numeral: 13,
    word: "Thirteen",
    iconId: "apple",
    funFact: "Thirteen delicious items!",
    praise: "Thirteen! Super smart explorer!",
  },
  14: {
    numeral: 14,
    word: "Fourteen",
    iconId: "balloon",
    funFact: "Fourteen steps along the trail!",
    praise: "Fourteen! You're unstoppable!",
  },
  15: {
    numeral: 15,
    word: "Fifteen",
    iconId: "car",
    funFact: "Three hands of five make fifteen!",
    praise: "Fifteen! Fantastic counting!",
  },
  16: {
    numeral: 16,
    word: "Sixteen",
    iconId: "flower",
    funFact: "Sixteen bright items counted!",
    praise: "Sweet sixteen! Awesome!",
  },
  17: {
    numeral: 17,
    word: "Seventeen",
    iconId: "star",
    funFact: "Seventeen steps along the adventure!",
    praise: "Seventeen! Smooth sailing!",
  },
  18: {
    numeral: 18,
    word: "Eighteen",
    iconId: "gem",
    funFact: "Eighteen speedy steps forward!",
    praise: "Eighteen! Speedy fast!",
  },
  19: {
    numeral: 19,
    word: "Nineteen",
    iconId: "balloon",
    funFact: "Nineteen steps to the trophy!",
    praise: "Nineteen! Ding ding ding, you got it!",
  },
  20: {
    numeral: 20,
    word: "Twenty",
    iconId: "star",
    funFact: "Twenty! Two whole hands and two whole feet!",
    praise: "Champion twenty! You conquered the trail!",
  },
};

export const COUNTING_OBJECTS = [
  { id: "apple", name: "apples", label: "Apples" },
  { id: "star", name: "stars", label: "Stars" },
  { id: "balloon", name: "balloons", label: "Balloons" },
  { id: "flower", name: "flowers", label: "Flowers" },
  { id: "gem", name: "gems", label: "Gems" },
  { id: "car", name: "cars", label: "Cars" },
];

export const DIFFICULTY_RANGES: Record<
  NumberDifficulty,
  { min: number; max: number; label: string; badge: string; desc: string }
> = {
  easy: {
    min: 1,
    max: 5,
    label: "Little Explorers (1–5)",
    badge: "Ages 2–3",
    desc: "First numbers with large counters and gentle audio guidance",
  },
  medium: {
    min: 1,
    max: 10,
    label: "Adventurers (1–10)",
    badge: "Ages 3–4",
    desc: "Count up to 10 with number order and side-by-side comparison",
  },
  explorer: {
    min: 1,
    max: 20,
    label: "Trail Champions (1–20)",
    badge: "Ages 4–6",
    desc: "Explore numbers up to 20 with a bigger challenge",
  },
};

export const MODE_METADATA: Record<
  ChallengeMode,
  { title: string; subtitle: string; badgeColor: string }
> = {
  recognition: {
    title: "Find the Number",
    subtitle: "Identify numerals from speech and visual cues",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  count_match: {
    title: "Count & Match",
    subtitle: "Count objects one-by-one and tap the matching number",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  sequence: {
    title: "What Comes Next?",
    subtitle: "Follow the trail order and fill in the missing stone",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  more_or_less: {
    title: "More or Less?",
    subtitle: "Compare two groups and identify greater or fewer",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
  },
};

export const DEFAULT_AVATARS: PlayerAvatar[] = [
  { id: "lion", name: "Leo Lion", color: "#d97706", bgLight: "#fef3c7", borderColor: "#f59e0b" },
  { id: "bunny", name: "Bella Bunny", color: "#db2777", bgLight: "#fce7f3", borderColor: "#ec4899" },
  { id: "fox", name: "Felix Fox", color: "#ea580c", bgLight: "#ffedd5", borderColor: "#f97316" },
  { id: "panda", name: "Penny Panda", color: "#0284c7", bgLight: "#e0f2fe", borderColor: "#0ea5e9" },
  { id: "frog", name: "Freddy Frog", color: "#15803d", bgLight: "#dcfce7", borderColor: "#22c55e" },
  { id: "penguin", name: "Pip Penguin", color: "#0369a1", bgLight: "#e0f2fe", borderColor: "#38bdf8" },
  { id: "puppy", name: "Poppy Puppy", color: "#a16207", bgLight: "#fef9c3", borderColor: "#eab308" },
  { id: "bear", name: "Barnaby Bear", color: "#4f46e5", bgLight: "#e0e7ff", borderColor: "#6366f1" },
];

export const CHEER_PHRASES = [
  "Awesome counting!",
  "Superstar math explorer!",
  "Great job on the trail!",
  "Look at you go!",
  "Brilliant work!",
  "Stepping forward on the trail!",
  "High five, number master!",
  "Spot on!",
];
