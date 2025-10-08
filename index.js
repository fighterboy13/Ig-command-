const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const express = require('express');

const ig = new IgApiClient();

// ✅ Your Instagram credentials (ya environment variables se lo)
const IG_USERNAME = process.env.IG_USER || "nfyter";
const IG_PASSWORD = process.env.IG_PASS || "X-223344";

// ✅ Group thread ID (jisme welcome message chahiye)
const GROUP_THREAD_ID = "29871068355871187";

// ✅ Express server (Render/Heroku ke liye alive rakhne ko)
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("🤖 Instagram Welcome Bot is alive!"));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// ✅ Function: Login and save session
async function login() {
  ig.state.generateDevice(IG_USERNAME);

  if (fs.existsSync("session.json")) {
    await ig.state.deserialize(JSON.parse(fs.readFileSync("session.json", "utf-8")));
    console.log("✅ Session restored.");
  } else {
    await ig.account.login(IG_USERNAME, IG_PASSWORD);
    fs.writeFileSync("session.json", JSON.stringify(await ig.state.serialize()));
    console.log("✅ Logged in & session saved.");
  }
}

// ✅ Function: Welcome New Members
async function startBot() {
  setInterval(async () => {
    try {
      // Get thread info
      const thread = ig.entity.directThread(GROUP_THREAD_ID);
      const info = await thread.broadcastText(""); // empty msg to refresh state

      // Get last activity
      const items = await thread.items();
      const lastItem = items[0];

      if (lastItem.item_type === "action_log" && lastItem.action_log.description.includes("added")) {
        const userId = lastItem.user_id;
        const userInfo = await ig.user.info(userId);
        const username = userInfo.username;

        // Welcome message
        await thread.broadcastText(`🎉 Welcome @${username}! 👋 Enjoy the group 🔥`);
        console.log(`✅ Sent welcome to: ${username}`);
      }
    } catch (err) {
      console.error("❌ Error in bot loop:", err);
    }
  }, 10000); // check every 10 sec
}

// ✅ Run Bot
(async () => {
  await login();
  startBot();
})();
