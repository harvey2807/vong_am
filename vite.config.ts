import { defineConfig } from "vite";

// base "./" để bản build chạy được khi upload lên itch.io hoặc mở qua Electron/Tauri.
export default defineConfig({
  base: "./",
  build: { target: "es2022", chunkSizeWarningLimit: 6000 },
});
