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
      console.warn("QAQuest: could not read progress from localStorage", e);
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn("QAQuest: could not save progress to localStorage", e);
    }
  }

  function recordAttempt(moduleId, attempt) {
    const progress = loadProgress();
    if (!progress[moduleId]) {
      progress[moduleId] = { attempts: [] };
    }
    progress[moduleId].attempts.push(attempt);
    saveProgress(progress);
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
      throw new Error(`Failed to load ${path}: ${res.status}`);
    }
    return res.json();
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  function formatDuration(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return `${m}m ${s.toString().padStart(2, "0")}s`;
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
      console.warn("QAQuest: could not save ads preference", e);
    }
  }

  return {
    loadProgress,
    saveProgress,
    recordAttempt,
    getModuleAttempts,
    getBestScore,
    fetchJSON,
    formatDate,
    formatDuration,
    shuffle,
    qs,
    escapeHTML,
    areAdsEnabled,
    setAdsEnabled,
  };
})();
