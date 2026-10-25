package io.github.rabi46.smokertrack;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.text.format.DateFormat;
import android.view.View;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Widget d'écran d'accueil.
 *
 * Affiche le nombre de cigarettes du jour, l'heure de la dernière cigarette et
 * un compte à rebours vers la prochaine, et propose un bouton « +1 » qui
 * enregistre une cigarette sans ouvrir l'application.
 *
 * Le compte à rebours est un {@link android.widget.Chronometer} : il avance tout
 * seul, sans réveiller l'application ni consommer de batterie. Une alarme est
 * posée à l'échéance pour basculer en « en retard de … », une autre à minuit
 * pour repartir de zéro.
 *
 * Les ajouts effectués depuis le widget sont mis en file dans
 * {@link WidgetStorage} puis fusionnés dans les données de l'application au
 * prochain lancement.
 */
public class SmokeWidgetProvider extends AppWidgetProvider {

    static final String ACTION_ADD = "io.github.rabi46.smokertrack.widget.ADD";
    static final String ACTION_REFRESH = "io.github.rabi46.smokertrack.widget.REFRESH";

    private static final int REQUEST_ADD = 100;
    private static final int REQUEST_OPEN = 101;
    private static final int REQUEST_ALARM_DUE = 102;
    private static final int REQUEST_ALARM_DAY = 103;

    /**
     * Répartition de l'objectif sur 16 h d'éveil.
     * Doit rester identique à `WAKE_MINUTES` / `spacingMs()` côté web
     * (`src/lib/domain.ts`), sinon le compte à rebours et l'application
     * afficheraient deux horaires différents.
     */
    static final int WAKE_MINUTES = 16 * 60;

    private static final String CHRONOMETER_FORMAT = "%s";

    /** Clé de jour au format `AAAA-MM-JJ` (même convention que l'application web). */
    static String currentDayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /** Écart cible entre deux cigarettes, déduit de l'objectif (cf. `spacingMs`). */
    static long spacingMs(int goal) {
        int safeGoal = Math.max(1, Math.min(100, goal));
        long minutes = Math.max(1, Math.round((double) WAKE_MINUTES / safeGoal));
        return minutes * 60_000L;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, buildViews(context));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (ACTION_ADD.equals(action)) {
            handleAdd(context);
            refreshAll(context);
        } else if (ACTION_REFRESH.equals(action)) {
            refreshAll(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        // Plus aucun widget affiché : inutile de garder des alarmes actives.
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) {
            alarms.cancel(alarmIntent(context, REQUEST_ALARM_DUE));
            alarms.cancel(alarmIntent(context, REQUEST_ALARM_DAY));
        }
        super.onDisabled(context);
    }

    /** Met à jour toutes les instances du widget (appelé aussi par le pont JS). */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, SmokeWidgetProvider.class);

        int[] appWidgetIds = manager.getAppWidgetIds(component);
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, buildViews(context));
        }
    }

    private void handleAdd(Context context) {
        String today = currentDayKey();
        long now = System.currentTimeMillis();

        // Si le widget n'a pas été rafraîchi depuis l'application à minuit, on
        // repart de zéro pour le nouveau jour au lieu d'incrémenter la veille.
        if (!today.equals(WidgetStorage.todayKey(context))) {
            WidgetStorage.setTodayKey(context, today);
            WidgetStorage.setCount(context, 0);
            WidgetStorage.setLastSmokedAt(context, 0L);
        }

        WidgetStorage.setCount(context, WidgetStorage.count(context) + 1);
        // L'heure réelle est conservée : l'application la récupérera en même
        // temps que la file d'attente, même si elle n'est ouverte qu'à midi.
        WidgetStorage.setLastSmokedAt(context, now);
        WidgetStorage.addPending(context, 1);
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_smokertrack);

        boolean sameDay = currentDayKey().equals(WidgetStorage.todayKey(context));
        int count = sameDay ? WidgetStorage.count(context) : 0;
        int goal = WidgetStorage.goal(context);
        long now = System.currentTimeMillis();

        long lastSmokedAt = sameDay ? WidgetStorage.lastSmokedAt(context) : 0L;
        // Horloge de l'utilisateur en avance : on évite un décompte négatif absurde.
        if (lastSmokedAt > now) {
            lastSmokedAt = now;
        }

        views.setTextViewText(R.id.widget_count, String.valueOf(count));
        views.setTextViewText(R.id.widget_goal, context.getString(R.string.widget_goal_format, goal));

        long dueAt = 0L;
        if (lastSmokedAt > 0L) {
            dueAt = lastSmokedAt + spacingMs(goal);
            boolean overdue = dueAt <= now;

            views.setViewVisibility(R.id.widget_next_row, View.VISIBLE);
            views.setTextViewText(
                    R.id.widget_next_label,
                    context.getString(overdue ? R.string.widget_label_overdue : R.string.widget_label_next)
            );

            // Base du Chronometer : il compte à partir de `SystemClock.elapsedRealtime()`.
            long base = overdue
                    ? SystemClock.elapsedRealtime() - (now - dueAt)
                    : SystemClock.elapsedRealtime() + (dueAt - now);

            views.setChronometerCountDown(R.id.widget_next, !overdue);
            views.setChronometer(R.id.widget_next, base, CHRONOMETER_FORMAT, true);

            // Compte à rebours : rouge pendant tout le décompte, vert dès que
            // le compte atteint zéro (créneau atteint). L'alarme
            // `REQUEST_ALARM_DUE` provoque ce rafraîchissement à l'échéance.
            views.setTextColor(
                    R.id.widget_next,
                    overdue ? 0xFF4ADE80 : 0xFFF87171
            );

            views.setTextViewText(
                    R.id.widget_last,
                    context.getString(R.string.widget_last_format, formatTime(context, lastSmokedAt))
            );
        } else {
            views.setViewVisibility(R.id.widget_next_row, View.GONE);
            views.setTextViewText(
                    R.id.widget_last,
                    context.getString(
                            sameDay ? R.string.widget_no_smoke_today : R.string.widget_hint_stale
                    )
            );
        }

        // Bouton « +1 » : diffusion explicite vers ce receiver, sans ouvrir l'app.
        Intent addIntent = new Intent(context, SmokeWidgetProvider.class);
        addIntent.setAction(ACTION_ADD);
        PendingIntent addPending = PendingIntent.getBroadcast(
                context,
                REQUEST_ADD,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_add, addPending);

        // Toucher le compteur ouvre l'application.
        Intent launchIntent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent openPending = PendingIntent.getActivity(
                    context,
                    REQUEST_OPEN,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_count, openPending);
            views.setOnClickPendingIntent(R.id.widget_label, openPending);
        }

        scheduleAlarms(context, dueAt);
        return views;
    }

    /** Heure de la dernière cigarette, au format du réglage 12/24 h de l'appareil. */
    private static String formatTime(Context context, long timestamp) {
        java.text.DateFormat format = DateFormat.getTimeFormat(context);
        return format.format(new Date(timestamp));
    }

    /**
     * Pose les deux alarmes utiles au widget :
     * - l'échéance du compte à rebours, pour basculer le texte en vert ;
     * - le passage à minuit, pour repartir de zéro sans ouvrir l'application.
     *
     * Sur Android 12+ (API 31), l'alarme est exacte quand l'autorisation
     * `SCHEDULE_EXACT_ALARM` est accordée : la bascule rouge → vert a lieu à
     * l'échéance près, même en veille profonde. Sinon — ou avant Android 12 —
     * on garde `setAndAllowWhileIdle`, sans permission spéciale, avec une
     * précision de l'ordre de la minute : largement suffisante en secours.
     */
    private static void scheduleAlarms(Context context, long dueAt) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) {
            return;
        }

        long now = System.currentTimeMillis();

        if (dueAt > now) {
            setAlarm(alarms, dueAt, alarmIntent(context, REQUEST_ALARM_DUE));
        } else {
            alarms.cancel(alarmIntent(context, REQUEST_ALARM_DUE));
        }

        setAlarm(alarms, nextMidnight(now), alarmIntent(context, REQUEST_ALARM_DAY));
    }

    /** Alarme exacte si l'appareil et l'utilisateur le permettent, sinon approximative. */
    private static void setAlarm(AlarmManager alarms, long triggerAt, PendingIntent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarms.canScheduleExactAlarms()) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC, triggerAt, intent);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC, triggerAt, intent);
        }
    }

    private static PendingIntent alarmIntent(Context context, int requestCode) {
        Intent intent = new Intent(context, SmokeWidgetProvider.class);
        intent.setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** Minuit (locale) suivant, avec quelques secondes de marge. */
    private static long nextMidnight(long now) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(now);
        calendar.add(Calendar.DAY_OF_MONTH, 1);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 5);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }
}
