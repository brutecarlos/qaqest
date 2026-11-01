/**
 * QAQuest shareable score card: renders a 1200x630 PNG with <canvas>,
 * entirely client-side. Contains no personal data unless the user types
 * an optional display name (stored locally).
 */
QAQuest.ScoreCard = (function () {
  const SITE = "https://brutecarlos.github.io/qaqest/";
  const DISCLAIMER = "Puntuación de práctica no oficial \u2014 no es un resultado oficial de examen";

  function draw(canvas, d) {
    const W = 1200, H = 630, ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b1220"); g.addColorStop(1, "#1c2f5c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = d.passed ? "#4cc16e" : "#ff7b80";
    ctx.fillRect(0, 0, 14, H);
    const font = (px, w) => `${w || 400} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#6ea0ff"; ctx.font = font(44, 800); ctx.fillText("QAQEST", 70, 100);
    ctx.fillStyle = "#a3b0bf"; ctx.font = font(26); ctx.fillText("Exámenes de práctica gratuitos", 270, 100);

    ctx.fillStyle = "#e6ebf1"; ctx.font = font(38, 600);
    let name = d.moduleName;
    while (ctx.measureText(name).width > 1060 && name.length > 4) name = name.slice(0, -2);
    if (name !== d.moduleName) name += "\u2026";
    ctx.fillText(name, 70, 190);
    ctx.fillStyle = "#a3b0bf"; ctx.font = font(26);
    ctx.fillText((d.mode === "exam" ? "Examen cronometrado" : "Sesión de práctica") + " \u00b7 " + d.dateText, 70, 232);

    ctx.fillStyle = "#ffffff"; ctx.font = font(200, 800);
    const pct = Math.round(d.percentage).toLocaleString("es") + " %";
    ctx.fillText(pct, 70, 450);
    const pw = ctx.measureText(pct).width;
    ctx.font = font(36, 700);
    ctx.fillStyle = "#e6ebf1";
    ctx.fillText(`${d.score.toLocaleString("es")} / ${d.total.toLocaleString("es")} correctas`, 70 + pw + 50, 395);
    const label = d.passed ? "APROBADO" : "SUSPENSO";
    ctx.font = font(34, 800);
    const lw = ctx.measureText(label).width + 40;
    ctx.fillStyle = d.passed ? "#12301c" : "#3a1a1c";
    ctx.fillRect(70 + pw + 50, 415, lw, 56);
    ctx.fillStyle = d.passed ? "#4cc16e" : "#ff7b80";
    ctx.fillText(label, 70 + pw + 70, 455);
    ctx.fillStyle = "#a3b0bf"; ctx.font = font(24);
    ctx.fillText(`mínimo: ${d.passPercentage.toLocaleString("es")} %`, 70 + pw + 50 + lw + 20, 455);

    ctx.fillStyle = "#e6ebf1"; ctx.font = font(28);
    const extra = [d.displayName, d.streakLine].filter(Boolean).join("  \u00b7  ");
    if (extra) ctx.fillText(extra, 70, 520);
    ctx.fillStyle = "#a3b0bf"; ctx.font = font(22);
    ctx.fillText(DISCLAIMER, 70, 570);
    ctx.fillStyle = "#6ea0ff"; ctx.font = font(24, 600);
    ctx.fillText(SITE, 70, 602);
  }

  function shareText(d) {
    const mod = d.shortName || d.moduleName;
    return `He obtenido un ${Math.round(d.percentage).toLocaleString("es")} % en ${mod} de QAQEST (${d.mode === "exam" ? "examen de práctica" : "sesión de práctica"}) ${d.passed ? "\u2705" : "\ud83d\udcaa"} \u2014 ${SITE} (puntuación de práctica no oficial)`;
  }

  function render(container, d) {
    const esc = QAQuest.escapeHTML;
    const NAME_KEY = "qaquest_scorecard_name_v1";
    try { d.displayName = (localStorage.getItem(NAME_KEY) || "").slice(0, 30); } catch (e) { d.displayName = ""; }
    container.innerHTML = `<section class="scorecard no-print" aria-labelledby="sc-title">
      <h2 id="sc-title" class="section-title">Comparte tu puntuación</h2>
      <canvas class="scorecard-canvas" role="img" aria-label="Vista previa de la tarjeta de puntuación: ${esc(Math.round(d.percentage).toLocaleString("es") + " % en " + d.moduleName)}"></canvas>
      <label class="sc-name">Nombre para mostrar (opcional; se guarda en este dispositivo)
        <input type="text" maxlength="30" autocomplete="off" value="${esc(d.displayName)}" /></label>
      <div class="sc-actions">
        <button type="button" class="btn" data-sc="download">Descargar imagen</button>
        <button type="button" class="btn btn-secondary" data-sc="share">Compartir</button>
        <button type="button" class="btn btn-secondary" data-sc="copy">Copiar texto</button>
        <a class="btn btn-secondary" data-sc="linkedin" target="_blank" rel="noopener"
           href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE)}">Compartir en LinkedIn</a>
      </div>
      <p class="sc-note">LinkedIn no rellena el texto automáticamente: al hacer clic, se copia al portapapeles para que lo pegues en tu publicación. ${esc(DISCLAIMER)}.</p>
      <span class="tool-msg" role="status" aria-live="polite"></span></section>`;
    const canvas = container.querySelector("canvas");
    const msg = container.querySelector(".tool-msg");
    const input = container.querySelector("input");
    const redraw = () => draw(canvas, d);
    redraw();
    const say = (t) => { msg.textContent = t; };
    const blob = () => new Promise((res) => canvas.toBlob(res, "image/png"));
    const copy = async () => {
      try { await navigator.clipboard.writeText(shareText(d)); say("Texto copiado."); return true; }
      catch (e) { say("No se pudo copiar automáticamente. Selecciona y copia este texto: " + shareText(d)); return false; }
    };
    input.addEventListener("input", () => {
      d.displayName = input.value.trim().slice(0, 30);
      try { localStorage.setItem(NAME_KEY, d.displayName); } catch (e) { /* ignore */ }
      redraw();
    });
    container.querySelector('[data-sc="download"]').addEventListener("click", async () => {
      const b = await blob();
      if (!b) return say("No se pudo crear la imagen.");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = "qaqest-puntuacion.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    container.querySelector('[data-sc="share"]').addEventListener("click", async () => {
      const text = shareText(d);
      try {
        const b = await blob();
        const file = b && new File([b], "qaqest-puntuacion.png", { type: "image/png" });
        if (navigator.share) {
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text });
          } else {
            await navigator.share({ text, url: SITE });
          }
          return;
        }
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
      copy();
    });
    container.querySelector('[data-sc="copy"]').addEventListener("click", copy);
    container.querySelector('[data-sc="linkedin"]').addEventListener("click", () => { copy(); });
  }

  return { render, draw, shareText };
})();
