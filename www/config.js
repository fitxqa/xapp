// ===================================================================
//  Xapp settings — its OWN Firebase project (not shared with any other app).
//  Firebase console → Project settings → General → Your apps → Web app → Config.
//  Leave apiKey empty to run in demo mode.
// ===================================================================
window.XAPP_CONFIG = {
  firebase: {
    apiKey: "AIzaSyAfvocJ8xYish8hfItCh9MwHue8-cFsHJA",
    authDomain: "xapp-976e1.firebaseapp.com",
    projectId: "xapp-976e1",
    storageBucket: "xapp-976e1.firebasestorage.app",
    messagingSenderId: "390505325630",
    appId: "1:390505325630:web:4740d5b7be8e7a62f45d6f"
  },
  // Optional TURN relay so calls work between different mobile networks (4G/5G), e.g. a free ExpressTURN account:
  // turn: [{ urls: ["turn:SERVER:3478", "turn:SERVER:3478?transport=tcp"], username: "USER", credential: "PASSWORD" }]
  turn: []
};
