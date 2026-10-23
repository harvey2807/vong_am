# VONG ÂM — Creative & technical blueprint (Phase B)

> **2026-10-23:** the lore was revised in `docs/LORE_DEEPDIVE.md` (accepted). Where this file disagrees with
> `docs/STORY.md`, STORY.md wins.

This extends `docs/STORY.md` (the story bible, in Vietnamese). STORY.md stays the canonical lore; this file covers the
production direction: narrative structure, clue design, puzzles, horror pacing, humor, art and audio rules, and the
implementation plan.

---

## 1. Synopsis

Út, a twenty-something living in Sài Gòn, comes back to the village for the **đầu thất** (seventh-night rite) of the
grandmother who raised them. Út's mother works in Taiwan and can't fly back; Uncle Tư is busy with the funeral, so Út sits
the night alone in the old house on Ngõ 4, which used to be the **Phúc Ký** paper-effigy shop.

Grandma left four rules. Each night something tests one of them: three knocks at the door, a voice from the well, the
altar photo in the dark, footsteps that stop right behind you. Each night the family photo on the altar shows a fifth
person who looks more and more like Út.

Underneath, the house holds a twenty-year-old secret. In 2003 a fortune-teller said six-year-old Út would not survive
the night of Rằm tháng Bảy. Grandfather Lâm Phúc broke all three taboos of his craft to make a **thế thân** (paper
stand-in) with Út's face, Út's name and painted eyes, so the underworld would take it instead. The stand-in refused to
go. It hid under the altar beside the child. The underworld took the grandfather instead. In the morning grandma found
**two identical children** under the altar, one crying and one silent. She picked up the crying one and sealed the other
in the wardrobe with a talisman.

A month ago the wardrobe was found empty.

The surface story asks *"what is trying to become Út?"* The true ending answers a worse question: *"which one of them
did grandma pick up?"*

## 2. Protagonist

| | |
| --- | --- |
| **Út** | Born 1998 (*Mậu Dần*; six by Vietnamese age-counting in 2003). Grandma's youngest grandchild, raised by her after Mom left to work abroad. Moved to Sài Gòn for university and stopped coming home; hasn't visited in three years. |
| Goal | Do right by grandma at the đầu thất; find out how she drowned in a well while the house was bolted from inside. |
| Fear | Being too late. Being replaced. Finding out the love wasn't meant for them. |
| Flaw | Avoidance. Út explains things away ("chỉ là bóng đèn"), which is also where the dry humor comes from. |
| Arc | From guilty distance, through doubt about their own memories and body, to accepting grandma's last line: *"Có máu thì con là cháu bà. Không có, thì con cũng là cháu bà. Bà thương hết."* Identity is the love you were given, not what you're made of. |

## 3. Timeline of past events

| When (lunar where noted) | Event | Where the player learns it |
| --- | --- | --- |
| 1978 (Mậu Ngọ) | Lâm Phúc copies down the three taboos of paper craft. | Relic *Ba điều cấm* (Night 1) |
| 1998 | Út is born, year Mậu Dần, hour Tý. | Relic *Lá số* (Night 2) |
| 2003, before Rằm | Family photo: ông, bà, mẹ, six-year-old Út. Út breaks grandpa's blue-and-white bowl and hides **silently** under the altar all afternoon. | Photo; diary (Night 1) |
| 2003, Rằm tháng Bảy (15/7 Quý Mùi) | Grandpa makes the stand-in. The underworld knocks three times at night. The stand-in hides under the altar with Út. | Relics *Lá số*, *Thư bà đốt cho ông* |
| 2003, morning of 16/7 | Grandpa found dead on the porch, eyes open. **His death anniversary is 16/7, not Rằm**, and grandma corrected it by hand. | **Giỗ list (Night 1 puzzle)**; relic *Lá số* |
| 2003 | Grandma picks up the crying child, which feels oddly light, and seals the other in the wardrobe. Thầy Sáu writes the talisman. | Relic *Thư bà đốt cho ông*; diary |
| 2003–2024 | Silence. Út grows up, moves to Sài Gòn. Mom goes to work in Taiwan. | Phone messages |
| 2024, 9/7 lunar | Grandma cannot find Thầy Sáu's talismans; she has renewed them on the small coffin under the altar every Rằm for 20 years. | Diary p.1 |
| 2024, 15/7 (18 Aug 2024) | Knocks return. Grandma stops tearing the wall calendar. | Kitchen calendar (stuck on Rằm) |
| 2024, 15/7–20/7 | She forgets to renew the talisman on Rằm; three knocks in a six-year-old's voice; she forgets more each night; the photo gains a fifth person. | Diary |
| 2024, night of 21/7 lunar | Grandma calls Út home, hides Út in her own coffin, answers the child's voice from the well and drowns. Út bolted the door from inside and forgets the night. | Late Zalo message (N1), Bà Bảy (N0), self-number texts (N4) — see LORE_DEEPDIVE.md §4.5 |
| Night 0–4 | The game. | — |

## 4. Cast and their secrets

| Character | Role | Secret / contradiction |
| --- | --- | --- |
| **Bà** (grandma) | Absent center. Rules, diary, giỗ list, torn page. | Has never been sure she picked up the right child. Her rules protect Út *and* keep the sealed one out. |
| **Ông Lâm Phúc** | Dead paper-craft master. | Broke all three taboos out of love; caused everything. |
| **Mẹ** (Mom) | Works in Taiwan. Present only through real phone messages. | Doesn't know any of it. Her real texts contradict the "Mom" voice from the well, which is the player's fair clue. |
| **Chú Tư** (uncle) | Practical, terse. Goes to fetch the ritual master and doesn't come back. | Knows about the bowl shards and the rules, but not the swap. |
| **Cô Ba** (aunt) | Group-chat superstition engine. | Her advice contradicts Chú Tư's. She's comic, but one of her rules turns out to matter. |
| **Dì Năm** (aunt) | Forwards chain messages. | Pure comic relief, until the forward that arrives at the wrong moment. |
| **Thầy Sáu** | Village ritual master. Wrote the wardrobe talisman. | Suspects Út dotted the effigies' eyes, and says so (*"Nếu cậu không nhớ thì tôi sợ là cậu nhớ"*). |
| **Bà Bảy** | Neighbor at the alley entrance. | Teaches the prologue rule (don't look at house no. 9). |
| **The Knocker / "người thứ năm"** | The thing at the door. Wears grandma's shape, then Út's. | Under the true reading it is the **real Út**, warped by twenty years in the wardrobe. |

## 5. Chapter outline (with production changes marked ★)

| Chapter | Beat sheet | Rule tested | New in this pass |
| --- | --- | --- | --- |
| **Mở đầu — Ngõ 4** | Rainy alley → Bà Bảy's warning → house no. 9 temptation → key under the flower pot → home. | Don't look up at no. 9 | ★ Material footsteps (wet concrete), distant dogs, motorbike passing at the alley mouth. |
| **Đêm 1 — Tiếng gõ cửa** *(vertical slice)* | Rules note → ★ gecko clicks (omen) → ★ **the cookie-tin lock puzzle** (giỗ list + calendar + note) → ★ kitchen-bulb glimpse → photo gains a fifth person → voice behind you → diary → knocks, lights out → ★ grandma's dead Zalo account texts you → hunt → incense. | Rule 1 (don't open), rule 3 (photo in the dark) | ★ Puzzle, ★ journal/evidence, ★ phone + family chat (humor), ★ life-ambience that dies when the knocking starts, ★ clock stops. |
| **Đêm 2 — Cái giếng** | Uncle's note → 3 bowl shards (rice jar ★ shard cuts finger, no blood; banana roots; well) → TV turns on → rule 4 → well voice ("Mom") ★ while Mom's real text arrives from Taiwan → knocks → bowl on altar. | Rules 2, 3, 4 | ★ Fair contradiction clue via phone; ★ foreshadowing of the needle test. |
| **Chạng vạng — Gốc đa** | Fields, scarecrows woken by the flashlight, uncle counting, voice in the paddy, faceless uncle. | Lights off in the fields | ★ Family chat looking for Chú Tư; material footsteps (dirt/water). |
| **Đêm 3 — Hình nhân** | Thầy Sáu's note → effigies with dotted eyes → gather shirt/photo/matches → burn the stand-in. | Don't turn your back | ★ Chat: Dì Năm's "how to tell if someone is possessed" forward (humor that lands too close). |
| **Đêm 4 — Người thứ năm** | Last page → your own voice at the door → scissors → breaker → take the photo down in the light → cut and burn. | All four | ★ A message from a contact named **Út**, sent from your own number. ★ Fixed true-ending text (see §7). |

## 6. Clue & revelation map

| Revelation | Clues (chapter) | Payoff |
| --- | --- | --- |
| Grandpa died the morning *after* Rằm | Giỗ list correction (N1), calendar teaches "Rằm = 15" (N1), *Lá số* relic (N2) | Unlocks the tin (N1). Re-read later, it shows grandpa kept watch at the door all night. |
| The voice imitates by stealing memories | Bowl memory voiced behind you (N1), diary (N1), uncle's note (N2) | Explains why "Mom" in the well sounds right |
| The well voice isn't Mom | Mom's real Taiwan text arrives during the call (N2) | The player can resist the temptation for a reason, not by luck |
| Paper-craft taboos | Receipt (N0), *Ba điều cấm* (N1) | Frames the stand-in |
| Two identical children | *Thư bà đốt cho ông* (Dusk) | Core doubt |
| Út knows the Lâm eye-dotting technique | *Cây bút điểm nhãn* (N3), glitch "Ngón tay mình dính mực đen" (N3) | Who woke the effigies |
| Út doesn't bleed | ★ Rice-jar shard cuts the finger, "không thấy chảy máu — may" (N2) | Needle test (true ending) |
| Grandma's last instruction | *Trang bà xé khỏi sổ* (N4) | True ending |

## 7. Twist design

- **What the player believes (Nights 1–3):** a malevolent thing wearing grandma's face wants into the house to complete the photo. Then: a paper thing is turning into Út.
- **What the player suspects (relics, Night 4):** the paper stand-in from 2003 escaped the wardrobe and wants Út's life.
- **What is true (true ending):** grandma picked up the **crying** child, but paper can perform crying. The real six-year-old did what Út always did when terrified: hid under the altar and stayed silent, as in the bowl story. The player character is the stand-in, raised for twenty years as Út. The thing at the door is the real Út.
- **Why it's fair:** the bowl memory establishes "Út hides silently when afraid" in Night 1. The relic says the crying child felt "nhẹ hều". The Night 2 shard draws no blood. Thầy Sáu notes the eye-dotting technique. The photo's fifth person is literally *Út grown up*.
- **Consistency fix:** the old true-ending text said grandma "ẵm nhầm đứa không khóc", which contradicts the relic. It now says she picked up the one that cried, and that was the mistake.
- **Ambiguity kept:** the regular ending ("Hết") never resolves it; Chú Tư calls you Út either way; grandma's line covers both readings.

## 8. Endings

| Ending | Condition | Tone |
| --- | --- | --- |
| Caught (per night) | Knocker/effigy/scarecrow catches you | Short epilogue that adds one more person/object to the house |
| Opened the door (N1, N4) | Obey the voice | The thing takes your place |
| **Hết** | Burn the fifth person in N4 without all relics | Relief; question left open |
| **Thế thân** (true) | Burn the fifth person with all 6 relics | The needle test; the reveal; grandma loves both |

## 9. Puzzles

Rules for every puzzle: a narrative reason, clues the game itself teaches, a tactile interaction, feedback on progress
and on specific wrong answers, tiered hints, and state that never regresses.

### 9.1 Night 1 — "Hộp bánh quy" (cookie-tin lock) — *implemented in the vertical slice*

- **Narrative purpose:** grandma locked her bedroom key in the family's blue Danish-cookie tin (which, as in every
  Vietnamese home, holds sewing gear, not cookies) using Út's old bicycle cable lock. The code is grandpa's
  **ngày giỗ** (death anniversary). Teaches the family's ritual life and seeds the Rằm night.
- **Clues:**
  1. Rules note: the key is in the cookie tin; the code is ông's giỗ, *ngày trước, tháng sau* (day then month), in the lunar calendar.
  2. Giỗ list beside the altar: four relatives with lunar dates (distractors: 2212, 0302, 0805). Grandpa's entry reads *Rằm tháng Bảy*, crossed out and corrected: *"Không phải Rằm. Đêm Rằm ông còn ngồi canh cửa. Sáng hôm sau mới đi."*
  3. Kitchen tear-off calendar, stuck on the Rằm when grandma forgot to renew the talisman: *"Âm lịch: ngày 15 tháng 7 — Rằm tháng Bảy."* (teaches Rằm = 15th).
- **Solution:** 16/7 → **1607**.
- **Interaction:** 4 brass dials; A/D (←/→) to select, W/S (↑/↓) or mouse wheel to turn, E to pull, Q to step back.
- **Feedback:** 1507 → "Bà gạch ngày Rằm rồi mà…"; 0716 → "Ngày trước, tháng sau."; other wrong codes → rattle, then escalating hints at 3 and 5 attempts. Journal hint button gives the same tiers on demand.
- **Payoff:** the tin opens: key, needles, thread, a note "Không có bánh đâu. — Bà" (humor). The needle is the same one the true ending uses.

### 9.2 Candidates for the next pass (roadmap)

- Night 2: deduce which shard location the rice-jar shard *isn't* in from the uncle's two notes (currently all three are stated).
- Night 3: match the three items to the stand-in by reading Thầy Sáu's order (shirt → photo → fire) and punish the wrong order with an effigy step.
- Night 4: choose which figure to cut from the photo, using what the relics say about the silent child.

## 10. Horror pacing rules

1. **Life sounds mean safety.** Geckos, dogs, distant motorbikes and the clock play while the house is calm. When the
   knocking starts they stop, and the silence is the warning. The player learns this rule without being told.
2. **Familiar cues get betrayed once.** The flaky kitchen bulb is harmless for minutes; then one flicker shows a figure in
   the doorway, with no sting, just silence and Út explaining it away. The phone is a safe, funny UI until a dead
   person texts you.
3. One loud jumpscare per chapter, maximum: capture. Everything else is quiet.
4. Every threat has a rule the player can learn; every rule is taught before it's tested.
5. Humor only at low tension and never after a revelation. The funniest beats come right before a dread beat (the
   cookie tin → the photo changes).

## 11. Humor guide

- Source: family texture (the group chat, the cookie tin, grandma's guilt-tripping), Út's understatement, objects.
- Characters: Cô Ba (contradictory superstitions), Dì Năm (chain forwards), Chú Tư (one-line replies), grandma (gentle
  scolding in notes).
- Never: during chases, after a death, in endings, or at the expense of a ritual itself.

## 12. Art bible (summary; tokens live in `src/style.css :root`)

- **Style:** PS1-era low-res 3D (pixel scale 1.75–3.2) with grain, slight chromatic aberration and bloom on light sources.
  Code-drawn textures for Vietnamese artifacts; CC0 photo textures for walls, wood, mud.
- **References:** *Thần Trùng* (everyday Vietnamese interiors), *Devotion* (altars, CRT TV, darkness as framing), Thai
  banana-grove ghost lore.
- **Palette:** old-wood amber `#c39555`, rust `#7b4225`, moss `#394731`, cold teal `#244048`, stone `#474846`, ivory text
  `#e4dac6`, blood crimson `#6e1512` **reserved for key moments** (late ink, threat vignette, confirm states).
- **Lighting:** bare incandescent bulbs (warm, flickering), altar lamp red, moonlight cold blue. Darkness is *framing*,
  never the default: every room has a readable silhouette at default brightness. Shadows come only from the flashlight.
- **Entities:** silhouettes slightly too tall and thin, with no feet (they dissolve into smoke). Faces appear only up close or in a flash.
- **UI:** paper and wood, not chrome. Titles in Cormorant Garamond, body/subtitles in Noto Serif, UI in Be Vietnam Pro,
  handwriting in Patrick Hand. New UI (lock, journal, phone) follows the same tokens. The phone is the only "modern"
  surface and should feel cheap and slightly cracked.
- **Motion:** slow rises (0.6–1.8 s), steps(1) flickers only on events. Every flicker/glitch respects
  *reduce flashing & motion*.

## 13. Audio plan

| Layer | Content | Rule |
| --- | --- | --- |
| Bed | Brown-noise room tone, detuned drone, tension chord | Follows `max(director.tension, entity threat)` |
| Weather | Rain (indoor muffled / outdoor open), crickets in the fields | Per-level, one instance |
| ★ Life | Gecko clicks (indoor walls), distant dogs (outdoor), motorbike passing (alley/front), clock tick | Only while calm; silenced when the knocking starts or on hunt/lights off |
| ★ Foley | Footsteps by surface: tile, wet concrete, mud, dirt, water; doors, rattles, dials, tin lid | 3D where it has a source |
| Voices | Formant-filtered whispers (placeholder for recorded VO) | Always subtitled |
| Stingers | Sting (rule broken), shriek (capture only) | Rare by design |

Lifecycle: one `AudioContext`, created on first gesture; buses for music/SFX/master; every loop has a single owner and a
stop path; the context is suspended while the tab is hidden.

## 14. Core loop

Explore → Observe (look at, read) → Collect evidence (journal logs notes, items, messages) → Interpret clues →
Solve (lock, rituals) → Trigger revelation (photo, voice, message) → Survive (hide, hold breath, obey rules) → Progress
(chapter card).

## 15. Implementation plan (prioritized)

| Pri | Item | Phase |
| --- | --- | --- |
| P0 | Night 1 vertical slice: lock puzzle + giỗ list + calendar; journal (objective, hint tiers, items, notes, messages); phone/group chat; gecko omen; kitchen glimpse; life-ambience silence; clock stop | C |
| P0 | Accessibility: reduce flashing & motion toggle, subtitle duration, key rebinding, content warning, mute key | C/D |
| P1 | Messages for every chapter (humor + Mom's contradicting text + "Út" contact) | D |
| P1 | Surface-based footsteps; ambience director outdoors (dogs, motorbike) | D |
| P1 | Lore fixes (Mậu Dần, true-ending consistency, rice-jar shard foreshadowing) | D |
| P1 | Tab-hidden audio suspend; save-data versioning | E |
| P2 | Babylon tree-shaking (bundle size) | E |
| P2 | Smoke-test script over all chapters + puzzle flow | E |
| P3 | Night 2–4 puzzle upgrades (§9.2); recorded VO; Blender rebuild | Roadmap |
