import { REQUEST_CLIENTS, REQUEST_CONFIG_META } from "../shared/youtube-request-config.js";

const summary = {
  headerPath: REQUEST_CONFIG_META.headerPath,
  hasHeaderFile: REQUEST_CONFIG_META.hasHeaderFile,
  comment: {
    clientVersion: REQUEST_CLIENTS.comment.clientVersion,
    hasVisitorData: Boolean(REQUEST_CLIENTS.comment.visitorData),
    userAgent: REQUEST_CLIENTS.comment.userAgent,
  },
  playlist: {
    clientVersion: REQUEST_CLIENTS.playlist.clientVersion,
    userAgent: REQUEST_CLIENTS.playlist.userAgent,
  },
  search: {
    clientVersion: REQUEST_CLIENTS.search.clientVersion,
    userAgent: REQUEST_CLIENTS.search.userAgent,
  },
  video: {
    clientVersion: REQUEST_CLIENTS.video.clientVersion,
    hasCookie: Boolean(REQUEST_CLIENTS.video.cookie),
    userAgent: REQUEST_CLIENTS.video.userAgent,
    headerKeys: Object.keys(REQUEST_CLIENTS.video.headers).sort(),
  },
};

console.log(JSON.stringify(summary, null, 2));
