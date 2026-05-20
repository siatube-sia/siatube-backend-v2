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
  constructor(defaultOptions = {}) {
    this.defaultOptions = { ...defaultOptions };
  }

  mergeOptions(options) {
    return {
      ...this.defaultOptions,
      ...options,
      headers: {
        ...(this.defaultOptions.headers || {}),
        ...(options?.headers || {}),
      },
    };
  }

  async getVideo(videoId, options) {
    return getVideo(videoId, this.mergeOptions(options));
  }

  async searchVideos(params) {
    return searchVideos(this.mergeOptions(params));
  }

  async getChannel(channelId, options) {
    return getChannel(channelId, this.mergeOptions(options));
  }

  async getComments(params) {
    return getComments(this.mergeOptions(params));
  }

  async getReplies(params) {
    return getReplies(this.mergeOptions(params));
  }

  async getRawCommentData(params) {
    return getRawCommentData(this.mergeOptions(params));
  }

  async getPlaylist(playlistId, options) {
    return getPlaylist(playlistId, this.mergeOptions(options));
  }

  async getSuggestions(keyword, options) {
    return getSuggestions(keyword, this.mergeOptions(options));
  }
}
