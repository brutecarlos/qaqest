/**
 * QAQuest streaks & badges. Everything is derived from attempt history
 * (source of truth); earned dates are also stored locally for stability.
 * Streak day = a local calendar day with at least one completed attempt
 * (practice or exam). A missed day breaks the streak.
 */
(function (root) {
  const KEY = "qaquest_gamification_v1";
  const DEFS = [
    { id: "first-attempt", icon: "🚀", name: "First attempt", how: "Complete any practice or exam attempt." },
    { id: "first-pass", icon: "✅", name: "First pass", how: "Score at or above the pass mark in an exam." },
    { id: "streak-3", icon: "🔥", name: "3-day streak", how: "Study on 3 days in a row." },
    { id: "streak-7", icon: "🔥", name: "7-day streak", how: "Study on 7 days in a row." },
    { id: "streak-14", icon: "🔥", name: "14-day streak", how: "Study on 14 days in a row." },
    { id: "streak-30", icon: "🏅", name: "30-day streak", how: "Study on 30 days in a row." },
    { id: "q-100", icon: "💯", name: "100 questions", how: "Answer 100 questions in total." },
    { id: "q-500", icon: "📚", name: "500 questions", how: "Answer 500 questions in total." },
    { id: "perfect", icon: "🏆", name: "Perfect score", how: "Score 100% in an exam." },
    { id: "explorer", icon: "🧭", name: "Explorer", how: "Attempt 3 different modules." },
    { id: "comeback", icon: "💪", name: "Comeback", how: "Pass an exam in a module after failing it earlier." },
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
    const progress = root.QAQuest.loadProgress();
    const store = loadStore();
    const res = compute(progress);
    const newly = IDS.filter((id) => res.earned[id] && !store.earned[id]);
    store.earned = mergeEarned(store.earned, res.earned);
    saveStore(store);
    return { newly, stats: res.stats, earned: store.earned };
  }
  function summary() {
    const store = loadStore();
    const res = compute(root.QAQuest.loadProgress());
    return { stats: res.stats, earned: mergeEarned(store.earned, res.earned) };
  }
  function def(id) { return DEFS.find((d) => d.id === id); }

  function gridHtml(earned) {
    const esc = root.QAQuest.escapeHTML;
    return '<ul class="badge-grid">' + DEFS.map((d) => {
      const when = earned[d.id];
      const label = when
        ? `${d.name}: earned ${new Date(when).toLocaleDateString()}`
        : `${d.name}: locked. ${d.how}`;
      return `<li class="badge-tile${when ? "" : " locked"}" aria-label="${esc(label)}">
        <span class="badge-icon" aria-hidden="true">${d.icon}</span>
        <span class="badge-name">${esc(d.name)}</span>
        <span class="badge-sub">${when ? esc(new Date(when).toLocaleDateString()) : esc(d.how)}</span></li>`;
    }).join("") + "</ul>";
  }
  function panelHtml() {
    const { stats, earned } = summary();
    const n = Object.keys(earned).length;
    return `<section class="progress-panel" aria-labelledby="yp-title">
      <h2 id="yp-title" class="section-title">Your progress</h2>
      <div class="streak-stats">
        <div><strong>${stats.current}</strong><span>🔥 day streak</span></div>
        <div><strong>${stats.longest}</strong><span>Longest streak</span></div>
        <div><strong>${stats.questions}</strong><span>Questions answered</span></div>
        <div><strong>${n}/${DEFS.length}</strong><span>Badges</span></div>
      </div>
      <details class="badge-details"><summary>View badges</summary>${gridHtml(earned)}</details>
      <p class="badge-note">Stored only on this device. A streak counts each local day with at least one completed attempt.</p>
    </section>`;
  }

  const api = { KEY, DEFS, compute, update, summary, def, panelHtml, gridHtml, loadStore, saveStore, validateStore, mergeEarned, dayKey };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root.QAQuest) root.QAQuest.Badges = api;
})(typeof window !== "undefined" ? window : globalThis);
