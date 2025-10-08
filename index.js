const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const express = require('express');

const ig = new IgApiClient();

const IG_USERNAME = process.env.IG_USER || "nfyter";
const IG_PASSWORD = process.env.IG_PASS || "X-223344";

// ✅ Aapka group thread ID
const GROUP_THREAD_ID = "29871068355871187";

// ✅ Track last processed message
let lastMessageId = null;

// ✅ Express server (for Render/Heroku uptime)
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("🤖 Instagram Welcome Bot is alive!"));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

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

// ✅ Bot Loop: Check for new members
async function startBot() {
  const thread = ig.entity.directThread(GROUP_THREAD_ID);

  setInterval(async () => {
    try {
      const items = await thread.items();
      const lastItem = items[0];

      // 🛑 Duplicate check
      if (lastMessageId === lastItem.item_id) return;
      lastMessageId = lastItem.item_id;

      // ✅ Detect "user added" system message
      if (
        lastItem.item_type === "action_log" &&
        lastItem.action_log.description.includes("added")
      ) {
        const userId = lastItem.user_id;
        const userInfo = await ig.user.info(userId);
        const username = userInfo.username;

        // Send welcome
        await thread.broadcastText(`🎉 Welcome @${username}! 👋 Enjoy the group 🔥`);
        console.log(`✅ Sent welcome to: ${username}`);
      }
    } catch (err) {
      console.error("❌ Error in bot loop:", err);
    }
  }, 10000); // check every 10 sec
}

(async () => {
  await login();
  startBot();
})();
      
