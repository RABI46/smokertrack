package io.github.rabi46.smokertrack;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pont entre l'application web (WebView) et le widget natif.
 *
 * - `sync` : recopie le résumé du jour (compteur, objectif, heure de la
 *   dernière cigarette) dans les SharedPreferences lues par le widget, puis
 *   rafraîchit les widgets affichés.
 * - `consumePending` : renvoie (et vide) les cigarettes ajoutées depuis le
 *   widget, avec l'horodatage réel de la dernière, que l'application fusionne
 *   dans ses données.
 *
 * Aucun accès réseau : ce plugin ne fait que lire/écrire un fichier de
 * préférences local à l'application.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void sync(PluginCall call) {
        String todayKey = call.getString("todayKey", "");
        Integer count = call.getInt("count", 0);
        Integer goal = call.getInt("goal", 10);
        // `0` (et non `null`) signale « aucune cigarette aujourd'hui ».
        Long lastSmokedAt = call.getLong("lastSmokedAt", 0L);
        // Moyenne 7 jours × 10 et série en cours (poussées par `useTracker`).
        Integer average7Tenths = call.getInt("average7Tenths", 0);
        Integer streak = call.getInt("streak", 0);

        WidgetStorage.saveSnapshot(
                getContext(),
                todayKey,
                count == null ? 0 : count,
                goal == null ? 10 : goal,
                lastSmokedAt == null ? 0L : lastSmokedAt,
                average7Tenths == null ? 0 : average7Tenths,
                streak == null ? 0 : streak
        );
        SmokeWidgetProvider.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePending(PluginCall call) {
        int pending = WidgetStorage.consumePending(getContext());
        JSObject result = new JSObject();
        result.put("pending", pending);
        // Horodatage réel des cigarettes cochées depuis l'écran d'accueil.
        result.put("lastSmokedAt", pending > 0 ? WidgetStorage.lastSmokedAt(getContext()) : 0L);
        call.resolve(result);
    }
}
