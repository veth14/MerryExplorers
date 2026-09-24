"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  EmojiPalette,
  EmojiMagnifyingGlass,
  EmojiLightbulb,
} from "@/components/landing/icons";

// ── Types ─────────────────────────────────────────────────────────────────────
type SectionKey = "curious" | "creative" | "trailblazer";
type QuizPhase = "intro" | "child-info" | "question" | "email-capture" | "result";

// ── Section Metadata ──────────────────────────────────────────────────────────
const SECTION_META = {
  curious: {
    title: "Curious Explorer",
    subtitle: "Discovery Club · Supported Learning",
    ageLabel: "Ages 1.6 – 4.11 years",
    accentColor: "#7DD3FC",
    bgCard: "#F0F9FF",
    Icon: EmojiMagnifyingGlass,
  },
  creative: {
    title: "Creative Explorer",
    subtitle: "Discovery Club · Independent Learning",
    ageLabel: "Ages 2.6 – 4.11 years",
    accentColor: "#FDE261",
    bgCard: "#FFFDF0",
    Icon: EmojiPalette,
  },
  trailblazer: {
    title: "Trailblazer",
    subtitle: "Brave Explorer · Classroom Readiness",
    ageLabel: "Ages 3 – 4.11 years",
    accentColor: "#A5F3FC",
    bgCard: "#F0FDFF",
    Icon: EmojiLightbulb,
  },
} satisfies Record<SectionKey, any>;

// ── Highlight Component ───────────────────────────────────────────────────────
const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-block whitespace-nowrap z-10 px-1">
    <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FDE261] -z-10 -rotate-1 rounded-sm" />
    <span className="text-[#0033A0]">{children}</span>
  </span>
);

// ── Questions (Flat Array for seamless flow) ──────────────────────────────────
// Using a function to inject the child's name dynamically and React Nodes for styling
const getQuestions = (name: string): { section: SectionKey, text: React.ReactNode }[] => [
  // Curious (0 - 4)
  { section: "curious", text: <>Is {name} <Highlight>new to structured learning</Highlight> or classroom experiences?</> },
  { section: "curious", text: <>Does {name} need <Highlight>frequent guidance</Highlight> or encouragement to participate?</> },
  { section: "curious", text: <>Does {name} need their <Highlight>guardian nearby</Highlight> to feel secure in a new environment?</> },
  { section: "curious", text: <>Does {name} need <Highlight>more time to adjust</Highlight> before joining an activity?</> },
  { section: "curious", text: <>Does {name} benefit from <Highlight>additional adult attention</Highlight> during learning activities?</> },
  
  // Creative (5 - 9)
  { section: "creative", text: <>Can {name} enter and participate <Highlight>without needing a guardian</Highlight> beside them?</> },
  { section: "creative", text: <>Can {name} engage with a teacher <Highlight>independently?</Highlight></> },
  { section: "creative", text: <>Can {name} participate in an activity with <Highlight>minimal assistance?</Highlight></> },
  { section: "creative", text: <>Can {name} <Highlight>follow simple instructions</Highlight> during the activity?</> },
  { section: "creative", text: <>If upset, can {name} <Highlight>calm or self-pacify</Highlight> within approx. 3 minutes?</> },
  
  // Trailblazer (10 - 14)
  { section: "trailblazer", text: <>Can {name} <Highlight>sit independently</Highlight> without being held?</> },
  { section: "trailblazer", text: <>Can {name} <Highlight>remain seated</Highlight> and reasonably still for approx. 3 minutes?</> },
  { section: "trailblazer", text: <>Can {name} <Highlight>grip and manipulate</Highlight> age-appropriate learning materials?</> },
  { section: "trailblazer", text: <>Is {name} <Highlight>comfortable participating</Highlight> in a classroom setup?</> },
  { section: "trailblazer", text: <>Can {name} <Highlight>stay engaged</Highlight> in a teacher-led activity for a short period?</> },
];

// ── Answer Options (Dynamic based on question type) ───────────────────────────
const getOptions = (section: SectionKey) => {
  if (section === "curious") {
    // Curious questions ask if the child *needs* support or is new to schooling
    return [
      { value: 2, label: "Yes", sublabel: "Often / Very much", emoji: "⭐", activeBorder: "#0F006E", activeBg: "#EEF0FF" },
      { value: 1, label: "Sometimes", sublabel: "Occasionally", emoji: "🌱", activeBorder: "#C49B00", activeBg: "#FEFCE8" },
      { value: 0, label: "No", sublabel: "Rarely / Not at all", emoji: "💭", activeBorder: "#94A3B8", activeBg: "#F8FAFC" },
    ];
  }
  // Creative and Trailblazer questions ask about the child's *abilities* and independence
  return [
    { value: 2, label: "Yes", sublabel: "Does this comfortably", emoji: "⭐", activeBorder: "#0F006E", activeBg: "#EEF0FF" },
    { value: 1, label: "Sometimes", sublabel: "With some help", emoji: "🌱", activeBorder: "#C49B00", activeBg: "#FEFCE8" },
    { value: 0, label: "Not Yet", sublabel: "Needs significant support", emoji: "💭", activeBorder: "#94A3B8", activeBg: "#F8FAFC" },
  ];
};

// ── Result descriptions ───────────────────────────────────────────────────────
const RESULT_COPY: Record<SectionKey, Record<string, string>> = {
  curious: {
    strong: "Your little explorer thrives in a nurturing environment where they can learn at their own pace with guidance and the reassurance of having their guardian nearby.",
    developing: "Your child may benefit from additional support while gradually building independence toward a more independent program.",
    low: "Your child shows some independence already. Based on their other scores and age, a more independent program may be a better fit.",
  },
  creative: {
    strong: "Your little explorer shows independence, self-regulation, and readiness to participate with minimal adult assistance.",
    developing: "Your child may be ready for Creative Explorer with some additional support, depending on what your teacher observes.",
    low: "Your child may benefit from more guidance and adult support at this stage.",
  },
  trailblazer: {
    strong: "Your little explorer is showing classroom readiness, sitting ability, fine-motor skills, and comfort with structured activities.",
    developing: "Your child is showing emerging classroom readiness and may benefit from additional guidance as they build routine.",
    low: "Your child may benefit from a setting with more flexibility, guidance, and one-on-one support for now.",
  },
};

function getResultTier(score: number): "strong" | "developing" | "low" {
  if (score >= 8) return "strong";
  if (score >= 5) return "developing";
  return "low";
}

const TIER_LABELS: Record<string, string> = {
  strong: "Strong Fit ⭐",
  developing: "Developing",
  low: "Consider Other Options",
};

const TIER_COLORS: Record<string, string> = {
  strong: "#0F006E",
  developing: "#B45309",
  low: "#64748B",
};

// ── Shared animation ──────────────────────────────────────────────────────────
const anim = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Intro
// ─────────────────────────────────────────────────────────────────────────────
function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-7 py-8">
      {/* Icon */}
      <m.div
        animate={{ y: [-5, 5, -5] }}
        // @ts-ignore
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EEF0FF] shadow-sm"
      >
        <span className="text-5xl">🧭</span>
      </m.div>

      {/* Title */}
      <div>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold leading-tight text-[#0F006E]">
          Discover Your Child's
          <br />
          <span className="text-[#FDE261]">Learning Path</span>
        </h1>
        <p className="mt-4 text-sm sm:text-base font-medium text-[#64748B] max-w-md mx-auto leading-relaxed">
          Every child learns differently. Let's find out how your little explorer learns best today so we can match them with the perfect environment.
        </p>
      </div>

      <div className="flex flex-col gap-2 items-center mt-2">
        <m.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full sm:w-80 rounded-2xl bg-[#0F006E] px-8 py-4 text-base font-extrabold text-white shadow-lg transition-all"
        >
          Begin Discovery &#8594;
        </m.button>
        <p className="text-xs text-[#94A3B8] font-medium mt-2">
          Takes about 3 minutes &middot; No right or wrong answers
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Child Info
// ─────────────────────────────────────────────────────────────────────────────
function ChildInfoScreen({
  childName,
  setChildName,
  childAge,
  setChildAge,
  onNext,
}: {
  childName: string;
  setChildName: (v: string) => void;
  childAge: string;
  setChildAge: (v: string) => void;
  onNext: () => void;
}) {
  const isValid = childName.trim().length > 0 && childAge.trim().length > 0;

  return (
    <div className="flex flex-col items-center text-center gap-6 py-6 w-full max-w-sm mx-auto">
      <div className="text-4xl">👋</div>
      
      <div>
        <h2 className="font-headline text-2xl sm:text-3xl font-extrabold leading-tight text-[#0F006E]">
          Let's get to know your little explorer!
        </h2>
      </div>

      <div className="flex flex-col gap-4 w-full mt-4 text-left">
        <div>
          <label className="block text-sm font-bold text-[#0F006E] mb-1">What is their name?</label>
          <input
            type="text"
            placeholder="e.g. Mia"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            className="w-full rounded-2xl border-2 border-[#E2E8F0] px-5 py-4 text-base font-medium focus:border-[#0F006E] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#0F006E] mb-1">How old are they?</label>
          <select
            value={childAge}
            onChange={(e) => setChildAge(e.target.value)}
            className="w-full rounded-2xl border-2 border-[#E2E8F0] px-5 py-4 text-base font-medium focus:border-[#0F006E] focus:outline-none bg-white transition-colors"
          >
            <option value="" disabled>Select age...</option>
            <option value="1.5 - 2 years">1.5 - 2 years</option>
            <option value="2 - 3 years">2 - 3 years</option>
            <option value="3 - 4 years">3 - 4 years</option>
            <option value="4+ years">4+ years</option>
          </select>
        </div>
      </div>

      <m.button
        whileHover={isValid ? { scale: 1.02, y: -2 } : {}}
        whileTap={isValid ? { scale: 0.98 } : {}}
        onClick={onNext}
        disabled={!isValid}
        className="mt-4 w-full rounded-2xl bg-[#0F006E] px-8 py-4 text-base font-extrabold text-white shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
      >
        Continue &#8594;
      </m.button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Question
// ─────────────────────────────────────────────────────────────────────────────
function QuestionScreen({
  qIndex,
  section,
  questionText,
  onAnswer,
}: {
  qIndex: number;
  section: SectionKey;
  questionText: React.ReactNode;
  onAnswer: (points: number) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const options = getOptions(section);

  function pick(val: number) {
    if (chosen !== null) return;
    setChosen(val);
    onAnswer(val);
  }

  return (
    <div className="flex flex-col gap-6 py-4 w-full max-w-lg mx-auto">
      {/* Question card */}
      <div className="text-center px-2">
        <h2 className="font-headline text-2xl sm:text-3xl font-extrabold leading-tight text-[#0F006E] [font-variant-ligatures:none]">
          {questionText}
        </h2>
      </div>

      {/* Answer options */}
      <div className="flex flex-col gap-3 mt-6">
        {options.map((opt) => {
          const isChosen = chosen === opt.value;
          const isDimmed = chosen !== null && !isChosen;
          return (
            <m.button
              key={opt.value}
              whileHover={chosen === null ? { scale: 1.01, y: -1 } : {}}
              whileTap={chosen === null ? { scale: 0.99 } : {}}
              onClick={() => pick(opt.value)}
              disabled={chosen !== null}
              className="flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: isChosen ? opt.activeBg : "#FFFFFF",
                borderColor: isChosen ? opt.activeBorder : "#E2E8F0",
                opacity: isDimmed ? 0.4 : 1,
              }}
            >
              <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-[#0F006E]">{opt.label}</p>
                <p className="text-xs font-medium text-[#94A3B8]">{opt.sublabel}</p>
              </div>
            </m.button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Email Capture
// ─────────────────────────────────────────────────────────────────────────────
function EmailCaptureScreen({
  program,
  scores,
  attempted,
  childName,
  childAge,
  onSubmit,
}: {
  program: SectionKey;
  scores: Record<SectionKey, number>;
  attempted: SectionKey[];
  childName: string;
  childAge: string;
  onSubmit: () => void;
}) {
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      await fetch("/api/discovery-day-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName,
          email,
          childName,
          childAge,
          scores,
          finalProgram: program,
          attempted,
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      onSubmit();
    }
  }

  return (
    <div className="flex flex-col items-center text-center gap-6 py-6 w-full max-w-sm mx-auto">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E0F2FE] shadow-sm">
        <span className="text-4xl">📬</span>
      </div>

      <div>
        <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#0F006E]">
          You've completed the discovery!
        </h2>
        <p className="mt-3 text-sm font-medium text-[#64748B] leading-relaxed">
          Where should we send {childName ? `${childName}'s` : "your child's"} program recommendation?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs mt-2">
        <input
          type="text"
          placeholder="Parent's Name (Optional)"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm focus:border-[#0F006E] focus:outline-none focus:ring-1 focus:ring-[#0F006E]"
        />
        <input
          type="email"
          required
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm focus:border-[#0F006E] focus:outline-none focus:ring-1 focus:ring-[#0F006E]"
        />

        <m.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !email}
          className="mt-2 w-full rounded-2xl bg-[#0F006E] px-8 py-4 text-base font-extrabold text-white shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? "Sending..." : "See My Results \u2192"}
        </m.button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Result
// ─────────────────────────────────────────────────────────────────────────────
function ResultScreen({
  program,
  scores,
  childName,
  onRetake,
}: {
  program: SectionKey;
  scores: Record<SectionKey, number>;
  childName: string;
  onRetake: () => void;
}) {
  const meta = SECTION_META[program];
  const { Icon } = meta;
  const score = scores[program];
  const tier = getResultTier(score);

  return (
    <div className="flex flex-col gap-6 py-4 w-full max-w-lg mx-auto">
      {/* Result hero card */}
      <div className="rounded-[2rem] overflow-hidden border-2" style={{ borderColor: meta.accentColor }}>
        <div className="bg-[#0F006E] px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('/images/noise.png')] mix-blend-overlay"></div>
          <p className="relative z-10 text-xs font-extrabold uppercase tracking-widest text-[#7DD3FC] mb-3">
            {childName ? `${childName}'s Best Fit` : "Your Explorer's Best Fit"}
          </p>
          <h2 className="relative z-10 font-headline text-3xl sm:text-4xl font-extrabold text-white">{meta.title}</h2>
          <p className="relative z-10 text-sm font-bold mt-2" style={{ color: meta.accentColor }}>
            {meta.subtitle}
          </p>
        </div>

        <div className="flex flex-col items-center gap-5 p-6 sm:p-8" style={{ backgroundColor: meta.bgCard }}>
          <m.div
            animate={{ scale: [1, 1.05, 1] }}
            // @ts-ignore
            transition={{ duration: 2.5, repeat: Infinity }}
            className="flex h-24 w-24 items-center justify-center rounded-full shadow-lg bg-white"
            style={{ border: `3px solid ${meta.accentColor}` }}
          >
            <Icon className="w-14 h-14" />
          </m.div>

          <p className="text-sm sm:text-base font-medium leading-relaxed text-[#475569] text-center max-w-sm mt-2">
            {RESULT_COPY[program][tier]}
          </p>
        </div>
      </div>

      {/* Important reminder */}
      <div className="rounded-2xl bg-[#FEF8C8] border border-[#FDE261]/50 p-5 mt-2">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#B45309] mb-2">
          One Important Reminder
        </p>
        <p className="text-sm font-medium leading-relaxed text-[#92400E]">
          Our teachers will also consider how your child responds during the actual Discovery Day experience.
        </p>
        <p className="mt-3 text-center text-sm font-bold italic text-[#92400E]">
          &quot;The goal is to find the program that fits the child.&quot;
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 mt-2">
        <Link
          href={`/inquire?program=${encodeURIComponent(meta.title)}&child=${encodeURIComponent(childName || "")}`}
          className="flex items-center justify-center w-full rounded-2xl bg-[#0F006E] px-6 py-4 text-base font-extrabold text-white shadow-lg transition-all hover:bg-[#1a0080] hover:-translate-y-0.5"
        >
          Book Discovery Day &#8594;
        </Link>
        <button
          onClick={onRetake}
          className="w-full rounded-2xl border-2 border-[#E2E8F0] bg-white px-6 py-3 text-sm font-bold text-[#64748B] transition-all hover:border-[#0F006E]/30 hover:text-[#0F006E]"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export: DiscoveryQuiz
// ─────────────────────────────────────────────────────────────────────────────
export function DiscoveryQuiz() {
  const [phase, setPhase] = useState<QuizPhase>("intro");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  
  const [qIndex, setQIndex] = useState(0);
  const [scores, setScores] = useState<Record<SectionKey, number>>({
    curious: 0,
    creative: 0,
    trailblazer: 0,
  });
  const [locked, setLocked] = useState(false);
  const [finalProgram, setFinalProgram] = useState<SectionKey>("curious");

  // Ensure we only use their first name in the questions for a more natural tone
  const firstName = childName ? childName.trim().split(" ")[0] : "your child";
  const questions = getQuestions(firstName);

  function handleAnswer(points: number) {
    if (locked) return;
    setLocked(true);

    const question = questions[qIndex];
    const section = question.section;

    // Accumulate score
    const newSectionScore = scores[section] + points;
    setScores((prev) => ({ ...prev, [section]: newSectionScore }));

    setTimeout(() => {
      setLocked(false);

      const isEndOfSection = (qIndex + 1) % 5 === 0;

      if (isEndOfSection) {
        if (section === "curious") {
          // CURIOUS LOGIC:
          // Questions ask if the child *needs* help/guardian.
          // HIGH SCORE (>= 6) means they need help -> They belong in Curious (STOP).
          // LOW SCORE (< 6) means they are independent -> Move to Creative (CONTINUE).
          if (newSectionScore >= 6) {
            setFinalProgram("curious");
            setPhase("email-capture");
            return;
          }
        } else if (section === "creative") {
          // CREATIVE LOGIC:
          // Questions ask if child is *independent*.
          // HIGH SCORE (>= 8) means very independent -> Move to Trailblazer (CONTINUE).
          // LOW SCORE (< 8) means somewhat independent -> They belong in Creative (STOP).
          if (newSectionScore < 8) {
            setFinalProgram("creative");
            setPhase("email-capture");
            return;
          }
        }
        
        // Passed gate, but are we at the very end of all questions?
        if (qIndex + 1 === questions.length) {
          setFinalProgram("trailblazer");
          setPhase("email-capture");
          return;
        }
      }

      // Default: proceed to next question seamlessly
      setQIndex((q) => q + 1);
    }, 400);
  }

  function retake() {
    setPhase("intro");
    setChildName("");
    setChildAge("");
    setQIndex(0);
    setScores({ curious: 0, creative: 0, trailblazer: 0 });
    setLocked(false);
    setFinalProgram("curious");
  }

  // Get currently attempted sections for the API submission
  const getAttempted = () => {
    if (qIndex < 5) return ["curious" as SectionKey];
    if (qIndex < 10) return ["curious" as SectionKey, "creative" as SectionKey];
    return ["curious" as SectionKey, "creative" as SectionKey, "trailblazer" as SectionKey];
  };

  const animKey = phase === "question" ? `q-${qIndex}` : phase;

  return (
    <div className="w-full bg-white/80 backdrop-blur-2xl rounded-3xl md:rounded-[2.5rem] border border-white shadow-[0_24px_80px_rgba(0,51,160,0.06)] overflow-hidden max-w-2xl mx-auto relative z-10">
      {/* Header bar (only show progress during questions) */}
      {phase === "question" && (
        <div className="bg-white/40 px-5 py-5 border-b border-black/5 flex items-center justify-between">
          <button
            onClick={retake}
            className="text-xs font-bold text-[#64748B] hover:text-[#0033A0] transition-colors flex items-center gap-1"
          >
            <span>&#8592;</span> <span>Start Over</span>
          </button>
          
          {/* Simple progress bar */}
          <div className="flex-1 max-w-[160px] mx-4 flex items-center gap-3">
            <span className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-widest">
              {qIndex + 1} / {questions.length}
            </span>
            <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
              <m.div 
                className="h-full bg-[#FDE261]"
                initial={{ width: 0 }}
                animate={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="p-6 sm:p-10 min-h-[480px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <m.div
            key={animKey}
            initial={anim.initial}
            animate={anim.animate}
            exit={anim.exit}
            transition={anim.transition}
            className="w-full"
          >
            {phase === "intro" && <IntroScreen onStart={() => setPhase("child-info")} />}

            {phase === "child-info" && (
              <ChildInfoScreen
                childName={childName}
                setChildName={setChildName}
                childAge={childAge}
                setChildAge={setChildAge}
                onNext={() => setPhase("question")}
              />
            )}

            {phase === "question" && (
              <QuestionScreen
                qIndex={qIndex}
                section={questions[qIndex].section}
                questionText={questions[qIndex].text}
                onAnswer={handleAnswer}
              />
            )}

            {phase === "email-capture" && (
              <EmailCaptureScreen
                program={finalProgram}
                scores={scores}
                attempted={getAttempted()}
                childName={childName}
                childAge={childAge}
                onSubmit={() => setPhase("result")}
              />
            )}

            {phase === "result" && (
              <ResultScreen
                program={finalProgram}
                scores={scores}
                childName={childName}
                onRetake={retake}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
