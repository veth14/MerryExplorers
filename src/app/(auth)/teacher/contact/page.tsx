import { TeacherShell } from "@/components/teacher/teacher-shell";
import { ContactForm } from "@/app/(auth)/admin/contact/contact-form";

export default function TeacherContactPage() {
  return (
    <TeacherShell
      title="Report a Bug"
      description="Found a bug or have a suggestion? Reach the developer directly."
    >
      <div className="mt-6 flex justify-center">
        <ContactForm />
      </div>
      <div className="h-4" />
    </TeacherShell>
  );
}
