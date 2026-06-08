/* Backrooms-style raycaster maze — arrow keys to move */
(function (global) {
  'use strict';

  var MAP = [
    '1111111111111111111',
    '1000000010000000001',
    '1011111010111111101',
    '1010001010101000101',
    '1010111110101011101',
    '1000100000101000001',
    '1110101111101011111',
    '1000101000001010001',
    '1011101011111010111',
    '1000001010000010001',
    '1011111010111010111',
    '1000000000100010001',
    '1111111110111010111',
    '1000000000100010001',
    '1011111111101010111',
    '1000000000000000002',
    '1111111111111111111'
  ];

  var FOV = Math.PI / 3;
  var MOVE_SPEED = 0.055;
  var ROT_SPEED = 0.045;
  var WALL_TEX = null;
  var active = null;

  function loadTexture(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function cell(map, x, y) {
    var mx = Math.floor(x);
    var my = Math.floor(y);
    if (my < 0 || my >= map.length || mx < 0 || mx >= map[0].length) return 1;
    return map[my].charCodeAt(mx) - 48;
  }

  function castRay(map, px, py, angle, maxDist) {
    var sin = Math.sin(angle);
    var cos = Math.cos(angle);
    var dist = 0;
    var step = 0.02;
    while (dist < maxDist) {
      dist += step;
      var x = px + cos * dist;
      var y = py + sin * dist;
      var c = cell(map, x, y);
      if (c > 0) {
        return { dist: dist, cell: c, x: x, y: y };
      }
    }
    return { dist: maxDist, cell: 0, x: px + cos * maxDist, y: py + sin * maxDist };
  }

  function drawColumn(ctx, x, colW, wallH, texX, shade, isExit) {
    var y0 = (ctx.canvas.height - wallH) / 2;
    if (WALL_TEX && !isExit) {
      var sw = 1;
      var sx = Math.floor(texX * WALL_TEX.width) % WALL_TEX.width;
      ctx.globalAlpha = shade;
      ctx.drawImage(WALL_TEX, sx, 0, sw, WALL_TEX.height, x, y0, colW + 1, wallH);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = isExit ? 'rgba(180,255,160,' + shade + ')' : 'rgba(196,212,106,' + shade + ')';
      ctx.fillRect(x, y0, colW + 1, wallH);
    }
  }

  function render(state) {
    var ctx = state.ctx;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    var map = state.map;
    var px = state.px;
    var py = state.py;
    var pa = state.pa;

    ctx.fillStyle = '#d9c88e';
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#c4b07a';
    ctx.fillRect(0, h / 2, w, h / 2);

    var numRays = Math.floor(w / 2);
    var colW = w / numRays;
    var maxDist = 24;

    for (var i = 0; i < numRays; i++) {
      var rayAngle = pa - FOV / 2 + (i / numRays) * FOV;
      var hit = castRay(map, px, py, rayAngle, maxDist);
      var dist = hit.dist * Math.cos(rayAngle - pa);
      if (dist < 0.001) dist = 0.001;
      var wallH = Math.min(h, (h / dist) * 0.75);
      var shade = Math.max(0.2, 1 - dist / maxDist);
      var texX = (hit.x + hit.y) % 1;
      drawColumn(ctx, i * colW, colW, wallH, texX, shade, hit.cell === 2);
    }

    if (state.won) {
      ctx.fillStyle = 'rgba(250,249,246,0.88)';
      ctx.fillRect(0, h * 0.38, w, h * 0.24);
      ctx.fillStyle = '#1e3d34';
      ctx.font = '600 18px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('You found the exit.', w / 2, h * 0.48);
      ctx.font = '500 13px DM Sans, sans-serif';
      ctx.fillStyle = '#5a6b65';
      ctx.fillText('Press Esc to leave the backrooms.', w / 2, h * 0.54);
    } else {
      ctx.fillStyle = 'rgba(26,36,33,0.55)';
      ctx.fillRect(8, 8, 210, 44);
      ctx.fillStyle = '#faf9f6';
      ctx.font = '500 11px DM Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Arrow keys — move & turn', 16, 26);
      ctx.fillText('Find the green exit wall', 16, 40);
    }
  }

  function tick(state) {
    if (!state.running) return;
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

    if (cell(state.map, nx, ny) === 2) state.won = true;

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
      won: false,
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

  global.BackroomsMaze = { start: start, stop: stop };
})(window);
