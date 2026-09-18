/**
 * Module detail page: shows module info, practice/exam mode selection,
 * and attempt history for this module from localStorage.
 */
(async function () {
  const main = document.getElementById("module-main");
  const moduleId = QAQuest.qs("module");

  function renderHistory(attempts) {
    if (!attempts.length) {
      return `<p class="empty-state">No attempts yet. Start a practice or exam session above to see your history here.</p>`;
    }
    const rows = attempts
      .slice()
      .reverse()
      .map((a, idx) => {
        const passClass = a.passed ? "pass-pill" : "fail-pill";
        const passLabel = a.passed ? "Pass" : "Fail";
        return `
          <tr>
            <td>${attempts.length - idx}</td>
            <td>${QAQuest.formatDate(a.date)}</td>
            <td>${a.mode === "exam" ? "Exam" : "Practice"}</td>
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
            <th>#</th><th>Date</th><th>Mode</th><th>Score</th><th>%</th><th>Result</th><th>Time</th>
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
      main.innerHTML = `<p class="empty-state">Module not found. <a href="index.html">Back to modules</a>.</p>`;
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
          Aligned with: ${QAQuest.escapeHTML(mod.syllabusRef)} &middot;
          ${questionCount} question${questionCount === 1 ? "" : "s"} available
          ${!isAvailable ? " &middot; <strong>Question bank in progress</strong>" : ""}
        </p>
      </div>

      <div class="mode-cards">
        <div class="mode-card">
          <h3>Practice mode</h3>
          <ul>
            <li>Untimed</li>
            <li>Instant feedback after each question</li>
            <li>See the explanation right away</li>
          </ul>
          <a class="btn btn-block ${practiceDisabled ? "disabled" : ""}"
             ${practiceDisabled ? "" : `href="quiz.html?module=${mod.id}&mode=practice"`}>
            Start practice
          </a>
        </div>
        <div class="mode-card">
          <h3>Exam mode</h3>
          <ul>
            <li>${mod.examQuestionCount} questions, ${mod.examDurationMinutes} minutes</li>
            <li>Pass mark: ${mod.passPercentage}%</li>
            <li>Feedback shown only at the end</li>
          </ul>
          <a class="btn btn-block ${examDisabled ? "disabled" : ""}"
             ${examDisabled ? "" : `href="quiz.html?module=${mod.id}&mode=exam"`}>
            Start timed exam
          </a>
          ${
            isAvailable && !enoughForExam
              ? `<p style="font-size:0.8rem;color:var(--color-muted);margin-top:0.5rem;">Exam mode unlocks once ${mod.examQuestionCount} questions are available (currently ${questionCount}).</p>`
              : ""
          }
        </div>
      </div>

      <h2 class="section-title">Your attempt history</h2>
      ${renderHistory(attempts)}

      <p style="margin-top:1.5rem;"><a href="index.html">&larr; Back to all modules</a></p>
    `;
  } catch (e) {
    main.innerHTML = `<p class="empty-state">Could not load this module. Please refresh the page.</p>`;
    console.error(e);
  }
})();
