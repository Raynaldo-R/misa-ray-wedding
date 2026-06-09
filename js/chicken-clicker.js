/**
 * Chicken Fund — cookie-clicker style flock simulator (optimized)
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'misa-ray-chicken-clicker-v1';
  var TICK_MS = 1400;
  var SAVE_DEBOUNCE_MS = 500;
  var MAX_BURST = 14;
  var WORM_IMG = 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fpngimg.com%2Fuploads%2Fworms%2Fworms_PNG32.png&f=1&nofb=1&ipt=7e59e3a5aa1e5178b2888d11179c23049673dc058a54bfb211a6ce13361a25f8';
  var CHICKEN_GIFS = [
    'https://web.archive.org/web/20090804022413im_/http://geocities.com/SouthBeach/Cabana/7599/1Rstr.GIF',
    'https://web.archive.org/web/20090804022413im_/http://geocities.com/SouthBeach/Cabana/7599/6Rstr.GIF',
    'https://web.archive.org/web/20090804022413im_/http://geocities.com/SouthBeach/Cabana/7599/7Rstr.GIF'
  ];
  var EVOLUTIONS = [
    { id: 'gold', label: 'Golden', minFed: 800, chance: 0.35 },
    { id: 'ember', label: 'Ember', minFed: 2000, chance: 0.25 },
    { id: 'fire', label: 'Fire', minFed: 4500, chance: 0.18 },
    { id: 'ice', label: 'Frost', minFed: 3500, chance: 0.15 },
    { id: 'shadow', label: 'Shadow', minFed: 6000, chance: 0.12 }
  ];

  var GRAIN_CLICK_UPGRADES = [
    { id: 'g2', label: 'Better scoop', desc: '2 grains per click', power: 2, cost: 12 },
    { id: 'g3', label: 'Handful', desc: '3 grains per click', power: 3, cost: 40 },
    { id: 'g5', label: 'Small bucket', desc: '5 grains per click', power: 5, cost: 150 },
    { id: 'g8', label: 'Feed pail', desc: '8 grains per click', power: 8, cost: 600 },
    { id: 'g12', label: 'Wheelbarrow', desc: '12 grains per click', power: 12, cost: 2200 },
    { id: 'g18', label: 'Silo tap', desc: '18 grains per click', power: 18, cost: 8000 },
    { id: 'g25', label: 'Industrial auger', desc: '25 grains per click', power: 25, cost: 28000 },
    { id: 'g35', label: 'Mega dispenser', desc: '35 grains per click', power: 35, cost: 95000 },
    { id: 'g50', label: 'Grain tsunami', desc: '50 grains per click — unlocks worms', power: 50, cost: 320000, unlocksWorms: true }
  ];

  var WORM_CLICK_UPGRADES = [
    { id: 'w1', label: 'One worm', desc: '1 worm per click', power: 1, cost: 200 },
    { id: 'w2', label: 'Worm pair', desc: '2 worms per click', power: 2, cost: 900 },
    { id: 'w4', label: 'Worm trio', desc: '4 worms per click', power: 4, cost: 3500 },
    { id: 'w8', label: 'Worm handful', desc: '8 worms per click', power: 8, cost: 14000 },
    { id: 'w15', label: 'Worm bucket', desc: '15 worms per click', power: 15, cost: 55000 },
    { id: 'w25', label: 'Worm wheelbarrow', desc: '25 worms per click', power: 25, cost: 180000 },
    { id: 'w40', label: 'Worm silo', desc: '40 worms per click', power: 40, cost: 600000 },
    { id: 'w50', label: 'Worm apocalypse', desc: '50 worms per click', power: 50, cost: 2000000 }
  ];

  var COOP_UPGRADES = [
    { id: 'hen', label: 'Adopt a hen', desc: 'Lays eggs when well fed', type: 'hen', cost: 80, scale: 1.55 },
    { id: 'rooster', label: 'Adopt a rooster', desc: 'Helps eggs hatch (+hatch rate)', type: 'rooster', cost: 250, scale: 1.7 },
    { id: 'nest', label: 'Extra nest box', desc: 'Eggs pile up 25% faster', type: 'nest', cost: 500, scale: 2, max: 8 },
    { id: 'incubator', label: 'Warm incubator', desc: '+3% max hatch rate', type: 'incubator', cost: 1200, scale: 2.2, max: 5 }
  ];

  var GRAIN_BY_ID = Object.create(null);
  var WORM_BY_ID = Object.create(null);
  var COOP_BY_ID = Object.create(null);
  GRAIN_CLICK_UPGRADES.forEach(function (u) { GRAIN_BY_ID[u.id] = u; });
  WORM_CLICK_UPGRADES.forEach(function (u) { WORM_BY_ID[u.id] = u; });
  COOP_UPGRADES.forEach(function (u) { COOP_BY_ID[u.id] = u; });

  function defaultState() {
    return {
      grains: 0,
      lifetimeGrains: 0,
      eggs: 0,
      feedMode: 'grain',
      grainPerClick: 1,
      wormPerClick: 0,
      wormsUnlocked: false,
      bought: {},
      nestBonus: 0,
      incubatorLevel: 0,
      flockFeedPool: 0,
      nextId: 2,
      flock: [{ id: 1, sex: 'hen', fed: 0, evolution: null, gif: 0 }]
    };
  }

  function formatNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toLocaleString();
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function birdClass(bird) {
    return 'chicken-bird chicken-bird--' + bird.sex + (bird.evolution ? ' chicken-bird--' + bird.evolution : '');
  }

  function recomputeStats(state) {
    var hens = 0;
    var roosters = 0;
    var i;
    for (i = 0; i < state.flock.length; i++) {
      if (state.flock[i].sex === 'hen') hens++;
      else roosters++;
    }
    var hatch = 0;
    if (roosters) {
      hatch = Math.min(0.30, roosters * 0.04 + state.incubatorLevel * 0.03);
      hatch = Math.min(0.30, hatch + Math.min(0.08, state.flock.length * 0.002));
    }
    var eggThreshold = Math.max(18, Math.floor(30 - Math.max(1, hens) * 1.2 - state.nestBonus * 3));
    return { hens: hens, roosters: roosters, hatch: hatch, eggThreshold: eggThreshold };
  }

  function nextGrainUpgrade(state) {
    for (var i = 0; i < GRAIN_CLICK_UPGRADES.length; i++) {
      if (!state.bought[GRAIN_CLICK_UPGRADES[i].id]) return GRAIN_CLICK_UPGRADES[i];
    }
    return null;
  }

  function nextWormUpgrade(state) {
    if (!state.wormsUnlocked) return null;
    for (var i = 0; i < WORM_CLICK_UPGRADES.length; i++) {
      if (!state.bought[WORM_CLICK_UPGRADES[i].id]) return WORM_CLICK_UPGRADES[i];
    }
    return null;
  }

  function coopUpgradeCost(def, state) {
    var n = state.bought[def.id] || 0;
    return Math.floor(def.cost * Math.pow(def.scale, n));
  }

  function tryEvolve(chicken) {
    if (chicken.evolution) return null;
    var roll = Math.random();
    var i;
    for (i = EVOLUTIONS.length - 1; i >= 0; i--) {
      var evo = EVOLUTIONS[i];
      if (chicken.fed >= evo.minFed && roll < evo.chance) {
        chicken.evolution = evo.id;
        return evo;
      }
    }
    return null;
  }

  function upgradeRow(title, desc, cost, afford, buyKey) {
    return '<button type="button" class="chicken-upgrade-row' + (afford ? ' can-afford' : '') + '" data-buy="' + buyKey + '" data-cost="' + cost + '"' + (afford ? '' : ' disabled') + '>' +
      '<span class="chicken-upgrade-row-main"><strong>' + title + '</strong><span>' + desc + '</span></span>' +
      '<span class="chicken-upgrade-row-cost">' + formatNum(cost) + ' grains</span>' +
      '</button>';
  }

  function ChickenClicker(opts) {
    this.modal = opts.modal;
    this.hitbox = opts.hitbox;
    this.previewFlock = opts.previewFlock;
    this.state = loadState();
    this.els = {};
    this.stats = recomputeStats(this.state);
    this.tickId = null;
    this.saveTimer = null;
    this.open = false;
    this.upgradesDirty = true;
    this.flockNodes = [];
    this.burstCount = 0;
    this._hudCache = {};
    this._bind();
    this.recompute();
    this.renderUpgrades(true);
    this.renderFlock(true);
    this._renderPreview();
  }

  ChickenClicker.prototype.scheduleSave = function () {
    var self = this;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(function () {
      saveState(self.state);
      self.saveTimer = null;
    }, SAVE_DEBOUNCE_MS);
  };

  ChickenClicker.prototype.flushSave = function () {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    saveState(this.state);
  };

  ChickenClicker.prototype.recompute = function () {
    this.stats = recomputeStats(this.state);
  };

  ChickenClicker.prototype._bind = function () {
    var self = this;
    this.els.hudGrains = document.getElementById('chicken-hud-grains');
    this.els.hudEggs = document.getElementById('chicken-hud-eggs');
    this.els.hudFlock = document.getElementById('chicken-hud-flock');
    this.els.hudClick = document.getElementById('chicken-hud-click');
    this.els.hudHatch = document.getElementById('chicken-hud-hatch');
    this.els.clickArea = document.getElementById('chicken-click-area');
    this.els.flockLayer = document.getElementById('chicken-flock-layer');
    this.els.burstLayer = document.getElementById('chicken-click-burst');
    this.els.upgradeList = document.getElementById('chicken-upgrade-list');
    this.els.modeGrain = document.getElementById('chicken-mode-grain');
    this.els.modeWorm = document.getElementById('chicken-mode-worm');
    this.els.clickLabel = document.getElementById('chicken-click-label');

    if (this.hitbox) {
      this.hitbox.addEventListener('click', function () { self.openModal(); });
    }
    if (this.modal) {
      this.modal.querySelectorAll('[data-chicken-close]').forEach(function (el) {
        el.addEventListener('click', function () { self.closeModal(); });
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.open) self.closeModal();
    });

    if (this.els.clickArea) {
      this.els.clickArea.addEventListener('click', function (e) {
        self.onClick(e);
      });
    }
    if (this.els.modeGrain) {
      this.els.modeGrain.addEventListener('click', function (e) {
        e.stopPropagation();
        self.setMode('grain');
      });
    }
    if (this.els.modeWorm) {
      this.els.modeWorm.addEventListener('click', function (e) {
        e.stopPropagation();
        self.setMode('worm');
      });
    }
    if (this.els.upgradeList) {
      this.els.upgradeList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-buy]');
        if (!btn || btn.disabled) return;
        var parts = btn.getAttribute('data-buy').split(':');
        if (parts[0] === 'grain' && GRAIN_BY_ID[parts[1]]) self.buyGrainUpgrade(GRAIN_BY_ID[parts[1]]);
        else if (parts[0] === 'worm' && WORM_BY_ID[parts[1]]) self.buyWormUpgrade(WORM_BY_ID[parts[1]]);
        else if (parts[0] === 'coop' && COOP_BY_ID[parts[1]]) self.buyCoopUpgrade(COOP_BY_ID[parts[1]]);
      });
    }
  };

  ChickenClicker.prototype.setMode = function (mode) {
    if (mode === 'worm' && !this.state.wormsUnlocked) return;
    this.state.feedMode = mode;
    this.renderHud();
    this.scheduleSave();
  };

  ChickenClicker.prototype.clickValue = function () {
    if (this.state.feedMode === 'worm' && this.state.wormsUnlocked) {
      return { type: 'worm', amount: Math.max(1, this.state.wormPerClick) };
    }
    return { type: 'grain', amount: this.state.grainPerClick };
  };

  ChickenClicker.prototype.onClick = function (e) {
    var val = this.clickValue();
    var amount = val.amount;
    var nutrition = amount * (val.type === 'worm' ? 12 : 1);

    this.state.grains += amount;
    this.state.lifetimeGrains += amount;
    this.state.flockFeedPool += nutrition;

    var threshold = this.stats.eggThreshold;
    while (this.state.flockFeedPool >= threshold) {
      this.state.flockFeedPool -= threshold;
      this.state.eggs += 1;
    }

    var perBird = nutrition / this.state.flock.length;
    var flock = this.state.flock;
    var evolved = false;
    var i;
    for (i = 0; i < flock.length; i++) {
      flock[i].fed += perBird;
      if (!flock[i].evolution && tryEvolve(flock[i])) evolved = true;
    }

    this.spawnBurst(e, val);
    this.renderHud();
    this.syncUpgradeAfford();
    if (evolved) this.syncFlockVisuals();
    this.scheduleSave();
  };

  ChickenClicker.prototype.spawnBurst = function (e, val) {
    if (!this.els.burstLayer || !this.els.clickArea) return;
    if (this.burstCount >= MAX_BURST) return;
    var rect = this.els.clickArea.getBoundingClientRect();
    var x = (e.clientX || rect.left + rect.width / 2) - rect.left;
    var y = (e.clientY || rect.top + rect.height / 2) - rect.top;
    var el = document.createElement('span');
    el.className = 'chicken-click-pop';
    if (val.type === 'worm') {
      el.textContent = '+' + val.amount;
      el.insertAdjacentHTML('afterbegin', '<img src="' + WORM_IMG + '" alt="" width="18" height="18">');
    } else {
      el.textContent = '+' + val.amount + ' grain' + (val.amount === 1 ? '' : 's');
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.els.burstLayer.appendChild(el);
    this.burstCount += 1;
    setTimeout(function () {
      if (el.parentNode) el.remove();
      this.burstCount = Math.max(0, this.burstCount - 1);
    }.bind(this), 700);
  };

  ChickenClicker.prototype.buyGrainUpgrade = function (def) {
    if (this.state.bought[def.id] || this.state.grains < def.cost) return;
    this.state.grains -= def.cost;
    this.state.bought[def.id] = 1;
    this.state.grainPerClick = def.power;
    if (def.unlocksWorms) this.state.wormsUnlocked = true;
    this.upgradesDirty = true;
    this.afterPurchase();
  };

  ChickenClicker.prototype.buyWormUpgrade = function (def) {
    if (!this.state.wormsUnlocked || this.state.bought[def.id] || this.state.grains < def.cost) return;
    this.state.grains -= def.cost;
    this.state.bought[def.id] = 1;
    this.state.wormPerClick = def.power;
    this.upgradesDirty = true;
    this.afterPurchase();
  };

  ChickenClicker.prototype.buyCoopUpgrade = function (def) {
    var count = this.state.bought[def.id] || 0;
    if (def.max && count >= def.max) return;
    var cost = coopUpgradeCost(def, this.state);
    if (this.state.grains < cost) return;
    this.state.grains -= cost;
    this.state.bought[def.id] = count + 1;

    if (def.type === 'hen' || def.type === 'rooster') {
      this.state.flock.push({
        id: this.state.nextId++,
        sex: def.type,
        fed: 0,
        evolution: null,
        gif: (Math.random() * CHICKEN_GIFS.length) | 0
      });
      this.appendFlockBird(this.state.flock[this.state.flock.length - 1], this.state.flock.length - 1);
    } else if (def.type === 'nest') {
      this.state.nestBonus += 1;
    } else if (def.type === 'incubator') {
      this.state.incubatorLevel += 1;
    }

    this.recompute();
    this.upgradesDirty = true;
    this.afterPurchase();
  };

  ChickenClicker.prototype.afterPurchase = function () {
    this.renderHud();
    this.renderUpgrades(this.upgradesDirty);
    this._renderPreview();
    this.scheduleSave();
  };

  ChickenClicker.prototype.hatchTick = function () {
    var rate = this.stats.hatch;
    if (!rate || !this.state.eggs) return false;

    var changed = false;
    var attempts = Math.min(this.state.eggs, Math.max(1, Math.ceil(this.state.eggs * rate * 0.15)));
    var i;
    for (i = 0; i < attempts; i++) {
      if (!this.state.eggs) break;
      if (Math.random() > rate) continue;
      this.state.eggs -= 1;
      var bird = {
        id: this.state.nextId++,
        sex: Math.random() < 0.22 ? 'rooster' : 'hen',
        fed: 0,
        evolution: null,
        gif: (Math.random() * CHICKEN_GIFS.length) | 0
      };
      this.state.flock.push(bird);
      this.appendFlockBird(bird, this.state.flock.length - 1);
      changed = true;
    }
    if (changed) {
      this.recompute();
      this.upgradesDirty = true;
      this.scheduleSave();
    }
    return changed;
  };

  ChickenClicker.prototype.evolveTick = function () {
    var evolved = false;
    var flock = this.state.flock;
    var i;
    for (i = 0; i < flock.length; i++) {
      if (!flock[i].evolution && tryEvolve(flock[i])) evolved = true;
    }
    if (evolved) {
      this.syncFlockVisuals();
      this.scheduleSave();
    }
  };

  ChickenClicker.prototype.loop = function () {
    if (!this.open) return;
    var hatched = this.hatchTick();
    this.renderHud();
    if (hatched) {
      this.renderUpgrades(true);
      this._renderPreview();
    } else {
      this.syncUpgradeAfford();
    }
    if (Math.random() < 0.35) this.evolveTick();
  };

  ChickenClicker.prototype.startLoop = function () {
    var self = this;
    if (this.tickId) return;
    this.tickId = setInterval(function () { self.loop(); }, TICK_MS);
  };

  ChickenClicker.prototype.stopLoop = function () {
    if (this.tickId) {
      clearInterval(this.tickId);
      this.tickId = null;
    }
  };

  ChickenClicker.prototype.renderHud = function () {
    var val = this.clickValue();
    var cache = this._hudCache;
    var grains = formatNum(this.state.grains);
    if (cache.grains !== grains && this.els.hudGrains) {
      this.els.hudGrains.textContent = grains;
      cache.grains = grains;
    }
    var eggs = formatNum(this.state.eggs);
    if (cache.eggs !== eggs && this.els.hudEggs) {
      this.els.hudEggs.textContent = eggs;
      cache.eggs = eggs;
    }
    var flockTxt = this.state.flock.length + ' (' + this.stats.hens + ' hens · ' + this.stats.roosters + ' roosters)';
    if (cache.flock !== flockTxt && this.els.hudFlock) {
      this.els.hudFlock.textContent = flockTxt;
      cache.flock = flockTxt;
    }
    var clickTxt = val.type === 'worm'
      ? val.amount + ' worm' + (val.amount === 1 ? '' : 's') + ' / click'
      : val.amount + ' grain' + (val.amount === 1 ? '' : 's') + ' / click';
    if (cache.click !== clickTxt && this.els.hudClick) {
      this.els.hudClick.textContent = clickTxt;
      cache.click = clickTxt;
    }
    var hatchTxt = Math.round(this.stats.hatch * 100) + '% hatch rate';
    if (cache.hatch !== hatchTxt && this.els.hudHatch) {
      this.els.hudHatch.textContent = hatchTxt;
      cache.hatch = hatchTxt;
    }
    var labelTxt = val.type === 'worm'
      ? 'Drop worms! (+' + val.amount + ' per click)'
      : 'Scatter feed! (+' + val.amount + ' per click)';
    if (cache.label !== labelTxt && this.els.clickLabel) {
      this.els.clickLabel.textContent = labelTxt;
      cache.label = labelTxt;
    }
    if (this.els.modeGrain) {
      this.els.modeGrain.classList.toggle('is-active', this.state.feedMode === 'grain');
    }
    if (this.els.modeWorm) {
      var wormOn = this.state.feedMode === 'worm';
      this.els.modeWorm.classList.toggle('is-active', wormOn);
      this.els.modeWorm.disabled = !this.state.wormsUnlocked;
      this.els.modeWorm.title = this.state.wormsUnlocked ? '' : 'Unlock at 50 grains per click';
    }
  };

  ChickenClicker.prototype.appendFlockBird = function (bird, index) {
    if (!this.els.flockLayer) return;
    var wrap = document.createElement('div');
    wrap.className = 'chicken-bird-slot';
    wrap.style.setProperty('--bird-i', index);
    var img = document.createElement('img');
    img.className = birdClass(bird);
    img.src = CHICKEN_GIFS[bird.gif % CHICKEN_GIFS.length];
    img.alt = '';
    img.width = 40;
    img.height = 50;
    img.loading = 'lazy';
    img.decoding = 'async';
    wrap.appendChild(img);
    this.els.flockLayer.appendChild(wrap);
    this.flockNodes.push({ wrap: wrap, img: img, id: bird.id });
  };

  ChickenClicker.prototype.syncFlockVisuals = function () {
    var flock = this.state.flock;
    var i;
    for (i = 0; i < flock.length; i++) {
      var node = this.flockNodes[i];
      if (!node) continue;
      var cls = birdClass(flock[i]);
      if (node.img.className !== cls) node.img.className = cls;
      node.wrap.style.setProperty('--bird-i', i);
    }
  };

  ChickenClicker.prototype.renderFlock = function (force) {
    if (!this.els.flockLayer) return;
    if (!force && this.flockNodes.length === this.state.flock.length) {
      this.syncFlockVisuals();
      return;
    }
    this.els.flockLayer.innerHTML = '';
    this.flockNodes = [];
    var flock = this.state.flock;
    var i;
    for (i = 0; i < flock.length; i++) {
      this.appendFlockBird(flock[i], i);
    }
  };

  ChickenClicker.prototype._renderPreview = function () {
    if (!this.previewFlock) return;
    var n = Math.min(6, this.state.flock.length);
    var imgs = this.previewFlock.querySelectorAll('.chicken-bird');
    var i;
    for (i = 0; i < imgs.length; i++) {
      imgs[i].style.display = i < n ? '' : 'none';
    }
  };

  ChickenClicker.prototype.syncUpgradeAfford = function () {
    if (!this.els.upgradeList) return;
    var grains = this.state.grains;
    this.els.upgradeList.querySelectorAll('[data-buy]').forEach(function (btn) {
      var cost = Number(btn.getAttribute('data-cost'));
      var afford = grains >= cost;
      btn.disabled = !afford;
      btn.classList.toggle('can-afford', afford);
    });
  };

  ChickenClicker.prototype.renderUpgrades = function (force) {
    if (!this.els.upgradeList) return;
    if (!force && !this.upgradesDirty) {
      this.syncUpgradeAfford();
      return;
    }
    this.upgradesDirty = false;

    var self = this;
    var html = '';
    var g = nextGrainUpgrade(this.state);
    if (g) html += upgradeRow(g.label, g.desc, g.cost, this.state.grains >= g.cost, 'grain:' + g.id);
    var w = nextWormUpgrade(this.state);
    if (w) html += upgradeRow(w.label, w.desc, w.cost, this.state.grains >= w.cost, 'worm:' + w.id);
    else if (this.state.wormsUnlocked && !w) {
      html += '<p class="chicken-upgrade-maxed">All worm click upgrades owned.</p>';
    }
    COOP_UPGRADES.forEach(function (def) {
      var count = self.state.bought[def.id] || 0;
      if (def.max && count >= def.max) return;
      var cost = coopUpgradeCost(def, self.state);
      var desc = def.desc;
      if (count) desc += ' (owned: ' + count + (def.max ? '/' + def.max : '') + ')';
      html += upgradeRow(def.label, desc, cost, self.state.grains >= cost, 'coop:' + def.id);
    });
    this.els.upgradeList.innerHTML = html || '<p class="chicken-upgrade-maxed">The flock is magnificent. Keep clicking.</p>';
  };

  ChickenClicker.prototype.render = function () {
    this.recompute();
    this.renderHud();
    this.renderFlock(true);
    this.renderUpgrades(true);
    this._renderPreview();
  };

  ChickenClicker.prototype.openModal = function () {
    if (!this.modal) return;
    this.modal.hidden = false;
    this.open = true;
    document.body.style.overflow = 'hidden';
    this.recompute();
    this.render();
    this.startLoop();
    var closeBtn = this.modal.querySelector('.chicken-modal-close');
    if (closeBtn) closeBtn.focus();
  };

  ChickenClicker.prototype.closeModal = function () {
    if (!this.modal) return;
    this.modal.hidden = true;
    this.open = false;
    document.body.style.overflow = '';
    this.stopLoop();
    this.flushSave();
    if (this.hitbox) this.hitbox.focus();
  };

  ChickenClicker.prototype.init = function () {
    this.renderHud();
    this._renderPreview();
  };

  global.ChickenClicker = ChickenClicker;
})(typeof window !== 'undefined' ? window : this);
