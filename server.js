// server.js
import dotenv from "dotenv";
import { Telegraf, Markup } from "telegraf";
import { detectPlatform } from "./helper.js";
import tiktokDownloader from "./src/downloaders/tiktok.js";
import pinterestDownloader from "./src/downloaders/pinterest.js";
import instagramDownloader from "./src/downloaders/instagram.js";

dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL_ID = "@Spotife";
const BOT_USERNAME = "@linksDLBOT";

// Function to check if user is subscribed to channel
async function isSubscribed(ctx) {
  try {
    await ctx.telegram.sendChatAction(ctx.from.id, "typing");
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    return ["member", "administrator", "creator"].includes(member.status);
  } catch (error) {
    console.error("Subscription check error:", error);
    return false;
  }
}

// Function to get subscription keyboard
function getSubKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("📢 Subscribe to Channel", "https://t.me/Spotife")],
    [Markup.button.callback("🔄 Check Subscription", "check_sub")],
  ]);
}

// Welcome message
bot.command("start", async (ctx) => {
  const message = `Welcome to Social Media Downloader! 🚀

Download content from various social media platforms in the highest quality possible!

✨ Currently Supporting:
• TikTok Videos (up to 4K quality)
• Pinterest Content (Images & Videos)
• Instagram Posts & Reels (HD Quality)

📱 Features:
• Maximum Quality Downloads
• HD Audio Support
• Photo & Video Support
• Direct Download Links for Large Files
• Fast Processing
• No Watermarks

🔜 More Platforms Coming Soon!

To use the bot:
1️⃣ Subscribe to @Spotife
2️⃣ Send any supported link
3️⃣ Get your high-quality content!`;

  await ctx.reply(message, getSubKeyboard());
});

// Handle subscription check button
bot.action("check_sub", async (ctx) => {
  try {
    const subscribed = await isSubscribed(ctx);
    if (subscribed) {
      await ctx.answerCbQuery(
        "✅ Subscription verified! You can now use the bot."
      );
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      await ctx.reply(
        "✅ You're all set! Send me any TikTok or Pinterest link."
      );
    } else {
      await ctx.answerCbQuery("❌ Please subscribe to @Spotife first!", {
        show_alert: true,
      });
    }
  } catch (error) {
    console.error("Error in check_sub:", error);
    await ctx.answerCbQuery("Please try again", { show_alert: true });
  }
});

// Handle all incoming messages
// Handle all incoming messages
bot.on("text", async (ctx) => {
  try {
    // Skip subscription check if it's a command
    if (ctx.message.text.startsWith("/")) return;

    // Check subscription
    const subscribed = await isSubscribed(ctx);
    if (!subscribed) {
      return ctx.reply(
        "❌ Please subscribe to our channel to use the bot:",
        getSubKeyboard()
      );
    }

    const messageText = ctx.message.text;
    const platformInfo = detectPlatform(messageText);

    if (!platformInfo) {
      return ctx.reply(
        "❌ Sorry, this link format or platform is not supported yet."
      );
    }

    const statusMessage = await ctx.reply("🔄 Initializing download...");

    const updateStatus = async (text) => {
      if (!statusMessage || !statusMessage.message_id) return;
      try {
        await ctx.telegram
          .editMessageText(ctx.chat.id, statusMessage.message_id, null, text)
          .catch((err) => {
            // Silently ignore message editing errors
            console.log("Status update failed:", err.message);
          });
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    };

    try {
      switch (platformInfo.platform) {
        case "tiktok": {
          const result = await tiktokDownloader(platformInfo.url, updateStatus);

          switch (result.type) {
            case "video": {
              await updateStatus("📤 Sending media...");

              const caption = `${
                result.quality === "4K"
                  ? `✅ Downloaded in ${result.quality} quality\nSize: ${result.size}MB`
                  : `✅ Downloaded in ${result.quality} quality\nSize: ${result.size}MB\n\n4K version was too large for Telegram (>50MB)`
              }

Downloaded by ${BOT_USERNAME}`;

              // Send video with quality info
              await ctx.replyWithVideo(
                { url: result.url },
                {
                  caption: caption,
                  ...(result.hdLink &&
                    result.quality !== "4K" && {
                      reply_markup: {
                        inline_keyboard: [
                          [
                            {
                              text: "📥 Download 4K Version",
                              url: result.hdLink,
                            },
                          ],
                        ],
                      },
                    }),
                }
              );

              // Send audio if available and under 50MB
              if (result.audio) {
                await ctx.replyWithAudio({
                  url: result.audio.url,
                  caption: `🎵 Audio track (${result.audio.size}MB)\n\nDownloaded by ${BOT_USERNAME}`,
                });
              }
              break;
            }
            case "too_large": {
              await ctx.reply(
                "⚠️ All video versions are too large for Telegram bot (>50MB)",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "📥 Download 4K Version",
                          url: result.hdLink,
                        },
                      ],
                    ],
                  },
                }
              );
              break;
            }
            case "media_group": {
              await updateStatus("📤 Sending media...");
              const mediaGroup = result.media.images.map((imageUrl, index) => ({
                type: "photo",
                media: imageUrl,
                ...(index === 0 && {
                  caption: `Downloaded by ${BOT_USERNAME}`,
                }),
              }));

              await ctx.replyWithMediaGroup(mediaGroup);

              if (result.media.audio) {
                await ctx.replyWithAudio({
                  url: result.media.audio.url,
                  caption: `🎵 Audio track (${result.media.audio.size}MB)\n\nDownloaded by ${BOT_USERNAME}`,
                });
              }
              break;
            }
            case "error": {
              await ctx.reply(`❌ ${result.message}`);
              break;
            }
          }
          break;
        }

        case "pinterest": {
          const result = await pinterestDownloader(
            platformInfo.url,
            updateStatus
          );

          switch (result.type) {
            case "photo": {
              await updateStatus("📤 Sending media...");
              await ctx.replyWithPhoto(
                { url: result.url },
                {
                  caption: `📷 Pinterest Image\nSize: ${result.size}MB\n\nDownloaded by ${BOT_USERNAME}`,
                }
              );
              break;
            }
            case "video": {
              await updateStatus("📤 Sending media...");
              await ctx.replyWithVideo(
                { url: result.url },
                {
                  caption: `🎥 Pinterest Video\nSize: ${result.size}MB\n\nDownloaded by ${BOT_USERNAME}`,
                }
              );
              break;
            }
            case "too_large": {
              await ctx.reply(
                "⚠️ Media is too large for Telegram bot (>50MB)",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "📥 Download Direct Link",
                          url: result.directUrl,
                        },
                      ],
                    ],
                  },
                }
              );
              break;
            }
            case "error": {
              await ctx.reply(`❌ ${result.message}`);
              break;
            }
          }
          break;
        }

        case "instagram": {
          const result = await instagramDownloader(
            platformInfo.url,
            updateStatus
          );

          switch (result.type) {
            case "photo": {
              await updateStatus("📤 Sending media...");
              await ctx.replyWithPhoto(
                { url: result.url },
                {
                  caption: `📷 Instagram Photo\nSize: ${result.size}MB\n\nDownloaded by ${BOT_USERNAME}`,
                }
              );
              break;
            }
            case "video": {
              await updateStatus("📤 Sending media...");
              await ctx.replyWithVideo(
                { url: result.url },
                {
                  caption: `🎥 Instagram Video\nSize: ${result.size}MB\n\nDownloaded by ${BOT_USERNAME}`,
                }
              );
              break;
            }
            case "media_group": {
              await updateStatus("📤 Sending media...");
              const mediaGroup = result.media.map((item, index) => ({
                type: item.type === "video" ? "video" : "photo",
                media: item.url,
                ...(index === 0 && {
                  caption: `Instagram Gallery\nDownloaded by ${BOT_USERNAME}`,
                }),
              }));

              await ctx.replyWithMediaGroup(mediaGroup);
              break;
            }
            case "too_large": {
              await ctx.reply(
                "⚠️ Media is too large for Telegram bot (>50MB)",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "📥 Download Direct Link",
                          url: result.directUrl,
                        },
                      ],
                    ],
                  },
                }
              );
              break;
            }
            case "error": {
              await ctx.reply(`❌ ${result.message}`);
              break;
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error(`${platformInfo.platform} download error:`, error);
      await ctx.reply(
        "❌ Failed to download. Please make sure the content is public and the link is valid."
      );
    }

    // Clean up status message
    if (statusMessage && statusMessage.message_id) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);
      } catch (error) {
        console.error("Failed to delete status message:", error);
      }
    }
  } catch (error) {
    console.error("Error in text handler:", error);
    await ctx.reply("❌ An error occurred. Please try again later.");
  }
});

// Start bot
bot
  .launch()
  .then(() => console.log("🤖 Bot is running..."))
  .catch((err) => console.error("Bot startup error:", err));

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
