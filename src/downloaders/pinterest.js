// src/downloaders/pinterest.js
import { promisify } from "util";
import { exec } from "child_process";
import https from "https";
const execAsync = promisify(exec);

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

function getMp4UrlFromM3u8(m3u8Url) {
  return m3u8Url.replace("/iht/hls/", "/mc/720p/").replace(".m3u8", ".mp4");
}

async function getCleanPinterestUrl(url) {
  try {
    // If it's a pin.it URL, first resolve it using gallery-dl
    if (url.includes("pin.it")) {
      const { stdout } = await execAsync(`gallery-dl -g "${url}"`);
      const fullUrl = stdout.trim().split("\n")[0];
      console.log("Resolved pin.it URL to:", fullUrl);

      // Extract pin ID from the resolved URL
      const pinMatch = fullUrl.match(/pinterest\.com\/pin\/(\d+)/);
      if (pinMatch && pinMatch[1]) {
        return `https://www.pinterest.com/pin/${pinMatch[1]}`;
      }

      // If no match found, try extracting from original URL
      const shortPinMatch = url.match(/pin\.it\/([\w-]+)/);
      if (shortPinMatch && shortPinMatch[1]) {
        // Use the resolved full URL if we can't extract a clean pin ID
        return fullUrl;
      }
    } else {
      // For direct pinterest.com URLs, extract the pin ID
      const pinMatch = url.match(/pinterest\.com\/pin\/(\d+)/);
      if (pinMatch && pinMatch[1]) {
        return `https://www.pinterest.com/pin/${pinMatch[1]}`;
      }
    }

    // If no transformation was possible, return original URL
    return url;
  } catch (error) {
    console.error("Error in getCleanPinterestUrl:", error.message);
    if (error.stdout) console.log("Command output:", error.stdout);
    if (error.stderr) console.log("Command error:", error.stderr);
    return null;
  }
}

async function getDirectMediaUrl(url) {
  try {
    const { stdout: galleryOutput } = await execAsync(`gallery-dl -g "${url}"`);
    const directUrl = galleryOutput.trim().split("\n")[0];
    console.log("Gallery-dl output:", directUrl);

    if (directUrl.startsWith("ytdl:")) {
      const m3u8Url = directUrl.replace("ytdl:", "");
      const mp4Url = getMp4UrlFromM3u8(m3u8Url);
      return {
        type: "video",
        url: mp4Url,
      };
    } else if (directUrl.startsWith("http")) {
      return {
        type: "image",
        url: directUrl,
      };
    }
    return null;
  } catch (error) {
    console.error("Error in getDirectMediaUrl:", error.message);
    if (error.stdout) console.log("Command output:", error.stdout);
    if (error.stderr) console.log("Command error:", error.stderr);
    return null;
  }
}

async function pinterestDownloader(url, updateStatus) {
  try {
    updateStatus("🔍 Analyzing Pinterest content...");
    console.log("Processing URL:", url);

    // Step 1: Get clean Pinterest URL
    const cleanUrl = await getCleanPinterestUrl(url);
    console.log("Clean URL:", cleanUrl);

    if (!cleanUrl) {
      return {
        type: "error",
        message:
          "Unable to process this Pinterest content. Invalid URL format.",
      };
    }

    // Step 2: Get direct media URL
    const mediaInfo = await getDirectMediaUrl(cleanUrl);
    console.log("Media Info:", mediaInfo);

    if (!mediaInfo) {
      return {
        type: "error",
        message:
          "Unable to process this Pinterest content. Make sure it's publicly accessible.",
      };
    }

    if (mediaInfo.type === "image") {
      updateStatus("📷 Processing image...");
      try {
        const imageSize = await getFileSize(mediaInfo.url);

        if (bytesToMB(imageSize) <= 50) {
          return {
            type: "photo",
            url: mediaInfo.url,
            size: bytesToMB(imageSize).toFixed(1),
          };
        } else {
          return {
            type: "too_large",
            directUrl: mediaInfo.url,
          };
        }
      } catch (sizeError) {
        console.error("Size check error:", sizeError);
        return {
          type: "photo",
          url: mediaInfo.url,
          size: "unknown",
        };
      }
    } else if (mediaInfo.type === "video") {
      updateStatus("🎥 Processing video...");
      try {
        const videoSize = await getFileSize(mediaInfo.url);

        if (bytesToMB(videoSize) <= 50) {
          return {
            type: "video",
            url: mediaInfo.url,
            size: bytesToMB(videoSize).toFixed(1),
          };
        } else {
          return {
            type: "too_large",
            directUrl: mediaInfo.url,
          };
        }
      } catch (sizeError) {
        console.error("Size check error:", sizeError);
        return {
          type: "video",
          url: mediaInfo.url,
          size: "unknown",
        };
      }
    }

    return {
      type: "error",
      message: "Content type not supported.",
    };
  } catch (error) {
    console.error("Pinterest download error:", error);
    return {
      type: "error",
      message: "Failed to process Pinterest content.",
    };
  }
}

export default pinterestDownloader;
