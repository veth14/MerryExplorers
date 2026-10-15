"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import * as XLSX from "xlsx";
import { RenewalSettingsManager } from "@/components/admin/RenewalSettingsManager";

type Family = {
  _id: string;
  parentName: string;
  parentEmail: string;
  phone: string;
  childName: string;
  previousProgram: string;
  renewingTo: string;
  adventures?: {
    adventure: string;
    program: string;
    classTime?: string;
    status?: string;
    registeredAt?: string;
  }[];
  renewalStatus: "not_yet_submitted" | "reserved" | "confirmed" | "released";
  lastEmailSent?: string | null;
  lastEmailDate?: string | null;
  emailHistory?: any[];
  notes?: string;
  renewalPeriod?: string;
  registrationId?: string | null;
  isPioneer?: boolean;
  createdAt?: string;
};

type RenewalRecord = {
  _id: string;
  registrationId: string;
  familyId?: string | null;
  parentName: string;
  parentEmail: string;
  phone: string;
  childName: string;
  program: string;
  classTime: string;
  submittedAt: string;
  reservationType: string;
  isPromo: boolean;
  promoCode?: string | null;
  reservedOn: string;
  reservedUntil: string;
  renewalStatus: "reserved" | "confirmed" | "for_release" | "released";
  paymentStatus: "unpaid" | "downpayment_received" | "fully_paid";
  totalTuition: number;
  expectedDownpayment: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: string;
  referenceNumber: string;
  receiptUrl?: string;
  isResubmission?: boolean;
  matchedFamily?: boolean;
  isPioneer?: boolean;
  isVerified?: boolean;
  status?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
};

type Stats = {
  totalFamilies: number;
  submittedCount: number;
  notYetSubmitted: number;
  countReserved: number;
  countConfirmed: number;
  countForRelease: number;
  countReleased: number;
  promoReservations: number;
  directPayments: number;
  renewalRate: number;
  conversionRate: number;
  countExpiringSoon: number;
  deadlineIso: string;
  minStudentsPerSession?: number;
  downpaymentRate?: number;
  totalCollected: number;
  totalExpectedDownpayment: number;
  totalOutstandingBalance: number;
  countDownpaymentReceived: number;
  countFullyPaid: number;
  countWithBalance: number;
};

type SlotInfo = {
  totalMax: number;
  sessions: Record<string, { max: number; taken: number; belowMin: boolean }>;
};

const FALLBACK_DEADLINE_ISO = "2026-10-16T13:00:00+08:00";

export default function RenewalsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"renewals" | "families" | "settings">("renewals");
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("adventure-1-renewal");
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Renewals tab state
  const [renewalRecords, setRenewalRecords] = useState<RenewalRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [slotOverview, setSlotOverview] = useState<Record<string, SlotInfo>>({});
  const [renewalSearch, setRenewalSearch] = useState("");
  const [renewalStatusFilter, setRenewalStatusFilter] = useState("all");
  const [renewalProgramFilter, setRenewalProgramFilter] = useState("all");
  const [renewalPaymentFilter, setRenewalPaymentFilter] = useState("all");

  // Families tab state
  const [families, setFamilies] = useState<Family[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [familyStatusFilter, setFamilyStatusFilter] = useState("all");
  const [familyProgramFilter, setFamilyProgramFilter] = useState("all");

  // UI display toggles
  const [showClassTracker, setShowClassTracker] = useState(false);

  // Modals
  const [addFamilyModal, setAddFamilyModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<{ total: number; valid: number; duplicates: number }>({ total: 0, valid: 0, duplicates: 0 });
  const [importing, setImporting] = useState(false);
  const [newPeriodModal, setNewPeriodModal] = useState(false);

  // Family form fields
  const [formParentName, setFormParentName] = useState("");
  const [formParentEmail, setFormParentEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formChildName, setFormChildName] = useState("");
  const [formPreviousProgram, setFormPreviousProgram] = useState("Curious Explorer");
  const [formRenewingTo, setFormRenewingTo] = useState("Creative Explorer");
  const [formIsPioneer, setFormIsPioneer] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [familyFormError, setFamilyFormError] = useState("");

  // New Period form fields
  const [periodName, setPeriodName] = useState("");
  const [periodTarget, setPeriodTarget] = useState("Adventure 2");
  const [periodPrev, setPeriodPrev] = useState("Adventure 1");
  const [periodReset, setPeriodReset] = useState(false);

  // Email Sending Modal state
  const [emailModalFamily, setEmailModalFamily] = useState<Family | null>(null);
  const [emailType, setEmailType] = useState<"promo_code" | "payment_reminder" | "slot_released" | "custom">("promo_code");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailCustomMessage, setEmailCustomMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch renewals & families
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, rRes, fRes] = await Promise.all([
        fetch("/api/renewals/periods"),
        fetch(`/api/renewals?period=${selectedPeriod}`),
        fetch(`/api/renewals/families?period=${selectedPeriod}`),
      ]);

      const [pData, rData, fData] = await Promise.all([pRes.json(), rRes.json(), fRes.json()]);

      if (pData.success) setPeriods(pData.data);
      if (rData.success) {
        setRenewalRecords(rData.data.records);
        setStats(rData.data.stats);
        setSlotOverview(rData.data.slotOverview);
      } else {
        console.error("Renewals API error:", rData.error || rRes.status);
      }
      if (fData.success) setFamilies(fData.data);
    } catch (err) {
      console.error("Failed to load renewals data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const [mounted, setMounted] = useState(false);
  const [deadlineText, setDeadlineText] = useState("");

  // Deadline comes from the API (single source of truth), with a fallback until it loads
  const deadlineIso = stats?.deadlineIso || FALLBACK_DEADLINE_ISO;
  const minStudents = stats?.minStudentsPerSession ?? 3;
  const deadlinePassed = new Date(deadlineIso).getTime() < Date.now();

  useEffect(() => {
    setMounted(true);
    const computeDeadline = () => {
      const target = new Date(deadlineIso).getTime();
      const diff = target - Date.now();
      if (diff <= 0) return "Deadline has passed (Oct 16, 1:00 PM)";
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${days}d ${hours}h ${mins}m remaining until Oct 16, 1:00 PM`;
    };
    setDeadlineText(computeDeadline());
    const timer = setInterval(() => setDeadlineText(computeDeadline()), 60000);
    return () => clearInterval(timer);
  }, [deadlineIso]);

  // Filtered Renewals
  const filteredRenewals = useMemo(() => {
    return renewalRecords.filter((r) => {
      const q = renewalSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (r.childName || "").toLowerCase().includes(q) ||
        (r.parentName || "").toLowerCase().includes(q) ||
        (r.parentEmail || "").toLowerCase().includes(q) ||
        (r.referenceNumber || "").toLowerCase().includes(q);

      const matchStatus = renewalStatusFilter === "all" || r.renewalStatus === renewalStatusFilter;
      const matchProgram = renewalProgramFilter === "all" || r.program === renewalProgramFilter;
      const matchPayment = renewalPaymentFilter === "all" || r.paymentStatus === renewalPaymentFilter;

      return matchSearch && matchStatus && matchProgram && matchPayment;
    });
  }, [renewalRecords, renewalSearch, renewalStatusFilter, renewalProgramFilter, renewalPaymentFilter]);

  // Split into active vs archived (released)
  const activeRenewals = useMemo(
    () => filteredRenewals.filter((r) => r.renewalStatus !== "released"),
    [filteredRenewals]
  );
  const archivedRenewals = useMemo(
    () => filteredRenewals.filter((r) => r.renewalStatus === "released"),
    [filteredRenewals]
  );

  // Filtered Families (null-safe: a missing phone/name no longer crashes the page)
  const filteredFamilies = useMemo(() => {
    return families.filter((f) => {
      const q = familySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (f.childName || "").toLowerCase().includes(q) ||
        (f.parentName || "").toLowerCase().includes(q) ||
        (f.parentEmail || "").toLowerCase().includes(q) ||
        String(f.phone || "").toLowerCase().includes(q);

      const matchStatus =
        familyStatusFilter === "all" ||
        (familyStatusFilter === "pioneer" ? Boolean(f.isPioneer) : f.renewalStatus === familyStatusFilter);

      // Match program category (either from adventures history, previousProgram, or renewingTo)
      let matchProgram = true;
      if (familyProgramFilter !== "all") {
        const pf = familyProgramFilter.toLowerCase();
        const inAdventures = f.adventures?.some((a) => (a.program || "").toLowerCase().includes(pf));
        const inPrev = (f.previousProgram || "").toLowerCase().includes(pf);
        const inRenewing = (f.renewingTo || "").toLowerCase().includes(pf);
        matchProgram = Boolean(inAdventures || inPrev || inRenewing);
      }

      return matchSearch && matchStatus && matchProgram;
    });
  }, [families, familySearch, familyStatusFilter, familyProgramFilter]);

  // Custom Dialog Modal State (Replaces native browser alerts/confirms)
  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean;
    type: "success" | "error" | "info" | "confirm";
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }>({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const showModalNotice = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    setFeedbackDialog({
      open: true,
      type,
      title,
      message,
      confirmLabel: "Understood",
      onConfirm: () => setFeedbackDialog((prev) => ({ ...prev, open: false })),
    });
  };

  const showModalConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel"
  ) => {
    setFeedbackDialog({
      open: true,
      type: "confirm",
      title,
      message,
      confirmLabel,
      cancelLabel,
      onConfirm: () => {
        setFeedbackDialog((prev) => ({ ...prev, open: false }));
        onConfirm();
      },
    });
  };

  // Actions on renewal items
  const handleUpdateStatus = (id: string, newStatus: string) => {
    showModalConfirm(
      "Update Renewal Status",
      `Are you sure you want to change this renewal status to "${newStatus}"?`,
      async () => {
        try {
          const res = await fetch(`/api/renewals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update_status", newStatus }),
          });
          if (res.ok) {
            showModalNotice("Status Updated", `Renewal status successfully changed to "${newStatus}".`, "success");
            fetchData();
          } else {
            const d = await res.json().catch(() => ({}));
            showModalNotice("Error", d.error || "Failed to update status. Please try again.", "error");
          }
        } catch {
          showModalNotice("Error", "Failed to update status.", "error");
        }
      },
      "Yes, Update Status"
    );
  };

  const handleReleaseSlot = (id: string) => {
    showModalConfirm(
      "Release Student Slot",
      "Are you sure you want to release this student's slot? This will mark the registration as released/expired and free up room in the class capacity.",
      async () => {
        try {
          const res = await fetch(`/api/renewals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "release_slot" }),
          });
          if (res.ok) {
            showModalNotice("Slot Released", "The slot has been successfully released and freed up for waitlisted families.", "success");
            fetchData();
          } else {
            const d = await res.json().catch(() => ({}));
            showModalNotice("Error", d.error || "Failed to release slot.", "error");
          }
        } catch {
          showModalNotice("Error", "Failed to release slot.", "error");
        }
      },
      "Yes, Release Slot"
    );
  };

  // Add / Edit Family submit
  const handleSaveFamily = async () => {
    if (!formParentEmail || !formChildName) {
      setFamilyFormError("Parent email and child name are required.");
      return;
    }
    setFamilyFormError("");

    try {
      if (editingFamily) {
        const res = await fetch(`/api/renewals/families/${editingFamily._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentName: formParentName,
            parentEmail: formParentEmail,
            phone: formPhone,
            childName: formChildName,
            previousProgram: formPreviousProgram,
            renewingTo: formRenewingTo,
            isPioneer: formIsPioneer,
            notes: formNotes,
          }),
        });
        if (res.ok) {
          setEditingFamily(null);
          setAddFamilyModal(false);
          resetFamilyForm();
          fetchData();
        } else {
          const d = await res.json();
          setFamilyFormError(d.error || "Failed to update family.");
        }
      } else {
        const res = await fetch("/api/renewals/families", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentName: formParentName,
            parentEmail: formParentEmail,
            phone: formPhone,
            childName: formChildName,
            previousProgram: formPreviousProgram,
            renewingTo: formRenewingTo,
            isPioneer: formIsPioneer,
            notes: formNotes,
            renewalPeriod: selectedPeriod,
          }),
        });
        const d = await res.json();
        if (d.success) {
          setAddFamilyModal(false);
          resetFamilyForm();
          fetchData();
        } else {
          setFamilyFormError(d.error || "Failed to add family.");
        }
      }
    } catch (err) {
      setFamilyFormError("Network error occurred.");
    }
  };

  const resetFamilyForm = () => {
    setFormParentName("");
    setFormParentEmail("");
    setFormPhone("");
    setFormChildName("");
    setFormPreviousProgram("Curious Explorer");
    setFormRenewingTo("Creative Explorer");
    setFormIsPioneer(false);
    setFormNotes("");
    setFamilyFormError("");
  };

  const handleDeleteFamily = (id: string, name: string) => {
    showModalConfirm(
      "Delete Family Record",
      `Are you sure you want to permanently delete the family record for ${name}?`,
      async () => {
        try {
          await fetch(`/api/renewals/families/${id}`, { method: "DELETE" });
          showModalNotice("Record Deleted", `The family record for ${name} has been removed.`, "success");
          fetchData();
        } catch {
          showModalNotice("Error", "Failed to delete family record.", "error");
        }
      },
      "Yes, Delete Record"
    );
  };

  // Download Import Template
  const handleDownloadTemplate = () => {
    const headers = [
      ["Parent Name", "Parent Email", "Phone Number", "Child Name", "Previous Program", "Renewing To", "Notes"],
      ["Maria Santos", "maria.santos@gmail.com", "09171234567", "Leo Santos", "Adventure 1", "Adventure 2", "Preferred afternoon class"],
      ["Juan Dela Cruz", "juan.delacruz@yahoo.com", "09189876543", "Sofia Dela Cruz", "Adventure 1", "Adventure 2", "Returning explorer"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Families Template");
    XLSX.writeFile(wb, "MerryExplorers_Renewal_Families_Template.xlsx");
  };

  // Handle CSV/Excel File Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        // String() guards against Excel giving numbers (e.g. phone numbers)
        const str = (v: any) => String(v ?? "").trim();

        const parsed = data.map((row) => ({
          parentName: str(row["Parent Name"] || row["parentName"] || row["Parent/Guardian Name"]),
          parentEmail: str(row["Parent Email"] || row["parentEmail"] || row["Email"]),
          phone: str(row["Phone Number"] || row["Phone"] || row["phone"]),
          childName: str(row["Child Name"] || row["childName"] || row["Explorer"]),
          previousProgram: str(row["Previous Program"] || row["previousProgram"]) || "Adventure 1",
          renewingTo: str(row["Renewing To"] || row["renewingTo"]) || "Adventure 2",
          notes: str(row["Notes"] || row["notes"]),
        }));

        // check duplicates against current state
        let dups = 0;
        const validRows: any[] = [];
        parsed.forEach((row) => {
          const email = row.parentEmail.toLowerCase();
          const child = row.childName.toLowerCase();
          const isDup = families.some(
            (f) => (f.parentEmail || "").toLowerCase() === email && (f.childName || "").toLowerCase() === child
          );
          if (isDup) dups++;
          if (email && child) validRows.push(row);
        });

        setImportData(validRows);
        setImportPreview({
          total: parsed.length,
          valid: validRows.length,
          duplicates: dups,
        });
        setImportModal(true);
      } catch {
        showModalNotice("File Read Error", "Could not parse file. Please verify columns and that the file is a valid .xlsx or .csv document.", "error");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Commit Bulk Import
  const handleCommitImport = async () => {
    if (importData.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/renewals/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          families: importData.map((d) => ({
            ...d,
            renewalPeriod: selectedPeriod,
          })),
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setImportModal(false);
        setImportData([]);
        fetchData();
        showModalNotice(
          "Import Successful",
          `Successfully imported ${resData.data.inserted} families into the contact list! ${resData.data.duplicates.length} duplicate entries were automatically skipped.`,
          "success"
        );
      } else {
        showModalNotice("Import Error", resData.error || "Failed to import families.", "error");
      }
    } catch {
      showModalNotice("Error", "Network error occurred during import.", "error");
    } finally {
      setImporting(false);
    }
  };

  // Export Renewals to CSV / Excel
  const handleExportRenewals = () => {
    const rows = filteredRenewals.map((r) => ({
      "Child Name": r.childName,
      "Parent Name": r.parentName,
      "Email": r.parentEmail,
      "Phone": r.phone,
      "Program": r.program,
      "Session/Class": r.classTime,
      "Reservation Type": r.reservationType,
      "Promo Code": r.promoCode || "None",
      "Renewal Status": r.renewalStatus,
      "Payment Status": r.paymentStatus,
      "Total Tuition": r.totalTuition,
      "Expected 60% Downpayment": r.expectedDownpayment,
      "Amount Paid": r.amountPaid,
      "Remaining Balance": r.remainingBalance,
      "Payment Method": r.paymentMethod,
      "Reference Number": r.referenceNumber,
      "Submitted At": new Date(r.submittedAt).toLocaleString(),
      "Reserved Until": new Date(r.reservedUntil).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Renewals");
    XLSX.writeFile(wb, `MerryExplorers_Renewals_${selectedPeriod}.xlsx`);
  };

  // Create New Period Submit
  const handleCreatePeriod = async () => {
    if (!periodName.trim()) {
      showModalNotice("Required Field", "Please specify a name for the new renewal period.", "error");
      return;
    }
    try {
      const res = await fetch("/api/renewals/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: periodName,
          targetProgram: periodTarget,
          previousProgram: periodPrev,
          resetStatuses: periodReset,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setNewPeriodModal(false);
        setPeriodName("");
        fetchData();
        showModalNotice("Renewal Period Created", `"${periodName}" has been established as an active renewal cycle!`, "success");
      } else {
        showModalNotice("Error", d.error || "Failed to create period", "error");
      }
    } catch {
      showModalNotice("Error", "Network error occurred.", "error");
    }
  };

  // ── Bulk email helpers ─────────────────────────────────────────────────
  // A record counts as "unpaid" if it hasn't met its downpayment.
  // NOTE: the API returns "—" (truthy!) when an email is missing, so check for it.
  const isUnpaid = (r: RenewalRecord) =>
    r.expectedDownpayment ? r.amountPaid < r.expectedDownpayment : r.amountPaid === 0;
  const hasEmail = (r: RenewalRecord) => Boolean(r.parentEmail) && r.parentEmail !== "—";

  // Sends one email per record and reports what actually happened.
  const sendBulkEmail = async (
    items: RenewalRecord[],
    type: "payment_reminder" | "slot_released"
  ) => {
    let sent = 0;
    const failed: string[] = [];
    for (const item of items) {
      if (!item.familyId) {
        failed.push(`${item.childName} (not in contact list)`);
        continue;
      }
      try {
        const res = await fetch("/api/renewals/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ familyId: item.familyId, emailType: type }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.success) sent++;
        else failed.push(`${item.childName}${d.error ? ` (${d.error})` : ""}`);
      } catch {
        failed.push(item.childName);
      }
    }
    return { sent, failed };
  };

  const reportBulkResult = (label: string, sent: number, failed: string[]) => {
    if (failed.length === 0) {
      showModalNotice(`${label} Sent`, `Successfully sent to ${sent} family/families.`, "success");
    } else {
      const shown = failed.slice(0, 8).join(", ");
      const more = failed.length > 8 ? ` …and ${failed.length - 8} more` : "";
      showModalNotice(
        `${label}: ${sent} sent, ${failed.length} failed`,
        `Not delivered: ${shown}${more}. Check these families and retry individually.`,
        "error"
      );
    }
  };

  // Remind All Unpaid Families (October 16, 1:00 PM Deadline Reminder)
  const [remindingAll, setRemindingAll] = useState(false);
  const handleRemindAllUnpaid = async () => {
    const unpaidList = renewalRecords.filter(
      (r) =>
        (r.renewalStatus === "reserved" || r.renewalStatus === "for_release") &&
        isUnpaid(r) &&
        hasEmail(r)
    );
    if (unpaidList.length === 0) {
      showModalNotice("All Set", "There are currently no unpaid reservations to remind.", "info");
      return;
    }

    setFeedbackDialog({
      open: true,
      type: "confirm",
      title: "Send Oct 16 1:00 PM Payment Reminder?",
      message: `Send the payment deadline reminder (with payment link and Adventure 1 balance disclaimer) to ${unpaidList.length} family/families who have not yet paid the downpayment?`,
      confirmLabel: `Send Reminders (${unpaidList.length})`,
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setFeedbackDialog((prev) => ({ ...prev, open: false }));
        setRemindingAll(true);
        try {
          const { sent, failed } = await sendBulkEmail(unpaidList, "payment_reminder");
          fetchData();
          reportBulkResult("Reminders", sent, failed);
        } finally {
          setRemindingAll(false);
        }
      },
    });
  };

  // Notify Released Slots.
  // Only for records that are ACTUALLY for_release / released, and only AFTER the deadline.
  // (The old version also included "reserved", i.e. slots still being held.)
  const [releasingAll, setReleasingAll] = useState(false);
  const handleNotifyReleasedSlots = async () => {
    if (!deadlinePassed) {
      showModalNotice(
        "Too Early",
        "Release notices can only be sent after the deadline (Oct 16, 1:00 PM). Until then, these slots are still being held.",
        "error"
      );
      return;
    }

    // Skip families already sent a release notice (ASSUMPTION: lastEmailSent contains "release").
    // Confirm against what /api/renewals/send-email actually stores.
    const alreadyNotified = new Set(
      families
        .filter((f) => String(f.lastEmailSent || "").toLowerCase().includes("release"))
        .map((f) => f._id)
    );

    const unpaidList = renewalRecords.filter(
      (r) =>
        (r.renewalStatus === "for_release" || r.renewalStatus === "released") &&
        isUnpaid(r) &&
        hasEmail(r) &&
        !(r.familyId && alreadyNotified.has(r.familyId))
    );
    if (unpaidList.length === 0) {
      showModalNotice("All Set", "No unpaid families are waiting for a slot release notice.", "info");
      return;
    }

    setFeedbackDialog({
      open: true,
      type: "confirm",
      title: "Send 'Slot Released' Notice?",
      message: `Send the official "Your slot has been released" email to ${unpaidList.length} family/families? They'll be told the reservation expired and they must submit a new registration form.`,
      confirmLabel: `Send Release Notices (${unpaidList.length})`,
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setFeedbackDialog((prev) => ({ ...prev, open: false }));
        setReleasingAll(true);
        try {
          const { sent, failed } = await sendBulkEmail(unpaidList, "slot_released");
          fetchData();
          reportBulkResult("Release Notices", sent, failed);
        } finally {
          setReleasingAll(false);
        }
      },
    });
  };

  // Handle Send Email
  const handleSendEmailSubmit = async () => {
    if (!emailModalFamily) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/renewals/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: emailModalFamily._id,
          emailType,
          customSubject: emailSubject || undefined,
          customMessage: emailCustomMessage || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailModalFamily(null);
        setEmailCustomMessage("");
        fetchData();
        showModalNotice("Email Sent", data.message || "Email successfully sent to the parent!", "success");
      } else {
        showModalNotice("Failed to Send", data.error || "Email delivery failed", "error");
      }
    } catch {
      showModalNotice("Network Error", "Unable to reach the email dispatch server.", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <AppShell title="Renewals & Contact List" description="Track reservations, downpayments, and manage reusable family contact lists.">
      <div className="space-y-6 pb-12">
        {/* ── TOP HEADER & PERIOD SELECTOR ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔄</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline text-[22px] font-extrabold text-[#002f76]">Renewals Hub</h1>
                <span className="rounded-full bg-blue-100 text-[#0033A0] px-3 py-0.5 text-[11px] font-bold tracking-wide">
                  Admin Only
                </span>
              </div>
              <p className="text-[13px] text-[#64748b]">
                Manage reservation codes, payment sync, and family communications.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2">
              <span className="text-[12px] font-bold text-[#64748b]">Period:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-[13px] font-bold text-[#002f76] focus:outline-none cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/admin/renewals/email-preview"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-[12.5px] font-bold text-[#002f76] shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span>📧</span> Email Previews
            </Link>

            <button
              onClick={() => setNewPeriodModal(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#0033A0] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm hover:bg-[#002f76] transition-colors"
            >
              <span>+</span> Start New Period
            </button>
          </div>
        </div>

        {/* ── DEADLINE & COUNTDOWN BANNER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border border-amber-300 px-6 py-4 text-amber-900">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-[13.5px] font-bold">
                Promo Code Expiry &amp; Slot Release: <span className="underline">October 16, 2026 at 1:00 PM</span>
              </p>
              <p className="text-[12px] text-amber-800">
                A slot is confirmed only upon receipt of 60% downpayment. Unpaid reservations are flagged for admin release after this deadline.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-amber-500 text-white px-3.5 py-1.5 text-[12px] font-bold self-start sm:self-auto shrink-0 shadow-sm">
            {mounted ? deadlineText : "Calculating remaining time..."}
          </div>
        </div>

        {/* ── STREAMLINED EXECUTIVE KPIS & FINANCIAL METRICS ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Families */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/70 shadow-xs hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Master Families</span>
                <span className="text-sm">👨‍👩‍👧</span>
              </div>
              <p className="mt-1 text-2xl font-black text-[#002f76]">{stats.totalFamilies}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">In contact directory</p>
            </div>

            {/* Submitted */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/70 shadow-xs hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Submitted</span>
                <span className="text-sm">📝</span>
              </div>
              <p className="mt-1 text-2xl font-black text-emerald-600">{stats.submittedCount}</p>
              <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{stats.renewalRate}% renewal rate</p>
            </div>

            {/* Reserved Unpaid */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/70 shadow-xs hover:border-amber-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reserved (Hold)</span>
                <span className="text-sm">⏳</span>
              </div>
              <p className="mt-1 text-2xl font-black text-amber-600">{stats.countReserved}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">{stats.promoReservations} via promo code</p>
            </div>

            {/* Confirmed (60% Downpayment) */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/70 shadow-xs hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confirmed (60%)</span>
                <span className="text-sm">✅</span>
              </div>
              <p className="mt-1 text-2xl font-black text-blue-600">{stats.countConfirmed}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">{stats.conversionRate}% converted</p>
            </div>

            {/* Total Collected */}
            <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Collected</span>
                <span className="text-sm">💰</span>
              </div>
              <p className="mt-1 text-2xl font-black text-emerald-900">₱{stats.totalCollected.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Expected: ₱{stats.totalExpectedDownpayment.toLocaleString()}</p>
            </div>

            {/* Outstanding Balance */}
            <div className="rounded-2xl bg-amber-50/70 p-4 border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Balance Due</span>
                <span className="text-sm">⚖️</span>
              </div>
              <p className="mt-1 text-2xl font-black text-amber-900">₱{stats.totalOutstandingBalance.toLocaleString()}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Remaining tuition</p>
            </div>
          </div>
        )}

        {/* ── PART E: SLOT OVERVIEW & MINIMUM CLASS SIZE MONITOR (Collapsible) ── */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => setShowClassTracker(!showClassTracker)}
            className="flex flex-wrap items-center justify-between p-5 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 font-bold text-lg">
                🏫
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline text-[15px] font-extrabold text-[#002f76]">
                    Class Size &amp; Session Tracker
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    Min. {minStudents} students rule
                  </span>
                </div>
                <p className="text-[12px] text-[#64748b]">
                  {showClassTracker
                    ? "Click to collapse session breakdown"
                    : "Click to expand live class capacity and see sessions needing students"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-2 sm:mt-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="flex items-center gap-1 text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl">
                  ⚠️ Below Min (&lt;{minStudents})
                </span>
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                  ✓ Proceeding ({minStudents}+)
                </span>
              </div>
              <button
                type="button"
                className="ml-2 rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-sm font-bold"
              >
                {showClassTracker ? "▲ Hide" : "▼ Show"}
              </button>
            </div>
          </div>

          {showClassTracker && (
            <div className="p-6 pt-2 border-t border-slate-100 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {Object.entries(slotOverview).map(([progKey, progData]) => (
                  <div key={progKey} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 shadow-xs">
                    <p className="text-[13px] font-bold text-[#002f76] capitalize flex items-center justify-between">
                      <span>{progKey.replace(/-/g, " ")}</span>
                      <span className="text-[11px] font-normal text-slate-500">Cap: {progData.totalMax}</span>
                    </p>
                    <div className="space-y-2">
                      {Object.entries(progData.sessions).map(([sessName, sessInfo]) => (
                        <div
                          key={sessName}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-[12px] transition-all ${sessInfo.belowMin
                              ? "bg-orange-50/70 border-orange-200 text-orange-950 font-medium"
                              : "bg-emerald-50/40 border-emerald-200/60 text-slate-700"
                            }`}
                        >
                          <div>
                            <p className="font-bold text-[12px]">{sessName}</p>
                            <p className="text-[10.5px] text-slate-500">
                              Max: {sessInfo.max} students
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg font-bold text-[11px] ${sessInfo.belowMin
                                  ? "bg-orange-200 text-orange-800"
                                  : sessInfo.taken >= sessInfo.max
                                    ? "bg-slate-200 text-slate-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                            >
                              {sessInfo.taken} / {sessInfo.max}
                            </span>
                            {sessInfo.belowMin && (
                              <p className="text-[10px] text-orange-700 font-bold mt-0.5">Needs {Math.max(0, minStudents - sessInfo.taken)} more</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── TABS NAVIGATION ── */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("renewals")}
            className={`flex items-center gap-2 px-6 py-3 font-headline text-[15px] font-bold border-b-2 transition-all ${activeTab === "renewals"
                ? "border-[#0033A0] text-[#0033A0]"
                : "border-transparent text-[#64748b] hover:text-[#002f76]"
              }`}
          >
            <span>📋</span> Active Renewals ({activeRenewals.length})
            {archivedRenewals.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                +{archivedRenewals.length} archived
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("families")}
            className={`flex items-center gap-2 px-6 py-3 font-headline text-[15px] font-bold border-b-2 transition-all ${activeTab === "families"
                ? "border-[#0033A0] text-[#0033A0]"
                : "border-transparent text-[#64748b] hover:text-[#002f76]"
              }`}
          >
            <span>👨‍👩‍👧</span> Families Contact List ({filteredFamilies.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-6 py-3 font-headline text-[15px] font-bold border-b-2 transition-all ${activeTab === "settings"
                ? "border-[#0033A0] text-[#0033A0]"
                : "border-transparent text-[#64748b] hover:text-[#002f76]"
              }`}
          >
            <span>⚙️</span> Renewal Settings
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: RENEWALS & RESERVATIONS                                         */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "renewals" && (
          <div className="space-y-4">
            {/* Controls & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <input
                  type="text"
                  value={renewalSearch}
                  onChange={(e) => setRenewalSearch(e.target.value)}
                  placeholder="Search student, parent, email, ref #..."
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] w-full sm:w-64 focus:outline-none focus:border-[#0033A0]"
                />

                <select
                  value={renewalStatusFilter}
                  onChange={(e) => setRenewalStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="reserved">🟡 Reserved (Unpaid)</option>
                  <option value="confirmed">🟢 Confirmed (60%+)</option>
                  <option value="for_release">🟠 For Release</option>
                  <option value="released">⚪ Released</option>
                </select>

                <select
                  value={renewalPaymentFilter}
                  onChange={(e) => setRenewalPaymentFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-700"
                >
                  <option value="all">All Payments</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="downpayment_received">Downpayment Received</option>
                  <option value="fully_paid">Fully Paid</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={remindingAll}
                  onClick={handleRemindAllUnpaid}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 text-[12px] font-bold transition-colors shadow-sm disabled:opacity-50"
                  title="Send payment reminder email for Oct 16 1:00 PM deadline to unpaid families"
                >
                  <span>⏰</span>
                  <span>{remindingAll ? "Sending Reminders..." : "Remind: Oct 16 1PM"}</span>
                </button>

                <button
                  disabled={releasingAll || !deadlinePassed}
                  onClick={handleNotifyReleasedSlots}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-[12px] font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    deadlinePassed
                      ? "Send official slot released email to unpaid families whose slots are for release / released"
                      : "Available after the Oct 16 1:00 PM deadline"
                  }
                >
                  <span>📢</span>
                  <span>{releasingAll ? "Notifying..." : "Notify Slot Released (Oct 16)"}</span>
                </button>

                <button
                  onClick={handleExportRenewals}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-[#002f76] hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <span>📥</span> Export to Excel
                </button>
              </div>
            </div>

            {/* Renewals Table — Active Only */}
            <div className="overflow-x-auto rounded-3xl bg-white border border-slate-100 shadow-sm">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11.5px] font-bold uppercase tracking-wider text-[#64748b]">
                    <th className="py-3.5 px-4">Explorer &amp; Parent</th>
                    <th className="py-3.5 px-4">Program &amp; Session</th>
                    <th className="py-3.5 px-4">Reservation Type</th>
                    <th className="py-3.5 px-4">Expiry Window</th>
                    <th className="py-3.5 px-4">Renewal Status</th>
                    <th className="py-3.5 px-4">Financials</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#334155]">
                  {activeRenewals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No active renewal submissions found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    activeRenewals.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#002f76]">{r.childName}</p>
                          <p className="text-[11.5px] text-slate-500">{r.parentName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{r.parentEmail}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium capitalize text-slate-800">{(r.program || "").replace(/-/g, " ")}</p>
                          <p className="text-[11.5px] text-slate-500">{r.classTime}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${r.isPromo
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                              }`}
                          >
                            {r.reservationType}
                          </span>
                          {r.promoCode && (
                            <p className={`text-[10px] font-mono mt-0.5 ${r.promoCode.toUpperCase() === "JESUSLOVESME" ? "text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" : "text-amber-700"}`}>
                              {r.promoCode.toUpperCase() === "JESUSLOVESME" ? "🎓 Scholar" : `Code: ${r.promoCode}`}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-[11.5px] text-slate-700 font-medium">
                            {new Date(r.reservedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                          <p className="text-[10.5px] text-slate-400">
                            Sub: {new Date(r.submittedAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11.5px] font-bold ${r.renewalStatus === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.renewalStatus === "for_release"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                          >
                            {r.renewalStatus === "confirmed" && (r.isVerified ? "🟢 Confirmed (Verified)" : "🟢 Confirmed")}
                            {r.renewalStatus === "reserved" && "🟡 Reserved (Unpaid)"}
                            {r.renewalStatus === "for_release" && "🟠 For Release"}
                            {r.renewalStatus === "released" && "⚪ Released"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-[11.5px]">
                            <p>Due: <strong>₱{r.totalTuition.toLocaleString()}</strong></p>
                            <p className="text-emerald-700 font-bold">Paid: ₱{r.amountPaid.toLocaleString()}</p>
                            <p className="text-amber-700">Bal: ₱{r.remainingBalance.toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.isVerified ? (
                              <a
                                href={`/admin/payments?search=${encodeURIComponent(r.childName)}`}
                                title={`Payment verified${r.approvedAt ? ` on ${new Date(r.approvedAt).toLocaleDateString()}` : ""}`}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11.5px] font-bold shadow-sm inline-flex items-center gap-1 transition-colors"
                              >
                                ✅ Verified
                              </a>
                            ) : r.renewalStatus === "confirmed" || r.paymentStatus === "fully_paid" || r.amountPaid > 0 ? (
                              <a
                                href={`/admin/payments?search=${encodeURIComponent(r.childName)}`}
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[11.5px] font-bold shadow-sm inline-flex items-center gap-1 transition-colors"
                              >
                                ✓ Verify Payment
                              </a>
                            ) : (
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    record_payment: "true",
                                    regId: r.registrationId,
                                    childName: r.childName,
                                    parentName: r.parentName,
                                    ...(r.expectedDownpayment ? { amount: String(r.expectedDownpayment) } : {}),
                                  });
                                  router.push(`/admin/payments?${params.toString()}`);
                                }}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11.5px] font-bold shadow-sm"
                              >
                                💵 Record Payment
                              </button>
                            )}

                            {r.renewalStatus === "for_release" && (
                              <button
                                onClick={() => handleReleaseSlot(r.registrationId)}
                                className="rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1 text-[11.5px] font-bold shadow-sm"
                              >
                                Release Slot
                              </button>
                            )}

                            <select
                              value={r.renewalStatus}
                              onChange={(e) => handleUpdateStatus(r.registrationId, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 cursor-pointer"
                            >
                              <option value="reserved">Reserved</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="for_release">For Release</option>
                              <option value="released">Released</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── ARCHIVE: Released / Expired Slots ── */}
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setArchiveOpen((o) => !o)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 text-base">
                    🗄️
                  </div>
                  <div className="text-left">
                    <p className="font-headline text-[14.5px] font-extrabold text-slate-700">
                      Released / Expired Archive
                    </p>
                    <p className="text-[11.5px] text-slate-400">
                      {archivedRenewals.length === 0
                        ? "No released slots yet"
                        : `${archivedRenewals.length} slot${archivedRenewals.length !== 1 ? "s" : ""} released — kept for payment record-keeping`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {archivedRenewals.length > 0 && (
                    <span className="rounded-full bg-slate-200 text-slate-700 px-3 py-0.5 text-[11px] font-bold">
                      {archivedRenewals.length}
                    </span>
                  )}
                  <span className="text-slate-400 text-[12px] font-bold">
                    {archiveOpen ? "▲ Collapse" : "▼ Expand"}
                  </span>
                </div>
              </button>

              {archiveOpen && (
                <div className="border-t border-slate-100">
                  {archivedRenewals.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-slate-400">
                      No released entries match your current filters.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[12.5px]">
                        <thead>
                          <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <th className="py-3 px-4">Explorer &amp; Parent</th>
                            <th className="py-3 px-4">Program &amp; Session</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Submitted</th>
                            <th className="py-3 px-4">Payment Record</th>
                            <th className="py-3 px-4 text-right">Restore</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {archivedRenewals.map((r) => (
                            <tr key={r._id} className="opacity-70 bg-slate-50/30 hover:opacity-100 hover:bg-slate-50 transition-all">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block rounded-full bg-slate-200 text-slate-500 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide">Archived</span>
                                </div>
                                <p className="font-bold text-slate-600 mt-0.5">{r.childName}</p>
                                <p className="text-[11px] text-slate-400">{r.parentName}</p>
                                <p className="text-[10.5px] text-slate-400 font-mono">{r.parentEmail}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-medium capitalize text-slate-600">{(r.program || "").replace(/-/g, " ")}</p>
                                <p className="text-[11px] text-slate-400">{r.classTime}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold ${r.isPromo ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}>
                                  {r.isPromo ? "Promo" : "Direct"}
                                </span>
                                {r.promoCode && (
                                  <p className="text-[9.5px] font-mono text-amber-600 mt-0.5">{r.promoCode}</p>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-[11px] text-slate-500">
                                  {new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-0.5 text-[11px]">
                                  <p className="text-slate-500">Total Due: <span className="font-bold text-slate-700">₱{r.totalTuition.toLocaleString()}</span></p>
                                  <p className={r.amountPaid > 0 ? "text-emerald-600 font-bold" : "text-slate-400"}>
                                    Paid: ₱{r.amountPaid.toLocaleString()}
                                  </p>
                                  {r.amountPaid > 0 && r.remainingBalance > 0 && (
                                    <p className="text-rose-500 text-[10.5px]">Bal: ₱{r.remainingBalance.toLocaleString()} (unpaid at release)</p>
                                  )}
                                  {r.amountPaid === 0 && (
                                    <span className="inline-block rounded bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[9.5px] font-bold">No Payment Made</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <select
                                  value="released"
                                  onChange={(e) => handleUpdateStatus(r.registrationId, e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 cursor-pointer hover:border-blue-300"
                                  title="Restore this record to active renewals"
                                >
                                  <option value="released">Released</option>
                                  <option value="reserved">↩ Restore: Reserved</option>
                                  <option value="confirmed">↩ Restore: Confirmed</option>
                                  <option value="for_release">↩ Restore: For Release</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: FAMILIES MASTER CONTACT LIST                                    */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "families" && (
          <div className="space-y-4">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <input
                  type="text"
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                  placeholder="Search family by parent, child, or email..."
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] w-full sm:w-64 focus:outline-none focus:border-[#0033A0]"
                />

                <select
                  value={familyStatusFilter}
                  onChange={(e) => setFamilyStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-700"
                >
                  <option value="all">All Renewal Statuses</option>
                  <option value="pioneer">⭐ Pioneer Families Only</option>
                  <option value="not_yet_submitted">Not Yet Submitted</option>
                  <option value="reserved">Reserved</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="released">Released</option>
                </select>

                <select
                  value={familyProgramFilter}
                  onChange={(e) => setFamilyProgramFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-700"
                >
                  <option value="all">All Program Categories</option>
                  <option value="brave">Brave Explorer (Trailblazer)</option>
                  <option value="creative">Creative Explorer</option>
                  <option value="curious">Curious Explorer</option>
                  <option value="everyday">Everyday Explorer</option>
                  <option value="ballet">Ballet (Baby/Basic)</option>
                  <option value="playdate">Saturday Playdate</option>
                  <option value="virtual">Virtual Tutorial</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    resetFamilyForm();
                    setEditingFamily(null);
                    setAddFamilyModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] hover:bg-[#002f76] text-white px-3.5 py-2 text-[12.5px] font-bold shadow-sm transition-colors"
                >
                  <span>+</span> Add Family
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#002f76] px-3.5 py-2 text-[12.5px] font-bold shadow-sm transition-colors"
                >
                  <span>📤</span> Import CSV / Excel
                </button>

                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
                >
                  <span>📄</span> Download Template
                </button>
              </div>
            </div>

            {/* Families Table */}
            <div className="overflow-x-auto rounded-3xl bg-white border border-slate-100 shadow-sm">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11.5px] font-bold uppercase tracking-wider text-[#64748b]">
                    <th className="py-3.5 px-4">Parent / Guardian</th>
                    <th className="py-3.5 px-4">Contact Details</th>
                    <th className="py-3.5 px-4">Explorer (Child)</th>
                    <th className="py-3.5 px-4">Adventure History</th>
                    <th className="py-3.5 px-4">Renewing To</th>
                    <th className="py-3.5 px-4">Renewal Status</th>
                    <th className="py-3.5 px-4">Email Logs</th>
                    <th className="py-3.5 px-4">Notes</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#334155]">
                  {filteredFamilies.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No family records found. Click &quot;Add Family&quot; or &quot;Import CSV/Excel&quot; to populate your contact list.
                      </td>
                    </tr>
                  ) : (
                    filteredFamilies.map((f) => (
                      <tr
                        key={f._id}
                        onClick={() => {
                          setEmailModalFamily(f);
                          setEmailType("promo_code");
                          setEmailSubject(`Priority Renewal & Slot Reservation Code for ${f.childName} 🌈`);
                          setEmailCustomMessage("");
                        }}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-bold text-[#002f76] group-hover:underline">
                          {f.parentName || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-mono text-[11.5px] text-slate-700">{f.parentEmail}</p>
                          {f.phone && <p className="text-[11px] text-slate-500">{f.phone}</p>}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{f.childName}</span>
                            {f.isPioneer && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs" title="Pioneer Family (Special discounted rate applies)">
                                ⭐ Pioneer
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[12px]">
                          <div className="flex flex-wrap gap-1 min-w-[160px]">
                            {f.adventures && f.adventures.length > 0 ? (
                              f.adventures.map((adv, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200/70 px-2.5 py-1 text-[11.5px] font-medium text-[#002f76] whitespace-nowrap shadow-xs"
                                  title={`Registered in ${adv.program}`}
                                >
                                  <strong className="font-extrabold text-[#0033a0]">{adv.adventure}:</strong> {adv.program}
                                </span>
                              ))
                            ) : f.previousProgram ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200/70 px-2.5 py-1 text-[11.5px] font-medium text-[#002f76] whitespace-nowrap shadow-xs">
                                <strong className="font-extrabold text-[#0033a0]">Adventure 1:</strong> {f.previousProgram}
                              </span>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                Adventure 1
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[12px]">
                          {f.renewingTo && f.renewingTo.toLowerCase().includes("adventure") ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11.5px] font-bold text-amber-900 whitespace-nowrap shadow-xs">
                              {f.renewingTo}
                            </span>
                          ) : f.renewingTo ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11.5px] font-bold text-amber-900 whitespace-nowrap shadow-xs">
                              <strong className="font-extrabold text-amber-950">Adventure 2:</strong> {f.renewingTo}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11.5px] font-bold text-amber-900 whitespace-nowrap shadow-xs">
                              Adventure 2
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${f.renewalStatus === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : f.renewalStatus === "reserved"
                                  ? "bg-amber-100 text-amber-800"
                                  : f.renewalStatus === "released"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                          >
                            {f.renewalStatus === "not_yet_submitted" && "Not Yet Submitted"}
                            {f.renewalStatus === "reserved" && "Reserved"}
                            {f.renewalStatus === "confirmed" && "Confirmed"}
                            {f.renewalStatus === "released" && "Released"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {f.lastEmailSent ? (
                            <div>
                              <p className="font-semibold text-emerald-700 flex items-center gap-1">
                                <span>✓</span> {f.lastEmailSent}
                              </p>
                              <p className="text-slate-400">{f.lastEmailDate ? new Date(f.lastEmailDate).toLocaleDateString() : ""}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">None sent</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[11.5px] text-slate-600 max-w-[140px] truncate">
                          {f.notes || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEmailModalFamily(f);
                                setEmailType("promo_code");
                                setEmailSubject(`Priority Renewal & Slot Reservation Code for ${f.childName} 🌈`);
                                setEmailCustomMessage("");
                              }}
                              className="rounded-lg bg-blue-50 text-[#0033A0] hover:bg-[#0033A0] hover:text-white px-2.5 py-1 text-[11.5px] font-bold transition-all shadow-sm"
                            >
                              ✉️ Email
                            </button>
                            <button
                              onClick={() => {
                                setEditingFamily(f);
                                setFormParentName(f.parentName);
                                setFormParentEmail(f.parentEmail);
                                setFormPhone(f.phone || "");
                                setFormChildName(f.childName);
                                setFormPreviousProgram(f.previousProgram || "Curious Explorer");
                                setFormRenewingTo(f.renewingTo || "Creative Explorer");
                                setFormIsPioneer(Boolean(f.isPioneer));
                                setFormNotes(f.notes || "");
                                setAddFamilyModal(true);
                              }}
                              className="text-[12px] font-bold text-[#0033A0] hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteFamily(f._id, `${f.parentName} (${f.childName})`)}
                              className="text-[12px] font-bold text-rose-500 hover:text-rose-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: RENEWAL SETTINGS                                                */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="pt-2">
            <RenewalSettingsManager />
          </div>
        )}

        {/* ── MODAL: ADD / EDIT FAMILY ── */}
        {addFamilyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-headline text-[17px] font-extrabold text-[#002f76]">
                  {editingFamily ? "Edit Family Record" : "Add Family to Contact List"}
                </h3>
                <button
                  onClick={() => setAddFamilyModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {familyFormError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12px] text-rose-700 font-medium">
                  ⚠️ {familyFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Parent Name</label>
                  <input
                    type="text"
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Parent Email *</label>
                  <input
                    type="email"
                    value={formParentEmail}
                    onChange={(e) => setFormParentEmail(e.target.value)}
                    placeholder="maria.santos@gmail.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="09171234567"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Child Name *</label>
                  <input
                    type="text"
                    value={formChildName}
                    onChange={(e) => setFormChildName(e.target.value)}
                    placeholder="Leo Santos"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Previous Program *</label>
                  <select
                    value={formPreviousProgram}
                    onChange={(e) => setFormPreviousProgram(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:border-[#0033A0]"
                  >
                    <option value="Curious Explorer">Curious Explorer</option>
                    <option value="Creative Explorer">Creative Explorer</option>
                    <option value="Everyday Explorer">Everyday Explorer</option>
                    <option value="Trailblazer (Brave Explorer)">Trailblazer (Brave Explorer)</option>
                    <option value="Ballet">Ballet</option>
                    <option value="Saturday Playdate">Saturday Playdate</option>
                    <option value="Virtual Tutorial">Virtual Tutorial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Renewing To *</label>
                  <select
                    value={formRenewingTo}
                    onChange={(e) => setFormRenewingTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:border-[#0033A0]"
                  >
                    <option value="Curious Explorer">Curious Explorer</option>
                    <option value="Creative Explorer">Creative Explorer</option>
                    <option value="Everyday Explorer">Everyday Explorer</option>
                    <option value="Trailblazer (Brave Explorer)">Trailblazer (Brave Explorer)</option>
                    <option value="Ballet">Ballet</option>
                    <option value="Saturday Playdate">Saturday Playdate</option>
                    <option value="Virtual Tutorial">Virtual Tutorial</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="formIsPioneer"
                  checked={formIsPioneer}
                  onChange={(e) => setFormIsPioneer(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="formIsPioneer" className="text-[12.5px] font-medium text-slate-800 cursor-pointer">
                  <span className="font-bold text-amber-900 flex items-center gap-1">⭐ Pioneer Family</span>
                  <span className="text-[11.5px] text-amber-800/90 block mt-0.5">
                    Syncs with Pioneer Families list. Grants special pioneer discounted tuition rates during registration.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-1">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional parent preference or schedule notes..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddFamilyModal(false)}
                  className="rounded-xl px-4 py-2 text-[12.5px] font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFamily}
                  className="rounded-xl bg-[#0033A0] hover:bg-[#002f76] text-white px-5 py-2 text-[12.5px] font-bold shadow-sm transition-colors"
                >
                  {editingFamily ? "Save Changes" : "Add Family"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: BULK IMPORT PREVIEW ── */}
        {importModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-headline text-[17px] font-extrabold text-[#002f76]">
                  Bulk Import Preview
                </h3>
                <button
                  onClick={() => setImportModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-[13px] text-slate-700">
                <p>We found <strong>{importPreview.total}</strong> rows in your uploaded file:</p>
                <ul className="list-disc pl-5 space-y-1 text-[12.5px]">
                  <li className="text-emerald-700"><strong>{importPreview.valid}</strong> valid records ready to be added</li>
                  {importPreview.duplicates > 0 && (
                    <li className="text-amber-700"><strong>{importPreview.duplicates}</strong> duplicate records will be skipped automatically</li>
                  )}
                </ul>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 text-[11.5px] bg-slate-50 space-y-1">
                {importData.slice(0, 10).map((row, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span>{row.childName} ({row.parentName})</span>
                    <span className="font-mono text-slate-500">{row.parentEmail}</span>
                  </div>
                ))}
                {importData.length > 10 && (
                  <p className="text-center text-slate-400 py-1">...and {importData.length - 10} more</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportModal(false)}
                  className="rounded-xl px-4 py-2 text-[12.5px] font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing || importPreview.valid === 0}
                  onClick={handleCommitImport}
                  className="rounded-xl bg-[#0033A0] hover:bg-[#002f76] text-white px-5 py-2 text-[12.5px] font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {importing ? "Importing..." : `Confirm Import (${importPreview.valid})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: START NEW RENEWAL PERIOD ── */}
        {newPeriodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-headline text-[17px] font-extrabold text-[#002f76]">
                  Start New Renewal Period
                </h3>
                <button
                  onClick={() => setNewPeriodModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-[12.5px] text-[#64748b]">
                Create a new period to keep historical data intact while starting fresh notifications.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Period Name *</label>
                  <input
                    type="text"
                    value={periodName}
                    onChange={(e) => setPeriodName(e.target.value)}
                    placeholder="e.g. Adventure 2 Renewal"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-600 mb-1">Target Program</label>
                  <input
                    type="text"
                    value={periodTarget}
                    onChange={(e) => setPeriodTarget(e.target.value)}
                    placeholder="e.g. Adventure 2"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={periodReset}
                    onChange={(e) => setPeriodReset(e.target.checked)}
                    className="mt-0.5 rounded text-[#0033A0]"
                  />
                  <span className="text-[12px] text-slate-700 leading-snug">
                    Reset existing families&apos; status to &quot;Not yet submitted&quot; for this new period (reusable contact list).
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewPeriodModal(false)}
                  className="rounded-xl px-4 py-2 text-[12.5px] font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePeriod}
                  className="rounded-xl bg-[#0033A0] hover:bg-[#002f76] text-white px-5 py-2 text-[12.5px] font-bold shadow-sm transition-colors"
                >
                  Create Period
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: SEND EMAIL TO FAMILY (Triggered by clicking row) ── */}
        {emailModalFamily && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">✉️</span>
                  <div>
                    <h3 className="font-headline text-[17px] font-extrabold text-[#002f76]">
                      Send Email to Family
                    </h3>
                    <p className="text-[12px] text-slate-500">
                      To: <strong>{emailModalFamily.parentName}</strong> ({emailModalFamily.parentEmail})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailModalFamily(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Email Type Selection */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setEmailType("promo_code");
                    setEmailSubject(`Priority Renewal & Slot Reservation Code for ${emailModalFamily.childName} 🌈`);
                  }}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all ${emailType === "promo_code"
                      ? "bg-white text-[#0033A0] shadow-sm"
                      : "text-slate-600 hover:text-[#002f76]"
                    }`}
                >
                  🎟️ Priority Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailType("payment_reminder");
                    setEmailSubject(`Payment Reminder & Slot Confirmation for ${emailModalFamily.childName} 🌈`);
                  }}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all ${emailType === "payment_reminder"
                      ? "bg-white text-[#0033A0] shadow-sm"
                      : "text-slate-600 hover:text-[#002f76]"
                    }`}
                >
                  ⏰ Payment Reminder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailType("slot_released");
                    setEmailSubject(`Notice of Released Slot: Priority Reservation Expired for ${emailModalFamily.childName} ⏳`);
                  }}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all ${emailType === "slot_released"
                      ? "bg-white text-[#0033A0] shadow-sm"
                      : "text-slate-600 hover:text-[#002f76]"
                    }`}
                >
                  🚪 Slot Released
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailType("custom");
                    setEmailSubject(`Merry Explorers: Message regarding ${emailModalFamily.childName}`);
                  }}
                  className={`flex-1 py-2 text-[12px] font-bold rounded-xl transition-all ${emailType === "custom"
                      ? "bg-white text-[#0033A0] shadow-sm"
                      : "text-slate-600 hover:text-[#002f76]"
                    }`}
                >
                  📝 Custom Notice
                </button>
              </div>

              {/* Email Content Preview */}
              {emailType === "promo_code" ? (
                <div className="space-y-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-[12.5px] text-slate-700">
                  <div className="border-b border-slate-200 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subject</p>
                    <p className="font-bold text-[#002f76] mt-0.5">
                      Priority Renewal &amp; Slot Reservation Code for {emailModalFamily.childName} 🌈
                    </p>
                  </div>
                  <div className="space-y-2 text-slate-600 text-[12px] leading-relaxed">
                    <p>Dear <strong>{emailModalFamily.parentName}</strong>,</p>
                    <p>
                      We are delighted to welcome back <strong>{emailModalFamily.childName}</strong> for our upcoming adventure with Merry Explorers!
                    </p>
                    <div className="rounded-xl bg-white border border-dashed border-[#0033A0] p-3 text-center my-2">
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Your Priority Reservation Code</p>
                      <p className="text-xl font-mono font-black text-[#002f76] mt-0.5 tracking-wider">A1RENEWAL2026</p>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11.5px]">
                      <li><strong>Not a discount voucher:</strong> Allows reserving without upfront payment today.</li>
                      <li><strong>Valid until:</strong> October 15, 2026.</li>
                      <li><strong>Release deadline:</strong> Unpaid slots released October 16, 1:00 PM.</li>
                      <li><strong>Confirmation:</strong> Confirmed upon receipt of 60% downpayment.</li>
                      <li>Need help? Ask Teacher Angel onsite.</li>
                    </ul>
                  </div>
                </div>
              ) : emailType === "payment_reminder" ? (
                (() => {
                  const modalMatchingRecord = emailModalFamily ? (
                    emailModalFamily.registrationId
                      ? renewalRecords.find((r) => r.registrationId === emailModalFamily.registrationId)
                      : renewalRecords.find((r) =>
                        r.parentEmail?.toLowerCase() === emailModalFamily.parentEmail?.toLowerCase() &&
                        r.childName?.toLowerCase() === emailModalFamily.childName?.toLowerCase()
                      )
                  ) : null;
                  const displayProgram = modalMatchingRecord?.program || emailModalFamily.renewingTo || emailModalFamily.previousProgram || "Curious Explorer";
                  const isTrailblazer = displayProgram.toLowerCase().includes("trailblazer") || displayProgram.toLowerCase().includes("brave");
                  const displayTuition = modalMatchingRecord?.totalTuition || (isTrailblazer ? 6900 : 4395);
                  const displayDownpayment = modalMatchingRecord?.expectedDownpayment || (isTrailblazer ? 4140 : 2637);

                  return (
                    <div className="space-y-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-[12.5px] text-slate-700">
                      <div className="border-b border-slate-200 pb-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subject</p>
                        <p className="font-bold text-[#002f76] mt-0.5">
                          Payment Reminder &amp; Slot Confirmation for {emailModalFamily.childName} 🌈
                        </p>
                      </div>
                      <div className="space-y-2.5 text-slate-600 text-[12px] leading-relaxed">
                        <p>Dear <strong>{emailModalFamily.parentName}</strong>,</p>
                        <p>
                          Thank you for submitting your priority renewal registration for <strong>{emailModalFamily.childName}</strong>! Your slot is currently on hold under reservation.
                        </p>

                        <div className="rounded-xl bg-white border border-blue-200 p-3 space-y-1.5 text-[11.5px]">
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-500 font-semibold">Explorer:</span>
                            <span className="font-bold text-[#002f76]">{emailModalFamily.childName}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-500 font-semibold">Program:</span>
                            <span className="font-bold text-[#002f76]">{displayProgram}</span>
                          </div>
                          {modalMatchingRecord?.classTime && (
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                              <span className="text-slate-500 font-semibold">Class / Session:</span>
                              <span className="font-bold text-slate-700">{modalMatchingRecord.classTime}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-500 font-semibold">Adventure Cycle:</span>
                            <span className="font-bold text-emerald-700">Adventure 2</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-500 font-semibold">Total Tuition:</span>
                            <span className="font-bold text-slate-800">₱{displayTuition.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1">
                            <span className="text-slate-500 font-semibold">60% Downpayment Due:</span>
                            <span className="font-extrabold text-emerald-700">⭐ ₱{displayDownpayment.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center my-2">
                          <p className="text-[11px] font-bold text-blue-900">Direct Payment Link Included:</p>
                          <p className="text-[11px] text-blue-700 mt-0.5 font-mono">
                            {emailModalFamily.registrationId
                              ? `/register/payment/${emailModalFamily.registrationId}`
                              : `/renew?ref=${emailModalFamily._id}`}
                          </p>
                        </div>
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900 text-[11.5px]">
                          <p className="font-bold">⚠️ NOTE &amp; DISCLAIMER:</p>
                          <p className="mt-0.5">Please ensure to settle your 2026 Adventure 1 Balance before you can proceed to the registration.</p>
                          <p className="italic mt-1">
                            &quot;In the event that a family has unsettled balance, your downpayment for the 2026 Adventure 2 will be credited as your balance payment for the 2026 Adventure 1.&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : emailType === "slot_released" ? (
                <div className="space-y-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-[12.5px] text-slate-700">
                  <div className="border-b border-slate-200 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Subject</p>
                    <p className="font-bold text-rose-700 mt-0.5">
                      Notice of Released Slot: Priority Reservation Expired for {emailModalFamily.childName} ⏳
                    </p>
                  </div>
                  <div className="space-y-2.5 text-slate-600 text-[12px] leading-relaxed">
                    <p>Dear <strong>{emailModalFamily.parentName}</strong>,</p>
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-900 text-[11.5px]">
                      <p className="font-bold">⚠️ SLOT RELEASED (OCTOBER 16, 1:00 PM CUTOFF):</p>
                      <p className="mt-0.5">
                        Priority reservation has expired due to unconfirmed payment. The reserved slot has been released.
                      </p>
                    </div>
                    <p>
                      If you still wish to renew, you must submit a <strong>new registration form</strong> via the registration portal:
                    </p>
                    <div className="rounded-xl bg-slate-100 border border-slate-200 p-2 text-center text-slate-700 font-mono text-[11px]">
                      /register (Standard Form)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-600 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-600 mb-1">Message Body</label>
                    <textarea
                      value={emailCustomMessage}
                      onChange={(e) => setEmailCustomMessage(e.target.value)}
                      placeholder="Type your message here..."
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>
              )}

              {/* Status Note */}
              {emailModalFamily.lastEmailSent && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11.5px] text-emerald-800">
                  <span>✓</span>
                  <span>
                    Previously sent: <strong>{emailModalFamily.lastEmailSent}</strong> on{" "}
                    {emailModalFamily.lastEmailDate ? new Date(emailModalFamily.lastEmailDate).toLocaleString() : ""}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmailModalFamily(null)}
                  className="rounded-xl px-4 py-2 text-[12.5px] font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sendingEmail}
                  onClick={handleSendEmailSubmit}
                  className="rounded-xl bg-[#0033A0] hover:bg-[#002f76] text-white px-5 py-2 text-[12.5px] font-bold shadow-md shadow-[#0033A0]/20 transition-all disabled:opacity-50"
                >
                  {sendingEmail ? "Dispatching Email..." : "Send Email Now 🚀"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CUSTOM FEEDBACK & CONFIRMATION DIALOG (No native browser alerts) ── */}
        {feedbackDialog.open && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-200">
            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              {/* Decorative top color bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-2 ${feedbackDialog.type === "success"
                    ? "bg-emerald-500"
                    : feedbackDialog.type === "error"
                      ? "bg-rose-500"
                      : feedbackDialog.type === "confirm"
                        ? "bg-amber-500"
                        : "bg-[#0033A0]"
                  }`}
              />

              <div className="flex items-start gap-4 pt-1">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-sm ${feedbackDialog.type === "success"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80"
                      : feedbackDialog.type === "error"
                        ? "bg-rose-50 text-rose-600 border border-rose-200/80"
                        : feedbackDialog.type === "confirm"
                          ? "bg-amber-50 text-amber-600 border border-amber-200/80"
                          : "bg-blue-50 text-[#0033A0] border border-blue-200/80"
                    }`}
                >
                  {feedbackDialog.type === "success" && "✓"}
                  {feedbackDialog.type === "error" && "✕"}
                  {feedbackDialog.type === "confirm" && "⚠️"}
                  {feedbackDialog.type === "info" && "ℹ️"}
                </div>

                <div className="flex-1 space-y-1.5">
                  <h3 className="font-headline text-[17px] font-extrabold text-[#002f76]">
                    {feedbackDialog.title}
                  </h3>
                  <p className="text-[13px] text-[#475569] leading-relaxed">
                    {feedbackDialog.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                {feedbackDialog.type === "confirm" && (
                  <button
                    type="button"
                    onClick={() => setFeedbackDialog((prev) => ({ ...prev, open: false }))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-[#64748b] hover:bg-slate-50 transition-colors"
                  >
                    {feedbackDialog.cancelLabel || "Cancel"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={feedbackDialog.onConfirm}
                  className={`rounded-xl px-5 py-2 text-[13px] font-bold text-white shadow-md transition-all ${feedbackDialog.type === "error"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : feedbackDialog.type === "confirm"
                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                        : feedbackDialog.type === "success"
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                          : "bg-[#0033A0] hover:bg-[#002f76] shadow-[#0033A0]/20"
                    }`}
                >
                  {feedbackDialog.confirmLabel || "OK"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}