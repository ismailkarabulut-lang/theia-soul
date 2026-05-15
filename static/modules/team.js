/* ════════════════════════════════════════
   TEAM · BİLİŞSEL MERCEK
   ════════════════════════════════════════ */
let isTeamOpen = false;

const TEAM_AGENTS = [
  { id:'mimar',     glyph:'🏗', name:'MİMAR',     role:'yapısal iç görü',     color:'#4FA8D5' },
  { id:'tarihci',   glyph:'📜', name:'TARİHÇİ',   role:'zamansal iç görü',    color:'#C77DFF' },
  { id:'antitez',   glyph:'⚡', name:'ANTİTEZ',   role:'pragmatik iç görü',   color:'#E85D24' },
  { id:'toplumcu',  glyph:'👥', name:'TOPLUMCU',  role:'toplumsal dış görü',  color:'#1D9E75' },
  { id:'stratejist',glyph:'♟', name:'STRATEJİST',role:'stratejik dış görü',  color:'#2DD4BF' },
];

let teamHistory = JSON.parse(localStorage.getItem('theia_team_history') || '[]');

function renderTeamAgents(analysis) {
  const grid = document.getElementById('teamAgentsGrid');
  grid.innerHTML = '';

  TEAM_AGENTS.forEach(agent => {
    const card = document.createElement('div');
    card.className = 'team-agent-card';
    card.dataset.agent = agent.id;
    card.innerHTML = `
      <div class="team-agent-glyph">${agent.glyph}</div>
      <div class="team-agent-name">${agent.name}</div>
      <div class="team-agent-role">${agent.role}</div>
      <div class="team-agent-snippet">${analysis?.[agent.id] || 'Henüz analiz yok.'}</div>
      <div class="team-agent-expand">DETAY ↗</div>
    `;
    card.addEventListener('click', () => {
      toast(`${agent.glyph} ${agent.name} — detay yakında`, agent.color);
    });
    grid.appendChild(card);
  });
}

function renderTeamSec(analysis) {
  const content = document.getElementById('teamSecContent');
  if (!analysis || !analysis.sekreter) {
    content.innerHTML = '<div class="team-empty">Henüz 🎯 prefix analizi yok.<br>Bir mesaja 🎯 ekleyerek başlat.</div>';
    return;
  }

  const s = analysis.sekreter;
  const items = [
    ['konsensus', s.konsensus],
    ['ana ayrışma', s.ana_ayrisma],
    ['görünmeyen risk', s.gorunmeyen_risk],
    ['ucuz test', s.ucuz_test],
    ['karar tipi', s.karar_tipi],
    ['ertelenen konu', s.ertelenen_konu],
    ['açık soru', s.acik_soru],
    ['sonraki adım', s.sonraki_adim],
  ];

  content.innerHTML = items.map(([k,v]) => v ? `
    <div class="team-sec-item">
      <div class="team-sec-key">${k}</div>
      <div class="team-sec-val">${esc(v)}</div>
    </div>
  ` : '').join('');
}

function renderTeamTrig() {
  const list = document.getElementById('teamTrigList');
  if (!teamHistory.length) {
    list.innerHTML = '<div class="team-trig-empty">· kayıt yok ·</div>';
    return;
  }
  list.innerHTML = teamHistory.slice(0,10).map(h => `
    <div class="team-trig-item" onclick="loadTeamAnalysis('${h.id}')">
      <div class="team-trig-dot"></div>
      <div class="team-trig-text">${esc(h.trigger)}</div>
      <div class="team-trig-time">${fmtT(new Date(h.ts))}</div>
    </div>
  `).join('');
}

function loadTeamAnalysis(id) {
  const h = teamHistory.find(x => x.id === id);
  if (!h) return;
  renderTeamSec(h.analysis);
  renderTeamAgents(h.analysis);
  document.getElementById('teamMeta').textContent = `v1.0 · ${fmtT(new Date(h.ts))} · ${h.model || curModel}`;
}

async function fetchTeamAnalysis(triggerText) {
  try {
    const resp = await fetch(`${SOUL_API}/api/team/analyze`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({message: triggerText, session_id: sesId, model: curModel}),
      signal: AbortSignal.timeout(45000)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } catch(e) {
    gkLog('WARN', 'TEAM API: ' + e.message);
    return null;
  }
}

// 🎯 prefix handler — sendMsg'e entegre
function handleTeamPrefix(text) {
  if (!text.startsWith('🎯')) return false;
  const q = text.slice(1).trim();
  if (!q) return false;

  // Arka planda TEAM analizi başlat
  fetchTeamAnalysis(q).then(analysis => {
    if (!analysis) return;
    const entry = {
      id: 'TEAM_' + Date.now(),
      ts: Date.now(),
      trigger: q,
      model: curModel,
      analysis: analysis
    };
    teamHistory.unshift(entry);
    teamHistory = teamHistory.slice(0, 50);
    localStorage.setItem('theia_team_history', JSON.stringify(teamHistory));

    // Eğer modül açıksa güncelle
    if (isTeamOpen) {
      renderTeamSec(analysis);
      renderTeamAgents(analysis);
      renderTeamTrig();
      document.getElementById('teamMeta').textContent = `v1.0 · ${fmtT(new Date())} · ${curModel}`;
    }
    gkLog('LOW', `TEAM analizi tamamlandı: ${q.slice(0,40)}`);
  });

  return true; // Normal chat akışına devam et, analiz arka planda
}

function openTeam() {
  window.warpOpen(() => {
    document.getElementById('teamOverlay').classList.add('open');
    isTeamOpen = true;

    // Son analizi göster veya boş durum
    if (teamHistory.length) {
      loadTeamAnalysis(teamHistory[0].id);
    } else {
      renderTeamSec(null);
      renderTeamAgents(null);
    }
    renderTeamTrig();
    document.getElementById('teamMeta').textContent = teamHistory.length
      ? `v1.0 · ${fmtT(new Date(teamHistory[0].ts))} · ${teamHistory[0].model || curModel}`
      : 'v1.0 · son güncelleme: —';
  });
}

function closeTeam() {
  window.warpClose(() => {
    document.getElementById('teamOverlay').classList.remove('open');
    isTeamOpen = false;
  });
}

function initTeam() {
  document.getElementById('teamBackBtn').addEventListener('click', closeTeam);
  // İlk render — boş kartlar
  renderTeamAgents(null);
}

// === Export to window for cross-module access ===
window.isTeamOpen = false;
window.closeTeam = closeTeam;
window.handleTeamPrefix = handleTeamPrefix;

const _origOpenTeam = openTeam;
openTeam = function() { _origOpenTeam(); window.isTeamOpen = isTeamOpen; };
const _origCloseTeam = closeTeam;
closeTeam = function() { _origCloseTeam(); window.isTeamOpen = isTeamOpen; };
window.closeTeam = closeTeam;
window.initTeam = initTeam;
