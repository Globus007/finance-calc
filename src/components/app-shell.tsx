import {
  CaptureLayer,
  CaptureProvider,
} from "@/components/capture/capture-flow";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CaptureProvider>
      <div className="app-frame relative mx-auto flex h-dvh max-h-dvh w-full max-w-lg flex-col overflow-hidden text-ink pt-[env(safe-area-inset-top)] md:my-5 md:h-[calc(100dvh-2.5rem)] md:max-h-[calc(100dvh-2.5rem)]">
        {/* min-h-0: flex item must shrink so this pane scrolls, not the dock. */}
        <main className="relative z-10 min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-y-contain">
          {children}
        </main>
        <BottomNav />
        <CaptureLayer />
      </div>
    </CaptureProvider>
  );
}
