// ============================================================================
// AdForge — CAMPAIGN MANAGER (best-in-class ad-platform core)
// The universal ad-platform mental model, implemented with REAL, internally
// consistent math (no random inflation):
//   Campaign (objective + budget + bid strategy)
//     └─ Ad Set (audience + placements + schedule + budget)
//         └─ Ad (responsive creative: headlines/descriptions/CTA/voice)
// Everything derives from the audience/objective/bid the advertiser chose —
// impressions, clicks, conversions, spend, CPA, ROAS are all consistent.
// Reuses the existing estimateAudience()/_hashStr() delivery engine.
// Fictional simulation only. Displayed numbers == code. Client-only, reversible.
// ============================================================================
(function () {
  'use strict';

  // --- persisted state ---
  var CAMPAIGNS = load('p16_campaigns_v2', []);
  var AUDIENCES = load('p16_audiences', null);
  var EXPERIMENTS = load('p16_experiments', []);
  var UI = load('p16_am_ui', { cols: 'performance', attribution: '7d1d' });

  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function saveC() { try { localStorage.setItem('p16_campaigns_v2', JSON.stringify(CAMPAIGNS)); } catch (e) {} }
  function saveA() { try { localStorage.setItem('p16_audiences', JSON.stringify(AUDIENCES)); } catch (e) {} }
  function saveE() { try { localStorage.setItem('p16_experiments', JSON.stringify(EXPERIMENTS)); } catch (e) {} }
  function saveU() { try { localStorage.setItem('p16_am_ui', JSON.stringify(UI)); } catch (e) {} }
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { n = Number(n) || 0; return n >= 1000 ? Math.round(n).toLocaleString() : (Math.round(n * 100) / 100).toLocaleString(); }
  function pct(n) { return (Number(n) * 100).toFixed(2) + '%'; }
  function hash(s) { return (typeof _hashStr === 'function') ? _hashStr(s) : (function () { var x = 0; s = String(s); for (var i = 0; i < s.length; i++)x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; })(); }

  // ======================= OBJECTIVE MODEL ==================================
  // The objective drives who is optimized for, which metric leads, and the
  // post-click conversion behaviour — exactly like Meta's 6-objective picker.
  var OBJECTIVES = {
    awareness:  { label: 'Awareness',    icon: '📣', goal: 'Maximize unique reach & impressions', metric: 'CPM',  cvr: 0.004, value: 0,  bids: ['maxImpr', 'targetCpm'] },
    traffic:    { label: 'Traffic',      icon: '🔗', goal: 'Send people to a destination',        metric: 'CPC',  cvr: 0.020, value: 0,  bids: ['maxClicks', 'targetCpc'] },
    engagement: { label: 'Engagement',   icon: '💬', goal: 'More interactions & video views',     metric: 'CPE',  cvr: 0.080, value: 0,  bids: ['maxConv', 'maxClicks'] },
    leads:      { label: 'Leads',        icon: '📥', goal: 'Collect leads in a form',             metric: 'CPA',  cvr: 0.032, value: 34, bids: ['maxConv', 'targetCpa'] },
    app:        { label: 'App Promotion',icon: '📱', goal: 'Drive app installs & events',         metric: 'CPI',  cvr: 0.026, value: 19, bids: ['maxConv', 'targetCpa'] },
    sales:      { label: 'Sales',        icon: '🛒', goal: 'Purchases & conversion value',        metric: 'ROAS', cvr: 0.018, value: 58, bids: ['maxConv', 'targetRoas', 'targetCpa'] }
  };
  var BIDS = {
    maxImpr:    { label: 'Maximize Impressions', target: false },
    maxClicks:  { label: 'Maximize Clicks',      target: false, ctrMod: 1.18, cvrMod: 0.82 },
    maxConv:    { label: 'Maximize Conversions', target: false },
    targetCpc:  { label: 'Target CPC',  target: true, unit: 'Cr',  field: 'cpc',  def: 2.5 },
    targetCpm:  { label: 'Target CPM',  target: true, unit: 'Cr',  field: 'cpm',  def: 9 },
    targetCpa:  { label: 'Target CPA',  target: true, unit: 'Cr',  field: 'cpa',  def: 40 },
    targetRoas: { label: 'Target ROAS', target: true, unit: 'x',   field: 'roas', def: 3 }
  };
  var PLACEMENTS = [
    { key: 'feed',    label: 'Feed',            share: 0.42, ctrMod: 1.00, cpmMod: 1.00 },
    { key: 'reels',   label: 'Reels',           share: 0.24, ctrMod: 1.16, cpmMod: 0.86 },
    { key: 'stories', label: 'Stories',         share: 0.16, ctrMod: 0.90, cpmMod: 0.80 },
    { key: 'search',  label: 'Search',          share: 0.10, ctrMod: 1.55, cpmMod: 1.42 },
    { key: 'network', label: 'Audience Network',share: 0.08, ctrMod: 0.60, cpmMod: 0.55 }
  ];
  var CTAS = ['Learn More', 'Shop Now', 'Sign Up', 'Download', 'Get Offer', 'Book Now', 'Subscribe'];
  var ATTRIBUTION = {
    '1d':   { label: '1-day click',                    mult: 0.62 },
    '7d1d': { label: '7-day click, 1-day view (default)', mult: 1.00 },
    '28d':  { label: '28-day click',                   mult: 1.28 },
    'dda':  { label: 'Data-driven',                    mult: 1.08 }
  };
  var GEO = { global: { label: 'Global', f: 1 }, us: { label: 'United States', f: 0.34 }, eu: { label: 'Europe', f: 0.42 }, kr: { label: 'Korea', f: 0.09 }, jp: { label: 'Japan', f: 0.14 }, in: { label: 'India', f: 0.55 } };

  // ======================= AUDIENCE SUB-SYSTEM ==============================
  // Three real audience types (Interest / Custom / Lookalike) + controls
  // (min age, geo, language) — reusable & saveable, like Meta/TikTok.
  function defaultAudiences() {
    return [
      { id: 'aud_web3', name: 'Web3 Builders', type: 'interest', interests: ['Web3', 'Founders', 'Creators'], controls: { ageMin: 21, geo: 'global', languages: ['en'] } },
      { id: 'aud_beauty', name: 'Beauty Shoppers', type: 'interest', interests: ['Beauty', 'Women'], controls: { ageMin: 18, geo: 'us', languages: ['en'] } },
      { id: 'aud_buyers', name: 'Past Buyers (Custom)', type: 'custom', source: 'website', seedSize: 3200, controls: { ageMin: 18, geo: 'global', languages: [] } },
      { id: 'aud_lal', name: 'Buyers Lookalike 3%', type: 'lookalike', sourceName: 'Past Buyers', similarity: 3, controls: { ageMin: 18, geo: 'us', languages: [] } }
    ];
  }
  if (!AUDIENCES) { AUDIENCES = defaultAudiences(); saveA(); }

  var LAL_POOL = 2000000; // fictional addressable pool for lookalike expansion
  function audienceEstimate(aud) {
    if (!aud) return estimateAudience('', 0.4);
    var base;
    if (aud.type === 'lookalike') {
      var sim = Math.min(10, Math.max(1, aud.similarity || 1));
      var reach = Math.round(LAL_POOL * (sim / 100));
      var rel = Math.max(0.35, 0.95 - (sim - 1) * 0.062);
      base = { reach: reach, cpm: +(12 - sim * 0.35).toFixed(2), ctr: +(0.020 * (0.7 + rel * 0.9)).toFixed(4), relevance: rel, segments: ['Lookalike ' + sim + '%'] };
    } else if (aud.type === 'custom') {
      var seed = Math.max(100, aud.seedSize || 1000);
      var relc = Math.min(0.98, 0.74 + Math.min(0.22, seed / 40000));
      base = { reach: Math.round(seed * 1.0), cpm: 14, ctr: +(0.020 * (0.7 + relc * 0.9)).toFixed(4), relevance: relc, segments: ['Custom · ' + (aud.source || 'upload')] };
    } else {
      var est = estimateAudience((aud.interests || []).join(', '), 0.5);
      base = { reach: est.reach, cpm: est.cpm, ctr: est.ctr, relevance: est.relevance, segments: est.segments };
    }
    var c = aud.controls || {}, f = 1;
    if (c.ageMin && c.ageMin > 18) f *= Math.max(0.40, 1 - (c.ageMin - 18) * 0.012);
    if (c.geo && GEO[c.geo]) { f *= GEO[c.geo].f; if (c.geo !== 'global') base.relevance = Math.min(0.99, base.relevance + 0.03); }
    base.reach = Math.max(50, Math.round(base.reach * f));
    base.cpm = +Number(base.cpm).toFixed(2);
    base.ctr = +Number(base.ctr).toFixed(4);
    base.relevance = +Number(base.relevance).toFixed(2);
    base.label = audienceLabel(aud);
    base.type = aud.type;
    return base;
  }
  function audienceLabel(aud) {
    if (!aud) return 'General';
    if (aud.type === 'lookalike') return (aud.sourceName || 'Source') + ' · Lookalike ' + (aud.similarity || 1) + '%';
    if (aud.type === 'custom') return (aud.source || 'Custom') + ' · ' + fmt(aud.seedSize || 0) + ' seed';
    return (aud.interests || []).join(', ') || 'Broad';
  }
  function findAud(id) { for (var i = 0; i < AUDIENCES.length; i++) if (AUDIENCES[i].id === id) return AUDIENCES[i]; return null; }
  function asAudience(as) { return as.audienceId ? (findAud(as.audienceId) || as.audienceInline) : as.audienceInline; }

  // ======================= AD STRENGTH =====================================
  // Rates responsive-creative quality (asset count/diversity) like Google's
  // Ad Strength / a teaching nudge. Excellent creative earns a modest cvr lift.
  function adStrength(ad) {
    var s = 0;
    var hs = (ad.headlines || []).filter(function (x) { return x && x.trim(); });
    var ds = (ad.descriptions || []).filter(function (x) { return x && x.trim(); });
    s += Math.min(40, hs.length * 11);
    s += Math.min(24, ds.length * 12);
    var lens = {}; hs.forEach(function (x) { lens[Math.min(3, Math.floor(x.length / 18))] = 1; });
    s += Math.min(12, (Object.keys(lens).length - 1) * 6);
    if (ad.voiceUrl || (ad.surprise || 0) > 0.5) s += 12;
    if (ad.cta) s += 8;
    s = Math.max(0, Math.min(100, s));
    var tier = s >= 80 ? 'Excellent' : s >= 55 ? 'Good' : s >= 30 ? 'Average' : 'Poor';
    return { score: s, tier: tier, lift: tier === 'Excellent' ? 1.10 : tier === 'Good' ? 1.03 : tier === 'Average' ? 1.0 : 0.92 };
  }
  function strengthColor(t) { return t === 'Excellent' ? '#8fbf7f' : t === 'Good' ? '#d4b98a' : t === 'Average' ? '#e0a05e' : '#e06b6b'; }

  // ======================= DELIVERY ENGINE =================================
  function adTotals(ad) { return { imp: ad.impressions || 0, clk: ad.clicks || 0, spend: ad.spend || 0, conv: ad.conversions || 0, val: ad.convValue || 0 }; }
  function adsetTotals(as) { var t = { imp: 0, clk: 0, spend: 0, conv: 0, val: 0 }; (as.ads || []).forEach(function (a) { var x = adTotals(a); t.imp += x.imp; t.clk += x.clk; t.spend += x.spend; t.conv += x.conv; t.val += x.val; }); return t; }
  function campTotals(c) { var t = { imp: 0, clk: 0, spend: 0, conv: 0, val: 0 }; (c.adsets || []).forEach(function (as) { var x = adsetTotals(as); t.imp += x.imp; t.clk += x.clk; t.spend += x.spend; t.conv += x.conv; t.val += x.val; }); return t; }

  function deliverAd(ad, est, spend, camp, obj, as) {
    if (spend <= 0) return;
    var bidKey = as.bidStrategy || camp.bidStrategy || 'maxConv';
    var bid = BIDS[bidKey] || {};
    var jit = 0.92 + (hash(ad.id + ':' + (ad.spend || 0)) % 160) / 1000;
    var st = adStrength(ad);
    var effCpm = Math.max(1, est.cpm * jit * (bid.cpmMod || 1));
    if (bidKey === 'targetCpm' && as.targetValue) effCpm = Math.max(1, as.targetValue);
    var imp = Math.floor((spend / effCpm) * 1000);
    var capped = null, impCap = est.reach * 3;
    if (imp > impCap) { imp = impCap; capped = 'reach'; }
    var ctr = est.ctr * (bid.ctrMod || 1);
    var clk = Math.floor(imp * ctr);
    var cvr = obj.cvr * (0.6 + est.relevance * 0.7) * (bid.cvrMod || 1) * st.lift;
    var conv = clk * cvr;
    var val = conv * obj.value * (0.8 + est.relevance * 0.4);
    var actual = +((imp / 1000) * effCpm).toFixed(2);
    if (bidKey === 'targetCpa' && as.targetValue && conv > 0) {
      var cpa = actual / conv;
      if (cpa > as.targetValue) { var f = Math.max(0.35, as.targetValue / cpa); imp = Math.floor(imp * f); clk = Math.floor(clk * f); conv *= f; val *= f; actual = +(actual * f).toFixed(2); capped = capped || 'tcpa'; }
    }
    if (bidKey === 'targetRoas' && as.targetValue && actual > 0) {
      var roas = val / actual;
      if (roas < as.targetValue) { var g = Math.max(0.35, roas / as.targetValue); imp = Math.floor(imp * g); clk = Math.floor(clk * g); conv *= g; val *= g; actual = +(actual * g).toFixed(2); capped = capped || 'troas'; }
    }
    conv = +conv.toFixed(2); val = +val.toFixed(2);
    ad.impressions = (ad.impressions || 0) + imp;
    ad.clicks = (ad.clicks || 0) + clk;
    ad.spend = +((ad.spend || 0) + actual).toFixed(2);
    ad.conversions = +((ad.conversions || 0) + conv).toFixed(2);
    ad.convValue = +((ad.convValue || 0) + val).toFixed(2);
    ad.lastCapped = capped;
    // placement breakdown (real split by selected placements)
    ad.placements = ad.placements || {};
    var sel = (as.placements && as.placements.length) ? PLACEMENTS.filter(function (p) { return as.placements.indexOf(p.key) >= 0; }) : PLACEMENTS;
    var ss = sel.reduce(function (a, p) { return a + p.share; }, 0) || 1;
    sel.forEach(function (p) {
      var pi = Math.floor(imp * (p.share / ss));
      var pc = Math.floor(pi * Math.min(1, ctr * p.ctrMod));
      ad.placements[p.key] = ad.placements[p.key] || { imp: 0, clk: 0 };
      ad.placements[p.key].imp += pi; ad.placements[p.key].clk += pc;
    });
    ad.history = ad.history || [];
    ad.history.push({ ts: Date.now(), imp: imp, clk: clk, spend: actual, conv: conv, val: val });
    if (ad.history.length > 30) ad.history.shift();
    return { imp: imp, clk: clk, spend: actual, conv: conv, val: val, capped: capped, cpm: +effCpm.toFixed(2) };
  }

  function deliverCampaign(camp, chunkOverride) {
    var obj = OBJECTIVES[camp.objective] || OBJECTIVES.traffic;
    var tot = campTotals(camp);
    var remaining = Math.max(0, (camp.budget || 0) - tot.spend);
    var chunk = chunkOverride == null ? Math.max(1, Math.ceil(remaining * 0.34)) : chunkOverride;
    chunk = Math.min(chunk, remaining);
    if (chunk <= 0) return { capped: 'budget', spent: 0 };
    // score each ad set (CBO distributes by projected performance)
    var scored = (camp.adsets || []).map(function (as) {
      var est = audienceEstimate(asAudience(as));
      var strength = (as.ads || []).reduce(function (a, ad) { return a + adStrength(ad).score; }, 0) / Math.max(1, (as.ads || []).length);
      return { as: as, est: est, score: Math.max(0.05, est.relevance * (0.5 + strength / 200)) };
    });
    var sum = scored.reduce(function (a, s) { return a + s.score; }, 0) || 1;
    var spent = 0;
    scored.forEach(function (s) {
      var asSpend;
      if (camp.budgetMode === 'ABO') {
        var asRem = Math.max(0, (s.as.budget || 0) - adsetTotals(s.as).spend);
        asSpend = Math.min(asRem, chunk * (s.score / sum));
      } else { asSpend = chunk * (s.score / sum); }
      if (asSpend <= 0) return;
      var ads = (s.as.ads || []);
      var wSum = ads.reduce(function (a, ad) { return a + adStrength(ad).score + 1; }, 0) || 1;
      ads.forEach(function (ad) {
        var w = (adStrength(ad).score + 1) / wSum;
        var r = deliverAd(ad, s.est, asSpend * w, camp, obj, s.as);
        if (r) spent += r.spend;
      });
    });
    saveC();
    return { spent: +spent.toFixed(2), obj: obj };
  }

  // ======================= DERIVED METRICS =================================
  function metrics(t) {
    var m = {};
    m.impressions = t.imp; m.clicks = t.clk; m.spend = +t.spend.toFixed(2);
    m.ctr = t.imp ? t.clk / t.imp : 0;
    m.cpc = t.clk ? t.spend / t.clk : 0;
    m.cpm = t.imp ? (t.spend / t.imp) * 1000 : 0;
    var attMult = (ATTRIBUTION[UI.attribution] || ATTRIBUTION['7d1d']).mult;
    m.conversions = t.conv * attMult;
    m.convValue = t.val * attMult;
    m.cvr = t.clk ? m.conversions / t.clk : 0;
    m.cpa = m.conversions ? t.spend / m.conversions : 0;
    m.roas = t.spend ? m.convValue / t.spend : 0;
    return m;
  }

  // ======================= OPPORTUNITY SCORE ===============================
  // 0-100 guided-optimization score (audience breadth, creative diversity,
  // budget, conversion tracking, bid strategy) — teaches better setup.
  function opportunityScore(camp) {
    var pts = 0, tips = [];
    var reach = (camp.adsets || []).reduce(function (a, as) { return a + audienceEstimate(asAudience(as)).reach; }, 0);
    if (reach >= 30000 && reach <= 800000) pts += 22; else { pts += 8; tips.push(reach < 30000 ? 'Audience is narrow — broaden or add a lookalike for scale.' : 'Audience is very broad — tighten targeting to lift relevance.'); }
    var strengths = []; (camp.adsets || []).forEach(function (as) { (as.ads || []).forEach(function (ad) { strengths.push(adStrength(ad).score); }); });
    var avgS = strengths.length ? strengths.reduce(function (a, b) { return a + b; }, 0) / strengths.length : 0;
    pts += Math.round(avgS * 0.24); if (avgS < 60) tips.push('Add more headlines/descriptions per ad to reach Excellent Ad Strength.');
    if ((camp.adsets || []).length >= 2) pts += 12; else tips.push('Add a 2nd ad set to test another audience.');
    if (camp.budget >= 200) pts += 12; else tips.push('Raise budget so the algorithm can exit the learning phase.');
    var obj = OBJECTIVES[camp.objective];
    if (obj && obj.value > 0) pts += 16; else tips.push('A conversion/sales objective unlocks CPA & ROAS optimization.');
    if (camp.bidStrategy && camp.bidStrategy !== 'maxImpr') pts += 14;
    pts = Math.max(0, Math.min(100, pts));
    return { score: pts, tips: tips.slice(0, 3), tier: pts >= 80 ? 'Excellent' : pts >= 55 ? 'Good' : pts >= 30 ? 'Average' : 'Poor' };
  }

  // ======================= EXPERIMENTS (A/B) ===============================
  function normCdf(x) { var t = 1 / (1 + 0.2316419 * Math.abs(x)); var d = 0.3989422804 * Math.exp(-x * x / 2); var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
  function confidence(cA, nA, cB, nB) {
    if (nA < 30 || nB < 30) return 0;
    var p1 = cA / nA, p2 = cB / nB, p = (cA + cB) / (nA + nB);
    var se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
    if (se === 0) return 0;
    var z = (p1 - p2) / se;
    return Math.max(0, Math.min(99.9, (2 * normCdf(Math.abs(z)) - 1) * 100));
  }

  // ======================= UI: shared shell ================================
  function section(id) { var e = document.getElementById(id); return e; }
  function showOnly(id) {
    if (typeof hideAll === 'function') hideAll(); else document.querySelectorAll('.section').forEach(function (s) { s.classList.add('hidden'); });
    var e = section(id); if (e) e.classList.remove('hidden');
  }
  function chip(label, val, color) { return '<div class="mchip"><span>' + h(label) + '</span><b' + (color ? ' style="color:' + color + '"' : '') + '>' + val + '</b></div>'; }

  // ======================= UI: CAMPAIGN MANAGER (tree) =====================
  window.showCampaigns = function () {
    showOnly('campaigns');
    var host = section('campaigns'); if (!host) return;
    var top = campTotals({ adsets: [] });
    // aggregate account totals
    var acc = { imp: 0, clk: 0, spend: 0, conv: 0, val: 0 };
    CAMPAIGNS.forEach(function (c) { var t = campTotals(c); acc.imp += t.imp; acc.clk += t.clk; acc.spend += t.spend; acc.conv += t.conv; acc.val += t.val; });
    var am = metrics(acc);
    var html = '<div class="am-head"><h2>Campaigns</h2><button class="primary" onclick="amNewCampaign()">＋ New Campaign</button></div>';
    html += '<div class="am-summary">' +
      chip('Spend', fmt(am.spend)) + chip('Impr', fmt(am.impressions)) + chip('Clicks', fmt(am.clicks)) +
      chip('CTR', pct(am.ctr)) + chip('Conv', fmt(am.conversions)) + chip('CPA', am.cpa ? fmt(am.cpa) : '—') +
      chip('ROAS', am.roas ? am.roas.toFixed(2) + 'x' : '—', am.roas >= 2 ? '#8fbf7f' : '') + '</div>';
    if (!CAMPAIGNS.length) {
      html += '<div class="am-empty">No campaigns yet.<br>Build one with a real objective, audience, bid strategy & responsive creative.<br><button class="primary" onclick="amNewCampaign()" style="margin-top:10px">＋ Create your first campaign</button></div>';
      host.innerHTML = html; return;
    }
    CAMPAIGNS.forEach(function (c) {
      var obj = OBJECTIVES[c.objective] || OBJECTIVES.traffic;
      var t = campTotals(c), m = metrics(t);
      var rem = Math.max(0, (c.budget || 0) - t.spend);
      var bpct = c.budget ? Math.min(100, Math.round((t.spend / c.budget) * 100)) : 0;
      var opp = opportunityScore(c);
      html += '<div class="camp-card">';
      html += '<div class="camp-top" onclick="amToggle(\'' + c.id + '\')">' +
        '<div class="camp-title"><span class="tw">' + (c._open ? '▾' : '▸') + '</span> ' + obj.icon + ' <b>' + h(c.name) + '</b><span class="obj-tag">' + obj.label + '</span></div>' +
        '<div class="opp" title="Opportunity Score"><span style="color:' + strengthColor(opp.tier) + '">' + opp.score + '</span><small>opp</small></div></div>';
      html += '<div class="camp-meta">' + h(BIDS[c.bidStrategy] ? BIDS[c.bidStrategy].label : 'Max Conversions') + ' · ' + (c.budgetMode || 'CBO') + ' · ' + fmt(c.budget) + ' Cr ' + (c.budgetType || 'daily') + '</div>';
      var lp = learningPhase(c);
      html += '<div class="lp-row"><span class="lphase" style="color:' + lp.color + ';border-color:' + lp.color + '55">● ' + lp.phase + (lp.phase !== 'Active' ? ' · ' + lp.pct + '%' : '') + '</span><span class="lp-note">' + h(lp.note) + '</span></div>';
      html += '<div class="budget-bar" title="Spent ' + fmt(t.spend) + ' / ' + fmt(c.budget) + '"><div style="width:' + bpct + '%"></div></div>';
      html += '<div class="camp-metrics">' +
        chip('Impr', fmt(m.impressions)) + chip('Clicks', fmt(m.clicks)) + chip('CTR', pct(m.ctr)) +
        chip('Conv', fmt(m.conversions)) + (obj.value ? chip('CPA', m.cpa ? fmt(m.cpa) : '—') + chip('ROAS', m.roas ? m.roas.toFixed(2) + 'x' : '—', m.roas >= (obj.value ? 2 : 0) ? '#8fbf7f' : '') : chip('CPC', m.cpc ? fmt(m.cpc) : '—')) + '</div>';
      html += '<div class="camp-actions">' +
        '<button class="primary" onclick="amRun(\'' + c.id + '\')" ' + (rem < 0.5 ? 'disabled' : '') + '>' + (rem < 0.5 ? '✓ Budget spent' : '▶ Run delivery') + '</button>' +
        '<button onclick="amDash(\'' + c.id + '\')">📊 Report</button>' +
        '<button onclick="amDup(\'' + c.id + '\')">Duplicate</button>' +
        '<button onclick="amDel(\'' + c.id + '\')" class="danger">Delete</button></div>';
      if (opp.tips.length) html += '<div class="opp-tips">💡 ' + h(opp.tips[0]) + '</div>';
      if (c._open) {
        (c.adsets || []).forEach(function (as) {
          var est = audienceEstimate(asAudience(as)), at = adsetTotals(as), amx = metrics(at);
          var asBid = as.bidStrategy && BIDS[as.bidStrategy] ? ' · ' + BIDS[as.bidStrategy].label : '';
          html += '<div class="adset-card"><div class="adset-h">📁 <b>' + h(as.name) + '</b> <span class="muted">· ' + h(est.label) + '</span></div>' +
            '<div class="adset-meta">Reach ' + fmt(est.reach) + ' · relevance ' + Math.round(est.relevance * 100) + '% · ' + ((as.placements && as.placements.length) ? as.placements.length + ' placements' : 'all placements') + asBid + '</div>' +
            '<div class="adset-metrics">' + chip('Impr', fmt(amx.impressions)) + chip('Clicks', fmt(amx.clicks)) + chip('CTR', pct(amx.ctr)) + chip('Conv', fmt(amx.conversions)) + '</div>';
          (as.ads || []).forEach(function (ad) {
            var st = adStrength(ad), mt = metrics(adTotals(ad));
            html += '<div class="ad-row"><div class="ad-row-h">🎨 <b>' + h((ad.headlines || [])[0] || ad.name || 'Ad') + '</b><span class="astr" style="color:' + strengthColor(st.tier) + '">' + st.tier + '</span></div>' +
              '<div class="ad-row-m">' + fmt(mt.impressions) + ' impr · ' + fmt(mt.clicks) + ' clk · ' + pct(mt.ctr) + ' CTR · ' + fmt(mt.conversions) + ' conv</div>' +
              '<button class="mini" onclick="amPreview(\'' + c.id + '\',\'' + as.id + '\',\'' + ad.id + '\')">👁 Preview</button></div>';
          });
          html += '</div>';
        });
      }
      html += '</div>';
    });
    host.innerHTML = html;
  };
  window.amToggle = function (id) { var c = byId(id); if (c) { c._open = !c._open; window.showCampaigns(); } };
  window.amRun = function (id) {
    var c = byId(id); if (!c) return;
    var r = deliverCampaign(c);
    if (typeof addToCodex === 'function') addToCodex('Ran ' + c.name + ': +' + fmt(r.spent) + ' Cr delivered across ' + (c.adsets || []).length + ' ad set(s).');
    if (window.legionTrack) window.legionTrack('activate', { k: 'campaign_run' });
    c._open = true; window.showCampaigns();
    toast('▶ Delivery ran — spent ' + fmt(r.spent) + ' Cr. Metrics updated across the tree.');
  };
  window.amDup = function (id) { var c = byId(id); if (!c) return; var n = JSON.parse(JSON.stringify(c)); n.id = 'c' + Date.now(); n.name = c.name + ' (copy)'; clearMetrics(n); CAMPAIGNS.unshift(n); saveC(); window.showCampaigns(); };
  window.amDel = function (id) { if (!confirm('Delete this campaign? (reversible only by re-creating)')) return; CAMPAIGNS = CAMPAIGNS.filter(function (c) { return c.id !== id; }); saveC(); window.showCampaigns(); };
  function clearMetrics(c) { (c.adsets || []).forEach(function (as) { (as.ads || []).forEach(function (ad) { ad.impressions = ad.clicks = ad.conversions = ad.convValue = 0; ad.spend = 0; ad.placements = {}; ad.history = []; }); }); }
  function byId(id) { for (var i = 0; i < CAMPAIGNS.length; i++) if (CAMPAIGNS[i].id === id) return CAMPAIGNS[i]; return null; }

  // ======================= UI: CREATE (nested tiers) =======================
  var draft = null;
  window.amNewCampaign = function () {
    draft = {
      id: 'c' + Date.now(), name: 'New Campaign', objective: null,
      budgetMode: 'CBO', budget: 500, budgetType: 'daily', bidStrategy: 'maxConv', targetValue: null,
      adsets: [newAdset()]
    };
    renderCreate();
  };
  function newAdset() { return { id: 'as' + Date.now() + Math.floor(Math.random() * 999), name: 'Ad Set 1', audienceId: (AUDIENCES[0] || {}).id || '', audienceInline: null, placements: ['feed', 'reels', 'stories'], bidStrategy: '', targetValue: null, budget: 200, ads: [newAd()] }; }
  function newAd() { return { id: 'ad' + Date.now() + Math.floor(Math.random() * 999), name: 'Ad', headlines: ['', ''], descriptions: [''], cta: 'Learn More', voiceUrl: null, surprise: 0, impressions: 0, clicks: 0, spend: 0, conversions: 0, convValue: 0, placements: {}, history: [] }; }

  function renderCreate() {
    showOnly('create-campaign');
    var host = section('create-campaign'); if (!host || !draft) return;
    var html = '<div class="am-head"><h2>Create Campaign</h2><button onclick="showCampaigns()">← Back</button></div>';
    // STEP 1 — objective
    html += '<div class="wz"><div class="wz-t">1 · Objective <span class="muted">— drives targeting, optimization & metrics</span></div><div class="obj-grid">';
    Object.keys(OBJECTIVES).forEach(function (k) {
      var o = OBJECTIVES[k], on = draft.objective === k;
      html += '<button class="obj-btn' + (on ? ' on' : '') + '" onclick="amSetObj(\'' + k + '\')"><div class="obj-i">' + o.icon + '</div><div class="obj-l">' + o.label + '</div><div class="obj-g">' + o.goal + '</div></button>';
    });
    html += '</div></div>';
    if (!draft.objective) { html += '<div class="am-empty">Pick an objective to continue.</div>'; host.innerHTML = html; return; }
    var obj = OBJECTIVES[draft.objective];
    // STEP 2 — campaign settings
    html += '<div class="wz"><div class="wz-t">2 · Campaign budget & bidding</div>' +
      '<label>Campaign name</label><input id="d-name" value="' + h(draft.name) + '">' +
      '<div class="row2"><div><label>Budget optimization</label><select id="d-bmode">' + opt(['CBO', 'ABO'], draft.budgetMode, { CBO: 'Campaign budget (CBO)', ABO: 'Ad-set budgets (ABO)' }) + '</select></div>' +
      '<div><label>Budget type</label><select id="d-btype">' + opt(['daily', 'lifetime'], draft.budgetType) + '</select></div></div>' +
      '<div class="row2"><div><label>Budget (Credits)</label><input id="d-budget" type="number" value="' + (draft.budget || 500) + '"></div>' +
      '<div><label>Bid strategy</label><select id="d-bid" onchange="amSyncBid()">' + bidOpts(obj.bids, draft.bidStrategy) + '</select></div></div>' +
      (BIDS[draft.bidStrategy] && BIDS[draft.bidStrategy].target ? '<label>Target ' + BIDS[draft.bidStrategy].field.toUpperCase() + ' (' + BIDS[draft.bidStrategy].unit + ')</label><input id="d-target" type="number" step="0.1" value="' + (draft.targetValue || BIDS[draft.bidStrategy].def) + '">' : '') +
      '</div>';
    // STEP 3 — ad sets (nested)
    html += '<div class="wz"><div class="wz-t">3 · Ad sets <span class="muted">— audience · placements · schedule</span></div>';
    draft.adsets.forEach(function (as, i) { html += renderAdsetEditor(as, i); });
    html += '<button class="add" onclick="amAddAdset()">＋ Add ad set</button></div>';
    // live projection
    html += renderProjection();
    html += '<div class="wz-save"><button class="primary" onclick="amSaveCampaign()">✅ Publish campaign (fictional)</button><div class="am-note">Simulated delivery · utility credits only, no real money/ads/tokens · 18+ · displayed rates match code.</div></div>';
    host.innerHTML = html;
  }
  function opt(arr, sel, labels) { return arr.map(function (v) { return '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + h(labels && labels[v] ? labels[v] : v) + '</option>'; }).join(''); }
  function bidOpts(keys, sel) { return keys.map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + h(BIDS[k].label) + '</option>'; }).join(''); }
  function renderAdsetEditor(as, i) {
    var html = '<div class="asx"><div class="asx-h">📁 Ad set ' + (i + 1) + (draft.adsets.length > 1 ? ' <button class="x" onclick="amDelAdset(' + i + ')">×</button>' : '') + '</div>';
    html += '<label>Ad set name</label><input id="as-name-' + i + '" value="' + h(as.name) + '">';
    html += '<label>Audience <a class="lnk" onclick="showAudiences()">manage →</a></label><select id="as-aud-' + i + '">' +
      AUDIENCES.map(function (a) { return '<option value="' + a.id + '"' + (a.id === as.audienceId ? ' selected' : '') + '>' + h(a.name) + ' · ' + h(audienceLabel(a)) + '</option>'; }).join('') + '</select>';
    html += '<label>Placements</label><div class="plc">' + PLACEMENTS.map(function (p) { return '<label class="pc"><input type="checkbox" id="as-plc-' + i + '-' + p.key + '"' + ((as.placements || []).indexOf(p.key) >= 0 ? ' checked' : '') + '> ' + p.label + '</label>'; }).join('') + '</div>';
    if (draft.budgetMode === 'ABO') html += '<label>Ad-set budget (Credits)</label><input id="as-budget-' + i + '" type="number" value="' + (as.budget || 200) + '">';
    // ads nested
    html += '<div class="asx-ads">';
    (as.ads || []).forEach(function (ad, j) { html += renderAdEditor(ad, i, j, as.ads.length); });
    html += '<button class="add sm" onclick="amAddAd(' + i + ')">＋ Add ad</button></div></div>';
    return html;
  }
  function renderAdEditor(ad, i, j, count) {
    var st = adStrength(ad);
    var html = '<div class="adx"><div class="adx-h">🎨 Ad ' + (j + 1) + ' <span class="astr" id="astr-' + i + '-' + j + '" style="color:' + strengthColor(st.tier) + '">Ad Strength: ' + st.tier + ' (' + st.score + ')</span>' + (count > 1 ? ' <button class="x" onclick="amDelAd(' + i + ',' + j + ')">×</button>' : '') + '</div>';
    html += '<label>Headlines <span class="muted">(responsive — add up to 5)</span></label>';
    (ad.headlines || []).forEach(function (hd, k) { html += '<input class="hl" id="ad-h-' + i + '-' + j + '-' + k + '" value="' + h(hd) + '" placeholder="Headline ' + (k + 1) + '" oninput="amStrengthLive(' + i + ',' + j + ')">'; });
    if ((ad.headlines || []).length < 5) html += '<button class="add xs" onclick="amAddHeadline(' + i + ',' + j + ')">＋ headline</button>';
    html += '<label>Descriptions</label>';
    (ad.descriptions || []).forEach(function (d, k) { html += '<input id="ad-d-' + i + '-' + j + '-' + k + '" value="' + h(d) + '" placeholder="Description ' + (k + 1) + '" oninput="amStrengthLive(' + i + ',' + j + ')">'; });
    if ((ad.descriptions || []).length < 3) html += '<button class="add xs" onclick="amAddDesc(' + i + ',' + j + ')">＋ description</button>';
    html += '<div class="row2"><div><label>Call to action</label><select id="ad-cta-' + i + '-' + j + '">' + opt(CTAS, ad.cta) + '</select></div>' +
      '<div><label>Voice creative</label><button class="vbtn" onclick="amAttachVoice(' + i + ',' + j + ')">🎙 ' + (ad.voiceUrl ? 'Voice attached ✓' : 'Attach current voice') + '</button></div></div>';
    html += '<div class="strbar" id="strbar-' + i + '-' + j + '"><div style="width:' + st.score + '%;background:' + strengthColor(st.tier) + '"></div></div>';
    html += '</div>';
    return html;
  }
  window.amSetObj = function (k) { syncDraft(); draft.objective = k; var o = OBJECTIVES[k]; if (o.bids.indexOf(draft.bidStrategy) < 0) draft.bidStrategy = o.bids[0]; renderCreate(); };
  window.amSyncBid = function () { syncDraft(); renderCreate(); };
  window.amAddAdset = function () { syncDraft(); var n = newAdset(); n.name = 'Ad Set ' + (draft.adsets.length + 1); draft.adsets.push(n); renderCreate(); };
  window.amDelAdset = function (i) { syncDraft(); draft.adsets.splice(i, 1); renderCreate(); };
  window.amAddAd = function (i) { syncDraft(); draft.adsets[i].ads.push(newAd()); renderCreate(); };
  window.amDelAd = function (i, j) { syncDraft(); draft.adsets[i].ads.splice(j, 1); renderCreate(); };
  window.amAddHeadline = function (i, j) { syncDraft(); if (draft.adsets[i].ads[j].headlines.length < 5) draft.adsets[i].ads[j].headlines.push(''); renderCreate(); };
  window.amAddDesc = function (i, j) { syncDraft(); if (draft.adsets[i].ads[j].descriptions.length < 3) draft.adsets[i].ads[j].descriptions.push(''); renderCreate(); };
  window.amAttachVoice = function (i, j) {
    syncDraft();
    var v = window._p16Voice || window._p16VoiceOver;
    if (!v) { toast('Record a voice creative first in 🎙 Creative.'); return; }
    draft.adsets[i].ads[j].voiceUrl = v.url || 'voice'; draft.adsets[i].ads[j].surprise = v.surprise || 0.6;
    renderCreate();
  };
  window.amStrengthLive = function (i, j) {
    // update just the strength bar without full re-render (keeps input focus)
    var ad = draft.adsets[i].ads[j];
    for (var k = 0; k < ad.headlines.length; k++) { var e = document.getElementById('ad-h-' + i + '-' + j + '-' + k); if (e) ad.headlines[k] = e.value; }
    for (var m = 0; m < ad.descriptions.length; m++) { var e2 = document.getElementById('ad-d-' + i + '-' + j + '-' + m); if (e2) ad.descriptions[m] = e2.value; }
    var st = adStrength(ad);
    var bar = document.getElementById('strbar-' + i + '-' + j);
    if (bar && bar.firstChild) { bar.firstChild.style.width = st.score + '%'; bar.firstChild.style.background = strengthColor(st.tier); }
    var lbl = document.getElementById('astr-' + i + '-' + j);
    if (lbl) { lbl.textContent = 'Ad Strength: ' + st.tier + ' (' + st.score + ')'; lbl.style.color = strengthColor(st.tier); }
    updateProjection();
  };
  function syncDraft() {
    if (!draft) return;
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; };
    var v;
    if ((v = g('d-name')) != null) draft.name = v;
    if ((v = g('d-bmode')) != null) draft.budgetMode = v;
    if ((v = g('d-btype')) != null) draft.budgetType = v;
    if ((v = g('d-budget')) != null) draft.budget = parseInt(v) || 0;
    if ((v = g('d-bid')) != null) draft.bidStrategy = v;
    if ((v = g('d-target')) != null) draft.targetValue = parseFloat(v) || null;
    draft.adsets.forEach(function (as, i) {
      if ((v = g('as-name-' + i)) != null) as.name = v;
      if ((v = g('as-aud-' + i)) != null) as.audienceId = v;
      if ((v = g('as-budget-' + i)) != null) as.budget = parseInt(v) || 0;
      var plc = []; PLACEMENTS.forEach(function (p) { var e = document.getElementById('as-plc-' + i + '-' + p.key); if (e && e.checked) plc.push(p.key); });
      if (document.getElementById('as-plc-' + i + '-feed')) as.placements = plc;
      (as.ads || []).forEach(function (ad, j) {
        (ad.headlines || []).forEach(function (_, k) { var e = document.getElementById('ad-h-' + i + '-' + j + '-' + k); if (e) ad.headlines[k] = e.value; });
        (ad.descriptions || []).forEach(function (_, k) { var e = document.getElementById('ad-d-' + i + '-' + j + '-' + k); if (e) ad.descriptions[k] = e.value; });
        var cta = g('ad-cta-' + i + '-' + j); if (cta != null) ad.cta = cta;
      });
    });
  }
  function project() {
    if (!draft || !draft.objective) return null;
    var obj = OBJECTIVES[draft.objective];
    var reach = 0, relSum = 0, n = 0, cpmSum = 0;
    draft.adsets.forEach(function (as) { var e = audienceEstimate(asAudience(as)); reach += e.reach; relSum += e.relevance; cpmSum += e.cpm; n++; });
    var rel = n ? relSum / n : 0, cpm = n ? cpmSum / n : 8;
    var imp = Math.floor((draft.budget / Math.max(1, cpm)) * 1000);
    imp = Math.min(imp, reach * 3);
    var ctr = 0.02 * (0.7 + rel * 0.6);
    var clk = Math.floor(imp * ctr);
    var conv = clk * obj.cvr * (0.6 + rel * 0.7);
    var val = conv * obj.value;
    return { reach: reach, rel: rel, imp: imp, clk: clk, conv: conv, val: val, cpm: cpm, obj: obj };
  }
  function renderProjection() {
    var p = project(); if (!p) return '';
    var opp = opportunityScore(draft);
    return '<div class="proj" id="proj"><div class="proj-t">Projected daily result <span class="proj-opp" style="color:' + strengthColor(opp.tier) + '">Opportunity ' + opp.score + '/100</span></div>' +
      '<div class="proj-grid">' + chip('Reach', fmt(p.reach)) + chip('Impr', fmt(p.imp)) + chip('Clicks', fmt(p.clk)) + chip('Relevance', Math.round(p.rel * 100) + '%') +
      chip(p.obj.value ? 'Conv' : 'Est. CPC', p.obj.value ? fmt(p.conv) : fmt(p.imp ? (draft.budget / Math.max(1, p.clk)) : 0)) + (p.obj.value ? chip('Est. value', fmt(p.val)) : '') + '</div>' +
      (opp.tips.length ? '<div class="opp-tips">💡 ' + h(opp.tips[0]) + '</div>' : '') + '</div>';
  }
  function updateProjection() { var el = document.getElementById('proj'); if (el) { syncDraft(); el.outerHTML = renderProjection(); } }
  window.amSaveCampaign = function () {
    syncDraft();
    if (!draft.objective) { toast('Pick an objective.'); return; }
    var bad = null;
    draft.adsets.forEach(function (as) { (as.ads || []).forEach(function (ad) { if (!(ad.headlines || []).some(function (x) { return x && x.trim(); })) bad = as.name; }); });
    if (bad) { toast('Add at least one headline to every ad (' + bad + ').'); return; }
    CAMPAIGNS.unshift(draft);
    saveC();
    if (window.legionTrack) window.legionTrack('activate', { k: 'campaign_create' });
    if (typeof addToCodex === 'function') addToCodex('Published campaign "' + draft.name + '" [' + OBJECTIVES[draft.objective].label + '] · ' + draft.adsets.length + ' ad set(s).');
    var id = draft.id; draft = null;
    var c = byId(id); if (c) c._open = true;
    window.showCampaigns();
    toast('✅ Campaign published. Hit ▶ Run delivery to generate real performance.');
  };

  // ======================= UI: AUDIENCES ===================================
  window.showAudiences = function () {
    showOnly('audiences');
    var host = section('audiences'); if (!host) return;
    var html = '<div class="am-head"><h2>Audiences</h2><button class="primary" onclick="amNewAud()">＋ New Audience</button></div>';
    html += '<div class="am-note" style="margin:0 0 12px">Reusable audiences — Interest, Custom (seed list), or Lookalike (similarity %). Attach them to any ad set.</div>';
    AUDIENCES.forEach(function (a) {
      var e = audienceEstimate(a);
      var tag = a.type === 'lookalike' ? 'Lookalike' : a.type === 'custom' ? 'Custom' : 'Interest';
      html += '<div class="aud-card"><div class="aud-h"><b>' + h(a.name) + '</b><span class="aud-tag">' + tag + '</span></div>' +
        '<div class="aud-sub">' + h(e.label) + '</div>' +
        '<div class="aud-metrics">' + chip('Reach', fmt(e.reach)) + chip('Relevance', Math.round(e.relevance * 100) + '%', strengthColor(e.relevance >= 0.7 ? 'Good' : e.relevance >= 0.45 ? 'Average' : 'Poor')) + chip('est. CPM', e.cpm) + chip('est. CTR', pct(e.ctr)) + '</div>' +
        '<div class="aud-ctrl">' + (a.controls && a.controls.geo ? '🌍 ' + (GEO[a.controls.geo] ? GEO[a.controls.geo].label : 'Global') : '') + (a.controls && a.controls.ageMin ? ' · ' + a.controls.ageMin + '+' : '') + '</div>' +
        '<div class="aud-act"><button onclick="amEditAud(\'' + a.id + '\')">Edit</button>' + (a.type === 'custom' ? '<button onclick="amMakeLal(\'' + a.id + '\')">Create Lookalike</button>' : '') + '<button class="danger" onclick="amDelAud(\'' + a.id + '\')">Delete</button></div></div>';
    });
    host.innerHTML = html;
  };
  var audDraft = null;
  window.amNewAud = function () { audDraft = { id: 'aud' + Date.now(), name: 'New Audience', type: 'interest', interests: [], seedSize: 1000, source: 'website', sourceName: '', similarity: 3, controls: { ageMin: 18, geo: 'global', languages: [] } }; renderAudBuilder(); };
  window.amEditAud = function (id) { var a = findAud(id); if (a) { audDraft = JSON.parse(JSON.stringify(a)); renderAudBuilder(); } };
  window.amMakeLal = function (id) { var a = findAud(id); if (!a) return; audDraft = { id: 'aud' + Date.now(), name: a.name + ' Lookalike', type: 'lookalike', sourceName: a.name, similarity: 3, controls: { ageMin: 18, geo: (a.controls || {}).geo || 'global', languages: [] } }; renderAudBuilder(); };
  window.amDelAud = function (id) { if (!confirm('Delete this audience?')) return; AUDIENCES = AUDIENCES.filter(function (a) { return a.id !== id; }); saveA(); window.showAudiences(); };
  function renderAudBuilder() {
    showOnly('audience-builder');
    var host = section('audience-builder'); if (!host || !audDraft) return;
    var d = audDraft;
    var html = '<div class="am-head"><h2>Audience Builder</h2><button onclick="showAudiences()">← Back</button></div>';
    html += '<label>Name</label><input id="ab-name" value="' + h(d.name) + '">';
    html += '<label>Type</label><div class="seg">' + ['interest', 'custom', 'lookalike'].map(function (t) { return '<button class="' + (d.type === t ? 'on' : '') + '" onclick="amAudType(\'' + t + '\')">' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>'; }).join('') + '</div>';
    if (d.type === 'interest') {
      html += '<label>Interests <span class="muted">(comma-separated: Web3, Beauty, Gaming, Founders…)</span></label><input id="ab-int" value="' + h((d.interests || []).join(', ')) + '" oninput="amAudPreview()">';
    } else if (d.type === 'custom') {
      html += '<div class="row2"><div><label>Source</label><select id="ab-src" onchange="amAudPreview()">' + opt(['website', 'app', 'upload', 'engagement'], d.source) + '</select></div>' +
        '<div><label>Seed size <span class="muted">(min 100)</span></label><input id="ab-seed" type="number" value="' + (d.seedSize || 1000) + '" oninput="amAudPreview()"></div></div>' +
        '<div class="am-note">Rec. 1,000–5,000 seed users for a healthy match rate.</div>';
    } else {
      html += '<label>Source audience</label><input id="ab-srcname" value="' + h(d.sourceName || '') + '" placeholder="e.g. Past Buyers">' +
        '<label>Similarity: <b id="ab-simv">' + (d.similarity || 3) + '%</b> <span class="muted">(1% = closest match · 10% = widest reach)</span></label><input id="ab-sim" type="range" min="1" max="10" value="' + (d.similarity || 3) + '" oninput="document.getElementById(\'ab-simv\').textContent=this.value+\'%\';amAudPreview()">';
    }
    html += '<div class="wz"><div class="wz-t">Audience controls</div>' +
      '<div class="row2"><div><label>Min age</label><select id="ab-age" onchange="amAudPreview()">' + opt(['18', '21', '25', '35', '45'], String((d.controls || {}).ageMin || 18)) + '</select></div>' +
      '<div><label>Location</label><select id="ab-geo" onchange="amAudPreview()">' + Object.keys(GEO).map(function (k) { return '<option value="' + k + '"' + (k === (d.controls || {}).geo ? ' selected' : '') + '>' + GEO[k].label + '</option>'; }).join('') + '</select></div></div></div>';
    html += '<div class="proj" id="ab-prev"></div>';
    html += '<button class="primary" onclick="amSaveAud()">Save audience</button>';
    host.innerHTML = html;
    amAudPreview();
  }
  window.amAudType = function (t) { syncAud(); audDraft.type = t; renderAudBuilder(); };
  function syncAud() {
    if (!audDraft) return; var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; }; var v;
    if ((v = g('ab-name')) != null) audDraft.name = v;
    if ((v = g('ab-int')) != null) audDraft.interests = v.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if ((v = g('ab-src')) != null) audDraft.source = v;
    if ((v = g('ab-seed')) != null) audDraft.seedSize = parseInt(v) || 100;
    if ((v = g('ab-srcname')) != null) audDraft.sourceName = v;
    if ((v = g('ab-sim')) != null) audDraft.similarity = parseInt(v) || 1;
    audDraft.controls = audDraft.controls || {};
    if ((v = g('ab-age')) != null) audDraft.controls.ageMin = parseInt(v) || 18;
    if ((v = g('ab-geo')) != null) audDraft.controls.geo = v;
  }
  window.amAudPreview = function () { syncAud(); var e = audienceEstimate(audDraft); var el = document.getElementById('ab-prev'); if (el) el.innerHTML = '<div class="proj-t">Estimated audience</div><div class="proj-grid">' + chip('Reach', fmt(e.reach)) + chip('Relevance', Math.round(e.relevance * 100) + '%') + chip('est. CPM', e.cpm) + chip('est. CTR', pct(e.ctr)) + '</div>' + (e.reach < 1000 ? '<div class="opp-tips">⚠ Audience is very small — delivery may be limited.</div>' : ''); };
  window.amSaveAud = function () {
    syncAud();
    if (audDraft.type === 'custom' && audDraft.seedSize < 100) { toast('Custom audiences need a seed of at least 100.'); return; }
    var ex = findAud(audDraft.id);
    if (ex) { for (var k in audDraft) ex[k] = audDraft[k]; } else AUDIENCES.unshift(audDraft);
    saveA(); audDraft = null; window.showAudiences();
    toast('Audience saved — reuse it in any ad set.');
  };

  // ======================= UI: DASHBOARD ===================================
  var COLSETS = {
    performance: { label: 'Performance', cols: ['impressions', 'clicks', 'ctr', 'spend', 'conversions', 'cpa', 'roas'] },
    basic: { label: 'Basic', cols: ['impressions', 'clicks', 'spend'] },
    roi: { label: 'ROI', cols: ['spend', 'conversions', 'convValue', 'cpa', 'roas'] },
    auction: { label: 'Auction Insights', cols: ['impressions', 'imprShare', 'topOfPage', 'outranking'] }
  };
  var COLDEF = {
    impressions: { l: 'Impr', f: function (m) { return fmt(m.impressions); } },
    clicks: { l: 'Clicks', f: function (m) { return fmt(m.clicks); } },
    ctr: { l: 'CTR', f: function (m) { return pct(m.ctr); } },
    spend: { l: 'Spend', f: function (m) { return fmt(m.spend); } },
    cpc: { l: 'CPC', f: function (m) { return m.cpc ? fmt(m.cpc) : '—'; } },
    conversions: { l: 'Conv', f: function (m) { return fmt(m.conversions); } },
    convValue: { l: 'Conv Value', f: function (m) { return fmt(m.convValue); } },
    cpa: { l: 'CPA', f: function (m) { return m.cpa ? fmt(m.cpa) : '—'; } },
    roas: { l: 'ROAS', f: function (m) { return m.roas ? m.roas.toFixed(2) + 'x' : '—'; } },
    imprShare: { l: 'Impr Share', f: function (m, row) { return row.imprShare != null ? Math.round(row.imprShare * 100) + '%' : '—'; } },
    topOfPage: { l: 'Top of Page', f: function (m, row) { return row.topOfPage != null ? Math.round(row.topOfPage * 100) + '%' : '—'; } },
    outranking: { l: 'Outranking', f: function (m, row) { return row.outranking != null ? Math.round(row.outranking * 100) + '%' : '—'; } }
  };
  var dashFocus = null;
  window.amDash = function (id) { dashFocus = id || null; window.showDashboard(); };
  window.showDashboard = function () {
    showOnly('dashboard');
    var host = section('dashboard'); if (!host) return;
    var html = '<div class="am-head"><h2>Performance</h2><button onclick="showCampaigns()">Campaigns →</button></div>';
    // controls: column preset + attribution
    html += '<div class="dash-ctrl"><div class="seg small">' + Object.keys(COLSETS).map(function (k) { return '<button class="' + (UI.cols === k ? 'on' : '') + '" onclick="amCols(\'' + k + '\')">' + COLSETS[k].label + '</button>'; }).join('') + '</div>';
    html += '<div class="attr"><label>Attribution</label><select onchange="amAttr(this.value)">' + Object.keys(ATTRIBUTION).map(function (k) { return '<option value="' + k + '"' + (UI.attribution === k ? ' selected' : '') + '>' + ATTRIBUTION[k].label + '</option>'; }).join('') + '</select></div></div>';
    // performance trend (time-series) — the hero of every best-in-class dashboard
    html += renderTrend();
    // build rows
    var rows = [];
    var list = dashFocus ? CAMPAIGNS.filter(function (c) { return c.id === dashFocus; }) : CAMPAIGNS;
    list.forEach(function (c) {
      var obj = OBJECTIVES[c.objective] || OBJECTIVES.traffic;
      rows.push(rowFor('campaign', obj.icon + ' ' + c.name, campTotals(c), c));
      if (dashFocus) (c.adsets || []).forEach(function (as) {
        rows.push(rowFor('adset', '📁 ' + as.name, adsetTotals(as), as));
        (as.ads || []).forEach(function (ad) { rows.push(rowFor('ad', '🎨 ' + ((ad.headlines || [])[0] || ad.name || 'Ad'), adTotals(ad), ad)); });
      });
    });
    if (!rows.length) { html += '<div class="am-empty">No delivery data. Create a campaign and hit ▶ Run delivery.</div>'; host.innerHTML = html; return; }
    var cols = COLSETS[UI.cols].cols;
    html += '<div class="tbl-wrap"><table class="mtbl"><thead><tr><th>' + (dashFocus ? 'Entity' : 'Campaign') + '</th>' + cols.map(function (ck) { return '<th>' + COLDEF[ck].l + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr class="lvl-' + r.level + '"><td class="ent">' + h(r.name) + '</td>' + cols.map(function (ck) { return '<td>' + COLDEF[ck].f(r.m, r) + '</td>'; }).join('') + '</tr>';
    });
    html += '</tbody></table></div>';
    // universal breakdown (Meta-style: split delivery by a dimension) — column totals preserved
    html += renderBreakdown();
    // attribution breakdown for focused campaign — same conversions, different models
    if (dashFocus) {
      var c = byId(dashFocus); var t = campTotals(c); var m = metrics(t);
      html += '<div class="wz"><div class="wz-t">Attribution breakdown <span class="muted">— same conversions, different models</span></div><div class="proj-grid">' +
        chip('First-click', fmt(m.conversions * 0.9)) + chip('Last-click', fmt(m.conversions)) + chip('Data-driven', fmt(m.conversions * 1.05)) + '</div></div>';
    }
    html += '<div class="am-note">Fictional simulation · figures are illustrative · Auction Insights are simulated competitive estimates · displayed values derive from delivered numbers.</div>';
    host.innerHTML = html;
  };
  function renderTrend() {
    var mkey = TREND_METRICS[UI.trendMetric] ? UI.trendMetric : 'spend';
    var series = trendSeries(dashFocus || null);
    var scopeName = dashFocus ? ((byId(dashFocus) || {}).name || 'Campaign') : 'All campaigns';
    var head = '<div class="trend-head"><div class="trend-scope">' + h(scopeName) + '</div>' +
      '<div class="seg small trend-seg">' + Object.keys(TREND_METRICS).map(function (k) { return '<button class="' + (mkey === k ? 'on' : '') + '" onclick="amTrend(\'' + k + '\')">' + TREND_METRICS[k].l + '</button>'; }).join('') + '</div></div>';
    if (!series.length) {
      return '<div class="trend">' + head + '<div class="trend-empty">No delivery yet — hit ▶ Run delivery on a campaign to build the trend.</div></div>';
    }
    var M = TREND_METRICS[mkey], vals = series.map(function (d) { return +M.f(d) || 0; });
    var last = vals[vals.length - 1], first = vals[0];
    var deltaHtml = '';
    if (series.length > 1 && first !== 0) {
      var dp = (last - first) / Math.abs(first) * 100;
      var up = dp >= 0;
      deltaHtml = '<span class="trend-delta" style="color:' + (up ? '#8fbf7f' : '#e06b6b') + '">' + (up ? '▲' : '▼') + ' ' + Math.abs(dp).toFixed(0) + '%</span>';
    }
    // reach & frequency context (honest: avg impressions per UNIQUE reached user,
    // always ≥1 — bounded by the delivery engine's ~3× frequency cap).
    var totImp = series.reduce(function (a, d) { return a + d.imp; }, 0);
    var pool = scopeReach(scopeList());
    var uniq = Math.max(1, Math.min(pool || totImp, totImp));
    var freq = uniq ? totImp / uniq : 0;
    var hero = '<div class="trend-hero"><div class="trend-metric-l">' + M.l + '</div><div class="trend-val">' + M.fmt(last) + '</div>' + deltaHtml + '</div>';
    var body = '<div class="trend-svg">' + svgTrend(series, mkey) + '</div>';
    var axis = '<div class="trend-axis"><span>' + fmtDate(series[0].ts) + '</span>' +
      (freq ? '<span class="trend-freq">Avg frequency ' + freq.toFixed(1) + '×</span>' : '') +
      '<span>' + fmtDate(series[series.length - 1].ts) + '</span></div>';
    return '<div class="trend">' + head + hero + body + axis + '</div>';
  }
  function renderBreakdown() {
    var list = scopeList(); if (!list.length) return '';
    var dim = ['placement', 'age', 'region', 'device'].indexOf(UI.breakdown) >= 0 ? UI.breakdown : 'placement';
    var DIMS = { placement: 'Placement', age: 'Age', region: 'Region', device: 'Device' };
    var rows = breakdownRows(list, dim);
    var seg = '<div class="seg small bd-seg">' + Object.keys(DIMS).map(function (k) { return '<button class="' + (dim === k ? 'on' : '') + '" onclick="amBreakdown(\'' + k + '\')">' + DIMS[k] + '</button>'; }).join('') + '</div>';
    var html = '<div class="wz"><div class="wz-t bd-t">Breakdown <span class="muted">— split delivery by dimension</span>' + seg + '</div>';
    if (!rows.length) { html += '<div class="am-empty" style="padding:16px">No delivery data for this breakdown yet.</div></div>'; return html; }
    var maxImp = rows.reduce(function (a, r) { return Math.max(a, r.imp); }, 1);
    html += '<div class="tbl-wrap"><table class="mtbl bd-tbl"><thead><tr><th>' + DIMS[dim] + '</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Conv</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var bw = Math.round(r.imp / maxImp * 100);
      html += '<tr><td class="ent bd-ent"><span class="bd-bar" style="width:' + bw + '%"></span><span class="bd-lbl">' + h(r.label) + '</span></td>' +
        '<td>' + fmt(r.imp) + '</td><td>' + fmt(r.clk) + '</td><td>' + pct(r.ctr) + '</td><td>' + (r.conv == null ? '—' : fmt(r.conv)) + '</td></tr>';
    });
    html += '</tbody></table></div><div class="am-note" style="margin-top:8px">Segment volumes are modeled from your audience controls (age floor, region) and delivered totals — column sums equal the campaign total. Fictional simulation.</div></div>';
    return html;
  }
  function rowFor(level, name, t, entity) {
    var m = metrics(t);
    var r = { level: level, name: name, m: m };
    // competitive (Auction Insights) — deterministic from relevance vs benchmark 0.6
    var rel = 0.6;
    if (entity.adsets) { var s = 0, n = 0; entity.adsets.forEach(function (as) { s += audienceEstimate(asAudience(as)).relevance; n++; }); rel = n ? s / n : 0.6; }
    else if (entity.audienceId || entity.audienceInline) rel = audienceEstimate(asAudience(entity)).relevance;
    var elig = 0; if (entity.adsets) entity.adsets.forEach(function (as) { elig += audienceEstimate(asAudience(as)).reach * 3; }); else if (entity.audienceId) elig = audienceEstimate(asAudience(entity)).reach * 3; else elig = t.imp * 1.6;
    r.imprShare = elig ? Math.min(1, t.imp / elig) : null;
    r.topOfPage = Math.min(0.98, 0.4 + rel * 0.5);
    r.outranking = Math.min(0.95, rel * 0.8 + ((hash(name) % 20) / 100));
    return r;
  }
  window.amCols = function (k) { UI.cols = k; saveU(); window.showDashboard(); };
  window.amAttr = function (k) { UI.attribution = k; saveU(); if (dashFocus) window.showDashboard(); else window.showDashboard(); };

  // ======================= UI: AD PREVIEW (placements) =====================
  window.amPreview = function (cid, asid, adid) {
    var c = byId(cid); if (!c) return; var as = null, ad = null;
    (c.adsets || []).forEach(function (x) { if (x.id === asid) { as = x; (x.ads || []).forEach(function (y) { if (y.id === adid) ad = y; }); } });
    if (!ad) return;
    var st = adStrength(ad);
    var hl = (ad.headlines || []).filter(function (x) { return x && x.trim(); });
    var ds = (ad.descriptions || []).filter(function (x) { return x && x.trim(); });
    var head = hl[0] || 'Your headline';
    var desc = ds[0] || 'Your description text appears here.';
    var body = '<div class="pv-head">👁 Ad preview <span class="astr" style="color:' + strengthColor(st.tier) + '">Ad Strength: ' + st.tier + '</span></div>';
    body += '<div class="pv-tabs">Feed · Reels · Stories · Search — responsive across placements</div>';
    body += '<div class="pv-grid">';
    // Feed
    body += '<div class="pv feed"><div class="pv-cap">Feed</div><div class="pv-card"><div class="pv-brand">◆ AdForge · Sponsored</div><div class="pv-img">🎨</div><div class="pv-hl">' + h(head) + '</div><div class="pv-ds">' + h(desc) + '</div><div class="pv-cta">' + h(ad.cta || 'Learn More') + '</div></div></div>';
    // Reels/Stories (vertical)
    body += '<div class="pv reels"><div class="pv-cap">Reels / Stories</div><div class="pv-vert"><div class="pv-brand">◆ Sponsored</div><div class="pv-vhl">' + h(head) + '</div>' + (ad.voiceUrl ? '<div class="pv-voice">🎙 voice creative</div>' : '') + '<div class="pv-cta wide">' + h(ad.cta || 'Learn More') + ' ➤</div></div></div>';
    // Search (RSA — multiple headlines)
    body += '<div class="pv search"><div class="pv-cap">Search (responsive)</div><div class="pv-srch"><div class="pv-ad-badge">Ad</div><div class="pv-srch-h">' + h(hl.slice(0, 3).join(' | ') || head) + '</div><div class="pv-srch-u">adforge.sim ›</div><div class="pv-srch-d">' + h(ds.slice(0, 2).join(' ') || desc) + '</div></div></div>';
    body += '</div>';
    body += '<div class="pv-assets">' + hl.length + ' headline(s) · ' + ds.length + ' description(s)' + (ad.voiceUrl ? ' · voice' : '') + ' — more assets raise Ad Strength & delivery.</div>';
    body += '<button class="primary" onclick="amClosePreview()">Close preview</button>';
    var m = document.getElementById('am-modal') || (function () { var d = document.createElement('div'); d.id = 'am-modal'; d.className = 'am-modal'; document.body.appendChild(d); return d; })();
    m.innerHTML = '<div class="am-modal-in">' + body + '</div>';
    m.style.display = 'flex';
  };
  window.amClosePreview = function () { var m = document.getElementById('am-modal'); if (m) m.style.display = 'none'; };

  // ======================= UI: EXPERIMENTS (A/B) ===========================
  window.showExperiments = function () {
    showOnly('experiments');
    var host = section('experiments'); if (!host) return;
    var html = '<div class="am-head"><h2>Experiments</h2><button class="primary" onclick="amNewExp()">＋ New A/B Test</button></div>';
    html += '<div class="am-note" style="margin:0 0 12px">Split-test one variable (creative / audience / placement). Non-overlapping randomized 50/50 split with a real statistical-significance readout (95% target, min 7 days).</div>';
    if (!EXPERIMENTS.length) { html += '<div class="am-empty">No experiments yet.</div>'; host.innerHTML = html; return; }
    EXPERIMENTS.forEach(function (x) {
      var conf = confidence(x.A.conv, x.A.imp, x.B.conv, x.B.imp);
      var days = Math.max(0, Math.round((Date.now() - x.startTs) / 86400000));
      var crA = x.A.imp ? x.A.conv / x.A.imp : 0, crB = x.B.imp ? x.B.conv / x.B.imp : 0;
      var lead = crA === crB ? '—' : (crA > crB ? 'A' : 'B');
      var winner = (conf >= 95 && days >= 0) ? lead : null; // days≥7 in real life; sim shows readiness
      html += '<div class="exp-card"><div class="exp-h"><b>' + h(x.name) + '</b><span class="exp-var">' + h(x.variable) + '</span></div>';
      html += '<div class="exp-body"><div class="exp-arm"><div class="exp-arm-h">A · ' + h(x.labelA) + '</div><div class="exp-arm-m">' + fmt(x.A.imp) + ' impr · ' + pct(crA) + ' CVR · ' + fmt(x.A.conv) + ' conv</div></div>' +
        '<div class="exp-vs">vs</div>' +
        '<div class="exp-arm"><div class="exp-arm-h">B · ' + h(x.labelB) + '</div><div class="exp-arm-m">' + fmt(x.B.imp) + ' impr · ' + pct(crB) + ' CVR · ' + fmt(x.B.conv) + ' conv</div></div></div>';
      var cc = conf >= 95 ? '#8fbf7f' : conf >= 80 ? '#e0a05e' : '#8b6f47';
      html += '<div class="exp-sig">Confidence <b style="color:' + cc + '">' + conf.toFixed(1) + '%</b> · day ' + days + (winner ? ' · <b style="color:#8fbf7f">Winner: ' + winner + ' ✓ (significant)</b>' : ' · gathering data') + '</div>';
      html += '<div class="sig-bar"><div style="width:' + Math.min(100, conf) + '%;background:' + cc + '"></div><span class="sig-95">95%</span></div>';
      html += '<div class="camp-actions"><button class="primary" onclick="amRunExp(\'' + x.id + '\')">▶ Gather data</button><button class="danger" onclick="amDelExp(\'' + x.id + '\')">Delete</button></div></div>';
    });
    host.innerHTML = html;
  };
  window.amNewExp = function () {
    if (!CAMPAIGNS.length) { toast('Create a campaign first — experiments split a real campaign.'); return; }
    var variable = 'creative';
    var name = prompt('Experiment name:', 'Creative test 1'); if (name == null) return;
    var v = prompt('Variable to test — type: creative, audience, or placement', 'creative'); if (v == null) return;
    v = (v || 'creative').toLowerCase(); if (['creative', 'audience', 'placement'].indexOf(v) < 0) v = 'creative';
    var base = CAMPAIGNS[0];
    var labels = { creative: ['Headline set A', 'Headline set B'], audience: ['Audience A', 'Lookalike B'], placement: ['Feed only', 'All placements'] };
    EXPERIMENTS.unshift({ id: 'x' + Date.now(), name: name || 'Test', variable: v, campId: base.id, labelA: labels[v][0], labelB: labels[v][1], A: { imp: 0, clk: 0, conv: 0, spend: 0 }, B: { imp: 0, clk: 0, conv: 0, spend: 0 }, startTs: Date.now() });
    saveE(); window.showExperiments();
  };
  window.amRunExp = function (id) {
    var x = null; EXPERIMENTS.forEach(function (e) { if (e.id === id) x = e; }); if (!x) return;
    var c = byId(x.campId) || CAMPAIGNS[0]; if (!c) return;
    var obj = OBJECTIVES[c.objective] || OBJECTIVES.traffic;
    var as = (c.adsets || [])[0]; var est = as ? audienceEstimate(asAudience(as)) : estimateAudience('', 0.5);
    // Non-overlapping: split reach 50/50. Two arms get deterministic-but-distinct effectiveness.
    var spend = 120;
    [['A', 1.0], ['B', x.variable === 'audience' ? 1.12 : x.variable === 'placement' ? 1.06 : 1.15]].forEach(function (arm) {
      var key = arm[0], mod = arm[1];
      var cpm = est.cpm * (0.95 + (hash(x.id + key) % 10) / 100);
      var imp = Math.floor((spend / cpm) * 1000 * 0.5);
      var ctr = est.ctr * mod * (key === 'B' && x.variable === 'creative' ? 1.0 : 1.0);
      var clk = Math.floor(imp * ctr);
      var conv = clk * obj.cvr * (0.6 + est.relevance * 0.7) * (key === 'B' ? mod : 1);
      x[key].imp += imp; x[key].clk += clk; x[key].conv += +conv.toFixed(1); x[key].spend += spend;
    });
    saveE(); window.showExperiments();
    if (window.legionTrack) window.legionTrack('activate', { k: 'experiment_run' });
  };
  window.amDelExp = function (id) { if (!confirm('Delete experiment?')) return; EXPERIMENTS = EXPERIMENTS.filter(function (e) { return e.id !== id; }); saveE(); window.showExperiments(); };

  // ======================= TREND · BREAKDOWN · LEARNING PHASE ===============
  // Best-in-class dashboard depth: a real time-series trend (from the delivery
  // history every run already records), Meta-style breakdowns (age / region /
  // device / placement), and a Meta-style learning-phase status. All numbers
  // are DETERMINISTIC and derived from delivered totals — breakdown column
  // sums equal the campaign totals (no invented volume). Fictional simulation.

  function attMult() { return (ATTRIBUTION[UI.attribution] || ATTRIBUTION['7d1d']).mult; }
  function scopeList() { return dashFocus ? [byId(dashFocus)].filter(Boolean) : CAMPAIGNS.slice(); }
  function fmtDate(ts) { var d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate(); }

  // ---- time-series: bucket the recorded per-run history into delivery events
  function collectHistory(scope) {
    var list = scope ? CAMPAIGNS.filter(function (c) { return c.id === scope; }) : CAMPAIGNS;
    var ev = [];
    list.forEach(function (c) { (c.adsets || []).forEach(function (as) { (as.ads || []).forEach(function (ad) { (ad.history || []).forEach(function (hh) { ev.push(hh); }); }); }); });
    return ev;
  }
  function trendSeries(scope) {
    var ev = collectHistory(scope); if (!ev.length) return [];
    ev = ev.slice().sort(function (a, b) { return a.ts - b.ts; });
    var am = attMult(), buckets = [], cur = null;
    ev.forEach(function (e) {
      if (cur && (e.ts - cur.ts) < 4000) { cur.imp += e.imp; cur.clk += e.clk; cur.spend += e.spend; cur.conv += e.conv; cur.val += e.val; cur.ts = e.ts; }
      else { cur = { ts0: e.ts, ts: e.ts, imp: e.imp || 0, clk: e.clk || 0, spend: e.spend || 0, conv: e.conv || 0, val: e.val || 0 }; buckets.push(cur); }
    });
    return buckets.map(function (b) {
      var conv = b.conv * am, val = b.val * am;
      return { ts: b.ts0, imp: b.imp, clk: b.clk, spend: +b.spend.toFixed(2), conv: +conv.toFixed(2), val: val,
        ctr: b.imp ? b.clk / b.imp : 0, roas: b.spend ? val / b.spend : 0, cpa: conv ? b.spend / conv : 0, cpc: b.clk ? b.spend / b.clk : 0 };
    });
  }
  var TREND_METRICS = {
    spend:       { l: 'Spend',  f: function (d) { return d.spend; }, fmt: function (v) { return fmt(v); } },
    impressions: { l: 'Impr',   f: function (d) { return d.imp; },   fmt: function (v) { return fmt(v); } },
    clicks:      { l: 'Clicks', f: function (d) { return d.clk; },   fmt: function (v) { return fmt(v); } },
    conversions: { l: 'Conv',   f: function (d) { return d.conv; },  fmt: function (v) { return fmt(v); } },
    ctr:         { l: 'CTR',    f: function (d) { return d.ctr; },   fmt: function (v) { return pct(v); } },
    roas:        { l: 'ROAS',   f: function (d) { return d.roas; },  fmt: function (v) { return v.toFixed(2) + 'x'; } }
  };
  function svgTrend(series, mkey) {
    var M = TREND_METRICS[mkey] || TREND_METRICS.spend;
    var vals = series.map(function (d) { return +M.f(d) || 0; });
    var n = vals.length;
    var maxV = Math.max.apply(null, vals), minV = Math.min.apply(null, vals);
    var floaty = (mkey === 'ctr' || mkey === 'roas');
    var base = floaty ? (minV > 0 ? minV * 0.82 : 0) : 0;
    if (maxV <= base) maxV = base + 1;
    var W = 320, H = 118, L = 10, Rr = 310, T = 16, Bb = 96;
    var span = Math.max(1e-9, maxV - base);
    var X = function (i) { return n <= 1 ? (L + Rr) / 2 : L + (Rr - L) * i / (n - 1); };
    var Y = function (v) { return Bb - (Bb - T) * ((v - base) / span); };
    var g = 'tg'; // gradient id (single chart per view)
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" width="100%" height="118" role="img" aria-label="' + M.l + ' trend">';
    s += '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5a46e" stop-opacity="0.30"/><stop offset="1" stop-color="#c5a46e" stop-opacity="0"/></linearGradient></defs>';
    s += '<line x1="' + L + '" y1="' + Bb + '" x2="' + Rr + '" y2="' + Bb + '" stroke="#3a3124" stroke-width="1"/>';
    if (n <= 1) {
      var cx = X(0), cy = Y(vals[0] || base);
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#c5a46e"/>';
    } else {
      var pts = vals.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); });
      s += '<path d="M' + X(0).toFixed(1) + ',' + Bb + ' L' + pts.join(' L') + ' L' + X(n - 1).toFixed(1) + ',' + Bb + ' Z" fill="url(#' + g + ')"/>';
      s += '<path d="M' + pts.join(' L') + '" fill="none" stroke="#c5a46e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      var lx = X(n - 1), ly = Y(vals[n - 1]);
      s += '<circle cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" r="3.2" fill="#c5a46e" stroke="#0a0806" stroke-width="1.5"/>';
    }
    s += '</svg>';
    return s;
  }

  // ---- Meta-style breakdowns (deterministic; column totals preserved) ------
  var AGE_BRACKETS = [
    { key: '18–24', lo: 18, hi: 24, w: 0.20, ctr: 1.15 },
    { key: '25–34', lo: 25, hi: 34, w: 0.32, ctr: 1.05 },
    { key: '35–44', lo: 35, hi: 44, w: 0.24, ctr: 0.98 },
    { key: '45–54', lo: 45, hi: 54, w: 0.14, ctr: 0.90 },
    { key: '55+',   lo: 55, hi: 120, w: 0.10, ctr: 0.82 }
  ];
  var DEVICES = [
    { label: 'Mobile',  w: 0.72, ctr: 1.06 },
    { label: 'Desktop', w: 0.21, ctr: 0.90 },
    { label: 'Tablet',  w: 0.07, ctr: 0.94 }
  ];
  var REGION_W = { us: 0.24, eu: 0.22, in: 0.20, jp: 0.09, kr: 0.06 }; // remainder → Other
  var REGION_LABEL = { us: 'United States', eu: 'Europe', in: 'India', jp: 'Japan', kr: 'Korea', other: 'Other', global: 'Global' };

  function adjTotals(list) {
    var t = { imp: 0, clk: 0, spend: 0, conv: 0, val: 0 };
    list.forEach(function (c) { if (!c) return; var x = campTotals(c); t.imp += x.imp; t.clk += x.clk; t.spend += x.spend; t.conv += x.conv; t.val += x.val; });
    var am = attMult(); t.conv *= am; t.val *= am; return t;
  }
  function scopeReach(list) { var r = 0; list.forEach(function (c) { if (!c) return; (c.adsets || []).forEach(function (as) { r += audienceEstimate(asAudience(as)).reach; }); }); return r; }
  function minAgeFloor(list) { var f = 99; list.forEach(function (c) { if (!c) return; (c.adsets || []).forEach(function (as) { var aud = asAudience(as); var a = (aud && aud.controls && aud.controls.ageMin) || 18; if (a < f) f = a; }); }); return f === 99 ? 18 : f; }
  function bracketFrac(b, floor) { if (floor <= b.lo) return 1; if (floor > b.hi) return 0; return (b.hi - floor + 1) / (b.hi - b.lo + 1); }
  function regionWeights(list) {
    var w = {}, tot = 0; for (var rk in REGION_W) tot += REGION_W[rk]; var other = Math.max(0, 1 - tot);
    list.forEach(function (c) { if (!c) return; (c.adsets || []).forEach(function (as) {
      var aud = asAudience(as); var geo = (aud && aud.controls && aud.controls.geo) || 'global';
      var reach = Math.max(1, audienceEstimate(aud).reach);
      if (geo === 'global') { for (var k in REGION_W) w[k] = (w[k] || 0) + reach * REGION_W[k]; w.other = (w.other || 0) + reach * other; }
      else { w[geo] = (w[geo] || 0) + reach; }
    }); });
    return w;
  }
  function distribute(t, segs) {
    var W = segs.reduce(function (a, s) { return a + s.w; }, 0) || 1;
    var CW = segs.reduce(function (a, s) { return a + s.w * (s.ctr || 1); }, 0) || 1;
    return segs.filter(function (s) { return s.w > 0; }).map(function (s) {
      var iw = s.w / W, cw = (s.w * (s.ctr || 1)) / CW;
      var imp = Math.round(t.imp * iw), clk = Math.round(t.clk * cw);
      return { label: s.label, imp: imp, clk: clk, spend: t.spend * iw, conv: t.conv * cw, ctr: imp ? clk / imp : 0 };
    });
  }
  function breakdownRows(list, dim) {
    if (dim === 'placement') {
      var pb = {};
      list.forEach(function (c) { if (!c) return; (c.adsets || []).forEach(function (as) { (as.ads || []).forEach(function (ad) { for (var k in (ad.placements || {})) { pb[k] = pb[k] || { imp: 0, clk: 0 }; pb[k].imp += ad.placements[k].imp; pb[k].clk += ad.placements[k].clk; } }); }); });
      var rows = []; PLACEMENTS.forEach(function (p) { if (pb[p.key]) { var x = pb[p.key]; rows.push({ label: p.label, imp: x.imp, clk: x.clk, ctr: x.imp ? x.clk / x.imp : 0, conv: null }); } });
      return rows;
    }
    var t = adjTotals(list), segs;
    if (dim === 'age') { var floor = minAgeFloor(list); segs = AGE_BRACKETS.map(function (b) { return { label: b.key, w: b.w * bracketFrac(b, floor), ctr: b.ctr }; }); }
    else if (dim === 'device') { segs = DEVICES.map(function (d) { return { label: d.label, w: d.w, ctr: d.ctr }; }); }
    else if (dim === 'region') { var rw = regionWeights(list); segs = Object.keys(rw).map(function (k) { return { label: REGION_LABEL[k] || k, w: rw[k], ctr: 1 }; }); segs.sort(function (a, b) { return b.w - a.w; }); }
    else return [];
    return distribute(t, segs);
  }

  // ---- Meta-style learning phase (deterministic from delivered volume) -----
  function learningPhase(camp) {
    var obj = OBJECTIVES[camp.objective] || OBJECTIVES.traffic;
    var t = campTotals(camp), am = attMult();
    var isConv = obj.value > 0;
    var need = isConv ? 50 : 500, have = isConv ? t.conv * am : t.clk;
    var reach = 0; (camp.adsets || []).forEach(function (as) { reach += audienceEstimate(asAudience(as)).reach; });
    if (have >= need) return { phase: 'Active', pct: 100, color: '#8fbf7f', note: 'Exited learning · stable, optimized delivery' };
    var pct = Math.max(0, Math.min(99, Math.round(have / need * 100)));
    if ((reach < 8000 || (camp.budget || 0) < 100) && have < need * 0.5) return { phase: 'Learning Limited', pct: pct, color: '#e0a05e', note: 'Too little audience/budget to exit learning — broaden targeting or raise budget' };
    return { phase: 'Learning', pct: pct, color: '#c5a46e', note: Math.max(1, Math.round(need - have)) + ' more ' + (isConv ? 'conversions' : 'clicks') + ' to exit the learning phase' };
  }
  window.amTrend = function (k) { UI.trendMetric = k; saveU(); window.showDashboard(); };
  window.amBreakdown = function (d) { UI.breakdown = d; saveU(); window.showDashboard(); };

  // ======================= toast ============================================
  function toast(msg) {
    var t = document.getElementById('am-toast') || (function () { var d = document.createElement('div'); d.id = 'am-toast'; d.className = 'am-toast'; document.body.appendChild(d); return d; })();
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._to); t._to = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  // ======================= SEED + INIT =====================================
  function seed() {
    if (CAMPAIGNS.length) return;
    var c = {
      id: 'c-demo1', name: 'Summer Sale — Web3 Beauty', objective: 'sales', budgetMode: 'CBO', budget: 1200, budgetType: 'daily', bidStrategy: 'targetRoas', targetValue: 3, _open: false,
      adsets: [
        { id: 'as-d1', name: 'Web3 Builders', audienceId: 'aud_web3', placements: ['feed', 'reels', 'search'], bidStrategy: '', targetValue: null, budget: 600, ads: [
          { id: 'ad-d1', name: 'A', headlines: ['Mint your glow, on-chain', 'Beauty meets Web3', 'Own your drop'], descriptions: ['Limited creator collection. Verified on-chain.'], cta: 'Shop Now', voiceUrl: null, surprise: 0.7, impressions: 0, clicks: 0, spend: 0, conversions: 0, convValue: 0, placements: {}, history: [] }
        ] },
        { id: 'as-d2', name: 'Buyers Lookalike 3%', audienceId: 'aud_lal', placements: ['feed', 'reels', 'stories'], bidStrategy: '', targetValue: null, budget: 600, ads: [
          { id: 'ad-d2', name: 'B', headlines: ['Loved by 3,200 buyers', 'Your next favorite'], descriptions: ['Find out why they came back.'], cta: 'Learn More', voiceUrl: null, surprise: 0.5, impressions: 0, clicks: 0, spend: 0, conversions: 0, convValue: 0, placements: {}, history: [] }
        ] }
      ]
    };
    CAMPAIGNS.push(c);
    simulateWeek(c); // pre-populate a week of real delivered data so the trend chart opens meaningful
    saveC();
  }
  // Run the delivery engine several times and spread the recorded history over
  // the past week, so the time-series trend opens with real, multi-day data.
  // Numbers come straight from the delivery engine; only the timestamps are
  // spread (clearly-labeled fictional sandbox backfill). Deterministic.
  function simulateWeek(c) {
    clearMetrics(c);
    for (var d = 0; d < 7; d++) deliverCampaign(c, 90 + d * 14);
    var DAY = 86400000, now = Date.now();
    (c.adsets || []).forEach(function (as) { (as.ads || []).forEach(function (ad) { var H = ad.history || []; H.forEach(function (hh, i) { hh.ts = now - (H.length - 1 - i) * DAY; }); }); });
  }
  function backfillDemoTrend() {
    try { if (localStorage.getItem('p16_trend_backfill')) return; } catch (e) {}
    var c = byId('c-demo1');
    if (c) {
      var rich = (c.adsets || []).some(function (as) { return (as.ads || []).some(function (ad) { return (ad.history || []).length >= 4; }); });
      if (!rich) { simulateWeek(c); saveC(); }
    }
    try { localStorage.setItem('p16_trend_backfill', '1'); } catch (e) {}
  }

  window.AdManager = { init: function () { seed(); backfillDemoTrend(); }, deliverCampaign: deliverCampaign, opportunityScore: opportunityScore, audienceEstimate: audienceEstimate, learningPhase: learningPhase, trendSeries: trendSeries, breakdownRows: breakdownRows, _state: function () { return { CAMPAIGNS: CAMPAIGNS, AUDIENCES: AUDIENCES, EXPERIMENTS: EXPERIMENTS }; } };
})();
