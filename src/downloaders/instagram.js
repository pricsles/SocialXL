import axios from "axios";
import https from "https";

async function getFileSize(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const size = parseInt(res.headers["content-length"], 10);
      req.destroy();
      resolve(size);
    });
    req.on("error", (err) => reject(err));
  });
}

function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

async function instagramDownloader(url, updateStatus) {
  try {
    updateStatus("🔍 Analyzing Instagram content...");

    const options = {
      method: "GET",
      url: "https://api.zm.io.vn/v1/social/autolink",
      headers: {
        "Content-Type": "application/json",
        apikey: "V1zQkAwTw9gAbuFp8MVM",
      },
      params: { url },
    };

    const response = await axios.request(options);
    const result = response.data;

    if (!result || result.error || !result.medias?.length) {
      return {
        type: "error",
        message: "Unable to process this Instagram content.",
      };
    }

    // Check if it's a multiple media post
    if (result.type === "multiple" && result.medias.length > 1) {
      updateStatus("📷 Processing gallery...");
      const mediaGroup = [];

      for (const media of result.medias) {
        try {
          const size = await getFileSize(media.url);
          if (bytesToMB(size) <= 50) {
            mediaGroup.push({
              url: media.url,
              size: bytesToMB(size).toFixed(1),
              type: media.type === "video" ? "video" : "photo",
            });
          }
        } catch (error) {
          console.error("Error checking file size:", error);
        }
      }

      if (mediaGroup.length > 0) {
        return {
          type: "media_group",
          media: mediaGroup,
        };
      }
    }

    // Single media post
    if (result.medias.length === 1) {
      const media = result.medias[0];
      const isVideo = media.type === "video";

      updateStatus(
        isVideo ? "🎥 Processing video..." : "📷 Processing image..."
      );

      try {
        const size = await getFileSize(media.url);
        if (bytesToMB(size) <= 50) {
          return {
            type: isVideo ? "video" : "photo",
            url: media.url,
            size: bytesToMB(size).toFixed(1),
          };
        } else {
          return {
            type: "too_large",
            directUrl: media.url,
          };
        }
      } catch (error) {
        console.error("Size check error:", error);
        return {
          type: isVideo ? "video" : "photo",
          url: media.url,
          size: "unknown",
        };
      }
    }

    return {
      type: "error",
      message: "No media found in this Instagram content.",
    };
  } catch (error) {
    console.error("Instagram download error:", error);
    return {
      type: "error",
      message: "Failed to process Instagram content.",
    };
  }
}
export default instagramDownloader;
