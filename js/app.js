/* ============================================================
   Flashback Arcade — the wall.

   A dense grid of unlabelled game icons that fills all the space
   available. Hovering an icon names it in the top bar; clicking
   one opens the game inline, in a panel placed into the middle
   of the grid so the icons pack in around it.

   When there are fewer games than cells, games repeat to fill the
   screen; when there are more, the wall simply scrolls. Whenever
   the available space shrinks — a game opens, the window is
   resized — the extra repeats are dropped again so the wall stays
   exactly as full as it needs to be, and no fuller.

   Vanilla JS. Depends only on js/player.js (window.FlashbackPlayer).
   ============================================================ */
(function () {
  "use strict";

  var FP = window.FlashbackPlayer;
  var PLACEHOLDER = "assets/placeholder.svg";

  var wall = document.getElementById("wall");
  var readout = document.getElementById("readout");
  var countEl = document.getElementById("game-count");
  var strip = document.getElementById("filter-strip");
  var filterEl = document.getElementById("filter");
  var filterClear = document.getElementById("filter-clear");
  var filterNote = document.getElementById("filter-note");

  var allGames = [];   /* every distinct game, manifest order */
  var wallGames = [];  /* allGames minus the ones that cannot be played */
  var baseList = [];   /* the distinct games, shuffled once per page load */
  var fillList = [];   /* baseList plus appended repeats, grow-only */
  var panel = null;
  var currentId = null;
  var currentGame = null;
  var focused = false;  /* "Focus" toggle: page header and metadata step aside */
  var resizeTimer = null;

  /* "Show All Games" catalogue view — ?all=1 (or ?view=all). Every game once,
     labelled, no duplicates, no inline player — a plain checkable list. */
  var ALL_MODE = /(?:^|[?&])(?:all=1|view=all)(?:&|$)/.test(window.location.search);

  /* ---- Small helpers --------------------------------------- */

  function el(tag, className, text) {
    return FP.el(tag, className, text);
  }

  function pad(n, width) {
    var s = String(Math.max(0, n | 0));
    while (s.length < width) {
      s = "0" + s;
    }
    return s;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function normalize(s) {
    return (s === undefined || s === null ? "" : String(s)).toLowerCase();
  }

  function activeQuery() {
    if (!filterEl || (strip && strip.hasAttribute("hidden"))) {
      return "";
    }
    return filterEl.value.trim().toLowerCase();
  }

  function idleReadout() {
    if (!readout) {
      return;
    }
    readout.textContent = "";
    readout.appendChild(document.createTextNode(wallGames.length + " games online  "));
    readout.appendChild(
      el("span", "readout-hint", "— hover an icon for its name · type to filter")
    );
  }

  /* ---- Grid maths ------------------------------------------ */

  /* Tile sizing lives in CSS custom properties so the media queries stay
     authoritative. Columns stretch (minmax(--tile, 1fr)), so the real
     column width is measured here and written back as --row to keep the
     cells square. */
  function gridMetrics() {
    var cs = window.getComputedStyle(document.documentElement);
    var tile = parseFloat(cs.getPropertyValue("--tile")) || 78;
    var gap = parseFloat(cs.getPropertyValue("--gap")) || 6;
    var width = wall.clientWidth;
    var cols = Math.max(1, Math.floor((width + gap) / (tile + gap)));
    var colW = (width - (cols - 1) * gap) / cols;
    return { tile: tile, gap: gap, cols: cols, colW: colW };
  }

  /* Vertical room left for the wall once the header, the filter strip (when
     it is showing) and the footer have taken their share. Measured live —
     wall.top already sits below whatever chrome is currently visible — and in
     document space, so it does not depend on the current scroll position.
     SAFETY trims a couple of pixels so sub-pixel rounding cannot produce a
     scrollbar. */
  function availableWallHeight() {
    var SAFETY = 3;
    var wallTop = wall.getBoundingClientRect().top + window.pageYOffset;
    var footer = document.querySelector(".footer");
    var footerH = 0;
    if (footer) {
      var fcs = window.getComputedStyle(footer);
      /* A hidden footer (focus mode) still reports its margin, so check that
         it is actually laid out before charging the wall for it. */
      if (fcs.display !== "none") {
        footerH = footer.offsetHeight + (parseFloat(fcs.marginTop) || 0);
      }
    }
    var sitePadBottom =
      parseFloat(window.getComputedStyle(document.querySelector(".site")).paddingBottom) || 0;
    return Math.max(
      0,
      window.innerHeight - wallTop - footerH - sitePadBottom - SAFETY
    );
  }

  /* How many rows to divide `availH` into so each row lands as close to
     square (i.e. to the column width) as possible. Rows then fill the height
     exactly, so a duplicate-padded wall never spills into a scrollbar. */
  function bestRowCount(availH, colW, gap) {
    var lo = Math.max(1, Math.floor((availH + gap) / (colW + gap)));
    var hi = lo + 1;
    var loH = (availH - (lo - 1) * gap) / lo;
    var hiH = (availH - (hi - 1) * gap) / hi;
    return Math.abs(loH - colW) <= Math.abs(hiH - colW) ? lo : hi;
  }

  /* The game's native stage size, from `dimensions`. It decides the panel's
     SHAPE and how many grid columns it spans, and it must be known BEFORE the
     SWF has downloaded — Ruffle only reports the real size once the movie is
     in, which is far too late to lay the wall out around it. */
  function gameDim(game, key, fallback) {
    var d = (game && game.dimensions) || {};
    var n = Number(d[key]);
    return n > 0 ? n : fallback;
  }

  function gameW(game) {
    return gameDim(game, "w", 640);
  }

  function gameH(game) {
    return gameDim(game, "h", 480);
  }

  function rowHeightFor(availH, rows, gap) {
    return Math.max(24, (availH - (rows - 1) * gap) / rows);
  }

  /* Size the inline stage.

     The stage takes ALL the height the panel can have without the page
     scrolling, and the game is scaled to the largest size that fits and centred
     both ways. Where the game cannot use the full height — a wide game on a
     narrow screen, where its width runs out first — the well is trimmed back to
     the game rather than left with dead bands above and below it. */
  function fitStage(panelH, keepWidth) {
    var well = panel.querySelector(".stage-well");
    var box = panel.querySelector(".player-box");
    if (!well || !box || !currentGame) {
      /* No stage — a failed game shows the notice instead. Forget the height
         the last one was offered, so placePanel cannot size this panel from a
         stage that is not there. */
      panel._wellRoom = 0;
      return;
    }
    var gw = gameW(currentGame);
    var gh = gameH(currentGame);

    /* Focus mode hides this game's metadata; the site header is dropped by
       relayout, before any of the heights here are measured. */
    panel.classList.toggle("is-focus", focused);

    /* Measure at the panel's FULL grid width unless told otherwise. Both the
       pin and the auto margins have to go: an auto margin on a grid item
       cancels `stretch`, so leaving them makes the panel shrink to its content
       and the game would be sized from that — smaller every pass. */
    if (!keepWidth) {
      panel.style.width = "";
      panel.style.marginLeft = "";
      panel.style.marginRight = "";
    }

    /* Measure everything that is NOT the stage by collapsing the stage first,
       so the well gets exactly the height left over — the panel then ends up
       `panelH` tall, with no dead space under the game. */
    well.style.height = "0px";
    box.style.width = "0px";
    /* A collapsed well still renders its own padding and border (border-box
       clamps the content box at 0, it does not shrink the frame), so take that
       back off or the panel ends up short by exactly that much. */
    var chrome = panel.offsetHeight - well.offsetHeight;
    var wellH = Math.max(120, Math.floor(panelH - chrome));
    well.style.height = wellH + "px";
    /* The height the stage was offered, before any trimming below. placePanel
       sizes the panel's WIDTH from this. */
    panel._wellRoom = wellH;

    /* offsetHeight rounds, so the panel can land a pixel or two over what was
       asked for — enough to tip it into another grid row, which would leave a
       dead strip of wall under it and scroll the page. Give those pixels back. */
    var over = panel.offsetHeight - panelH;
    if (over > 0 && wellH - over >= 120) {
      wellH -= over;
      well.style.height = wellH + "px";
    }

    /* clientWidth/Height are the padding box (border-box everywhere), so take
       the padding off to get the room the game actually has. */
    var cs = window.getComputedStyle(well);
    var innerW = well.clientWidth -
      (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    var innerH = well.clientHeight -
      (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);

    var scale = Math.min(innerW / gw, innerH / gh);
    box.style.aspectRatio = gw + " / " + gh;
    box.style.maxWidth = "none";
    box.style.width = Math.max(40, Math.floor(gw * scale)) + "px";

    /* When the WIDTH is what limits the game — a wide game on a narrow screen —
       the height it can use is less than the height it was offered, and the
       difference would show as dead bands of well above and below it. Give that
       height back: the well fits the game, and the wall's icons take the space
       instead. (When the height is what limits it, this is a no-op and the
       stage still uses every pixel there is.) */
    var neededH = Math.ceil(gh * scale);
    if (neededH < innerH) {
      wellH = Math.max(120, wellH - (innerH - neededH));
      well.style.height = wellH + "px";
    }
  }

  /* Centre the panel in the grid and claim enough rows for its content, so
     auto-placed icons flow around it. Returns its size in grid cells.

     The stage always uses the full height available (see fitStage), so the
     panel only needs to be as WIDE as the game is AT that height — its own
     aspect ratio decides. A portrait or square game therefore leaves side
     columns free for icons instead of sitting letterboxed in a full-width
     panel; a game wide enough to need every column simply takes them all. */
  function placePanel(m, availH, rowH) {
    if (!panel) {
      return null;
    }

    /* Shrink the panel to the game and centre it in the columns it was given,
       so the slack from rounding to whole columns shows as a gap between the
       game and the icons instead of dead bands inside the frame. */
    function pinPanelToGame() {
      var box = panel.querySelector(".player-box");
      var well = panel.querySelector(".stage-well");
      if (!box || !well || !box.offsetWidth) {
        return;
      }
      var wcs = window.getComputedStyle(well);
      /* Only the REAL chrome — the panel's padding and border, the well's
         border, the well's padding. Measuring `panel.offsetWidth -
         box.offsetWidth` instead would sweep up the slack we are trying to
         remove, and pin the panel right back to the width it already had. */
      var sideChrome = (panel.offsetWidth - well.offsetWidth) +
        (well.offsetWidth - well.clientWidth) +
        (parseFloat(wcs.paddingLeft) || 0) + (parseFloat(wcs.paddingRight) || 0);
      panel.style.width = box.offsetWidth + sideChrome + "px";
      panel.style.marginLeft = "auto";
      panel.style.marginRight = "auto";
    }

    function colsForStage(stageH) {
      var gw = gameW(currentGame);
      var gh = gameH(currentGame);
      var wantCols = Math.ceil(((stageH * gw) / gh + m.gap) / (m.colW + m.gap));
      return Math.max(4, Math.min(wantCols, m.cols));
    }

    /* Keep the leftover columns splittable in two, so the icon strips either
       side of the game are the same width and the game sits dead centre.
       WIDEN to fix an odd leftover rather than narrowing: colsForStage asks
       for exactly the width the game needs at the height on offer, so taking a
       column away makes the game width-bound and it stops using the full
       height — which is the whole point of the panel being that tall. */
    function applySpan(span) {
      if (span < m.cols && (m.cols - span) % 2 !== 0) {
        span += span + 1 <= m.cols ? 1 : -1;
      }
      panel.style.gridColumn = (m.cols - span) / 2 + 1 + " / span " + span;
      return span;
    }

    /* The panel is placed on whole grid rows, so cap it at the rows the wall
       actually has: one pixel more and it would claim a row that isn't there,
       stretching the wall past availH and scrolling the page for a strip of
       dead space under the game. The 2px is slack against rounding. */
    var wallRows = Math.max(1, Math.floor((availH + m.gap) / (rowH + m.gap)));

    var maxPanelH = Math.min(
      availH - 2,
      wallRows * rowH + (wallRows - 1) * m.gap
    );

    var span;
    if (currentGame) {
      /* Guess a width from the whole height, let fitStage measure what the
         bar and metadata really cost at that width, then settle on the width
         the game wants at the height it actually got. */
      span = applySpan(colsForStage(Math.max(160, availH - 56)));
      panel.style.gridRow = "auto";
      fitStage(maxPanelH);
      /* `wellRoom` is the height the stage was OFFERED, which is what the width
         should be derived from. The well's own height may be less — fitStage
         trims it when the game cannot use it all — and feeding that back here
         would shrink the panel, which would shrink it again next pass. */
      if (panel._wellRoom) {
        span = applySpan(colsForStage(panel._wellRoom));
      }
    } else {
      span = applySpan(Math.min(m.cols, 6));
    }

    /* Measure the panel across its whole column span, which is what decides
       how big the game can be. */
    panel.style.gridRow = "auto";
    fitStage(maxPanelH);

    /* Now shrink the panel to the game. The columns were rounded up to whole
       cells, so the span is nearly always a little wider than the game needs,
       and that slack belongs OUTSIDE the panel — as a gap between the game and
       the icons — rather than inside it as dead bands around the stage. Auto
       margins centre what is left inside the span. Everything from here on
       passes `keepWidth`, so the pin survives the remaining passes. */
    /* Only when there is a stage to hug. A game that failed to load has had
       its well replaced by the failure notice, and that notice should keep the
       panel's full width rather than being squeezed to a stage that no longer
       exists — reading a size off the missing box used to throw here, which
       aborted placePanel before it had placed the panel at all, leaving it at
       `grid-row: auto` and overlapping the icons. */
    var stageBox = panel.querySelector(".player-box");
    if (currentGame && stageBox) {
      /* Narrowing the panel rewraps the metadata onto more lines, which costs
         height, which shrinks a height-bound game, which wants a narrower
         panel again. The game only ever gets smaller, so this settles: pin,
         re-fit, and stop as soon as the game stops moving. The final pin is
         what makes the well hug it exactly. */
      for (var pass = 0; pass < 3; pass++) {
        var was = stageBox.offsetWidth;
        pinPanelToGame();
        fitStage(maxPanelH, true);
        if (stageBox.offsetWidth === was) {
          break;
        }
      }
      pinPanelToGame();
    } else {
      /* Let it span its columns again, in case a previous game pinned it. */
      panel.style.width = "";
      panel.style.marginLeft = "";
      panel.style.marginRight = "";
    }

    var rows = Math.max(1, Math.ceil((panel.offsetHeight + m.gap) / (rowH + m.gap)));

    /* Those rows are whole cells, so they usually reach a little past the
       panel's own height. Grow the stage into the difference rather than
       leaving a dead strip of wall under the game. */
    var exactH = Math.min(rows * rowH + (rows - 1) * m.gap, maxPanelH);
    if (exactH > panel.offsetHeight) {
      fitStage(exactH, true);
    }

    /* Centre the panel in whatever rows are left over, rather than pinning it
       to the top. Filling the stage comes FIRST — the game takes all the
       height or all the width it can — so spare rows only exist when the game
       ran out of width and could not use them. When they do exist they are
       split top and bottom, so the icons band the game on all four sides
       instead of piling up underneath it. An odd number cannot split evenly,
       and the extra row goes underneath.

       Anything left inside those rows is smaller than one tile row: the icons
       already take every whole row that fits, and a width-bound game cannot
       use spare height because fitStage would trim it straight back off. */
    var spareRows = Math.max(0, wallRows - rows);
    var startRow = Math.floor(spareRows / 2) + 1;
    panel.style.gridRow = startRow + " / span " + rows;

    return { cols: span, rows: rows };
  }

  /* One trial layout at a given row height: place the panel, then work out
     how many icon cells are left to fill. */
  function layoutPass(m, availH, rowH) {
    wall.style.setProperty("--row", rowH + "px");
    var geom = placePanel(m, availH, rowH);
    var rows = Math.max(1, Math.floor((availH + m.gap) / (rowH + m.gap)));
    var totalRows = geom ? Math.max(rows, geom.rows) : rows;
    var cells = m.cols * totalRows - (geom ? geom.cols * geom.rows : 0);
    return { geom: geom, rows: rows, cells: Math.max(cells, 0) };
  }

  /* Grow fillList with freshly shuffled repeats. Grow-only, so the tiles
     already on screen never reorder — shrinking is just a shorter slice. */
  function extendFill(target) {
    if (!baseList.length) {
      return;
    }
    var guard = 0;
    while (fillList.length < target && guard++ < 500) {
      var block = shuffle(baseList);
      /* Avoid an immediate repeat across the seam. */
      if (
        fillList.length &&
        block.length > 1 &&
        block[0].id === fillList[fillList.length - 1].id
      ) {
        var tmp = block[0];
        block[0] = block[1];
        block[1] = tmp;
      }
      fillList = fillList.concat(block);
    }
  }

  /* ---- Which games get the space ---------------------------

     The wall only has room for so many icons, and when a game is open it has
     far fewer. `baseList` decides what gets cut, so its ORDER is the policy:
     whatever sits at the front survives.

     One rule, applied to everything: deal the games out one series at a time,
     and let the series that gained a game most recently take the first turn.

       Papa's, Fancy Pants, Insanity Box, Fireboy, Snail Bob… Papa's, Fancy
       Pants, …

     That is both of the things the wall is meant to do at once. Every series
     is represented before any series repeats, so six Snail Bobs cannot eat
     the wall and hide six other games. And a game carrying an `added` date —
     what someone came back to see — still surfaces at the front, because its
     series is dealt first and it is the first card out of that series.

     Doing it in one pass matters more than it looks. The obvious shape is two
     passes, new arrivals and then the round-robin, and it works right up until
     a batch of new arrivals is all ONE series: adding the fourteen Papa's
     games in a single day would have handed that series the entire top of the
     wall, which is the exact thing the round-robin exists to prevent.

     Games with no `added` date are not "old" — the field is optional and most
     entries have never had it — they simply do not pull their series forward.
     A game with no series is its own bucket, so standalone games are dealt
     alongside the series rather than after them.

     Within all of that the order stays shuffled, so the wall still looks
     different on every load. */
  function addedTime(game) {
    var t = Date.parse(game.added || "");
    return isFinite(t) ? t : null;
  }

  function newest(game) {
    return addedTime(game) || 0;
  }

  function prioritise(games) {
    var shuffled = shuffle(games);

    /* Bucket by series, keeping the shuffled order inside each bucket. */
    var order = [];
    var buckets = {};
    shuffled.forEach(function (g) {
      var key = g.series ? "s:" + normalize(g.series) : "g:" + g.id;
      if (!buckets[key]) {
        buckets[key] = [];
        order.push(key);
      }
      buckets[key].push(g);
    });

    /* Newest game first out of each bucket, and the bucket holding the newest
       game deals first. Both sorts are stable, so games and series that are
       equally new — which is most of them — keep the shuffled order. */
    order.forEach(function (key) {
      buckets[key].sort(function (a, b) {
        return newest(b) - newest(a);
      });
    });
    order.sort(function (a, b) {
      return newest(buckets[b][0]) - newest(buckets[a][0]);
    });

    var dealt = [];
    var dealing = true;
    while (dealing) {
      dealing = false;
      for (var i = 0; i < order.length; i++) {
        var bucket = buckets[order[i]];
        if (bucket.length) {
          dealt.push(bucket.shift());
          dealing = true;
        }
      }
    }
    return dealt;
  }

  function listToShow(cells) {
    var query = activeQuery();

    /* While filtering, show exactly the matches — padding a deliberately
       narrowed result with repeats would be actively misleading. */
    if (query) {
      return wallGames.filter(function (g) {
        return matches(g, query);
      });
    }
    /* With a game open, fill exactly the cells left around the panel (padding
       with repeats) so the wall never scrolls just to show every icon — the
       open game is the focus, and closing it brings the full set back. With no
       panel open, show every distinct game at least once. */
    if (!currentId && cells <= baseList.length) {
      return baseList.slice();
    }
    extendFill(cells);
    return fillList.slice(0, cells);
  }

  /* ---- Tiles ------------------------------------------------ */

  /* Point an <img> at a game image, falling back down a chain if a source
     fails: the given URL, then the archive's own item thumbnail, then the
     local placeholder. */
  function attachThumb(img, game, preferred) {
    var srcs = [];
    if (preferred) {
      srcs.push(preferred);
    }
    if (game["archive.org"]) {
      srcs.push("https://archive.org/services/img/" +
        encodeURIComponent(game["archive.org"]));
    }
    srcs.push(PLACEHOLDER);

    var i = 0;
    function next() {
      img.src = srcs[i++];
    }
    img.addEventListener("error", function () {
      if (i < srcs.length) {
        next();
      }
    });
    next();
  }

  /* Build a game's tile art as two layers, which lets any icon fill a square
     tile without being cropped or stretched:

       back  — `thumb`, scaled to COVER and heavily blurred, as a colour wash
       front — `thumb2` if the entry has one, else `thumb`, CONTAINed and sharp

     A square icon therefore reads as itself over a blurred copy of itself,
     while a wide banner (which is what most official logos are) sits intact
     in front of its own colours instead of being cropped to a square. Where a
     squarer logo from another release of the same game exists, it can be the
     wash while `thumb2` keeps the art of the release we actually play. This is
     the CSS version of what used to be baked into thumbs/ with ImageMagick. */
  function buildArt(game, className) {
    var art = el("span", className || "tile-art");
    if (game.thumb2) {
      /* Marks the entry as having a distinct second icon, which changes the
         tile from "composite" to "clear, revealing thumb2 on hover" (CSS). */
      art.className += " has-alt";
    }
    var back = el("img", "tile-bg");
    back.alt = "";
    back.setAttribute("aria-hidden", "true");
    back.loading = "lazy";
    attachThumb(back, game, game.thumb);

    var front = el("img", "tile-fg");
    front.alt = game.title || game.id || "game";
    front.loading = "lazy";
    attachThumb(front, game, game.thumb2 || game.thumb);

    art.appendChild(back);
    art.appendChild(front);
    return art;
  }

  /* Some games are in the catalogue but cannot be played here — a publisher's
     URL-lock, usually. The entry says so in `error`, and the tile says so too,
     because finding out by clicking and staring at a lock screen is worse than
     being told. The text is the tooltip; the badge is the glance. */
  function markBroken(link, game) {
    if (!game.error) {
      return;
    }
    link.classList.add("is-broken");
    link.title = "Does not work here — " + game.error;
    link.appendChild(el("span", "tile-broken", "!"));
  }

  function makeTile(game) {
    var link = el("a", "tile");
    /* A real link, so ctrl/cmd-click opens the game in a new tab. */
    link.href = "index.html#play=" + encodeURIComponent(game.id);
    link.setAttribute("data-id", game.id);

    link.appendChild(buildArt(game));
    link.appendChild(el("span", "tip", game.title || game.id));
    markBroken(link, game);

    function describe() {
      if (!readout) {
        return;
      }
      var bits = [game.title || game.id];
      if (game.author) {
        bits.push(game.author);
      }
      if (releaseYear(game)) {
        bits.push(releaseYear(game));
      }
      readout.textContent = bits.join("  ·  ");
      if (game.error) {
        readout.appendChild(el("span", "readout-broken", "  ·  does not work here"));
      }
      /* Flip the label below the icon when it would sit off the top. */
      link.classList.toggle("tip-below", link.getBoundingClientRect().top < 52);
    }

    link.addEventListener("mouseenter", describe);
    link.addEventListener("focus", describe);
    link.addEventListener("mouseleave", idleReadout);
    link.addEventListener("blur", idleReadout);

    link.addEventListener("click", function (e) {
      /* Let modified clicks fall through to the standalone page. */
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      window.location.hash = "play=" + encodeURIComponent(game.id);
    });

    return link;
  }

  function markPlayingTile() {
    var tiles = wall.querySelectorAll(".tile");
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].classList.toggle(
        "is-playing",
        currentId !== null && tiles[i].getAttribute("data-id") === currentId
      );
    }
  }

  function dropAll(selector) {
    var nodes = wall.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].parentNode.removeChild(nodes[i]);
    }
  }

  /* Reconcile the wall against `list`. Because the list is stable-prefixed,
     resizing only appends or trims tiles at the end — existing icons keep
     their place and their loaded images. `rebuild` forces a clean slate,
     used when the filter changes the list wholesale. */
  function renderWall(list, rebuild) {
    dropAll(".wall-loading, .wall-empty");
    if (rebuild) {
      dropAll(".tile");
    }

    var current = wall.querySelectorAll(".tile");
    for (var i = current.length - 1; i >= list.length; i--) {
      current[i].parentNode.removeChild(current[i]);
    }

    var frag = document.createDocumentFragment();
    for (var j = current.length; j < list.length; j++) {
      frag.appendChild(makeTile(list[j]));
    }
    if (frag.childNodes.length) {
      wall.appendChild(frag);
    }

    /* An empty wall has three causes, and only two of them are worth saying.
       A filter that matched nothing, and a manifest with nothing in it, are
       both news. An open game that left no room for icons is not — that is
       just a big game on a small screen, and a notice in the margin would be
       both wrong ("no games") and in the way. */
    if (!list.length) {
      var query = activeQuery();
      if (query) {
        wall.appendChild(el("div", "wall-empty", 'No games match "' + query + '".'));
      } else if (!wallGames.length) {
        wall.appendChild(el("div", "wall-empty", "No games in games.json yet."));
      }
    }

    markPlayingTile();
    updateCounter(list);
  }

  /* The counter reports distinct games, never the on-screen repeats. */
  function updateCounter(list) {
    if (!countEl) {
      return;
    }
    var query = activeQuery();
    countEl.textContent = pad(query ? list.length : wallGames.length, 4);
  }

  /* Measure, place the panel, work out how many icons fit, render.

     Preferred outcome: rows stretched so the wall ends exactly where the
     footer begins — the whole page visible, no scrollbar. That only holds
     while there is spare room to pad with duplicates. If the catalogue
     itself overflows, or the panel needs more rows than fit, the page is
     going to scroll regardless, so the second pass reverts to properly
     square cells and re-places the panel against that real row height. */
  function relayout(rebuild) {
    /* Focus hides the site header, which changes how much height the wall
       has — so it must be applied BEFORE anything is measured. */
    document.body.classList.toggle("is-focus", focused && !!panel);

    var m = gridMetrics();
    var availH = availableWallHeight();
    var rows = bestRowCount(availH, m.colW, m.gap);

    var pass = layoutPass(m, availH, rowHeightFor(availH, rows, m.gap));
    var list = listToShow(pass.cells);

    if (list.length > pass.cells || (pass.geom && pass.geom.rows > pass.rows)) {
      /* Either the distinct catalogue can't fit around the panel, or the panel
         needs more rows than fit — the page will scroll regardless, so revert
         to properly square cells and re-place the panel against them. */
      pass = layoutPass(m, availH, m.colW);
      list = listToShow(pass.cells);
    }

    renderWall(list, rebuild);
  }

  /* ---- Inline game panel ----------------------------------- */

  /* Flashpoint records a developer as a `;`-separated list of credits, each of
     which may carry the same person's aliases after a `/` ("Brad Borne / Borne
     Games / DrNeroCF"). Show the first name of each credit — the rest is noise
     in a one-line panel — and keep the full string in the tooltip. */
  function creditLine(game) {
    if (!game.developer) {
      return game.author ? String(game.author) : "";
    }
    return String(game.developer)
      .split(";")
      .map(function (part) {
        return part.split("/")[0].trim();
      })
      .filter(Boolean)
      .join(", ");
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* The year on its own, for the hover readout and the catalogue subtitle.
     Taken off the front of `releaseDate` rather than stored a second time —
     two fields for one fact drift apart, and ours already had (Red Ball's
     said 2008 and 2009). */
  function releaseYear(game) {
    var m = /^(\d{4})/.exec(String(game.releaseDate || ""));
    return m ? m[1] : "";
  }

  /* Flashpoint release dates come as YYYY or YYYY-MM-DD; anything else is
     passed through untouched rather than mangled into a wrong date. */
  function releasedText(game) {
    var raw = game.releaseDate ? String(game.releaseDate) : "";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) {
      return Number(m[3]) + " " + MONTHS[Number(m[2]) - 1] + " " + m[1];
    }
    if (/^\d{4}$/.test(raw)) {
      return raw;
    }
    return raw;
  }

  function teardownPanel() {
    if (panel) {
      /* A Flashpoint GameZIP is unzipped into a blob: URL; free it with the
         panel rather than leaking it for the life of the page. */
      FP.releaseStage(panel.querySelector(".player-box"));
    }
    if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    panel = null;
    currentId = null;
    currentGame = null;
    focused = false;
    markPlayingTile();
  }

  function buildPanel(game) {
    teardownPanel();
    currentId = String(game.id);
    currentGame = game;

    panel = el("div", "game-panel");

    /* Title bar */
    var bar = el("div", "panel-bar");
    bar.appendChild(el("h2", null, game.title || game.id));

    /* "Focus" strips the page down to the game: the site header and the
       game's own metadata step aside, and the stage takes the height they
       were using. Everything else — the wall, the title bar — stays put. */
    var big = el("button", "panel-enlarge", focused ? "⤡ Unfocus" : "⤢ Focus");
    big.type = "button";
    big.title = "Hide the page header and details — just the game";
    big.setAttribute("aria-label", "Focus on the game");
    big.addEventListener("click", function () {
      focused = !focused;
      big.textContent = focused ? "⤡ Unfocus" : "⤢ Focus";
      big.title = focused
        ? "Bring the page header and details back"
        : "Hide the page header and details — just the game";
      big.setAttribute("aria-label", focused ? "Leave focus mode" : "Focus on the game");
      relayout(false);
      window.scrollTo(0, 0);
    });
    bar.appendChild(big);

    var close = el("button", "panel-close", "✕");
    close.type = "button";
    close.title = "Close this game";
    close.setAttribute("aria-label", "Close this game");
    close.addEventListener("click", function () {
      clearHash();
      teardownPanel();
      idleReadout();
      relayout(false);
    });
    bar.appendChild(close);
    panel.appendChild(bar);

    /* Stage */
    var well = el("div", "stage-well");
    var box = el("div", "player-box");
    well.appendChild(box);
    panel.appendChild(well);

    /* Fullscreen button in the title bar (blows up the stage well). */
    bar.insertBefore(FP.makeFsButton(function () { return well; }, "panel-fs"), close);

    /* Compact metadata: credits line, blurb, controls */
    var meta = el("div", "panel-meta");

    /* A URL-locked game LOADS perfectly well — it just shows the publisher's
       lock screen instead of the game — so mount() never fails and the usual
       failure notice never appears. Say it here instead, and let the visitor
       see the lock for themselves rather than blocking the attempt. */
    if (game.error) {
      var warn = el("div", "panel-broken");
      warn.appendChild(el("b", null, "Does not work here. "));
      warn.appendChild(document.createTextNode(game.error));
      meta.appendChild(warn);
    }

    var credits = el("div", "credits");
    var by = creditLine(game);
    if (by) {
      credits.appendChild(document.createTextNode("by "));
      var who = el("b", null, by);
      if (game.developer && game.developer !== by) {
        who.title = game.developer; /* the full credit, aliases and all */
      }
      credits.appendChild(who);
      credits.appendChild(document.createTextNode("  ·  "));
    }
    var released = releasedText(game);
    if (released) {
      credits.appendChild(document.createTextNode(released + "  ·  "));
    }
    credits.appendChild(document.createTextNode("License: "));
    credits.appendChild(FP.licenseNode(game));
    /* Same line, so the extra provenance links cost the stage no height. */
    var sources = FP.sourceLinks(game);
    if (sources.childNodes.length) {
      credits.appendChild(document.createTextNode("  ·  "));
      credits.appendChild(sources);
    }
    meta.appendChild(credits);

    /* Series, tags and play modes. Each is a link into the catalogue, so a
       chip is a way to find more of the same rather than just a label. Three
       kinds, tinted differently because they answer different questions: the
       series leads the row and searches by name (a series is not a tag, so it
       filters through the search box), then the genre tags, then how many
       people play it — which is a property of the game, not a genre. */
    var tags = Array.isArray(game.tags) ? game.tags : [];
    var modes = Array.isArray(game.playModes) ? game.playModes : [];
    if (game.series || tags.length || modes.length) {
      var tagRow = el("div", "panel-tags");
      if (game.series) {
        var seriesChip = el("a", "tag-chip series-chip", game.series);
        seriesChip.href = "index.html?all=1&q=" + encodeURIComponent(game.series);
        seriesChip.title = "Show the whole " + game.series + " series";
        tagRow.appendChild(seriesChip);
      }
      tags.forEach(function (tag) {
        /* Flashpoint tags a series game with the series name too; the series
           chip beside it already says that, so don't print it twice. */
        if (game.series && normalize(tag) === normalize(game.series)) {
          return;
        }
        var chip = el("a", "tag-chip", tag);
        chip.href = "index.html?all=1&tag=" + encodeURIComponent(tag);
        chip.title = "Show all " + tag + " games";
        tagRow.appendChild(chip);
      });
      modes.forEach(function (mode) {
        var chip = el("a", "tag-chip mode-chip", mode);
        chip.href = "index.html?all=1&mode=" + encodeURIComponent(mode);
        chip.title = "Show all " + mode + " games";
        tagRow.appendChild(chip);
      });
      meta.appendChild(tagRow);
    }

    /* Blurb and controls sit side by side to keep the panel short. */
    var controls = FP.buildControls(game);
    if (game.description || controls) {
      var cols = el("div", "panel-cols");
      if (game.description) {
        cols.appendChild(el("div", "blurb", game.description));
      }
      if (controls) {
        cols.appendChild(controls);
      }
      meta.appendChild(cols);
    }
    panel.appendChild(meta);

    wall.insertBefore(panel, wall.firstChild);

    /* Ask about saved progress before the first game runs; if declined, back
       out of opening the game entirely. */
    FP.ensureSaveNotice().then(function (ok) {
      if (!ok) {
        clearHash();
        teardownPanel();
        idleReadout();
        relayout(false);
        return;
      }
      FP.mount(box, game, function (kind) {
        /* The notice is about to carry the reason, so drop the banner that
           says the same thing over the credits. */
        var banner = panel && panel.querySelector(".panel-broken");
        if (banner && banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
        well.className = "stage-message";
        /* Drop the stage height fitStage gave it: there is no game to hold
           open any more, so the notice should be as tall as the notice. */
        well.style.height = "";
        well.textContent = "";
        well.appendChild(FP.failureNode(kind, game));
        relayout(false);
      });
    });

    /* The panel eats a block of cells, so the icon count is recomputed. */
    relayout(false);

    /* The panel always opens at the top of the wall, so going to the top of
       the page reveals it while keeping the header and readout in view. */
    window.scrollTo(0, 0);
  }

  /* ---- Routing (#play=<id>) -------------------------------- */

  function clearHash() {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    } else {
      window.location.hash = "";
    }
  }

  function syncFromHash() {
    var m = /^#play=(.+)$/.exec(window.location.hash);
    var id = m ? decodeURIComponent(m[1]) : null;

    if (!id) {
      if (panel) {
        teardownPanel();
        idleReadout();
        relayout(false);
      }
      return;
    }
    if (id === currentId) {
      return;
    }
    var game = FP.findById(allGames, id);
    if (!game) {
      teardownPanel();
      relayout(false);
      return;
    }
    buildPanel(game);
  }

  /* ---- Filtering (revealed by typing) ---------------------- */

  function matches(game, query) {
    if (!query) {
      return true;
    }
    /* Everything a person might reasonably type: the series so one game's
       series chip finds its siblings, and the alternate titles because plenty
       of these games shipped under a different name on a different portal. */
    var parts = [
      game.title,
      game.series,
      game.author,
      game.developer,
      game.description
    ];
    if (Array.isArray(game.alternateTitles)) {
      parts = parts.concat(game.alternateTitles);
    }
    if (Array.isArray(game.tags)) {
      parts = parts.concat(game.tags);
    }
    if (Array.isArray(game.playModes)) {
      parts = parts.concat(game.playModes);
    }
    var hay = parts.map(normalize).join(" ");
    return query.split(/\s+/).every(function (term) {
      return term === "" || hay.indexOf(term) !== -1;
    });
  }

  function applyFilter() {
    relayout(true);
    if (filterNote) {
      var query = activeQuery();
      filterNote.textContent = query
        ? wall.querySelectorAll(".tile").length + " of " + wallGames.length
        : "";
    }
  }

  function openFilter() {
    if (strip && strip.hasAttribute("hidden")) {
      strip.removeAttribute("hidden");
    }
    if (filterEl) {
      filterEl.focus();
    }
  }

  function closeFilter() {
    if (filterEl) {
      filterEl.value = "";
      filterEl.blur();
    }
    if (strip) {
      strip.setAttribute("hidden", "");
    }
    applyFilter();
  }

  function wireFilter() {
    if (filterEl) {
      filterEl.addEventListener("input", applyFilter);
    }
    if (filterClear) {
      filterClear.addEventListener("click", closeFilter);
    }

    /* True when the keyboard belongs to the game: Ruffle retargets key events
       from inside its shadow root to the <ruffle-player> host, so both the
       event target and the focused element land inside the stage. The wall has
       no search box — any printable key starts filtering — so without this the
       game's own WASD/arrows/space would be typed into the filter instead. */
    function stageHasKeyboard(e) {
      var node = (e && e.target) || null;
      if (node && node.closest && node.closest(".player-box")) {
        return true;
      }
      var active = document.activeElement;
      return !!(active && active.closest && active.closest(".player-box"));
    }

    document.addEventListener("keydown", function (e) {
      var tag = e.target && e.target.tagName;
      var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape") {
        if (strip && !strip.hasAttribute("hidden")) {
          closeFilter();
        } else if (panel) {
          clearHash();
          teardownPanel();
          idleReadout();
          relayout(false);
        }
        return;
      }

      if (typing || e.ctrlKey || e.metaKey || e.altKey || stageHasKeyboard(e)) {
        return;
      }
      /* Any printable key starts filtering — the wall has no search bar. */
      if (e.key && e.key.length === 1 && /\S/.test(e.key)) {
        e.preventDefault();
        openFilter();
        filterEl.value += e.key;
        applyFilter();
      }
    });
  }

  /* ---- Boot ------------------------------------------------- */

  function initVisitorCounter() {
    var visitorEl = document.getElementById("visitor-count");
    if (!visitorEl) {
      return;
    }
    var base = 24576;
    var visits = 1;
    try {
      visits = (parseInt(localStorage.getItem("fa_visits"), 10) || 0) + 1;
      localStorage.setItem("fa_visits", String(visits));
    } catch (e) {
      visits = 1;
    }
    visitorEl.textContent = pad(base + visits, 6);
  }

  function showLoadError() {
    dropAll(".wall-loading, .wall-empty");
    wall.appendChild(
      el(
        "div",
        "wall-empty",
        "Could not load games.json. If you opened this file directly, run a " +
          "local web server instead (see the README)."
      )
    );
    if (countEl) {
      countEl.textContent = pad(0, 4);
    }
  }

  /* ---- "Show All Games" catalogue -------------------------- */

  function catTile(game) {
    var link = el("a", "tile cat");
    link.href = "index.html#play=" + encodeURIComponent(game.id);
    link.setAttribute("data-id", game.id);

    link.appendChild(buildArt(game, "tile-art cat-shot"));
    markBroken(link, game);

    link.appendChild(el("div", "cat-title", game.title || game.id));
    var sub = [];
    if (game.author) {
      sub.push(game.author);
    }
    if (releaseYear(game)) {
      sub.push(releaseYear(game));
    }
    if (sub.length) {
      link.appendChild(el("div", "cat-sub", sub.join(" · ")));
    }
    return link;
  }

  /* ---- Catalogue order -------------------------------------

     The wall is deliberately shuffled; the catalogue is the opposite — it is
     the page you come to when you want to FIND something, so it is sorted and
     it stays sorted.

     Sorted by family, A–Z, where a family is the series if there is one and
     the title if there is not. That keeps a series whole and in one place —
     Fancy Box and The Cutie Pants Adventures sit with the Fancy Pants worlds
     rather than under F and C — while standalone games slot in alphabetically
     between them.

     A leading "The " is ignored for sorting, the usual library convention, so
     The Fancy Pants Adventures files under F and does not clump with every
     other The-something at the end of the list.

     Within a family: release YEAR first, then title. The year rather than the
     full date on purpose — "2020" and "2020-03-24" are both real values in
     games.json and comparing them as strings puts the vaguer one first, which
     is how World 4 Part 1 ended up after Part 2. Year-then-title gives story
     order for Henry Stickmin (2008 → 2015) and numeric order for the Fancy
     Pants worlds, which is what a reader expects of each.

     This is display-only: games.json keeps its hand-authored grouping, so it
     stays readable and its diffs stay small. */
  function sortKey(game) {
    var family = game.series || game.title || game.id || "";
    return normalize(family).replace(/^the\s+/, "");
  }

  function releaseYearNumber(game) {
    var y = parseInt(releaseYear(game), 10);
    return isFinite(y) ? y : Infinity; /* undated sorts last within its family */
  }

  function byCatalogueOrder(a, b) {
    var fa = sortKey(a);
    var fb = sortKey(b);
    if (fa !== fb) {
      return fa < fb ? -1 : 1;
    }
    var ya = releaseYearNumber(a);
    var yb = releaseYearNumber(b);
    if (ya !== yb) {
      return ya - yb;
    }
    /* `numeric` so "Part 2" precedes "Part 10". */
    return String(a.title || "").localeCompare(String(b.title || ""), undefined, {
      numeric: true,
      sensitivity: "base"
    });
  }

  function renderCatalogue(query) {
    wall.textContent = "";
    var list = allGames.filter(function (g) {
      return matches(g, query) && hasAllSelectedTags(g);
    }).sort(byCatalogueOrder);

    var frag = document.createDocumentFragment();
    list.forEach(function (g) {
      frag.appendChild(catTile(g));
    });
    wall.appendChild(frag);
    if (countEl) {
      countEl.textContent = pad(query ? list.length : wallGames.length, 4);
    }
  }

  /* Selected names, in the order they were picked. Tags and play modes are
     kept apart because they are different fields, but they narrow the same
     way: everything selected must be present, so picking two is "show me the
     games that are both", which is what a filter is usually expected to do. */
  var selectedTags = [];
  var selectedModes = [];

  function hasAll(want, have) {
    if (!want.length) {
      return true;
    }
    var got = (have || []).map(normalize);
    return want.every(function (w) {
      return got.indexOf(normalize(w)) !== -1;
    });
  }

  function hasAllSelectedTags(game) {
    return hasAll(selectedTags, game.tags) && hasAll(selectedModes, game.playModes);
  }

  /* Mirror the filter state into the query string, so the filtered view is
     shareable, survives a reload, and matches the `?all=1&tag=…` and
     `?all=1&q=…` links the panel's chips use. replaceState rather than
     pushState: toggling chips should not bury the previous page under a stack
     of history entries. */
  function syncFiltersToUrl() {
    if (!window.history || !window.history.replaceState) {
      return;
    }
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return;
    }
    params.delete("tag");
    selectedTags.forEach(function (tag) {
      params.append("tag", tag);
    });
    params.delete("mode");
    selectedModes.forEach(function (mode) {
      params.append("mode", mode);
    });
    var q = filterEl ? filterEl.value.trim() : "";
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    var qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? "?" + qs : "") + window.location.hash
    );
  }

  /* Every distinct value of one field across the catalogue, alphabetical and
     case-insensitive. */
  function allValues(field) {
    var seen = {};
    var out = [];
    allGames.forEach(function (g) {
      (g[field] || []).forEach(function (t) {
        var k = normalize(t);
        if (!seen[k]) {
          seen[k] = true;
          out.push(t);
        }
      });
    });
    return out.sort(function (a, b) {
      return normalize(a) < normalize(b) ? -1 : 1;
    });
  }

  /* A single horizontally scrollable row of chips, sat between the top bar and
     the search strip. Clicking one toggles it. Genre tags come first, then a
     divider, then the play modes — there are only two or three of those and
     they answer a different question ("can I play this with someone?"), so
     they would be lost sorted in among fifty genres. */
  function buildTagBar(onChange) {
    var bar = el("div", "tag-bar");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Filter by tag and play mode");

    var clearBtn = el("button", "tag-chip tag-clear", "All");
    clearBtn.type = "button";
    clearBtn.title = "Clear tag and play-mode filters";
    bar.appendChild(clearBtn);

    var chips = [];

    function addChips(values, selection, extraClass) {
      values.forEach(function (value) {
        var chip = el("button", "tag-chip" + (extraClass ? " " + extraClass : ""), value);
        chip.type = "button";
        chip.setAttribute("aria-pressed", "false");
        chip.addEventListener("click", function () {
          var at = selection().indexOf(value);
          if (at === -1) {
            selection().push(value);
          } else {
            selection().splice(at, 1);
          }
          paint();
          onChange(); /* re-renders, and mirrors the filters into the URL */
        });
        chips.push({ value: value, node: chip, selection: selection });
        bar.appendChild(chip);
      });
    }

    addChips(allValues("tags"), function () { return selectedTags; });

    var modes = allValues("playModes");
    if (modes.length) {
      bar.appendChild(el("span", "tag-sep", ""));
      addChips(modes, function () { return selectedModes; }, "mode-chip");
    }

    clearBtn.addEventListener("click", function () {
      selectedTags = [];
      selectedModes = [];
      paint();
      onChange();
    });

    function paint() {
      chips.forEach(function (c) {
        var on = c.selection().indexOf(c.value) !== -1;
        c.node.classList.toggle("is-on", on);
        c.node.setAttribute("aria-pressed", on ? "true" : "false");
      });
      clearBtn.classList.toggle(
        "is-on",
        selectedTags.length === 0 && selectedModes.length === 0
      );
    }
    paint();
    return bar;
  }

  function setupCatalogue() {
    document.body.classList.add("all-mode");
    wall.classList.add("catalogue");
    dropAll(".wall-loading");

    /* ?tag=Puzzle and ?mode=Cooperative preselect one each — that is what the
       panel's chips link to — and ?q=Red+Ball fills the search box, which is
       how a series chip carries a whole series over to this view. */
    try {
      var params = new URLSearchParams(window.location.search);
      params.getAll("tag").forEach(function (t) {
        if (t && selectedTags.indexOf(t) === -1) {
          selectedTags.push(t);
        }
      });
      params.getAll("mode").forEach(function (t) {
        if (t && selectedModes.indexOf(t) === -1) {
          selectedModes.push(t);
        }
      });
      var q = params.get("q");
      if (q && filterEl) {
        filterEl.value = q;
      }
    } catch (e) {
      /* no URLSearchParams — skip preselection */
    }

    var toggle = document.getElementById("view-toggle");
    if (toggle) {
      toggle.textContent = "‹ Back to the wall";
      toggle.setAttribute("href", window.location.pathname);
    }
    if (readout) {
      readout.textContent = "Showing every game once — click one to open its page";
    }
    if (strip) {
      strip.removeAttribute("hidden"); /* a visible search box, for checking */
    }
    function run() {
      renderCatalogue(filterEl ? filterEl.value.trim().toLowerCase() : "");
      syncFiltersToUrl();
    }

    /* Between the top bar and the search strip, as its own row. */
    var bar = buildTagBar(run);
    if (strip && strip.parentNode) {
      strip.parentNode.insertBefore(bar, strip);
    } else {
      wall.parentNode.insertBefore(bar, wall);
    }

    if (filterEl) {
      filterEl.addEventListener("input", run);
    }
    if (filterClear) {
      filterClear.addEventListener("click", function () {
        if (filterEl) {
          filterEl.value = "";
          filterEl.focus();
        }
        run();
      });
    }
    run();
  }

  function init() {
    initVisitorCounter();

    FP.loadManifest()
      .then(function (games) {
        allGames = games;
        /* A game with `error` cannot be played, so it is kept off the wall and
           out of the count — "GAMES ONLINE" should mean what it says. It stays
           in the catalogue (?all=1), where the point is to show the whole
           collection, marked as broken and with the reason. */
        wallGames = games.filter(function (g) {
          return !g.error;
        });

        if (ALL_MODE) {
          setupCatalogue();
          return;
        }

        baseList = prioritise(wallGames);
        fillList = baseList.slice();

        relayout(true);
        idleReadout();
        wireFilter();

        window.addEventListener("hashchange", syncFromHash);
        syncFromHash();

        window.addEventListener("resize", function () {
          window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(function () {
            relayout(false);
          }, 120);
        });
      })
      .catch(function (err) {
        if (window.console) {
          console.error("Failed to load manifest:", err);
        }
        showLoadError();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
