# Production log

Short, append-only notes so work can resume after an interruption. Newest last.

## 2026-10-23

- **Phase A done** — `docs/AUDIT.md`. Baseline: build OK, all 6 chapters load with 0 console errors (headless
  Chrome/SwiftShader), menu in ~10.9 s at 9 Mbps / 2.74 MB transferred, main chunk 7.05 MB (1.56 MB gzip).
- **Phase B done** — `docs/DESIGN.md` (synopsis, cast, timeline, clue map, twist, endings, puzzles, art/audio bible, plan).
- **Phase C (Night 1 vertical slice) done and verified by an automated playthrough:**
  - Systems: `core/Keybinds.ts` (rebinding, `{action}` placeholders), `audio/Ambience.ts` (life sounds + silence),
    journal/phone/hints/items in `Hud` + `Game`, combination lock UI, toast, content warning, mute (M),
    settings `calm` (reduce flashing & motion) and `textTime`, surface footsteps, tab-hidden audio suspend,
    clock stops when the house is unsafe, light state `stutter`.
  - Director actions: `message`, `hush`, `objective.hints`.
  - Data: `data/messages.json` (family group chat, all nights), `data/items.json`, notes `gioList`, `calendar`,
    rules note page 2.
  - Night 1 script: cookie-tin lock puzzle (code 1607), gecko omen, kitchen-doorway glimpse, grandma's dead account
    texting before the knocks, life ambience returning after the incense.
  - Fixed: intro objective overwrote newer objectives when the note was read early (split into `obj_altar`).
  - Lock typing wraps back to the first dial.
- Test harness lives outside the repo (session scratchpad); a committed smoke test is still TODO (Phase E).

- **Phase D done:** hints for every objective in all chapters; live messages (uncle at the gate N0, Mom's real text
  during the well call N2, uncle "đếm tới năm" N2.5, Cô Ba relays Thầy Sáu's rule N3, contact "Út" N4); lore fixes
  (Mậu Dần; true-ending text now matches the relic — grandma picked up the child that *cried*); rice-jar shard
  foreshadows the needle test; "Hết" ending seeds doubt (Mom: "sao tay con lạnh vậy"); STORY.md synced;
  `{action}` key placeholders in objectives too. night0/night2_5 kept in their compact one-action-per-line format.
- **Phase E done:** `src/babylon.ts` barrel with deep imports + side effects → main chunk 7.05 MB → 1.70 MB
  (415 KB gzip), menu ~10.9 s → ~6.1 s at 9 Mbps; renders verified identical to baseline. `npm run smoke`
  (scripts/smoke.mjs, playwright-core + system Chrome, Vite dev server via API): 13/13 pass. Production build driven
  through the real UI (menu → warning → chapter → play → journal → mute): 0 errors. Fixed: system toast no longer
  labelled "Zalo"; journal/lock subtitles moved clear of the key-hint bar; calendar day number styled.
- **Phase F:** README (controls, new systems, script actions, files, smoke test), AUDIT before/after table.

### Next (roadmap, highest value first)

1. Confirm usage rights for `public/textures/sprites/*` (release blocker).
2. Real-GPU playtest on a mid-range laptop: frame time per chapter, especially Dusk (4,000 thin-instance rice clumps).
3. Night 2–4 puzzle upgrades (DESIGN.md §9.2); then 3–5 external playtesters using the existing playtest log export.
4. Recorded VO for the voiced lines (the synthesized whisper is a placeholder); texture → WebP (~1 MB of JPG/PNG).
5. Optional: run `npm run smoke` in CI (GitHub's ubuntu runners ship Chrome) before the Pages deploy.

- **Lore pass (P0, text only):** `docs/LORE_DEEPDIVE.md` accepted by the user (all four open questions: yes).
  Applied: STORY.md rewritten (hồn/vía split, grandma knew from day three, small coffin under the altar, Út present
  the night grandma died, ma da, dates: died 21/7 lunar, Night 4 = 30/7 = 2/9/2024); DESIGN.md timeline rows synced.
  Data: Bà Bảy "bữa hổm con mới về rồi mà?" + child-size wet sandals (N0); grandma's Zalo is now her delayed 21/7
  message "Út cài then chưa con" (N1); group chat: funeral video / black cat / leaking coffin (N1), trùng tang
  red herring + Mom's "nằm hòm giải hạn" (N2); diary re-dated 9/7→20/7 and reframed; rules "kể cả giọng bà";
  uncle/Thầy Sáu notes (trùng tang is Cô Ba's idea); relics receipt (trại hòm + child-coffin order), taboos (hồn/vía),
  grave letter (burnt mid-sentence "ba ngày sau bà mở tủ"), confession (forgot talisman, ma da); N4 intro date,
  self-number texts "mày cài then. bà chết ngoài giếng", endings Hết/Thế thân/Mở cửa rewritten. Typecheck + smoke 13/13.
- **Next (lore P1–P3, see LORE_DEEPDIVE §12):** coffin room (6 coffins, count drops nightly), grandma's thọ mộc +
  child coffin under the altar (Night 4), hide-in-coffin mechanic, "Trả hồn" ending (choose who to cut),
  flashback chapter "Rằm năm Quý Mùi". Uncle's note line about the stuck coffin lid waits for the thọ mộc prop.

- **Map expansion (vong-am-bd session):** Tiệm Phúc Ký (SW room, door from hallway, hiding cabinet), full attic over the
  house via shop stairs (floor-aware Knocker that climbs, floor-aware effigies), backland behind the yard gate (pond, shed,
  family graves) from Night 2; immersion (head-bob, flashlight lag/flicker, FOV punch, night-sky fog). Night 2 shard 2 →
  ông's grave; Night 3 photo → attic trunk; relics taboos/eyeBrush → shop bench, horoscope → ông's stele. Shop floor left
  free (x −5.2..−2.0, z −5.4..−3.8) for the six coffins from the lore pass. Details: docs/EXPANSION.md. Build OK, smoke 15/15.

- **Lore pass P1–P3 (coffins, Trả hồn, flashback):** new `src/world/Coffins.ts` (shop coffins 5→4→3→open with drag
  marks; east coffin is a hiding spot — lid knocks, "don't knock back", nailed shut from the 3rd hide = 6 pushes;
  grandma's thọ mộc in her room, opened on Night 4 with scissors → ticket/charger/scratches; altar valance + child
  coffin revealed on Night 4, opened only with all 6 relics → `notes.childLetters`; "Trả hồn" choice + `selfBurn`
  beat) and `src/world/Past.ts` + `src/data/night3_5.json` (chapter 3.5 "Rằm năm Quý Mùi": `House.past`, child eye
  height 1.05 via `Level.eye`, paper footsteps, grandpa at the bench, hide under the altar next to the other child,
  "nhẹ hều", the other child opens human eyes → Night 4). HidingSpot gained `insidePitch/kind/exit`; hide overlay
  variants (coffin/altar/held). Night 3 now leads to 3.5. Paper bike moved to the attic; shop paper house and nav
  S3/S4 moved so nothing walks through coffins. Night 2 `coffin_knock`; Night 4 `tomb_opened`, `child_coffin_*`,
  `two_choices`, `ending_return`. Docs: STORY.md synced, LORE_DEEPDIVE status header.
  Verified: typecheck, `npm run smoke` 16/16 (now includes chapter 3.5), plus a scripted playthrough of the new
  content (flashback start→ending, coffin knock/hunt, hide ×3 + nailed lid, thọ mộc, child coffin, Trả hồn ending):
  27/27, 0 console errors; screenshots reviewed (headless SwiftShader — real-GPU look still unchecked).
