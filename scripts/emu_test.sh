#!/bin/bash
# Installs the test APK on the emulator, opens Xapp and checks: app starts, Firebase starts, Google push token is issued.
set +e
mkdir -p emu
P=qa.fitx.xapp
adb install -r -g xapp-debug.apk > emu/install.txt 2>&1; cat emu/install.txt
adb logcat -c
adb shell am start -n $P/.MainActivity
sleep 45
adb exec-out screencap -p > emu/1-start.png
adb logcat -d > emu/logcat.txt
PID=$(adb shell pidof $P | tr -d '\r')
echo "RESULT app running: $([ -n "$PID" ] && echo yes pid $PID || echo NO)"
grep -E "FATAL EXCEPTION|AndroidRuntime" -A8 emu/logcat.txt | head -40 > emu/crash.txt
[ -s emu/crash.txt ] && { echo "RESULT crash:"; cat emu/crash.txt; } || echo "RESULT crash: none"
grep -iE "FirebaseApp initialization (successful|unsuccessful)|FirebaseInitProvider" emu/logcat.txt | head -3 | sed 's/^/RESULT firebase: /'
grep -iE "FirebaseMessaging|Firebase-Installations|FirebaseInstallations|FIS_|Token retrieval failed|AUTHENTICATION_FAILED|SERVICE_NOT_AVAILABLE|INVALID_SENDER|PHONE_REGISTRATION_ERROR" emu/logcat.txt | grep -v "^--" | head -15 | sed 's/^/LOG /'
adb shell run-as $P cat shared_prefs/xapp_native.xml > emu/prefs.xml 2>&1
if grep -q 'name="fcmToken"' emu/prefs.xml; then echo "RESULT push token: ISSUED (Google push accepts Xapp on Android)"; else echo "RESULT push token: not issued"; fi
# open the app again after a restart, to check the cold start path
adb shell am force-stop $P; sleep 2; adb shell am start -n $P/.MainActivity; sleep 25
adb exec-out screencap -p > emu/2-restart.png
adb logcat -d | grep -E "FATAL EXCEPTION" -A8 | head -20 > emu/crash2.txt
[ -s emu/crash2.txt ] && echo "RESULT restart crash: yes" || echo "RESULT restart crash: none"
grep "RESULT" -h /dev/null
exit 0
