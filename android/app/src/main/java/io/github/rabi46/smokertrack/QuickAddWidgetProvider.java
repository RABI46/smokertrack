package io.github.rabi46.smokertrack;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * Widget « +1 » minimal : une seule action, sans ouvrir l'application.
 *
 * Pensé pour être posé près du pouce ou sur l'écran de verrouillage d'un
 * lanceur qui le permet. Il partage la file d'attente et l'heure réelle de la
 * cigarette avec {@link SmokeWidgetProvider} : enchaîner les deux widgets ne
 * peut ni perdre ni doubler un ajout.
 */
public class QuickAddWidgetProvider extends AppWidgetProvider {

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
        if (SmokeWidgetProvider.ACTION_ADD.equals(action)) {
            // Même chemin que le « +1 » du widget principal : compteur, heure
            // réelle, file d'attente et semaine mémorisée.
            SmokeWidgetProvider.handleAdd(context);
        }
        if (SmokeWidgetProvider.ACTION_ADD.equals(action)
                || SmokeWidgetProvider.ACTION_REFRESH.equals(action)) {
            // `refreshAll` du widget principal couvre les trois widgets.
            SmokeWidgetProvider.refreshAll(context);
        }
    }

    /** Met à jour toutes les instances (appelé par le pont JS). */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, QuickAddWidgetProvider.class);

        int[] appWidgetIds = manager.getAppWidgetIds(component);
        if (appWidgetIds == null) {
            return;
        }
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, buildViews(context));
        }
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_add);

        // Même correction que le widget principal : si minuit est passé sans
        // rafraîchissement, on affiche zéro plutôt que le total de la veille.
        boolean sameDay = SmokeWidgetProvider.currentDayKey().equals(WidgetStorage.todayKey(context));
        int count = sameDay ? WidgetStorage.count(context) : 0;

        views.setTextViewText(R.id.widget_quick_count, String.valueOf(count));
        views.setTextViewText(
                R.id.widget_quick_goal,
                context.getString(R.string.widget_goal_format, WidgetStorage.goal(context))
        );

        // Diffusion explicite vers *ce* receiver : aucun souci d'export.
        Intent addIntent = new Intent(context, QuickAddWidgetProvider.class);
        addIntent.setAction(SmokeWidgetProvider.ACTION_ADD);
        PendingIntent addPending = PendingIntent.getBroadcast(
                context,
                300,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_quick_add, addPending);

        Intent launchIntent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent openPending = PendingIntent.getActivity(
                    context,
                    301,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_quick_count, openPending);
        }
        return views;
    }
}
