"use client";

import { useState } from "react";
import styles from "./tracker.module.css";

/**
 * Sélecteur de thème « Auto / Clair / Sombre ».
 *
 * La préférence est mémorisée dans `localStorage` sous `smokertrack.theme` et
 * appliquée via `data-theme` sur `<html>` ; un script inline du layout
 * (`src/app/layout.tsx`) la réapplique avant la première peinture pour éviter
 * tout flash du thème par défaut. Sans préférence (`auto`), le thème suit la
 * préférence système (`prefers-color-scheme`), comme avant.
 */
export type ThemePreference = "auto" | "light" | "dark";

export const THEME_STORAGE_KEY = "smokertrack.theme";

const OPTIONS: { value: ThemePreference; label: string; title: string }[] = [
  { value: "auto", label: "Auto", title: "Suivre le thème de l'appareil" },
  { value: "light", label: "Clair", title: "Forcer le thème clair" },
  { value: "dark", label: "Sombre", title: "Forcer le thème sombre" },
];

/** Lit la préférence mémorisée ; toute valeur absente ou invalide vaut `auto`. */
export function readTheme(): ThemePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : "auto";
  } catch {
    return "auto";
  }
}

/** Applique la préférence au DOM et la mémorise (best-effort). */
export function applyTheme(theme: ThemePreference): void {
  try {
    if (theme === "auto") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible (mode privé) : le thème s'applique quand même.
  }

  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export default function ThemeSwitcher() {
  // TrackerApp ne rend ce composant qu'après montage : la lecture directe de
  // `localStorage` à l'initialisation ne provoque aucun décalage d'hydratation.
  const [theme, setTheme] = useState<ThemePreference>(readTheme);

  return (
    <div className={styles.themeSwitch} role="group" aria-label="Thème de l'interface">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.themeOption} ${
            theme === option.value ? styles.themeOptionActive : ""
          }`}
          aria-pressed={theme === option.value}
          title={option.title}
          onClick={() => {
            applyTheme(option.value);
            setTheme(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
