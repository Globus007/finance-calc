import { HomeDashboard } from "@/components/home-dashboard";
import { todayInMinsk, tomorrowInMinsk } from "@/lib/dates/minsk-today";
import { loadHomeMoney } from "@/lib/money/load-money";

/**
 * Home: live Remainder from Opening, current-month tiles, recent History.
 * Category breakdown is on Month only.
 */
export default async function HomePage() {
  const { totals, recent, opening, remainder } = await loadHomeMoney();
  const today = todayInMinsk();
  const tomorrow = tomorrowInMinsk();

  return (
    <HomeDashboard
      remainder={remainder}
      opening={opening}
      monthTotals={totals}
      recent={recent}
      today={today}
      tomorrow={tomorrow}
    />
  );
}
