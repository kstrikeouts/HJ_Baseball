let ROSTER={}, T={};
const POS = [
  {key:'CF',label:'CF 중견',x:50,y:6, cls:''},
  {key:'LF',label:'LF 좌익',x:14,y:22,cls:''},
  {key:'RF',label:'RF 우익',x:86,y:22,cls:''},
  {key:'SS',label:'SS 유격',x:34,y:44,cls:''},
  {key:'B2',label:'2B 2루', x:66,y:44,cls:''},
  {key:'B3',label:'3B 3루', x:14,y:65,cls:''},
  {key:'SP',label:'SP 투수',x:50,y:60,cls:'pitcher'},
  {key:'B1',label:'1B 1루', x:86,y:65,cls:''},
  {key:'EH',label:'',x:86,y:84,cls:'extra'},
  {key:'C', label:'C 포수', x:50,y:87,cls:'catcher'},
];
let filt='전체', wxCache={}, sel=null;
function venueInfo(name){
  const v=T.venues[name]; if(!v) return null;
  const z=(T.zones||{})[v.zone]||{};
  return {games:v.games||[], zone:z.name||'', addr:z.addr||'', url:z.url||''};
}
function closeGame(e){if(e&&e.target!==document.getElementById('gov'))return;document.getElementById('gov').classList.remove('open');}
function closePl(){document.getElementById('plov').classList.remove('open');}
function closeVp(){document.getElementById('vpov').classList.remove('open');}
function openVp(name,e){
  if(e)e.stopPropagation();
  const v=venueInfo(name);if(!v)return;
  document.getElementById('vpName').textContent=name;
  document.getElementById('vpAddr').innerHTML=(v.zone?`<b>${v.zone}</b><br>`:'')+v.addr;
  document.getElementById('vpGames').innerHTML=v.games.map(g=>`<span class="vptag">${g}</span>`).join('');
  const lk=document.getElementById('vpLink');
  if(v.url){lk.href=v.url;lk.style.display='flex';}else{lk.style.display='none';}
  document.getElementById('vpov').classList.add('open');
}
function showPl(key,posLabel){
  const p=ROSTER[key];
  const disp=key.replace(/\(\d+\)$/,'');
  document.getElementById('mAv').textContent=disp.slice(0,1);
  document.getElementById('mName').textContent=disp;
  document.getElementById('mNum').textContent=(p&&p.num)?`#${p.num}${posLabel?' · '+posLabel:''}`:(posLabel||'');
  const rows=[];
  if(p&&p.num)rows.push({l:'등번호',v:`#${p.num}`});
  if(p&&p.school)rows.push({l:'출신학교',v:p.school});
  if(p&&p.birth)rows.push({l:'생년월일',v:p.birth});
  if(rows.length===0)rows.push({l:'정보',v:'등록된 정보 없음'});
  document.getElementById('mRows').innerHTML=rows.map(r=>`<div class="mrow"><span class="ml">${r.l}</span><span class="mv">${r.v}</span></div>`).join('');
  document.getElementById('plov').classList.add('open');
}
function wxInfo(code,temp){
  if(code<=1) return{icon:'☀️',label:`맑음 ${temp}°`,cls:''};
  if(code<=3) return{icon:'⛅',label:`구름 ${temp}°`,cls:'cloud'};
  if(code<=48)return{icon:'🌫️',label:`안개 ${temp}°`,cls:'cloud'};
  if(code<=67)return{icon:'🌧️',label:`비 ${temp}°`,cls:'rain'};
  if(code<=77)return{icon:'❄️',label:`눈 ${temp}°`,cls:'cloud'};
  if(code<=82)return{icon:'🌦️',label:`소나기 ${temp}°`,cls:'rain'};
  return{icon:'⛈️',label:`뇌우 ${temp}°`,cls:'rain'};
}
async function fetchWeather(){
  try{
    const today=new Date(); today.setHours(0,0,0,0);
    const lastDate=Object.values(T.dates).sort().pop();
    const target=new Date(lastDate);
    const diff=Math.ceil((target-today)/(1000*60*60*24));
    const fdays=Math.max(Math.min(diff+1,16),1);
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${T.lat}&longitude=${T.lon}&hourly=temperature_2m,weather_code&timezone=Asia%2FSeoul&forecast_days=${fdays}`;
    const r=await fetch(url);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(!d.hourly||!d.hourly.time) throw new Error('no data');
    const times=d.hourly.time, temps=d.hourly.temperature_2m, codes=d.hourly.weather_code||d.hourly.weathercode;
    T.games.forEach(g=>{
      const ds=T.dates[g.date];
      const key=`${ds}T${String(g.hour).padStart(2,'0')}:00`;
      const idx=times.indexOf(key);
      if(idx>=0) wxCache[g.id]={code:codes[idx],temp:Math.round(temps[idx])};
    });
    applyWx();
  }catch(e){
    console.warn('날씨 오류:',e.message);
    T.games.forEach(g=>{
      const el=document.getElementById('wx'+g.id);
      if(el){el.className='wx cloud';el.textContent='날씨 준비중';}
    });
  }
}
function applyWx(){
  document.querySelectorAll('[id^="wx"]').forEach(el=>{
    const id = el.id.replace('wx','');
    const w = wxCache[id];
    if(!w) return;
    const{icon,label,cls}=wxInfo(w.code,w.temp);
    el.className='wx '+cls; el.textContent=`${icon} ${label}`;
  });
}
function playerGames(key){
  return T.games.filter(g=>Object.values(T.lineups[g.id]||{}).includes(key));
}
function selectPlayer(key){
  sel = key;
  const disp = key.replace(/\(\d+\)$/,'');
  const gs = playerGames(key);
  const infoEl = document.getElementById('searchInfo');
  document.getElementById('searchCand').innerHTML='';
  infoEl.className='search-info show';
  infoEl.innerHTML = gs.length
    ? `<b>${disp}</b> 선수 출전 경기 ${gs.length}건만 표시 중 · <span class="mlink" onclick="showPl('${key}','')">선수 정보 보기</span>`
    : `<b>${disp}</b> 선수가 배정된 경기가 없습니다 · <span class="mlink" onclick="showPl('${key}','')">선수 정보 보기</span>`;
  renderGames();
}
function doSearch(){
  const term = document.getElementById('playerSearch').value.trim();
  const infoEl = document.getElementById('searchInfo');
  const candEl = document.getElementById('searchCand');
  candEl.innerHTML='';
  if(!term){ clearSearch(); return; }
  const matches = Object.keys(ROSTER).filter(n=>n.replace(/\(\d+\)$/,'').includes(term)).sort();
  if(matches.length===0){
    sel=null; renderGames();
    infoEl.className='search-info show'; infoEl.textContent=`"${term}" 검색 결과 없음`;
  } else if(matches.length===1){
    selectPlayer(matches[0]);
  } else {
    sel=null; renderGames();
    infoEl.className='search-info show';
    infoEl.textContent=`"${term}" 검색 · 동명이인 ${matches.length}명 — 선수를 선택하세요`;
    candEl.innerHTML = `
      <div class="cand-box">
        <div class="cand-title">아래에서 선수를 선택하세요</div>
        <div class="cand-list">
          ${matches.map(name=>{
            const p = ROSTER[name] || {};
            const num = p.num ? `#${p.num}` : '';
            const cnt = playerGames(name).length;
            return `<button class="cand-btn" onclick="selectPlayer('${name}')"><span>${name.replace(/\(\d+\)$/,'')} <span style="font-size:12px;color:#6b7280;font-weight:500">${cnt}경기</span></span><span class="cand-num">${num}</span></button>`;
          }).join('')}
        </div>
      </div>`;
  }
}
function clearSearch(){
  sel=null;
  document.getElementById('playerSearch').value='';
  document.getElementById('searchInfo').className='search-info';
  document.getElementById('searchInfo').innerHTML='';
  document.getElementById('searchCand').innerHTML='';
  renderGames();
}
function renderAll(){
  const days=[...new Set(T.games.map(g=>g.date))].length;
  const cats=[...new Set(T.games.map(g=>g.cat))].length;
  const venues=Object.keys(T.venues).length;
  document.getElementById('stats').innerHTML=[
    {n:T.games.length,l:'화정 경기 수'},{n:days,l:'경기 일수'},{n:cats,l:'참가 부문'},{n:venues,l:'경기장 수'}
  ].map(s=>`<div class="stat"><div class="n">${s.n}</div><div class="l">${s.l}</div></div>`).join('');
  document.getElementById('venues').innerHTML=Object.keys(T.venues).map(name=>{
    const v=venueInfo(name);
    return `<div class="vcard" onclick="openVp('${name}',event)">
      <span style="font-size:22px">🏟️</span>
      <div><div class="vc-name">${name}</div><div class="vc-addr">${v.zone}<br>${v.addr}</div><div class="vc-link">${v.url?'📍 지도 보기':'🕓 주소 준비중'}</div></div>
    </div>`;}).join('');
  renderFilters();
  renderGames();
  fetchWeather();
}
function renderFilters(){
  document.getElementById('filters').innerHTML=T.cats.map(f=>
    `<button class="fbtn ${filt===f?'on':''}" onclick="setFilt('${f}')">${f}</button>`).join('');
}
function setFilt(f){filt=f;renderFilters();renderGames();}
function visibleGames(){
  let f = filt==='전체' ? T.games : T.games.filter(g=>g.cat===filt);
  if(sel) f = f.filter(g=>Object.values(T.lineups[g.id]||{}).includes(sel));
  return f;
}
function renderGames(){
  const filtered = visibleGames();
  renderBulkBar(filtered);
  if(filtered.length===0){
    const msg = sel
      ? `${sel.replace(/\(\d+\)$/,'')} 선수의 해당 조건 경기가 없습니다.<br><span class="mlink" onclick="clearSearch()">전체 경기 보기</span>`
      : '해당 부문 경기가 없습니다.';
    document.getElementById('glist').innerHTML = `<div class="empty-msg">${msg}</div>`;
    return;
  }
  const byDate = {};
  filtered.forEach(g=>{ if(!byDate[g.date]) byDate[g.date]=[]; byDate[g.date].push(g); });
  document.getElementById('glist').innerHTML = Object.entries(byDate).map(([date,gs])=>`
    <div class="dlbl">📅 ${date}(${gs[0].dow}요일)</div>
    <div class="gcards">${gs.map(g=>{
      const isH = g.right==='화정';
      const vurl = (venueInfo(g.venue)||{}).url || "#";
      let posTag='';
      if(sel){
        const lu=T.lineups[g.id]||{};
        const pk=Object.keys(lu).find(k=>lu[k]===sel);
        const pl=POS.find(p=>p.key===pk);
        if(pl) posTag=`<span class="sb" style="background:#e0f2fe;color:#075985;border:.5px solid #7dd3fc">${pl.label||'EH'}</span>`;
      }
      return`<div class="gcard" onclick="openGame('${g.id}')">
        <div class="gtop">
          <div class="gm">${g.left==='화정'?'<span class="hj">화정</span>':g.left}<span class="vs"> vs </span>${g.right==='화정'?'<span class="hj">화정</span>':g.right}</div>
        </div>
        <div class="gvenue">
          <a class="vlink" href="#" onclick="openVp('${g.venue}',event);return false;">📍 ${g.venue}</a>
        </div>
        <div class="gbot">
          <div class="tbadge"><span>${g.time}</span></div>
          <span class="spacer"></span>
          <span id="wx${g.id}" class="wx load">⏳</span>
          ${posTag}
          <span class="sb ${isH?'home':'away'}">${isH?'홈':'원정'}</span>
          <span class="cb c${g.cat}">${g.cat}</span>
        </div>
      </div>`;
    }).join('')}</div>`).join('');
  applyWx();
}
function openGame(id){
  const g = T.games.find(x=>x.id===id); if(!g) return;
  const lu = T.lineups[g.id] || {};
  const hasLineup = Object.values(lu).some(v=>v);
  const vurl = (venueInfo(g.venue)||{}).url || "#";
  let fieldHtml;
  if(hasLineup){
    const nodes = POS.filter(p=>lu[p.key]).map(p=>{
      const key = lu[p.key] || '';
      if(!key) return '';
      const disp = key.replace(/\(\d+\)$/,'');
      const num = ROSTER[key] && ROSTER[key].num ? `#${ROSTER[key].num}` : '';
      return`<div class="pnode ${p.cls}" style="left:${p.x}%;top:${p.y}%" onclick="showPl('${key}','${p.label}')">
        <div class="pname">${disp}${num?`<span style="font-size:9px;color:#777;font-weight:500"> ${num}</span>`:''}</div><div class="ppos">${p.label}</div></div>`;
    }).join('');
    fieldHtml = `
      <div class="field">
        <div class="ftitle">수비 라인업 — 선수 이름을 클릭하면 상세 정보를 볼 수 있습니다</div>
        <div class="diamond">
          <svg viewBox="0 0 380 340" xmlns="http://www.w3.org/2000/svg">
            <line x1="53" y1="75" x2="190" y2="296" stroke="#999" stroke-width="1" opacity=".4"/>
            <line x1="327" y1="75" x2="190" y2="296" stroke="#999" stroke-width="1" opacity=".4"/>
            <path d="M53 75 Q190 10 327 75" fill="none" stroke="#999" stroke-width="1" opacity=".3"/>
            <polygon points="190,150 120,210 190,265 260,210" fill="rgba(210,166,121,.18)" stroke="#c8a84b" stroke-width="1.5"/>
          </svg>
          ${nodes}
        </div>
      </div>`;
  } else {
    fieldHtml = `<div class="lineup-pending">📋 라인업은 추후 업데이트 예정입니다.<br>확정되는 대로 이 화면에 표시됩니다.</div>`;
  }
  document.getElementById('gpTitle').textContent = `⚾ ${g.date}(${g.dow}) ${g.time} · ${g.cat}`;
  document.getElementById('gpBody').innerHTML = `
    <div class="vsbox">
      <div class="vst"><div class="vn ${g.left==='화정'?'hw':''}">${g.left}</div><div class="vr">원정</div></div>
      <div class="vsep">:</div>
      <div class="vst"><div class="vn ${g.right==='화정'?'hw':''}">${g.right}</div><div class="vr">홈</div></div>
    </div>
    <div class="meta">
      <span class="mlink" onclick="openVp('${g.venue}',event)">📍 ${g.venue}</span>
      <span>·</span><span>화정 ${g.right==='화정'?'홈':'원정'}</span>
      ${(T.gameCoaches&&T.gameCoaches[g.id])?`<span>·</span><span>👤 ${T.gameCoaches[g.id]}</span>`:''}
    </div>
    ${fieldHtml}
    <div class="savebar">
      <button class="savebtn" onclick="saveCard('${g.id}')">📸 사진으로 저장</button>
      <div class="savehint" id="saveHint">아이폰은 공유 창에서 “이미지 저장”을 누르세요</div>
    </div>`;
  document.getElementById('gov').classList.add('open');
}

/* ===== 경기 카드 이미지 생성 ===== */
const CARD_W=1080, CARD_H=1440;
function rrect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
const F=(w,s)=>`${w} ${s}px -apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif`;
function drawCard(g){
  const lu=T.lineups[g.id]||{}, has=Object.values(lu).some(v=>v);
  const cv=document.createElement('canvas'); cv.width=CARD_W; cv.height=CARD_H;
  const c=cv.getContext('2d');
  c.fillStyle='#faf6f4'; c.fillRect(0,0,CARD_W,CARD_H);
  // 헤더
  c.fillStyle='#7a1f2b'; c.fillRect(0,0,CARD_W,190);
  c.fillStyle='#fff'; c.textAlign='left';
  c.font=F(800,46); c.fillText('광주화정유소년야구단',60,88);
  c.fillStyle='rgba(255,255,255,.8)'; c.font=F(500,30);
  c.fillText('2026 영암월출산배 전국유소년야구대회',60,140);
  // 일시 / 부문
  c.fillStyle='#7a1f2b'; c.font=F(800,52); c.textAlign='left';
  c.fillText(`${g.date}(${g.dow}) ${g.time}`,60,268);
  const catW=c.measureText(g.cat).width+56;
  c.font=F(700,34); const cw=c.measureText(g.cat).width+56;
  c.fillStyle='#b0413e'; rrect(c,CARD_W-60-cw,228,cw,56,28); c.fill();
  c.fillStyle='#fff'; c.textAlign='center'; c.fillText(g.cat,CARD_W-60-cw/2,268);
  // 대진
  c.fillStyle='#fbeeea'; rrect(c,60,310,CARD_W-120,170,22); c.fill();
  c.strokeStyle='#e6b8ae'; c.lineWidth=2; c.stroke();
  const mid=CARD_W/2, L=60+(mid-60)/2, R=mid+(CARD_W-60-mid)/2;
  [[g.left,L,'원정'],[g.right,R,'홈']].forEach(([nm,x,sd])=>{
    c.textAlign='center';
    c.fillStyle=nm==='화정'?'#7a1f2b':'#6b5a56'; c.font=F(800,nm.length>5?40:48);
    c.fillText(nm,x,392);
    c.fillStyle='#9a5a52'; c.font=F(500,26); c.fillText(sd,x,436);
  });
  c.fillStyle='#d8b5ad'; c.font=F(800,44); c.fillText(':',mid,398);
  // 장소 / 코치
  c.textAlign='left'; c.fillStyle='#5b4a46'; c.font=F(600,32);
  c.fillText('📍 '+g.venue,60,540);
  const co=(T.gameCoaches||{})[g.id];
  if(co){c.fillStyle='#8a7571'; c.font=F(500,28); c.fillText('👤 '+co,60,588);}
  // 필드
  const fy=co?620:596, fh=CARD_H-fy-90;
  c.fillStyle='#2b1216'; rrect(c,60,fy,CARD_W-120,fh,24); c.fill();
  c.fillStyle='rgba(255,255,255,.55)'; c.textAlign='center'; c.font=F(500,26);
  c.fillText(has?'수비 라인업':'라인업 미정',CARD_W/2,fy+52);
  if(has){
    const dx=140, dy=fy+96, dw=CARD_W-280, dh=fh-150;
    c.strokeStyle='rgba(255,255,255,.28)'; c.lineWidth=2;
    const px=p=>dx+dw*p/100, py=p=>dy+dh*p/100;
    c.beginPath(); c.moveTo(px(4),py(16)); c.lineTo(px(50),py(94)); c.stroke();
    c.beginPath(); c.moveTo(px(96),py(16)); c.lineTo(px(50),py(94)); c.stroke();
    c.strokeStyle='#c8a84b'; c.lineWidth=3;
    c.beginPath(); c.moveTo(px(50),py(40)); c.lineTo(px(28),py(60)); c.lineTo(px(50),py(80)); c.lineTo(px(72),py(60)); c.closePath();
    c.fillStyle='rgba(210,166,121,.16)'; c.fill(); c.stroke();
    POS.filter(p=>lu[p.key]).forEach(p=>{
      const nm=lu[p.key].replace(/\(\d+\)$/,''), num=(ROSTER[lu[p.key]]||{}).num;
      const lbl=p.label||'EH 지명';
      c.font=F(700,30); const tw=Math.max(c.measureText(nm+(num?' '+num:'')).width,c.measureText(lbl).width)+36;
      const bw=Math.max(tw,140), bh=84, x=px(p.x)-bw/2, y=py(p.y)-bh/2;
      c.fillStyle=p.cls==='pitcher'?'#fff6c9':p.cls==='catcher'?'#dceeff':p.cls==='extra'?'#f3e0f7':'#f6f2e2';
      rrect(c,x,y,bw,bh,12); c.fill();
      c.strokeStyle=p.cls==='pitcher'?'#e0a000':p.cls==='catcher'?'#2f6fb0':p.cls==='extra'?'#9a52ad':'#9c8352';
      c.lineWidth=3; c.stroke();
      c.textAlign='center'; c.fillStyle='#1a1a1a'; c.font=F(700,30);
      c.fillText(nm+(num?`  ${num}`:''),x+bw/2,y+38);
      c.fillStyle='#6d6257'; c.font=F(500,22); c.fillText(lbl,x+bw/2,y+68);
    });
  }
  c.fillStyle='#b09a95'; c.textAlign='center'; c.font=F(500,24);
  c.fillText('광주화정유소년야구단 · 영암월출산배',CARD_W/2,CARD_H-36);
  return cv;
}
function renderBulkBar(list){
  const el=document.getElementById('bulkbar'); if(!el) return;
  el.innerHTML = list.length<2 ? '' :
    `<div class="bulkbar"><button class="bulkbtn" id="bulkBtn" onclick="saveAll()">📸 ${list.length}경기 카드 한번에 저장</button></div>`;
}
function cardBlob(g){
  return new Promise(res=>drawCard(g).toBlob(b=>res(b),'image/png'));
}
function cardName(g){
  return `화정_${g.date.replace('/','-')}_${g.time.slice(0,5).replace(':','')}_${g.cat}.png`;
}
function closeGal(){document.getElementById('galov').classList.remove('open');}
function showGallery(items,title){
  document.getElementById('galTitle').textContent=title;
  document.getElementById('galBody').innerHTML=items.map(it=>
    `<div><div class="galcap">${it.cap}</div><img src="${it.url}" alt="${it.cap}"></div>`).join('');
  document.getElementById('galov').classList.add('open');
}
async function saveAll(){
  const list=visibleGames(); if(!list.length) return;
  const btn=document.getElementById('bulkBtn');
  const set=t=>{ if(btn){btn.textContent=t;} };
  if(btn) btn.disabled=true;
  try{
    const files=[], items=[];
    for(let i=0;i<list.length;i++){
      set(`카드 만드는 중… ${i+1}/${list.length}`);
      await new Promise(r=>setTimeout(r,0));
      const b=await cardBlob(list[i]);
      files.push(new File([b],cardName(list[i]),{type:'image/png'}));
      items.push({url:URL.createObjectURL(b),cap:`${list[i].date}(${list[i].dow}) ${list[i].time} · ${list[i].cat}`});
    }
    set('저장 중…');
    let shared=false;
    try{
      if(navigator.canShare && navigator.canShare({files})){
        await navigator.share({files,title:'영암월출산배 화정 경기 카드'});
        shared=true;
      }
    }catch(e){ if(e&&e.name==='AbortError') shared=true; }
    if(!shared){
      const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
      if(ios){
        showGallery(items,`${list.length}장 · 사진을 길게 눌러 저장하세요`);
      }else{
        for(let i=0;i<files.length;i++){
          const u=URL.createObjectURL(files[i]);
          const a=document.createElement('a'); a.href=u; a.download=files[i].name;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(()=>URL.revokeObjectURL(u),8000);
          await new Promise(r=>setTimeout(r,450));
        }
      }
    }
  }finally{
    if(btn){btn.disabled=false; btn.textContent=`📸 ${list.length}경기 카드 한번에 저장`;}
  }
}
function saveCard(id){
  const g=T.games.find(x=>x.id===id); if(!g) return;
  const hint=document.getElementById('saveHint');
  const name=`화정_${g.date.replace('/','-')}_${g.cat}_${g.left}vs${g.right}.png`;
  drawCard(g).toBlob(async blob=>{
    const file=new File([blob],name,{type:'image/png'});
    try{
      if(navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file]}); return;
      }
    }catch(e){ if(e && e.name==='AbortError') return; }
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    if(hint) hint.textContent='저장됨 · 사진첩에 없으면 ‘파일’ 앱의 다운로드를 확인하세요';
  },'image/png');
}

async function boot(){
  try{
    const [r,t]=await Promise.all([
      fetch('data/roster.json?v='+Date.now()).then(x=>x.json()),
      fetch('data/current.json?v='+Date.now()).then(x=>x.json())
    ]);
    ROSTER=r; T=t;
    document.title=`화정유소년야구단 - ${T.shortName||T.name}`;
    document.getElementById('hdrTitle').textContent=T.name;
    document.getElementById('noticeBox').innerHTML=T.notice||'';
    renderAll();
  }catch(e){
    document.getElementById('glist').innerHTML=
      '<div class="empty-msg">데이터를 불러오지 못했습니다.<br>새로고침해 주세요.</div>';
    console.error(e);
  }
}
boot();