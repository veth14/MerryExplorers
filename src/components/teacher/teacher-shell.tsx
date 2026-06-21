import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { TeacherTopbar } from "@/components/teacher/teacher-topbar";

type TeacherShellProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export function TeacherShell({ title, description, children }: TeacherShellProps) {
  return (
    <div className="h-screen bg-[#f0f4f9] text-on-background flex overflow-hidden">
      <TeacherSidebar />

      <main className="flex-1 px-8 py-8 h-screen overflow-y-auto w-full">
        <div className="w-full h-full flex flex-col gap-4">
          <TeacherTopbar title={title} description={description} />
          {children}
        </div>
      </main>
    </div>
  );
}
