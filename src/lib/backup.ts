import {
  markExported,
  parseBackup,
  readState,
  replaceState,
  toBackup,
} from "./localStore";
import { dayKey } from "./date";
import type { PersistedState } from "./localStore";

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
