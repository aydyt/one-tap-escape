(function (root) {
  "use strict";
  const OTE = (root.OTE = root.OTE || {});
  let stripes = null;

  function roundRect(ctx, x, y, w, h, r) {
    if (w <= 0 || h <= 0) return false;
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
    return true;
  }

  function stripePattern(ctx) {
    if (stripes) return stripes;
    const tile = root.document.createElement("canvas");
    tile.width = 14;
    tile.height = 14;
    const g = tile.getContext("2d");
    g.strokeStyle = "rgba(26, 10, 16, 0.22)";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-2, 12);
    g.lineTo(12, -2);
    g.stroke();
    stripes = ctx.createPattern(tile, "repeat");
    return stripes;
  }

  OTE.layoutOf = function layoutOf(viewW, viewH) {
    const shaftW = Math.min(viewW * 0.88, 450);
    return {
      viewW: viewW,
      viewH: viewH,
      shaftW: shaftW,
      scale: shaftW / OTE.WORLD_W,
      left: (viewW - shaftW) / 2,
    };
  };

  OTE.drawPlayer = function drawPlayer(ctx, x, y, r, lean, dead) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dead ? 0.45 : lean * 0.42);
    const stretch = Math.min(0.28, Math.abs(lean) * 0.38);
    ctx.scale(1 + stretch, 1 - stretch * 0.7);
    const body = r * 2.05;
    ctx.fillStyle = "rgba(26, 10, 16, 0.28)";
    ctx.beginPath();
    ctx.ellipse(0, body * 0.55, body * 0.42, body * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (roundRect(ctx, -body / 2, -body / 2, body, body, r * 0.72)) {
      ctx.fillStyle = dead ? "#ffd0dc" : "#ffe14a";
      ctx.fill();
      ctx.lineWidth = Math.max(3, r * 0.16);
      ctx.strokeStyle = "#1a0a10";
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    if (roundRect(ctx, -body * 0.28, -body * 0.34, body * 0.32, body * 0.16, r * 0.18)) ctx.fill();
    if (dead) {
      drawX(ctx, -r * 0.38, -r * 0.05, r * 0.3);
      drawX(ctx, r * 0.4, -r * 0.05, r * 0.3);
      ctx.strokeStyle = "#1a0a10";
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, r * 0.42);
      ctx.lineTo(r * 0.22, r * 0.42);
      ctx.stroke();
    } else {
      const look = lean * r * 0.2;
      drawEye(ctx, -r * 0.36 + look, -r * 0.05, r * 0.2);
      drawEye(ctx, r * 0.4 + look, -r * 0.05, r * 0.2);
      ctx.strokeStyle = "#1a0a10";
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(r * 0.02, r * 0.22, r * 0.24, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  };

  function drawEye(ctx, x, y, r) {
    ctx.fillStyle = "#1a0a10";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + r * 0.28, y - r * 0.28, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawX(ctx, x, y, size) {
    ctx.strokeStyle = "#1a0a10";
    ctx.lineWidth = Math.max(2, size * 0.28);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y - size / 2);
    ctx.lineTo(x + size / 2, y + size / 2);
    ctx.moveTo(x + size / 2, y - size / 2);
    ctx.lineTo(x - size / 2, y + size / 2);
    ctx.stroke();
  }

  function wrap(value, size) {
    return ((value % size) + size) % size;
  }

  OTE.drawFrame = function drawFrame(ctx, state) {
    const w = state.viewW;
    const h = state.viewH;
    const layout = OTE.layoutOf(w, h);
    const cameraY = state.player.y - (h * OTE.ANCHOR) / layout.scale;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (state.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#241033");
    sky.addColorStop(1, "#120814");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 22; i += 1) {
      const px = (i * 97 + 20) % w;
      const py = wrap(i * 61 - cameraY * layout.scale * 0.22, h + 30) - 15;
      ctx.globalAlpha = 0.18 + (i % 3) * 0.06;
      ctx.fillStyle = i % 2 ? "#ff8aa8" : "#5dffe1";
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#160a1c";
    ctx.fillRect(layout.left, 0, layout.shaftW, h);
    ctx.strokeStyle = "#1a0a10";
    ctx.lineWidth = 6;
    ctx.strokeRect(layout.left + 3, 3, layout.shaftW - 6, h - 6);

    const graceFade = Math.max(0, 1 - state.player.y / OTE.GRACE_Y);
    if (graceFade > 0.02) {
      OTE.LANES.forEach(function (lane, index) {
        const x = layout.left + lane * layout.scale;
        const active = index === state.player.side;
        ctx.globalAlpha = (active ? 0.9 : 0.35) * graceFade;
        ctx.fillStyle = active ? "#ffe14a" : "#5dffe1";
        ctx.beginPath();
        ctx.ellipse(x, h * OTE.ANCHOR + state.player.r * layout.scale + 16, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    if (state.speed > 75) {
      ctx.globalAlpha = Math.min(0.18, (state.speed - 75) / 500);
      ctx.fillStyle = "#fff6e4";
      const gap = 36;
      const offset = wrap(-cameraY * layout.scale * 1.4, gap);
      for (let y = offset; y < h; y += gap) {
        ctx.fillRect(layout.left + 12, y, layout.shaftW - 24, 2);
      }
      ctx.globalAlpha = 1;
    }

    state.obstacles.forEach(function (ob) {
      drawObstacle(ctx, layout, cameraY, ob);
    });

    state.player.trail.forEach(function (point, index) {
      const screen = worldPoint(layout, cameraY, point.x, point.y);
      const alpha = (index + 1) / state.player.trail.length;
      ctx.globalAlpha = alpha * 0.28;
      ctx.fillStyle = "#ffe14a";
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, state.player.r * layout.scale * 0.45 * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    state.particles.forEach(function (particle) {
      const screen = worldPoint(layout, cameraY, particle.x, particle.y);
      ctx.globalAlpha = Math.max(0, particle.life / particle.max);
      ctx.fillStyle = particle.color;
      ctx.fillRect(screen.x, screen.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;

    const playerScreen = worldPoint(layout, cameraY, state.player.x, state.player.y);
    const bob = state.mode === "intro" ? Math.sin(state.clock * 4) * 5 : 0;
    OTE.drawPlayer(
      ctx,
      playerScreen.x,
      playerScreen.y + bob,
      state.player.r * layout.scale,
      state.player.lean,
      state.player.dead
    );

    ctx.font = "800 26px " + state.font;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    state.floaters.forEach(function (floater) {
      const screen = worldPoint(layout, cameraY, floater.x, floater.y);
      ctx.globalAlpha = Math.max(0, floater.life / floater.max);
      ctx.strokeStyle = "#1a0a10";
      ctx.fillStyle = "#fff6e4";
      ctx.strokeText(floater.text, screen.x, screen.y);
      ctx.fillText(floater.text, screen.x, screen.y);
    });
    ctx.globalAlpha = 1;

    const scrim = ctx.createLinearGradient(0, 0, 0, h * 0.24);
    scrim.addColorStop(0, "rgba(18, 8, 20, 0.94)");
    scrim.addColorStop(1, "rgba(18, 8, 20, 0)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h * 0.24);

    state.confetti.forEach(function (bit) {
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.rot);
      ctx.globalAlpha = Math.max(0, bit.life / bit.max);
      ctx.fillStyle = bit.color;
      ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h);
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    if (state.danger > 0.04) {
      const vignette = ctx.createRadialGradient(w / 2, h * 0.35, h * 0.15, w / 2, h * 0.4, h * 0.72);
      vignette.addColorStop(0, "rgba(255, 59, 107, 0)");
      vignette.addColorStop(1, "rgba(255, 59, 107, " + (state.danger * 0.5).toFixed(3) + ")");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    if (state.flash > 0.01) {
      ctx.fillStyle = "rgba(255, 246, 228, " + (state.flash * 0.42).toFixed(3) + ")";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  };

  function worldPoint(layout, cameraY, x, y) {
    return {
      x: layout.left + x * layout.scale,
      y: (y - cameraY) * layout.scale,
    };
  }

  function drawObstacle(ctx, layout, cameraY, ob) {
    const top = (ob.y - cameraY) * layout.scale;
    const height = ob.h * layout.scale;
    if (top > layout.viewH + 40 || top + height < -40) return;
    const gapLeft = layout.left + (ob.gapCenter - ob.gapWidth / 2) * layout.scale;
    const gapRight = layout.left + (ob.gapCenter + ob.gapWidth / 2) * layout.scale;
    const shaftRight = layout.left + layout.shaftW;
    ctx.save();
    ctx.globalAlpha = ob.dangerous ? 1 : 0.38;
    ctx.fillStyle = ob.dangerous ? "rgba(93, 255, 225, 0.3)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(gapLeft, top, Math.max(0, gapRight - gapLeft), height);
    const fill = ob.hit ? "#fff6e4" : ob.repeat ? "#ff7a18" : ob.dangerous ? "#ff3b6b" : "#6a4d78";
    paintWall(ctx, layout.left, top, gapLeft - layout.left, height, fill, ob.hit);
    paintWall(ctx, gapRight, top, shaftRight - gapRight, height, fill, ob.hit);
    ctx.restore();
  }

  function paintWall(ctx, x, y, w, h, fill, hit) {
    if (w < 1 || h < 1) return;
    if (!roundRect(ctx, x, y, w, h, 10)) return;
    ctx.fillStyle = fill;
    ctx.fill();
    const pattern = stripePattern(ctx);
    if (pattern && !hit) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = pattern;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    if (roundRect(ctx, x + 4, y + 3, Math.max(0, w - 8), Math.min(12, h * 0.28), 6)) ctx.fill();
    ctx.lineWidth = hit ? 6 : 4;
    ctx.strokeStyle = "#1a0a10";
    if (roundRect(ctx, x, y, w, h, 10)) ctx.stroke();
  }
})(window);
