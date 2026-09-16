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
  image: "/uniform.png",
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
  day: "Every Saturday",
  time: "9:00 AM – 10:00 AM",
  sessions: 10,
  feature: "Ends with a Mini-Performance 🎭",
  accent: "#C2185B",
  accentSoft: "#FCE4EC",
} as const;
