// Kiểm thử khói (smoke test): mở từng chương, vào chơi, giải câu đố Đêm 1, mở sổ tay, đổi phím — và không được có lỗi
// console / request hỏng nào. Chạy: `npm run smoke`.
//
// Dùng Chrome cài sẵn trên máy (playwright-core không tải trình duyệt). Đặt CHROME_PATH nếu Chrome nằm chỗ khác.
// Chuột bị khóa (pointer lock) không có trong chế độ headless nên được giả lập; game chạy ở chế độ dev để có `window.game`.
import { createServer } from "vite";
import { chromium } from "playwright-core";

const CHAPTERS = [0, 1, 2, 2.5, 3, 3.5, 4];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const FAKE_POINTER_LOCK = `(() => {
  let locked = null;
  Object.defineProperty(Document.prototype, "pointerLockElement", { get() { return locked; }, configurable: true });
  Element.prototype.requestPointerLock = function () { locked = this; setTimeout(() => document.dispatchEvent(new Event("pointerlockchange"))); return Promise.resolve(); };
  Document.prototype.exitPointerLock = function () { locked = null; setTimeout(() => document.dispatchEvent(new Event("pointerlockchange"))); };
})();`;

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: "warn" });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" }),
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(FAKE_POINTER_LOCK);
const page = await context.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));

const g = (fn, arg) => page.evaluate(fn, arg);
async function enter(n) {
  await page.evaluate((n) => sessionStorage.setItem("vongam.chapter", String(n)), n);
  await page.goto(`${base}?dem=${n}`);
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 90000 });
  await page.waitForSelector("#chapter:not(.hidden)", { timeout: 15000 });
  await page.evaluate(() => document.getElementById("chapter-go").click());
  await page.waitForFunction(() => window.game.state === "playing", null, { timeout: 15000 });
}
async function aim(pos, at) {
  await g(([p, a]) => {
    const cam = window.game.player.camera;
    cam.position.copyFromFloats(p[0], 1.6, p[1]);
    cam.setTarget(cam.position.clone().copyFromFloats(a[0], a[1], a[2]));
  }, [pos, at]);
  await sleep(300);
}

try {
  await page.goto(base);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("vongam.warned", "1");
  });
  // Lần mở đầu trên máy mới, Vite có thể tối ưu lại dependency và tải lại trang (504 "Outdated Optimize Dep") —
  // không phải lỗi của game. Chờ ổn định rồi mới bắt đầu đếm lỗi.
  await page.reload();
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 120000 });
  await sleep(1000);
  errors.length = 0;

  // 1. Mọi chương tải được và vào chơi được.
  for (const n of CHAPTERS) {
    const before = errors.length;
    try {
      await enter(n);
      await sleep(2500);
      check(`chapter ${n} loads and plays`, errors.length === before, errors.slice(before).join(" | "));
    } catch (e) {
      check(`chapter ${n} loads and plays`, false, String(e).split("\n")[0]);
    }
  }

  // 2. Đêm 1: câu đố hộp bánh quy.
  await enter(1);
  await g(() => window.game.director.set("read_rules"));
  await aim([4.4, -2.2], [5.45, 0.95, -2.2]);
  // Khung hình đầu sau khi vào chơi còn đang biên dịch shader: chờ gợi ý tương tác hiện ra thay vì chờ cứng.
  await page.waitForFunction(() => document.querySelector("#prompt .label").textContent === "Mở khóa số", null, { timeout: 30000 });
  await page.keyboard.press("KeyE");
  await sleep(300);
  check("lock opens from the cookie tin", await g(() => window.game.hud.lockOpen));
  for (const k of ["Digit1", "Digit5", "Digit0", "Digit7", "KeyE"]) await page.keyboard.press(k);
  await sleep(200);
  const wrong = await g(() => document.getElementById("lock-msg").textContent);
  check("wrong code 1507 gets specific feedback", /Rằm/.test(wrong ?? ""), wrong ?? "");
  for (const k of ["Digit1", "Digit6", "Digit0", "Digit7", "KeyE"]) await page.keyboard.press(k);
  await sleep(1400);
  check("code 1607 opens the tin and gives the key", await g(() => window.game.director.has("has_key") && !window.game.hud.lockOpen));

  // 3. Sổ tay: có việc cần làm, có tin nhắn.
  await page.keyboard.press("KeyJ");
  await sleep(200);
  const obj = await g(() => document.querySelector(".j-objective")?.textContent ?? "");
  check("journal opens with the current objective", (await g(() => window.game.hud.journalOpen)) && obj.length > 0, obj);
  await page.keyboard.press("KeyD");
  await page.keyboard.press("KeyD");
  await sleep(200);
  const bubbles = await g(() => document.querySelectorAll(".bubble").length);
  check("phone tab shows the family chat", bubbles >= 8, `${bubbles} messages`);
  await page.keyboard.press("KeyJ");

  // 4. Đổi phím tương tác sang R: gợi ý hiện R và phím R dùng được.
  await g(() => document.querySelector("#keybind-list .bind")?.closest("#panel-settings")?.classList.remove("hidden"));
  const interactBtn = await page.$$("#keybind-list .bind");
  await interactBtn[5].click(); // forward, back, left, right, sprint, interact
  await page.keyboard.press("KeyR");
  await g(() => document.getElementById("panel-settings").classList.add("hidden"));
  await aim([-5.4, 2.6], [-6.32, 1.11, 2.6]);
  // Đợi khung hình kế cập nhật lời nhắc (SwiftShader chậm: 300 ms đôi khi chưa đủ một khung).
  await page.waitForFunction(() => document.querySelector("#prompt .key")?.textContent === "R", null, { timeout: 3000 }).catch(() => {});
  const promptKey = await g(() => document.querySelector("#prompt .key")?.textContent);
  await page.keyboard.press("KeyR");
  await sleep(300);
  check("rebinding interact to R works", promptKey === "R" && (await g(() => window.game.hud.readerOpen)), `prompt key ${promptKey}`);
  await page.keyboard.press("KeyR");
  await g(() => localStorage.removeItem("vongam.keys"));

  // 5. Tầng gác: leo cầu thang trong tiệm Phúc Ký bằng phím thật; Người Gõ Cửa ở ngay bên dưới không bắt xuyên trần.
  await enter(1);
  await aim([-6.42, -5.8], [-6.42, 2.6, -1.5]);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.game.player.floor === 1, null, { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  await page.keyboard.up("KeyW");
  check("stairs lead up to the attic", (await g(() => window.game.player.floor)) === 1);
  await g(() => {
    const cam = window.game.player.camera;
    cam.position.copyFromFloats(-3, 4.8, 2.6);
    window.game.director.set("knocking");
    const k = window.game.knocker;
    k.command("appear", "altar");
    k.root.position.set(-3, 0, 2.6);
    k.state = "patrol";
  });
  await sleep(2500);
  check("knocker cannot catch through the ceiling", (await g(() => window.game.knocker.state)) !== "caught");

  check("no console errors overall", errors.length === 0, errors.slice(0, 5).join(" | "));
} finally {
  await browser.close();
  await server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
