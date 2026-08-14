import {
  CaptureLayer,
  CaptureProvider,
} from "@/components/capture/capture-flow";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CaptureProvider>
      <div className="app-frame relative mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden bg-[#F5F7FC] text-[#172033] pt-[env(safe-area-inset-top)] md:my-5 md:h-[calc(100dvh-2.5rem)] md:max-h-[calc(100dvh-2.5rem)]">
        <div className="pointer-events-none absolute -right-20 -top-20 -z-0 h-72 w-72 rounded-full bg-[#C7D2FE]/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 -z-0 h-64 w-64 rounded-full bg-[#CCFBF1]/45 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-56 bg-gradient-to-b from-white/65 to-transparent" />

        {/* min-h-0: flex item must shrink so this pane scrolls, not the dock. */}
        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {children}
        </main>
        <BottomNav />
        <CaptureLayer />
      </div>
    </CaptureProvider>
  );
}
