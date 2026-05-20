import { getVideo } from "./video/index.js";
import { searchVideos } from "./search/index.js";
import { getChannel } from "./channel/index.js";
import {
  getComments,
  getReplies,
  getRawCommentData,
} from "./comment/index.js";
import { getPlaylist } from "./playlist/index.js";
import { getSuggestions } from "./suggest/index.js";

export class SiaTubeClient {
  async getVideo(videoId, options) {
    return getVideo(videoId, options);
  }

  async searchVideos(params) {
    return searchVideos(params);
  }

  async getChannel(channelId) {
    return getChannel(channelId);
  }

  async getComments(params) {
    return getComments(params);
  }

  async getReplies(params) {
    return getReplies(params);
  }

  async getRawCommentData(params) {
    return getRawCommentData(params);
  }

  async getPlaylist(playlistId, options) {
    return getPlaylist(playlistId, options);
  }

  async getSuggestions(keyword) {
    return getSuggestions(keyword);
  }
}
