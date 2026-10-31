/** "Start here" questionnaire: recommends a module path and a first-week plan. */
(function () {
  const KEY = "qaquest_start_answers_v1";
  const MODS = {
    "ctfl": ["CTFL (Foundation Level)", "the usual starting point: shared vocabulary and core testing ideas, and typically required before Advanced levels."],
    "agile-tester": ["Agile Tester", "covers testing on agile teams, a good fit if you work in Scrum-style delivery."],
    "al-ta": ["Advanced Test Analyst", "deepens test design and analysis skills for hands-on testers."],
    "al-tta": ["Advanced Technical Test Analyst", "focuses on white-box techniques and technical quality characteristics."],
    "al-tm": ["Advanced Test Manager", "covers planning, estimation, monitoring and leading a test team."],
    "test-automation": ["Test Automation", "covers automation architecture, deployment and reporting, a specialist step toward automation roles."],
    "performance-testing": ["Performance Testing", "covers performance risks, metrics, tasks and tools, a specialist topic."]
  };
  const QUESTIONS = [
    { id: "exp", text: "How much testing experience do you have?", options: [["none", "None yet"], ["lt1", "Less than 1 year"], ["1-3", "1 to 3 years"], ["3+", "More than 3 years"]] },
    { id: "goal", text: "What is your main goal?", options: [["job", "Get my first QA job"], ["career", "Get certified for my career"], ["automation", "Move into test automation"], ["management", "Move into test management"], ["agile", "Work well in an agile team"], ["performance", "Specialise in performance testing"]] },
    { id: "cert", text: "Which certifications do you already hold?", options: [["none", "None"], ["ctfl", "CTFL"], ["agile", "CTFL + Agile Tester"], ["advanced", "An Advanced level or higher"]] },
    { id: "hours", text: "How many hours per week can you study?", options: [["2", "1 to 3 hours"], ["5", "4 to 6 hours"], ["9", "7 to 10 hours"], ["12", "More than 10 hours"]] },
    { id: "exam", text: "Do you know your exam date?", options: [["none", "Not yet"], ["lt1", "Within 1 month"], ["1-3", "In 1 to 3 months"], ["3+", "In more than 3 months"]] }
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
        '<a href="guide-fundamentals.html">Read the fundamentals guide</a> and note unfamiliar terms.',
        '<a href="guide-sdlc.html">Read the SDLC guide</a>, then try <a href="' + m + '">practice mode</a> on chapters 1 and 2.',
        "Review every explanation, including for correct answers.",
        'Book 3 short study sessions and use the <a href="planner.html">study planner</a> to schedule them.'
      ];
      if (a.exp === "3+") list[0] = 'Skim the <a href="guides.html">guides</a> for gaps, since your experience may already cover much of it.';
      return list;
    }
    return [
      "Download the current official syllabus for this module and skim the chapter titles.",
      'Open <a href="' + m + '">practice mode</a> and try the first chapter without a timer.',
      "Write down every wrong answer and the reason you missed it.",
      'Use the <a href="planner.html">study planner</a> to spread the rest over your available weeks.'
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
    let html = '<h3>Your suggested path</h3><p><strong>Start with: <a href="module.html?module=' + r.primary + '">' + esc(name(r.primary)) +
      "</a></strong></p><p>Why: " + esc(name(r.primary)) + " is " + esc(MODS[r.primary][1]) + "</p>";
    html += "<p><strong>Then consider:</strong></p><ul>" + r.next.map((id) =>
      '<li><a href="module.html?module=' + id + '">' + esc(name(id)) + "</a>: " + esc(MODS[id][1]) + "</li>").join("") + "</ul>";
    if (a.exam === "lt1" && Number(a.hours) <= 5) {
      html += '<div class="disclaimer">Your exam is close and your weekly time is limited. The planner will compress the plan; consider more hours or a later date if possible.</div>';
    }
    if (r.primary !== "ctfl" && a.cert === "ctfl" && ["al-ta", "al-tta", "al-tm"].includes(r.primary) === false) {
      html += "<p>Prerequisites for specialist and Advanced modules vary, so check the official body for current rules.</p>";
    } else if (["al-ta", "al-tta", "al-tm"].includes(r.primary)) {
      html += "<p>Advanced levels typically require CTFL first, and may need work experience. Check the official body for current rules.</p>";
    }
    html += "<p><strong>Your first week:</strong></p><ol>" + actions(r.primary, a).map((x) => "<li>" + x + "</li>").join("") + "</ol>";
    html += '<div class="start-actions"><a class="btn btn-primary" href="' + planUrl(r.primary, a) + '">Plan my study time</a>' +
      '<button type="button" class="btn btn-secondary" id="start-restart">Retake the questionnaire</button></div>';
    result.innerHTML = html;
    root.innerHTML = "";
    document.getElementById("start-restart").addEventListener("click", () => { answers = {}; step = 0; result.innerHTML = ""; renderQuestion(true); });
    if (focus) result.focus();
  }

  function renderQuestion(focus) {
    const q = QUESTIONS[step];
    const cur = answers[q.id];
    root.innerHTML = '<form class="start-q" novalidate><p class="start-progress">Question ' + (step + 1) + " of " + QUESTIONS.length +
      '</p><fieldset><legend><strong>' + esc(q.text) + "</strong></legend>" +
      q.options.map((o, i) => '<label><input type="radio" name="' + q.id + '" value="' + o[0] + '"' + (cur === o[0] ? " checked" : "") + (i === 0 && !cur ? " required" : "") + "> " + esc(o[1]) + "</label>").join("") +
      '</fieldset><p id="start-err" class="start-progress" role="alert"></p><div class="start-actions">' +
      (step > 0 ? '<button type="button" class="btn btn-secondary" id="start-back">Back</button>' : "") +
      '<button type="submit" class="btn btn-primary">' + (step === QUESTIONS.length - 1 ? "See my path" : "Next") + "</button></div></form>";
    const form = root.querySelector("form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const sel = form.querySelector("input:checked");
      if (!sel) { document.getElementById("start-err").textContent = "Please choose an answer to continue."; return; }
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
