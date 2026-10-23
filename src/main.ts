import { Logger } from "@babylonjs/core";
import { Game } from "./core/Game";

// Hiện lỗi ngay trên màn hình để người chơi thử chỉ cần chụp ảnh gửi lại, không phải mở console.
const errorBox = document.getElementById("errors")!;
const report = (msg: string) => {
  errorBox.classList.remove("hidden");
  errorBox.textContent = `${errorBox.textContent}${msg.slice(0, 400)}\n`.split("\n").slice(-8).join("\n");
};
window.addEventListener("error", (e) => report(`Lỗi: ${e.message} (${e.filename?.split("/").pop()}:${e.lineno})`));
window.addEventListener("unhandledrejection", (e) => report(`Lỗi: ${String(e.reason)}`));
Logger.OnNewCacheEntry = (entry) => {
  if (entry.includes("BJS") && /error/i.test(entry)) report(entry.replace(/<[^>]+>/g, ""));
};

const canvas = document.getElementById("game") as HTMLCanvasElement;
const game = new Game(canvas);

// Tiện cho việc debug trong console: game.director.set("has_key") ...
if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
