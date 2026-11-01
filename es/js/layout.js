/**
 * Renders the shared site header and footer into placeholder elements, and
 * manages the visitor-facing ads on/off toggle.
 *
 * Ads are opt-in and default OFF: until a visitor explicitly chooses
 * "Support QAQEST with ads", no ad-slot element is created in the DOM at
 * all (not merely hidden via CSS), so the default page stays genuinely
 * lightweight and non-invasive. The choice is remembered in localStorage
 * and can be changed at any time from the header toggle.
 */
(function () {
  const HEADER_AD_LABEL = "Espacio publicitario (p. ej., anuncio horizontal de Google AdSense, 728 × 90)";
  const FOOTER_AD_LABEL = "Espacio publicitario (p. ej., bloque adaptable de Google AdSense)";

  // Populated by js/adsense-config.js, if present and configured.
  const adsenseConfig = window.QAQEST_ADSENSE || { client: "", slots: {} };
  const isAdSenseConfigured = Boolean(adsenseConfig.client);
  let adsenseScriptLoaded = false;

  /**
   * Injects Google's adsbygoogle.js loader once, only when a visitor has
   * opted into ads AND a real client ID has been configured. Never runs
   * for the default ad-free state, and never runs at all when AdSense
   * hasn't been configured yet (see js/adsense-config.js).
   */
  function ensureAdSenseScriptLoaded() {
    if (adsenseScriptLoaded || !isAdSenseConfigured) return;
    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      encodeURIComponent(adsenseConfig.client);
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    adsenseScriptLoaded = true;
  }

  function buildAdSlot(className, label, slotId) {
    if (isAdSenseConfigured && slotId) {
      const ins = document.createElement("ins");
      ins.className = `adsbygoogle ad-slot ${className}`;
      ins.setAttribute("data-ad-client", adsenseConfig.client);
      ins.setAttribute("data-ad-slot", slotId);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      ensureAdSenseScriptLoaded();
      // Defer the ad request until the <ins> element is actually attached.
      window.setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
          console.warn("QAQEST: falló la solicitud de AdSense.", err);
        }
      }, 0);
      return ins;
    }

    const div = document.createElement("div");
    div.className = `ad-slot ${className}`;
    div.setAttribute("aria-label", "Marcador de posición para publicidad");
    div.textContent = label;
    return div;
  }

  /**
   * Adds or removes the ad-slot elements for the current page based on the
   * stored preference. Slots are fully created/destroyed (not toggled with
   * a CSS class), so when ads are off nothing ad-related is ever injected.
   */
  function syncAdSlots() {
    // Never show or load ads on the active exam screen.
    const isQuizPage = /quiz\.html$/.test(window.location.pathname);
    const enabled = QAQuest.areAdsEnabled() && !isQuizPage;

    // Load the AdSense loader script whenever a visitor has opted in and a
    // client ID is configured, even if no manual ad-unit slot IDs are set
    // below. This is required for Google's Auto ads (Google decides ad
    // placement automatically once enabled in the AdSense dashboard), and
    // is a no-op if Auto ads is off there.
    if (enabled && isAdSenseConfigured) {
      ensureAdSenseScriptLoaded();
    }

    const headerMount = document.getElementById("header-ad-mount");
    if (headerMount) {
      headerMount.innerHTML = "";
      if (enabled) {
        headerMount.appendChild(
          buildAdSlot("ad-slot--header", HEADER_AD_LABEL, adsenseConfig.slots.header)
        );
      }
    }

    const footerMount = document.getElementById("footer-ad-mount");
    if (footerMount) {
      footerMount.innerHTML = "";
      if (enabled) {
        footerMount.appendChild(
          buildAdSlot("ad-slot--inline", FOOTER_AD_LABEL, adsenseConfig.slots.inline)
        );
      }
    }
  }

  function updateToggleButton(btn) {
    const enabled = QAQuest.areAdsEnabled();
    btn.textContent = enabled
      ? "\uD83D\uDEAB Sin anuncios, solo estudiar"
      : "\u2764\uFE0F Apoya QAQEST con anuncios";
    btn.setAttribute("aria-pressed", String(enabled));
    btn.title = enabled
      ? "Los anuncios están activados. Haz clic para desactivarlos."
      : "Los anuncios están desactivados. Haz clic para mostrarlos y apoyar QAQEST.";
  }

  function englishVersionHref() {
    const segment = window.location.pathname.split("/").filter(Boolean).pop() || "index.html";
    return "../" + segment + window.location.search + window.location.hash;
  }

  function renderHeader() {
    const el = document.getElementById("site-header");
    if (!el) return;
    el.innerHTML = `
      <header class="site-header">
        <div class="container">
          <a class="brand" href="index.html">
            <span class="brand-mark">Q</span>
            QAQEST
          </a>
          <div class="header-actions">
            <nav class="main-nav">
              <a href="start.html">Empieza aquí</a>
              <a href="index.html">Módulos</a>
              <a href="planner.html">Planificador de estudio</a>
              <a href="guides.html">Guías</a>
              <a href="faq.html">Preguntas frecuentes</a>
              <a href="about.html">Acerca de</a>
            </nav>
            <a class="btn btn-secondary" id="language-switch" lang="en" hreflang="en" href="${englishVersionHref()}">English</a>
            <button type="button" class="btn btn-secondary" id="theme-toggle" aria-label="Cambiar el modo oscuro"></button>
            <button type="button" class="btn btn-secondary btn-ads-toggle" id="ads-toggle"></button>
          </div>
        </div>
      </header>
      <div id="header-ad-mount"></div>
    `;

    const themeBtn = document.getElementById("theme-toggle");
    const isDark = () => {
      const t = document.documentElement.getAttribute("data-theme");
      return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    const syncTheme = () => {
      themeBtn.textContent = isDark() ? "\u2600\uFE0F Claro" : "\uD83C\uDF19 Oscuro";
      themeBtn.setAttribute("aria-pressed", String(isDark()));
    };
    syncTheme();
    themeBtn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("qaquest_theme_v1", next); } catch (e) {}
      syncTheme();
    });

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
            <strong>QAQEST</strong> es un recurso de práctica independiente y no oficial; no está
            afiliado, respaldado ni patrocinado por ISTQB&reg;. Los nombres de los
            programas de estudio se usan solo como referencias descriptivas.
            El contenido en español es una traducción de QAQEST y no es oficial.
          </p>
          <p>
            Los anuncios son opcionales: QAQEST no muestra anuncios de forma
            predeterminada. Puedes activarlos en cualquier momento con el botón
            del encabezado para apoyar el proyecto.
          </p>
          <p>
            &copy; <span id="footer-year"></span> QAQEST &middot;
            <a href="https://brutecarlos.github.io/privacy.html">Privacidad (en inglés)</a> &middot;
            <a href="start.html">Empieza aquí</a> &middot;
            <a href="planner.html">Planificador de estudio</a> &middot;
            <a href="guides.html">Guías</a> &middot;
            <a href="faq.html">Preguntas frecuentes</a> &middot;
            <a href="about.html">Acerca de</a> &middot;
            <a href="https://brutecarlos.github.io/">Acerca del autor (en inglés)</a> &middot;
            <a href="https://github.com/brutecarlos/qaqest" target="_blank" rel="noopener">Código fuente en GitHub</a> &middot;
            <a lang="en" hreflang="en" href="${englishVersionHref()}">English version</a>
          </p>
        </div>
      </footer>
    `;
    const yearEl = document.getElementById("footer-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear().toLocaleString("es");
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    renderFooter();
    syncAdSlots();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  });
})();
