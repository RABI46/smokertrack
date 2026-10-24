"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./tracker.module.css";

/** Fréquence de vérification d'une nouvelle version (page restée ouverte). */
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Enregistre le service worker et gère les mises à jour applicatives.
 *
 * Le service worker n'appelle plus `skipWaiting()` tout seul : il attend le
 * message `SKIP_WAITING`. Sans cela, un utilisateur pouvait rester bloqué sur
 * une version périmée (ou être rechargé sans prévenir) lors d'un déploiement.
 * Ici, on affiche un bandeau « Nouvelle version disponible » et le rechargement
 * n'a lieu qu'au clic de l'utilisateur.
 */
export default function ServiceWorkerRegistration() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // En développement, un service worker masquerait les changements.
    if (process.env.NODE_ENV !== "production") return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    let intervalId: number | undefined;

    const onControllerChange = () => {
      // Une seule fois : évite toute boucle de rechargement.
      if (!sessionStorage.getItem("smokertrack.reloaded")) {
        sessionStorage.setItem("smokertrack.reloaded", "1");
        window.location.reload();
      }
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`, {
          scope: `${basePath}/`,
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(installing);
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        // Vérifie les mises à jour quand l'onglet redevient visible et
        // périodiquement (une PWA peut rester ouverte des jours).
        const check = () => {
          if (document.visibilityState === "visible") void registration.update();
        };
        document.addEventListener("visibilitychange", check);
        intervalId = window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      } catch (error) {
        // L'application reste parfaitement utilisable sans hors-ligne.
        console.warn("Service worker non enregistré :", error);
      }
    };

    void register();

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    setReloading(true);
    waiting.postMessage("SKIP_WAITING");
    // Filet de sécurité si `controllerchange` ne se déclenche pas.
    window.setTimeout(() => window.location.reload(), 1500);
  }, [waiting]);

  if (!waiting) return null;

  return (
    <div className={`${styles.banner} ${styles.bannerInfo}`} role="status">
      <span>
        <strong>Nouvelle version disponible.</strong> Rechargez pour en profiter.
      </span>
      <button
        type="button"
        className={`${styles.ghostButton} ${styles.smallButton}`}
        onClick={applyUpdate}
        disabled={reloading}
      >
        {reloading ? "Rechargement…" : "Recharger"}
      </button>
    </div>
  );
}
