(function (root) {
  "use strict";
  const OTE = (root.OTE = root.OTE || {});

  OTE.createLevel = function createLevel(seed) {
    return {
      rand: OTE.mulberry32(seed),
      obstacles: [],
      nextY: 120,
      lastSide: null,
      dangerousCount: 0,
    };
  };

  OTE.speedAt = function speedAt(y) {
    if (y < OTE.GRACE_Y) return OTE.BASE_SPEED;
    const beyond = y - OTE.GRACE_Y;
    return Math.min(OTE.MAX_SPEED, OTE.BASE_SPEED + beyond * 0.04);
  };

  function spacingFor(y) {
    if (y < OTE.GRACE_Y) return 86;
    const k = Math.min(1, (y - OTE.GRACE_Y) / 3600);
    return 100 - k * 42;
  }

  function makeObstacle(level, y) {
    if (y < OTE.GRACE_Y) {
      return {
        y: y,
        h: 14,
        gapCenter: 50,
        gapWidth: 96,
        dangerous: false,
        side: -1,
        repeat: false,
        cleared: false,
        hit: false,
        minClear: 99,
      };
    }

    const k = Math.min(1, (y - OTE.GRACE_Y) / 2800);
    const k2 = Math.min(1, Math.max(0, (y - OTE.GRACE_Y - 2800) / 3000));
    const ratio = 0.58 - k * 0.18 - k2 * 0.06;
    const previous = level.lastSide;
    let side = 0;
    if (level.dangerousCount === 0) side = 0;
    else {
      const doubleChance = 0.16 + Math.min(1, (y - OTE.GRACE_Y) / 2200) * 0.14;
      side = level.rand() < doubleChance ? previous : 1 - previous;
    }
    const gapWidth = ratio * OTE.WORLD_W;
    const gapCenter = OTE.LANES[side] + (level.rand() - 0.5) * 3;
    const height = 15 + level.rand() * (6 + k * 4);
    level.lastSide = side;
    level.dangerousCount += 1;
    return {
      y: y,
      h: height,
      gapCenter: gapCenter,
      gapWidth: gapWidth,
      dangerous: true,
      side: side,
      repeat: previous != null && side === previous,
      cleared: false,
      hit: false,
      minClear: 99,
    };
  }

  OTE.ensureLevel = function ensureLevel(level, y) {
    let guard = 0;
    while (level.nextY < y + 240 && guard < 16) {
      level.obstacles.push(makeObstacle(level, level.nextY));
      level.nextY += Math.max(40, spacingFor(level.nextY));
      guard += 1;
    }
    const keep = y - 120;
    while (level.obstacles.length && level.obstacles[0].y + level.obstacles[0].h < keep) {
      level.obstacles.shift();
    }
  };

  function circleHitsRect(cx, cy, radius, rx, ry, rw, rh) {
    if (rw <= 0 || rh <= 0) return false;
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy < radius * radius;
  }

  OTE.hitsObstacle = function hitsObstacle(player, obstacle) {
    if (!obstacle.dangerous) return false;
    const radius = player.r * 0.8;
    const gapLeft = obstacle.gapCenter - obstacle.gapWidth / 2;
    const gapRight = obstacle.gapCenter + obstacle.gapWidth / 2;
    const walls = [
      [0, obstacle.y, gapLeft, obstacle.h],
      [gapRight, obstacle.y, OTE.WORLD_W - gapRight, obstacle.h],
    ];
    for (let i = 0; i < walls.length; i += 1) {
      const wall = walls[i];
      if (circleHitsRect(player.x, player.y, radius, wall[0], wall[1], wall[2], wall[3])) return true;
    }
    return false;
  };

  OTE.trackClearance = function trackClearance(player, obstacle) {
    if (!obstacle.dangerous || obstacle.cleared) return;
    const radius = player.r * 0.8;
    if (player.y + radius < obstacle.y || player.y - radius > obstacle.y + obstacle.h) return;
    const gapLeft = obstacle.gapCenter - obstacle.gapWidth / 2;
    const gapRight = obstacle.gapCenter + obstacle.gapWidth / 2;
    const left = player.x - radius - gapLeft;
    const right = gapRight - (player.x + radius);
    obstacle.minClear = Math.min(obstacle.minClear, left, right);
  };
})(window);
