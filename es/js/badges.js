/**
 * QAQuest streaks & badges. Everything is derived from attempt history
 * (source of truth); earned dates are also stored locally for stability.
 * Streak day = a local calendar day with at least one completed attempt
 * (practice or exam). A missed day breaks the streak.
 */
(function (root) {
  const KEY = "qaquest_gamification_v1";
  const DEFS = [
    { id: "first-attempt", icon: "🚀", name: "Primer intento", how: "Completa un intento de práctica o de examen." },
    { id: "first-pass", icon: "✅", name: "Primer aprobado", how: "Alcanza o supera la nota de aprobación en un examen." },
    { id: "streak-3", icon: "🔥", name: "Racha de 3 días", how: "Estudia 3 días seguidos." },
    { id: "streak-7", icon: "🔥", name: "Racha de 7 días", how: "Estudia 7 días seguidos." },
    { id: "streak-14", icon: "🔥", name: "Racha de 14 días", how: "Estudia 14 días seguidos." },
    { id: "streak-30", icon: "🏅", name: "Racha de 30 días", how: "Estudia 30 días seguidos." },
    { id: "q-100", icon: "💯", name: "100 preguntas", how: "Responde 100 preguntas en total." },
    { id: "q-500", icon: "📚", name: "500 preguntas", how: "Responde 500 preguntas en total." },
    { id: "perfect", icon: "🏆", name: "Puntuación perfecta", how: "Obtén un 100 % en un examen." },
    { id: "explorer", icon: "🧭", name: "Explorador", how: "Intenta completar 3 módulos diferentes." },
    { id: "comeback", icon: "💪", name: "Remontada", how: "Aprueba un examen de un módulo después de haberlo suspendido." },
  ];
  const IDS = DEFS.map((d) => d.id);

  function dayKey(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function dayNum(key) {
    const [y, m, d] = key.split("-").map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 86400000);
  }
  function answeredCount(a) {
    if (Array.isArray(a.answers) && a.answers.length) {
      return a.answers.filter((x) => x && x.selectedIndex !== null && x.selectedIndex !== undefined).length;
    }
    return Number.isFinite(a.total) ? a.total : 0;
  }

  /** Pure: progress object + "now" -> stats and earned badge dates. */
  function compute(progress, now) {
    now = now || new Date();
    const list = [];
    Object.keys(progress || {}).forEach((id) => {
      ((progress[id] && progress[id].attempts) || []).forEach((a) => {
        const t = new Date(a.date);
        if (!isNaN(t)) list.push({ mod: id, a, t });
      });
    });
    list.sort((x, y) => x.t - y.t);

    const earned = {};
    const award = (id, t) => { if (!earned[id]) earned[id] = t.toISOString(); };
    const failed = new Set();
    const mods = new Set();
    const days = new Set();
    let questions = 0, longest = 0, run = 0, prev = null;

    list.forEach(({ mod, a, t }) => {
      award("first-attempt", t);
      mods.add(mod);
      if (mods.size >= 3) award("explorer", t);
      questions += answeredCount(a);
      if (questions >= 100) award("q-100", t);
      if (questions >= 500) award("q-500", t);
      const k = dayKey(t);
      if (!days.has(k)) {
        days.add(k);
        run = prev !== null && dayNum(k) - dayNum(prev) === 1 ? run + 1 : 1;
        prev = k;
        longest = Math.max(longest, run);
        [3, 7, 14, 30].forEach((n) => { if (run >= n) award("streak-" + n, t); });
      }
      if (a.mode === "exam") {
        if (a.passed) {
          award("first-pass", t);
          if (failed.has(mod)) award("comeback", t);
        } else failed.add(mod);
        if (a.percentage >= 100) award("perfect", t);
      }
    });

    let current = 0;
    const today = dayKey(now);
    if (prev !== null && dayNum(today) - dayNum(prev) <= 1) current = run;
    return { earned, stats: { current, longest, lastStudyDate: prev, questions, attempts: list.length } };
  }

  function loadStore() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return validateStore(s);
    } catch (e) { return { earned: {}, displayName: "" }; }
  }
  function saveStore(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }
  /** Returns a cleaned store; unknown ids and bad dates are dropped. */
  function validateStore(s) {
    const out = { earned: {}, displayName: "" };
    if (!s || typeof s !== "object" || Array.isArray(s)) return out;
    if (s.earned && typeof s.earned === "object") {
      Object.keys(s.earned).forEach((id) => {
        const v = s.earned[id];
        if (IDS.includes(id) && typeof v === "string" && !isNaN(new Date(v))) out.earned[id] = v;
      });
    }
    if (typeof s.displayName === "string") out.displayName = s.displayName.slice(0, 30);
    return out;
  }
  function mergeEarned(a, b) {
    const out = Object.assign({}, a);
    Object.keys(b).forEach((id) => {
      if (!out[id] || new Date(b[id]) < new Date(out[id])) out[id] = b[id];
    });
    return out;
  }

  /** Recompute from history, persist, and report newly earned badge ids. */
  function update() {
    const progress = QAQuest.loadProgress();
    const store = loadStore();
    const res = compute(progress);
    const newly = IDS.filter((id) => res.earned[id] && !store.earned[id]);
    store.earned = mergeEarned(store.earned, res.earned);
    saveStore(store);
    return { newly, stats: res.stats, earned: store.earned };
  }
  function summary() {
    const store = loadStore();
    const res = compute(QAQuest.loadProgress());
    return { stats: res.stats, earned: mergeEarned(store.earned, res.earned) };
  }
  function def(id) { return DEFS.find((d) => d.id === id); }

  function gridHtml(earned) {
    const esc = QAQuest.escapeHTML;
    return '<ul class="badge-grid">' + DEFS.map((d) => {
      const when = earned[d.id];
      const label = when
        ? `${d.name}: conseguido el ${new Date(when).toLocaleDateString("es")}`
        : `${d.name}: bloqueado. ${d.how}`;
      return `<li class="badge-tile${when ? "" : " locked"}" aria-label="${esc(label)}">
        <span class="badge-icon" aria-hidden="true">${d.icon}</span>
        <span class="badge-name">${esc(d.name)}</span>
        <span class="badge-sub">${when ? esc(new Date(when).toLocaleDateString("es")) : esc(d.how)}</span></li>`;
    }).join("") + "</ul>";
  }
  function panelHtml() {
    const { stats, earned } = summary();
    const n = Object.keys(earned).length;
    return `<section class="progress-panel" aria-labelledby="yp-title">
      <h2 id="yp-title" class="section-title">Tu progreso</h2>
      <div class="streak-stats">
        <div><strong>${stats.current.toLocaleString("es")}</strong><span>🔥 días de racha</span></div>
        <div><strong>${stats.longest.toLocaleString("es")}</strong><span>Racha más larga</span></div>
        <div><strong>${stats.questions.toLocaleString("es")}</strong><span>Preguntas respondidas</span></div>
        <div><strong>${n.toLocaleString("es")}/${DEFS.length.toLocaleString("es")}</strong><span>Insignias</span></div>
      </div>
      <details class="badge-details"><summary>Ver insignias</summary>${gridHtml(earned)}</details>
      <p class="badge-note">Se guarda solo en este dispositivo. La racha cuenta cada día local en el que se completa al menos un intento.</p>
    </section>`;
  }

  const api = { KEY, DEFS, compute, update, summary, def, panelHtml, gridHtml, loadStore, saveStore, validateStore, mergeEarned, dayKey };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof QAQuest !== "undefined") QAQuest.Badges = api;
})(typeof window !== "undefined" ? window : globalThis);
