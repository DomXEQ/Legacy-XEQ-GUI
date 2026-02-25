/**
 * This file is used specifically and only for development.
 * There shouldn't be any need to modify this file, but it can be
 * used to extend your development environment.
 */

// Remove NODE_OPTIONS before Electron starts
if (
  process.env.NODE_OPTIONS &&
  process.env.NODE_OPTIONS.includes("--openssl-legacy-provider")
) {
  delete process.env.NODE_OPTIONS;
}

// Require `main` process to boot app
require("./electron-main");
