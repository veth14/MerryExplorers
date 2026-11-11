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
 * Generate unique numeral options including the correct number
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
    iconId: "star",
    funFact: "",
    praise: "Great job!",
  };

  const challengeId = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // 1. RECOGNITION MODE ("Find the Number" from the Word)
  if (selectedMode === "recognition") {
    const choices = generateNumeralChoices(targetNum, min, max, difficulty === "easy" ? 3 : 4);
    return {
      id: challengeId,
      mode: "recognition",
      targetNumber: targetNum,
      targetWord: numData.word.toUpperCase(),
      promptText: "Find the number",
      spokenPrompt: numData.word, // In audio, just say the number! E.g. "Fifteen"
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
      spokenPrompt: `How many ${obj.name}?`,
      choices,
      dotCount: targetNum,
      dotIconId: obj.id,
    };
  }

  // 3. SEQUENCE MODE ("What Comes Next?")
  if (selectedMode === "sequence") {
    const seqLength = difficulty === "easy" ? 3 : 4;
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

    return {
      id: challengeId,
      mode: "sequence",
      targetNumber: missingValue,
      promptText: "What comes next on the trail?",
      spokenPrompt: "What comes next?",
      choices,
      sequence,
      missingIndex,
    };
  }

  // 4. MORE OR LESS MODE
  let countA = randomInt(min, max);
  let countB = randomInt(min, max);
  while (countB === countA) {
    countB = randomInt(min, max);
  }

  const objA = COUNTING_OBJECTS[Math.floor(Math.random() * COUNTING_OBJECTS.length)];
  let objB = COUNTING_OBJECTS[Math.floor(Math.random() * COUNTING_OBJECTS.length)];
  while (objB.id === objA.id) {
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
      label: `Group A: ${countA} ${objA.label}`,
      isCorrect: correctGroupId === "A",
    },
    {
      id: "choice-B",
      numeral: countB,
      label: `Group B: ${countB} ${objB.label}`,
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
      groupA: { id: "A", count: countA, iconId: objA.id, label: objA.label },
      groupB: { id: "B", count: countB, iconId: objB.id, label: objB.label },
      comparisonType,
      correctGroupId,
    },
  };
}
