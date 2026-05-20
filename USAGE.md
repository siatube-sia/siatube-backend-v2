# siatube-backend-v2 Usage Guide

Node.js から関数やクラスを直接呼び出して使うためのライブラリです。

## 前提

- Node.js `18` 以上
- ESM 環境
- ネットワークから YouTube / Google へ到達できること

## インストール

```bash
npm install siatube-backend-v2
```

## 使い方の全体像

- 単発利用は関数 import
- 複数回利用は `SiaTubeClient`
- 既存システムには `Express app`

## 1. ルート import で関数を使う

```js
import {
  getVideo,
  searchVideos,
  getChannel,
  getComments,
  getReplies,
  getRawCommentData,
  getPlaylist,
  getSuggestions,
  SiaTubeClient,
} from "siatube-backend-v2";
```

### `getVideo(videoId, options?)`

動画詳細と関連動画を取得します。

```js
const result = await getVideo("dQw4w9WgXcQ");
```

`options`:

- `token`: 関連動画の続き取得用 continuation token
- `depth`: `"2"` を指定すると関連動画を追加読み込み
- `headerPath`, `headers`, `hl`, `gl`, `utcOffsetMinutes`

通常取得:

```js
const video = await getVideo("dQw4w9WgXcQ");
console.log(video.title);
console.log(video.author.name);
console.log(video["Related-videos"].relatedVideos.length);
```

関連動画の次ページ取得:

```js
const first = await getVideo("dQw4w9WgXcQ");
const token = first["Related-videos"].nextContinuationToken;

if (token) {
  const next = await getVideo("dQw4w9WgXcQ", { token });
  console.log(next["Related-videos"].relatedVideos);
}
```

追加深掘り:

```js
const video = await getVideo("dQw4w9WgXcQ", { depth: "2" });
```

### `searchVideos({ q?, token?, ...options })`

YouTube 検索結果を取得します。

```js
const result = await searchVideos({ q: "猫" });
```

次ページ取得:

```js
if (result.continuationToken) {
  const next = await searchVideos({ token: result.continuationToken });
  console.log(next.items);
}
```

### `getChannel(channelId, options?)`

チャンネル情報、トップ動画、プレイリスト一覧を取得します。

```js
const channel = await getChannel("UC_x5XG1OV2P6uYZ5pxFChwA");
console.log(channel.title);
console.log(channel.topVideo);
console.log(channel.playlists);
console.log(channel.uploadsPlaylistId);
```

### `getComments({ videoId, sort?, continuation?, ...options })`

動画の親コメントを取得します。

`sort`:

- `"top"`: 人気順
- `"new"`: 新しい順

```js
const comments = await getComments({
  videoId: "dQw4w9WgXcQ",
  sort: "top",
});
```

続き取得:

```js
if (comments.nextContinuation) {
  const next = await getComments({
    videoId: "dQw4w9WgXcQ",
    continuation: comments.nextContinuation,
  });
  console.log(next.comments);
}
```

### `getReplies({ videoId, continuation, ...options })`

コメントの返信を取得します。

```js
const replies = await getReplies({
  videoId: "dQw4w9WgXcQ",
  continuation: "REPLY_CONTINUATION_TOKEN",
});
```

### `getRawCommentData({ videoId, continuation, ...options })`

コメント API の生 JSON を取得します。

```js
const raw = await getRawCommentData({
  videoId: "dQw4w9WgXcQ",
  continuation: "ANY_CONTINUATION_TOKEN",
});
```

### `getPlaylist(playlistId, options?)`

再生リストを取得します。

```js
const playlist = await getPlaylist("PLxxxxxxxx");
console.log(playlist.items);
```

```js
const playlist = await getPlaylist("PLxxxxxxxx", {
  token: "CONTINUATION_TOKEN",
});
```

`UC...` を渡すと内部で `UU...` に変換されます。

```js
const uploads = await getPlaylist("UC_x5XG1OV2P6uYZ5pxFChwA");
```

複数プレイリストを結合するには `====` を使います。

```js
const merged = await getPlaylist("PLaaaa====PLbbbb");
```

`RD...` 系は `v` が必須です。

```js
const mix = await getPlaylist("RDMM", {
  v: "dQw4w9WgXcQ",
});
```

### `getSuggestions(keyword, options?)`

Google / YouTube サジェストを取得します。

```js
const suggestions = await getSuggestions("猫");
console.log(suggestions);
```

## 2. クラスで使う

```js
import { SiaTubeClient } from "siatube-backend-v2";

const client = new SiaTubeClient({
  hl: "ja",
  gl: "JP",
  headerPath: "/absolute/path/to/header.txt",
});
```

各メソッドは関数 API と 1 対 1 です。

```js
const video = await client.getVideo("dQw4w9WgXcQ");
const search = await client.searchVideos({ q: "猫" });
const channel = await client.getChannel("UC_x5XG1OV2P6uYZ5pxFChwA");
const comments = await client.getComments({ videoId: "dQw4w9WgXcQ" });
const replies = await client.getReplies({
  videoId: "dQw4w9WgXcQ",
  continuation: "TOKEN",
});
const raw = await client.getRawCommentData({
  videoId: "dQw4w9WgXcQ",
  continuation: "TOKEN",
});
const playlist = await client.getPlaylist("PLxxxxxxxx");
const suggestions = await client.getSuggestions("猫");
```

## 3. サブパス import で使う

個別 import は tree-shakeや責務分離をしたい場合に向いています。

```js
import { getVideo } from "siatube-backend-v2/video";
import { searchVideos } from "siatube-backend-v2/search";
import { getChannel } from "siatube-backend-v2/channel";
import { getComments, getReplies, getRawCommentData } from "siatube-backend-v2/comment";
import { getPlaylist } from "siatube-backend-v2/playlist";
import { getSuggestions } from "siatube-backend-v2/suggest";
import { SiaTubeClient } from "siatube-backend-v2/client";
```

## 4. Express app として使う

関数利用が基本ですが、必要なら既存の `Express app` も使えます。

```js
import express from "express";
import {
  videoApp,
  searchApp,
  channelApp,
  commentApp,
  playlistApp,
  suggestApp,
} from "siatube-backend-v2";

const app = express();

app.use("/video", videoApp);
app.use("/search", searchApp);
app.use("/channel", channelApp);
app.use("/comment", commentApp);
app.use("/playlist", playlistApp);
app.use("/suggest", suggestApp);

app.listen(3000);
```

## 5. header.txt の扱い

`header.txt` は次の優先度で読み込まれます。

1. `options.headerPath`
2. 環境変数 `SIATUBE_HEADER_PATH`
3. カレントディレクトリの `header.txt`

`header.txt` のフォーマットはキーと値を交互に並べる形式です。

```text
user-agent
Mozilla/5.0 ...
sec-ch-ua
"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"
```

`header.txt` に含めると扱いやすい値:

- `user-agent`
- `sec-ch-ua`
- `sec-ch-ua-platform`
- `x-youtube-client-version`
- `x-goog-visitor-id`
- `cookie`（必要な場合）

## 6. エラーハンドリング

バリデーションエラーや upstream エラーでは `Error` が throw されます。

```js
try {
  const video = await getVideo("");
} catch (error) {
  console.error(error.message);
  console.error(error.statusCode);
}
```

よくあるエラー:

- `getVideo("")`: `Missing video ID parameter`
- `searchVideos({})`: `query parameter 'q' or 'token' is required`
- `getChannel("")`: `channelId is required`
- `getComments({})`: `videoId is required`
- `getReplies({ videoId })`: `videoId and continuation are required`
- `getRawCommentData({ videoId })`: `videoId and continuation are required`
- `getPlaylist("RD...")` で `v` なし: `RD プレイリストには v パラメータが必要です`
- `getSuggestions("")`: `keyword is required`

## 7. 確認コマンド

```bash
npm run check
npm run pack:check
```

### `getSuggestions(keyword)`

Google / YouTube サジェストを取得します。

```js
const suggestions = await getSuggestions("猫");
console.log(suggestions);
```

## 2. クラスで使う

```js
import { SiaTubeClient } from "siatube-backend-v2";

const client = new SiaTubeClient();
```

各メソッドは関数 API と 1 対 1 です。

```js
const video = await client.getVideo("dQw4w9WgXcQ");
const search = await client.searchVideos({ q: "猫" });
const channel = await client.getChannel("UC_x5XG1OV2P6uYZ5pxFChwA");
const comments = await client.getComments({ videoId: "dQw4w9WgXcQ" });
const replies = await client.getReplies({
  videoId: "dQw4w9WgXcQ",
  continuation: "TOKEN",
});
const raw = await client.getRawCommentData({
  videoId: "dQw4w9WgXcQ",
  continuation: "TOKEN",
});
const playlist = await client.getPlaylist("PLxxxxxxxx");
const suggestions = await client.getSuggestions("猫");
```

## 3. サブパス import で使う

個別 import は tree-shake や責務分離をしたい場合に向いています。

```js
import { getVideo } from "siatube-backend-v2/video";
import { searchVideos } from "siatube-backend-v2/search";
import { getChannel } from "siatube-backend-v2/channel";
import { getComments, getReplies, getRawCommentData } from "siatube-backend-v2/comment";
import { getPlaylist } from "siatube-backend-v2/playlist";
import { getSuggestions } from "siatube-backend-v2/suggest";
import { SiaTubeClient } from "siatube-backend-v2/client";
```

## 4. Express app として使う

関数利用が基本ですが、必要なら既存の `Express app` も使えます。

```js
import express from "express";
import {
  videoApp,
  searchApp,
  channelApp,
  commentApp,
  playlistApp,
  suggestApp,
} from "siatube-backend-v2";

const app = express();

app.use("/video", videoApp);
app.use("/search", searchApp);
app.use("/channel", channelApp);
app.use("/comment", commentApp);
app.use("/playlist", playlistApp);
app.use("/suggest", suggestApp);

app.listen(3000);
```

## 5. エラーハンドリング

バリデーションエラーや upstream エラーでは `Error` が throw されます。

```js
try {
  const video = await getVideo("");
  console.log(video);
} catch (error) {
  console.error(error.message);
  console.error(error.statusCode);
}
```

代表例:

- `getVideo("")`: `Missing video ID parameter`
- `searchVideos({})`: `query parameter 'q' or 'token' is required`
- `getChannel("")`: `channelId is required`
- `getComments({})`: `videoId is required`
- `getReplies({ videoId })`: `videoId and continuation are required`
- `getRawCommentData({ videoId })`: `videoId and continuation are required`
- `getPlaylist("RD...")` で `v` なし: `RD プレイリストには v パラメータが必要です`
- `getSuggestions("")`: `keyword is required`

## 6. 戻り値の詳細

### `getVideo()` の戻り値

通常時:

- `id`: 動画 ID
- `title`: 動画タイトル
- `views`: 表示用の視聴回数文字列
- `relativeDate`: 相対投稿日
- `likes`: いいね数の表示文字列
- `thumbnail`: メインサムネイル URL
- `author.id`: 投稿チャンネル ID
- `author.name`: 表示上の投稿者名。コラボ動画では先頭コラボ相手名になる場合あり
- `author.subscribers`: 登録者数文字列。コラボ時は `"コラボレーター"`
- `author.thumbnail`: 投稿者アイコン URL
- `author.collaborator`: コラボ動画かどうかの真偽値
- `author.collaborators`: コラボ相手一覧
- `author.collaborators[].name`: コラボ相手名
- `author.collaborators[].subtitle`: 補足テキスト
- `author.collaborators[].channelId`: コラボ相手チャンネル ID
- `author.collaborators[].thumbnail`: コラボ相手アイコン URL
- `description.text`: 説明文の生テキスト
- `description.formatted`: 改行を `<br>` に変換した説明文
- `description.run0` から `description.run3`: 上から 4 行分の非空行
- `Related-videos.relatedCount`: 関連動画件数
- `Related-videos.nextContinuationToken`: 関連動画の続き取得用 token
- `Related-videos.relatedVideos`: 関連動画配列
- `Related-videos.relatedVideos[].type`: `"video"` または `"playlist"`
- `Related-videos.relatedVideos[].videoId`: 動画 ID
- `Related-videos.relatedVideos[].title`: タイトル
- `Related-videos.relatedVideos[].channelName`: チャンネル名
- `Related-videos.relatedVideos[].viewCountText`: 視聴回数文字列
- `Related-videos.relatedVideos[].publishedTimeText`: 投稿日文字列
- `Related-videos.relatedVideos[].duration`: 再生時間文字列
- `Related-videos.relatedVideos[].badge`: 現状は常に `null`
- `Related-videos.relatedVideos[].thumbnails`: サムネイル配列
- `Related-videos.relatedVideos[].thumbnail`: 先頭サムネイル URL
- `Related-videos.relatedVideos[].channelAvatar`: チャンネルアイコン URL
- `Related-videos.relatedVideos[].playlistId`: 再生リスト ID。通常動画なら `null`
- `Related-videos.relatedVideos[].overlayIcon`: 一部レスポンスでのみ存在
- `extended_stats.views_original`: 元の視聴回数表記
- `extended_stats.views_short`: 短縮視聴回数表記
- `extended_stats.date_simple`: 絶対日付文字列
- `extended_stats.date_relative_label`: アクセシビリティ向け相対日付
- `extended_badges`: チャンネルバッジの生配列
- `extended_superTitle`: スーパータイトル文字列
- `trackingParams`: YouTube 側のトラッキング用値

`options.token` を使って関連動画の続きだけ取得した時:

- `id`: 元動画 ID
- `title`: 空文字
- `Related-videos.relatedCount`: 返却件数
- `Related-videos.nextContinuationToken`: 次の continuation token
- `Related-videos.relatedVideos`: 続きの関連動画配列

取得失敗や動画未取得時:

- `id`: 対象動画 ID
- `unavailable`: `true`
- `reason`: 失敗理由
- `Related-videos.relatedVideos`: 空配列

### `searchVideos()` の戻り値

- `items`: 検索結果配列
- `continuationToken`: 次ページ取得用 token
- `estimatedResults`: 推定件数文字列
- `targetId`: YouTube 側 target ID

`items[]` は `type` により形が変わります。

共通系:

- `type`: `"video"`, `"shorts"`, `"playlist"`, `"channel"`

`type: "video"`:

- `videoId`: 動画 ID
- `title`: タイトル
- `thumbnails`: 最後の 1 枚に絞られたサムネイル配列
- `duration`: 再生時間
- `badges`: バッジ配列
- `viewCounts.full`: フル表記視聴回数
- `viewCounts.short`: 短縮表記視聴回数
- `viewCounts.raw`: 数字だけに正規化した視聴回数
- `publishedTime`: 投稿日
- `playlistId`: 再生リスト経由ならその ID
- `channelId`: チャンネル ID
- `channelName`: チャンネル名
- `channelIcons`: チャンネルアイコン配列
- `channelBadges`: チャンネルバッジ配列

`type: "shorts"`:

- `videoId`: Shorts 動画 ID
- `title`: タイトル
- `thumbnails`: サムネイル配列
- `duration`: 空文字
- `badges`: 空配列
- `viewCounts.full`: 通常は空文字
- `viewCounts.short`: 表示用視聴回数
- `viewCounts.raw`: 数値化した視聴回数
- `publishedTime`: 空文字
- `playlistId`: `null`
- `channelId`: 空文字
- `channelName`: 空文字
- `channelIcons`: 空配列
- `channelBadges`: 空配列

`type: "playlist"`:

- `videoId`: 代表動画 ID
- `title`: 再生リストタイトル
- `thumbnails`: サムネイル配列
- `duration`: 空文字
- `badges`: 通常 `["再生リスト"]`
- `viewCounts.full`: 動画本数文字列
- `viewCounts.short`: 動画本数文字列
- `viewCounts.raw`: 本数の数字部分
- `publishedTime`: 空文字
- `playlistId`: 再生リスト ID
- `channelId`: チャンネル ID
- `channelName`: チャンネル名
- `channelIcons`: 空配列
- `channelBadges`: 空配列

`type: "channel"`:

- `channelId`: チャンネル ID
- `channelName`: チャンネル名
- `handle`: `@...` のハンドル
- `channelIcons`: アイコン配列
- `description`: 説明文
- `subscriberCount`: 登録者数文字列
- `videoCount`: 動画本数文字列
- `badges`: バッジ配列

### `getChannel()` の戻り値

- `channelId`: チャンネル ID
- `title`: チャンネル名
- `avatar`: チャンネルアイコン URL
- `banner`: バナー画像 URL
- `videoCount`: 動画本数文字列
- `description`: チャンネル説明文
- `topVideo.title`: トップ動画タイトル
- `topVideo.videoId`: トップ動画 ID
- `topVideo.viewCount`: 視聴回数文字列
- `topVideo.published`: 投稿日文字列
- `topVideo.description`: 改行を `<br>` 化した説明文
- `topVideo.thumbnail`: Base64 形式のサムネイル
- `playlists`: セクションごとのプレイリスト配列
- `playlists[].title`: セクション名
- `playlists[].playlistId`: プレイリスト ID
- `playlists[].items`: セクション内項目配列
- `playlists[].items[].videoId`: 動画 ID
- `playlists[].items[].title`: タイトル
- `playlists[].items[].duration`: 再生時間
- `playlists[].items[].published`: 投稿日
- `playlists[].items[].author`: 投稿者名
- `playlists[].items[].viewCount`: 視聴回数や登録者数の文字列
- `playlists[].items[].thumbnail`: Base64 サムネイル
- `playlists[].items[].icon`: 投稿者アイコン URL
- `uploadsPlaylistId`: アップロード一覧用プレイリスト ID。`UC...` なら `UU...`

### `getComments()` の戻り値

- `success`: 常に `true`
- `mode`: 初回取得時は `"initial"`、続き取得時は `"continuation"`
- `videoId`: 動画 ID
- `sort`: 初回取得時のみ `"top"` または `"new"`
- `continuation`: 今回使った continuation token
- `nextContinuation`: 次ページ取得用 continuation token
- `fetchedAt`: ISO 8601 形式の取得日時
- `totalComments`: 今回返したコメント件数
- `comments`: コメント配列

`comments[]`:

- `entityKey`: YouTube 内部 entity key
- `commentId`: コメント ID
- `text`: 絵文字展開後の本文
- `publishedTime`: 投稿日文字列
- `replyLevel`: 親コメントは通常 `0`
- `author.channelId`: 投稿者チャンネル ID
- `author.name`: 投稿者名
- `author.avatar`: 投稿者アイコン URL
- `author.verified`: 認証済みか
- `author.creator`: 動画投稿者本人か
- `author.artist`: アーティスト判定か
- `likes.text`: 表示用いいね数
- `likes.count`: 数値化したいいね数
- `replies.text`: 表示用返信数
- `replies.count`: 数値化した返信数
- `toolbar.likeCountA11y`: アクセシビリティ用いいね文言
- `toolbar.replyCountA11y`: アクセシビリティ用返信文言
- `toolbar.stateKey`: YouTube 内部状態キー
- `replyContinuation`: このコメントの返信取得用 token

### `getReplies()` の戻り値

- `success`: 常に `true`
- `videoId`: 動画 ID
- `continuation`: 今回使った返信 continuation token
- `nextContinuation`: 返信の次ページ token
- `fetchedAt`: ISO 8601 形式の取得日時
- `totalReplies`: 今回返した返信件数
- `replies`: 返信配列

`replies[]` の各フィールドは `getComments().comments[]` と同じです。違いは `replyLevel` が通常 `1` になる点です。

### `getRawCommentData()` の戻り値

- YouTube InnerTube `/youtubei/v1/next` の生 JSON
- 形式は固定ではなく、YouTube 側変更で変動します
- デバッグ、追加解析、独自パーサ実装用です

### `getPlaylist()` の戻り値

通常プレイリストや複数プレイリスト結合時:

- `playlistId`: 再生リスト ID。複数時はカンマ連結
- `title`: プレイリストタイトル。複数結合時は空文字
- `author`: 作成者名。複数結合時は `"Multiple Channels"`
- `description`: 説明文。複数結合時は `"Merged Playlist"`
- `responseItems`: 今回返した件数文字列
- `totalItems`: 件数表示文字列
- `url`: プレイリスト URL。複数結合時は空文字
- `lastUpdated`: 更新日文字列。複数結合時もしくは取得不能時は ISO 日時や空値ではなく実装依存
- `views`: 再生回数文字列。なければ `null`
- `items`: 動画配列
- `nextToken`: 次ページ continuation token。複数結合時は `null`

通常プレイリストの `items[]`:

- `videoId`: 動画 ID
- `title`: タイトル
- `duration`: 再生時間
- `channelId`: チャンネル ID
- `author`: 投稿者名
- `views`: 視聴回数文字列
- `published`: 投稿日文字列
- `thumbnail`: Base64 サムネイル

RD ミックスプレイリスト時:

- `playlistId`: RD リスト ID
- `title`: リストタイトル
- `author`: 通常 `"YouTube"`
- `description`: 説明文。無い場合は固定文
- `totalItems`: 件数文字列
- `views`: `null`
- `url`: 元 URL
- `thumbnail`: `null`
- `lastUpdated`: `null`
- `items`: 動画配列
- `nextToken`: `null`

RD ミックスの `items[]`:

- `videoId`: 動画 ID
- `title`: タイトル
- `duration`: 再生時間
- `author`: 投稿者名
- `channelId`: 現状 `null`
- `views`: 現状 `null`
- `published`: 現状 `null`
- `thumbnail`: Base64 サムネイル

### `getSuggestions()` の戻り値

- `string[]`: サジェスト候補の文字列配列
- 例: `["猫", "猫動画", "猫 癒し"]`

## 7. 実運用時の注意

- 取得元は外部サービスなので、レスポンス構造変更の影響を受けます
- 短時間に大量リクエストすると失敗率が上がる可能性があります
- YouTube / Google 側の制限や地域差で結果が変わることがあります
- 一部レスポンスには `base64` サムネイルや continuation token が含まれます

## 8. 確認コマンド

```bash
npm run check
npm run pack:check
```
