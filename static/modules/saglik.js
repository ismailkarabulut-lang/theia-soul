/* ════════════════════════════════════════
   SAĞLIK ENGINE
   ════════════════════════════════════════ */
let isSaglikOpen = false;

const sgHistory = {};

const SG_SERVICES_DEFAULT = [
  { id:'soul',     name:'Soul API',      desc:'ana agent · chat · memory',  endpoint:'/api/health' },
  { id:'claude',   name:'Claude API',    desc:'LLM · Anthropic',            endpoint:null },
  { id:'deepseek', name:'DeepSeek API',  desc:'LLM · deepseek-chat',        endpoint:null },
  { id:'memory',   name:'Memory · FTS',  desc:'hafıza · full-text search',  endpoint:'/api/memory' },
  { id:'scout',    name:'Scout · Decay', desc:'decay engine · summary',     endpoint:'/api/scout/summary' },
  { id:'persona',  name:'Persona',       desc:'snapshot · analytics',       endpoint:'/api/persona/snapshot?window=all' },
];

function sgStatusClass(status) {
  if (status === 'ok')   return 'ok';
  if (status === 'warn') return 'warn';
  if (status === 'err')  return 'err';
  return 'chk';
}
function sgStatusLabel(status) {
  if (status === 'ok')   return 'ONLINE';
  if (status === 'warn') return 'DEGRADED';
  if (status === 'err')  return 'OFFLINE';
  return 'KONTROL...';
}
function sgLatencyColor(ms) {
  if (ms === null) return 'chk';
  if (ms < 300)  return 'ok';
  if (ms < 1000) return 'warn';
  return 'err';
}

async function fetchSaglik() {
  const results = [];

  let healthData = null;
  try {
    const t0 = Date.now();
    const r = await fetch(`${SOUL_API}/api/health`, { signal: AbortSignal.timeout(5000) });
    const ms = Date.now() - t0;
    if (r.ok) {
      healthData = await r.json();
      healthData._latency = ms;
    }
  } catch(e) { /* timeout veya bağlantı yok */ }

  const services = (healthData && Array.isArray(healthData.services))
    ? healthData.services
    : null;

  if (services) {
    services.forEach(svc => {
      results.push({
        id:      svc.id || svc.name,
        name:    svc.name,
        desc:    svc.description || svc.desc || '',
        status:  svc.status === 'healthy' ? 'ok' : svc.status === 'degraded' ? 'warn' : 'err',
        latency: svc.latency_ms ?? svc.latency ?? null,
      });
    });
    const soulEntry = results.find(r => r.id === 'soul' || r.name?.toLowerCase().includes('soul'));
    if (soulEntry) soulEntry.latency = healthData._latency;
  } else {
    await Promise.all(SG_SERVICES_DEFAULT.map(async svc => {
      if (!svc.endpoint) {
        results.push({ id:svc.id, name:svc.name, desc:svc.desc, status:'chk', latency:null });
        return;
      }
      try {
        const t0 = Date.now();
        const r = await fetch(`${SOUL_API}${svc.endpoint}`, { signal: AbortSignal.timeout(4000) });
        const ms = Date.now() - t0;
        results.push({
          id: svc.id, name: svc.name, desc: svc.desc,
          status:  r.ok ? (ms > 1000 ? 'warn' : 'ok') : 'err',
          latency: ms,
        });
      } catch(e) {
        results.push({ id:svc.id, name:svc.name, desc:svc.desc, status:'err', latency:null });
      }
    }));
    results.sort((a,b) => {
      const ai = SG_SERVICES_DEFAULT.findIndex(s=>s.id===a.id);
      const bi = SG_SERVICES_DEFAULT.findIndex(s=>s.id===b.id);
      return ai - bi;
    });
  }

  return { results, ts: Date.now() };
}

function renderSgServices(results) {
  const list = document.getElementById('sgServiceList');
  list.innerHTML = '';
  results.forEach(svc => {
    const st = sgStatusClass(svc.status);
    const lc = sgLatencyColor(svc.latency);
    const latTxt = svc.latency !== null ? `${svc.latency}ms` : '—';
    const card = document.createElement('div');
    card.className = `sg-svc-card ${st}`;
    card.innerHTML = `
      <div class="sg-svc-dot ${st}"></div>
      <div>
        <div class="sg-svc-name">${esc(svc.name)}</div>
        <div class="sg-svc-desc">${esc(svc.desc)}</div>
      </div>
      <div class="sg-svc-latency ${lc}">${latTxt}</div>
      <div class="sg-svc-badge ${st}">${sgStatusLabel(svc.status)}</div>`;
    list.appendChild(card);
  });
}

function renderSgStats(results) {
  const total = results.length;
  const ok   = results.filter(r=>r.status==='ok').length;
  const warn = results.filter(r=>r.status==='warn').length;
  const err  = results.filter(r=>r.status==='err').length;

  document.getElementById('sg-total').textContent = total;
  document.getElementById('sg-ok').textContent    = ok;
  document.getElementById('sg-warn').textContent  = warn;
  document.getElementById('sg-err').textContent   = err;

  document.getElementById('sg-warn').closest('.sg-stat').style.setProperty('--sc', warn > 0 ? 'var(--orange)' : 'var(--dim)');
  document.getElementById('sg-err').closest('.sg-stat').style.setProperty('--sc',  err  > 0 ? 'var(--red)'    : 'var(--dim)');

  const badge = document.getElementById('saglikBadge');
  if (err > 0) {
    badge.textContent = `● ${err} HATA`; badge.style.color='var(--red)'; badge.style.borderColor='rgba(232,93,36,0.35)';
  } else if (warn > 0) {
    badge.textContent = `● ${warn} UYARI`; badge.style.color='var(--orange)'; badge.style.borderColor='rgba(239,159,39,0.35)';
  } else {
    badge.textContent = `● TÜM SİSTEMLER NORMAL`; badge.style.color='var(--green)'; badge.style.borderColor='rgba(29,158,117,0.35)';
  }
}

function renderSgSpark(results) {
  results.forEach(svc => {
    if (!sgHistory[svc.id]) sgHistory[svc.id] = [];
    sgHistory[svc.id].push(svc.latency);
    if (sgHistory[svc.id].length > 10) sgHistory[svc.id].shift();
  });

  const wrap = document.getElementById('sgSparkWrap');
  wrap.innerHTML = '';

  const measurable = results.filter(r => r.latency !== null || (sgHistory[r.id] && sgHistory[r.id].some(v=>v!==null)));
  if (!measurable.length) {
    wrap.innerHTML = '<div style="font-family:JetBrains Mono,monospace;font-size:10px;color:var(--dim);text-align:center;padding:10px;">ölçüm yok</div>';
    return;
  }

  measurable.forEach(svc => {
    const hist = (sgHistory[svc.id] || []).filter(v => v !== null);
    if (!hist.length) return;
    const maxV = Math.max(...hist, 1);
    const lc = sgLatencyColor(svc.latency);
    const colMap = { ok:'var(--green)', warn:'var(--orange)', err:'var(--red)', chk:'var(--dim)' };
    const col = colMap[lc] || 'var(--dim)';

    const row = document.createElement('div');
    row.className = 'sg-spark-row';
    const bars = hist.map(v => {
      const h = Math.max(Math.round((v/maxV)*32), 3);
      const bc = colMap[sgLatencyColor(v)];
      return `<div class="sg-spark-bar" style="height:${h}px;background:${bc};opacity:0.75;"></div>`;
    }).join('');
    row.innerHTML = `
      <div class="sg-spark-lbl">${esc(svc.name)}</div>
      <div class="sg-spark-bars">${bars}</div>
      <div class="sg-spark-val" style="color:${col};">${svc.latency ?? '—'}ms</div>`;
    wrap.appendChild(row);
  });
}

async function loadSaglik() {
  const refBtn = document.getElementById('saglikRefresh');
  const meta   = document.getElementById('saglikMeta');
  refBtn.classList.add('spinning');
  meta.textContent = 'kontrol ediliyor...';
  document.getElementById('saglikBadge').textContent = '● KONTROL...';

  const { results, ts } = await fetchSaglik();

  renderSgStats(results);
  renderSgServices(results);
  renderSgSpark(results);

  const t = new Date(ts);
  meta.textContent = `son güncelleme: ${t.toLocaleTimeString('tr-TR')} · ${results.length} servis`;
  refBtn.classList.remove('spinning');
  gkLog('LOW', `Sağlık: ${results.filter(r=>r.status==='ok').length}/${results.length} ok`);
}

function openSaglik() {
  window.warpOpen(() => {
    document.getElementById('saglikOverlay').classList.add('open');
    isSaglikOpen = true;
    loadSaglik();
  });
}

function closeSaglik() {
  window.warpClose(() => {
    document.getElementById('saglikOverlay').classList.remove('open');
    isSaglikOpen = false;
  });
}

function initSaglik() {
  document.getElementById('saglikBackBtn').addEventListener('click', closeSaglik);
  document.getElementById('saglikRefresh').addEventListener('click', loadSaglik);
}

// === Export to window for cross-module access ===
window.isSaglikOpen = false;
window.closeSaglik = closeSaglik;

const _origOpenSaglik = openSaglik;
openSaglik = function() { _origOpenSaglik(); window.isSaglikOpen = isSaglikOpen; };
const _origCloseSaglik = closeSaglik;
closeSaglik = function() { _origCloseSaglik(); window.isSaglikOpen = isSaglikOpen; };
window.closeSaglik = closeSaglik;
window.initSaglik = initSaglik;
