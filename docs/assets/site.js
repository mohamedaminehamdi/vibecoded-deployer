/* Progressive enhancement only: the site is fully readable without this file. */
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

  // Theme toggle
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

  // Mobile menu
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

  // Copy buttons on code blocks
  var blocks = document.querySelectorAll("pre");
  Array.prototype.forEach.call(blocks, function (pre) {
    if (!navigator.clipboard || !pre.querySelector("code")) return;
    var wrap = document.createElement("div");
    wrap.className = "code";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    pre.setAttribute("tabindex", "0");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy code to clipboard");
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.innerText.replace(/\n$/, "")).then(
        function () {
          btn.textContent = "Copied";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 1600);
        },
        function () {
          btn.textContent = "Press Ctrl+C";
        }
      );
    });
    wrap.appendChild(btn);
  });

  // Highlight the current section in the table of contents
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
