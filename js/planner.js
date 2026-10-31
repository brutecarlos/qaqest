/**
 * QAQEST study planner. The pure planning logic (buildPlan) has no DOM
 * dependencies so it can be exercised from node; the UI wiring below only
 * runs in a browser.
 */
(function (root) {
  const INPUT_KEY = "qaquest_planner_inputs_v1";
  const CHECK_KEY = "qaquest_planner_checks_v1";
  const DAY_MS = 86400000;
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return Number.isNaN(t) ? null : t;
  }
  function fmtDate(t) {
    return new Date(t).toISOString().slice(0, 10);
  }
  function round(n) {
    return Math.max(0.5, Math.round(n * 2) / 2);
  }

  // Splits chapters (in order) into `parts` consecutive groups of similar question weight.
  function partition(chapters, parts) {
    const total = chapters.reduce((s, c) => s + c.count, 0) || 1;
    const groups = Array.from({ length: parts }, () => []);
    let acc = 0;
    chapters.forEach((c, i) => {
      const left = chapters.length - i;
      let g = Math.min(parts - 1, Math.floor(((acc + c.count / 2) / total) * parts));
      // Keep every group non-empty when there are enough chapters.
      const lowest = groups.findIndex((x) => x.length === 0);
      if (left <= groups.filter((x) => x.length === 0).length && lowest !== -1) g = lowest;
      groups[g].push(c);
      acc += c.count;
    });
    return groups.filter((g) => g.length);
  }

  function split(hours, parts) {
    const out = {};
    Object.keys(parts).forEach((k) => (out[k] = round(hours * parts[k])));
    return out;
  }

  function names(list) {
    return list.map((c) => c.name);
  }

  function buildPlan(opts) {
    const o = opts || {};
    const hours = Number(o.hoursPerWeek);
    if (!Number.isFinite(hours) || hours <= 0) {
      return { ok: false, error: "hours", message: "Please enter more than 0 study hours per week." };
    }
    const chapters = (o.chapters || []).filter((c) => c && c.count > 0);
    if (!chapters.length) {
      return { ok: false, error: "chapters", message: "Chapter data for this module could not be loaded." };
    }
    const daysOff = Array.from(new Set((o.daysOff || []).map(Number))).filter((d) => d >= 0 && d <= 6);
    const studyDays = 7 - daysOff.length;
    if (studyDays < 1) {
      return { ok: false, error: "daysoff", message: "You need at least one study day per week." };
    }
    const level = ["beginner", "some", "experienced"].includes(o.level) ? o.level : "some";
    const today = parseDate(o.today) ;
    if (today === null) return { ok: false, error: "today", message: "Missing today's date." };

    let daysLeft;
    let weeksN;
    let examDate = null;
    if (o.examDate) {
      examDate = parseDate(o.examDate);
      if (examDate === null) {
        return { ok: false, error: "date", message: "That exam date is not valid." };
      }
      daysLeft = Math.round((examDate - today) / DAY_MS);
      if (daysLeft <= 0) {
        return {
          ok: false,
          error: "past",
          message: daysLeft === 0
            ? "Your exam date is today, so there is no time left to plan. Do a light review, rest and good luck! You can pick a later date to build a full plan."
            : "That exam date is in the past. Pick a future date (or choose a number of weeks) to build a plan."
        };
      }
      weeksN = Math.ceil(daysLeft / 7);
    } else {
      weeksN = Math.floor(Number(o.weeks));
      if (!Number.isFinite(weeksN) || weeksN < 1 || weeksN > 52) {
        return { ok: false, error: "weeks", message: "Enter an exam date or a number of weeks between 1 and 52." };
      }
      daysLeft = weeksN * 7;
    }

    const examMinutes = Number(o.examDurationMinutes) || 60;
    const mod = { id: o.moduleId, name: o.moduleName || o.moduleId };
    const link = "module.html?module=" + encodeURIComponent(mod.id);
    const totalHours = hours * (daysLeft / 7);
    const recommended = Math.round(chapters.length * 5 * { beginner: 1.3, some: 1, experienced: 0.7 }[level]);
    const perSession = hours / studyDays;
    const pomodoros = Math.max(1, Math.round((perSession * 60) / 70));

    const plan = {
      ok: true,
      module: mod,
      daysLeft,
      weekCount: weeksN,
      examDate: examDate !== null ? fmtDate(examDate) : null,
      studyDays,
      totalHours: Math.round(totalHours * 10) / 10,
      recommendedHours: recommended,
      sessionMinutes: Math.round(perSession * 60),
      sessionCycles: pomodoros,
      mode: daysLeft < 14 ? "crash" : daysLeft <= 42 ? "short" : daysLeft <= 84 ? "standard" : "long",
      compressed: false,
      notes: [],
      weeks: []
    };
    const examIn = examDate !== null || o.weeks;
    if (totalHours < recommended * 0.6) {
      plan.compressed = true;
      plan.notes.push(
        "You have about " + plan.totalHours + " study hours, below the roughly " + recommended +
        " hours that are usually helpful for this module, so the plan is compressed. Prioritise the chapters with the most questions and consider more hours per week or a later date."
      );
    }
    if (plan.mode === "crash") {
      plan.compressed = true;
      plan.notes.push("Less than two weeks left: this is a crash plan focused on the highest-value activities.");
    }

    const weekStart = (i) => today + i * 7 * DAY_MS;
    const addWeek = (w) => {
      w.index = plan.weeks.length + 1;
      if (examIn && examDate !== null) {
        w.start = fmtDate(weekStart(plan.weeks.length));
      }
      w.links = [{ label: "Practice " + mod.name, href: link }];
      plan.weeks.push(w);
    };

    if (plan.mode === "crash") {
      const d = Math.min(daysLeft, 7);
      const days = [];
      const sims = d >= 3 ? 1 : 1;
      const contentDays = Math.max(1, d - (d >= 3 ? 2 : 1));
      const groups = partition(chapters, Math.min(contentDays, chapters.length));
      groups.forEach((g, i) => {
        days.push({ text: "Day " + (i + 1) + ": skim and drill in practice mode (note every wrong answer):", items: names(g) });
      });
      if (d >= 3) days.push("Day " + (days.length + 1) + ": review all wrong answers, then take one timed exam-mode simulation (" + examMinutes + " min).");
      else days.push("Day " + (days.length + 1) + ": one timed simulation (" + examMinutes + " min), then review the wrong answers.");
      if (d >= 2) days.push("Final day: light review of notes and wrong answers only. Prepare logistics and sleep well.");
      addWeek({
        title: o.examDate ? "Crash plan: " + daysLeft + " day" + (daysLeft === 1 ? "" : "s") + " to go" : "Crash plan: 1 week",
        phase: "crash",
        goals: days,
        hours: split(hours * Math.min(1, daysLeft / 7), { learn: 0.3, practice: 0.4, review: 0.2, exam: 0.1 }),
        chapters: chapters.map((c) => c.name),
        sims
      });
      plan.weeks[0].exam = round(Math.min(examMinutes / 60, hours * 0.3));
      return plan;
    }

    const W = weeksN;
    const lf = { beginner: 0.6, some: 0.5, experienced: 0.35 }[level];
    let learnWeeks = 0;
    let practiceWeeks = 0;
    let reviewWeeks = 0;
    let combined = false;
    if (W === 2) combined = true;
    else {
      const content = W - 2;
      learnWeeks = Math.max(1, Math.round(content * lf));
      practiceWeeks = content - learnWeeks;
      const lc = Math.min(learnWeeks, chapters.length);
      practiceWeeks += learnWeeks - lc;
      learnWeeks = lc;
      const pc = Math.min(practiceWeeks, chapters.length);
      reviewWeeks = practiceWeeks - pc;
      practiceWeeks = pc;
    }
    const examH = round(Math.min(examMinutes / 60, hours * 0.5));

    if (combined) {
      addWeek({
        title: "Learn and drill every chapter (compressed)",
        phase: "learn",
        goals: [
          { text: "Skim the syllabus chapters in order, then drill each in practice mode:", items: names(chapters) },
          "Spend extra time on the chapters with the most questions."
        ],
        hours: split(hours, { learn: 0.4, practice: 0.5, review: 0.1 }),
        chapters: chapters.map((c) => c.name)
      });
      plan.compressed = true;
      plan.notes.push("With about two weeks, learning and drilling are combined into the first week.");
    } else {
      partition(chapters, learnWeeks).forEach((g, i, arr) => {
        addWeek({
          title: "Learn the syllabus (" + (i + 1) + " of " + arr.length + ")",
          phase: "learn",
          goals: [
            { text: "Study these chapters:", items: names(g) },
            "Make short notes of key terms and definitions.",
            "Finish with a few practice-mode questions per chapter."
          ],
          hours: split(hours, { learn: 0.65, practice: 0.35 }),
          chapters: g.map((c) => c.name)
        });
      });
      if (practiceWeeks) {
        partition(chapters, practiceWeeks).forEach((g, i, arr) => {
          addWeek({
            title: "Practice-mode drills (" + (i + 1) + " of " + arr.length + ")",
            phase: "practice",
            goals: [
              { text: "Drill every question in:", items: names(g) },
              "Read each explanation, including for questions you got right.",
              "Re-read the syllabus sections behind any chapter below ~70%."
            ],
            hours: split(hours, { learn: 0.2, practice: 0.6, review: 0.2 }),
            chapters: g.map((c) => c.name)
          });
        });
      }
      for (let i = 0; i < reviewWeeks; i++) {
        addWeek({
          title: "Mixed review of wrong answers" + (reviewWeeks > 1 ? " (" + (i + 1) + " of " + reviewWeeks + ")" : ""),
          phase: "review",
          goals: [
            "Redo questions you previously missed, mixed across all chapters.",
            "Space your reviews: revisit weak topics after 1, 3 and 7 days."
          ],
          hours: split(hours, { practice: 0.4, review: 0.6 }),
          chapters: chapters.map((c) => c.name)
        });
      }
    }
    addWeek({
      title: W === 2 ? "Timed simulations and final review" : "Mixed review and first timed simulation",
      phase: "simulation",
      goals: W === 2
        ? [
            "Take 2 timed exam-mode simulations (" + examMinutes + " min each), on different days.",
            "Review every wrong answer after each simulation."
          ]
        : [
            "Take timed exam-mode simulation 1 (" + examMinutes + " min) under real conditions.",
            "Review every wrong answer and drill the weakest chapters in practice mode."
          ],
      hours: W === 2
        ? { exam: round(Math.min(examH * 2, hours * 0.6)), review: round(hours * 0.4) }
        : { exam: examH, review: round(hours * 0.45), practice: round(hours * 0.25) },
      chapters: chapters.map((c) => c.name),
      sims: W === 2 ? 2 : 1
    });
    if (W > 2) {
      addWeek({
        title: "Second simulation, light review and rest",
        phase: "final",
        goals: [
          "Take timed exam-mode simulation 2 (" + examMinutes + " min) early in the week.",
          "Light review of notes and remaining wrong answers only; no new material.",
          "Day before the exam: rest, check logistics, and sleep well."
        ],
        hours: { exam: examH, review: round(hours * 0.3) },
        chapters: chapters.map((c) => c.name),
        sims: 1
      });
    }
    return plan;
  }

  const api = { buildPlan, INPUT_KEY, CHECK_KEY, WEEKDAYS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.QAQuestPlanner = api;

  if (typeof document === "undefined") return;

  // ---------- Browser UI ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => QAQuest.escapeHTML(String(s));
  let modules = [];
  const chapterCache = {};

  function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ }
  }

  async function getChapters(mod) {
    if (!chapterCache[mod.id]) {
      const data = await QAQuest.fetchJSON(mod.questionFile);
      const counts = new Map();
      data.questions.forEach((q) => counts.set(q.chapter, (counts.get(q.chapter) || 0) + 1));
      chapterCache[mod.id] = Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
    }
    return chapterCache[mod.id];
  }

  function readForm() {
    return {
      moduleId: $("pl-module").value,
      mode: document.querySelector('input[name="pl-when"]:checked').value,
      examDate: $("pl-date").value,
      weeks: $("pl-weeks").value,
      hoursPerWeek: $("pl-hours").value,
      level: $("pl-level").value,
      daysOff: Array.from(document.querySelectorAll('input[name="pl-off"]:checked')).map((i) => Number(i.value))
    };
  }

  function writeForm(v) {
    if (v.moduleId && modules.some((m) => m.id === v.moduleId)) $("pl-module").value = v.moduleId;
    const mode = v.mode === "weeks" ? "weeks" : "date";
    document.querySelector('input[name="pl-when"][value="' + mode + '"]').checked = true;
    if (v.examDate) $("pl-date").value = v.examDate;
    if (v.weeks) $("pl-weeks").value = v.weeks;
    if (v.hoursPerWeek) $("pl-hours").value = v.hoursPerWeek;
    if (["beginner", "some", "experienced"].includes(v.level)) $("pl-level").value = v.level;
    document.querySelectorAll('input[name="pl-off"]').forEach((i) => {
      i.checked = (v.daysOff || []).includes(Number(i.value));
    });
    syncWhen();
  }

  function syncWhen() {
    const byDate = document.querySelector('input[name="pl-when"]:checked').value === "date";
    $("pl-date-row").hidden = !byDate;
    $("pl-weeks-row").hidden = byDate;
  }

  function hoursText(h) {
    const labels = { learn: "learn", practice: "practice", review: "review", exam: "timed exam" };
    return "<ul>" + Object.keys(h).map((k) => "<li>" + esc(h[k] + " h " + labels[k]) + "</li>").join("") + "</ul>";
  }

  function goalHtml(g) {
    if (typeof g === "string") return "<li>" + esc(g) + "</li>";
    return "<li>" + esc(g.text) + "<ul>" + g.items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul></li>";
  }

  function render(plan, form) {
    const out = $("pl-result");
    const msg = $("pl-message");
    if (!plan.ok) {
      out.innerHTML = "";
      msg.className = "disclaimer";
      msg.textContent = plan.message;
      return;
    }
    msg.className = "";
    msg.textContent = "";
    const key = [form.moduleId, form.mode === "date" ? form.examDate : form.weeks + "w", form.hoursPerWeek].join("|");
    const checks = load(CHECK_KEY);
    const done = checks[key] || {};
    const when = plan.examDate ? plan.daysLeft + " days until " + plan.examDate : plan.weekCount + " weeks";
    const modeLabel = { crash: "Crash plan", short: "Short plan", standard: "Standard plan", long: "Long-runway plan" }[plan.mode];
    let html = '<h2 class="section-title">' + esc(modeLabel) + " for " + esc(plan.module.name) + "</h2>";
    html += '<ul class="plan-summary"><li>' + esc(when) + "</li><li>About " + plan.totalHours + " study hours in total</li><li>" + plan.studyDays +
      " study day" + (plan.studyDays === 1 ? "" : "s") + " per week</li><li>About " + plan.sessionMinutes + " minutes per session</li></ul>";
    plan.notes.forEach((n) => { html += '<div class="disclaimer">' + esc(n) + "</div>"; });
    plan.weeks.forEach((w) => {
      const id = "pl-w" + w.index;
      html += '<section class="module-card plan-week"><h3><label for="' + id + '"><input type="checkbox" id="' + id +
        '" data-week="' + w.index + '"' + (done[w.index] ? " checked" : "") + "> " +
        (plan.mode === "crash" ? "" : "Week " + w.index + (w.start ? " (from " + esc(w.start) + ")" : "") + ": ") + esc(w.title) +
        "</label></h3><ul>" + w.goals.map(goalHtml).join("") + "</ul>" +
        '<p class="plan-label">Suggested hours</p>' + hoursText(w.hours) + '<p class="plan-links">' +
        w.links.map((l) => '<a class="btn btn-secondary" href="' + esc(l.href) + '">' + esc(l.label) + "</a>").join(" ") + "</p></section>";
    });
    html += '<section class="module-card"><h3>Daily session template</h3><p>About ' + plan.sessionMinutes +
      " minutes per study day; repeat the block " + plan.sessionCycles + " time" + (plan.sessionCycles === 1 ? "" : "s") +
      " if you have the time:</p><ol><li>25 min learn (read or watch one topic)</li><li>5 min break</li><li>25 min practice questions</li><li>5 min break</li><li>10 min review wrong answers</li></ol></section>";
    out.innerHTML = html;
    out.querySelectorAll("input[data-week]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const all = load(CHECK_KEY);
        all[key] = all[key] || {};
        if (cb.checked) all[key][cb.dataset.week] = true; else delete all[key][cb.dataset.week];
        save(CHECK_KEY, all);
      });
    });
    $("pl-print").hidden = false;
  }

  async function generate(ev) {
    if (ev) ev.preventDefault();
    const form = readForm();
    save(INPUT_KEY, form);
    const mod = modules.find((m) => m.id === form.moduleId);
    if (!mod) return;
    let chapters = [];
    try { chapters = await getChapters(mod); } catch (e) { /* reported by buildPlan */ }
    const plan = buildPlan({
      moduleId: mod.id,
      moduleName: mod.name,
      examDurationMinutes: mod.examDurationMinutes,
      chapters,
      examDate: form.mode === "date" ? form.examDate : "",
      weeks: form.mode === "weeks" ? form.weeks : "",
      hoursPerWeek: form.hoursPerWeek,
      level: form.level,
      daysOff: form.daysOff,
      today: todayISO()
    });
    if (form.mode === "date" && !form.examDate) {
      plan.ok = false;
      plan.message = "Please choose an exam date, or switch to a number of weeks.";
    }
    render(plan, form);
    if (plan.ok) $("pl-message").focus();
  }

  async function init() {
    $("pl-date").min = todayISO();
    document.querySelectorAll('input[name="pl-when"]').forEach((r) => r.addEventListener("change", syncWhen));
    $("pl-form").addEventListener("submit", generate);
    $("pl-print").addEventListener("click", () => window.print());
    try {
      modules = (await QAQuest.fetchJSON("data/modules.json")).modules.filter((m) => m.status === "available");
    } catch (e) {
      $("pl-message").className = "disclaimer";
      $("pl-message").textContent = "Could not load module data. Please reload the page.";
      return;
    }
    $("pl-module").innerHTML = modules.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.name) + "</option>").join("");
    const stored = load(INPUT_KEY);
    const q = {
      moduleId: QAQuest.qs("module"),
      weeks: QAQuest.qs("weeks"),
      hoursPerWeek: QAQuest.qs("hours"),
      level: QAQuest.qs("level"),
      examDate: QAQuest.qs("date")
    };
    const fromQuery = Object.keys(q).some((k) => q[k]);
    if (fromQuery) {
      const v = Object.assign({}, stored);
      Object.keys(q).forEach((k) => { if (q[k]) v[k] = q[k]; });
      v.mode = q.examDate ? "date" : q.weeks ? "weeks" : v.mode;
      writeForm(v);
      generate();
    } else if (stored.moduleId) {
      writeForm(stored);
      generate();
    } else {
      syncWhen();
    }
  }
  init();
})(typeof window !== "undefined" ? window : globalThis);
