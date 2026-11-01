/** "Start here" questionnaire: recommends a module path and a first-week plan. */
(function () {
  const KEY = "qaquest_start_answers_v1";
  const MODS = {
    "ctfl": ["CTFL (nivel Foundation)", "el punto de partida habitual: vocabulario común y conceptos básicos de pruebas; normalmente es un requisito para los niveles avanzados."],
    "agile-tester": ["Tester ágil (Agile Tester)", "aborda las pruebas en equipos ágiles; puede encajarte si trabajas con métodos como Scrum."],
    "al-ta": ["Analista de pruebas avanzado (Advanced Test Analyst)", "amplía las habilidades de diseño y análisis de pruebas para quienes trabajan directamente en pruebas."],
    "al-tta": ["Analista técnico de pruebas avanzado (Advanced Technical Test Analyst)", "se centra en técnicas de caja blanca y características técnicas de calidad."],
    "al-tm": ["Gestor de pruebas avanzado (Advanced Test Manager)", "aborda la planificación, la estimación, el seguimiento y la dirección de equipos de pruebas."],
    "test-automation": ["Automatización de pruebas (Test Automation)", "aborda la arquitectura de automatización, su implementación y la elaboración de informes; es una especialización para avanzar hacia puestos de automatización."],
    "performance-testing": ["Pruebas de rendimiento (Performance Testing)", "aborda riesgos, métricas, actividades y herramientas de rendimiento; es un tema de especialización."]
  };
  const QUESTIONS = [
    { id: "exp", text: "¿Cuánta experiencia tienes en pruebas de software?", options: [["none", "Ninguna todavía"], ["lt1", "Menos de 1 año"], ["1-3", "De 1 a 3 años"], ["3+", "Más de 3 años"]] },
    { id: "goal", text: "¿Cuál es tu objetivo principal?", options: [["job", "Conseguir mi primer empleo en control de calidad"], ["career", "Obtener una certificación para mi carrera"], ["automation", "Especializarme en automatización de pruebas"], ["management", "Especializarme en gestión de pruebas"], ["agile", "Trabajar eficazmente en un equipo ágil"], ["performance", "Especializarme en pruebas de rendimiento"]] },
    { id: "cert", text: "¿Qué certificaciones tienes actualmente?", options: [["none", "Ninguna"], ["ctfl", "CTFL"], ["agile", "CTFL + Agile Tester"], ["advanced", "Un nivel Advanced o superior"]] },
    { id: "hours", text: "¿Cuántas horas por semana puedes estudiar?", options: [["2", "De 1 a 3 horas"], ["5", "De 4 a 6 horas"], ["9", "De 7 a 10 horas"], ["12", "Más de 10 horas"]] },
    { id: "exam", text: "¿Sabes cuándo será tu examen?", options: [["none", "Todavía no"], ["lt1", "Dentro de 1 mes"], ["1-3", "Dentro de 1 a 3 meses"], ["3+", "Dentro de más de 3 meses"]] }
  ];
  const root = document.getElementById("start-quiz");
  const result = document.getElementById("start-result");
  if (!root || !result) return;

  const esc = (s) => QAQuest.escapeHTML(String(s));
  let answers = {};
  let step = 0;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch (e) { /* storage unavailable */ }
  }

  function recommend(a) {
    const g = a.goal;
    let primary;
    let next = [];
    if (a.cert === "none") {
      primary = "ctfl";
      next = [g === "automation" ? "test-automation" : g === "performance" ? "performance-testing" : g === "management" ? "al-tm" : "agile-tester"];
      next.push(next[0] === "agile-tester" ? "al-ta" : "agile-tester");
    } else if (a.cert === "ctfl") {
      const byGoal = { job: "agile-tester", career: "agile-tester", agile: "agile-tester", automation: "test-automation", management: "al-tm", performance: "performance-testing" };
      primary = byGoal[g];
      next = ["al-ta", "test-automation", "al-tm"].filter((m) => m !== primary).slice(0, 2);
    } else if (a.cert === "agile") {
      const byGoal = { job: "al-ta", career: "al-ta", agile: "al-ta", automation: "test-automation", management: "al-tm", performance: "performance-testing" };
      primary = byGoal[g];
      next = ["al-ta", "al-tta", "al-tm"].filter((m) => m !== primary).slice(0, 2);
    } else {
      const byGoal = { job: "al-ta", career: a.exp === "3+" ? "al-tm" : "al-ta", agile: "al-ta", automation: "test-automation", management: "al-tm", performance: "performance-testing" };
      primary = byGoal[g];
      next = ["al-tta", "al-tm", "test-automation"].filter((m) => m !== primary).slice(0, 2);
    }
    return { primary, next };
  }

  function actions(primary, a) {
    const m = "module.html?module=" + primary;
    if (primary === "ctfl") {
      const list = [
        '<a href="guide-fundamentals.html">Lee la guía de fundamentos</a> y anota los términos que no conozcas.',
        '<a href="guide-sdlc.html">Lee la guía del ciclo de vida del desarrollo de software (SDLC)</a> y practica después los capítulos 1 y 2 en <a href="' + m + '">modo práctica</a>.',
        "Lee todas las explicaciones, incluso las de las respuestas correctas.",
        'Reserva tres sesiones de estudio breves y organízalas con el <a href="planner.html">planificador de estudio</a>.'
      ];
      if (a.exp === "3+") list[0] = 'Repasa las <a href="guides.html">guías</a> para detectar lagunas; tu experiencia quizá ya cubra buena parte del contenido.';
      return list;
    }
    return [
      "Descarga el temario oficial vigente de este módulo y repasa los títulos de sus capítulos.",
      '<a href="' + m + '">Abre el modo práctica</a> e intenta el primer capítulo sin límite de tiempo.',
      "Anota cada respuesta incorrecta y el motivo del error.",
      'Distribuye el estudio con el <a href="planner.html">planificador de estudio</a> en las semanas disponibles.'
    ];
  }

  function planUrl(primary, a) {
    const p = new URLSearchParams({ module: primary, hours: a.hours, level: a.exp === "none" || a.exp === "lt1" ? "beginner" : a.exp === "3+" ? "experienced" : "some" });
    const weeks = { lt1: 3, "1-3": 8, "3+": 16, none: 8 }[a.exam];
    p.set("weeks", weeks);
    return "planner.html?" + p.toString();
  }

  function showResult(a, focus) {
    const r = recommend(a);
    const name = (id) => MODS[id][0];
    let html = '<h3>Tu itinerario recomendado</h3><p><strong>Empieza por: <a href="module.html?module=' + r.primary + '">' + esc(name(r.primary)) +
      "</a></strong></p><p><strong>Por qué:</strong></p><ul><li>" + esc(name(r.primary)) + " " + esc(MODS[r.primary][1]) + "</li></ul>";
    html += "<p class=\"disclaimer\">La práctica en español no es oficial. Consulta al proveedor oficial para las reglas vigentes.</p>";
    html += "<p><strong>Después, considera:</strong></p><ul>" + r.next.map((id) =>
      '<li><a href="module.html?module=' + id + '">' + esc(name(id)) + "</a><ul><li>" + esc(MODS[id][1]) + "</li></ul></li>").join("") + "</ul>";
    if (a.exam === "lt1" && Number(a.hours) <= 5) {
      html += '<div class="disclaimer">El examen está cerca y dispones de poco tiempo semanal. El planificador ajustará el calendario; si es posible, estudia más horas o elige una fecha posterior.</div>';
    }
    if (r.primary !== "ctfl" && a.cert === "ctfl" && ["al-ta", "al-tta", "al-tm"].includes(r.primary) === false) {
      html += "<p>Los requisitos previos de los módulos especializados y Advanced pueden variar. Consulta al proveedor oficial para las reglas vigentes.</p>";
    } else if (["al-ta", "al-tta", "al-tm"].includes(r.primary)) {
      html += "<p>Los niveles Advanced suelen requerir CTFL y pueden exigir experiencia laboral. Consulta al proveedor oficial para las reglas vigentes.</p>";
    }
    html += "<p><strong>Tu primera semana:</strong></p><ol>" + actions(r.primary, a).map((x) => "<li>" + x + "</li>").join("") + "</ol>";
    html += '<div class="start-actions"><a class="btn btn-primary" href="' + planUrl(r.primary, a) + '">Planificar mi tiempo de estudio</a>' +
      '<button type="button" class="btn btn-secondary" id="start-restart">Volver a responder el cuestionario</button></div>';
    result.innerHTML = html;
    root.innerHTML = "";
    document.getElementById("start-restart").addEventListener("click", () => { answers = {}; step = 0; result.innerHTML = ""; renderQuestion(true); });
    if (focus) result.focus();
  }

  function renderQuestion(focus) {
    const q = QUESTIONS[step];
    const cur = answers[q.id];
    root.innerHTML = '<form class="start-q" novalidate><p class="start-progress">Pregunta ' + (step + 1) + " de " + QUESTIONS.length +
      '</p><fieldset><legend><strong>' + esc(q.text) + "</strong></legend>" +
      q.options.map((o, i) => '<label><input type="radio" name="' + q.id + '" value="' + o[0] + '"' + (cur === o[0] ? " checked" : "") + (i === 0 && !cur ? " required" : "") + "> " + esc(o[1]) + "</label>").join("") +
      '</fieldset><p id="start-err" class="start-progress" role="alert"></p><div class="start-actions">' +
      (step > 0 ? '<button type="button" class="btn btn-secondary" id="start-back">Anterior</button>' : "") +
      '<button type="submit" class="btn btn-primary">' + (step === QUESTIONS.length - 1 ? "Ver mi itinerario" : "Siguiente") + "</button></div></form>";
    const form = root.querySelector("form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const sel = form.querySelector("input:checked");
      if (!sel) { document.getElementById("start-err").textContent = "Elige una respuesta para continuar."; return; }
      answers[q.id] = sel.value;
      if (step < QUESTIONS.length - 1) { step++; renderQuestion(true); } else { save(); showResult(answers, true); }
    });
    const back = document.getElementById("start-back");
    if (back) back.addEventListener("click", () => {
      const sel = form.querySelector("input:checked");
      if (sel) answers[q.id] = sel.value;
      step--; renderQuestion(true);
    });
    if (focus) form.querySelector("legend").parentElement.querySelector("input").focus();
  }

  const saved = load();
  if (saved && QUESTIONS.every((q) => q.options.some((o) => o[0] === saved[q.id]))) {
    answers = saved;
    showResult(saved, false);
  } else {
    renderQuestion(false);
  }
})();
