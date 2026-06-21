import { TeacherShell } from "@/components/teacher/teacher-shell";

export default function TeacherProfilePage() {
  return (
    <TeacherShell title="My Profile" description="Update your personal details and preferences.">
      <div className="bg-white rounded-[1.25rem] p-8 shadow-sm flex items-center justify-center min-h-[400px]">
        <p className="text-[#002f76]/60 font-semibold">Profile settings coming soon.</p>
      </div>
    </TeacherShell>
  );
}
