/**
 * Module detail page: shows module info, practice/exam mode selection,
 * and attempt history for this module from localStorage.
 */
(async function () {
  const main = document.getElementById("module-main");
  const moduleId = QAQuest.qs("module");

  function renderHistory(attempts) {
    if (!attempts.length) {
      return `<p class="empty-state">Aún no hay intentos. Inicia una sesión de práctica o de examen arriba para ver aquí tu historial.</p>`;
    }
    const rows = attempts
      .slice()
      .reverse()
      .map((a, idx) => {
        const passClass = a.passed ? "pass-pill" : "fail-pill";
        const passLabel = a.passed ? "Aprobado" : "No aprobado";
        return `
          <tr>
            <td>${attempts.length - idx}</td>
            <td>${QAQuest.formatDate(a.date)}</td>
            <td>${a.mode === "exam" ? "Examen" : "Práctica"}</td>
            <td>${a.score}/${a.total}</td>
            <td>${Math.round(a.percentage)}%</td>
            <td class="${passClass}">${passLabel}</td>
            <td>${QAQuest.formatDuration(a.durationSec)}</td>
          </tr>
        `;
      })
      .join("");
    return `
      <table class="history-table">
        <thead>
          <tr>
            <th>#</th><th>Fecha</th><th>Modo</th><th>Puntuación</th><th>%</th><th>Resultado</th><th>Tiempo</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  try {
    const data = await QAQuest.fetchJSON("data/modules.json");
    const mod = data.modules.find((m) => m.id === moduleId);
    if (!mod) {
      main.innerHTML = `<p class="empty-state">Módulo no encontrado. <a href="index.html">Volver a los módulos</a>.</p>`;
      return;
    }
    document.title = `${mod.shortName} — QAQEST`;

    let questionCount = 0;
    try {
      const qData = await QAQuest.fetchJSON(mod.questionFile);
      questionCount = qData.questions.length;
    } catch (e) {
      console.warn("Could not load question count", e);
    }

    const attempts = QAQuest.getModuleAttempts(mod.id);
    const isAvailable = mod.status === "available";
    const enoughForExam = questionCount >= mod.examQuestionCount;

    const examDisabled = !isAvailable || !enoughForExam;
    const practiceDisabled = !isAvailable || questionCount === 0;

    main.innerHTML = `
      <div class="module-header">
        <span class="module-level">${QAQuest.escapeHTML(mod.level)}</span>
        <h1>${QAQuest.escapeHTML(mod.name)}</h1>
        <p>${QAQuest.escapeHTML(mod.description)}</p>
        <p style="color: var(--color-muted); font-size: 0.85rem;">
          Alineado con: ${QAQuest.escapeHTML(mod.syllabusRef)} &middot;
          ${questionCount} pregunta${questionCount === 1 ? "" : "s"} disponible${questionCount === 1 ? "" : "s"}
          ${!isAvailable ? " &middot; <strong>Banco de preguntas en preparación</strong>" : ""}
        </p>
      </div>

      <div class="mode-cards">
        <div class="mode-card">
          <h3>Modo práctica</h3>
          <ul>
            <li>Sin límite de tiempo</li>
            <li>Retroalimentación inmediata tras cada pregunta</li>
            <li>Consulta la explicación al instante</li>
          </ul>
          <a class="btn btn-block ${practiceDisabled ? "disabled" : ""}"
             ${practiceDisabled ? "" : `href="quiz.html?module=${mod.id}&mode=practice"`}>
            Iniciar práctica
          </a>
        </div>
        <div class="mode-card">
          <h3>Modo examen</h3>
          <ul>
            <li>${mod.examQuestionCount} preguntas, ${mod.examDurationMinutes} minutos (simulacro; consulta al proveedor oficial para las reglas vigentes)</li>
            <li>Nota de aprobado: ${mod.passPercentage}%</li>
            <li>Retroalimentación solo al final</li>
          </ul>
          <a class="btn btn-block ${examDisabled ? "disabled" : ""}"
             ${examDisabled ? "" : `href="quiz.html?module=${mod.id}&mode=exam"`}>
            Iniciar examen cronometrado
          </a>
          ${
            isAvailable && !enoughForExam
              ? `<p style="font-size:0.8rem;color:var(--color-muted);margin-top:0.5rem;">El modo examen se activa cuando haya ${mod.examQuestionCount} preguntas disponibles (actualmente ${questionCount}).</p>`
              : ""
          }
        </div>
      </div>

      <h2 class="section-title">Tu historial de intentos</h2>
      ${QAQuest.progressToolsHtml()}
      ${renderHistory(attempts)}

      <p style="margin-top:1.5rem;"><a href="index.html">&larr; Volver a todos los módulos</a></p>
    `;
    QAQuest.bindProgressTools(main);
  } catch (e) {
    main.innerHTML = `<p class="empty-state">No se pudo cargar este módulo. Actualiza la página.</p>`;
    console.error(e);
  }
})();
