/**
 * QAQuest shared utilities: localStorage-backed progress tracking and
 * small DOM/formatting helpers used across pages.
 */
const QAQuest = (() => {
  const STORAGE_KEY = "qaquest_progress_v1";
  const ADS_PREF_KEY = "qaquest_ads_enabled_v1";

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("QAQuest: no se pudo leer el progreso del almacenamiento local", e);
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn("QAQuest: no se pudo guardar el progreso en el almacenamiento local", e);
    }
  }

  function recordAttempt(moduleId, attempt) {
    const progress = loadProgress();
    if (!progress[moduleId]) {
      progress[moduleId] = { attempts: [] };
    }
    progress[moduleId].attempts.push(attempt);
    saveProgress(progress);
    if (QAQuest.Badges) {
      try {
        const r = QAQuest.Badges.update();
        sessionStorage.setItem("qaquest_new_badges", JSON.stringify(r.newly));
      } catch (e) { /* badges are optional */ }
    }
    return progress;
  }

  function getModuleAttempts(moduleId) {
    const progress = loadProgress();
    return (progress[moduleId] && progress[moduleId].attempts) || [];
  }

  function getBestScore(moduleId) {
    const attempts = getModuleAttempts(moduleId);
    if (attempts.length === 0) return null;
    return attempts.reduce(
      (best, a) => (a.percentage > best ? a.percentage : best),
      0
    );
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`No se pudo cargar ${path}: ${res.status}`);
    }
    return res.json();
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("es", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) + " " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDuration(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return `${m} min ${s.toString().padStart(2, "0")} s`;
  }

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Ads are opt-in: until the visitor explicitly chooses to support the
   * site, no ad slot is rendered or populated at all (not just hidden via
   * CSS), so the default experience is genuinely ad-free and lightweight.
   */
  function areAdsEnabled() {
    try {
      return localStorage.getItem(ADS_PREF_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function setAdsEnabled(enabled) {
    try {
      localStorage.setItem(ADS_PREF_KEY, enabled ? "true" : "false");
    } catch (e) {
      console.warn("QAQuest: no se pudo guardar la preferencia de anuncios", e);
    }
  }

  /**
   * Validates an imported progress object (module id -> {attempts: [...]}).
   * Returns the cleaned object or throws an Error describing the problem.
   */
  function validateProgress(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("El archivo no contiene un objeto de progreso.");
    }
    const clean = {};
    Object.keys(data).forEach((id) => {
      const m = data[id];
      if (!m || !Array.isArray(m.attempts)) throw new Error(`La entrada de «${id}» no es válida.`);
      m.attempts.forEach((a) => {
        if (
          !a || typeof a !== "object" ||
          typeof a.date !== "string" || isNaN(new Date(a.date)) ||
          !Number.isFinite(a.score) || !Number.isFinite(a.total) ||
          !Number.isFinite(a.percentage) || typeof a.passed !== "boolean"
        ) {
          throw new Error(`Hay un intento no válido en «${id}».`);
        }
      });
      clean[id] = { attempts: m.attempts };
    });
    return clean;
  }

  function exportProgress() {
    const payload = { app: "QAQuest", version: 1, exportedAt: new Date().toISOString(), progress: loadProgress(), gamification: QAQuest.Badges ? QAQuest.Badges.loadStore() : undefined, daily: QAQuest.DailyQuestion ? QAQuest.DailyQuestion.load() : undefined };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qaqest-progreso.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /** Merges imported attempts into existing progress, skipping duplicates by date+mode. */
  async function importProgressFile(file) {
    const parsed = JSON.parse(await file.text());
    const importedDaily = parsed && parsed.daily !== undefined && QAQuest.DailyQuestion
      ? QAQuest.DailyQuestion.validate(parsed.daily)
      : null;
    const incoming = validateProgress(parsed && parsed.app === "QAQuest" ? parsed.progress : null);
    const current = loadProgress();
    let added = 0;
    Object.keys(incoming).forEach((id) => {
      const existing = (current[id] && current[id].attempts) || [];
      const seen = new Set(existing.map((a) => a.date + "|" + a.mode));
      incoming[id].attempts.forEach((a) => {
        if (!seen.has(a.date + "|" + a.mode)) { existing.push(a); added++; }
      });
      existing.sort((x, y) => new Date(x.date) - new Date(y.date));
      current[id] = { attempts: existing };
    });
    saveProgress(current);
    if (QAQuest.Badges) {
      const store = QAQuest.Badges.loadStore();
      const inc = QAQuest.Badges.validateStore(parsed.gamification);
      store.earned = QAQuest.Badges.mergeEarned(store.earned, inc.earned);
      if (!store.displayName) store.displayName = inc.displayName;
      QAQuest.Badges.saveStore(store);
      QAQuest.Badges.update();
    }
    if (QAQuest.DailyQuestion && importedDaily) {
      QAQuest.DailyQuestion.merge(importedDaily);
    }
    return added;
  }

  function reportIssueUrl(moduleId, q) {
    const title = `Problema con la pregunta: ${q.id} (${moduleId})`;
    const body = `Módulo: ${moduleId}\nID de la pregunta: ${q.id}\nCapítulo: ${q.chapter || ""}\n\nPregunta:\n${q.question}\n\n¿Qué está mal?\n`;
    return "https://github.com/brutecarlos/qaqest/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(body);
  }

  function difficultyLabel(d) {
    return ({ easy: "Fácil", medium: "Media", hard: "Difícil" })[d] || d;
  }

  function progressToolsHtml() {
    return `<div class="progress-tools">
      <button type="button" class="btn btn-secondary" data-pt="export" aria-label="Exportar el progreso como archivo JSON">Exportar progreso</button>
      <button type="button" class="btn btn-secondary" data-pt="import" aria-label="Importar progreso desde un archivo JSON">Importar progreso</button>
      <input type="file" accept="application/json,.json" data-pt="file" hidden aria-label="Seleccionar archivo de progreso JSON" />
      <span class="tool-msg" role="status" aria-live="polite"></span>
    </div>`;
  }

  function bindProgressTools(root) {
    const box = root.querySelector(".progress-tools");
    if (!box) return;
    const msg = box.querySelector(".tool-msg");
    const file = box.querySelector('[data-pt="file"]');
    box.querySelector('[data-pt="export"]').addEventListener("click", exportProgress);
    box.querySelector('[data-pt="import"]').addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      if (!file.files[0]) return;
      try {
        const added = await importProgressFile(file.files[0]);
        msg.textContent = `Se han importado ${added} ${added === 1 ? "intento nuevo" : "intentos nuevos"}. Recargando…`;
        setTimeout(() => location.reload(), 800);
      } catch (e) {
        msg.textContent = "Error al importar: " + e.message;
      }
      file.value = "";
    });
  }

  return {
    progressToolsHtml,
    bindProgressTools,
    exportProgress,
    importProgressFile,
    reportIssueUrl,
    loadProgress,
    saveProgress,
    recordAttempt,
    getModuleAttempts,
    getBestScore,
    fetchJSON,
    formatDate,
    difficultyLabel,
    formatDuration,
    shuffle,
    qs,
    escapeHTML,
    areAdsEnabled,
    setAdsEnabled,
  };
})();
