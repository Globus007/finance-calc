import { Suspense } from "react";
import { PrototypeHome } from "../components/PrototypeHome";

/**
 * PROTOTYPE (issue #8) — MVP screen map / primary mobile flows.
 * Three IA variants via ?variant=A|B|C. Throwaway; not product code.
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
          Loading prototype…
        </div>
      }
    >
      <PrototypeHome />
    </Suspense>
  );
}
