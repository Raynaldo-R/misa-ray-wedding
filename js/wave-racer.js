/* Honeymoon Oasis Ring Run — Wave Racer 64–style jetski skeleton */
(function (global) {
  'use strict';

  var RINGS = [
    { x: 0, z: 90 },
    { x: -42, z: 175 },
    { x: 38, z: 265 },
    { x: -28, z: 355 },
    { x: 0, z: 450 }
  ];

  var MAX_SPEED = 2.8;
  var ACCEL = 0.055;
  var FRICTION = 0.988;
  var TURN_RATE = 0.038;
  var RING_RADIUS = 22;
  var active = null;

  function dist2(ax, az, bx, bz) {
    var dx = ax - bx;
    var dz = az - bz;
    return dx * dx + dz * dz;
  }

  function project(wx, wz, cam) {
    var rx = wx - cam.x;
    var rz = wz - cam.z;
    var cos = Math.cos(-cam.angle);
    var sin = Math.sin(-cam.angle);
    var lx = rx * cos - rz * sin;
    var lz = rx * sin + rz * cos;
    if (lz < 4) return null;
    var fov = cam.fov;
    var scale = (cam.h * 0.42) / (lz * fov);
    return {
      sx: cam.w * 0.5 + lx * scale,
      sy: cam.horizon + lz * scale * 0.08,
      scale: scale,
      depth: lz
    };
  }

  function drawSky(ctx, w, h, horizon) {
    var g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, '#5ec8e8');
    g.addColorStop(0.55, '#9adcf0');
    g.addColorStop(1, '#f5e6c8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizon);

    ctx.fillStyle = '#e8c878';
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.lineTo(w, horizon + 18);
    ctx.lineTo(0, horizon + 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2d8a58';
    for (var i = -2; i <= 3; i++) {
      var px = w * (0.15 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(px, horizon + 8);
      ctx.lineTo(px - 14, horizon + 52);
      ctx.lineTo(px + 14, horizon + 52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3aa868';
      ctx.beginPath();
      ctx.ellipse(px, horizon + 4, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d8a58';
    }
  }

  function drawWater(ctx, w, h, horizon, t, speed) {
    var g = ctx.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, '#1a9ec4');
    g.addColorStop(0.35, '#127aa8');
    g.addColorStop(1, '#0c5a88');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, w, h - horizon);

    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 1;
    var scroll = (t * speed * 0.04) % 40;
    for (var row = 0; row < 14; row++) {
      var p = row / 14;
      var y = horizon + Math.pow(p, 1.6) * (h - horizon) + scroll * p * 0.3;
      if (y > h) continue;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= w; x += 24) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + t * 0.05 + row) * (2 + p * 4));
      }
      ctx.stroke();
    }
  }

  function drawRing(ctx, p, passed, next) {
    if (!p) return;
    var r = Math.max(8, 28 * p.scale);
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.strokeStyle = passed ? 'rgba(255,255,255,.25)' : (next ? '#ffe566' : '#fff');
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (next && !passed) {
      ctx.strokeStyle = 'rgba(255, 229, 102, .35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.15, r * 0.44, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawJetski(ctx, w, h, lean) {
    var cx = w * 0.5 + lean * 18;
    var cy = h - 42;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean * 0.12);

    ctx.fillStyle = '#ff6b4a';
    ctx.beginPath();
    ctx.moveTo(-28, 8);
    ctx.lineTo(32, 4);
    ctx.lineTo(38, 14);
    ctx.lineTo(-22, 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.fillRect(-8, -6, 18, 14);

    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(10, 0, 22, 8);

    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, 20);
    ctx.quadraticCurveTo(0, 32 + Math.abs(lean) * 8, 30, 20);
    ctx.stroke();
    ctx.restore();
  }

  function drawHud(ctx, w, ringIdx, won, speed) {
    ctx.fillStyle = 'rgba(10, 30, 50, .55)';
    ctx.fillRect(12, 12, 148, 52);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.strokeRect(12, 12, 148, 52);
    ctx.fillStyle = '#fff';
    ctx.font = '600 11px Tahoma, sans-serif';
    ctx.fillText('RINGS  ' + Math.min(ringIdx, RINGS.length) + ' / ' + RINGS.length, 22, 32);
    ctx.fillText('SPD    ' + Math.round(speed * 36), 22, 50);
    if (won) {
      ctx.fillStyle = 'rgba(10, 30, 50, .7)';
      ctx.fillRect(w * 0.5 - 110, 24, 220, 44);
      ctx.fillStyle = '#ffe566';
      ctx.font = '700 14px Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OASIS CLEARED!', w * 0.5, 52);
      ctx.textAlign = 'left';
    }
  }

  function onKey(e, down) {
    if (!active) return;
    var k = e.key;
    if (k === 'ArrowUp') active.keys.up = down;
    if (k === 'ArrowLeft') active.keys.left = down;
    if (k === 'ArrowRight') active.keys.right = down;
    if (down && (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'ArrowRight')) e.preventDefault();
  }

  function tick() {
    if (!active) return;
    var s = active.state;
    var keys = active.keys;

    if (keys.up) s.speed = Math.min(MAX_SPEED, s.speed + ACCEL);
    else s.speed *= FRICTION;

    if (s.speed > 0.08) {
      if (keys.left) s.angle -= TURN_RATE * (0.6 + s.speed * 0.15);
      if (keys.right) s.angle += TURN_RATE * (0.6 + s.speed * 0.15);
    }

    s.x += Math.sin(s.angle) * s.speed;
    s.z += Math.cos(s.angle) * s.speed;

    if (!s.won && s.ringIdx < RINGS.length) {
      var ring = RINGS[s.ringIdx];
      if (dist2(s.x, s.z, ring.x, ring.z) < RING_RADIUS * RING_RADIUS) {
        s.ringIdx++;
        if (s.ringIdx >= RINGS.length) s.won = true;
      }
    }

    render();
    active.raf = requestAnimationFrame(tick);
  }

  function render() {
    var a = active;
    if (!a) return;
    var canvas = a.canvas;
    var ctx = a.ctx;
    var w = canvas.width;
    var h = canvas.height;
    var horizon = h * 0.38;
    var s = a.state;
    var t = performance.now() * 0.001;
    var lean = (a.keys.left ? -1 : 0) + (a.keys.right ? 1 : 0);

    var cam = { x: s.x, z: s.z, angle: s.angle, w: w, h: h, horizon: horizon, fov: 0.9 };

    drawSky(ctx, w, h, horizon);
    drawWater(ctx, w, h, horizon, t, s.speed);

    var projected = RINGS.map(function (ring, i) {
      return { p: project(ring.x, ring.z, cam), i: i };
    }).filter(function (o) { return o.p; });
    projected.sort(function (a, b) { return b.p.depth - a.p.depth; });
    projected.forEach(function (o) {
      drawRing(ctx, o.p, o.i < s.ringIdx, o.i === s.ringIdx);
    });

    drawJetski(ctx, w, h, lean);
    drawHud(ctx, w, s.ringIdx, s.won, s.speed);
  }

  function resize() {
    if (!active) return;
    var canvas = active.canvas;
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(320, Math.floor(rect.width * dpr));
    canvas.height = Math.max(240, Math.floor(rect.height * dpr));
    active.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function start(canvas) {
    stop();
    var ctx = canvas.getContext('2d');
    active = {
      canvas: canvas,
      ctx: ctx,
      state: { x: 0, z: 0, angle: 0, speed: 0, ringIdx: 0, won: false },
      keys: { up: false, left: false, right: false },
      raf: null,
      onKeyDown: function (e) { onKey(e, true); },
      onKeyUp: function (e) { onKey(e, false); },
      onBlur: function () { active.keys.up = active.keys.left = active.keys.right = false; }
    };

    document.addEventListener('keydown', active.onKeyDown);
    document.addEventListener('keyup', active.onKeyUp);
    window.addEventListener('blur', active.onBlur);
    active.onResize = resize;
    window.addEventListener('resize', active.onResize);
    resize();
    active.raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (!active) return;
    cancelAnimationFrame(active.raf);
    document.removeEventListener('keydown', active.onKeyDown);
    document.removeEventListener('keyup', active.onKeyUp);
    window.removeEventListener('blur', active.onBlur);
    window.removeEventListener('resize', active.onResize);
    active = null;
  }

  global.WaveRacer = { start: start, stop: stop };
})(typeof window !== 'undefined' ? window : global);
