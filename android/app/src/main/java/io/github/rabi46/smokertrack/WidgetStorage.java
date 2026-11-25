package io.github.rabi46.smokertrack;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Stockage partagé entre le WebView et le widget d'écran d'accueil.
 *
 * Le WebView garde les données dans son `localStorage` : le widget, qui vit
 * dans un autre processus, ne peut pas le lire. On recopie donc un résumé
 * (jour courant, compteur, objectif, heure de la dernière cigarette) dans des
 * SharedPreferences dédiées après chaque modification, et le widget y écrit les
 * ajouts effectués hors de l'application via une petite file d'attente
 * (`pending_add`) que le WebView consomme à son ouverture.
 */
final class WidgetStorage {

    private static final String PREFS = "smokertrack_widget";
    private static final String KEY_TODAY = "today_key";
    private static final String KEY_COUNT = "today_count";
    private static final String KEY_GOAL = "goal";
    private static final String KEY_LAST = "last_smoked_at";
    private static final String KEY_PENDING = "pending_add";
    private static final String KEY_SYNCED_AT = "synced_at";
    /** Moyenne 7 jours × 10 (entier : 3,2 → 32). */
    private static final String KEY_AVG7 = "avg7_tenths";
    private static final String KEY_STREAK = "streak_days";
    /** Vrai dès la première synchronisation depuis l'application. */
    private static final String KEY_HAS_STATS = "has_stats";
    /**
     * 7 derniers jours, du plus ancien au plus récent, sous deux chaînes CSV
     * (`week7_counts` = "3,5,0,4,2,1,2", `week7_tracked` = "1,1,0,1,1,1,1").
     * CSV plutôt que JSON : lecture triviale en Java, aucune dépendance.
     */
    private static final String KEY_WEEK_COUNTS = "week7_counts";
    private static final String KEY_WEEK_TRACKED = "week7_tracked";

    private WidgetStorage() {
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /**
     * Enregistre le résumé poussé par l'application web.
     * `lastSmokedAt = 0` signifie « aucune cigarette aujourd'hui » : JSON n'a
     * pas de `null` transportable simplement vers Java. `average7Tenths` vaut
     * la moyenne 7 jours × 10 (3,2 → 32) ; `streak` la série en cours.
     */
    static void saveSnapshot(
            Context context,
            String todayKey,
            int count,
            int goal,
            long lastSmokedAt,
            int average7Tenths,
            int streak
    ) {
        prefs(context)
                .edit()
                .putString(KEY_TODAY, todayKey == null ? "" : todayKey)
                .putInt(KEY_COUNT, Math.max(0, count))
                .putInt(KEY_GOAL, Math.max(1, goal))
                .putLong(KEY_LAST, Math.max(0L, lastSmokedAt))
                .putInt(KEY_AVG7, Math.max(0, average7Tenths))
                .putInt(KEY_STREAK, Math.max(0, streak))
                .putBoolean(KEY_HAS_STATS, true)
                .putLong(KEY_SYNCED_AT, System.currentTimeMillis())
                .apply();
    }

    /** Moyenne 7 jours × 10 (0 avant la première synchronisation). */
    static int average7Tenths(Context context) {
        return prefs(context).getInt(KEY_AVG7, 0);
    }

    /** Série de jours consécutifs dans l'objectif. */
    static int streak(Context context) {
        return prefs(context).getInt(KEY_STREAK, 0);
    }

    /** Enregistre les 7 derniers jours (CSV déjà normalisé par le WebView). */
    static void saveWeek(Context context, String countsCsv, String trackedCsv) {
        prefs(context)
                .edit()
                .putString(KEY_WEEK_COUNTS, countsCsv == null ? "" : countsCsv)
                .putString(KEY_WEEK_TRACKED, trackedCsv == null ? "" : trackedCsv)
                .apply();
    }

    /** 7 compteurs du plus ancien au plus récent ; tableau vide si non synchronisé. */
    static int[] week7Counts(Context context) {
        return parseCsv(prefs(context).getString(KEY_WEEK_COUNTS, ""));
    }

    /** 7 indicateurs « jour suivi » alignés sur `week7Counts`. */
    static int[] week7Tracked(Context context) {
        return parseCsv(prefs(context).getString(KEY_WEEK_TRACKED, ""));
    }

    /**
     * Lecture défensive : une valeur corrompue (restauration partielle, mise à
     * jour ratée) renvoie un tableau vide au lieu de faire planter le widget.
     */
    private static int[] parseCsv(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return new int[0];
        }
        String[] parts = raw.split(",");
        int[] values = new int[parts.length];
        try {
            for (int i = 0; i < parts.length; i++) {
                values[i] = Integer.parseInt(parts[i].trim());
            }
        } catch (NumberFormatException error) {
            return new int[0];
        }
        return values;
    }

    /**
     * Le « +1 » du widget doit rester cohérent avec le widget Semaine : on
     * incrémente aussi le dernier jour de la semaine mémorisée, sans quoi les
     * deux widgets afficheraient des totaux différents après un ajout.
     */
    static void bumpTodayInWeek(Context context) {
        int[] counts = week7Counts(context);
        int[] tracked = week7Tracked(context);
        if (counts.length != 7 || tracked.length != 7) {
            return;
        }
        counts[6] = Math.max(0, counts[6]) + 1;
        tracked[6] = 1;
        saveWeek(context, joinCsv(counts), joinCsv(tracked));
    }

    private static String joinCsv(int[] values) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) builder.append(',');
            builder.append(values[i]);
        }
        return builder.toString();
    }

    /** Vrai dès que l'application a poussé au moins un résumé complet. */
    static boolean hasStats(Context context) {
        return prefs(context).getBoolean(KEY_HAS_STATS, false);
    }

    static String todayKey(Context context) {
        return prefs(context).getString(KEY_TODAY, "");
    }

    static void setTodayKey(Context context, String key) {
        prefs(context).edit().putString(KEY_TODAY, key).apply();
    }

    static int count(Context context) {
        return prefs(context).getInt(KEY_COUNT, 0);
    }

    static void setCount(Context context, int count) {
        prefs(context).edit().putInt(KEY_COUNT, Math.max(0, count)).apply();
    }

    static int goal(Context context) {
        return prefs(context).getInt(KEY_GOAL, 10);
    }

    /** Horodatage (ms) de la dernière cigarette, `0` si aucune. */
    static long lastSmokedAt(Context context) {
        return prefs(context).getLong(KEY_LAST, 0L);
    }

    static void setLastSmokedAt(Context context, long timestamp) {
        prefs(context).edit().putLong(KEY_LAST, Math.max(0L, timestamp)).apply();
    }

    static void addPending(Context context, int delta) {
        int next = Math.max(0, pending(context) + delta);
        prefs(context).edit().putInt(KEY_PENDING, next).apply();
    }

    static int pending(Context context) {
        return prefs(context).getInt(KEY_PENDING, 0);
    }

    /** Lit puis remet à zéro la file d'attente (appelé par le WebView). */
    static int consumePending(Context context) {
        int value = pending(context);
        if (value > 0) {
            prefs(context).edit().putInt(KEY_PENDING, 0).apply();
        }
        return value;
    }
}
