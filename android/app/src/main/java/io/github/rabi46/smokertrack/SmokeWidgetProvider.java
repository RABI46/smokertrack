package io.github.rabi46.smokertrack;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Widget d'écran d'accueil.
 *
 * Affiche le nombre de cigarettes du jour et propose un bouton « +1 » qui
 * enregistre une cigarette sans ouvrir l'application. Les ajouts effectués
 * depuis le widget sont mis en file dans {@link WidgetStorage} puis fusionnés
 * dans les données de l'application au prochain lancement.
 */
public class SmokeWidgetProvider extends AppWidgetProvider {

    static final String ACTION_ADD = "io.github.rabi46.smokertrack.widget.ADD";
    static final String ACTION_REFRESH = "io.github.rabi46.smokertrack.widget.REFRESH";

    private static final int REQUEST_ADD = 100;
    private static final int REQUEST_OPEN = 101;

    /** Clé de jour au format `AAAA-MM-JJ` (même convention que l'application web). */
    static String currentDayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
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

        // Si le widget n'a pas été rafraîchi depuis l'application à minuit, on
        // repart de zéro pour le nouveau jour au lieu d'incrémenter la veille.
        if (!today.equals(WidgetStorage.todayKey(context))) {
            WidgetStorage.setTodayKey(context, today);
            WidgetStorage.setCount(context, 0);
        }

        WidgetStorage.setCount(context, WidgetStorage.count(context) + 1);
        WidgetStorage.addPending(context, 1);
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_smokertrack);

        boolean sameDay = currentDayKey().equals(WidgetStorage.todayKey(context));
        int count = sameDay ? WidgetStorage.count(context) : 0;
        int goal = WidgetStorage.goal(context);

        views.setTextViewText(R.id.widget_count, String.valueOf(count));
        views.setTextViewText(R.id.widget_goal, context.getString(R.string.widget_goal_format, goal));
        views.setTextViewText(
                R.id.widget_hint,
                context.getString(sameDay ? R.string.widget_hint_today : R.string.widget_hint_stale)
        );

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

        return views;
    }
}
