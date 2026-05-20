import fs from "node:fs";
import path from "node:path";

function withOptionalHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => value !== undefined && value !== "")
  );
}

function getHeaderPath() {
  return process.env.SIATUBE_HEADER_PATH
    ? path.resolve(process.env.SIATUBE_HEADER_PATH)
    : path.resolve(process.cwd(), "header.txt");
}

function parseHeaderText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headers = {};

  for (let i = 0; i < lines.length; i += 2) {
    const key = lines[i];
    const value = lines[i + 1];

    if (!key || value === undefined) {
      continue;
    }

    headers[key.toLowerCase()] = value;
  }

  return headers;
}

function loadHeaderFile() {
  const headerPath = getHeaderPath();

  if (!fs.existsSync(headerPath)) {
    return {};
  }

  try {
    return parseHeaderText(fs.readFileSync(headerPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Failed to load SiaTube headers from ${headerPath}: ${error.message}`
    );
  }
}

const DEFAULT_CLIENT_VERSION = "2.20260519.01.00";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const DEFAULT_SEC_CH_UA =
  '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"';
const DEFAULT_SEC_CH_UA_PLATFORM = '"Chrome OS"';

const RAW_HEADERS = loadHeaderFile();

function getHeader(name, fallback = "") {
  return RAW_HEADERS[name.toLowerCase()] || fallback;
}

const BASE_HEADERS = withOptionalHeaders({
  accept: getHeader("accept", "*/*"),
  "accept-encoding": getHeader("accept-encoding", "gzip, deflate, br"),
  "accept-language": getHeader("accept-language", "ja,en;q=0.9"),
  "cache-control": getHeader("cache-control", "no-cache"),
  "content-type": getHeader("content-type"),
  "device-memory": getHeader("device-memory"),
  origin: getHeader("origin", "https://www.youtube.com"),
  pragma: getHeader("pragma", "no-cache"),
  priority: getHeader("priority"),
  referer: getHeader("referer", "https://www.youtube.com/"),
  "sec-ch-dpr": getHeader("sec-ch-dpr"),
  "sec-ch-ua": getHeader("sec-ch-ua", DEFAULT_SEC_CH_UA),
  "sec-ch-ua-arch": getHeader("sec-ch-ua-arch"),
  "sec-ch-ua-bitness": getHeader("sec-ch-ua-bitness"),
  "sec-ch-ua-form-factors": getHeader("sec-ch-ua-form-factors"),
  "sec-ch-ua-full-version": getHeader("sec-ch-ua-full-version"),
  "sec-ch-ua-full-version-list": getHeader("sec-ch-ua-full-version-list"),
  "sec-ch-ua-mobile": getHeader("sec-ch-ua-mobile"),
  "sec-ch-ua-model": getHeader("sec-ch-ua-model"),
  "sec-ch-ua-platform": getHeader("sec-ch-ua-platform", DEFAULT_SEC_CH_UA_PLATFORM),
  "sec-ch-ua-platform-version": getHeader("sec-ch-ua-platform-version"),
  "sec-ch-ua-wow64": getHeader("sec-ch-ua-wow64"),
  "sec-ch-viewport-width": getHeader("sec-ch-viewport-width"),
  "user-agent": getHeader("user-agent", DEFAULT_USER_AGENT),
  cookie: getHeader("cookie"),
  "x-client-data": getHeader("x-client-data"),
  "x-goog-event-time": getHeader("x-goog-event-time"),
  "x-goog-request-time": getHeader("x-goog-request-time"),
  "x-goog-visitor-id": getHeader("x-goog-visitor-id"),
  "x-youtube-ad-signals": getHeader("x-youtube-ad-signals"),
  "x-youtube-chrome-connected": getHeader("x-youtube-chrome-connected"),
  "x-youtube-client-name": getHeader("x-youtube-client-name", "1"),
  "x-youtube-client-version": getHeader(
    "x-youtube-client-version",
    DEFAULT_CLIENT_VERSION
  ),
  "x-youtube-device": getHeader("x-youtube-device"),
  "x-youtube-page-cl": getHeader("x-youtube-page-cl"),
  "x-youtube-page-label": getHeader("x-youtube-page-label"),
  "x-youtube-time-zone": getHeader("x-youtube-time-zone"),
  "x-youtube-utc-offset": getHeader("x-youtube-utc-offset"),
});

export const REQUEST_CLIENTS = {
  comment: {
    clientVersion: BASE_HEADERS["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
    visitorData: BASE_HEADERS["x-goog-visitor-id"] || "",
    userAgent: BASE_HEADERS["user-agent"] || DEFAULT_USER_AGENT,
    secChUa: BASE_HEADERS["sec-ch-ua"] || DEFAULT_SEC_CH_UA,
    secChUaPlatform:
      BASE_HEADERS["sec-ch-ua-platform"] || DEFAULT_SEC_CH_UA_PLATFORM,
  },
  playlist: {
    clientVersion: BASE_HEADERS["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
    userAgent: BASE_HEADERS["user-agent"] || DEFAULT_USER_AGENT,
    secChUa: BASE_HEADERS["sec-ch-ua"] || DEFAULT_SEC_CH_UA,
    secChUaPlatform:
      BASE_HEADERS["sec-ch-ua-platform"] || DEFAULT_SEC_CH_UA_PLATFORM,
  },
  search: {
    clientVersion: BASE_HEADERS["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
    userAgent: BASE_HEADERS["user-agent"] || DEFAULT_USER_AGENT,
    secChUa: BASE_HEADERS["sec-ch-ua"] || DEFAULT_SEC_CH_UA,
    secChUaPlatform:
      BASE_HEADERS["sec-ch-ua-platform"] || DEFAULT_SEC_CH_UA_PLATFORM,
  },
  suggest: {
    userAgent: BASE_HEADERS["user-agent"] || DEFAULT_USER_AGENT,
  },
  video: {
    clientVersion: BASE_HEADERS["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
    userAgent: BASE_HEADERS["user-agent"] || DEFAULT_USER_AGENT,
    cookie: BASE_HEADERS.cookie || "",
    headers: BASE_HEADERS,
  },
};

export const REQUEST_CONFIG_META = {
  headerPath: getHeaderPath(),
  hasHeaderFile: fs.existsSync(getHeaderPath()),
};

function createBaseYoutubeHeaders(overrides = {}) {
  return withOptionalHeaders({
    ...BASE_HEADERS,
    ...overrides,
  });
}

export function createPlaylistHeaders() {
  return createBaseYoutubeHeaders({
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "content-type": "application/json",
    referer: BASE_HEADERS.referer || "https://www.youtube.com/",
  });
}

export function createSearchHeaders(referer) {
  return createBaseYoutubeHeaders({
    "content-type": "application/json",
    referer,
  });
}

export function createCommentHeaders(videoId, contentLength) {
  return createBaseYoutubeHeaders({
    "content-encoding": "gzip",
    "content-length": contentLength,
    "content-type": "application/json",
    referer: `https://www.youtube.com/watch?v=${videoId}`,
  });
}

export function createCommentContext() {
  return {
    client: withOptionalHeaders({
      hl: "ja",
      gl: "JP",
      clientName: "WEB",
      clientVersion: REQUEST_CLIENTS.comment.clientVersion,
      platform: "DESKTOP",
      visitorData: REQUEST_CLIENTS.comment.visitorData,
    }),
  };
}

export function createVideoRequestHeaders() {
  return createBaseYoutubeHeaders({
    ...REQUEST_CLIENTS.video.headers,
  });
}

export function createVideoClientContext() {
  return {
    client: {
      hl: "ja",
      gl: "JP",
      clientName: "WEB",
      clientVersion: REQUEST_CLIENTS.video.clientVersion,
      ua: REQUEST_CLIENTS.video.userAgent,
    },
  };
}

export function createGoogleSuggestHeaders() {
  return {
    "User-Agent": REQUEST_CLIENTS.suggest.userAgent,
  };
}
