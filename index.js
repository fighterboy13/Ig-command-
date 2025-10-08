const login = require("ws3-fca");
const fs = require("fs");
const express = require("express");

// ✅ Load AppState
let appState;
try {
  appState = JSON.parse(fs.readFileSync("appstate.json", "utf-8"));
} catch (err) {
  console.error("❌ Error reading appstate.json:", err);
  process.exit(1);
}

// ✅ Sirf ek hi group me kaam kare
const GROUP_THREAD_ID = "24196335160017473";

// ✅ Express Server to keep bot alive
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("🤖 Welcome Bot is alive!"));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// 🟢 Facebook Login
login({ appState }, (err, api) => {
  if (err) {
    console.error("❌ Login Failed:", err);
    return;
  }

  console.log("✅ Logged in successfully. Welcome Bot activated.");

  // 🆕 Listen for events
  api.listenMqtt((err, event) => {
    if (err) return console.error(err);

    // ✅ Sirf hamare group me hi chale
    if (event.threadID === GROUP_THREAD_ID) {
      // ✅ New member join detect
      if (event.type === "event" && event.logMessageType === "log:subscribe") {
        const addedMembers = event.logMessageData.addedParticipants.map(u => u.fullName);
        const mentions = event.logMessageData.addedParticipants.map(u => ({
          tag: u.fullName,
          id: u.userFbId
        }));

        let msg = `🎉 Welcome ${addedMembers.join(", ")}! 👋\nEnjoy the group 🔥`;

        api.sendMessage({ body: msg, mentions }, event.threadID, (err) => {
          if (err) console.error("❌ Failed to send welcome:", err);
          else console.log(`✅ Sent welcome to: ${addedMembers.join(", ")}`);
        });
      }
    }
  });
});
