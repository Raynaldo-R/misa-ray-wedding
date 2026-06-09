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
    '1000101011111111111010101',
    '1011101000000000000010111',
    '1000001000000000000010001',
    '1011111000000000000011111',
    '1000001000000000000010001',
    '1011101000000000000010111',
    '1000101011111111111010101',
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
  var active = null;

  /* Corridor ends — tomato peeks at far end, then scurries away (one-time) */
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

  var CEIL_BASE = { r: 232, g: 218, b: 168 };
  var FLOOR_BASE = { r: 220, g: 202, b: 142 };
  var GRID_BROWN = { r: 148, g: 128, b: 92 };
  var FOG_COLOR = { r: 196, g: 186, b: 148 };

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
    var bright = Math.max(0.18, 1 - t * 0.82);
    return { t: t, bright: bright };
  }

  function mixFog(r, g, b, fog) {
    var f = fog.t * 0.55;
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
    var lightEvery = 3;
    var lightSize = 0.34;
    var inLightCell = (tx % lightEvery === 1) && (ty % lightEvery === 1);
    var inLight = inLightCell
      && fx > 0.5 - lightSize / 2 && fx < 0.5 + lightSize / 2
      && fy > 0.5 - lightSize / 2 && fy < 0.5 + lightSize / 2;

    if (inLight) {
      var glow = Math.round(255 * (1 - fog.t * 0.4));
      return { r: glow, g: glow, b: glow };
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
    var alpha = shade * (1 - fog.t * 0.35);
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
      var wallH = Math.min(h, (h / dist) * 0.72);
      var top = halfH - wallH / 2;
      var fogWall = atmosphere(dist);
      var sideShade = hit.side === 'x' ? 0.82 : 1;
      drawWallColumn(ctx, j * colW, colW, top, wallH, hit.texU, fogWall, hit.cell === 2, sideShade);
    }

    if (TOMATO_IMG && (state.tomatoPhase === 'peek' || state.tomatoPhase === 'scurry')) {
      drawBillboard(ctx, state, state.tomatoX, state.tomatoY, TOMATO_IMG, state.tomatoAlpha, state.tomatoFlip);
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
      ctx.fillText('Press Esc to leave.', w / 2, h * 0.54);
    }
  }

  function tick(state) {
    if (!state.running) return;

    if (state.escapePhase === 'fade') {
      state.fadeWhite = Math.min(1, (performance.now() - state.fadeStart) / 1500);
      if (state.fadeWhite >= 1) {
        state.escapePhase = 'done';
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

      if (cell(state.map, nx, ny) === 2 && state.escapePhase === 'play') {
        state.escapePhase = 'fade';
        state.fadeStart = performance.now();
        state.fadeWhite = 0;
        state.keys = {};
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

  function start(canvas) {
    stop();
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
      tomatoPhase: 'wait',
      tomatoX: 0,
      tomatoY: 0,
      tomatoFleeAngle: 0,
      tomatoFlip: false,
      tomatoAlpha: 0,
      tomatoTimer: 0,
      tomatoCorridorId: null,
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

  global.BackroomsMaze = { start: start, stop: stop };
})(window);
