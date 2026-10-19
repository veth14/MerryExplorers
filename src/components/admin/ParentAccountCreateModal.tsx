"use client";

import { useState } from "react";

interface ParentAccountCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  parent: {
    email: string;
    name: string;
    phone?: string;
    relationship?: string;
    children?: any[];
  } | null;
  onSuccess: () => void;
}

export function ParentAccountCreateModal({
  isOpen,
  onClose,
  parent,
  onSuccess,
}: ParentAccountCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdData, setCreatedData] = useState<{ email: string; tempPass?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !parent) return null;

  const handleCreate = async () => {
    setLoading(true);
    setError("");

    try {
      const firstChild = parent.children?.[0];
      const childName = firstChild
        ? `${firstChild.firstName || ""} ${firstChild.lastName || ""}`.trim()
        : "";
      const program = firstChild?.programName || firstChild?.program || "Discovery Club: Curious Explorer";

      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parent.name,
          email: parent.email,
          phone: parent.phone || "",
          relationship: parent.relationship || "Parent",
          childName,
          program,
          status: "active",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create parent account");
      }

      setCreatedData({
        email: parent.email,
        tempPass: data.tempPassword,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create parent account");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(11, 26, 60, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "500px",
          padding: "28px",
          boxShadow: "0 25px 50px -12px rgba(0, 47, 118, 0.25)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            🔑
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "900", color: "#002f76" }}>
              Create Parent Portal Account
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Enable portal login for this family
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1.5px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        {createdData ? (
          <div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #bbf7d0",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontWeight: "800", color: "#166534", fontSize: "14px", marginBottom: "6px" }}>
                ✅ Account Created Successfully!
              </div>
              <p style={{ fontSize: "12px", color: "#166534", margin: 0 }}>
                A welcome email with login credentials has been queued for {createdData.email}.
              </p>

              {createdData.tempPass && (
                <div style={{ marginTop: "12px", background: "white", borderRadius: "10px", padding: "10px 14px", border: "1px solid #dcfce7" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Temporary Password</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                    <code style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>{createdData.tempPass}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(createdData.tempPass!)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "#0050d5",
                color: "white",
                fontWeight: "800",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div style={{ background: "#f8faff", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Parent Name:</span>
                <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "800" }}>{parent.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Email:</span>
                <span style={{ fontSize: "13px", color: "#0050d5", fontWeight: "700" }}>{parent.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Mobile:</span>
                <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>{parent.phone || "Not set"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Linked Children:</span>
                <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>
                  {parent.children?.map((c) => c.firstName).join(", ") || "None"}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "20px", lineHeight: 1.5 }}>
              This will create a Firebase authentication login with the role <strong>parent</strong>, giving them access to the Parent Portal.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: "10px 18px",
                  borderRadius: "12px",
                  border: "1.5px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                style={{
                  padding: "10px 22px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #0b2a82, #0050d5)",
                  color: "white",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 14px rgba(0, 80, 213, 0.3)",
                }}
              >
                {loading ? "Creating Account…" : "Create Portal Account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
