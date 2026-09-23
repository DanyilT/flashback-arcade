# Archive.org Flash-game research

Classic Flash games sourced from the **Internet Archive**. **No game file is
stored in this repo** — the SWFs stream from the archive. The machine-readable
version of this table lives in [`../games.json`](../games.json) (fields
`archive.org`, `fileArchive`, `fileFlashpointArchiveZip`,
`flashpointarchive.org`, `origin`).

**Playback changed.** Games stream from the archive's **CORS-enabled** path,
`https://archive.org/cors/<identifier>/<file>`, straight into this site's own
Ruffle. (`/download/` sends no `Access-Control-Allow-Origin` and stays blocked,
which is why this used to frame the archive's embed instead; there is no iframe
fallback any more — see the README.) Each row's **Direct SWF** is the raw
`/download/` file, kept as provenance.

Every game below was checked past its preloader to a title screen or gameplay —
**not** a lock screen or a white screen. Games that failed that test are listed
in "Researched but not shipped".

> **Re-test note.** Verdicts recorded before the engine change were made against
> the archive's Ruffle. A game rejected then can behave differently in ours (and
> vice versa), so a rejection is worth re-testing rather than trusting.

## Shipped — verified playing (46 of 48 entries)

Not every entry is playable here. 4 carry an `error` field and appear only in
the `?all=1` catalogue, greyed and badged with the reason — see "Researched but
NOT shipped" below. Some games stream from **Flashpoint's** GameZIP rather than
an archive.org item, so their row has no archive identifier.

| Game | Developer | Year | Archive item | Direct SWF |
|------|-----------|------|--------------|------------|
| Fireboy & Watergirl in the Forest Temple | Oslo Albet | 2009 | [details](https://archive.org/details/fireboy_and-watergirl-in-the-forest-temple) · [embed](https://archive.org/embed/fireboy_and-watergirl-in-the-forest-temple) | [FireBoyAndWaterGirl_Kong.swf](https://archive.org/download/fireboy_and-watergirl-in-the-forest-temple/FireBoyAndWaterGirl_Kong.swf) |
| Fireboy & Watergirl 2: In the Light Temple | Oslo Albet | 2010 | [details](https://archive.org/details/fireboy-and-watergirl-2-in-the-light-temple) · [embed](https://archive.org/embed/fireboy-and-watergirl-2-in-the-light-temple) | [FireBoyAndWaterGirl.swf](https://archive.org/download/fireboy-and-watergirl-2-in-the-light-temple/FireBoyAndWaterGirl.swf) |
| Fireboy & Watergirl 3: In the Ice Temple | Oslo Albet | 2012 | [details](https://archive.org/details/fireboy-and-watergirl-3-in-the-ice-temple) · [embed](https://archive.org/embed/fireboy-and-watergirl-3-in-the-ice-temple) | [FireBoyAndWaterGirl.swf](https://archive.org/download/fireboy-and-watergirl-3-in-the-ice-temple/FireBoyAndWaterGirl.swf) |
| Fireboy & Watergirl 4: In the Crystal Temple | Oslo Albet | 2013 | [details](https://archive.org/details/fireboy-watergirl-15650) · [embed](https://archive.org/embed/fireboy-watergirl-15650) | [the-cristal-temple-15650.swf](https://archive.org/download/fireboy-watergirl-15650/the-cristal-temple-15650.swf) |
| Red Ball | Evgeniy Fedoseev | 2008 | [details](https://archive.org/details/redball1_202312) · [embed](https://archive.org/embed/redball1_202312) | [redball1.swf](https://archive.org/download/redball1_202312/redball1.swf) |
| Red Ball 2: The King | Evgeniy Fedoseev | 2009 | [details](https://archive.org/details/red-ball-2-the-king) · [embed](https://archive.org/embed/red-ball-2-the-king) | [redball2_theking.swf](https://archive.org/download/red-ball-2-the-king/redball2_theking.swf) |
| Red Ball 3 | Evgeniy Fedoseev | 2011 | [details](https://archive.org/details/red-ball-3) · [embed](https://archive.org/embed/red-ball-3) | [redball3.swf](https://archive.org/download/red-ball-3/redball3.swf) |
| Red Ball 4: Volume 1 | Evgeniy Fedoseev | 2012 | [details](https://archive.org/details/red-ball-4-volume-1) · [embed](https://archive.org/embed/red-ball-4-volume-1) | [redball4.swf](https://archive.org/download/red-ball-4-volume-1/redball4.swf) |
| Red Ball 4: Volume 2 | Evgeniy Fedoseev | 2013 | [details](https://archive.org/details/red-ball-4-volume-2) · [embed](https://archive.org/embed/red-ball-4-volume-2) | [redball4-volume2.swf](https://archive.org/download/red-ball-4-volume-2/redball4-volume2.swf) |
| Red Ball 4: Volume 3 | Evgeniy Fedoseev | 2013 | [details](https://archive.org/details/red-ball-4-volume-3) · [embed](https://archive.org/embed/red-ball-4-volume-3) | [redball4-volume3.swf](https://archive.org/download/red-ball-4-volume-3/redball4-volume3.swf) |
| Bad Ice Cream 1 | Nitrome | 2010 | [details](https://archive.org/details/bad-ice-cream-trilogy) · [embed](https://archive.org/embed/bad-ice-cream-trilogy) | [Bad_Ice_Cream_1.swf](https://archive.org/download/bad-ice-cream-trilogy/Bad_Ice_Cream_1.swf) |
| Bad Ice Cream 2 | Nitrome | 2013 | [details](https://archive.org/details/bad-ice-cream-trilogy) · [embed](https://archive.org/embed/bad-ice-cream-trilogy) | [Bad_Ice_Cream_2.swf](https://archive.org/download/bad-ice-cream-trilogy/Bad_Ice_Cream_2.swf) |
| Bad Ice Cream 3 | Nitrome | 2013 | [details](https://archive.org/details/bad-ice-cream-trilogy) · [embed](https://archive.org/embed/bad-ice-cream-trilogy) | [Bad_Ice_Cream_3.swf](https://archive.org/download/bad-ice-cream-trilogy/Bad_Ice_Cream_3.swf) |
| Bloxorz | Damien Clarke | 2007 | [details](https://archive.org/details/flash_bloxorz) · [embed](https://archive.org/embed/flash_bloxorz) | [flash_bloxorz.swf](https://archive.org/download/flash_bloxorz/flash_bloxorz.swf) |
| The World's Hardest Game 2 | Snubby Land | 2008 | [details](https://archive.org/details/flash_theworldshardestgame2) · [embed](https://archive.org/embed/flash_theworldshardestgame2) | [theworldshardestgame2.swf](https://archive.org/download/flash_theworldshardestgame2/theworldshardestgame2.swf) |
| Snail Bob | Hunter Hamster | 2010 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob.swf](https://archive.org/download/snail-bob-collection/snail-bob.swf) |
| Snail Bob 2 | Hunter Hamster | 2011 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob-2.swf](https://archive.org/download/snail-bob-collection/snail-bob-2.swf) |
| Snail Bob 3 | Hunter Hamster | 2012 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob-3.swf](https://archive.org/download/snail-bob-collection/snail-bob-3.swf) |
| Snail Bob Space | Hunter Hamster | 2013 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob-space.swf](https://archive.org/download/snail-bob-collection/snail-bob-space.swf) |
| Snail Bob 5: Love Story | Hunter Hamster | 2013 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob-5-love-story.swf](https://archive.org/download/snail-bob-collection/snail-bob-5-love-story.swf) |
| Snail Bob 6: Winter Story | Hunter Hamster | 2013 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob-6-winter-story.swf](https://archive.org/download/snail-bob-collection/snail-bob-6-winter-story.swf) |
| Snail Bob 7: Fantasy Story | Hunter Hamster | 2014 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob-7-fantasy-story.swf](https://archive.org/download/snail-bob-collection/snail-bob-7-fantasy-story.swf) |
| Snail Bob 8: Island Story | Hunter Hamster | 2014 | [details](https://archive.org/details/snail-bob-collection) · [embed](https://archive.org/embed/snail-bob-collection) | [snail-bob-8-island-story.swf](https://archive.org/download/snail-bob-collection/snail-bob-8-island-story.swf) |
| The World's Hardest Game | Snubby Land | 2007 | [details](https://archive.org/details/the-worlds-hardest-game_202310) · [embed](https://archive.org/embed/the-worlds-hardest-game_202310) | [the-worlds-hardest-g-1043817f.swf](https://archive.org/download/the-worlds-hardest-game_202310/the-worlds-hardest-g-1043817f.swf) |
| The World's Hardest Game 3 | Snubby Land | 2014 | [details](https://archive.org/details/the-worlds-hardest-game-3) · [embed](https://archive.org/embed/the-worlds-hardest-game-3) | [worldshardestgame3.swf](https://archive.org/download/the-worlds-hardest-game-3/worldshardestgame3.swf) |
| The World's Hardest Game 4 | Snubby Land | 2016 | [details](https://archive.org/details/the-worlds-hardest-game-4) · [embed](https://archive.org/embed/the-worlds-hardest-game-4) | [worlds-hardest-game-4.swf](https://archive.org/download/the-worlds-hardest-game-4/worlds-hardest-game-4.swf) |
| The Fancy Pants Adventure: World 1 | Brad Borne | 2006 | [details](https://archive.org/details/fancypantsadventure-world1-2006) · [embed](https://archive.org/embed/fancypantsadventure-world1-2006) | [fancypantsadventures.swf](https://archive.org/download/fancypantsadventure-world1-2006/fancypantsadventures.swf) |
| Interactive Buddy | Shock Value | 2004 | [details](https://archive.org/details/interactive_buddy_v_1_02_by_shock_value_d6ma8m) · [embed](https://archive.org/embed/interactive_buddy_v_1_02_by_shock_value_d6ma8m) | [interactive_buddy_v_1_02_by_shock_value_d6ma8m.swf](https://archive.org/download/interactive_buddy_v_1_02_by_shock_value_d6ma8m/interactive_buddy_v_1_02_by_shock_value_d6ma8m.swf) |
| Effing Worms | Effing Games | 2010 | [details](https://archive.org/details/effing-worms) · [embed](https://archive.org/embed/effing-worms) | [EffingWorms.swf](https://archive.org/download/effing-worms/EffingWorms.swf) |
| Vex 3 | Microwave Games | 2013 | [details](https://archive.org/details/vex-3_202310) · [embed](https://archive.org/embed/vex-3_202310) | [vex-3.swf](https://archive.org/download/vex-3_202310/vex-3.swf) |
| Motherload | XGen Studios | 2004 | [details](https://archive.org/details/motherload-flash-game) · [embed](https://archive.org/embed/motherload-flash-game) | [motherload_2017-934.swf](https://archive.org/download/motherload-flash-game/motherload_2017-934.swf) |
| Raft Wars | Martijn Kunst (Bubblebox) | 2007 | [details](https://archive.org/details/miniclip_raft_wars) · [embed](https://archive.org/embed/miniclip_raft_wars) | [raftwars.swf](https://archive.org/download/miniclip_raft_wars/raftwars.swf) |
| Earn to Die | Toffee Games | 2011 | [details](https://archive.org/details/etd_20220311) · [embed](https://archive.org/embed/etd_20220311) | [ETD.swf](https://archive.org/download/etd_20220311/ETD.swf) |
| Earn to Die 2012 | Toffee Games | 2012 | [details](https://archive.org/details/earn-to-die-2012) · [embed](https://archive.org/embed/earn-to-die-2012) | [earn-to-die-2012-1423705b0.swf](https://archive.org/download/earn-to-die-2012/earn-to-die-2012-1423705b0.swf) |
| Earn to Die 2012: Part 2 | Toffee Games | 2013 | [details](https://archive.org/details/Earn-To-Die-2012-Part-2.swf) · [embed](https://archive.org/embed/Earn-To-Die-2012-Part-2.swf) | [earn-to-die-2012-part-2.swf](https://archive.org/download/Earn-To-Die-2012-Part-2.swf/earn-to-die-2012-part-2.swf) |
| City Under Siege | FreeOnlineGames | 2008 | — (Flashpoint GameZIP `6b2f6e48-…`, `Flashpoint13.0_part2`/`GameData_9.zip`) | — |
| The Insanity Box | Louis Fernet-Leclair | 2008 | — (Flashpoint **Htdocs** `Htdocs_4.zip`, `…/uploads.ungrounded.net/457000/457689_insanitybox.swf`) | — |
| The Insanity Box 2 | Louis Fernet-Leclair | 2011 | — (Flashpoint **Htdocs** `Htdocs_4.zip`, `…/uploads.ungrounded.net/571000/571423_insanitybox2.swf`) | — |
| The Fancy Pants Adventures: World 4 Part 1 | Brad Borne | 2020 | — (Flashpoint **Htdocs** `Htdocs_4.zip`, `…/uploads.ungrounded.net/750000/750785_fpaworld4p1.swf`) | — |
| The Fancy Pants Adventures: World 4 Part 2 | Brad Borne | 2020 | — (Flashpoint **Htdocs** `Htdocs_4.zip`, `…/uploads.ungrounded.net/752000/752737_fpaworld4p2.swf`) | — |
| Earn to Die 2: Exodus | Toffee Games | 2015 | [details](https://archive.org/details/earn-to-die-2016) · [embed](https://archive.org/embed/earn-to-die-2016) | [Earn to Die 2016.swf](https://archive.org/download/earn-to-die-2016/Earn%20to%20Die%202016.swf) |

## Researched but NOT shipped

| Game | Archive item | Status | Reason |
|------|--------------|--------|--------|
| Fireboy & Watergirl 3 (Kongregate build) | `fireboy-and-watergirl-3-in-the-ice-temple` | ad preroll | The Kongregate build stalls loading `http://server.cpmstar.com/adviewas3.swf`. FW3 now plays Flashpoint's **Miniclip** build (SWF 15, no failed requests) via `flashpointZip` from the archive.org mirror. |
| Fireboy & Watergirl 4 (Kongregate build, loose SWF) | `fireboy-and-watergirl-4-in-the-crystal-temple` | **black screen** | Loads with no panic (640x480, SWF 11) but waits on a dead config service (`http://api.configar.org/cf/pb/1/settings/...`) and parks in its "INSIDE TEASER" branch. A loose SWF can never satisfy that. **Flashpoint's GameZIP of the same build can, and is what ships** — the zip carries that service's archived reply; see below. |
| Fireboy & Watergirl 4 (Armor Games build) | `fireboy-watergirl-15650` | **black screen** | The archive.org item's build comes up black, sometimes after showing the Armor Games splash. Same in `tools/bare-player.html` with nothing on the page but Ruffle, so it is the build, not the portal. **FW4 now ships from `flashpointZip` instead, which works** — see the note below. Beware A/B-ing one Ruffle option at a time against this build: it fails unevenly, so the noise will "confirm" whichever option you happened to test on a bad run (`wmode: "opaque"` was wrongly convicted that way). |
| The Insanity Box / The Insanity Box 2 | — | **SOLVED 2026-09-22** | Was listed as unreachable: Newgrounds serves the files only to its own origin, there is no archive.org item, and `find-flashpoint-zip.py` finds neither in GameData. Both are in Flashpoint's **Htdocs** tree instead — `Legacy/htdocs/uploads.ungrounded.net/457000/457689_insanitybox.swf` and `…/571000/571423_insanitybox2.swf`, in `Htdocs_4.zip` — and both now play. See "Flashpoint sources: a second sweep" below. |
| Nitrome Games volume 1 (whole item) | `nitrome-games-volume-1` | **no games in it** | Nine zips, all 50–58 kB — Icebreaker Gathering, Ditto, Changetype(), Nitrome Must Die, Super Stock Take, Ice Beak, Bad Ice Cream 2, Rainbowgeddon, Turnament. Each holds `index.html`, `swfobject.js`, `expressInstall.swf` and a ~50 kB `.swf`, and that SWF is `NitromePreloader`: a *distribution wrapper* Nitrome handed to webmasters, which streams the real game from `s3.amazonaws.com/us_nitrome_s3/` and `prerolls/nitrome.swf` at run time. The README in each zip is literally installation instructions for embedding it in an iframe. The games themselves are not in the item. |
| Fireboy & Watergirl 5: Elements | `faw-5-elements-ipa`, Flashpoint `462cb01d-38d9-4f75-98d1-01794c387eec` | **HTML5, not Flash** | Checked 2026-09-19 and the answer is settled: there is no Flash build to find. Flashpoint has the game and its GameZIP **is** in the mirror (`Flashpoint13.0_part2` / `GameData_6.zip`, 13 MB), but it holds 130 files and **not one `.swf`** — one `index.html`, three `.js`, 54 JSON atlases, 33 MP3s. Its Platform is `HTML5` and its launch command is a CoolMath **page**, run by Flashpoint's browser (FPNavigator), not by Flash Player. Ruffle is a Flash emulator, so it cannot run this whatever we do. The zip also bundles GameDistribution's ad SDK (`html5.api.gamedistribution.com/main.min.js`), which the network policy could not constrain inside an iframe. Elsewhere only iOS/Android/Windows-Phone builds exist. |
| Fireboy & Watergirl 6: Fairy Tales | Flashpoint `d1ca652b-06a3-4da0-9027-40f2e9dc15dd` | **HTML5, and unobtainable** | Same story as FW5 — Platform `HTML5`, launch command `coolmathgames.com/fireboy-watergirl-6/index.html` — with one extra wall: `tools/find-flashpoint-zip.py` searched all 25 parts and its GameZIP is **not in the archive.org mirror at all** (the mirror is a Flashpoint 13.0 snapshot; this entry's data was added later). Flashpoint's own CDN grants CORS only to `ooooooooo.ooo`, so there is no route to the files from here. Nothing to do. |
| Earn to Die 2: Exodus ("Hacked" upload) | `earn-to-die-2-exodus-hacked` | modified build | Cheats/unlocks baked in, so not the game as released. The clean upload `earn-to-die-2016` is shipped instead — its slug says 2016 but its metadata is Exodus (Toffee Games, 2015-05-21, in `softwarelibrary_flash_games`). A title search for "earn to die" does not surface it, which is how it was missed at first. |
| Earn to Die ("Original Hacked") | `earn-to-die-not-doppler-dec` | modified build | Same reason; the clean `etd_20220311` upload is shipped instead. |
| ~~Red Ball 4 (Volumes 1–3)~~ | `red-ball-4-volume-1/2/3` | **now shipped** | Previously rejected as a white screen under the *archive's* Ruffle. Re-added after the switch to our own Ruffle, where all three load cleanly (correct 640×480 stage, no panic). See the note at the top about re-testing old verdicts. |
| Red Ball (original upload) | `red-ball_` | black screen | Would not start in the embed; the A10 upload `redball1_202312` is used for Red Ball 1 instead. |
| "Red Ball 2 The King" | `Red_Ball_2_The_King` | mislabeled | The item is actually *Bratz Babyz Mermaids*. The correct Red Ball 2 is `red-ball-2-the-king`. |
| Bad Ice Cream (single uploads) | `bad_ice_cream`, `bad-ice-cream`, `bad_ice_cream_3` | superseded | All three games now ship from the single `bad-ice-cream-trilogy` item instead. `bad_ice_cream` and `bad_ice_cream_3` were URL-locked; `bad-ice-cream` and `bad_ice_cream_2` were the earlier picks for 1 and 2. |
| Bad Ice Cream 3 "Offline" | `bad-ice-cream-3-offline` | won't launch | Sticks on the archive's poster and never starts. Its description also offers a de-locked build, which is a second reason not to use it — see the note below. |
| Bad Ice Cream (de-locked) | `bad_ice_cream_202412` | **works, but is a de-lock** | Checked 2026-09-19 at this repo's request. It plays: CWS v9, 550×550, `/cors/` grants CORS, reaches "CLICK TO LICK" with no lock screen and no broken-identifier exceptions. Its bytes are tidy — `navigateToURL` intact, no `urlLock` symbol, no `URL-Locked` string. But the item's own metadata is explicit: subjects `Fixed`, `Fix`, `Crack`, `URL`, and a description reading "this is a version with this URL check removed". So it is a cleaner patch, not an unpatched build. Recorded, not shipped, pending a decision — see "On de-locked builds" below. |
| Bloons Tower Defense 5 | `btd5-dat_20231125` | white screen | 18 MB AS3 build does not render in Ruffle. |
| Super Mario 63 | `sm63game_202111` | — | Item is a Windows `.exe`, not a Flash `.swf`. |
| Run 3 (Flash) | `run-3_202403` | — | In the archive's `softwarelibrary_contribs_notworking` collection. |
| Line Rider | `line-rider-flash-game` | — | Multi-SWF capsule with an ambiguous default file. |

**Takeaways from testing:** site-locks (some Nitrome uploads) fire even inside
the archive embed, because archive.org is not the game's home domain; large AS3
builds (BTD5, Red Ball 4) tend to white-screen in Ruffle; and archive items are
sometimes mislabeled or won't launch. So every candidate is opened and watched
before it ships — a `.swf` existing is not enough.

## Licensing note

Every game above is a commercial, copyrighted title — **none is freely
licensed.** They are recorded as `© <developer> — all rights reserved` and are
not redistributed by this project: each streams from the Internet Archive's own
copy via the archive's embed. This repo hosts only the index and the player,
not the games. If a rights holder asks for a title to be delisted, remove its
entry from `games.json`.

## On de-locked builds

This repo's rule is that publisher site-locks are never patched out, and
[README.md](../README.md) says so where it explains why the GameZIP movie keeps
its `blob:` URL instead of being dressed up as its original address.

Checking the shipped trilogy build against that rule on 2026-09-19 found it is
not met for **Bad Ice Cream 1**. Searching the decompressed SWFs:

| file | `navigateToURL` | `;;;igateToURL` | `L;ck` | verdict |
| ---- | --------------- | --------------- | ------ | ------- |
| `Bad_Ice_Cream_1.swf` | **0** | **1** | **1** | byte-patched |
| `Bad_Ice_Cream_2.swf` | 1 | 0 | 0 | clean — no lock in the build |
| `Bad_Ice_Cream_3.swf` | 1 | 0 | 0 | clean — no lock in the build |

Someone overwrote characters in game 1's constant pool — `navigateToURL` →
`;;;igateToURL`, `Lock` → `L;ck` — so the lock call throws instead of firing.
Ruffle prints the wreckage on every play:

```
ReferenceError: Error #1065: Variable ;ock is not defined.
    at com.nitrome.util::L;ck$/urlLock()
```

Games 2 and 3 are not patched; they are builds that never carried a lock, which
is also why game 3 no longer needs an `error` field.

**Resolved 2026-09-22: game 1 ships as-is, knowingly.** There is no unpatched
copy to fall back to — Nitrome is not in Flashpoint at all, `bad_ice_cream` is
a locked build, and `bad_ice_cream_202412` describes itself in its own archive
metadata as "a version with this URL check removed". The choice was an upstream
patched build or no game.

The documentation was corrected rather than the manifest: the no-site-lock rule
now says what it actually covers — that **this player** never spoofs a movie's
URL, rewrites bytes or bypasses a lock — and a new "Builds we did not make"
section in [../README.md](../README.md) records that the provenance of an
archived build is a separate question, with this table as the worked example.
If the call is ever reversed, giving the entry an `error` field takes it off
the wall while keeping it in the catalogue with the reason.

## Snail Bob: one item, eight games

`snail-bob-collection` holds all eight Flash games in the series as separate
`.swf` files, so the whole series shares one `archive.org` identifier and
differs only by `fileArchive` — the same arrangement as the Bad Ice Cream
trilogy item. Every one also has a Flashpoint GameZIP as a fallback.

All eight were checked for the patching that was found in Bad Ice Cream 1:
`navigateToURL` is intact in every file (2 occurrences each), and none contains
`urlLock`, `L;ck` or `;;;igateToURL`. These are unmodified builds.

Stage sizes vary across the series and are **not** guessable — they were read
from each SWF header and confirmed against `player.metadata` in the portal:

| game | SWF | stage | size |
| ---- | --- | ----- | ---- |
| Snail Bob | v9 | 640×480 | 4.33 MB |
| Snail Bob 2 | v10 | 640×480 | 5.70 MB |
| Snail Bob 3 | v10 | **640×520** | 7.42 MB |
| Snail Bob Space | v11 | **640×520** | 6.03 MB |
| Snail Bob 5: Love Story | v14 | **690×460** | 9.52 MB |
| Snail Bob 6: Winter Story | v11 | 690×460 | 9.48 MB |
| Snail Bob 7: Fantasy Story | v11 | 690×460 | 8.25 MB |
| Snail Bob 8: Island Story | v11 | 690×460 | 11.58 MB |

Two notes for anyone extending this:

- **Snail Bob Space is Snail Bob 4.** Flashpoint files it under the name on the
  title screen and lists `Snail Bob 4` / `Snail Bob 4: Space` as alternate
  titles; both are searchable here.
- **Snail Bob 4's GameZIP `entry` is not the launch command.** Flashpoint
  launches it through `SnailBobSpace.html`, a 388-byte wrapper page. Pointed at
  that, `loadGameZip` fails its `CWS/FWS/ZWS` magic check and the whole GameZIP
  attempt is wasted. The zip also contains
  `content/www8.agame.com/mirror/flash/s/SnailBob4/SnailBobSpace.swf`, and
  that is what the entry names. **Check the `entry` whenever a Flashpoint launch
  command ends in `.html`.**

These are Spil-published games and their SDK calls out to Google Analytics on
start; the network policy refuses it, which is visible in
`FlashbackPlayer.blockedRequests()` and is also a convenient proof that the
game's ActionScript really is executing.

## Snail Bob 5–8: the Spil branding gate — SOLVED

**Status: fixed.** All four reach their level maps and play. Kept below because
the dead ends are worth not repeating.

These four are Spil-published and gate their level map behind an in-game-ad
sequence: `MainMenu/onPlayBtnClick` → `SceneManager/showLevelMap` →
`showNewScene` → `checkForShowingIGA` → `BrandingManager/requestOnGameAd` →
`SpilGamesServices/isReady`. That last call needs the Spil SDK to answer.

| attempt | result |
| ------- | ------ |
| The original AVM1 empty stand-in | Errors #2180 and #1069; the throw unwinds `onPlayBtnClick` and the button does nothing |
| An **AS3** empty stand-in | Both errors gone. Play reaches a branding screen, then returns to the menu |
| The real `ServicesConnection.swf` alone, from FW4's GameZIP | No change — still returns to the menu |
| **The archived `api.configar.org` config reply + the SDK** | **Works.** Full branded menu, level map, levels play |

**The config reply was the keystone, not the SDK.** Serving
`api.configar.org/cf/pb/1/settings/0/0/<hash>` is what makes the SDK
initialise — and it also *redirects* the SDK fetch to
`files.cdn.spilcloud.com/flashapi_1_3_1_147/`, which is exactly the path FW4's
GameZIP archived. The hash differs per game (`5486e617…` for Snail Bob 8 vs
`f3eea80c…` for FW4); serving FW4's reply for either works.

Both files are borrowed from **Fireboy & Watergirl 4's** GameZIP through the
new `dependencies` field — see "Borrowing a dependency from another game's zip"
in [../README.md](../README.md). The Snail Bob zips were checked and hold only
the game's own SWF, which is why borrowing was necessary at all.

Verified 2026-09-21: Snail Bob 5 reaches its level map and plays the level 1
cutscene; 6, 7 and 8 all reach their full branded menus with **zero** SDK
requests refused. Snail Bob 1, 2, 3 and Space never had the problem.

### The earlier write-up


**Status: Play reaches a branding screen and returns to the main menu. Not
solved.** Snail Bob 1, 2, 3 and Space are unaffected.

These four are Spil-published and gate their level map behind an in-game-ad
sequence. On Play the game runs
`MainMenu/onPlayBtnClick` → `SceneManager/showLevelMap` → `showNewScene` →
`checkForShowingIGA` → `BrandingManager/requestOnGameAd` →
`SpilGamesServices/isReady`, and that last call needs the Spil SDK, which the
network policy refuses because it is a live call to
`games.cdn.spilcloud.com/sdk/spilapi/1.3.1/ServicesConnection.swf`.

Three things were tried, in order, and the results are worth keeping:

| attempt | result |
| ------- | ------ |
| Nothing — the original AVM1 empty stand-in | Errors #2180 and #1069; the throw unwinds `onPlayBtnClick` and the button does nothing at all |
| An **AS3** empty stand-in (now shipped) | Both errors gone. Play advances to the A10 branding screen, then returns to the menu |
| The **real** `ServicesConnection.swf`, lifted from Fireboy & Watergirl 4's GameZIP (SDK 1.3.1, same version) | No change — still returns to the menu |

So the AVM fix was necessary but is not sufficient: the SDK has to actually
answer, not merely load. The full chain in FW4's zip is five files —
`ServicesConnection.swf`, `BrandSystem.swf`, `ServicePack.swf`,
`flashapi_assets/logos/a10.com.swf` and `BrandLocalization.swf` — and serving
one of them was not enough.

**Why 9o3o gets away with it.** Its player proxies the *whole* Flashpoint
content pool, so any archived Spil file is available to any game. Our GameZIP
serving is per-game, and the Snail Bob zips were checked: **they contain only
the game's own SWF** (`sb5` also carries a Not Doppler mirror of itself; `sb8`
carries nothing else). There is no SDK in them to serve.

Options, none taken yet:

1. Give Snail Bob 5–8 an `error` field, so they leave the wall and say why —
   honest, and consistent with how other blocked games are handled.
2. Build a small shared "SDK shelf": a declared set of archived dependencies
   any entry can borrow, sourced from FW4's GameZIP. Closest to what 9o3o
   does, but it means downloading another game's zip to play this one, and it
   is speculative until the whole five-file chain is tried.
3. Leave them as they are — playable up to the branding screen, which is worse
   than either of the above because nothing explains it to the visitor.

## Does any other game need the borrowed Spil SDK?

Checked on 2026-09-21 by decompressing **every** archive-streamed SWF in the
catalogue and searching for the SDK's own strings, then confirming the
suspicious ones at run time. The answer is **no**.

| game | `configar` | SDK strings | needs `dependencies`? |
| ---- | ---------- | ----------- | --------------------- |
| Fireboy & Watergirl 4 | yes | yes | **no** — its *own* GameZIP carries the SDK |
| Snail Bob 5, 6, 7, 8 | yes | yes | **yes** — already fixed |
| Earn to Die 2012: Part 2 | yes | yes | **no** — see below |
| Earn to Die 2: Exodus | yes | yes | **no** — see below |
| Snail Bob 1, 2, 3, Space | **no** | partial | no |
| everything else (26 games) | no | none | no |

Two findings worth keeping:

- **String presence is not use.** Both late Earn to Die games contain the full
  Spil SDK chain — `api.configar.org`, `ServicesConnection`, `spilapi`,
  `BrandSystem` — but they are **Not Doppler** builds and never execute that
  path. Loaded and played past their menus, they request the SDK **zero**
  times; the only refusals are MochiBot, a Not Doppler banner and Google
  Analytics. Dead code from a shared codebase.
- **`configar` is the tell, not `ServicesConnection`.** Snail Bob 1, 2, 3 and
  Space reference `ServicesConnection` and `SpilGamesServices` but have no
  `api.configar.org` string — and they were never broken. The config service
  is what the gating branch depends on, which matches what the fix showed: the
  config reply, not the SDK movie, is the keystone.

So `dependencies` stays on exactly the four Snail Bob entries that need it.

## Added 2026-09-21

**Henry Stickmin (5)** — all from one archive item,
`henry-stickmin-swf-files`, whose `Stickpage/` folder holds the original
builds matching Flashpoint's launch commands. Each also has a GameZIP. Note
these get big fast: Infiltrating the Airship is 28 MB and Fleeing the Complex
33 MB, which are the two largest single SWFs in the catalogue.

**The Fancy Pants Adventures (7 new, 8 total)** — World 2 and World 3 from
`fancypants_201911`; World 4 Part 3, World 1 Remix!, The Cutie Pants
Adventures and Fancy Box from their GameZIPs (each is a small preloader plus
the levels as separate SWFs, so the whole zip has to be served — 23, 29, 4 and
21 entries respectively); Fancy Snowboarding from `fancysnowboardinggame`.

**Vex (2 new, 3 total)** — Vex 1 and Vex 2 from `vex-flash-game-series.`
(note the trailing dot in the identifier; it survives `encodeURIComponent`
and `/cors/` serves it fine). **Vex 4, 5, 6, 7 and Vex Challenges are HTML5**
and cannot be added.

**Bad Piggies (2)** — the plain Flash build from `bad-piggies-flash-2`, and
Bad Piggies Build from its GameZIP.

Not added, and why:

| game | reason |
| ---- | ------ |
| FPA World 4 parts 1 and 2 | **SOLVED 2026-09-22** — both are in Flashpoint's Htdocs tree (`Htdocs_4.zip`), not GameData. See "Fancy Pants World 4, parts 1 and 2" below. |
| FPA Sneak Peek, World 2 Demo | Demos — Flashpoint tags them `Trial` and `Incomplete`. |
| 3 further World 1 Remix uploads | Duplicates of the one shipped; one is `Partial`. |
| Vex 4–7, Vex Challenges | HTML5. |

**Bad Piggies Build is a judgement call.** It plays — 1040×480, verified — but
Flashpoint archived it as **737 files, 296 MB compressed and 306 MB
uncompressed**, all of which `loadGameZip` inflates into memory before the
first frame. It is by far the heaviest thing here and the description says so.
It is shipped rather than errored because it genuinely works, but dropping it
would be defensible.

All sixteen were checked for the patching found in Bad Ice Cream 1: every one
has `navigateToURL` intact and none contains `urlLock`, `L;ck` or
`;;;igateToURL`.

## Flashpoint sources: a second sweep (2026-09-22)

Went back over every entry that had no `fileFlashpointArchiveZip`. Flashpoint's
database has a `zipped` flag that says which of its two storage shapes a game
uses, and asking it first turns the search from guesswork into a lookup.

| game | `zipped` | outcome |
| ---- | -------- | ------- |
| Interactive Buddy | true | GameZIP in `GameData_23.zip` |
| The Fancy Pants Adventures: World 1 | true | GameZIP in `GameData_11.zip` |
| Interactive Buddy 2 Prototype | true | GameZIP in `GameData_25.zip` (added, then dropped — see below) |
| The Insanity Box | false | **Htdocs_4.zip** — now playable |
| The Insanity Box 2 | false | **Htdocs_4.zip** — now playable |
| Bad Piggies | false | Htdocs_3.zip |
| MotherLoad | false | Htdocs_6.zip |
| Effing Worms | false | Htdocs_3.zip (also a hacked mirror in Htdocs_5) |
| Fancy Snowboarding | false | Htdocs_2.zip |

Indexing all six Htdocs parts cost ~210 MB of central-directory reads and found
1,037,038 entries; the lists are cached in `tools/.fp-index/` alongside the
GameData ones.

**Still with no Flashpoint source, and why:**

| game | reason |
| ---- | ------ |
| Bad Ice Cream 1, 2, 3 | **Nitrome is not in Flashpoint.** A developer search returns a single unrelated entry. Nitrome asked for removal, so these have no Flashpoint UUID, no GameZIP and no Htdocs copy — there is nothing to find. |
| Fireboy & Watergirl 5: Elements | HTML5. A GameZIP *does* exist (`GameData_23.zip`) but pointing at it would only make Ruffle fail on a non-SWF, so it is deliberately left off. |
| Fireboy & Watergirl 6: Fairy Tales | HTML5, and in no mirror at all. |
| Red Ball ×6 | Skipped at the maintainer's request, and since removed from the catalogue. |

**Other Flashpoint versions were checked and cannot be used.** Flashpoint 9.0,
11 and 11.1 Ultimate are all mirrored on archive.org, but as `.7z`, `.tar.gz`
or `.rar`. Archive.org's single-file extraction only works on `.zip`, so
`Flashpoint13.0` and `Flashpoint13.0_part2` remain the only addressable
mirrors. Nothing is gained by looking at the older ones.

**Interactive Buddy 2 was added and then dropped.** Worth recording so nobody
re-researches it: the only Flash "Interactive Buddy 2" that exists is Shock
Value's own prototype — the finished sequel shipped on iOS only. Flashpoint
calls it "Interactive Buddy 2 Prototype Version" and tags it `Incomplete` /
`Trial`. It is reachable and it does play (800×450, SWF 10, verified), from
either `interactive-buddy-2-prototype-version` on archive.org or its GameZIP in
`GameData_25.zip`. It is off the wall because it is a prototype, not because it
could not be found.

## Fancy Pants World 4, parts 1 and 2 (2026-09-22)

Previously recorded as unfindable — "in neither the Flashpoint mirror nor
archive.org". That was half right and it cost a game. Both are in Flashpoint's
**Htdocs** tree, which had not been indexed when the earlier search ran.

| part | Flashpoint `zipped` | where it actually is |
| ---- | ------------------- | -------------------- |
| Part 1 | **true** | Its GameZIP is genuinely absent from the GameData snapshot — re-checked, still not there. But a Newgrounds upload of the same game sits in `Htdocs_4.zip` at `…/uploads.ungrounded.net/750000/750785_fpaworld4p1.swf`. |
| Part 2 | false | `Htdocs_4.zip` at `…/uploads.ungrounded.net/752000/752737_fpaworld4p2.swf` — an exact match for its launch command. |

**Part 1 is worth understanding before touching it.** Its Flashpoint entry
(`1227d57e-…`) launches `game317656.konggames.com/…/Preloader.swf`, a
Kongregate preloader that streams its data from a host that no longer answers,
and that entry is `zipped: true` so its content is not in Htdocs under the
Kongregate address — searching the index for `konggames` finds 3,682 files,
none of them this game. The file we serve is the **Newgrounds release of the
same game**, which is in Htdocs even though *no Flashpoint entry points at it*
(a `launchCommand` search for `750785` returns nothing). It is a self-contained
25 MB SWF that needs no preloader, which is exactly why it works where the
Kongregate build cannot.

The entry still links the Flashpoint page for `1227d57e-…`, because that is the
catalogue entry for this game; the bytes are a different release of it.

Both verified: CWS v43, 800×525 — the same stage as Part 3 — 25.25 MB and
32.64 MB, `navigateToURL` intact, no `urlLock`, no patched identifiers, and
both play with **zero** refused requests.

The series is now complete on this site: Worlds 1, 2, 3, all three parts of
World 4, World 1 Remix, The Cutie Pants Adventures, Fancy Box and Fancy
Snowboarding. What remains unadded are the demos (Sneak Peek, World 2 Demo —
tagged `Trial` and `Incomplete`) and three duplicate World 1 Remix uploads.
