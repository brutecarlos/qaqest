/**
 * Home page: fetches module metadata and renders a card per module,
 * showing status, best score (from localStorage), and links to start.
 */
(async function () {
  const grid = document.getElementById("module-grid");

  function renderCard(mod) {
    const best = QAQuest.getBestScore(mod.id);
    const attempts = QAQuest.getModuleAttempts(mod.id);
    const isAvailable = mod.status === "available";
    const badge = isAvailable
      ? '<span class="badge badge--available">Available</span>'
      : '<span class="badge badge--soon">Coming soon</span>';

    const progressLine = attempts.length
      ? `<div class="module-progress">Best score: <strong>${Math.round(
          best
        )}%</strong> &middot; ${attempts.length} attempt${
          attempts.length === 1 ? "" : "s"
        }</div>`
      : `<div class="module-progress">No attempts yet</div>`;

    const actions = isAvailable
      ? `<div class="module-actions">
           <a class="btn" href="module.html?module=${mod.id}">View module</a>
         </div>`
      : `<div class="module-actions">
           <button class="btn disabled" disabled>Question bank in progress</button>
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
  } catch (e) {
    grid.innerHTML = `<p class="empty-state">Could not load modules. Please refresh the page.</p>`;
    console.error(e);
  }
})();
