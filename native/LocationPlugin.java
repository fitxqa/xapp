package qa.fitx.xapp;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.location.CurrentLocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import java.util.List;
import java.util.Locale;

/** Precise current location from Android's location service, plus the street address, and opening maps apps. */
@CapacitorPlugin(
    name = "Location",
    permissions = { @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }) }
)
public class LocationPlugin extends Plugin {

    private boolean precise() { return getContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED; }
    private boolean anyLocation() { return precise() || getContext().checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED; }

    @PluginMethod
    public void current(PluginCall call) {
        if (!precise()) { requestPermissionForAlias("location", call, "afterPermission"); return; }
        locate(call);
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED && !anyLocation()) { call.reject("denied", "DENIED"); return; }
        locate(call);
    }

    private void locate(PluginCall call) {
        Context ctx = getContext();
        LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        boolean on = lm != null && (android.os.Build.VERSION.SDK_INT >= 28 ? lm.isLocationEnabled()
            : (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)));
        if (!on) { call.reject("Location is off", "OFF"); return; }
        try {
            CurrentLocationRequest req = new CurrentLocationRequest.Builder()
                .setPriority(precise() ? Priority.PRIORITY_HIGH_ACCURACY : Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                .setMaxUpdateAgeMillis(0)          // a fresh fix, never an old cached one
                .setDurationMillis(25000)
                .build();
            LocationServices.getFusedLocationProviderClient(ctx).getCurrentLocation(req, null)
                .addOnSuccessListener(loc -> {
                    if (loc == null) { call.reject("No fix", "NOFIX"); return; }
                    respond(call, loc);
                })
                .addOnFailureListener(e -> call.reject("No fix: " + e.getMessage(), "NOFIX"));
        } catch (SecurityException e) {
            call.reject("denied", "DENIED");
        }
    }

    private void respond(PluginCall call, Location loc) {
        JSObject r = new JSObject();
        r.put("lat", loc.getLatitude());
        r.put("lng", loc.getLongitude());
        r.put("acc", loc.hasAccuracy() ? loc.getAccuracy() : 0);
        r.put("precise", precise());
        // street address (Android's built-in geocoder, free); runs off the main thread
        new Thread(() -> {
            try {
                if (Geocoder.isPresent()) {
                    List<Address> a = new Geocoder(getContext(), Locale.getDefault()).getFromLocation(loc.getLatitude(), loc.getLongitude(), 1);
                    if (a != null && !a.isEmpty()) {
                        Address ad = a.get(0);
                        String line = ad.getMaxAddressLineIndex() >= 0 ? ad.getAddressLine(0) : null;
                        if (line == null) line = (ad.getThoroughfare() != null ? ad.getThoroughfare() + ", " : "") + (ad.getLocality() != null ? ad.getLocality() : "");
                        r.put("address", line);
                    }
                }
            } catch (Exception ignored) {}
            call.resolve(r);
        }).start();
    }

    /** Opens Xapp's location permission page, or the phone's Location switch. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent i = "off".equals(call.getString("what"))
                ? new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
                : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception ignored) {}
        call.resolve();
    }

    /** app: "waze" | "google" | "choose" (any maps app via geo:) */
    @PluginMethod
    public void openMaps(PluginCall call) {
        double lat = call.getDouble("lat", 0.0), lng = call.getDouble("lng", 0.0);
        String app = call.getString("app", "choose"), label = call.getString("label", "Location");
        String ll = String.format(Locale.US, "%.6f,%.6f", lat, lng);
        try {
            if ("waze".equals(app)) {
                if (!start(new Intent(Intent.ACTION_VIEW, Uri.parse("waze://?ll=" + ll + "&navigate=yes"))))
                    start(new Intent(Intent.ACTION_VIEW, Uri.parse("https://waze.com/ul?ll=" + ll + "&navigate=yes")));
            } else if ("google".equals(app)) {
                Intent g = new Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + ll));
                g.setPackage("com.google.android.apps.maps");
                if (!start(g)) start(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=" + ll)));
            } else {
                Intent geo = new Intent(Intent.ACTION_VIEW, Uri.parse("geo:" + ll + "?q=" + ll + "(" + Uri.encode(label) + ")"));
                Intent chooser = Intent.createChooser(geo, "Open location with");
                if (!start(chooser)) start(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=" + ll)));
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    private boolean start(Intent i) {
        try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); return true; }
        catch (Exception e) { return false; }
    }
}
