package io.github.rabi46.smokertrack;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pont entre l'application web (WebView) et le widget natif.
 *
 * - `sync` : recopie le résumé du jour dans les SharedPreferences lues par le
 *   widget, puis rafraîchit les widgets affichés.
 * - `consumePending` : renvoie (et vide) le nombre de cigarettes ajoutées
 *   depuis le widget, que l'application fusionne dans ses données.
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

        WidgetStorage.saveSnapshot(
                getContext(),
                todayKey,
                count == null ? 0 : count,
                goal == null ? 10 : goal
        );
        SmokeWidgetProvider.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePending(PluginCall call) {
        int pending = WidgetStorage.consumePending(getContext());
        JSObject result = new JSObject();
        result.put("pending", pending);
        call.resolve(result);
    }
}
