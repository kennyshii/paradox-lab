// Runs synchronously in <head> so the saved theme applies before first paint.
(function () {
  try {
    var saved = localStorage.getItem("paradox-lab:theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (e) {
    /* storage unavailable: fall back to the OS preference */
  }
})();
