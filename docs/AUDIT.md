# VONG ÂM — Repository audit (Phase A)

Audit date: 2026-10-23. Baseline commit: `1591de2` ("Add effigy sprite definitions").

## 1. What exists

| Area | State | Notes |
| --- | --- | --- |
| Stack | Babylon.js 9 + TypeScript 7 + Vite 8, no UI framework | DOM/CSS HUD over a WebGL canvas. GitHub Pages deploy workflow. |
| Content | 6 chapters: Prologue (alley), Nights 1–2, Dusk (rice fields), Nights 3–4 | ~45–70 min total. Each chapter is a page reload (`?dem=N`). |
| Story | Strong, coherent. Surface story + hidden story told by 6 optional relics; 4 endings incl. a true ending. | `docs/STORY.md`. The twist (the player may be the paper stand-in) is foreshadowed by relics. |
| Event director | Data-driven (`src/data/night*.json`): flag conditions, delays, look/visibility/proximity checks, action sequences. | Clean separation: `HorrorDirector` knows nothing about Babylon. |
| Entities | Knocker (patrol/investigate/search/chase FSM, sight + hearing, hiding + breath-hold), Stalker (rule 4, audio only), paper effigies (weeping-angel rules), scarecrows (flashlight-woken). | Tunables in `knocker.json` and `difficulty.ts`. |
| Rendering | PS1 low-res pixel scale, grain, chromatic aberration, bloom, color curves, flashlight-only shadows, per-light mesh lists to stay under the uniform-block limit. | Visual identity is consistent and deliberate. |
| Audio | Fully synthesized Web Audio: HRTF 3D knocks/whispers/steps, drone that follows tension, rain, crickets, TV static. | Starts only after a user gesture. Separate music/SFX buses. |
| UI | Menu with animated rainy-alley canvas, chapter cards, paper reader (5 paper materials, late-ink lines), photo viewer, pause, settings, relic archive, endings, playtest log export. | Fonts bundled (OFL), full Vietnamese diacritics. |
| Persistence | `localStorage`: furthest night, completion, relics, settings. | Checkpoint = start of night. |

## 2. Baseline measurements

| Check | Result |
| --- | --- |
| `npm ci` + `npm run build` (tsc + vite) | Pass. One warning: main chunk 7.05 MB (1.56 MB gzip). |
| Browser run, all 6 chapters (headless Chrome, SwiftShader) | All load and enter play. **0 console errors, 0 failed requests.** |
| Time to interactive menu, production build, 9 Mbps / 60 ms RTT | ~10.9 s median, 2.74 MB transferred. |
| Automated tests | None (only `tsc --noEmit`). |

FPS under SwiftShader (CPU rendering, 8–15 fps) is not representative of GPU hardware and is not used as a target.

## 3. Strengths to preserve

1. The rule-based horror ("bà dặn 4 điều") is culturally grounded and gives every scare a cause the player can learn.
2. The twist is fair: relics, diary and photo variants foreshadow it.
3. The director/JSON split makes pacing tunable without code.
4. The house is small and familiar, and the game keeps changing it between nights (photo, drapes, charcoal writing).
5. Restraint: red is reserved for key moments; jumpscare only on capture.

## 4. Gaps against the production brief (prioritized)

| # | Gap | Impact | Effort | Risk |
| --- | --- | --- | --- | --- |
| 1 | **No real puzzles.** Every objective is a fetch quest whose location is stated in a note (key "dưới bếp", shards listed, items listed). Nothing rewards observation or deduction. | High | M | Low |
| 2 | **No evidence log / journal.** Notes can't be re-read once closed; nothing tracks items held; no hint path when stuck. | High | M | Low |
| 3 | **Almost no humor or family voice.** Relatives are referenced but never heard; the tone is unbroken dread, which flattens the big moments. | High | S–M | Low |
| 4 | **Accessibility gaps:** no key rebinding, no in-game reduce-flashing/motion toggle (only the OS setting), no subtitle duration control, no content warning, no mute hotkey. | Med–High | M | Low |
| 5 | **Sound design gaps:** one footstep sound for every surface; no "life" ambience (geckos, dogs, motorbikes) whose silence could signal danger; the clock never reacts to events. | Med | M | Low |
| 6 | **Bundle size:** `import { … } from "@babylonjs/core"` pulls the whole engine (7 MB raw). | Med | M | Med (side-effect imports) |
| 7 | **No automated smoke test** for the six chapters. | Med | S | Low |
| 8 | **Lore inconsistency:** Út's horoscope says *Mậu Thìn* (1988), but the 2003 photo shows Út at six (born ~1998, *Mậu Dần*). | Low | XS | None |
| 9 | Tab hidden: Web Audio keeps running while the game is paused by pointer-lock loss. | Low | XS | None |
| 10 | Sprites in `public/textures/sprites/` are cut from owner-supplied concept art with **unconfirmed usage rights** (already flagged in README). | Release blocker for public launch | — | Legal |

## 5. Technical debt / risks noted

- `House.ts` (1,000+ lines) mixes per-night interaction logic with geometry. Acceptable for now; new systems should be added as separate modules.
- Interactables check night numbers inline (`this.night === 3`). Workable at this scale.
- WebGL context loss is not handled (DynamicTextures would need redraw). Rare; documented as a known risk.
- `vite.config.ts` raises `chunkSizeWarningLimit` to 6000 to hide the warning; the real fix is tree-shaking.

## 6. After the 2026-10 production pass (measured the same way)

| Check | Before | After |
| --- | --- | --- |
| Main JS chunk | 7,051 KB (1,562 KB gzip) | 1,698 KB (415 KB gzip) |
| Time to menu, prod build, 9 Mbps / 60 ms RTT (median of 3) | ~10.9 s | ~6.1 s |
| Transferred to reach the menu | 2,743 KB | 1,679 KB |
| Automated checks | `tsc` only | `tsc` + `npm run smoke` (13 checks: 6 chapters, puzzle, journal, phone, rebinding, 0 console errors) |
| Console errors / failed requests, all 6 chapters | 0 | 0 |

Gap status: #1–#9 addressed (puzzle in Night 1 only; Nights 2–4 puzzle upgrades remain on the roadmap). **#10 (sprite
usage rights) is still open and blocks a public release.** Not measured: real-GPU frame rate (only CPU/SwiftShader was
available), memory over a full session, Safari/Firefox.

## 7. Decision

Keep the architecture, the story, the entities and the art direction. Spend effort on the missing *systems* (puzzle, journal/evidence, phone messages, hints, accessibility, ambience) and wire them into the existing chapters, starting with a polished vertical slice of **Night 1**.
