/* Oasis Ring Run — DOM/CSS wave racer (desktop only) */
(function (global) {
  'use strict';

  var BASE_SCROLL = 2.4;
  var SCROLL_PER_SCORE = 0.08;
  var LANE_SPEED = 4.2;
  var SPAWN_INTERVAL = 2200;
  var RINGS_TO_WIN = 12;
  var active = null;

  function round5(n) {
    return Math.round(n / 5) * 5;
  }

  function createEl(tag, cls, parent) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }

  function buildDom(root) {
    root.innerHTML = '';
    root.className = 'wave-game';
    root.setAttribute('tabindex', '0');

    var sky = createEl('div', 'wave-game__sky', root);
    var water = createEl('div', 'wave-game__water', root);
    var ringsLayer = createEl('div', 'wave-game__rings', root);
    var player = createEl('div', 'wave-game__player', root);
    var sprite = createEl('div', 'wave-game__sprite wave-game__sprite--straight', player);
    var hud = createEl('div', 'wave-game__hud', root);

    return {
      sky: sky,
      water: water,
      ringsLayer: ringsLayer,
      player: player,
      sprite: sprite,
      hud: hud
    };
  }

  function setSpriteState(sprite, state) {
    sprite.className = 'wave-game__sprite wave-game__sprite--' + state;
  }

  function onKey(e, down) {
    if (!active) return;
    var k = e.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') active.keys.up = down;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') active.keys.left = down;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') active.keys.right = down;
    if (down && (k.indexOf('Arrow') === 0 || 'wasdWASD'.indexOf(k) >= 0)) e.preventDefault();
  }

  function spawnRing(a) {
    var w = a.width;
    var gapW = round5(72 + Math.random() * 48);
    var margin = 36;
    var minCenter = margin + gapW * 0.5;
    var maxCenter = w - margin - gapW * 0.5;
    var center = minCenter + Math.random() * (maxCenter - minCenter);
    var ring = createEl('div', 'wave-ring', a.dom.ringsLayer);
    ring.style.top = '-80px';
    var postL = createEl('div', 'wave-ring__post wave-ring__post--left', ring);
    var gap = createEl('div', 'wave-ring__gap', ring);
    var postR = createEl('div', 'wave-ring__post wave-ring__post--right', ring);
    postL.style.width = Math.max(0, center - gapW * 0.5) + 'px';
    gap.style.width = gapW + 'px';
    postR.style.width = Math.max(0, w - (center + gapW * 0.5)) + 'px';
    a.rings.push({
      el: ring,
      y: -80,
      gapLeft: center - gapW * 0.5,
      gapRight: center + gapW * 0.5,
      scored: false
    });
  }

  function playerBounds(a) {
    var spriteW = 48;
    return { min: spriteW * 0.5, max: a.width - spriteW * 0.5 };
  }

  function checkCollisions(a) {
    var playerY = a.height * 0.65;
    var playerW = 44;
    var pxLeft = a.playerX - playerW * 0.5;
    var pxRight = a.playerX + playerW * 0.5;
    var i;
    for (i = 0; i < a.rings.length; i++) {
      var ring = a.rings[i];
      if (ring.scored) continue;
      if (ring.y < playerY - 12 || ring.y > playerY + 28) continue;
      ring.scored = true;
      if (pxLeft >= ring.gapLeft && pxRight <= ring.gapRight) {
        a.score += 1;
        if (a.score >= RINGS_TO_WIN) a.won = true;
      } else {
        a.misses += 1;
      }
      ring.el.classList.add('wave-ring--passed');
    }
  }

  function tick(ts) {
    if (!active) return;
    var a = active;
    if (!a.lastTs) a.lastTs = ts;
    var dt = Math.min(32, ts - a.lastTs);
    a.lastTs = ts;

    var scroll = BASE_SCROLL + a.score * SCROLL_PER_SCORE;
    a.bgOffset = (a.bgOffset + scroll * (dt / 16)) % 10000;

    if (a.keys.left) a.playerX -= LANE_SPEED * (dt / 16);
    if (a.keys.right) a.playerX += LANE_SPEED * (dt / 16);
    var bounds = playerBounds(a);
    a.playerX = Math.max(bounds.min, Math.min(bounds.max, a.playerX));

    var lean = a.keys.left ? 'lean-left' : (a.keys.right ? 'lean-right' : 'straight');
    setSpriteState(a.dom.sprite, lean);

    a.dom.sky.style.backgroundPosition = '0 ' + (a.bgOffset * 0.35) + 'px';
    a.dom.water.style.backgroundPosition = '0 ' + a.bgOffset + 'px';

    var ri;
    for (ri = a.rings.length - 1; ri >= 0; ri--) {
      var r = a.rings[ri];
      r.y += scroll * (dt / 16) * 1.15;
      r.el.style.top = r.y + 'px';
      if (r.y > a.height + 60) {
        r.el.remove();
        a.rings.splice(ri, 1);
      }
    }

    if (!a.won && ts - a.lastSpawn > SPAWN_INTERVAL) {
      spawnRing(a);
      a.lastSpawn = ts;
      a.lastSpawn -= Math.min(900, a.score * 40);
    }

    checkCollisions(a);
    a.dom.hud.textContent = 'Rings ' + a.score + ' / ' + RINGS_TO_WIN + (a.won ? ' — OASIS CLEARED!' : '');

    if (!a.won) a.raf = requestAnimationFrame(tick);
  }

  function measure(a) {
    var rect = a.root.getBoundingClientRect();
    a.width = Math.max(280, rect.width);
    a.height = Math.max(240, rect.height);
    a.playerX = a.width * 0.5;
    a.dom.player.style.left = '50%';
    a.dom.player.style.top = '65%';
  }

  function init(root) {
    destroy();
    if (!root) return null;

    var dom = buildDom(root);
    var instance = {
      root: root,
      dom: dom,
      keys: { up: false, left: false, right: false },
      rings: [],
      playerX: 0,
      width: 0,
      height: 0,
      score: 0,
      misses: 0,
      won: false,
      bgOffset: 0,
      lastTs: 0,
      lastSpawn: 0,
      raf: null,
      onKeyDown: function (e) { onKey(e, true); },
      onKeyUp: function (e) { onKey(e, false); },
      onBlur: function () {
        instance.keys.up = instance.keys.left = instance.keys.right = false;
      },
      onResize: function () { measure(instance); }
    };

    active = instance;
    measure(instance);
    spawnRing(instance);
    instance.lastSpawn = performance.now();

    document.addEventListener('keydown', instance.onKeyDown);
    document.addEventListener('keyup', instance.onKeyUp);
    window.addEventListener('blur', instance.onBlur);
    window.addEventListener('resize', instance.onResize);
    root.focus();
    instance.raf = requestAnimationFrame(tick);
    return instance;
  }

  function destroy() {
    if (!active) return;
    cancelAnimationFrame(active.raf);
    document.removeEventListener('keydown', active.onKeyDown);
    document.removeEventListener('keyup', active.onKeyUp);
    window.removeEventListener('blur', active.onBlur);
    window.removeEventListener('resize', active.onResize);
    if (active.root) active.root.innerHTML = '';
    active = null;
  }

  /* Legacy API */
  function start(el) {
    init(el);
  }

  function stop() {
    destroy();
  }

  global.WaveRacer = { init: init, destroy: destroy, start: start, stop: stop };
})(typeof window !== 'undefined' ? window : global);
