// Content for the public landing page. Centralized so copy is easy to tweak.

export const NAV_LINKS = [
  { label: "About Us", href: "/#about" },
  { label: "Programs", href: "/#programs" },
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
    title: "Fun Activities",
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
