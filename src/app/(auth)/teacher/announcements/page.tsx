"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { Skeleton } from "@/components/ui/skeleton";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  startDate: string;
  endDate: string | null;
  createdAt?: string;
};

type Visibility = "active" | "upcoming" | "expired";

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function TeacherAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const now = new Date();

  const getVisibility = (a: Announcement): Visibility => {
    const start = new Date(a.startDate);
    const end = a.endDate ? new Date(a.endDate) : null;
    if (end && now > end) return "expired";
    if (now >= start) return "active";
    return "upcoming";
  };

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch("/api/announcements");
        const json = await res.json();
        if (!json.success) return;

        const data: Announcement[] = json.data;
        const visible = data.filter(a => getVisibility(a) !== "expired");
        setAnnouncements(visible);

        // Fetch which are already read
        const ids = visible.map(a => a.id).filter(Boolean);
        if (ids.length > 0) {
          const readRes = await fetch(`/api/announcements/read?uid=${user!.uid}&ids=${ids.join(",")}`);
          const readJson = await readRes.json();
          if (readJson.success) {
            setReadIds(new Set(readJson.readIds as string[]));
          }

          // Mark all currently visible as read
          await Promise.allSettled(
            ids.map(id =>
              fetch("/api/announcements/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user!.uid, announcementId: id }),
              })
            )
          );
          // Update local state to reflect all as read
          setReadIds(new Set(ids));
        }
      } catch (err) {
        console.error("Failed to load announcements:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Sort: active first, then upcoming
  const sorted = [...announcements].sort((a, b) => {
    const va = getVisibility(a);
    const vb = getVisibility(b);
    if (va === "active" && vb !== "active") return -1;
    if (vb === "active" && va !== "active") return 1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  return (
    <TeacherShell title="Announcements" description="All active and upcoming messages from the admin.">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-[2rem] border-2 border-brand-sky shadow-lg p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-brand-sky/20 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-brand-blue">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-[16px] font-black text-brand-navy">No announcements right now.</p>
            <p className="text-[13px] font-medium text-brand-navy/50 mt-1">Check back later for updates from the admin.</p>
          </div>
        ) : (
          sorted.map((a) => {
            const visibility = getVisibility(a);
            const isUnread = !readIds.has(a.id);

            return (
              <div
                key={a.id}
                className={`bg-white rounded-[2rem] border-2 shadow-sm overflow-hidden relative ${
                  a.type === "alert"
                    ? "border-amber-200"
                    : a.type === "success"
                    ? "border-emerald-200"
                    : "border-brand-sky"
                } ${isUnread ? "ring-2 ring-brand-blue/20" : ""}`}
              >
                {/* Top accent stripe */}
                <div className={`h-1.5 w-full ${
                  a.type === "alert" ? "bg-brand-yellow" :
                  a.type === "success" ? "bg-emerald-400" :
                  "bg-brand-blue"
                }`} />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      a.type === "alert" ? "bg-amber-100 text-amber-600" :
                      a.type === "success" ? "bg-emerald-100 text-emerald-600" :
                      "bg-brand-sky/40 text-brand-blue"
                    }`}>
                      {a.type === "alert" ? <AlertIcon /> :
                       a.type === "success" ? <CheckIcon /> :
                       <InfoIcon />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h2 className="text-[15px] font-black text-brand-navy">{a.title}</h2>

                        {/* Visibility badge */}
                        {visibility === "active" ? (
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Happening Now
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Upcoming
                          </span>
                        )}

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-[13px] font-medium text-brand-navy/70 leading-relaxed whitespace-pre-wrap">
                        {a.content}
                      </p>

                      {/* Date range */}
                      <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-brand-navy/40 flex-wrap">
                        <span>
                          From: {new Date(a.startDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        {a.endDate && (
                          <span>
                            Until: {new Date(a.endDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </TeacherShell>
  );
}
