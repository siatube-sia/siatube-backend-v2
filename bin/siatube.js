#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SERVICES = {
  video: { entry: "../video/app.js", port: 3000 },
  search: { entry: "../search/app.js", port: 3000 },
  channel: { entry: "../channel/app.js", port: 3000 },
  comment: { entry: "../comment/app.js", port: 3000 },
  playlist: { entry: "../playlist/app.js", port: 3011 },
  suggest: { entry: "../suggest/app.js", port: 3000 }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printHelp() {
  console.log(`Usage:
  siatube <service> [--port <number>]
  siatube --help

Services:
  video
  search
  channel
  comment
  playlist
  suggest

Examples:
  siatube video
  siatube playlist --port 4011`);
}

const args = process.argv.slice(2);
const firstArg = args[0];

if (!firstArg || firstArg === "--help" || firstArg === "-h") {
  printHelp();
  process.exit(firstArg ? 0 : 1);
}

const service = SERVICES[firstArg];

if (!service) {
  console.error(`Unknown service: ${firstArg}`);
  printHelp();
  process.exit(1);
}

let port = service.port;

for (let i = 1; i < args.length; i += 1) {
  if (args[i] === "--port") {
    const value = Number(args[i + 1]);
    if (!Number.isInteger(value) || value <= 0) {
      console.error("Invalid port value.");
      process.exit(1);
    }
    port = value;
    i += 1;
  }
}

const entryUrl = pathToFileURL(path.resolve(__dirname, service.entry)).href;
const module = await import(entryUrl);
const app = module.default;

app.listen(port, () => {
  console.log(`${firstArg} service listening on port ${port}`);
});
