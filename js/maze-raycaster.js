/* Backrooms-style raycaster maze — arrow keys to move */

/*
 * ── dev note ──────────────────────────────────────────────────────────────
 *
 *   if you're reading the source: something is wrong with the threshold.
 *   blue tape. north hall. nobody filed a ticket.
 *
 *   the string you need is: "  key: \"__REDACTED__\","
 *   fill in what belongs there.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  var BASE_MAP = [
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

  var MAP_W = 25;
  var CORRIDOR_INSERT_AT = 7;
  var CORRIDOR_RUN_ROWS = 37;
  var CORRIDOR_X0 = 13;
  var CORRIDOR_X1 = 15;
  var MAP_Y_OFF = CORRIDOR_RUN_ROWS + 1;

  function repeatChar(ch, n) {
    var s = '';
    while (n--) s += ch;
    return s;
  }

  function buildNorthCorridorRows() {
    var rows = [];
    var i;
    var tape = repeatChar('1', MAP_W).split('');
    for (i = CORRIDOR_X0; i <= CORRIDOR_X1; i++) tape[i] = '3';
    rows.push(tape.join(''));
    for (i = 0; i < CORRIDOR_RUN_ROWS; i++) {
      var walk = repeatChar('1', MAP_W).split('');
      var x;
      for (x = CORRIDOR_X0; x <= CORRIDOR_X1; x++) walk[x] = '0';
      rows.push(walk.join(''));
    }
    return rows;
  }

  function buildMap() {
    var rows = BASE_MAP.slice();
    var corridor = buildNorthCorridorRows();
    rows = rows.slice(0, CORRIDOR_INSERT_AT).concat(corridor, rows.slice(CORRIDOR_INSERT_AT));
    return rows;
  }

  var MAP = buildMap();

  var FOV = Math.PI / 3;
  var MOVE_SPEED = 0.055;
  var ROT_SPEED = 0.045;
  var MAX_DIST = 32;
  var MAX_CANVAS_W = 480;
  var MAX_CANVAS_H = 360;
  var MAX_WALL_RAYS = 176;
  var MAX_ENV_RAYS = 88;
  var TOMATO_IMG = null;
  var CHICKEN_IMG = null;
  var active = null;

  var CORRIDOR_EVENTS = [
    {
      id: 'hub-east',
      minX: 9, maxX: 16.5, minY: 9.4 + MAP_Y_OFF, maxY: 12.6 + MAP_Y_OFF,
      spawnX: 17.55, spawnY: 10.6 + MAP_Y_OFF,
      fleeAngle: 0,
      minDist: 3.5, maxDist: 12
    },
    {
      id: 'hub-west',
      minX: 9, maxX: 16.5, minY: 9.4 + MAP_Y_OFF, maxY: 12.6 + MAP_Y_OFF,
      spawnX: 7.45, spawnY: 11.4 + MAP_Y_OFF,
      fleeAngle: Math.PI,
      minDist: 3.5, maxDist: 12
    },
    {
      id: 'lower-east',
      minX: 6, maxX: 20, minY: 18.6 + MAP_Y_OFF, maxY: 20.4 + MAP_Y_OFF,
      spawnX: 22.4, spawnY: 19.5 + MAP_Y_OFF,
      fleeAngle: 0,
      minDist: 4, maxDist: 14
    }
  ];

  /* Chicken dash scare zones — cross-axis sprint, cannot catch player */
  var SCARE_ZONES = [
    { minX: 7.5, maxX: 18.5, minY: 9 + MAP_Y_OFF, maxY: 13 + MAP_Y_OFF, axis: 'x', fixed: 10.8 + MAP_Y_OFF, from: 7.6, to: 18.4 },
    { minX: 7.5, maxX: 18.5, minY: 9 + MAP_Y_OFF, maxY: 13 + MAP_Y_OFF, axis: 'x', fixed: 11.6 + MAP_Y_OFF, from: 18.4, to: 7.6 },
    { minX: 0.5, maxX: 7, minY: 1, maxY: 5.5, axis: 'y', fixed: 3.2, from: 1.2, to: 5.2 },
    { minX: 17.5, maxX: 24, minY: 14 + MAP_Y_OFF, maxY: 19 + MAP_Y_OFF, axis: 'y', fixed: 20.5 + MAP_Y_OFF, from: 14.2 + MAP_Y_OFF, to: 18.8 + MAP_Y_OFF },
    { minX: 8, maxX: 16, minY: 17 + MAP_Y_OFF, maxY: 20.5 + MAP_Y_OFF, axis: 'x', fixed: 18.5 + MAP_Y_OFF, from: 8.2, to: 15.8 }
  ];

  var CEIL_BASE = { r: 228, g: 210, b: 158 };
  var FLOOR_BASE = { r: 158, g: 138, b: 96 };
  var FOG_COLOR = { r: 198, g: 178, b: 128 };
  var WALL_BASE = { r: 214, g: 192, b: 132 };

  // ── SECRET: taped threshold clip + CLI overlay ───────────────────────────
  //
  // North hall from the hub — ~11s at default speed. Blue-tape wall at the end.
  // Sustained forward press into the threshold launches the CLI overlay.
  //
  var CLI_SECRET_KEY = 'abyss';
  var CLI_ACTIVATED = false;

  var _clipApproachRow = CORRIDOR_INSERT_AT + 1;
  var _clipPressMs = 0;
  var _clipThresholdMs = 1100;
  var _lastTick = 0;

  var _cliEl = null;
  var _cliOutput = null;
  var _cliInput = null;
  var _nanoMode = false;
  var _nanoBuffer = '';
  var _nanoUserVal = '';
  var _cliHistory = [];
  var _cliHistIdx = -1;

  var _cfgTemplate = [
    '[signal]',
    '  version: 1',
    '  key: "__FILL_IN__"',
    '  target: /dev/null',
    '  status: dormant',
  ].join('\n');

  var _cfgCurrent = _cfgTemplate;

  var _FS = {
    'signal.cfg': { content: function () { return _cfgCurrent; } },
  };

  function _inClipCell(px, py) {
    var mx = Math.floor(px);
    var my = Math.floor(py);
    return my === _clipApproachRow && mx >= CORRIDOR_X0 && mx <= CORRIDOR_X1;
  }

  function _pressingTapeWall(state) {
    return state.keys.ArrowUp &&
      Math.sin(state.pa) < -0.65 &&
      Math.floor(state.py - 0.3) <= _clipApproachRow;
  }

  function _checkClipTrigger(state, dt) {
    if (CLI_ACTIVATED) return;
    if (!_inClipCell(state.px, state.py)) {
      _clipPressMs = 0;
      return;
    }
    if (_pressingTapeWall(state)) {
      _clipPressMs += dt;
      if (_clipPressMs >= _clipThresholdMs) {
        _clipPressMs = 0;
        _launchCLI(state);
      }
    } else {
      _clipPressMs = Math.max(0, _clipPressMs - dt * 2);
    }
  }

  function _cliPrint(text, color) {
    var el = document.createElement('span');
    el.style.display = 'block';
    if (color) el.style.color = color;
    el.textContent = text;
    _cliOutput.appendChild(el);
    _cliOutput.scrollTop = _cliOutput.scrollHeight;
  }

  function _runSignal() {
    var match = _cfgCurrent.match(/key:\s*"([^"]+)"/);
    var enteredKey = match ? match[1] : '';

    if (enteredKey === '__FILL_IN__' || enteredKey === '') {
      _cliPrint('./signal: key field is empty. edit signal.cfg first.', '#a63030');
      return;
    }

    if (enteredKey !== CLI_SECRET_KEY) {
      _cliPrint('./signal: authentication failed.', '#a63030');
      _cliPrint('  key "' + enteredKey + '" is not recognised.', '#556655');
      _cliPrint('  (keep looking.)', '#556655');
      return;
    }

    try { localStorage.setItem('backrooms_signal_sent', '1'); } catch (err) {}

    var lines = [
      '',
      '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
      'SIGNAL RECEIVED.',
      '',
      'transmission origin: unknown',
      'timestamp: ' + new Date().toISOString(),
      'payload: [redacted]',
      '',
      'something is listening now.',
      "it knows you're here.",
      '',
      '// next coordinates will be transmitted separately.',
      '// check where you haven\'t looked yet.',
      '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
      '',
    ];

    var d = 0;
    lines.forEach(function (l) {
      d += 180;
      setTimeout(function () {
        _cliPrint(l, l.startsWith('\u2500') || l === 'SIGNAL RECEIVED.' ? '#7ecf8e' : '');
      }, d);
    });
  }

  function _onNanoKey(e) {
    if (e.key !== 'Enter') return;
    var raw = _cliInput.value.trim();
    _cliInput.value = '';

    if (raw === ':q!') {
      _nanoMode = false;
      _cliPrint('> :q!', '#7ecf8e');
      _cliPrint('  cancelled — file unchanged.');
      _nanoUserVal = '';
      return;
    }

    if (raw === ':wq') {
      _nanoMode = false;
      _cliPrint('> :wq', '#7ecf8e');
      _cfgCurrent = _nanoBuffer;
      _cliPrint('  signal.cfg saved.', '#7ecf8e');
      _nanoUserVal = '';
      return;
    }

    _cliPrint(raw + ': not a nano command. use :wq or :q!', '#a63030');
  }

  function _enterNano() {
    _nanoMode = true;
    _nanoBuffer = _cfgCurrent;
    _cliInput.value = '';

    _cliPrint('', '');
    _cliPrint('\u250c\u2500 nano: signal.cfg \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#556655');
    _nanoBuffer.split('\n').forEach(function (l) { _cliPrint('  ' + l, '#c8c2b4'); });
    _cliPrint('\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', '#556655');
    _cliPrint('  edit the key field. type your value and press Enter.', '#556655');
    _cliPrint('  :wq to save and exit  |  :q! to cancel', '#556655');
    _cliPrint('');

    _cliPrint('  key: "', '#9aaa94');
    var keyInputRow = document.createElement('div');
    keyInputRow.style.cssText = 'display:flex;align-items:center;padding-left:36px;';
    var keyInp = document.createElement('input');
    keyInp.type = 'text';
    keyInp.placeholder = 'fill in the key...';
    keyInp.autocomplete = 'off';
    keyInp.spellcheck = false;
    keyInp.style.cssText = [
      'background:transparent;border:none;border-bottom:1px solid #556655',
      'outline:none;color:#f0ece0;font-family:inherit;font-size:13px',
      'caret-color:#7ecf8e;width:200px',
    ].join(';');
    keyInputRow.appendChild(keyInp);
    _cliOutput.appendChild(keyInputRow);
    _cliOutput.scrollTop = _cliOutput.scrollHeight;
    keyInp.focus();

    keyInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var val = keyInp.value.trim();
        _nanoBuffer = _cfgCurrent.replace('__FILL_IN__', val || '__FILL_IN__');
        _cliPrint('  "' + val + '"', '#d4c57a');
        keyInputRow.remove();
        _cliPrint('  (key set — type :wq to save, :q! to cancel)', '#556655');
        _nanoUserVal = val;
        _cliInput.focus();
      }
    });
  }

  function _runCLICommand(raw) {
    var parts = raw.trim().split(/\s+/);
    var cmd = parts[0].toLowerCase();

    if (cmd === 'help') {
      [
        'commands:',
        '  ls                 list files',
        '  cat <file>         print file contents',
        '  nano <file>        edit a file',
        '  ./signal           run the signal program',
        '  clear              clear output',
        '',
      ].forEach(function (l) { _cliPrint(l); });
      return;
    }

    if (cmd === 'clear') { _cliOutput.innerHTML = ''; return; }

    if (cmd === 'ls') {
      _cliPrint('signal.cfg', '#d4c57a');
      _cliPrint('./signal   (executable)', '#7ecf8e');
      return;
    }

    if (cmd === 'cat') {
      var fname = parts[1] || '';
      if (!_FS[fname]) { _cliPrint('cat: ' + fname + ': no such file', '#a63030'); return; }
      _cfgCurrent.split('\n').forEach(function (l) { _cliPrint(l, '#9aaa94'); });
      return;
    }

    if (cmd === 'nano') {
      var nfname = parts[1] || '';
      if (!_FS[nfname]) { _cliPrint('nano: ' + nfname + ': no such file', '#a63030'); return; }
      _enterNano();
      return;
    }

    if (cmd === './signal' || cmd === 'signal') {
      _runSignal();
      return;
    }

    _cliPrint(cmd + ': command not found', '#a63030');
    _cliPrint("(type 'help')", '#556655');
  }

  function _onCLIKey(e) {
    if (_nanoMode) { _onNanoKey(e); return; }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (_cliHistIdx < _cliHistory.length - 1) _cliHistIdx++;
      _cliInput.value = _cliHistory[_cliHistory.length - 1 - _cliHistIdx] || '';
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (_cliHistIdx > 0) _cliHistIdx--;
      _cliInput.value = _cliHistory[_cliHistory.length - 1 - _cliHistIdx] || '';
      return;
    }
    if (e.key !== 'Enter') return;

    var raw = _cliInput.value.trim();
    _cliInput.value = '';
    _cliHistIdx = -1;
    if (!raw) return;
    _cliHistory.push(raw);
    _cliPrint('> ' + raw, '#7ecf8e');
    _runCLICommand(raw);
  }

  function _launchCLI(state) {
    CLI_ACTIVATED = true;
    state.keys = {};

    var overlay = document.createElement('div');
    overlay.id = 'br-cli-overlay';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:#0d0d0b',
      'color:#b8c4b0',
      'font-family:"Courier New",Courier,monospace',
      'font-size:13px',
      'line-height:1.75',
      'display:flex',
      'flex-direction:column',
      'padding:28px 36px 20px',
      'opacity:0',
      'transition:opacity 1.8s',
    ].join(';');

    var out = document.createElement('div');
    out.style.cssText = 'flex:1;overflow-y:auto;white-space:pre-wrap;word-break:break-word;';

    var inputRow = document.createElement('div');
    inputRow.style.cssText = [
      'display:flex;align-items:center;gap:0',
      'border-top:1px solid #1e1e18',
      'padding-top:10px;flex-shrink:0',
    ].join(';');

    var promptLabel = document.createElement('span');
    promptLabel.textContent = '> ';
    promptLabel.style.cssText = 'color:#7ecf8e;flex-shrink:0;margin-right:4px;';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    inp.style.cssText = [
      'flex:1;background:transparent;border:none;outline:none',
      'color:#f0ece0;font-family:inherit;font-size:13px;caret-color:#7ecf8e',
    ].join(';');

    inputRow.appendChild(promptLabel);
    inputRow.appendChild(inp);
    overlay.appendChild(out);
    overlay.appendChild(inputRow);
    document.body.appendChild(overlay);

    _cliEl = overlay;
    _cliOutput = out;
    _cliInput = inp;

    setTimeout(function () { overlay.style.opacity = '1'; }, 60);

    var boot = [
      '\u2500\u2500 SIGNAL OS \u2500\u2500 unauthorised shell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
      'filesystem mounted at /mnt/level0',
      "type 'help' for available commands.",
      '',
    ];
    var delay = 200;
    boot.forEach(function (line) {
      delay += 280;
      setTimeout(function () {
        _cliPrint(line, line.indexOf('\u2500') === 0 ? '#556655' : '');
        if (line === '') setTimeout(function () { inp.focus(); }, 80);
      }, delay);
    });

    inp.addEventListener('keydown', _onCLIKey);

    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
  }
  // ── end CLI system ────────────────────────────────────────────────────────

  function loadImage(src) {
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
    var mapX = Math.floor(px);
    var mapY = Math.floor(py);
    var stepX = cos < 0 ? -1 : 1;
    var stepY = sin < 0 ? -1 : 1;
    var deltaDistX = Math.abs(1 / (cos || 1e-6));
    var deltaDistY = Math.abs(1 / (sin || 1e-6));
    var sideDistX;
    var sideDistY;
    if (cos < 0) sideDistX = (px - mapX) * deltaDistX;
    else sideDistX = (mapX + 1.0 - px) * deltaDistX;
    if (sin < 0) sideDistY = (py - mapY) * deltaDistY;
    else sideDistY = (mapY + 1.0 - py) * deltaDistY;
    var dist = 0;
    var side = 'x';
    var c = 0;

    while (dist < maxDist) {
      if (sideDistX < sideDistY) {
        dist = sideDistX;
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 'x';
      } else {
        dist = sideDistY;
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 'y';
      }
      if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) {
        return { dist: maxDist, cell: 1, side: side, texU: 0 };
      }
      c = map[mapY].charCodeAt(mapX) - 48;
      if (c > 0) {
        var texU = side === 'x' ? (py + dist * sin) % 1 : (px + dist * cos) % 1;
        if (texU < 0) texU += 1;
        return { dist: Math.max(0.001, dist), cell: c, side: side, texU: texU };
      }
    }
    return { dist: maxDist, cell: 0, side: 'x', texU: 0 };
  }

  function atmosphere(dist) {
    var t = Math.min(1, dist / MAX_DIST);
    var bright = Math.max(0.1, 1 - t * 0.9);
    return { t: t, bright: bright };
  }

  function clamp8(n) {
    return Math.max(0, Math.min(255, Math.round(n)));
  }

  function wallPaperRgb(texU, fog, sideShade) {
    var wave = Math.sin(texU * Math.PI * 14) * 0.04;
    var shade = fog.bright * sideShade * (0.92 + wave);
    return {
      r: clamp8(WALL_BASE.r * shade),
      g: clamp8(WALL_BASE.g * shade),
      b: clamp8(WALL_BASE.b * shade * 0.92)
    };
  }

  function drawTapeMarkings(ctx, x, colW, y0, wallH) {
    var padX = colW * 0.14;
    var padY = wallH * 0.12;
    var left = x + padX;
    var top = y0 + padY;
    var ww = colW - padX * 2;
    var hh = wallH - padY * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(42, 108, 220, 0.95)';
    ctx.lineWidth = Math.max(2, colW * 0.22);
    ctx.lineJoin = 'miter';
    ctx.strokeRect(left, top, ww, hh);
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left + ww, top + hh);
    ctx.moveTo(left + ww, top);
    ctx.lineTo(left, top + hh);
    ctx.stroke();
    ctx.restore();
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
    if (fog.t > 0.72) {
      return mixFog(CEIL_BASE.r, CEIL_BASE.g, CEIL_BASE.b, fog);
    }
    var tx = Math.floor(wx);
    var ty = Math.floor(wy);
    var fx = wx - tx;
    var fy = wy - ty;
    var checker = ((tx + ty) & 1) === 0;
    var lightPad = 0.18;
    var glowPad = 0.42;
    var inCore = checker
      && fx > 0.5 - lightPad && fx < 0.5 + lightPad
      && fy > 0.5 - lightPad && fy < 0.5 + lightPad;

    if (inCore) {
      var bloom = 1 - fog.t * 0.22;
      return {
        r: clamp8(252 * bloom),
        g: clamp8(246 * bloom),
        b: clamp8(214 * bloom)
      };
    }

    var inGlow = checker
      && fx > 0.5 - glowPad && fx < 0.5 + glowPad
      && fy > 0.5 - glowPad && fy < 0.5 + glowPad;
    if (inGlow) {
      var gx = Math.max(fx, 1 - fx, 0.5) - 0.5;
      var gy = Math.max(fy, 1 - fy, 0.5) - 0.5;
      var edgeDist = Math.max(gx / glowPad, gy / glowPad);
      var t = edgeDist > 1 ? 1 : edgeDist;
      var baseR = CEIL_BASE.r;
      var baseG = CEIL_BASE.g;
      var baseB = CEIL_BASE.b;
      return mixFog(
        clamp8(baseR + (255 - baseR) * (1 - t) * 0.95),
        clamp8(baseG + (248 - baseG) * (1 - t) * 0.95),
        clamp8(baseB + (220 - baseB) * (1 - t) * 0.9),
        fog
      );
    }

    return mixFog(CEIL_BASE.r, CEIL_BASE.g, CEIL_BASE.b, fog);
  }

  function floorRgb(wx, wy, fog) {
    var n = ((Math.floor(wx * 9) + Math.floor(wy * 9)) % 6) * 2;
    return mixFog(FLOOR_BASE.r - n, FLOOR_BASE.g - n - 1, FLOOR_BASE.b - n - 2, fog);
  }

  function setPx(buf, w, x, y, c) {
    var i = (y * w + x) * 4;
    buf[i] = c.r;
    buf[i + 1] = c.g;
    buf[i + 2] = c.b;
    buf[i + 3] = 255;
  }

  function drawWallColumn(ctx, x, colW, y0, wallH, texU, fog, cellType, sideShade) {
    var shade = fog.bright * sideShade;
    if (cellType === 2) {
      ctx.fillStyle = 'rgb('
        + clamp8(140 * shade) + ','
        + clamp8(230 * shade) + ','
        + clamp8(150 * shade) + ')';
      ctx.fillRect(x, y0, colW + 1, wallH);
      return;
    }
    var paper = wallPaperRgb(texU, fog, sideShade);
    ctx.fillStyle = 'rgb(' + paper.r + ',' + paper.g + ',' + paper.b + ')';
    ctx.fillRect(x, y0, colW + 1, wallH);
    if (cellType === 3) drawTapeMarkings(ctx, x, colW, y0, wallH);
  }

  var _grainCanvas = null;
  var _grainKey = '';

  function ensureGrainCanvas(w, h) {
    var key = w + 'x' + h;
    if (_grainCanvas && _grainKey === key) return _grainCanvas;
    var smallW = Math.max(128, (w / 2) | 0);
    var smallH = Math.max(96, (h / 2) | 0);
    var c = document.createElement('canvas');
    c.width = smallW;
    c.height = smallH;
    var g = c.getContext('2d');
    var img = g.createImageData(smallW, smallH);
    var d = img.data;
    var i;
    for (i = 0; i < d.length; i += 4) {
      var n = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = n;
      d[i + 3] = 16 + ((Math.random() * 12) | 0);
    }
    g.putImageData(img, 0, 0);
    _grainCanvas = c;
    _grainKey = key;
    return c;
  }

  function applyVhsPost(ctx, w, h, state) {
    state._fxFrame = (state._fxFrame || 0) + 1;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(238, 214, 155, 0.16)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.2 + (state._fxFrame % 6 === 0 ? (Math.random() - 0.5) * 0.035 : 0);
    ctx.drawImage(ensureGrainCanvas(w, h), 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (!state.vigGrad || state.vigGradW !== w || state.vigGradH !== h) {
      state.vigGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, h * 0.82);
      state.vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      state.vigGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      state.vigGradW = w;
      state.vigGradH = h;
    }
    ctx.fillStyle = state.vigGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
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

    ctx.fillStyle = 'rgba(24, 20, 12, 0.45)';
    ctx.fillRect(8, 8, 220, 44);
    ctx.fillStyle = 'rgba(248, 236, 200, 0.92)';
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
    var numRays = Math.min(MAX_WALL_RAYS, Math.max(72, (w / 2.5) | 0));
    var envRays = Math.min(MAX_ENV_RAYS, numRays);
    var colW = Math.max(1, Math.ceil(w / numRays));
    var envColW = Math.max(1, Math.ceil(w / envRays));
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
      for (i = 0; i < envRays; i++) {
        var rayAngle = pa - halfFov + (i / envRays) * FOV;
        var wx = px + Math.cos(rayAngle) * rowDist;
        var wy = py + Math.sin(rayAngle) * rowDist;
        var c = isCeil ? ceilingRgb(wx, wy, fog) : floorRgb(wx, wy, fog);
        var x1 = Math.min(w, Math.round((i + 1) * envColW));
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
      drawWallColumn(ctx, j * colW, colW, top, drawH, hit.texU, fogWall, hit.cell, sideShade);
    }

    if (TOMATO_IMG && (state.tomatoPhase === 'peek' || state.tomatoPhase === 'scurry')) {
      drawBillboard(ctx, state, state.tomatoX, state.tomatoY, TOMATO_IMG, state.tomatoAlpha, state.tomatoFlip);
    }

    if (CHICKEN_IMG && state.chickenScarePhase === 'run' && state.chickenScareAlpha > 0) {
      drawBillboard(ctx, state, state.chickenScareX, state.chickenScareY, CHICKEN_IMG, state.chickenScareAlpha, state.chickenScareFlip);
    }

    drawHud(state, w, h);

    if (state.escapePhase !== 'fade' && state.escapePhase !== 'done') {
      applyVhsPost(ctx, w, h, state);
    }

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
    if (document.hidden) {
      state.raf = requestAnimationFrame(function () { tick(state); });
      return;
    }
    var now = performance.now();
    var dt = _lastTick ? Math.min(now - _lastTick, 100) : 16;
    _lastTick = now;

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
      _checkClipTrigger(state, dt);

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

    if (state.escapePhase === 'done') {
      if (!state._doneRendered) {
        render(state);
        state._doneRendered = true;
      }
      state.raf = requestAnimationFrame(function () { tick(state); });
      return;
    }

    var keys = state.keys;
    var moving = !!(keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight);
    var animating = (state.tomatoPhase !== 'wait' && state.tomatoPhase !== 'done')
      || state.chickenScarePhase === 'run'
      || state.escapePhase === 'fade';
    if (moving) state._needsRender = true;
    if (animating) state._needsRender = true;

    if (state._needsRender) {
      render(state);
      state._needsRender = moving || animating;
    }
    state.raf = requestAnimationFrame(function () { tick(state); });
  }

  function onKey(state, e, down) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      state.keys[e.key] = down;
      if (down) state._needsRender = true;
    }
  }

  function start(canvas, opts) {
    stop();
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var resize = function () {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.min(MAX_CANVAS_W, Math.max(1, Math.floor(rect.width)));
      canvas.height = Math.min(MAX_CANVAS_H, Math.max(1, Math.floor(rect.height)));
      if (active) active._needsRender = true;
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
      _needsRender: true,
      _doneRendered: false,
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

    _clipPressMs = 0;
    _lastTick = 0;

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

  loadImage('images/maze/tomato.png').then(function (img) {
    TOMATO_IMG = img;
  });
  loadImage('assets/game/rooster.gif').then(function (img) {
    CHICKEN_IMG = img;
  });

  global.BackroomsMaze = { start: start, stop: stop };
})(window);
