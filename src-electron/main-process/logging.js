// Logging setup for the main process only.
// With contextIsolation: true, renderer logging goes through the gateway WebSocket.
// This file is kept for backward compatibility but is now a no-op in preload context.
// Main process logging is handled by bunyan in backend.js.
