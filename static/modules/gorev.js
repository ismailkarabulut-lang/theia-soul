/* ══ GÖREV MOD ══ */
(function(){
const s=document.createElement('style');
s.textContent=`
.gorev-overlay{position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;background:rgba(3,2,10,0.97);opacity:0;pointer-events:none;transition:opacity 0.4s ease;}
.gorev-overlay.open{opacity:1;pointer-events:all;}
.gtab-bar{display:flex;border-bottom:1px solid var(--border);background:rgba(0,0,0,0.3);flex-shrink:0;}
.gtab{flex:1;padding:11px 0;text-align:center;font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:.18em;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;}
.gtab.active{color:var(--purple);border-bottom-color:var(--purple);}
.gtab-body{flex:1;overflow-y:auto;display:none;flex-direction:column;}
.gtab-body.active{display:flex;}
.gtab-body::-webkit-scrollbar{width:2px;}
.g-section-lbl{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.22em;color:var(--dim);padding:12px 20px 6px;text-transform:uppercase;flex-shrink:0;}
.g-card{display:flex;align-items:flex-start;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border);cursor:pointer;flex-shrink:0;}
.g-card:hover{background:rgba(124,110,245,0.04);}
.g-check{width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(124,110,245,0.3);flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;cursor:pointer;}
.g-check:hover{border-color:var(--purple);background:rgba(124,110,245,0.1);}
.g-check.done{border-color:var(--green);background:rgba(29,158,117,0.12);}
.g-check.done::after{content:'✓';font-size:11px;color:var(--green);}
.g-info{flex:1;min-width:0;}
.g-title{font-size:15px;color:var(--text);font-family:'Rajdhani',sans-serif;font-weight:500;}
.g-title.done{text-decoration:line-through;color:var(--muted);}
.g-meta{display:flex;align-items:center;gap:7px;margin-top:5px;flex-wrap:wrap;}
.g-time{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted);}
.g-badge{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.06em;padding:2px 8px;border-radius:20px;}
.gb-rutin{border:1px solid rgba(124,110,245,0.3);color:var(--purple);background:rgba(124,110,245,0.07);}
.gb-gorev{border:1px solid rgba(29,158,117,0.3);color:var(--green);background:rgba(29,158,117,0.07);}
.gb-saglik{border:1px solid rgba(232,93,36,0.3);color:var(--red);background:rgba(232,93,36,0.07);}
.gb-kisisel{border:1px solid rgba(79,168,213,0.3);color:var(--blue);background:rgba(79,168,213,0.07);}
.gb-is{border:1px solid rgba(239,159,39,0.3);color:var(--orange);background:rgba(239,159,39,0.07);}
.gcal-grid{padding:14px 16px 6px;flex-shrink:0;}
.gcal-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:4px;}
.gcal-lbl{text-align:center;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--dim);padding:3px 0;}
.gcal-cell{text-align:center;padding:7px 2px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);border-radius:7px;cursor:pointer;position:relative;transition:background 0.15s;}
.gcal-cell:hover{background:rgba(124,110,245,0.08);}
.gcal-cell.today{background:rgba(124,110,245,0.18);color:var(--purple);font-weight:700;}
.gcal-cell.has-task::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--green);}
.gcal-events{flex:1;overflow-y:auto;border-top:1px solid var(--border);padding:10px 20px;}
.gcal-ev{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
.gcal-ev:last-child{border-bottom:none;}
.gcal-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.gd-purple{background:var(--purple);}.gd-green{background:var(--green);}.gd-orange{background:var(--orange);}
.gcal-ev-title{flex:1;font-size:14px;color:var(--text);font-family:'Rajdhani',sans-serif;}
.gcal-ev-time{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted);white-space:nowrap;}
.g-fab{padding:14px 20px;flex-shrink:0;display:flex;justify-content:flex-end;}
.g-fab-btn{display:flex;align-items:center;gap:8px;padding:11px 22px;background:var(--purple);border:none;border-radius:24px;color:#fff;font-family:'Orbitron',sans-serif;font-size:8.5px;font-weight:700;letter-spacing:.16em;cursor:pointer;transition:all 0.2s;}
.g-fab-btn:hover{background:#6b5ce7;box-shadow:0 0 22px rgba(124,110,245,0.4);}
.g-modal-bg{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,0.6);display:none;align-items:flex-end;justify-content:center;}
.g-modal-bg.open{display:flex;}
.g-modal{background:rgba(8,5,22,0.99);border:1px solid rgba(124,110,245,0.2);border-radius:18px 18px 0 0;padding:22px 20px 34px;width:100%;max-height:88vh;overflow-y:auto;}
.g-modal-title{font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:.25em;color:var(--purple);margin-bottom:18px;}
.g-form-row{margin-bottom:14px;}
.g-form-lbl{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.14em;color:var(--muted);margin-bottom:6px;display:block;text-transform:uppercase;}
.g-form-input{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(124,110,245,0.18);border-radius:9px;padding:11px 13px;font-size:15px;color:var(--text);font-family:'Rajdhani',sans-serif;outline:none;transition:border-color 0.2s;}
.g-form-input:focus{border-color:rgba(124,110,245,0.45);}
.g-form-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
.g-chip-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:5px;}
.g-chip{padding:6px 13px;border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.06em;border:1px solid var(--border);color:var(--muted);cursor:pointer;background:transparent;transition:all 0.2s;}
.g-chip.sel{border-color:var(--purple);color:var(--purple);background:rgba(124,110,245,0.1);}
.g-btn-row{display:flex;gap:10px;margin-top:20px;}
.g-btn-cancel{flex:1;padding:11px;border:1px solid var(--border);border-radius:9px;background:transparent;font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:.14em;color:var(--muted);cursor:pointer;}
.g-btn-save{flex:2;padding:11px;border:none;border-radius:9px;background:var(--purple);font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:.14em;color:#fff;cursor:pointer;font-weight:700;}
.g-btn-save:hover{background:#6b5ce7;}
.g-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:var(--dim);}
`;
document.head.appendChild(s);

const html=`
<div class="chat-overlay gorev-overlay" id="gorevOverlay">
  <div class="chat-hdr">
    <div class="chat-hdr-l">
      <button class="back-btn" id="gorevBackBtn">←</button>
      <div><div class="chat-title" style="color:var(--purple);">GÖREVLER</div><div class="chat-sub">rutin · görev · takvim</div></div>
    </div>
    <div class="chat-hdr-r"><div class="risk-bdg" id="gorevCount" style="border-color:rgba(124,110,245,0.35);color:var(--purple);">0 aktif</div></div>
  </div>
  <div class="gtab-bar">
    <div class="gtab active" data-gt="liste">LİSTE</div>
    <div class="gtab" data-gt="takvim">TAKVİM</div>
    <div class="gtab" data-gt="arsiv">ARŞİV</div>
  </div>
  <div class="gtab-body active" id="gt-liste">
    <div class="g-section-lbl">bugün</div><div id="g-list-bugun"></div>
    <div class="g-section-lbl" id="g-lbl-hafta" style="display:none">bu hafta</div><div id="g-list-hafta"></div>
    <div class="g-section-lbl" id="g-lbl-sonra" style="display:none">sonraki</div><div id="g-list-sonra"></div>
    <div class="g-fab"><button class="g-fab-btn" id="gorevNewBtn">+ YENİ GÖREV</button></div>
  </div>
  <div class="gtab-body" id="gt-takvim">
    <div class="gcal-grid">
      <div class="gcal-days"><div class="gcal-lbl">Pt</div><div class="gcal-lbl">Sa</div><div class="gcal-lbl">Ça</div><div class="gcal-lbl">Pe</div><div class="gcal-lbl">Cu</div><div class="gcal-lbl">Ct</div><div class="gcal-lbl">Pa</div></div>
      <div class="gcal-days" id="gcal-cells"></div>
    </div>
    <div class="gcal-events" id="gcal-ev-list"></div>
    <div class="g-fab"><button class="g-fab-btn" id="gorevNewBtn2">+ YENİ GÖREV</button></div>
  </div>
  <div class="gtab-body" id="gt-arsiv">
    <div id="g-list-arsiv"></div>
    <div class="g-empty" id="g-arsiv-empty">· arşiv boş ·</div>
  </div>
</div>
<div class="g-modal-bg" id="gorevModal">
  <div class="g-modal">
    <div class="g-modal-title">YENİ GÖREV</div>
    <div class="g-form-row"><label class="g-form-lbl">başlık</label><input class="g-form-input" id="gf-baslik" type="text" placeholder="görev adı..."></div>
    <div class="g-form-row2">
      <div><label class="g-form-lbl">tarih</label><input class="g-form-input" id="gf-tarih" type="date"></div>
      <div><label class="g-form-lbl">saat</label><input class="g-form-input" id="gf-saat" type="time"></div>
    </div>
    <div class="g-form-row"><label class="g-form-lbl">hatırlatma</label><input class="g-form-input" id="gf-hat" type="time"></div>
    <div class="g-form-row"><label class="g-form-lbl">tekrar</label>
      <div class="g-chip-row" id="gf-tekrar-row">
        <span class="g-chip sel" data-val="yok">yok</span><span class="g-chip" data-val="gunluk">günlük</span><span class="g-chip" data-val="haftalik">haftalık</span><span class="g-chip" data-val="ozel">özel</span>
      </div></div>
    <div class="g-form-row"><label class="g-form-lbl">kategori</label>
      <div class="g-chip-row" id="gf-kat-row">
        <span class="g-chip" data-val="saglik">sağlık</span><span class="g-chip sel" data-val="kisisel">kişisel</span><span class="g-chip" data-val="is">iş</span>
      </div></div>
    <div class="g-form-row"><label class="g-form-lbl">tür</label>
      <div class="g-chip-row" id="gf-tur-row">
        <span class="g-chip sel" data-val="gorev">görev</span><span class="g-chip" data-val="rutin">rutin</span>
      </div></div>
    <div class="g-btn-row">
      <button class="g-btn-cancel" id="gorevMdlKapat">İPTAL</button>
      <button class="g-btn-save" id="gorevMdlKaydet">KAYDET →</button>
    </div>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend',html);

let gv=JSON.parse(localStorage.getItem('theia_gv')||'[]');
let gav=JSON.parse(localStorage.getItem('theia_gav')||'[]');
const gSave=()=>localStorage.setItem('theia_gv',JSON.stringify(gv));
const gavSave=()=>localStorage.setItem('theia_gav',JSON.stringify(gav));

function gBadge(tur,kat){
  const tc=tur==='rutin'?'gb-rutin':'gb-gorev', tl=tur==='rutin'?'rutin':'görev';
  const km={saglik:['gb-saglik','sağlık'],kisisel:['gb-kisisel','kişisel'],is:['gb-is','iş']};
  let k=''; if(kat&&km[kat]) k=`<span class="g-badge ${km[kat][0]}">${km[kat][1]}</span>`;
  return `<span class="g-badge ${tc}">${tl}</span>${k}`;
}
function gCard(g,el){
  const d=document.createElement('div'); d.className='g-card';
  d.innerHTML=`<div class="g-check${g.done?' done':''}" data-id="${g.id}"></div>
    <div class="g-info"><div class="g-title${g.done?' done':''}">${g.baslik}</div>
    <div class="g-meta"><span class="g-time">${g.saat||''}${g.hat?' · hat.'+g.hat:''}${g.tekrar&&g.tekrar!=='yok'?' · '+g.tekrar:''}</span>${gBadge(g.tur,g.kat)}</div></div>`;
  d.querySelector('.g-check').addEventListener('click',e=>{e.stopPropagation();gDone(g.id);});
  el.appendChild(d);
}
function gDone(id){
  const i=gv.findIndex(x=>x.id===id); if(i<0)return;
  const g=gv.splice(i,1)[0]; g.done=true; gav.unshift(g);
  gSave();gavSave();gRender();gkLog('LOW','Görev tamamlandı: '+g.baslik);
}
function gChipSel(rowId,val){
  document.getElementById(rowId).querySelectorAll('.g-chip').forEach(c=>c.classList.toggle('sel',c.dataset.val===val));
}
function gGetChip(rowId){const s=document.getElementById(rowId).querySelector('.g-chip.sel');return s?s.dataset.val:'';}

function gRender(){
  const now=new Date(), today=now.toDateString(), week=new Date(now);week.setDate(week.getDate()+7);
  ['bugun','hafta','sonra'].forEach(k=>document.getElementById('g-list-'+k).innerHTML='');
  let h=0,s=0;
  gv.filter(g=>!g.done).forEach(g=>{
    const gd=g.tarih?new Date(g.tarih):null;
    if(!gd||gd.toDateString()===today){gCard(g,document.getElementById('g-list-bugun'));}
    else if(gd<=week){gCard(g,document.getElementById('g-list-hafta'));h++;}
    else{gCard(g,document.getElementById('g-list-sonra'));s++;}
  });
  document.getElementById('g-lbl-hafta').style.display=h?'':'none';
  document.getElementById('g-lbl-sonra').style.display=s?'':'none';
  document.getElementById('gorevCount').textContent=gv.filter(g=>!g.done).length+' aktif';
  const al=document.getElementById('g-list-arsiv'); al.innerHTML='';
  gav.length?( document.getElementById('g-arsiv-empty').style.display='none', gav.slice(0,20).forEach(g=>gCard(g,al)) ):( document.getElementById('g-arsiv-empty').style.display='flex' );
  gCalRender();
}
function gCalRender(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const first=new Date(y,m,1), last=new Date(y,m+1,0);
  let dow=first.getDay(); if(dow===0)dow=7;
  const cells=document.getElementById('gcal-cells'); cells.innerHTML='';
  for(let i=1;i<dow;i++){const e=document.createElement('div');e.className='gcal-cell';e.style.opacity='.15';cells.appendChild(e);}
  for(let d=1;d<=last.getDate();d++){
    const e=document.createElement('div'); e.className='gcal-cell';
    const dd=new Date(y,m,d);
    if(dd.toDateString()===now.toDateString())e.classList.add('today');
    if(gv.some(g=>g.tarih&&new Date(g.tarih).toDateString()===dd.toDateString()))e.classList.add('has-task');
    e.textContent=d; e.addEventListener('click',()=>gCalDay(dd)); cells.appendChild(e);
  }
  gCalDay(now);
}
function gCalDay(date){
  const el=document.getElementById('gcal-ev-list');
  el.innerHTML=`<div class="g-section-lbl" style="padding:0 0 8px">${date.toLocaleDateString('tr-TR',{day:'numeric',month:'long'})}</div>`;
  const cols=['gd-purple','gd-green','gd-orange'];
  const tasks=gv.filter(g=>g.tarih&&new Date(g.tarih).toDateString()===date.toDateString()&&!g.done);
  tasks.length?tasks.forEach((g,i)=>{el.innerHTML+=`<div class="gcal-ev"><div class="gcal-dot ${cols[i%3]}"></div><div class="gcal-ev-title">${g.baslik}</div><div class="gcal-ev-time">${g.saat||''}</div></div>`;}):
  (el.innerHTML+=`<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--dim);padding:10px 0">· görev yok ·</div>`);
}
function gModalAc(){
  document.getElementById('gf-baslik').value='';
  document.getElementById('gf-tarih').value=new Date().toISOString().split('T')[0];
  document.getElementById('gf-saat').value='';
  document.getElementById('gf-hat').value='';
  gChipSel('gf-tekrar-row','yok'); gChipSel('gf-kat-row','kisisel'); gChipSel('gf-tur-row','gorev');
  document.getElementById('gorevModal').classList.add('open');
}
function gModalKapat(){document.getElementById('gorevModal').classList.remove('open');}
function gKaydet(){
  const b=document.getElementById('gf-baslik').value.trim(); if(!b){document.getElementById('gf-baslik').focus();return;}
  gv.push({id:Date.now().toString(),baslik:b,tarih:document.getElementById('gf-tarih').value,saat:document.getElementById('gf-saat').value,hat:document.getElementById('gf-hat').value,tekrar:gGetChip('gf-tekrar-row'),kat:gGetChip('gf-kat-row'),tur:gGetChip('gf-tur-row'),done:false,created:new Date().toISOString()});
  gSave(); gModalKapat(); gRender(); gkLog('LOW','Görev eklendi: '+b);
}

window.openGorev=function(){window.warpOpen(()=>{document.getElementById('gorevOverlay').classList.add('open');gRender();});};
window.closeGorev=function(){window.warpClose(()=>{document.getElementById('gorevOverlay').classList.remove('open');});};

window.initGorev=function(){
  document.getElementById('gorevBackBtn').addEventListener('click',window.closeGorev);
  document.getElementById('gorevNewBtn').addEventListener('click',gModalAc);
  document.getElementById('gorevNewBtn2').addEventListener('click',gModalAc);
  document.getElementById('gorevMdlKapat').addEventListener('click',gModalKapat);
  document.getElementById('gorevMdlKaydet').addEventListener('click',gKaydet);
  document.getElementById('gorevModal').addEventListener('click',e=>{if(e.target===document.getElementById('gorevModal'))gModalKapat();});
  document.querySelectorAll('.gtab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.gtab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.gtab-body').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); document.getElementById('gt-'+t.dataset.gt).classList.add('active');
  }));
  ['gf-tekrar-row','gf-kat-row','gf-tur-row'].forEach(r=>document.getElementById(r).querySelectorAll('.g-chip').forEach(c=>c.addEventListener('click',()=>gChipSel(r,c.dataset.val))));
};
})();
