/**
 * QAQEST study planner. The pure planning logic (buildPlan) has no DOM
 * dependencies so it can be exercised from node; the UI wiring below only
 * runs in a browser.
 */
(function (root) {
  const INPUT_KEY = "qaquest_planner_inputs_v1";
  const CHECK_KEY = "qaquest_planner_checks_v1";
  const DAY_MS = 86400000;
  const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

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
      return { ok: false, error: "hours", message: "Introduce un número de horas de estudio por semana superior a 0." };
    }
    const chapters = (o.chapters || []).filter((c) => c && c.count > 0);
    if (!chapters.length) {
      return { ok: false, error: "chapters", message: "No se pudieron cargar los datos de los capítulos de este módulo." };
    }
    const daysOff = Array.from(new Set((o.daysOff || []).map(Number))).filter((d) => d >= 0 && d <= 6);
    const studyDays = 7 - daysOff.length;
    if (studyDays < 1) {
      return { ok: false, error: "daysoff", message: "Necesitas al menos un día de estudio por semana." };
    }
    const level = ["beginner", "some", "experienced"].includes(o.level) ? o.level : "some";
    const today = parseDate(o.today) ;
    if (today === null) return { ok: false, error: "today", message: "Falta la fecha de hoy." };

    let daysLeft;
    let weeksN;
    let examDate = null;
    if (o.examDate) {
      examDate = parseDate(o.examDate);
      if (examDate === null) {
        return { ok: false, error: "date", message: "La fecha del examen no es válida." };
      }
      daysLeft = Math.round((examDate - today) / DAY_MS);
      if (daysLeft <= 0) {
        return {
          ok: false,
          error: "past",
          message: daysLeft === 0
            ? "El examen es hoy, así que ya no queda tiempo para planificar. Repasa ligeramente, descansa y ¡mucha suerte! Puedes elegir una fecha posterior para crear un plan completo."
            : "La fecha del examen ya pasó. Elige una fecha futura (o un número de semanas) para crear un plan."
        };
      }
      weeksN = Math.ceil(daysLeft / 7);
    } else {
      weeksN = Math.floor(Number(o.weeks));
      if (!Number.isFinite(weeksN) || weeksN < 1 || weeksN > 52) {
        return { ok: false, error: "weeks", message: "Introduce la fecha del examen o un número de semanas entre 1 y 52." };
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
        "Dispones de unas " + plan.totalHours + " horas de estudio, menos de las aproximadamente " + recommended +
        " horas que suelen ser útiles para este módulo, por lo que el plan se ha comprimido. Da prioridad a los capítulos con más preguntas y considera estudiar más horas por semana o elegir una fecha posterior."
      );
    }
    if (plan.mode === "crash") {
      plan.compressed = true;
      plan.notes.push("Quedan menos de dos semanas: este es un plan intensivo centrado en las actividades prioritarias.");
    }

    const weekStart = (i) => today + i * 7 * DAY_MS;
    const addWeek = (w) => {
      w.index = plan.weeks.length + 1;
      if (examIn && examDate !== null) {
        w.start = fmtDate(weekStart(plan.weeks.length));
      }
      w.links = [{ label: "Practicar " + mod.name, href: link }];
      plan.weeks.push(w);
    };

    if (plan.mode === "crash") {
      const d = Math.min(daysLeft, 7);
      const days = [];
      const sims = d >= 3 ? 1 : 1;
      const contentDays = Math.max(1, d - (d >= 3 ? 2 : 1));
      const groups = partition(chapters, Math.min(contentDays, chapters.length));
      groups.forEach((g, i) => {
        days.push({ text: "Día " + (i + 1) + ": repasa y practica en modo práctica (anota cada respuesta incorrecta):", items: names(g) });
      });
      if (d >= 3) days.push("Día " + (days.length + 1) + ": revisa todas las respuestas incorrectas y haz una simulación cronometrada en modo examen (" + examMinutes + " min).");
      else days.push("Día " + (days.length + 1) + ": haz una simulación cronometrada (" + examMinutes + " min) y después revisa las respuestas incorrectas.");
      if (d >= 2) days.push("Último día: repasa ligeramente los apuntes y solo las respuestas incorrectas. Prepara lo necesario y duerme bien.");
      addWeek({
        title: o.examDate ? "Plan intensivo: " + daysLeft + " día" + (daysLeft === 1 ? "" : "s") + " restantes" : "Plan intensivo: 1 semana",
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
        title: "Aprende y practica todos los capítulos (plan comprimido)",
        phase: "learn",
        goals: [
          { text: "Repasa los capítulos del temario en orden y practica cada uno en modo práctica:", items: names(chapters) },
          "Dedica más tiempo a los capítulos con más preguntas."
        ],
        hours: split(hours, { learn: 0.4, practice: 0.5, review: 0.1 }),
        chapters: chapters.map((c) => c.name)
      });
      plan.compressed = true;
      plan.notes.push("Con unas dos semanas, el aprendizaje y la práctica se combinan en la primera semana.");
    } else {
      partition(chapters, learnWeeks).forEach((g, i, arr) => {
        addWeek({
          title: "Estudia el temario (" + (i + 1) + " de " + arr.length + ")",
          phase: "learn",
          goals: [
            { text: "Estudia estos capítulos:", items: names(g) },
            "Toma notas breves de los términos y definiciones clave.",
            "Termina con algunas preguntas de práctica de cada capítulo."
          ],
          hours: split(hours, { learn: 0.65, practice: 0.35 }),
          chapters: g.map((c) => c.name)
        });
      });
      if (practiceWeeks) {
        partition(chapters, practiceWeeks).forEach((g, i, arr) => {
          addWeek({
            title: "Práctica de preguntas (" + (i + 1) + " de " + arr.length + ")",
            phase: "practice",
            goals: [
              { text: "Practica todas las preguntas de:", items: names(g) },
              "Lee todas las explicaciones, incluso las de las respuestas correctas.",
              "Vuelve a leer las secciones del temario correspondientes a los capítulos con menos del 70 % de aciertos."
            ],
            hours: split(hours, { learn: 0.2, practice: 0.6, review: 0.2 }),
            chapters: g.map((c) => c.name)
          });
        });
      }
      for (let i = 0; i < reviewWeeks; i++) {
        addWeek({
          title: "Repaso combinado de respuestas incorrectas" + (reviewWeeks > 1 ? " (" + (i + 1) + " de " + reviewWeeks + ")" : ""),
          phase: "review",
          goals: [
            "Vuelve a responder las preguntas que fallaste, combinando todos los capítulos.",
            "Espacia los repasos: vuelve a los temas difíciles al cabo de 1, 3 y 7 días."
          ],
          hours: split(hours, { practice: 0.4, review: 0.6 }),
          chapters: chapters.map((c) => c.name)
        });
      }
    }
    addWeek({
      title: W === 2 ? "Simulaciones cronometradas y repaso final" : "Repaso combinado y primera simulación cronometrada",
      phase: "simulation",
      goals: W === 2
        ? [
            "Haz 2 simulaciones cronometradas en modo examen (" + examMinutes + " min cada una), en días distintos.",
            "Revisa cada respuesta incorrecta después de cada simulación."
          ]
        : [
            "Haz la simulación cronometrada 1 en modo examen (" + examMinutes + " min) en condiciones similares a las del examen.",
            "Revisa todas las respuestas incorrectas y practica los capítulos más difíciles en modo práctica."
          ],
      hours: W === 2
        ? { exam: round(Math.min(examH * 2, hours * 0.6)), review: round(hours * 0.4) }
        : { exam: examH, review: round(hours * 0.45), practice: round(hours * 0.25) },
      chapters: chapters.map((c) => c.name),
      sims: W === 2 ? 2 : 1
    });
    if (W > 2) {
      addWeek({
        title: "Segunda simulación, repaso ligero y descanso",
        phase: "final",
        goals: [
          "Haz la simulación cronometrada 2 en modo examen (" + examMinutes + " min) al principio de la semana.",
          "Repasa ligeramente los apuntes y las respuestas incorrectas restantes; no estudies contenido nuevo.",
          "El día antes del examen: descansa, prepara lo necesario y duerme bien."
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
  function formatPlanDate(value) {
    const d = new Date(value + "T00:00:00Z");
    return d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
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
    const labels = { learn: "aprendizaje", practice: "práctica", review: "repaso", exam: "examen cronometrado" };
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
    const when = plan.examDate ? plan.daysLeft + " días hasta el " + formatPlanDate(plan.examDate) : plan.weekCount + " semanas";
    const modeLabel = { crash: "Plan intensivo", short: "Plan breve", standard: "Plan estándar", long: "Plan a largo plazo" }[plan.mode];
    let html = '<h2 class="section-title">' + esc(modeLabel) + " para " + esc(plan.module.name) + "</h2>";
    html += '<ul class="plan-summary"><li>' + esc(when) + "</li><li>Unas " + plan.totalHours + " horas de estudio en total</li><li>" + plan.studyDays +
      " día" + (plan.studyDays === 1 ? "" : "s") + " de estudio por semana</li><li>Unos " + plan.sessionMinutes + " minutos por sesión</li></ul>";
    html += '<div class="disclaimer">La práctica en español no es oficial. Las duraciones y formatos son orientativos; consulta al proveedor oficial para las reglas vigentes.</div>';
    plan.notes.forEach((n) => { html += '<div class="disclaimer">' + esc(n) + "</div>"; });
    plan.weeks.forEach((w) => {
      const id = "pl-w" + w.index;
      html += '<section class="module-card plan-week"><h3><label for="' + id + '"><input type="checkbox" id="' + id +
        '" data-week="' + w.index + '"' + (done[w.index] ? " checked" : "") + "> " +
        (plan.mode === "crash" ? "" : "Semana " + w.index + (w.start ? " (desde " + esc(formatPlanDate(w.start)) + ")" : "") + ": ") + esc(w.title) +
        "</label></h3><ul>" + w.goals.map(goalHtml).join("") + "</ul>" +
        '<p class="plan-label">Horas sugeridas</p>' + hoursText(w.hours) + '<p class="plan-links">' +
        w.links.map((l) => '<a class="btn btn-secondary" href="' + esc(l.href) + '">' + esc(l.label) + "</a>").join(" ") + "</p></section>";
    });
    html += '<section class="module-card"><h3>Modelo de sesión diaria</h3><p>Unos ' + plan.sessionMinutes +
      " minutos por día de estudio; repite el bloque " + plan.sessionCycles + " vez" + (plan.sessionCycles === 1 ? "" : "ces") +
      " si tienes tiempo:</p><ol><li>25 min de estudio (lee o mira un tema)</li><li>5 min de descanso</li><li>25 min para practicar preguntas</li><li>5 min de descanso</li><li>10 min para repasar respuestas incorrectas</li></ol></section>";
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
      plan.message = "Elige la fecha del examen o cambia a un número de semanas.";
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
      $("pl-message").textContent = "No se pudieron cargar los datos de los módulos. Vuelve a cargar la página.";
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
