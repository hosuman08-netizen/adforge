
/* LEGION_WAVE_98_today_counter */
try{var _dk=new Date().toDateString();var _o=JSON.parse(localStorage.getItem('lw_p16_web3_ad__today_counter')||'{}');if(_o.d!==_dk)_o={d:_dk,n:0};_o.n=(_o.n||0)+1;localStorage.setItem('lw_p16_web3_ad__today_counter',JSON.stringify(_o));}catch(e){}

/* LEGION_WAVE_8_today_counter */
try{var _dk=new Date().toDateString();var _o=JSON.parse(localStorage.getItem('lw_p16_web3_ad__today_counter')||'{}');if(_o.d!==_dk)_o={d:_dk,n:0};_o.n=(_o.n||0)+1;localStorage.setItem('lw_p16_web3_ad__today_counter',JSON.stringify(_o));}catch(e){}
// AdForge — Voice Ad Platform (Web3 simulation)
// Voice-driven: ad creation + voice-over + performance analysis
// Live voice ads + real-time viewer ratings
// Features: voice creatives, performance analyst, live ads, performance meter
// Fictional simulation only — no real funds, tokens, or advertising.

let wallet = null;
let credits = 920; // Credits (fictional virtual goods — simulated only, no real value)
let ads = JSON.parse(localStorage.getItem('p16_ads') || '[]');

function p16DayKey(off){const d=new Date();d.setDate(d.getDate()+(off||0));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function bumpP16Day(kind){
  try{
    const t0=p16DayKey(0);
    let st=JSON.parse(localStorage.getItem('p16_day_streak')||'{}');
    if(st.last!==t0){
      const y=p16DayKey(-1),y2=p16DayKey(-2);
      if(st.last&&st.last!==y&&st.last===y2&&(st.count||0)>=3){
        const ready=!st.shieldLast||((new Date(t0)-new Date(st.shieldLast))/86400000)>=7;
        if(ready){st.shieldLast=t0;st.last=y;}
      }
      st.count=(st.last===y)?(st.count||0)+1:1; st.last=t0;
      localStorage.setItem('p16_day_streak',JSON.stringify(st));
      try{legionTrack('streak',{count:st.count})}catch(e){}
    }
    const k='p16_day_'+t0; let day=JSON.parse(localStorage.getItem(k)||'{"ads":0}');
    if(kind==='ad') day.ads=(day.ads||0)+1;
    localStorage.setItem(k,JSON.stringify(day));
    renderP16Loop();
  }catch(e){}
}
function renderP16Loop(){
  try{
    let el=document.getElementById('p16Loop');
    if(!el){
      el=document.createElement('div'); el.id='p16Loop';
      el.style.cssText='margin:8px 0;padding:10px;border:1px solid #2a2438;border-radius:12px;font-size:12px;display:flex;flex-wrap:wrap;gap:8px';
      const host=document.querySelector('header')||document.querySelector('h1')||document.body;
      host.insertAdjacentElement('afterend', el);
    }
    const st=JSON.parse(localStorage.getItem('p16_day_streak')||'{}');
    const day=JSON.parse(localStorage.getItem('p16_day_'+p16DayKey(0))||'{}');
    const end=new Date(); end.setHours(24,0,0,0);
    const ms=Math.max(0,end-Date.now());
    const clock=Math.floor(ms/3600000)+'h '+Math.floor((ms%3600000)/60000)+'m';
    el.innerHTML='🔥 '+(st.count||0)+'일 · 오늘 광고 '+(day.ads||0)+' · 총 '+(ads&&ads.length||0)+' · 리셋 '+clock+' · <span style="opacity:.7">시뮬 18+ · 실결제 아님</span>';
  }catch(e){}
}

let campaigns = JSON.parse(localStorage.getItem('p16_campaigns') || '[]');
let codex = JSON.parse(localStorage.getItem('p16_codex') || '[]');
let publisherSlots = JSON.parse(localStorage.getItem('p16_publisher_slots') || '[]');
let nftSlots = JSON.parse(localStorage.getItem('p16_nftSlots') || '[]'); // AdSlot NFTs (ERC721 sim)
let auctions = JSON.parse(localStorage.getItem('p16_auctions') || '[]'); // on-chain auction state (simulated)
let slotsLeft = 47;
let lastVisit = parseInt(localStorage.getItem('p16_last_visit') || Date.now());
let voiceSeeds = JSON.parse(localStorage.getItem('p16_voiceSeeds') || '[]');
let adultUnlocked = false; // 18+ age gate
let metaverseAura = JSON.parse(localStorage.getItem('p16_meta_aura') || '{}'); // metaverse slot value carry

const PLATFORM_FEE_BPS = 100; // 1% (0.5-2% range)

// ============================================================
// === TARGETING + DELIVERY ENGINE (core value — real logic) ===
// The defining job of an ad platform: parse targeting → estimate a real
// audience → deliver against a real budget with internally-consistent
// impressions/clicks/spend. No random inflation: every number here derives
// from the audience the advertiser actually chose. Deterministic per ad.
// ============================================================

// Real audience catalog: reach (unique addressable users, fictional network),
// baseCpm (Credits per 1000 imps — competition proxy), baseCtr (click propensity).
const AUDIENCE_SEGMENTS = [
  { key: 'web3',        label: 'Web3 / Crypto',     aliases: ['web3','crypto','defi','dao','onchain','on-chain','nft','base','solana','wallet'], reach: 82000,  baseCpm: 14, baseCtr: 0.021 },
  { key: 'beauty',      label: 'Beauty',            aliases: ['beauty','skincare','cosmetic','makeup','glow'],                                     reach: 61000,  baseCpm: 11, baseCtr: 0.034 },
  { key: 'gaming',      label: 'Gaming',            aliases: ['gaming','gamer','game','esports','play'],                                           reach: 138000, baseCpm: 8,  baseCtr: 0.028 },
  { key: 'founders',    label: 'Founders / Builders',aliases: ['founder','founders','builder','startup','indie','vc','investor'],                  reach: 24000,  baseCpm: 22, baseCtr: 0.018 },
  { key: 'creators',    label: 'Creators',          aliases: ['creator','creators','artist','music','voice','ugc'],                                reach: 95000,  baseCpm: 9,  baseCtr: 0.030 },
  { key: 'youngadult',  label: 'Young Adults 18-24',aliases: ['young','young adults','youth','genz','gen z','student'],                            reach: 210000, baseCpm: 6,  baseCtr: 0.024 },
  { key: 'women',       label: 'Women',             aliases: ['women','woman','female','she'],                                                     reach: 176000, baseCpm: 10, baseCtr: 0.027 },
  { key: 'metaverse',   label: 'Metaverse',         aliases: ['metaverse','vr','avatar','land','billboard','virtual'],                             reach: 47000,  baseCpm: 13, baseCtr: 0.020 },
  { key: 'ideas',       label: 'Ideas / Innovation',aliases: ['idea','ideas','innovation','pitch','p12'],                                          reach: 33000,  baseCpm: 12, baseCtr: 0.022 },
  { key: 'adult',       label: 'Adult 18+',         aliases: ['adult','18+','eros','nsfw','mature'],                                               reach: 58000,  baseCpm: 16, baseCtr: 0.038 }
];
const GENERAL_SEGMENT = { key: 'general', label: 'General (Broad)', reach: 320000, baseCpm: 5, baseCtr: 0.012 };

// Small deterministic string hash → stable per-ad jitter (no Math.random in core).
function _hashStr(s) {
  let h = 2166136261 >>> 0;
  s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// Parse free-text targeting into matched segments (real matching, not cosmetic).
function parseTargeting(targetText) {
  const t = (targetText || '').toLowerCase();
  const matched = [];
  // Word-boundary match so an alias only matches whole words/phrases — e.g.
  // "young adults" must NOT match the "adult" (18+) segment. Escapes regex
  // metacharacters and treats '+'/'-' inside aliases (18+, on-chain) literally.
  const hasAlias = (alias) => {
    const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[^a-z0-9])' + esc + '(?![a-z0-9])', 'i').test(t);
  };
  AUDIENCE_SEGMENTS.forEach(seg => {
    if (seg.aliases.some(hasAlias)) matched.push(seg);
  });
  if (matched.length === 0) matched.push(GENERAL_SEGMENT);
  return matched;
}

// Estimate the audience for an ad: total reach, blended CPM/CTR, and a
// relevance score (0-1). Narrower + coherent targeting = higher relevance =
// better CTR & efficiency. This is the real "targeting matters" logic.
function estimateAudience(targetText, surprise = 0.4) {
  const segs = parseTargeting(targetText);
  // Union reach with diminishing overlap (each extra segment adds less new reach).
  let reach = 0;
  segs.forEach((s, i) => { reach += Math.round(s.reach * Math.pow(0.72, i)); });
  const blendedCpm = segs.reduce((a, s) => a + s.baseCpm, 0) / segs.length;
  const blendedCtr = segs.reduce((a, s) => a + s.baseCtr, 0) / segs.length;
  // Relevance: focused targeting (1-3 segments) beats spray; broad/general is weak.
  const focusBonus = segs.length === 0 ? 0 : Math.max(0, 1 - (segs.length - 1) * 0.18);
  const generalPenalty = segs.some(s => s.key === 'general') ? 0.45 : 1;
  // Voice resonance lifts creative relevance (bounded, honest — it's a modifier).
  const creativeLift = 0.85 + Math.min(0.3, surprise * 0.3);
  const relevance = Math.max(0.15, Math.min(1, focusBonus * generalPenalty * creativeLift));
  return {
    segments: segs.map(s => s.label),
    segmentKeys: segs.map(s => s.key),
    reach,
    cpm: +(blendedCpm).toFixed(2),
    ctr: +(blendedCtr * (0.7 + relevance * 0.6)).toFixed(4), // relevance modulates realized CTR
    relevance: +relevance.toFixed(2)
  };
}

// Deliver an ad against its remaining budget. Budget is REALLY consumed at the
// effective CPM; impressions/clicks/spend are internally consistent and capped
// by both budget and unique audience reach (frequency cap ~3x). Deterministic.
function deliverAd(ad, spendNow) {
  const est = estimateAudience(ad.target, ad.surprise || 0.4);
  ad.audience = est; // cache the real estimate on the ad
  const remaining = Math.max(0, (ad.budget || 0) - (ad.spent || 0));
  const spend = Math.max(0, Math.min(spendNow == null ? remaining : spendNow, remaining));
  if (spend <= 0) return { impressions: 0, clicks: 0, spend: 0, capped: 'budget', est };

  // Effective CPM: surprise-driven creative quality slightly lowers cost (better
  // quality score), stable jitter per ad keeps runs distinct but reproducible.
  const jitter = 0.9 + (_hashStr(ad.id + ':' + (ad.spent || 0)) % 200) / 1000; // 0.90–1.099
  const qualityDiscount = 1 - Math.min(0.25, (ad.surprise || 0.4) * 0.25);
  const effCpm = Math.max(1, est.cpm * qualityDiscount * jitter);

  let impressions = Math.floor((spend / effCpm) * 1000);
  // Frequency cap: can't show more than ~3 imps per unique user in reach.
  const impCap = est.reach * 3;
  let capped = null;
  if (impressions > impCap) { impressions = impCap; capped = 'reach'; }
  const actualSpend = Math.min(spend, +((impressions / 1000) * effCpm).toFixed(2));
  const clicks = Math.floor(impressions * est.ctr);

  ad.impressions = (ad.impressions || 0) + impressions;
  ad.clicks = (ad.clicks || 0) + clicks;
  ad.spent = +((ad.spent || 0) + actualSpend).toFixed(2);
  ad.lastDelivery = { impressions, clicks, spend: actualSpend, cpm: +effCpm.toFixed(2), ctr: est.ctr, ts: Date.now() };
  if (capped === null && (ad.budget - ad.spent) < 0.5) capped = 'budget';
  return { impressions, clicks, spend: actualSpend, cpm: +effCpm.toFixed(2), ctr: est.ctr, capped, est };
}

// ============================================================
// === VOICE ANALYSER — real creative-quality signal ==========
// Measures the ACTUAL recorded voice (Web Audio) so "voice resonance"
// is derived from what you performed, not a constant or random number.
// Loud + expressive + varied delivery scores higher than silence / monotone.
// Also drives the live waveform on the #voice-lung canvas. Bounded 0.10–1.00.
// ============================================================
const VoiceAnalyser = {
  ctx: null, analyser: null, source: null, raf: 0,
  samples: [],          // per-frame RMS energy (0..1)
  peak: 0,              // loudest frame
  canvas: null, cvx: null,

  // Attach to a live mic stream and start measuring + drawing the waveform.
  start(stream) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.source = this.ctx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.samples = []; this.peak = 0;
      this.canvas = document.getElementById('voice-lung');
      if (this.canvas) {
        this.canvas.style.display = 'block';
        this.cvx = this.canvas.getContext('2d');
      }
      const buf = new Uint8Array(this.analyser.fftSize);
      const tick = () => {
        this.analyser.getByteTimeDomainData(buf);
        // RMS energy of this frame (centered at 128).
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        this.samples.push(rms);
        if (rms > this.peak) this.peak = rms;
        this._draw(buf, rms);
        this.raf = requestAnimationFrame(tick);
      };
      tick();
      return true;
    } catch (e) { return false; }
  },

  // Draw a live waveform + energy glow so recording feels alive.
  _draw(buf, rms) {
    const c = this.canvas, x = this.cvx;
    if (!c || !x) return;
    const W = c.width, H = c.height;
    x.fillStyle = '#1c1811'; x.fillRect(0, 0, W, H);
    // energy glow proportional to loudness
    const glow = Math.min(1, rms * 3.2);
    x.strokeStyle = `rgba(197,164,110,${0.35 + glow * 0.55})`;
    x.lineWidth = 1.6; x.beginPath();
    const step = Math.max(1, Math.floor(buf.length / W));
    for (let i = 0, px = 0; i < buf.length; i += step, px++) {
      const y = (buf[i] / 255) * H;
      i === 0 ? x.moveTo(px, y) : x.lineTo(px, y);
    }
    x.stroke();
    // moving energy bar at bottom
    x.fillStyle = `rgba(143,191,127,${0.4 + glow * 0.6})`;
    x.fillRect(0, H - 4, Math.floor(W * glow), 4);
  },

  // Stop, tear down, and return a real 0.10–1.00 resonance score.
  stop() {
    cancelAnimationFrame(this.raf);
    const s = this.samples;
    let score = 0.42; // neutral fallback if nothing captured
    if (s.length > 3) {
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      // Dynamic variation: expressive delivery rises & falls, monotone is flat.
      const variance = s.reduce((a, b) => a + (b - mean) * (b - mean), 0) / s.length;
      const dynamics = Math.sqrt(variance);
      // Blend loudness (presence), peak (projection), dynamics (expression).
      const loud = Math.min(1, mean * 6.0);        // typical speech mean ~0.08–0.18
      const proj = Math.min(1, this.peak * 3.2);
      const expr = Math.min(1, dynamics * 12.0);
      score = 0.10 + (loud * 0.42 + proj * 0.28 + expr * 0.30) * 0.90;
    }
    score = Math.min(1, Math.max(0.1, score));
    try { if (this.ctx) this.ctx.close(); } catch (e) {}
    this.ctx = this.analyser = this.source = null;
    if (this.canvas) {
      // hold the final frame briefly, then hide the (now-idle) canvas
      setTimeout(() => { if (this.canvas) this.canvas.style.display = 'none'; }, 1600);
    }
    this._last = +score.toFixed(3);
    return this._last;
  },
  _last: 0.42
};
// Public accessor used across the app. Returns the last measured voice score,
// so ad creation / delivery use the REAL resonance from your recording.
window.getP6LungSurprise = function () { return VoiceAnalyser._last; };

// === ENGAGEMENT ENGINE (fictional simulation) ===
// Simulated engagement dashboard: performance highlights, variable bid/earning
// multipliers, recent-auction outcomes, opportunity prompts, owned-slot status.
// Voice resonance acts as a relevance multiplier on the simulated figures.
// All numbers are illustrative and carry no real value.

const Engagement = {
  resonance: 0.0, // from voice creative
  streak: parseInt(localStorage.getItem('p16_psych_streak') || '1'),
  ownedSlots: JSON.parse(localStorage.getItem('p16_owned_slots') || '[]'),
  nearMissLog: JSON.parse(localStorage.getItem('p16_nearmiss_log') || '[]'),
  lastSurge: 0,

  updateResonance() {
    const s = (window._p16Voice && window._p16Voice.surprise) || (window.getP6LungSurprise && window.getP6LungSurprise()) || 0.42;
    this.resonance = Math.min(1, Math.max(0.1, s));
    const rEl = document.getElementById('res-val');
    if (rEl) rEl.textContent = this.resonance.toFixed(2);
    return this.resonance;
  },

  // Performance highlight on ad (simulated)
  applyFomo(ad, isCreatorView = false) {
    const mult = 1 + (this.resonance * 0.9) + (Math.random() * 0.35);
    const perfBoost = Math.floor((ad.impressions || 200) * 0.18 * mult);
    ad.impressions = (ad.impressions || 0) + perfBoost;
    const fEl = document.getElementById('fomo-val');
    if (fEl) fEl.textContent = Math.floor(70 + this.resonance * 22 + Math.random()*8);
    return mult;
  },

  // Variable bid / earnings multiplier (simulated)
  variableRatio(base, isEarn = false) {
    const varFactor = 0.6 + (Math.random() * 1.9); // high variance
    let out = Math.floor(base * varFactor * (1 + this.resonance * 0.5));
    const vEl = document.getElementById('var-val');
    if (vEl) vEl.textContent = (varFactor * (1 + this.resonance*0.4)).toFixed(1) + 'x';
    if (isEarn) this.streak = Math.min(12, this.streak + 1);
    return Math.max(8, out);
  },

  // Recent-auction outcome (simulated)
  simulateNearMiss(bidAmount, won = false) {
    const missBy = Math.floor(Math.random() * 28) + 4;
    let pity = false;
    const missLog = JSON.parse(localStorage.getItem('p16_missStreak')||'[]');
    if (missLog.length >= 2 && !won) { pity = true; localStorage.setItem('p16_missStreak','[]'); }
    const entry = { ts: Date.now(), bid: bidAmount, missBy: pity ? Math.max(2,missBy-9) : missBy, won, resonance: this.resonance, pity };
    this.nearMissLog.unshift(entry);
    if (this.nearMissLog.length > 9) this.nearMissLog.pop();
    localStorage.setItem('p16_nearmiss_log', JSON.stringify(this.nearMissLog));
    const mEl = document.getElementById('miss-val');
    if (mEl) mEl.textContent = won ? `Won with a voice-resonance edge of +${(this.resonance*30).toFixed(0)}%` : (pity ? `Missed, but the next window is closer by ${missBy}` : `Missed a premium slot by ${missBy} Credits. Next window open.`);
    return missBy;
  },

  // Opportunity prompt on a campaign (simulated)
  triggerLossAversion(ad) {
    const lostPotential = Math.floor((ad.budget || 400) * (1.8 + this.resonance));
    const lEl = document.getElementById('loss-val');
    if (lEl) lEl.textContent = `Similar campaigns hit ${ (3 + this.resonance).toFixed(1) }x ROI. This window closes in ${Math.floor(Math.random()*52)+19}m.`;
    addToCodex(`Opportunity note: ${lostPotential} potential on ${ad.title}.`);
    return lostPotential;
  },

  // Save an owned slot (kept in your Vault)
  claimEndowment(ad) {
    const exists = this.ownedSlots.find(s => s.id === ad.id);
    if (!exists) {
      const owned = { ...ad, claimedAt: Date.now(), protection: 1 + this.resonance * 1.2 };
      this.ownedSlots.unshift(owned);
      if (this.ownedSlots.length > 6) this.ownedSlots.pop();
      localStorage.setItem('p16_owned_slots', JSON.stringify(this.ownedSlots));
      addToCodex(`Slot saved to Vault: ${ad.title}.`);
    }
    return this.ownedSlots;
  },

  getResonanceMult() { return 1 + this.resonance * 1.6; },

  saveStreak() {
    localStorage.setItem('p16_psych_streak', this.streak);
  }
};

// === CAMPAIGN FEATURES (simulated) ===
// 1: Ad Seed — a high-resonance ad plants an idea + metaverse clone
// 2: Dynamic Fee — high voice resonance lowers the effective auction fee
// 3: Live Event — a live spot boosts impressions across inventory for a window
function plantAdSpore(ad) {
  const seed = { id: Date.now(), fromAd: ad.id, title: ad.title + ' Seed', surprise: ad.surprise, ideaSeed: true, metaSeed: true, carry: Math.floor(ad.impressions * 0.4) };
  try { localStorage.setItem('p16_adseed_' + ad.id, JSON.stringify(seed)); } catch(e){}
  addToCodex(`Ad Seed planted: ${ad.title} → idea + metaverse billboard carrying ${seed.carry} imps.`);
  return seed;
}
function applyVeilAuction(bidAmount, surprise) {
  // Higher voice resonance lowers the effective auction fee
  const veil = Math.max(0.4, 1 - surprise * 0.7);
  const effective = Math.floor(bidAmount * veil);
  addToCodex(`Dynamic fee: bid ${bidAmount} → effective ${effective} (voice resonance ${surprise.toFixed(2)}).`);
  return effective;
}
function igniteRitual() {
  hideAll();
  document.getElementById('live').classList.remove('hidden');
  const spike = Math.floor(Math.random()*28) + 22;
  slotsLeft = Math.max(3, slotsLeft - 2);
  ads.forEach(a => a.impressions += Math.floor(spike * (a.surprise || 0.5)));
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  addToCodex(`Live event: +${spike}% impressions across all inventory for this window.`);
  alert(`Live event started. All ads +${spike} imps. Slots now ${slotsLeft}.`);
  showInventory();
}
function seedFromMetaverse() {
  hideAll();
  document.getElementById('metaverse').classList.remove('hidden');
  const metaAd = { id: Date.now()+7, title: 'Metaverse Billboard', desc: 'Metaverse land ad.', budget: 900, surprise: 0.71, spent: 0, impressions: 9800, target: 'Web3 Metaverse', timestamp: new Date().toISOString() };
  ads.unshift(metaAd);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  addToCodex('Metaverse billboard → ad created.');
  showInventory();
}
function spawnFromIdea() {
  hideAll();
  document.getElementById('ideas').classList.remove('hidden');
  const ideaAd = { id: Date.now()+11, title: 'Idea Pitch Ad', desc: 'Funded creative from an idea.', budget: 650, surprise: 0.78, spent: 0, impressions: 3200, target: 'Ideas', timestamp: new Date().toISOString() };
  ads.unshift(ideaAd);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  addToCodex('Idea → ad created.');
  showInventory();
}
function buySub(type) {
  const cost = type==='creator' ? 120 : 220;
  if (credits < cost) { alert('Not enough Credits.'); return; }
  credits -= cost;
  updateWallet();
  addToCodex(`${type} Pass purchased. Lower fees + priority active.`);
  alert(`${type} Pass active (fictional). 12%→7% fee.`);
}
function showAdultOption() {
  const o = document.getElementById('adult-option');
  if (o) o.style.display = adultUnlocked ? 'block' : 'none';
}
function showAdultGate() {
  document.getElementById('age-gate').classList.remove('hidden');
}
function confirmAdult() {
  adultUnlocked = true;
  document.getElementById('age-gate').classList.add('hidden');
  const o = document.getElementById('adult-option'); if (o) o.style.display = 'block';
  addToCodex('Adult content unlocked (18+ gate passed — fictional).');
}
function hideAdult() {
  document.getElementById('age-gate').classList.add('hidden');
}

function updateWallet() {
  const el = document.getElementById('wallet-info');
  if (el) el.innerHTML = `${wallet || '0xDemo'} • ${credits} Credits`;
}

function connectWallet() {
  wallet = '0x' + Math.random().toString(16).slice(2, 10);
  updateWallet();
}

// === ON-CHAIN CORE (Base-style sim) ===
// NFT AdSlot mint (creator lists inventory as ERC721)
function mintNFTSlot(type = 'banner', minPrice = 80) {
  if (!wallet) { alert('Connect wallet (simulated)'); return; }
  const deposit = Math.floor(minPrice * 0.6);
  if (credits < deposit) { alert('Need Credits for NFT deposit.'); return; }
  credits -= deposit;
  
  const slot = {
    id: Date.now(),
    owner: wallet,
    type, // banner | live-overlay | metaverse-billboard
    minPrice,
    deposit,
    performance: 0.5 + Math.random() * 0.4,
    timestamp: new Date().toISOString()
  };
  nftSlots.unshift(slot);
  localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  
  addToCodex(`Minted AdSlot NFT #${slot.id} (${type}) • deposit ${deposit} Credits.`);
  updateWallet();
  alert(`AdSlot NFT minted! (Fictional ERC721) Min ${minPrice}. Now auctionable.`);
  showNFTSlots();
}

// Start Dutch auction on a slot (on-chain price decay sim)
function startDutchAuction(slotId) {
  const slot = nftSlots.find(s => s.id === slotId);
  if (!slot || slot.owner !== wallet) { alert('Own the slot'); return; }
  
  const auc = {
    id: Date.now(),
    slotId,
    startPrice: Math.floor(slot.minPrice * 1.8),
    currentPrice: Math.floor(slot.minPrice * 1.8),
    startTs: Date.now(),
    bids: [],
    settled: false,
    winner: null
  };
  auctions.unshift(auc);
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  addToCodex(`Dutch auction live on slot ${slotId}. Start ${auc.startPrice} Credits.`);
  showAuctions();
}

// Place bid, scaling effective power by voice resonance
function placeBid(aucId, manualAmount = null) {
  if (!wallet) { alert('Connect wallet'); return; }
  const auc = auctions.find(a => a.id === aucId);
  if (!auc || auc.settled) return;
  
  const voiceBoost = window._p16Voice ? (window._p16Voice.surprise || 0.5) : 0.5;
  const baseBid = manualAmount || Math.floor(auc.currentPrice * 0.85 + Math.random() * 40);
  // voice resonance scales effective bid power
  const effective = Math.floor(baseBid * (1 + (voiceBoost - 0.5) * 0.3));
  
  if (credits < baseBid) { alert('Credits short.'); return; }
  credits -= baseBid;
  
  auc.bids.push({ bidder: wallet, amount: baseBid, effective, voice: voiceBoost, ts: Date.now() });
  auc.currentPrice = Math.max(auc.currentPrice * 0.92, baseBid); // decay sim
  
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  updateWallet();
  addToCodex(`Bid ${baseBid} (eff ${effective}) on auc ${aucId}. Voice Studio ${voiceBoost.toFixed(2)}`);
  
  // Auto near-settle if strong bid + FOMO
  if (auc.bids.length > 2 || effective > auc.startPrice * 0.95) {
    settleAuction(aucId);
  } else {
    showAuctions();
  }
}

// Settle (on-chain sim): fee skim 1% (Credits), NFT transfer, creator payout, p11 value carry
function settleAuction(aucId) {
  const auc = auctions.find(a => a.id === aucId);
  if (!auc || auc.settled) return;
  
  const sorted = [...auc.bids].sort((x,y) => y.effective - x.effective);
  if (sorted.length === 0) return;
  
  const winner = sorted[0];
  const slot = nftSlots.find(s => s.id === auc.slotId);
  if (!slot) return;
  
  const fee = Math.floor(winner.amount * (PLATFORM_FEE_BPS / 10000));
  const net = winner.amount - fee;
  
  // Credits stable settlement + TreasuryLung feed
  credits += net * 0.3; // creator share sim (real would transfer)
  
  slot.owner = winner.bidder;
  auc.settled = true;
  auc.winner = winner.bidder;
  auc.final = winner.amount;
  auc.fee = fee;
  
  // metaverse slot value carry
  if (slot.type === 'metaverse-billboard') {
    const tileKey = 'demo-tile';
    metaverseAura[tileKey] = (metaverseAura[tileKey] || 1) + (winner.voice * 0.6);
    localStorage.setItem('p16_meta_aura', JSON.stringify(metaverseAura));
    addToCodex(`Metaverse slot value +${(winner.voice*0.6).toFixed(2)} carried from this win.`);
  }
  
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  updateWallet();
  addToCodex(`Settled auc ${aucId}. Winner ${winner.bidder.slice(0,6)} paid ${winner.amount}. Fee ${fee} (1%).`);
  alert(`Auction settled! Platform 1% skimmed. NFT transferred. ${slot.type === 'metaverse-billboard' ? 'metaverse value carry active.' : ''}`);
  showAuctions();
}

function recordVoiceAd() {
  const preview = document.getElementById('voice-preview');
  preview.innerHTML = 'Voice Studio: Recording your voice creative...';

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream);
    let chunks = [];
    VoiceAnalyser.start(stream); // measure the real voice + live waveform
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, {type:'audio/webm'});
      const url = URL.createObjectURL(blob);

      const surprise = VoiceAnalyser.stop(); // REAL resonance from your recording
      const artistic = {insight: p6VoiceExpertInsight(surprise), rating: surprise};

      preview.innerHTML = `<audio controls src="${url}"></audio><br>👁 Resonance: ${surprise.toFixed(2)} • ${artistic.insight} • Boost +${Math.floor(surprise*28)}%`;
      window._p16Voice = { url, surprise, artistic };
      Engagement.updateResonance(); // voice now feeds the resonance multiplier
      stream.getTracks().forEach(t => t.stop());
    };
    rec.start();
    setTimeout(() => rec.stop(), 4200);
  }).catch(() => {
    const s = 0.65 + Math.random()*0.2;
    preview.innerHTML = `Voice preview ready. Resonance ${s.toFixed(2)}`;
    window._p16Voice = { surprise: s, artistic: {insight:'sfumato ache', rating:s} };
  });
}

function createAd() {
  const title = document.getElementById('ad-title').value || 'Untitled Ad';
  const desc = document.getElementById('ad-desc').value || 'No desc.';
  const budget = parseInt(document.getElementById('budget').value) || 500;
  const target = document.getElementById('target').value || 'General';
  const surprise = (window._p16Voice && window._p16Voice.surprise) || (window._p16VoiceOver && window._p16VoiceOver.surprise) || 0.3;
  
  if (!wallet) {
    alert('Connect wallet (simulated).');
    return;
  }
  const isAdult = document.getElementById('adult-ad') && document.getElementById('adult-ad').checked;
  if (isAdult && !adultUnlocked) { showAdultGate(); return; }
  
  const ad = {
    id: Date.now(),
    title,
    desc,
    budget,
    target,
    surprise,
    voiceUrl: (window._p16Voice && window._p16Voice.url) || (window._p16VoiceOver && window._p16VoiceOver.url) || null,
    voiceOver: window._p16VoiceOver || null,
    timestamp: new Date().toISOString(),
    spent: 0,
    impressions: 0,
    owner: wallet || 'demo',
    adult: !!isAdult
  };
  
  // CORE: compute the real audience from targeting at creation time.
  ad.audience = estimateAudience(ad.target, surprise);
  ad.clicks = 0;

  ads.unshift(ad);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  try{bumpP16Day('ad');}catch(e){}
  if (window.legionTrack) window.legionTrack('activate');

  if (surprise > 0.55) plantAdSpore(ad); 
  Engagement.updateResonance();
  addToCodex(`Created ad: ${title}. Audience ${ad.audience.reach.toLocaleString()} in [${ad.audience.segments.join(', ')}] • relevance ${ad.audience.relevance} • CPM ${ad.audience.cpm}. Voice resonance ${surprise}.${isAdult ? ' [Adult 18+]' : ''}`);

  // Elegant in-page payoff card (replaces the blocking native alert) — the
  // "targeting → real audience" moment is the core reward, so make it beautiful.
  showAdResult(ad, budget, surprise);
  document.getElementById('ad-title').value = '';
  document.getElementById('ad-desc').value = '';
}

// Render the ad-creation result as a dismissable, on-theme card instead of an
// OS alert(). Shows how the chosen targeting mapped to a concrete audience.
function showAdResult(ad, budget, surprise) {
  const a = ad.audience;
  const projImps = Math.floor((budget / Math.max(1, a.cpm)) * 1000);
  const relPct = Math.round(a.relevance * 100);
  const relColor = a.relevance >= 0.7 ? '#8fbf7f' : a.relevance >= 0.45 ? '#d4b98a' : '#e0a05e';
  const resPct = Math.round(surprise * 100);
  const old = document.getElementById('ad-result'); if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'ad-result';
  el.className = 'ad-result';
  el.innerHTML = `
    <button class="ad-result-x" onclick="this.parentNode.remove()" aria-label="Dismiss">×</button>
    <div class="ad-result-head">✅ Ad created <span class="ad-result-fic">FICTIONAL</span></div>
    <div class="ad-result-title">${ad.title}</div>
    <div class="ad-result-flow">🎯 Targeting → <b>${a.segments.join(' + ')}</b></div>
    <div class="ad-result-grid">
      <div><span>Reach</span><b>${a.reach.toLocaleString()}</b></div>
      <div><span>Relevance</span><b style="color:${relColor}">${relPct}%</b></div>
      <div><span>est. CPM</span><b>${a.cpm}</b></div>
      <div><span>est. CTR</span><b>${(a.ctr*100).toFixed(2)}%</b></div>
    </div>
    <div class="ad-result-proj">Budget ${budget} → ~<b>${projImps.toLocaleString()}</b> projected impressions</div>
    <div class="ad-result-res">🎙 Voice resonance <b>${surprise.toFixed(2)}</b> · ${resPct >= 55 ? 'lifting relevance' : 'record a stronger voice to lift relevance'}</div>
    <button class="primary ad-result-cta" onclick="showInventory()">Go to Inventory → Deliver</button>
    <div class="ad-result-note">Simulated performance · Utility credits only, no real value or securities · Adult content gated 18+.</div>
  `;
  const section = document.getElementById('create');
  const h2 = section.querySelector('h2');
  if (h2 && h2.nextSibling) section.insertBefore(el, h2.nextSibling);
  else section.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Live audience preview as the advertiser types targeting — instant proof that
// targeting maps to a real, changing audience (reach/relevance/CPM).
function previewAudience() {
  const el = document.getElementById('audience-preview');
  if (!el) return;
  const target = (document.getElementById('target') && document.getElementById('target').value) || '';
  const budget = parseInt(document.getElementById('budget') && document.getElementById('budget').value) || 500;
  const surprise = (window._p16Voice && window._p16Voice.surprise) || 0.4;
  if (!target.trim()) { el.innerHTML = ''; return; }
  const est = estimateAudience(target, surprise);
  const projImps = Math.floor((budget / Math.max(1, est.cpm)) * 1000);
  const relColor = est.relevance >= 0.7 ? '#8fbf7f' : est.relevance >= 0.45 ? '#d4b98a' : '#e0a05e';
  el.innerHTML = `
    <div class="aud-preview-head">🎯 Matched: <b>${est.segments.join(' + ')}</b></div>
    <div class="aud-preview-row">Reach <b>${est.reach.toLocaleString()}</b> · Relevance <b style="color:${relColor}">${(est.relevance*100).toFixed(0)}%</b> · CPM <b>${est.cpm}</b> · CTR <b>${(est.ctr*100).toFixed(2)}%</b></div>
    <div class="aud-preview-proj">Budget ${budget} → ~${projImps.toLocaleString()} projected impressions</div>
    ${est.segmentKeys.includes('general') ? '<div class="aud-preview-tip">Broad match — add specific interests (Web3, Beauty, Gaming…) to lift relevance.</div>' : est.segments.length > 3 ? '<div class="aud-preview-tip">Wide spread lowers relevance — focus on 1–3 segments for stronger CTR.</div>' : ''}
  `;
}

function showCreate() {
  hideAll();
  document.getElementById('create').classList.remove('hidden');
  showAdultOption(); // show adult option if unlocked
  previewAudience();
}
function showMetaverse() { hideAll(); document.getElementById('metaverse').classList.remove('hidden'); }
function showIdeas() { hideAll(); document.getElementById('ideas').classList.remove('hidden'); }
function showSubs() { hideAll(); document.getElementById('subs').classList.remove('hidden'); }

function showInventory() {
  hideAll();
  document.getElementById('inventory').classList.remove('hidden');
  const list = document.getElementById('inventory-list');
  list.innerHTML = '';
  
  if (ads.length === 0) {
    list.innerHTML = '<p>No ads. Create one with voice!</p>';
    return;
  }
  
  ads.forEach(ad => {
    const el = document.createElement('div');
    el.className = 'ad-card';
    const birthTag = ((ad.surprise||0) > 0.55) ? ' 🌱AdSpore' : '';
    const adultTag = ad.adult ? ' 🔞18+' : '';
    // Ensure a real audience estimate exists (covers legacy/seed ads).
    const aud = ad.audience || (ad.audience = estimateAudience(ad.target, ad.surprise || 0.4));
    const remaining = Math.max(0, (ad.budget || 0) - (ad.spent || 0));
    const budgetPct = ad.budget ? Math.min(100, Math.round(((ad.spent||0) / ad.budget) * 100)) : 0;
    const ctrRealized = (ad.impressions && ad.clicks != null) ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : (aud.ctr*100).toFixed(2);
    const spentDisplay = (typeof ad.spent === 'number') ? ad.spent : 0;
    const ld = ad.lastDelivery;
    el.innerHTML = `
      <strong>${ad.title}</strong>${adultTag}${birthTag}<br>
      <small>${(ad.desc||'').substring(0,60)}...</small><br>
      <div class="surprise">👁 Surprise: ${(ad.surprise||0).toFixed(2)} ${ad.voiceUrl || ad.voiceOver ? '🎙' : ''} ${ad.voiceAnalysis ? '📊' : ''}</div>
      <div class="aud-line">🎯 <b>${aud.segments.join(' + ')}</b> — reach ${aud.reach.toLocaleString()} • relevance ${(aud.relevance*100).toFixed(0)}%</div>
      <div class="delivery-stats">
        <span>Imps <b>${(ad.impressions||0).toLocaleString()}</b></span>
        <span>Clicks <b>${(ad.clicks||0).toLocaleString()}</b></span>
        <span>CTR <b>${ctrRealized}%</b></span>
      </div>
      <div class="budget-bar" title="Spent ${spentDisplay} of ${ad.budget}"><div style="width:${budgetPct}%"></div></div>
      <div class="budget-line">Budget ${spentDisplay}/${ad.budget} Credits (${remaining.toFixed(0)} left) • CPM ${aud.cpm}</div>
      ${ld ? `<div class="last-delivery">▶ last run: +${ld.impressions.toLocaleString()} imps, +${ld.clicks} clicks, −${ld.spend} @ CPM ${ld.cpm}</div>` : ''}
      <button onclick="runDelivery(${ad.id})" ${remaining < 0.5 ? 'disabled' : ''}>${remaining < 0.5 ? '✓ Budget spent' : '📡 Deliver (spend budget)'}</button>
      <button onclick="bidOnAd(${ad.id})" style="margin-top:3px">Boost bid (FOMO)</button>
      <button onclick="analyzeAdPerformanceWithVoice(${ad.id});startVoicePerformanceMeter(${ad.id})" style="margin-top:3px;font-size:10px">👁 voice Analyze + Meter</button>
    `;
    list.appendChild(el);
  });
}

// CORE ACTION: run real delivery. Spends up to ~30% of remaining budget per run
// so the advertiser watches impressions/clicks accrue and budget deplete — a
// real, bounded campaign, not random inflation.
function runDelivery(id) {
  const ad = ads.find(a => a.id === id);
  if (!ad) return;
  const remaining = Math.max(0, (ad.budget || 0) - (ad.spent || 0));
  if (remaining < 0.5) { alert('Budget fully spent. This campaign has delivered its full run.'); return; }
  const chunk = Math.max(1, Math.min(remaining, Math.ceil(remaining * 0.34)));
  const r = deliverAd(ad, chunk);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  addToCodex(`Delivered ${ad.title}: +${r.impressions.toLocaleString()} imps, +${r.clicks} clicks, −${r.spend} Credits @ CPM ${r.cpm} (CTR ${(r.ctr*100).toFixed(2)}%).`);
  const capMsg = r.capped === 'reach'
    ? '\n⚠ Frequency cap hit — audience reach saturated (widen targeting for more).'
    : r.capped === 'budget' ? '\n✓ Budget now fully spent — campaign complete.' : '';
  alert(`📡 Delivered (FICTIONAL sim)\n+${r.impressions.toLocaleString()} impressions\n+${r.clicks} clicks (CTR ${(r.ctr*100).toFixed(2)}%)\n−${r.spend} Credits spent @ CPM ${r.cpm}\nBudget left: ${(ad.budget - ad.spent).toFixed(0)}${capMsg}`);
  showInventory();
}

function bidOnAd(id) {
  const ad = ads.find(a => a.id === id);
  if (!ad || !wallet) {
    alert('Connect wallet.');
    return;
  }
  
  const baseBid = 50 + Math.floor(Math.random()*50);
  if (credits < baseBid) {
    alert('Need more Credits.');
    return;
  }
  
  Engagement.updateResonance();
  const varBid = Engagement.variableRatio(baseBid); // variable multiplier
  const effectiveBid = applyVeilAuction(varBid, ad.surprise || 0.4);
  credits -= effectiveBid;
  ad.spent += effectiveBid;

  const near = Engagement.simulateNearMiss(effectiveBid, Math.random() > 0.6);
  const psychMult = Engagement.getResonanceMult();
  ad.impressions += Math.floor(effectiveBid * 14 * psychMult);

  Engagement.applyFomo(ad);
  enhanceFomoOnAction(ad);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  
  if (Math.random() < 0.38) Engagement.triggerLossAversion(ad);
  
  addToCodex(`Bid ${effectiveBid}  on ${ad.title}. Res ${Engagement.resonance.toFixed(2)}. Near ${near}.`);
  updateWallet();
  alert(`Bid ${effectiveBid}! Near-miss ${near}. Res ${Engagement.resonance.toFixed(2)}x. Slots ${slotsLeft}.`);
  showInventory();
}

function showLive() {
  hideAll();
  const liveSec = document.getElementById('live');
  liveSec.classList.remove('hidden');
  renderLiveVoiceAds();
}

function renderLiveVoiceAds() {
  const list = document.getElementById('live-voice-list');
  if (!list) return;
  list.innerHTML = '';
  const liveOnes = ads.filter(a => a.live || a.p9Cross).slice(0,5);
  if (liveOnes.length === 0) {
    // seed a live demo
    const demo = {id:99901, title:'Live Voice Ad — Eclipse', desc:'Live voice ad, real-time viewer ratings.', surprise:0.74, viewers:87, seatsLeft:4, live:true, p9Cross:true};
    ads.push(demo); localStorage.setItem('p16_ads',JSON.stringify(ads));
    liveOnes.push(demo);
  }
  liveOnes.forEach(l => {
    const el = document.createElement('div');
    el.className='ad-card';
    el.innerHTML = `<strong>${l.title}</strong><br><small>${l.desc||'Live voice ad'}</small>
      <div class="surprise">👁 ${l.surprise?.toFixed(2)} • ${l.viewers||42} watching • ${l.seatsLeft||'∞'} seats</div>
      <button onclick="joinLiveVoice(${l.id})">Join Live Voice</button>`;
    list.appendChild(el);
  });
}

function joinLiveVoice(id) {
  const ad = ads.find(a=>a.id===id); if(!ad || !wallet) return alert('wallet');
  const s = (window.getP6LungSurprise&&window.getP6LungSurprise()) || (ad.surprise||0.5);
  ad.viewers = (ad.viewers||40) + 3;
  ad.surprise = Math.min(1, ad.surprise*0.8 + s*0.6);
  const pv = document.getElementById('live-voice-preview');
  if(pv) pv.innerHTML = `Joined. voice live • resonance now ${ad.surprise.toFixed(2)}.`;
  addToCodex(`Joined live voice ad: ${ad.title}`);
  birthVoiceSeed('live', ad.surprise, id);
  renderLiveVoiceAds();
}

function joinRandomLiveVoice() {
  const lives = ads.filter(a=>a.live||a.p9Cross);
  if(lives.length) joinLiveVoice(lives[0].id);
  else launchLiveVoiceAdCross();
}

function showCampaigns() {
  hideAll();
  document.getElementById('campaigns').classList.remove('hidden');
  const list = document.getElementById('my-campaigns');
  list.innerHTML = '<h3>My Active Campaigns</h3>';
  
  const mine = ads.filter(a => a.owner === wallet || !a.owner).slice(0,3);
  if (mine.length === 0) {
    list.innerHTML += '<p>No campaigns. Create with voice or import an idea. List publisher slots for supply-side earnings.</p>';
    return;
  }
  mine.forEach(c => {
    const div = document.createElement('div');
    div.className = 'notebook-entry';
    div.innerHTML = `<strong>${c.title}</strong><br>Spent: ${c.spent} | Imps: ${c.impressions} <span class="fomo">(synergy active)</span>`;
    list.appendChild(div);
  });
}

function showCodex() {
  hideAll();
  document.getElementById('codex').classList.remove('hidden');
  const list = document.getElementById('codex-list');
  list.innerHTML = '';

  if (codex.length === 0) {
    list.innerHTML = '<p>Create or bid to see activity here.</p>';
    return;
  }
  
  codex.slice(0,8).forEach(c => {
    const div = document.createElement('div');
    div.className = 'notebook-entry';
    div.innerHTML = `<small>${new Date(c.time).toLocaleString()}</small><br>${c.note}`;
    list.appendChild(div);
  });
}

function showP11() {
  hideAll();
  document.getElementById('metaverse').classList.remove('hidden');
  const list = document.getElementById('meta-list') || document.createElement('div');
  list.innerHTML = '<div class="ad-card">Metaverse Prime Billboard • 0.8 Credits/impression • 5 slots left</div><button onclick="seedFromMetaverse()">Create Metaverse Ad</button>';
}

function showP12() {
  hideAll();
  document.getElementById('ideas').classList.remove('hidden');
  const list = document.getElementById('idea-list') || document.createElement('div');
  list.innerHTML = '<div class="ad-card">Idea Ad: Voice for beauty • Funded by investors • Resonance 0.72</div><button onclick="spawnFromIdea()">Create Ad from Idea</button>';
}

function addToCodex(note) {
  codex.unshift({ time: Date.now(), note });
  if (codex.length > 20) codex.pop();
  localStorage.setItem('p16_codex', JSON.stringify(codex));
}

function hideAll() {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
}

// === Idea Integration (Idea Ads) ===
function importFromP12() {
  hideAll();
  document.getElementById('create').classList.remove('hidden');
  // idea → ad. Voice pitch becomes the creative.
  document.getElementById('ad-title').value = 'Funded Idea: Viral Web3 Drop';
  document.getElementById('ad-desc').value = 'IdeaForge #312: "Founders only prestige narrative". Funded 420 Credits. Auto voice boost.';
  document.getElementById('target').value = 'Ideas, Web3 Founders, Creators';
  document.getElementById('budget').value = '680';
  alert('📥 Idea imported. Voice resonance boosted. Founding advertisers window open.');
  // Auto record "voice" sim for psych
  window._p16Voice = { surprise: 0.78 };
  const preview = document.getElementById('voice-preview');
  if (preview) preview.innerHTML = '🎙 Voice idea loaded • Resonance 0.78';
}

// === Publisher Mode (content supply) ===
function showPublisher() {
  hideAll();
  document.getElementById('publisher').classList.remove('hidden');
  renderPublisherSlots();
}

function listPublisherSlot() {
  if (!wallet) { alert('Connect wallet first.'); return; }
  const title = document.getElementById('slot-title').value || 'Untitled Slot';
  const rateStr = document.getElementById('slot-rate').value || '2000 imps / 15 Credits';
  const rate = parseInt(rateStr) || 18;
  const slot = {
    id: Date.now(),
    title,
    rate,
    earned: 0,
    listed: new Date().toISOString(),
    target: 'Publisher network'
  };
  publisherSlots.unshift(slot);
  localStorage.setItem('p16_publisher_slots', JSON.stringify(publisherSlots));
  slotsLeft = Math.max(5, slotsLeft - 1); // FOMO: listing reduces available premium demand slots
  addToCodex(`Listed publisher slot: ${title}. Earns ${rate}/h. idea ads auto-match.`);
  updateFomoDisplays();
  renderPublisherSlots();
  alert(`✅ Slot listed. FOMO: ${slotsLeft} advertiser slots remain. Your content now monetizes.`);
}

function renderPublisherSlots() {
  const container = document.getElementById('publisher-slots');
  if (!container) return;
  container.innerHTML = '<h4>Your Active Slots (Idle + FOMO earnings)</h4>';
  if (publisherSlots.length === 0) {
    container.innerHTML += '<p>No slots. List from your content or live sessions for passive Credits.</p>';
    return;
  }
  publisherSlots.forEach(s => {
    const div = document.createElement('div');
    div.className = 'ad-card';
    div.innerHTML = `
      <strong>${s.title}</strong><br>
      <small>Rate: ${s.rate} • Earned: ${s.earned || 0} • ${s.target}</small><br>
      <div class="fomo">🔥 Matched to ${Math.floor(Math.random()*4)+2} campaigns • Variable payout active</div>
    `;
    container.appendChild(div);
  });
}

// === Share to X ===
function shareOnX() {
  const sampleAd = ads[0] || { title: 'Your Voice Ad', surprise: 0.71, impressions: 12400 };
  const copy = `AdForge: ${sampleAd.title} reached ${sampleAd.impressions} impressions with voice resonance ${sampleAd.surprise.toFixed(2)}.

Voice-driven ad creatives, live auctions, and idea + metaverse inventory.

Build your campaign on AdForge.

Fictional simulation. 18+ only. Rates & limits shown in-app.

#Web3Ads`;

  if (window.legionTrack) window.legionTrack('share');
  navigator.clipboard.writeText(copy).then(() => {
    alert('🐦 Share copy copied. Post it to spread your campaign.');
    addToCodex('Share copy generated for your campaign.');
  }).catch(() => {
    prompt('Copy this post:', copy);
  });
}

// === Live Auction ===
function joinLiveAuction() {
  if (!wallet) { alert('Connect wallet.'); return; }
  const bid = 80 + Math.floor(Math.random() * 70);
  if (credits < bid) { alert('Need more Credits (Credits).'); return; }
  credits -= bid;
  slotsLeft = Math.max(3, slotsLeft - 2);
  updateWallet();
  updateFomoDisplays();
  addToCodex(`Joined live auction. Spent ${bid}. Near-miss premium slot secured.`);
  alert(`🔥 Live bid won! ${bid} Credits. ${slotsLeft} slots left. viewers + voice resonance lift reach.`);
}

// Enhanced FOMO + psych in core actions
function enhanceFomoOnAction(ad) {
  slotsLeft = Math.max(4, slotsLeft - 1);
  const multiplier = (ad.surprise || 0.5) * (1 + Math.random() * 0.4); // variable ratio psych
  ad.impressions = Math.floor((ad.impressions || 0) + 180 * multiplier);
  updateFomoDisplays();
}

function updateWallet() {
  const el = document.getElementById('wallet-info');
  if (el) el.innerHTML = `${wallet || '0xDemo'} • ${credits} Credits`;
}

// === ON-CHAIN + CROSS BIRTHS (p16 web3) ===
function mintNFTSlot(type='banner', minPrice=80) {
  if (!wallet) { alert('Connect wallet'); return; }
  const dep = Math.floor(minPrice*0.6);
  if (credits < dep) { alert('Credits deposit needed'); return; }
  credits -= dep;
  const slot = {id:Date.now(), owner:wallet, type, minPrice, deposit:dep, performance:0.5+Math.random()*0.4, ts:Date.now()};
  nftSlots.unshift(slot);
  localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  addToCodex(`NFT Slot minted #${slot.id} (${type})`);
  updateWallet(); showNFTSlots();
}
function startDutchAuction(slotId) {
  const s = nftSlots.find(x=>x.id==slotId); if(!s) return;
  const a = {id:Date.now(), slotId, startPrice:Math.floor(s.minPrice*1.7), currentPrice:Math.floor(s.minPrice*1.7), bids:[], settled:false};
  auctions.unshift(a);
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  showAuctions();
}
function placeBid(aucId) {
  const a = auctions.find(x=>x.id==aucId); if(!a||a.settled) return;
  const v = window._p16Voice ? (window._p16Voice.surprise||0.5) : 0.5;
  const b = Math.floor(a.currentPrice*0.87);
  if (credits < b) return alert('Not enough Credits');
  credits -= b;
  const eff = Math.floor(b * (1+(v-0.5)*0.32));
  a.bids.push({bidder:wallet, amount:b, effective:eff, voice:v});
  a.currentPrice = Math.max(Math.floor(a.currentPrice*0.93), b);
  localStorage.setItem('p16_auctions', JSON.stringify(auctions)); updateWallet();
  if (a.bids.length>1) settleAuction(aucId); else showAuctions();
}
function settleAuction(aucId) {
  const a = auctions.find(x=>x.id==aucId); if(!a||a.settled) return;
  const w = [...a.bids].sort((x,y)=>y.effective-x.effective)[0]; if(!w) return;
  const s = nftSlots.find(x=>x.id==a.slotId); if(!s) return;
  const fee = Math.floor(w.amount * 0.01);
  s.owner = w.bidder; a.settled=true; a.winner=w.bidder; a.final=w.amount; a.fee=fee;
  if (s.type.includes('metaverse')) { metaverseAura['meta']= (metaverseAura['meta']||1) + w.voice*0.65; localStorage.setItem('p16_meta_aura',JSON.stringify(metaverseAura)); }
  localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  addToCodex(`Settled. Fee ${fee} (1%).`); showAuctions();
}
function crossP9LiveAuction() { crossP11Metaverse(); alert('live ad overlay auction synced.'); }
function crossP11Metaverse() {
  const slot = {id:Date.now(), owner:wallet||'0xDemo', type:'metaverse-billboard', minPrice:150, performance:0.75+(metaverseAura['meta']||0)*0.1};
  nftSlots.unshift(slot); localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  addToCodex('Metaverse billboard NFT attached + value carry');
  showNFTSlots();
}

function initP16() {
  updateWallet();
  
  // Seed demo ads
  if (ads.length === 0) {
    ads = [
      { id: 1, title: "Beauty Launch", desc: "Voice-optimized beauty ads.", budget: 800, spent: 320, impressions: 4500, surprise: 0.72, voiceUrl: null, timestamp: new Date().toISOString(), target: "Beauty, Women", owner: "demo" },
      { id: 2, title: "Metaverse Land", desc: "Web3 metaverse promo.", budget: 1200, spent: 550, impressions: 12000, surprise: 0.65, voiceUrl: null, timestamp: new Date().toISOString(), target: "Web3, Crypto", owner: "demo" }
    ];
    localStorage.setItem('p16_ads', JSON.stringify(ads));
  }
  // Adult demo seed (gated)
  if (!ads.find(a => a.adult)) {
    ads.push({ id: 77, title: "Adult Creative Drop", desc: "Adult creative voice ad.", budget: 650, spent: 90, impressions: 2100, surprise: 0.81, voiceUrl: null, timestamp: new Date().toISOString(), target: "Adult 18+", owner: "demo", adult: true });
    localStorage.setItem('p16_ads', JSON.stringify(ads));
  }
  
  // voice integration
  if (window.getP6LungSurprise) {
    console.log('[AdForge] voice resonance ready for ad creatives.');
  }
  
  // demo seeds
  simulateIdleEarnings();
  updateFomoDisplays();
  
  // Seed demo metaverse/idea cross for prototype
  if (!localStorage.getItem('p16_birth_demo')) {
    ads.push({ id: 9991, title: "Metaverse Billboard", desc: "Metaverse live ad.", budget: 1100, spent: 410, impressions: 13400, surprise: 0.69, timestamp: new Date().toISOString(), target: "Metaverse" });
    localStorage.setItem('p16_ads', JSON.stringify(ads));
    localStorage.setItem('p16_birth_demo', '1');
  }
  
  // Campaign Manager is the primary surface (best-in-class ad-platform core).
  if (window.AdManager && typeof window.AdManager.init === 'function') {
    try { window.AdManager.init(); } catch (e) { console.warn('[AdForge] AdManager init', e); }
  }
  setTimeout(() => {
    if (typeof window.showCampaigns === 'function') { try { window.showCampaigns(); return; } catch (e) {} }
    const inv = document.getElementById('inventory'); if (inv) inv.classList.remove('hidden');
  }, 200);

  // === ON-CHAIN SEED (NFT + Dutch auction demo) ===
  if (nftSlots.length === 0) {
    nftSlots = [
      {id: 8801, owner:'0xDemo', type:'banner', minPrice:90, performance:0.71},
      {id: 8802, owner:'0xDemo', type:'live-overlay', minPrice:140, performance:0.82},
      {id: 8803, owner:'0xDemo', type:'metaverse-billboard', minPrice:155, performance:0.68}
    ];
    localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  }
  if (auctions.length === 0) {
    auctions = [{id: 99001, slotId:8802, startPrice:210, currentPrice:178, bids:[{bidder:'0xB1', amount:155, effective:172, voice:0.68}], settled:false}];
    localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  }

  // Voice seed: ensure a live voice ad exists
  if (!ads.some(a => a.p9Cross || a.live)) {
    ads.unshift({id: 20260713, title:'Live Voice Ad', desc:'Your voice powers a live ad.', budget:380, spent:90, impressions:5100, surprise:0.71, live:true, p9Cross:true, viewers:51, seatsLeft:6, timestamp:new Date().toISOString()});
    localStorage.setItem('p16_ads', JSON.stringify(ads));
  }
  console.log('%c[AdForge] Voice Studio + Analyst + Live Cross + Meter + Seeds ready.', 'color:#c5a46e');
}

function updateFomoDisplays() {
  // Dynamic FOMO everywhere
  const fomoEls = document.querySelectorAll('.fomo');
  fomoEls.forEach(el => {
    if (el.textContent.includes('slots')) el.innerHTML = `🔥 ${slotsLeft} premium slots left • Cycle closing`;
  });
  const live = document.querySelector('#live .live-item');
  if (live) live.textContent = `Live product demo ad • ${Math.floor(Math.random()*80)+120} watching • ${slotsLeft-12} slots left`;
}
function joinLiveAuction() { igniteRitual(); } // alias for existing button


function simulateIdleEarnings() {
  // Psych retention: loss aversion + endowment for publishers/advertisers
  const hoursAway = Math.max(1, Math.floor((Date.now() - lastVisit) / (1000*60*60)));
  if (publisherSlots.length > 0 && hoursAway > 0) {
    let earned = 0;
    publisherSlots.forEach(s => {
      const idle = Math.floor((s.rate || 18) * hoursAway * 0.6);
      s.earned = (s.earned || 0) + idle;
      earned += idle;
    });
    credits += earned;
    localStorage.setItem('p16_publisher_slots', JSON.stringify(publisherSlots));
    if (earned > 0) {
      addToCodex(`While away (${hoursAway}h): earned ${earned} Credits from publisher slots. Come back for more.`);
    }
  }
  localStorage.setItem('p16_last_visit', Date.now());
  updateWallet();
}

// === Voice Studio Births (integrated) ===
// Voice Studio artistic voice-over
function recordVoiceOver() {
  const el = document.getElementById('voiceforge-preview') || document.getElementById('voice-preview');
  if (!el) return alert('Open Voice Studio section');
  el.innerHTML = 'voice Studio: Capturing your voice-over...';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream); let chunks=[];
    VoiceAnalyser.start(stream); // measure the real voice-over
    rec.ondataavailable = e=>chunks.push(e.data);
    rec.onstop = () => {
      const url=URL.createObjectURL(new Blob(chunks,{type:'audio/webm'}));
      const surprise = VoiceAnalyser.stop();
      const insight = p6VoiceExpertInsight(surprise);
      el.innerHTML = `<audio controls src="${url}"></audio><br>🎙️ VoiceOver • ${surprise.toFixed(2)}<br>${insight}`;
      window._p16VoiceOver = {url, surprise, insight, ts:Date.now()};
      birthVoiceSeed('voiceover', surprise);
      stream.getTracks().forEach(t=>t.stop());
    };
    rec.start(); setTimeout(()=>rec.stop(), 4800);
  }).catch(()=>{ window._p16VoiceOver={surprise:0.71,insight:"voice tone"}; birthVoiceSeed('voiceover',0.71); el.innerHTML='Voice-over ready.'; });
}

// Voice Analyst — performance analysis via voice
function analyzeAdPerformanceWithVoice(adId) {
  const ad = ads.find(a=>a.id===adId); if(!ad) return;
  const el = document.getElementById('analyst-preview') || document.getElementById('voice-preview');
  if (el) el.innerHTML = 'Voice Analyst: Speak performance observation...';
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    const rec=new MediaRecorder(stream); let chunks=[];
    VoiceAnalyser.start(stream);
    rec.ondataavailable=e=>chunks.push(e.data);
    rec.onstop=()=>{
      const s=VoiceAnalyser.stop();
      const rep = buildPerformanceReport(ad); // REAL data-driven report
      if(el) el.innerHTML = `<div style="font-size:11px">${rep.html}<br><span style="color:#c5a46e">👁 voice resonance ${s.toFixed(2)} layered on the data above.</span></div>`;
      addToCodex(`Perf report • ${ad.title}: ${rep.verdict} — CTR ${(rep.ctr*100).toFixed(2)}% vs bench ${(rep.benchmark*100).toFixed(2)}%, CPC ${rep.cpc}, ${rep.reachPct}% reach used.`);
      ad.voiceAnalysis={surprise:s, verdict:rep.verdict, ctr:rep.ctr, cpc:rep.cpc, ts:Date.now()};
      localStorage.setItem('p16_ads',JSON.stringify(ads));
      birthVoiceSeed('analysis',s,ad.id);
      stream.getTracks().forEach(t=>t.stop());
    };
    rec.start(); setTimeout(()=>rec.stop(),3600);
  }).catch(()=>{
    const rep = buildPerformanceReport(ad); // real report works without mic
    if(el) el.innerHTML = `<div style="font-size:11px">${rep.html}</div>`;
    addToCodex(`Perf report • ${ad.title}: ${rep.verdict} (CTR ${(rep.ctr*100).toFixed(2)}%).`);
    ad.voiceAnalysis={verdict:rep.verdict, ctr:rep.ctr, cpc:rep.cpc, ts:Date.now()};
    localStorage.setItem('p16_ads',JSON.stringify(ads));
    birthVoiceSeed('analysis',0.54,adId);
  });
}

// REAL performance analysis grounded in delivered numbers vs segment benchmark.
// CTR vs benchmark, CPC, reach saturation, and an actionable recommendation.
function buildPerformanceReport(ad) {
  const est = ad.audience || estimateAudience(ad.target, ad.surprise || 0.4);
  const imps = ad.impressions || 0;
  const clicks = ad.clicks || 0;
  const spent = ad.spent || 0;
  const ctr = imps > 0 ? clicks / imps : 0;
  const benchmark = est.ctr; // the segment's expected CTR = fair benchmark
  const cpc = clicks > 0 ? +(spent / clicks).toFixed(2) : null;
  const cpm = imps > 0 ? +((spent / imps) * 1000).toFixed(2) : est.cpm;
  const reachPct = est.reach > 0 ? Math.min(100, Math.round((imps / (est.reach * 3)) * 100)) : 0;
  const budgetLeft = Math.max(0, (ad.budget || 0) - spent);

  // Actionable verdict from the real ratio of realized CTR to benchmark.
  let verdict, rec;
  if (imps === 0) {
    verdict = 'Not delivered yet';
    rec = 'Hit "Deliver" to spend budget and generate real performance data.';
  } else {
    const ratio = benchmark > 0 ? ctr / benchmark : 1;
    if (ratio >= 1.15) { verdict = 'Over-performing'; rec = 'CTR beats the segment benchmark — scale budget on this exact targeting.'; }
    else if (ratio >= 0.85) { verdict = 'On benchmark'; rec = 'Performing as expected. Test a tighter segment or stronger voice creative to lift CTR.'; }
    else { verdict = 'Under-performing'; rec = 'CTR below benchmark — narrow targeting or refresh the creative before spending more.'; }
    if (reachPct >= 90) rec = 'Audience saturated (frequency cap) — widen targeting to reach new users instead of repeating.';
    else if (budgetLeft < 0.5) rec = verdict === 'Over-performing' ? 'Budget spent and it beat benchmark — clone this ad with a bigger budget.' : rec;
  }

  const html =
    `<b>${verdict}</b> · ${imps.toLocaleString()} imps · ${clicks.toLocaleString()} clicks<br>` +
    `CTR <b>${(ctr*100).toFixed(2)}%</b> vs benchmark ${(benchmark*100).toFixed(2)}%` +
    (cpc != null ? ` · CPC ${cpc}` : '') + ` · CPM ${cpm}<br>` +
    `Reach used: ${reachPct}% of ${est.reach.toLocaleString()} (${est.segments.join(', ')})<br>` +
    `<span style="color:#8fbf7f">→ ${rec}</span>`;

  return { verdict, ctr, benchmark, cpc, cpm, reachPct, rec, html };
}

function p6VoiceExpertInsight(surprise){
  if(surprise>0.78) return 'Strong, expressive voice — great for scaling this campaign.';
  if(surprise>0.55) return 'Warm tone with good resonance — solid creative.';
  return 'Flat delivery — try re-recording with more energy.';
}

function birthVoiceSeed(type,surprise,ref=null){
  const seed={id:Date.now(),type,surprise:parseFloat(surprise.toFixed(3)),ref,ts:Date.now(),source:'adforge-voice'};
  voiceSeeds.unshift(seed); if(voiceSeeds.length>18)voiceSeeds.length=18;
  localStorage.setItem('p16_voiceSeeds',JSON.stringify(voiceSeeds));
  try{localStorage.setItem('p16_voiceSeedExport',JSON.stringify(seed));}catch(e){}
  if(window.p6DistributedVitruvianLung) window.p6DistributedVitruvianLung({surprise});
}

// Live Voice Ad
function launchLiveVoiceAdCross(){
  if(!wallet){alert('Connect wallet');return;}
  const s=(window.getP6LungSurprise&&window.getP6LungSurprise())||0.61;
  const ad={id:Date.now(),title:'Live Voice • '+(document.getElementById('ad-title')?.value||'Voice Drop'),desc:'Live voice ad with real-time viewer ratings.',budget:parseInt(document.getElementById('budget')?.value)||380,surprise:s,live:true,p9Cross:true,viewers:Math.floor(40+s*60),seatsLeft:9,voiceUrl:window._p16VoiceOver?.url||null,timestamp:new Date().toISOString()};
  ads.unshift(ad); localStorage.setItem('p16_ads',JSON.stringify(ads));
  addToCodex(`Live Voice Ad created • resonance ${s.toFixed(2)}`);
  try{ const sp=JSON.parse(localStorage.getItem('p6_smileSpores')||'[]'); sp.unshift({planted:Date.now(),wound:0.48+(1-s)*0.4,seed:Math.random()*6.28,from:'p16-p9live',changbal:s>0.68}); localStorage.setItem('p6_smileSpores',JSON.stringify(sp.slice(0,7))); }catch(e){}
  alert('Live Voice Ad launched. Cross active.');
  showLive();
}

// Voice Performance Meter (voice meter for campaigns)
function startVoicePerformanceMeter(adId){
  const ad=ads.find(a=>a.id===adId); if(!ad)return;
  const m=document.createElement('div'); m.className='voice-meter';
  m.innerHTML=`<div style="font-size:11px">👁 Voice Meter • ${ad.title}</div><div class="bar" style="height:6px;background:#3a3124;margin:4px 0"><div id="vmf" style="height:100%;width:0%;background:#c5a46e"></div></div><span id="vmv" style="font-size:10px">0.00</span>`;
  (document.getElementById('inventory-list')||document.body).appendChild(m);
  const f=document.getElementById('vmf'),v=document.getElementById('vmv');
  const iv=setInterval(()=>{
    const ns = (window.getP6LungSurprise&&window.getP6LungSurprise()) || Math.min(1,Math.max(0.1,ad.surprise+(Math.random()-0.5)*0.07));
    ad.surprise=ns; if(f)f.style.width=Math.floor(ns*100)+'%'; if(v)v.textContent=ns.toFixed(2);
    if(ns>0.73) addToCodex(`Voice meter spike ${ad.title}`);
  },820);
  setTimeout(()=>{clearInterval(iv); m.parentNode&&m.parentNode.removeChild(m);},13000);
}

function showVoiceForge(){
  hideAll();
  const sec = document.getElementById('voiceforge') || createVoiceSection('voiceforge','Voice Studio • Artistic Voice-Overs');
  sec.innerHTML = `<h2>Voice Studio (Voice Studio)</h2>
  <button onclick="recordVoiceOver()">🎙️ Record Voice Over</button>
  <div id="voiceforge-preview" style="margin:8px 0;font-size:12px"></div>
  <button onclick="applyVoiceOverToLatest()">Apply VoiceOver to Latest Ad</button>
  <small>Record a voice-over to power your ad creative.</small>`;
  sec.classList.remove('hidden');
}

function showVoiceAnalyst(){
  hideAll();
  const sec = document.getElementById('voiceanalyst') || createVoiceSection('voiceanalyst','Voice Analyst • Performance via Voice');
  let html = `<h2>Voice Analyst</h2><div id="analyst-preview"></div>`;
  const recent = ads.slice(0,4);
  recent.forEach(a=>{ html += `<div class="ad-card"><strong>${a.title}</strong> <button onclick="analyzeAdPerformanceWithVoice(${a.id});startVoicePerformanceMeter(${a.id})">Speak Analysis + Meter</button></div>`; });
  html += `<small>Record voice → resonance rates performance. ALWAYS LEARNING mutates ad.</small>`;
  sec.innerHTML=html; sec.classList.remove('hidden');
}

function createVoiceSection(id,title){
  const s=document.createElement('div'); s.id=id; s.className='section'; 
  document.querySelector('.container').appendChild(s); return s;
}

function applyVoiceOverToLatest(){
  if(!window._p16VoiceOver || ads.length===0){alert('Record voiceover first');return;}
  const ad=ads[0]; ad.voiceOver = window._p16VoiceOver; ad.surprise = Math.max(ad.surprise||0.3, window._p16VoiceOver.surprise);
  localStorage.setItem('p16_ads',JSON.stringify(ads));
  addToCodex(`VoiceOver grafted to ${ad.title}`);
  alert('Voice-over applied. voice creative now in ad.');
  showInventory();
}

// === LILITH PSYCH UI BIRTHS ===

function showPsych() {
  hideAll();
  document.getElementById('psych').classList.remove('hidden');
  Engagement.updateResonance();
  // Live update psych stats
  const f = document.getElementById('fomo-val');
  const v = document.getElementById('var-val');
  if (f) f.textContent = Math.floor(74 + Engagement.resonance * 24);
  if (v) v.textContent = (1.9 + Engagement.resonance * 1.4).toFixed(1) + 'x';
}

function showVault() {
  hideAll();
  document.getElementById('vault').classList.remove('hidden');
  const list = document.getElementById('vault-list');
  list.innerHTML = '';
  if (Engagement.ownedSlots.length === 0) {
    list.innerHTML = '<p>No owned slots yet. Bid & win to claim endowment.</p>';
    return;
  }
  Engagement.ownedSlots.forEach(slot => {
    const el = document.createElement('div');
    el.className = 'ad-card vault-card';
    el.innerHTML = `
      <strong>🔒 ${slot.title}</strong><br>
      <small>Owned • Imps: ${slot.impressions || 0} • Protection ${slot.protection ? slot.protection.toFixed(1) : '1.0'}x</small><br>
      <div class="fomo">Your slot — saved to Vault.</div>
      <button onclick="claimDailySurprise(${slot.id})">Claim Bonus</button>
    `;
    list.appendChild(el);
  });
}

function protectSlot() {
  if (Engagement.ownedSlots.length === 0) return alert('Claim slots first.');
  const cost = 35;
  if (credits < cost) return alert('Need Credits to protect.');
  credits -= cost;
  Engagement.ownedSlots.forEach(s => s.protection = (s.protection || 1) + 0.4);
  localStorage.setItem('p16_owned_slots', JSON.stringify(Engagement.ownedSlots));
  updateWallet();
  addToCodex('Slot protection purchased.');
  showVault();
}

function claimDailySurprise(id) {
  const slot = Engagement.ownedSlots.find(s => s.id === id);
  if (!slot) return;
  Engagement.updateResonance();
  const yieldAmt = Engagement.variableRatio(60 + Math.floor((slot.impressions || 800) * 0.03), true);
  credits += yieldAmt;
  Engagement.saveStreak();
  updateWallet();
  addToCodex(`Bonus ${yieldAmt} from ${slot.title}. Streak ${Engagement.streak}. `);
  alert(`Bonus payout: +${yieldAmt} Credits.`);
  showVault();
}

function shareVictory() {
  if (!ads.length && !Engagement.ownedSlots.length) return alert('Create or own a campaign first.');
  Engagement.updateResonance();
  const winAd = Engagement.ownedSlots[0] || ads[0];
  const echo = `AdForge campaign result (fictional):
${winAd.title} — ${winAd.impressions} impressions • voice resonance ${Engagement.resonance.toFixed(2)}

Voice-driven creatives, live auctions, and idea + metaverse inventory.

Fictional simulation. 18+ only. No real value. Rates shown in-app.`;

  navigator.clipboard.writeText(echo).then(() => {
    const bonus = Math.floor(120 * Engagement.getResonanceMult());
    credits += bonus;
    updateWallet();
    addToCodex(`Campaign result shared. +${bonus} Credits.`);
    alert('Campaign result copied. +Network bonus.');
  }).catch(() => prompt('Copy result:', echo));
}

function triggerPsychSurge() {
  Engagement.updateResonance();
  Engagement.lastSurge = Date.now();
  const surge = 1.4 + Engagement.resonance;
  ads.forEach(ad => {
    ad.impressions = Math.floor((ad.impressions || 300) * surge);
    Engagement.applyFomo(ad);
  });
  if (Engagement.ownedSlots.length) {
    Engagement.ownedSlots.forEach(s => s.impressions = Math.floor((s.impressions||400)*surge));
  }
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  localStorage.setItem('p16_owned_slots', JSON.stringify(Engagement.ownedSlots));
  addToCodex(`Engagement refreshed. Resonance ${Engagement.resonance.toFixed(2)}. Performance x${surge.toFixed(1)}.`);
  alert(`Engagement refreshed. All campaign performance x${surge.toFixed(1)} (simulated).`);
  showInventory();
}

// Creator side: list inventory to the Vault
function listCreatorInventory() {
  if (!wallet) return;
  const slot = { id: Date.now(), title: 'My Creator Premium Slot #' + (Math.floor(Math.random()*99)), impressions: 2100, surprise: Engagement.resonance || 0.6, owned: true };
  Engagement.claimEndowment(slot);
  addToCodex(`Creator slot listed. Variable earnings active.`);
  alert('Creator slot listed and saved to your Vault.');
  showVault();
}

function showP11() { hideAll(); document.getElementById('metaverse').classList.remove('hidden'); }
function showP12() { hideAll(); document.getElementById('ideas').classList.remove('hidden'); }

function renderLiveVoiceAds() {
  const live = document.getElementById('live');
  if (!live) return;
  live.innerHTML = `<h2>Live Ad Auction</h2>
    <div class="live-item">🔥 ${Math.floor(140 + Engagement.resonance*60)} watching • Auction window open</div>
    <button onclick="joinLiveAuctionLilith()">Join Auction</button>
    <button onclick="listCreatorInventory()">List My Creator Slot</button>`;
}

function joinLiveAuctionLilith() {
  if (!wallet) { alert('Connect wallet.'); return; }
  Engagement.updateResonance();
  const base = 95 + Math.floor(Math.random()*55);
  const bid = Engagement.variableRatio(base);
  if (credits < bid) { alert('Need Credits.'); return; }
  credits -= bid;
  const miss = Engagement.simulateNearMiss(bid, true);
  slotsLeft = Math.max(2, slotsLeft-1);
  updateWallet();
  updateFomoDisplays();
  addToCodex(`Live auction: ${bid} spent. Res ${Engagement.resonance.toFixed(2)}.`);
  alert(`Live auction won for ${bid} Credits.`);
}

// Patch existing joinLiveAuction if called
const _oldJoin = window.joinLiveAuction;
window.joinLiveAuction = joinLiveAuctionLilith;

// on-chain stubs (web3 simulation)
if (typeof showNFTSlots !== 'function') { window.showNFTSlots = () => { hideAll(); document.getElementById('inventory').classList.remove('hidden'); const l = document.getElementById('inventory-list'); l.innerHTML = '<h3>AdSlot NFTs</h3>'; const slots = nftSlots||[]; if (!slots.length) { l.innerHTML += '<p>No AdSlot NFTs yet. Mint one to auction it.</p>'; return; } slots.forEach(s => { const label = String(s.type||'slot').replace(/-/g,' '); const d = document.createElement('div'); d.className='ad-card'; d.innerHTML = `<strong>#${s.id} · ${label}</strong><br><span class="muted">Min price ${s.minPrice} Credits</span><button onclick="startDutchAuction(${s.id})" class="primary">Start Auction</button>`; l.appendChild(d); }); }; }
if (typeof showAuctions !== 'function') { window.showAuctions = () => { hideAll(); document.getElementById('inventory').classList.remove('hidden'); const l = document.getElementById('inventory-list'); l.innerHTML = '<h3>On-Chain Auctions</h3>'; const aucs = auctions||[]; if (!aucs.length) { l.innerHTML += '<p>No live auctions. Start one from an AdSlot NFT.</p>'; return; } aucs.forEach(a => { const d = document.createElement('div'); d.className='ad-card'; const status = a.settled ? '<span class="muted"> · settled</span>' : ''; d.innerHTML = `<strong>Auction #${a.id}</strong>${status}<br><span class="muted">Current price ${a.currentPrice} Credits</span>` + (a.settled ? '' : `<button onclick="placeBid(${a.id})" class="primary">Place Bid</button>`); l.appendChild(d); }); }; }
if (typeof crossP11Metaverse !== 'function') { window.crossP11Metaverse = () => { const s = {id:Date.now(),owner:wallet||'0xDemo',type:'metaverse-billboard',minPrice:155}; (window.nftSlots = nftSlots||[]).unshift(s); localStorage.setItem('p16_nftSlots',JSON.stringify(nftSlots)); alert('Metaverse NFT slot added.'); showNFTSlots(); }; }

window.onload = function() {
  initP16();
  // seed one owned-slot demo if none
  if (Engagement.ownedSlots.length === 0 && ads.length > 0) {
    Engagement.claimEndowment(ads[0]);
  }
  Engagement.updateResonance();
};

try{ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', renderP16Loop); else setTimeout(renderP16Loop,50); }catch(e){}

/* LEGION_WAVE_53_fomo_chip */
setTimeout(function(){try{if(document.getElementById('lw_fomo_53'))return;var end=new Date(); end.setHours(24,0,0,0);var ms=Math.max(0,end-Date.now());var h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);var d=document.createElement('div'); d.id='lw_fomo_53';d.style.cssText='font-size:11px;opacity:.75;margin:6px 0;color:#e0b552';d.textContent='window '+h+'h '+m+'m · W53';var app=document.getElementById('app')||document.body; app.insertBefore(d, app.firstChild);}catch(e){}},40);
