/**
 * Chicken Fund clicker — v4 "The Coop Update"
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'misa-ray-chicken-clicker-v3';
  var SAVE_KEY_V2 = 'misa-ray-chicken-clicker-v2';
  var SAVE_KEY_V1 = 'misa-ray-chicken-clicker-v1';
  var ASSET = 'assets/game/';
  var TICK_MS = 1200;
  var SAVE_DEBOUNCE_MS = 450;
  var WORM_NUTRITION = 10;
  var MAX_PARTICLES = 24;
  var MAX_VISUAL_BIRDS = 10;
  var MAX_VISUAL_EGGS = 8;
  var MAX_VISUAL_PARTICLES = 8;
  var VISUAL_ROTATE_MS = 9000;
  var DEATH_TOP_N = 50;
  var WORM_IMG = ASSET + 'worm.png';
  var IMPOSTER_GIF = ASSET + 'imposter.gif';
  var ROOSTER_GIF = ASSET + 'rooster.gif';
  var IMPOSTER_QTE_MS = 14000;
  var HEN_GIFS = [ASSET + 'hen-a.gif', ASSET + 'hen-b.gif'];
  var OFFLINE_CAP_MS = 8 * 3600000;
  var FED_TRACK_CAP = 200;
  var REDUCED_MOTION = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FEED_COLORS = ['#1a1410', '#2b2018', '#3d2e22', '#4a3828', '#5c4030', '#0d0b09'];
  var EGG_COLORS = ['#f5f0e1', '#efe6d0', '#dcc9a8', '#c4a574', '#a89070', '#b8cce8', '#9eb8d8'];

  var HEN_EVOLUTIONS = [
    { id: 'gold', label: 'Golden Hen', tier: 1, minFed: 380, wormCost: 45 },
    { id: 'amber', label: 'Amber Hen', tier: 2, minFed: 720, wormCost: 110 },
    { id: 'ruby', label: 'Ruby Hen', tier: 3, minFed: 1150, wormCost: 200, needsName: true },
    { id: 'sapphire', label: 'Sapphire Hen', tier: 4, minFed: 1650, wormCost: 320 },
    { id: 'rainbow', label: 'Rainbow Hen', tier: 5, minFed: 2300, wormCost: 520, unlock: 'giantWorm' },
    { id: 'ice', label: 'Ice Hen', tier: 6, minFed: 3100, wormCost: 750 },
    { id: 'fire', label: 'Fire Hen', tier: 7, minFed: 4100, wormCost: 1050 },
    { id: 'nuclear', label: 'Nuclear Hen', tier: 8, minFed: 5400, wormCost: 1500, unlock: 'loveStory' }
  ];

  var ROOSTER_EVOLUTIONS = [
    { id: 'bronze', label: 'Bronze Rooster', tier: 1, minFed: 380, wormCost: 45 },
    { id: 'copper', label: 'Copper Rooster', tier: 2, minFed: 720, wormCost: 110 },
    { id: 'crimson', label: 'Crimson Rooster', tier: 3, minFed: 1150, wormCost: 200, needsName: true },
    { id: 'storm', label: 'Storm Rooster', tier: 4, minFed: 1650, wormCost: 320 },
    { id: 'thunder', label: 'Thunder Rooster', tier: 5, minFed: 2300, wormCost: 520 },
    { id: 'frost', label: 'Frost Rooster', tier: 6, minFed: 3100, wormCost: 750 },
    { id: 'blaze', label: 'Blaze Rooster', tier: 7, minFed: 4100, wormCost: 1050 },
    { id: 'nuclear', label: 'Nuclear Rooster', tier: 8, minFed: 5400, wormCost: 1500, unlock: 'loveStory' }
  ];

  var EVO_LEGACY = { ember: 'amber', shadow: 'nuclear' };

  var FLAVOR_LINES = [
    { t: 'A hen stares at you. She has opinions.', minHens: 1 },
    { t: 'Ray tightens a coop hinge. The chickens approve silently.' },
    { t: 'Misa scatters grain at dawn. The yard smells like promise.' },
    { t: 'The coop door squeaks. Free ambiance.' },
    { t: 'Port Gamble fog rolls in. The chickens are unimpressed.' },
    { t: 'Grain dust hangs in the air like wedding glitter.' },
    { t: 'The yard smells like earth and ambition.' },
    { t: 'Worm weather today. Morale: excellent.', worms: true },
    { t: 'A hen discovers the worm bucket and acts like she found gold.', minHens: 1, worms: true },
    { t: 'Two hens argue over the same sunbeam. Neither yields.', minHens: 2 },
    { t: 'The rooster crows. Everyone pretends it was on purpose.', minRoosters: 1 },
    { t: 'A rooster struts past the camera. He knows.', minRoosters: 1 },
    { t: 'The roosters have formed a committee. Productivity is down.', roostersBeatHens: true },
    { t: 'Someone laid a blue egg. The flock is unbothered.', minEggs: 1 },
    { t: 'The nest boxes are full. Someone is showing off.', minEggs: 8 },
    { t: 'The nest overfloweth. Someone should probably collect those.', minEggs: 50 },
    { t: 'A chick practices its crow. It sounds like a squeaky hinge.', hatched: true, maxFlock: 18 },
    { t: 'The flock discovers a single blueberry. Chaos ensues.', minFlock: 4 },
    { t: 'Someone knocked over the water dish. Classic.', minFlock: 3 },
    { t: 'Feathers everywhere. Housekeeping is not a chicken strength.', minFlock: 6 },
    { t: 'Midday: every bird is simultaneously napping and alert.', minFlock: 5 },
    { t: 'The yard glows faintly green. The chickens seem fine.', nuclear: true }
  ];

  var GRAIN_CLICK_UPGRADES = [
    { id: 'g2', label: 'Better scoop', desc: '2 grains per click', power: 2, cost: 8 },
    { id: 'g3', label: 'Handful', desc: '3 grains per click', power: 3, cost: 20 },
    { id: 'g5', label: 'Small bucket', desc: '5 grains per click', power: 5, cost: 70 },
    { id: 'g8', label: 'Feed pail', desc: '8 grains per click', power: 8, cost: 280 },
    { id: 'g12', label: 'Wheelbarrow', desc: '12 grains per click', power: 12, cost: 850 },
    { id: 'g18', label: 'Silo tap', desc: '18 grains per click', power: 18, cost: 2400 },
    { id: 'g25', label: 'Industrial auger', desc: '25 grains per click', power: 25, cost: 6500 },
    { id: 'g35', label: 'Mega dispenser', desc: '35 grains per click', power: 35, cost: 16000 },
    { id: 'g50', label: 'Grain tsunami', desc: '50 grains per click', power: 50, cost: 38000 }
  ];

  var WORM_CLICK_UPGRADES = [
    { id: 'w1', label: 'One worm', desc: '1 worm per click', power: 1, cost: 25, wormCost: 3 },
    { id: 'w2', label: 'Worm pair', desc: '2 worms per click', power: 2, cost: 110, wormCost: 11 },
    { id: 'w4', label: 'Worm trio', desc: '4 worms per click', power: 4, cost: 520, wormCost: 52 },
    { id: 'w8', label: 'Worm handful', desc: '8 worms per click', power: 8, cost: 1800, wormCost: 180 },
    { id: 'w15', label: 'Worm bucket', desc: '15 worms per click', power: 15, cost: 6000, wormCost: 600 },
    { id: 'w25', label: 'Worm wheelbarrow', desc: '25 worms per click', power: 25, cost: 18000, wormCost: 1800 },
    { id: 'w40', label: 'Worm silo', desc: '40 worms per click', power: 40, cost: 55000, wormCost: 5500 },
    { id: 'w50', label: 'Worm apocalypse', desc: '50 worms per click', power: 50, cost: 150000, wormCost: 15000 }
  ];

  var COOP_UPGRADES = [
    { id: 'hen', label: 'Adopt a hen', desc: 'Lays eggs when well fed', type: 'hen', cost: 35, scale: 1.38 },
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
      goalIndex: 0,
      prestigeUnlocked: false,
      feathers: 0,
      farmNumber: 1,
      hallOfFame: [],
      lastSeen: Date.now(),
      flock: [{ id: 1, sex: 'hen', fed: 0, evolution: null, name: null }]
    };
  }

  function hasHatchedBird(state) {
    var bought = (state.bought.hen || 0) + (state.bought.rooster || 0);
    return state.flock.length > bought + 1;
  }

  function hasAnyEvolution(state) {
    var i;
    for (i = 0; i < state.flock.length; i++) {
      if (state.flock[i].evolution) return true;
    }
    return false;
  }

  function hasNamedTier3(state) {
    var i;
    for (i = 0; i < state.flock.length; i++) {
      if (state.flock[i].name && getBirdTier(state.flock[i]) >= 3) return true;
    }
    return false;
  }

  function hasNuclearHen(state) {
    var i;
    for (i = 0; i < state.flock.length; i++) {
      if (state.flock[i].sex === 'hen' && state.flock[i].evolution === 'nuclear') return true;
    }
    return false;
  }

  function hasNuclearPair(state) {
    var hen = false;
    var roo = false;
    var i;
    for (i = 0; i < state.flock.length; i++) {
      if (state.flock[i].evolution === 'nuclear') {
        if (state.flock[i].sex === 'hen') hen = true;
        else roo = true;
      }
    }
    return hen && roo;
  }

  function hasGrainUpgrade(state) {
    var i;
    for (i = 0; i < GRAIN_CLICK_UPGRADES.length; i++) {
      if (state.bought[GRAIN_CLICK_UPGRADES[i].id]) return true;
    }
    return false;
  }

  var GOALS = [
    { label: 'Buy your first grain upgrade', check: hasGrainUpgrade, reward: { grains: 15 } },
    { label: 'Raise 5 hens', progress: function (s, st) { return Math.min(1, st.hens / 5); }, check: function (s, st) { return st.hens >= 5; }, reward: { grains: 40 } },
    { label: 'Unlock worms', check: function (s) { return s.wormsUnlocked; }, reward: { worms: 10 } },
    { label: 'Adopt your first rooster', check: function (s, st) { return st.roosters >= 1; }, reward: { grains: 80 } },
    { label: 'Hatch your first egg', check: hasHatchedBird, reward: { eggs: 3 } },
    { label: 'Evolve your first bird', check: hasAnyEvolution, reward: { worms: 30 } },
    { label: 'Grow the flock to 25 birds', progress: function (s) { return Math.min(1, s.flock.length / 25); }, check: function (s) { return s.flock.length >= 25; }, reward: { grains: 200, worms: 50 } },
    { label: 'Name a Tier 3 champion', check: hasNamedTier3, reward: { worms: 80 } },
    { label: 'Unlock Giant Worm mode', check: function (s) { return s.unlocks.giantWorm; }, reward: { worms: 100 } },
    { label: 'Grow the flock to 100 birds', progress: function (s) { return Math.min(1, s.flock.length / 100); }, check: function (s) { return s.flock.length >= 100; }, reward: { grains: 2000, worms: 300 } },
    { label: 'Raise a Nuclear Hen', check: hasNuclearHen, reward: { worms: 500 } },
    { label: 'Complete the Nuclear pair', check: hasNuclearPair, final: true, reward: {} }
  ];

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
    if (s.goalIndex == null) s.goalIndex = 0;
    if (s.feathers == null) s.feathers = 0;
    if (s.farmNumber == null) s.farmNumber = 1;
    if (!s.hallOfFame) s.hallOfFame = [];
    if (!s.lastSeen) s.lastSeen = Date.now();
    if (s.prestigeUnlocked == null) s.prestigeUnlocked = false;
    s.flock.forEach(function (b) {
      if (b.evolution && EVO_LEGACY[b.evolution]) b.evolution = EVO_LEGACY[b.evolution];
      if (b.name == null) b.name = null;
    });
    return s;
  }

  function syncGoalIndex(state, stats) {
    var i = state.goalIndex || 0;
    while (i < GOALS.length && GOALS[i].check(state, stats)) i++;
    state.goalIndex = i;
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

  function getNextEvoDef(bird) {
    var chain = evoChain(bird);
    var tier = getBirdTier(bird);
    if (tier >= chain.length) return null;
    return chain[tier];
  }

  function getNextEvolution(bird) {
    var next = getNextEvoDef(bird);
    if (!next || bird.fed < next.minFed) return null;
    return next;
  }

  function evoProgress(bird) {
    var next = getNextEvoDef(bird);
    if (!next) return 1;
    return Math.min(1, bird.fed / next.minFed);
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

  function sortFlockWeakestFirst(flock) {
    return flock.slice().sort(function (a, b) {
      var ta = getBirdTier(a);
      var tb = getBirdTier(b);
      if (ta !== tb) return ta - tb;
      return a.fed - b.fed;
    });
  }

  function birdRank(flock, bird) {
    var ranked = sortFlockForLeaderboard(flock);
    var i;
    for (i = 0; i < ranked.length; i++) {
      if (ranked[i].id === bird.id) return i + 1;
    }
    return ranked.length + 1;
  }

  function portraitHtml(bird, small) {
    var cls = birdClass(bird) + ' chicken-portrait' + (small ? ' chicken-portrait--sm' : '');
    return '<img class="' + cls + '" src="' + birdGifFor(bird) + '" alt="" width="48" height="48" loading="lazy" decoding="async">';
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) return migrateState(JSON.parse(raw));
      raw = localStorage.getItem(SAVE_KEY_V2);
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

  function birdGifVisual(bird, skin) {
    if (bird.sex === 'rooster') return ROOSTER_GIF;
    return HEN_GIFS[(skin != null ? skin : bird.id) % HEN_GIFS.length];
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
    var flockN = state.flock.length;
    var hatch = 0;
    if (roosters) {
      hatch = 0.008 + roosters * 0.014 + state.incubatorLevel * 0.012;
      hatch = Math.min(0.09, hatch);
      if (flockN > 40) hatch *= 0.65;
      if (flockN > 90) hatch *= 0.55;
      if (flockN > 180) hatch *= 0.45;
    }
    var eggThreshold = Math.max(14, Math.floor(28 - hens * 0.55 - state.nestBonus * 1.8));
    if (flockN > 50) eggThreshold += Math.floor((flockN - 50) * 0.15);
    var featherBonus = (state.feathers || 0) * 0.008;
    hatch = Math.min(0.11, hatch + featherBonus);
    return {
      hens: hens,
      roosters: roosters,
      hatch: hatch,
      eggThreshold: eggThreshold,
      invFlock: state.flock.length > 0 ? 1 / Math.min(state.flock.length, FED_TRACK_CAP) : 1
    };
  }

  function nextGrainUpgrades(state, n) {
    var out = [];
    var i;
    for (i = 0; i < GRAIN_CLICK_UPGRADES.length && out.length < n; i++) {
      if (!state.bought[GRAIN_CLICK_UPGRADES[i].id]) out.push(GRAIN_CLICK_UPGRADES[i]);
    }
    return out;
  }

  function nextWormUpgrades(state, n) {
    if (!state.wormsUnlocked) return [];
    var out = [];
    var i;
    for (i = 0; i < WORM_CLICK_UPGRADES.length && out.length < n; i++) {
      if (!state.bought[WORM_CLICK_UPGRADES[i].id]) out.push(WORM_CLICK_UPGRADES[i]);
    }
    return out;
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

  function sampleVisualFlock(flock, max, seed) {
    if (flock.length <= max) {
      var out = [];
      for (var i = 0; i < flock.length; i++) out.push({ bird: flock[i], idx: i, skin: i });
      return out;
    }
    var ranked = sortFlockForLeaderboard(flock);
    var picks = [];
    var used = Object.create(null);
    var j;
    var champ = ranked[0];
    if (champ) {
      var ci;
      for (ci = 0; ci < flock.length; ci++) {
        if (flock[ci].id === champ.id) {
          picks.push({ bird: champ, idx: ci, skin: 0 });
          used[champ.id] = 1;
          break;
        }
      }
    }
    seed = seed != null ? seed : 0;
    for (j = picks.length; j < max; j++) {
      var idx = (seed * 997 + j * 131) % flock.length;
      var guard = 0;
      while (used[flock[idx].id] && guard < flock.length) {
        idx = (idx + 1) % flock.length;
        guard++;
      }
      used[flock[idx].id] = 1;
      picks.push({ bird: flock[idx], idx: idx, skin: j % 3 });
    }
    return picks;
  }

  function costLabel(grainCost, wormCost) {
    return formatNum(grainCost) + ' g · ' + formatNum(wormCost) + ' w';
  }

  function upgradeRow(title, desc, grainCost, wormCost, afford, buyKey, horizon) {
    var cls = 'chicken-upgrade-row' + (afford ? ' can-afford' : '') + (horizon ? ' chicken-upgrade-row--horizon' : '');
    return '<button type="button" class="' + cls + '" data-buy="' + buyKey + '"' +
      ' data-grain-cost="' + grainCost + '" data-worm-cost="' + wormCost + '"' + (afford ? '' : ' disabled') + '>' +
      '<span class="chicken-upgrade-row-main"><strong>' + title + '</strong><span>' + desc + '</span></span>' +
      '<span class="chicken-upgrade-row-cost">' + costLabel(grainCost, wormCost) + '</span></button>';
  }

  function evoUpgradeRow(bird, next, s) {
    var ready = bird.fed >= next.minFed;
    var afford = ready && s.worms >= next.wormCost;
    var pct = Math.round(evoProgress(bird) * 100);
    return '<button type="button" class="chicken-upgrade-row chicken-upgrade-row--evo' + (afford ? ' can-afford' : '') + (!ready ? ' chicken-upgrade-row--horizon' : '') + '" data-buy="evo:' + bird.id + '"' + (afford ? '' : ' disabled') + '>' +
      '<span class="chicken-upgrade-row-main"><strong>Evolve ' + birdDisplayName(bird) + '</strong><span>→ ' + next.label + '</span>' +
      '<span class="chicken-evo-bar"><span style="width:' + pct + '%"></span></span></span>' +
      '<span class="chicken-upgrade-row-cost">' + formatNum(next.wormCost) + ' w</span></button>';
  }

  function pickFlavorLine(state, stats) {
    var pool = [];
    var i;
    for (i = 0; i < FLAVOR_LINES.length; i++) {
      var line = FLAVOR_LINES[i];
      if (line.minHens && stats.hens < line.minHens) continue;
      if (line.minRoosters && stats.roosters < line.minRoosters) continue;
      if (line.minEggs && state.eggs < line.minEggs) continue;
      if (line.minFlock && state.flock.length < line.minFlock) continue;
      if (line.maxFlock && state.flock.length > line.maxFlock) continue;
      if (line.worms && !state.wormsUnlocked) continue;
      if (line.hatched && !hasHatchedBird(state)) continue;
      if (line.roostersBeatHens && stats.roosters <= stats.hens) continue;
      if (line.nuclear && !hasNuclearHen(state) && !hasNuclearPair(state)) continue;
      pool.push(line.t);
    }
    var named = flockChampion(state.flock);
    if (named && named.name) pool.push(named.name + ' has been staring at the fence for twenty minutes. Plotting.');
    if (!pool.length) pool.push('The yard is quiet. For now.');
    return pool[(Math.random() * pool.length) | 0];
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
    this.eggNodes = [];
    this._hudCache = {};
    this._hudScheduled = false;
    this._floatingTimer = null;
    this._floatingEl = null;
    this._imposterTimer = null;
    this._imposterRaf = null;
    this._imposterHolding = false;
    this._visualSeed = 0;
    this._visualRotateAt = 0;
    this._layoutTick = 0;
    this._bind();
    syncGoalIndex(this.state, this.stats);
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
    syncGoalIndex(this.state, this.stats);
  };

  ChickenClicker.prototype.unlockWorms = function (showStory) {
    var s = this.state;
    if (s.wormsUnlocked) return;
    s.wormsUnlocked = true;
    s.worms += 5;
    this.upgradesDirty = true;
    if (showStory) {
      var self = this;
      this.showNarrative({
        eyebrow: 'Discovery',
        title: 'Worms!',
        body: 'Digging near the fence, a hen pulls up something wriggling. The flock crowds in. Worms have entered the economy.',
        btn: 'Gross — continue',
        onDismiss: function () { self.checkGoals(); }
      });
    }
  };

  ChickenClicker.prototype.checkMilestones = function () {
    var s = this.state;
    if (!s.wormsUnlocked && (s.grainPerClick >= 3 || this.stats.hens >= 5)) {
      this.unlockWorms(true);
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
      this.setMode('grain');
    } else {
      if (!this.state.milestones.wormStorm || now < this.state.burstWormCd) return;
      this.state.burstWormUntil = now + 10000;
      this.state.burstWormCd = now + 45000;
      if (this.state.wormsUnlocked) this.setMode('worm');
    }
    this.requestHud();
    this.upgradesDirty = true;
    this.renderUpgrades(true);
    this.scheduleSave();
  };

  ChickenClicker.prototype.renderBoostBanner = function () {
    if (!this.els.boostBanner) return;
    var now = Date.now();
    var grain = now < this.state.burstGrainUntil;
    var worm = now < this.state.burstWormUntil;
    if (!grain && !worm) {
      this.els.boostBanner.hidden = true;
      return;
    }
    var until = grain && (!worm || this.state.burstGrainUntil > this.state.burstWormUntil)
      ? this.state.burstGrainUntil : this.state.burstWormUntil;
    var isGrain = grain && until === this.state.burstGrainUntil;
    var secs = Math.max(1, Math.ceil((until - now) / 1000));
    this.els.boostBanner.hidden = false;
    this.els.boostBanner.className = 'chicken-boost-banner chicken-boost-banner--' + (isGrain ? 'grain' : 'worm');
    if (this.els.boostBannerText) {
      this.els.boostBannerText.textContent = isGrain ? 'GRAIN STORM ×30' : 'WORM RAIN ×10';
    }
    if (this.els.boostBannerTime) this.els.boostBannerTime.textContent = String(secs);
  };

  ChickenClicker.prototype.applyBoost = function (preferWorm) {
    var now = Date.now();
    var s = this.state;
    if (preferWorm && s.wormsUnlocked) {
      s.burstWormUntil = now + 10000;
      this.setMode('worm');
      this.showToast('Worm rain — 10 seconds!');
    } else {
      s.burstGrainUntil = now + 10000;
      this.setMode('grain');
      this.showToast('Grain storm — 10 seconds!');
    }
    this.requestHud();
    this.scheduleSave();
  };

  ChickenClicker.prototype.scheduleFloatingWorm = function () {
    var self = this;
    if (this._floatingTimer) clearTimeout(this._floatingTimer);
    if (!this.open) return;
    var delay = 55000 + Math.random() * 65000;
    this._floatingTimer = setTimeout(function () { self.spawnFloatingWorm(); }, delay);
  };

  ChickenClicker.prototype.spawnFloatingWorm = function () {
    if (!this.open || this.paused || !this.els.stage) {
      this.scheduleFloatingWorm();
      return;
    }
    if (this._floatingEl) return;
    var self = this;
    var kind = Math.random() < 0.55 ? 'egg' : 'boost';
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'chicken-floating-worm chicken-floating-worm--' + kind + (REDUCED_MOTION ? ' chicken-floating-worm--still' : '');
    el.setAttribute('data-worm-kind', kind);
    el.setAttribute('aria-label', kind === 'egg' ? 'Bonus eggs worm' : 'Storm boost worm');
    var label = document.createElement('span');
    label.className = 'chicken-floating-worm-label';
    label.textContent = kind === 'egg' ? '+ eggs' : 'storm!';
    var body = document.createElement('span');
    body.className = 'chicken-floating-worm-body';
    el.appendChild(label);
    el.appendChild(body);
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      self.catchFloatingWorm(el, kind);
    });
    this.els.stage.appendChild(el);
    this._floatingEl = el;
    setTimeout(function () { self.removeFloatingWorm(); }, 8000);
    this.scheduleFloatingWorm();
  };

  ChickenClicker.prototype.removeFloatingWorm = function () {
    if (this._floatingEl && this._floatingEl.parentNode) this._floatingEl.remove();
    this._floatingEl = null;
  };

  ChickenClicker.prototype.catchFloatingWorm = function (el, kind) {
    if (el) el.remove();
    this._floatingEl = null;
    var s = this.state;
    if (kind === 'egg') {
      s.eggs += 10;
      var g = Math.max(35, Math.floor(this.state.grainPerClick * 22 * this.clickMult()));
      s.grains += g;
      this.showToast('Bonus: +' + formatNum(g) + ' grains & 10 eggs!');
    } else {
      this.applyBoost(s.wormsUnlocked && Math.random() < 0.55);
    }
    this.requestHud();
    this.scheduleSave();
  };

  ChickenClicker.prototype.removeWeakestBirds = function (count) {
    var removed = 0;
    while (removed < count) {
      var flock = this.state.flock;
      if (flock.length <= 3) break;
      var st = recomputeStats(this.state);
      var weak = sortFlockWeakestFirst(flock);
      var victim = null;
      var i;
      for (i = 0; i < weak.length; i++) {
        var b = weak[i];
        if (b.sex === 'hen' && st.hens <= 2) continue;
        if (b.sex === 'rooster' && st.roosters <= 1) continue;
        victim = b;
        break;
      }
      if (!victim) break;
      for (i = 0; i < flock.length; i++) {
        if (flock[i].id === victim.id) {
          flock.splice(i, 1);
          removed += 1;
          break;
        }
      }
    }
    if (removed) {
      this.recompute();
      this.visualDirty = true;
      this.leaderboardDirty = true;
    }
    return removed;
  };

  ChickenClicker.prototype.scheduleImposter = function () {
    var self = this;
    if (this._imposterTimer) clearTimeout(this._imposterTimer);
    if (!this.open) return;
    var delay = 65000 + Math.random() * 85000;
    this._imposterTimer = setTimeout(function () { self.tryImposterEvent(); }, delay);
  };

  ChickenClicker.prototype.tryImposterEvent = function () {
    this.scheduleImposter();
    if (!this.open || this.paused || this._imposterRaf) return;
    if (this.state.flock.length < 8) return;
    this.startImposterQte();
  };

  ChickenClicker.prototype.startImposterQte = function () {
    var self = this;
    if (!this.els.imposter) return;
    this.removeFloatingWorm();
    this.setPaused(true);
    this.els.imposter.hidden = false;
    this._imposter = {
      zonePos: 0.35,
      zoneVel: 0,
      markerPos: 0.55,
      markerVel: 0,
      progress: 0,
      timeLeft: IMPOSTER_QTE_MS,
      last: performance.now()
    };
    var onUp = function () { self._imposterHolding = false; };
    var onDown = function (e) {
      if (e.target.closest('#chicken-imposter')) {
        e.preventDefault();
        self._imposterHolding = true;
      }
    };
    this._imposterOnDown = onDown;
    this._imposterOnUp = onUp;
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('touchend', onUp);
    var frame = function (t) {
      if (!self._imposter) return;
      self.tickImposterQte(t);
      self._imposterRaf = requestAnimationFrame(frame);
    };
    this._imposterRaf = requestAnimationFrame(frame);
  };

  ChickenClicker.prototype.tickImposterQte = function (now) {
    var q = this._imposter;
    if (!q) return;
    var dt = Math.min(50, now - q.last);
    q.last = now;
    q.timeLeft -= dt;

    q.markerVel += (Math.random() - 0.5) * 0.0009 * dt;
    q.markerVel *= 0.94;
    q.markerPos += q.markerVel * dt * 0.06;
    if (q.markerPos < 0.06) { q.markerPos = 0.06; q.markerVel *= -0.5; }
    if (q.markerPos > 0.94) { q.markerPos = 0.94; q.markerVel *= -0.5; }

    if (this._imposterHolding) q.zoneVel += 0.00014 * dt;
    else q.zoneVel -= 0.0002 * dt;
    q.zoneVel *= 0.88;
    q.zonePos += q.zoneVel * dt * 0.08;
    if (q.zonePos < 0.1) q.zonePos = 0.1;
    if (q.zonePos > 0.78) q.zonePos = 0.78;

    var overlap = Math.abs(q.markerPos - q.zonePos) < 0.13;
    if (overlap) q.progress = Math.min(1, q.progress + 0.000022 * dt);
    else q.progress = Math.max(0, q.progress - 0.000012 * dt);

    if (this.els.imposterZone) this.els.imposterZone.style.bottom = (q.zonePos * 100) + '%';
    if (this.els.imposterMarker) this.els.imposterMarker.style.bottom = (q.markerPos * 100) + '%';
    if (this.els.imposterFill) this.els.imposterFill.style.width = Math.round(q.progress * 100) + '%';
    if (this.els.imposterTimer) {
      this.els.imposterTimer.textContent = Math.max(0, Math.ceil(q.timeLeft / 1000)) + 's left';
    }

    if (q.progress >= 1) this.endImposterQte(true);
    else if (q.timeLeft <= 0) this.endImposterQte(false);
  };

  ChickenClicker.prototype.endImposterQte = function (won) {
    if (this._imposterRaf) {
      cancelAnimationFrame(this._imposterRaf);
      this._imposterRaf = null;
    }
    if (this._imposterOnDown) {
      document.removeEventListener('mousedown', this._imposterOnDown);
      document.removeEventListener('touchstart', this._imposterOnDown);
    }
    if (this._imposterOnUp) {
      document.removeEventListener('mouseup', this._imposterOnUp);
      document.removeEventListener('touchend', this._imposterOnUp);
    }
    this._imposterOnDown = null;
    this._imposterOnUp = null;
    this._imposterHolding = false;
    this._imposter = null;
    if (this.els.imposter) this.els.imposter.hidden = true;
    this.setPaused(false);

    var self = this;
    if (won) {
      var s = this.state;
      s.grains += Math.max(120, Math.floor(s.grainPerClick * 60 * this.clickMult()));
      s.worms += Math.max(20, Math.floor((s.wormPerClick || 1) * 25));
      s.eggs += 12;
      this.showNarrative({
        eyebrow: 'Imposter expelled',
        title: 'The yard is safe',
        body: 'You booted the imposter over the fence. The flock celebrates with bonus grain, worms, and eggs.',
        btn: 'Hero',
        onDismiss: function () {
          self.requestHud();
          self.renderLeaderboard(true);
          self.scheduleSave();
        }
      });
    } else {
      var lost = this.removeWeakestBirds(10);
      this.showNarrative({
        eyebrow: 'Disaster',
        title: 'The imposter ran loose',
        body: 'He tore through the yard before anyone could stop him. ' + lost + ' of your lowest-ranked birds are gone.',
        btn: 'Mourn & continue',
        onDismiss: function () {
          self.requestHud();
          self.renderYard(true);
          self.renderLeaderboard(true);
          self.scheduleSave();
        }
      });
    }
  };

  ChickenClicker.prototype.applyOfflineCatchup = function () {
    var s = this.state;
    var now = Date.now();
    var elapsed = now - (s.lastSeen || now);
    s.lastSeen = now;
    if (elapsed < 600000) return;
    var ticks = Math.min(Math.floor(OFFLINE_CAP_MS / TICK_MS), Math.floor(elapsed / TICK_MS));
    if (ticks < 1) return;
    var eggsBefore = s.eggs;
    var t;
    for (t = 0; t < ticks; t++) this.passiveTick();
    var gained = s.eggs - eggsBefore;
    if (gained > 0) this.showToast('While you were away: +' + gained + ' eggs.');
    this.recompute();
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
    this.els.narrativePortrait = document.getElementById('chicken-narrative-portrait');
    this.els.goalBar = document.getElementById('chicken-goal-bar');
    this.els.goalLabel = document.getElementById('chicken-goal-label');
    this.els.goalFill = document.getElementById('chicken-goal-fill');
    this.els.toast = document.getElementById('chicken-toast');
    this.els.hudEggsWrap = document.getElementById('chicken-hud-eggs-wrap');
    this.els.saveExport = document.getElementById('chicken-save-export');
    this.els.saveImport = document.getElementById('chicken-save-import');
    this.els.prestigeBtn = document.getElementById('chicken-prestige-btn');
    this.els.hofRetired = document.getElementById('chicken-hof-retired');
    this.els.boostBanner = document.getElementById('chicken-boost-banner');
    this.els.boostBannerText = document.getElementById('chicken-boost-banner-text');
    this.els.boostBannerTime = document.getElementById('chicken-boost-banner-time');
    this.els.imposter = document.getElementById('chicken-imposter');
    this.els.imposterZone = document.getElementById('chicken-imposter-zone');
    this.els.imposterMarker = document.getElementById('chicken-imposter-marker');
    this.els.imposterFill = document.getElementById('chicken-imposter-progress-fill');
    this.els.imposterTimer = document.getElementById('chicken-imposter-timer');

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
      this.els.clickArea.setAttribute('role', 'button');
      this.els.clickArea.setAttribute('tabindex', '0');
      this.els.clickArea.addEventListener('click', function (e) { self.onClick(e); });
      this.els.clickArea.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          var r = self.els.clickArea.getBoundingClientRect();
          self.onClick({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
        }
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
        var burst = e.target.closest('[data-burst]');
        if (burst) {
          self.activateBurst(burst.getAttribute('data-burst'));
          return;
        }
        var btn = e.target.closest('[data-buy]');
        if (!btn || btn.disabled) return;
        btn.classList.add('chicken-upgrade-flash');
        setTimeout(function () { btn.classList.remove('chicken-upgrade-flash'); }, 300);
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
    if (this.els.saveExport) {
      this.els.saveExport.addEventListener('click', function () { self.exportSave(); });
    }
    if (this.els.saveImport) {
      this.els.saveImport.addEventListener('click', function () { self.importSave(); });
    }
    if (this.els.prestigeBtn) {
      this.els.prestigeBtn.addEventListener('click', function () { self.doPrestige(); });
    }
  };

  ChickenClicker.prototype.setMode = function (mode) {
    if (mode === 'worm' && !this.state.wormsUnlocked) return;
    if (mode === 'giant' && !this.state.unlocks.giantWorm) return;
    this.state.feedMode = mode;
    this.requestHud();
    this.scheduleSave();
    if (this.els.modeGrain) this.els.modeGrain.setAttribute('aria-pressed', mode === 'grain' ? 'true' : 'false');
    if (this.els.modeWorm) this.els.modeWorm.setAttribute('aria-pressed', mode === 'worm' ? 'true' : 'false');
    if (this.els.modeGiant) this.els.modeGiant.setAttribute('aria-pressed', mode === 'giant' ? 'true' : 'false');
  };

  ChickenClicker.prototype.showToast = function (text) {
    if (!this.els.toast) return;
    this.els.toast.textContent = text;
    this.els.toast.hidden = false;
    this.els.toast.classList.add('is-visible');
    var el = this.els.toast;
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
      el.hidden = true;
    }, 5000);
  };

  ChickenClicker.prototype.grantReward = function (reward) {
    var s = this.state;
    if (reward.grains) s.grains += reward.grains;
    if (reward.worms) s.worms += reward.worms;
    if (reward.eggs) s.eggs += reward.eggs;
  };

  ChickenClicker.prototype.checkGoals = function () {
    var s = this.state;
    var st = this.stats;
    while (s.goalIndex < GOALS.length && GOALS[s.goalIndex].check(s, st)) {
      var g = GOALS[s.goalIndex];
      this.grantReward(g.reward || {});
      if (g.final) {
        s.prestigeUnlocked = true;
        this.showEndingCard();
      } else {
        this.showToast('Goal complete: ' + g.label);
      }
      s.goalIndex += 1;
    }
    this.renderGoal();
    this.requestHud();
    this.upgradesDirty = true;
    this.scheduleSave();
  };

  ChickenClicker.prototype.showEndingCard = function () {
    var s = this.state;
    var champ = flockChampion(s.flock);
    var name = champ ? birdDisplayName(champ) : 'the flock';
    var self = this;
    this.showNarrative({
      eyebrow: 'The coop\'s story',
      title: 'A yard well kept',
      body: 'Grains scattered: ' + formatNum(s.lifetimeGrains) + '. Worms dropped: ' + formatNum(s.lifetimeWorms) +
        '. Birds raised: ' + formatNum(s.flock.length) + '. Champion: ' + name + '. The story is complete — but the yard never really rests.',
      btn: 'Keep playing',
      onDismiss: function () {
        self.showToast('Prestige unlocked — Found a New Farm');
        if (self.els.prestigeBtn) self.els.prestigeBtn.hidden = false;
      }
    });
  };

  ChickenClicker.prototype.renderGoal = function () {
    if (!this.els.goalLabel) return;
    var s = this.state;
    if (s.goalIndex >= GOALS.length) {
      this.els.goalLabel.textContent = 'All goals complete — sandbox mode';
      if (this.els.goalFill) this.els.goalFill.style.width = '100%';
      return;
    }
    var g = GOALS[s.goalIndex];
    this.els.goalLabel.textContent = 'Goal: ' + g.label;
    if (this.els.goalFill) {
      var p = g.progress ? g.progress(s, this.stats) : (g.check(s, this.stats) ? 1 : 0);
      this.els.goalFill.style.width = Math.round(p * 100) + '%';
    }
  };

  ChickenClicker.prototype.clickMult = function () {
    return 1 + (this.state.feathers || 0) * 0.05;
  };

  ChickenClicker.prototype.exportSave = function () {
    var str = btoa(unescape(encodeURIComponent(JSON.stringify(this.state))));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(function () {});
    }
    this.showToast('Save copied to clipboard');
  };

  ChickenClicker.prototype.importSave = function () {
    var raw = prompt('Paste your save string:');
    if (!raw) return;
    try {
      var parsed = migrateState(JSON.parse(decodeURIComponent(escape(atob(raw.trim())))));
      if (!confirm('Replace your current flock with this save?')) return;
      this.state = parsed;
      this.recompute();
      this.render();
      this.flushSave();
      this.showToast('Save imported');
    } catch (e) {
      this.showToast('Invalid save string');
    }
  };

  ChickenClicker.prototype.doPrestige = function () {
    if (!this.state.prestigeUnlocked) return;
    var s = this.state;
    var earned = 0;
    var i;
    for (i = 0; i < s.flock.length; i++) earned += getBirdTier(s.flock[i]);
    for (i = 0; i < s.flock.length; i++) {
      var b = s.flock[i];
      if (b.name) {
        s.hallOfFame.push({
          name: b.name,
          evolution: b.evolution,
          sex: b.sex,
          fed: Math.floor(b.fed),
          farm: s.farmNumber
        });
      }
    }
    var self = this;
    this.showNarrative({
      eyebrow: 'Farm ' + s.farmNumber,
      title: 'Found a new farm',
      body: 'The old flock watches from the fence as the truck pulls away. +' + earned + ' Golden Feathers earned. The story continues.',
      btn: 'Begin again',
      onDismiss: function () {
        var fresh = defaultState();
        fresh.feathers = s.feathers + earned;
        fresh.farmNumber = s.farmNumber + 1;
        fresh.hallOfFame = s.hallOfFame;
        fresh.prestigeUnlocked = true;
        fresh.lastSeen = Date.now();
        self.state = fresh;
        self.recompute();
        self.render();
        self.flushSave();
      }
    });
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
    if (this.els.narrativePortrait) {
      if (opts.bird) {
        this.els.narrativePortrait.innerHTML = portraitHtml(opts.bird, false);
        this.els.narrativePortrait.hidden = false;
      } else {
        this.els.narrativePortrait.innerHTML = '';
        this.els.narrativePortrait.hidden = true;
      }
    }
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
    this.requestHud();
    this.checkGoals();
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
    if (Math.random() > 0.06) return;
    this.state.flavorCd = now + 28000;
    this.showToast(pickFlavorLine(this.state, this.stats));
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
      self.checkGoals();
      self.requestHud();
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
        bird: bird,
        nameFor: bird.id,
        btn: 'Name & continue',
        onDismiss: after
      });
    } else if (next.unlock === 'giantWorm') {
      this.showNarrative({
        eyebrow: 'Unlocked',
        title: 'Giant mealworm',
        body: 'A rainbow shimmer unlocks the Giant feed mode — each click drops a mealworm worth 50 regular worms.',
        bird: bird,
        btn: 'Enormous',
        onDismiss: after
      });
    } else {
      after();
    }
  };

  ChickenClicker.prototype.clickValue = function () {
    var mult = this.clickMult();
    if (this.state.feedMode === 'giant' && this.state.unlocks.giantWorm) {
      return { type: 'worm', amount: Math.max(1, Math.floor(50 * mult)), giant: true };
    }
    if (this.state.feedMode === 'worm' && this.state.wormsUnlocked) {
      mult *= this.burstMult('worm');
      return { type: 'worm', amount: Math.max(1, Math.floor(this.state.wormPerClick * mult)) };
    }
    mult *= this.burstMult('grain');
    return { type: 'grain', amount: Math.max(1, Math.floor(this.state.grainPerClick * mult)) };
  };

  ChickenClicker.prototype.addNutrition = function (nutrition) {
    var threshold = this.stats.eggThreshold;
    this.state.flockFeedPool += nutrition;
    var eggCap = Math.min(200, 40 + this.stats.hens * 3);
    while (this.state.flockFeedPool >= threshold && this.state.eggs < eggCap) {
      this.state.flockFeedPool -= threshold;
      this.state.eggs += 1;
    }
  };

  ChickenClicker.prototype.distributeFed = function (nutrition) {
    var flock = this.state.flock;
    if (!flock.length) return;
    var champ = flockChampion(flock);
    var trackN = Math.min(flock.length, 24);
    var targets = sortFlockForLeaderboard(flock).slice(0, trackN);
    if (champ && targets.indexOf(champ) < 0) targets.unshift(champ);
    var champShare = flock.length <= 3 ? 0.55 : 0.35;
    if (champ) champ.fed += nutrition * champShare;
    var rest = nutrition * (1 - (champ ? champShare : 0));
    var perBird = rest / Math.max(1, targets.length);
    var i;
    for (i = 0; i < targets.length; i++) {
      if (targets[i] === champ) continue;
      targets[i].fed += perBird;
    }
  };

  ChickenClicker.prototype.feedFlock = function (nutrition) {
    this.addNutrition(nutrition);
    this.distributeFed(nutrition);
  };

  ChickenClicker.prototype.passiveTick = function () {
    var n = this.state.flock.length;
    var passive = this.stats.hens * 0.07 + this.stats.roosters * 0.025;
    passive = Math.min(this.stats.eggThreshold * 0.35, passive);
    if (n > 60) passive *= 0.7;
    if (n > 120) passive *= 0.6;
    if (passive > 0) {
      this.addNutrition(passive);
      this.distributeFed(passive * 0.15);
    }
  };

  ChickenClicker.prototype.onClick = function (e) {
    if (this.paused || this._imposter) return;
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
    this.leaderboardDirty = true;
    this.upgradesDirty = true;
    this.requestHud();
    this.syncUpgradeAfford();
    this.deferLeaderboard();
    this.checkGoals();
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
    if (REDUCED_MOTION || document.hidden) return;
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
      if (val.giant) {
        el = document.createElement('span');
        el.className = 'chicken-widget-giant-worm';
        size = 14 + Math.random() * 6;
        el.style.width = size + 'px';
        el.style.height = (size * 0.45) + 'px';
      } else if (val.type === 'worm') {
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
    if (def.power >= 3) this.unlockWorms(false);
    this.upgradesDirty = true;
    this.afterPurchase('grains');
  };

  ChickenClicker.prototype.buyWormUpgrade = function (def) {
    if (!this.state.wormsUnlocked || this.state.bought[def.id]) return;
    var wc = def.wormCost || wormCostForGrain(def.cost);
    if (!canPay(this.state, def.cost, wc)) return;
    payCost(this.state, def.cost, wc);
    this.state.bought[def.id] = 1;
    this.state.wormPerClick = def.power;
    this.upgradesDirty = true;
    this.afterPurchase('worms');
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
      this.state.flock.push({ id: this.state.nextId++, sex: 'hen', fed: 0, evolution: null, name: null, bornAt: Date.now() });
      this.state.lifetimeHens += 1;
    } else if (def.type === 'rooster') {
      this.state.flock.push({ id: this.state.nextId++, sex: 'rooster', fed: 0, evolution: null, name: null, bornAt: Date.now() });
      this.state.lifetimeRoosters += 1;
    } else if (def.type === 'nest') {
      this.state.nestBonus += 1;
    } else if (def.type === 'incubator') {
      this.state.incubatorLevel += 1;
    }

    this.recompute();
    this.visualDirty = true;
    this.upgradesDirty = true;
    this.leaderboardDirty = true;
    this.afterPurchase('flock');
  };

  ChickenClicker.prototype.flashHud = function (key) {
    var map = { grains: this.els.hudGrains, worms: this.els.hudWorms, eggs: this.els.hudEggs, flock: this.els.hudFlock };
    var el = map[key];
    if (!el) return;
    el.classList.remove('chicken-hud-pop');
    void el.offsetWidth;
    el.classList.add('chicken-hud-pop');
  };

  ChickenClicker.prototype.afterPurchase = function (hudKey) {
    if (hudKey) this.flashHud(hudKey);
    this.checkGoals();
    this.requestHud();
    this.renderUpgrades(this.upgradesDirty);
    this.renderLeaderboard(this.leaderboardDirty);
    this.renderYard(this.visualDirty);
    this._renderPreview();
    this.scheduleSave();
  };

  ChickenClicker.prototype.spawnHatchPop = function (isRooster) {
    if (!this.els.burstLayer || !this.els.eggLayer) return;
    var eggs = this.els.eggLayer.children;
    var x = 80;
    var y = 40;
    if (eggs.length) {
      var egg = eggs[(Math.random() * eggs.length) | 0];
      x = parseFloat(egg.style.left) || x;
      y = (this.els.stage ? this.els.stage.clientHeight : 200) - 20;
    }
    var el = document.createElement('span');
    el.className = 'chicken-click-pop chicken-hatch-pop';
    el.textContent = isRooster ? '+1 rooster!' : '+1 hen!';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.els.burstLayer.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 1500);
    if (this.els.hudEggsWrap) {
      this.els.hudEggsWrap.classList.remove('chicken-hud-flash');
      void this.els.hudEggsWrap.offsetWidth;
      this.els.hudEggsWrap.classList.add('chicken-hud-flash');
    }
  };

  ChickenClicker.prototype.hatchTick = function () {
    var rate = this.stats.hatch;
    if (!rate || !this.state.eggs) return false;

    var flockN = this.state.flock.length;
    var maxHatch = flockN < 20 ? 1 : flockN < 70 ? 2 : 3;
    var changed = false;
    var hatched = 0;
    var attempts = Math.min(this.state.eggs, Math.max(1, Math.ceil(this.state.eggs * rate * 0.035)));
    var i;
    for (i = 0; i < attempts; i++) {
      if (!this.state.eggs || hatched >= maxHatch) break;
      if (Math.random() > rate) continue;
      this.state.eggs -= 1;
      hatched += 1;
      var isRooster = Math.random() < 0.24;
      this.state.flock.push({
        id: this.state.nextId++,
        sex: isRooster ? 'rooster' : 'hen',
        fed: 0,
        evolution: null,
        name: null,
        bornAt: Date.now()
      });
      if (isRooster) this.state.lifetimeRoosters += 1;
      else this.state.lifetimeHens += 1;
      this.spawnHatchPop(isRooster);
      changed = true;
    }
    if (changed) {
      this.recompute();
      this.visualDirty = true;
      this.upgradesDirty = true;
      this.leaderboardDirty = true;
      this.checkGoals();
      this.scheduleSave();
    }
    return changed;
  };

  ChickenClicker.prototype.deathTick = function () {
    var flock = this.state.flock;
    if (flock.length < 12) return false;
    var n = flock.length;
    var chance = n < 25 ? 0.0015 : n < 50 ? 0.003 : n < 100 ? 0.005 : 0.008;
    if (Math.random() > chance) return false;

    var weak = sortFlockWeakestFirst(flock);
    var victim = null;
    var i;
    for (i = 0; i < weak.length; i++) {
      var b = weak[i];
      var tier = getBirdTier(b);
      if (tier >= 7 && Math.random() < 0.97) continue;
      if (tier >= 5 && Math.random() < 0.85) continue;
      if (tier >= 3 && Math.random() < 0.5) continue;
      if (b.sex === 'hen' && this.stats.hens <= 2) continue;
      if (b.sex === 'rooster' && this.stats.roosters <= 1) continue;
      victim = b;
      break;
    }
    if (!victim) return false;

    var rank = birdRank(flock, victim);
    for (i = 0; i < flock.length; i++) {
      if (flock[i].id === victim.id) {
        flock.splice(i, 1);
        break;
      }
    }
    this.recompute();
    this.visualDirty = true;
    this.leaderboardDirty = true;
    this.upgradesDirty = true;

    if (rank <= DEATH_TOP_N) {
      var self = this;
      var label = birdDisplayName(victim);
      this.showNarrative({
        eyebrow: 'Loss in the yard',
        title: label + ' has passed on',
        body: (victim.name || 'A beloved bird') + ' wandered off beyond the fence. The flock remembers.',
        bird: victim,
        btn: 'Farewell',
        onDismiss: function () { self.checkGoals(); }
      });
    } else {
      this.showToast('A humble bird wandered off.');
    }
    this.scheduleSave();
    return true;
  };

  ChickenClicker.prototype.loop = function () {
    if (!this.open || this.paused) return;
    var now = Date.now();
    if (now > this._visualRotateAt) {
      this._visualRotateAt = now + VISUAL_ROTATE_MS;
      this._visualSeed += 1;
      this.visualDirty = true;
    }
    this.passiveTick();
    var died = this.deathTick();
    if (died) return;
    var hatched = this.hatchTick();
    if (hatched || this.visualDirty) this.renderYard(this.visualDirty);
    else this.renderEggs();
    this.requestHud();
    this.renderBoostBanner();
    if (hatched || died) {
      this.renderUpgrades(this.upgradesDirty);
      this.renderLeaderboard(this.leaderboardDirty);
      this._renderPreview();
    } else {
      this.syncUpgradeAfford();
      if (this.leaderboardDirty) this.renderLeaderboard(true);
    }
    this._layoutTick += 1;
    if (this._layoutTick % 5 === 0) this.updateBirdLayouts();
  };

  ChickenClicker.prototype.updateBirdLayouts = function () {
    if (!this.flockNodes.length || !this.els.stage) return;
    var growing = false;
    var fi;
    for (fi = 0; fi < this.state.flock.length; fi++) {
      if (this.state.flock[fi].bornAt && Date.now() - this.state.flock[fi].bornAt < 20000) growing = true;
    }
    if (!growing) return;
    var samples = sampleVisualFlock(this.state.flock, MAX_VISUAL_BIRDS, this._visualSeed);
    var total = samples.length;
    var rows = total <= 3 ? 1 : total <= 9 ? 2 : 3;
    var j;
    for (j = 0; j < this.flockNodes.length && j < samples.length; j++) {
      this.layoutBird(this.flockNodes[j].slot, j, total, 0, 0, rows, samples[j].bird);
    }
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

  ChickenClicker.prototype.deferLeaderboard = function () {
    var self = this;
    if (this._lbTimer) return;
    this._lbTimer = setTimeout(function () {
      self._lbTimer = null;
      if (self.leaderboardDirty) self.renderLeaderboard(true);
      else self.syncLeaderboardEvolve();
    }, 500);
  };

  ChickenClicker.prototype.requestHud = function () {
    if (this._hudScheduled) return;
    var self = this;
    this._hudScheduled = true;
    requestAnimationFrame(function () {
      self._hudScheduled = false;
      self.renderHud();
    });
  };

  ChickenClicker.prototype.renderHud = function () {
    this.renderGoal();
    if (this.els.prestigeBtn) this.els.prestigeBtn.hidden = !this.state.prestigeUnlocked;
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
    if (this.els.modeGrain) {
      this.els.modeGrain.classList.toggle('is-active', this.state.feedMode === 'grain');
      this.els.modeGrain.setAttribute('aria-pressed', this.state.feedMode === 'grain' ? 'true' : 'false');
    }
    if (this.els.modeWorm) {
      this.els.modeWorm.classList.toggle('is-active', this.state.feedMode === 'worm');
      this.els.modeWorm.disabled = !this.state.wormsUnlocked;
      this.els.modeWorm.title = this.state.wormsUnlocked ? '' : 'Unlocks at 3 grains/click or 5 hens';
      this.els.modeWorm.setAttribute('aria-pressed', this.state.feedMode === 'worm' ? 'true' : 'false');
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
    this.renderBoostBanner();
  };

  ChickenClicker.prototype.layoutBird = function (slot, visualIndex, total, row, rowCount, rows, bird) {
    var w = this.els.stage ? this.els.stage.clientWidth : 300;
    var h = this.els.stage ? this.els.stage.clientHeight : 200;
    var perRow = Math.ceil(total / rows);
    var col = visualIndex % perRow;
    var rowIndex = Math.floor(visualIndex / perRow);
    var rowY = 0.58 + (rowIndex / Math.max(1, rows - 1)) * 0.32;
    var perspective = 1 - rowIndex * 0.14;
    var baseScale = total === 1 ? 1.35 : Math.max(0.38, Math.min(1.05, 1.15 - total * 0.035) * perspective);
    if (bird && bird.bornAt) {
      var age = (Date.now() - bird.bornAt) / 20000;
      if (age < 1) baseScale *= 0.5 + age * 0.5;
    }
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

    var samples = sampleVisualFlock(this.state.flock, MAX_VISUAL_BIRDS, this._visualSeed);
    var total = samples.length;
    var rows = total <= 3 ? 1 : total <= 6 ? 2 : 3;

    if (force || this.flockNodes.length !== total) {
      this.els.flockLayer.innerHTML = '';
      this.flockNodes = [];
      var i;
      for (i = 0; i < total; i++) {
        var bird = samples[i].bird;
        var skin = samples[i].skin;
        var slot = document.createElement('div');
        slot.className = 'chicken-bird-slot';
        var img = document.createElement('img');
        img.className = birdClass(bird);
        img.src = birdGifVisual(bird, skin);
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        slot.appendChild(img);
        this.layoutBird(slot, i, total, 0, 0, rows, bird);
        this.els.flockLayer.appendChild(slot);
        this.flockNodes.push({ slot: slot, img: img, bird: bird });
      }
    } else {
      for (var j = 0; j < this.flockNodes.length; j++) {
        var node = this.flockNodes[j];
        var b = samples[j].bird;
        node.img.className = birdClass(b);
        node.img.src = birdGifVisual(b, samples[j].skin);
        this.layoutBird(node.slot, j, total, 0, 0, rows, b);
      }
    }
    this.renderEggs();
  };

  ChickenClicker.prototype.createEggEl = function () {
    var w = this.els.stage.clientWidth;
    var egg = document.createElement('span');
    egg.className = 'chicken-egg';
    var ew = 7 + Math.random() * 5;
    egg.style.width = ew + 'px';
    egg.style.height = (ew * (1.15 + Math.random() * 0.2)) + 'px';
    egg.style.background = EGG_COLORS[(Math.random() * EGG_COLORS.length) | 0];
    egg.style.left = (w * 0.12 + Math.random() * w * 0.76) + 'px';
    egg.style.bottom = (4 + Math.random() * 14) + 'px';
    egg.style.setProperty('--egg-rot', ((Math.random() - 0.5) * 30).toFixed(1) + 'deg');
    return egg;
  };

  ChickenClicker.prototype.renderEggs = function () {
    if (!this.els.eggLayer || !this.els.stage) return;
    var show = Math.min(this.state.eggs, MAX_VISUAL_EGGS);
    while (this.eggNodes.length > show) {
      var rem = this.eggNodes.pop();
      if (rem.parentNode) rem.remove();
    }
    while (this.eggNodes.length < show) {
      var egg = this.createEggEl();
      this.els.eggLayer.appendChild(egg);
      this.eggNodes.push(egg);
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

    var s = this.state;
    var html = '';
    var now = Date.now();
    var boosts = '';

    if (s.milestones.grainStorm) {
      var gReady = now >= s.burstGrainCd;
      boosts += '<button type="button" class="chicken-upgrade-row chicken-upgrade-row--burst' + (gReady ? ' can-afford' : '') + '" data-burst="grain"' + (gReady ? '' : ' disabled') + '>' +
        '<span class="chicken-upgrade-row-main"><strong>Grain storm</strong><span>30× grain for 10s</span></span>' +
        '<span class="chicken-upgrade-row-cost">' + (gReady ? 'Go' : 'CD') + '</span></button>';
    }
    if (s.milestones.wormStorm) {
      var wReady = now >= s.burstWormCd;
      boosts += '<button type="button" class="chicken-upgrade-row chicken-upgrade-row--burst' + (wReady ? ' can-afford' : '') + '" data-burst="worm"' + (wReady ? '' : ' disabled') + '>' +
        '<span class="chicken-upgrade-row-main"><strong>Worm rain</strong><span>10× worms for 10s</span></span>' +
        '<span class="chicken-upgrade-row-cost">' + (wReady ? 'Go' : 'CD') + '</span></button>';
    }
    if (boosts) html += '<h4 class="chicken-shop-head">Boosts</h4>' + boosts;

    var clicking = '';
    nextGrainUpgrades(s, 2).forEach(function (g, idx) {
      var gwc = wormCostForGrain(g.cost);
      clicking += upgradeRow(g.label, g.desc, g.cost, gwc, canPay(s, g.cost, gwc), 'grain:' + g.id, idx > 0);
    });
    nextWormUpgrades(s, 2).forEach(function (w, idx) {
      var wwc = w.wormCost || wormCostForGrain(w.cost);
      clicking += upgradeRow(w.label, w.desc, w.cost, wwc, canPay(s, w.cost, wwc), 'worm:' + w.id, idx > 0);
    });
    if (clicking) html += '<h4 class="chicken-shop-head">Clicking</h4>' + clicking;

    var coop = '';
    COOP_UPGRADES.forEach(function (def) {
      var count = s.bought[def.id] || 0;
      if (def.max && count >= def.max) return;
      var cost = coopUpgradeCost(def, s);
      var wc = wormCostForGrain(cost);
      var desc = def.desc;
      if (count) desc += ' (' + count + (def.max ? '/' + def.max : '') + ')';
      coop += upgradeRow(def.label, desc, cost, wc, canPay(s, cost, wc), 'coop:' + def.id, false);
    });
    if (coop) html += '<h4 class="chicken-shop-head">Coop</h4>' + coop;

    var evo = '';
    sortFlockForLeaderboard(s.flock).slice(0, 6).forEach(function (bird) {
      var next = getNextEvoDef(bird);
      if (next) evo += evoUpgradeRow(bird, next, s);
    });
    if (evo) html += '<h4 class="chicken-shop-head">Evolutions</h4>' + evo;

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
      var nextDef = getNextEvoDef(bird);
      var next = getNextEvolution(bird);
      var afford = next && s.worms >= next.wormCost;
      var isChamp = champion && champion.id === bird.id;
      var pct = nextDef ? Math.round(evoProgress(bird) * 100) : 100;
      html += '<div class="chicken-leaderboard-row' + (isChamp ? ' is-champion' : '') + '">' +
        '<div class="chicken-leaderboard-portrait">' + portraitHtml(bird, true) + '</div>' +
        '<div class="chicken-leaderboard-tier">T' + tier + '</div>' +
        '<div class="chicken-leaderboard-main"><strong>' + birdDisplayName(bird) + '</strong>' +
        '<span>' + tierLabel + ' · ' + Math.floor(bird.fed) + ' fed</span>' +
        (nextDef ? '<span class="chicken-evo-bar chicken-evo-bar--sm"><span style="width:' + pct + '%"></span></span>' : '') +
        '</div>';
      if (nextDef) {
        html += '<button type="button" class="chicken-leaderboard-evolve' + (afford ? ' can-afford' : '') + '" data-evo-id="' + bird.id + '"' + (afford ? '' : ' disabled') + '>Evolve</button>';
      }
      html += '</div>';
    });
    if (s.hallOfFame && s.hallOfFame.length && this.els.hofRetired) {
      var hof = '';
      s.hallOfFame.slice(-4).reverse().forEach(function (entry) {
        hof += '<div class="chicken-leaderboard-row chicken-leaderboard-row--retired"><div class="chicken-leaderboard-main"><strong>' + entry.name + '</strong><span>Farm ' + entry.farm + ' · ' + Math.floor(entry.fed) + ' fed</span></div></div>';
      });
      this.els.hofRetired.innerHTML = '<div class="chicken-sidebar-title">Retired champions</div>' + hof;
    } else if (this.els.hofRetired) {
      this.els.hofRetired.innerHTML = '';
    }
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
    this.applyOfflineCatchup();
    this.recompute();
    syncGoalIndex(this.state, this.stats);
    this.checkGoals();
    this._visualRotateAt = Date.now() + VISUAL_ROTATE_MS;
    this.render();
    this.startLoops();
    this.scheduleFloatingWorm();
    this.scheduleImposter();
    this.modal.querySelector('.chicken-modal-close').focus();
  };

  ChickenClicker.prototype.closeModal = function () {
    if (!this.modal) return;
    this.state.lastSeen = Date.now();
    this.modal.hidden = true;
    this.open = false;
    document.body.style.overflow = '';
    this.stopLoops();
    this.removeFloatingWorm();
    if (this._floatingTimer) clearTimeout(this._floatingTimer);
    if (this._imposterTimer) clearTimeout(this._imposterTimer);
    if (this._imposterRaf) {
      cancelAnimationFrame(this._imposterRaf);
      this._imposterRaf = null;
      this._imposter = null;
      if (this.els.imposter) this.els.imposter.hidden = true;
      this.setPaused(false);
    }
    this.flushSave();
    if (this.hitbox) this.hitbox.focus();
  };

  ChickenClicker.prototype.init = function () {
    this.recompute();
    this.renderGoal();
    this.requestHud();
    this._renderPreview();
  };

  global.ChickenClicker = ChickenClicker;
})(typeof window !== 'undefined' ? window : this);
