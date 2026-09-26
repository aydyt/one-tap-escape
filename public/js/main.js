(function () {
  "use strict";
  const OTE = window.OTE;
  const $ = function (id) { return document.getElementById(id); };
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const ui = {
    topHud: $("hud"),
    score: $("score"),
    bestInline: $("best-inline"),
    mode: $("mode-tag"),
    banner: $("banner"),
    intro: $("intro"),
    introSub: $("intro-sub"),
    count: $("count"),
    result: $("result"),
    card: $("card"),
    badge: $("badge"),
    resultScore: $("result-score"),
    roast: $("result-roast"),
    friend: $("result-friend"),
    daily: $("result-daily"),
    best: $("result-best"),
    again: $("btn-again"),
    challenge: $("btn-challenge"),
    save: $("btn-save"),
    preview: $("preview"),
    previewImg: $("preview-img"),
    previewClose: $("preview-close"),
    toast: $("toast"),
  };

  const BEST_KEY = "ote-v1-best";
  const DAILY_PREFIX = "ote-v1-daily-";
  const params = OTE.readChallenge();
  const seed = OTE.hashString("one-tap-escape:" + params.seedKey);
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let state = "intro";
  let clock = 0;
  let introLeft = 3;
  let lastCount = 3;
  let player = null;
  let level = null;
  let particles = [];
  let floaters = [];
  let confetti = [];
  let shake = 0;
  let flash = 0;
  let danger = 0;
  let deathTimer = 0;
  let beaten = false;
  let score = 0;
  let shownScore = -1;
  let bestAtStart = 0;
  let dailyAtStart = 0;
  let currentSpeed = OTE.BASE_SPEED;
  let runToken = 0;
  let toastTimer = 0;
  let last = performance.now();
  let hidden = false;
  let dpr = 1;
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;

  const store = {
    get: function (key) {
      try {
        return Number(localStorage.getItem(key)) || 0;
      } catch (error) {
        return 0;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch (error) {
        /* private mode */
      }
    },
  };

  function resetRun() {
    player = {
      x: OTE.LANES[0],
      y: 0,
      r: OTE.PLAYER_R,
      side: 0,
      lean: 0,
      dead: false,
      trail: [],
    };
    level = OTE.createLevel(seed);
    OTE.ensureLevel(level, 0);
    particles = [];
    floaters = [];
    confetti = [];
    shake = 0;
    flash = 0;
    danger = 0;
    deathTimer = 0;
    beaten = false;
    score = 0;
    shownScore = -1;
    currentSpeed = OTE.BASE_SPEED;
    bestAtStart = store.get(BEST_KEY);
    dailyAtStart = params.isToday ? store.get(DAILY_PREFIX + params.today) : 0;
    ui.score.textContent = "0";
    ui.badge.hidden = true;
    ui.card.classList.remove("win");
    ui.preview.hidden = true;
    if (params.friend != null) {
      ui.banner.hidden = false;
      ui.banner.classList.remove("win");
      ui.banner.textContent = "好友拿到了 " + params.friend + " 分，你能超过吗？";
    }
  }

  function showIntro() {
    state = "intro";
    introLeft = 3;
    lastCount = 3;
    ui.count.textContent = "3";
    ui.intro.hidden = false;
    ui.topHud.hidden = true;
    ui.result.hidden = true;
    ui.mode.textContent = params.isToday ? "今日同一关" : "关卡 " + OTE.formatSeed(params.seedKey);
    ui.introSub.textContent = params.friend != null ? "好友正在等你超过" : "看你能撑多久";
    if (params.friend != null) {
      ui.banner.hidden = false;
      ui.banner.classList.remove("win");
      ui.banner.textContent = "好友拿到了 " + params.friend + " 分，你能超过吗？";
    } else {
      ui.banner.hidden = true;
    }
  }

  function beginPlay() {
    state = "play";
    ui.intro.hidden = true;
    ui.topHud.hidden = false;
    ui.result.hidden = true;
    OTE.audio.go();
  }

  function moveX(dt) {
    const target = OTE.LANES[player.side];
    const dx = target - player.x;
    const step = OTE.MOVE_SPEED * dt;
    if (Math.abs(dx) <= step) player.x = target;
    else player.x += Math.sign(dx) * step;
    player.lean = Math.max(-1, Math.min(1, (target - player.x) / 18));
  }

  function maybeTrail() {
    const lastPoint = player.trail[player.trail.length - 1];
    if (!lastPoint || Math.abs(lastPoint.x - player.x) > 0.6 || Math.abs(lastPoint.y - player.y) > 1.2) {
      player.trail.push({ x: player.x, y: player.y });
      if (player.trail.length > 10) player.trail.shift();
    }
  }

  function updateIntro(dt) {
    moveX(dt);
    maybeTrail();
    introLeft -= dt;
    const shown = Math.max(1, Math.ceil(introLeft));
    if (introLeft > 0 && shown !== lastCount) {
      lastCount = shown;
      ui.count.textContent = String(shown);
      OTE.audio.blip();
    }
    if (introLeft <= 0) beginPlay();
  }

  function stepPlay(dt) {
    moveX(dt);
    currentSpeed = OTE.speedAt(player.y);
    player.y += currentSpeed * dt;
    OTE.ensureLevel(level, player.y);
    for (let i = 0; i < level.obstacles.length; i += 1) {
      if (OTE.hitsObstacle(player, level.obstacles[i])) {
        die(level.obstacles[i]);
        return;
      }
    }
    for (let j = 0; j < level.obstacles.length; j += 1) {
      const ob = level.obstacles[j];
      OTE.trackClearance(player, ob);
      if (!ob.cleared && player.y - player.r * 0.8 > ob.y + ob.h) {
        ob.cleared = true;
        onClear(ob);
      }
    }
    score = Math.floor(player.y);
    if (params.friend != null && !beaten && score > params.friend) onBeat();
    maybeTrail();
    updateDanger();
  }

  function updatePlay(dt) {
    const steps = Math.max(1, Math.ceil(dt / 0.016));
    const step = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      if (state !== "play") return;
      stepPlay(step);
    }
  }

  function updateDanger() {
    danger *= 0.9;
    const next = level.obstacles.find(function (ob) {
      return ob.dangerous && !ob.cleared && ob.y + ob.h > player.y;
    });
    if (!next) return;
    const dist = next.y - player.y;
    const off = Math.abs(player.x - OTE.LANES[next.side]);
    if (dist < 52 && off > 10) {
      danger = Math.max(danger, (1 - dist / 52) * Math.min(1, off / 24));
    }
  }

  function updateDying(dt) {
    deathTimer -= dt;
    if (deathTimer <= 0) showResult();
  }

  function updateFx(dt) {
    if (shake > 0) shake = Math.max(0, shake - dt * 36);
    if (flash > 0) flash = Math.max(0, flash - dt * 1.7);
    particles.forEach(function (particle) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 90 * dt;
      particle.life -= dt;
    });
    particles = particles.filter(function (particle) { return particle.life > 0; });
    floaters.forEach(function (floater) {
      floater.y -= 16 * dt;
      floater.life -= dt;
    });
    floaters = floaters.filter(function (floater) { return floater.life > 0; });
    confetti.forEach(function (bit) {
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
      bit.vy += 520 * dt;
      bit.rot += bit.spin * dt;
      bit.life -= dt;
    });
    confetti = confetti.filter(function (bit) { return bit.life > 0; });
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) ui.toast.hidden = true;
    }
  }

  function updateHud() {
    if (shownScore !== score) {
      shownScore = score;
      ui.score.textContent = String(score);
    }
    if (bestAtStart > 0 && score > bestAtStart) ui.bestInline.textContent = "新纪录";
    else if (bestAtStart > 0) ui.bestInline.textContent = "最高 " + bestAtStart;
    else ui.bestInline.textContent = "";
  }

  function onClear(ob) {
    if (!ob.dangerous) return;
    OTE.audio.pass();
    ui.score.classList.remove("pop");
    void ui.score.offsetWidth;
    ui.score.classList.add("pop");
    if (ob.minClear < 4) {
      spawnFloater("好险");
      OTE.audio.near();
    }
  }

  function onBeat() {
    beaten = true;
    OTE.audio.fanfare();
    ui.banner.hidden = false;
    ui.banner.classList.add("win");
    ui.banner.textContent = "已经超过好友了，稳住";
    spawnFloater("超过了");
    spawnConfetti(24);
  }

  function die(ob) {
    if (state !== "play") return;
    state = "dying";
    player.dead = true;
    if (ob) ob.hit = true;
    deathTimer = 0.72;
    flash = 1;
    shake = reduceMotion ? 0 : 18;
    danger = 1;
    OTE.audio.death();
    try {
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (error) {
      /* ignore */
    }
    burst(player.x, player.y, 34, ["#ffe14a", "#ff3b6b", "#fff6e4", "#5dffe1"]);
  }

  function showResult() {
    if (state === "result") return;
    state = "result";
    const token = ++runToken;
    const roast = OTE.roastFor(score);
    const newBest = Math.max(bestAtStart, score);
    store.set(BEST_KEY, newBest);
    ui.resultScore.textContent = "0";
    ui.roast.textContent = roast;
    ui.best.textContent = "历史最高 " + newBest;
    ui.badge.hidden = !(score > bestAtStart && score > 0);
    if (params.isToday) {
      const newDaily = Math.max(dailyAtStart, score);
      store.set(DAILY_PREFIX + params.today, newDaily);
      ui.daily.textContent = "今日最高 " + newDaily;
    } else {
      ui.daily.textContent = "关卡 " + OTE.formatSeed(params.seedKey);
    }
    const line = OTE.friendLine(score, params.friend);
    ui.friend.hidden = !line;
    ui.friend.textContent = line;
    ui.card.classList.toggle("win", params.friend != null && score > params.friend);
    ui.result.hidden = false;
    if (params.friend != null && score > params.friend) spawnConfetti(36);
    const started = performance.now();
    const tick = function (now) {
      if (token !== runToken) return;
      const k = Math.min(1, (now - started) / 480);
      const eased = 1 - Math.pow(1 - k, 3);
      ui.resultScore.textContent = String(Math.round(score * eased));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function again() {
    runToken += 1;
    ui.result.hidden = true;
    resetRun();
    beginPlay();
  }

  function burst(x, y, count, colors) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 70;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 4,
      });
    }
    if (particles.length > 90) particles.splice(0, particles.length - 90);
  }

  function spawnFloater(text) {
    floaters.push({
      x: player.x,
      y: player.y - 12,
      text: text,
      life: 0.7,
      max: 0.7,
    });
  }

  function spawnConfetti(count) {
    const colors = ["#ffe14a", "#ff3b6b", "#5dffe1", "#fff6e4", "#ff7a18"];
    for (let i = 0; i < count; i += 1) {
      confetti.push({
        x: viewW * (0.15 + Math.random() * 0.7),
        y: -10 - Math.random() * 40,
        vx: -40 + Math.random() * 80,
        vy: 80 + Math.random() * 180,
        rot: Math.random() * 6,
        spin: -4 + Math.random() * 8,
        w: 8 + Math.random() * 8,
        h: 12 + Math.random() * 10,
        life: 1.3 + Math.random() * 0.6,
        max: 1.9,
        color: colors[i % colors.length],
      });
    }
  }

  function toast(message) {
    ui.toast.hidden = false;
    ui.toast.textContent = message;
    toastTimer = 2.3;
  }

  function cardPayload() {
    const roast = OTE.roastFor(score);
    return {
      score: score,
      roast: roast,
      seedKey: params.seedKey,
      font: font,
      label: params.isToday ? "今日关卡 " + OTE.formatSeed(params.today) : "关卡 " + OTE.formatSeed(params.seedKey),
    };
  }

  function openPreview() {
    const card = OTE.drawShareCard(cardPayload());
    ui.previewImg.src = card.toDataURL("image/png");
    ui.previewImg.alt = "一指逃生 " + score + " 分，长按可保存";
    ui.preview.hidden = false;
  }

  function shareNow() {
    const payload = cardPayload();
    const url = OTE.challengeUrl(score, params.seedKey);
    const text = OTE.shareText(score, payload.roast);
    OTE.shareChallenge(payload).then(function (result) {
      if (result === "shared") toast("已打开分享");
      else toast("挑战链接已复制");
    }).catch(function (error) {
      if (error && error.name === "AbortError") return;
      OTE.copyText(text + " " + url).then(function () {
        toast("挑战链接已复制");
      });
    });
  }

  function onInput(kind) {
    if (kind === "escape") {
      ui.preview.hidden = true;
      return;
    }
    if (state !== "play" && state !== "intro") return;
    OTE.audio.unlock();
    let next = player.side;
    if (kind === "ArrowLeft" || kind === "KeyA") next = 0;
    else if (kind === "ArrowRight" || kind === "KeyD") next = 1;
    else next = 1 - player.side;
    if (next === player.side) return;
    player.side = next;
    OTE.audio.switchSide();
    burst(player.x, player.y, 6, ["#ffe14a", "#fff6e4"]);
  }

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
  }

  function frame(now) {
    if (hidden) {
      last = now;
      requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    if (state === "intro") updateIntro(dt);
    else if (state === "play") updatePlay(dt);
    else if (state === "dying") updateDying(dt);
    updateFx(dt);
    if (state === "play" || state === "dying") updateHud();
    OTE.drawFrame(ctx, {
      viewW: viewW,
      viewH: viewH,
      dpr: dpr,
      font: font,
      clock: clock,
      mode: state,
      player: player,
      obstacles: level.obstacles,
      particles: particles,
      floaters: floaters,
      confetti: confetti,
      shake: shake,
      flash: flash,
      danger: danger,
      speed: currentSpeed,
    });
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", fit);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
  document.addEventListener("visibilitychange", function () {
    hidden = document.hidden;
    last = performance.now();
  });
  window.addEventListener("error", function (event) {
    toast("出错了：" + (event.message || "请刷新再试"));
  });

  OTE.bindInput(onInput);
  ui.again.addEventListener("click", again);
  ui.challenge.addEventListener("click", shareNow);
  ui.save.addEventListener("click", openPreview);
  ui.previewClose.addEventListener("click", function () { ui.preview.hidden = true; });
  ui.preview.addEventListener("click", function (event) {
    if (event.target === ui.preview) ui.preview.hidden = true;
  });

  fit();
  resetRun();
  showIntro();
  requestAnimationFrame(frame);
})();
