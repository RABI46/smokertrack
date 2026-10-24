"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker du dossier `public/`.
 * Le scope est calculé depuis `NEXT_PUBLIC_BASE_PATH` pour rester valide aussi
 * bien à la racine qu'hébergé sous /smokertrack/ (GitHub Pages).
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // En développement, un service worker masquerait les changements.
    if (process.env.NODE_ENV !== "production") return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    const register = async () => {
      try {
        await navigator.serviceWorker.register(`${basePath}/sw.js`, {
          scope: `${basePath}/`,
        });
      } catch (error) {
        // L'application reste parfaitement utilisable sans hors-ligne.
        console.warn("Service worker non enregistré :", error);
      }
    };

    void register();
  }, []);

  return null;
}
