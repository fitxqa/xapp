// Firestore rules test (runs on the local Firestore emulator in GitHub Actions)
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, updateDoc, getDoc, getDocs, addDoc, collection, query, where, limit, arrayRemove, arrayUnion, increment } from "firebase/firestore";

const env = await initializeTestEnvironment({ projectId: "xapp-test", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
const db = uid => env.authenticatedContext(uid).firestore();
const A = db("A"), B = db("B"), C = db("C"), D = db("D");
let pass = 0, fail = 0;
async function t(name, p, ok) { try { await (ok ? assertSucceeds(p) : assertFails(p)); pass++; console.log("PASS", name); } catch (e) { fail++; console.log("FAIL", name, "-", e.message.split("\n")[0]); } }

await env.withSecurityRulesDisabled(async ctx => { const x = ctx.firestore();
  for (const u of ["A", "B", "C", "D"]) await setDoc(doc(x, "users", u), { uid: u, name: u, username: u.toLowerCase(), contacts: [] });
  await setDoc(doc(x, "users", "D"), { uid: "D", name: "D", blocked: true }); });

// ---- 2-person chats (must keep working) ----
await t("pair: A starts chat with B", setDoc(doc(A, "chats", "A_B"), { members: ["A", "B"], last: "hi", lastAt: 1, lastFrom: "A", unread_B: increment(1) }, { merge: true }), true);
await t("pair: A sends message", addDoc(collection(A, "chats/A_B/messages"), { from: "A", text: "hi", at: 1, read: false }), true);
await t("pair: B reads messages", getDocs(collection(B, "chats/A_B/messages")), true);
await t("pair: C can't read", getDocs(collection(C, "chats/A_B/messages")), false);
await t("pair: B marks read", (async () => { const s = await getDocs(collection(B, "chats/A_B/messages")); await updateDoc(s.docs[0].ref, { read: true }); })(), true);
await t("pair: B lists own chats", getDocs(query(collection(B, "chats"), where("members", "array-contains", "B"))), true);
await t("pair: blocked D can't send", addDoc(collection(D, "chats/A_D/messages"), { from: "D", text: "x", at: 1 }), false);

// ---- groups ----
const G = "grp_test1";
await t("group: A creates group with B, C", setDoc(doc(A, "chats", G), { type: "group", name: "Fam", members: ["A", "B", "C"], admins: ["A"], createdBy: "A", last: "x", lastAt: 1, lastFrom: "A" }), true);
await t("group: can't create with someone else as admin", setDoc(doc(B, "chats", "grp_bad"), { type: "group", name: "X", members: ["B", "C"], admins: ["C"] }), false);
await t("group: B sends message", addDoc(collection(B, `chats/${G}/messages`), { from: "B", text: "hello", at: 2, read: false }), true);
await t("group: B updates last + unread", updateDoc(doc(B, "chats", G), { last: "hello", lastAt: 2, lastFrom: "B", unread_A: increment(1), unread_C: increment(1) }), true);
await t("group: C reads messages", getDocs(collection(C, `chats/${G}/messages`)), true);
await t("group: C sees group in list", getDocs(query(collection(C, "chats"), where("members", "array-contains", "C"))), true);
await t("group: outsider D can't read", getDocs(collection(D, `chats/${G}/messages`)), false);
await t("group: outsider can't send", addDoc(collection(db("E"), `chats/${G}/messages`), { from: "E", text: "x", at: 3 }), false);
await t("group: can't send as someone else", addDoc(collection(B, `chats/${G}/messages`), { from: "A", text: "fake", at: 3 }), false);
await t("group: non-admin B can't rename", updateDoc(doc(B, "chats", G), { name: "Hacked" }), false);
await t("group: non-admin B can't remove C", updateDoc(doc(B, "chats", G), { members: arrayRemove("C") }), false);
await t("group: non-admin B can't add D", updateDoc(doc(B, "chats", G), { members: arrayUnion("D") }), false);
await t("group: admin A renames", updateDoc(doc(A, "chats", G), { name: "Family" }), true);
await t("group: admin A adds D", updateDoc(doc(A, "chats", G), { members: arrayUnion("E") }), true);
await t("group: admin A makes B admin", updateDoc(doc(A, "chats", G), { admins: arrayUnion("B") }), true);
await t("group: C leaves", updateDoc(doc(C, "chats", G), { members: arrayRemove("C"), admins: arrayRemove("C") }), true);
await t("group: C can't read after leaving", getDocs(collection(C, `chats/${G}/messages`)), false);
await t("group: admin A removes E", updateDoc(doc(A, "chats", G), { members: arrayRemove("E"), admins: arrayRemove("E") }), true);
await t("group: B marks unread 0", updateDoc(doc(B, "chats", G), { unread_B: 0 }), true);
await t("group: B hides a message for self", (async () => { const s = await getDocs(collection(B, `chats/${G}/messages`)); await updateDoc(s.docs[0].ref, { hiddenFor: arrayUnion("B") }); })(), true);

// ---- other collections still OK ----
await t("users: list limit 10", getDocs(query(collection(A, "users"), where("username", "==", "b"), limit(10))), true);
await t("users: can't list everyone", getDocs(collection(A, "users")), false);
await t("users: can't unblock self", updateDoc(doc(D, "users", "D"), { blocked: false }), false);
await t("presence: own write", setDoc(doc(A, "presence", "A"), { lastSeen: 1 }), true);
await t("presence: others' write", setDoc(doc(A, "presence", "B"), { lastSeen: 1 }), false);
await t("tokens: own write", setDoc(doc(A, "tokens", "A"), { fcm: "x", at: 1 }), true);
await t("tokens: others can't read", getDoc(doc(B, "tokens", "A")), false);
await t("calls: A calls B", setDoc(doc(A, "calls", "c1"), { caller: "A", callee: "B", status: "ringing" }), true);
await t("calls: blocked D can't call", setDoc(doc(D, "calls", "c2"), { caller: "D", callee: "A", status: "ringing" }), false);

console.log(`RESULT rules: ${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
