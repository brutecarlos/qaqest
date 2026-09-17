/**
 * Renders the shared site header and footer into placeholder elements, and
 * manages the visitor-facing ads on/off toggle.
 *
 * Ads are opt-in and default OFF: until a visitor explicitly chooses
 * "Support QAQuest with ads", no ad-slot element is created in the DOM at
 * all (not merely hidden via CSS), so the default page stays genuinely
 * lightweight and non-invasive. The choice is remembered in localStorage
 * and can be changed at any time from the header toggle.
 */
(function () {
  const HEADER_AD_LABEL = "Ad space (e.g. Google AdSense leaderboard, 728x90)";
  const FOOTER_AD_LABEL = "Ad space (e.g. Google AdSense responsive unit)";

  function buildAdSlot(className, label) {
    const div = document.createElement("div");
    div.className = `ad-slot ${className}`;
    div.setAttribute("aria-label", "Advertisement placeholder");
    div.textContent = label;
    return div;
  }

  /**
   * Adds or removes the ad-slot elements for the current page based on the
   * stored preference. Slots are fully created/destroyed (not toggled with
   * a CSS class), so when ads are off nothing ad-related is ever injected.
   */
  function syncAdSlots() {
    const enabled = QAQuest.areAdsEnabled();

    const headerMount = document.getElementById("header-ad-mount");
    if (headerMount) {
      headerMount.innerHTML = "";
      if (enabled) {
        headerMount.appendChild(buildAdSlot("ad-slot--header", HEADER_AD_LABEL));
      }
    }

    const footerMount = document.getElementById("footer-ad-mount");
    if (footerMount) {
      footerMount.innerHTML = "";
      if (enabled) {
        footerMount.appendChild(buildAdSlot("ad-slot--inline", FOOTER_AD_LABEL));
      }
    }
  }

  function updateToggleButton(btn) {
    const enabled = QAQuest.areAdsEnabled();
    btn.textContent = enabled
      ? "\uD83D\uDEAB No ads, just studying"
      : "\u2764\uFE0F Support QAQuest with ads";
    btn.setAttribute("aria-pressed", String(enabled));
    btn.title = enabled
      ? "Ads are on. Click to switch to ad-free."
      : "Ads are off. Click to show ads and support QAQuest.";
  }

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
          <div class="header-actions">
            <nav class="main-nav">
              <a href="index.html">Modules</a>
              <a href="about.html">About</a>
            </nav>
            <button type="button" class="btn btn-secondary btn-ads-toggle" id="ads-toggle"></button>
          </div>
        </div>
      </header>
      <div id="header-ad-mount"></div>
    `;

    const toggleBtn = document.getElementById("ads-toggle");
    updateToggleButton(toggleBtn);
    toggleBtn.addEventListener("click", () => {
      QAQuest.setAdsEnabled(!QAQuest.areAdsEnabled());
      updateToggleButton(toggleBtn);
      syncAdSlots();
    });
  }

  function renderFooter() {
    const el = document.getElementById("site-footer");
    if (!el) return;
    el.innerHTML = `
      <div id="footer-ad-mount"></div>
      <footer class="site-footer">
        <div class="container">
          <p>
            <strong>QAQuest</strong> is an independent, unofficial practice-exam
            resource. It is not affiliated with, endorsed by, or sponsored by
            ISTQB&reg; (International Software Testing Qualifications Board).
            Syllabus names are used solely as descriptive references.
          </p>
          <p>
            Ads are opt-in: QAQuest shows no ads by default. You can turn them
            on any time from the button in the header if you'd like to
            support the project.
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
    syncAdSlots();
  });
})();
