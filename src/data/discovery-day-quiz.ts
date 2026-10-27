export type DiscoveryQuestionSection = "curious" | "creative" | "trailblazer";

export const DISCOVERY_DAY_QUESTIONS: Array<{
  section: DiscoveryQuestionSection;
  prompt: string;
  highlight: string;
}> = [
  { section: "curious", prompt: "{name} is new to structured learning or classroom experiences?", highlight: "new to structured learning" },
  { section: "curious", prompt: "{name} needs frequent guidance or encouragement to participate?", highlight: "frequent guidance" },
  { section: "curious", prompt: "{name} needs their guardian nearby to feel secure in a new environment?", highlight: "guardian nearby" },
  { section: "curious", prompt: "{name} needs more time to adjust before joining an activity?", highlight: "more time to adjust" },
  { section: "curious", prompt: "{name} benefits from additional adult attention during learning activities?", highlight: "additional adult attention" },
  { section: "creative", prompt: "{name} can enter and participate without needing a guardian beside them?", highlight: "without needing a guardian" },
  { section: "creative", prompt: "{name} can engage with a teacher independently?", highlight: "independently" },
  { section: "creative", prompt: "{name} can participate in an activity with minimal assistance?", highlight: "minimal assistance" },
  { section: "creative", prompt: "{name} can follow simple instructions during the activity?", highlight: "follow simple instructions" },
  { section: "creative", prompt: "If upset, {name} can calm or self-pacify within approx. 3 minutes?", highlight: "calm or self-pacify" },
  { section: "trailblazer", prompt: "{name} can sit independently without being held?", highlight: "sit independently" },
  { section: "trailblazer", prompt: "{name} can remain seated and reasonably still for approx. 3 minutes?", highlight: "remain seated" },
  { section: "trailblazer", prompt: "{name} can grip and manipulate age-appropriate learning materials?", highlight: "grip and manipulate" },
  { section: "trailblazer", prompt: "{name} is comfortable participating in a classroom setup?", highlight: "comfortable participating" },
  { section: "trailblazer", prompt: "{name} can stay engaged in a teacher-led activity for a short period?", highlight: "stay engaged" },
];
