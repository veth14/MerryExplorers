"use client";

import { useEffect, useState, useMemo } from "react";
import { m } from "framer-motion";
import { AppShell } from "@/components/app-shell";

type Payment = {
  id: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNumber?: string;
  receiptBase64?: string;
  submittedAt: string;
  verified: boolean;
  rejected: boolean;
};

type Account = {
  id: string;
  fullName?: string;
  email: string;
  childName?: string;
  program?: string;
  sessionPayments?: Payment[];
  renewalStatus?: {
    downpayment?: {
      submitted: boolean;
      amountPaid?: number;
      paymentMethod?: string;
      referenceNumber?: string;
      receiptBase64?: string;
      submittedAt: string;
      verified: boolean;
      rejected: boolean;
    };
  };
};

const FILTERS = [
  { id: "all", label: "All Payments" },
  { id: "pending", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "rejected", label: "Rejected" },
];

function getStatus(p: Payment) {
  if (p.verified) return "verified";
  if (p.rejected) return "rejected";
  return "pending";
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#002f76,#0050d5)",
  "linear-gradient(135deg,#7c3aed,#a78bfa)",
  "linear-gradient(135deg,#047857,#34d399)",
  "linear-gradient(135deg,#b45309,#fbbf24)",
  "linear-gradient(135deg,#be123c,#fb7185)",
  "linear-gradient(135deg,#0e7490,#22d3ee)",
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function fmtCurrency(n: number | undefined) {
  return `₱${(n ?? 0).toLocaleString()}`;
}

export default function AdminPaymentsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [receiptModal, setReceiptModal] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((res) => res.json()),
      fetch("/api/registrations?status=all").then((res) => res.json()),
    ])
      .then(([accountsData, regData]) => {
        if (Array.isArray(accountsData)) {
          setAccounts(
            accountsData.filter(
              (acc: Account) =>
                (acc.sessionPayments && acc.sessionPayments.length > 0) ||
                acc.renewalStatus?.downpayment?.submitted
            )
          );
        }
        if (regData?.success && Array.isArray(regData.data)) {
          setRegistrations(regData.data.filter((r: any) => r.receiptUrl || r.receiptBase64 || r.amountPaid > 0));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allPayments = useMemo(() => {
    const flat: { uid: string; acc: Account; payment: Payment; type: "session" | "downpayment" | "registration" }[] = [];
    accounts.forEach(acc => {
      (acc.sessionPayments || []).forEach(p => flat.push({ uid: acc.id, acc, payment: p, type: "session" }));
      if (acc.renewalStatus?.downpayment?.submitted) {
        const dp = acc.renewalStatus.downpayment;
        flat.push({
          uid: acc.id, acc, type: "downpayment",
          payment: {
            id: "dp-" + acc.id,
            amountPaid: dp.amountPaid || 0,
            paymentMethod: dp.paymentMethod || "",
            referenceNumber: dp.referenceNumber,
            receiptBase64: dp.receiptBase64,
            submittedAt: dp.submittedAt,
            verified: dp.verified,
            rejected: dp.rejected,
          }
        });
      }
    });

    registrations.forEach(r => {
      flat.push({
        uid: r.id, 
        acc: {
          id: r.id,
          fullName: r.parentInfo?.name,
          email: r.parentInfo?.email || "",
          childName: r.childInfo?.firstName,
          program: r.program,
        }, 
        type: "registration",
        payment: {
          id: "reg-" + r.id,
          amountPaid: r.amountPaid || r.amountDue || 0,
          paymentMethod: r.paymentMethod || "",
          referenceNumber: r.referenceNumber,
          receiptBase64: r.receiptUrl || r.receiptBase64,
          submittedAt: r.submittedAt || new Date().toISOString(),
          verified: ["approved", "early-bird", "active"].includes(r.status),
          rejected: r.status === "rejected",
        }
      });
    });

    return flat.sort((a, b) => new Date(b.payment.submittedAt).getTime() - new Date(a.payment.submittedAt).getTime());
  }, [accounts, registrations]);

  const stats = useMemo(() => {
    const total = allPayments.length;
    const pending = allPayments.filter(p => !p.payment.verified && !p.payment.rejected).length;
    const verified = allPayments.filter(p => p.payment.verified).length;
    const totalRevenue = allPayments.filter(p => p.payment.verified).reduce((s, p) => s + p.payment.amountPaid, 0);
    return { total, pending, verified, totalRevenue };
  }, [allPayments]);

  const filtered = useMemo(() => {
    return allPayments.filter(({ acc, payment, type }) => {
      const matchFilter = activeFilter === "all" || getStatus(payment) === activeFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (acc.fullName || "").toLowerCase().includes(q) ||
        (acc.email || "").toLowerCase().includes(q) ||
        (acc.childName || "").toLowerCase().includes(q) ||
        (payment.referenceNumber || "").toLowerCase().includes(q) ||
        type.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [allPayments, activeFilter, search]);

  async function handleAction(uid: string, paymentId: string | null, action: "verify" | "reject", type: "session" | "downpayment" | "registration") {
    const key = `${uid}-${paymentId}-${action}`;
    setActioning(key);
    
    let url = "";
    let body: any = {};
    let method = "PATCH";
    
    if (type === "registration") {
      url = `/api/registrations/${uid}/${action === "verify" ? "approve" : "reject"}`;
      method = "POST";
    } else {
      url = type === "session" ? "/api/parents/session-payment" : "/api/parents/downpayment";
      body = type === "session" ? { uid, paymentId, action } : { uid, action };
    }

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) window.location.reload();
      else alert("Action failed.");
    } catch { alert("Network error."); }
    finally { setActioning(null); }
  }

  return (
    <AppShell title="Payment Tracking">
      <style>{`
        .pay-row { transition: background 0.15s; }
        .pay-row:hover { background: #f8faff !important; }
        .filter-pill { transition: all 0.15s; cursor: pointer; }
        .filter-pill:hover { transform: translateY(-1px); }
      `}</style>

      {/* Receipt Modal */}
      {receiptModal && (
        <div onClick={() => setReceiptModal(null)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "500px", width: "100%", background: "white", borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontWeight: "800", color: "#002f76" }}>Payment Receipt</span>
              <button onClick={() => setReceiptModal(null)} style={{ padding: "8px", borderRadius: "12px", color: "#64748b", fontWeight: "bold" }}>✕</button>
            </div>
            <div style={{ padding: "16px" }}>
              <img src={receiptModal} alt="Receipt" style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "12px" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Payments",  value: stats.total,    icon: "📋", color: "#0050d5", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
          { label: "Pending Review",  value: stats.pending,  icon: "⏳", color: "#b45309", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
          { label: "Verified",        value: stats.verified, icon: "✅", color: "#15803d", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
          { label: "Total Revenue",   value: fmtCurrency(stats.totalRevenue), icon: "💰", color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: "20px", padding: "20px 24px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: s.color, lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "3px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ background: "white", borderRadius: "20px", padding: "16px 20px", boxShadow: "0 4px 24px rgba(0,47,118,0.07)", border: "1px solid rgba(0,47,118,0.06)", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "15px", pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, ref, or type..."
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "12px", paddingTop: "10px", paddingBottom: "10px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", fontWeight: "500", color: "#334155", outline: "none", background: "#f8faff", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {FILTERS.map(f => {
            const active = activeFilter === f.id;
            const bgMap: Record<string, string> = { pending: "#fffbeb", verified: "#f0fdf4", rejected: "#fef2f2" };
            const colorMap: Record<string, string> = { pending: "#b45309", verified: "#15803d", rejected: "#b91c1c" };
            return (
              <button key={f.id} className="filter-pill" onClick={() => setActiveFilter(f.id)} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: active ? "none" : "1.5px solid #e2e8f0", background: active ? (bgMap[f.id] || "#eff6ff") : "white", color: active ? (colorMap[f.id] || "#0050d5") : "#64748b", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                {f.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "600", color: "#94a3b8", flexShrink: 0 }}>
          {loading ? "Loading…" : `${filtered.length} of ${allPayments.length} payments`}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", color: "#94a3b8", fontSize: "15px", fontWeight: "600", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          <div>Loading payments…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: "20px", padding: "80px 24px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>💳</div>
          <div style={{ fontWeight: "800", color: "#002f76", fontSize: "18px", marginBottom: "6px" }}>No payments found</div>
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>Try adjusting your search or filter.</div>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,47,118,0.06)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1.2fr 1.2fr 1fr", padding: "12px 24px", background: "#f8faff", borderBottom: "1px solid #e8efff" }}>
            {["Parent / Guardian", "Payment Details", "Date & Ref", "Status", "Actions"].map((h, i) => (
              <div key={i} style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: h === "Actions" ? "right" : "left" }}>{h}</div>
            ))}
          </div>

          {filtered.map(({ uid, acc, payment, type }, idx) => {
            const avatarGrad = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const status = getStatus(payment);
            const statusStyle = {
              verified: { bg: "#f0fdf4", color: "#15803d", label: "VERIFIED" },
              rejected: { bg: "#fef2f2", color: "#b91c1c", label: "REJECTED" },
              pending: { bg: "#fffbeb", color: "#b45309", label: "PENDING" },
            }[status];

            return (
              <m.div
                key={`${uid}-${payment.id}-${idx}`}
                className="pay-row"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025 }}
                onClick={() => payment.receiptBase64 && setReceiptModal(payment.receiptBase64)}
                style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1.2fr 1.2fr 1fr", padding: "15px 24px", borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: "white", cursor: payment.receiptBase64 ? "pointer" : "default" }}
              >
                {/* Parent col */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                    {getInitials(acc.fullName || acc.email || "?")}
                  </div>
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "14px", color: "#002f76", lineHeight: 1.2 }}>
                      {acc.fullName || acc.email}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {acc.childName ? `${acc.childName} · ` : ""}{type === "session" ? "Virtual Session" : type === "registration" ? "Registration" : "Renewal"}
                    </div>
                  </div>
                </div>

                {/* Amount col */}
                <div>
                  <div style={{ fontWeight: "800", fontSize: "15px", color: "#334155" }}>
                    {fmtCurrency(payment.amountPaid)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontWeight: "600", textTransform: "uppercase" }}>
                    via {payment.paymentMethod || "—"}
                  </div>
                </div>

                {/* Date/Ref col */}
                <div>
                  <div style={{ fontWeight: "600", fontSize: "12px", color: "#334155" }}>
                    {new Date(payment.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px", fontFamily: "monospace" }}>
                    {payment.referenceNumber ? `Ref: ${payment.referenceNumber}` : "No Ref"}
                  </div>
                </div>

                {/* Status col */}
                <div>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: statusStyle.bg, color: statusStyle.color, borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>
                    {statusStyle.label}
                  </span>
                </div>

                {/* Actions col */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {payment.receiptBase64 && (
                    <button onClick={(e) => { e.stopPropagation(); setReceiptModal(payment.receiptBase64!); }} style={{ padding: "6px", borderRadius: "8px", background: "#eff6ff", color: "#0050d5", fontSize: "14px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="View Receipt">
                      🖼️
                    </button>
                  )}
                  {status === "pending" && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleAction(uid, type === "session" ? payment.id : null, "verify", type); }} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}>
                        ✓ Verify
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleAction(uid, type === "session" ? payment.id : null, "reject", type); }} disabled={!!actioning} style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", color: "white", fontSize: "12px", fontWeight: "700", border: "none", cursor: "pointer" }}>
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </m.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
