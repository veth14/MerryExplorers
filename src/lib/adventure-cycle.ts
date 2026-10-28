export type AdventureProgramSetting = {
  programKey: string;
  currentAdventure?: number;
  adventureStartDate?: string | null;
  nextAdventureStart?: string | null;
  registrationOpen?: boolean;
  registrationAutoCloseDays?: number | null;
  closedClasses?: string[];
  [key: string]: any;
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

export const LEGACY_ADVENTURE_2_START = "2026-10-26";
export const LEGACY_ADVENTURE_2_REGISTRATION_OPEN = "2026-10-12";
const LEGACY_ADVENTURE_1_START = "2026-09-28";

function dateBefore(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

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
  // Renewals open 14 days before an Adventure starts. Include registrations
  // made during that window, but keep earlier Adventure 1 records out of Adv 2.
  const registrationOpenDate = adventureStartDate
    ? dateBefore(adventureStartDate, 14)
    : adventureNumber === 2 ? LEGACY_ADVENTURE_2_REGISTRATION_OPEN : null;
  const minimumRegistrationDate = adventureNumber > 1
    ? registrationOpenDate || adventureStartDate
    : adventureStartDate;
  const submittedAtFilter = minimumRegistrationDate
    ? { submittedAt: { $gte: new Date(`${minimumRegistrationDate}T00:00:00+08:00`) } }
    : {};

  return [
    {
      adventureNumber,
      ...submittedAtFilter,
    },
    {
      period: `adventure-${adventureNumber}`,
      ...submittedAtFilter,
    },
    ...(adventureStartDate
      ? [{ adventureNumber: { $exists: false }, ...submittedAtFilter }]
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
 * The upcoming registration window opens 14 days before the adventure start.
 * Registrations made in that window belong to the upcoming cycle while the
 * admin setting still identifies the in-session adventure as current.
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
  const today = manilaDate(now);
  const registrationOpenDate = upcomingStart ? dateBefore(upcomingStart, 14) : null;

  return upcomingStart && registrationOpenDate && today >= registrationOpenDate && today < upcomingStart
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
  const currentNumber = getCurrentAdventureNumber(program, settings, now);
  const isLegacyAdventure2Window = Boolean(
    submittedDate && submittedDate >= LEGACY_ADVENTURE_1_START && submittedDate < LEGACY_ADVENTURE_2_START
  );

  const registrationOpenDate = LEGACY_ADVENTURE_2_REGISTRATION_OPEN;

  // Adventure 2 registration opened two weeks before its start. Correct old
  // records on either side of that registration-window boundary.
  if (isLegacyAdventure2Window && savedNumber === 1 && submittedDate && submittedDate >= registrationOpenDate) {
    return 2;
  }
  // Records before the opening date are Adventure 1 even if an earlier bug
  // tagged them as Adventure 2.
  if (isLegacyAdventure2Window && savedNumber === 2 && submittedDate && submittedDate < registrationOpenDate) {
    return 1;
  }
  if (Number.isInteger(savedNumber) && savedNumber > 0) return savedNumber;

  const currentStart = getCurrentAdventureStartDate(program, settings, now);
  const periodMatch = registration.period?.match(/adventure\s*[-_]?\s*(\d+)/i);
  if (periodMatch) {
    const periodNumber = Number(periodMatch[1]);
    if (periodNumber === 2 && isLegacyAdventure2Window && currentNumber === 2 && submittedDate && submittedDate < registrationOpenDate) {
      return 1;
    }
    if (periodNumber === 1 && isLegacyAdventure2Window && submittedDate && submittedDate >= registrationOpenDate) {
      return 2;
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
