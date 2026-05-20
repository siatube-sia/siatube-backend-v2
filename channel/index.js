import { Innertube } from "youtubei.js";
import { getChannelClientOptions } from "../shared/youtube-request-config.js";

const clientCache = new Map();

function getYoutubeClient(options = {}) {
  const clientOptions = getChannelClientOptions(options);
  const cacheKey = `${clientOptions.lang}:${clientOptions.location}`;

  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  const youtubeReadyPromise = Innertube.create({
    ...clientOptions,
    retrieve_player: false,
  })
      .then((client) => {
        clientCache.set(cacheKey, Promise.resolve(client));
        return client;
      })
      .catch((err) => {
        clientCache.delete(cacheKey);
        throw err;
      });

  clientCache.set(cacheKey, youtubeReadyPromise);
  return youtubeReadyPromise;
}

function normalizePlaylistId(id = "") {
  return id.length > 34 ? id.slice(2) : id;
}

async function fetchImageAsBase64(videoId, quality = "mqdefault") {
  if (!videoId) return "";

  const url = `https://i.ytimg.com/vi_webp/${videoId}/${quality}.webp`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return "";
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return `data:image/webp;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

export async function getChannel(channelId, options = {}) {
  if (!channelId) {
    const error = new Error("channelId is required");
    error.statusCode = 400;
    throw error;
  }

  const client = await getYoutubeClient(options);
  const channel = await client.getChannel(channelId);

  const metadata = channel.metadata ?? {};
  const header = channel.header ?? {};
  const currentTab = channel.current_tab ?? {};
  const contents = currentTab?.content?.contents ?? [];

    // =========================
    // Top Video
    // =========================
  const topVideoRaw = contents?.[0]?.contents?.[0] ?? {};
  const topVideoId = topVideoRaw.id ?? topVideoRaw.video_id ?? "";

    // =========================
    // Playlist Sections
    // =========================
  const playlistSections = contents.slice(1).filter((c) => {
    if (c.type !== "ItemSection") return false;

    const title = c?.contents?.[0]?.title?.text ?? "";

    return (
      title !== "メンバー" &&
      title !== "投稿" &&
      title !== "ショート" &&
      title !== "複数の再生リスト"
    );
  });

    // =========================
    // 並列処理
    // =========================
  const [topVideoThumbnail, playlists] = await Promise.all([
    fetchImageAsBase64(topVideoId, "mqdefault"),

    Promise.all(
      playlistSections.map(async (section) => {
        const content = section?.contents?.[0];

        const itemsRaw = content?.content?.items ?? [];

        const rawPlaylistId =
          content?.title?.endpoint?.payload?.browseId ?? "";

        const playlistId = normalizePlaylistId(rawPlaylistId);

        const items = await Promise.all(
          itemsRaw.map(async (item) => {
            const videoId = item.video_id ?? item.author?.id ?? "";

            const thumbnailBase64 = await fetchImageAsBase64(videoId, "default");

            return {
              videoId,
              title: item.title?.text ?? item.author?.name ?? "",

              duration: item.duration?.text ?? "",
              published: item.published?.text ?? "",

              author: item.author?.name ?? metadata.title ?? "",

              viewCount:
                item.short_view_count?.text ??
                item.views?.text ??
                item.subscribers?.text ??
                "",

              thumbnail: thumbnailBase64,

              icon: item.author?.thumbnails?.[0]?.url ?? "",
            };
          })
        );

        return {
          title: content?.title?.text ?? "",
          playlistId,
          items,
        };
      })
    ),
  ]);

    // =========================
    // Upload Playlist ID
    // =========================
  let uploadsPlaylistId = "";

  if (channelId.startsWith("UC")) {
    uploadsPlaylistId = "UU" + channelId.slice(2);
  }

    // =========================
    // Response
    // =========================
  return {
    channelId,
    title: metadata.title ?? "",
    avatar: metadata.avatar?.[0]?.url ?? "",
    banner: header.content?.banner?.image?.[0]?.url ?? "",
    videoCount:
      header.content?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text
        ?.text ?? "",
    description: metadata.description ?? "",
    topVideo: {
      title: topVideoRaw.title?.text ?? "",
      videoId: topVideoId,
      viewCount: topVideoRaw.view_count?.text ?? "",
      published: topVideoRaw.published_time?.text ?? "",
      description: (topVideoRaw.description?.text ?? "").replace(/\n/g, "<br>"),
      thumbnail: topVideoThumbnail,
    },
    playlists,
    uploadsPlaylistId,
  };
}
