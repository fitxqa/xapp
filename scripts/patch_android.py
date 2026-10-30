"""Adds Xapp's permissions, background service, receivers, Firebase libraries, version and signing to the generated Android project."""
import re
M = "android/app/src/main/AndroidManifest.xml"
m = open(M).read()
perms = ["CAMERA", "RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS", "POST_NOTIFICATIONS", "FOREGROUND_SERVICE",
         "FOREGROUND_SERVICE_SPECIAL_USE", "FOREGROUND_SERVICE_MICROPHONE", "RECEIVE_BOOT_COMPLETED", "WAKE_LOCK",
         "USE_FULL_SCREEN_INTENT", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", "VIBRATE", "BLUETOOTH_CONNECT", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
extra = "".join(f'    <uses-permission android:name="android.permission.{p}" />\n' for p in perms if f"permission.{p}\"" not in m)
extra += '    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />\n'
extra += '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
extra += '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n'
extra += '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n'
m = m.replace("</manifest>", extra + "</manifest>")
app_parts = '''
        <service android:name=".CallService" android:exported="false" android:foregroundServiceType="specialUse|microphone">
            <property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Keeps a private calling app connected so incoming calls can ring" />
        </service>
        <receiver android:name=".HangupReceiver" android:exported="false" />
        <receiver android:name=".BootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
    </application>'''
m = m.replace("</application>", app_parts.lstrip("\n"), 1)
# activity: portrait, show over lock screen, xapp:// links from the call notification
m = m.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"\n            android:showWhenLocked="true"\n            android:turnScreenOn="true"', 1)
m = re.sub(r'(<category android:name="android.intent.category.LAUNCHER" />\s*</intent-filter>)', r'''\1
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:scheme="xapp" />
            </intent-filter>''', m, count=1)
open(M, "w").write(m)

G = "android/app/build.gradle"
g = open(G).read()
g += '''

// ---- Xapp: background ringing (native Firebase), version from the build number, signed with the Xapp key ----
dependencies {
    implementation platform("com.google.firebase:firebase-bom:35.1.0")
    implementation "com.google.firebase:firebase-auth"
    implementation "com.google.firebase:firebase-firestore"
    implementation "com.google.android.gms:play-services-location:21.3.0"
}
android {
    defaultConfig {
        versionCode Integer.parseInt(System.getenv("GITHUB_RUN_NUMBER") ?: "1")
        versionName "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }
    signingConfigs {
        xapp {
            storeFile file(System.getenv("XAPP_KEYSTORE") ?: "none.keystore")
            storePassword System.getenv("XAPP_KEYSTORE_PASSWORD") ?: ""
            keyAlias "xapp"
            keyPassword System.getenv("XAPP_KEYSTORE_PASSWORD") ?: ""
        }
    }
    buildTypes {
        release {
            if (System.getenv("XAPP_KEYSTORE")) { signingConfig signingConfigs.xapp }
        }
    }
}
'''
open(G, "w").write(g)
print("manifest + gradle patched;", m.count("uses-permission"), "permissions")

# ---- one splash, symbol only (like WhatsApp): system splash colours match the in-app start screen ----
import os
res="android/app/src/main/res"
for folder,col in (("values","#FFFFFF"),("values-night","#0B0B0C")):
    os.makedirs(f"{res}/{folder}",exist_ok=True)
    open(f"{res}/{folder}/xapp_splash.xml","w").write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="xapp_splash_bg">{col}</color></resources>\n')
st=f"{res}/values/styles.xml"; t=open(st).read()
import shutil
os.makedirs(f"{res}/drawable-nodpi",exist_ok=True)
shutil.copy("assets/splash-system-icon.png", f"{res}/drawable-nodpi/xapp_splash_icon.png")
t=t.replace('<item name="android:background">@drawable/splash</item>','<item name="android:background">@drawable/splash</item>\n        <item name="windowSplashScreenBackground">@color/xapp_splash_bg</item>\n        <item name="android:windowBackground">@color/xapp_splash_bg</item>\n        <item name="windowSplashScreenAnimatedIcon">@drawable/xapp_splash_icon</item>')
open(st,"w").write(t)
print("splash theme patched")
