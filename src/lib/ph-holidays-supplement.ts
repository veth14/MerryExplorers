/**
 * PH Special Non-Working Days that Nager.Date does NOT return.
 * These are declared via Presidential Proclamations each year and are NOT
 * classified as regular "Public Holidays" — so they are absent from the
 * Nager.Date API response.
 *
 * Keep this list updated annually before each school year.
 * Source: Official Gazette of the Philippines / DOLE Proclamations.
 */

export interface SupplementalHoliday {
  date: string;       // "YYYY-MM-DD"
  localName: string;  // Filipino name shown in the calendar
  name: string;       // English name
  types: string[];    // e.g. ["Special Non-Working"]
}

const PH_SUPPLEMENTAL_HOLIDAYS: Record<number, SupplementalHoliday[]> = {
  2026: [
    {
      date: "2026-11-02",
      localName: "Araw ng mga Patay",
      name: "All Souls' Day",
      types: ["Special Non-Working"],
    },
    {
      date: "2026-12-24",
      localName: "Bisperas ng Pasko",
      name: "Christmas Eve",
      types: ["Special Non-Working"],
    },
    {
      date: "2026-12-31",
      localName: "Huling Araw ng Taon",
      name: "Last Day of the Year",
      types: ["Special Non-Working"],
    },
  ],
  2027: [
    {
      date: "2027-11-02",
      localName: "Araw ng mga Patay",
      name: "All Souls' Day",
      types: ["Special Non-Working"],
    },
    {
      date: "2027-12-24",
      localName: "Bisperas ng Pasko",
      name: "Christmas Eve",
      types: ["Special Non-Working"],
    },
    {
      date: "2027-12-31",
      localName: "Huling Araw ng Taon",
      name: "Last Day of the Year",
      types: ["Special Non-Working"],
    },
  ],
};

/**
 * Returns the supplemental PH special non-working days for a given year.
 * Returns an empty array if no supplements are defined for that year.
 */
export function getPhSupplementalHolidays(year: number): SupplementalHoliday[] {
  return PH_SUPPLEMENTAL_HOLIDAYS[year] ?? [];
}

