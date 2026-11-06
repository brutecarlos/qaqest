(function () {
  const key = "qaquest_beginner_dismissed_v1";
  const shortcut = document.getElementById("beginner-float");
  const dismiss = shortcut.querySelector(".beginner-dismiss");
  const progress = document.querySelector(".home-progress");

  try {
    shortcut.hidden = localStorage.getItem(key) === "true";
  } catch (e) {
    console.warn("QAQEST: could not read beginner shortcut preference", e);
    shortcut.hidden = false;
  }

  dismiss.addEventListener("click", () => {
    try {
      localStorage.setItem(key, "true");
      shortcut.hidden = true;
      progress.querySelector("summary").focus();
    } catch (e) {
      console.warn("QAQEST: could not save beginner shortcut preference", e);
      alert(dismiss.dataset.error);
    }
  });

  progress.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && progress.open) {
      progress.open = false;
      progress.querySelector("summary").focus();
    }
  });
})();
