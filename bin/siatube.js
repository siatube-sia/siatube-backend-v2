#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVICES = {
  video: { entry: "../video/index.js", port: 3000 },
  search: { entry: "../search/index.js", port: 3000 },
  channel: { entry: "../channel/index.js", port: 3000 },
  comment: { entry: "../comment/index.js", port: 3000 },
  playlist: { entry: "../playlist/index.js", port: 3011 },
  suggest: { entry: "../suggest/index.js", port: 3000 }
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

const child = spawn(process.execPath, [path.resolve(__dirname, service.entry)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(port)
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
