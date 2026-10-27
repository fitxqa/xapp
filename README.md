# Xapp

WhatsApp-style app in black, white and orange. A standalone app with its own Firebase project and its own accounts.

- **Chats:** text, photos, videos (up to 16 MB), voice messages, read ticks, online / last seen
- **Calls:** HD voice and video calls, call history with missed calls
- **Updates:** photo and text status that disappears after 24 hours
- **Contacts & profile:** contact list, profile photo, name and about line
- Anyone with the app creates an account with a username and password.

## One-time setup (free Firebase Spark plan)
1. console.firebase.google.com → **Add project** (e.g. `xapp`).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database → **Rules** → paste [`firestore.rules`](firestore.rules) → Publish.
4. Project settings → Your apps → **Web app** → copy the config into [`www/config.js`](www/config.js) and push.
Until step 4 the APK opens in demo mode.

## APK
Every push to `main` builds **Xapp.apk** (GitHub Actions) and publishes it under **Releases**.
Add the `XAPP_ALL` secret (Settings → Secrets and variables → Actions) so new versions install over old ones.
