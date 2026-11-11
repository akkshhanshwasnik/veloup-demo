// VeloUp salon booking demo: WhatsApp-style chat on the left, live salon dashboard on the right.
// Everything runs in the browser; no message leaves the page and no real booking is made.
"use strict";
/* ===== Config: change these to personalise the demo for a prospect ===== */
const CONFIG = {
  salon: "Saffron & Shears",
  initials: "S&S",
  branches: [
    {id:"kp",   name:"Koregaon Park", short:"KP",     addr:"Lane 6, Koregaon Park, Pune 411001", stylists:["Riya","Imran","Neha"], keys:["koregaon","kp","k p","k.p"]},
    {id:"baner",name:"Baner",         short:"Baner",  addr:"Baner Road, near Balewadi Phata, Pune 411045", stylists:["Kavya","Arjun"], keys:["baner","balewadi"]},
    {id:"viman",name:"Viman Nagar",   short:"Viman",  addr:"Phoenix Marketcity side, Viman Nagar, Pune 411014", stylists:["Sana","Rohit"], keys:["viman","vimaan","vimannagar"]}
  ],
  stylistNotes: {Riya:"Senior stylist · colour & women's cuts", Imran:"Men's cuts & beard styling", Neha:"Skin & nail care",
    Kavya:"Senior stylist · all hair services", Arjun:"Men's grooming", Sana:"Hair spa & styling", Rohit:"Men's cuts & colour"},
  open: 10, close: 21,   // 10:00–21:00
  // What a client can type for each kind of service; the men's or women's version is picked once we know who it's for
  kinds: {
    haircut:  {label:"Haircut",     keys:["haircut","hair cut","cutting","baal","bal katwane"]},
    beard:    {label:"Beard trim",  keys:["beard","dadhi","shave","shaving"]},
    spa:      {label:"Hair spa",    keys:["hair spa","spa"]},
    colour:   {label:"Hair colour", keys:["colour","color","highlights","global"]},
    facial:   {label:"Facial",      keys:["facial","cleanup","clean up","clean-up"]},
    manicure: {label:"Manicure",    keys:["manicure","mani"]},
    pedicure: {label:"Pedicure",    keys:["pedicure","pedi"]},
    wax:      {label:"Waxing",      keys:["wax","waxing"]},
    threading:{label:"Threading",   keys:["thread","eyebrow","brows"]}
  },
  // Separate menus: g "m" = men, "w" = women
  services: [
    {id:"hcm",  g:"m", kind:"haircut",  name:"Men's Haircut",       price:600,  mins:30, cat:"Hair"},
    {id:"brd",  g:"m", kind:"beard",    name:"Beard Trim & Style",  price:300,  mins:30, cat:"Hair"},
    {id:"spam", g:"m", kind:"spa",      name:"Men's Hair Spa",      price:1200, mins:60, cat:"Hair"},
    {id:"colm", g:"m", kind:"colour",   name:"Men's Hair Colour",   price:1500, mins:60, cat:"Hair"},
    {id:"facm", g:"m", kind:"facial",   name:"Men's Facial",        price:1500, mins:60, cat:"Skin"},
    {id:"manm", g:"m", kind:"manicure", name:"Men's Manicure",      price:600,  mins:30, cat:"Hands & feet"},
    {id:"pedm", g:"m", kind:"pedicure", name:"Men's Pedicure",      price:800,  mins:60, cat:"Hands & feet"},
    {id:"hcw",  g:"w", kind:"haircut",  name:"Women's Haircut",     price:1200, mins:60, cat:"Hair"},
    {id:"spaw", g:"w", kind:"spa",      name:"Hair Spa",            price:1800, mins:60, cat:"Hair"},
    {id:"colw", g:"w", kind:"colour",   name:"Global Hair Colour",  price:3500, mins:120,cat:"Hair"},
    {id:"facw", g:"w", kind:"facial",   name:"Signature Facial",    price:2200, mins:60, cat:"Skin"},
    {id:"wax",  g:"w", kind:"wax",      name:"Waxing – Full Arms",  price:600,  mins:30, cat:"Skin"},
    {id:"thr",  g:"w", kind:"threading",name:"Eyebrow Threading",   price:100,  mins:30, cat:"Skin"},
    {id:"manw", g:"w", kind:"manicure", name:"Manicure",            price:800,  mins:30, cat:"Hands & feet"},
    {id:"pedw", g:"w", kind:"pedicure", name:"Pedicure",            price:1000, mins:60, cat:"Hands & feet"}
  ],
  membership: "Gold membership: ₹1,499 a year for 20% off every visit and a free hair spa on your birthday"
};
/* ====================================================================== */

const $ = s => document.querySelector(s);
const chat = $("#chat"), inp = $("#inp");
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYSL = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SVC = Object.fromEntries(CONFIG.services.map(s=>[s.id,s]));
const BR = Object.fromEntries(CONFIG.branches.map(b=>[b.id,b]));

$("#salonName").textContent = CONFIG.salon;
$("#avatar").textContent = CONFIG.initials;
const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

// layout.js (copied unchanged from veloup.in) builds the header and footer with relative links;
// this demo lives on its own subdomain, so point them back at the main site.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".site-header a[href], .site-footer a[href], .action-bar a[href], .wa-float").forEach(a => {
    const h = a.getAttribute("href");
    if (!/^(https?:|mailto:|tel:|#)/.test(h)) a.href = "https://veloup.in/" + (h === "index.html" ? "" : h);
    a.removeAttribute("aria-current");
  });
});

let S, booking, extraBookings, stats, client, busy=false;
const GNAME = {m:"Men", w:"Women"};
const MENU = {m:"men's", w:"women's"};
const gendersOf = kind => [...new Set(CONFIG.services.filter(s=>s.kind===kind).map(s=>s.g))];
const svcFor = (kind, g) => CONFIG.services.find(s=>s.kind===kind && s.g===g);
// Turn the kinds the client asked for into this gender's services; returns the kinds this menu doesn't have
function resolveServices(){
  const missing=[];
  S.services = S.services.map(id=>SVC[id].g===S.gender ? id : (svcFor(SVC[id].kind,S.gender)||{}).id).filter(Boolean);
  S.kinds.forEach(k=>{ const s=svcFor(k,S.gender); if(s) S.services.push(s.id); else missing.push(CONFIG.kinds[k].label.toLowerCase()); });
  S.services=[...new Set(S.services)]; S.kinds=[];
  return missing;
}
function freshState(){ return {services:[], kinds:[], gender:null, branch:null, date:null, time:null, window:null, stylist:null, pick:null, mode:"book", alt:null}; }
// S.pick: null = not asked yet, "any" = first free stylist, or a name = only that stylist's diary
const picked = () => S.pick && S.pick!=="any" ? S.pick : null;

/* ---------- dates & slots ---------- */
const today0 = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const iso = d => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
function fmtDate(d){
  const diff = Math.round((d - today0())/864e5);
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return diff===0 ? `Today (${base})` : diff===1 ? `Tomorrow (${base})` : base;
}
const fmtT = m => { let h=Math.floor(m/60), mm=m%60, ap=h>=12?"PM":"AM"; h=h%12||12; return `${h}:${String(mm).padStart(2,"0")} ${ap}`; };
const onDay = d => { const x=Math.round((d-today0())/864e5); return x===0?"today":x===1?"tomorrow":"on "+fmtDate(d); };
const rupee = n => "₹" + n.toLocaleString("en-IN");

function hash(str){ let h=2166136261; for(const c of str){ h^=c.charCodeAt(0); h=Math.imul(h,16777619);} return (h>>>0); }
function isBooked(date, branch, stylist, slot){
  const k = `${iso(date)}|${branch}|${stylist}`;
  if (extraBookings.some(b=>b.k===k && slot>=b.start && slot<b.end && !b.cancelled)) return true;
  const evening = slot >= 17*60;
  // make 6–7pm busy tomorrow so the "nearest slot" feature shows up naturally
  const diff = Math.round((date - today0())/864e5);
  if (diff===1 && slot>=18*60 && slot<19*60) return true;
  const r = hash(k+"|"+Math.floor(slot/60)) % 100;
  const weekend = [0,6].includes(date.getDay());
  return r < (evening ? 55 : weekend ? 45 : 28);
}
function stylistFree(date, branch, stylist, start, mins){
  for(let t=start; t<start+mins; t+=30){ if (t+30>CONFIG.close*60 || isBooked(date,branch,stylist,t)) return false; }
  return true;
}
function minStart(date){
  const diff = Math.round((date - today0())/864e5);
  if (diff>0) return CONFIG.open*60;
  const n=new Date(); let m=n.getHours()*60+n.getMinutes()+45; m=Math.ceil(m/30)*30;
  return Math.max(m, CONFIG.open*60);
}
function freeAt(date, branch, start, mins, prefer){
  if (start < minStart(date)) return null;
  const list = picked() && BR[branch].stylists.includes(picked()) ? [picked()] : BR[branch].stylists;
  const order = prefer && list.includes(prefer) ? [prefer, ...list.filter(x=>x!==prefer)] : list;
  for (const st of order) if (stylistFree(date,branch,st,start,mins)) return st;
  return null;
}
function allFree(date, branch, mins){
  const out=[]; for(let t=minStart(date); t+mins<=CONFIG.close*60; t+=30){ const st=freeAt(date,branch,t,mins,S.stylist); if(st) out.push({t,st}); } return out;
}
const totalMins = () => S.services.reduce((a,id)=>a+SVC[id].mins,0);
const totalPrice = () => S.priceOverride!=null ? S.priceOverride : S.services.reduce((a,id)=>a+SVC[id].price,0);
const svcNames = (ids=S.services) => ids.map(id=>SVC[id].name).join(" + ");

/* ---------- rendering ---------- */
const now = () => { const n=new Date(); return fmtT(n.getHours()*60+n.getMinutes()); };
function scroll(){ chat.scrollTop = chat.scrollHeight; }
function esc(s){ return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function md(s){ return esc(s).replace(/\*(.+?)\*/g,"<b>$1</b>"); }

// Bubbles reuse the veloup.in hero phone classes: the client (you) is .dm-out, the salon assistant is .dm-in
function userBubble(text, quote){
  const r=document.createElement("p"); r.className="dm dm-out";
  r.innerHTML = `${quote?`<span class="quote"><strong>${esc(CONFIG.salon)}</strong>${esc(quote)}</span>`:""}${esc(text)}<time>${now()} <span class="tick">✓✓</span></time>`;
  chat.appendChild(r); scroll();
}
function sysNote(text){ const d=document.createElement("p"); d.className="dm dm-sys"; d.textContent=text; chat.appendChild(d); scroll(); }

let lastInteractive = [];
function disableOld(){ lastInteractive.forEach(b=>b.disabled=true); lastInteractive=[]; }

function botRender(m){
  const wrap=document.createElement("div"); wrap.className="dm-card";
  const body=document.createElement("p"); body.className="dm dm-in";
  body.innerHTML = md(m.text) + `<time>${now()}</time>`;
  if (!(m.buttons||m.list)) { chat.appendChild(body); scroll(); return; }
  wrap.appendChild(body);
  const btns=document.createElement("div"); btns.className="btns";
  if (m.buttons) m.buttons.forEach(b=>{
    const el=document.createElement("button"); el.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>${esc(b.label)}`;
    el.onclick=()=>{ if(busy) return; disableOld(); userBubble(b.label, m.text.split("\n")[0].replace(/\*/g,"").slice(0,60)); b.go(); };
    btns.appendChild(el); lastInteractive.push(el);
  });
  if (m.list){
    const el=document.createElement("button"); el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>${esc(m.list.label||"Options")}`;
    el.onclick=()=>{ if(!busy) openSheet(m.list, m.text); };
    btns.appendChild(el); lastInteractive.push(el);
  }
  wrap.appendChild(btns); chat.appendChild(wrap); scroll();
}

const STATUS=$("#waStatus").textContent;
const queue=[];
function say(...msgs){ msgs.forEach(m=>queue.push(typeof m==="string"?{text:m}:m)); if(!busy) pump(); }
function pump(){
  if(!queue.length){ busy=false; return; }
  busy=true;
  const m=queue.shift();
  if (m.fn){ setTimeout(()=>{ m.fn(); pump(); }, 120); return; }
  const t=document.createElement("span"); t.className="dm-typing is-on"; t.setAttribute("aria-hidden","true"); t.innerHTML='<i></i><i></i><i></i>';
  chat.appendChild(t); scroll();
  $("#waStatus").textContent="typing…";
  const delay = Math.min(1300, 450 + m.text.length*6);
  setTimeout(()=>{ t.remove(); $("#waStatus").textContent=STATUS; if(m.fn) m.fn(); else botRender(m); setTimeout(pump, 180); }, delay);
}
function act(fn){ queue.push({text:"",fn}); if(!busy) pump(); }  // run after previous messages

/* list sheet */
function openSheet(list, srcText){
  $("#sheetTitle").textContent = list.title || "Options";
  const L=$("#sheetList"); L.innerHTML="";
  list.sections.forEach(sec=>{
    if(sec.title){ const h=document.createElement("div"); h.className="sheet-sec"; h.textContent=sec.title; L.appendChild(h); }
    sec.rows.forEach(rw=>{
      const b=document.createElement("button"); b.className="sheet-item";
      b.innerHTML = esc(rw.label) + (rw.sub?`<span>${esc(rw.sub)}</span>`:"");
      b.onclick=()=>{ closeSheet(); disableOld(); userBubble(rw.label, srcText.split("\n")[0].replace(/\*/g,"").slice(0,60)); rw.go(); };
      L.appendChild(b);
    });
  });
  $("#sheetBg").style.display="block"; requestAnimationFrame(()=>$("#sheet").classList.add("open"));
}
function closeSheet(){ $("#sheet").classList.remove("open"); setTimeout(()=>$("#sheetBg").style.display="none",200); }
$("#sheetBg").onclick=closeSheet; $("#sheetX").onclick=closeSheet;

/* ---------- dashboard ---------- */
const ICON={msg:"💬",brain:"🧠",cal:"📅",warn:"⚠️",ok:"✅",bell:"🔔",crm:"🗂️",up:"💡",star:"⭐",x:"✖️",user:"🧑‍💼"};
function log(ic, text, sub){
  const f=$("#feed"); if(f.querySelector(".empty")) f.innerHTML="";
  const d=document.createElement("div"); d.className="ev";
  d.innerHTML=`<div class="ic">${ICON[ic]||"•"}</div><div class="tx">${esc(text)}<span>${now()}${sub?" · "+esc(sub):""}</span></div>`;
  f.prepend(d);
  flash(ic, text);
}
// Phones show the dashboard below the chat, so headline events also pop up in a strip above the message box
let flashTimer=null;
function flash(ic, text){
  if (!["ok","x","up","star","warn","user"].includes(ic)) return;
  const s=$("#liveStrip"); $("#liveText").textContent=`${ICON[ic]} ${text}`;
  s.hidden=false; s.classList.remove("is-in"); void s.offsetWidth; s.classList.add("is-in");
  clearTimeout(flashTimer); flashTimer=setTimeout(()=>{ s.hidden=true; }, 4500);
}
const FAKE_N=["Priya S.","Rahul K.","Sneha P.","Aditya M.","Pooja D.","Karan J.","Meera T.","Vikram R.","Ananya G.","Sahil B.","Ishita N.","Nikhil W."];
const FAKE_S=["Haircut","Hair Spa","Facial","Beard Trim","Colour","Pedicure","Manicure","Threading"];
const SRC=["Walk-in","Phone","Instagram","App"];
// Day planner: stylists as columns, 30-minute rows from opening to closing time.
// Blocks are placed with element.style (allowed by the page's CSP, unlike style="" in HTML).
function renderSched(viewBranch){
  const date = S.date || (booking && booking.date) || addDays(today0(),1);
  const br = viewBranch || S.branch || (booking && booking.branch) || "kp";
  $("#schedFor").textContent = fmtDate(date).replace(/ \(.+\)/,"");
  document.querySelectorAll("#brTabs button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.br===br)));
  const open=CONFIG.open*60, sts=BR[br].stylists, row=t=>2+(t-open)/30;
  const g=$("#sched"); g.innerHTML="";
  g.style.gridTemplateColumns=`44px repeat(${sts.length}, minmax(0, 1fr))`;
  const put=(cls, html, r, c)=>{ const d=document.createElement("div"); d.className=cls; d.innerHTML=html; d.style.gridRow=r; d.style.gridColumn=c; g.appendChild(d); return d; };
  sts.forEach((st,i)=>put("pl-st", esc(st), "1", String(i+2)));
  for(let t=open;t<CONFIG.close*60;t+=60){ put("pl-hr", fmtT(t).replace(":00 "," "), `${row(t)} / span 2`, "1"); put("pl-line","",`${row(t)} / span 2`,"2 / -1"); }
  sts.forEach((st,i)=>{
    const k=`${iso(date)}|${br}|${st}`; let run=null;
    for(let t=open;t<CONFIG.close*60;t+=30){
      const mine = extraBookings.find(b=>b.k===k && b.start===t);
      if (mine){ put(`bk ${mine.cancelled?"cx":"new"}`, `<b>${mine.cancelled?"Cancelled":"You · WhatsApp"}</b><span>${esc(mine.svc)}</span>`, `${row(t)} / ${row(mine.end)}`, String(i+2)); t=mine.end-30; run=null; continue; }
      const busyHere = isBooked(date,br,st,t) && !extraBookings.some(x=>x.k===k&&t>=x.start&&t<x.end);
      if (busyHere && run){ run.end=t+30; run.el.style.gridRow=`${row(run.t)} / ${row(run.end)}`; continue; }
      if (busyHere){ const h=hash(k+t); run={t,end:t+30}; run.el=put("bk", `<b>${esc(FAKE_N[h%FAKE_N.length])}</b><span>${esc(FAKE_S[(h>>>3)%FAKE_S.length])} · ${esc(SRC[(h>>>5)%SRC.length])}</span>`, `${row(t)} / ${row(t+30)}`, String(i+2)); continue; }
      run=null;
    }
  });
  // scroll only the planner; scrollIntoView would also yank the page away from the chat on phones
  const nb=$("#sched .bk.new"), sc=$("#planWrap");
  if(nb) sc.scrollTo({top:nb.offsetTop-sc.clientHeight/3, behavior:reduceMotion?"auto":"smooth"});
}
function renderStats(){
  $("#sBook").textContent = stats.bookings;
  $("#sRev").textContent = rupee(stats.revenue);
  $("#sTime").innerHTML = stats.lastSecs!=null ? `${stats.lastSecs}<small> sec</small>` : "–";
  $("#sAdd").textContent = rupee(stats.addons);
  $("#sAfter").textContent = stats.afterHours;
  $("#sSaved").innerHTML = `${stats.mins}<small> min</small>`;
  $("#pFoot").textContent = `Men's menu: ${stats.m} · Women's menu: ${stats.w} · New Google reviews: ${stats.reviews}`;
  renderClient();
}
// CRM-style card for the client in the chat, with the reminder → confirmed → arrived tracker
function renderClient(){
  const box=$("#client");
  if (!booking){ box.innerHTML='<p class="empty">The client\'s card appears here once they book.</p>'; return; }
  const b=booking, step=(on,label)=>`<li class="${on?"is-done":""}">${label}</li>`;
  const visit = client.visits>1 ? `Returning · visit ${client.visits}` : "New client";
  box.innerHTML = `<div class="cc-top"><span class="cc-av" aria-hidden="true">DC</span><div><b>Demo client</b><span>+91 98XXX XX210 · WhatsApp</span></div><span class="tag wa">${visit}</span></div>
    <dl class="cc-rows">
      <dt>Booking</dt><dd class="${b.cancelled?"cc-x":""}">${b.id} · ${fmtDate(b.date).replace(/ \(.+\)/,"")}, ${fmtT(b.time)} · ${BR[b.branch].name}${b.cancelled?" · cancelled":""}</dd>
      <dt>Menu</dt><dd>${GNAME[b.gender]}'s</dd>
      <dt>Services</dt><dd>${esc(b.services.map(i=>SVC[i].name).join(" + "))}</dd>
      <dt>Spend</dt><dd>${rupee(b.price)}${client.addon?` (incl. ${rupee(client.addon)} add-on)`:""}</dd>
      <dt>Stylist</dt><dd>${esc(b.stylist)} (${b.picked?"client's choice · saved as preferred":"first free stylist"})</dd>
      <dt>Source</dt><dd>WhatsApp assistant${client.afterHours?" · after hours":""}</dd>
      <dt>Tags</dt><dd>${client.tags.length?esc(client.tags.join(", ")):"–"}</dd>
    </dl>
    <ol class="cc-track" aria-label="Reminder status">${step(client.reminder,"Reminder sent")}${step(client.confirmed,"Confirmed")}${step(client.arrived,"Arrived")}</ol>`;
}
function tag(t){ if(!client.tags.includes(t)) client.tags.push(t); renderClient(); }

/* ---------- understanding ---------- */
function parse(raw){
  const t = " " + raw.toLowerCase().replace(/[’']/g,"'").replace(/\s+/g," ") + " ";
  const e = {kinds:[], gender:null, branch:null, date:null, time:null, window:null, intents:new Set(), stylist:null};
  // gender
  if (/\b(men|man|male|gents|gent|boy|him|husband|son|mens|men's)\b/.test(t)) e.gender="m";
  if (/\b(women|woman|female|ladies|lady|girl|her|wife|daughter|womens|women's)\b/.test(t)) e.gender="w";
  // services
  for (const [kind,k] of Object.entries(CONFIG.kinds)) if (k.keys.some(key=>t.includes(key))) e.kinds.push(kind);
  if (!e.kinds.includes("haircut") && /\btrim\b/.test(t) && !/beard/.test(t)) e.kinds.push("haircut");
  // a service on only one menu tells us who it's for (beard → men, threading → women)
  if (!e.gender){ const only=new Set(e.kinds.map(gendersOf).filter(g=>g.length===1).map(g=>g[0])); if(only.size===1) e.gender=[...only][0]; }
  // branch
  for (const b of CONFIG.branches) if (b.keys.some(k=>t.includes(k))) e.branch=b.id;
  // date
  const t0=today0();
  if (/\b(day after tomorrow|parso|parson)\b/.test(t)) e.date=addDays(t0,2);
  else if (/\b(tomorrow|tmrw|tmr|tomorow|kal)\b/.test(t)) e.date=addDays(t0,1);
  else if (/\b(today|aaj|tonight|now|abhi)\b/.test(t)) e.date=t0;
  else {
    const wd = DAYSL.findIndex(d=>t.includes(d) || t.includes(" "+d.slice(0,3)+" "));
    if (wd>=0){ let n=(wd - t0.getDay()+7)%7; if (n===0 && /\bnext\b/.test(t)) n=7; e.date=addDays(t0,n); }
    else if (/\bweekend\b/.test(t)){ e.date=addDays(t0,(6-t0.getDay()+7)%7); }
    const dm = t.match(/\b(\d{1,2})(st|nd|rd|th)\b/);
    if (dm){ const day=+dm[1]; let d=new Date(t0.getFullYear(),t0.getMonth(),day); if(d<t0) d=new Date(t0.getFullYear(),t0.getMonth()+1,day); e.date=d; }
  }
  // time
  let m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|baje|o'?clock)\b/) || t.match(/\b(?:at|@|around|by|after)\s*(\d{1,2})(?:[:.](\d{2}))?\b(?!\s*(st|nd|rd|th))/) || t.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (m){
    let h=+m[1], mm=m[2]?+m[2]:0; const ap=m[3];
    if (ap==="pm" && h<12) h+=12; else if (ap==="am" && h===12) h=0; else if (ap!=="am" && ap!=="pm" && h>=1 && h<=9) h+=12;
    if (h>=0 && h<24) e.time = h*60 + (mm<15?0:mm<45?30:60);
  }
  if (e.time==null){
    if (/\b(morning|subah|subha)\b/.test(t)) e.window=[10*60,12*60];
    else if (/\b(afternoon|dopahar|lunch)\b/.test(t)) e.window=[12*60,16*60];
    else if (/\b(evening|shaam|sham|after work|after office)\b/.test(t)) e.window=[17*60,21*60];
    else if (/\b(night|raat|late)\b/.test(t)) e.window=[19*60,21*60];
  }
  // stylist
  for (const b of CONFIG.branches) for (const st of b.stylists) if (t.includes(" "+st.toLowerCase())) e.stylist=st;
  // intents
  const I=e.intents;
  if (/\b(hi+|hello|hey|namaste|namaskar|hola|start|menu)\b/.test(t)) I.add("greet");
  if (/\b(cancel|cancle|nahi aana|can't come|cant come)\b/.test(t)) I.add("cancel");
  if (/\b(reschedule|change (my )?(booking|appointment|time|date)|postpone|prepone|move my)\b/.test(t)) I.add("resched");
  if (/\b(price|prices|rate|rates|cost|charges|kitna|how much|price list|menu card|services)\b/.test(t)) I.add("price");
  if (/\b(offer|offers|discount|membership|deal|coupon|package)\b/.test(t)) I.add("offer");
  if (/\b(where|address|location|branch|branches|near me|directions|map)\b/.test(t)) I.add("where");
  if (/\b(human|person|staff|call me|talk to|manager|agent|someone)\b/.test(t)) I.add("human");
  if (/\b(yes|yeah|yep|confirm|ok|okay|done|book it|haan|ha|sure|perfect)\b/.test(t)) I.add("yes");
  if (/\b(thanks|thank you|thx|dhanyavad|shukriya)\b/.test(t)) I.add("thanks");
  return e;
}

/* ---------- conversation ---------- */
let convoStart=null, convoMsgs=0;

function onUser(text){
  if(!text.trim() || busy) return;
  disableOld(); userBubble(text);
  convoMsgs++;
  if(!convoStart){ convoStart=Date.now(); log("msg","New WhatsApp conversation","+91 98XXX XX210"); }
  const e = parse(text);
  const found=[];
  if(e.kinds.length) found.push(e.kinds.map(k=>CONFIG.kinds[k].label).join(" + "));
  if(e.gender) found.push(GNAME[e.gender]);
  if(e.branch) found.push(BR[e.branch].name);
  if(e.date) found.push(fmtDate(e.date).replace(/ \(.+\)/,""));
  if(e.time!=null) found.push(fmtT(e.time)); else if(e.window) found.push(windowName(e.window));
  if(e.intents.size && !found.length) found.push([...e.intents].filter(x=>x!=="yes").join(", ")||"reply");
  if(found.length) log("brain","Understood: "+found.join(" · "), "free-text message");
  route(e, text);
}
function windowName(w){ return w[0]<12*60?"Morning":w[0]<17*60?"Afternoon":"Evening"; }

function route(e){
  const I=e.intents;
  if (I.has("cancel")) return doCancel();
  if (I.has("resched")) return startResched(e);
  if (I.has("thanks") && !e.kinds.length && !e.date) return say("You're welcome! 😊 Message us here anytime to book.");
  const hasBooking = e.kinds.length||e.branch||e.date||e.time!=null||e.window;
  if (e.gender && !hasBooking && (I.has("price")||I.has("offer")||I.has("where"))) S.gender=e.gender;
  if (I.has("price") && !hasBooking) return showPrices();
  if (I.has("offer") && !hasBooking) return showOffer();
  if (I.has("where") && !e.branch && !hasBooking) return showBranches();
  if (I.has("human")) return toHuman();
  if (I.has("greet") && !hasBooking) return greet();
  // merge
  if (e.kinds.length){
    if (S.mode!=="add") S.services=[];
    S.kinds=[...new Set([...(S.mode==="add"?S.kinds:[]),...e.kinds])];
    S.mode="book";
  }
  if (e.gender) S.gender=e.gender;
  if (e.branch){ S.branch=e.branch; }
  if (e.date){ S.date=e.date; S.time=null; }
  if (e.time!=null){ S.time=e.time; S.window=null; }
  else if (e.window){ S.window=e.window; S.time=null; }
  if (e.stylist){
    // a named stylist decides the branch, since each stylist works at one salon
    const home=CONFIG.branches.find(b=>b.stylists.includes(e.stylist));
    if (S.branch && S.branch!==home.id) say(`${e.stylist} works at our ${home.name} salon, so I'll book you there.`);
    S.branch=home.id; S.stylist=e.stylist; S.pick=e.stylist;
    log("brain",`Stylist requested: ${e.stylist}`,"client's choice");
  }
  if (I.has("yes") && !hasBooking && S.pending) return S.pending();
  if (!hasBooking && !e.stylist && !e.gender) return fallback();
  next();
}

function greet(){
  say(`Hi 👋 Welcome to *${CONFIG.salon}*!\nI can book you in seconds. Just tell me what you need, for example:\n• haircut tomorrow 6pm in Baner\n• kal shaam facial`);
  askGender();
}
// We keep separate men's and women's menus, so this is asked before any service list
function askGender(){
  const what = S.kinds.length ? `the ${S.kinds.map(k=>CONFIG.kinds[k].label.toLowerCase()).join(" and ")}` : "your appointment";
  say({text:`Is ${what} for men or women? 💇‍♂️💇‍♀️`, buttons:[
    {label:"Men", go:()=>{ S.gender="m"; log("brain","Booking for: Men","showing the men's menu"); next(); }},
    {label:"Women", go:()=>{ S.gender="w"; log("brain","Booking for: Women","showing the women's menu"); next(); }}]});
}
function fallback(){
  say({text:"Sorry, I didn't quite get that 🙏 I can book appointments, share prices and offers, or connect you to the salon team.", buttons:[
    {label:"Book an appointment", go:()=>askService()},{label:"Price list", go:()=>showPrices()},{label:"Talk to the team", go:()=>toHuman()}]});
}
const menuOf = g => CONFIG.services.filter(s=>s.g===g);
function serviceSections(){
  const list=menuOf(S.gender), cats=[...new Set(list.map(s=>s.cat))];
  return cats.map(c=>({title:c, rows:list.filter(s=>s.cat===c).map(s=>({label:s.name, sub:`${rupee(s.price)} · ${s.mins} min`, go:()=>{ S.services=[...new Set([...(S.mode==="add"?S.services:[]),s.id])]; S.mode="book"; log("brain","Service picked: "+s.name); next(); }}))}));
}
function askService(){
  if (!S.gender) return askGender();
  say({text:`What would you like to book from our *${MENU[S.gender]} menu*?`, list:{label:"Choose a service", title:`${GNAME[S.gender]}'s services`, sections:serviceSections()}});
}
function showPrices(){
  const lines = g => menuOf(g).map(s=>`• ${s.name}: ${rupee(s.price)}`).join("\n");
  if (S.gender) return say({text:`*${GNAME[S.gender]}'s price list* 💇\n${lines(S.gender)}\n\nPrices include taxes. Want to book one?`, list:{label:"Book a service", title:`${GNAME[S.gender]}'s services`, sections:serviceSections()}});
  say({text:`*Price list* 💇\n\n*Men*\n${lines("m")}\n\n*Women*\n${lines("w")}\n\nPrices include taxes. Want to book one?`, buttons:[
    {label:"Book for men", go:()=>{ S.gender="m"; next(); }},{label:"Book for women", go:()=>{ S.gender="w"; next(); }}]});
}
function showOffer(){
  log("up","Offer shared: membership");
  say({text:`🎁 *This month at ${CONFIG.salon}*\n• ${CONFIG.membership}\n• 15% off any hair spa booked Mon–Thu\n• Bring a friend: you both get ₹200 off`, buttons:[{label:"Book an appointment",go:()=>askService()},{label:"Tell me about membership",go:()=>{ log("crm","Lead tagged: interested in membership"); say("Great choice! The front desk will share the membership details at your next visit, and you can activate it the same day. Shall I book you in?"); }}]});
}
function showBranches(){
  say({text:"📍 *Our salons in Pune*\n"+CONFIG.branches.map(b=>`• *${b.name}*: ${b.addr}`).join("\n")+`\n\nOpen every day, ${fmtT(CONFIG.open*60)} – ${fmtT(CONFIG.close*60)}.`, buttons:CONFIG.branches.map(b=>({label:b.name, go:()=>{S.branch=b.id; next();}}))});
}
function toHuman(){
  log("user","Handed over to front desk","staff get the chat in the team inbox");
  say("Sure, I've passed this chat to our front desk 🙋‍♀️ Someone will reply here within a few minutes during salon hours.");
  act(()=>sysNote("In a live setup, the salon team takes over this chat from a shared inbox."));
}

function next(){
  S.pending=null;
  if (!S.gender) return askGender();
  const missing=resolveServices();
  if (missing.length) say(`Sorry, ${missing.join(" and ")} isn't on our ${MENU[S.gender]} menu.`);
  if (!S.services.length) return askService();
  if (!S.branch) return say({text:`Which salon suits you best for your *${svcNames()}*?`, buttons:CONFIG.branches.map(b=>({label:b.name, go:()=>{S.branch=b.id; log("brain","Branch picked: "+b.name); next();}}))});
  if (!S.pick && !S.stylist) return askStylist();
  renderSched();
  if (!S.date) return askDate();
  if (S.time==null) return offerSlots();
  checkTime();
}
function askStylist(){
  const b=BR[S.branch];
  const rows=[...b.stylists.map(st=>({label:st, sub:CONFIG.stylistNotes[st]||"", go:()=>pickStylist(st)})),
    {label:"Anyone available", sub:"Gets you the earliest free slot", go:()=>pickStylist("any")}];
  say({text:`Do you have a favourite stylist at ${b.name}?`, buttons:[{label:"Anyone available", go:()=>pickStylist("any")}],
    list:{label:"Choose a stylist", title:`Stylists at ${b.name}`, sections:[{rows}]}});
}
function pickStylist(st){
  S.pick=st; S.stylist = st==="any" ? null : st;
  log("brain", st==="any" ? "Stylist: anyone available" : `Stylist picked: ${st}`, st==="any" ? "earliest free slot" : "client's choice");
  next();
}
function askDate(){
  const t0=today0();
  const rows=[]; for(let i=0;i<7;i++){ const d=addDays(t0,i); const n=allFree(d,S.branch,totalMins()).length; rows.push({label:fmtDate(d), sub:n?`${n} slots free`:"Fully booked", go:()=>{S.date=d; next();}}); }
  say({text:`Which day works for you? (${BR[S.branch].name})`, buttons:[
    {label:"Today",go:()=>{S.date=t0;next();}},{label:"Tomorrow",go:()=>{S.date=addDays(t0,1);next();}}], list:{label:"Another day", title:"Pick a day", sections:[{rows}]}});
}
function offerSlots(note){
  const mins=totalMins();
  let free = allFree(S.date,S.branch,mins);
  if (!free.length){
    log("warn",`No free slots on ${fmtDate(S.date).replace(/ \(.+\)/,"")}`,"checked next days automatically");
    let d=S.date; for(let i=1;i<8;i++){ const dd=addDays(S.date,i); if(allFree(dd,S.branch,mins).length){ d=dd; break; } }
    const was=fmtDate(S.date).replace(/ \(.+\)/,"");
    S.date=d; renderSched();
    say(`${was} is fully booked ${picked()?`for ${picked()}`:`at ${BR[S.branch].name}`} 😕 The next free day is *${fmtDate(d)}*.`);
    return offerSlots();
  }
  let pool = S.window ? free.filter(f=>f.t>=S.window[0] && f.t<S.window[1]) : free;
  if (S.window && !pool.length){ say(`No ${windowName(S.window).toLowerCase()} slots left on that day, but these are free:`); pool=free; }
  const pick=[]; const step=Math.max(1,Math.floor(pool.length/9)); for(let i=0;i<pool.length&&pick.length<9;i+=step) pick.push(pool[i]);
  const sec=[["Morning",0,12*60],["Afternoon",12*60,17*60],["Evening",17*60,24*60]].map(([n,a,b])=>({title:n, rows:pick.filter(p=>p.t>=a&&p.t<b).map(p=>({label:fmtT(p.t), sub:`with ${p.st}`, go:()=>{S.time=p.t; S.stylist=p.st; next();}}))})).filter(s=>s.rows.length);
  log("cal",`Checked live calendar: ${free.length} free slots`, BR[S.branch].name);
  say({text:(note?note+"\n":"")+`Here are the free times on *${fmtDate(S.date)}* at ${BR[S.branch].name} for ${svcNames()} (${totalMins()} min)${picked()?` with *${picked()}*`:""}:`, list:{label:"See free times", title:"Free times", sections:sec}});
}
function checkTime(){
  const mins=totalMins();
  if (S.time < CONFIG.open*60 || S.time+mins > CONFIG.close*60){
    const t=S.time; S.time=null; return offerSlots(`We're open ${fmtT(CONFIG.open*60)} – ${fmtT(CONFIG.close*60)}, so ${fmtT(t)} won't work.`);
  }
  if (S.time < minStart(S.date)){ const t=S.time; S.time=null; return offerSlots(`${fmtT(t)} has already passed today.`); }
  const st = freeAt(S.date,S.branch,S.time,mins,S.stylist);
  if (!st){
    const free=allFree(S.date,S.branch,mins);
    const near=free.sort((a,b)=>Math.abs(a.t-S.time)-Math.abs(b.t-S.time)).slice(0,3).sort((a,b)=>a.t-b.t);
    log("warn",`${fmtT(S.time)} is fully booked`,"offered the nearest free slots");
    const asked=S.time; S.time=null;
    if(!near.length) return offerSlots();
    const buttons=near.map(n=>({label:`${fmtT(n.t)} · ${n.st}`, go:()=>{S.time=n.t; S.stylist=n.st; next();}}));
    // the chosen stylist is busy: also offer the asked time with whoever else is free
    const other = picked() && BR[S.branch].stylists.find(x=>x!==picked() && stylistFree(S.date,S.branch,x,asked,mins));
    if (other) buttons.push({label:`${fmtT(asked)} with ${other} instead`, go:()=>{ S.pick=other; S.stylist=other; S.time=asked; log("brain",`Switched stylist to ${other}`,"to keep the client's time"); next(); }});
    return say({text:`${picked()?`${picked()} is booked`:"Fully booked"} at ${fmtT(asked)} ${onDay(S.date)} 😕\nThe closest free times${picked()?` with ${picked()}`:""} are:`, buttons});
  }
  if (S.stylist && st!==S.stylist) say(`${S.stylist} isn't free then, so I've put you with *${st}*, one of our senior stylists ✨`);
  S.chosen=st; confirmCard();
}
function confirmCard(){
  const b=BR[S.branch];
  S.pending=doConfirm;
  say({text:`Please confirm your booking 👇\n\n💇 *${svcNames()}*\n📍 ${CONFIG.salon}, ${b.name}\n📅 ${fmtDate(S.date)}\n⏰ ${fmtT(S.time)} (${totalMins()} min)\n👤 Stylist: ${S.chosen}\n💰 ${rupee(totalPrice())}, pay at the salon`,
    buttons:[{label:"Confirm booking ✅",go:doConfirm},{label:"Change time",go:()=>{S.time=null; if(!picked()) S.stylist=null; offerSlots();}},{label:"Add a service",go:()=>{S.mode="add";S.priceOverride=null;askService();}}]});
}
function doConfirm(){
  S.pending=null;
  const k=`${iso(S.date)}|${S.branch}|${S.chosen}`;
  if (booking && !booking.cancelled && S.reschedFrom){ const old=extraBookings.find(x=>x.id===booking.id); if(old) old.cancelled=true; }
  const id="SS-"+(1040+stats.bookings+1);
  const rec={id,k,start:S.time,end:S.time+Math.ceil(totalMins()/30)*30,svc:svcNames(),cancelled:false};
  extraBookings.push(rec);
  const resched = !!(booking && S.reschedFrom);
  booking={id,date:S.date,branch:S.branch,time:S.time,stylist:S.chosen,picked:!!picked(),gender:S.gender,services:[...S.services],price:totalPrice(),cancelled:false};
  if(!resched){
    stats.bookings++; stats.revenue+=booking.price; stats[booking.gender]++; stats.mins+=4;
    const h=new Date().getHours(), after=h<CONFIG.open||h>=CONFIG.close;
    if (after) stats.afterHours++;
    Object.assign(client,{visits:client.visits+1, addon:0, afterHours:after, reminder:false, confirmed:false, arrived:false});
  }
  else { stats.revenue += booking.price - S.reschedFrom.price; stats.mins+=3; client.reminder=client.confirmed=false; }
  if (convoStart && !resched) stats.lastSecs=Math.max(1,Math.round((Date.now()-convoStart)/1000));
  S.reschedFrom=null;
  const wasResched=resched;
  say({text:`🎉 *You're booked!*\nBooking ID: *${id}*\n${svcNames()} with ${booking.stylist}\n${fmtDate(booking.date)} at ${fmtT(booking.time)}\n${CONFIG.salon}, ${BR[booking.branch].name}\n\nI'll remind you 3 hours before. Reply *reschedule* or *cancel* anytime.`});
  act(()=>{
    log("ok",`${resched?"Booking moved":"Booking created"}: ${id}`,`${svcNames()} · ${fmtT(booking.time)}`);
    log("cal",`Added to ${booking.stylist}'s calendar`,"Google Calendar / salon software");
    log("crm","Client saved to CRM","name, number, services, spend");
    log("bell","Reminder scheduled","3 hours before the appointment");
    renderSched(); renderStats();
  });
  if (wasResched) demoNext(); else upsell();
}
function upsell(){
  const has=id=>booking.services.includes(id);
  let offer=null;
  const deal=(id,price,why)=>({id, price, text:`💡 ${why} Add *${SVC[id].name}* for just ${rupee(price)} (normally ${rupee(SVC[id].price)})?`});
  if (has("hcm") && !has("brd")) offer=deal("brd",250,"Your stylist has 30 minutes free right after.");
  else if ((has("hcw")||has("colw")) && !has("spaw")) offer=deal("spaw",1500,"Colour and cuts last longer after a hair spa.");
  else if (has("colm") && !has("spam")) offer=deal("spam",1000,"Colour lasts longer after a hair spa.");
  else if (has("pedw") && !has("manw")) offer=deal("manw",600,"Make it a set:");
  else if (has("pedm") && !has("manm")) offer=deal("manm",450,"Make it a set:");
  if (!offer){ return say({text:`💡 Members save 20% on every visit. ${CONFIG.membership}.`, buttons:[{label:"Interested",go:()=>{log("crm","Lead tagged: interested in membership"); tag("Interested in membership");say("Noted! The front desk will set it up at your visit, and today's bill will get the discount 🙌"); demoNext();}},{label:"No thanks",go:()=>{say("No problem 😊"); demoNext();}}]}); }
  act(()=>log("up","Upsell offered: "+SVC[offer.id].name,"based on the services booked"));
  say({text:offer.text, buttons:[
    {label:"Yes, add it",go:()=>{
      const rec=extraBookings.find(x=>x.id===booking.id);
      const k=rec.k; const s=rec.end, need=Math.ceil(SVC[offer.id].mins/30)*30;
      let ok=true; for(let t=s;t<s+need;t+=30) if(t+30>CONFIG.close*60 || isBooked(booking.date,booking.branch,booking.stylist,t)) ok=false;
      booking.services.push(offer.id); booking.price+=offer.price; stats.revenue+=offer.price; stats.addons+=offer.price; client.addon+=offer.price; rec.svc=booking.services.map(i=>SVC[i].name).join(" + ");
      if(ok) rec.end=s+need;
      log("ok",`Upsell accepted: +${rupee(offer.price)}`, booking.id);
      renderSched(); renderStats();
      say(`Done ✅ ${SVC[offer.id].name} added. New total: *${rupee(booking.price)}*. See you soon!`); demoNext();
    }},
    {label:"No thanks",go:()=>{say("No problem 😊 See you soon!"); demoNext();}}]});
}
function demoNext(){
  act(()=>{
    sysNote("Demo: jump ahead to see what happens next");
    botRender({text:"⏩ *Demo controls*\nThese messages are sent automatically later on.", buttons:[
      {label:"Show the reminder",go:showReminder},{label:"Show the after-visit message",go:showAfter},{label:"Show the owner's daily summary",go:ownerSummary},{label:"Start a new booking",go:()=>{S=freshState(); convoStart=Date.now(); askService();}}]});
  });
}
// The message the salon owner gets on their own WhatsApp at closing time
function ownerSummary(){
  sysNote(`⏩ ${fmtT(CONFIG.close*60)} · this goes to the owner's WhatsApp, not the client`);
  log("user","Daily summary sent to the owner","every day at closing time");
  say(`📊 *${CONFIG.salon} · today's summary*\n• Bookings via WhatsApp: ${stats.bookings} (men's ${stats.m}, women's ${stats.w})\n• Revenue booked: ${rupee(stats.revenue)}, incl. ${rupee(stats.addons)} from add-ons\n• Booked after hours: ${stats.afterHours}\n• Reminders sent: ${stats.reminders} · confirmed: ${stats.confirmed}\n• Cancellations: ${stats.cancelled} (slots reopened)\n• New Google reviews: ${stats.reviews}\n• Front-desk time saved: about ${stats.mins} min`);
}
function showReminder(){
  if(!booking||booking.cancelled) return say("There's no active booking to remind you about.");
  sysNote(`⏩ ${fmtDate(booking.date).replace(/ \(.+\)/,"")}, 3 hours before`);
  log("bell","Reminder sent", booking.id);
  stats.reminders++; client.reminder=true; renderStats();
  say({text:`⏰ *Reminder*: your ${booking.services.map(i=>SVC[i].name).join(" + ")} with ${booking.stylist} is today at *${fmtT(booking.time)}*.\n📍 ${BR[booking.branch].addr}\n\nAre you still coming?`, buttons:[
    {label:"Yes, I'll be there",go:()=>{log("ok","Client confirmed attendance",booking.id); stats.confirmed++; client.confirmed=true; renderStats(); say("Great, see you soon! 😊"); demoAfterOnly();}},
    {label:"Reschedule",go:()=>startResched(parse(""))},
    {label:"Cancel",go:doCancel}]});
}
function demoAfterOnly(){ act(()=>botRender({text:"⏩ *Demo controls*", buttons:[{label:"Show the after-visit message",go:showAfter},{label:"Show the owner's daily summary",go:ownerSummary}]})); }
function showAfter(){
  if(!booking) return say("Book something first to see this.");
  sysNote("⏩ 2 hours after the visit");
  log("star","Review request sent", booking.id);
  client.arrived=true; renderStats();
  say({text:`Hope you loved your visit to ${CONFIG.salon}, ${BR[booking.branch].name} 💛\nHow was your experience with ${booking.stylist}?`, buttons:[
    {label:"⭐⭐⭐⭐⭐ Loved it",go:()=>{ log("star","5★ rating → sent Google review link"); stats.reviews++; tag("Gave 5★ rating"); renderStats(); say("Thank you so much! 🙏 It would really help us if you could leave a quick Google review:\n🔗 g.page/your-salon/review"); rebook(); }},
    {label:"It was okay",go:()=>{ log("user","Feedback flagged to manager","3★ rating, manager will call"); tag("Manager to call"); say("Thanks for telling us. Our salon manager will call you today to make it right 🙏"); rebook(); }},
    {label:"Not happy",go:()=>{ log("warn","Unhappy client: urgent alert to owner","kept out of public reviews"); tag("Owner alerted"); say("We're really sorry 😔 The owner has been told and will call you within the hour."); }}]});
}
function rebook(){
  const d=addDays(booking.date,28);
  act(()=>log("cal","Rebooking reminder set","4 weeks after the visit"));
  say({text:`📅 Most clients come back every 4 weeks. Shall I hold *${fmtDate(d)} at ${fmtT(booking.time)}* with ${booking.stylist} for you?`, buttons:[
    {label:"Yes, book it",go:()=>{ S=freshState(); S.services=[...booking.services]; S.gender=booking.gender; S.branch=booking.branch; S.date=d; S.time=booking.time; S.stylist=booking.stylist; S.pick=booking.stylist; next(); }},
    {label:"Remind me later",go:()=>{ log("bell","Will nudge again in 4 weeks"); say("Sure! I'll message you in about 4 weeks 😊"); }}]});
}
function startResched(e){
  if(!booking||booking.cancelled) return say({text:"I can't find an active booking on this number. Would you like to make a new one?", buttons:[{label:"Book an appointment",go:()=>askService()}]});
  const keep=S; S=freshState();
  S.services=[...booking.services]; S.gender=booking.gender; S.branch=booking.branch; S.stylist=booking.stylist; S.pick=booking.stylist; S.reschedFrom={...booking}; S.priceOverride=booking.price;
  if(e && e.date) S.date=e.date; if(e && e.time!=null) S.time=e.time; else if(e && e.window) S.window=e.window;
  log("brain","Reschedule request",booking.id);
  say(`No problem! Let's move your *${svcNames()}* (${booking.id}).`);
  next();
}
function doCancel(){
  if(!booking||booking.cancelled) return say("There's no active booking on this number to cancel.");
  const rec=extraBookings.find(x=>x.id===booking.id); if(rec) rec.cancelled=true;
  booking.cancelled=true; stats.revenue-=booking.price; stats.cancelled++; stats.mins+=2;
  log("x",`Booking cancelled: ${booking.id}`,"slot freed for other clients");
  log("crm","Win-back follow-up scheduled","in 7 days");
  renderSched(); renderStats();
  say({text:`Your booking *${booking.id}* is cancelled, and the slot has been freed up. Would you like to pick another time instead?`, buttons:[{label:"Pick another time",go:()=>startRescheduleAfterCancel()},{label:"No, thanks",go:()=>say("Okay! Message us anytime 😊")}]});
}
function startRescheduleAfterCancel(){ S=freshState(); S.services=[...booking.services]; S.gender=booking.gender; S.branch=booking.branch; S.stylist=booking.stylist; S.pick=booking.stylist; S.reschedFrom={...booking,price:0}; booking.cancelled=true; next(); }

/* ---------- boot ---------- */
function boot(){
  S=freshState(); booking=null; extraBookings=[];
  stats={bookings:0,revenue:0,lastSecs:null,addons:0,afterHours:0,mins:0,m:0,w:0,reviews:0,reminders:0,confirmed:0,cancelled:0};
  client={visits:0,addon:0,afterHours:false,tags:[],reminder:false,confirmed:false,arrived:false};
  convoStart=null; queue.length=0; busy=false; lastInteractive=[];
  clearTimeout(flashTimer); $("#liveStrip").hidden=true;
  chat.innerHTML='<div class="day">Today</div><div class="enc">🔒 Demo chat. Messages stay in your browser and no real booking is made.</div>';
  $("#feed").innerHTML='<div class="empty">Send a message in the chat to start.</div>';
  renderSched(); renderStats();
}
$("#form").onsubmit = ev => { ev.preventDefault(); const v=inp.value; inp.value=""; onUser(v); };
document.querySelectorAll("#tries .scene-tab").forEach(c=>c.onclick=()=>{ onUser(c.textContent); });
$("#reset").onclick=boot;
// Branch tabs above the planner: view any salon's day without changing the booking
CONFIG.branches.forEach(b=>{ const t=document.createElement("button"); t.type="button"; t.className="scene-tab"; t.dataset.br=b.id; t.textContent=b.name; t.onclick=()=>renderSched(b.id); $("#brTabs").appendChild(t); });
boot();
