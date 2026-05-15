/* ════════════════════════════════════════
   VAULT · HAFİZA
   ════════════════════════════════════════ */
let isVaultOpen = false;

function vMdLite(raw) {
  return raw
    .replace(/^## (.+)$/gm, '<span class="md-h2">## $1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<span class="md-bold">$1</span>')
    .replace(/^- (.+)$/gm, '<span class="md-li">· $1</span>');
}

function vFmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', {day:'2-digit',month:'short',year:'numeric'})
       + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
}

function vTypeBadge(entry_type) {
  if (entry_type === 'core') return 'core';
  if (entry_type === 'daily_summary') return 'daily';
  return 'memory';
}

function vTypeLabel(entry_type) {
  if (entry_type === 'core') return 'CORE';
  if (entry_type === 'daily_summary') return 'DAILY';
  return 'MEMORY';
}

function renderVaultList(entries) {
  const list = document.getElementById('vaultList');
  list.innerHTML = '';
  if (!entries || !entries.length) {
    list.innerHTML = '<div style="font-family:JetBrains Mono,monospace;font-size:10px;color:var(--dim);padding:20px;text-align:center;">kayıt yok</div>';
    return;
  }
  entries.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'v-card';
    const badge = vTypeBadge(entry.entry_type);
    const label = vTypeLabel(entry.entry_type);
    card.innerHTML = `
      <div class="v-card-hd">
        <span class="v-type ${badge}">${label}</span>
        <span class="v-key">${entry.key}</span>
        <span class="v-date">${vFmtDate(entry.updated_at)}</span>
        <span class="v-chevron">▼</span>
      </div>
      <div class="v-card-body">
        <div class="v-content">${vMdLite(entry.value||'')}</div>
      </div>`;
    card.querySelector('.v-card-hd').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
    if (entry.entry_type === 'core') card.classList.add('expanded');
    list.appendChild(card);
  });
}

function renderScout(summary) {
  const by = summary.by_status || {};
  document.getElementById('sc-active').textContent   = by.active   || 0;
  document.getElementById('sc-passive').textContent  = by.passive  || 0;
  document.getElementById('sc-archived').textContent = by.archived || 0;
  document.getElementById('vaultBadge').textContent  = `SCOUT · ${summary.total || 0} KAYIT`;
  document.getElementById('scoutMeta').innerHTML =
    `<strong>toplam:</strong> ${summary.total || 0}<br>` +
    `<strong>son güncelleme:</strong><br>${vFmtDate(summary.last_update)}`;
}

async function fetchVault() {
  try {
    const [memResp, scoutResp] = await Promise.all([
      fetch(`${SOUL_API}/api/memory`, {signal: AbortSignal.timeout(6000)}),
      fetch(`${SOUL_API}/api/scout/summary`, {signal: AbortSignal.timeout(6000)})
    ]);
    const entries = memResp.ok  ? await memResp.json()  : [];
    const scout   = scoutResp.ok? await scoutResp.json(): {total:0,by_status:{}};
    return {entries, scout};
  } catch(e) {
    return {entries:[], scout:{total:0,by_status:{},last_update:null}};
  }
}

function openVault() {
  window.warpOpen(async () => {
    document.getElementById('vaultOverlay').classList.add('open');
    isVaultOpen = true;
    const {entries, scout} = await fetchVault();
    document.getElementById('vaultMeta').textContent =
      `${entries.length} kayıt · /api/memory + /api/scout/summary`;
    renderVaultList(entries);
    renderScout(scout);
  });
}

function closeVault() {
  window.warpClose(() => {
    document.getElementById('vaultOverlay').classList.remove('open');
    isVaultOpen = false;
  });
}

function initVault() {
  document.getElementById('vaultBackBtn').addEventListener('click', closeVault);
}

// === Export to window for cross-module access ===
window.isVaultOpen = false;
window.closeVault = closeVault;

const _origOpenVault = openVault;
openVault = function() { _origOpenVault(); window.isVaultOpen = isVaultOpen; };
const _origCloseVault = closeVault;
closeVault = function() { _origCloseVault(); window.isVaultOpen = isVaultOpen; };
window.closeVault = closeVault;
window.initVault = initVault;
