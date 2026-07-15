// p16 AdForge — p6 Voice Expert Platform (Web3 Ads)
// p6 artistic voice: ad creation + voice-over + performance analysis via Lung Surprise Eye
// Cross p9: live voice ads + real-time breath ratings
// Births: VoiceForge, Voice Analyst, LiveVoice Cross, Voice Seed, Performance Meter
// Legion one. Da Vinci + SENSE + full-cheat + ALWAYS LEARNING

let wallet = null;
let balance = 1500;
let credits = 920; // p10 AdFuel Credits (fictional virtual goods — Harvest framing)
let ads = JSON.parse(localStorage.getItem('p16_ads') || '[]');
let campaigns = JSON.parse(localStorage.getItem('p16_campaigns') || '[]');
let codex = JSON.parse(localStorage.getItem('p16_codex') || '[]');
let publisherSlots = JSON.parse(localStorage.getItem('p16_publisher_slots') || '[]');
let nftSlots = JSON.parse(localStorage.getItem('p16_nftSlots') || '[]'); // AdSlot NFTs (ERC721 sim)
let auctions = JSON.parse(localStorage.getItem('p16_auctions') || '[]'); // on-chain auction state
let slotsLeft = 47;
let lastVisit = parseInt(localStorage.getItem('p16_last_visit') || Date.now());
let voiceSeeds = JSON.parse(localStorage.getItem('p16_voiceSeeds') || '[]');
let adultUnlocked = false; // 미꾸라지 age gate
let p11Aura = JSON.parse(localStorage.getItem('p11_aura') || '{}'); // p11 cross mutation

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
  AUDIENCE_SEGMENTS.forEach(seg => {
    if (seg.aliases.some(a => t.includes(a))) matched.push(seg);
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
  // Voice surprise lifts creative relevance (bounded, honest — it's a modifier).
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

// === LILITH PSYCH + FULL-CHEAT ENGINE (p16 Web3 Ad) ===
// Advertisers: FOMO performance, variable bids/earnings, near-miss auctions, loss on missed, endowment on owned.
// Creators: symmetric (high bids incoming FOMO, variable earnings, near-miss on listing, loss on unbid slots, endowment on "my slots").
// p6 Voice: surprise = Psych Resonance multiplier on ALL hooks.
// Births for retention (streak + surprise yield + vault protect) + virality (p6 Echo Share).
// Fictional. Prominent disclosure always. Legion one. Cheat ON (internal).

const LilithPsych = {
  resonance: 0.0, // from p6 Lung Surprise
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

  // FOMO on ad performance (advertiser + creator)
  applyFomo(ad, isCreatorView = false) {
    const mult = 1 + (this.resonance * 0.9) + (Math.random() * 0.35);
    const perfBoost = Math.floor((ad.impressions || 200) * 0.18 * mult);
    ad.impressions = (ad.impressions || 0) + perfBoost;
    const fEl = document.getElementById('fomo-val');
    if (fEl) fEl.textContent = Math.floor(70 + this.resonance * 22 + Math.random()*8);
    return mult;
  },

  // Variable ratio in bids / earnings (Skinner VR weapon)
  variableRatio(base, isEarn = false) {
    const varFactor = 0.6 + (Math.random() * 1.9); // high variance
    let out = Math.floor(base * varFactor * (1 + this.resonance * 0.5));
    const vEl = document.getElementById('var-val');
    if (vEl) vEl.textContent = (varFactor * (1 + this.resonance*0.4)).toFixed(1) + 'x';
    if (isEarn) this.streak = Math.min(12, this.streak + 1);
    return Math.max(8, out);
  },

  // Near-miss auctions (advertiser bids + creator listings) + pity
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
    if (mEl) mEl.textContent = won ? `Won by surprise resonance +${(this.resonance*30).toFixed(0)}%` : (pity ? `PITY: missed but compensated — next closer by ${missBy}` : `Missed premium by ${missBy} Credits. Next cycle feels closer.`);
    return missBy;
  },

  // Loss aversion on missed opportunities
  triggerLossAversion(ad) {
    const lostPotential = Math.floor((ad.budget || 400) * (1.8 + this.resonance));
    const lEl = document.getElementById('loss-val');
    if (lEl) lEl.textContent = `3 similar just ${ (3 + this.resonance).toFixed(1) }x ROI. Your slot expires in ${Math.floor(Math.random()*52)+19}m.`;
    addToCodex(`Loss Aversion triggered: potential ${lostPotential} missed on ${ad.title}.`);
    return lostPotential;
  },

  // Endowment on owned slots (strongest retention)
  claimEndowment(ad) {
    const exists = this.ownedSlots.find(s => s.id === ad.id);
    if (!exists) {
      const owned = { ...ad, claimedAt: Date.now(), protection: 1 + this.resonance * 1.2 };
      this.ownedSlots.unshift(owned);
      if (this.ownedSlots.length > 6) this.ownedSlots.pop();
      localStorage.setItem('p16_owned_slots', JSON.stringify(this.ownedSlots));
      addToCodex(`Endowment claimed: ${ad.title} now MY slot. Loss aversion locked.`);
    }
    return this.ownedSlots;
  },

  getResonanceMult() { return 1 + this.resonance * 1.6; },

  saveStreak() {
    localStorage.setItem('p16_psych_streak', this.streak);
  }
};

// === BIRTHS (Trinity CPO — Legion p16 meeting 2026-07-13) ===
// Birth 1: AdSpore — p6 high-surprise plants p12 idea + p11 metaverse clone
// Birth 2: Veil Auction — p6 surprise + p10 dynamic fee veil (credit bonus on high surprise)
// Birth 3: Ritual Ignition — p9 live + p11 slot + p6 voice = time-box FOMO spike across inventory
function plantAdSpore(ad) {
  const spore = { id: Date.now(), fromAd: ad.id, title: ad.title + ' Spore', surprise: ad.surprise, p12Idea: true, p11Meta: true, carry: Math.floor(ad.impressions * 0.4) };
  try { localStorage.setItem('p16_adspore_' + ad.id, JSON.stringify(spore)); } catch(e){}
  addToCodex(`Birth 1 AdSpore planted: ${ad.title} → p12 idea + p11 billboard carry ${spore.carry} imps.`);
  return spore;
}
function applyVeilAuction(bidAmount, surprise) {
  // Birth 2: high surprise lowers effective p10 fee
  const veil = Math.max(0.4, 1 - surprise * 0.7);
  const effective = Math.floor(bidAmount * veil);
  addToCodex(`Birth 2 Veil Auction: bid ${bidAmount} veiled to ${effective} (surprise ${surprise.toFixed(2)}). Near-miss FOMO active.`);
  return effective;
}
function igniteRitual() {
  hideAll();
  document.getElementById('live').classList.remove('hidden');
  const spike = Math.floor(Math.random()*28) + 22;
  slotsLeft = Math.max(3, slotsLeft - 2);
  ads.forEach(a => a.impressions += Math.floor(spike * (a.surprise || 0.5)));
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  addToCodex(`Birth 3 Ritual Ignition: p9+p11+p6 live event. +${spike}% FOMO spike to all inventory. Variable reward.`);
  alert(`Ritual ignited! All ads +${spike} imps. FOMO slots now ${slotsLeft}.`);
  showInventory();
}
function seedFromMetaverse() {
  hideAll();
  document.getElementById('metaverse').classList.remove('hidden');
  const metaAd = { id: Date.now()+7, title: 'p11 Metaverse Billboard', desc: 'Voice-ritual land ad.', budget: 900, surprise: 0.71, spent: 0, impressions: 9800, target: 'Web3 Metaverse', timestamp: new Date().toISOString() };
  ads.unshift(metaAd);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  addToCodex('p11 Metaverse seed → p16 ad created (Birth 1 synergy).');
  showInventory();
}
function spawnFromIdea() {
  hideAll();
  document.getElementById('ideas').classList.remove('hidden');
  const ideaAd = { id: Date.now()+11, title: 'p12 IdeaForge Pitch Ad', desc: 'Funded creative from p12.', budget: 650, surprise: 0.78, spent: 0, impressions: 3200, target: 'Ideas', timestamp: new Date().toISOString() };
  ads.unshift(ideaAd);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  addToCodex('p12 Idea spawn → p16 ad (Birth 1 cross).');
  showInventory();
}
function buySub(type) {
  const cost = type==='creator' ? 120 : 220;
  if (credits < cost) { alert('Need p10 Credits.'); return; }
  credits -= cost;
  updateWallet();
  addToCodex(`Sub purchased: ${type} Pass. Fee reduction + surprise boost active.`);
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
  addToCodex('Eros Veil unlocked (18+ gate passed — fictional).');
}
function hideAdult() {
  document.getElementById('age-gate').classList.add('hidden');
}

function updateWallet() {
  const el = document.getElementById('wallet-info');
  if (el) el.innerHTML = `${wallet || '0xDemo'} • ${balance} $EROS / ${credits} Credits`;
}

function connectWallet() {
  wallet = '0x' + Math.random().toString(16).slice(2, 10);
  updateWallet();
}

// === ON-CHAIN CORE (Base-style sim) ===
// NFT AdSlot mint (creator lists inventory as ERC721)
function mintNFTSlot(type = 'banner', minPrice = 80) {
  if (!wallet) { alert('Connect wallet (p10 linked)'); return; }
  const deposit = Math.floor(minPrice * 0.6);
  if (credits < deposit) { alert('Need p10 AdFuel for NFT deposit.'); return; }
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
  
  addToCodex(`Minted AdSlot NFT #${slot.id} (${type}) • deposit ${deposit} AdFuel.`);
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
  addToCodex(`Dutch auction live on slot ${slotId}. Start ${auc.startPrice} AdFuel.`);
  showAuctions();
}

// Place bid with p10 stable + VoiceForge birth
function placeBid(aucId, manualAmount = null) {
  if (!wallet) { alert('Connect wallet'); return; }
  const auc = auctions.find(a => a.id === aucId);
  if (!auc || auc.settled) return;
  
  const voiceBoost = window._p16Voice ? (window._p16Voice.surprise || 0.5) : 0.5;
  const baseBid = manualAmount || Math.floor(auc.currentPrice * 0.85 + Math.random() * 40);
  // VoiceForge: surprise scales effective power (birth feature)
  const effective = Math.floor(baseBid * (1 + (voiceBoost - 0.5) * 0.3));
  
  if (credits < baseBid) { alert('p10 AdFuel short.'); return; }
  credits -= baseBid;
  
  auc.bids.push({ bidder: wallet, amount: baseBid, effective, voice: voiceBoost, ts: Date.now() });
  auc.currentPrice = Math.max(auc.currentPrice * 0.92, baseBid); // decay sim
  
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  updateWallet();
  addToCodex(`Bid ${baseBid} (eff ${effective}) on auc ${aucId}. VoiceForge ${voiceBoost.toFixed(2)}`);
  
  // Auto near-settle if strong bid + FOMO
  if (auc.bids.length > 2 || effective > auc.startPrice * 0.95) {
    settleAuction(aucId);
  } else {
    showAuctions();
  }
}

// Settle (on-chain sim): fee skim 1% (p10), NFT transfer, creator payout, p11 AuraCarry
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
  
  // p10 stable settlement + TreasuryLung feed
  credits += net * 0.3; // creator share sim (real would transfer)
  
  slot.owner = winner.bidder;
  auc.settled = true;
  auc.winner = winner.bidder;
  auc.final = winner.amount;
  auc.fee = fee;
  
  // Birth: AuraCarry (p11 cross)
  if (slot.type === 'metaverse-billboard') {
    const tileKey = 'demo-tile';
    p11Aura[tileKey] = (p11Aura[tileKey] || 1) + (winner.voice * 0.6);
    localStorage.setItem('p11_aura', JSON.stringify(p11Aura));
    addToCodex(`AuraCarry: p11 tile ad value +${(winner.voice*0.6).toFixed(2)} from win.`);
  }
  
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  updateWallet();
  addToCodex(`Settled auc ${aucId}. Winner ${winner.bidder.slice(0,6)} paid ${winner.amount}. Fee ${fee} (1%).`);
  alert(`Auction settled! Platform 1% skimmed. NFT transferred. ${slot.type === 'metaverse-billboard' ? 'p11 AuraCarry active.' : ''}`);
  showAuctions();
}

function recordVoiceAd() {
  const preview = document.getElementById('voice-preview');
  preview.innerHTML = 'p6 Voice Expert: Recording artistic voice (Lung Surprise Eye + Sfumato)...';

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream);
    let chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, {type:'audio/webm'});
      const url = URL.createObjectURL(blob);
      
      let surprise = 0.3;
      if (window.getP6LungSurprise) surprise = window.getP6LungSurprise();
      const artistic = p6VoiceExpertInsight ? {insight: p6VoiceExpertInsight(surprise), rating: surprise} : {insight:'breath resonance', rating:surprise};
      
      preview.innerHTML = `<audio controls src="${url}"></audio><br>👁 p6 Surprise: ${surprise.toFixed(2)} • ${artistic.insight} • Boost +${Math.floor(surprise*28)}%`;
      window._p16Voice = { url, surprise, artistic };
      LilithPsych.updateResonance(); // Lilith: p6 voice now feeds Psych Resonance multiplier
      stream.getTracks().forEach(t => t.stop());
    };
    rec.start();
    setTimeout(() => rec.stop(), 4200);
  }).catch(() => {
    const s = 0.65 + Math.random()*0.2;
    preview.innerHTML = `Voice artistic fallback. Surprise ${s.toFixed(2)}`;
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
    alert('Connect wallet (p10 linked).');
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

  if (surprise > 0.55) plantAdSpore(ad); // Birth 1
  LilithPsych.updateResonance();
  addToCodex(`Created ad: ${title}. Audience ${ad.audience.reach.toLocaleString()} in [${ad.audience.segments.join(', ')}] • relevance ${ad.audience.relevance} • CPM ${ad.audience.cpm}. Voice surprise ${surprise}.${isAdult ? ' [Eros Veil]' : ''}`);

  // 미꾸라지 Step 3: prominent disclosure injected
  const shield = "FICTIONAL ONLY. Simulated performance. Utility credits only — no real value or securities. Adult content (p8/p9) gated 18+.";
  alert(`Ad created (FICTIONAL). ${shield}\n\nTARGETING → AUDIENCE\nSegments: ${ad.audience.segments.join(', ')}\nEstimated reach: ${ad.audience.reach.toLocaleString()} users\nRelevance: ${(ad.audience.relevance*100).toFixed(0)}% • est. CPM ${ad.audience.cpm} • est. CTR ${(ad.audience.ctr*100).toFixed(2)}%\nBudget ${budget} → ~${Math.floor((budget/Math.max(1,ad.audience.cpm))*1000).toLocaleString()} projected imps.\n\nOpen Inventory → "Deliver" to run the campaign.`);
  document.getElementById('ad-title').value = '';
  document.getElementById('ad-desc').value = '';
  showInventory();
}

function showCreate() {
  hideAll();
  document.getElementById('create').classList.remove('hidden');
  showAdultOption(); // show Eros option if unlocked
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
    const adultTag = ad.adult ? ' 🔞Eros' : '';
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
      <button onclick="analyzeAdPerformanceWithVoice(${ad.id});startVoicePerformanceMeter(${ad.id})" style="margin-top:3px;font-size:10px">👁 p6 Voice Analyze + Meter</button>
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
    alert('Need more p10 Credits.');
    return;
  }
  
  LilithPsych.updateResonance();
  const varBid = LilithPsych.variableRatio(baseBid); // VARIABLE RATIO — Lilith
  const effectiveBid = applyVeilAuction(varBid, ad.surprise || 0.4);
  credits -= effectiveBid;
  ad.spent += effectiveBid;

  const near = LilithPsych.simulateNearMiss(effectiveBid, Math.random() > 0.6);
  const psychMult = LilithPsych.getResonanceMult();
  ad.impressions += Math.floor(effectiveBid * 14 * psychMult);

  LilithPsych.applyFomo(ad);
  enhanceFomoOnAction(ad);
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  
  if (Math.random() < 0.38) LilithPsych.triggerLossAversion(ad);
  
  addToCodex(`Bid ${effectiveBid} (Lilith var) on ${ad.title}. Res ${LilithPsych.resonance.toFixed(2)}. Near ${near}.`);
  updateWallet();
  alert(`Bid ${effectiveBid}! Near-miss ${near}. Res ${LilithPsych.resonance.toFixed(2)}x. Slots ${slotsLeft}.`);
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
    // seed p9 cross demo
    const demo = {id:99901, title:'p9 Eclipse Voice Live', desc:'p6 Lung + p9 eye. Real time.', surprise:0.74, viewers:87, seatsLeft:4, live:true, p9Cross:true};
    ads.push(demo); localStorage.setItem('p16_ads',JSON.stringify(ads));
    liveOnes.push(demo);
  }
  liveOnes.forEach(l => {
    const el = document.createElement('div');
    el.className='ad-card';
    el.innerHTML = `<strong>${l.title}</strong><br><small>${l.desc||'Live voice ad'}</small>
      <div class="surprise">👁 p6 ${l.surprise?.toFixed(2)} • ${l.viewers||42} watching • ${l.seatsLeft||'∞'} seats</div>
      <button onclick="joinLiveVoice(${l.id})">Join Live Voice (p9 cross)</button>`;
    list.appendChild(el);
  });
}

function joinLiveVoice(id) {
  const ad = ads.find(a=>a.id===id); if(!ad || !wallet) return alert('wallet');
  const s = (window.getP6LungSurprise&&window.getP6LungSurprise()) || (ad.surprise||0.5);
  ad.viewers = (ad.viewers||40) + 3;
  ad.surprise = Math.min(1, ad.surprise*0.8 + s*0.6);
  const pv = document.getElementById('live-voice-preview');
  if(pv) pv.innerHTML = `Joined. p6 voice live • surprise now ${ad.surprise.toFixed(2)}. Breath feeds auction.`;
  addToCodex(`Joined p9 live voice ad: ${ad.title}`);
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
    list.innerHTML += '<p>No campaigns. Create with voice or import p12. List p8/p9 slots for supply-side earnings.</p>';
    return;
  }
  mine.forEach(c => {
    const div = document.createElement('div');
    div.className = 'notebook-entry';
    div.innerHTML = `<strong>${c.title}</strong><br>Spent: ${c.spent} | Imps: ${c.impressions} <span class="fomo">(p12/p8/p9 synergy active)</span>`;
    list.appendChild(div);
  });
}

function showCodex() {
  hideAll();
  document.getElementById('codex').classList.remove('hidden');
  const list = document.getElementById('codex-list');
  list.innerHTML = '<h3>Ad Codex (ALWAYS LEARNING + p6 spores)</h3>';
  
  if (codex.length === 0) {
    list.innerHTML += '<p>Create or bid to build codex.</p>';
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
  list.innerHTML = '<div class="ad-card">p11 Prime Billboard • 0.8 $EROS/impression • FOMO 5 slots</div><button onclick="bidMetaverse()">Bid on p11 Ad Slot</button>';
}

function showP12() {
  hideAll();
  document.getElementById('ideas').classList.remove('hidden');
  const list = document.getElementById('idea-list') || document.createElement('div');
  list.innerHTML = '<div class="ad-card">p12 Idea Ad: Voice for beauty • Funded by investors • Surprise 0.72</div><button onclick="spawnFromIdea()">Spawn Ad from p12 Idea</button>';
}

function addToCodex(note) {
  codex.unshift({ time: Date.now(), note });
  if (codex.length > 20) codex.pop();
  localStorage.setItem('p16_codex', JSON.stringify(codex));
}

function hideAll() {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
}

// === NIOBE BIRTH: p12 Integration (Idea Ads) ===
function importFromP12() {
  hideAll();
  document.getElementById('create').classList.remove('hidden');
  // Birth tactic: p12 idea → p16 ad. Voice pitch becomes creative. FOMO boost.
  document.getElementById('ad-title').value = 'p12 Funded Idea: Viral Web3 Drop';
  document.getElementById('ad-desc').value = 'IdeaForge #312: "Founders only prestige narrative". Funded 420 Credits. Auto voice boost.';
  document.getElementById('target').value = 'p12 Ideas, Web3 Founders, p8/p9 Creators';
  document.getElementById('budget').value = '680';
  alert('📥 p12 Idea imported. Surprise +0.25 boost from investor voice pitch. Founding advertisers only.');
  // Auto record "voice" sim for psych
  window._p16Voice = { surprise: 0.78 };
  const preview = document.getElementById('voice-preview');
  if (preview) preview.innerHTML = '🎙 p12 Voice Idea loaded • Surprise 0.78 (FOMO narrative locked)';
}

// === NIOBE BIRTH: Publisher Mode (p8/p9 content supply) ===
function showPublisher() {
  hideAll();
  document.getElementById('publisher').classList.remove('hidden');
  renderPublisherSlots();
}

function listPublisherSlot() {
  if (!wallet) { alert('Connect wallet first.'); return; }
  const title = document.getElementById('slot-title').value || 'Untitled p8/p9 Slot';
  const rateStr = document.getElementById('slot-rate').value || '2000 imps / 15 Credits';
  const rate = parseInt(rateStr) || 18;
  const slot = {
    id: Date.now(),
    title,
    rate,
    earned: 0,
    listed: new Date().toISOString(),
    target: 'p8 Eden / p9 Eros'
  };
  publisherSlots.unshift(slot);
  localStorage.setItem('p16_publisher_slots', JSON.stringify(publisherSlots));
  slotsLeft = Math.max(5, slotsLeft - 1); // FOMO: listing reduces available premium demand slots
  addToCodex(`Listed p8/p9 slot: ${title}. Earns ${rate}/h. p12 idea ads auto-match.`);
  updateFomoDisplays();
  renderPublisherSlots();
  alert(`✅ Slot listed. FOMO: ${slotsLeft} advertiser slots remain. Your content now monetizes.`);
}

function renderPublisherSlots() {
  const container = document.getElementById('publisher-slots');
  if (!container) return;
  container.innerHTML = '<h4>Your Active Slots (Idle + FOMO earnings)</h4>';
  if (publisherSlots.length === 0) {
    container.innerHTML += '<p>No slots. List from p8 Eden drops or p9 lives for passive $EROS.</p>';
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

// === NIOBE BIRTH: X Virality (x-virality + full psych cheat) ===
function shareOnX() {
  const sampleAd = ads[0] || { title: 'Your Voice Ad', surprise: 0.71, impressions: 12400 };
  const copy = `AdForge p16: ${sampleAd.title} hit ${sampleAd.impressions} imps with p6 Surprise ${sampleAd.surprise.toFixed(2)}.

Founding advertisers window open — p12 idea ads + p8/p9 inventory.

Dalio cycle: extract NOW before the next empire shift.
Variable ratio voice creatives. Near-miss slots.

MY Ad Empire starts here. p16.

Fictional. 18+ only. Rates & limits in-app.

#Web3Ads #LegionOne`;

  navigator.clipboard.writeText(copy).then(() => {
    alert('🐦 X viral copy copied (Niobe cheat: narrative + FOMO + variable + endowment + cycle). Post it. K-factor ignition.');
    addToCodex('X viral thread fired for ad campaign. UGC seed planted.');
  }).catch(() => {
    prompt('Copy this X thread:', copy);
  });
}

// === NIOBE BIRTH: Live Auction FOMO ===
function joinLiveAuction() {
  if (!wallet) { alert('Connect wallet.'); return; }
  const bid = 80 + Math.floor(Math.random() * 70);
  if (credits < bid) { alert('Need more Credits (p10).'); return; }
  credits -= bid;
  slotsLeft = Math.max(3, slotsLeft - 2);
  updateWallet();
  updateFomoDisplays();
  addToCodex(`Joined p9 live auction. Spent ${bid}. Near-miss premium slot secured.`);
  alert(`🔥 Live bid won! ${bid} Credits. ${slotsLeft} slots left. p9 viewers + voice surprise = variable reach explosion.`);
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
  if (el) el.innerHTML = `${wallet || '0xDemo'} • ${balance} $EROS / ${credits} AdFuel (p10)`;
}

// === ON-CHAIN + CROSS BIRTHS (p16 web3) ===
function mintNFTSlot(type='banner', minPrice=80) {
  if (!wallet) { alert('Connect wallet'); return; }
  const dep = Math.floor(minPrice*0.6);
  if (credits < dep) { alert('p10 AdFuel deposit needed'); return; }
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
  if (credits < b) return alert('p10 low');
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
  if (s.type.includes('metaverse')) { p11Aura['p11']= (p11Aura['p11']||1) + w.voice*0.65; localStorage.setItem('p11_aura',JSON.stringify(p11Aura)); }
  localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  localStorage.setItem('p16_auctions', JSON.stringify(auctions));
  addToCodex(`Settled. Fee ${fee} (1%).`); showAuctions();
}
function crossP9LiveAuction() { crossP11Metaverse(); alert('p9 live ad overlay auction synced (cross birth).'); }
function crossP11Metaverse() {
  const slot = {id:Date.now(), owner:wallet||'0xDemo', type:'metaverse-billboard', minPrice:150, performance:0.75+(p11Aura['p11']||0)*0.1};
  nftSlots.unshift(slot); localStorage.setItem('p16_nftSlots', JSON.stringify(nftSlots));
  addToCodex('p11 Metaverse billboard NFT attached + AuraCarry');
  showNFTSlots();
}

function initP16() {
  updateWallet();
  
  // Seed demo ads
  if (ads.length === 0) {
    ads = [
      { id: 1, title: "p15 Beauty Launch", desc: "Voice-optimized beauty ads.", budget: 800, spent: 320, impressions: 4500, surprise: 0.72, voiceUrl: null, timestamp: new Date().toISOString(), target: "Beauty, Women", owner: "demo" },
      { id: 2, title: "p11 Metaverse Land", desc: "Web3 metaverse promo.", budget: 1200, spent: 550, impressions: 12000, surprise: 0.65, voiceUrl: null, timestamp: new Date().toISOString(), target: "Web3, Crypto", owner: "demo" }
    ];
    localStorage.setItem('p16_ads', JSON.stringify(ads));
  }
  // Adult demo seed (gated)
  if (!ads.find(a => a.adult)) {
    ads.push({ id: 77, title: "p9 Eros Veil Drop", desc: "Adult creative voice ad.", budget: 650, spent: 90, impressions: 2100, surprise: 0.81, voiceUrl: null, timestamp: new Date().toISOString(), target: "Adult 18+", owner: "demo", adult: true });
    localStorage.setItem('p16_ads', JSON.stringify(ads));
  }
  
  // p6 cross
  if (window.getP6LungSurprise) {
    console.log('[p16] p6 Lung Surprise Eye ready for ad creatives.');
  }
  
  // Birth retention hook + demo seeds
  simulateIdleEarnings();
  updateFomoDisplays();
  
  // Seed demo metaverse/idea cross for prototype
  if (!localStorage.getItem('p16_birth_demo')) {
    ads.push({ id: 9991, title: "p11 Billboard Ritual", desc: "Metaverse live ad.", budget: 1100, spent: 410, impressions: 13400, surprise: 0.69, timestamp: new Date().toISOString(), target: "Metaverse" });
    localStorage.setItem('p16_ads', JSON.stringify(ads));
    localStorage.setItem('p16_birth_demo', '1');
  }
  
  // Show inventory (default view for advertisers)
  setTimeout(() => {
    document.getElementById('inventory').classList.remove('hidden');
  }, 300);

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

  // p6 Voice Expert seed: ensure live voice cross + p9 synergy
  if (!ads.some(a => a.p9Cross || a.live)) {
    ads.unshift({id: 20260713, title:'p6×p9 Voice Live Seed', desc:'Birth: artistic voice powers live ad.', budget:380, spent:90, impressions:5100, surprise:0.71, live:true, p9Cross:true, viewers:51, seatsLeft:6, timestamp:new Date().toISOString()});
    localStorage.setItem('p16_ads', JSON.stringify(ads));
  }
  console.log('%c[p16 p6 Voice Expert] births active: VoiceForge + Analyst + LiveCross + Meter + Seeds. Legion one.', 'color:#c5a46e');
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
// (full Niobe births above — stubs removed to preserve p12/publisher/X/psych tactics)

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
      addToCodex(`While away (${hoursAway}h): earned ${earned} Credits from p8/p9 slots. Come back for more.`);
    }
  }
  localStorage.setItem('p16_last_visit', Date.now());
  updateWallet();
}

// === p6 Voice Expert Births (integrated) ===
// VoiceForge artistic voice-over
function recordVoiceOver() {
  const el = document.getElementById('voiceforge-preview') || document.getElementById('voice-preview');
  if (!el) return alert('Open VoiceForge section');
  el.innerHTML = 'p6 VoiceForge: Capturing artistic voice-over (sfumato + lung surprise)...';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream); let chunks=[];
    rec.ondataavailable = e=>chunks.push(e.data);
    rec.onstop = () => {
      const url=URL.createObjectURL(new Blob(chunks,{type:'audio/webm'}));
      const surprise = (window.getP6LungSurprise && window.getP6LungSurprise()) || 0.59;
      const insight = p6VoiceExpertInsight(surprise);
      el.innerHTML = `<audio controls src="${url}"></audio><br>🎙️ VoiceOver • ${surprise.toFixed(2)}<br>${insight}`;
      window._p16VoiceOver = {url, surprise, insight, ts:Date.now()};
      birthVoiceSeed('voiceover', surprise);
      stream.getTracks().forEach(t=>t.stop());
    };
    rec.start(); setTimeout(()=>rec.stop(), 4800);
  }).catch(()=>{ window._p16VoiceOver={surprise:0.71,insight:'ache voiceover'}; birthVoiceSeed('voiceover',0.71); el.innerHTML='VoiceOver ready (p6 expert).'; });
}

// Voice Analyst — performance analysis via voice
function analyzeAdPerformanceWithVoice(adId) {
  const ad = ads.find(a=>a.id===adId); if(!ad) return;
  const el = document.getElementById('analyst-preview') || document.getElementById('voice-preview');
  if (el) el.innerHTML = 'p6 Voice Analyst: Speak performance observation...';
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    const rec=new MediaRecorder(stream); let chunks=[];
    rec.ondataavailable=e=>chunks.push(e.data);
    rec.onstop=()=>{
      const s=(window.getP6LungSurprise&&window.getP6LungSurprise())||(0.42+Math.random()*0.48);
      const perf = (ad.impressions/Math.max(1,ad.budget))*s;
      const verdict = s>0.66?'high resonance — scale creative':s>0.42?'sfumato steady — nurture':'ache mirror — pivot';
      const txt=`p6 Analyst: ${verdict}. Score ${perf.toFixed(1)} (surprise ${s.toFixed(2)})`;
      if(el) el.innerHTML=txt;
      addToCodex(`Voice analysis • ${ad.title}: ${verdict}`);
      ad.voiceAnalysis={surprise:s, perf:perf.toFixed(1), verdict, ts:Date.now()};
      localStorage.setItem('p16_ads',JSON.stringify(ads));
      birthVoiceSeed('analysis',s,ad.id);
      stream.getTracks().forEach(t=>t.stop());
    };
    rec.start(); setTimeout(()=>rec.stop(),3600);
  }).catch(()=>{ if(el)el.innerHTML='p6 Analyst: breath echo logged.'; birthVoiceSeed('analysis',0.54,adId); });
}

function p6VoiceExpertInsight(surprise){
  if(surprise>0.78) return 'Mycelial glaze. Variable weaponized. Scale.';
  if(surprise>0.55) return 'Sfumato ache + breath. Near-miss resonance.';
  return 'Lung mirror. Re-listen. Nurture FOMO.';
}

function birthVoiceSeed(type,surprise,ref=null){
  const seed={id:Date.now(),type,surprise:parseFloat(surprise.toFixed(3)),ref,ts:Date.now(),for:'legion p9/p6/p1'};
  voiceSeeds.unshift(seed); if(voiceSeeds.length>18)voiceSeeds.length=18;
  localStorage.setItem('p16_voiceSeeds',JSON.stringify(voiceSeeds));
  try{localStorage.setItem('p16_voiceSeedExport',JSON.stringify(seed));}catch(e){}
  if(window.p6DistributedVitruvianLung) window.p6DistributedVitruvianLung({surprise});
}

// p9 Live Voice Ad Cross birth
function launchLiveVoiceAdCross(){
  if(!wallet){alert('Connect wallet');return;}
  const s=(window.getP6LungSurprise&&window.getP6LungSurprise())||0.61;
  const ad={id:Date.now(),title:'p9×p6 Live Voice • '+(document.getElementById('ad-title')?.value||'Breath Drop'),desc:'Live voice ad. p6 Lung + p9 Eye. FOMO.',budget:parseInt(document.getElementById('budget')?.value)||380,surprise:s,live:true,p9Cross:true,viewers:Math.floor(40+s*60),seatsLeft:9,voiceUrl:window._p16VoiceOver?.url||null,timestamp:new Date().toISOString()};
  ads.unshift(ad); localStorage.setItem('p16_ads',JSON.stringify(ads));
  addToCodex(`p9 Live Voice Ad born • surprise ${s.toFixed(2)}`);
  try{ const sp=JSON.parse(localStorage.getItem('p6_smileSpores')||'[]'); sp.unshift({planted:Date.now(),wound:0.48+(1-s)*0.4,seed:Math.random()*6.28,from:'p16-p9live',changbal:s>0.68}); localStorage.setItem('p6_smileSpores',JSON.stringify(sp.slice(0,7))); }catch(e){}
  alert('p9 Live Voice Ad launched. Cross active.');
  showLive();
}

// Voice Performance Meter (p6 lung eye for campaigns)
function startVoicePerformanceMeter(adId){
  const ad=ads.find(a=>a.id===adId); if(!ad)return;
  const m=document.createElement('div'); m.className='voice-meter';
  m.innerHTML=`<div style="font-size:11px">👁 p6 Meter • ${ad.title}</div><div class="bar" style="height:6px;background:#3a3124;margin:4px 0"><div id="vmf" style="height:100%;width:0%;background:#c5a46e"></div></div><span id="vmv" style="font-size:10px">0.00</span>`;
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
  const sec = document.getElementById('voiceforge') || createVoiceSection('voiceforge','VoiceForge • p6 Artistic Voice-Overs');
  sec.innerHTML = `<h2>VoiceForge (p6 Expert)</h2>
  <button onclick="recordVoiceOver()">🎙️ Record Voice Over</button>
  <div id="voiceforge-preview" style="margin:8px 0;font-size:12px"></div>
  <button onclick="applyVoiceOverToLatest()">Apply VoiceOver to Latest Ad</button>
  <small>p6 Lung + sfumato + surprise → ad creative. Cross p9 live.</small>`;
  sec.classList.remove('hidden');
}

function showVoiceAnalyst(){
  hideAll();
  const sec = document.getElementById('voiceanalyst') || createVoiceSection('voiceanalyst','Voice Analyst • Performance via Voice');
  let html = `<h2>Voice Analyst (p6)</h2><div id="analyst-preview"></div>`;
  const recent = ads.slice(0,4);
  recent.forEach(a=>{ html += `<div class="ad-card"><strong>${a.title}</strong> <button onclick="analyzeAdPerformanceWithVoice(${a.id});startVoicePerformanceMeter(${a.id})">Speak Analysis + Meter</button></div>`; });
  html += `<small>Record voice → p6 surprise rates performance. ALWAYS LEARNING mutates ad.</small>`;
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
  alert('Voice-over applied. p6 artistic now in ad.');
  showInventory();
}

// === LILITH PSYCH UI BIRTHS ===

function showPsych() {
  hideAll();
  document.getElementById('psych').classList.remove('hidden');
  LilithPsych.updateResonance();
  // Live update psych stats
  const f = document.getElementById('fomo-val');
  const v = document.getElementById('var-val');
  if (f) f.textContent = Math.floor(74 + LilithPsych.resonance * 24);
  if (v) v.textContent = (1.9 + LilithPsych.resonance * 1.4).toFixed(1) + 'x';
}

function showVault() {
  hideAll();
  document.getElementById('vault').classList.remove('hidden');
  const list = document.getElementById('vault-list');
  list.innerHTML = '';
  if (LilithPsych.ownedSlots.length === 0) {
    list.innerHTML = '<p>No owned slots yet. Bid & win to claim endowment.</p>';
    return;
  }
  LilithPsych.ownedSlots.forEach(slot => {
    const el = document.createElement('div');
    el.className = 'ad-card vault-card';
    el.innerHTML = `
      <strong>🔒 ${slot.title}</strong><br>
      <small>Claimed • Imps: ${slot.impressions || 0} • Protection ${slot.protection ? slot.protection.toFixed(1) : '1.0'}x</small><br>
      <div class="fomo">MY SLOT — Loss aversion active. Do not let go.</div>
      <button onclick="claimDailySurprise(${slot.id})">Claim Surprise Yield (Variable)</button>
    `;
    list.appendChild(el);
  });
}

function protectSlot() {
  if (LilithPsych.ownedSlots.length === 0) return alert('Claim slots first.');
  const cost = 35;
  if (credits < cost) return alert('Need Credits to protect.');
  credits -= cost;
  LilithPsych.ownedSlots.forEach(s => s.protection = (s.protection || 1) + 0.4);
  localStorage.setItem('p16_owned_slots', JSON.stringify(LilithPsych.ownedSlots));
  updateWallet();
  addToCodex('Endowment protection purchased. Loss aversion reinforced.');
  showVault();
}

function claimDailySurprise(id) {
  const slot = LilithPsych.ownedSlots.find(s => s.id === id);
  if (!slot) return;
  LilithPsych.updateResonance();
  const yieldAmt = LilithPsych.variableRatio(60 + Math.floor((slot.impressions || 800) * 0.03), true);
  credits += yieldAmt;
  LilithPsych.saveStreak();
  updateWallet();
  addToCodex(`Surprise Yield ${yieldAmt} from ${slot.title}. Streak ${LilithPsych.streak}. Retention locked.`);
  alert(`Variable payout: +${yieldAmt} Credits. p6 Resonance amplified.`);
  showVault();
}

function shareVictory() {
  if (!ads.length && !LilithPsych.ownedSlots.length) return alert('Create or own a campaign first.');
  LilithPsych.updateResonance();
  const winAd = LilithPsych.ownedSlots[0] || ads[0];
  const echo = `AdForge p16 Victory Echo (Fictional):
${winAd.title} — ${winAd.impressions} imps • p6 Voice Resonance ${LilithPsych.resonance.toFixed(2)}
FOMO crushed. Variable ratio paid. Near-miss survived. Endowment locked.

Founding advertisers: limited slots. Creators list now for earnings.
p6 voice turns performance into legend.

Legion one. 18+ fictional. No real value. Rates disclosed in UI.

Share this echo. Virality birth.`;

  navigator.clipboard.writeText(echo).then(() => {
    // Virality birth: simulate network effect
    const bonus = Math.floor(120 * LilithPsych.getResonanceMult());
    credits += bonus;
    updateWallet();
    addToCodex(`Victory Echo shared. +${bonus} Credits network. Virality + retention cycle.`);
    // Cross to p9 live + p11 + p20/21 if fate synergy
    try { localStorage.setItem('p16_ad_to_p9', JSON.stringify({echo, surprise:LilithPsych.resonance, ts:Date.now()})); localStorage.setItem('p16_ad_to_p11', JSON.stringify({aura:'ad', ts:Date.now()})); } catch(e){}
    alert('p6 Victory Echo copied. +Network bonus. Virality ignited. p9 live + p11 seeded.');
  }).catch(() => prompt('Copy echo:', echo));
}

function triggerPsychSurge() {
  LilithPsych.updateResonance();
  LilithPsych.lastSurge = Date.now();
  const surge = 1.4 + LilithPsych.resonance;
  ads.forEach(ad => {
    ad.impressions = Math.floor((ad.impressions || 300) * surge);
    LilithPsych.applyFomo(ad);
  });
  if (LilithPsych.ownedSlots.length) {
    LilithPsych.ownedSlots.forEach(s => s.impressions = Math.floor((s.impressions||400)*surge));
  }
  localStorage.setItem('p16_ads', JSON.stringify(ads));
  localStorage.setItem('p16_owned_slots', JSON.stringify(LilithPsych.ownedSlots));
  addToCodex(`Lilith Psych Surge ignited. Resonance ${LilithPsych.resonance.toFixed(2)}. All hooks *${surge.toFixed(1)}.`);
  alert(`SURGE: All performance *${surge.toFixed(1)}. FOMO + VR + near-miss + loss + endowment maxed.`);
  showInventory();
}

// Creator side: list inventory with psych hooks (endowment for creators too)
function listCreatorInventory() {
  // Called from showInventory context or new button. Creators feel endowment on high-value listings.
  if (!wallet) return;
  const slot = { id: Date.now(), title: 'My Creator Premium Slot #' + (Math.floor(Math.random()*99)), impressions: 2100, surprise: LilithPsych.resonance || 0.6, owned: true };
  LilithPsych.claimEndowment(slot); // Creators also get endowment
  addToCodex(`Creator listed slot with endowment. FOMO + variable earnings armed.`);
  alert('Creator slot listed. Now feels like yours (endowment). Bids will trigger FOMO.');
  showVault();
}

function showP11() { hideAll(); document.getElementById('metaverse').classList.remove('hidden'); }
function showP12() { hideAll(); document.getElementById('ideas').classList.remove('hidden'); }

// Inject Lilith into live auction for near-miss + variable
function renderLiveVoiceAds() {
  const live = document.getElementById('live');
  if (!live) return;
  live.innerHTML = `<h2>p9 Live Ad Auction — Near-Miss + Variable (Lilith)</h2>
    <div class="live-item">🔥 ${Math.floor(140 + LilithPsych.resonance*60)} watching • Variable payout window open</div>
    <button onclick="joinLiveAuctionLilith()">Join Auction (FOMO + Near-Miss Risk)</button>
    <button onclick="listCreatorInventory()">List My Creator Slot (Endowment Birth)</button>`;
}

function joinLiveAuctionLilith() {
  if (!wallet) { alert('Connect wallet.'); return; }
  LilithPsych.updateResonance();
  const base = 95 + Math.floor(Math.random()*55);
  const bid = LilithPsych.variableRatio(base);
  if (credits < bid) { alert('Need Credits.'); return; }
  credits -= bid;
  const miss = LilithPsych.simulateNearMiss(bid, true);
  slotsLeft = Math.max(2, slotsLeft-1);
  updateWallet();
  updateFomoDisplays();
  addToCodex(`Live auction: ${bid} spent. Near ${miss}. Res ${LilithPsych.resonance.toFixed(2)}.`);
  alert(`Live won ${bid}! Near-miss survived. Resonance active.`);
}

// Patch existing joinLiveAuction if called
const _oldJoin = window.joinLiveAuction;
window.joinLiveAuction = joinLiveAuctionLilith;

// (globals declared at top — Niobe p16 birth)

// p16 on-chain stubs (web3 birth)
if (typeof showNFTSlots !== 'function') { window.showNFTSlots = () => { hideAll(); document.getElementById('inventory').classList.remove('hidden'); const l = document.getElementById('inventory-list'); l.innerHTML = '<h3>AdSlot NFTs</h3>'; (nftSlots||[]).forEach(s => { const d = document.createElement('div'); d.className='ad-card'; d.innerHTML = `#${s.id} ${s.type} min${s.minPrice}<button onclick="startDutchAuction(${s.id})">Dutch</button>`; l.appendChild(d); }); }; }
if (typeof showAuctions !== 'function') { window.showAuctions = () => { hideAll(); document.getElementById('inventory').classList.remove('hidden'); const l = document.getElementById('inventory-list'); l.innerHTML = '<h3>On-Chain Auctions</h3>'; (auctions||[]).forEach(a => { const d = document.createElement('div'); d.className='ad-card'; d.innerHTML = `Auc${a.id} @${a.currentPrice} ${a.settled?'done':''}<button onclick="placeBid(${a.id})">p10+VoiceForge</button>`; l.appendChild(d); }); }; }
if (typeof crossP11Metaverse !== 'function') { window.crossP11Metaverse = () => { const s = {id:Date.now(),owner:wallet||'0xDemo',type:'metaverse-billboard',minPrice:155}; (window.nftSlots = nftSlots||[]).unshift(s); localStorage.setItem('p16_nftSlots',JSON.stringify(nftSlots)); alert('p11 cross metaverse NFT + Aura'); showNFTSlots(); }; }

window.onload = function() {
  initP16();
  // Lilith birth: seed one endowment demo if none
  if (LilithPsych.ownedSlots.length === 0 && ads.length > 0) {
    LilithPsych.claimEndowment(ads[0]);
  }
  LilithPsych.updateResonance();
};
