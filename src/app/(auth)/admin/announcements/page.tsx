"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker";
import { useAuth } from "@/lib/auth-context";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  startDate: string;
  endDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  readCount?: number;
  totalTeachers?: number;
};

export default function AnnouncementsPage() {
  const { user, userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentId, setCurrentId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  
  // Default to today
  const defaultStartDate = new Date().toISOString().slice(0, 16);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements?admin=true");
      const json = await res.json();
      if (json.success) {
        setAnnouncements(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentId("");
    setTitle("");
    setContent("");
    setType("info");
    setStartDate(new Date().toISOString().slice(0, 16));
    setEndDate("");
    setShowModal(true);
  };

  const formatLocal = (dateString: string) => {
    const d = new Date(dateString);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditModal = (a: Announcement) => {
    setIsEditing(true);
    setCurrentId(a.id);
    setTitle(a.title);
    setContent(a.content);
    setType(a.type);
    setStartDate(a.startDate ? formatLocal(a.startDate) : "");
    setEndDate(a.endDate ? formatLocal(a.endDate) : "");
    setShowModal(true);
  };

  const handleDelete = async (id: string, announcementTitle?: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const params = new URLSearchParams({ id });
      if (user?.uid) {
        params.set("actorUid", user.uid);
        params.set("actorName", userProfile?.fullName || user.email || "Unknown");
        params.set("actorRole", userProfile?.role || "Unknown");
        if (announcementTitle) params.set("targetTitle", announcementTitle);
      }
      const res = await fetch(`/api/announcements?${params.toString()}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || "Failed to delete");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting announcement");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        id: currentId,
        title,
        content,
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        // Audit log actor info
        actorUid: user?.uid || null,
        actorName: userProfile?.fullName || user?.email || "Unknown",
        actorRole: userProfile?.role || "Unknown",
      };

      const url = "/api/announcements";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchData();
      } else {
        alert(json.error || "Failed to save");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving announcement");
    } finally {
      setSaving(false);
    }
  };

  const getTypeStyles = (type: string) => {
    switch(type) {
      case 'alert': return "bg-red-50 text-red-600 border-red-200";
      case 'success': return "bg-emerald-50 text-emerald-600 border-emerald-200";
      default: return "bg-blue-50 text-blue-600 border-blue-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'alert': return "warning";
      case 'success': return "check_circle";
      default: return "info";
    }
  };

  return (
    <AppShell title="Announcements" description="Manage system-wide alerts and updates for teachers.">
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 mb-6">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#005cc8] hover:bg-[#004bb0] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-[#005cc8]/20"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Announcement
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-5 border-2 border-[#e2e8f0] shadow-sm">
              <Skeleton className="h-6 w-24 rounded-full mb-4" />
              <Skeleton className="h-6 w-full rounded-md mb-2" />
              <Skeleton className="h-16 w-full rounded-md mb-4" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-[#e2e8f0] p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#f8faff] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[#a1b0c9] text-3xl">campaign</span>
          </div>
          <h3 className="text-[16px] font-bold text-[#002f76] mb-1">No Announcements</h3>
          <p className="text-[13px] text-[#5a6e8c] max-w-sm mb-6">You haven't posted any announcements yet. Create one to keep your team informed.</p>
          <button
            onClick={openCreateModal}
            className="text-[#005cc8] font-bold text-[14px] hover:underline"
          >
            Create your first announcement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {announcements.map((a) => {
            const isActive = new Date() >= new Date(a.startDate) && (!a.endDate || new Date() <= new Date(a.endDate));
            const isFuture = new Date() < new Date(a.startDate);
            const isExpired = a.endDate && new Date() > new Date(a.endDate);
            
            return (
              <div key={a.id} className="bg-white rounded-3xl p-5 border-2 border-[#e2e8f0] shadow-sm flex flex-col relative group transition-all hover:border-[#005cc8]/30 hover:shadow-md">
                
                {/* Top Bar */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${getTypeStyles(a.type)}`}>
                    <span className="material-symbols-outlined text-[14px]">{getTypeIcon(a.type)}</span>
                    {a.type}
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isActive ? "bg-green-100 text-green-700" :
                    isFuture ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {isActive ? "Active" : isFuture ? "Scheduled" : "Expired"}
                  </div>
                </div>

                <h3 className="text-[16px] font-black text-[#002f76] mb-2 leading-tight">{a.title}</h3>
                <p className="text-[13px] font-medium text-[#5a6e8c] whitespace-pre-wrap flex-1 mb-5">{a.content}</p>
                
                <div className="mt-auto pt-4 border-t border-[#e2e8f0] flex flex-col gap-1 text-[11px] font-bold text-[#9aa3b2]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                    Starts: <span className="text-[#5a6e8c]">{new Date(a.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  {a.endDate && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">event_busy</span>
                      Ends: <span className="text-[#5a6e8c]">{new Date(a.endDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  )}
                  {/* Read tracking */}
                  <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-[#f0f4f8]">
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                    <span className={`font-extrabold ${
                      (a.readCount ?? 0) === 0 ? "text-[#c9d4e4]" :
                      (a.readCount ?? 0) >= (a.totalTeachers ?? 1) ? "text-green-600" :
                      "text-[#005cc8]"
                    }`}>
                      Seen by {a.readCount ?? 0} / {a.totalTeachers ?? "?"} teachers
                    </span>
                  </div>
                </div>

                {/* Actions Overlay (Hover) */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-[#e2e8f0]">
                  <button 
                    onClick={() => openEditModal(a)} 
                    className="w-8 h-8 flex items-center justify-center text-[#005cc8] hover:bg-[#f0f5ff] rounded-md transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(a.id, a.title)} 
                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#002f76]/20 backdrop-blur-sm transition-opacity"
            onClick={() => !saving && setShowModal(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-[24px] shadow-2xl p-6 w-full max-w-lg mx-4 z-10 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f0f5ff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#005cc8] text-[20px]">
                    {isEditing ? "edit_note" : "add_alert"}
                  </span>
                </div>
                <div>
                  <h2 className="text-[18px] font-black text-[#002f76] leading-tight">
                    {isEditing ? "Edit Announcement" : "New Announcement"}
                  </h2>
                  <p className="text-[12px] font-medium text-[#5a6e8c]">
                    {isEditing ? "Update details below" : "Broadcast a message to your staff"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#9aa3b2] hover:text-[#002f76] hover:bg-[#f8faff] rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 pr-2 -mr-2 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#d0d8e8] bg-[#f8faff] px-4 py-2.5 text-[13.5px] font-semibold text-[#002f76] placeholder:text-[#b0bec5] outline-none focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 transition-all"
                    placeholder="E.g. Fire Drill Tomorrow"
                  />
                </div>

                <div className="relative z-20">
                  <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
                    Type
                  </label>
                  <div 
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    className={`w-full border ${isTypeDropdownOpen ? "border-[#0050d5] ring-1 ring-[#0050d5]" : "border-[#e2e8f0] hover:border-[#0050d5]"} rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-[#002f76] bg-white shadow-sm cursor-pointer flex justify-between items-center transition-colors`}
                  >
                    <span>
                      {type === "info" ? "Information (Blue)" : type === "alert" ? "Alert / Urgent (Red)" : "Success / Good News (Green)"}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  
                  {isTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg overflow-hidden z-30 py-1">
                      {[
                        { value: "info", label: "Information (Blue)" },
                        { value: "alert", label: "Alert / Urgent (Red)" },
                        { value: "success", label: "Success / Good News (Green)" }
                      ].map((opt) => (
                        <div 
                          key={opt.value}
                          onClick={() => {
                            setType(opt.value);
                            setIsTypeDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-[13.5px] font-semibold cursor-pointer transition-colors ${
                            opt.value === type ? "bg-[#0050d5] text-white" : "text-[#002f76] hover:bg-[#f8faff]"
                          }`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
                    Message Content
                  </label>
                  <textarea
                    required
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-[#d0d8e8] bg-[#f8faff] px-4 py-2.5 text-[13.5px] font-semibold text-[#002f76] placeholder:text-[#b0bec5] outline-none focus:border-[#0050d5] focus:ring-2 focus:ring-[#0050d5]/15 transition-all resize-none"
                    placeholder="Write your announcement details here..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5">
                      Start Date & Time
                    </label>
                    <CustomDateTimePicker
                      selectedDateTime={startDate}
                      onChange={setStartDate}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#5a6e8c] mb-1.5 flex items-center justify-between">
                      <span>End Date & Time</span>
                      <span className="text-[#9aa3b2] font-normal tracking-normal normal-case">(Optional)</span>
                    </label>
                    <CustomDateTimePicker
                      selectedDateTime={endDate}
                      onChange={setEndDate}
                      placeholder="--/--/---- --:-- --"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 shrink-0">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#005cc8] hover:bg-[#004bb0] disabled:bg-[#a1b0c9] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#005cc8]/30 transition-all text-[14px] flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  )}
                  {saving ? "Saving..." : isEditing ? "Save Changes" : "Post Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
