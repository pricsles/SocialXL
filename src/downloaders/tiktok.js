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

async function tiktokDownloader(url, updateStatus) {
  try {
    updateStatus("🔍 Fetching video information...");

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
        message: "Sorry, this video cannot be accessed.",
      };
    }

    // Filter out watermarked versions and sort by quality
    const videos = result.medias.filter(
      (media) =>
        media.type === "video" &&
        (media.quality === "hd_no_watermark" ||
          media.quality === "no_watermark")
    );

    // Find audio if available
    const audio = result.medias.find((media) => media.type === "audio");
    let audioData = null;

    // Check audio size if available
    if (audio) {
      updateStatus("🎵 Checking audio...");
      try {
        const audioSize = await getFileSize(audio.url);
        if (bytesToMB(audioSize) <= 50) {
          audioData = {
            url: audio.url,
            size: bytesToMB(audioSize).toFixed(1),
          };
        }
      } catch (error) {
        console.error("Audio size check error:", error);
      }
    }

    // If no valid videos found
    if (!videos.length) {
      return {
        type: "error",
        message: "No video download links available.",
      };
    }

    // Try HD version first
    const hdVideo = videos.find((v) => v.quality === "hd_no_watermark");

    if (hdVideo) {
      updateStatus("⚡ Checking HD version...");
      const hdSize = await getFileSize(hdVideo.url);

      if (bytesToMB(hdSize) <= 50) {
        return {
          type: "video",
          url: hdVideo.url,
          quality: "4K",
          size: bytesToMB(hdSize).toFixed(1),
          audio: audioData,
        };
      }
    }

    // Try regular no-watermark version
    const regularVideo = videos.find((v) => v.quality === "no_watermark");
    if (regularVideo) {
      updateStatus("📥 Checking regular version...");
      const regularSize = await getFileSize(regularVideo.url);

      if (bytesToMB(regularSize) <= 50) {
        return {
          type: "video",
          url: regularVideo.url,
          quality: "HD",
          ...(hdVideo && { hdLink: hdVideo.url }),
          size: bytesToMB(regularSize).toFixed(1),
          audio: audioData,
        };
      }
    }

    // If all versions are too large
    return {
      type: "too_large",
      hdLink: hdVideo?.url || regularVideo?.url,
    };
  } catch (error) {
    console.error("TikTok download error:", error);
    return {
      type: "error",
      message: "Sorry, this video cannot be accessed.",
    };
  }
}

export default tiktokDownloader;
