/**
 * Pont vers le widget natif Android.
 *
 * Dans un navigateur (PWA), `window.Capacitor` est absent : toutes les
 * fonctions deviennent des no-ops silencieux. Dans l'APK, le plugin
 * `WidgetBridge` (voir `android/.../WidgetBridgePlugin.java`) recopie le
 * résumé du jour dans les SharedPreferences lues par le widget, et renvoie les
 * cigarettes ajoutées depuis l'écran d'accueil.
 */

export interface WidgetSnapshotInput {
  todayKey: string;
  count: number;
  goal: number;
}

interface WidgetBridgePlugin {
  sync(options: WidgetSnapshotInput): Promise<void>;
  consumePending(): Promise<{ pending: number }>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: { WidgetBridge?: WidgetBridgePlugin };
}

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** Vrai si l'application tourne dans l'APK Android (et non dans un navigateur). */
export function isNativeApp(): boolean {
  try {
    return capacitor()?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function plugin(): WidgetBridgePlugin | null {
  if (!isNativeApp()) return null;
  return capacitor()?.Plugins?.WidgetBridge ?? null;
}

/** Pousse le compteur du jour vers le widget. Silencieux en cas d'échec. */
export async function syncWidgetState(input: WidgetSnapshotInput): Promise<void> {
  const bridge = plugin();
  if (!bridge) return;

  try {
    await bridge.sync({
      todayKey: input.todayKey,
      count: Math.max(0, Math.round(input.count)),
      goal: Math.max(1, Math.round(input.goal)),
    });
  } catch {
    // Le widget gardera sa dernière valeur : aucune action utilisateur requise.
  }
}

/**
 * Récupère (et vide) le nombre de cigarettes ajoutées depuis le widget.
 * Retourne 0 hors application native ou en cas d'échec.
 */
export async function consumeWidgetAdditions(): Promise<number> {
  const bridge = plugin();
  if (!bridge) return 0;

  try {
    const result = await bridge.consumePending();
    const pending = Number(result?.pending ?? 0);
    return Number.isFinite(pending) && pending > 0 ? Math.floor(pending) : 0;
  } catch {
    return 0;
  }
}
