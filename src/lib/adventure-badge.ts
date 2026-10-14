export type ProgramAdventureItem = {
  programKey: string;
  currentAdventure?: number | null;
  adventureStartDate?: string | null;
  nextAdventureStart?: string | null;
  [key: string]: any;
};

export type AdventureBadgeInfo = {
  label: string;
  pulse: string;
  adventureNumber: number;
  isUpcoming: boolean;
  status: "ongoing" | "upcoming" | "custom";
  targetDate?: string | null;
};

export function formatBadgeDate(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch {
    return isoStr.slice(0, 10);
  }
}

/**
 * Computes the landing page hero badge based on master program settings
 * (Discovery Club: Curious Explorer).
 * 
 * Rules:
 * 1. If an override text is provided, use it directly.
 * 2. If nextAdventureStart is in the future:
 *    -> "Adventure {nextAdv} · Starting {Date} 🚀" (amber pulse #FFC107)
 * 3. Once that date arrives or has passed (or if no future nextAdventureStart):
 *    -> "Adventure {activeAdv} · Now Ongoing 🎉" (green pulse #22c55e)
 */
export function computeAdventureBadge(
  programs?: ProgramAdventureItem[],
  overrideText?: string | null
): AdventureBadgeInfo {
  if (overrideText && overrideText.trim()) {
    return {
      label: overrideText.trim(),
      pulse: "#22c55e",
      adventureNumber: 1,
      isUpcoming: false,
      status: "custom",
    };
  }

  const master = programs?.find(
    (p) => p.programKey === "Discovery Club: Curious Explorer"
  );

  const currentAdv = master?.currentAdventure ?? 1;
  const nextStart = master?.nextAdventureStart;
  const currentStart = master?.adventureStartDate;

  // Manila timezone comparison (YYYY-MM-DD)
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 1. If next adventure start is configured:
  if (nextStart) {
    const nextDateStr = nextStart.slice(0, 10);
    if (todayStr < nextDateStr) {
      // Future date -> inform parents the next adventure is starting soon!
      const nextAdvNum = currentAdv + 1;
      const formattedDate = formatBadgeDate(nextStart);
      return {
        label: `Adventure ${nextAdvNum} · Starting ${formattedDate} 🚀`,
        pulse: "#FFC107",
        adventureNumber: nextAdvNum,
        isUpcoming: true,
        status: "upcoming",
        targetDate: nextStart,
      };
    } else {
      // Date has arrived or passed! It is now ongoing.
      const nextAdvNum = currentAdv + 1;
      return {
        label: `Adventure ${nextAdvNum} · Now Ongoing 🎉`,
        pulse: "#22c55e",
        adventureNumber: nextAdvNum,
        isUpcoming: false,
        status: "ongoing",
        targetDate: nextStart,
      };
    }
  }

  // 2. If no nextAdventureStart is set, check current adventure start date
  if (currentStart) {
    const startDateStr = currentStart.slice(0, 10);
    if (todayStr < startDateStr) {
      const formattedDate = formatBadgeDate(currentStart);
      return {
        label: `Adventure ${currentAdv} · Starting ${formattedDate} 🚀`,
        pulse: "#FFC107",
        adventureNumber: currentAdv,
        isUpcoming: true,
        status: "upcoming",
        targetDate: currentStart,
      };
    }
  }

  // 3. Fallback: current adventure is ongoing
  return {
    label: `Adventure ${currentAdv} · Now Ongoing 🎉`,
    pulse: "#22c55e",
    adventureNumber: currentAdv,
    isUpcoming: false,
    status: "ongoing",
    targetDate: currentStart,
  };
}
