"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TablePagination } from "@/components/ui/table-pagination";
import * as XLSX from "xlsx";
import { PROGRAM_SLOTS } from "@/data/landing";
import { FALLBACK_PIONEER_RATES } from "@/lib/payment-terms";
import { auth } from "@/lib/firebase";

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
  reservedUntil: string | null;
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
  minStudentsPerSession?: number;
  downpaymentRate?: number;
  totalCollected: number;
  totalExpectedDownpayment: number;
  totalOutstandingBalance: number;
  countDownpaymentReceived: number;
  countFullyPaid: number;
  countWithBalance: number;
};

export default function RenewalsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"renewals" | "families">("renewals");
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("adventure-1-renewal");
  const periodSelectionInitialized = useRef(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Renewals tab state
  const [renewalRecords, setRenewalRecords] = useState<RenewalRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [renewalSearch, setRenewalSearch] = useState("");
  const [renewalStatusFilter, setRenewalStatusFilter] = useState("all");
  const [renewalProgramFilter, setRenewalProgramFilter] = useState("all");
  const [renewalPaymentFilter, setRenewalPaymentFilter] = useState("all");
  const [renewalsPage, setRenewalsPage] = useState(1);
  const [renewalsPageSize, setRenewalsPageSize] = useState(10);

  // Families tab state
  const [families, setFamilies] = useState<Family[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [familyStatusFilter, setFamilyStatusFilter] = useState("all");
  const [familyProgramFilter, setFamilyProgramFilter] = useState("all");
  const [familiesPage, setFamiliesPage] = useState(1);
  const [familiesPageSize, setFamiliesPageSize] = useState(10);

  // Modals
  const [addFamilyModal, setAddFamilyModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<{ total: number; valid: number; duplicates: number }>({ total: 0, valid: 0, duplicates: 0 });
  const [importing, setImporting] = useState(false);

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


  // Email Sending Modal state
  const [emailModalFamily, setEmailModalFamily] = useState<Family | null>(null);
  const [emailType, setEmailType] = useState<"payment_reminder" | "slot_released" | "custom">("payment_reminder");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailCustomMessage, setEmailCustomMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Renewals APIs verify Firebase ID tokens. The shared fetch wrapper can run
  // after child effects on first render, so attach the token explicitly here.
  const adminFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Your admin session has expired. Please sign in again.");

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${await currentUser.getIdToken()}`);
    return fetch(input, { ...init, headers });
  };

  // Fetch renewals & families with SWR (dedupes within 30s)
  const {
    mutate: mutateRenewals,
  } = useSWR(
    selectedPeriod ? [`/api/renewals`, selectedPeriod] : null,
    async () => {
      const [pRes, rRes, fRes] = await Promise.all([
        adminFetch("/api/renewals/periods"),
        adminFetch(`/api/renewals?period=${selectedPeriod}`),
        adminFetch("/api/renewals/families"),
      ]);
      const [pData, rData, fData] = await Promise.all([pRes.json(), rRes.json(), fRes.json()]);
      return { pData, rData, fData };
    },
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onSuccess: ({ pData, rData, fData }) => {
        if (pData?.success) {
          const availablePeriods = pData.data || [];
          setPeriods(availablePeriods);
          if (!periodSelectionInitialized.current) {
            periodSelectionInitialized.current = true;
            const currentIsAvailable = availablePeriods.some((period: any) => period.slug === selectedPeriod);
            const activePeriod = availablePeriods.find((period: any) => period.isActive);
            setSelectedPeriod(activePeriod?.slug || (currentIsAvailable ? selectedPeriod : availablePeriods[0]?.slug || "adventure-1-renewal"));
          }
        }
        if (rData?.success) {
          setRenewalRecords(rData.data.records);
          setStats(rData.data.stats);
        } else {
          console.error("Renewals API error:", rData?.error);
        }
        if (fData?.success) setFamilies(fData.data);
        setLoading(false);
      },
      onError: (err) => {
        console.error("Failed to load renewals data:", err);
        setLoading(false);
      },
    }
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      await mutateRenewals();
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

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

  // ── KPIs computed from live records ──────────────────────────────────
  // Released/expired slots that were never paid are excluded from every KPI
  // (they no longer represent a real reservation or money owed).
  // Released slots that DID pay something still count toward "Collected",
  // but never toward balance due / expected downpayment.
  const kpi = useMemo(() => {
    const isReleasedUnpaid = (r: RenewalRecord) =>
      r.renewalStatus === "released" && !(r.amountPaid > 0);
    const counted = renewalRecords.filter((r) => !isReleasedUnpaid(r));
    const live = renewalRecords.filter((r) => r.renewalStatus !== "released");

    const totalFamilies = stats?.totalFamilies ?? families.length;
    const submittedCount = counted.length;
    const countReserved = live.filter((r) => r.renewalStatus === "reserved").length;
    const countConfirmed = live.filter((r) => r.renewalStatus === "confirmed").length;
    const promoReservations = live.filter((r) => r.isPromo).length;

    return {
      totalFamilies,
      submittedCount,
      countReserved,
      countConfirmed,
      promoReservations,
      renewalRate: totalFamilies > 0 ? Math.round((submittedCount / totalFamilies) * 1000) / 10 : 0,
      conversionRate: live.length > 0 ? Math.round((countConfirmed / live.length) * 1000) / 10 : 0,
      totalCollected: counted.reduce((s, r) => s + (r.amountPaid || 0), 0),
      totalExpectedDownpayment: live.reduce((s, r) => s + (r.expectedDownpayment || 0), 0),
      totalOutstandingBalance: live.reduce((s, r) => s + (r.remainingBalance || 0), 0),
    };
  }, [renewalRecords, stats, families.length]);

  // Split into active vs archived (released)
  const activeRenewals = useMemo(
    () => filteredRenewals.filter((r) => r.renewalStatus !== "released"),
    [filteredRenewals]
  );
  const archivedRenewals = useMemo(
    () => filteredRenewals.filter((r) => r.renewalStatus === "released"),
    [filteredRenewals]
  );

  const renewalsPageCount = Math.max(1, Math.ceil(activeRenewals.length / renewalsPageSize));
  const safeRenewalsPage = Math.min(renewalsPage, renewalsPageCount);
  const paginatedActiveRenewals = activeRenewals.slice(
    (safeRenewalsPage - 1) * renewalsPageSize,
    safeRenewalsPage * renewalsPageSize,
  );

  useEffect(() => {
    setRenewalsPage(1);
  }, [selectedPeriod, renewalSearch, renewalStatusFilter, renewalProgramFilter, renewalPaymentFilter, renewalsPageSize]);

  useEffect(() => {
    if (renewalsPage > renewalsPageCount) setRenewalsPage(renewalsPageCount);
  }, [renewalsPage, renewalsPageCount]);

  // ── Link families ↔ renewal records ──────────────────────────────────
  // Parents sometimes use /register instead of /renew, so the registration isn't
  // linked to the family record, and names are typed differently
  // ("Knoa Andrae B. Erasga" vs "Knoa Andrae Erasga"). Match loosely:
  //   1) registrationId or familyId   2) same email + same first & last name
  // (middle names / initials / punctuation / case are ignored).
  const nameKey = (s: string) => {
    const t = (s || "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((x) => x.length > 1); // drop middle initials
    return t.length === 0 ? "" : `${t[0]}|${t[t.length - 1]}`;
  };

  const familyRecordMap = useMemo(() => {
    const map = new Map<string, RenewalRecord>();
    const rank = (r: RenewalRecord) => (r.renewalStatus === "released" ? 0 : 1);
    families.forEach((f) => {
      const candidates = renewalRecords.filter((r) => {
        if (f.registrationId && r.registrationId === f.registrationId) return true;
        if (r.familyId && r.familyId === f._id) return true;
        const sameEmail =
          (r.parentEmail || "").trim().toLowerCase() === (f.parentEmail || "").trim().toLowerCase();
        const k = nameKey(f.childName);
        return sameEmail && k !== "" && nameKey(r.childName) === k;
      });
      if (candidates.length === 0) return;
      // Prefer a live (non-released) record, then the most recently submitted one
      candidates.sort(
        (a, b) =>
          rank(b) - rank(a) ||
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      map.set(f._id, candidates[0]);
    });
    return map;
  }, [families, renewalRecords]);

  // The status shown in the contact list: the renewal record is the source of truth
  // whenever one exists, even if the family record still says "not yet submitted".
  const getFamilyStatus = (f: Family): Family["renewalStatus"] => {
    const rec = familyRecordMap.get(f._id);
    if (!rec) return f.renewalStatus;
    if (rec.renewalStatus === "confirmed") return "confirmed";
    if (rec.renewalStatus === "released") return "released";
    return "reserved"; // reserved + for_release
  };

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
        (familyStatusFilter === "pioneer" ? Boolean(f.isPioneer) : getFamilyStatus(f) === familyStatusFilter);

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
  }, [families, familySearch, familyStatusFilter, familyProgramFilter, familyRecordMap]);

  const familiesPageCount = Math.max(1, Math.ceil(filteredFamilies.length / familiesPageSize));
  const safeFamiliesPage = Math.min(familiesPage, familiesPageCount);
  const paginatedFamilies = filteredFamilies.slice(
    (safeFamiliesPage - 1) * familiesPageSize,
    safeFamiliesPage * familiesPageSize,
  );

  useEffect(() => {
    setFamiliesPage(1);
  }, [selectedPeriod, familySearch, familyStatusFilter, familyProgramFilter, familiesPageSize]);

  useEffect(() => {
    if (familiesPage > familiesPageCount) setFamiliesPage(familiesPageCount);
  }, [familiesPage, familiesPageCount]);

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
          const res = await adminFetch(`/api/renewals/${id}`, {
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
          const res = await adminFetch(`/api/renewals/${id}`, {
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
        const res = await adminFetch(`/api/renewals/families/${editingFamily._id}`, {
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
        const res = await adminFetch("/api/renewals/families", {
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
          await adminFetch(`/api/renewals/families/${id}`, { method: "DELETE" });
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
      const res = await adminFetch("/api/renewals/families", {
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
      "Reserved Until": r.reservedUntil ? new Date(r.reservedUntil).toLocaleString() : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Renewals");
    XLSX.writeFile(wb, `MerryExplorers_Renewals_${selectedPeriod}.xlsx`);
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
        const res = await adminFetch("/api/renewals/send-email", {
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

  // Remind all families with an unpaid reservation.
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
      title: "Send Payment Reminder?",
      message: `Send a payment reminder with the correct payment or renewal link to ${unpaidList.length} family/families who have not yet paid the downpayment?`,
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

  // Notify families whose slots have actually been marked for release.
  const [releasingAll, setReleasingAll] = useState(false);
  const handleNotifyReleasedSlots = async () => {

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
      const res = await adminFetch("/api/renewals/send-email", {
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
            <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2">
              <label htmlFor="renewal-cycle-filter" className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                View submissions for
              </label>
              <select
                id="renewal-cycle-filter"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                aria-describedby="renewal-cycle-help"
                className="max-w-[220px] bg-transparent text-[13px] font-bold text-[#002f76] focus:outline-none cursor-pointer"
              >
                {(periods.length ? periods : [{ slug: "adventure-1-renewal", name: "Adventure 1 Renewal" }]).map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}{p.isActive ? " · Current" : ""}
                  </option>
                ))}
              </select>
              <span id="renewal-cycle-help" className="text-[10px] text-slate-500">
                Filters submitted registrations by target adventure.
              </span>
            </div>

            <Link
              href="/admin/programs#renewal-periods"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-[12.5px] font-bold text-[#0033A0] shadow-sm transition-colors hover:bg-blue-100"
            >
              ⚙️ Manage cycles
            </Link>

            <Link
              href="/admin/renewals/email-preview"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-[12.5px] font-bold text-[#002f76] shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span>📧</span> Email Previews
            </Link>

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
              <p className="mt-1 text-2xl font-black text-[#002f76]">{kpi.totalFamilies}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">In contact directory</p>
            </div>

            {/* Submitted */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/70 shadow-xs hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Submitted</span>
                <span className="text-sm">📝</span>
              </div>
              <p className="mt-1 text-2xl font-black text-emerald-600">{kpi.submittedCount}</p>
              <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{kpi.renewalRate}% renewal rate</p>
            </div>

            {/* Reserved Unpaid */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/70 shadow-xs hover:border-amber-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reserved (Hold)</span>
                <span className="text-sm">⏳</span>
              </div>
              <p className="mt-1 text-2xl font-black text-amber-600">{kpi.countReserved}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">{kpi.promoReservations} via promo code</p>
            </div>

            {/* Confirmed (60% Downpayment) */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200/70 shadow-xs hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confirmed (60%)</span>
                <span className="text-sm">✅</span>
              </div>
              <p className="mt-1 text-2xl font-black text-blue-600">{kpi.countConfirmed}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">{kpi.conversionRate}% converted</p>
            </div>

            {/* Total Collected */}
            <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Collected</span>
                <span className="text-sm">💰</span>
              </div>
              <p className="mt-1 text-2xl font-black text-emerald-900">₱{kpi.totalCollected.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Expected: ₱{kpi.totalExpectedDownpayment.toLocaleString()}</p>
            </div>

            {/* Outstanding Balance */}
            <div className="rounded-2xl bg-amber-50/70 p-4 border border-amber-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Balance Due</span>
                <span className="text-sm">⚖️</span>
              </div>
              <p className="mt-1 text-2xl font-black text-amber-900">₱{kpi.totalOutstandingBalance.toLocaleString()}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Remaining tuition</p>
            </div>
          </div>
        )}


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
                    paginatedActiveRenewals.map((r) => (
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
                            {r.reservedUntil ? new Date(r.reservedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
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
              <TablePagination
                total={activeRenewals.length}
                page={safeRenewalsPage}
                pageCount={renewalsPageCount}
                pageSize={renewalsPageSize}
                onPageChange={setRenewalsPage}
                onPageSizeChange={setRenewalsPageSize}
                itemLabel="renewals"
                ariaLabel="Active renewal pages"
              />
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
            <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-blue-900">
              This is the shared family contact directory. The cycle selector filters submitted renewals; family records remain available across cycles.
            </p>
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
                    paginatedFamilies.map((f) => (
                      <tr
                        key={f._id}
                        onClick={() => {
                          setEmailModalFamily(f);
                          setEmailType("payment_reminder");
                          setEmailSubject(`Payment Reminder & Renewal Link for ${f.childName} 🌈`);
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
                          {(() => {
                            const status = getFamilyStatus(f);
                            const viaRegister = status !== f.renewalStatus && f.renewalStatus === "not_yet_submitted";
                            return (
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${status === "confirmed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : status === "reserved"
                                      ? "bg-amber-100 text-amber-800"
                                      : status === "released"
                                        ? "bg-slate-200 text-slate-700"
                                        : "bg-rose-50 text-rose-700 border border-rose-200"
                                    }`}
                                >
                                  {status === "not_yet_submitted" && "Not Yet Submitted"}
                                  {status === "reserved" && "Reserved"}
                                  {status === "confirmed" && "Confirmed"}
                                  {status === "released" && "Released"}
                                </span>
                                {viaRegister && (
                                  <span
                                    className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9.5px] font-bold text-blue-700"
                                    title="This family submitted through the /register form instead of the renewal page. Matched by email + child name."
                                  >
                                    via Register form
                                  </span>
                                )}
                              </div>
                            );
                          })()}
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
                                setEmailType("payment_reminder");
                                setEmailSubject(`Payment Reminder & Renewal Link for ${f.childName} 🌈`);
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
              <TablePagination
                total={filteredFamilies.length}
                page={safeFamiliesPage}
                pageCount={familiesPageCount}
                pageSize={familiesPageSize}
                onPageChange={setFamiliesPage}
                onPageSizeChange={setFamiliesPageSize}
                itemLabel="families"
                ariaLabel="Family contact pages"
              />
            </div>
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

        {/* ── MODAL: SEND EMAIL TO FAMILY (Triggered by clicking row) ── */}
        {emailModalFamily && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative z-10 flex w-full sm:max-w-xl max-h-[94dvh] sm:max-h-[90vh] flex-col overflow-hidden rounded-t-[2rem] rounded-b-none sm:rounded-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:shadow-2xl border-t border-slate-100 sm:border">
              <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-4 sm:px-7 py-4 sm:py-5">
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
              <div className="shrink-0 flex gap-2 p-1 mx-4 sm:mx-7 bg-slate-100 rounded-2xl">
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
                    setEmailSubject(`Notice of Released Slot for ${emailModalFamily.childName} ⏳`);
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
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-7 py-4 space-y-4">
              {emailType === "payment_reminder" ? (
                (() => {
                  const modalMatchingRecord = emailModalFamily
                    ? familyRecordMap.get(emailModalFamily._id) || null
                    : null;
                  const displayProgram = modalMatchingRecord?.program || emailModalFamily.renewingTo || emailModalFamily.previousProgram || "Curious Explorer";
                  const normalizedProgram = displayProgram.toLowerCase();
                  const displayProgramSlug = normalizedProgram.includes("creative")
                    ? "creative-explorer"
                    : normalizedProgram.includes("everyday")
                      ? "everyday-curious"
                      : normalizedProgram.includes("brave") || normalizedProgram.includes("trailblazer")
                        ? "brave-explorer"
                        : normalizedProgram.includes("ballet")
                          ? "ballet"
                          : normalizedProgram.includes("virtual")
                            ? "virtual-session"
                            : normalizedProgram.includes("saturday")
                              ? "saturday-playdate"
                              : "curious-explorer";
                  const programDefinition = (PROGRAM_SLOTS as Record<string, any>)[displayProgramSlug];
                  const pioneerFallback = emailModalFamily.isPioneer ? FALLBACK_PIONEER_RATES[displayProgramSlug] : undefined;
                  const displayTuition = modalMatchingRecord?.totalTuition || pioneerFallback || programDefinition?.rate || 0;
                  const displayDownpayment = modalMatchingRecord?.expectedDownpayment || Math.round(displayTuition * 0.6);

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
                            <span className="font-bold text-slate-800">₱{displayTuition.toLocaleString()}{emailModalFamily.isPioneer && pioneerFallback ? " · Pioneer Family Rate" : ""}</span>
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
                      Notice of Released Slot for {emailModalFamily.childName} ⏳
                    </p>
                  </div>
                  <div className="space-y-2.5 text-slate-600 text-[12px] leading-relaxed">
                    <p>Dear <strong>{emailModalFamily.parentName}</strong>,</p>
                    <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-red-900 text-[11.5px]">
                      <p className="font-bold">⚠️ SLOT RELEASED (RELEASED SLOT):</p>
                      <p className="mt-0.5">
                        The reserved slot has been released. Please contact us if you have already made a payment or need help renewing.
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
              </div>

              {/* Status Note */}
              {emailModalFamily.lastEmailSent && (
                <div className="shrink-0 flex items-center gap-2 mx-4 sm:mx-7 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11.5px] text-emerald-800">
                  <span>✓</span>
                  <span>
                    Previously sent: <strong>{emailModalFamily.lastEmailSent}</strong> on{" "}
                    {emailModalFamily.lastEmailDate ? new Date(emailModalFamily.lastEmailDate).toLocaleString() : ""}
                  </span>
                </div>
              )}

              <div className="shrink-0 flex items-center justify-end gap-2 px-4 sm:px-7 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-5 border-t border-slate-100 bg-white">
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
