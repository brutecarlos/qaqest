# QAQEST

QAQEST is a free, static website offering practice and timed mock exams for
software testing certification study. It's built with plain HTML, CSS, and
vanilla JavaScript — no backend, no database, no build step — and deploys
straight to GitHub Pages.

> **QAQEST is an independent, unofficial resource.** It is not affiliated
> with, endorsed by, or sponsored by ISTQB® (International Software Testing
> Qualifications Board). Syllabus names (e.g. "ISTQB Foundation Level") are
> used only as descriptive references to the topics a module covers. See
> [`about.html`](about.html) for the full disclaimer.

## Features

- **Modules per certification level**: Foundation Level (CTFL), Agile Tester
  Extension, Advanced Level (Test Analyst, Technical Test Analyst, Test
  Manager), and Specialist modules (Test Automation, Performance Testing).
- **Practice mode**: untimed, instant per-question feedback and explanations.
- **Exam mode**: timed, official-like question count, feedback withheld until
  you finish, pass/fail scored against real ISTQB-style thresholds (65% by
  default, configurable per module).
- **Review screen**: see every question after an attempt, with a filter to
  show only the ones you got wrong.
- **Progress persistence**: all attempt history and scores are stored in the
  browser's `localStorage` — no accounts, no server, no tracking of answers.
- **Ad-friendly layout**: dedicated, clearly-labeled ad slots (header
  leaderboard, inline banner) sized for Google AdSense units, placed
  non-invasively around content rather than inside it.

## Project structure

```
index.html          Home page — lists all modules with status & best score
module.html          Module detail — mode selection (practice/exam) & history
quiz.html            Quiz runner — renders one question at a time
results.html         Score summary + full answer review
about.html           About page & full ISTQB disclaimer

css/styles.css        All site styling
js/storage.js         localStorage helpers, fetch/format/shuffle utilities
js/layout.js           Shared header/footer injection
js/home.js, module.js, quiz.js, results.js   Page-specific logic

data/modules.json                Module metadata (name, exam length, pass %, status)
data/questions/<module-id>.json  Question bank per module

.github/workflows/deploy.yml     GitHub Pages deployment workflow
```

### Question JSON schema

Each file in `data/questions/` looks like:

```json
{
  "moduleId": "ctfl",
  "moduleName": "Certified Tester Foundation Level (CTFL)",
  "questions": [
    {
      "id": "ctfl-001",
      "chapter": "1. Fundamentals of Testing",
      "loRef": "FL-1.1.1",
      "difficulty": "easy",
      "question": "Which of the following ...?",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 1,
      "explanation": "Why the correct answer is correct, and often why others are wrong."
    }
  ]
}
```

- `loRef` references the syllabus learning objective the question targets
  (useful for study, and for keeping questions traceable to a syllabus
  section rather than to copyrighted syllabus text itself).
- `difficulty` is one of `easy`, `medium`, `hard`.
- `options` is always an array of 4 strings; `correctIndex` is 0-based.

## Adding or expanding a question bank

1. Open `data/modules.json` and find (or add) the module entry. Set
   `"status": "available"` once you've added enough questions, and make sure
   `examQuestionCount` matches what you intend the exam length to be — exam
   mode is disabled automatically until a module has at least that many
   questions.
2. Add/edit the corresponding file in `data/questions/<module-id>.json`
   following the schema above. IDs should be unique within the file
   (`<module-id>-NNN` is a good convention).
3. Validate the JSON, e.g.:
   ```bash
   python3 -c "import json; json.load(open('data/questions/ctfl.json'))"
   ```
4. Open `index.html` locally (or serve the folder with any static server) to
   confirm the module card, mode selection, and quiz flow all work.

### Question sourcing policy

- Where ISTQB has published a **free, official sample exam PDF** for a
  syllabus, you may use it as a *reference* for question style, difficulty,
  and syllabus coverage — but do not copy its question text verbatim into
  this repository, since those PDFs are ISTQB copyrighted material.
- For modules without public sample material (or to fill gaps), author
  **original questions** derived from the publicly available syllabus's
  learning objectives (the LO codes, like `FL-1.2.1`), not from copyrighted
  syllabus body text.
- Always include a plain-language `explanation` so both correct and
  incorrect answers are learning opportunities.

## Running locally

No build step is required. Because the site uses `fetch()` to load JSON,
open it via a local static server rather than `file://`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

`.github/workflows/deploy.yml` publishes the repository root to GitHub Pages
on every push to `main` using the official `actions/upload-pages-artifact`
and `actions/deploy-pages` actions. In the repository settings, set
**Settings → Pages → Source** to **GitHub Actions** (one-time setup) and the
site will build and deploy automatically.

## Advertising

Ads are **opt-in and off by default**. `js/layout.js` renders a header
toggle button ("&#10084;&#65039; Support QAQEST with ads" /
"&#128683; No ads, just studying") that flips a `localStorage` preference
(`qaquest_ads_enabled_v1`, exposed via `QAQuest.areAdsEnabled()` /
`QAQuest.setAdsEnabled()` in `js/storage.js`). Ad-slot elements
(`#header-ad-mount`, `#footer-ad-mount`) are only ever populated when the
preference is on — when it's off, nothing ad-related is created in the DOM
(not just hidden via CSS), keeping the default page lightweight. Placements
stay outside the quiz question card so they never interfere with answering.

### Connecting Google AdSense

The site ships with real AdSense wiring already in place
(`js/adsense-config.js` + `js/layout.js`) — it just needs your account's
IDs. Until then it keeps showing harmless "Ad space" placeholders instead
of real ad units, so the site works fine before and after you connect
AdSense.

1. **Sign up / sign in** at [adsense.google.com](https://www.google.com/adsense).
   A personal GitHub account isn't involved at all — AdSense only needs a
   Google account and your **live site URL**
   (e.g. `https://<you>.github.io/qaqest/`), so "won't parse my GitHub
   account" isn't a blocker: add the Pages URL as the site, not a GitHub
   link.
2. **Verify site ownership.** Since the site is already deployed, the
   easiest option is AdSense's *"Ad code" / auto ads* verification method:
   Google asks you to add a snippet to every page. This repo already loads
   `js/adsense-config.js` on every page, so once you fill in the `client`
   ID below and redeploy, that requirement is satisfied automatically. (If
   Google offers an HTML meta-tag or file-upload verification option
   instead, that also works and needs no extra code changes here.)
3. **Get your publisher/client ID** (Account &rarr; Account information),
   looks like `ca-pub-1234567890123456`.
4. **Create ad units** (Ads &rarr; By ad unit &rarr; Display ads) — one for
   the header slot and one for the footer/inline slot works well. Copy each
   unit's numeric `data-ad-slot` ID.
5. **Edit `js/adsense-config.js`** and fill in:
   ```js
   window.QAQEST_ADSENSE = {
     client: "ca-pub-1234567890123456",
     slots: { header: "1111111111", inline: "2222222222" },
   };
   ```
6. **Add `ads.txt`** at the repo root (already scaffolded) — replace
   `YOUR_PUBLISHER_ID` with your `pub-...` value (no `ca-` prefix) and
   uncomment the line. GitHub Pages serves root files automatically, so it
   will be reachable at `https://<you>.github.io/qaqest/ads.txt`.
7. Commit and push to `main`. Once GitHub Pages redeploys, visitors who
   opt into ads (via the header toggle) will start seeing real AdSense
   units instead of placeholders. Approval/serving can take Google a few
   hours to a few days after your first real traffic.

## License

Code is MIT licensed — see [`LICENSE`](LICENSE). Practice questions are
original content authored for this project (see the sourcing policy above)
and are released under the same MIT terms. QAQEST is not affiliated with,
endorsed by, or sponsored by ISTQB®.
