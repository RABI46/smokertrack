/**
 * Utilitaires de dates basés sur des clés `YYYY-MM-DD` exprimées dans le fuseau
 * de l'utilisateur. On n'utilise jamais `toISOString()` brut pour découper un
 * jour : cela produirait un décalage au changement de fuseau / heure d'été.
 */

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDayKey(value: string): boolean {
  if (!DAY_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Clé `YYYY-MM-DD` du jour courant dans le fuseau demandé. */
export function dayKey(date: Date = new Date(), timeZone?: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** Décale une clé de jour d'un nombre de jours (négatif = passé). */
export function shiftDayKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Liste ordonnée (du plus ancien au plus récent) des `count` derniers jours. */
export function lastDayKeys(count: number, endKey: string = dayKey()): string[] {
  if (count <= 0) return [];
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(shiftDayKey(endKey, -offset));
  }
  return keys;
}

/** Fuseau horaire du navigateur, avec repli sûr. */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Libellé court d'un jour (« lun. », « 12/05 ») pour les graphiques. */
export function formatDayLabel(key: string, locale = "fr-FR"): string {
  const date = new Date(`${key}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(date);
}

/** Libellé long et lisible d'un jour. */
export function formatLongDate(key: string, locale = "fr-FR"): string {
  const date = new Date(`${key}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/** Heure courte d'un Date (affichage « dernière cigarette »). */
export function formatTime(date: Date, locale = "fr-FR", timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

/**
 * Heure de la dernière cigarette, située dans le temps.
 * `14:32` aujourd'hui, `hier 22:10` la veille, `12/10 22:10` au-delà : sans cela
 * l'heure seule laisserait croire à une cigarette du jour.
 */
export function formatRelativeTime(
  date: Date,
  todayKey: string,
  locale = "fr-FR",
  timeZone?: string,
): string {
  const key = dayKey(date, timeZone);
  const time = formatTime(date, locale, timeZone);
  if (key === todayKey) return time;
  if (key === shiftDayKey(todayKey, -1)) return `hier ${time}`;

  const shortDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone,
  }).format(date);
  return `${shortDate} ${time}`;
}
