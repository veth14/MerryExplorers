const DEFAULT_TESTING_EMAILS = [
  "iangelovalmores@gmail.com",
  "ian.valmores@gmail.com",
  "vianangelo.14@gmail.com",
  "valmores.ianangelo00@gmail.com",
];

const TESTING_EMAILS = [...new Set([
  ...DEFAULT_TESTING_EMAILS,
  ...(process.env.RENEWALS_TEST_EMAILS || "").split(","),
  ...(process.env.REGISTRATION_TEST_EMAILS || "").split(","),
].map((email) => email.trim().toLowerCase()).filter(Boolean))];

type SlotRegistration = {
  _id?: { toString(): string } | string;
  childInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string | Date;
  };
};

export function getClassTimeAliases(classTime: string) {
  const alternate = classTime.includes("Session")
    ? classTime.replace("Session", "Class")
    : classTime.replace("Class", "Session");
  return [...new Set([classTime, alternate])];
}

export function activeRegistrationSlotQuery({
  program,
  classTime,
  cycleQuery = [],
  now = new Date(),
  excludeId,
}: {
  program: string;
  classTime: string;
  cycleQuery?: Record<string, unknown>[];
  now?: Date;
  excludeId?: unknown;
}) {
  return {
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    program,
    classTime: { $in: getClassTimeAliases(classTime) },
    status: { $in: ["pending", "approved", "reserved"] },
    "parentInfo.email": { $nin: TESTING_EMAILS },
    $and: [
      ...(cycleQuery.length ? [{ $or: cycleQuery }] : []),
      {
        $or: [
          { status: "approved" },
          { status: { $in: ["pending", "reserved"] }, reservedUntil: { $gte: now } },
          // Older imports stored reservation deadlines as ISO strings.
          { status: { $in: ["pending", "reserved"] }, reservedUntil: { $gte: now.toISOString() } },
        ],
      },
    ],
  };
}

/** Count occupied places once per child, even if duplicate registrations came
 * from two parent emails or both the renewal and regular registration forms. */
export async function countUniqueActiveRegistrationSlots(
  collection: any,
  query: Record<string, any>
) {
  const registrations = await collection.find(query, {
    projection: {
      _id: 1,
      "childInfo.firstName": 1,
      "childInfo.lastName": 1,
      "childInfo.dateOfBirth": 1,
    },
  }).toArray();

  const children = new Map<string, Set<string>>();
  const unidentified = new Set<string>();

  for (const registration of registrations) {
    const firstName = registration.childInfo?.firstName?.trim().normalize("NFKC").toLowerCase() || "";
    const lastName = registration.childInfo?.lastName?.trim().normalize("NFKC").toLowerCase() || "";
    const childName = `${firstName} ${lastName}`.trim().replace(/\s+/g, " ");
    if (!childName) {
      unidentified.add(registration._id?.toString() || `unknown-${unidentified.size}`);
      continue;
    }

    const rawDateOfBirth = registration.childInfo?.dateOfBirth;
    const dateOfBirth = rawDateOfBirth instanceof Date
      ? rawDateOfBirth.toISOString().slice(0, 10)
      : typeof rawDateOfBirth === "string"
        ? rawDateOfBirth.trim().slice(0, 10)
        : "";
    if (!children.has(childName)) children.set(childName, new Set());
    if (dateOfBirth) children.get(childName)!.add(dateOfBirth);
  }

  return unidentified.size + [...children.values()].reduce(
    (count, datesOfBirth) => count + Math.max(1, datesOfBirth.size),
    0
  );
}
