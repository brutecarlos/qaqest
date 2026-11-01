/**
 * Daily question and its separate local streak. This does not change exam
 * history or the main study streak, which only counts completed attempts.
 */
(function () {
  const KEY = "qaquest_daily_v1";
  const MODULE_WEIGHTS = { ctfl: 6 };

  function localDay(date) {
    const d = date || new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  }

  function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickModule(modules, day) {
    const available = modules.filter((m) => m.status === "available");
    const weighted = [];
    available.forEach((m) => {
      const count = MODULE_WEIGHTS[m.id] || 1;
      for (let i = 0; i < count; i++) weighted.push(m);
    });
    return weighted[hash(day + "|module") % weighted.length] || null;
  }

  function pickQuestion(questions, day, moduleId) {
    if (!questions.length) return null;
    return questions[hash(day + "|" + moduleId + "|question") % questions.length];
  }

  function emptyStore() {
    return { answers: {} };
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "null");
      return validate(value || emptyStore());
    } catch (e) {
      console.warn("QAQEST: no se pudo leer el progreso de la pregunta diaria", e);
      return emptyStore();
    }
  }

  function validate(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        !value.answers || typeof value.answers !== "object" || Array.isArray(value.answers)) {
      throw new Error("Los datos de la pregunta diaria no son válidos.");
    }
    const answers = {};
    Object.keys(value.answers).forEach((day) => {
      const item = value.answers[day];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !item ||
          typeof item.moduleId !== "string" || typeof item.questionId !== "string" ||
          !Number.isInteger(item.selectedIndex) || item.selectedIndex < 0 || item.selectedIndex > 3 ||
          !Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3 ||
          typeof item.correct !== "boolean" || typeof item.answeredAt !== "string" ||
          isNaN(new Date(item.answeredAt))) {
        throw new Error("El registro de respuesta diaria no es válido.");
      }
      answers[day] = item;
    });
    return { answers };
  }

  function save(store) {
    try {
      localStorage.setItem(KEY, JSON.stringify(validate(store)));
    } catch (e) {
      console.warn("QAQEST: no se pudo guardar el progreso de la pregunta diaria", e);
    }
  }

  function merge(incoming) {
    const clean = validate(incoming);
    const current = load();
    Object.keys(clean.answers).forEach((day) => {
      if (!current.answers[day]) current.answers[day] = clean.answers[day];
    });
    save(current);
  }

  function previousDay(day) {
    const [year, month, date] = day.split("-").map(Number);
    return localDay(new Date(year, month - 1, date - 1));
  }

  function streakCount(answers, today) {
    const days = new Set(Object.keys(answers));
    const latest = days.has(today) ? today : previousDay(today);
    if (!days.has(latest)) return 0;
    let count = 0;
    let cursor = latest;
    while (days.has(cursor)) {
      count++;
      cursor = previousDay(cursor);
    }
    return count;
  }

  function summary(store, today) {
    const answers = store.answers;
    const count = Object.keys(answers).length;
    return {
      currentStreak: streakCount(answers, today || localDay()),
      totalAnswered: count,
      totalCorrect: Object.keys(answers).filter((day) => answers[day].correct).length
    };
  }

  function recordAnswer(day, moduleId, question, selectedIndex) {
    const store = load();
    if (store.answers[day]) return store.answers[day];
    const record = {
      moduleId,
      questionId: question.id,
      selectedIndex,
      correctIndex: question.correctIndex,
      correct: selectedIndex === question.correctIndex,
      answeredAt: new Date().toISOString()
    };
    store.answers[day] = record;
    save(store);
    return record;
  }

  const api = { KEY, localDay, hash, pickModule, pickQuestion, load, validate, save, merge, summary, streakCount, recordAnswer };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof QAQuest !== "undefined") QAQuest.DailyQuestion = api;

  const card = typeof document !== "undefined" && document.getElementById("daily-question-card");
  if (!card || typeof QAQuest === "undefined") return;
  const content = document.getElementById("daily-question-content");

  function showResult(target, question, record, module) {
    const correct = record.correct;
    target.innerHTML = `<p class="daily-feedback ${correct ? "is-correct" : "is-incorrect"}">${correct ? "¡Correcto!" : "No del todo."}</p>
      <p><strong>Respuesta correcta:</strong> ${QAQuest.escapeHTML(question.options[question.correctIndex])}</p>
      <p>${QAQuest.escapeHTML(question.explanation)}</p>
      <p><a class="btn btn-secondary" href="module.html?module=${encodeURIComponent(module.id)}">Practica más en ${QAQuest.escapeHTML(module.shortName)}</a></p>`;
  }

  async function init() {
    const today = localDay();
    try {
      const data = await QAQuest.fetchJSON("data/modules.json");
      const module = pickModule(data.modules, today);
      if (!module) return;
      const bank = await QAQuest.fetchJSON(module.questionFile);
      const question = pickQuestion(bank.questions, today, module.id);
      if (!question) return;
      const store = load();
      const prior = store.answers[today];
      const stats = summary(store, today);
      card.hidden = false;
      content.innerHTML = `<p class="module-desc">${QAQuest.escapeHTML(module.shortName)} · ${QAQuest.escapeHTML(question.chapter)} · ${QAQuest.escapeHTML(QAQuest.difficultyLabel(question.difficulty))}</p>
        <form id="daily-question-form">
          <fieldset><legend>${QAQuest.escapeHTML(question.question)}</legend>
            ${question.note ? `<details class="question-note"><summary aria-label="Mostrar nota terminológica">Nota terminológica</summary><p>${QAQuest.escapeHTML(question.note)}</p></details>` : ""}
            ${question.options.map((option, i) => `<label class="daily-option"><input type="radio" name="daily-answer" value="${i}"${i === 0 && !prior ? " required" : ""}${prior ? " disabled" : ""}${prior && prior.selectedIndex === i ? " checked" : ""}> ${QAQuest.escapeHTML(option)}</label>`).join("")}
          </fieldset>
          <button type="submit" class="btn btn-primary"${prior ? " disabled" : ""}>Comprobar respuesta</button>
        </form>
        <div id="daily-answer-result" aria-live="polite"></div>
        <p class="daily-stats">Racha diaria: <strong>${stats.currentStreak.toLocaleString("es")}</strong> ${stats.currentStreak === 1 ? "día" : "días"} · ${stats.totalAnswered.toLocaleString("es")} respondidas · ${stats.totalCorrect.toLocaleString("es")} correctas</p>
        <p><a href="${QAQuest.reportIssueUrl(module.id, question)}">Informar de un problema con esta pregunta</a></p>`;
      if (prior) {
        showResult(document.getElementById("daily-answer-result"), question, prior, module);
      } else {
        document.getElementById("daily-question-form").addEventListener("submit", (event) => {
          event.preventDefault();
          const selected = Number(new FormData(event.currentTarget).get("daily-answer"));
          if (!Number.isInteger(selected) || selected < 0 || selected > 3) return;
          const answer = recordAnswer(today, module.id, question, selected);
          event.currentTarget.querySelectorAll("input").forEach((input) => { input.disabled = true; });
          event.currentTarget.querySelector("button[type=submit]").disabled = true;
          showResult(document.getElementById("daily-answer-result"), question, answer, module);
          const updated = summary(load(), today);
          const stat = content.querySelector(".daily-stats");
          stat.innerHTML = `Racha diaria: <strong>${updated.currentStreak.toLocaleString("es")}</strong> ${updated.currentStreak === 1 ? "día" : "días"} · ${updated.totalAnswered.toLocaleString("es")} respondidas · ${updated.totalCorrect.toLocaleString("es")} correctas`;
        });
      }
    } catch (e) {
      card.hidden = true;
    }
  }

  init();
})();
