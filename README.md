# siatube-backend-v2

YouTube の各種データを Node.js から取得するための ESM ライブラリです。

取得対象:

- 動画詳細
- 検索結果
- チャンネル情報
- コメント / 返信
- 再生リスト
- サジェスト

## Install

```bash
npm install siatube-backend-v2
```

## Requirements

- Node.js `18` 以上
- ESM 環境
- YouTube / Google に到達できるネットワーク環境

## Basic Usage

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

const video = await getVideo("dQw4w9WgXcQ");
const search = await searchVideos({ q: "猫" });
const channel = await getChannel("UC_x5XG1OV2P6uYZ5pxFChwA");
const comments = await getComments({ videoId: "dQw4w9WgXcQ", sort: "top" });
const replies = await getReplies({ videoId: "dQw4w9WgXcQ", continuation: "..." });
const rawCommentData = await getRawCommentData({ videoId: "dQw4w9WgXcQ" });
const playlist = await getPlaylist("PLxxxxxxxx");
const suggestions = await getSuggestions("猫");
```

## SiaTubeClient

共通設定をまとめて使いたい場合は `SiaTubeClient` を使います。

```js
import { SiaTubeClient } from "siatube-backend-v2";

const client = new SiaTubeClient({
  hl: "ja",
  gl: "JP",
  headerPath: "/absolute/path/to/header.txt",
});

const video = await client.getVideo("dQw4w9WgXcQ");
const search = await client.searchVideos({ q: "猫" });
```

## header.txt の扱い

`header.txt` は、次の優先順で読み込まれます。

1. `options.headerPath`
2. 環境変数 `SIATUBE_HEADER_PATH`
3. カレントディレクトリの `header.txt`

そのため、プロジェクトルートに `header.txt` を置いておけば明示指定なしで自動的に読み込まれます。

### 例: 環境変数で指定する場合

```bash
export SIATUBE_HEADER_PATH=/absolute/path/to/header.txt
```

### 例: API 呼び出しごとに指定する場合

```js
await getVideo("dQw4w9WgXcQ", {
  headerPath: "/absolute/path/to/header.txt",
});
```

### `header.txt` のフォーマット

`header.txt` はキーと値を交互に並べます。

```text
user-agent
Mozilla/5.0 ...
sec-ch-ua
"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"
x-youtube-client-version
2.20260519.01.00
x-goog-visitor-id
Cg...
```

`header.txt` に書いたヘッダーは `createBaseHeaders()` で読み込まれ、`options.headers` より前にマージされます。

リクエストごとに必要な `content-length`、`content-encoding`、`referer` などは API 側で上書きされます。

### 推奨ヘッダー

- `user-agent`
- `sec-ch-ua`
- `sec-ch-ua-platform`
- `x-youtube-client-version`
- `x-goog-visitor-id`
- `cookie`（必要な場合）

## API Surface

- `getVideo(videoId, options?)`
- `searchVideos(params)`
- `getChannel(channelId, options?)`
- `getComments(params)`
- `getReplies(params)`
- `getRawCommentData(params)`
- `getPlaylist(playlistId, options?)`
- `getSuggestions(keyword, options?)`
- `SiaTubeClient`

共通 `options`:

- `headerPath`
- `headers`
- `hl`
- `gl`
- `utcOffsetMinutes`

## Express App

各機能は Express アプリとしてもエクスポートされています。

```js
import videoApp from "siatube-backend-v2/video/app";
import searchApp from "siatube-backend-v2/search/app";
```

## Validation

```bash
npm run check
npm run config:check
npm run pack:check
```

詳細な使い方は `./USAGE.md` を参照してください。
