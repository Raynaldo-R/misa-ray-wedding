/* Honeymoon — Flappy Chicken (desktop only, DOM/CSS) */
(function (global) {
  'use strict';

  var CHICKEN_SRC = 'assets/game/hen-a.gif';
  var GRAVITY = 0.38;
  var JUMP_VEL = -7.2;
  var SCROLL_SPEED = 2.85;
  var PALM_W = 58;
  var GAP_MIN = 118;
  var GAP_VAR = 72;
  var SPAWN_X_GAP = 260;
  var CHICKEN_W = 46;
  var CHICKEN_H = 44;
  var active = null;

  function createEl(tag, cls, parent) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }

  function buildDom(root) {
    root.innerHTML = '';
    root.className = 'flappy-game';
    root.setAttribute('tabindex', '0');

    var bg = createEl('div', 'flappy-game__bg', root);
    createEl('div', 'flappy-game__cloud flappy-game__cloud--1', bg);
    createEl('div', 'flappy-game__cloud flappy-game__cloud--2', bg);
    createEl('div', 'flappy-game__cloud flappy-game__cloud--3', bg);
    var palms = createEl('div', 'flappy-game__palms', root);
    var player = createEl('div', 'flappy-game__player', root);
    var img = createEl('img', 'flappy-game__chicken', player);
    img.src = CHICKEN_SRC;
    img.alt = '';
    img.width = CHICKEN_W;
    img.height = CHICKEN_H;
    var hud = createEl('div', 'flappy-game__hud', root);
    var overlay = createEl('div', 'flappy-game__overlay', root);
    overlay.hidden = true;

    return { bg: bg, palms: palms, player: player, hud: hud, overlay: overlay };
  }

  function onKey(e, down) {
    if (!active || active.dead) return;
    if (e.code === 'Space' || e.key === ' ') {
      if (down) {
        e.preventDefault();
        flap();
      }
    }
  }

  function flap() {
    if (!active || active.dead) return;
    active.vy = JUMP_VEL;
  }

  function spawnPalm(a) {
    var gap = GAP_MIN + Math.random() * GAP_VAR;
    var gapTop = 48 + Math.random() * Math.max(40, a.height - gap - 96);
    var el = createEl('div', 'flappy-palm', a.dom.palms);
    el.style.width = PALM_W + 'px';
    el.style.left = a.width + 'px';

    var top = createEl('div', 'flappy-palm__top', el);
    top.style.height = gapTop + 'px';
    var bottom = createEl('div', 'flappy-palm__bottom', el);
    bottom.style.height = (a.height - gapTop - gap) + 'px';

    a.obstacles.push({
      el: el,
      x: a.width,
      gapTop: gapTop,
      gapBottom: gapTop + gap,
      scored: false
    });
  }

  function hitTest(a) {
    var cx = a.chickenX;
    var cy = a.y;
    var pad = 6;
    var left = cx - CHICKEN_W * 0.5 + pad;
    var right = cx + CHICKEN_W * 0.5 - pad;
    var top = cy - CHICKEN_H * 0.5 + pad;
    var bottom = cy + CHICKEN_H * 0.5 - pad;

    if (top < 0 || bottom > a.height) return true;

    var i;
    for (i = 0; i < a.obstacles.length; i++) {
      var o = a.obstacles[i];
      var palmLeft = o.x;
      var palmRight = o.x + PALM_W;
      if (right < palmLeft || left > palmRight) continue;
      if (top < o.gapTop || bottom > o.gapBottom) return true;
    }
    return false;
  }

  function gameOver(a) {
    a.dead = true;
    a.dom.overlay.hidden = false;
    a.dom.overlay.textContent = 'Game over — score ' + a.score + '. Press space to retry.';
  }

  function resetRound(a) {
    a.obstacles.forEach(function (o) { o.el.remove(); });
    a.obstacles = [];
    a.y = a.height * 0.45;
    a.vy = 0;
    a.score = 0;
    a.dead = false;
    a.lastSpawnX = a.width;
    a.dom.overlay.hidden = true;
    a.dom.hud.textContent = '0';
    spawnPalm(a);
    a.lastSpawnX = a.width - SPAWN_X_GAP * 0.5;
  }

  function tick(ts) {
    if (!active) return;
    var a = active;
    if (!a.lastTs) a.lastTs = ts;
    var dt = Math.min(32, ts - a.lastTs);
    a.lastTs = ts;

    if (!a.dead) {
      a.vy += GRAVITY * (dt / 16);
      a.y += a.vy * (dt / 16);

      var last = a.obstacles.length ? a.obstacles[a.obstacles.length - 1] : null;
      if (!last || last.x < a.width - SPAWN_X_GAP) spawnPalm(a);

      var i;
      for (i = a.obstacles.length - 1; i >= 0; i--) {
        var o = a.obstacles[i];
        o.x -= SCROLL_SPEED * (dt / 16);
        o.el.style.left = o.x + 'px';
        if (!o.scored && o.x + PALM_W < a.chickenX) {
          o.scored = true;
          a.score += 1;
          a.dom.hud.textContent = String(a.score);
        }
        if (o.x < -PALM_W - 20) {
          o.el.remove();
          a.obstacles.splice(i, 1);
        }
      }

      if (hitTest(a)) gameOver(a);
    }

    a.dom.player.style.left = a.chickenX + 'px';
    a.dom.player.style.top = a.y + 'px';
    a.dom.bg.style.backgroundPosition = (a.bgShift % 400) + 'px 0';
    a.bgShift += SCROLL_SPEED * 0.35 * (dt / 16);

    a.raf = requestAnimationFrame(tick);
  }

  function measure(a) {
    var rect = a.root.getBoundingClientRect();
    a.width = Math.max(280, rect.width);
    a.height = Math.max(240, rect.height);
    a.chickenX = a.width * 0.24;
    if (!a.started) {
      a.y = a.height * 0.45;
      a.dom.player.style.left = a.chickenX + 'px';
      a.dom.player.style.top = a.y + 'px';
    }
  }

  function onRootClick() {
    if (!active) return;
    if (active.dead) {
      resetRound(active);
      active.root.focus();
      return;
    }
    flap();
  }

  function init(root) {
    destroy();
    if (!root) return null;

    var dom = buildDom(root);
    var instance = {
      root: root,
      dom: dom,
      obstacles: [],
      y: 0,
      vy: 0,
      chickenX: 0,
      width: 0,
      height: 0,
      score: 0,
      dead: false,
      started: false,
      bgShift: 0,
      lastTs: 0,
      raf: null,
      onKeyDown: function (e) {
        if (active && active.dead && (e.code === 'Space' || e.key === ' ')) {
          e.preventDefault();
          resetRound(active);
          return;
        }
        onKey(e, true);
      },
      onKeyUp: function (e) { onKey(e, false); },
      onBlur: function () {},
      onResize: function () { measure(instance); },
      onClick: onRootClick
    };

    active = instance;
    measure(instance);
    resetRound(instance);
    instance.started = true;

    document.addEventListener('keydown', instance.onKeyDown);
    document.addEventListener('keyup', instance.onKeyUp);
    window.addEventListener('blur', instance.onBlur);
    window.addEventListener('resize', instance.onResize);
    root.addEventListener('click', instance.onClick);
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
    if (active.root) active.root.removeEventListener('click', active.onClick);
    if (active.root) active.root.innerHTML = '';
    active = null;
  }

  global.WaveRacer = { init: init, destroy: destroy, start: init, stop: destroy };
})(typeof window !== 'undefined' ? window : global);
