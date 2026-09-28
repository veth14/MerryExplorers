import { AuthProvider } from "@/lib/auth-context";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      />
      {children}
    </AuthProvider>
  );
}
