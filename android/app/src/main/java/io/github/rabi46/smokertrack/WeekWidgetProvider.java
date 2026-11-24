package io.github.rabi46.smokertrack;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import java.util.Locale;

/**
 * Widget « Semaine » : les 7 derniers jours en un coup d'œil.
 *
 * Complète le widget principal, qui ne montre que le jour en cours. Les
 * données viennent de la même synchronisation (`WidgetStorage.saveWeek`), donc
 * les deux widgets ne peuvent pas diverger. Rien n'est calculé ici : le widget
 * ne fait qu'afficher ce que l'application a poussé, et le « +1 » du widget
 * principal met aussi à jour le dernier jour de la semaine.
 */
public class WeekWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, buildViews(context));
        }
    }

    /** Met à jour toutes les instances (appelé par le pont JS et le widget principal). */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, WeekWidgetProvider.class);

        int[] appWidgetIds = manager.getAppWidgetIds(component);
        if (appWidgetIds == null) {
            return;
        }
        for (int appWidgetId : appWidgetIds) {
            manager.updateAppWidget(appWidgetId, buildViews(context));
        }
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_week);

        int[] counts = WidgetStorage.week7Counts(context);
        int[] tracked = WidgetStorage.week7Tracked(context);
        int goal = WidgetStorage.goal(context);

        if (counts.length != 7 || tracked.length != 7) {
            // Aucune synchronisation encore : on l'annonce plutôt que d'afficher
            // sept zéros, qui se liraient comme « semaine parfaite ».
            views.setViewVisibility(R.id.widget_week_chart, View.GONE);
            views.setViewVisibility(R.id.widget_week_footer, View.GONE);
            views.setViewVisibility(R.id.widget_week_empty, View.VISIBLE);
            bindOpen(context, views, R.id.widget_week_empty);
            return views;
        }

        views.setViewVisibility(R.id.widget_week_empty, View.GONE);
        views.setViewVisibility(R.id.widget_week_chart, View.VISIBLE);
        views.setViewVisibility(R.id.widget_week_footer, View.VISIBLE);

        // Échelle commune : la plus haute barre occupe toute la hauteur, sans
        // jamais descendre sous l'objectif (sinon la ligne d'objectif sortirait).
        int max = Math.max(goal, 1);
        for (int value : counts) {
            max = Math.max(max, value);
        }

        int[] barIds = {
                R.id.widget_week_bar_0, R.id.widget_week_bar_1, R.id.widget_week_bar_2,
                R.id.widget_week_bar_3, R.id.widget_week_bar_4, R.id.widget_week_bar_5,
                R.id.widget_week_bar_6,
        };
        int[] valueIds = {
                R.id.widget_week_value_0, R.id.widget_week_value_1, R.id.widget_week_value_2,
                R.id.widget_week_value_3, R.id.widget_week_value_4, R.id.widget_week_value_5,
                R.id.widget_week_value_6,
        };

        int trackedDays = 0;
        int sum = 0;
        int overDays = 0;
        for (int index = 0; index < 7; index++) {
            boolean isTracked = tracked[index] == 1;
            int value = counts[index];

            if (isTracked) {
                trackedDays += 1;
                sum += value;
                if (value > goal) overDays += 1;
            }

            views.setTextViewText(valueIds[index], isTracked ? String.valueOf(value) : "—");

            // `setViewLayoutHeight` (API 31+) est indispensable pour une barre
            // proportionnelle dans un RemoteViews : une hauteur en dp fixe ne
            // pourrait pas varier d'un jour à l'autre. Avant Android 12, les
            // barres gardent leur hauteur par défaut : le widget reste lisible
            // (valeurs chiffrées au-dessus), seule la proportion manque.
            if (isTracked && android.os.Build.VERSION.SDK_INT >= 31) {
                // 44 dp de hauteur utile : une journée à zéro garde 2 dp visibles.
                int height = value == 0 ? 2 : Math.max(4, Math.round(44f * value / max));
                views.setViewLayoutHeight(barIds[index], height, android.util.TypedValue.COMPLEX_UNIT_DIP);
            }

            // Vert dans l'objectif, rouge au-delà : même sémantique que l'app.
            views.setInt(
                    barIds[index],
                    "setBackgroundResource",
                    !isTracked ? R.drawable.widget_week_bar_empty
                            : (value <= goal ? R.drawable.widget_week_bar_ok : R.drawable.widget_week_bar_over)
            );
        }

        String average = trackedDays == 0
                ? "—"
                : String.format(Locale.FRANCE, "%.1f", (double) sum / trackedDays);
        views.setTextViewText(
                R.id.widget_week_footer,
                context.getString(R.string.widget_week_footer_format, average, overDays)
        );

        bindOpen(context, views, R.id.widget_week_chart);
        bindOpen(context, views, R.id.widget_week_footer);
        return views;
    }

    /** Toucher le widget ouvre l'application. */
    private static void bindOpen(Context context, RemoteViews views, int viewId) {
        Intent launchIntent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            return;
        }
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent openPending = PendingIntent.getActivity(
                context,
                200,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(viewId, openPending);
    }
}
