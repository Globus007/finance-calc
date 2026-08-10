import { TelegramSessionGate } from "@/components/telegram/telegram-session-gate";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  // SPIKE: telegram-feel-demo — silent initData exchange in TG WebView;
  // browser still gets email OTP via TelegramSessionGate.
  return <TelegramSessionGate initialError={params.error ?? null} />;
}
