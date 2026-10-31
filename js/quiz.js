/**
 * Quiz engine: drives both practice mode (instant feedback, untimed) and
 * exam mode (timed, feedback withheld until the end). Renders one question
 * at a time, tracks answers in memory, and on completion stores the result
 * in sessionStorage before redirecting to results.html.
 */
(function () {
  const main = document.getElementById("quiz-main");
  const moduleId = QAQuest.qs("module");
  const mode = QAQuest.qs("mode") === "exam" ? "exam" : "practice";

  const state = {
    module: null,
    questions: [],
    currentIndex: 0,
    answers: {}, // questionId -> selected option index
    flagged: {}, // questionId -> true
    startTime: null,
    durationSec: 0,
    remainingSec: 0,
    timerHandle: null,
    finished: false,
  };

  function prepareQuestions(rawQuestions, limit) {
    const shuffled = QAQuest.shuffle(rawQuestions);
    const selected = limit ? shuffled.slice(0, limit) : shuffled;
    return selected.map((q) => {
      const optionOrder = QAQuest.shuffle(
        q.options.map((text, idx) => ({ text, wasCorrect: idx === q.correctIndex }))
      );
      const correctIndex = optionOrder.findIndex((o) => o.wasCorrect);
      return {
        id: q.id,
        chapter: q.chapter,
        loRef: q.loRef,
        difficulty: q.difficulty,
        question: q.question,
        explanation: q.explanation,
        options: optionOrder.map((o) => o.text),
        correctIndex,
      };
    });
  }

  function startTimer() {
    const timerEl = document.getElementById("quiz-timer");
    state.timerHandle = setInterval(() => {
      state.remainingSec -= 1;
      if (!timerEl) return;
      if (state.remainingSec <= 0) {
        clearInterval(state.timerHandle);
        state.remainingSec = 0;
        finishQuiz(true);
        return;
      }
      timerEl.textContent = formatClock(state.remainingSec);
      if (state.remainingSec <= 60) {
        timerEl.classList.add("low-time");
      }
    }, 1000);
  }

  function formatClock(totalSeconds) {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  function selectAnswer(qIndex, optionIndex) {
    const q = state.questions[qIndex];
    state.answers[q.id] = optionIndex;
    renderQuestion();
  }

  function toggleFlag() {
    const q = state.questions[state.currentIndex];
    if (state.flagged[q.id]) delete state.flagged[q.id];
    else state.flagged[q.id] = true;
    renderQuestion();
  }

  function jumpTo(i) {
    state.currentIndex = i;
    renderQuestion();
  }

  function goTo(delta) {
    const next = state.currentIndex + delta;
    if (next < 0 || next >= state.questions.length) return;
    state.currentIndex = next;
    renderQuestion();
  }

  function renderQuestion() {
    const total = state.questions.length;
    const idx = state.currentIndex;
    const q = state.questions[idx];
    const selected = state.answers[q.id];
    const hasAnswered = selected !== undefined;
    const showFeedback = mode === "practice" && hasAnswered;

    const optionsHtml = q.options
      .map((optText, i) => {
        let cls = "option";
        if (mode === "practice" && hasAnswered) {
          if (i === q.correctIndex) cls += " correct";
          else if (i === selected) cls += " incorrect";
        } else if (i === selected) {
          cls += " selected";
        }
        return `
          <li class="${cls}" data-option-index="${i}">
            <input type="radio" name="option" ${i === selected ? "checked" : ""}
                   ${mode === "practice" && hasAnswered ? "disabled" : ""} />
            <span>${QAQuest.escapeHTML(optText)}</span>
          </li>
        `;
      })
      .join("");

    const feedbackHtml = showFeedback
      ? `<div class="feedback-box ${selected === q.correctIndex ? "correct" : "incorrect"}">
           <strong>${selected === q.correctIndex ? "Correct!" : "Not quite."}</strong>
           ${QAQuest.escapeHTML(q.explanation)}
         </div>`
      : "";

    const isLast = idx === total - 1;
    const timerHtml =
      mode === "exam"
        ? `<div class="quiz-timer" id="quiz-timer">${formatClock(state.remainingSec)}</div>`
        : "";

    const isFlagged = !!state.flagged[q.id];
    const navHtml = state.questions
      .map((qq, i) => {
        const cls = [
          state.answers[qq.id] !== undefined ? "answered" : "",
          state.flagged[qq.id] ? "flagged" : "",
          i === idx ? "current" : "",
        ].join(" ");
        return `<button type="button" class="${cls}" data-jump="${i}" aria-label="Go to question ${i + 1}${
          state.answers[qq.id] !== undefined ? ", answered" : ""
        }${state.flagged[qq.id] ? ", flagged" : ""}"${i === idx ? ' aria-current="true"' : ""}>${i + 1}</button>`;
      })
      .join("");

    main.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress">Question ${idx + 1} of ${total}</div>
        ${timerHtml}
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${((idx + 1) / total) * 100}%"></div>
      </div>
      <div class="question-card">
        <div class="question-meta">${QAQuest.escapeHTML(q.chapter)} &middot; ${QAQuest.escapeHTML(
      q.difficulty
    )}</div>
        <div class="question-text">${QAQuest.escapeHTML(q.question)}</div>
        <ul class="options-list" id="options-list">${optionsHtml}</ul>
        ${feedbackHtml}
        <div class="question-tools">
          <button type="button" class="btn btn-secondary btn-flag ${isFlagged ? "flagged" : ""}" id="btn-flag"
                  aria-pressed="${isFlagged}" aria-label="${isFlagged ? "Unflag" : "Flag"} this question for review">
            \u2691 ${isFlagged ? "Flagged" : "Flag"}
          </button>
          <a class="report-link" target="_blank" rel="noopener"
             aria-label="Report an issue with this question (opens GitHub)"
             href="${QAQuest.escapeHTML(QAQuest.reportIssueUrl(moduleId, q))}">Report an issue</a>
        </div>
      </div>
      <div class="q-navigator" role="navigation" aria-label="Question navigator">${navHtml}</div>
      <div class="quiz-nav">
        <button class="btn btn-secondary" id="btn-prev" ${idx === 0 ? "disabled" : ""}>&larr; Previous</button>
        <button class="btn" id="btn-next">${isLast ? "Finish" : "Next \u2192"}</button>
      </div>
      <p class="shortcut-hint">Shortcuts: 1&ndash;4 or A&ndash;D select &middot; Enter / &rarr; next &middot; &larr; previous &middot; F flag</p>
    `;

    document.getElementById("btn-flag").addEventListener("click", toggleFlag);
    main.querySelectorAll("[data-jump]").forEach((b) =>
      b.addEventListener("click", () => jumpTo(Number(b.dataset.jump)))
    );
    document.getElementById("btn-prev").addEventListener("click", () => goTo(-1));
    document.getElementById("btn-next").addEventListener("click", () => {
      if (isLast) {
        finishQuiz(false);
      } else {
        goTo(1);
      }
    });

    if (!(mode === "practice" && hasAnswered)) {
      main.querySelectorAll("#options-list .option").forEach((li) => {
        li.addEventListener("click", () => {
          selectAnswer(idx, Number(li.dataset.optionIndex));
        });
      });
    }
  }

  function finishQuiz(timedOut) {
    if (state.finished) return;
    state.finished = true;
    if (state.timerHandle) clearInterval(state.timerHandle);

    const answersDetail = state.questions.map((q) => {
      const selected = state.answers[q.id];
      return {
        id: q.id,
        question: q.question,
        chapter: q.chapter,
        loRef: q.loRef,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: selected === undefined ? null : selected,
        flagged: !!state.flagged[q.id],
        isCorrect: selected === q.correctIndex,
        explanation: q.explanation,
      };
    });

    const score = answersDetail.filter((a) => a.isCorrect).length;
    const total = answersDetail.length;
    const percentage = total > 0 ? (score / total) * 100 : 0;
    const passed = percentage >= state.module.passPercentage;
    const durationSec = Math.round((Date.now() - state.startTime) / 1000);

    const attempt = {
      date: new Date().toISOString(),
      mode,
      score,
      total,
      percentage,
      passed,
      durationSec,
      timedOut: !!timedOut,
      passPercentage: state.module.passPercentage,
      answers: answersDetail,
    };

    QAQuest.recordAttempt(moduleId, attempt);
    sessionStorage.setItem(
      "qaquest_last_result",
      JSON.stringify({
        moduleId,
        moduleName: state.module.name,
        attempt,
      })
    );
    window.location.href = `results.html?module=${moduleId}`;
  }

  function onKey(e) {
    if (state.finished || !state.questions.length) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const tag = t && t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT" || (tag === "INPUT" && t.type !== "radio") || (t && t.isContentEditable)) return;
    const key = e.key.toLowerCase();
    const q = state.questions[state.currentIndex];
    const isLast = state.currentIndex === state.questions.length - 1;
    const locked = mode === "practice" && state.answers[q.id] !== undefined;
    let optIdx = -1;
    if (/^[1-9]$/.test(key)) optIdx = Number(key) - 1;
    else if (/^[a-d]$/.test(key)) optIdx = key.charCodeAt(0) - 97;
    if (optIdx >= 0) {
      if (optIdx < q.options.length && !locked) {
        e.preventDefault();
        selectAnswer(state.currentIndex, optIdx);
      }
    } else if (key === "f") {
      e.preventDefault();
      toggleFlag();
    } else if (key === "arrowleft") {
      e.preventDefault();
      goTo(-1);
    } else if (key === "arrowright" || (key === "enter" && tag !== "BUTTON" && tag !== "A")) {
      e.preventDefault();
      if (isLast && key === "enter") finishQuiz(false);
      else goTo(1);
    }
  }
  document.addEventListener("keydown", onKey);

  async function init() {
    try {
      const modulesData = await QAQuest.fetchJSON("data/modules.json");
      const mod = modulesData.modules.find((m) => m.id === moduleId);
      if (!mod) {
        main.innerHTML = `<p class="empty-state">Module not found. <a href="index.html">Back to modules</a>.</p>`;
        return;
      }
      if (mod.status !== "available") {
        main.innerHTML = `<p class="empty-state">This module's question bank is still in progress. <a href="module.html?module=${moduleId}">Back to module</a>.</p>`;
        return;
      }
      state.module = mod;

      const qData = await QAQuest.fetchJSON(mod.questionFile);
      const limit = mode === "exam" ? mod.examQuestionCount : null;
      state.questions = prepareQuestions(qData.questions, limit);

      if (state.questions.length === 0) {
        main.innerHTML = `<p class="empty-state">No questions available yet for this module.</p>`;
        return;
      }

      if (mode === "exam" && state.questions.length < mod.examQuestionCount) {
        main.innerHTML = `<p class="empty-state">Not enough questions yet for a full timed exam. <a href="module.html?module=${moduleId}">Back to module</a>.</p>`;
        return;
      }

      state.startTime = Date.now();
      if (mode === "exam") {
        state.durationSec = mod.examDurationMinutes * 60;
        state.remainingSec = state.durationSec;
        startTimer();
      }
      renderQuestion();
    } catch (e) {
      main.innerHTML = `<p class="empty-state">Could not load the quiz. Please try again.</p>`;
      console.error(e);
    }
  }

  init();
})();
