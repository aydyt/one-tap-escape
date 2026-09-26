(function (root) {
  "use strict";
  const OTE = (root.OTE = root.OTE || {});

  OTE.bindInput = function bindInput(handler) {
    root.addEventListener("pointerdown", function (event) {
      if (event.target.closest && event.target.closest("button, a")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      handler("pointer");
    }, { passive: false });

    root.addEventListener("keydown", function (event) {
      if (event.code === "Escape") {
        handler("escape");
        return;
      }
      if (event.repeat) return;
      const playKey = event.code === "Space" || event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "KeyA" || event.code === "KeyD";
      if (!playKey) return;
      event.preventDefault();
      handler(event.code);
    });

    const canvas = root.document.getElementById("game");
    if (canvas) {
      canvas.addEventListener("contextmenu", function (event) {
        event.preventDefault();
      });
    }
  };
})(window);
