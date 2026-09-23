/* ============================================================
   Flashback Arcade — shared player module.

   Exposes window.FlashbackPlayer: the game-mounting, fullscreen
   and saved-progress helpers used by the wall (js/app.js). Every
   game plays inline on the wall; there is no separate page.

   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  const MANIFEST = "games.json";
  const DEFAULT_WIDTH = 640;
  const DEFAULT_HEIGHT = 480;
  const RUFFLE_TIMEOUT_MS = 10000;

  /* Captured before anything can wrap it, and used for every fetch THIS site
     makes. window.fetch is later replaced by the game network policy below, so
     keeping our own calls on the original keeps that policy free to be as
     strict as it likes without ever cutting off the manifest or a GameZIP. */
  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;

  const MESSAGES = {
    unsupported: [
      "This game may not be fully supported by the emulator yet.",
      "Ruffle could not start this file. Support for ActionScript 3 games is " +
      "still in progress, and some titles will not run correctly. You can " +
      "try reloading the page, or pick another game."
    ],
    nogame: [
      "No game loaded",
      "This catalogue entry names no playable source yet. Give it a " +
      "`fileLocal`, `fileArchive`, `file` or `fileFlashpointArchiveZip` " +
      "in games.json to make it playable."
    ],
    notfound: [
      "Game not found",
      "That game is not in the catalogue. It may have been removed, or the " +
      "link may be mistyped."
    ],
    manifest: [
      "Could not load games.json",
      "If you opened this file directly, run a local web server instead — " +
      "see the README."
    ],
    archive: [
      "Could not reach the Internet Archive",
      "This game streams from archive.org and the archive did not respond. " +
      "Check your connection and reload."
    ]
  };

  /* ---- DOM helpers ----------------------------------------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className)
      node.className = className;
    if (text !== undefined && text !== null)
      node.textContent = String(text);
    return node;
  }

  function clear(node) {
    if (node) node.textContent = "";
  }

  function notice(heading, body) {
    var box = el("div", "notice");
    box.appendChild(el("strong", null, heading));
    box.appendChild(document.createTextNode(body));
    return box;
  }

  function messageBox(kind) {
    var m = MESSAGES[kind] || MESSAGES.unsupported;
    return notice(m[0], m[1]);
  }

  /* The same notice, plus a way out: if the archives hold this game, offer the
     links rather than framing those pages here. Going to archive.org is then
     the visitor's decision, made knowingly, instead of something this page
     does to them the moment a game fails to start. */
  function failureNode(kind, game) {
    /* An entry that already says why it does not work says it here, in the
       visitor's words. The `nogame` text is written for whoever maintains
       games.json — telling a player to add a `fileArchive` field helps nobody
       — and it would only repeat the banner above the credits. */
    var box = game && game.error
      ? notice("This game does not work here. ", String(game.error))
      : messageBox(kind);
    if (!game) {
      return box;
    }
    var outs = [];
    if (archivePageUrl(game)) {
      outs.push(extLink("Play it at archive.org ↗", archivePageUrl(game),
        "Opens the Internet Archive's own player in a new tab"));
    }
    if (game["flashpointarchive.org"]) {
      outs.push(extLink("Play it at 9o3o ↗",
        FLASHPOINT_PLAY + encodeURIComponent(game["flashpointarchive.org"]),
        "Opens Flashpoint's web player in a new tab"));
    }
    if (!outs.length) {
      return box;
    }
    var row = el("div", "notice-outs");
    outs.forEach(function (link, i) {
      if (i) {
        row.appendChild(document.createTextNode(" · "));
      }
      row.appendChild(link);
    });
    box.appendChild(row);
    return box;
  }

  function positiveNumber(value, fallback) {
    var n = Number(value);
    return isFinite(n) && n > 0 ? n : fallback;
  }

  /* ---- "We are fetching it" ---------------------------------

     Every one of these games arrives over the network at the moment it is
     asked for — between 0.7 MB and 16 MB of it — and a Flashpoint GameZIP is
     then unpacked in the page on top of that. Until this existed the stage sat
     black for all of it, which reads as a broken game rather than a busy one.

     This is deliberately NOT the game's own loading screen. That one belongs
     to the game, runs after the movie has started, and is the author's work.
     This one is the site's, it runs BEFORE the movie exists, and it goes away
     the moment Ruffle reports the movie ready — so the two never overlap and
     a visitor is never looking at nothing. */
  function megabytes(n) {
    return (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + " MB";
  }

  function stageLoader(box) {
    var wrap = el("div", "stage-loading");
    var label = el("div", "loader-label", "Fetching the game…");
    var track = el("div", "loader-bar");
    var fill = el("i");
    track.appendChild(fill);
    var note = el("div", "loader-note", "");
    wrap.appendChild(label);
    wrap.appendChild(track);
    wrap.appendChild(note);
    box.appendChild(wrap);

    var finished = false;

    function bar(fraction) {
      /* No Content-Length (archive.org sometimes omits it on /cors/) means no
         honest percentage, so the bar stripes instead of inventing one. */
      if (fraction === null) {
        track.classList.add("is-indeterminate");
        fill.style.width = "";
        return;
      }
      track.classList.remove("is-indeterminate");
      fill.style.width = Math.max(0, Math.min(1, fraction)) * 100 + "%";
    }

    bar(null);

    return {
      /* Bytes arriving, from either the movie itself or a GameZIP. */
      bytes: function (loaded, total) {
        if (finished) {
          return;
        }
        label.textContent = "Fetching the game…";
        note.textContent = total
          ? megabytes(loaded) + " of " + megabytes(total)
          : megabytes(loaded);
        bar(total ? loaded / total : null);
      },
      /* A GameZIP holds the game AND its dependencies — say so, because
         "unpacking 148 files" explains a wait that "loading" does not. */
      unpacking: function (done, total) {
        if (finished) {
          return;
        }
        label.textContent = "Unpacking the game…";
        note.textContent = done + " of " + total + " files";
        bar(total ? done / total : null);
      },
      /* Borrowing an SDK from another game's zip is a second multi-megabyte
         download, and saying so beats a bar that silently starts again. */
      borrowing: function () {
        if (finished) {
          return;
        }
        label.textContent = "Fetching the game\u2019s SDK\u2026";
        note.textContent = "";
        bar(null);
      },
      starting: function () {
        if (finished) {
          return;
        }
        label.textContent = "Starting the emulator…";
        note.textContent = "";
        bar(null);
      },
      /* Idempotent, and safe to call after the panel has been torn down. */
      done: function () {
        finished = true;
        if (wrap.parentNode) {
          wrap.parentNode.removeChild(wrap);
        }
      }
    };
  }

  /* ---- Where a game comes from -----------------------------

     Four possible sources, each a field on the entry, tried in this order
     unless it names one with `preferSource`. Cheapest and most predictable
     first; the GameZIP is last because it is a multi-megabyte download, but
     it is also the only source that can carry a game's dead dependencies
     (see loadGameZip). `mount()` walks the same list, so whatever actually
     plays is also what the credits line credits. */

  var FLASHPOINT_VIEW = "https://flashpointarchive.org/view?id=";
  var FLASHPOINT_PLAY = "https://ooooooooo.ooo/?id=";

  var SOURCE_ORDER = [
    "fileLocal",                 /* a .swf in this repo, path from the root  */
    "fileArchive",               /* archive.org, streamed through /cors/     */
    "file",                      /* any other host that grants us CORS       */
    "fileFlashpointArchiveZip"   /* Flashpoint GameZIP, unzipped in the page */
  ];

  function sourceOrder(game) {
    var first = game.preferSource;
    if (first && SOURCE_ORDER.indexOf(first) !== -1) {
      return [first].concat(
        SOURCE_ORDER.filter(function (k) {
          return k !== first;
        })
      );
    }
    return SOURCE_ORDER;
  }

  /* Flashpoint stores a game one of two ways, and `fileFlashpointArchiveZip`
     describes both — `{item, zip, path}` is always "inside `zip`, at `path`":

       GameZIP   `path` is a nested .zip; `entry` names the SWF inside it.
                 Multi-file: the game plus its archived dependencies.
       Htdocs    `path` IS the .swf, sitting in Flashpoint's legacy
                 `Legacy/htdocs/<host>/<path>` tree. No `entry`, no siblings.

     Flashpoint's own database says which, in its `zipped` field. The loose
     ones are the cheaper source of the two: archive.org extracts the single
     file for us, so it streams like any other movie and needs no unzipping. */
  function isLooseFlashpointFile(game) {
    var z = game.fileFlashpointArchiveZip;
    return !!z && !z.entry && /\.swf$/i.test(String(z.path || ""));
  }

  function sourceUrl(game, kind) {
    switch (kind) {
      case "fileLocal":
        return game.fileLocal || null;
      case "fileArchive":
        return corsSwfUrl(game);
      case "file":
        return game.file || null;
      case "fileFlashpointArchiveZip":
        if (isLooseFlashpointFile(game))
          return fpZipUrl(game.fileFlashpointArchiveZip);
        return null; /* a real GameZIP is not a plain URL; loadGameZip builds it */
    }
  }

  function hasSource(game, kind) {
    if (kind === "fileFlashpointArchiveZip") {
      return !!game.fileFlashpointArchiveZip;
    }
    return !!sourceUrl(game, kind);
  }

  /* The source this entry will actually be played from. */
  function effectiveSource(game) {
    var order = sourceOrder(game);
    for (var i = 0; i < order.length; i++) {
      if (hasSource(game, order[i])) {
        return order[i];
      }
    }
    return null;
  }

  /* The archive.org page for an entry. Derived from `archive` rather than
     stored: there is no reason to keep a URL we can always rebuild. */
  function archivePageUrl(game) {
    var id = game["archive.org"];
    return id
      ? "https://archive.org/details/" + encodeURIComponent(String(id))
      : null;
  }

  function flashpointPageUrl(game) {
    var id = game["flashpointarchive.org"];
    return id ? FLASHPOINT_VIEW + encodeURIComponent(String(id)) : null;
  }

  /* Where the licence text should point: at whichever archive the game is
     actually being played from, so the credit matches the copy you are
     running. Falls back to whatever page we do have. */
  function licenseHref(game) {
    var kind = effectiveSource(game);
    if (kind === "fileFlashpointArchiveZip") {
      return flashpointPageUrl(game) || archivePageUrl(game);
    }
    if (kind === "fileArchive") {
      return archivePageUrl(game) || flashpointPageUrl(game);
    }
    /* local or elsewhere: the original release page is the best provenance */
    return game.origin || archivePageUrl(game) || flashpointPageUrl(game);
  }

  /* Which archive the bytes actually come from, in words — derived from the
     source in use, never stored, because it changes with `preferSource` while
     the copyright does not. */
  function provenanceNote(game) {
    var kind = effectiveSource(game);
    if (kind === "fileFlashpointArchiveZip") {
      return "streamed from Flashpoint Archive";
    }
    if (kind === "fileArchive") {
      return "streamed from the Internet Archive";
    }
    return null;
  }

  /* The copyright line. These are commercial games from the 2000s and none of
     them is openly licensed, so it is derived from `author` rather than written
     out 24 times — but an entry may still carry its own `license` string, and
     that wins. It has to: the day one of these is CC0 or public domain, saying
     "all rights reserved" about it would be a false claim, not a default. */
  function licenseText(game) {
    if (game.license) {
      return String(game.license);
    }
    if (game.author) {
      return "\u00a9 " + game.author + " \u2014 all rights reserved";
    }
    return "Unverified \u2014 see maintainer";
  }

  /* License is always shown; it links at whichever archive actually serves
     the copy being played (see licenseHref), and is followed by a plain-text
     note naming that archive. */
  function licenseNode(game) {
    var text = licenseText(game);
    var href = licenseHref(game);
    var frag = document.createDocumentFragment();

    if (!href) {
      frag.appendChild(document.createTextNode(text));
    } else {
      var link = el("a", null, text);
      link.href = href;
      link.rel = "noopener noreferrer";
      link.target = "_blank";
      link.title = "License / source: " + href;
      frag.appendChild(link);
    }

    var note = provenanceNote(game);
    if (note) {
      frag.appendChild(document.createTextNode(" (" + note + ")"));
    }
    return frag;
  }

  function extLink(text, href, title) {
    var a = el("a", null, text);
    a.href = href;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    if (title) {
      a.title = title;
    }
    return a;
  }

  /* Provenance links, as a fragment (empty when the entry records none).

     The two archives do different jobs. archive.org is what the games are
     usually STREAMED from, because its /cors/ path grants us the bytes.
     Flashpoint Archive is the
     better catalogue — curated developer, release date and the
     game's original home — but its own web player (ooooooooo.ooo, "9o3o")
     answers with `X-Frame-Options: DENY`, so it can only ever be a link out,
     never an inline player. `origin` is the page the game was first published
     on, which is the strongest licence provenance we can point at. */
  function sourceLinks(game) {
    var frag = document.createDocumentFragment();
    var used = licenseHref(game); /* the licence already points here */
    var bits = [];

    function add(text, href, title) {
      if (href && href !== used) {
        bits.push(extLink(text, href, title));
      }
    }

    add(
      "Internet Archive",
      archivePageUrl(game),
      "The archive.org item this game streams from"
    );
    add(
      "Flashpoint",
      flashpointPageUrl(game),
      "This game's Flashpoint Archive catalogue entry"
    );
    if (game["flashpointarchive.org"]) {
      bits.push(
        extLink(
          "play at 9o3o ↗",
          FLASHPOINT_PLAY + encodeURIComponent(game["flashpointarchive.org"]),
          "Play Flashpoint's copy in a new tab (it cannot be embedded here)"
        )
      );
    }
    add("original release ↗", game.origin, "Where this game was first published");

    if (!bits.length) {
      return frag;
    }
    frag.appendChild(document.createTextNode("Also: "));
    bits.forEach(function (node, i) {
      if (i) {
        frag.appendChild(document.createTextNode(" · "));
      }
      frag.appendChild(node);
    });
    return frag;
  }

  /* Returns a Controls table, or null when the entry has none. */
  function buildControls(game) {
    if (!Array.isArray(game.controls) || !game.controls.length) {
      return null;
    }
    var table = el("table", "controls");
    var thead = el("thead");
    var headRow = el("tr");
    headRow.appendChild(el("th", null, "Key"));
    headRow.appendChild(el("th", null, "Action"));
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el("tbody");
    game.controls.forEach(function (c) {
      if (!c) {
        return;
      }
      var row = el("tr");
      row.appendChild(el("td", "key", c.key !== undefined ? c.key : ""));
      row.appendChild(el("td", null, c.action !== undefined ? c.action : ""));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    return table;
  }

  /* ---- Ruffle ---------------------------------------------- */

  /* Ruffle registers window.RufflePlayer when ruffle.js runs.
     Poll briefly so we do not depend on exact script timing. */
  function whenRuffleReady() {
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      (function check() {
        if (window.RufflePlayer && typeof window.RufflePlayer.newest === "function") {
          resolve(window.RufflePlayer.newest());
          return;
        }
        if (Date.now() - started > RUFFLE_TIMEOUT_MS) {
          reject(new Error("Ruffle did not initialise"));
          return;
        }
        window.setTimeout(check, 50);
      })();
    });
  }

  /* Ruffle paints its own full-bleed error screen (a "#panic" node inside the
     player's open shadow root) when a movie cannot be loaded or run. Watch for
     it so we can show our own on-theme message instead. */
  function watchForPanic(player, onPanic) {
    var root = player.shadowRoot;
    if (!root || typeof MutationObserver !== "function") {
      return;
    }
    function panicked() {
      return !!root.querySelector("#panic");
    }
    if (panicked()) {
      onPanic();
      return;
    }
    var observer = new MutationObserver(function () {
      if (panicked()) {
        observer.disconnect();
        onPanic();
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 30000);
  }

  /* archive.org's /download/ path sends no CORS headers, but its /cors/ path
     does — verified for every game in the catalogue, each returning a valid
     CWS/FWS header to this origin. That means we can stream the SWF and run it
     in OUR OWN self-hosted Ruffle instead of framing the archive's player,
     which is strictly better: Ruffle draws the vectors at device resolution, so
     the game stays sharp at any size and nothing is stretched, and because it
     is same-origin we control the sound instead of inheriting a muted nested
     frame. Nothing is redistributed — the file still streams from the archive
     on demand, exactly as before. */
  function corsSwfUrl(game) {
    var item = game["archive.org"];
    var name = game.fileArchive;
    if (!item || !name) {
      return null;
    }
    return ("https://archive.org/cors/" + encodeURIComponent(String(item)) +
      "/" + encodeURI(String(name)));
  }

  /* Load `url` into a fresh self-hosted Ruffle player inside `box`. onFail()
     fires at most once, if Ruffle rejects the load or paints its own #panic. */
  function mountRuffle(box, url, onFail, base, loader) {
    var done = false;
    var playerEl = null;

    /* Report this movie's download to the loader. The policy wrapper counts
       the bytes as they arrive (see countingResponse) — Ruffle fetches the
       movie itself, so this is the only place the progress is visible.

       Not for a blob: movie. Ruffle fetches those through the same wrapper,
       but the bytes are already in memory and "downloading" them is an
       instant local copy — reporting it would overwrite the honest
       "Unpacking"/"Starting" text with a bogus download that already ended. */
    var lastByteAt = 0;
    onMovieBytes =
      loader && String(url).indexOf("blob:") !== 0
        ? function (loaded, total) {
            lastByteAt = Date.now();
            loader.bytes(loaded, total);
          }
        : null;

    /* Name the one file this game is allowed to fetch, and the directory it
       came from, before Ruffle gets the URL (see installGameNetworkPolicy).
       A blob: URL has no directory of its own — a GameZIP game is served from
       `zipFiles` instead, addressed through `base`. */
    mainMovieUrl = absolute(url);
    mainMovieDir = null;
    /* Unknown until Ruffle parses this movie's header — never inherited from
       whatever was playing a moment ago. */
    mainMovieIsAs3 = null;
    if (mainMovieUrl.indexOf("blob:") !== 0) {
      var cut = mainMovieUrl.split("?")[0].lastIndexOf("/");
      if (cut > 0) {
        mainMovieDir = mainMovieUrl.slice(0, cut + 1);
      }
    }

    function fail(err) {
      if (done) {
        return;
      }
      done = true;
      onMovieBytes = null;
      if (loader) {
        loader.done();
      }
      if (err && window.console) {
        console.error("Ruffle could not run", url, err);
      }
      if (typeof onFail === "function") {
        onFail();
      }
    }

    /* Hold the loader until the MOVIE is ready, not just until load() settles.
       `player.metadata` is the moment Ruffle has parsed the SWF header and has
       a stage to draw on — everything after it belongs to the game, including
       its own loading screen. load() resolves earlier than that, so hiding on
       load() alone would flash the black stage in between. */
    /* Watch for the movie becoming ready. Two things happen at that moment:
       the loader steps aside for the game's own screen, and the movie's AVM
       version becomes known — which decides what a blocked `.swf` request is
       answered with (see emptySwfResponse). The second is needed even when
       there is no loader, so this always runs. */
    function whenMovieReady(player) {
      var waitedFrom = Date.now();
      (function poll() {
        if (done) {
          return; /* failed, or the panel went away — fail() cleared it */
        }
        if (player.metadata) {
          mainMovieIsAs3 = !!player.metadata.isActionScript3;
          onMovieBytes = null;
          if (loader) {
            loader.done();
          }
          return;
        }
        /* Give up only after RUFFLE_TIMEOUT_MS of SILENCE, not of waiting.
           load() resolves as soon as Ruffle has accepted the URL, long before
           a 4 MB movie has finished arriving — a plain deadline here hid our
           loader mid-download and handed the stage to Ruffle's own generic
           spinner, which is exactly the blank-looking wait this replaces. A
           download that is still delivering bytes is not stuck. */
        var quietSince = Math.max(waitedFrom, lastByteAt);
        if (Date.now() - quietSince > RUFFLE_TIMEOUT_MS) {
          onMovieBytes = null;
          if (loader) {
            loader.done(); /* never leave it sitting over a running game */
          }
          return;
        }
        window.setTimeout(poll, 100);
      })();
    }

    whenRuffleReady()
      .then(function (ruffle) {
        var player = ruffle.createPlayer();
        playerEl = player;
        player.style.width = "100%";
        player.style.height = "100%";
        player.style.display = "block";
        box.appendChild(player);
        watchForPanic(player, function () {
          fail();
        });

        /* Newer Ruffle exposes the instance API via .ruffle(); fall back to
           the element itself, which proxies load() as well. */
        var instance = typeof player.ruffle === "function" ? player.ruffle() : player;

        var config = {
          url: url,
          /* Only a GameZIP game has one: it makes the SWF's relative requests
             resolve to the addresses Flashpoint archived them under, which is
             what lets zipFiles find them. */
          base: base || undefined,
          autoplay: "on",
          letterbox: "on",
          scale: "showAll",
          /* Keep that scale mode even if the movie tries to change it.

             Some builds set `Stage.scaleMode = NO_SCALE` and then draw
             assuming a viewport bigger than the stage they declare, so Ruffle
             — which honours the declared stage — clips them. Fancy Pants
             World 1 Remix loses its logo off the top and its Start door off
             the right that way. Since this player always hands a movie a box
             with the movie's OWN aspect ratio (see fitStage), letterboxing to
             the declared stage is always the right answer here, and forcing
             it costs nothing for the games that never touch scaleMode. */
          forceScale: true,
          /* Show the speaker badge rather than hiding it: browsers block
             audible autoplay until the visitor interacts, and this is the
             one click that turns the sound on. */
          unmuteOverlay: "visible",
          contextMenu: "on",
          logLevel: "error",
          wmode: "opaque"
          /* NOTE: Fireboy & Watergirl 4 often comes up as a permanently black
             stage. It is NOT this config and not the source: the same SWF does
             the same thing in tools/bare-player.html with nothing but Ruffle on
             the page, and the very same settings render its Armor Games splash
             on another run. Whatever the cause, it is inside the game or Ruffle
             and it is intermittent — so A/B one option at a time here and you
             will "confirm" whichever option you happened to test on a bad run. */
          /* NOTE: `allowNetworking: "none"` was tried here and removed. In
             Ruffle 0.6.0 it does not reach `Loader.load()`, so the games' ad
             SDKs still reached the network — it bought nothing. What a game is
             allowed to fetch is enforced by installGameNetworkPolicy() instead. */
        };

        /* NOTE: do not set `preferredRenderer`. Asking for "webgpu" was tried
           and reverted: it gave no measurable speed-up, and Ruffle's WebGPU
           backend drew a grey block in place of Fireboy & Watergirl 3's title
           artwork that its default wgpu-webgl renders correctly. Leaving this
           unset lets Ruffle choose, which matches what other Ruffle 0.6.0
           players do. tools/bare-player.html can A/B the backends. */

        /* Only when there is nothing left to download: a blob: movie is
           already in memory (a GameZIP we just unpacked), so the next wait is
           the emulator's. A http(s) movie is fetched BY load(), and saying
           "starting" over that would be replaced by the byte counter a tick
           later — the loader is already saying "Fetching the game". */
        if (loader && String(url).indexOf("blob:") === 0) {
          loader.starting();
        }
        return instance.load(config);
      })
      .then(function () {
        /* NOTE: onMovieBytes stays live here. Ruffle streams the movie, so
           load() settles while bytes are still arriving; clearing the counter
           at this point froze the byte readout mid-download. whenMovieReady
           clears it once the movie is actually in. */
        if (playerEl) {
          whenMovieReady(playerEl);
        }
        /* Hand the keyboard straight to the game, so WASD/arrows/space reach
           it instead of the wall's type-to-filter. Never let this throw — a
           focus failure must not look like a failed load. */
        try {
          if (playerEl && playerEl.focus) {
            playerEl.focus({ preventScroll: true });
          }
        } catch (e) {
          /* ignore */
        }
      })
      .catch(fail);
  }

  /* ---- Flashpoint GameZIPs, via the archive.org mirror -------

     Flashpoint's own CDN grants CORS to its own player and nobody else, so we
     cannot read it. But the whole Flashpoint collection is mirrored on
     archive.org (`Flashpoint13.0`, ~1.2 TB, stored as 23 large .zip files),
     and archive.org will extract ONE file from inside a zip for us:

       archive.org/cors/<item>/<GameData_N.zip>/<path inside the zip>

     That returns just the game's own GameZIP (a couple of MB), with CORS — no
     range requests, no proxy. We then unzip it here: the GameZIP mirrors the
     game's original host and path under `content/`, which is exactly what
     Flashpoint's launch command points at, so `entry` picks the right SWF out
     of it. The result is handed to Ruffle as a blob: URL.

     Use this for a game whose archive.org copy is missing or broken; the plain
     /cors/ SWF path below is cheaper and stays the default. */

  function fpZipUrl(z) {
    return (
      "https://archive.org/cors/" +
      encodeURIComponent(z.item) +
      "/" +
      encodeURIComponent(z.zip) +
      "/" +
      encodeURIComponent(z.path)
    );
  }

  /* Read a zip's central directory. Flashpoint GameZIPs are small and plain,
     so the classic (non-ZIP64) layout is all we need. */
  function readZip(buf) {
    var dv = new DataView(buf);
    var u8 = new Uint8Array(buf);
    var end = -1;
    for (var i = u8.length - 22; i >= 0 && i > u8.length - 65557; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        end = i;
        break;
      }
    }
    if (end < 0) {
      throw new Error("not a zip (no end-of-central-directory)");
    }
    var count = dv.getUint16(end + 10, true);
    var p = dv.getUint32(end + 16, true);
    var entries = [];
    for (var k = 0; k < count; k++) {
      if (p + 46 > u8.length || dv.getUint32(p, true) !== 0x02014b50) {
        break;
      }
      var nameLen = dv.getUint16(p + 28, true);
      var extraLen = dv.getUint16(p + 30, true);
      var cmtLen = dv.getUint16(p + 32, true);
      entries.push({
        name: new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen)),
        method: dv.getUint16(p + 10, true),
        csize: dv.getUint32(p + 20, true),
        offset: dv.getUint32(p + 42, true)
      });
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return { dv: dv, u8: u8, entries: entries };
  }

  /* Inflate one entry. Browsers ship DecompressionStream, and zip entries are
     raw deflate, so this needs no library. */
  function unzipEntry(zip, e) {
    var lo = e.offset;
    if (zip.dv.getUint32(lo, true) !== 0x04034b50) {
      return Promise.reject(new Error("bad local file header"));
    }
    var nameLen = zip.dv.getUint16(lo + 26, true);
    var extraLen = zip.dv.getUint16(lo + 28, true);
    var start = lo + 30 + nameLen + extraLen;
    var comp = zip.u8.subarray(start, start + e.csize);
    if (e.method === 0) {
      return Promise.resolve(comp);
    }
    if (e.method !== 8) {
      return Promise.reject(new Error("unsupported zip method " + e.method));
    }
    if (typeof DecompressionStream !== "function") {
      return Promise.reject(new Error("DecompressionStream unavailable"));
    }
    var stream = new Blob([comp]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).arrayBuffer().then(function (ab) {
      return new Uint8Array(ab);
    });
  }

  /* A GameZIP is NOT one file, and that matters more than it sounds.

     Flashpoint archives a game together with everything it needed to run:
     its portal's SDK, its branding, and — this is the good bit — the recorded
     RESPONSES of services that have since died. Fireboy & Watergirl 4's zip
     holds eight files: the game, four Spil SDK movies, and the settings XML
     that `api.configar.org` used to return. Its preloader waits on that XML.
     Extracting only the .swf, which is what this used to do, left the game
     waiting for a service that no longer exists — a black screen forever.

     So unzip the lot and keep it, keyed by the address each file was archived
     from: the entries are `content/<original host>/<original path>`, which is
     exactly what the game asks for once Ruffle has the right `base`. The
     network policy then serves them (see zipFile) without a single request
     leaving the browser. This is what Flashpoint's own player does.

     Returns { url, base, files } — a blob URL for the game itself, the
     directory its siblings are relative to, and the map. */
  /* ---- Borrowed dependencies --------------------------------

     Some games need a portal SDK that their OWN GameZIP does not contain.
     Snail Bob 5–8 are the case that forced this: they are Spil-published, and
     on Play they ask `SpilGamesServices.isReady()`, which needs the SDK to
     answer. Blocked, the answer never comes and the game walks back to its
     main menu — the Play button appears to do nothing.

     Flashpoint's own player gets away with it because it proxies the WHOLE
     archived content pool, so any Spil file is available to any Spil game.
     Ours serves one game's zip, and these zips hold only the game itself.

     So an entry may borrow from another game's GameZIP. `dependencies` names
     that zip and maps request substrings onto entries inside it; the first
     match wins. Only the mapped entries are inflated, so borrowing ~500 KB of
     SDK does not mean unpacking the 4.9 MB game it was archived beside.

     Nothing here bypasses anything: these are archived files being served to
     the game that asks for them, which is what the GameZIP machinery already
     does — this just widens where the file may come from. */
  function loadDependencies(game, loader) {
    var d = game.dependencies;
    if (!d || !Array.isArray(d.map) || !d.map.length) {
      return Promise.resolve(null);
    }
    if (loader) {
      loader.borrowing();
    }
    return nativeFetch(fpZipUrl(d))
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return loader ? readWithProgress(res, loader) : res.arrayBuffer();
      })
      .then(function (buf) {
        var zip = readZip(buf);
        var wanted = {};
        d.map.forEach(function (pair) {
          wanted[pair[1]] = true;
        });
        var picked = zip.entries.filter(function (e) {
          return wanted[e.name];
        });
        return Promise.all(
          picked.map(function (e) {
            return unzipEntry(zip, e).then(
              function (raw) {
                return { name: e.name, raw: raw };
              },
              function () {
                return null;
              }
            );
          })
        ).then(function (list) {
          var files = {};
          list.forEach(function (f) {
            if (f) {
              files[f.name] = f.raw;
            }
          });
          return { files: files, map: d.map };
        });
      });
  }

  /* A borrowed file for this request, or null. Substring match on the whole
     URL, in the order games.json lists them. */
  function depFile(url) {
    if (!deps) {
      return null;
    }
    var s = String(url);
    for (var i = 0; i < deps.map.length; i++) {
      var pair = deps.map[i];
      if (s.indexOf(pair[0]) !== -1) {
        var raw = deps.files[pair[1]];
        if (raw) {
          return {
            raw: raw,
            /* The Spil config reply is an extensionless XML document, so the
               type is taken from the archived name rather than the URL. */
            type: /\.swf$/i.test(pair[1])
              ? "application/x-shockwave-flash"
              : "text/xml"
          };
        }
      }
    }
    return null;
  }

  function loadGameZip(game, loader) {
    var z = game.fileFlashpointArchiveZip;
    return nativeFetch(fpZipUrl(z))
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        /* These are the biggest downloads on the site — 13 MB for one of them
           — so read the body as it arrives and count it, rather than waiting
           on arrayBuffer() with nothing on screen. */
        return loader ? readWithProgress(res, loader) : res.arrayBuffer();
      })
      .then(function (buf) {
        var zip = readZip(buf);

        /* Most GameZIPs put the archived tree straight at `content/`, but some
           wrap it in a directory named after the game's UUID:

             content/chat.kongregate.com/…            ← the common shape
             8cbb824f-…/content/chat.kongregate.com/… ← Fancy Pants World 1

           Work out which this one is from the entries themselves rather than
           assuming. Everything below addresses files relative to `root`, so a
           wrapped zip behaves exactly like a bare one — without this, the
           `content/` filter matched nothing, no file was inflated, and the
           game died on "could not inflate". */
        var root = "";
        for (var ri = 0; ri < zip.entries.length; ri++) {
          var m = /^(.*?)content\//.exec(zip.entries[ri].name);
          if (m) {
            root = m[1];
            break;
          }
        }

        /* An `entry` from games.json may be written with or without that
           prefix; accept either. */
        var main = null;
        if (z.entry) {
          main = zip.entries.filter(function (e) {
            return e.name === z.entry || e.name === root + z.entry;
          })[0] || null;
        }
        if (!main) {
          main = zip.entries.filter(function (e) {
            return /\.swf$/i.test(e.name);
          })[0] || null;
        }
        if (!main) {
          throw new Error("no .swf inside the GameZIP");
        }

        /* Inflate every entry, not just the movie. These zips are a few MB,
           and a game needs whichever of them it needs before it will start. */
        var wanted = zip.entries.filter(function (e) {
          return e.name.indexOf(root + "content/") === 0 && !/\/$/.test(e.name);
        });
        var inflated = 0;
        if (loader) {
          loader.unpacking(0, wanted.length);
        }
        function tick() {
          inflated++;
          if (loader) {
            loader.unpacking(inflated, wanted.length);
          }
        }
        return Promise.all(
          wanted.map(function (e) {
            return unzipEntry(zip, e).then(
              function (raw) {
                tick();
                return { name: e.name, raw: raw };
              },
              function () {
                tick();
                return null; /* one unreadable sibling must not sink the game */
              }
            );
          })
        ).then(function (list) {
          /* Keyed by ARCHIVED address — `content/<host>/<path>` — with any
             UUID wrapper stripped, because that is the shape zipFile() builds
             its lookups in. */
          var files = {};
          list.forEach(function (f) {
            if (f) {
              files[f.name.slice(root.length).toLowerCase()] = f.raw;
            }
          });
          var mainKey = main.name.slice(root.length).toLowerCase();
          var raw = files[mainKey];
          if (!raw) {
            throw new Error("could not inflate " + main.name);
          }
          var magic = String.fromCharCode(raw[0], raw[1], raw[2]);
          if (magic !== "CWS" && magic !== "FWS" && magic !== "ZWS") {
            throw new Error("not a SWF (magic " + magic + ")");
          }

          /* `base` is the archived directory of the game itself, so a relative
             request inside the SWF resolves to its original address and lands
             on the right zip entry. The movie's OWN url stays the blob: it is
             not dressed up as `http://assets.kongregate.com/…`, because that
             is how a publisher's site-lock gets defeated, and this player does
             not do it. A locked game stays locked.

             Scope, because it is easy to over-read: that is a rule about this
             CODE. It says nothing about the provenance of the build being
             streamed — a few archive uploads are themselves patched. See
             "Builds we did not make" in the README. */
          /* From the ORIGINAL-case name, not the lower-cased lookup key: this
             is a URL Ruffle resolves the game's own requests against, and
             `s3.amazonaws.com/BorneGames/Game_Files/` is not the same address
             as `s3.amazonaws.com/bornegames/game_files/`. The `files` map is
             lower-cased on purpose, for matching; `base` must not be. */
          var mainPath = main.name.slice(root.length);
          var dir = mainPath.slice(0, mainPath.lastIndexOf("/") + 1);
          return {
            url: URL.createObjectURL(
              new Blob([raw], { type: "application/x-shockwave-flash" })
            ),
            base: "http://" + dir.replace(/^content\//, ""),
            dir: dir.toLowerCase(),
            files: files
          };
        });
      });
  }

  /* Blob URLs are per-document allocations; release them with the panel, and
     drop the unzipped GameZIP with them — it is a few MB of held bytes. */
  function releaseStage(box) {
    if (box && box._blobUrl) {
      try {
        URL.revokeObjectURL(box._blobUrl);
      } catch (e) {
        /* ignore */
      }
      box._blobUrl = null;
    }
    zipFiles = null;
    zipBaseDir = null;
    deps = null;
    /* The panel is going away; nothing should still be reporting into it. */
    onMovieBytes = null;
    /* Last chance to keep whatever this game saved. */
    endSaveBridge();
  }

  /* Mount a game into `box`. `onFailure(kind)` is called at most once with
     "nogame", "unsupported" or "archive" so the caller can render the right
     notice. */
  function mount(box, game, onFailure) {
    var dim = game.dimensions || {};
    var width = positiveNumber(dim.w, DEFAULT_WIDTH);
    var height = positiveNumber(dim.h, DEFAULT_HEIGHT);

    /* Keep the stage's aspect ratio and record its native size (fullscreen
       pins + scales to it). The on-page WIDTH is left to the caller — the
       wall's fitStage fills the panel and caps the height — so we must not
       pin it here, or we'd clobber that sizing a tick later. */
    box.style.aspectRatio = width + " / " + height;
    box.setAttribute("data-w", width);
    box.setAttribute("data-h", height);

    /* Where to get the movie, in order of preference.

       An entry may name one with `preferSource`; otherwise SOURCE_ORDER
       decides. Whatever the order, each source falls through to the next if it
       cannot run, and when they are all spent the caller shows the failure
       notice with links out. */
    var attempts = [];
    sourceOrder(game).forEach(function (kind) {
      if (!hasSource(game, kind)) {
        return;
      }
      /* A loose Flashpoint file is a plain URL like any other movie, so it
         takes the ordinary path — streamed, byte-counted, no unzip step. */
      if (kind !== "fileFlashpointArchiveZip" || isLooseFlashpointFile(game)) {
        attempts.push(function (next, loader) {
          mountRuffle(box, sourceUrl(game, kind), next, null, loader);
        });
      } else {
        attempts.push(function (next, loader) {
          loadGameZip(game, loader)
            .then(function (bundle) {
              box._blobUrl = bundle.url;
              zipFiles = bundle.files;
              zipBaseDir = bundle.dir;
              /* Before Ruffle gets the URL: put this game's save where the
                 blob-keyed lookup will find it (see beginSaveBridge). */
              beginSaveBridge(game.id, bundle.url);
              mountRuffle(box, bundle.url, function () {
                releaseStage(box);
                next();
              }, bundle.base, loader);
            })
            .catch(function (err) {
              loader.done();
              if (window.console) {
                console.error("Flashpoint GameZIP failed:", err);
              }
              next();
            });
        });
      }
    });

    function attempt(i) {
      if (i < attempts.length) {
        /* clear() first — a fresh loader per attempt, because falling through
           to the next source starts a new download and the old bar's numbers
           would be somebody else's. */
        clear(box);
        attempts[i](function () {
          attempt(i + 1);
        }, stageLoader(box));
        return;
      }
      /* Everything we can drive ourselves has failed. This used to fall back
         to an <iframe> of archive.org's own player, which quietly handed the
         visitor — IP, referrer and all — to a third party, and to a page this
         site's network policy cannot see into, let alone constrain. Now the
         caller says so plainly and offers a link the visitor can choose to
         follow (see failureNode). */
      if (typeof onFailure === "function") {
        onFailure(attempts.length ? "unsupported" : "nogame");
      }
    }

    /* Borrowed files have to be in memory BEFORE the movie runs: the game asks
       for its SDK config within the first seconds, and a miss there is what
       the whole exercise is about. A failure to fetch them is not fatal — the
       game still gets to try, and will simply behave as it did before. */
    if (game.dependencies) {
      clear(box);
      var depLoader = stageLoader(box);
      loadDependencies(game, depLoader)
        .catch(function (err) {
          if (window.console) {
            console.warn("Could not borrow dependencies:", err);
          }
          return null;
        })
        .then(function (bundle) {
          deps = bundle;
          depLoader.done();
          attempt(0);
        });
      return;
    }

    attempt(0);
  }

  function loadManifest() {
    return nativeFetch(MANIFEST, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .then(function (games) {
        if (!Array.isArray(games)) {
          throw new Error("games.json must be a JSON array");
        }
        /* Drop anything without an id — an entry half-written or left as an
           empty {} while editing would otherwise become a nameless tile,
           count towards "games online" and link to #play=undefined. It is
           reported rather than silently swallowed. */
        var usable = games.filter(function (g) {
          return g && typeof g === "object" && g.id;
        });
        if (usable.length !== games.length && window.console) {
          console.warn("games.json: ignoring " + (games.length - usable.length) +
            " entr" + (games.length - usable.length === 1 ? "y" : "ies") +
            " with no \"id\"");
        }
        return usable;
      });
  }

  function findById(games, id) {
    for (var i = 0; i < games.length; i++) {
      if (games[i] && String(games[i].id) === String(id)) {
        return games[i];
      }
    }
    return null;
  }

  /* ---- Fullscreen ------------------------------------------ */

  function requestFullscreen(node) {
    if (!node) {
      return;
    }
    var fn =
      node.requestFullscreen ||
      node.webkitRequestFullscreen ||
      node.msRequestFullscreen;
    if (fn) {
      try {
        var p = fn.call(node);
        /* Some contexts (e.g. an iframe without an allow-fullscreen policy)
           reject the promise; swallow it so it isn't an uncaught rejection. */
        if (p && typeof p.catch === "function") {
          p.catch(function () {});
        }
      } catch (e) {
        /* user gesture / permission issues — ignore */
      }
    }
  }

  /* A "⛶ Fullscreen" button. getTarget() returns the element to blow up
     (the black stage well), resolved at click time so it works for a panel
     that is rebuilt each time a game opens. */
  function makeFsButton(getTarget, className) {
    var b = el("button", className, "⛶ Fullscreen");
    b.type = "button";
    b.title = "Play fullscreen";
    b.setAttribute("aria-label", "Play fullscreen");
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var target = getTarget();

      /* When the game runs in our own Ruffle, use Ruffle's own fullscreen —
         exactly what its right-click "Enter fullscreen" does. Ruffle scales
         its own stage, so nothing here has to letterbox or transform, and the
         keyboard stays pointed at the game. Only the archive-iframe fallback
         needs the element-level Fullscreen API below. */
      var player =
        target && target.querySelector
          ? target.querySelector("ruffle-player, ruffle-embed")
          : null;
      if (player && typeof player.enterFullscreen === "function") {
        try {
          if (player.isFullscreen) {
            player.exitFullscreen();
          } else {
            player.enterFullscreen();
          }
          return;
        } catch (err) {
          /* fall through to the element API */
        }
      }

      requestFullscreen(target);
    });
    return b;
  }

  function currentFsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  /* Fullscreen: lay the box out at the largest size that fits the screen while
     keeping the game's aspect ratio (letterboxed, centred by the stage well's
     flexbox); Ruffle fills whatever box it is given. On exit we restore the
     box's exact prior inline styles. */
  function applyFullscreenFit() {
    var fsEl = currentFsElement();
    var boxes = document.querySelectorAll(".player-box");
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var inFs = !!(fsEl && fsEl.contains(b));
      if (inFs) {
        if (!b._fsSaved) {
          b._fsSaved = {
            width: b.style.width,
            height: b.style.height,
            maxWidth: b.style.maxWidth,
            aspectRatio: b.style.aspectRatio
          };
        }
        var w = positiveNumber(b.getAttribute("data-w"), DEFAULT_WIDTH);
        var h = positiveNumber(b.getAttribute("data-h"), DEFAULT_HEIGHT);
        var vw = fsEl.clientWidth || window.innerWidth;
        var vh = fsEl.clientHeight || window.innerHeight;
        var n = Math.min(vw / w, vh / h);
        b.style.maxWidth = "none";
        b.style.aspectRatio = "auto";
        b.style.width = Math.floor(w * n) + "px";
        b.style.height = Math.floor(h * n) + "px";
      } else if (!inFs && b._fsSaved) {
        var s = b._fsSaved;
        b.style.width = s.width;
        b.style.height = s.height;
        b.style.maxWidth = s.maxWidth;
        b.style.aspectRatio = s.aspectRatio;
        b._fsSaved = null;
      }
    }
  }

  document.addEventListener("fullscreenchange", applyFullscreenFit);
  document.addEventListener("webkitfullscreenchange", applyFullscreenFit);
  window.addEventListener("resize", function () {
    /* keep the scale correct if the fullscreen area changes size */
    if (currentFsElement()) {
      applyFullscreenFit();
    }
  });

  /* ---- Saved-progress consent ----

     Games now run in OUR Ruffle, on this origin, so when a game saves (a Flash
     *SharedObject*) Ruffle writes it to this site's own localStorage, keyed by
     the SWF's host and path — e.g. "archive.org/cors/<item>/<name>.sol". That
     is a real improvement over the old archive-iframe setup, where saves landed
     under archive.org's origin and this site could neither read nor clear them:
     now they are ours, so we can count them and delete them right here, and
     Ruffle's own save manager (right-click a game) can export individual ones.

     Note this also means saves made back when games ran inside the archive's
     iframe still sit under archive.org's origin and do not carry over. */

  var ACK_KEY = "fa_saveNoticeAck";

  /* Every key currently in localStorage, as a snapshot — the callers below
     write and delete while they walk, which would skip entries if they read
     the live index. */
  function allStorageKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k) {
          keys.push(k);
        }
      }
    } catch (e) {
      /* private mode / storage blocked */
    }
    return keys;
  }

  /* ---- A stable save identity for GameZIP games -------------

     Ruffle keys every SharedObject as "<host><path>/<name>", taken from the
     URL the movie was loaded from. For an archive-streamed game that is
     stable and everything just works:

       archive.org/cors/<item>/<file>.swf/<name>

     A GameZIP game is different, and it was quietly broken. Its movie is a
     `blob:` URL, which is a fresh allocation on every page load, so Ruffle
     wrote to a fresh key every time:

       /http://localhost:8000/cbc29e69-913b-4f2c-a564-98e491f16c54/locobj
       /http://localhost:8000/30670ac9-63b6-483d-bd9b-a48ebe8cf6bd/locobj
       …one more of these per play, for ever

     Two consequences, both real: the game NEVER saw its own save again, and
     every play leaked another orphan into a store with a few MB of quota.

     The obvious fix — give Ruffle the game's original address instead of the
     blob — is exactly the site-lock spoof this project does not do. So the
     bridge happens here instead, in storage, where it changes nothing about
     what the game can see: seed the blob-shaped keys from a stable store
     before the movie loads, copy them back while it plays, and clear them
     when it stops. The game is none the wiser; the save survives. */

  var SAVE_PREFIX = "fa_sav/";
  var SAVE_SYNC_MS = 5000;
  var bridge = null; /* { id, prefix, timer } while a GameZIP game is running */

  /* Ruffle's key for a movie at "blob:http://host/uuid" begins "/http://host/
     uuid/" — the blob's inner URL with an empty host in front of it. */
  function blobKeyPrefix(blobUrl) {
    return "/" + String(blobUrl).replace(/^blob:/, "") + "/";
  }

  /* Anything matching that shape belongs to a blob movie. Used to sweep up
     the orphans left by every play before this existed. */
  var BLOB_KEY = /^\/https?:\/\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;

  function copyKeys(fromPrefix, toPrefix, removeSource) {
    allStorageKeys().forEach(function (k) {
      if (k.indexOf(fromPrefix) !== 0) {
        return;
      }
      var value = storageGet(k);
      if (value !== null) {
        storageSet(toPrefix + k.slice(fromPrefix.length), value);
      }
      if (removeSource) {
        storageDel(k);
      }
    });
  }

  /* Called with the blob URL a GameZIP game is about to be loaded from, and
     BEFORE Ruffle gets it, so the game finds its save already in place. */
  function beginSaveBridge(gameId, blobUrl) {
    endSaveBridge();
    if (!gameId || !blobUrl) {
      return;
    }
    var prefix = blobKeyPrefix(blobUrl);
    copyKeys(SAVE_PREFIX + gameId + "/", prefix, false);
    bridge = { id: String(gameId), prefix: prefix, timer: null };
    /* Games save at moments of their own choosing and a visitor can close the
       tab at any of them, so copy back on a timer as well as at the end. */
    bridge.timer = window.setInterval(syncSaveBridge, SAVE_SYNC_MS);
  }

  function syncSaveBridge() {
    if (bridge) {
      copyKeys(bridge.prefix, SAVE_PREFIX + bridge.id + "/", false);
    }
  }

  /* Final copy back, then take the blob-shaped keys away: they are scratch,
     and leaving them is how the orphans accumulated in the first place. */
  function endSaveBridge() {
    if (!bridge) {
      return;
    }
    if (bridge.timer) {
      window.clearInterval(bridge.timer);
    }
    copyKeys(bridge.prefix, SAVE_PREFIX + bridge.id + "/", true);
    bridge = null;
  }

  /* One-time sweep of the orphans written before the bridge existed. Safe at
     boot and only at boot: no game has mounted yet, so no blob-shaped key in
     the store can belong to a movie that is currently running. */
  function purgeOrphanSaves() {
    var gone = 0;
    allStorageKeys().forEach(function (k) {
      if (BLOB_KEY.test(k)) {
        storageDel(k);
        gone++;
      }
    });
    if (gone && window.console) {
      console.info("Discarded " + gone + " unreachable save" +
        (gone === 1 ? "" : "s") + " left by GameZIP games (see beginSaveBridge)");
    }
  }

  /* A game's saved data, as opposed to this site's own settings. Two shapes
     count: Ruffle's own "<host><path>/<name>" for a streamed movie, and the
     "fa_sav/<game id>/<name>" this module keeps for GameZIP games. The site's
     other keys ("fa_visits", "fa_saveNoticeAck") have no "/" and never
     match. */
  function gameSaveKeys() {
    return allStorageKeys().filter(function (k) {
      if (k.indexOf(SAVE_PREFIX) === 0) {
        return true;
      }
      /* A live bridge's scratch keys are a copy of an "fa_sav/" entry that is
         already counted — counting both would report every open GameZIP game
         twice. */
      if (bridge && k.indexOf(bridge.prefix) === 0) {
        return false;
      }
      return k.indexOf("/") !== -1 && k.indexOf("fa_") !== 0;
    });
  }

  function storageGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function storageSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      /* private mode — the notice will simply ask again next time */
    }
  }
  function storageDel(k) {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      /* ignore */
    }
  }

  function modalCard(childNodes) {
    var overlay = el("div", "modal-overlay");
    var card = el("div", "modal-card");
    childNodes.forEach(function (n) {
      card.appendChild(n);
    });
    overlay.appendChild(card);
    overlay.addEventListener("click", function (e) {
      /* click on the dim backdrop (not the card) does nothing destructive */
      if (e.target === overlay) {
        e.stopPropagation();
      }
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  /* Resolve true to proceed (and remember the choice), false to back out.
     If the visitor already accepted once, resolves true immediately. */
  function ensureSaveNotice() {
    return new Promise(function (resolve) {
      if (storageGet(ACK_KEY) === "1") {
        resolve(true);
        return;
      }
      var h = el("h3", null, "Save your progress?");
      var p1 = el(
        "p",
        null,
        "The games run right here in this page, so when one saves your " +
          "progress or unlocked levels it is written to this site's own " +
          "storage in your browser. It survives a refresh, it stays on your " +
          "device, and nothing is sent anywhere."
      );
      var p2 = el("p", null, "");
      p2.appendChild(document.createTextNode("You can count, export or delete those saves anytime via "));
      p2.appendChild(el("strong", null, "Saved games & storage"));
      p2.appendChild(document.createTextNode(" in the footer."));

      var actions = el("div", "modal-actions");
      var no = el("button", "btn btn-secondary", "Not now");
      no.type = "button";
      var yes = el("button", "btn", "Allow & play");
      yes.type = "button";
      var overlay;
      function done(ok) {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        resolve(ok);
      }
      no.addEventListener("click", function () {
        done(false);
      });
      yes.addEventListener("click", function () {
        storageSet(ACK_KEY, "1");
        done(true);
      });
      actions.appendChild(no);
      actions.appendChild(yes);
      overlay = modalCard([h, p1, p2, actions]);
    });
  }

  /* Footer "Saved games & storage" dialog: explain and offer the controls we
     actually have (reset this site's local flags; point at the browser for
     archive.org's game saves). */
  function showSaveInfo() {
    var saves = gameSaveKeys();
    var h = el("h3", null, "Saved games & storage");
    var p1 = el(
      "p",
      null,
      "Games run in this page, so a game's saves are stored by your browser " +
        "under this site — that is what lets one carry on where you left off. " +
        "They never leave your device."
    );
    var p2 = el("p", null, "");
    p2.appendChild(
      el(
        "strong",
        null,
        saves.length === 0
          ? "No game saves stored yet."
          : saves.length === 1
            ? "1 saved game file stored."
            : saves.length + " saved game files stored."
      )
    );
    p2.appendChild(
      document.createTextNode(
        " To export or delete one game's save on its own, right-click that " +
          "game and choose “Open Save Manager”."
      )
    );

    var actions = el("div", "modal-actions");
    var wipe = el("button", "btn btn-secondary", "Delete all game saves");
    wipe.type = "button";
    wipe.disabled = saves.length === 0;
    var reset = el("button", "btn btn-secondary", "Reset this site's choices");
    reset.type = "button";
    var close = el("button", "btn", "Close");
    close.type = "button";
    var overlay;
    function closeFn() {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
    wipe.addEventListener("click", function () {
      /* Deleting progress is not something to do on a mis-click. */
      if (!window.confirm("Delete all " + saves.length + " saved game file(s)? This cannot be undone.")) {
        return;
      }
      saves.forEach(storageDel);
      closeFn();
    });
    reset.addEventListener("click", function () {
      storageDel(ACK_KEY);
      storageDel("fa_visits");
      closeFn();
    });
    close.addEventListener("click", closeFn);
    actions.appendChild(wipe);
    actions.appendChild(reset);
    actions.appendChild(close);
    overlay = modalCard([h, p1, p2, actions]);
  }

  function wireSavedGamesLink() {
    var link = document.getElementById("saved-games-link");
    if (!link) {
      return;
    }
    link.addEventListener("click", showSaveInfo);
    link.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showSaveInfo();
      }
    });
  }

  window.FlashbackPlayer = {
    el: el,
    clear: clear,
    notice: notice,
    messageBox: messageBox,
    licenseNode: licenseNode,
    sourceLinks: sourceLinks,
    buildControls: buildControls,
    mount: mount,
    failureNode: failureNode,
    releaseStage: releaseStage,
    loadManifest: loadManifest,
    findById: findById,
    requestFullscreen: requestFullscreen,
    makeFsButton: makeFsButton,
    ensureSaveNotice: ensureSaveNotice,
    showSaveInfo: showSaveInfo,
    wireSavedGamesLink: wireSavedGamesLink,
    /* Diagnostics: what the running game tried to reach and was refused. */
    blockedRequests: function () {
      return blocked.slice();
    }
  };

  /* Footer copyright: "2026" until the year rolls over, then "2026–<year>". */
  function initCopyright() {
    var node = document.getElementById("copyright-years");
    if (!node) {
      return;
    }
    var START = 2026;
    var now = new Date().getFullYear();
    node.textContent = now > START ? START + "–" + now : String(START);
  }

  /* ---- What a game is allowed to reach ---------------------

     A game gets the file it is played from, and nothing else. No ad server, no
     score API, no portal SDK, no analytics beacon — none of those services
     still exist, and a visitor should not be handing their IP and referrer to
     whatever now answers at those addresses.

     This is deny-by-default, not a blocklist: the earlier version chased dead
     hosts one at a time (cpmstar, configar, agame, kongregate) and a new one
     turned up every time a game was tested. What the games have in common is
     not who they call, it is that they have no business calling anyone.

     Ruffle loads movies with `window.fetch` from this page (its own errors name
     `ruffle_web.js`), so wrapping fetch catches everything it does. Our OWN
     two fetches — games.json and a Flashpoint GameZIP — go through
     `nativeFetch`, captured before the wrapper exists, so they are not subject
     to this and the wrapper only ever sees a game's traffic. Two earlier
     attempts to do this did not work and are worth not repeating:
     `allowNetworking: "none"` never reaches `Loader.load()` in Ruffle 0.6.0,
     and a service worker never saw the request at all.

     A blocked `.swf` is answered with a valid but EMPTY movie rather than an
     error, so the game's `Loader` *succeeds* and its ad slot fills with
     nothing. That distinction is the whole point: a failed Loader is exactly
     what leaves these games sitting on a loading screen forever. Everything
     else gets a 204. Nothing is ever answered with an error. */

  /* A minimal but completely valid uncompressed SWF: 1x1 stage, 12fps, one
     frame containing nothing (ShowFrame + End). 20 bytes.

     This one is version 6, which makes it AVM1 — AS1/AS2 content. That is the
     right stand-in for an AVM1 game and the wrong one for an AS3 game, which
     is a distinction that cost real debugging: see EMPTY_SWF_AS3. */
  var EMPTY_SWF = new Uint8Array([
    0x46, 0x57, 0x53, 0x06, /* "FWS", version 6 */
    0x14, 0x00, 0x00, 0x00, /* file length = 20 */
    0x30, 0x0a, 0x00, 0xa0, /* RECT: 1x1 px     */
    0x00, 0x0c,             /* frame rate 12    */
    0x01, 0x00,             /* frame count 1    */
    0x40, 0x00,             /* ShowFrame        */
    0x00, 0x00              /* End              */
  ]);

  /* The same empty movie, declared as ActionScript 3.

     Hand an AS3 game an AVM1 stand-in and Flash's two virtual machines meet,
     which they are not allowed to do. Ruffle says so, twice, and the second
     one is fatal to the game:

       ArgumentError: Error #2180: It is illegal to move AVM1 content (AS1 or
       AS2) to a different part of the displayList when it has been loaded
       into AVM2 (AS3) content.
           at flash.display::DisplayObjectContainer/addChild()
           at com.spilgames.api::SpilGamesServices/onLoadComplete()

       ReferenceError: Error #1069: Property isReady not found on
       flash.display.AVM1Movie and there is no default value.
           at com.spilgames.api::SpilGamesServices/isReady()
           …
           at general.scenes::MainMenu/onPlayBtnClick()

     `AVM1Movie` is a sealed class, so touching any property of it throws, and
     the throw unwinds the game's own click handler — which is why a Play
     button can simply stop working. The fix is to match the stand-in to the
     movie being played (see emptySwfResponse).

     Byte for byte this is the 20-byte movie above with the version raised to
     15 and a FileAttributes tag added, which must come first and carries the
     ActionScript3 flag (bit 3 of its first byte). */
  var EMPTY_SWF_AS3 = new Uint8Array([
    0x46, 0x57, 0x53, 0x0f, /* "FWS", version 15      */
    0x1a, 0x00, 0x00, 0x00, /* file length = 26       */
    0x30, 0x0a, 0x00, 0xa0, /* RECT: 1x1 px           */
    0x00, 0x0c,             /* frame rate 12          */
    0x01, 0x00,             /* frame count 1          */
    0x44, 0x11,             /* FileAttributes, 4 bytes*/
    0x08, 0x00, 0x00, 0x00, /*   ActionScript3 = 1    */
    0x40, 0x00,             /* ShowFrame              */
    0x00, 0x00              /* End                    */
  ]);

  /* A stand-in for a request we refused to send.

     `url` matters and is easy to miss: a hand-built Response always reports
     `url === ""`, because the constructor has no way to set it — and Ruffle
     reads that to work out the movie's query parameters, so an empty one
     fails to parse and it logs

       ERROR core/common/src/tag_utils.rs:241 Failed to parse loader URL when
       extracting query parameters: relative URL without a base

     for every blocked call. `url` is a getter on Response.prototype, so an own
     property shadows it and the stand-in reports the address it stands in for,
     which is what a real response would have said. */
  function standIn(url, body, init) {
    var res = new Response(body, init);
    try {
      Object.defineProperty(res, "url", { value: absolute(url) });
    } catch (e) {
      /* Shadowing refused: the game still runs, the console line comes back. */
    }
    return res;
  }

  /* Match the stand-in to the movie asking for it. `mainMovieIsAs3` comes from
     Ruffle's own header parse, so it is the movie's real AVM version rather
     than a guess from the SWF version number. Null (not yet known) keeps the
     AVM1 stub, which is what this always used to serve. */
  function emptySwfResponse(url) {
    return standIn(url, mainMovieIsAs3 ? EMPTY_SWF_AS3 : EMPTY_SWF, {
      status: 200,
      headers: { "Content-Type": "application/x-shockwave-flash" }
    });
  }

  /* ---- Watching bytes arrive --------------------------------

     Two shapes, because the two sources are fetched by different code. A
     GameZIP is fetched by us, so readWithProgress() reads it straight. A
     movie is fetched by RUFFLE, so countingResponse() hands Ruffle a
     re-streamed copy of the response and counts what passes through.

     Both degrade to the plain path when the browser gives no body stream: the
     progress is a nicety, the bytes are not. */

  /* Read a whole response into an ArrayBuffer, reporting as it goes. */
  function readWithProgress(res, loader) {
    var total = Number(res.headers.get("Content-Length")) || 0;
    if (!res.body || typeof res.body.getReader !== "function") {
      return res.arrayBuffer();
    }
    var reader = res.body.getReader();
    var chunks = [];
    var loaded = 0;
    loader.bytes(0, total);
    return (function pump() {
      return reader.read().then(function (r) {
        if (r.done) {
          var out = new Uint8Array(loaded);
          var at = 0;
          chunks.forEach(function (c) {
            out.set(c, at);
            at += c.byteLength;
          });
          return out.buffer;
        }
        chunks.push(r.value);
        loaded += r.value.byteLength;
        loader.bytes(loaded, total);
        return pump();
      });
    })();
  }

  /* Ruffle's own fetch of the movie, re-streamed so the bytes can be counted
     on the way past. The response is otherwise untouched — same status, same
     headers, same body — and `url` is carried over explicitly, because a
     hand-built Response reports `url === ""` and Ruffle parses that for the
     movie's query parameters (the tag_utils.rs:241 trap standIn documents). */
  function countingResponse(res, onBytes) {
    if (!res.body || typeof ReadableStream !== "function") {
      return res;
    }
    try {
      var total = Number(res.headers.get("Content-Length")) || 0;
      var reader = res.body.getReader();
      var loaded = 0;
      var stream = new ReadableStream({
        pull: function (controller) {
          return reader.read().then(function (r) {
            if (r.done) {
              controller.close();
              return;
            }
            loaded += r.value.byteLength;
            try {
              onBytes(loaded, total);
            } catch (e) {
              /* a loader that has gone away must not break the download */
            }
            controller.enqueue(r.value);
          });
        },
        cancel: function (reason) {
          return reader.cancel(reason);
        }
      });
      var out = new Response(stream, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers
      });
      Object.defineProperty(out, "url", { value: res.url });
      return out;
    } catch (e) {
      return res; /* never let a progress bar cost us the game */
    }
  }

  /* Set by mountRuffle for the movie it is about to load, cleared as soon as
     that movie is in. Null at every other moment, so the policy wrapper does
     no extra work for anything else. */
  var onMovieBytes = null;

  /* The movie currently being played, and the directory it came from. Set by
     mountRuffle before it hands the URL to Ruffle. */
  var mainMovieUrl = null;
  var mainMovieDir = null;

  /* Whether that movie is ActionScript 3, once Ruffle has parsed its header
     and published `metadata.isActionScript3`. Null until then. Decides which
     empty-SWF stand-in a blocked movie request gets. */
  var mainMovieIsAs3 = null;

  /* The unzipped GameZIP of the running game, keyed by archived address
     (`content/<host>/<path>`, lower-cased). Null for any other source. */
  var zipFiles = null;

  /* The archived directory the running GameZIP's movie came from, lower-cased
     and `content/…`-relative — e.g.
     `content/s3.amazonaws.com/bornegames/game_files/world_4/`. Needed because
     of the blob: problem zipFile() describes. */
  var zipBaseDir = null;

  /* Files borrowed from another game's GameZIP for the running game, with the
     request-substring map that says which is which. Null when the entry has
     no `dependencies`. See loadDependencies. */
  var deps = null;

  /* The file this request is asking for, if the running game's own GameZIP
     archived it. This is how a game gets its portal SDK and the recorded
     replies of services that died years ago, without a request leaving the
     browser. */
  function zipFile(url) {
    if (!zipFiles) {
      return null;
    }
    var raw = String(url);

    /* A GameZIP movie is loaded from a `blob:` URL, and Ruffle resolves the
       game's RELATIVE requests against that URL rather than against the `base`
       we hand it. So a game asking for `Levels/World 4/Level2/Level2-a.swf`
       produces

         blob:http://localhost:8000/Levels/World 4/Level2/Level2-a.swf?ver=…

       which is not an address at all — it is the relative path with a blob
       origin stuck on the front. Recover the path and resolve it where it was
       always meant to go: the movie's own archived directory. Fancy Pants
       World 4 loads every level this way, so without this the title screen
       appears and Play leads to a blank stage. */
    if (raw.indexOf("blob:") === 0) {
      if (!zipBaseDir) {
        return null;
      }
      var after = raw.slice(5); /* drop "blob:" */
      var slash = after.indexOf("/", after.indexOf("//") + 2);
      if (slash < 0) {
        return null;
      }
      var rel = after.slice(slash + 1).split("?")[0].split("#")[0];
      if (!rel || rel.indexOf("..") !== -1) {
        return null;
      }
      var blobKey;
      try {
        blobKey = decodeURIComponent(zipBaseDir + rel).toLowerCase();
      } catch (e) {
        blobKey = (zipBaseDir + rel).toLowerCase();
      }
      return Object.prototype.hasOwnProperty.call(zipFiles, blobKey)
        ? zipFiles[blobKey]
        : null;
    }

    var u;
    try {
      u = new URL(raw, window.location.href);
    } catch (e) {
      return null;
    }
    if (!/^https?:$/.test(u.protocol)) {
      return null;
    }
    var key = decodeURIComponent("content/" + u.hostname + u.pathname).toLowerCase();
    return Object.prototype.hasOwnProperty.call(zipFiles, key) ? zipFiles[key] : null;
  }

  function absolute(url) {
    try {
      return new URL(String(url), window.location.href).href;
    } catch (e) {
      return String(url);
    }
  }

  /* fetch() takes a string, a URL, or a Request. Ruffle uses all three — it
     asks for its own .wasm with a URL object — so read the address out of
     whichever it is, and return null when it is none of them: an unrecognised
     shape is passed through rather than blocked, because guessing wrong here
     breaks the emulator instead of a dead ad server. */
  function requestUrl(input) {
    if (typeof input === "string") {
      return input;
    }
    if (typeof URL === "function" && input instanceof URL) {
      return input.href;
    }
    if (input && typeof input.url === "string") {
      return input.url;
    }
    return null;
  }

  /* Ruffle's own directory, worked out from its script tag, so the emulator
     can still fetch the things it is made of — the .wasm module and its code
     chunks — which it loads lazily, long after this policy is installed, and
     with `fetch`. Blocking those would not lock a game down, it would stop
     Ruffle starting at all. Matters more now the engine comes from a CDN:
     these are cross-origin requests like any other. */
  var engineDir = (function () {
    var tag = document.querySelector('script[src*="ruffle"]');
    if (!tag) {
      return null;
    }
    var src = absolute(tag.getAttribute("src")).split("?")[0];
    var cut = src.lastIndexOf("/");
    return cut > 0 ? src.slice(0, cut + 1) : null;
  })();

  /* The game file itself, and anything sitting beside it in the same archived
     item. A few of these games are more than one file — a loader SWF that
     pulls in its levels — and those siblings are part of the game, archived
     with it, at the same address. Everything else is somebody else's server. */
  function isGameFile(url) {
    var abs = absolute(url).split("?")[0];
    if (engineDir && abs.indexOf(engineDir) === 0) {
      return true; /* Ruffle fetching Ruffle */
    }
    if (!mainMovieUrl) {
      return false;
    }
    return abs === mainMovieUrl.split("?")[0] ||
      (!!mainMovieDir && abs.indexOf(mainMovieDir) === 0);
  }

  /* The movie itself, as opposed to a sibling file or Ruffle's own code. Only
     this one's bytes are worth reporting — it is the download the visitor is
     actually waiting on. */
  function isMainMovie(url) {
    return !!mainMovieUrl &&
      absolute(url).split("?")[0] === mainMovieUrl.split("?")[0];
  }

  /* What a game tried to reach and was refused, newest last, for checking a
     game by hand (tools/audit-network.html reads it). Capped so a game that
     retries forever cannot grow it without bound. */
  var blocked = [];

  function noteBlocked(url) {
    if (blocked.length < 200) {
      blocked.push(absolute(url));
    }
  }

  function installGameNetworkPolicy() {
    if (typeof window.fetch !== "function" || window.__faNetPolicy) {
      return;
    }
    window.__faNetPolicy = true;

    window.fetch = function (input, init) {
      var url = requestUrl(input);

      if (url === null || isGameFile(url)) {
        var allowed = nativeFetch(input, init);
        /* The movie itself, while a loader is watching for it: count the bytes
           on the way to Ruffle so the stage can say how far along it is.
           Anything else Ruffle fetches (its own .wasm, a sibling file) passes
           through untouched. */
        if (onMovieBytes && isMainMovie(url)) {
          var report = onMovieBytes;
          return allowed.then(function (res) {
            return res.ok ? countingResponse(res, report) : res;
          });
        }
        return allowed;
      }

      /* Archived with the game — serve it from memory, nothing goes out. */
      var archived = zipFile(url);
      if (archived) {
        return Promise.resolve(standIn(url, archived, { status: 200 }));
      }

      /* Archived with a DIFFERENT game, and borrowed by this one. */
      var borrowed = depFile(url);
      if (borrowed) {
        return Promise.resolve(
          standIn(url, borrowed.raw, {
            status: 200,
            headers: { "Content-Type": borrowed.type }
          })
        );
      }

      noteBlocked(url);
      return Promise.resolve(
        /\.swf(\?|$)/i.test(String(url))
          ? emptySwfResponse(url)
          : standIn(url, null, { status: 204 })
      );
    };
  }

  function boot() {
    initCopyright();
    wireSavedGamesLink();
    installGameNetworkPolicy();
    purgeOrphanSaves();

    /* A visitor closing the tab mid-game is the ordinary case, not the edge
       one, and `pagehide` is the last event that reliably fires for it —
       `beforeunload` does not on mobile Safari, and `unload` is not fired at
       all in browsers that bfcache the page. */
    window.addEventListener("pagehide", endSaveBridge);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
