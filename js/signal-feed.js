/* Colored ASCII CCTV player for ./signal — depends on window.SIGNAL_FEED */
(function (global) {
  'use strict';

  var _timer = null;
  var _raf = null;
  var _root = null;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatTs(d) {
    return d.getFullYear() + '-'
      + pad(d.getMonth() + 1) + '-'
      + pad(d.getDate()) + ' '
      + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function decodeFrame(b64) {
    var s = atob(b64);
    var out = new Array(s.length / 7);
    var oi = 0;
    var i = 0;
    while (i < s.length) {
      out[oi++] = {
        ch: s.charAt(i++),
        color: '#' + s.substring(i, i + 6),
      };
      i += 6;
    }
    return out;
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
    if (_root && _root.parentNode) _root.parentNode.removeChild(_root);
    _root = null;
  }

  function start(overlayEl, opts) {
    stop();
    opts = opts || {};
    var feed = global.SIGNAL_FEED;
    if (!feed || !feed.frames || !feed.frames.length) return false;

    var w = feed.w;
    var h = feed.h;
    var fps = feed.fps || 8;
    var frames = feed.frames.map(decodeFrame);
    var frameIdx = 0;
    var lastFrame = 0;
    var camLabel = opts.camLabel || 'CAM-07 / THRESHOLD-N';
    var inputRow = overlayEl.querySelector('[data-cli-input-row]');

    _root = document.createElement('div');
    _root.className = 'signal-cctv';
    _root.style.cssText = [
      'position:absolute',
      'inset:12px 16px 52px 16px',
      'display:flex',
      'flex-direction:column',
      'background:#050504',
      'border:1px solid #2a2a22',
      'box-shadow:inset 0 0 40px rgba(0,0,0,0.55)',
      'overflow:hidden',
      'z-index:2',
    ].join(';');

    var top = document.createElement('div');
    top.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:14px',
      'padding:8px 12px',
      'font-size:11px',
      'letter-spacing:0.08em',
      'text-transform:uppercase',
      'color:#9aaa94',
      'border-bottom:1px solid #1a1a14',
      'background:linear-gradient(180deg,#121210,#0a0a08)',
      'flex-shrink:0',
    ].join(';');

    var rec = document.createElement('span');
    rec.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:#e8e4d8;font-weight:700;';
    var dot = document.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#e03030;box-shadow:0 0 8px #e03030;';
    rec.appendChild(dot);
    rec.appendChild(document.createTextNode('REC'));

    var live = document.createElement('span');
    live.textContent = 'LIVE';
    live.style.cssText = 'color:#7ecf8e;font-weight:700;';

    var cam = document.createElement('span');
    cam.textContent = camLabel;
    cam.style.cssText = 'margin-left:auto;color:#6a7568;font-size:10px;';

    top.appendChild(rec);
    top.appendChild(live);
    top.appendChild(cam);

    var view = document.createElement('div');
    view.style.cssText = [
      'position:relative',
      'flex:1',
      'min-height:0',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:#000',
      'overflow:hidden',
    ].join(';');

    var scan = document.createElement('div');
    scan.style.cssText = [
      'pointer-events:none',
      'position:absolute',
      'inset:0',
      'background:repeating-linear-gradient(0deg,rgba(0,0,0,0.12) 0px,rgba(0,0,0,0.12) 1px,transparent 1px,transparent 3px)',
      'opacity:0.35',
      'z-index:2',
    ].join(';');

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;max-width:100%;max-height:100%;image-rendering:pixelated;';

    var bottom = document.createElement('div');
    bottom.style.cssText = [
      'padding:7px 12px',
      'font-size:11px',
      'letter-spacing:0.06em',
      'color:#8a9488',
      'border-top:1px solid #1a1a14',
      'background:#0a0a08',
      'display:flex',
      'justify-content:space-between',
      'flex-shrink:0',
    ].join(';');

    var ts = document.createElement('span');
    var sig = document.createElement('span');
    sig.textContent = 'SIGNAL LOCKED — UNAUTHORISED TAP';
    sig.style.color = '#a63030';

    bottom.appendChild(ts);
    bottom.appendChild(sig);

    view.appendChild(canvas);
    view.appendChild(scan);
    _root.appendChild(top);
    _root.appendChild(view);
    _root.appendChild(bottom);

    overlayEl.style.position = 'relative';
    overlayEl.appendChild(_root);
    if (inputRow) inputRow.style.opacity = '0.35';

    function resizeCanvas() {
      var rect = view.getBoundingClientRect();
      var fontSize = Math.max(6, Math.floor(Math.min(rect.width / w, rect.height / h) * 1.05));
      canvas.width = Math.ceil(w * fontSize * 0.6);
      canvas.height = Math.ceil(h * fontSize);
      return fontSize;
    }

    function drawFrame(cells, fontSize) {
      var ctx = canvas.getContext('2d');
      var cw = fontSize * 0.6;
      var ch = fontSize;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px "Courier New",Courier,monospace';
      ctx.textBaseline = 'top';
      var ci = 0;
      var y;
      var x;
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          var cell = cells[ci++];
          ctx.fillStyle = cell.color;
          ctx.fillText(cell.ch, x * cw, y * ch);
        }
      }
    }

    var fontSize = resizeCanvas();
    drawFrame(frames[0], fontSize);
    ts.textContent = formatTs(new Date());

    _timer = setInterval(function () {
      dot.style.opacity = dot.style.opacity === '0.25' ? '1' : '0.25';
      ts.textContent = formatTs(new Date());
    }, 500);

    function tick(now) {
      if (!_root) return;
      var interval = 1000 / fps;
      if (now - lastFrame >= interval) {
        frameIdx = (frameIdx + 1) % frames.length;
        fontSize = resizeCanvas();
        drawFrame(frames[frameIdx], fontSize);
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
      fontSize = resizeCanvas();
      drawFrame(frames[frameIdx], fontSize);
    });

    return true;
  }

  global.SignalFeed = { start: start, stop: stop };
})(window);
