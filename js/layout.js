/**
 * Renders the shared site header and footer into placeholder elements.
 * Keeps every page's chrome (nav, ad slot, disclaimer) consistent.
 */
(function () {
  function renderHeader() {
    const el = document.getElementById("site-header");
    if (!el) return;
    el.innerHTML = `
      <header class="site-header">
        <div class="container">
          <a class="brand" href="index.html">
            <span class="brand-mark">Q</span>
            QAQuest
          </a>
          <nav class="main-nav">
            <a href="index.html">Modules</a>
            <a href="about.html">About</a>
          </nav>
        </div>
      </header>
      <div class="ad-slot ad-slot--header" aria-label="Advertisement placeholder">
        Ad space (e.g. Google AdSense leaderboard, 728x90)
      </div>
    `;
  }

  function renderFooter() {
    const el = document.getElementById("site-footer");
    if (!el) return;
    el.innerHTML = `
      <div class="ad-slot ad-slot--inline" aria-label="Advertisement placeholder">
        Ad space (e.g. Google AdSense responsive unit)
      </div>
      <footer class="site-footer">
        <div class="container">
          <p>
            <strong>QAQuest</strong> is an independent, unofficial practice-exam
            resource. It is not affiliated with, endorsed by, or sponsored by
            ISTQB&reg; (International Software Testing Qualifications Board).
            Syllabus names are used solely as descriptive references.
          </p>
          <p>
            &copy; <span id="footer-year"></span> QAQuest &middot;
            <a href="https://github.com/brutecarlos/qaquest" target="_blank" rel="noopener">
              Source on GitHub
            </a>
          </p>
        </div>
      </footer>
    `;
    const yearEl = document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    renderFooter();
  });
})();
