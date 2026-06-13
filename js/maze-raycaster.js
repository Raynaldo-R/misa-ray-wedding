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
  var active = null;

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

  function cell(map, x, y) {
    var mx = Math.floor(x);
    var my = Math.floor(y);
    if (my < 0 || my >= map.length || mx < 0 || mx >= map[0].length) return 1;
    return map[my].charCodeAt(mx) - 48;
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
        return { dist: maxDist, cell: 1, side: side };
      }
      c = map[mapY].charCodeAt(mapX) - 48;
      if (c > 0) {
        return { dist: Math.max(0.001, dist), cell: c, side: side };
      }
    }
    return { dist: maxDist, cell: 0, side: 'x' };
  }

  function atmosphere(dist) {
    var t = Math.min(1, dist / MAX_DIST);
    var bright = Math.max(0.1, 1 - t * 0.9);
    return { t: t, bright: bright };
  }

  function clamp8(n) {
    return Math.max(0, Math.min(255, Math.round(n)));
  }

  function flatRgb(base, fog, sideShade) {
    var shade = fog.bright * (sideShade || 1);
    return {
      r: clamp8(base.r * shade),
      g: clamp8(base.g * shade),
      b: clamp8(base.b * shade)
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
    return mixFog(CEIL_BASE.r, CEIL_BASE.g, CEIL_BASE.b, fog);
  }

  function floorRgb(wx, wy, fog) {
    return mixFog(FLOOR_BASE.r, FLOOR_BASE.g, FLOOR_BASE.b, fog);
  }

  function setPx(buf, w, x, y, c) {
    var i = (y * w + x) * 4;
    buf[i] = c.r;
    buf[i + 1] = c.g;
    buf[i + 2] = c.b;
    buf[i + 3] = 255;
  }

  function drawWallColumn(ctx, x, colW, y0, wallH, fog, cellType, sideShade) {
    if (cellType === 2) {
      var exit = flatRgb({ r: 140, g: 230, b: 150 }, fog, sideShade);
      ctx.fillStyle = 'rgb(' + exit.r + ',' + exit.g + ',' + exit.b + ')';
      ctx.fillRect(x, y0, colW + 1, wallH);
      return;
    }
    var wall = flatRgb(WALL_BASE, fog, sideShade);
    ctx.fillStyle = 'rgb(' + wall.r + ',' + wall.g + ',' + wall.b + ')';
    ctx.fillRect(x, y0, colW + 1, wallH);
    if (cellType === 3) drawTapeMarkings(ctx, x, colW, y0, wallH);
  }

  function applyVhsPost(ctx, w, h, state) {
    if (!state.vigGrad || state.vigGradW !== w || state.vigGradH !== h) {
      state.vigGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, h * 0.82);
      state.vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      state.vigGrad.addColorStop(1, 'rgba(0,0,0,0.26)');
      state.vigGradW = w;
      state.vigGradH = h;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(236, 214, 158, 0.14)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = state.vigGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
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
      drawWallColumn(ctx, j * colW, colW, top, drawH, fogWall, hit.cell, sideShade);
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
    if (moving) state._needsRender = true;

    if (state._needsRender) {
      render(state);
      state._needsRender = moving;
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

  global.BackroomsMaze = { start: start, stop: stop };
})(window);
