/* Backrooms-style raycaster maze — arrow keys to move */
(function (global) {
  'use strict';

  var MAP = [
    '1111111111111111111111111',
    '1000000010000000000000001',
    '1011111010111111101111101',
    '1010001010101000101000101',
    '1010111110101011101011101',
    '1000100000101000001000001',
    '1110101111101011111010111',
    '1000101010000000111010101',
    '1011101000000000000010111',
    '1000001000000000000010001',
    '1010111000000000000010111',
    '1000001000000000000010001',
    '1011101000000000000010111',
    '1000101010000000111010101',
    '1110101111101011111010111',
    '1000100000101000001000001',
    '1010111110101011101011101',
    '1010001010101000101000101',
    '1011111010111111101111101',
    '1000000000000000000000001',
    '1011111111111111101111101',
    '1000000000000000000000002',
    '1111111111111111111111111'
  ];

  var FOV = Math.PI / 3;
  var MOVE_SPEED = 0.055;
  var ROT_SPEED = 0.045;
  var MAX_DIST = 28;
  var WALL_TEX = null;
  var TOMATO_IMG = null;
  var CHICKEN_IMG = null;
  var active = null;

  var CORRIDOR_EVENTS = [
    {
      id: 'hub-east',
      minX: 9, maxX: 16.5, minY: 9.4, maxY: 12.6,
      spawnX: 17.55, spawnY: 10.6,
      fleeAngle: 0,
      minDist: 3.5, maxDist: 12
    },
    {
      id: 'hub-west',
      minX: 9, maxX: 16.5, minY: 9.4, maxY: 12.6,
      spawnX: 7.45, spawnY: 11.4,
      fleeAngle: Math.PI,
      minDist: 3.5, maxDist: 12
    },
    {
      id: 'lower-east',
      minX: 6, maxX: 20, minY: 18.6, maxY: 20.4,
      spawnX: 22.4, spawnY: 19.5,
      fleeAngle: 0,
      minDist: 4, maxDist: 14
    }
  ];

  /* Chicken dash scare zones — cross-axis sprint, cannot catch player */
  var SCARE_ZONES = [
    { minX: 7.5, maxX: 18.5, minY: 9, maxY: 13, axis: 'x', fixed: 10.8, from: 7.6, to: 18.4 },
    { minX: 7.5, maxX: 18.5, minY: 9, maxY: 13, axis: 'x', fixed: 11.6, from: 18.4, to: 7.6 },
    { minX: 0.5, maxX: 7, minY: 1, maxY: 5.5, axis: 'y', fixed: 3.2, from: 1.2, to: 5.2 },
    { minX: 17.5, maxX: 24, minY: 14, maxY: 19, axis: 'y', fixed: 20.5, from: 14.2, to: 18.8 },
    { minX: 8, maxX: 16, minY: 17, maxY: 20.5, axis: 'x', fixed: 18.5, from: 8.2, to: 15.8 }
  ];

  var CEIL_BASE = { r: 232, g: 218, b: 168 };
  var FLOOR_BASE = { r: 220, g: 202, b: 142 };
  var GRID_BROWN = { r: 148, g: 128, b: 92 };
  var FOG_COLOR = { r: 168, g: 198, b: 224 };

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function loadTexture(src) {
    return loadImage(src).then(function (img) {
      if (!img) return null;
      var c = document.createElement('canvas');
      c.width = img.height;
      c.height = img.width;
      var g = c.getContext('2d');
      g.translate(c.width, 0);
      g.rotate(Math.PI / 2);
      g.drawImage(img, 0, 0);
      return c;
    });
  }

  function cell(map, x, y) {
    var mx = Math.floor(x);
    var my = Math.floor(y);
    if (my < 0 || my >= map.length || mx < 0 || mx >= map[0].length) return 1;
    return map[my].charCodeAt(mx) - 48;
  }

  function distTo(px, py, tx, ty) {
    var dx = tx - px;
    var dy = ty - py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function findCorridorTrigger(px, py) {
    var best = null;
    var bestDist = Infinity;
    var i;
    for (i = 0; i < CORRIDOR_EVENTS.length; i++) {
      var c = CORRIDOR_EVENTS[i];
      if (px < c.minX || px > c.maxX || py < c.minY || py > c.maxY) continue;
      var d = distTo(px, py, c.spawnX, c.spawnY);
      if (d >= c.minDist && d <= c.maxDist && d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  }

  function findScareZone(px, py) {
    var i;
    for (i = 0; i < SCARE_ZONES.length; i++) {
      var z = SCARE_ZONES[i];
      if (px >= z.minX && px <= z.maxX && py >= z.minY && py <= z.maxY) return z;
    }
    return null;
  }

  function castRay(map, px, py, angle, maxDist) {
    var sin = Math.sin(angle);
    var cos = Math.cos(angle);
    var dist = 0;
    var step = 0.02;
    var prevX = px;
    var prevY = py;
    while (dist < maxDist) {
      dist += step;
      var x = px + cos * dist;
      var y = py + sin * dist;
      var c = cell(map, x, y);
      if (c > 0) {
        var side = Math.abs(x - prevX) > Math.abs(y - prevY) ? 'x' : 'y';
        var texU = side === 'x'
          ? ((y % 1) + 1) % 1
          : ((x % 1) + 1) % 1;
        return { dist: dist, cell: c, x: x, y: y, side: side, texU: texU };
      }
      prevX = x;
      prevY = y;
    }
    return {
      dist: maxDist,
      cell: 0,
      x: px + cos * maxDist,
      y: py + sin * maxDist,
      side: 'x',
      texU: 0
    };
  }

  function atmosphere(dist) {
    var t = Math.min(1, dist / MAX_DIST);
    var bright = Math.max(0.14, 1 - t * 0.88);
    return { t: t, bright: bright };
  }

  function mixFog(r, g, b, fog) {
    var f = fog.t * 0.72;
    return {
      r: Math.round(r * fog.bright * (1 - f) + FOG_COLOR.r * f),
      g: Math.round(g * fog.bright * (1 - f) + FOG_COLOR.g * f),
      b: Math.round(b * fog.bright * (1 - f) + FOG_COLOR.b * f)
    };
  }

  function ceilingRgb(wx, wy, fog) {
    var tx = Math.floor(wx);
    var ty = Math.floor(wy);
    var fx = wx - tx;
    var fy = wy - ty;
    var edge = 0.045;
    var onGrid = fx < edge || fy < edge || fx > 1 - edge || fy > 1 - edge;

    var checker = ((tx + ty) % 2) === 0;
    var lightPad = 0.22;
    var glowPad = 0.38;
    var inCore = checker
      && fx > 0.5 - lightPad && fx < 0.5 + lightPad
      && fy > 0.5 - lightPad && fy < 0.5 + lightPad;
    var inGlow = checker
      && fx > 0.5 - glowPad && fx < 0.5 + glowPad
      && fy > 0.5 - glowPad && fy < 0.5 + glowPad;

    if (inCore) {
      var coreB = Math.round(255 * (1 - fog.t * 0.35));
      return { r: coreB, g: coreB, b: coreB };
    }
    if (inGlow) {
      var gx = Math.max(fx, 1 - fx, 0.5) - 0.5;
      var gy = Math.max(fy, 1 - fy, 0.5) - 0.5;
      var edgeDist = Math.max(gx / glowPad, gy / glowPad);
      var t = Math.min(1, edgeDist);
      var baseR = onGrid ? GRID_BROWN.r : CEIL_BASE.r;
      var baseG = onGrid ? GRID_BROWN.g : CEIL_BASE.g;
      var baseB = onGrid ? GRID_BROWN.b : CEIL_BASE.b;
      return mixFog(
        Math.round(baseR + (255 - baseR) * (1 - t) * 0.9),
        Math.round(baseG + (255 - baseG) * (1 - t) * 0.9),
        Math.round(baseB + (255 - baseB) * (1 - t) * 0.9),
        fog
      );
    }

    var r = onGrid ? GRID_BROWN.r : CEIL_BASE.r;
    var g = onGrid ? GRID_BROWN.g : CEIL_BASE.g;
    var b = onGrid ? GRID_BROWN.b : CEIL_BASE.b;
    return mixFog(r, g, b, fog);
  }

  function floorRgb(wx, wy, fog) {
    var n = ((Math.floor(wx * 8) + Math.floor(wy * 8)) % 5) * 3;
    return mixFog(FLOOR_BASE.r - n, FLOOR_BASE.g - n, FLOOR_BASE.b - n, fog);
  }

  function setPx(buf, w, x, y, c) {
    var i = (y * w + x) * 4;
    buf[i] = c.r;
    buf[i + 1] = c.g;
    buf[i + 2] = c.b;
    buf[i + 3] = 255;
  }

  function drawWallColumn(ctx, x, colW, y0, wallH, texU, fog, isExit, sideShade) {
    var shade = fog.bright * sideShade;
    var alpha = shade * (1 - fog.t * 0.4);
    if (isExit) {
      ctx.fillStyle = 'rgb('
        + Math.round(140 * shade) + ','
        + Math.round(230 * shade) + ','
        + Math.round(150 * shade) + ')';
      ctx.fillRect(x, y0, colW + 1, wallH);
      return;
    }
    if (!WALL_TEX) {
      ctx.fillStyle = 'rgb('
        + Math.round(196 * shade) + ','
        + Math.round(212 * shade) + ','
        + Math.round(106 * shade) + ')';
      ctx.fillRect(x, y0, colW + 1, wallH);
      return;
    }
    var tw = WALL_TEX.width;
    var sx = Math.floor(texU * tw) % tw;
    ctx.globalAlpha = alpha;
    ctx.drawImage(WALL_TEX, sx, 0, 1, WALL_TEX.height, x, y0, colW + 1, wallH);
    ctx.globalAlpha = 1;
  }

  function drawBillboard(ctx, state, sx, sy, img, alpha, flipX) {
    if (!img || alpha <= 0.01) return;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    var halfH = h / 2;
    var dx = sx - state.px;
    var dy = sy - state.py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5 || dist > MAX_DIST) return;
    var angle = Math.atan2(dy, dx) - state.pa;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    if (Math.abs(angle) > FOV * 0.62) return;
    var screenX = (0.5 + angle / FOV) * w;
    var spriteH = Math.min(h * 0.45, (h / dist) * 0.26);
    var spriteW = spriteH * (img.width / img.height);
    var fog = atmosphere(dist);
    var a = alpha * fog.bright * (1 - fog.t * 0.55);
    var footY = halfH + spriteH * 0.08;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.translate(screenX, footY - spriteH);
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -spriteW / 2, 0, spriteW, spriteH);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function startTomatoEvent(state, corridor) {
    state.tomatoPhase = 'peek';
    state.tomatoX = corridor.spawnX;
    state.tomatoY = corridor.spawnY;
    state.tomatoFleeAngle = corridor.fleeAngle;
    state.tomatoFlip = Math.cos(corridor.fleeAngle) < 0;
    state.tomatoAlpha = 0;
    state.tomatoTimer = 0;
    state.tomatoCorridorId = corridor.id;
  }

  function updateTomato(state) {
    if (state.tomatoPhase === 'done') return;

    if (state.tomatoPhase === 'wait') {
      var corridor = findCorridorTrigger(state.px, state.py);
      if (corridor) startTomatoEvent(state, corridor);
      return;
    }

    if (state.tomatoPhase === 'peek') {
      state.tomatoTimer += 1;
      if (state.tomatoTimer <= 8) {
        state.tomatoAlpha = state.tomatoTimer / 8;
      } else if (state.tomatoTimer <= 28) {
        state.tomatoAlpha = 1;
      } else {
        state.tomatoPhase = 'scurry';
        state.tomatoTimer = 0;
      }
      return;
    }

    if (state.tomatoPhase === 'scurry') {
      state.tomatoTimer += 1;
      var speed = 0.042;
      state.tomatoX += Math.cos(state.tomatoFleeAngle) * speed;
      state.tomatoY += Math.sin(state.tomatoFleeAngle) * speed;
      state.tomatoAlpha = Math.max(0, 1 - state.tomatoTimer / 72);
      if (state.tomatoTimer >= 72 || state.tomatoAlpha <= 0) {
        state.tomatoPhase = 'done';
        state.tomatoAlpha = 0;
      }
    }
  }

  function startChickenScare(state, zone) {
    state.chickenScarePhase = 'run';
    state.chickenScareZone = zone;
    state.chickenScareTimer = 0;
    state.chickenScareAlpha = 1;
    state.chickenScareFlip = zone.from > zone.to;
    if (zone.axis === 'x') {
      state.chickenScareX = zone.from;
      state.chickenScareY = zone.fixed;
    } else {
      state.chickenScareX = zone.fixed;
      state.chickenScareY = zone.from;
    }
    state.chickenScareCooldown = 180 + Math.floor(Math.random() * 200);
  }

  function updateChickenScare(state) {
    if (state.chickenScareCooldown > 0) state.chickenScareCooldown -= 1;

    if (state.chickenScarePhase === 'done' || state.chickenScarePhase === 'idle') {
      if (state.chickenScareCooldown > 0 || state.escapePhase !== 'play') return;
      if (Math.random() > 0.014) return;
      var zone = findScareZone(state.px, state.py);
      if (zone && CHICKEN_IMG) startChickenScare(state, zone);
      return;
    }

    if (state.chickenScarePhase === 'run') {
      var zone = state.chickenScareZone;
      var speed = 0.11;
      state.chickenScareTimer += 1;
      var t = state.chickenScareTimer / 28;
      if (zone.axis === 'x') {
        state.chickenScareX = zone.from + (zone.to - zone.from) * Math.min(1, t);
        state.chickenScareY = zone.fixed;
      } else {
        state.chickenScareY = zone.from + (zone.to - zone.from) * Math.min(1, t);
        state.chickenScareX = zone.fixed;
      }
      if (t >= 1) {
        state.chickenScareAlpha = Math.max(0, 1 - (state.chickenScareTimer - 28) / 12);
        if (state.chickenScareTimer >= 40) {
          state.chickenScarePhase = 'done';
          state.chickenScareAlpha = 0;
          state.chickenScareCooldown = 200 + Math.floor(Math.random() * 240);
        }
      }
    }
  }

  function drawHud(state, w, h) {
    if (state.escapePhase !== 'play') return;
    var ctx = state.ctx;

    ctx.fillStyle = 'rgba(26,36,33,0.55)';
    ctx.fillRect(8, 8, 210, 44);
    ctx.fillStyle = '#faf9f6';
    ctx.font = '500 11px DM Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Arrow keys — move & turn', 16, 26);
    ctx.fillText('Find the green exit wall', 16, 40);
  }

  function render(state) {
    var ctx = state.ctx;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    var map = state.map;
    var px = state.px;
    var py = state.py;
    var pa = state.pa;
    var halfH = h / 2;
    var numRays = Math.max(100, Math.floor(w / 2));
    var colW = Math.max(1, Math.ceil(w / numRays));
    var halfFov = FOV / 2;

    if (!state.frame || state.frame.width !== w || state.frame.height !== h) {
      state.frame = ctx.createImageData(w, h);
    }
    var buf = state.frame.data;

    var y;
    for (y = 0; y < h; y++) {
      if (y === halfH) continue;
      var rowDist = (halfH * 0.92) / Math.abs(halfH - y);
      var fog = atmosphere(rowDist);
      var isCeil = y < halfH;
      var x0 = 0;
      var i;
      for (i = 0; i < numRays; i++) {
        var rayAngle = pa - halfFov + (i / numRays) * FOV;
        var wx = px + Math.cos(rayAngle) * rowDist;
        var wy = py + Math.sin(rayAngle) * rowDist;
        var c = isCeil ? ceilingRgb(wx, wy, fog) : floorRgb(wx, wy, fog);
        var x1 = Math.min(w, Math.round((i + 1) * colW));
        var xi;
        for (xi = x0; xi < x1; xi++) {
          setPx(buf, w, xi, y, c);
        }
        x0 = x1;
      }
    }

    ctx.putImageData(state.frame, 0, 0);

    for (var j = 0; j < numRays; j++) {
      var ang = pa - halfFov + (j / numRays) * FOV;
      var hit = castRay(map, px, py, ang, MAX_DIST);
      var dist = hit.dist * Math.cos(ang - pa);
      if (dist < 0.001) dist = 0.001;
      var wallH = Math.min(h, h / dist);
      var top = Math.max(0, halfH - wallH / 2);
      var drawH = Math.min(h - top, wallH);
      var fogWall = atmosphere(dist);
      var sideShade = hit.side === 'x' ? 0.82 : 1;
      drawWallColumn(ctx, j * colW, colW, top, drawH, hit.texU, fogWall, hit.cell === 2, sideShade);
    }

    if (TOMATO_IMG && (state.tomatoPhase === 'peek' || state.tomatoPhase === 'scurry')) {
      drawBillboard(ctx, state, state.tomatoX, state.tomatoY, TOMATO_IMG, state.tomatoAlpha, state.tomatoFlip);
    }

    if (CHICKEN_IMG && state.chickenScarePhase === 'run' && state.chickenScareAlpha > 0) {
      drawBillboard(ctx, state, state.chickenScareX, state.chickenScareY, CHICKEN_IMG, state.chickenScareAlpha, state.chickenScareFlip);
    }

    drawHud(state, w, h);

    if (state.escapePhase === 'fade' || state.escapePhase === 'done') {
      ctx.fillStyle = 'rgba(255,255,255,' + state.fadeWhite + ')';
      ctx.fillRect(0, 0, w, h);
    }

    if (state.escapePhase === 'done') {
      ctx.fillStyle = 'rgba(250,249,246,0.92)';
      ctx.fillRect(0, h * 0.36, w, h * 0.28);
      ctx.fillStyle = '#1e3d34';
      ctx.font = '600 20px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You escaped the backrooms.', w / 2, h * 0.47);
      ctx.font = '500 13px DM Sans, sans-serif';
      ctx.fillStyle = '#5a6b65';
      var timeLabel = state.escapeTimeMs != null && window.GuestLeaderboard
        ? 'Time: ' + GuestLeaderboard.formatScore('backrooms', state.escapeTimeMs)
        : '';
      if (timeLabel) ctx.fillText(timeLabel, w / 2, h * 0.54);
      ctx.fillText('Press Esc to leave.', w / 2, h * 0.58);
    }
  }

  function tick(state) {
    if (!state.running) return;

    if (state.escapePhase === 'fade') {
      state.fadeWhite = Math.min(1, (performance.now() - state.fadeStart) / 1500);
      if (state.fadeWhite >= 1) {
        state.escapePhase = 'done';
        if (!state.escapePromptShown && typeof state.onEscapeDone === 'function') {
          state.escapePromptShown = true;
          state.onEscapeDone(state.escapeTimeMs);
        }
      }
      render(state);
      state.raf = requestAnimationFrame(function () { tick(state); });
      return;
    }

    if (state.escapePhase !== 'done') {
      var keys = state.keys;
      var nx = state.px;
      var ny = state.py;
      var pa = state.pa;

      if (keys.ArrowLeft) pa -= ROT_SPEED;
      if (keys.ArrowRight) pa += ROT_SPEED;

      var forward = 0;
      if (keys.ArrowUp) forward = 1;
      if (keys.ArrowDown) forward = -1;

      if (forward) {
        var tx = nx + Math.cos(pa) * MOVE_SPEED * forward;
        var ty = ny + Math.sin(pa) * MOVE_SPEED * forward;
        if (cell(state.map, tx, ny) === 0 || cell(state.map, tx, ny) === 2) nx = tx;
        if (cell(state.map, nx, ty) === 0 || cell(state.map, nx, ty) === 2) ny = ty;
      }

      state.px = nx;
      state.py = ny;
      state.pa = pa;

      updateTomato(state);
      updateChickenScare(state);

      if (cell(state.map, nx, ny) === 2 && state.escapePhase === 'play') {
        state.escapePhase = 'fade';
        state.fadeStart = performance.now();
        state.fadeWhite = 0;
        state.keys = {};
        state.escapeTimeMs = performance.now() - (state.startTime || performance.now());
        if (typeof state.onEscape === 'function') {
          state.onEscape(state.escapeTimeMs);
        }
      }
    }

    render(state);
    state.raf = requestAnimationFrame(function () { tick(state); });
  }

  function onKey(state, e, down) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      state.keys[e.key] = down;
    }
  }

  function start(canvas, opts) {
    stop();
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var resize = function () {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    };
    resize();

    var state = {
      canvas: canvas,
      ctx: ctx,
      map: MAP,
      px: 1.5,
      py: 1.5,
      pa: 0,
      keys: {},
      running: true,
      escapePhase: 'play',
      fadeWhite: 0,
      fadeStart: 0,
      startTime: performance.now(),
      escapeTimeMs: null,
      escapePromptShown: false,
      onEscape: opts.onEscape || null,
      onEscapeDone: opts.onEscapeDone || null,
      tomatoPhase: 'wait',
      tomatoX: 0,
      tomatoY: 0,
      tomatoFleeAngle: 0,
      tomatoFlip: false,
      tomatoAlpha: 0,
      tomatoTimer: 0,
      tomatoCorridorId: null,
      chickenScarePhase: 'idle',
      chickenScareX: 0,
      chickenScareY: 0,
      chickenScareAlpha: 0,
      chickenScareTimer: 0,
      chickenScareFlip: false,
      chickenScareZone: null,
      chickenScareCooldown: 90,
      frame: null,
      resize: resize,
      onKeyDown: null,
      onKeyUp: null,
      raf: null
    };

    state.onKeyDown = function (e) { onKey(state, e, true); };
    state.onKeyUp = function (e) { onKey(state, e, false); };
    window.addEventListener('keydown', state.onKeyDown);
    window.addEventListener('keyup', state.onKeyUp);
    window.addEventListener('resize', resize);

    active = state;
    tick(state);
    return state;
  }

  function stop() {
    if (!active) return;
    active.running = false;
    if (active.raf) cancelAnimationFrame(active.raf);
    window.removeEventListener('keydown', active.onKeyDown);
    window.removeEventListener('keyup', active.onKeyUp);
    window.removeEventListener('resize', active.resize);
    active = null;
  }

  loadTexture('images/maze/wall.png').then(function (img) {
    WALL_TEX = img;
  });
  loadImage('images/maze/tomato.png').then(function (img) {
    TOMATO_IMG = img;
  });
  loadImage('assets/game/rooster.gif').then(function (img) {
    CHICKEN_IMG = img;
  });

  global.BackroomsMaze = { start: start, stop: stop };
})(window);
