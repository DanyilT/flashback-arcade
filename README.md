# Flashback Arcade

A static Flash-game portal built like the old game walls: a dense grid of
small, unlabelled icons that fills the whole screen, a name that appears when
you hover, and a game that opens *inline* — the wall parts around it rather
than taking you to a new page. It is dressed in circa-2010 "web 2.0" chrome:
glossy orange and yellow gradients, lopsided border-radii and generous drop
shadows. Games are emulated in the browser by [Ruffle](https://ruffle.rs), so
there is no plugin and nothing to download.

**No build step.** Hand-written HTML, CSS and vanilla JS. Serve the folder
as-is and it works. There is no npm and no bundler; the Ruffle emulator is
loaded from unpkg (`https://unpkg.com/@ruffle-rs/ruffle`). (The shipped games are
copyrighted, so rather than bundle them this site streams each one from the
Internet Archive at run time — see "Archive-streamed games" below.)

The whole catalogue is driven by one file, `games.json`. **Adding a game means
dropping in two files and adding one JSON entry. You never touch the code.**

---

## Run it locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Any static server works (`npx serve`, `php -S localhost:8000`, nginx, Caddy…).

> **You must use a web server.** Opening `index.html` directly as a `file://`
> URL will not work: browsers block `fetch()` of `games.json` and refuse to
> load the Ruffle WASM module from the filesystem.

### Confirming Ruffle loads

Ruffle comes from unpkg, so its `.wasm` MIME type is unpkg's problem rather
than your server's. Check the browser console on a game page for:

```
New Ruffle instance created (Version: 0.6.0+… | Used renderer: wgpu-webgl)
```

If it never appears, the CDN is unreachable (offline, blocked, or an outage)
and **no game will run** — that is the trade for not vendoring it. See "About
Ruffle" below.

---

## How the wall works

- **The wall** is every game at once, as small square icons packed tightly
  together. Each tile is built from the game's official logo art, hotlinked by
  URL and composited in CSS — see "Tile art" below. Icons carry no captions —
  the art is the label. Order is reshuffled on every page load.
- **It fills the screen, and fits on it.** The space left after the header,
  the filter strip (when showing) and the footer is measured on every layout,
  and the grid is sized to end exactly where the footer begins. With fewer
  games than cells, games repeat until the grid is full — and because the
  point of padding is to look full, **a padded wall never scrolls**: rows are
  sized to divide the available height exactly. Opening a game shrinks the
  stage to fit rather than pushing the page over the fold.
- **When it genuinely does not fit, it scrolls.** If the catalogue is larger
  than the screen, or the panel needs more room than there is, nothing
  repeats, cells go back to being properly square, and the wall scrolls
  normally.
- **Repeats never count.** "GAMES ONLINE" always reports distinct games, and
  filtering shows exactly the matches with no padding — padding a deliberately
  narrowed result would be misleading.
- **What gets the space when there isn't enough.** The wall holds only so many
  icons, and far fewer with a game open, so the order of the list decides what
  survives. One rule does both jobs: deal the games out **one series at a
  time**, round-robin, and let the series that gained a game most recently
  deal first. Six Snail Bobs in a row would eat the wall and hide six other
  games; dealing a card from each series in turn means every series is on
  screen before any series repeats, so in practice the first dozen icons are a
  dozen different series. A **new arrival** (anything carrying an `added` date)
  still surfaces at the front, because its series deals first and it is the
  first card out of that series. Order is still shuffled inside all of that, so
  the wall looks different on each load.
  - This used to be two passes — new arrivals, then the round-robin — and that
    worked right up until a batch of new arrivals was all **one** series.
    Adding the fourteen Papa's games in a single day handed that series the
    entire top of the wall, which is the exact thing the round-robin exists to
    prevent. Sorting the buckets instead of prepending a list fixes it without
    a second rule.
- **Hovering** an icon names it in the black readout in the top bar
  (title · author · year) and shows a small label above the icon itself.
- **A game that cannot be played here is kept off the wall.** It does not
  appear among the icons and is not counted in "GAMES ONLINE" — that number
  means games you can actually play. It *is* listed in the catalogue (`?all=1`),
  where the point is to show the whole collection: greyed, badged, with the
  reason on hover. Opening one (the catalogue links straight to it) still works
  and shows the reason above the credits. That is the `error` field — for a game
  that *loads* and then refuses, like a publisher's URL-lock, which nothing in
  the code can detect because the SWF runs perfectly well.
- **Clicking** an icon opens the game *in place*: a panel is planted in the
  middle of the grid and the remaining icons repack around it. The stage always
  takes the **full height** the page can give it without scrolling, and the game
  is scaled to the largest size that fits and **centred both ways**, so the view
  is as large as the screen allows; underneath it sit the credits, licence,
  series and tags, description and controls. Everything happens on the home page
  — there is no separate player page.
- **The URL follows along.** Playing a game sets `#play=<id>`, so links are
  shareable and the browser's back button closes the game. A ctrl/cmd-click on
  an icon opens that same `index.html#play=<id>` in a new tab.
- **Focus.** The panel's title bar has a **⤢ Focus** toggle that strips the page
  down to the game: the site header, the filter strip and the footer are hidden,
  and so are this game's credits, tags and blurb — leaving the stage and its own
  title bar, with the stage taking every pixel they were using. It still fits on
  screen without scrolling, and it keeps the game's aspect ratio, so the panel
  is only as wide as the game needs: a portrait or square game leaves side
  columns free for icons rather than being letterboxed inside a full-width
  panel. **⤡ Unfocus** brings the page back.
- **The game always sits dead centre.** The panel takes an even number of
  leftover columns so the icon strips on its left and right are the same width.
  When that count comes out odd the panel takes one column **more**, never one
  fewer: the width is already the minimum the game needs to use the full height
  on offer, so shaving a column would make it width-bound and it would stop
  filling the panel vertically.
- **The panel hugs the game.** Columns are whole cells, so the span is almost
  always a little wider than the game needs. That slack is put *outside* the
  panel — as a gap between the game and the surrounding icons — rather than
  left inside it as dead bands around the stage. `placePanel` measures the game
  across the full span first, then pins the panel's width to the game plus its
  own chrome and centres it with auto margins. Order matters: an auto margin on
  a grid item cancels `stretch`, so a panel carrying those margins from the
  start would shrink to its content and the game would be sized from *that* —
  smaller on every pass. The margins go on last, and `fitStage` strips them
  before it measures anything.

  The pin **iterates to a fixed point**, up to three passes. Narrowing the panel
  rewraps the credits and blurb onto more lines, which costs height, which
  shrinks a height-bound game, which then wants a narrower panel again. The game
  only ever gets smaller, so it settles; a single pass left one stage 46px
  adrift of its frame.
- **Filling the stage comes first; the bands are what is left.** The game takes
  all the height or all the width it can — whichever runs out first — and only
  the remainder becomes icons. So a wide screen usually gives a full-height game
  with icons down each side and none above or below, while a narrow one gives a
  full-width game with icons above and below. Rows left spare are **split top
  and bottom** rather than piling up underneath, so the game sits *in* the wall
  rather than on top of it. An odd spare row goes below.
- **The catalogue (`?all=1`) is sorted; the wall is not.** They answer
  different questions — the wall is for browsing, the catalogue is for finding
  — so the catalogue is ordered **by family, A–Z**: the series if a game has
  one, the title if it does not. That keeps a series whole and in one place,
  so Fancy Box and The Cutie Pants Adventures sit with the Fancy Pants worlds
  instead of filing under F and C, while standalone games slot in
  alphabetically between the families. A leading "The " is ignored for
  sorting, the usual library convention. Inside a family: release **year**,
  then title — the year rather than the full date because `2020` and
  `2020-03-24` are both real values here and comparing them as strings puts
  the vaguer one first. That gives story order for Henry Stickmin and numeric
  order for the Fancy Pants worlds.

  **`games.json` is not sorted to match, on purpose.** The file keeps its
  hand-authored grouping, which is what makes it readable and its diffs small;
  the ordering is done at render time, so changing your mind costs one
  function and no churn.

- **Suggesting a game.** The top bar carries a **+ Suggest a game** link to a
  Google Form, on the wall and in the catalogue both. It sits *beside* the
  readout rather than inside it, because the readout's text is rewritten on
  every hover and would take the link with it.

- **There is no search bar**, in keeping with the era. Just start typing and a
  filter strip appears; `Esc` dismisses it. `Esc` again closes the open game.
  While the game has the keyboard this is suppressed, so WASD/arrows/space go
  to the game instead of the filter — opening a game focuses its stage, and
  `Esc` still gets you out.
- **Fullscreen.** The panel's title bar also has a **⛶ Fullscreen** button. It
  calls **Ruffle's own fullscreen** — the same thing its right-click "Enter
  fullscreen" does — so Ruffle scales its own stage and the keyboard stays with
  the game; clicking again exits.
- **"Show All Games."** A button in the top bar switches to a plain labelled
  catalogue at `?all=1` — every game exactly once (no duplicate-fill), titled,
  filterable. Clicking one returns to the wall with that game open. Meant for
  browsing/checking the full list at a glance; "‹ Back to the wall" returns.
- **Tag filter.** The catalogue carries a row of every tag in the catalogue,
  between the top bar and the search strip. It is deliberately **one line that
  scrolls sideways**, so a long tag list never pushes the games down the page,
  and "All" stays pinned at its left. Picking several tags **narrows** — a
  game must carry all of them — and it combines with the text filter. The tag
  chips under an open game link straight here via `?all=1&tag=<tag>`, so a tag
  is a way to find more of the same rather than just a label. The state is
  mirrored into the query string (`?all=1&tag=…&tag=…&mode=…&q=…`, via
  `replaceState` so chips do not pile up history entries), so a filtered view is
  shareable and survives a reload — and that is how a series chip hands its
  whole series over.
- **Play modes are their own thing.** `Single Player`, `Cooperative` and
  `Multiplayer` live in `playModes`, not in `tags`, because they answer a
  different question: not what kind of game it is, but who can play it. They are
  tinted green wherever they appear, sit **after** the genre tags — behind a
  divider in the filter row, since there are only two or three of them and they
  would be lost sorted in among fifty genres — and filter through `?mode=`.
- **Saved progress.** Games remember your progress (see "Saved progress" below).

---

## Adding a game, step by step

### 1. Verify the license first — before anything else

**Do not add a game unless you have confirmed you are allowed to host and
redistribute it.** Most Flash games from the 2000s are still under full
copyright, and "it was free to play on a portal" is *not* a license to
rehost it.

Add a game only when at least one of these is true:

- it is released under an open license (CC0, CC-BY, MIT, …), or
- it is explicitly public domain, or
- the copyright holder has given you written permission.

Save the proof — a license page, a README in the original download, an
archived page, or an email. For a streamed game the provenance is already
recorded by `archive.org`, `flashpointarchive.org` and `origin`; for a local file,
keep your evidence to hand. If you cannot point at evidence, do not add the
game. Every game shows its
license while it plays, so an entry with no verifiable license is a claim you
cannot back up.

### 2. Drop in the files

```
games/your-game.swf      the game itself
thumbs/your-game.png     a square icon (SVG, PNG or JPG; ~200×200 is plenty)
```

Icons are drawn at roughly 68px on the wall, so treat them as **artwork, not
labels** — bold shapes and strong colour read well, small text does not. The
thumbnail is optional: entries without a `thumb` fall back to
`assets/placeholder.svg`, and a `thumb` path that 404s falls back to the same
placeholder at runtime.

### 3. Add one entry to `games.json`

`games.json` is a single JSON array. Append an object:

```json
{
  "id": "your-game",
  "title": "Your Game",
  "fileLocal": "games/your-game.swf",
  "thumb": "thumbs/your-game.png",
  "author": "Someone",
  "releaseDate": "2004-03-17",
  "license": "CC-BY-4.0",
  "dimensions": { "w": 800, "h": 600 },
  "description": "One or two sentences about the game.",
  "tags": ["puzzle", "singleplayer"],
  "controls": [
    { "key": "Arrows", "action": "Move" },
    { "key": "Space", "action": "Jump" }
  ]
}
```

That's it. Reload the page — the wall, the counter and the filter pick it up
with no code changes.

### 4. Check it

Load the home page, type part of the title to find it, click the icon, and
confirm the game actually runs and the license shows correctly.

---

## `games.json` fields

| Field         | Required | Notes |
| ------------- | -------- | ----- |
| `id`          | **yes**  | URL-safe slug. Used as `#play=<slug>` in the wall's URL. Must be unique. |
| `title`       | **yes**  | Shown on hover and on the player panel. |
| `preferSource` | no       | Which source to try first — any one of the four field names below. Without it the order is **fileLocal → fileArchive → file → fileFlashpointArchiveZip**: cheapest and most predictable first, the GameZIP last because it is a multi-megabyte download. Whichever is first, each falls through to the next if it cannot run. |
| `alternateTitles` | no   | Other names the game shipped under. Searchable. |
| `series`      | no       | e.g. `Fireboy and Watergirl`. Shown as the first chip under the open game (tinted blue, not a tag), linking to `?all=1&q=<series>` — and searchable, so that pulls up the whole series. A tag identical to the series name is dropped rather than printed twice. |
| `developer`   | no       | From the Flashpoint entry, and what the credits line shows (`by …`), trimmed to the first name of each `;`-separated credit with the full string in its tooltip. `author` is the short name used in the hover readout, and the fallback when there is no `developer`. Both are searchable. |
| `releaseDate` | no       | Full date from Flashpoint (`2012-04-05`, or just `2012`). Shown in the credits line as `5 Apr 2012`, and **the only place a year is stored** — the hover readout and catalogue subtitle take the year off the front of it. |
| `added`       | no       | ISO date this game was added to the **site** (not released — that is `releaseDate`). Games carrying one go to the front of the wall, newest first, so a returning visitor sees what is new without hunting. Optional and sparse by design: an entry without it is not treated as old, it just gets no boost. |
| `screenshot`  | no       | Flashpoint's screenshot URL, derived from the entry UUID. |
| `fileLocal`   | one of the four | Path to a `.swf` in this repo, relative to the site root. **First choice by default.** |
| `archive.org` | no       | Internet Archive **item identifier** — the `<id>` in `archive.org/details/<id>`. It is the item, not a file: everything else about the archive copy is derived from it. The licence line links to `archive.org/details/<id>`, a missing `thumb` falls back to `archive.org/services/img/<id>`, the playable stream is built as `archive.org/cors/<id>/<fileArchive>`, and if the game cannot be run here at all the failure notice offers the item page as a link out. |
| `fileArchive` | one of the four | Just the **filename** of the `.swf` inside the `archive.org` item (`FireBoyAndWaterGirl.swf`), not a URL — the player builds `archive.org/cors/<item>/<filename>` from the two. `/download/` sends no CORS headers, `/cors/` does. **Second choice by default.** |
| `thumb`       | no       | Icon URL (or local path). Drawn **twice**: blurred and scaled to cover, as the tile's colour wash, and — unless `thumb2` is set — sharp and contained on top. Any shape works; see "Tile art" below. On error it falls back to the archive's own item image (`https://archive.org/services/img/<archive>`), then `assets/placeholder.svg`. |
| `thumb2`      | no       | A second icon URL, drawn sharp in front of `thumb`'s blurred wash. Use it when the release you actually play has only a wide banner logo but another release of the same game has a squarer one: put the square one in `thumb` and the release-accurate art in `thumb2`. |
| `author`      | no       | Shown in the hover readout and the credits line, searchable, and **the licence is derived from it**: `© {author} — all rights reserved`. An entry may still carry its own `license` string and it wins — necessary the day one of these is CC0 or public domain, when claiming "all rights reserved" would be false. |
| `file`        | one of the four | A `.swf` URL on **any other host**, loaded as-is. That host must grant us CORS, which almost none of the surviving game portals do — this exists for a server you control. **Third choice by default.** |
| `flashpointarchive.org` | no | The game's [Flashpoint Archive](https://flashpointarchive.org) entry UUID. Both links are derived from it: the catalogue entry (`flashpointarchive.org/view?id=…`) and Flashpoint's own player (`ooooooooo.ooo/?id=…`, "9o3o"), which opens in a new tab — see "Two archives" below. |
| `origin`      | no       | URL of the page the game was **first published** on (Kongregate, Miniclip, Not Doppler…). The strongest licence provenance; taken from the Flashpoint entry's own `source`. |
| `fileFlashpointArchiveZip` | one of the four | `{ item, zip, path, entry? }` — "inside `zip`, at `path`", on the Flashpoint mirror. Covers **both** ways Flashpoint stores a game. **With `entry`:** `path` is a nested GameZIP, fetched and unzipped in the browser *whole* — the only source that can carry a game's dead dependencies (see "A GameZIP is not one file"). **Without `entry`:** `path` is the `.swf` itself, in Flashpoint's `Legacy/htdocs/` tree; archive.org extracts that one file and it streams like any other movie (see "Htdocs: the games Flashpoint does not zip"). **Last choice by default.** Generate the block with `tools/find-flashpoint-zip.py`. |
| `dependencies` | no | `{ item, zip, path, note?, map }` — borrow archived files from **another game's** GameZIP. `map` is a list of `["request substring", "entry inside that zip"]`, first match wins, and only the mapped entries are inflated. For a game whose own zip does not carry the SDK it needs; see "Borrowing a dependency". |
| `dimensions`  | no       | `{ "w": 550, "h": 400 }` — the SWF's **real stage size**, which is load-bearing, not a note: it sets the stage's aspect ratio and decides how many grid columns the panel spans, and it must be known *before* the SWF downloads. Default `640×480`. See "Why `dimensions` must be the SWF's real stage size". |
| `error`       | no       | Why this game **does not work here**, in a sentence shown to the visitor. The entry is dropped from the wall and from the "GAMES ONLINE" count, and appears only in the catalogue (`?all=1`) — greyed, with a red badge and the reason as its tooltip. Opened from there, the sentence appears in whichever place makes sense: **on the stage** if the game never loaded (replacing the maintainer-facing "no playable source" text, which helps a player not at all), or **above the credits** if it loaded and then refused — a publisher's URL-lock, which `mount()` cannot detect because the SWF runs perfectly and simply shows a lock screen. Never both. |
| `description` | no       | Short blurb; also searchable. |
| `tags`        | no       | Array of Flashpoint's **genre** tags (`Platformer`, `Box2D`, `Officially Licensed`…). Shown as amber chips under the open game, used by the catalogue's tag filter, and searchable. Play modes live in `playModes`, not here. |
| `playModes`   | no       | Array of Flashpoint's **Play Mode** values (`Single Player`, `Cooperative`, `Multiplayer`). Kept apart from `tags` because it answers a different question — who can play it, not what kind of game it is. Shown as green chips after the tags, filtered by `?mode=`, and searchable. |
| `controls`    | no       | Array of `{ "key": "...", "action": "..." }`. Renders a Controls table. Omit the field and the whole section disappears. |

The filter matches `title`, `author`, `tags` and `description`, and requires
every typed word to appear somewhere in the entry.

---

## Archive-streamed games (no game files stored here)

Most real Flash games are copyrighted and cannot be redistributed. Rather than
host them, this site **streams them from the Internet Archive**, which keeps its
own preservation copies, and runs them in its own Ruffle. An entry with an
`archive.org` field is played from `https://archive.org/cors/<id>/<file>`:

```json
{
  "id": "bloxorz",
  "title": "Bloxorz",
  "archive.org": "flash_bloxorz",
  "fileArchive": "flash_bloxorz.swf",
  "thumb": "https://archive.org/services/img/flash_bloxorz",
  "author": "Damien Clarke", "year": 2007,
  "license": "© Damien Clarke — all rights reserved",
  "width": 640, "height": 480,
  "description": "…", "tags": ["puzzle", "logic"]
}
```

### How an archive game is played: `/cors/`, in our own Ruffle

The archive's `/download/` path sends no `Access-Control-Allow-Origin`, so a
cross-origin `fetch()` of the `.swf` is blocked — which is why this once framed
the archive's player instead. But archive.org also publishes a **CORS-enabled**
path for exactly this purpose:

```
https://archive.org/cors/<identifier>/<filename>     ← sends CORS, fetchable here
https://archive.org/download/<identifier>/<filename> ← blocked, no ACAO
```

Verified against the whole catalogue: every game returns a valid `CWS`/`FWS`
SWF to this origin, and every one loads in Ruffle with no panic. Nothing is
redistributed: the file streams from the archive on demand.

**There is no iframe fallback, deliberately.** Framing `archive.org/embed/<id>`
when our own Ruffle failed used to be the last resort, and it was removed: it
loads the archive's entire player page — their scripts, their assets, their
origin — and hands the visitor's IP and referrer to a third party without
asking. It is also a separate browsing context, so the network policy below
cannot see into it, let alone constrain it. A game that will not start now says
so and offers a link the visitor can *choose* to follow (`failureNode`).

Running the game ourselves is better than framing it anyway:

- **No distortion.** Ruffle draws the vectors itself at device resolution,
  instead of the archive CSS-stretching a fixed canvas with nearest-neighbour
  scaling (which is what warped the picture and its "ghost" start button).
- **Sound works.** Same-origin, so there is no nested cross-origin frame to
  inherit a muted autoplay policy from; `unmuteOverlay: "visible"` gives the
  visitor the one click that turns audio on.
- **We control it** — scale, letterboxing, context menu, fullscreen.

### The stage loader, and whose loading screen is whose

Every game here arrives over the network at the moment it is clicked — 0.7 MB
to 16 MB of it — and a Flashpoint GameZIP is then unpacked in the page on top
of that. The stage used to sit black through all of it, which reads as a broken
game rather than a busy one.

`stageLoader()` covers exactly that window, in three phases:

| phase | shown while | source of the numbers |
| ----- | ----------- | --------------------- |
| **Fetching the game** | the movie or GameZIP is downloading | `Content-Length` when the server sends one; otherwise a sweeping bar and a running byte count |
| **Unpacking the game** | GameZIP entries are inflating | *n* of *N* files |
| **Starting the emulator** | Ruffle has the bytes, no stage yet | — |

**This is not the game's own loading screen, and the two never overlap.** The
game's belongs to the game, is the author's work, and only runs once the movie
is executing. Ours is the site's, runs before the movie exists, and is removed
the instant `player.metadata` appears — which is precisely the moment Ruffle
has a stage and the game takes over.

Two things that are easy to get wrong here, both found by getting them wrong:

- **Ruffle fetches the movie itself**, so the only place to count its bytes is
  inside the network policy's `fetch` wrapper — `countingResponse()` re-streams
  the response on the way past. It must copy `res.url` onto the new `Response`,
  for the same reason `standIn()` does (see the `tag_utils.rs:241` note).
- **`load()` resolves long before the movie has arrived.** Flash streams, so a
  4 MB game settles `load()` at maybe 15% downloaded. Hiding the loader on a
  plain deadline from that point handed the stage to Ruffle's own generic
  spinner mid-download. The loader now gives up only after
  `RUFFLE_TIMEOUT_MS` of **silence** — a download still delivering bytes is not
  a stuck one.

A `blob:` movie (a GameZIP just unpacked) is deliberately *not* byte-counted:
the bytes are already in memory, and reporting that instant local copy would
overwrite the honest "Unpacking"/"Starting" text with a download that had
already finished.

A last thing worth knowing when a game looks slow: **the game's own loading bar
is not necessarily measuring anything.** Every Papa's game opens on a Flipline
house advert with a bar under it that takes roughly half a minute to fill and
then offers CONTINUE — and it fills at about the same rate whether the movie is
2.8 MB or 20 MB, because it is a timed animation rather than `bytesLoaded`.
Ours is long gone by then; it left the moment Ruffle had a stage. So most of
the wait a visitor sees there is the author's, and there is nothing on this
side to tune.

### Two archives, two jobs (archive.org vs Flashpoint)

Both archives matter, for different reasons, and the split is forced by what
each one's servers allow — not by preference:

|                          | archive.org                         | Flashpoint Archive |
| ------------------------ | ----------------------------------- | ------------------ |
| Can be embedded inline?  | Yes — `/embed/<id>` sets no `frame-ancestors` — but this site does not, on purpose (see above) | **No** — its player `ooooooooo.ooo` answers `X-Frame-Options: DENY` |
| Fetch the raw file ourselves? | **Yes, via `/cors/`** (see above) — which is how games are actually played here | No — `download.unstable.life` grants CORS only to `https://ooooooooo.ooo` |
| Metadata                 | thin                                | **Excellent** — curated developer, publisher, release date, original URL, playability status, "Officially Licensed" tag |
| Catalogue size           | smaller Flash collection            | **Far larger** |

So: **archive.org is the player, Flashpoint is the catalogue.** Every playable
entry needs an `archive.org` id; `flashpointarchive.org` and `origin` add the provenance and a
link out.

**Why not run Flashpoint's games in our own Ruffle?** It was investigated and it
does not work. Their player exposes the game's real location, e.g.
`data-game-zip="https://download.unstable.life/gib-roms/Games/<uuid>-<dump>.zip"`
and `data-legacy-server="…/Flashpoint/Legacy/htdocs"`, but three things block it:

1. **Their CDN allowlists their own player, and only that.**
   `download.unstable.life` answers an `Origin: https://ooooooooo.ooo` with
   `access-control-allow-origin: https://ooooooooo.ooo`, and any other origin
   with no ACAO at all. So the browser blocks our `fetch()` by their deliberate
   choice, not by oversight. Being added to that allowlist is Flashpoint's call
   to make, and spoofing the header from a proxy would be circumventing an
   access control and leeching donated bandwidth — don't.
2. **`launchCommand` is a key, not a URL.** It looks fetchable
   (`http://chat.kongregate.com/gamez/.../FireBoyAndWaterGirl_Kong.swf`) but
   9o3o never loads it from Kongregate. The GameZIP mirrors the original host
   and path inside itself — that exact file is entry
   `content/chat.kongregate.com/gamez/0006/3684/live/FireBoyAndWaterGirl_Kong.swf`
   — and the player resolves the launch command against that tree. (The
   original URL does happen to still be live and serves the identical 1,856,060
   bytes, but it sends `access-control-allow-methods`/`-headers`/`-expose-headers`
   while omitting `Access-Control-Allow-Origin`, so it is CORS-readable by
   *nobody* — not us, not 9o3o, not kongregate.com itself.)
3. **It is not a bare SWF, and it has runtime assets.** Every game here is a
   GameZIP (3.7 MB for Fireboy 1), needing in-browser unzipping — a dependency
   this project does not have — and `data-legacy-server` exists because these
   games fetch further assets at run time from their original hosts, which needs
   the same path-mirroring proxy. That is a launcher, not a link.

There is also a courtesy reason: Flashpoint already blocks browser hotlinking on
`infinity.unstable.life` (an `<img>` to a logo fails where `curl` succeeds), and
the zip URL embeds a dump timestamp that changes on every re-dump. Streaming
multi-megabyte zips off their donated bandwidth would be both rude and fragile.
archive.org, by contrast, publishes its embed for exactly this purpose.

To play a game from a file in this repo, use the `fileLocal` field with a file
you are allowed to host — that code path already exists.

Note: **Bad Ice Cream has no Flashpoint entry at all** (Nitrome's games are
absent), which is of a piece with their SWFs being URL-locked.

### Playing Flashpoint's build (via the archive.org mirror)

Sometimes archive.org's copy of a game is a bad build — Fireboy & Watergirl 4's
Kongregate upload loads fine but hangs waiting on a long-dead ad service, while
Flashpoint's build of the same game works. Flashpoint's own CDN cannot help us
(it grants CORS only to its own player), **but the whole Flashpoint collection
is mirrored on archive.org**, and archive.org will extract a single file from
inside a zip:

```
https://archive.org/cors/Flashpoint13.0/GameData_1.zip/<path inside the zip>
```

That returns just the game's GameZIP — a couple of MB, not the 53 GB part it
lives in — with CORS. No range requests, no proxy, no server. `js/player.js`
then unzips it with the browser's own `DecompressionStream`, pulls out the SWF
and hands Ruffle a `blob:` URL. The GameZIP mirrors the game's original host and
path under `content/`, which is exactly what Flashpoint's launch command points
at, so `entry` names the file to run.

To add a game this way, resolve its Flashpoint UUID:

```bash
python3 tools/find-flashpoint-zip.py e0059b62-ad8a-4d5e-bdc9-c59acffc954e
```

It prints the `fileFlashpointArchiveZip` block to paste into `games.json`.

**Check the platform before you go looking.** A Flashpoint entry is not
necessarily a Flash game — the later ones are often **HTML5**, and Ruffle
cannot run those whatever you do with them. The entry page states
`Platform: HTML5` and gives a launch command that is a *page* rather than a
`.swf`; the resolver prints the platform in brackets too. Fireboy & Watergirl
5 and 6 are both HTML5, which is why they are not in this catalogue — see
[`research/archive-flash-games.md`](research/archive-flash-games.md).

And the mirror is a snapshot, so a game can simply be absent: FW6's GameZIP is
in none of the 25 parts, and Flashpoint's own CDN grants CORS only to its own
player, so there is no other route to it.

The mirror is split across **two** archive.org items — `Flashpoint13.0` holds
parts 1–5 and 10–25, and `Flashpoint13.0_part2` the missing 6–9 — so the tool
reads both. It searches by fetching each part's real ZIP central directory over
range requests (~1 MB per part) and caching the file lists under
`tools/.fp-index/`. **The entries are not sorted by UUID**, so every part must
be checked; the first run costs ~30 MB and a few minutes, after which lookups
are instant. (`tools/.fp-index/` is a local cache — don't commit it.)

**Check the GameZIP's contents, not just that it exists.** A GameZIP often
holds *several builds* of the same game, and they are not equally usable:

- Fireboy & Watergirl 3's zip has a Kongregate build that dies on a CPMStar ad
  preroll and a **Miniclip** build that is clean — hence the explicit `entry`.
- Fireboy & Watergirl 4's zip holds the Kongregate build, which waits on a dead
  config service — and **the zip contains that service's archived reply**, so
  the game can be satisfied rather than left hanging. It is the reason the whole
  zip is served rather than one file out of it (see "A GameZIP is not one file"
  above). FW4 plays from `fileFlashpointArchiveZip` and *only* from there: the loose SWFs
  on archive.org, both the Kongregate one and the Armor Games one, come up
  black, because nothing can answer that call for them.

Because a plain SWF is one request instead of fetch-plus-unzip,
`fileFlashpointArchiveZip` is a **per-game override**, not the default: the ordinary
`/cors/` SWF path stays primary, and a failure falls through to the next source.
But when a game needs files that no longer exist anywhere else, the zip is the
only thing that has them.

### What a game is allowed to reach

**A game gets the file it is played from, and nothing else.** These games were
written for portals that no longer exist and they still try to phone home: ad
servers, score APIs, portal SDKs, analytics beacons. None of those services
exist any more, and a visitor should not be handing their IP and referrer to
whatever answers at those addresses now.

`installGameNetworkPolicy` in `js/player.js` wraps `window.fetch`, which is how
Ruffle loads everything. It is **deny-by-default**: the request is allowed only
if it is the game file, a sibling in the same archived directory (a few games
are a loader SWF plus its levels), or Ruffle fetching its own `.wasm` and code
chunks. Everything else is answered locally and never leaves the browser.

A blocked `.swf` gets a valid but **empty** 20-byte movie, so the game's
`Loader` *succeeds* and its ad slot fills with nothing; everything else gets a
204. Nothing is ever answered with an error, because a failed `Loader` is
exactly what leaves these games sitting on a loading screen forever.

**A stand-in response must carry the URL it stands in for** (`standIn`). A
hand-built `Response` always reports `url === ""` — the constructor has no way
to set it — and Ruffle reads that to work out the movie's query parameters, so
an empty one makes it log, once per blocked call:

```
ERROR core/common/src/tag_utils.rs:241 Failed to parse loader URL when
extracting query parameters: relative URL without a base
```

`url` is a getter on `Response.prototype`, so an own property shadows it. This
was found by diffing our console against 9o3o's on the same game and the same
Ruffle build: that one line was the entire difference, and it came from us.

This site's own two fetches — `games.json` and a Flashpoint GameZIP — use
`nativeFetch`, captured before the wrapper exists, so the policy only ever sees
a game's traffic and is free to be as strict as it likes.

**Why deny-by-default and not a blocklist.** The blocklist came first and had
to be extended every single time a game was tested — cpmstar, then configar,
then agame, then kongregate. Running `tools/audit-network.html` over the whole
catalogue then turned up six more hosts it had never heard of, including
**Google Analytics beacons** in two Earn to Die builds and a `loadcount.jsp`
that posts the full referring URL. What the games have in common is not who
they call; it is that they have no business calling anyone.

Two earlier attempts did not work and are worth not repeating:
`allowNetworking: "none"` never reaches `Loader.load()` in Ruffle 0.6.0, and a
service worker never saw Ruffle's requests at all.

`FlashbackPlayer.blockedRequests()` returns what the running game was refused.

#### What the policy does *not* cover: the tile art

The policy governs **games**. It does not govern this page, and the page
hotlinks its icons: every tile's art is fetched straight from a third party on
page load, before anyone has clicked a game, across six hosts. They are listed
in "Every external URL this site touches" below.

**This is a deliberate trade, not an oversight.** Mirroring the art would mean
redistributing other people's images from this repo, which is the thing the
whole streaming design exists to avoid, and it would put a few hundred files
in a repo whose selling point is that it carries no game content.

So be precise about the claim. It is "a game can reach nothing but its own
file" — **not** "this site makes no external requests". The second is not true
and cannot be while the art is hotlinked. If you want it to be, the options are
to vendor the icons (and accept the redistribution question) or to proxy
them.


#### The empty stand-in has to match the game's VM

A blocked `.swf` is answered with a valid but **empty** movie rather than an
error, so the game's `Loader` *succeeds* and its ad slot fills with nothing — a
failed `Loader` is what leaves some of these games on a loading screen for
ever. But Flash has **two** virtual machines, and handing an AS3 game an AVM1
stand-in makes them meet, which is not allowed:

```
ArgumentError: Error #2180: It is illegal to move AVM1 content (AS1 or AS2) to
a different part of the displayList when it has been loaded into AVM2 (AS3)
content.
    at flash.display::DisplayObjectContainer/addChild()
    at com.spilgames.api::SpilGamesServices/onLoadComplete()

ReferenceError: Error #1069: Property isReady not found on
flash.display.AVM1Movie and there is no default value.
    at com.spilgames.api::SpilGamesServices/isReady()
    …
    at general.scenes::MainMenu/onPlayBtnClick()
```

`AVM1Movie` is a **sealed** class, so touching any property of it throws — and
that throw unwinds the game's own click handler. The visible symptom is a
**button that silently does nothing**, with the cause several frames up the
stack in code that has nothing to do with the button.

So there are two stand-ins, `EMPTY_SWF` (version 6, AVM1) and `EMPTY_SWF_AS3`
(version 15 with a `FileAttributes` tag carrying the ActionScript3 flag), and
`emptySwfResponse()` picks by `mainMovieIsAs3` — which comes from Ruffle's own
`metadata.isActionScript3`, not from guessing at the SWF version number. Until
that metadata arrives the AVM1 stub is used, which is what this always served.

Note that `AudioContext was not allowed to start` in the console is **not** one
of these. That is the browser's autoplay policy; Ruffle's "Click to unmute"
badge (`unmuteOverlay: "visible"`) is the answer, and one click clears it.

### Auditing it: `tools/audit-network.html`

Open it and press **Run audit**. It loads every game in `games.json` in turn
through the real player module and prints one row per game: what it was allowed
to fetch, what it was refused, any console error it produced, and whether Ruffle
reported a stage size.

**The pass condition is that no row's "Fetched" column contains anything but the
game's own file** (plus Ruffle's own files from unpkg on the first row). Run it
after touching the policy, after adding a game, and after a Ruffle upgrade.

Trust the network columns; treat "Stage" and "Console errors" as hints. The
page mounts and tears down two dozen Ruffle instances into one div, which Ruffle
tolerates unevenly — the set of rows reporting "no metadata" changes between
runs and has included games that play fine when opened normally, and a slow game
can still be downloading when its turn ends. **Open a game on the wall before
concluding it is broken.**

### Builds we did not make

Everything here streams from an archive; none of it is compiled by this
project. That means the **provenance of a build is a separate question from
what the player does**, and the two should not be conflated.

Most uploads are plain dumps of the original file. A few are not. Bad Ice
Cream 1 is the clear case: searching its decompressed bytes shows
`navigateToURL` overwritten as `;;;igateToURL` and `Lock` as `L;ck`, so the
lock call throws instead of firing.

| file | `navigateToURL` | `;;;igateToURL` | `L;ck` | verdict |
| ---- | --------------- | --------------- | ------ | ------- |
| `Bad_Ice_Cream_1.swf` | **0** | **1** | **1** | byte-patched upstream |
| `Bad_Ice_Cream_2.swf` | 1 | 0 | 0 | clean — no lock in the build |
| `Bad_Ice_Cream_3.swf` | 1 | 0 | 0 | clean — no lock in the build |

**Bad Ice Cream 1 ships as-is, knowingly.** Nitrome is not in Flashpoint at
all — a developer search returns one unrelated entry — so there is no
unpatched copy of that build to fall back to, and the alternative upload
(`bad_ice_cream_202412`) describes itself in its own archive metadata as "a
version with this URL check removed". The choice was between an upstream
patched build and not carrying the game.

What that does **not** change: this player still never spoofs a movie's URL,
never rewrites a game's bytes, and never bypasses a lock itself. If you would
rather not carry a patched build, give the entry an `error` field and it
leaves the wall while staying in the catalogue with the reason.

### One item, fourteen games: the Papa's series

Flipline Studios' fourteen Flash *Papa's* games are the largest single block
here, and the easiest to source, because someone had already done the work: the
archive.org item [`papas_games`](https://archive.org/details/papas_games) holds
all fourteen as loose `.swf` files, under exactly the filenames Flashpoint's
own launch commands point at on `i.flipline.com`:

| Flashpoint launch command | file in `papas_games` |
| ------------------------- | --------------------- |
| `i.flipline.com/gamefiles/papaspizzeria/papaspizzeria_v2.swf` | `papaspizzeria_v2.swf` |
| `…/papasscooperia/papasscooperia_v102.swf` | `papasscooperia_v102.swf` |
| …and twelve more, every one matching | |

That is worth more than convenience. **Matching names and sizes, then one hash,
establish that the streamed build is the build Flashpoint marks Playable**:
`papaspizzeria_v2.swf` is `sha256:86ebb12d…` both as the loose file on
archive.org and as
`content/i.flipline.com/gamefiles/papaspizzeria/papaspizzeria_v2.swf` extracted
from Flashpoint's GameZIP. So every entry takes `preferSource: "fileArchive"` —
one file, one request — and keeps `fileFlashpointArchiveZip` as the fallback,
which costs a zip extraction out of a 100 GB+ part to arrive at the same bytes.

Two things that generalise to any game sourced this way:

- **Flashpoint's "Playable" means Flash Player, not Ruffle.** It is evidence
  about the *file*, never about whether the game runs here. All fourteen were
  opened in the browser and clicked through to the save-slot screen; Papa's
  Pizzeria was taken further, to Day 1 with a save written to storage.
- **Papa's Pizzeria is the odd one out.** It is the only AVM1 title in the
  series (SWF v9; the other thirteen are AS3, up to SWF v35), and Ruffle logs
  `Tried to instantiate a non-registered character FocusManager` for it — an
  unimplemented Flash UI component. It is noise: the title screen, the name
  field and typing into it all work.

### Htdocs: the games Flashpoint does not zip

Not every Flashpoint game is a GameZIP. Its database has a `zipped` flag, and
for the games where it is **false** the content sits loose in a legacy tree
instead:

```
Flashpoint Ultimate 13/Legacy/htdocs/<original host>/<original path>
```

That tree is mirrored on archive.org too, as `Htdocs_1.zip` … `Htdocs_6.zip`
in `Flashpoint13.0_part2` (about 290 GB across six parts). And because
archive.org extracts a single file from inside a zip, a loose game is the
*cheaper* of the two Flashpoint sources — one request, one SWF, no unzip step,
and it streams with a progress bar like anything else:

```
https://archive.org/cors/Flashpoint13.0_part2/Htdocs_4.zip/
  Flashpoint%20Ultimate%2013%2FLegacy%2Fhtdocs%2Fuploads.ungrounded.net%2F457000%2F457689_insanitybox.swf
```

`fileFlashpointArchiveZip` describes both shapes — the presence of `entry` is
what distinguishes them, and `isLooseFlashpointFile()` is the one-line test.

**This is how The Insanity Box 1 and 2 became playable.** They had been listed
with an `error` saying no copy could be reached: Newgrounds serves the files
only to its own origin, neither game is on archive.org, and neither is a
GameZIP. They were in Htdocs the whole time.

To find one, read a part's ZIP64 central directory over range requests — the
same trick `tools/find-flashpoint-zip.py` uses for GameData, about 35 MB per
part — and look for the game's launch command under `Legacy/htdocs/`.

> **Other Flashpoint versions are not usable.** Flashpoint 9, 11 and 11.1
> Ultimate are all mirrored, but as `.7z`, `.tar.gz` or `.rar`, and
> archive.org's single-file extraction only works on `.zip`. `Flashpoint13.0`
> and `Flashpoint13.0_part2` are the only mirrors we can address at all.

### Two GameZIP layouts

Most GameZIPs put the archived tree straight at `content/`. Some wrap it in a
directory named after the game's UUID:

```
content/shock-value.deviantart.com/…             ← the common shape
8cbb824f-…/content/chat.kongregate.com/…         ← Fancy Pants World 1
```

`loadGameZip` works the prefix out from the entries rather than assuming, and
strips it everywhere addresses are formed — the `files` map, the `entry`
match, and `base`. Without that, the `content/` filter matched nothing, not a
single file was inflated, and the game died on "could not inflate".

### A GameZIP is not one file

A Flashpoint GameZIP archives a game **with everything it needed to run**: its
portal's SDK, its branding, and — the part that matters — the recorded replies
of services that have since died. Fireboy & Watergirl 4's zip holds eight files:

```
content/assets.kongregate.com/gamez/0017/1099/live/FireBoyAndWaterGirl_KONG.swf
content/api.configar.org/cf/pb/1/settings/0/0/f3eea80c…      ← the dead service's reply
content/api.configar.org/crossdomain.xml
content/files.cdn.spilcloud.com/flashapi_1_3_1_147/ServicesConnection.swf
content/files.cdn.spilcloud.com/flashapi_1_3_1_147/BrandSystem.swf
content/files.cdn.spilcloud.com/flashapi_1_3_1_147/ServicePack.swf
content/files.cdn.spilcloud.com/flashapi_assets/logos/a10.com.swf
content/www8.agame.com/sdk/spilapi/localization/BrandLocalization.swf
```

Its preloader waits on that settings XML. Extracting only the `.swf` — which is
what this used to do — left the game waiting for a service that has not existed
for years: **a black screen, for ever**. `loadGameZip` now inflates the whole
archive and keeps it in memory keyed by the address each file was archived from,
and the network policy serves those files (`zipFile`) without a single request
leaving the browser.

Two details make the addressing work:

- **`base`** is set to the game's own archived directory
  (`http://assets.kongregate.com/gamez/0017/1099/live/`), so a relative request
  inside the SWF resolves to its original address — which is exactly the key the
  zip is indexed by. Without it, Ruffle resolves relative paths against *this*
  page and they 404 (that is why FW4 used to ask `localhost` for
  `sdk/spilapi/…`).
- **The movie's own URL stays the `blob:`.** It is *not* dressed up as
  `http://assets.kongregate.com/…`. That spoof is how a publisher's site-lock
  gets defeated, and **this player does not do it** — a game that checks its
  address gets the truth and stays locked. (Flashpoint's own player does spoof
  it, deliberately.)

  That rule is about **our code**, and it is worth being precise, because it
  does not reach as far as it first sounds. It says nothing about which
  archived copy a game streams from, and some uploads on archive.org are
  themselves patched builds. See "Builds we did not make" below.

This is the difference between our player and 9o3o's, and it was worth the dig:
same game file, same Ruffle build, same renderer — one of us served the game its
dependencies and the other did not.

### Borrowing a dependency from another game's zip

A GameZIP carries what Flashpoint archived *with that game*. Sometimes that is
not enough, and Snail Bob 5–8 are the case that proved it.

They are Spil-published, and on **Play** they run
`onPlayBtnClick` → `showLevelMap` → `showNewScene` → `checkForShowingIGA` →
`requestOnGameAd` → `SpilGamesServices.isReady()`. That last call needs the
Spil SDK to *answer*. Refused, the answer never comes, the game walks back to
its own main menu, and **the Play button appears to do nothing at all**. Their
own GameZIPs were checked and contain only the game's SWF — there is no SDK in
them to serve.

Flashpoint's player gets away with this because it proxies the **whole**
archived content pool, so any Spil file is available to any Spil game. So an
entry may now borrow:

```json
"dependencies": {
  "item": "Flashpoint13.0",
  "zip": "GameData_24.zip",
  "path": "Flashpoint Ultimate 13/Data/Games/aedea00b-…-1705618188615.zip",
  "note": "Spil SDK 1.3.1, archived alongside Fireboy & Watergirl 4.",
  "map": [
    ["configar.org/cf/pb/1/settings/", "content/api.configar.org/cf/pb/1/settings/0/0/f3eea80c…"],
    ["ServicesConnection",             "content/files.cdn.spilcloud.com/flashapi_1_3_1_147/ServicesConnection.swf"]
  ]
}
```

`map` is matched as a plain substring of the request URL, first match wins, and
**only the mapped entries are inflated** — borrowing ~500 KB of SDK does not
mean unpacking the 4.9 MB game it was archived beside. The files are loaded
before the movie starts, because the config request happens in the game's first
seconds; a failure to fetch them is not fatal, the game simply behaves as it
did before.

Two things this dig turned up that are worth keeping:

- **The config reply is the keystone, not the SDK.** Serving
  `ServicesConnection.swf` alone changed nothing. Serving
  `api.configar.org/cf/pb/1/settings/…` is what makes the SDK initialise — and
  it also *redirects* where the SDK is fetched from, to exactly the
  `files.cdn.spilcloud.com/flashapi_1_3_1_147/` path FW4's zip archived. The
  hash in the URL differs per game (`5486e617…` vs FW4's `f3eea80c…`) and
  serving FW4's reply anyway works.
- **Nothing here bypasses anything.** These are archived files being served to
  the game that asks for them, which is what the GameZIP machinery already
  does. This only widens where the file may come from.

### Not implemented: HTML5 games

Two entries in `games.json` carry `"error": "HTML5 game …"`, and the whole
post-Flash catalogue is out of reach for the same reason. This section is the
design for closing that gap. **None of it is built** — it is written down so the
next person does not have to re-derive it, and so the cost is known before
anyone starts.

**The measurements below are real.** Fireboy & Watergirl 5's GameZIP was pulled
from the mirror, unpacked, served from a plain static server on the wrong
hostname, and played. It works, unpatched, with no site-lock.

#### Why it is not just "point an iframe at it"

A SWF is **one file** handed to an emulator that runs inside this page. An
HTML5 game is **a website** — a directory with its own entry document, which
resolves relative URLs against its own address:

```
content/www.coolmathgames.com/fireboy-watergirl-5/index.html   ← the entry point
content/www.coolmathgames.com/fireboy-watergirl-5/bower_components/requirejs/require.js
content/www.coolmathgames.com/fireboy-watergirl-5/fireboy-and-watergirl-elements.min.js
content/www.coolmathgames.com/fireboy-watergirl-5/assets/…     ← 143 more
content/html5.api.gamedistribution.com/main.min.js             ← an ad SDK, archived
```

148 files, 13 MB zipped. That shape breaks the current design at one specific
point, and it is worth being precise about which:

| what | Flash today | HTML5 |
| ---- | ----------- | ----- |
| runtime | Ruffle, in **this** page | an iframe, its **own** document |
| the network policy sees it? | yes — Ruffle uses `window.fetch` | **no** — different realm |
| relative URLs | Ruffle's `base` config | the iframe's document URL |

FW5 issued **152 resource loads**. Only **14** were `fetch`. The rest: 76
`XMLHttpRequest`, 39 `<img>`, 16 `<script>`, 6 nested `<iframe>`. Wrapping
`window.fetch` in this page catches **none** of them, because they happen in
the iframe's realm and mostly are not `fetch` to begin with.

Left unblocked, FW5 reached **40 external endpoints** — Google AdSense, GA4,
DoubleClick, `api.gameanalytics.com`, `tracker.gamemonkey.org`,
`pm.azerioncircle.com`, and `msgrt.gamedistribution.com` beacons carrying a
base64'd referrer, domain, browser, OS and screen size — and **started playing
an audio advertisement**. So a policy is not optional here, and `fetch`
wrapping cannot be it.

#### The shape that works: a service worker

This is what Flashpoint's own web player does, and it is the only approach that
survives contact with the file list above.

1. `sw.js` at the site root, claiming a scope — say `/play/`.
2. The page unzips the GameZIP as it does now, and hands the files to the
   worker (Cache API, or `postMessage` for small ones).
3. The iframe is pointed at `/play/<original host>/<original path>/index.html`.
4. Every subresource the iframe asks for — of **any** type — hits the worker,
   which serves it from the zip or answers 204. Deny-by-default, exactly the
   rule the site has now, but enforced somewhere it actually applies.

Relative URLs then resolve correctly with no rewriting, because the iframe's
document URL mirrors the archived path. **Rewriting is not a fallback option:**
FW5 builds its own URLs at runtime (`addScript(src + '?v=' + buster)`), so no
static pass could catch them. A `blob:` iframe fails for the same reason — a
blob URL has no directory, so `bower_components/requirejs/require.js` has
nothing to resolve against.

> An earlier note in this project says a service worker "never saw the
> request". That was about **Ruffle's WASM fetches** and does not apply here: a
> worker in scope sees iframe navigations and their subresources, of every
> type. For HTML5 it is strictly *more* coverage than `window.fetch` wrapping.

#### The bill

| file | work |
| ---- | ---- |
| `sw.js` *(new)* | ~150 lines — serve-from-zip, deny-by-default, synthesise a CSP header |
| `js/player.js` | ~150 lines — worker registration + readiness handshake, cache handoff, `mountHtml5()`, revised save-key detection |
| `js/app.js` | ~20 lines — engine branch in `fitStage`/`placePanel` |
| `games.json` | one field (`engine: "html5"`); `fileFlashpointArchiveZip.entry` points at the `.html` |
| `tools/audit-network.html` | rewrite — read the worker's refusal log, not `blockedRequests()` |

Roughly **400 lines net**. The no-build-step rule survives: a service worker is
just another hand-written file.

#### What it costs beyond the line count

- **A moving part with a lifecycle.** install/activate/update/`skipWaiting`,
  and the "why is it still serving the old one" afternoon that comes with it.
  The first thing here that is not a page and two scripts.
- **HTTPS becomes mandatory.** Fine on Pages; a plain `http://` LAN server
  would silently lose HTML5 support with no obvious symptom.
- **13 MB before the first frame** (vs 1–4 MB for a SWF) and 148 entries
  through `DecompressionStream`. The stage loader already reports both phases,
  so this one is already paid for.
- **Sandbox tension.** `allow-scripts allow-same-origin` together means an
  archived game can reach this page's `localStorage` and DOM. Flashpoint
  accepts this. Real isolation needs a second origin.
- **`dimensions` changes meaning.** For a SWF it is the movie's true stage
  size. HTML5 games are responsive — FW5 laid itself out portrait at 512×960
  because that was the box it was given. Cheapest path: keep the fixed-aspect
  box and let `dimensions` mean *preferred* aspect. Near-zero new code.
- **Saved progress needs revisiting.** `gameSaveKeys()` finds Flash saves by
  the `/` in Ruffle's key format. HTML5 games write arbitrary keys to the same
  origin: they would be missed by the counter and by "Delete all game saves",
  and could in principle collide with the site's own `fa_*` keys.

#### What it actually unlocks

Less than you would hope, immediately. Of the four entries carrying `error`:

| entry | HTML5 support fixes it? |
| ----- | ----------------------- |
| Fireboy & Watergirl 5: Elements | **yes** — GameZIP in the mirror, confirmed running |
| Fireboy & Watergirl 6: Fairy Tales | no — UUID is in **none** of the 25 index parts |
| The Insanity Box 1 & 2 | no — Flash, and also absent from the mirror |

**One of four.** The real argument is forward-looking: Nitrome's own HTML5
re-releases, coolmathgames, the whole Poki era. That is where the games are
now, and none of them are reachable today.

### `forceScale`: the movie does not get to change the scale mode

The player passes `scale: "showAll"` **and** `forceScale: true`, which stops a
movie overriding that at runtime.

It is there because some builds set `Stage.scaleMode = NO_SCALE` and then draw
assuming a viewport larger than the stage they declare. Ruffle honours the
declared stage, so the extra is simply clipped: Fancy Pants World 1 Remix lost
its logo off the top and its Start door off the right that way, while its box
was provably the right shape — aspect 1.523 against the movie's own 1.524.

Forcing the scale mode is safe here for a structural reason: `fitStage` always
gives a movie a box with **its own** aspect ratio, so letterboxing to the
declared stage can never distort anything. For a game that never touches
`scaleMode` — which is most of them — the flag does nothing at all.

Verified before it was turned on, across every source type:

| game | source | SWF | result |
| ---- | ------ | --- | ------ |
| The World's Hardest Game | archive.org | v8 AS2 | identical (run side by side) |
| The Insanity Box | Flashpoint Htdocs | v8 | identical |
| Bad Piggies | archive.org | v10 | identical |
| FPA World 4 Part 3 | GameZIP, multi-file | v43 | identical |
| Fireboy & Watergirl 4 | GameZIP + borrowed SDK | v11 | identical |
| FPA World 1 Remix | GameZIP | v24 | **fixed** |

### Why `dimensions` must be the SWF's real stage size

`dimensions` is **not descriptive metadata** — three things read it, and all
three happen before the SWF has finished downloading:

- the stage's `aspect-ratio`, so the player box has the right shape from the
  moment it appears;
- how many **grid columns** the panel spans (`colsForStage`), which is how a
  portrait game leaves side columns free for icons instead of sitting
  letterboxed in a full-width panel;
- the fullscreen fit (`data-w`/`data-h`, `applyFullscreenFit`).

Ruffle does report the true size at runtime, as `metadata.width`/`height` — but
only once the movie is in, which is far too late to lay the wall out around it.
So the size is stored, and it must be the SWF's true stage size, read from the
SWF header rather than guessed. To check one:

```bash
python3 -c "import sys,zlib;d=open(sys.argv[1],'rb').read(65536);h=zlib.decompressobj().decompress(d[8:],64) if d[:3]==b'CWS' else d[8:];n=h[0]>>3;b=''.join(format(c,'08b') for c in h[:(5+4*n+7)//8]);v=[int(b[5+i*n:5+(i+1)*n],2) for i in range(4)];print((v[1]-v[0])//20,'x',(v[3]-v[2])//20)" game.swf
```

**Sound.** Browsers block audible autoplay until the visitor interacts with the
page, so Ruffle comes up muted behind a "Click to unmute" badge
(`unmuteOverlay: "visible"`). One click clears it. `AudioContext was not allowed
to start` in the console is that policy, not a fault.

**Two caveats, learned the hard way — always play a game before shipping it:**

- **Site-locks.** Some publishers' SWFs check their host domain and refuse to
  run anywhere else (Nitrome's "This game has been URL-Locked!" is the classic
  example). These cannot be fixed from here — and **must not be**: pick a
  different build or drop the game.
- **AS3 gaps.** Ruffle's ActionScript 3 support is incomplete, so some titles
  load to a white or black screen. Open the game here and confirm it reaches
  gameplay, not a lock or a blank stage. `tools/audit-network.html` runs the
  whole catalogue and reports which ones report a stage size.

To find a game: search [archive.org](https://archive.org/details/softwarelibrary_flash_games),
copy the identifier from its details URL (`archive.org/details/<identifier>`),
and confirm it has a `.swf` at `archive.org/metadata/<identifier>`. The research
behind the games shipped here — including the ones that were rejected and why —
is in [`research/archive-flash-games.md`](research/archive-flash-games.md).

If you later add a Content-Security-Policy it needs `script-src` and
`connect-src` for `https://unpkg.com` (Ruffle and its `.wasm`) and
`connect-src` for `https://archive.org` (the games themselves). No `frame-src`
is needed — nothing is framed.

---

## Every external URL this site touches

A complete audit, because "no external requests" is easy to believe and wrong.
Verified two ways: by reading `index.html`, `css/style.css`, `js/*.js` and
`games.json`, and by reading `performance.getEntriesByType('resource')` in a
loaded page. Both agree.

### 1. Fetched on page load — before anyone clicks a game

Seven hosts. All **https**, so nothing is blocked as mixed content when the
site is served over TLS.

| host | what | where it comes from |
| ---- | ---- | ------------------- |
| `unpkg.com` | The Ruffle emulator, pinned `@0.6.0`. Also serves Ruffle's `.wasm` and lazily-loaded code chunks once a game starts. | `<script>` in `index.html`, and both files in `tools/` |
| `infinity.unstable.life` | Tile art — Flashpoint's logo and screenshot CDN (161 URLs) | `thumb` / `thumb2` / `screenshot` in `games.json`, drawn by `buildArt()` → `attachThumb()` in `js/app.js` |
| `www.snailb.com` | Tile art — the Snail Bob developer's own site (8) | ″ |
| `img.poki-cdn.com` | Tile art — Poki (6) | ″ |
| `cdn2.steamgriddb.com` | Tile art — SteamGridDB (4) | ″ |
| `static.wikia.nocookie.net` | Tile art — Fandom (1) | ″ |
| `cdn2.kongcdn.com` | Tile art — Kongregate (1) | ″ |

Tile images are `loading="lazy"`, so one wall load fetches only what is on
screen — around 50 of the 181, not all of them.

### 2. Fetched when a game is opened

| host | what |
| ---- | ---- |
| `archive.org` | The game itself. `/cors/<item>/<file>` for a streamed SWF, `/cors/<item>/<GameData_N.zip>/<path>` for a Flashpoint GameZIP, `/cors/<item>/<Htdocs_N.zip>/<path>` for a loose Flashpoint file. Also `/services/img/<item>` as a tile-art fallback when a `thumb` fails. |
| `unpkg.com` | Ruffle's `.wasm` module and its code chunks, loaded lazily on first play. |

That is the whole list. Everything else a game asks for is served from memory
or refused — see §4.

### 3. Reached only if a visitor clicks

Links, not subresources. Nothing here is contacted unless someone chooses it.

| host | what | where |
| ---- | ---- | ----- |
| `forms.gle` | "+ Suggest a game" | top bar, `index.html` |
| `github.com` | "Source on GitHub" | footer, `index.html` |
| `ooooooooo.ooo` | "play at 9o3o ↗" — Flashpoint's web player. A separate domain from `flashpointarchive.org`, and it answers `X-Frame-Options: DENY`, so it can only ever be a link out. | credits, `js/player.js` |
| `flashpointarchive.org` | The game's catalogue entry | credits |
| `archive.org` | The item page the game streams from | credits / licence line |
| 18 publisher / archive sites | "original release ↗" — where the game was first published | `origin` in `games.json` |

All eighteen, 52 links in total: `www.flipline.com` (14),
`www.kongregate.com` (8), `www.agame.com` (5), `www.newgrounds.com` (4),
`www.nitrome.com` (3), `www.notdoppler.com` (3), `www.snailb.com` (2),
`web.archive.org` (2 — Wayback captures of pages that no longer exist),
`www.addictinggames.com` (2), and one each of `armorgames.com`,
`www.maxgames.com`, `en.y8.com`, `www.bornegames.com`, `bornegames.com`,
`www.crazygames.com`, `www.miniclip.com`, `www.xgenstudios.com`,
`www.deviantart.com`.

> **Ten of these are still `http://`** — five on agame.com, two on snailb.com,
> and one each on addictinggames, crazygames and xgenstudios. Harmless as far
> as this page goes (they are navigations, not subresources, so no mixed
> content), but clicking one leaves TLS behind. Several of those hosts are
> dead anyway. Flip them to `https://` or leave them; it is a judgement call,
> not a bug.

### 4. Asked for by games, and never reached

The network policy answers these from memory or refuses them outright; no
packet leaves the browser.

Two different outcomes hide under "never reached", and it is worth telling
them apart when auditing:

- **Served from memory.** A request whose file was archived alongside the game
  is answered from the unzipped GameZIP. Grepping this repo turns up addresses
  like `assets.kongregate.com` — that is a *key inside* Fireboy & Watergirl 4's
  zip (`content/assets.kongregate.com/…`), not a host anyone contacts.
- **Refused.** Everything else gets an empty movie or a 204. Observed across
  the catalogue:

  `google-analytics.com` · `ssl.google-analytics.com` · `core.mochibot.com` ·
  `server.cpmstar.com` · `api.configar.org` · `games.cdn.spilcloud.com` ·
  `files.cdn.spilcloud.com` · `i.notdoppler.com` · `www8.agame.com` ·
  `www.fliplineads.com` · `agi.armorgames.com`

  The last two arrived with the Papa's series. **Every one of the fourteen**
  asks `www.fliplineads.com/serve/data/<game>.xml` on startup — the publisher's
  own ad server, filling the house advert the games open on — and Papa's
  Freezeria also asks `agi.armorgames.com/assets/agi/AGI.swf`, the sponsor API
  for the one game in the series Armor Games sponsored. Both are refused and
  every game plays through anyway; the advert falls back to a built-in one.

  Their query strings are worth a look while auditing, because they show what a
  game can tell about where it is running: `?t=…&w=640&d=archive%2Eorg&h=480`.
  The `d=` is the domain, and the game reads it off the URL the movie was
  loaded from — which on this site is honestly `archive.org`, because that is
  genuinely where the file came from. Nothing here spoofs it.

One host is refused a layer earlier: **`www.mochiads.com`** is on Ruffle's own
internal blocklist, so Ruffle declines it before our wrapper ever sees the
request. That is worth knowing because it does *not* appear in
`FlashbackPlayer.blockedRequests()` — see the Fancy Pants World 1 Remix note
for what it cost to work that out.

### Re-deriving this list

It should be checked whenever `games.json` gains entries. In a loaded page:

```js
// every host the page actually contacted, with request counts
performance.getEntriesByType('resource').reduce((a, e) => {
  const h = new URL(e.name).host;
  if (h !== location.host) a[h] = (a[h] || 0) + 1;
  return a;
}, {});
```

and for what a running game was refused, `FlashbackPlayer.blockedRequests()`.
`tools/audit-network.html` does the same sweep across the whole catalogue.

---

## Deploying

Both targets below need **no build command** — this repository *is* the site.

### GitHub Pages

1. Push the repository to GitHub.
2. **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Choose branch `main` and folder **`/ (root)`**. Save.

Your site appears at `https://<user>.github.io/<repo>/` in a minute or so.

Notes:

- `.nojekyll` is already committed at the repo root. Keep it. Without it,
  GitHub Pages runs everything through Jekyll, which strips files and folders
  beginning with an underscore — that can silently break the Ruffle bundle.
- All paths in this site are relative, so it works fine from a project
  subpath (`/<repo>/`) as well as from a user/organisation root domain.
- The default Ruffle build needs **no special headers.** It does not use
  SharedArrayBuffer, so you do *not* need cross-origin isolation
  (`COOP`/`COEP`) — which is just as well, since GitHub Pages cannot set
  custom headers.
- Git LFS is worth considering if you add many large `.swf` files.

### Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git**, and pick the repo.
2. Configure the build:
   - **Framework preset:** `None`
   - **Build command:** *leave empty*
   - **Build output directory:** `/`
3. **Save and Deploy.**

Cloudflare serves `.wasm` as `application/wasm` automatically. As with GitHub
Pages, no custom headers are required. If you later add a `_headers` file for
unrelated reasons, note that `.nojekyll` is harmless there — it only matters
on GitHub Pages.

---

## Project layout

```
index.html          the whole site: top bar, icon grid, inline player
css/style.css       all styling
js/player.js        shared player module (game mounting, fullscreen,
                    saved-progress consent, failure states)
js/app.js           the wall: shuffle, hover, filter, inline panel placement
games.json          the manifest — the only file you edit to add a game
games/              self-hosted .swf files — empty; every shipped game streams
thumbs/             per-game 512×512 square icons (built from official logos)
assets/             background tile, default placeholder icon, favicon
                    (favicon.svg is the real one; favicon.png is a 32px
                    raster fallback, rendered from it)
(vendor/ruffle/     a self-hosted Ruffle used to live here; removed — see "About Ruffle")
                    any more (the pages use unpkg); kept as a fallback
tools/              diagnostics, not part of the site:
                    audit-network.html   every game's network traffic
                    bare-player.html     one SWF, nothing else on the page
                    find-flashpoint-zip.py  resolve a flashpointZip block
research/           notes on the archive.org games (which play, which don't)
.nojekyll           stops GitHub Pages from running Jekyll
```

The `?v=N` on the `css`/`js` references in the HTML is a cache-buster: static
hosts serve CSS/JS with long cache lifetimes, so **bump that number whenever you
edit `style.css`, `player.js` or `app.js`** and returning visitors will pick up
the change instead of a stale copy. (The manifest is fetched with `no-cache`, so
adding a game needs no bump.)

`js/player.js` must be loaded before `js/app.js`; it publishes
`window.FlashbackPlayer`, which the wall uses to mount games, go fullscreen and
handle the saved-progress notice.

### How the panel is placed

The wall is a CSS grid with `grid-auto-flow: row dense`. The game panel is
given an explicit `grid-column` / `grid-row`, so the browser places it first
and packs the auto-placed icons into whatever cells remain — which is what
produces the "hole in the wall" effect.

Columns are `minmax(var(--tile), 1fr)`, so they stretch to use the full width
rather than leaving a margin. That makes the real column width a measured
value, which `js/app.js` writes back as `--row`.

Laying out is a two-pass affair, because whether the page scrolls decides how
tall a row should be:

1. **Try to fit.** Rows are stretched so they divide the available height
   exactly (`bestRowCount` picks the row count landing closest to square, so
   cells stay near enough to square to be unnoticeable), and the stage is
   shrunk if the panel would otherwise overflow. Icons then pad the grid out
   to full.
2. **Otherwise, scroll.** If the games alone overflow the grid, or the panel
   still needs more rows than fit, the pass is redone with `--row` set to the
   column width — properly square cells — and the page scrolls.

**Change tile sizing in `css/style.css` only** — `--tile` and `--gap` (and the
media queries that override them) stay authoritative, and the JS reads them
back. Do not hard-code sizes in the JS.

## About Ruffle

Ruffle is loaded from unpkg, **pinned**:

```html
<script src="https://unpkg.com/@ruffle-rs/ruffle@0.6.0"></script>
```

The version is in the URL on purpose. Without it the URL resolves to whatever
npm's `latest` points at on the day a visitor loads the page, which means a
future stable release would ship to every visitor with no commit here — and
every game in the catalogue has only ever been verified against **0.6.0**.
Two things follow:

- **Upgrading is a deliberate act.** Bump the version in the three `<script>`
  tags (`index.html` and the two files in `tools/`), then re-check the games,
  starting with the ones whose notes mention Ruffle behaviour: Fancy Pants
  World 1 Remix (`forceScale`), Fireboy & Watergirl 4 (GameZIP dependencies)
  and Snail Bob 5–8 (the borrowed Spil SDK).
- **It is a third-party runtime dependency.** If unpkg is down or blocked, no
- **It is a third-party runtime dependency.** If unpkg is down or blocked, no
  game runs. There is **no local fallback any more** — `vendor/ruffle/` was
  removed from the tree. Restoring one means fetching the `@ruffle-rs/ruffle`
  package again and repointing the three `<script>` tags in `index.html` and
  `tools/`.

Ruffle ships **two channels**, and this project deliberately tracks the first:

| channel | tags | npm dist-tag | notes |
| ------- | ---- | ------------ | ----- |
| **stable** | `v0.6.0`, `v0.5.0`, `v0.4.1`, … | `latest` | Occasional, not pre-release. **What we pin.** |
| nightly | `nightly-YYYY-MM-DD` | `nightly` | Roughly daily, marked pre-release |

Note the package version alone does not identify a *nightly* build — many share
one version number — so for nightlies the date is the part that matters. A
stable tag like `v0.6.0` is unambiguous.

Falling behind mainly costs **ActionScript 3 compatibility**, the fastest-moving
part of Ruffle and the usual cause of a game loading to a white screen. This
build runs all shipped games (SWF versions 8–15) with no panic.

Whichever way it is loaded, nothing in the site code references a version or a
hashed filename — a page loads one `ruffle.js` and Ruffle resolves the rest — so
switching between unpkg and a self-hosted copy is only the `<script src>`.

The self-hosted package is about 29 MB, nearly all of it the two `.wasm`
builds. **Keep both if you go back to it** — Ruffle picks between the baseline
and the WebAssembly-extensions build at runtime depending on the browser.

### When a game doesn't run

Ruffle's ActionScript 3 support is still in progress, so some later Flash
games will not run correctly. Ruffle would normally paint its own full-bleed
error screen over the stage; this site intercepts that and replaces it with a
short "may not be fully supported by the emulator yet" notice, keeping the
game's metadata and license visible underneath.

## Saved progress

Games remember your progress, and it survives a page refresh (and reopening the
game from the wall).

How: games run in **our own** Ruffle on this origin, so when a game saves (a
Flash *SharedObject*) Ruffle writes it to **this site's** `localStorage`, keyed
by the SWF's host and path — e.g. `archive.org/cors/<item>/<name>.sol`. Because
that storage is ours, the saves can be managed here:

- The footer's **Saved games & storage** dialog counts them and can **delete
  them all** (behind a confirm).
- **Right-click a game → "Open Save Manager"** is Ruffle's own UI, for
  downloading, replacing or deleting one save at a time.
- The first time you open a game a one-time notice asks permission
  ("Save your progress?" — Allow / Not now); that choice lives in the same
  storage under `fa_saveNoticeAck`.

### GameZIP games needed a bridge

Ruffle derives that key from **the URL the movie was loaded from**, which works
perfectly for an archive-streamed game because the URL never changes. A
Flashpoint GameZIP game is different: its movie is a `blob:` URL, and a blob is
a **fresh allocation on every page load**. So Ruffle wrote to a new key each
time:

```
/http://localhost:8000/cbc29e69-913b-4f2c-a564-98e491f16c54/locobj
/http://localhost:8000/30670ac9-63b6-483d-bd9b-a48ebe8cf6bd/locobj
…one more per play, for ever
```

Two consequences, both real and both fixed: the game **never saw its own save
again**, and every play **leaked another orphan** into a store with a few MB of
quota.

The obvious fix — hand Ruffle the game's original address instead of the blob —
is exactly the site-lock spoof this project does not do. So the bridge lives in
storage instead, where it changes nothing about what the game can see:

1. **Before** the movie loads, `beginSaveBridge()` copies this game's save from
   `fa_sav/<game id>/<name>` to the blob-shaped key Ruffle is about to look up.
2. **While it plays**, a 5-second timer copies back, and so does `pagehide` —
   because a visitor closing the tab mid-game is the ordinary case, not the
   edge one.
3. **When the panel closes**, `endSaveBridge()` copies back one last time and
   **deletes** the blob-shaped keys. They are scratch; leaving them is how the
   orphans accumulated.

`purgeOrphanSaves()` runs once at boot and sweeps up any blob-shaped keys left
by plays from before this existed. It is safe there and only there: no game has
mounted yet, so no such key can belong to a movie that is currently running.

### Telling saves apart

The dialog counts two shapes as game saves — Ruffle's own
`<host><path>/<name>` for a streamed movie, and `fa_sav/<game id>/<name>` for a
GameZIP game — and ignores this site's own flags, which never contain a `/`. A
live bridge's scratch keys are deliberately **not** counted, because they are a
copy of an `fa_sav/` entry that is already counted.

### One origin, one storage

A game that asks for a SharedObject at the root path (`SharedObject.getLocal(
name, "/")`) gets a key with no host or path at all — `//analytics`,
`//com.spilgames.settings.1`. Those are **shared between every game on this
site**, because on this site every game really does live on one origin. In
practice they hold sound and music preferences, so the Spil-published games
(Fireboy & Watergirl, Snail Bob) quietly share their audio settings. That is
Flash's own behaviour rather than a bug here, and it is not worth unpicking.

A root-scoped save from a **streamed** movie keeps the host, so it lands one
level up rather than at the very top: the Papa's games all save as
`archive.org//RoyPizzeriaSlot1`, `archive.org//papasburgeria_1` and so on.
That is still a namespace shared by every archive-streamed game that saves at
the root, and the only thing keeping the series apart inside it is that
Flipline put each game's own name in the SharedObject name. Confirmed by
playing two of them far enough to force a write, which is the only way to
know — the names are assembled at runtime and do not appear as strings in the
SWF.

This changed when playback moved from the archive's iframe to our Ruffle.
Previously saves landed under **archive.org's** origin, where this site could
neither read nor erase them. One consequence: saves made before that switch are
still on archive.org's origin and **do not carry over**.

## Content shipped here

**62 entries, 60 of them playable**, every one streamed from an archive at the
moment it is clicked. Nine series carry most of it:

| series | games |
| ------ | ----- |
| Papa's | 14 — Pizzeria through Scooperia, the complete Flash run |
| The Fancy Pants Adventures | 10 |
| Snail Bob | 8 |
| Fireboy & Watergirl | 6 (4 playable) |
| Henry Stickmin | 5 |
| Earn to Die | 4 |
| The World's Hardest Game | 4 |
| Bad Ice Cream | 3 |
| The Insanity Box | 2 |

plus Bad Piggies, Effing Worms, Interactive Buddy, Bloxorz, Motherload and
City Under Siege. Each was **verified to load and run** before shipping — not
"the header parsed", but opened in a browser and played. See
[`research/archive-flash-games.md`](research/archive-flash-games.md) for the
full list and the titles that were rejected (site-locked, white-screening,
mislabeled, or not Flash at all).

Nothing per-game is stored in this repo at all: the games stream from the
archive and the icons are hotlinked official logo artwork.

### Tile art: two layers, composited in CSS

Official logos are almost all **wide banners** — square ones are the rare
exception — so cropping them to a square tile (`object-fit: cover`) cuts the
title off, and stretching them is worse. Each
tile therefore draws its art as two layers (`buildArt` in `js/app.js`):

| layer | image | how |
| ----- | ----- | --- |
| back  | `thumb` | `object-fit: cover` — the base icon |
| front | `thumb2` if set, else `thumb` | `object-fit: contain`, 7% padding — sharp, uncropped |

There are two behaviours, depending on whether the entry has a second icon:

- **No `thumb2`** (most games): the back layer is permanently blurred
  (`scale(1.35) blur(11px)`) as a colour wash, with the same image sharp and
  contained in front. This is what lets a **wide banner** logo — which is what
  nearly all official art is — sit properly in a square tile instead of being
  cropped or stretched.
- **With `thumb2`**: `thumb` is already a clean square icon, so it is shown
  **sharp and unobstructed**; on hover it blurs into a wash and `thumb2` (the
  art of the release actually being played) fades in over it. See Fireboy &
  Watergirl 1, where the square logo of another release is the icon and the
  played release's banner is the hover reveal.

This replaced a `thumbs/` folder of 512×512 icons pre-composited with
ImageMagick — same look, no stored files, and any new game needs only a URL.
(If `thumbs/` is still present from that era, nothing references it and it can
be deleted.)

## License

Site code is MIT — see [LICENSE](LICENSE).

**Each game retains its own separate license**, recorded per entry in
`games.json` and shown while it plays. The archive-streamed classics are all
copyrighted (`© <developer> — all rights reserved`) and are **not redistributed
by this project** — they stream from the Internet Archive's own copies. The MIT
license covers this portal's code only; it does not cover, and cannot
relicense, the games served through it. Ruffle is
a separate project, dual-licensed MIT OR Apache-2.0.
