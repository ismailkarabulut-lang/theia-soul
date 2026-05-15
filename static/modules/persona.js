/* ════════════════════════════════════════
   PERSONA ENGINE
   ════════════════════════════════════════ */
let isPersonaOpen = false;
let pWindow = 'all';
const PDEMO = {
  window:'all', total_messages:198, sessions:21, avg_messages_per_session:9.4,
  longest_session:76, peak_hour:2, peak_day:'Per',
  input_tokens:387000, output_tokens:11900,
  top_trigrams:[
    {ngram:'yapay zekanın hafıza kazanma',count:2,pct:89},
    {ngram:'sistem prompt inşa edilir',count:8,pct:76},
    {ngram:'soul agent cache aktif',count:6,pct:62},
    {ngram:'gatekeeper risk sınıflandır',count:5,pct:51},
  ],
  leitmotif:'yapay zekanın hafıza <em>kazanma hikayesi</em>',
  heatmap: (()=>{
    const hm={};
    for(let h=0;h<24;h++){hm[h]={};for(let d=0;d<7;d++){
      let v=Math.random()*.2;
      if(h>=0&&h<=4&&d>=3&&d<=5) v=.55+Math.random()*.45;
      else if(h>=22||h<=2) v=.25+Math.random()*.45;
      else if(h>=10&&h<=14&&d>=1&&d<=5) v=.2+Math.random()*.3;
      hm[h][d]=v;
    }}return hm;
  })()
};

function fmtK(n){if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return String(n);}

function pCountUp(el,target,dur,isFloat){
  const s=performance.now();
  const u=now=>{
    const p=Math.min((now-s)/dur,1),e=1-Math.pow(1-p,3);
    el.textContent=isFloat?(target*e).toFixed(1):Math.round(target*e);
    if(p<1)requestAnimationFrame(u);else el.textContent=isFloat?target.toFixed(1):target;
  };requestAnimationFrame(u);
}

function buildPHeatmap(){
  const labels=document.getElementById('pHmLabels');
  const days=document.getElementById('pHmDays');
  const grid=document.getElementById('pHmGrid');
  labels.innerHTML='';days.innerHTML='';grid.innerHTML='';
  ['00','','','04','','','','08','','','','12','','','','16','','','','20','','','',''].forEach(t=>{
    const d=document.createElement('div');d.className='p-hm-lbl';d.textContent=t;labels.appendChild(d);
  });
  ['PZT','SAL','ÇRŞ','PRS','CUM','CMT','PAZ'].forEach(t=>{
    const d=document.createElement('div');d.className='p-hm-dlbl';d.textContent=t;days.appendChild(d);
  });
  window._pCells=[];
  for(let h=0;h<24;h++)for(let d=0;d<7;d++){
    const c=document.createElement('div');c.className='p-hm-cell';
    c.title=`${String(h).padStart(2,'0')}:00 · ${['Pzt','Sal','Çrş','Prş','Cum','Cmt','Paz'][d]}`;
    grid.appendChild(c);window._pCells.push({c,h,d});
  }
}

function fillPHeatmap(hmRaw){
  if(!window._pCells||!hmRaw)return;
  let max=0;
  for(let d=0;d<7;d++)for(let h=0;h<24;h++){const v=hmRaw[d]?.[h]||0;if(v>max)max=v;}
  if(!max)max=1;
  window._pCells.forEach(({c,h,d},i)=>{
    const v=(hmRaw[d]?.[h]||0)/max;
    c.style.background=`rgba(45,212,191,${(.03+v*.82).toFixed(3)})`;
    if(v>.7)c.style.boxShadow=`0 0 4px rgba(45,212,191,${(v*.5).toFixed(2)})`;
    setTimeout(()=>c.style.opacity='1',i*1.2);
  });
}

function renderPersonaData(data){
  const d=data||PDEMO;

  const start=d.date_range?.start?new Date(d.date_range.start).toLocaleDateString('tr-TR',{day:'2-digit',month:'short'}):'—';
  const end=d.date_range?.end?new Date(d.date_range.end).toLocaleDateString('tr-TR',{day:'2-digit',month:'short'}):'—';
  document.getElementById('personaMeta').textContent=`v1.0 · ${d.total_messages||0} mesaj · ${start}–${end} · read-only`;

  const dayNames=['Paz','Pzt','Sal','Çrş','Per','Cum','Cmt'];
  const peakH=d.time_pattern?.peak_hour??d.peak_hour??2;
  const peakDi=d.time_pattern?.peak_weekday??3;
  document.getElementById('ps-peak').textContent=`${dayNames[peakDi]} ${String(peakH).padStart(2,'0')}:00`;
  pCountUp(document.getElementById('ps-ses'), d.session_pattern?.total_sessions||d.sessions||27, 900, false);
  pCountUp(document.getElementById('ps-avg'), d.session_pattern?.avg_messages_per_session||d.avg_messages_per_session||9.1, 1000, true);
  pCountUp(document.getElementById('ps-long'), d.session_pattern?.longest_session||d.longest_session||76, 1100, false);

  const inp=d.token_usage?.total_input_tokens||d.input_tokens||559219;
  const out=d.token_usage?.total_output_tokens||d.output_tokens||16798;
  const inpEl=document.getElementById('ps-inp'),outEl=document.getElementById('ps-out');
  const s0=performance.now();
  const uInp=n=>{const p=Math.min((n-s0)/1400,1),e=1-Math.pow(1-p,3);inpEl.textContent=fmtK(Math.round(inp*e));if(p<1)requestAnimationFrame(uInp);else inpEl.textContent=fmtK(inp);};requestAnimationFrame(uInp);
  const s1=performance.now();
  const uOut=n=>{const p=Math.min((n-s1)/1400,1),e=1-Math.pow(1-p,3);outEl.textContent=fmtK(Math.round(out*e));if(p<1)requestAnimationFrame(uOut);else outEl.textContent=fmtK(out);};requestAnimationFrame(uOut);
  setTimeout(()=>{
    document.getElementById('ps-inp-bar').style.width='97%';
    const outPct=Math.max((out/inp)*100*6, 3);
    document.getElementById('ps-out-bar').style.width=Math.min(outPct,90)+'%';
  },350);
  document.getElementById('ps-ratio').innerHTML=
    `<strong style="color:var(--teal)">${(inp/out).toFixed(1)}×</strong> input/output · avg output/msg: <strong style="color:var(--purple)">${d.token_usage?.avg_output_per_msg||136.6}</strong> token`;

  const tgEl=document.getElementById('pTgRows');tgEl.innerHTML='';
  const trigrams=d.frequency?.top_trigrams||d.top_trigrams||PDEMO.top_trigrams;
  const maxCount=trigrams[0]?.count||1;
  trigrams.slice(0,5).forEach((tg,i)=>{
    const pct=Math.round((tg.count/maxCount)*100);
    const label=tg.term||tg.ngram||'—';
    const row=document.createElement('div');row.className='p-tg-row';
    row.innerHTML=`<div class="p-tg-hd"><span class="p-tg-word">${label}</span><span class="p-tg-pct" id="ptgp${i}">0%</span></div><div class="p-tg-track"><div class="p-tg-fill" id="ptgf${i}"></div></div>`;
    tgEl.appendChild(row);
    setTimeout(()=>{
      document.getElementById(`ptgf${i}`).style.width=pct+'%';
      let c=0;const iv=setInterval(()=>{c=Math.min(c+3,pct);document.getElementById(`ptgp${i}`).textContent=c+'%';if(c>=pct)clearInterval(iv);},16);
    },380+i*80);
  });

  const lm=trigrams[0]?.term||trigrams[0]?.ngram||'—';
  document.getElementById('ps-lm').innerHTML=`"${lm}"`;

  fillPHeatmap(d.time_pattern?.heatmap||PDEMO.heatmap);
}

async function fetchPersona(win){
  try{
    const r=await fetch(`${SOUL_API}/api/persona/snapshot?window=${win}`,{signal:AbortSignal.timeout(6000)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(e){ return PDEMO; }
}

function openPersona(){
  buildPHeatmap();
  window.warpOpen(async()=>{
    document.getElementById('personaOverlay').classList.add('open');
    isPersonaOpen=true;
    const data=await fetchPersona(pWindow);
    renderPersonaData(data);
  });
}
function closePersona(){
  window.warpClose(()=>{document.getElementById('personaOverlay').classList.remove('open');isPersonaOpen=false;});
}

function initPersona(){
  document.getElementById('personaBackBtn').addEventListener('click',closePersona);
  document.querySelectorAll('.p-win-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      if(btn.dataset.pw===pWindow)return;
      document.querySelectorAll('.p-win-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); pWindow=btn.dataset.pw;
      const data=await fetchPersona(pWindow);
      renderPersonaData(data);
    });
  });
}

// === Export to window for cross-module access ===
window.isPersonaOpen = false;
window.closePersona = closePersona;

const _origOpenPersona = openPersona;
openPersona = function() { _origOpenPersona(); window.isPersonaOpen = isPersonaOpen; };
const _origClosePersona = closePersona;
closePersona = function() { _origClosePersona(); window.isPersonaOpen = isPersonaOpen; };
window.closePersona = closePersona;
window.initPersona = initPersona;
