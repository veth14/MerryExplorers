import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

type AppShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
  return (
    <div className="h-screen bg-[#f0f4f9] text-on-background flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 px-6 py-5 h-screen overflow-y-auto w-full">
        <div className="w-full h-full flex flex-col gap-4">
          <Topbar title={title} description={description} />
          {children}
        </div>
      </main>
    </div>
  );
}
