/**
 * Home page: fetches module metadata and renders a card per module,
 * showing status, best score (from localStorage), and links to start.
 */
(async function () {
  const grid = document.getElementById("module-grid");

  function renderCard(mod) {
    const best = QAQuest.getBestScore(mod.id);
    const attempts = QAQuest.getModuleAttempts(mod.id);
    const isDisponible = mod.status === "available";
    const badge = isDisponible
      ? '<span class="badge badge--available">Disponible</span>'
      : '<span class="badge badge--soon">Próximamente</span>';

    const progressLine = attempts.length
      ? `<div class="module-progress">Mejor puntuación: <strong>${Math.round(
          best
        )}%</strong> &middot; ${attempts.length} intento${
          attempts.length === 1 ? "" : "s"
        }</div>`
      : `<div class="module-progress">Aún sin intentos</div>`;

    const actions = isDisponible
      ? `<div class="module-actions">
           <a class="btn" href="module.html?module=${mod.id}">Ver módulo</a>
         </div>`
      : `<div class="module-actions">
           <button class="btn disabled" disabled>Banco de preguntas en preparación</button>
         </div>`;

    return `
      <article class="module-card">
        <span class="module-level">${QAQuest.escapeHTML(mod.level)}</span>
        <h3>${QAQuest.escapeHTML(mod.shortName)}</h3>
        ${badge}
        <p class="module-desc">${QAQuest.escapeHTML(mod.description)}</p>
        ${progressLine}
        ${actions}
      </article>
    `;
  }

  try {
    const data = await QAQuest.fetchJSON("data/modules.json");
    grid.innerHTML = data.modules.map(renderCard).join("");
    if (QAQuest.Badges) {
      try { QAQuest.Badges.update(); } catch (e) { /* optional */ }
      const panel = document.createElement("div");
      panel.innerHTML = QAQuest.Badges.panelHtml();
      grid.insertAdjacentElement("beforebegin", panel);
    }
    const tools = document.createElement("div");
    tools.innerHTML = QAQuest.progressToolsHtml();
    grid.insertAdjacentElement("afterend", tools);
    QAQuest.bindProgressTools(tools);
  } catch (e) {
    grid.innerHTML = `<p class="empty-state">No se pudieron cargar los módulos. Actualiza la página.</p>`;
    console.error(e);
  }
})();
