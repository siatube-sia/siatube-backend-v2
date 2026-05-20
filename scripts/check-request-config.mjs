import {
  getRequestClients,
  getRequestConfigMeta,
} from "../shared/youtube-request-config.js";

const requestClients = getRequestClients();
const requestConfigMeta = getRequestConfigMeta();

const summary = {
  headerPath: requestConfigMeta.headerPath,
  hasHeaderFile: requestConfigMeta.hasHeaderFile,
  comment: {
    clientVersion: requestClients.comment.clientVersion,
    hasVisitorData: Boolean(requestClients.comment.visitorData),
    userAgent: requestClients.comment.userAgent,
  },
  playlist: {
    clientVersion: requestClients.playlist.clientVersion,
    userAgent: requestClients.playlist.userAgent,
  },
  search: {
    clientVersion: requestClients.search.clientVersion,
    userAgent: requestClients.search.userAgent,
  },
  video: {
    clientVersion: requestClients.video.clientVersion,
    hasCookie: Boolean(requestClients.video.cookie),
    userAgent: requestClients.video.userAgent,
    headerKeys: Object.keys(requestClients.video.headers).sort(),
  },
};

console.log(JSON.stringify(summary, null, 2));
