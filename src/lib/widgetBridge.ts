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
  /**
   * Horodatage (ms) de la dernière cigarette du jour, `null` si aucune.
   * Le widget en déduit l'heure de la dernière cigarette et le compte à
   * rebours de la suivante.
   */
  lastSmokedAt: Date | null;
}

/** Charge utile réellement envoyée au natif (les dates passent en millisecondes). */
interface NativeSnapshot {
  todayKey: string;
  count: number;
  goal: number;
  /** `0` signifie « aucune cigarette aujourd'hui » (JSON n'a pas de `null` sûr). */
  lastSmokedAt: number;
}

interface WidgetBridgePlugin {
  sync(options: NativeSnapshot): Promise<void>;
  consumePending(): Promise<{ pending: number; lastSmokedAt?: number }>;
}

/** Ajouts faits depuis le widget, avec l'instant réel de la dernière cigarette. */
export interface WidgetAdditions {
  pending: number;
  lastSmokedAt: Date | null;
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

  const lastSmokedAt = input.lastSmokedAt?.getTime() ?? 0;

  try {
    await bridge.sync({
      todayKey: input.todayKey,
      count: Math.max(0, Math.round(input.count)),
      goal: Math.max(1, Math.round(input.goal)),
      lastSmokedAt: Number.isFinite(lastSmokedAt) && lastSmokedAt > 0 ? Math.floor(lastSmokedAt) : 0,
    });
  } catch {
    // Le widget gardera sa dernière valeur : aucune action utilisateur requise.
  }
}

/**
 * Récupère (et vide) les cigarettes ajoutées depuis le widget.
 * Retourne une file vide hors application native ou en cas d'échec.
 */
export async function consumeWidgetAdditions(): Promise<WidgetAdditions> {
  const empty: WidgetAdditions = { pending: 0, lastSmokedAt: null };
  const bridge = plugin();
  if (!bridge) return empty;

  try {
    const result = await bridge.consumePending();
    const pending = Number(result?.pending ?? 0);
    const stamp = Number(result?.lastSmokedAt ?? 0);
    const at = new Date(stamp);

    return {
      pending: Number.isFinite(pending) && pending > 0 ? Math.floor(pending) : 0,
      lastSmokedAt: Number.isFinite(stamp) && stamp > 0 && !Number.isNaN(at.getTime()) ? at : null,
    };
  } catch {
    return empty;
  }
}
