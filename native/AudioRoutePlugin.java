package qa.fitx.xapp;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioDeviceCallback;
import android.media.AudioFocusRequest;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Call audio: puts the phone in "call" mode (volume keys control call volume) and sends the sound to
 * Bluetooth, a wired headset, the earpiece or the loudspeaker. Follows headsets connecting/disconnecting mid-call.
 */
@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {
    private boolean active = false;
    private String want = "auto";          // auto | earpiece | speaker | bluetooth | wired
    private boolean preferSpeaker = false;  // what "auto" uses when no headset is connected
    private AudioDeviceCallback deviceCallback;
    private AudioFocusRequest focusReq;
    private boolean held = false;           // a phone (SIM) call has taken over the sound
    private AudioManager.OnModeChangedListener modeListener;
    private final Handler main = new Handler(Looper.getMainLooper());

    private AudioManager am() { return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE); }

    @Override
    public void load() {
        deviceCallback = new AudioDeviceCallback() {
            @Override public void onAudioDevicesAdded(AudioDeviceInfo[] added) { changed(); }
            @Override public void onAudioDevicesRemoved(AudioDeviceInfo[] removed) { changed(); }
        };
        try { am().registerAudioDeviceCallback(deviceCallback, main); } catch (Exception ignored) {}
        if (Build.VERSION.SDK_INT >= 31) {
            modeListener = mode -> {
                if (!active) return;
                if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_CALL_SCREENING) hold(true);
                else if (held && (mode == AudioManager.MODE_NORMAL || mode == AudioManager.MODE_IN_COMMUNICATION)) hold(false);
            };
            try { am().addOnModeChangedListener(getContext().getMainExecutor(), modeListener); } catch (Exception ignored) {}
        }
    }

    /** Phone call started / ended: tell the app to hold or resume the Xapp call. */
    private void hold(boolean on) {
        if (held == on) return;
        held = on;
        JSObject o = new JSObject(); o.put("hold", on);
        notifyListeners("interruption", o);
        if (!on && active) main.postDelayed(this::apply, 400);   // take the call audio back after the SIM call
    }

    private void requestFocus() {
        if (Build.VERSION.SDK_INT < 26) return;
        if (focusReq == null) {
            focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(change -> {
                    if (!active) return;
                    if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT || change == AudioManager.AUDIOFOCUS_LOSS) {
                        int mode = am().getMode();
                        if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_RINGTONE) hold(true);
                    } else if (change == AudioManager.AUDIOFOCUS_GAIN) hold(false);
                }, main)
                .build();
        }
        try { am().requestAudioFocus(focusReq); } catch (Exception ignored) {}
    }

    private void abandonFocus() {
        if (Build.VERSION.SDK_INT >= 26 && focusReq != null) { try { am().abandonAudioFocusRequest(focusReq); } catch (Exception ignored) {} }
    }

    private void changed() {
        if (active) {
            // a headset that disappears can't stay selected: fall back to automatic
            if (!available().containsKey(want) && !"auto".equals(want)) want = "auto";
            apply();
        }
        notifyListeners("devices", state());
    }

    /** route: auto | earpiece | speaker | bluetooth | wired. speaker (old style) still works. */
    @PluginMethod
    public void set(PluginCall call) {
        active = Boolean.TRUE.equals(call.getBoolean("active", true));
        String r = call.getString("route");
        if (r == null) r = Boolean.TRUE.equals(call.getBoolean("speaker", false)) ? "speaker" : "auto";
        want = r;
        if (call.getBoolean("preferSpeaker") != null) preferSpeaker = Boolean.TRUE.equals(call.getBoolean("preferSpeaker"));
        apply();
        call.resolve(state());
    }

    @PluginMethod
    public void state(PluginCall call) { call.resolve(state()); }

    /** Android 12+: Bluetooth access, asked once so Bluetooth headsets can be used in calls. */
    @PluginMethod
    public void requestBluetooth(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31 && getActivity() != null
            && getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            getActivity().requestPermissions(new String[] { Manifest.permission.BLUETOOTH_CONNECT }, 777);
        }
        call.resolve();
    }

    private void apply() {
        AudioManager am = am();
        try {
            if (!active) {
                held = false; abandonFocus();
                if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
                else { am.stopBluetoothSco(); am.setBluetoothScoOn(false); }
                am.setSpeakerphoneOn(false);
                am.setMode(AudioManager.MODE_NORMAL);
                if (getActivity() != null) getActivity().setVolumeControlStream(AudioManager.USE_DEFAULT_STREAM_TYPE);
                return;
            }
            if (held) return;                                   // the SIM call owns the audio until it ends
            requestFocus();
            am.setMode(AudioManager.MODE_IN_COMMUNICATION);
            if (getActivity() != null) getActivity().setVolumeControlStream(AudioManager.STREAM_VOICE_CALL);
            String target = resolve();
            if (Build.VERSION.SDK_INT >= 31) {
                AudioDeviceInfo d = available().get(target);
                if (d != null) am.setCommunicationDevice(d);
            } else {
                if ("bluetooth".equals(target)) { am.setSpeakerphoneOn(false); am.startBluetoothSco(); am.setBluetoothScoOn(true); }
                else { am.stopBluetoothSco(); am.setBluetoothScoOn(false); am.setSpeakerphoneOn("speaker".equals(target)); }
            }
            int max = am.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL);
            if (am.getStreamVolume(AudioManager.STREAM_VOICE_CALL) < max / 2) am.setStreamVolume(AudioManager.STREAM_VOICE_CALL, (int) (max * 0.7), 0);
        } catch (Exception ignored) {
            // keep the call going even if this phone refuses a route
        }
    }

    /** What "auto" means right now: Bluetooth, then wired headset, then speaker/earpiece. */
    private String resolve() {
        Map<String, AudioDeviceInfo> av = available();
        if (!"auto".equals(want) && av.containsKey(want)) return want;
        if (av.containsKey("bluetooth")) return "bluetooth";
        if (av.containsKey("wired")) return "wired";
        return preferSpeaker ? "speaker" : (av.containsKey("earpiece") ? "earpiece" : "speaker");
    }

    /** Outputs this phone can use for a call right now, keyed by route name. */
    private Map<String, AudioDeviceInfo> available() {
        Map<String, AudioDeviceInfo> out = new LinkedHashMap<>();
        AudioManager am = am();
        AudioDeviceInfo[] list;
        try {
            list = Build.VERSION.SDK_INT >= 31 ? am.getAvailableCommunicationDevices().toArray(new AudioDeviceInfo[0])
                                               : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
        } catch (Exception e) { list = new AudioDeviceInfo[0]; }
        for (AudioDeviceInfo d : list) {
            String k = kind(d.getType());
            if (k != null && !out.containsKey(k)) out.put(k, d);
        }
        if (!out.containsKey("speaker")) out.put("speaker", null);
        return out;
    }

    private static String kind(int t) {
        switch (t) {
            case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE: return "earpiece";
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: return "speaker";
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO: return "bluetooth";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET:
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES:
            case AudioDeviceInfo.TYPE_USB_HEADSET: return "wired";
            default:
                if (Build.VERSION.SDK_INT >= 31 && (t == AudioDeviceInfo.TYPE_BLE_HEADSET || t == AudioDeviceInfo.TYPE_BLE_SPEAKER)) return "bluetooth";
                return null;
        }
    }

    private JSObject state() {
        JSObject r = new JSObject();
        JSArray outs = new JSArray();
        for (Map.Entry<String, AudioDeviceInfo> e : available().entrySet()) {
            JSObject o = new JSObject();
            o.put("route", e.getKey());
            String name = e.getValue() != null && e.getValue().getProductName() != null ? e.getValue().getProductName().toString() : "";
            o.put("name", name);
            outs.put(o);
        }
        r.put("outputs", outs);
        r.put("current", active ? resolve() : "");
        r.put("want", want);
        r.put("held", held);
        r.put("btPermission", Build.VERSION.SDK_INT < 31 || getContext().checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED);
        return r;
    }

    @Override
    protected void handleOnDestroy() {
        try { am().unregisterAudioDeviceCallback(deviceCallback); } catch (Exception ignored) {}
        if (Build.VERSION.SDK_INT >= 31 && modeListener != null) { try { am().removeOnModeChangedListener(modeListener); } catch (Exception ignored) {} }
    }
}
