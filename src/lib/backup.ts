import {
  markExported,
  parseBackup,
  readState,
  replaceState,
  toBackup,
} from "./localStore";
import { dayKey } from "./date";
import { clampCount, clampGoal } from "./domain";
import type { PersistedState } from "./localStore";

/**
 * Construit l'historique complet au format CSV, séparateur `;` (habitude des
 * tableurs francophones) et BOM UTF-8 (Excel détecte l'encodage).
 *
 * Colonnes : `date`, `cigarettes`, `objectif` (objectif **courant** — le
 * passé ne conserve pas d'historique de réglage), `dans_objectif`,
 * `derniere_cigarette` (ISO 8601, vide si inconnue). Seuls les jours réellement
 * suivis apparaissent, triés du plus ancien au plus récent.
 *
 * Contrairement à l'export JSON, ceci **ne** réarme **pas** le rappel de
 * sauvegarde : le CSV est un usage, pas une sauvegarde restaurable.
 */
export function buildCsv(): string {
  const state: PersistedState = readState();
  const goal = clampGoal(state.goal);

  const header = "date;cigarettes;objectif;dans_objectif;derniere_cigarette";
  const rows = Object.entries(state.days)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([date, day]) => {
      const count = clampCount(day.count);
      const within = count <= goal ? "oui" : "non";
      return [date, count, goal, within, day.lastSmokedAt ?? ""].join(";");
    });

  return `\uFEFF${[header, ...rows].join("\n")}\n`;
}

/** Télécharge l'historique au format CSV (`smokertrack-AAAA-MM-JJ.csv`). */
export function downloadCsv(now: Date = new Date()): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([buildCsv()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `smokertrack-${dayKey(now)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Télécharge l'état courant au format JSON (`smokertrack-AAAA-MM-JJ.json`).
 * `automatic = true` correspond à la sauvegarde hebdomadaire silencieuse.
 */
export function downloadBackup(now: Date = new Date(), automatic = false): void {
  if (typeof window === "undefined") return;

  const backup = toBackup(readState(), now);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `smokertrack-${dayKey(now)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Laisse au navigateur le temps de démarrer le téléchargement.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);

  // Réarme le rappel de sauvegarde.
  markExported(now, automatic);
}

/**
 * Lit le contenu d'un fichier. `Blob.text()` n'existe pas partout (navigateurs
 * anciens, environnements de test) : repli sur `FileReader`.
 */
function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();

  return new Promise((resolve, reject) => {
    if (typeof FileReader === "undefined") {
      reject(new Error("Lecture de fichier non prise en charge par ce navigateur."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsText(file);
  });
}

/** Lit un fichier choisi par l'utilisateur et remplace les données locales. */
export async function restoreBackup(file: File): Promise<void> {
  const text = await readFileText(file);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide.");
  }

  const state: PersistedState = parseBackup(parsed);
  replaceState(state);
}
