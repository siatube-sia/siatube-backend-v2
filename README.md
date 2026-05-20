# siatube-backend-v2

SiaTube backend API を npm パッケージとして利用するための Express app パッケージです。

このパッケージ自体はポートを開きません。各サービスの `Express app` を export するので、利用側で `listen()` するか、サーバーレス環境の handler に載せて使います。

## Install

```bash
npm install
```

## Usage

```bash
import { videoApp } from "siatube-backend-v2";

videoApp.listen(3000);
```

サービス単位で import することもできます。

```bash
import videoApp from "siatube-backend-v2/video";
import playlistApp from "siatube-backend-v2/playlist";
```

## Exported Apps

- `videoApp`
- `searchApp`
- `channelApp`
- `commentApp`
- `playlistApp`
- `suggestApp`

## Package Validation

```bash
npm run check
npm run pack:check
```
