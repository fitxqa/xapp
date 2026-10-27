package qa.fitx.xapp;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Puts call audio in "phone call" mode and switches between earpiece and loudspeaker. */
@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {
    @PluginMethod
    public void set(PluginCall call) {
        boolean active = call.getBoolean("active", true);
        boolean speaker = call.getBoolean("speaker", false);
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        try {
            if (!active) {
                if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
                am.setSpeakerphoneOn(false);
                am.setMode(AudioManager.MODE_NORMAL);
                if (getActivity() != null) getActivity().setVolumeControlStream(AudioManager.USE_DEFAULT_STREAM_TYPE);
                call.resolve();
                return;
            }
            am.setMode(AudioManager.MODE_IN_COMMUNICATION);
            if (getActivity() != null) getActivity().setVolumeControlStream(AudioManager.STREAM_VOICE_CALL);
            if (Build.VERSION.SDK_INT >= 31) {
                AudioDeviceInfo pick = null;
                for (AudioDeviceInfo d : am.getAvailableCommunicationDevices()) {
                    int t = d.getType();
                    if (speaker && t == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) { pick = d; break; }
                    if (!speaker && t == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) { pick = d; break; }
                }
                if (pick != null) am.setCommunicationDevice(pick);
            }
            am.setSpeakerphoneOn(speaker);
            int max = am.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL);
            if (am.getStreamVolume(AudioManager.STREAM_VOICE_CALL) < max / 2) {
                am.setStreamVolume(AudioManager.STREAM_VOICE_CALL, (int) (max * 0.8), 0);
            }
        } catch (Exception e) {
            // keep the call going even if routing is not supported on this phone
        }
        call.resolve();
    }
}
