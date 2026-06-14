/* Colored ASCII CCTV player for ./signal — depends on window.SIGNAL_FEED */
(function (global) {
  'use strict';

  var _timer = null;
  var _raf = null;
  var _root = null;
  var FONT_SIZE = 7;

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
    var n = s.length / 7;
    var out = new Array(n);
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

  function drawFrame(ctx, cells, w, h, fontSize) {
    var cw = fontSize * 0.6;
    var ch = fontSize;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = fontSize + 'px "Courier New",Courier,monospace';
    ctx.textBaseline = 'top';
    var ci = 0;
    var y;
    var x;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        var cell = cells[ci++];
        if (!cell) return;
        ctx.fillStyle = cell.color;
        ctx.fillText(cell.ch, x * cw, y * ch);
      }
    }
  }

  function start(outputEl, opts) {
    stop();
    if (!outputEl) return false;
    opts = opts || {};

    var feed = global.SIGNAL_FEED;
    if (!feed || !feed.frames || !feed.frames.length) return false;

    var w = feed.w;
    var h = feed.h;
    var fps = feed.fps || 8;
    var frames;
    try {
      frames = feed.frames.map(decodeFrame);
    } catch (err) {
      return false;
    }

    var frameIdx = 0;
    var lastFrame = 0;
    var camLabel = opts.camLabel || 'CAM-07 / THRESHOLD-N';
    var cw = FONT_SIZE * 0.6;
    var canvasW = Math.ceil(w * cw);
    var canvasH = Math.ceil(h * FONT_SIZE);

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
      'gap:12px',
      'padding:6px 10px',
      'font-size:10px',
      'letter-spacing:0.08em',
      'text-transform:uppercase',
      'color:#8a9a84',
      'border-bottom:1px solid #1e261c',
      'background:#0a0c08',
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

    var cam = document.createElement('span');
    cam.textContent = camLabel;
    cam.style.cssText = 'margin-left:auto;color:#5f6a5c;font-size:9px;';

    top.appendChild(rec);
    top.appendChild(live);
    top.appendChild(cam);

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
      'background:repeating-linear-gradient(0deg,rgba(0,0,0,0.14) 0px,rgba(0,0,0,0.14) 1px,transparent 1px,transparent 3px)',
      'opacity:0.3',
      'z-index:2',
    ].join(';');

    var canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.cssText = 'display:block;width:' + canvasW + 'px;height:' + canvasH + 'px;image-rendering:pixelated;';

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
    var sig = document.createElement('span');
    sig.textContent = 'SIGNAL LOCKED';
    sig.style.color = '#a63030';

    bottom.appendChild(ts);
    bottom.appendChild(sig);

    view.appendChild(canvas);
    view.appendChild(scan);
    _root.appendChild(top);
    _root.appendChild(view);
    _root.appendChild(bottom);
    outputEl.appendChild(_root);
    outputEl.scrollTop = outputEl.scrollHeight;

    var ctx = canvas.getContext('2d');
    drawFrame(ctx, frames[0], w, h, FONT_SIZE);
    ts.textContent = formatTs(new Date());

    _timer = setInterval(function () {
      dot.style.opacity = dot.style.opacity === '0.25' ? '1' : '0.25';
      ts.textContent = formatTs(new Date());
    }, 500);

    function tick(now) {
      if (!_root) return;
      if (now - lastFrame >= 1000 / fps) {
        frameIdx = (frameIdx + 1) % frames.length;
        drawFrame(ctx, frames[frameIdx], w, h, FONT_SIZE);
        lastFrame = now;
      }
      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);

    return true;
  }

  global.SignalFeed = { start: start, stop: stop };
})(window);
