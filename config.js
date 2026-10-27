// ===================================================================
//  Xapp settings — its OWN Firebase project (not shared with any other app).
//  Firebase console → Project settings → General → Your apps → Web app → Config.
//  Leave apiKey empty to run in demo mode.
// ===================================================================
window.XAPP_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  // Optional TURN relay so calls work between different mobile networks (4G/5G), e.g. a free ExpressTURN account:
  // turn: [{ urls: ["turn:SERVER:3478", "turn:SERVER:3478?transport=tcp"], username: "USER", credential: "PASSWORD" }]
  turn: []
};
