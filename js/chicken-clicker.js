/**
 * Chicken Fund clicker — v3 (sidebar, evolution chain, narrative, hall of fame)
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'misa-ray-chicken-clicker-v2';
  var SAVE_KEY_V1 = 'misa-ray-chicken-clicker-v1';
  var TICK_MS = 1200;
  var SAVE_DEBOUNCE_MS = 450;
  var WORM_NUTRITION = 10;
  var MAX_PARTICLES = 36;
  var MAX_VISUAL_BIRDS = 22;
  var MAX_VISUAL_EGGS = 14;
  var MAX_VISUAL_PARTICLES = 10;
  var WORM_IMG = 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fpngimg.com%2Fuploads%2Fworms%2Fworms_PNG32.png&f=1&nofb=1&ipt=7e59e3a5aa1e5178b2888d11179c23049673dc058a54bfb211a6ce13361a25f8';
  var ROOSTER_GIF = 'https://web.archive.org/web/20090804022413im_/http://geocities.com/SouthBeach/Cabana/7599/1Rstr.GIF';
  var HEN_GIFS = [
    'https://web.archive.org/web/20090804022413im_/http://geocities.com/SouthBeach/Cabana/7599/6Rstr.GIF',
    'https://web.archive.org/web/20090804022413im_/http://geocities.com/SouthBeach/Cabana/7599/7Rstr.GIF'
  ];
  var FEED_COLORS = ['#1a1410', '#2b2018', '#3d2e22', '#4a3828', '#5c4030', '#0d0b09'];
  var EGG_COLORS = ['#f5f0e1', '#efe6d0', '#dcc9a8', '#c4a574', '#a89070', '#b8cce8', '#9eb8d8'];

  var HEN_EVOLUTIONS = [
    { id: 'gold', label: 'Golden Hen', tier: 1, minFed: 140, wormCost: 35 },
    { id: 'amber', label: 'Amber Hen', tier: 2, minFed: 280, wormCost: 75 },
    { id: 'ruby', label: 'Ruby Hen', tier: 3, minFed: 440, wormCost: 130, needsName: true },
    { id: 'sapphire', label: 'Sapphire Hen', tier: 4, minFed: 620, wormCost: 210 },
    { id: 'rainbow', label: 'Rainbow Hen', tier: 5, minFed: 820, wormCost: 340, unlock: 'giantWorm' },
    { id: 'ice', label: 'Ice Hen', tier: 6, minFed: 1080, wormCost: 480 },
    { id: 'fire', label: 'Fire Hen', tier: 7, minFed: 1400, wormCost: 720 },
    { id: 'nuclear', label: 'Nuclear Hen', tier: 8, minFed: 1850, wormCost: 1100, unlock: 'loveStory' }
  ];

  var ROOSTER_EVOLUTIONS = [
    { id: 'bronze', label: 'Bronze Rooster', tier: 1, minFed: 140, wormCost: 35 },
    { id: 'copper', label: 'Copper Rooster', tier: 2, minFed: 280, wormCost: 75 },
    { id: 'crimson', label: 'Crimson Rooster', tier: 3, minFed: 440, wormCost: 130, needsName: true },
    { id: 'storm', label: 'Storm Rooster', tier: 4, minFed: 620, wormCost: 210 },
    { id: 'thunder', label: 'Thunder Rooster', tier: 5, minFed: 820, wormCost: 340 },
    { id: 'frost', label: 'Frost Rooster', tier: 6, minFed: 1080, wormCost: 480 },
    { id: 'blaze', label: 'Blaze Rooster', tier: 7, minFed: 1400, wormCost: 720 },
    { id: 'nuclear', label: 'Nuclear Rooster', tier: 8, minFed: 1850, wormCost: 1100, unlock: 'loveStory' }
  ];

  var EVO_LEGACY = { ember: 'amber', shadow: 'nuclear' };

  var FLAVOR_LINES = [
    'A hen discovers the worm bucket and acts like she found gold.',
    'The rooster crows. Everyone pretends it was on purpose.',
    'Someone laid a blue egg. The flock is unbothered.',
    'Ray tightens a coop hinge. The chickens approve silently.',
    'Misa scatters grain at dawn. The yard smells like promise.'
  ];

  var GRAIN_CLICK_UPGRADES = [
    { id: 'g2', label: 'Better scoop', desc: '2 grains per click', power: 2, cost: 8 },
    { id: 'g3', label: 'Handful', desc: '3 grains per click', power: 3, cost: 25 },
    { id: 'g5', label: 'Small bucket', desc: '5 grains per click', power: 5, cost: 90 },
    { id: 'g8', label: 'Feed pail', desc: '8 grains per click', power: 8, cost: 280 },
    { id: 'g12', label: 'Wheelbarrow', desc: '12 grains per click', power: 12, cost: 850 },
    { id: 'g18', label: 'Silo tap', desc: '18 grains per click', power: 18, cost: 2400 },
    { id: 'g25', label: 'Industrial auger', desc: '25 grains per click', power: 25, cost: 6500 },
    { id: 'g35', label: 'Mega dispenser', desc: '35 grains per click', power: 35, cost: 16000 },
    { id: 'g50', label: 'Grain tsunami', desc: '50 grains per click', power: 50, cost: 38000 }
  ];

  var WORM_CLICK_UPGRADES = [
    { id: 'w1', label: 'One worm', desc: '1 worm per click', power: 1, cost: 40, wormCost: 4 },
    { id: 'w2', label: 'Worm pair', desc: '2 worms per click', power: 2, cost: 150, wormCost: 15 },
    { id: 'w4', label: 'Worm trio', desc: '4 worms per click', power: 4, cost: 520, wormCost: 52 },
    { id: 'w8', label: 'Worm handful', desc: '8 worms per click', power: 8, cost: 1800, wormCost: 180 },
    { id: 'w15', label: 'Worm bucket', desc: '15 worms per click', power: 15, cost: 6000, wormCost: 600 },
    { id: 'w25', label: 'Worm wheelbarrow', desc: '25 worms per click', power: 25, cost: 18000, wormCost: 1800 },
    { id: 'w40', label: 'Worm silo', desc: '40 worms per click', power: 40, cost: 55000, wormCost: 5500 },
    { id: 'w50', label: 'Worm apocalypse', desc: '50 worms per click', power: 50, cost: 150000, wormCost: 15000 }
  ];

  var COOP_UPGRADES = [
    { id: 'hen', label: 'Adopt a hen', desc: 'Lays eggs when well fed', type: 'hen', cost: 45, scale: 1.42 },
    { id: 'rooster', label: 'Adopt a rooster', desc: 'Helps eggs hatch', type: 'rooster', cost: 120, scale: 1.5 },
    { id: 'nest', label: 'Extra nest box', desc: 'Eggs arrive sooner', type: 'nest', cost: 220, scale: 1.75, max: 10 },
    { id: 'incubator', label: 'Warm incubator', desc: '+4% hatch rate', type: 'incubator', cost: 480, scale: 1.9, max: 6 }
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
      worms: 0,
      lifetimeGrains: 0,
      lifetimeWorms: 0,
      lifetimeHens: 1,
      lifetimeRoosters: 0,
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
      burstGrainUntil: 0,
      burstWormUntil: 0,
      burstGrainCd: 0,
      burstWormCd: 0,
      milestones: { grainStorm: false, wormStorm: false, henThousand: false },
      unlocks: { giantWorm: false, loveStory: false, loveStorySeen: false },
      burstGiantUntil: 0,
      burstGiantCd: 0,
      flavorCd: 0,
      flock: [{ id: 1, sex: 'hen', fed: 0, evolution: null, name: null }]
    };
  }

  function formatNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toLocaleString();
  }

  function migrateState(raw) {
    if (!raw) return defaultState();
    var s = defaultState();
    if (raw.flock) s.flock = raw.flock;
    if (raw.grains != null) { s.grains = raw.grains; s.worms = 0; }
    if (raw.worms != null) s.worms = raw.worms;
    Object.keys(raw).forEach(function (k) {
      if (k !== 'flock' && raw[k] !== undefined) s[k] = raw[k];
    });
    s.flock.forEach(function (b) { delete b.gif; });
    if (!s.lifetimeHens) {
      s.lifetimeHens = 0;
      s.lifetimeRoosters = 0;
      s.flock.forEach(function (b) {
        if (b.sex === 'rooster') s.lifetimeRoosters += 1;
        else s.lifetimeHens += 1;
      });
    }
    if (s.worms == null) s.worms = 0;
    if (!s.milestones) s.milestones = defaultState().milestones;
    if (!s.unlocks) s.unlocks = defaultState().unlocks;
    s.flock.forEach(function (b) {
      if (b.evolution && EVO_LEGACY[b.evolution]) b.evolution = EVO_LEGACY[b.evolution];
      if (b.name == null) b.name = null;
    });
    return s;
  }

  function evoChain(bird) {
    return bird.sex === 'rooster' ? ROOSTER_EVOLUTIONS : HEN_EVOLUTIONS;
  }

  function getBirdTier(bird) {
    if (!bird.evolution) return 0;
    var chain = evoChain(bird);
    var i;
    for (i = 0; i < chain.length; i++) {
      if (chain[i].id === bird.evolution) return chain[i].tier;
    }
    return 0;
  }

  function getNextEvolution(bird) {
    var chain = evoChain(bird);
    var tier = getBirdTier(bird);
    if (tier >= chain.length) return null;
    var next = chain[tier];
    if (bird.fed < next.minFed) return null;
    return next;
  }

  function evoDefById(bird, id) {
    var chain = evoChain(bird);
    var i;
    for (i = 0; i < chain.length; i++) {
      if (chain[i].id === id) return chain[i];
    }
    return null;
  }

  function birdDisplayName(bird) {
    if (bird.name) return bird.name;
    var def = bird.evolution ? evoDefById(bird, bird.evolution) : null;
    if (def) return def.label;
    return bird.sex === 'rooster' ? 'Rooster #' + bird.id : 'Hen #' + bird.id;
  }

  function flockChampion(flock) {
    var best = null;
    var bestScore = -1;
    var i;
    for (i = 0; i < flock.length; i++) {
      var b = flock[i];
      var score = getBirdTier(b) * 10000 + b.fed;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return best;
  }

  function sortFlockForLeaderboard(flock) {
    return flock.slice().sort(function (a, b) {
      var ta = getBirdTier(a);
      var tb = getBirdTier(b);
      if (tb !== ta) return tb - ta;
      return b.fed - a.fed;
    });
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) return migrateState(JSON.parse(raw));
      raw = localStorage.getItem(SAVE_KEY_V1);
      if (raw) return migrateState(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  function saveState(state) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function birdGifFor(bird) {
    if (bird.sex === 'rooster') return ROOSTER_GIF;
    return HEN_GIFS[bird.id % HEN_GIFS.length];
  }

  function birdClass(bird) {
    return 'chicken-bird chicken-bird--' + bird.sex + (bird.evolution ? ' chicken-bird--' + bird.evolution : '');
  }

  function wormCostForGrain(grainCost) {
    return Math.max(1, Math.ceil(grainCost / WORM_NUTRITION));
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
      hatch = Math.min(0.35, roosters * 0.05 + state.incubatorLevel * 0.04);
      hatch = Math.min(0.35, hatch + Math.min(0.1, state.flock.length * 0.0015));
    }
    var eggThreshold = Math.max(10, Math.floor(22 - hens * 0.85 - state.nestBonus * 2.2));
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
    return Math.floor(def.cost * Math.pow(def.scale, state.bought[def.id] || 0));
  }

  function canPay(state, grainCost, wormCost) {
    wormCost = wormCost != null ? wormCost : wormCostForGrain(grainCost);
    return state.grains >= grainCost || state.worms >= wormCost;
  }

  function payCost(state, grainCost, wormCost) {
    wormCost = wormCost != null ? wormCost : wormCostForGrain(grainCost);
    if (state.grains >= grainCost) {
      state.grains -= grainCost;
      return 'grain';
    }
    if (state.worms >= wormCost) {
      state.worms -= wormCost;
      return 'worm';
    }
    return null;
  }

  function sampleVisualFlock(flock, max) {
    if (flock.length <= max) {
      var out = [];
      for (var i = 0; i < flock.length; i++) out.push({ bird: flock[i], idx: i });
      return out;
    }
    var picks = [];
    var step = flock.length / max;
    for (var j = 0; j < max; j++) {
      var idx = Math.min(flock.length - 1, Math.floor(j * step + step * 0.5));
      picks.push({ bird: flock[idx], idx: idx });
    }
    return picks;
  }

  function upgradeRow(title, desc, grainCost, wormCost, afford, buyKey) {
    var costLabel = afford
      ? (grainCost <= 8000 ? formatNum(grainCost) + ' grains' : formatNum(grainCost) + ' g · ' + formatNum(wormCost) + ' worms')
      : formatNum(grainCost) + ' g · ' + formatNum(wormCost) + ' w';
    return '<button type="button" class="chicken-upgrade-row' + (afford ? ' can-afford' : '') + '" data-buy="' + buyKey + '"' +
      ' data-grain-cost="' + grainCost + '" data-worm-cost="' + wormCost + '"' + (afford ? '' : ' disabled') + '>' +
      '<span class="chicken-upgrade-row-main"><strong>' + title + '</strong><span>' + desc + '</span></span>' +
      '<span class="chicken-upgrade-row-cost">' + costLabel + '</span></button>';
  }

  function ChickenClicker(opts) {
    this.modal = opts.modal;
    this.hitbox = opts.hitbox;
    this.previewFlock = opts.previewFlock;
    this.state = loadState();
    this.els = {};
    this.stats = recomputeStats(this.state);
    this.tickId = null;
    this.rafId = null;
    this.saveTimer = null;
    this.open = false;
    this.upgradesDirty = true;
    this.leaderboardDirty = true;
    this.visualDirty = true;
    this.paused = false;
    this.narrativeQueue = [];
    this.namingBirdId = null;
    this.particles = [];
    this.flockNodes = [];
    this._hudCache = {};
    this._bind();
    this.checkMilestones();
    this.recompute();
    this.renderUpgrades(true);
    this.renderLeaderboard(true);
    this.renderYard(true);
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
    this.checkMilestones();
  };

  ChickenClicker.prototype.checkMilestones = function () {
    var s = this.state;
    if (!s.wormsUnlocked && (s.grainPerClick >= 8 || this.stats.hens >= 15)) {
      s.wormsUnlocked = true;
      this.upgradesDirty = true;
    }
    if (!s.wormsUnlocked && s.lifetimeHens >= 100) {
      s.wormsUnlocked = true;
      s.worms += 25;
      this.upgradesDirty = true;
    }
    if (s.lifetimeHens >= 1000 && !s.milestones.henThousand) {
      s.milestones.henThousand = true;
      s.wormsUnlocked = true;
      s.wormPerClick = Math.max(s.wormPerClick, 3);
      this.upgradesDirty = true;
    }
    if (s.lifetimeRoosters >= 500 && !s.milestones.grainStorm) {
      s.milestones.grainStorm = true;
      this.upgradesDirty = true;
    }
    if (s.lifetimeRoosters >= 150 && !s.milestones.wormStorm) {
      s.milestones.wormStorm = true;
      this.upgradesDirty = true;
    }
  };

  ChickenClicker.prototype.burstMult = function (type) {
    var now = Date.now();
    if (type === 'grain' && now < this.state.burstGrainUntil) return 30;
    if (type === 'worm' && now < this.state.burstWormUntil) return 10;
    return 1;
  };

  ChickenClicker.prototype.activateBurst = function (type) {
    var now = Date.now();
    if (type === 'grain') {
      if (!this.state.milestones.grainStorm || now < this.state.burstGrainCd) return;
      this.state.burstGrainUntil = now + 10000;
      this.state.burstGrainCd = now + 45000;
    } else {
      if (!this.state.milestones.wormStorm || now < this.state.burstWormCd) return;
      this.state.burstWormUntil = now + 10000;
      this.state.burstWormCd = now + 45000;
    }
    this.renderHud();
    this.upgradesDirty = true;
    this.renderUpgrades(true);
    this.scheduleSave();
  };

  ChickenClicker.prototype._bind = function () {
    var self = this;
    this.els.hudGrains = document.getElementById('chicken-hud-grains');
    this.els.hudWorms = document.getElementById('chicken-hud-worms');
    this.els.hudEggs = document.getElementById('chicken-hud-eggs');
    this.els.hudFlock = document.getElementById('chicken-hud-flock');
    this.els.hudClick = document.getElementById('chicken-hud-click');
    this.els.hudHatch = document.getElementById('chicken-hud-hatch');
    this.els.hudBoost = document.getElementById('chicken-hud-boost');
    this.els.clickArea = document.getElementById('chicken-click-area');
    this.els.stage = document.querySelector('#chicken-click-area .chicken-widget-stage');
    this.els.flockLayer = document.getElementById('chicken-flock-layer');
    this.els.eggLayer = document.getElementById('chicken-egg-layer');
    this.els.particleLayer = document.getElementById('chicken-particles');
    this.els.burstLayer = document.getElementById('chicken-click-burst');
    this.els.gamePanel = document.getElementById('chicken-game-panel');
    this.els.upgradeList = document.getElementById('chicken-upgrade-list');
    this.els.leaderboard = document.getElementById('chicken-leaderboard');
    this.els.modeGrain = document.getElementById('chicken-mode-grain');
    this.els.modeWorm = document.getElementById('chicken-mode-worm');
    this.els.modeGiant = document.getElementById('chicken-mode-giant');
    this.els.clickLabel = document.getElementById('chicken-click-label');
    this.els.narrative = document.getElementById('chicken-narrative');
    this.els.narrativeEyebrow = document.getElementById('chicken-narrative-eyebrow');
    this.els.narrativeTitle = document.getElementById('chicken-narrative-title');
    this.els.narrativeBody = document.getElementById('chicken-narrative-body');
    this.els.narrativeInput = document.getElementById('chicken-narrative-input');
    this.els.narrativeBtn = document.getElementById('chicken-narrative-btn');

    if (this.hitbox) this.hitbox.addEventListener('click', function () { self.openModal(); });
    if (this.modal) {
      this.modal.querySelectorAll('[data-chicken-close]').forEach(function (el) {
        el.addEventListener('click', function () { self.closeModal(); });
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.open) self.closeModal();
    });
    if (this.els.clickArea) {
      this.els.clickArea.addEventListener('click', function (e) { self.onClick(e); });
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
        var burst = e.target.closest('[data-burst]');
        if (burst) {
          self.activateBurst(burst.getAttribute('data-burst'));
          return;
        }
        var btn = e.target.closest('[data-buy]');
        if (!btn || btn.disabled) return;
        var parts = btn.getAttribute('data-buy').split(':');
        if (parts[0] === 'grain' && GRAIN_BY_ID[parts[1]]) self.buyGrainUpgrade(GRAIN_BY_ID[parts[1]]);
        else if (parts[0] === 'worm' && WORM_BY_ID[parts[1]]) self.buyWormUpgrade(WORM_BY_ID[parts[1]]);
        else if (parts[0] === 'coop' && COOP_BY_ID[parts[1]]) self.buyCoopUpgrade(COOP_BY_ID[parts[1]]);
        else if (parts[0] === 'evo') self.evolveBird(Number(parts[1]));
      });
    }
    if (this.els.leaderboard) {
      this.els.leaderboard.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-evo-id]');
        if (!btn || btn.disabled) return;
        self.evolveBird(Number(btn.getAttribute('data-evo-id')));
      });
    }
    if (this.els.modeGiant) {
      this.els.modeGiant.addEventListener('click', function (e) {
        e.stopPropagation();
        self.setMode('giant');
      });
    }
    if (this.els.narrativeBtn) {
      this.els.narrativeBtn.addEventListener('click', function () { self.dismissNarrative(); });
    }
    if (this.els.narrativeInput) {
      this.els.narrativeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') self.dismissNarrative();
      });
    }
  };

  ChickenClicker.prototype.setMode = function (mode) {
    if (mode === 'worm' && !this.state.wormsUnlocked) return;
    if (mode === 'giant' && !this.state.unlocks.giantWorm) return;
    this.state.feedMode = mode;
    this.renderHud();
    this.scheduleSave();
  };

  ChickenClicker.prototype.setPaused = function (on) {
    this.paused = on;
    if (this.els.gamePanel) this.els.gamePanel.classList.toggle('is-paused', on);
  };

  ChickenClicker.prototype.showNarrative = function (opts) {
    if (!this.els.narrative) return;
    this.setPaused(true);
    this.els.narrative.hidden = false;
    if (this.els.narrativeEyebrow) this.els.narrativeEyebrow.textContent = opts.eyebrow || 'Coop Chronicle';
    if (this.els.narrativeTitle) this.els.narrativeTitle.textContent = opts.title || '';
    if (this.els.narrativeBody) this.els.narrativeBody.textContent = opts.body || '';
    if (this.els.narrativeInput) {
      this.els.narrativeInput.hidden = !opts.nameFor;
      this.els.narrativeInput.value = '';
      if (opts.nameFor) {
        this.namingBirdId = opts.nameFor;
        this.els.narrativeInput.focus();
      }
    }
    if (this.els.narrativeBtn) this.els.narrativeBtn.textContent = opts.btn || 'Continue';
    this._narrativeOnDismiss = opts.onDismiss || null;
  };

  ChickenClicker.prototype.dismissNarrative = function () {
    if (this.namingBirdId && this.els.narrativeInput) {
      var name = this.els.narrativeInput.value.trim();
      if (name) {
        var bird = this.findBird(this.namingBirdId);
        if (bird) bird.name = name.slice(0, 24);
      }
      this.namingBirdId = null;
    }
    if (this.els.narrative) this.els.narrative.hidden = true;
    if (this._narrativeOnDismiss) this._narrativeOnDismiss();
    this._narrativeOnDismiss = null;
    this.setPaused(false);
    this.leaderboardDirty = true;
    this.renderLeaderboard(true);
    this.renderHud();
    this.scheduleSave();
  };

  ChickenClicker.prototype.findBird = function (id) {
    var flock = this.state.flock;
    var i;
    for (i = 0; i < flock.length; i++) {
      if (flock[i].id === id) return flock[i];
    }
    return null;
  };

  ChickenClicker.prototype.maybeFlavorToast = function () {
    if (this.paused) return;
    var now = Date.now();
    if (now < this.state.flavorCd) return;
    if (Math.random() > 0.08) return;
    this.state.flavorCd = now + 35000;
    var line = FLAVOR_LINES[(Math.random() * FLAVOR_LINES.length) | 0];
    this.showNarrative({
      eyebrow: 'Yard note',
      title: 'Something happened',
      body: line,
      btn: 'Smile & continue'
    });
  };

  ChickenClicker.prototype.checkLoveStory = function () {
    var s = this.state;
    if (s.unlocks.loveStorySeen) return;
    var hasNuclearHen = false;
    var hasNuclearRooster = false;
    var i;
    for (i = 0; i < s.flock.length; i++) {
      if (s.flock[i].evolution === 'nuclear') {
        if (s.flock[i].sex === 'hen') hasNuclearHen = true;
        else hasNuclearRooster = true;
      }
    }
    if (!hasNuclearHen || !hasNuclearRooster) return;
    s.unlocks.loveStorySeen = true;
    var self = this;
    this.showNarrative({
      eyebrow: 'Unlocked — Love story',
      title: 'Dawn grain, dusk coop',
      body: 'Misa scattered grain at first light while Ray tightened the last hinge on the coop. Between them, a golden hen and a thunder rooster learned the same dance — and the flock has never been the same.',
      btn: 'Beautiful'
    });
  };

  ChickenClicker.prototype.evolveBird = function (birdId) {
    var bird = this.findBird(birdId);
    if (!bird) return;
    var next = getNextEvolution(bird);
    if (!next || this.state.worms < next.wormCost) return;

    this.state.worms -= next.wormCost;
    bird.evolution = next.id;
    this.visualDirty = true;
    this.upgradesDirty = true;
    this.leaderboardDirty = true;

    if (next.unlock === 'giantWorm') this.state.unlocks.giantWorm = true;
    if (next.unlock === 'loveStory') this.state.unlocks.loveStory = true;

    var champion = flockChampion(this.state.flock);
    var self = this;
    var after = function () {
      self.checkLoveStory();
      self.renderHud();
      self.renderUpgrades(true);
      self.renderLeaderboard(true);
      self.renderYard(true);
      self._renderPreview();
      self.scheduleSave();
    };

    if (champion && champion.id === bird.id && (next.needsName || getBirdTier(bird) >= 3)) {
      this.showNarrative({
        eyebrow: 'Evolution',
        title: next.label + ' emerges',
        body: 'Your flock\'s finest has transformed. The yard goes quiet — this one deserves a name.',
        nameFor: bird.id,
        btn: 'Name & continue',
        onDismiss: after
      });
    } else if (next.unlock === 'giantWorm') {
      this.showNarrative({
        eyebrow: 'Unlocked',
        title: 'Giant mealworm',
        body: 'A rainbow shimmer unlocks the Giant feed mode — each click drops a mealworm worth 50 regular worms.',
        btn: 'Enormous',
        onDismiss: after
      });
    } else {
      after();
    }
  };

  ChickenClicker.prototype.clickValue = function () {
    var mult = 1;
    if (this.state.feedMode === 'giant' && this.state.unlocks.giantWorm) {
      return { type: 'worm', amount: 50, giant: true };
    }
    if (this.state.feedMode === 'worm' && this.state.wormsUnlocked) {
      mult = this.burstMult('worm');
      return { type: 'worm', amount: Math.max(1, this.state.wormPerClick) * mult };
    }
    mult = this.burstMult('grain');
    return { type: 'grain', amount: this.state.grainPerClick * mult };
  };

  ChickenClicker.prototype.feedFlock = function (nutrition) {
    var threshold = this.stats.eggThreshold;
    this.state.flockFeedPool += nutrition;
    while (this.state.flockFeedPool >= threshold) {
      this.state.flockFeedPool -= threshold;
      this.state.eggs += 1;
    }
    var perBird = nutrition / this.state.flock.length;
    var flock = this.state.flock;
    var i;
    for (i = 0; i < flock.length; i++) flock[i].fed += perBird;
    return false;
  };

  ChickenClicker.prototype.onClick = function (e) {
    if (this.paused) return;
    var val = this.clickValue();
    var amount = val.amount;
    var nutrition = amount * (val.type === 'worm' ? WORM_NUTRITION : 1);

    if (val.type === 'worm') {
      this.state.worms += amount;
      this.state.lifetimeWorms += amount;
    } else {
      this.state.grains += amount;
      this.state.lifetimeGrains += amount;
    }

    this.feedFlock(nutrition);
    this.spawnParticles(e, val);
    this.spawnPop(e, val);
    this.visualDirty = true;
    this.leaderboardDirty = true;
    this.upgradesDirty = true;
    this.renderHud();
    this.renderYard(false);
    this.syncUpgradeAfford();
    this.syncLeaderboardEvolve();
    this.maybeFlavorToast();
    this.scheduleSave();
  };

  ChickenClicker.prototype.spawnPop = function (e, val) {
    if (!this.els.burstLayer || !this.els.clickArea) return;
    var rect = this.els.clickArea.getBoundingClientRect();
    var x = (e.clientX || rect.left + rect.width / 2) - rect.left;
    var y = (e.clientY || rect.top + rect.height / 2) - rect.top;
    var el = document.createElement('span');
    el.className = 'chicken-click-pop';
    el.textContent = '+' + formatNum(val.amount);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.els.burstLayer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 650);
  };

  ChickenClicker.prototype.spawnParticles = function (e, val) {
    if (!this.els.particleLayer || !this.els.stage) return;
    var rect = this.els.stage.getBoundingClientRect();
    var cx = (e.clientX || rect.left + rect.width / 2) - rect.left;
    var cy = (e.clientY || rect.top + rect.height / 2) - rect.top;
    var count = Math.min(val.amount, MAX_VISUAL_PARTICLES);
    if (count < 1) count = 1;
    var i;
    for (i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      var spread = Math.min(28, 8 + count * 1.5);
      var px = cx + (Math.random() - 0.5) * spread;
      var py = cy + (Math.random() - 0.5) * spread * 0.5;
      var el;
      var size;
      if (val.type === 'worm') {
        el = document.createElement('img');
        el.className = 'chicken-widget-worm';
        el.src = WORM_IMG;
        el.alt = '';
        size = 10 + Math.random() * 8;
        el.style.width = size + 'px';
      } else {
        el = document.createElement('span');
        el.className = 'chicken-widget-feed';
        size = 2 + Math.random() * 3;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.background = FEED_COLORS[(Math.random() * FEED_COLORS.length) | 0];
      }
      el.style.left = px + 'px';
      el.style.top = py + 'px';
      this.els.particleLayer.appendChild(el);
      this.particles.push({
        el: el,
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 4,
        vy: -1.2 - Math.random() * 2,
        size: size,
        landed: false
      });
    }
  };

  ChickenClicker.prototype.tickParticles = function () {
    if (!this.els.stage || !this.particles.length) return;
    var groundY = this.els.stage.clientHeight - 10;
    var i;
    for (i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      if (p.landed) continue;
      p.vy += 0.42;
      p.vx *= 0.98;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y >= groundY - p.size) {
        p.y = groundY - p.size + (Math.random() - 0.5) * 2;
        p.landed = true;
        p.el.classList.add('is-landed');
        p.el.style.transform = 'rotate(' + ((Math.random() - 0.5) * 50).toFixed(0) + 'deg)';
        (function (particle, self) {
          setTimeout(function () {
            if (particle.el.parentNode) particle.el.remove();
            var idx = self.particles.indexOf(particle);
            if (idx > -1) self.particles.splice(idx, 1);
          }, 2200);
        })(p, this);
      }
      p.el.style.left = p.x + 'px';
      p.el.style.top = p.y + 'px';
      if (!p.landed) p.el.style.transform = 'rotate(' + (p.vx * 5).toFixed(1) + 'deg)';
    }
  };

  ChickenClicker.prototype.buyGrainUpgrade = function (def) {
    if (this.state.bought[def.id]) return;
    var wc = wormCostForGrain(def.cost);
    if (!canPay(this.state, def.cost, wc)) return;
    payCost(this.state, def.cost, wc);
    this.state.bought[def.id] = 1;
    this.state.grainPerClick = def.power;
    if (def.power >= 8) this.state.wormsUnlocked = true;
    this.upgradesDirty = true;
    this.afterPurchase();
  };

  ChickenClicker.prototype.buyWormUpgrade = function (def) {
    if (!this.state.wormsUnlocked || this.state.bought[def.id]) return;
    var wc = def.wormCost || wormCostForGrain(def.cost);
    if (!canPay(this.state, def.cost, wc)) return;
    payCost(this.state, def.cost, wc);
    this.state.bought[def.id] = 1;
    this.state.wormPerClick = def.power;
    this.upgradesDirty = true;
    this.afterPurchase();
  };

  ChickenClicker.prototype.buyCoopUpgrade = function (def) {
    var count = this.state.bought[def.id] || 0;
    if (def.max && count >= def.max) return;
    var cost = coopUpgradeCost(def, this.state);
    var wc = wormCostForGrain(cost);
    if (!canPay(this.state, cost, wc)) return;
    payCost(this.state, cost, wc);
    this.state.bought[def.id] = count + 1;

    if (def.type === 'hen') {
      this.state.flock.push({ id: this.state.nextId++, sex: 'hen', fed: 0, evolution: null, name: null });
      this.state.lifetimeHens += 1;
    } else if (def.type === 'rooster') {
      this.state.flock.push({ id: this.state.nextId++, sex: 'rooster', fed: 0, evolution: null, name: null });
      this.state.lifetimeRoosters += 1;
    } else if (def.type === 'nest') {
      this.state.nestBonus += 1;
    } else if (def.type === 'incubator') {
      this.state.incubatorLevel += 1;
    }

    this.recompute();
    this.visualDirty = true;
    this.upgradesDirty = true;
    this.afterPurchase();
  };

  ChickenClicker.prototype.afterPurchase = function () {
    this.renderHud();
    this.renderUpgrades(this.upgradesDirty);
    this.renderLeaderboard(this.leaderboardDirty);
    this.renderYard(this.visualDirty);
    this._renderPreview();
    this.scheduleSave();
  };

  ChickenClicker.prototype.hatchTick = function () {
    var rate = this.stats.hatch;
    if (!rate || !this.state.eggs) return false;

    var changed = false;
    var attempts = Math.min(this.state.eggs, Math.max(1, Math.ceil(this.state.eggs * rate * 0.2)));
    var i;
    for (i = 0; i < attempts; i++) {
      if (!this.state.eggs) break;
      if (Math.random() > rate) continue;
      this.state.eggs -= 1;
      var isRooster = Math.random() < 0.24;
      this.state.flock.push({
        id: this.state.nextId++,
        sex: isRooster ? 'rooster' : 'hen',
        fed: 0,
        evolution: null,
        name: null
      });
      if (isRooster) this.state.lifetimeRoosters += 1;
      else this.state.lifetimeHens += 1;
      changed = true;
    }
    if (changed) {
      this.recompute();
      this.visualDirty = true;
      this.upgradesDirty = true;
      this.leaderboardDirty = true;
      this.scheduleSave();
    }
    return changed;
  };

  ChickenClicker.prototype.loop = function () {
    if (!this.open || this.paused) return;
    var hatched = this.hatchTick();
    if (hatched || this.visualDirty) this.renderYard(this.visualDirty);
    else this.renderEggs();
    this.renderHud();
    if (hatched) {
      this.leaderboardDirty = true;
      this.renderUpgrades(true);
      this.renderLeaderboard(true);
      this._renderPreview();
    } else {
      this.syncUpgradeAfford();
    }
    if (this.leaderboardDirty) this.renderLeaderboard(true);
  };

  ChickenClicker.prototype.startLoops = function () {
    var self = this;
    if (!this.tickId) {
      this.tickId = setInterval(function () { self.loop(); }, TICK_MS);
    }
    if (!this.rafId) {
      var frame = function () {
        if (self.open) {
          self.tickParticles();
          self.rafId = requestAnimationFrame(frame);
        } else {
          self.rafId = null;
        }
      };
      this.rafId = requestAnimationFrame(frame);
    }
  };

  ChickenClicker.prototype.stopLoops = function () {
    if (this.tickId) {
      clearInterval(this.tickId);
      this.tickId = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
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
    var worms = formatNum(this.state.worms);
    if (cache.worms !== worms && this.els.hudWorms) {
      this.els.hudWorms.textContent = worms;
      cache.worms = worms;
    }
    var eggs = formatNum(this.state.eggs);
    if (cache.eggs !== eggs && this.els.hudEggs) {
      this.els.hudEggs.textContent = eggs;
      cache.eggs = eggs;
    }
    var flockTxt = this.state.flock.length + ' (' + this.stats.hens + '♀ · ' + this.stats.roosters + '♂)';
    if (cache.flock !== flockTxt && this.els.hudFlock) {
      this.els.hudFlock.textContent = flockTxt;
      cache.flock = flockTxt;
    }
    var burstG = this.burstMult('grain');
    var burstW = this.burstMult('worm');
    var clickTxt = val.type === 'worm'
      ? val.amount + ' worm' + (val.amount === 1 ? '' : 's') + ' / click' + (burstW > 1 ? ' ×' + burstW : '')
      : val.amount + ' grain' + (val.amount === 1 ? '' : 's') + ' / click' + (burstG > 1 ? ' ×' + burstG : '');
    if (cache.click !== clickTxt && this.els.hudClick) {
      this.els.hudClick.textContent = clickTxt;
      cache.click = clickTxt;
    }
    var hatchTxt = Math.round(this.stats.hatch * 100) + '% hatch';
    if (cache.hatch !== hatchTxt && this.els.hudHatch) {
      this.els.hudHatch.textContent = hatchTxt;
      cache.hatch = hatchTxt;
    }
    var boostTxt = '';
    var now = Date.now();
    if (now < this.state.burstGrainUntil) boostTxt = 'Grain storm!';
    else if (now < this.state.burstWormUntil) boostTxt = 'Worm rain!';
    if (cache.boost !== boostTxt && this.els.hudBoost) {
      this.els.hudBoost.textContent = boostTxt || '—';
      cache.boost = boostTxt;
    }
    if (this.els.modeGrain) this.els.modeGrain.classList.toggle('is-active', this.state.feedMode === 'grain');
    if (this.els.modeWorm) {
      this.els.modeWorm.classList.toggle('is-active', this.state.feedMode === 'worm');
      this.els.modeWorm.disabled = !this.state.wormsUnlocked;
      this.els.modeWorm.title = this.state.wormsUnlocked ? '' : 'Unlocks at 8 grains/click or 15 hens';
    }
    if (this.els.modeGiant) {
      var showGiant = this.state.unlocks.giantWorm;
      this.els.modeGiant.hidden = !showGiant;
      this.els.modeGiant.classList.toggle('is-active', this.state.feedMode === 'giant');
      this.els.modeGiant.title = showGiant ? '50 worms per click' : '';
    }
    if (this.els.clickLabel) {
      var label = 'Scatter grain!';
      if (val.giant) label = 'Giant mealworm!';
      else if (val.type === 'worm') label = 'Drop worms!';
      if (burstG > 1 || burstW > 1) label += ' STORM';
      this.els.clickLabel.textContent = label;
    }
  };

  ChickenClicker.prototype.layoutBird = function (slot, visualIndex, total, row, rowCount, rows) {
    var w = this.els.stage ? this.els.stage.clientWidth : 300;
    var h = this.els.stage ? this.els.stage.clientHeight : 200;
    var perRow = Math.ceil(total / rows);
    var col = visualIndex % perRow;
    var rowIndex = Math.floor(visualIndex / perRow);
    var rowY = 0.58 + (rowIndex / Math.max(1, rows - 1)) * 0.32;
    var perspective = 1 - rowIndex * 0.14;
    var baseScale = total === 1 ? 1.35 : Math.max(0.38, Math.min(1.05, 1.15 - total * 0.035) * perspective);
    var xSpread = w * (0.72 - rowIndex * 0.08);
    var x = w * 0.5 + (col - (perRow - 1) / 2) * (xSpread / Math.max(1, perRow));
    var y = h * rowY;
    slot.style.left = x + 'px';
    slot.style.top = y + 'px';
    slot.style.setProperty('--bird-scale', baseScale.toFixed(3));
    slot.style.setProperty('--walk-amp', (4 + rowIndex * 2 + Math.random() * 4).toFixed(1) + 'px');
    slot.style.setProperty('--walk-dur', (2.2 + Math.random() * 1.8).toFixed(2) + 's');
    slot.style.zIndex = String(10 + rowIndex);
  };

  ChickenClicker.prototype.renderYard = function (force) {
    if (!this.els.flockLayer || !this.els.stage) return;
    if (!force && !this.visualDirty) {
      this.renderEggs();
      return;
    }
    this.visualDirty = false;

    var samples = sampleVisualFlock(this.state.flock, MAX_VISUAL_BIRDS);
    var total = samples.length;
    var rows = total <= 3 ? 1 : total <= 9 ? 2 : 3;

    if (force || this.flockNodes.length !== total) {
      this.els.flockLayer.innerHTML = '';
      this.flockNodes = [];
      var i;
      for (i = 0; i < total; i++) {
        var bird = samples[i].bird;
        var slot = document.createElement('div');
        slot.className = 'chicken-bird-slot';
        var img = document.createElement('img');
        img.className = birdClass(bird);
        img.src = birdGifFor(bird);
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        slot.appendChild(img);
        this.layoutBird(slot, i, total, 0, 0, rows);
        this.els.flockLayer.appendChild(slot);
        this.flockNodes.push({ slot: slot, img: img, bird: bird });
      }
    } else {
      for (var j = 0; j < this.flockNodes.length; j++) {
        var node = this.flockNodes[j];
        var b = samples[j].bird;
        node.img.className = birdClass(b);
        this.layoutBird(node.slot, j, total, 0, 0, rows);
      }
    }
    this.renderEggs();
  };

  ChickenClicker.prototype.renderEggs = function () {
    if (!this.els.eggLayer || !this.els.stage) return;
    var show = Math.min(this.state.eggs, MAX_VISUAL_EGGS);
    var existing = this.els.eggLayer.children.length;
    if (existing === show) return;

    this.els.eggLayer.innerHTML = '';
    var w = this.els.stage.clientWidth;
    var h = this.els.stage.clientHeight;
    var i;
    for (i = 0; i < show; i++) {
      var egg = document.createElement('span');
      egg.className = 'chicken-egg';
      var ew = 7 + Math.random() * 5;
      var eh = ew * (1.15 + Math.random() * 0.2);
      egg.style.width = ew + 'px';
      egg.style.height = eh + 'px';
      egg.style.background = EGG_COLORS[(Math.random() * EGG_COLORS.length) | 0];
      egg.style.left = (w * 0.12 + Math.random() * w * 0.76) + 'px';
      egg.style.bottom = (4 + Math.random() * 14) + 'px';
      egg.style.setProperty('--egg-rot', ((Math.random() - 0.5) * 30).toFixed(1) + 'deg');
      this.els.eggLayer.appendChild(egg);
    }
  };

  ChickenClicker.prototype._renderPreview = function () {
    if (!this.previewFlock) return;
    var n = Math.min(3, this.state.flock.length);
    var imgs = this.previewFlock.querySelectorAll('.chicken-bird');
    var i;
    for (i = 0; i < imgs.length; i++) {
      var show = i < n;
      imgs[i].style.display = show ? '' : 'none';
      if (show && i === 0) imgs[i].src = HEN_GIFS[0];
      if (show && i === 1) imgs[i].src = this.stats.roosters ? ROOSTER_GIF : HEN_GIFS[1];
    }
  };

  ChickenClicker.prototype.syncUpgradeAfford = function () {
    if (!this.els.upgradeList) return;
    var s = this.state;
    var self = this;
    this.els.upgradeList.querySelectorAll('[data-buy]').forEach(function (btn) {
      var buy = btn.getAttribute('data-buy') || '';
      if (buy.indexOf('evo:') === 0) {
        var bird = self.findBird(Number(buy.split(':')[1]));
        var next = bird ? getNextEvolution(bird) : null;
        var afford = next && s.worms >= next.wormCost;
        btn.disabled = !afford;
        btn.classList.toggle('can-afford', !!afford);
        return;
      }
      var gc = Number(btn.getAttribute('data-grain-cost'));
      var wc = Number(btn.getAttribute('data-worm-cost'));
      var afford = canPay(s, gc, wc);
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
    var s = this.state;
    var html = '';
    var now = Date.now();

    if (s.milestones.grainStorm) {
      var gReady = now >= s.burstGrainCd;
      html += '<button type="button" class="chicken-upgrade-row chicken-upgrade-row--burst' + (gReady ? ' can-afford' : '') + '" data-burst="grain"' + (gReady ? '' : ' disabled') + '>' +
        '<span class="chicken-upgrade-row-main"><strong>Grain storm</strong><span>30× grain clicks for 10 seconds</span></span>' +
        '<span class="chicken-upgrade-row-cost">' + (gReady ? 'Go' : 'Cooldown') + '</span></button>';
    }
    if (s.milestones.wormStorm) {
      var wReady = now >= s.burstWormCd;
      html += '<button type="button" class="chicken-upgrade-row chicken-upgrade-row--burst' + (wReady ? ' can-afford' : '') + '" data-burst="worm"' + (wReady ? '' : ' disabled') + '>' +
        '<span class="chicken-upgrade-row-main"><strong>Worm rain</strong><span>10× worm clicks for 10 seconds</span></span>' +
        '<span class="chicken-upgrade-row-cost">' + (wReady ? 'Go' : 'Cooldown') + '</span></button>';
    }

    var g = nextGrainUpgrade(s);
    if (g) {
      var gwc = wormCostForGrain(g.cost);
      html += upgradeRow(g.label, g.desc, g.cost, gwc, canPay(s, g.cost, gwc), 'grain:' + g.id);
    }
    var w = nextWormUpgrade(s);
    if (w) {
      var wwc = w.wormCost || wormCostForGrain(w.cost);
      html += upgradeRow(w.label, w.desc, w.cost, wwc, canPay(s, w.cost, wwc), 'worm:' + w.id);
    }

    COOP_UPGRADES.forEach(function (def) {
      var count = s.bought[def.id] || 0;
      if (def.max && count >= def.max) return;
      var cost = coopUpgradeCost(def, s);
      var wc = wormCostForGrain(cost);
      var desc = def.desc;
      if (count) desc += ' (' + count + (def.max ? '/' + def.max : '') + ')';
      html += upgradeRow(def.label, desc, cost, wc, canPay(s, cost, wc), 'coop:' + def.id);
    });

    var evoBirds = sortFlockForLeaderboard(s.flock).slice(0, 4);
    evoBirds.forEach(function (bird) {
      var next = getNextEvolution(bird);
      if (!next) return;
      var afford = s.worms >= next.wormCost;
      html += '<button type="button" class="chicken-upgrade-row chicken-upgrade-row--evo' + (afford ? ' can-afford' : '') + '" data-buy="evo:' + bird.id + '"' + (afford ? '' : ' disabled') + '>' +
        '<span class="chicken-upgrade-row-main"><strong>Evolve ' + birdDisplayName(bird) + '</strong><span>→ ' + next.label + ' (fed ' + Math.floor(bird.fed) + ')</span></span>' +
        '<span class="chicken-upgrade-row-cost">' + formatNum(next.wormCost) + ' worms</span></button>';
    });

    if (!html) html = '<p class="chicken-upgrade-maxed">The flock is magnificent. Keep clicking.</p>';
    this.els.upgradeList.innerHTML = html;
  };

  ChickenClicker.prototype.syncLeaderboardEvolve = function () {
    if (!this.els.leaderboard) return;
    var s = this.state;
    this.els.leaderboard.querySelectorAll('[data-evo-id]').forEach(function (btn) {
      var id = Number(btn.getAttribute('data-evo-id'));
      var bird = null;
      var i;
      for (i = 0; i < s.flock.length; i++) {
        if (s.flock[i].id === id) { bird = s.flock[i]; break; }
      }
      if (!bird) return;
      var next = getNextEvolution(bird);
      var afford = next && s.worms >= next.wormCost;
      btn.disabled = !afford;
      btn.classList.toggle('can-afford', !!afford);
    });
  };

  ChickenClicker.prototype.renderLeaderboard = function (force) {
    if (!this.els.leaderboard) return;
    if (!force && !this.leaderboardDirty) {
      this.syncLeaderboardEvolve();
      return;
    }
    this.leaderboardDirty = false;
    var s = this.state;
    var champion = flockChampion(s.flock);
    var ranked = sortFlockForLeaderboard(s.flock).slice(0, 6);
    if (!ranked.length) {
      this.els.leaderboard.innerHTML = '<p class="chicken-leaderboard-empty">Feed the flock — champions appear here.</p>';
      return;
    }
    var html = '';
    ranked.forEach(function (bird) {
      var tier = getBirdTier(bird);
      var def = bird.evolution ? evoDefById(bird, bird.evolution) : null;
      var tierLabel = def ? def.label : (bird.sex === 'rooster' ? 'Rooster' : 'Hen');
      var next = getNextEvolution(bird);
      var afford = next && s.worms >= next.wormCost;
      var isChamp = champion && champion.id === bird.id;
      html += '<div class="chicken-leaderboard-row' + (isChamp ? ' is-champion' : '') + '">' +
        '<div class="chicken-leaderboard-tier">T' + tier + '</div>' +
        '<div class="chicken-leaderboard-main"><strong>' + birdDisplayName(bird) + '</strong>' +
        '<span>' + tierLabel + ' · ' + Math.floor(bird.fed) + ' fed</span></div>';
      if (next) {
        html += '<button type="button" class="chicken-leaderboard-evolve' + (afford ? ' can-afford' : '') + '" data-evo-id="' + bird.id + '"' + (afford ? '' : ' disabled') + '>Evolve</button>';
      }
      html += '</div>';
    });
    this.els.leaderboard.innerHTML = html;
  };

  ChickenClicker.prototype.render = function () {
    this.recompute();
    this.renderHud();
    this.renderYard(true);
    this.renderUpgrades(true);
    this.renderLeaderboard(true);
    this._renderPreview();
  };

  ChickenClicker.prototype.openModal = function () {
    if (!this.modal) return;
    this.modal.hidden = false;
    this.open = true;
    document.body.style.overflow = 'hidden';
    this.recompute();
    this.render();
    this.startLoops();
    this.modal.querySelector('.chicken-modal-close').focus();
  };

  ChickenClicker.prototype.closeModal = function () {
    if (!this.modal) return;
    this.modal.hidden = true;
    this.open = false;
    document.body.style.overflow = '';
    this.stopLoops();
    this.flushSave();
    if (this.hitbox) this.hitbox.focus();
  };

  ChickenClicker.prototype.init = function () {
    this.recompute();
    this.renderHud();
    this._renderPreview();
  };

  global.ChickenClicker = ChickenClicker;
})(typeof window !== 'undefined' ? window : this);
