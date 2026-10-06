// The amigos live in one city; Singapore has no daylight saving, so a fixed offset is safe.
export const APP_TZ = "Asia/Singapore";
export const APP_UTC_OFFSET = "+08:00";

export function dollars(cents: number) {
  const d = cents / 100;
  return `$${d.toLocaleString("en-US", { maximumFractionDigits: d % 1 ? 2 : 0, minimumFractionDigits: d % 1 ? 2 : 0 })}`;
}

export function shortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: APP_TZ });
}

/** "6 days left", "Last day", "Closed 12 Oct" */
export function timeLeft(deadline: Date, now = new Date()) {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return `Closed ${shortDate(deadline)}`;
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "Last day";
  return days === 1 ? "1 day left" : `${days} days left`;
}

/** yyyy-mm-dd for <input type="date">, in the app timezone. */
export function toDateInput(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

/** A yyyy-mm-dd deadline means "until the end of that day" in the amigos' city. */
export function fromDateInput(value: string) {
  return new Date(`${value}T23:59:59${APP_UTC_OFFSET}`);
}
