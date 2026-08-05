import {
  CaptureLayer,
  CaptureProvider,
} from "@/components/capture/capture-flow";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CaptureProvider>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-[#F3F0FA] text-[#1A1B2E] pt-[env(safe-area-inset-top)]">
        <div className="pointer-events-none absolute -right-10 -top-8 h-40 w-40 rounded-full bg-[#C4B5FD]/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 top-40 h-32 w-32 rounded-full bg-[#93C5FD]/25 blur-3xl" />

        <div className="relative min-h-0 flex-1 overflow-y-auto">{children}</div>
        <BottomNav />
        <CaptureLayer />
      </div>
    </CaptureProvider>
  );
}
