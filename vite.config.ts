import { defineConfig } from "vite";

// base "./" để bản build chạy được khi upload lên itch.io hoặc mở qua Electron/Tauri.
// Babylon được nhập theo đường dẫn sâu qua src/babylon.ts nên gói chính ~1,7 MB (~415 KB gzip).
// Ngưỡng cảnh báo đặt sát con số đó: lỡ tay nhập thẳng "@babylonjs/core" (kéo cả engine ~7 MB) là build kêu ngay.
export default defineConfig({
  base: "./",
  build: { target: "es2022", chunkSizeWarningLimit: 2000 },
});
