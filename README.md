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
  getPlaylist,
  getSuggestions,
} from "siatube-backend-v2";

const video = await getVideo("dQw4w9WgXcQ");
const search = await searchVideos({ q: "猫" });
const channel = await getChannel("UC_x5XG1OV2P6uYZ5pxFChwA");
const comments = await getComments({ videoId: "dQw4w9WgXcQ", sort: "top" });
const playlist = await getPlaylist("PLxxxxxxxx");
const suggestions = await getSuggestions("猫");
```

## header.txt

全サービス共通のヘッダーは `header.txt` から読み込みます。更新したい時はこのファイルだけ差し替えてください。

デフォルトの読込先:

```text
./header.txt
```

別パスを使う場合:

```bash
export SIATUBE_HEADER_PATH=/absolute/path/to/header.txt
```

フォーマットは「1行目がキー、2行目が値」の繰り返しです。今の `header.txt` と同じ形式をそのまま使います。

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

最低限、次の値が入っていると扱いやすいです。

- `user-agent`
- `sec-ch-ua`
- `sec-ch-ua-platform`
- `x-youtube-client-version`
- `x-goog-visitor-id`
- `cookie` が必要な場合は `cookie`

リクエストごとに必要な `content-length`、`content-encoding`、動画単位の `referer` だけはコード側で上書きしますが、それ以外の共通ヘッダーはすべて `header.txt` ベースです。

現在読み込まれている状態は次で確認できます。

```bash
npm run config:check
```

## Security

`header.txt` に Cookie や visitor id を入れる場合、そのファイルを npm パッケージや git に含めない運用にしてください。

## API Surface

- `getVideo(videoId, options?)`
- `searchVideos({ q?, token? })`
- `getChannel(channelId)`
- `getComments({ videoId, sort?, continuation? })`
- `getReplies({ videoId, continuation })`
- `getRawCommentData({ videoId, continuation })`
- `getPlaylist(playlistId, options?)`
- `getSuggestions(keyword)`
- `SiaTubeClient`

互換用途として Express app export も含まれています。

- `videoApp`
- `searchApp`
- `channelApp`
- `commentApp`
- `playlistApp`
- `suggestApp`

## Validation

```bash
npm run check
npm run config:check
npm run pack:check
```

詳細な使い方は `./USAGE.md` を参照してください。
