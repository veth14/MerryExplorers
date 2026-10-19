export type AdventureProgramSetting = {
  programKey: string;
  currentAdventure?: number;
  adventureStartDate?: string | null;
  nextAdventureStart?: string | null;
  registrationOpen?: boolean;
  closedClasses?: string[];
};

export type AdventureCycleTimeline = {
  activeAdventureNumber: number | null;
  upcomingAdventureNumber: number | null;
  previousAdventureNumber: number | null;
  activeAdventureStartDate: string | null;
  upcomingAdventureStartDate: string | null;
};

const PROGRAM_KEYS: Record<string, string> = {
  "curious-explorer": "Discovery Club: Curious Explorer",
  "creative-explorer": "Discovery Club: Creative Explorer",
  "everyday-explorer": "Discovery Club: Everyday Explorer",
  "everyday-curious": "Discovery Club: Everyday Explorer",
  "brave-explorer": "Trailblazer: Brave Explorer",
  "saturday-playdate": "Saturday Playdate",
};

export const LEGACY_ADVENTURE_2_START = "2026-10-12";

function manilaDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function datePart(value?: string | Date | null) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : manilaDate(date);
}

export function getProgramAdventureSetting(
  program: string,
  settings: AdventureProgramSetting[]
) {
  const programKey = PROGRAM_KEYS[program] || program;
  return settings.find((entry) => entry.programKey === programKey);
}

export function getAdventureCycleRegistrationQuery(
  adventureNumber: number,
  adventureStartDate: string | null
) {
  return [
    {
      adventureNumber,
      ...(adventureNumber === 2
        ? { submittedAt: { $gte: new Date(`${LEGACY_ADVENTURE_2_START}T00:00:00+08:00`) } }
        : {}),
    },
    {
      period: `adventure-${adventureNumber}`,
      ...(adventureNumber === 2
        ? { submittedAt: { $gte: new Date(`${LEGACY_ADVENTURE_2_START}T00:00:00+08:00`) } }
        : {}),
    },
    ...(adventureStartDate
      ? [{ adventureNumber: { $exists: false }, submittedAt: { $gte: new Date(`${adventureStartDate}T00:00:00+08:00`) } }]
      : []),
  ];
}

export function getCurrentAdventureNumber(
  program: string,
  settings: AdventureProgramSetting[],
  now = new Date()
) {
  const programSetting = getProgramAdventureSetting(program, settings);
  const savedNumber = Number(programSetting?.currentAdventure);
  const currentNumber = Number.isInteger(savedNumber) && savedNumber > 0 ? savedNumber : 2;

  // Adventure programs roll together when Curious Explorer's next cycle begins.
  const master = settings.find((entry) => entry.programKey === "Discovery Club: Curious Explorer");
  const masterNextStart = datePart(master?.nextAdventureStart);
  if (masterNextStart && manilaDate(now) >= masterNextStart) {
    const masterNumber = Number(master?.currentAdventure);
    const nextNumber = Number.isInteger(masterNumber) && masterNumber > 0 ? masterNumber + 1 : currentNumber + 1;
    return nextNumber;
  }

  return currentNumber;
}

export function getCurrentAdventureStartDate(
  program: string,
  settings: AdventureProgramSetting[],
  now = new Date()
) {
  const programSetting = getProgramAdventureSetting(program, settings);
  const master = settings.find((entry) => entry.programKey === "Discovery Club: Curious Explorer");
  const masterNextStart = datePart(master?.nextAdventureStart);
  if (masterNextStart && manilaDate(now) >= masterNextStart) {
    return datePart(programSetting?.nextAdventureStart) || masterNextStart;
  }
  return datePart(programSetting?.adventureStartDate) || (
    getCurrentAdventureNumber(program, settings, now) === 2 ? LEGACY_ADVENTURE_2_START : null
  );
}

/**
 * The registration form can open for the upcoming adventure before its start
 * date. In that window, new reservations belong to the upcoming cycle, even
 * though the admin setting still identifies the in-session adventure as
 * current.
 */
export function getTargetRegistrationAdventureNumber(
  program: string,
  settings: AdventureProgramSetting[],
  now = new Date()
) {
  const currentNumber = getCurrentAdventureNumber(program, settings, now);
  const programSetting = getProgramAdventureSetting(program, settings);
  const master = settings.find((entry) => entry.programKey === "Discovery Club: Curious Explorer");
  const upcomingStart = datePart(programSetting?.nextAdventureStart) || datePart(master?.nextAdventureStart);

  return upcomingStart && manilaDate(now) < upcomingStart
    ? currentNumber + 1
    : currentNumber;
}

export function getRegistrationAdventureStartDate(
  program: string,
  settings: AdventureProgramSetting[],
  now = new Date()
) {
  const currentNumber = getCurrentAdventureNumber(program, settings, now);
  const registrationNumber = getTargetRegistrationAdventureNumber(program, settings, now);
  if (registrationNumber > currentNumber) {
    const programSetting = getProgramAdventureSetting(program, settings);
    const master = settings.find((entry) => entry.programKey === "Discovery Club: Curious Explorer");
    return datePart(programSetting?.nextAdventureStart) || datePart(master?.nextAdventureStart);
  }
  return getCurrentAdventureStartDate(program, settings, now);
}

export function getAdventureCycleTimeline(
  program: string,
  settings: AdventureProgramSetting[],
  now = new Date()
): AdventureCycleTimeline {
  const programSetting = getProgramAdventureSetting(program, settings);
  if (!programSetting) {
    return {
      activeAdventureNumber: null,
      upcomingAdventureNumber: null,
      previousAdventureNumber: null,
      activeAdventureStartDate: null,
      upcomingAdventureStartDate: null,
    };
  }

  const configuredNumber = getCurrentAdventureNumber(program, settings, now);
  const configuredStart = getCurrentAdventureStartDate(program, settings, now);
  const today = manilaDate(now);
  const startsInFuture = Boolean(configuredStart && configuredStart > today);
  const activeAdventureNumber = startsInFuture
    ? configuredNumber > 1 ? configuredNumber - 1 : null
    : configuredNumber;
  const activeAdventureStartDate = startsInFuture ? null : configuredStart;
  const nextStart = datePart(programSetting.nextAdventureStart);
  const upcomingAdventureNumber = startsInFuture
    ? configuredNumber
    : nextStart && nextStart > today
      ? (activeAdventureNumber ?? configuredNumber) + 1
      : null;
  const upcomingAdventureStartDate = startsInFuture ? configuredStart : (upcomingAdventureNumber ? nextStart : null);

  return {
    activeAdventureNumber,
    upcomingAdventureNumber,
    previousAdventureNumber: activeAdventureNumber && activeAdventureNumber > 1
      ? activeAdventureNumber - 1
      : null,
    activeAdventureStartDate,
    upcomingAdventureStartDate,
  };
}

export function getAdventureStartDateForNumber(
  program: string,
  adventureNumber: number | null,
  settings: AdventureProgramSetting[],
  now = new Date()
) {
  if (!adventureNumber) return null;
  const currentNumber = getCurrentAdventureNumber(program, settings, now);
  const programSetting = getProgramAdventureSetting(program, settings);
  if (adventureNumber > currentNumber) {
    const master = settings.find((entry) => entry.programKey === "Discovery Club: Curious Explorer");
    return datePart(programSetting?.nextAdventureStart) || datePart(master?.nextAdventureStart);
  }
  return getCurrentAdventureStartDate(program, settings, now);
}

export function getRegistrationAdventureNumber(
  registration: { adventureNumber?: number; period?: string; submittedAt?: string | Date },
  program: string,
  settings: AdventureProgramSetting[],
  now = new Date()
) {
  const savedNumber = Number(registration.adventureNumber);
  const submittedDate = datePart(registration.submittedAt);

  // If a registration was submitted on or after Oct 12, 2026, it belongs to Adventure 2 (or upcoming target cycle),
  // not Adventure 1, even if an earlier bug erroneously saved adventureNumber: 1 or period: 'adventure-1'.
  if (savedNumber === 1 && submittedDate && submittedDate >= LEGACY_ADVENTURE_2_START) {
    return getTargetRegistrationAdventureNumber(program, settings, registration.submittedAt ? new Date(registration.submittedAt) : now);
  }
  if (Number.isInteger(savedNumber) && savedNumber > 0) return savedNumber;

  const currentNumber = getCurrentAdventureNumber(program, settings, now);
  const currentStart = getCurrentAdventureStartDate(program, settings, now);
  const periodMatch = registration.period?.match(/adventure\s*[-_]?\s*(\d+)/i);
  if (periodMatch) {
    const periodNumber = Number(periodMatch[1]);
    // Earlier code labeled every registration Adventure 2. Oct 12 is the old
    // cycle boundary; preserve registrations made before it as Adventure 1.
    if (periodNumber === 2 && currentNumber === 2 && submittedDate && submittedDate < LEGACY_ADVENTURE_2_START) {
      return 1;
    }
    if (periodNumber === 1 && submittedDate && submittedDate >= LEGACY_ADVENTURE_2_START) {
      return getTargetRegistrationAdventureNumber(program, settings, registration.submittedAt ? new Date(registration.submittedAt) : now);
    }
    return periodNumber;
  }

  if (currentStart && submittedDate && submittedDate < currentStart) {
    return Math.max(1, currentNumber - 1);
  }
  if (submittedDate && submittedDate >= LEGACY_ADVENTURE_2_START) {
    return getTargetRegistrationAdventureNumber(program, settings, registration.submittedAt ? new Date(registration.submittedAt) : now);
  }
  return currentNumber;
}
