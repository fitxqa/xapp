// Copies the Firebase web SDK into www/ so the app works without loading scripts from the internet.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) {
  copyFileSync(`node_modules/firebase/${f}`, `www/${f}`);
  console.log("copied", f);
}

// Admin panel inside the app (Settings → Admin panel): same page as admin/, using the local Firebase files
writeFileSync("www/admin.html", readFileSync("admin/index.html", "utf8").replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[0-9.]+\//g, ""));
console.log("made www/admin.html");
