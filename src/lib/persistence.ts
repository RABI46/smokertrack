/**
 * Demande au navigateur de ne pas évincer les données du site.
 *
 * Sans cela, les navigateurs peuvent purger `localStorage` lorsqu'ils manquent
 * d'espace (Safari le fait agressivement après 7 jours d'inactivité sur les
 * sites non « persistants »). L'appel est idempotent : une fois accordé, le
 * statut reste acquis pour l'origine.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;

  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
