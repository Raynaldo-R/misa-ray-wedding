/* Guest mini-game leaderboards — shared via Google Apps Script, local fallback */
(function (global) {
  'use strict';

  var PREFIX = 'misa-ray-guest-lb-';
  var NAME_MAX = 24;
  var TOP_N = 10;
  var FETCH_TIMEOUT_MS = 12000;
  var POLL_MS = 30000;
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbwTqYd4l61WsxNyt4954cywDk9l6g2UKU9NbKG7zWXfyVoCcgoIefiEkE1VHXrP2VGZ/exec';

  var CATEGORIES = {
    flappy: {
      id: 'flappy',
      key: PREFIX + 'flappy',
      nameKey: PREFIX + 'name-flappy',
      higherBetter: true,
      label: 'pipes'
    },
    backrooms: {
      id: 'backrooms',
      key: PREFIX + 'backrooms',
      nameKey: PREFIX + 'name-backrooms',
      higherBetter: false,
      label: 'time'
    },
    clicker: {
      id: 'clicker',
      key: PREFIX + 'clicker',
      nameKey: PREFIX + 'name-clicker',
      higherBetter: true,
      label: 'coop score'
    }
  };

  function apiUrl() {
    var cfg = global.LEADERBOARD_CONFIG || {};
    var rsvp = global.RSVP_CONFIG || {};
    return cfg.apiUrl || cfg.googleScriptUrl || rsvp.googleScriptUrl || global.WEDDING_API_URL || GAS_URL;
  }

  function stripHtml(str) {
    return String(str).replace(/<[^>]*>/g, '');
  }

  function sanitizeName(raw) {
    var s = stripHtml(String(raw || '')).replace(/[\x00-\x1f\x7f]/g, '').trim();
    if (s.length > NAME_MAX) s = s.slice(0, NAME_MAX);
    return s;
  }

  function validateScore(val) {
    var n = Number(val);
    if (!isFinite(n) || n < 0) return null;
    return n;
  }

  function getCategory(id) {
    return CATEGORIES[id] || null;
  }

  function loadLocalEntries(cat) {
    try {
      var raw = localStorage.getItem(cat.key);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (e) {
        return e
          && typeof e.name === 'string'
          && typeof e.score === 'number'
          && isFinite(e.score)
          && e.score >= 0;
      });
    } catch (err) {
      return [];
    }
  }

  function saveLocalEntries(cat, entries) {
    try {
      localStorage.setItem(cat.key, JSON.stringify(entries.slice(0, TOP_N)));
    } catch (err) { /* storage full */ }
  }

  function sortEntries(cat, entries) {
    return entries.slice().sort(function (a, b) {
      if (a.score !== b.score) {
        return cat.higherBetter ? b.score - a.score : a.score - b.score;
      }
      return (a.at || 0) - (b.at || 0);
    });
  }

  function normalizeRemoteEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map(function (e) {
      return {
        name: sanitizeName(e.name),
        score: validateScore(e.score),
        at: e.at || 0
      };
    }).filter(function (e) {
      return e.name && e.score !== null;
    });
  }

  function gasFetchJson(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('timeout'));
      }, timeoutMs || FETCH_TIMEOUT_MS);
      fetch(url, Object.assign({
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      }, options || {}))
        .then(function (res) { return res.text(); })
        .then(function (text) {
          clearTimeout(timer);
          try {
            resolve(JSON.parse(text));
          } catch (err) {
            reject(new Error('invalid_json'));
          }
        })
        .catch(function (err) {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function buildGasUrl(params) {
    var base = apiUrl();
    if (!base) return '';
    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k]));
    }).join('&');
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + qs;
  }

  function fetchRemoteScores(categoryId) {
    if (!apiUrl()) return Promise.resolve(null);
    var url = buildGasUrl({ action: 'leaderboard', category: categoryId });
    return gasFetchJson(url)
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.entries)) return null;
        return { ok: true, entries: normalizeRemoteEntries(data.entries) };
      })
      .catch(function () { return null; });
  }

  function submitRemote(categoryId, name, score) {
    if (!apiUrl()) return Promise.resolve(null);
    var url = buildGasUrl({
      action: 'leaderboard_submit',
      category: categoryId,
      name: name,
      score: score
    });
    return gasFetchJson(url)
      .then(function (data) {
        // Reject stale GAS deploys that return the generic doGet payload without entries.
        if (!data || !data.ok || !Array.isArray(data.entries)) {
          return { ok: false, error: (data && data.error) || 'sync_failed' };
        }
        return {
          ok: true,
          entries: normalizeRemoteEntries(data.entries)
        };
      })
      .catch(function () {
        return { ok: false, error: 'network' };
      });
  }

  function getStoredName(categoryId) {
    var cat = getCategory(categoryId);
    if (!cat) return '';
    try {
      var stored = sanitizeName(localStorage.getItem(cat.nameKey) || '');
      if (stored) return stored;
      var entries = sortEntries(cat, loadLocalEntries(cat));
      if (entries.length && entries[0].name) {
        setStoredName(categoryId, entries[0].name);
        return entries[0].name;
      }
    } catch (err) { /* ignore */ }
    return '';
  }

  function setStoredName(categoryId, name) {
    var cat = getCategory(categoryId);
    if (!cat) return '';
    var safe = sanitizeName(name);
    try {
      if (safe) localStorage.setItem(cat.nameKey, safe);
      else localStorage.removeItem(cat.nameKey);
    } catch (err) { /* ignore */ }
    return safe;
  }

  function submitScoreLocal(categoryId, name, score) {
    var cat = getCategory(categoryId);
    if (!cat) return false;
    var safeName = sanitizeName(name);
    if (!safeName) return false;
    var validScore = validateScore(score);
    if (validScore === null) return false;
    setStoredName(categoryId, safeName);
    var entries = loadLocalEntries(cat);
    var replaced = false;
    var i;
    for (i = 0; i < entries.length; i++) {
      if (entries[i].name.toLowerCase() === safeName.toLowerCase()) {
        if (cat.higherBetter ? validScore > entries[i].score : validScore < entries[i].score) {
          entries[i].score = validScore;
          entries[i].at = Date.now();
        }
        replaced = true;
        break;
      }
    }
    if (!replaced) entries.push({ name: safeName, score: validScore, at: Date.now() });
    entries = sortEntries(cat, entries).slice(0, TOP_N);
    saveLocalEntries(cat, entries);
    return true;
  }

  function submitScore(categoryId, name, score) {
    var cat = getCategory(categoryId);
    if (!cat) return Promise.resolve({ ok: false, shared: false });
    var safeName = sanitizeName(name);
    if (!safeName) return Promise.resolve({ ok: false, shared: false });
    var validScore = validateScore(score);
    if (validScore === null) return Promise.resolve({ ok: false, shared: false });
    setStoredName(categoryId, safeName);

    return submitRemote(categoryId, safeName, validScore).then(function (result) {
      if (result && result.ok) {
        saveLocalEntries(cat, result.entries.length ? result.entries : loadLocalEntries(cat));
        return { ok: true, shared: true };
      }
      var localOk = submitScoreLocal(categoryId, safeName, validScore);
      return { ok: localOk, shared: false, error: result && result.error };
    });
  }

  function getTopScores(categoryId, limit) {
    var cat = getCategory(categoryId);
    if (!cat) return [];
    return sortEntries(cat, loadLocalEntries(cat)).slice(0, limit || TOP_N);
  }

  function formatBackroomsTime(ms) {
    var secs = ms / 1000;
    if (secs < 60) return secs.toFixed(1) + 's';
    var m = Math.floor(secs / 60);
    var s = (secs % 60).toFixed(1);
    return m + 'm ' + s + 's';
  }

  function formatScore(categoryId, score, opts) {
    opts = opts || {};
    if (categoryId === 'backrooms') return formatBackroomsTime(score);
    if (categoryId === 'clicker' && opts.clickerDetail) {
      return opts.clickerDetail;
    }
    if (categoryId === 'clicker') {
      var flock = Math.floor(score / 1000000);
      var grains = Math.floor(score % 1000000);
      return flock + ' birds · ' + grains.toLocaleString() + ' grains';
    }
    return String(Math.floor(score));
  }

  function clickerCompositeScore(flockSize, grains) {
    var flock = validateScore(flockSize);
    var g = validateScore(grains);
    if (flock === null || g === null) return null;
    // Grains live in the low 6 digits so flock size decodes cleanly on the leaderboard.
    return flock * 1000000 + Math.min(999999, Math.floor(g));
  }

  function clearEl(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function textEl(tag, cls, parent, value) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value != null) el.textContent = String(value);
    if (parent) parent.appendChild(el);
    return el;
  }

  function stopPolling(container) {
    if (container && container._lbPollId) {
      clearInterval(container._lbPollId);
      container._lbPollId = null;
    }
  }

  function paintEntries(container, categoryId, entries, opts, mode) {
    clearEl(container);
    container.classList.add('guest-lb');

    textEl('div', 'guest-lb__title', container, opts.title || 'Guest leaderboard');

    if (mode === 'shared') {
      textEl('p', 'guest-lb__status guest-lb__status--shared', container, 'All guests · live scores');
    } else if (mode === 'offline') {
      textEl('p', 'guest-lb__status guest-lb__status--offline', container, 'Server unreachable — showing cached scores');
    } else {
      textEl('p', 'guest-lb__status guest-lb__status--local', container, 'Cached on this device only');
    }

    if (!entries.length) {
      textEl('p', 'guest-lb__empty', container, opts.emptyText || 'No scores yet — be the first!');
      return;
    }

    var list = document.createElement('ol');
    list.className = 'guest-lb__list';
    container.appendChild(list);

    entries.forEach(function (entry, i) {
      var li = document.createElement('li');
      li.className = 'guest-lb__row';
      textEl('span', 'guest-lb__rank', li, i + 1);
      textEl('span', 'guest-lb__name', li, sanitizeName(entry.name) || 'Guest');
      textEl('span', 'guest-lb__score', li, formatScore(categoryId, entry.score, opts));
      list.appendChild(li);
    });
  }

  function render(container, categoryId, opts) {
    opts = opts || {};
    if (!container) return Promise.resolve();

    var cat = getCategory(categoryId);
    if (!cat) return Promise.resolve();

    stopPolling(container);
    clearEl(container);
    container.classList.add('guest-lb');
    textEl('div', 'guest-lb__title', container, opts.title || 'Guest leaderboard');
    textEl('p', 'guest-lb__status', container, 'Loading scores…');

    function load() {
      if (!apiUrl()) {
        paintEntries(container, categoryId, getTopScores(categoryId, opts.limit), opts, 'local');
        return Promise.resolve(false);
      }
      return fetchRemoteScores(categoryId).then(function (remote) {
        if (remote && remote.ok) {
          saveLocalEntries(cat, remote.entries);
          paintEntries(
            container,
            categoryId,
            remote.entries.slice(0, opts.limit || TOP_N),
            opts,
            'shared'
          );
          return true;
        }
        paintEntries(
          container,
          categoryId,
          getTopScores(categoryId, opts.limit),
          opts,
          'offline'
        );
        return false;
      });
    }

    container._lbReload = load;

    return load().then(function () {
      if (opts.poll !== false && apiUrl()) {
        container._lbPollId = setInterval(function () {
          if (container._lbReload) container._lbReload();
        }, opts.pollMs || POLL_MS);
      }
    });
  }

  function buildPromptForm(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'guest-lb-prompt';
    if (opts.compact) wrap.classList.add('guest-lb-prompt--compact');

    if (opts.title) textEl('p', 'guest-lb-prompt__title', wrap, opts.title);
    if (opts.message) textEl('p', 'guest-lb-prompt__message', wrap, opts.message);

    var form = document.createElement('form');
    form.className = 'guest-lb-prompt__form';
    form.setAttribute('novalidate', 'novalidate');
    wrap.appendChild(form);

    var label = document.createElement('label');
    label.className = 'guest-lb-prompt__label';
    label.textContent = opts.nameLabel || 'Your name';
    form.appendChild(label);

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'guest-lb-prompt__input';
    input.maxLength = NAME_MAX;
    input.autocomplete = 'nickname';
    input.placeholder = opts.placeholder || 'Guest name';
    input.value = sanitizeName(opts.defaultName || '');
    form.appendChild(input);

    var actions = document.createElement('div');
    actions.className = 'guest-lb-prompt__actions';
    form.appendChild(actions);

    var submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'guest-lb-prompt__submit';
    submitBtn.textContent = opts.submitLabel || 'Save score';
    actions.appendChild(submitBtn);

    if (!opts.required) {
      var skipBtn = document.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'guest-lb-prompt__skip';
      skipBtn.textContent = opts.skipLabel || 'Skip';
      actions.appendChild(skipBtn);
      skipBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof opts.onSkip === 'function') opts.onSkip();
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = sanitizeName(input.value);
      if (!name) {
        input.focus();
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
      if (typeof opts.onSubmit === 'function') {
        opts.onSubmit(name, submitBtn, function reenable() {
          submitBtn.disabled = false;
          submitBtn.textContent = opts.submitLabel || 'Save score';
        });
      }
    });

    return { wrap: wrap, input: input, form: form, submitBtn: submitBtn };
  }

  function promptName(opts) {
    opts = opts || {};
    var parent = opts.container || document.body;
    var existing = parent.querySelector('.guest-lb-prompt');
    if (existing) existing.remove();

    var built = buildPromptForm(opts);
    parent.appendChild(built.wrap);
    built.input.focus();

    return {
      el: built.wrap,
      input: built.input,
      remove: function () {
        if (built.wrap.parentNode) built.wrap.parentNode.removeChild(built.wrap);
      }
    };
  }

  function promptScoreSubmit(opts) {
    opts = opts || {};
    var cat = getCategory(opts.category);
    if (!cat) return null;

    return promptName({
      container: opts.container,
      compact: opts.compact,
      title: opts.title,
      message: opts.message,
      defaultName: opts.defaultName || getStoredName(opts.category),
      required: opts.required,
      submitLabel: opts.submitLabel || 'Submit score',
      skipLabel: opts.skipLabel || 'Skip',
      onSubmit: function (name, submitBtn, reenable) {
        submitScore(opts.category, name, opts.score).then(function (result) {
          if (!result.ok && submitBtn) {
            submitBtn.textContent = 'Try again';
            if (reenable) reenable();
            return;
          }
          if (typeof opts.onSubmit === 'function') opts.onSubmit(result.ok, name, result.shared);
        });
      },
      onSkip: opts.onSkip
    });
  }

  function mountNameField(opts) {
    opts = opts || {};
    var container = opts.container;
    if (!container) return null;

    var stored = getStoredName(opts.category);

    clearEl(container);
    container.className = 'guest-lb-namebar';

    if (stored && opts.showStored !== false) {
      container.className = 'guest-lb-namebar guest-lb-namebar--set';
      textEl('span', 'guest-lb-namebar__label', container, 'Playing as');
      textEl('strong', 'guest-lb-namebar__name', container, stored);
      var change = document.createElement('button');
      change.type = 'button';
      change.className = 'guest-lb-namebar__change';
      change.textContent = 'Change';
      container.appendChild(change);
      change.addEventListener('click', function () {
        mountNameField(Object.assign({}, opts, { showStored: false }));
      });
      return { el: container, name: stored };
    }

    var built = buildPromptForm({
      compact: true,
      message: opts.message || 'Enter your name for the guest leaderboard',
      defaultName: stored || opts.defaultName || '',
      submitLabel: opts.submitLabel || 'Set name',
      required: false,
      onSubmit: function (name) {
        setStoredName(opts.category, name);
        if (typeof opts.onNameSet === 'function') opts.onNameSet(name);
        mountNameField(opts);
      },
      onSkip: function () {
        if (typeof opts.onSkip === 'function') opts.onSkip();
      }
    });

    container.appendChild(built.wrap);
    return { el: container, input: built.input };
  }

  global.GuestLeaderboard = {
    CATEGORIES: CATEGORIES,
    TOP_N: TOP_N,
    NAME_MAX: NAME_MAX,
    sanitizeName: sanitizeName,
    validateScore: validateScore,
    getStoredName: getStoredName,
    setStoredName: setStoredName,
    submitScore: submitScore,
    getTopScores: getTopScores,
    fetchRemoteScores: fetchRemoteScores,
    formatScore: formatScore,
    clickerCompositeScore: clickerCompositeScore,
    render: render,
    stopPolling: stopPolling,
    promptName: promptName,
    promptScoreSubmit: promptScoreSubmit,
    mountNameField: mountNameField,
    isSharedEnabled: function () { return !!apiUrl(); }
  };
})(typeof window !== 'undefined' ? window : global);
