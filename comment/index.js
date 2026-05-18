import express from "express";
import zlib from "zlib";
import https from "https";

const app = express();
const PORT = 3000;

// YouTube Constants
const CLIENT_VERSION = "2.20260515.01.00";
const VISITOR_ID = "CgttdjdpbEp3WWxZVSjn-qXQBjIKCgJKUBIEGgAgI2LfAgrcAjE4LllUPXR6V0pVZG05X2pIVW53ck9sZ3JEVzcwWDY3QV9Odm5XcENjcFA2aEZiMDNOZmJKSGRNbGdPNE5vTjNCanY2Tk5MYktMOThFbk9teF8xUDc2bFc2NUJzeEk4NXc3ODI0a3BGQ2VWa3BROUhucW5kc1g4Y2JNU2xfUk9CTlM0YU5sQkgzUS1WaDcxcjdLVFdmZy1sSGZ6bi03TG5wSk94cjVYWXUzVFY5T3RfdFFVSWxTTWloaTRmNG5tVXkxU05STFJtLVVYU3c5bXVuX2E0OUQ2YWRNYTB1RGdhRzdfcy0tdUlEcTF2YmNQZDAtNUtPT0lrRWJJc2hHLVYtenZlQ3pEekU1TlpVRm5rem9POEZLOWh1Y3pZNHVXWnU0aDkzRnpfUDZQTnhBeXo2ZzB3bEZWV0lOalNaTzNwZGh6QWg0X0g0cG41MDFHQW1ZU2hXUmtlVXFfQQ==";

// --- Helpers ---

function createContext() {
  return {
    client: {
      hl: "ja",
      gl: "JP",
      clientName: "WEB",
      clientVersion: CLIENT_VERSION,
      platform: "DESKTOP",
      visitorData: VISITOR_ID,
    },
  };
}

function deepWalk(obj, callback) {
  if (!obj || typeof obj !== "object") return;
  
  callback(obj);
  
  for (const key of Object.keys(obj)) {
    deepWalk(obj[key], callback);
  }
}

function decodeResponseBody(buffer, encoding) {
  switch (encoding) {
    case "br": return zlib.brotliDecompressSync(buffer);
    case "gzip": return zlib.gunzipSync(buffer);
    case "deflate": return zlib.inflateSync(buffer);
    default: return buffer;
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error("Failed to parse JSON response");
  }
}

function normalizeCount(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^\d.万億]/g, "");
  
  if (cleaned.includes("万")) return Math.round(parseFloat(cleaned) * 10000);
  if (cleaned.includes("億")) return Math.round(parseFloat(cleaned) * 100000000);
  
  return Number(cleaned) || 0;
}

// --- Request ---

function makeRequest(videoId, body) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(body);
    const gzippedBody = zlib.gzipSync(json);

    const req = https.request(
      {
        hostname: "www.youtube.com",
        path: "/youtubei/v1/next?prettyPrint=false",
        method: "POST",
        headers: {
          accept: "*/*",
          origin: "https://www.youtube.com",
          referer: `https://www.youtube.com/watch?v=${videoId}`,
          "user-agent": "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
          "accept-language": "ja,en;q=0.9",
          "accept-encoding": "gzip, deflate, br",
          "content-encoding": "gzip",
          "content-type": "application/json",
          "content-length": gzippedBody.length,
          "x-youtube-client-name": "1",
          "x-youtube-client-version": CLIENT_VERSION,
          "x-goog-visitor-id": VISITOR_ID,
          "x-youtube-bootstrap-logged-in": "false",
          "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Chrome OS"',
          pragma: "no-cache",
          "cache-control": "no-cache",
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        
        res.on("end", () => {
          try {
            const compressed = Buffer.concat(chunks);
            const decoded = decodeResponseBody(compressed, res.headers["content-encoding"]);
            resolve(safeJsonParse(decoded.toString("utf8")));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(gzippedBody);
    req.end();
  });
}

// --- Parsers ---

function extractCommentTokens(data) {
  const panels = data?.engagementPanels || [];
  
  for (const panel of panels) {
    const renderer = panel?.engagementPanelSectionListRenderer;
    if (renderer?.panelIdentifier !== "engagement-panel-comments-section") continue;

    const items = renderer?.header?.engagementPanelTitleHeaderRenderer?.menu?.sortFilterSubMenuRenderer?.subMenuItems || [];
    let topToken = null;
    let newToken = null;

    for (const item of items) {
      const title = item?.title;
      const token = item?.serviceEndpoint?.continuationCommand?.token;
      
      if (!token) continue;
      if (title === "人気順") topToken = token;
      if (title === "新しい順") newToken = token;
    }
    
    return { topToken, newToken };
  }
  return null;
}

function extractContinuations(data) {
  const result = { nextCommentsContinuation: null, replies: {} };

  // Reply continuations
  deepWalk(data, (obj) => {
    const thread = obj?.commentThreadRenderer;
    if (!thread) return;

    const commentId = thread?.commentViewModel?.commentViewModel?.commentId || thread?.comment?.commentRenderer?.commentId;
    if (!commentId) return;

    const contents = thread?.replies?.commentRepliesRenderer?.contents || [];
    for (const item of contents) {
      const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (token) result.replies[commentId] = token;
    }
  });

  // Next page continuations
  deepWalk(data, (obj) => {
    const renderer = obj?.continuationItemRenderer;
    if (!renderer) return;

    const endpoint = renderer?.continuationEndpoint;
    const token = endpoint?.continuationCommand?.token;
    if (!token) return;

    const requestType = endpoint?.continuationCommand?.request || endpoint?.continuationCommand?.requestType;
    const trigger = renderer?.trigger;
    const targetId = renderer?.targetId || "";

    if (targetId.startsWith("comment-replies-item-")) return;

    if (requestType === "CONTINUATION_REQUEST_TYPE_WATCH_NEXT" || trigger === "CONTINUATION_TRIGGER_ON_ITEM_SHOWN") {
      result.nextCommentsContinuation = token;
    }
  });

  // Fallback next page continuation
  if (!result.nextCommentsContinuation) {
    deepWalk(data, (obj) => {
      const token = obj?.continuationCommand?.token;
      if (token && (token.includes("comments-section") || token.includes("engagement-panel-comments-section"))) {
        result.nextCommentsContinuation = token;
      }
    });
  }

  return result;
}

function applyEmoji(content) {
  let text = content?.content || "";
  if (!Array.isArray(content?.attachmentRuns)) return text;

  const sorted = [...content.attachmentRuns].sort((a, b) => b.startIndex - a.startIndex);
  
  for (const attachment of sorted) {
    const emoji = attachment?.element?.properties?.accessibilityProperties?.label;
    if (!emoji) continue;
    
    const { startIndex, length } = attachment;
    text = text.slice(0, startIndex) + emoji + text.slice(startIndex + length);
  }
  
  return text;
}

function extractCommentsFromFramework(data, replyMap = {}) {
  const mutations = data?.frameworkUpdates?.entityBatchUpdate?.mutations || [];
  const comments = [];

  for (const mutation of mutations) {
    const payload = mutation?.payload?.commentEntityPayload;
    if (!payload) continue;

    const props = payload?.properties || {};
    const author = payload?.author || {};
    const toolbar = payload?.toolbar || {};
    const commentId = props?.commentId || null;
    const repliesRaw = toolbar.replyCount || "0";

    comments.push({
      entityKey: mutation.entityKey,
      commentId,
      text: applyEmoji(props?.content || {}),
      publishedTime: props.publishedTime || null,
      replyLevel: props.replyLevel || 0,
      author: {
        channelId: author.channelId || null,
        name: author.displayName || null,
        avatar: author.avatarThumbnailUrl || null,
        verified: author.isVerified || false,
        creator: author.isCreator || false,
        artist: author.isArtist || false,
      },
      likes: {
        text: toolbar.likeCountNotliked || "0",
        count: normalizeCount(toolbar.likeCountNotliked),
      },
      replies: {
        text: repliesRaw,
        count: normalizeCount(repliesRaw),
      },
      toolbar: {
        likeCountA11y: toolbar.likeCountA11y || null,
        replyCountA11y: toolbar.replyCountA11y || null,
        stateKey: props.toolbarStateKey || null,
      },
      replyContinuation: replyMap[commentId] || null,
    });
  }
  
  return comments;
}

// --- Core API Functions ---

async function fetchInitialComments(videoId, sort = "top") {
  const initialData = await makeRequest(videoId, { context: createContext(), videoId });
  const tokens = extractCommentTokens(initialData);
  
  if (!tokens) throw new Error("Comment token not found");

  const continuation = sort === "new" ? tokens.newToken : tokens.topToken;
  if (!continuation) throw new Error("Sort continuation missing");

  return fetchContinuation(videoId, continuation, { mode: "initial", sort });
}

async function fetchContinuation(videoId, continuation, extra = {}) {
  const response = await makeRequest(videoId, { context: createContext(), continuation });
  const continuations = extractContinuations(response);
  const comments = extractCommentsFromFramework(response, continuations.replies);

  return {
    ...extra,
    continuation,
    nextContinuation: continuations.nextCommentsContinuation,
    comments,
    raw: response,
  };
}

async function fetchReplies(videoId, continuation) {
  const response = await makeRequest(videoId, { context: createContext(), continuation });
  const continuations = extractContinuations(response);
  const comments = extractCommentsFromFramework(response, continuations.replies);

  return {
    continuation,
    nextContinuation: continuations.nextCommentsContinuation,
    comments,
    raw: response,
  };
}

// --- Endpoints ---

app.get("/api/comments", async (req, res) => {
  try {
    const { videoId, sort = "top", continuation } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }

    const result = continuation
      ? await fetchContinuation(videoId, continuation, { mode: "continuation" })
      : await fetchInitialComments(videoId, sort);

    res.json({
      success: true,
      mode: result.mode,
      videoId,
      ...(result.sort && { sort: result.sort }),
      continuation: result.continuation,
      nextContinuation: result.nextContinuation,
      fetchedAt: new Date().toISOString(),
      totalComments: result.comments.length,
      comments: result.comments,
    });
  } catch (err) {
    console.error("[Comments API Error]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/replies", async (req, res) => {
  try {
    const { videoId, continuation } = req.query;
    
    if (!videoId || !continuation) {
      return res.status(400).json({ error: "videoId and continuation are required" });
    }

    const result = await fetchReplies(videoId, continuation);
    
    res.json({
      success: true,
      videoId,
      continuation: result.continuation,
      nextContinuation: result.nextContinuation,
      fetchedAt: new Date().toISOString(),
      totalReplies: result.comments.length,
      replies: result.comments,
    });
  } catch (err) {
    console.error("[Replies API Error]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/raw", async (req, res) => {
  try {
    const { videoId, continuation } = req.query;
    
    if (!videoId || !continuation) {
      return res.status(400).json({ error: "videoId and continuation are required" });
    }

    const result = await fetchContinuation(videoId, continuation);
    res.json(result.raw);
  } catch (err) {
    console.error("[Raw API Error]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/", (_, res) => {
  res.json({ ok: true, service: "youtube-comments-api" });
});

// --- Start Server ---

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
