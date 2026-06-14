/* ASCILINE-inspired pixel-grid CCTV player — depends on window.SIGNAL_FEED */
(function (global) {
  'use strict';

  var _timer = null;
  var _raf = null;
  var _root = null;
  var _keyHandler = null;
  var _activeCam = 0;
  var _decodedCams = null;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatTs(d) {
    return d.getFullYear() + '-'
      + pad(d.getMonth() + 1) + '-'
      + pad(d.getDate()) + ' '
      + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function decodeRgbFrame(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    var i;
    for (i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function decodeLegacyFrame(b64) {
    var s = atob(b64);
    var n = s.length / 7;
    var out = new Uint8Array(n * 3);
    var oi = 0;
    var i = 0;
    while (i < s.length) {
      i += 1;
      out[oi++] = parseInt(s.substring(i, i + 2), 16);
      out[oi++] = parseInt(s.substring(i + 2, i + 4), 16);
      out[oi++] = parseInt(s.substring(i + 4, i + 6), 16);
      i += 6;
    }
    return out;
  }

  function normalizeFeed(feed) {
    if (!feed) return null;
    if (feed.cams && feed.cams.length) {
      return {
        w: feed.w,
        h: feed.h,
        fps: feed.fps || 10,
        mode: feed.mode || 'pixel',
        cams: feed.cams.map(function (cam) {
          return {
            id: cam.id || 'CAM',
            frames: cam.frames.map(feed.mode === 'ascii' ? decodeLegacyFrame : decodeRgbFrame),
          };
        }),
      };
    }
    if (feed.frames && feed.frames.length) {
      return {
        w: feed.w,
        h: feed.h,
        fps: feed.fps || 8,
        mode: 'ascii',
        cams: [{ id: 'IPcam_1', frames: feed.frames.map(decodeLegacyFrame) }],
      };
    }
    return null;
  }

  function stop() {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
    if (_raf) {
      cancelAnimationFrame(_raf);
      _raf = null;
    }
    if (_keyHandler) {
      window.removeEventListener('keydown', _keyHandler);
      _keyHandler = null;
    }
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null;
    _decodedCams = null;
    _activeCam = 0;
  }

  function drawRgbFrame(ctx, rgb, w, h, cell) {
    var i = 0;
    var y;
    var x;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        ctx.fillStyle = 'rgb(' + rgb[i] + ',' + rgb[i + 1] + ',' + rgb[i + 2] + ')';
        ctx.fillRect(x * cell, y * cell, cell, cell);
        i += 3;
      }
    }
  }

  function start(outputEl, opts) {
    stop();
    if (!outputEl) return false;
    opts = opts || {};

    var feed = normalizeFeed(global.SIGNAL_FEED);
    if (!feed || !feed.cams.length) return false;

    _decodedCams = feed.cams;
    var w = feed.w;
    var h = feed.h;
    var fps = feed.fps;
    var frameIdx = 0;
    var lastFrame = 0;
    var cell = 3;

    _root = document.createElement('div');
    _root.className = 'signal-feed-block';
    _root.style.cssText = [
      'margin:10px 0 14px',
      'max-width:100%',
      'border:1px solid #2f3a2c',
      'background:#000',
      'font-family:"Courier New",Courier,monospace',
      'font-size:11px',
      'line-height:1.4',
      'overflow:hidden',
    ].join(';');

    var top = document.createElement('div');
    top.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:10px',
      'padding:6px 10px',
      'font-size:10px',
      'letter-spacing:0.06em',
      'text-transform:uppercase',
      'color:#8a9a84',
      'border-bottom:1px solid #1e261c',
      'background:#0a0c08',
      'flex-wrap:wrap',
    ].join(';');

    var rec = document.createElement('span');
    rec.style.cssText = 'display:inline-flex;align-items:center;gap:5px;color:#d8d4c8;font-weight:700;';
    var dot = document.createElement('span');
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:#e03030;box-shadow:0 0 6px #e03030;';
    rec.appendChild(dot);
    rec.appendChild(document.createTextNode('REC'));

    var live = document.createElement('span');
    live.textContent = 'LIVE';
    live.style.cssText = 'color:#7ecf8e;font-weight:700;';

    var camBtns = document.createElement('span');
    camBtns.style.cssText = 'display:inline-flex;gap:6px;margin-left:auto;';

    var camLabel = document.createElement('span');
    camLabel.style.cssText = 'color:#7ecf8e;font-size:9px;min-width:72px;text-align:right;';

    var btnEls = _decodedCams.map(function (cam, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = cam.id;
      b.style.cssText = [
        'border:1px solid #3a4438',
        'background:#121410',
        'color:#8a9a84',
        'font:inherit',
        'font-size:9px',
        'letter-spacing:0.05em',
        'padding:3px 8px',
        'cursor:pointer',
      ].join(';');
      b.addEventListener('click', function () { switchCam(idx); });
      camBtns.appendChild(b);
      return b;
    });

    top.appendChild(rec);
    top.appendChild(live);
    top.appendChild(camBtns);
    top.appendChild(camLabel);

    var view = document.createElement('div');
    view.style.cssText = [
      'position:relative',
      'padding:6px',
      'background:#000',
      'overflow:auto',
    ].join(';');

    var scan = document.createElement('div');
    scan.style.cssText = [
      'pointer-events:none',
      'position:absolute',
      'inset:0',
      'background:repeating-linear-gradient(0deg,rgba(0,0,0,0.12) 0px,rgba(0,0,0,0.12) 1px,transparent 1px,transparent 3px)',
      'opacity:0.28',
      'z-index:2',
    ].join(';');

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;max-width:100%;height:auto;image-rendering:pixelated;';

    var bottom = document.createElement('div');
    bottom.style.cssText = [
      'padding:5px 10px',
      'font-size:10px',
      'letter-spacing:0.05em',
      'color:#7a8478',
      'border-top:1px solid #1e261c',
      'background:#0a0c08',
      'display:flex',
      'justify-content:space-between',
      'gap:12px',
      'flex-wrap:wrap',
    ].join(';');

    var ts = document.createElement('span');
    var hint = document.createElement('span');
    hint.textContent = '[1] [2] switch feed';
    hint.style.color = '#5a6458';

    var sig = document.createElement('span');
    sig.textContent = 'SIGNAL LOCKED';
    sig.style.color = '#a63030';

    bottom.appendChild(ts);
    bottom.appendChild(hint);
    bottom.appendChild(sig);

    view.appendChild(canvas);
    view.appendChild(scan);
    _root.appendChild(top);
    _root.appendChild(view);
    _root.appendChild(bottom);
    outputEl.appendChild(_root);
    outputEl.scrollTop = outputEl.scrollHeight;

    var ctx = canvas.getContext('2d');

    function resizeCanvas() {
      var maxW = Math.max(200, view.clientWidth - 12);
      cell = Math.max(2, Math.min(5, Math.floor(maxW / w)));
      canvas.width = w * cell;
      canvas.height = h * cell;
      canvas.style.width = canvas.width + 'px';
      canvas.style.height = canvas.height + 'px';
    }

    function paint() {
      var frames = _decodedCams[_activeCam].frames;
      drawRgbFrame(ctx, frames[frameIdx % frames.length], w, h, cell);
    }

    function styleBtns() {
      btnEls.forEach(function (b, idx) {
        if (idx === _activeCam) {
          b.style.background = '#1e2a1c';
          b.style.borderColor = '#7ecf8e';
          b.style.color = '#d8e8d0';
        } else {
          b.style.background = '#121410';
          b.style.borderColor = '#3a4438';
          b.style.color = '#8a9a84';
        }
      });
      camLabel.textContent = _decodedCams[_activeCam].id;
    }

    function switchCam(idx) {
      if (idx < 0 || idx >= _decodedCams.length || idx === _activeCam) return;
      _activeCam = idx;
      frameIdx = 0;
      lastFrame = 0;
      styleBtns();
      resizeCanvas();
      paint();
    }

    _keyHandler = function (e) {
      if (!_root) return;
      if (e.key === '1' && _decodedCams.length > 0) {
        e.preventDefault();
        switchCam(0);
      }
      if (e.key === '2' && _decodedCams.length > 1) {
        e.preventDefault();
        switchCam(1);
      }
    };
    window.addEventListener('keydown', _keyHandler);

    resizeCanvas();
    styleBtns();
    paint();
    ts.textContent = formatTs(new Date());

    _timer = setInterval(function () {
      dot.style.opacity = dot.style.opacity === '0.25' ? '1' : '0.25';
      ts.textContent = formatTs(new Date());
    }, 500);

    function tick(now) {
      if (!_root) return;
      if (now - lastFrame >= 1000 / fps) {
        frameIdx = (frameIdx + 1) % _decodedCams[_activeCam].frames.length;
        paint();
        lastFrame = now;
      }
      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);

    window.addEventListener('resize', function onResize() {
      if (!_root) {
        window.removeEventListener('resize', onResize);
        return;
      }
      resizeCanvas();
      paint();
    });

    return true;
  }

  global.SignalFeed = { start: start, stop: stop };
})(window);
