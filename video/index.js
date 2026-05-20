import {
  createVideoClientContext,
  createVideoRequestHeaders,
} from "../shared/youtube-request-config.js";

const YOUTUBE_BASE_URL = "https://www.youtube.com/watch?v=";
const YOUTUBE_API_URL = "https://www.youtube.com/youtubei/v1/next";
const INNERTUBE_API_KEY = "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw";
const getTextFromRuns = (runs) => {
  return runs?.map((run) => run.text).join("") || null;
};

const safeGet = (fn) => {
  try {
    return fn();
  } catch (e) {
    return null;
  }
};

const parseRawItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return [];

  const flattenedItems = rawItems.reduce((acc, item) => {
    if (item?.itemSectionRenderer?.contents) {
      return acc.concat(item.itemSectionRenderer.contents);
    }
    acc.push(item);
    return acc;
  }, []);

  return flattenedItems
    .map((item) => {
      if (item?.lockupViewModel) {
        return parseVideoLockup(item);
      }
      if (item?.compactVideoRenderer) {
        const cvr = item.compactVideoRenderer;
        return {
          type: "compact_video",
          videoId: cvr.videoId,
          title: getTextFromRuns(cvr.title?.runs),
          thumbnails: { static: cvr.thumbnail?.thumbnails },
          badge: {
            text: cvr.lengthText?.simpleText,
            icon: null,
          },
          playlistId: cvr.navigationEndpoint?.watchEndpoint?.playlistId || null,
          channel: {
            name: getTextFromRuns(cvr.shortBylineText?.runs),
            id: cvr.shortBylineText?.runs?.[0]?.navigationEndpoint
              ?.browseEndpoint?.browseId,
          },
          stats: {
            views: getTextFromRuns(cvr.viewCountText?.runs),
            publishedTime: getTextFromRuns(cvr.publishedTimeText?.runs),
          },
        };
      }
      if (item?.continuationItemRenderer) {
        const cir = item.continuationItemRenderer;
        const endpoint = cir.continuationEndpoint;
        const webCmd = endpoint?.commandMetadata?.webCommandMetadata;
        const contCmd = endpoint?.continuationCommand;

        return {
          type: "continuation",
          trigger: cir.trigger,
          sendPost: webCmd?.sendPost,
          apiUrl: webCmd?.apiUrl,
          token: contCmd?.token,
          request: contCmd?.request,
        };
      }
      return null;
    })
    .filter(Boolean);
};

const parseVideoLockup = (item) => {
  const lockup = item?.lockupViewModel;
  if (!lockup) return null;

  const metadataVM = lockup.metadata?.lockupMetadataViewModel;
  const contentMetadata = metadataVM?.metadata?.contentMetadataViewModel;
  const title = metadataVM?.title?.content;
  const videoId = lockup.contentId;

  const overlays =
    lockup.contentImage?.thumbnailViewModel?.overlays ||
    lockup.contentImage?.overlays ||
    [];

  const thumbnailData =
    lockup.contentImage?.thumbnailViewModel?.image?.sources ||
    lockup.contentImage?.image?.sources ||
    [];

  const animatedThumbnail = overlays.find(
    (o) => o.animatedThumbnailOverlayViewModel
  )?.animatedThumbnailOverlayViewModel?.thumbnail?.sources?.[0]?.url;

  const metadataRows = contentMetadata?.metadataRows || [];
  const channelRow = metadataRows[0]?.metadataParts?.[0];
  const channelName = channelRow?.text?.content;
  const channelBadges =
    channelRow?.attachmentRuns?.map((run) => ({
      icon: run.element?.type?.imageType?.image?.sources?.[0]?.clientResource
        ?.imageName,
    })) || [];

  const avatarData =
    metadataVM?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel;
  const channelAvatar = avatarData?.image?.sources?.[0]?.url;
  const channelUrl =
    metadataVM?.image?.decoratedAvatarViewModel?.rendererContext?.commandContext
      ?.onTap?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl;

  const statsRow = metadataRows[1]?.metadataParts || [];
  const views = statsRow[0]?.text?.content;
  const publishedTime = statsRow[1]?.text?.content;

  const badgeViewModel = overlays.find((o) => o.thumbnailOverlayBadgeViewModel)
    ?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]
    ?.thumbnailBadgeViewModel;

  const badgeText = badgeViewModel?.text;
  const badgeIcon =
    badgeViewModel?.icon?.sources?.[0]?.clientResource?.imageName;

  const playlistId =
    lockup.rendererContext?.commandContext?.onTap?.innertubeCommand
      ?.watchEndpoint?.playlistId;

  return {
    type: "video",
    videoId,
    title,
    thumbnails: {
      static: thumbnailData,
      animated: animatedThumbnail || null,
    },
    badge: {
      text: badgeText,
      icon: badgeIcon || null,
    },
    playlistId: playlistId || null,
    channel: {
      name: channelName,
      url: channelUrl,
      avatar: channelAvatar,
      badges: channelBadges,
      label: metadataVM?.image?.decoratedAvatarViewModel?.a11yLabel,
    },
    stats: {
      views,
      publishedTime,
      fullText: contentMetadata?.delimiter,
    },
    trackingParams:
      lockup.rendererContext?.loggingContext?.loggingDirectives?.trackingParams,
  };
};

const fetchContinuationData = async (token, requestOptions = {}) => {
  if (!token) return null;

  const targetApiUrl = `${YOUTUBE_API_URL}?key=${INNERTUBE_API_KEY}`;

  try {
    const apiResponse = await fetch(targetApiUrl, {
      method: "POST",
      headers: {
        ...createVideoRequestHeaders(requestOptions),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        context: createVideoClientContext(requestOptions),
        continuation: token,
      }),
    });

    if (!apiResponse.ok) return null;

    const json = await apiResponse.json();
    const endpoint = json.onResponseReceivedEndpoints?.[0];
    const continuationItems =
      endpoint?.appendContinuationItemsAction?.continuationItems;

    if (!continuationItems) return null;

    return {
      targetId: endpoint?.appendContinuationItemsAction?.targetId,
      items: parseRawItems(continuationItems),
    };
  } catch {
    return null;
  }
};
export async function getVideo(rawVideoId, options = {}) {
  try {
    rawVideoId = decodeURIComponent(rawVideoId);
  } catch {}

  let videoId = rawVideoId;
  let continuationToken = options.token;
  let depth = options.depth ?? null;
  const { token: _token, depth: _depth, ...requestOptions } = options;

  const checkParam = (key, val) => {
    if (key === "token") continuationToken = val;
    if (key === "depth") depth = val;
  };

  if (videoId.includes("====")) {
    const parts = videoId.split("====");
    videoId = parts[0];
    const paramsString = parts[1];
    if (paramsString) {
      const pairs = paramsString.split("==p==");
      pairs.forEach((pair) => {
        const [key, val] = pair.split("==i==");
        checkParam(key, val);
      });
    }
  } else if (videoId.includes("&")) {
    const parts = videoId.split("&");
    videoId = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes("==i==")) {
        const [key, val] = part.split("==i==");
        checkParam(key, val);
      } else if (part.includes("=")) {
        const [key, val] = part.split("=");
        checkParam(key, val);
      }
    }
  } else if (videoId.includes("==p==")) {
    const parts = videoId.split("==p==");
    videoId = parts[0];
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].includes("==i==")) {
        const [key, val] = parts[i].split("==i==");
        checkParam(key, val);
      }
    }
  }

  if (!videoId) {
    const error = new Error("Missing video ID parameter");
    error.statusCode = 400;
    throw error;
  }

  if (continuationToken) {
    const result = await fetchContinuationData(
      continuationToken,
      requestOptions
    );
    const relatedVideosCompat =
      result?.items
        ?.map((item) => {
          if (item.type === "continuation") return null;

          let rvId = item.videoId;
          if (rvId && rvId.length !== 11 && rvId.startsWith("RD")) {
            rvId = videoId;
          }

          return {
            type: item.playlistId ? "playlist" : "video",
            videoId: rvId,
            title: item.title,
            channelName: item.channel?.name || "",
            viewCountText: item.stats?.views || "",
            publishedTimeText: item.stats?.publishedTime || "",
            duration: item.badge?.text || null,
            badge: null,
            thumbnails: item.thumbnails?.static || [],
            thumbnail: item.thumbnails?.static?.[0]?.url || null,
            channelAvatar: item.channel?.avatar || "",
            playlistId: item.playlistId,
          };
        })
        .filter(Boolean) || [];

    const nextToken =
      result?.items?.find((i) => i.type === "continuation")?.token || null;

    return {
      id: videoId,
      title: "",
      "Related-videos": {
        relatedCount: relatedVideosCompat.length,
        nextContinuationToken: nextToken,
        relatedVideos: relatedVideosCompat,
      },
    };
  }

  const targetUrl = `${YOUTUBE_BASE_URL}${videoId}`;
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: createVideoRequestHeaders(requestOptions),
  });

  if (!response.ok) {
    return {
      id: videoId,
      unavailable: true,
      reason: `Service unavailable (Status ${response.status})`,
      "Related-videos": { relatedVideos: [] },
    };
  }

  const html = await response.text();
  const regex = /var ytInitialData\s*=\s*({.*?});/s;
  const match = html.match(regex);

  if (!match || !match[1]) {
    return {
      id: videoId,
      unavailable: true,
      reason: "Failed to extract data",
      "Related-videos": { relatedVideos: [] },
    };
  }

  try {
    const rawData = JSON.parse(match[1]);
      const twoColumnResults =
        rawData.contents?.twoColumnWatchNextResults?.results?.results;
      const secondarySection =
        rawData.contents?.twoColumnWatchNextResults?.secondaryResults
          ?.secondaryResults;

      let relatedVideos = [];
      let nextContinuationToken = null;

      if (secondarySection) {
        const rawResults = secondarySection.results;
        let parsedResults = parseRawItems(rawResults);

        if (depth == "2") {
          const continuationItem = parsedResults.find(
            (item) => item.type === "continuation"
          );
          if (continuationItem && continuationItem.token) {
            const extraData = await fetchContinuationData(
              continuationItem.token,
              requestOptions
            );
            if (extraData && extraData.items.length > 0) {
              const resultsWithoutContinuation = parsedResults.filter(
                (item) => item.type !== "continuation"
              );
              parsedResults = [
                ...resultsWithoutContinuation,
                ...extraData.items,
              ];
            }
          }
        }

        relatedVideos = parsedResults
          .map((item) => {
            if (item.type === "continuation") {
              nextContinuationToken = item.token;
              return null;
            }

            let rvId = item.videoId;
            if (rvId && rvId.length !== 11 && rvId.startsWith("RD")) {
              rvId = videoId;
            }

            return {
              type: item.playlistId ? "playlist" : "video",
              videoId: rvId,
              title: item.title,
              channelName: item.channel?.name || "",
              viewCountText: item.stats?.views || "",
              publishedTimeText: item.stats?.publishedTime || "",
              duration: item.badge?.text || null,
              badge: null,
              thumbnails: item.thumbnails?.static || [],
              thumbnail: item.thumbnails?.static?.[0]?.url || null,
              channelAvatar: item.channel?.avatar || "",
              playlistId: item.playlistId,
              overlayIcon: item.badge?.icon,
            };
          })
          .filter(Boolean);
      }

      const primaryInfoRenderer = twoColumnResults?.contents?.find(
        (c) => c.videoPrimaryInfoRenderer
      )?.videoPrimaryInfoRenderer;

      const secondaryInfoRenderer = twoColumnResults?.contents?.find(
        (c) => c.videoSecondaryInfoRenderer
      )?.videoSecondaryInfoRenderer;

    if (!primaryInfoRenderer || !secondaryInfoRenderer) {
      return {
        id: videoId,
        unavailable: true,
        reason: "Video details not found",
        "Related-videos": { relatedVideos: [] },
      };
    }

      const title = getTextFromRuns(primaryInfoRenderer?.title?.runs) || "";
      const shortViews =
        primaryInfoRenderer?.viewCount?.videoViewCountRenderer?.shortViewCount
          ?.simpleText || "";
      const originalViews =
        primaryInfoRenderer?.viewCount?.videoViewCountRenderer?.viewCount
          ?.simpleText || "";
      const viewCountStr = shortViews || originalViews || "";

      const relativeDate =
        primaryInfoRenderer?.relativeDateText?.simpleText || "";
      const fullDate = primaryInfoRenderer?.dateText?.simpleText || "";

      const likeButtonTitle =
        safeGet(() => {
          const topLevelButtons =
            primaryInfoRenderer?.videoActions?.menuRenderer?.topLevelButtons;
          return topLevelButtons?.find(
            (b) => b.segmentedLikeDislikeButtonViewModel
          )?.segmentedLikeDislikeButtonViewModel?.likeButtonViewModel
            ?.likeButtonViewModel?.toggleButtonViewModel?.toggleButtonViewModel
            ?.defaultButtonViewModel?.buttonViewModel?.title;
        }) || "";

      const ownerRenderer = secondaryInfoRenderer?.owner?.videoOwnerRenderer;
      const channelId =
        ownerRenderer?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint
          ?.browseId || "";
      const channelName = getTextFromRuns(ownerRenderer?.title?.runs) || "";
      const subCount = ownerRenderer?.subscriberCountText?.simpleText || "";
      const authorThumb = ownerRenderer?.thumbnail?.thumbnails?.[0]?.url || "";

      const collabHeadline = safeGet(
        () =>
          ownerRenderer?.navigationEndpoint?.showDialogCommand
            ?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.header
            ?.dialogHeaderViewModel?.headline?.content
      );
      const collaboratorsList =
        safeGet(() => {
          const rawItems =
            ownerRenderer?.navigationEndpoint?.showDialogCommand
              ?.panelLoadingStrategy?.inlineContent?.dialogViewModel
              ?.customContent?.listViewModel?.listItems;
          return Array.isArray(rawItems)
            ? rawItems.map((item) => ({
                name: item?.listItemViewModel?.title?.content || "",
                subtitle: item?.listItemViewModel?.subtitle?.content || "",
                channelId:
                  item?.listItemViewModel?.leadingAccessory?.avatarViewModel
                    ?.endpoint?.innertubeCommand?.browseEndpoint?.browseId ||
                  "",
                thumbnail:
                  item?.listItemViewModel?.leadingAccessory?.avatarViewModel
                    ?.image?.sources?.[0]?.url || "",
              }))
            : [];
        }) || [];

      const descRaw =
        secondaryInfoRenderer?.attributedDescription?.content || "";

      const nonEmptyLines = descRaw
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

      const descriptionObj = {
        text: descRaw,
        formatted: descRaw.replace(/\n/g, "<br>"),
        run0: nonEmptyLines[0] || "",
        run1: nonEmptyLines[1] || "",
        run2: nonEmptyLines[2] || "",
        run3: nonEmptyLines[3] || "",
      };

      const mainThumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const mainThumbnail = mainThumbnailUrl;

      const isCollaborator = collaboratorsList.length > 0 || !!collabHeadline;

      let displayAuthorName = channelName;
      let displayAuthorThumbnail = authorThumb;
      let displayAuthorSubscribers = subCount;

      if (isCollaborator && collaboratorsList.length > 0) {
        displayAuthorName = collaboratorsList[0].name;
        displayAuthorThumbnail = collaboratorsList[0].thumbnail;
        displayAuthorSubscribers = "コラボレーター";
      }

    return {
      id: videoId,
      title: title,
      views: viewCountStr,
      relativeDate: relativeDate,
      likes: likeButtonTitle,
      thumbnail: mainThumbnail,
      author: {
        id: channelId,
        name: displayAuthorName,
        subscribers: displayAuthorSubscribers,
        thumbnail: displayAuthorThumbnail,
        collaborator: isCollaborator,
        collaborators: collaboratorsList,
      },
      description: descriptionObj,
      "Related-videos": {
        relatedCount: relatedVideos.length,
        nextContinuationToken: nextContinuationToken,
        relatedVideos: relatedVideos,
      },

      extended_stats: {
        views_original: originalViews,
        views_short: shortViews,
        date_simple: fullDate,
        date_relative_label:
          primaryInfoRenderer?.relativeDateText?.accessibility
            ?.accessibilityData?.label || "",
      },
      extended_badges: ownerRenderer?.badges || [],
      extended_superTitle:
        getTextFromRuns(primaryInfoRenderer?.superTitleLink?.runs) || "",
      trackingParams: twoColumnResults?.trackingParams || null,
    };
  } catch (parseError) {
    parseError.statusCode = 500;
    throw parseError;
  }
}
