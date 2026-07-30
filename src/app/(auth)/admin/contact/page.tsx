import { AppShell } from "@/components/app-shell";
import { ContactForm } from "./contact-form";

export default function ContactPage() {
  return (
    <AppShell
      title="Report a Bug"
      description="Found a bug or have a suggestion? Reach the developer directly."
    >
      <ContactForm />
      <div className="h-4" />
    </AppShell>
  );
}
