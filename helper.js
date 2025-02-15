// helper.js
const urlPatterns = {
  tiktok: /https:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s"]*/,
  pinterest:
    /https?:\/\/(?:(?:www\.)?pinterest\.(?:com|ca|co\.uk|fr|de|es|it|jp|kr|au|ru)\/(?:pin\/[\w-]+|\d+)|pin\.it\/[\w-]+)[^\s"]*/,
  instagram: /https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+/,
};

function extractUrl(text) {
  // Regular expression to match URLs more accurately
  const urlRegex = /(https?:\/\/[^\s"]+)/i;
  const match = text.match(urlRegex);
  return match ? match[1].trim() : text.trim();
}

function cleanUrl(url) {
  // Remove any trailing punctuation or unwanted characters
  return url.replace(/[.,;!?)}\]]+$/, "").trim();
}

function detectPlatform(text) {
  if (!text) return null;

  // First extract the URL from the text
  const extractedUrl = extractUrl(text);
  if (!extractedUrl) return null;

  // Clean the URL
  const cleanedUrl = cleanUrl(extractedUrl);

  // Then check which platform it belongs to
  for (const [platform, pattern] of Object.entries(urlPatterns)) {
    if (pattern.test(cleanedUrl)) {
      return {
        platform,
        url: cleanedUrl,
      };
    }
  }
  return null;
}

export { detectPlatform, extractUrl, cleanUrl };
