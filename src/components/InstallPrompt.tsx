"use client";

import { useEffect, useState } from "react";
import styles from "./tracker.module.css";

/** Événement non standard, absent des types TypeScript du DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bouton « Installer » affiché uniquement quand le navigateur propose
 * l'installation (Chrome/Edge/Android). Sur iOS, l'installation se fait via
 * « Partager → Sur l'écran d'accueil » : aucun événement n'est émis.
 */
export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS : propriété non standard.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standalone) setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent || installed) return null;

  return (
    <button
      type="button"
      className={`${styles.ghostButton} ${styles.smallButton}`}
      onClick={async () => {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setPromptEvent(null);
      }}
    >
      Installer
    </button>
  );
}
