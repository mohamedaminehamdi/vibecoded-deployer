/* Progressive enhancement only: the site is fully readable without this file.
   With motion off (pause button, OS setting, or no JavaScript) the hero shows its finished state. */
(function () {
  var root = document.documentElement;

  function store(action, key, value) {
    try {
      return action === "get" ? localStorage.getItem(key) : localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
  }

  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* ---------- Theme toggle ---------- */
  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    var syncTheme = function () {
      themeBtn.setAttribute("aria-pressed", String(currentTheme() === "dark"));
    };
    syncTheme();
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("set", "ld-theme", next);
      syncTheme();
    });
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector("[data-menu-toggle]");
  var nav = document.getElementById("site-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", String(!open));
      menuBtn.setAttribute("aria-expanded", String(!open));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.getAttribute("data-open") === "true") {
        nav.setAttribute("data-open", "false");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.focus();
      }
    });
  }

  /* ---------- Hero: replay of a deploy run ---------- */
  var hero = null;

  function initHero() {
    var pipeline = document.querySelector(".pipeline");
    var body = document.querySelector(".console-body");
    var stateEl = document.querySelector("[data-console-state]");
    if (!pipeline || !body) return null;

    var stages = Array.prototype.slice.call(pipeline.querySelectorAll(".stage"));
    var lines = Array.prototype.slice.call(body.querySelectorAll(".ln"));
    var token = 0;
    var onScreen = true;

    // Split typed lines into a shown part and a hidden rest so layout never shifts while typing.
    lines.forEach(function (ln) {
      var t = ln.querySelector(".t");
      if (!t || t.getAttribute("data-split")) return;
      var full = t.textContent;
      t.textContent = "";
      var shown = document.createElement("span");
      var rest = document.createElement("span");
      rest.style.visibility = "hidden";
      rest.textContent = full;
      t.appendChild(shown);
      t.appendChild(rest);
      t.setAttribute("data-split", "1");
      t._shown = shown;
      t._rest = rest;
      t._full = full;
    });

    function setState(s) {
      if (stateEl) {
        stateEl.setAttribute("data-state", s);
        stateEl.textContent = s === "running" ? "running" : "success";
      }
    }

    function wait(ms, tok) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(tok === token);
        }, ms);
      });
    }

    function waitVisible(tok) {
      return new Promise(function (resolve) {
        (function poll() {
          if (tok !== token) return resolve(false);
          if (onScreen && !document.hidden) return resolve(true);
          setTimeout(poll, 300);
        })();
      });
    }

    function typed(ln) {
      return ln.querySelector(".t") && ln.querySelector(".t")._full != null;
    }

    function showFinal() {
      token++;
      stages.forEach(function (s) {
        s.classList.remove("is-active");
        s.classList.add("is-done");
        s.style.removeProperty("--dur");
      });
      lines.forEach(function (ln) {
        ln.classList.remove("is-hidden", "run", "caret");
        var t = ln.querySelector(".t");
        if (t && t._full != null) {
          t._shown.textContent = t._full;
          t._rest.textContent = "";
        }
      });
      setState("success");
    }

    function reset() {
      stages.forEach(function (s) {
        s.classList.remove("is-active", "is-done");
      });
      lines.forEach(function (ln) {
        ln.classList.add("is-hidden");
        ln.classList.remove("run", "caret");
        var t = ln.querySelector(".t");
        if (t && t._full != null) {
          t._shown.textContent = "";
          t._rest.textContent = t._full;
        }
      });
    }

    async function type(ln, tok) {
      var t = ln.querySelector(".t");
      ln.classList.remove("is-hidden");
      ln.classList.add("caret");
      for (var i = 1; i <= t._full.length; i++) {
        t._shown.textContent = t._full.slice(0, i);
        t._rest.textContent = t._full.slice(i);
        if (!(await wait(10, tok))) return false;
      }
      ln.classList.remove("caret");
      return true;
    }

    var durations = { 1: 800, 2: 1200, 3: 1000, 4: 700, 5: 700, 6: 800, 7: 800 };

    async function cycle(tok) {
      while (tok === token) {
        if (!(await waitVisible(tok))) return;
        reset();
        setState("running");
        if (!(await wait(500, tok))) return;

        // Typed command lines
        for (var i = 0; i < lines.length; i++) {
          if (!typed(lines[i])) continue;
          if (!(await type(lines[i], tok))) return;
        }
        if (!(await wait(350, tok))) return;

        // Stages, one by one
        for (var n = 1; n <= stages.length; n++) {
          var stage = stages[n - 1];
          var dur = durations[n] || 900;
          stage.style.setProperty("--dur", dur - 150 + "ms");
          stage.classList.add("is-active");
          var mine = lines.filter(function (ln) {
            return ln.getAttribute("data-stage") === String(n);
          });
          for (var k = 0; k < mine.length; k++) {
            mine[k].classList.remove("is-hidden");
            mine[k].classList.add("run");
            if (!(await wait(Math.min(420, dur / (mine.length + 1)), tok))) return;
          }
          if (!(await wait(dur - 150, tok))) return;
          stage.classList.remove("is-active");
          stage.classList.add("is-done");
          mine.forEach(function (ln) {
            ln.classList.remove("run");
          });
          if (!(await wait(150, tok))) return;
        }
        setState("success");
        if (!(await wait(5200, tok))) return;
      }
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          onScreen = entries[0].isIntersecting;
        },
        { threshold: 0.05 }
      ).observe(pipeline);
    }

    return {
      start: function () {
        token++;
        cycle(token);
      },
      stop: showFinal,
    };
  }

  /* ---------- Motion toggle ---------- */
  var motionBtn = document.querySelector("[data-motion-toggle]");

  function motionOn() {
    return root.getAttribute("data-motion") === "on";
  }

  function syncMotionBtn() {
    if (!motionBtn) return;
    motionBtn.setAttribute("aria-pressed", String(motionOn()));
    motionBtn.setAttribute("title", motionOn() ? "Pause animations" : "Play animations");
  }

  function applyMotion() {
    syncMotionBtn();
    if (!hero) return;
    if (motionOn()) hero.start();
    else hero.stop();
  }

  hero = initHero();

  if (motionBtn) {
    motionBtn.hidden = false;
    syncMotionBtn();
    motionBtn.addEventListener("click", function () {
      var next = motionOn() ? "off" : "on";
      root.setAttribute("data-motion", next);
      store("set", "ld-motion", next);
      applyMotion();
    });
  }

  if (window.matchMedia) {
    var rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    var onRm = function () {
      if (store("get", "ld-motion")) return; // an explicit choice wins over the OS setting
      root.setAttribute("data-motion", rm.matches ? "off" : "on");
      applyMotion();
    };
    if (rm.addEventListener) rm.addEventListener("change", onRm);
  }

  if (hero) {
    if (motionOn()) hero.start();
    else hero.stop();
  }

  /* ---------- Code blocks as terminals, with copy buttons ---------- */
  var blocks = document.querySelectorAll("pre");
  Array.prototype.forEach.call(blocks, function (pre) {
    if (!pre.querySelector("code") || pre.closest(".console")) return;
    var wrap = document.createElement("div");
    wrap.className = "code";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    pre.setAttribute("tabindex", "0");
    if (!navigator.clipboard) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.innerText.replace(/\n$/, "")).then(
        function () {
          btn.textContent = "Copied";
          btn.setAttribute("data-done", "true");
          setTimeout(function () {
            btn.textContent = "Copy";
            btn.removeAttribute("data-done");
          }, 1600);
        },
        function () {
          btn.textContent = "Press Ctrl+C";
        }
      );
    });
    wrap.appendChild(btn);
  });

  /* ---------- Reading progress ---------- */
  var bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var ticking = false;
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.setProperty("--p", p.toFixed(4));
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateProgress);
      }
    },
    { passive: true }
  );
  updateProgress();

  /* ---------- Highlight the current section in the table of contents ---------- */
  var tocLinks = document.querySelectorAll(".toc a[href^='#']");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    Array.prototype.forEach.call(tocLinks, function (a) {
      map[a.getAttribute("href").slice(1)] = a;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            Array.prototype.forEach.call(tocLinks, function (a) {
              a.removeAttribute("aria-current");
            });
            map[entry.target.id].setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }
})();
