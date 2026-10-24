"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./tracker.module.css";

/** Paramètre d'URL utilisé par les raccourcis du manifeste (`?action=add`). */
export const QUICK_ADD_PARAM = "action";
export const QUICK_ADD_VALUE = "add";

/**
 * Ajout rapide depuis un raccourci d'écran d'accueil.
 *
 * Le manifeste déclare un raccourci `?action=add` : un appui long sur l'icône
 * installée propose « Ajouter une cigarette », qui ouvre l'application et
 * enregistre immédiatement une cigarette, puis nettoie l'URL pour éviter tout
 * doublon si l'utilisateur recharge la page.
 */
export default function QuickAddHandler({ onAdd }: { onAdd: () => void }) {
  const handled = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get(QUICK_ADD_PARAM) !== QUICK_ADD_VALUE) return;

    handled.current = true;
    onAdd();

    // Retire le paramètre : un rechargement ne doit pas recompter.
    params.delete(QUICK_ADD_PARAM);
    const query = params.toString();
    const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", cleanUrl);

    setToast("Cigarette ajoutée depuis le raccourci.");
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [onAdd]);

  if (!toast) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {toast}
    </div>
  );
}
