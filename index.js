const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const express = require('express');

const ig = new IgApiClient();
const USERNAME = process.env.IG_USER || "nfyter";
const PASSWORD = process.env.IG_PASS || "x-223344";

// Group Info
const THREAD_ID = "794932516795889"; // group thread id

// Default settings
let WELCOME_MSG = "Welcome to the group, @{user}! 🎉";
let AUTO_REPLY = "Hello @{user}, thanks for your message!";
let welcomeEnabled = true;
let replyEnabled = true;
let lockEnabled = false;
let lockedName = "";

// Express server (Heroku/Render ke liye)
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Instagram Group Command Bot is alive!"));
app.listen(PORT, () => console.log(`✅ Web server running on port ${PORT}`));

// Session handling
async function login() {
  ig.state.generateDevice(USERNAME);

  if (fs.existsSync("session.json")) {
    console.log("🔑 Loading saved session...");
    const saved = JSON.parse(fs.readFileSync("session.json"));
    await ig.state.deserialize(saved);
  } else {
    console.log("🔑 Logging in fresh...");
    await ig.account.login(USERNAME, PASSWORD);
    const serialized = await ig.state.serialize();
    fs.writeFileSync("session.json", JSON.stringify(serialized));
  }

  console.log("✅ Logged in as", USERNAME);
}

// Start Bot
async function startBot() {
  await login();
  console.log(`🚀 Bot started`);

  let lastUsers = [];
  let lastItemId = null;

  async function botLoop() {
    try {
      // 🔹 Thread feed
      const threadFeed = ig.feed.directThread(THREAD_ID);
      const items = await threadFeed.items(); // messages array

      // 🔹 Users from thread (sometimes empty, fallback)
      const currentUsers = (threadFeed.users || []).map(u => u.username);
      const groupName = threadFeed.threadTitle || "Group";

      // --- Group name lock ---
      if (lockEnabled && groupName !== lockedName) {
        console.log(`⚠️ Name changed to "${groupName}" resetting to "${lockedName}"...`);
        await threadFeed.updateTitle(lockedName).catch(() => {});
      }

      // --- Detect new members ---
      if (welcomeEnabled) {
        for (let u of currentUsers) {
          if (!lastUsers.includes(u)) {
            console.log(`👋 New user joined: ${u}`);
            await threadFeed.broadcastText(
              WELCOME_MSG.replace("{user}", u).replace("@{user}", `@${u}`)
            ).catch(() => {});
          }
        }
      }
      lastUsers = currentUsers;

      // --- Auto reply & Commands ---
      if (items && items.length > 0) {
        const lastItem = items[0]; // latest message
        if (lastItem.item_id !== lastItemId) {
          lastItemId = lastItem.item_id;

          if (lastItem.user_id && lastItem.user_id !== ig.state.cookieUserId) {
            const sender =
              (threadFeed.users || []).find(u => u.pk === lastItem.user_id)?.username || "user";
            const text = lastItem.text || "";

            if (text.startsWith("!")) {
              const parts = text.trim().split(" ");
              const cmd = parts[0].toLowerCase();
              const arg = parts.slice(1).join(" ");

              if (cmd === "!welcome") {
                if (arg.toLowerCase() === "on") {
                  welcomeEnabled = true;
                  await threadFeed.broadcastText(`✅ Welcome messages enabled.`).catch(() => {});
                } else if (arg.toLowerCase() === "off") {
                  welcomeEnabled = false;
                  await threadFeed.broadcastText(`❌ Welcome messages disabled.`).catch(() => {});
                } else if (arg.length > 0) {
                  WELCOME_MSG = arg;
                  await threadFeed.broadcastText(`✏️ Welcome message updated to: ${arg}`).catch(() => {});
                }
              }

              if (cmd === "!reply") {
                if (arg.toLowerCase() === "on") {
                  replyEnabled = true;
                  await threadFeed.broadcastText(`✅ Auto-reply enabled.`).catch(() => {});
                } else if (arg.toLowerCase() === "off") {
                  replyEnabled = false;
                  await threadFeed.broadcastText(`❌ Auto-reply disabled.`).catch(() => {});
                } else if (arg.length > 0) {
                  AUTO_REPLY = arg;
                  await threadFeed.broadcastText(`✏️ Auto-reply updated to: ${arg}`).catch(() => {});
                }
              }

              if (cmd === "!lock") {
                lockedName = arg || groupName;
                lockEnabled = true;
                await threadFeed.broadcastText(`🔒 Group name locked to: "${lockedName}"`).catch(() => {});
              }

              if (cmd === "!unlock") {
                lockEnabled = false;
                await threadFeed.broadcastText(`🔓 Group name lock disabled.`).catch(() => {});
              }

              if (cmd === "!help") {
                await threadFeed.broadcastText(
                  "📌 Commands:\n" +
                  "!welcome on/off/custom\n" +
                  "!reply on/off/custom\n" +
                  "!lock [name]\n" +
                  "!unlock\n" +
                  "!help"
                ).catch(() => {});
              }
            } else {
              // Normal auto-reply
              if (replyEnabled) {
                console.log(`💬 Message from ${sender}: ${text}`);
                await threadFeed.broadcastText(
                  AUTO_REPLY.replace("{user}", sender).replace("@{user}", `@${sender}`)
                ).catch(() => {});
              }
            }
          }
        }
      }

    } catch (err) {
      console.error("❌ Error in botLoop:", err.message);
    }

    setTimeout(botLoop, 5000);
  }

  botLoop();
}

startBot();
        
