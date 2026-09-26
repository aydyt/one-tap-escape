(function (root) {
  "use strict";
  const OTE = (root.OTE = root.OTE || {});

  OTE.drawShareCard = function drawShareCard(options) {
    const canvas = root.document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    const font = options.font || "sans-serif";
    ctx.fillStyle = "#120814";
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "#ff3b6b";
    roundBlock(ctx, 48, 220, 92, 980);
    roundBlock(ctx, 940, 220, 92, 980);
    ctx.fillStyle = "#ff7a18";
    roundBlock(ctx, 48, 1260, 92, 280);
    roundBlock(ctx, 940, 1260, 92, 280);

    ctx.fillStyle = "#fff6e4";
    roundBlock(ctx, 180, 150, 720, 1420);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#1a0a10";
    roundBlock(ctx, 180, 150, 720, 1420, true);

    ctx.fillStyle = "#1a0a10";
    ctx.textAlign = "center";
    ctx.font = "800 42px " + font;
    ctx.fillText("一指逃生", 540, 250);
    ctx.font = "700 28px " + font;
    ctx.fillStyle = "#c41848";
    ctx.fillText(options.label, 540, 310);

    OTE.drawPlayer(ctx, 540, 520, 92, 0, false);

    const scoreText = String(options.score);
    let size = 210;
    do {
      ctx.font = "800 " + size + "px " + font;
      size -= 8;
    } while (size > 80 && ctx.measureText(scoreText).width > 760);
    ctx.fillStyle = "#1a0a10";
    ctx.font = "800 " + (size + 8) + "px " + font;
    ctx.fillText(scoreText, 540, 860);
    ctx.font = "800 42px " + font;
    ctx.fillText("分", 540, 930);

    ctx.font = "700 40px " + font;
    const lines = wrapText(ctx, options.roast, 640);
    lines.forEach(function (line, index) {
      ctx.fillText(line, 540, 1040 + index * 58);
    });

    ctx.fillStyle = "#ffe14a";
    roundBlock(ctx, 230, 1280, 620, 220);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#1a0a10";
    roundBlock(ctx, 230, 1280, 620, 220, true);
    ctx.fillStyle = "#1a0a10";
    ctx.font = "800 52px " + font;
    ctx.fillText("你能超过我吗", 540, 1370);
    ctx.font = "700 28px " + font;
    ctx.fillText("点开好友链接，或搜索「一指逃生」", 540, 1435);

    return canvas;
  };

  function roundBlock(ctx, x, y, w, h, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 28);
    else ctx.rect(x, y, w, h);
    if (stroke) ctx.stroke();
    else ctx.fill();
  }

  function wrapText(ctx, text, maxWidth) {
    const chars = Array.from(text);
    const lines = [];
    let line = "";
    chars.forEach(function (ch) {
      const next = line + ch;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  OTE.copyText = function copyText(text) {
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) {
      return root.navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  };

  function fallbackCopy(text) {
    const area = root.document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-999px";
    root.document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = root.document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    area.remove();
    return ok;
  }

  OTE.shareChallenge = function shareChallenge(payload) {
    const url = OTE.challengeUrl(payload.score, payload.seedKey);
    const text = OTE.shareText(payload.score, payload.roast);
    const canvas = OTE.drawShareCard(payload);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        resolve(send(blob, text, url));
      }, "image/png");
    });
  };

  function send(blob, text, url) {
    const file = new File([blob], "one-tap-escape.png", { type: "image/png" });
    const nav = root.navigator;
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      return nav.share({ files: [file], text: text, url: url, title: "一指逃生" }).then(function () {
        return "shared";
      });
    }
    if (nav.share) {
      return nav.share({ text: text, url: url, title: "一指逃生" }).then(function () {
        return "shared";
      });
    }
    return OTE.copyText(text + " " + url).then(function () {
      return "copied";
    });
  }
})(window);
