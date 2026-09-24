// Content for the public landing page. Centralized so copy is easy to tweak.

export const NAV_LINKS = [
  { label: "About Us", href: "/#about" },
  { label: "Mission", href: "/#mission" },
  { label: "Programs", href: "/#programs" },
  { label: "Uniform", href: "/#uniform" },
  { label: "Inquire", href: "/inquire" },
] as const;

export const HIGHLIGHTS = [
  {
    title: "Small Group Learning",
    description:
      "Intimate class sizes so every child gets the focused attention they deserve.",
    icon: "book",
  },
  {
    title: "Caring Teachers",
    description:
      "Dedicated, warm educators who nurture every child's potential with heart.",
    icon: "heart",
  },
  {
    title: "Safe & Nurturing Environment",
    description:
      "A secure, child-friendly space where little ones explore with full confidence.",
    icon: "shield",
  },
  {
    title: "Purposeful Play",
    description:
      "Age-appropriate activities designed to spark curiosity and build real skills.",
    icon: "puzzle",
  },
] as const;

export const STATS = [
  { value: "500+", label: "Happy Families" },
  { value: "15", label: "Years of Care" },
  { value: "25", label: "Expert Teachers" },
  { value: "100%", label: "Loved by Parents" },
] as const;

export const PROGRAMS = [
  {
    name: "Discovery Club: Curious Explorer",
    ageRange: "Ages 1.5 – 4.11",
    summary:
      "A gentle, guided class for little ones who are new to learning, still need a guardian, and are slowly transitioning to a learning environment.",
    highlights: ["Small group setting", "Guardian-assisted", "Transitional learning"],
    accent: "#FFC107",
    accentSoft: "#FFF3CD",
    icon: "blocks",
  },
  {
    name: "Discovery Club: Creative Explorer",
    ageRange: "Ages 2.6 – 4.11",
    summary:
      "Hands-on, engaging activities that spark curiosity and build foundational skills through play, exploration and discovery.",
    highlights: ["Play-based learning", "Creative exploration", "Skill building"],
    accent: "#0033A0",
    accentSoft: "#E1ECFF",
    icon: "rocket",
  },
  {
    name: "Trailblazer: Brave Explorer",
    ageRange: "Ages 3 – 4.11",
    summary:
      "A longer, richer experience designed to build confidence, independence and a love for learning, with a more structured approach and daily routines.",
    highlights: ["School readiness", "Daily structure", "Explorer journal"],
    accent: "#1a2e6b",
    accentSoft: "#e8ecf8",
    icon: "rocket",
  },
  {
    name: "Discovery Club: Everyday Curious",
    ageRange: "Ages 1.5 – 4.11",
    summary:
      "Curious Explorer Program, but make it daily! More play, more learning, more opportunities every day — a different theme each weekday afternoon.",
    highlights: ["Mon–Fri afternoon", "14 sessions", "Daily themed learning"],
    accent: "#22c55e",
    accentSoft: "#dcfce7",
    icon: "blocks",
  },
  {
    name: "Saturday Playdate",
    ageRange: "Little Explorers",
    summary:
      "A fun and engaging play experience for little explorers on their weekend adventure! Play, explore, and make friends.",
    highlights: ["Creative Play", "Hands-on Activities", "New Discoveries"],
    accent: "#0ea5e9",
    accentSoft: "#e0f2fe",
    icon: "puzzle",
  },
  {
    name: "Ballet",
    ageRange: "Ages 3 – 12",
    summary:
      "A graceful and fun program that builds strong foundations in technique, coordination, and creativity.",
    highlights: ["Technique", "Coordination", "Creativity"],
    accent: "#E91E8C",
    accentSoft: "#FCE4F5",
    icon: "heart",
  },
] as const;

export const MOMENTS = [
  {
    caption: "Curious Minds",
    description: "Hands-on discovery every single day.",
    color: "#FFC107",
  },
  {
    caption: "Big Smiles",
    description: "Laughter is the soundtrack of our classrooms.",
    color: "#FF8A3D",
  },
  {
    caption: "Growing Together",
    description: "Friendships and milestones, side by side.",
    color: "#0033A0",
  },
] as const;

export const MISSION_VISION_PURPOSE = [
  {
    id: "mission",
    emoji: "🌟",
    label: "Mission",
    title: "Our Mission",
    body: "To provide a joyful and nurturing learning environment where children are encouraged to never stop exploring, develop curiosity and kindness, celebrate their uniqueness, and faithfully grow in the God-given talents and abilities entrusted to them—because what they learn today shapes tomorrow.",
    accent: "#0033A0",
    accentSoft: "#E1ECFF",
  },
  {
    id: "vision",
    emoji: "🌍",
    label: "Vision",
    title: "Our Vision",
    body: "To raise confident young explorers who dream boldly, discover joyfully, appreciate the wonders of God's creation, and grow into individuals ready to make a difference in the world.",
    accent: "#FFB800",
    accentSoft: "#FFF8E1",
  },
  {
    id: "purpose",
    emoji: "⭐",
    label: "Purpose",
    title: "Our Purpose",
    body: "Merry Explorers exists to guide children to become curious thinkers, compassionate hearts, and courageous learners who recognize their God-given potential, appreciate His creation, and confidently use their gifts to bless others and help change the world.",
    accent: "#0066CC",
    accentSoft: "#EDF4FF",
  },
] as const;

export const UNIFORM = {
  image: "/uniform_updated.jpg",
  items: [
    "Polo Shirt with Logo",
    "Blue Jogging Pants",
    "Name Tag with Lanyard (ID)",
  ],
  uniformDays: "Wednesday & Friday",
  sameUniformNote: "If your child already has a uniform from a previous adventure, you are not required to purchase a new set for Adventure 1.",
} as const;

export const BALLET = {
  name: "Ballet",
  emoji: "🩰",
  accent: "#C2185B",
  accentSoft: "#FCE4EC",
  classes: [
    {
      name: "Baby Ballet",
      time: "12:30 PM – 1:30 PM",
      ageRange: "Ages 2.5 to 4.11",
      description: "A fun and gentle introduction to ballet through movement, music and imagination!",
    },
    {
      name: "Basic Ballet",
      time: "1:45 PM – 2:45 PM",
      ageRange: "Ages 5+",
      description: "Builds strong foundations in technique, coordination and creativity.",
    },
  ],
  schedule: "Every Saturday until November 21",
  rate: {
    perSession: "₱550 per session",
    downpayment: "₱2,750",
    downpaymentNote: "To confirm a slot, only 5 prepaid sessions (₱2,750) are required.",
    paymentMethods: "Non-refundable via Bank Transfer, Mari Bank, BPI, or GCash.",
  },
  recital: {
    title: "2026 Ballet Recital on November 28",
    kitPrice: "₱1,500",
    kitDetails: "Recital kit preorder starts on October 3. Inclusive of 2 guest passes, 1 mini bouquet, and 1 set of costume.",
    note: "Recital kit is required to participate in the group themed performance.",
  },
} as const;

export const PROGRAM_SLOTS = {
  "curious-explorer": {
    id: "curious-explorer",
    name: "Discovery Club: Curious Explorer",
    ageRange: "Ages 1.5 – 4.11",
    schedule: "Monday & Wednesday",
    sessions: 8,
    totalSlots: 8,
    rate: 4295,
    downpayment: 2577,
    balance: 1718,
    accent: "#FFC107",
    accentSoft: "#FFF3CD",
    icon: "🔎",
    prerequisite: null,
    classes: [
      { name: "Morning Class", time: "9:45 AM – 11:00 AM", maxSlots: 4 },
      { name: "Afternoon Class", time: "1:30 PM – 2:45 PM", maxSlots: 4 },
    ],
  },
  "everyday-curious": {
    id: "everyday-curious",
    name: "Discovery Club: Everyday Curious",
    ageRange: "Ages 1.5 – 4.11",
    schedule: "Monday – Friday",
    sessions: 14,
    totalSlots: 4,
    rate: 7518,
    downpayment: 4511,
    balance: 3007,
    accent: "#22c55e",
    accentSoft: "#dcfce7",
    icon: "🌈",
    prerequisite: null,
    classes: [
      { name: "Afternoon Class", time: "4:25 PM – 5:25 PM", maxSlots: 4 },
    ],
  },
  "creative-explorer": {
    id: "creative-explorer",
    name: "Discovery Club: Creative Explorer",
    ageRange: "Ages 2.6 – 4.11",
    schedule: "Tuesday, Thursday & Friday",
    sessions: 12,
    totalSlots: 18,
    rate: 4820,
    downpayment: 2892,
    balance: 1928,
    accent: "#0033A0",
    accentSoft: "#E1ECFF",
    icon: "🎨",
    prerequisite: "Child must be able to stay independently with Teacher during sessions without a guardian.",
    classes: [
      { name: "Morning Class", time: "9:45 AM – 11:00 AM", maxSlots: 6 },
      { name: "Mid-Day Class", time: "11:15 AM – 12:30 PM", maxSlots: 6 },
      { name: "Afternoon Class", time: "1:30 PM – 2:45 PM", maxSlots: 6 },
    ],
  },
  "brave-explorer": {
    id: "brave-explorer",
    name: "Trailblazer: Brave Explorer",
    ageRange: "Ages 3 – 4.11",
    schedule: "Monday – Friday",
    sessions: 18,
    totalSlots: 6,
    rate: 6900,
    downpayment: 4140,
    balance: 2760,
    accent: "#1a2e6b",
    accentSoft: "#e8ecf8",
    icon: "💡",
    prerequisite: null,
    classes: [
      { name: "Afternoon Class", time: "3:00 PM – 4:15 PM", maxSlots: 6 },
    ],
  },
  "ballet": {
    id: "ballet",
    name: "Ballet",
    ageRange: "Ages 3 – 12",
    schedule: "Every Saturday until Nov 21",
    sessions: 8,
    totalSlots: 15,
    rate: 4400,
    downpayment: 2750,
    balance: 1650,
    accent: "#E91E8C",
    accentSoft: "#FCE4F5",
    icon: "🩰",
    prerequisite: null,
    classes: [
      { name: "Baby Ballet", time: "12:30 PM – 1:30 PM", maxSlots: 7 },
      { name: "Basic Ballet", time: "1:45 PM – 2:45 PM", maxSlots: 8 },
    ],
  },
  "saturday-playdate": {
    id: "saturday-playdate",
    name: "Saturday Playdate",
    ageRange: "Little Explorers",
    schedule: "Saturdays",
    sessions: 5,
    totalSlots: 10,
    rate: 2190,
    downpayment: 1314,
    balance: 876,
    accent: "#0ea5e9",
    accentSoft: "#e0f2fe",
    icon: "🛝",
    prerequisite: null,
    classes: [
      { name: "Morning Class", time: "10:30 AM – 11:45 AM", maxSlots: 10 },
    ],
  },
} as const;

export const PAYMENT_TERMS = {
  downpaymentPct: 60,
  balancePct: 40,
  balanceDue: "6th session",
  interestRate: "4% per week (every Monday)",
  methods: ["Mari Bank", "BPI", "GCash"],
  nonRefundable: true,
} as const;

export const UNIFORM_KIT = {
  welcomeKitPrice: 750,    // Welcome Kit = Uniform Set + Lanyard & Name Tag (required for new families)
  price: 550,              // Uniform Set only (polo + jogging pants), NO lanyard — for returning families
  lanyardPrice: 200,       // Lanyard & Name Tag only, optional
  welcomeKitItems: ["Polo Shirt with Logo", "Blue Jogging Pants", "Merry Explorers Lanyard", "Name Tag"],
  items: ["Polo Shirt with Logo", "Blue Jogging Pants"],
  lanyardItems: ["Merry Explorers Lanyard", "Name Tag"],
  note: "New families are required to get the Welcome Kit. Returning families may purchase add-ons optionally.",
  uniformDays: "Wednesday & Friday",
  otherDaysNote: "On all other days, children may wear anything comfortable, safe, and appropriate for active play and learning.",
} as const;

