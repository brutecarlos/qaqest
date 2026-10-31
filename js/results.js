/**
 * Results page: reads the most recent attempt from sessionStorage (written
 * by quiz.js) and renders a pass/fail summary plus a reviewable breakdown
 * of every question, with a filter for wrong-answers-only.
 */
(function () {
  const main = document.getElementById("results-main");
  const moduleId = QAQuest.qs("module");

  function renderReviewItem(a, index) {
    const issueUrl = QAQuest.reportIssueUrl(moduleId, a);
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
      <article class="review-item" data-correct="${a.isCorrect}" data-flagged="${!!a.flagged}">
        <div class="question-meta">Question ${index + 1} &middot; ${QAQuest.escapeHTML(a.chapter)} &middot;
          <span class="${statusClass}">${statusLabel}</span>${a.flagged ? " &middot; <span>\u2691 Flagged</span>" : ""}
        </div>
        <div class="question-text">${QAQuest.escapeHTML(a.question)}</div>
        ${optionsHtml}
        <div class="feedback-box ${a.isCorrect ? "correct" : "incorrect"}" style="margin-top:0.75rem;">
          ${QAQuest.escapeHTML(a.explanation)}
        </div>
        <div class="question-tools">
          <a class="report-link" target="_blank" rel="noopener"
             aria-label="Report an issue with question ${index + 1} (opens GitHub)"
             href="${QAQuest.escapeHTML(issueUrl)}">Report an issue</a>
        </div>
      </article>
    `;
  }

  function renderChapterBreakdown(answers) {
    const map = new Map();
    answers.forEach((a) => {
      const key = a.chapter || "Other";
      const c = map.get(key) || { name: key, correct: 0, total: 0 };
      c.total++;
      if (a.isCorrect) c.correct++;
      map.set(key, c);
    });
    const rows = [...map.values()].sort((x, y) =>
      x.name.localeCompare(y.name, undefined, { numeric: true })
    );
    if (rows.length < 2) return "";
    const rate = (c) => c.correct / c.total;
    const weakest = rows.reduce((w, c) => (rate(c) < rate(w) ? c : w), rows[0]);
    const showWeak = rate(weakest) < 1;
    const html = rows
      .map((c) => {
        const pct = Math.round(rate(c) * 100);
        return `<div class="chapter-row ${showWeak && c === weakest ? "weakest" : ""}">
          <span class="chapter-name">${QAQuest.escapeHTML(c.name)}${showWeak && c === weakest ? " (weakest)" : ""}</span>
          <div class="chapter-bar" role="img" aria-label="${pct}% correct"><span style="width:${pct}%"></span></div>
          <span>${c.correct}/${c.total} (${pct}%)</span>
        </div>`;
      })
      .join("");
    return `<h2 class="section-title">Performance by chapter</h2><div>${html}</div>`;
  }

  function applyFilter(mode) {
    document.querySelectorAll(".review-item").forEach((el) => {
      const isCorrect = el.dataset.correct === "true";
      let show = true;
      if (mode === "wrong") show = !isCorrect;
      if (mode === "flagged") show = el.dataset.flagged === "true";
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
    const flaggedCount = attempt.answers.filter((a) => a.flagged).length;
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

      ${renderChapterBreakdown(attempt.answers)}

      <h2 class="section-title">Review your answers</h2>
      <div class="filter-bar">
        <button class="btn" data-filter="all">All (${attempt.total})</button>
        <button class="btn btn-secondary" data-filter="wrong">Needs review (${wrongCount})</button>
        <button class="btn btn-secondary" data-filter="flagged" aria-label="Show flagged questions only">Flagged (${flaggedCount})</button>
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
