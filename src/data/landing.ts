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
    title: "Smart Storytelling",
    description:
      "Interactive tales that spark imagination and build early language skills.",
    icon: "book",
  },
  {
    title: "Caring Teachers",
    description:
      "Warm, certified educators who nurture every child's potential.",
    icon: "heart",
  },
  {
    title: "Age-Appropriate Learning Activities",
    description:
      "Play-based learning designed to delight curious little minds.",
    icon: "puzzle",
  },
  {
    title: "Safe Environment",
    description:
      "Secure, child-proofed spaces where kids explore with confidence.",
    icon: "shield",
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
    name: "Tiny Explorers",
    ageRange: "Ages 2 – 3",
    summary:
      "A gentle first step into school life — sensory play, songs, and cozy routines that help toddlers feel secure and curious.",
    highlights: ["Sensory & motor play", "Music & movement", "Social beginnings"],
    accent: "#FFC107",
    accentSoft: "#FFF3CD",
    icon: "blocks",
  },
  {
    name: "Little Explorers",
    ageRange: "Ages 4 – 5",
    summary:
      "Where curiosity blooms into confidence — phonics, numbers, and creative projects that prepare children for big-kid school.",
    highlights: ["Early literacy & math", "STEM discovery", "Confidence building"],
    accent: "#0033A0",
    accentSoft: "#E1ECFF",
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
  image: "/uniform.jpg",
  price: "₱550",
  unit: "/ set",
  items: ["Polo Shirt", "Jogging Pants"],
  note: "Optional",
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

