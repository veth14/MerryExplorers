import { MongoClient, ObjectId } from "mongodb";

const KEEP = "6abcdf24bd93bf5f0bbd2c67"; // original, referenced by the album
const DROP = "6ad05dd1d183cc6d338f8b76"; // today's duplicate
const DRY_RUN = true; // set to false to actually apply

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("merryexplorers");
const students = db.collection("students");

const keep = await students.findOne({ _id: new ObjectId(KEEP) });
const drop = await students.findOne({ _id: new ObjectId(DROP) });
if (!keep || !drop) {
    console.log("One of the documents wasn't found. Stopping.", { keep: !!keep, drop: !!drop });
    await client.close();
    process.exit(1);
}

const isEmpty = (v) => v === undefined || v === null || v === "";
const isPlainObject = (v) =>
    v !== null && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype;

// Fill only fields that are missing/empty on the original; never overwrite.
// Dates, ObjectIds and arrays are treated as single values.
function fillMissing(target, source) {
    const out = { ...target };
    for (const [k, v] of Object.entries(source)) {
        if (k === "_id") continue;
        if (isEmpty(out[k])) {
            out[k] = v;
        } else if (isPlainObject(out[k]) && isPlainObject(v)) {
            out[k] = fillMissing(out[k], v);
        }
    }
    return out;
}

const merged = fillMissing(keep, drop);
const { _id, ...mergedFields } = merged;

const changed = Object.keys(mergedFields).filter(
    (k) => JSON.stringify(mergedFields[k]) !== JSON.stringify(keep[k])
);
console.log("Fields that would be filled in on the original:", JSON.stringify(changed));
for (const k of changed) {
    console.log(`  ${k}:`, JSON.stringify(keep[k]), "->", JSON.stringify(mergedFields[k]));
}

if (DRY_RUN) {
    console.log("DRY RUN: nothing changed. Set DRY_RUN = false to apply.");
} else {
    // 1. Back up the duplicate first
    await db.collection("students_duplicates_backup").insertOne({
        ...drop,
        _id: new ObjectId(),
        originalId: drop._id,
        mergedInto: keep._id,
        archivedAt: new Date(),
    });
    // 2. Update the original (only the fields that changed)
    const $set = Object.fromEntries(changed.map((k) => [k, mergedFields[k]]));
    if (Object.keys($set).length) await students.updateOne({ _id: keep._id }, { $set });
    // 3. Remove the duplicate only after the backup succeeded
    const res = await students.deleteOne({ _id: drop._id });
    console.log("Merged. Duplicate removed:", res.deletedCount);
}

await client.close();