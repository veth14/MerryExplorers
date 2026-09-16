"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default function AdminStudentProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch("/api/students"); // In a real app we'd fetch just one, but filtering the list is fine for now
        const data = await res.json();
        if (data.success) {
          const found = data.data.find((s: any) => s.id === id);
          if (found) setStudent(found);
          else setError("Student not found");
        } else {
          setError(data.error);
        }
      } catch { setError("Network error"); }
      finally { setLoading(false); }
    }
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Student Profile">
        <div className="flex h-64 items-center justify-center text-[#64748b] animate-pulse">Loading profile...</div>
      </AppShell>
    );
  }

  if (error || !student) {
    return (
      <AppShell title="Student Profile">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-red-600">
          <p className="font-bold">❌ Error</p>
          <p className="text-sm">{error}</p>
          <button onClick={() => router.push("/admin/students")} className="mt-4 rounded-xl bg-red-100 px-4 py-2 text-sm font-bold hover:bg-red-200 transition-colors">
            ← Back to Students
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`${student.childInfo.firstName} ${student.childInfo.lastName}`}
    >
      <div className="mb-6">
        <button onClick={() => router.push("/admin/students")} className="text-[13px] font-bold text-[#64748b] hover:text-[#0033A0] transition-colors">
          ← Back to Students
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Child Info */}
        <div className="rounded-[1.5rem] bg-white border border-slate-100 p-6 shadow-sm">
          <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">🧒 Explorer Details</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium w-[40%]">Full Name</td><td className="py-2.5 text-[#334155] font-bold">{student.childInfo.firstName} {student.childInfo.lastName}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Nickname</td><td className="py-2.5 text-[#334155] font-bold">{student.childInfo.nickname || "—"}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Date of Birth</td><td className="py-2.5 text-[#334155] font-bold">{student.childInfo.dateOfBirth}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Gender</td><td className="py-2.5 text-[#334155] font-bold">{student.childInfo.gender}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Favorites</td><td className="py-2.5 text-[#334155] font-bold">{student.childInfo.favoriteSong || "-"} / {student.childInfo.favoriteColor || "-"} / {student.childInfo.favoriteCharacter || "-"}</td></tr>
              <tr><td className="py-2.5 text-[#94a3b8] font-medium">Health Profile</td><td className="py-2.5 text-[#334155] font-bold">{student.childInfo.healthProfile || "None"}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Parent Info */}
        <div className="rounded-[1.5rem] bg-white border border-slate-100 p-6 shadow-sm">
          <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">👨‍👩‍👧 Parent / Guardian</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium w-[40%]">Name</td><td className="py-2.5 text-[#334155] font-bold">{student.parentInfo.name}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Relationship</td><td className="py-2.5 text-[#334155] font-bold">{student.parentInfo.relationship}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Email</td><td className="py-2.5 text-[#334155] font-bold">{student.parentInfo.email}</td></tr>
              <tr><td className="py-2.5 text-[#94a3b8] font-medium">Phone</td><td className="py-2.5 text-[#334155] font-bold">{student.parentInfo.phone}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-[1.5rem] bg-white border border-slate-100 p-6 shadow-sm">
          <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">🚨 Emergency Contact</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium w-[40%]">Name</td><td className="py-2.5 text-[#334155] font-bold">{student.emergencyContact?.name || "—"}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Relationship</td><td className="py-2.5 text-[#334155] font-bold">{student.emergencyContact?.relationship || "—"}</td></tr>
              <tr><td className="py-2.5 text-[#94a3b8] font-medium">Phone</td><td className="py-2.5 text-[#334155] font-bold">{student.emergencyContact?.phone || "—"}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Enrollment Details */}
        <div className="rounded-[1.5rem] bg-white border border-slate-100 p-6 shadow-sm">
          <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">📋 Enrollment Details</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium w-[40%]">Program</td><td className="py-2.5 text-[#334155] font-bold">{student.programName}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Class Time</td><td className="py-2.5 text-[#334155] font-bold">{student.classTime}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Schedule</td><td className="py-2.5 text-[#334155] font-bold">{student.schedule}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Uniform Kit</td><td className="py-2.5 text-[#334155] font-bold">{student.uniformOrdered ? "Yes" : "No"}</td></tr>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium">Lanyard</td><td className="py-2.5 text-[#334155] font-bold">{student.lanyardOrdered ? "Yes" : "No"}</td></tr>
              <tr><td className="py-2.5 text-[#94a3b8] font-medium">Enrolled On</td><td className="py-2.5 text-[#334155] font-bold">{new Date(student.enrolledAt).toLocaleDateString()}</td></tr>
            </tbody>
          </table>
        </div>
        {/* Consents */}
        <div className="rounded-[1.5rem] bg-white border border-slate-100 p-6 shadow-sm">
          <h3 className="font-headline text-[16px] font-extrabold text-[#0033A0] mb-4">📝 Consents & Waivers</h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr className="border-b border-slate-50"><td className="py-2.5 text-[#94a3b8] font-medium w-[40%]">Photo Consent</td><td className="py-2.5 text-[#334155] font-bold">{student.photoConsent === "yes" ? "Yes" : "No"}</td></tr>
              <tr><td className="py-2.5 text-[#94a3b8] font-medium">Program Waiver</td><td className="py-2.5 text-[#334155] font-bold">Digitally Signed</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
