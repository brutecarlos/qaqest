/**
 * Results page: reads the most recent attempt from sessionStorage (written
 * by quiz.js) and renders a pass/fail summary plus a reviewable breakdown
 * of every question, with a filter for wrong-answers-only.
 */
(function () {
  const main = document.getElementById("results-main");
  const moduleId = QAQuest.qs("module");

  function renderReviewItem(a, index) {
    const statusLabel = a.isCorrect ? "Correct" : a.selectedIndex === null ? "Unanswered" : "Incorrect";
    const statusClass = a.isCorrect ? "pass-pill" : "fail-pill";
    const optionsHtml = a.options
      .map((opt, i) => {
        let line = QAQuest.escapeHTML(opt);
        if (i === a.correctIndex) line = `<strong>${line}</strong> (correct answer)`;
        if (i === a.selectedIndex && i !== a.correctIndex) line += " (your answer)";
        if (i === a.selectedIndex && i === a.correctIndex) line += " (your answer)";
        return `<div class="review-answer-line">${i === a.correctIndex ? "✔" : i === a.selectedIndex ? "✘" : "&nbsp;&nbsp;"} ${line}</div>`;
      })
      .join("");

    return `
      <article class="review-item" data-correct="${a.isCorrect}">
        <div class="question-meta">Question ${index + 1} &middot; ${QAQuest.escapeHTML(a.chapter)} &middot;
          <span class="${statusClass}">${statusLabel}</span>
        </div>
        <div class="question-text">${QAQuest.escapeHTML(a.question)}</div>
        ${optionsHtml}
        <div class="feedback-box ${a.isCorrect ? "correct" : "incorrect"}" style="margin-top:0.75rem;">
          ${QAQuest.escapeHTML(a.explanation)}
        </div>
      </article>
    `;
  }

  function applyFilter(mode) {
    document.querySelectorAll(".review-item").forEach((el) => {
      const isCorrect = el.dataset.correct === "true";
      let show = true;
      if (mode === "wrong") show = !isCorrect;
      el.style.display = show ? "" : "none";
    });
    document.querySelectorAll(".filter-bar .btn").forEach((btn) => {
      btn.classList.toggle("btn-secondary", btn.dataset.filter !== mode);
    });
  }

  function init() {
    const raw = sessionStorage.getItem("qaquest_last_result");
    if (!raw) {
      main.innerHTML = `<p class="empty-state">No recent result found. <a href="module.html?module=${moduleId}">Start a quiz</a>.</p>`;
      return;
    }
    const { moduleName, attempt } = JSON.parse(raw);
    const passClass = attempt.passed ? "pass" : "fail";
    const statusText = attempt.passed ? "PASS" : "FAIL";

    const reviewHtml = attempt.answers.map(renderReviewItem).join("");
    const wrongCount = attempt.answers.filter((a) => !a.isCorrect).length;

    main.innerHTML = `
      <div class="module-header">
        <h1>${QAQuest.escapeHTML(moduleName)}</h1>
        <p style="color:var(--color-muted);">
          ${attempt.mode === "exam" ? "Timed exam" : "Practice session"} &middot;
          ${QAQuest.formatDate(attempt.date)} &middot; ${QAQuest.formatDuration(attempt.durationSec)}
          ${attempt.timedOut ? " &middot; time expired" : ""}
        </p>
      </div>

      <div class="score-summary">
        <div class="result-status ${passClass}-pill">${statusText}</div>
        <div class="score-value ${passClass}">${Math.round(attempt.percentage)}%</div>
        <p>${attempt.score} / ${attempt.total} correct &middot; pass mark is ${attempt.passPercentage}%</p>
      </div>

      <h2 class="section-title">Review your answers</h2>
      <div class="filter-bar">
        <button class="btn" data-filter="all">All (${attempt.total})</button>
        <button class="btn btn-secondary" data-filter="wrong">Needs review (${wrongCount})</button>
      </div>
      <div id="review-list">${reviewHtml}</div>

      <div class="quiz-nav">
        <a class="btn btn-secondary" href="module.html?module=${moduleId}">&larr; Back to module</a>
        <a class="btn" href="quiz.html?module=${moduleId}&mode=${attempt.mode}">Try again</a>
      </div>
    `;

    document.querySelectorAll(".filter-bar .btn").forEach((btn) => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
    });
  }

  init();
})();
