import fs from "node:fs";
import path from "node:path";

const DEFAULT_CLIENT_VERSION = "2.20260519.01.00";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const DEFAULT_SEC_CH_UA =
  '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"';
const DEFAULT_SEC_CH_UA_PLATFORM = '"Chrome OS"';

function withOptionalHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  );
}

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
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

export function resolveHeaderPath(options = {}) {
  const explicitPath = options.headerPath || process.env.SIATUBE_HEADER_PATH;
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const defaultHeaderPath = path.resolve(process.cwd(), "header.txt");
  return fs.existsSync(defaultHeaderPath) ? defaultHeaderPath : null;
}

function loadHeaderFile(headerPath) {
  if (!headerPath) {
    return {};
  }

  if (!fs.existsSync(headerPath)) {
    return {};
  }

  return parseHeaderText(fs.readFileSync(headerPath, "utf8"));
}

export function getRequestConfigMeta(options = {}) {
  const headerPath = resolveHeaderPath(options);
  return {
    headerPath,
    hasHeaderFile: Boolean(headerPath && fs.existsSync(headerPath)),
  };
}

export function getLocaleOptions(options = {}) {
  return {
    hl: options.hl || "ja",
    gl: options.gl || "JP",
    utcOffsetMinutes: options.utcOffsetMinutes ?? 540,
  };
}

function createBaseHeaders(options = {}) {
  const fileHeaders = loadHeaderFile(resolveHeaderPath(options));
  const explicitHeaders = normalizeHeaders(options.headers);
  const rawHeaders = {
    ...fileHeaders,
    ...explicitHeaders,
  };

  const getHeader = (name, fallback = "") => rawHeaders[name.toLowerCase()] || fallback;

  return withOptionalHeaders({
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
    "sec-ch-ua-platform": getHeader(
      "sec-ch-ua-platform",
      DEFAULT_SEC_CH_UA_PLATFORM
    ),
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
}

export function getRequestClients(options = {}) {
  const headers = createBaseHeaders(options);

  return {
    headers,
    comment: {
      clientVersion:
        headers["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
      visitorData: headers["x-goog-visitor-id"] || "",
      userAgent: headers["user-agent"] || DEFAULT_USER_AGENT,
      secChUa: headers["sec-ch-ua"] || DEFAULT_SEC_CH_UA,
      secChUaPlatform:
        headers["sec-ch-ua-platform"] || DEFAULT_SEC_CH_UA_PLATFORM,
    },
    playlist: {
      clientVersion:
        headers["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
      userAgent: headers["user-agent"] || DEFAULT_USER_AGENT,
      secChUa: headers["sec-ch-ua"] || DEFAULT_SEC_CH_UA,
      secChUaPlatform:
        headers["sec-ch-ua-platform"] || DEFAULT_SEC_CH_UA_PLATFORM,
    },
    search: {
      clientVersion:
        headers["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
      userAgent: headers["user-agent"] || DEFAULT_USER_AGENT,
      secChUa: headers["sec-ch-ua"] || DEFAULT_SEC_CH_UA,
      secChUaPlatform:
        headers["sec-ch-ua-platform"] || DEFAULT_SEC_CH_UA_PLATFORM,
    },
    suggest: {
      userAgent: headers["user-agent"] || DEFAULT_USER_AGENT,
    },
    video: {
      clientVersion:
        headers["x-youtube-client-version"] || DEFAULT_CLIENT_VERSION,
      userAgent: headers["user-agent"] || DEFAULT_USER_AGENT,
      cookie: headers.cookie || "",
      headers,
    },
  };
}

function createConfiguredHeaders(options = {}, overrides = {}) {
  return withOptionalHeaders({
    ...createBaseHeaders(options),
    ...overrides,
  });
}

export function createPlaylistHeaders(options = {}) {
  return createConfiguredHeaders(options, {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "content-type": "application/json",
  });
}

export function createSearchHeaders(referer, options = {}) {
  return createConfiguredHeaders(options, {
    "content-type": "application/json",
    referer,
  });
}

export function createCommentHeaders(videoId, contentLength, options = {}) {
  return createConfiguredHeaders(options, {
    "content-encoding": "gzip",
    "content-length": contentLength,
    "content-type": "application/json",
    referer: `https://www.youtube.com/watch?v=${videoId}`,
  });
}

export function createCommentContext(options = {}) {
  const clients = getRequestClients(options);
  const locale = getLocaleOptions(options);

  return {
    client: withOptionalHeaders({
      hl: locale.hl,
      gl: locale.gl,
      clientName: "WEB",
      clientVersion: clients.comment.clientVersion,
      platform: "DESKTOP",
      visitorData: clients.comment.visitorData,
    }),
  };
}

export function createVideoRequestHeaders(options = {}) {
  return createConfiguredHeaders(options, {
    ...getRequestClients(options).video.headers,
  });
}

export function createVideoClientContext(options = {}) {
  const clients = getRequestClients(options);
  const locale = getLocaleOptions(options);

  return {
    client: {
      hl: locale.hl,
      gl: locale.gl,
      clientName: "WEB",
      clientVersion: clients.video.clientVersion,
      ua: clients.video.userAgent,
    },
  };
}

export function createGoogleSuggestHeaders(options = {}) {
  return {
    "User-Agent": getRequestClients(options).suggest.userAgent,
  };
}

export function getSearchRequestContext(options = {}) {
  const clients = getRequestClients(options);
  const locale = getLocaleOptions(options);

  return {
    client: {
      hl: locale.hl,
      gl: locale.gl,
      clientName: "WEB",
      clientVersion: clients.search.clientVersion,
      platform: "DESKTOP",
      utcOffsetMinutes: locale.utcOffsetMinutes,
    },
    user: { lockedSafetyMode: false },
    request: { useSsl: true },
  };
}

export function getChannelClientOptions(options = {}) {
  const locale = getLocaleOptions(options);
  return {
    lang: locale.hl,
    location: locale.gl,
  };
}

export function getPlaylistClientVersion(options = {}) {
  return getRequestClients(options).playlist.clientVersion;
}
