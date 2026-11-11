import {
  ChallengeMode,
  NumberDifficulty,
  NumberChallenge,
  NumberChoice,
  SequenceItem,
} from "../types";
import {
  NUMBERS_DATA,
  COUNTING_OBJECTS,
  DIFFICULTY_RANGES,
} from "../data";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generate 3 or 4 unique options including the correct number
 */
function generateNumeralChoices(
  correctNum: number,
  min: number,
  max: number,
  count = 4
): NumberChoice[] {
  const chosen = new Set<number>([correctNum]);
  const possible = [];
  for (let i = min; i <= max; i++) {
    if (i !== correctNum) possible.push(i);
  }

  const shuffledPossible = shuffleArray(possible);
  for (const num of shuffledPossible) {
    if (chosen.size >= count) break;
    chosen.add(num);
  }

  // If range was smaller than count (e.g. 1-5 with count 4 is fine, but just in case),
  // pick anything reasonable
  let fallback = 1;
  while (chosen.size < Math.min(count, max - min + 1)) {
    if (!chosen.has(fallback)) chosen.add(fallback);
    fallback++;
  }

  const numbersArray = shuffleArray(Array.from(chosen));
  return numbersArray.map((num) => ({
    id: `opt-${num}`,
    numeral: num,
    label: String(num),
    sublabel: NUMBERS_DATA[num]?.word || "",
    isCorrect: num === correctNum,
  }));
}

export function generateNumberChallenge(
  modes: ChallengeMode[],
  difficulty: NumberDifficulty,
  previousTarget?: number
): NumberChallenge {
  const activeModes = modes.length > 0 ? modes : ["recognition", "count_match"];
  const selectedMode = activeModes[Math.floor(Math.random() * activeModes.length)];
  const range = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.easy;
  const { min, max } = range;

  // Pick target number within range, avoiding immediate repeat if possible
  let targetNum = randomInt(min, max);
  if (previousTarget && targetNum === previousTarget && max > min) {
    targetNum = randomInt(min, max);
    if (targetNum === previousTarget) {
      targetNum = targetNum === max ? min : targetNum + 1;
    }
  }

  const numData = NUMBERS_DATA[targetNum] || {
    numeral: targetNum,
    word: String(targetNum),
    dotsEmoji: "⭐",
    funFact: "",
    praise: "Great job!",
  };

  const challengeId = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // 1. RECOGNITION MODE
  if (selectedMode === "recognition") {
    const choices = generateNumeralChoices(targetNum, min, max, difficulty === "easy" ? 3 : 4);
    return {
      id: challengeId,
      mode: "recognition",
      targetNumber: targetNum,
      promptText: `Find the number ${targetNum}`,
      spokenPrompt: `Find the number ${targetNum}! ${numData.word}!`,
      choices,
    };
  }

  // 2. COUNT & MATCH MODE
  if (selectedMode === "count_match") {
    const obj = COUNTING_OBJECTS[Math.floor(Math.random() * COUNTING_OBJECTS.length)];
    const choices = generateNumeralChoices(targetNum, min, max, difficulty === "easy" ? 3 : 4);

    return {
      id: challengeId,
      mode: "count_match",
      targetNumber: targetNum,
      promptText: `How many ${obj.name} do you count?`,
      spokenPrompt: `How many ${obj.name} are there? Let's count them!`,
      choices,
      dotCount: targetNum,
      dotEmoji: obj.emoji,
    };
  }

  // 3. SEQUENCE MODE ("What Comes Next?")
  if (selectedMode === "sequence") {
    const seqLength = difficulty === "easy" ? 3 : 4;
    // Choose start so that start + seqLength - 1 <= max
    const maxStart = Math.max(min, max - seqLength + 1);
    const start = randomInt(min, maxStart);

    const sequence: SequenceItem[] = [];
    const missingIndex = seqLength - 1; // Last item is missing: e.g. 1, 2, 3, [?]
    let missingValue = start + missingIndex;

    for (let i = 0; i < seqLength; i++) {
      const val = start + i;
      if (i === missingIndex) {
        sequence.push({ value: null, display: "?" });
        missingValue = val;
      } else {
        sequence.push({ value: val, display: String(val) });
      }
    }

    const choices = generateNumeralChoices(missingValue, min, max, difficulty === "easy" ? 3 : 4);
    const spokenSeq = sequence
      .map((s) => (s.value !== null ? String(s.value) : "what comes next?"))
      .join(", ");

    return {
      id: challengeId,
      mode: "sequence",
      targetNumber: missingValue,
      promptText: "What comes next on the trail?",
      spokenPrompt: `${spokenSeq}`,
      choices,
      sequence,
      missingIndex,
    };
  }

  // 4. MORE OR LESS MODE
  // Pick two distinct counts
  let countA = randomInt(min, max);
  let countB = randomInt(min, max);
  while (countB === countA) {
    countB = randomInt(min, max);
  }

  const objA = COUNTING_OBJECTS[Math.floor(Math.random() * COUNTING_OBJECTS.length)];
  let objB = COUNTING_OBJECTS[Math.floor(Math.random() * COUNTING_OBJECTS.length)];
  while (objB.name === objA.name) {
    objB = COUNTING_OBJECTS[Math.floor(Math.random() * COUNTING_OBJECTS.length)];
  }

  const comparisonType: "more" | "less" = Math.random() > 0.5 ? "more" : "less";
  const correctGroupId: "A" | "B" =
    comparisonType === "more"
      ? countA > countB
        ? "A"
        : "B"
      : countA < countB
      ? "A"
      : "B";

  const choices: NumberChoice[] = [
    {
      id: "choice-A",
      numeral: countA,
      label: `Group A: ${countA} ${objA.name}`,
      isCorrect: correctGroupId === "A",
    },
    {
      id: "choice-B",
      numeral: countB,
      label: `Group B: ${countB} ${objB.name}`,
      isCorrect: correctGroupId === "B",
    },
  ];

  return {
    id: challengeId,
    mode: "more_or_less",
    targetNumber: correctGroupId === "A" ? countA : countB,
    promptText: `Which group has ${comparisonType.toUpperCase()}?`,
    spokenPrompt: `Which group has ${comparisonType}? Group A or Group B?`,
    choices,
    comparison: {
      groupA: { id: "A", count: countA, emoji: objA.emoji, label: objA.name },
      groupB: { id: "B", count: countB, emoji: objB.emoji, label: objB.name },
      comparisonType,
      correctGroupId,
    },
  };
}

