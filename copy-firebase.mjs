// Copies the Firebase web SDK into www/ so the app works without loading scripts from the internet.
import { copyFileSync } from "node:fs";
for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) {
  copyFileSync(`node_modules/firebase/${f}`, `www/${f}`);
  console.log("copied", f);
}
