import {
  computeLateDeduction,
  computeCreditedHours,
  LATE_DEDUCTION_CONFIG,
  BASE_SCHEDULE,
  BREAK_SCHEDULE
} from './src/lib/attendance-rules';

const hourlyRate = 100;

console.log("--- TEST 1: Late Deductions (Rate: P100/hr, Start: 08:30) ---");
const lateTests = [
  "2023-10-02T08:29:00+08:00", // On time
  "2023-10-02T08:30:00+08:00", // Exact
  "2023-10-02T08:31:00+08:00", // 1 min late
  "2023-10-02T08:45:00+08:00", // 15 min late
  "2023-10-02T08:59:00+08:00", // 29 min late
  "2023-10-02T09:00:00+08:00", // Threshold
  "2023-10-02T09:30:00+08:00"  // After threshold
];

lateTests.forEach(t => {
  const time = new Date(t).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' });
  const res = computeLateDeduction(t, hourlyRate, false);
  console.log(`Clock In: ${time} | Method: ${res.method} | Mins: ${res.lateMinutes} | Ded: P${res.deduction}`);
});

console.log("\n--- TEST 2: Credited Hours Clamping (Mon: 8:30-17:00, 60m break) ---");
const hourTests = [
  { in: "2023-10-02T08:00:00+08:00", out: "2023-10-02T17:00:00+08:00", desc: "Early In, Normal Out" },
  { in: "2023-10-02T08:30:00+08:00", out: "2023-10-02T17:00:00+08:00", desc: "Normal In, Normal Out" },
  { in: "2023-10-02T08:30:00+08:00", out: "2023-10-02T17:45:00+08:00", desc: "Normal In, Late Out" },
  { in: "2023-10-02T08:00:00+08:00", out: "2023-10-02T17:45:00+08:00", desc: "Early In, Late Out" },
  { in: "2023-10-02T09:00:00+08:00", out: "2023-10-02T17:00:00+08:00", desc: "Late In, Normal Out" },
  { in: "2023-10-02T08:30:00+08:00", out: "2023-10-02T12:00:00+08:00", desc: "Normal In, Half Day Out" }
];

const monSched = BASE_SCHEDULE["Mon"];
const breakMins = BREAK_SCHEDULE["Mon"];

hourTests.forEach(t => {
  const inTime = new Date(t.in).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' });
  const outTime = new Date(t.out).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' });
  const hours = computeCreditedHours(t.in, t.out, monSched.start, monSched.normalEnd, breakMins);
  
  // raw hours for comparison
  const rawMs = new Date(t.out).getTime() - new Date(t.in).getTime();
  const rawHrs = parseFloat((Math.max(0, rawMs - breakMins*60000) / 3600000).toFixed(2));
  
  console.log(`${t.desc.padEnd(23)} | ${inTime} - ${outTime} | Raw: ${rawHrs}h | Credited: ${hours}h`);
});
