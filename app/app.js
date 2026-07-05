/* ============================================================
   YD Detailers — operator app logic
   Two data sources: 'seed' (localStorage, default) and 'live' (Firestore + Google Sign-In).
   Schema maps to the real YDdetailers CRM (bookings / clients / expenses).
   ============================================================ */

const FB_CONFIG = { apiKey:"AIzaSyBSy3p1NAPspnYr8qLePbKUrZWNIiOqU8E", authDomain:"yddetailers.firebaseapp.com", projectId:"yddetailers" };
let db = null;

const App = { source:'seed', jobs:[], clients:[], expenses:[], user:null, tab:'jobs', jobView:'today', moneyPeriod:'week', moneyOffset:0, _unsub:[], photoKeys:new Set(), _dismissReconcile:false };

const SERVICES = [
  {id:'exterior', name:'Premium Exterior Detail', cat:'ext',  prices:{Sedan:90,  SUV:100, Truck:120}},
  {id:'interior', name:'Interior Reset Detail',   cat:'int',  prices:{Sedan:150, SUV:180, Truck:200}},
  {id:'full',     name:'Signature Full Vehicle Detail', cat:'full', prices:{Sedan:220, SUV:260, Truck:300}},
];
const VTYPES = ['Sedan','SUV','Truck'];
const ADDONS = [
  {id:'ceramic',    cat:'ext', name:'Ceramic Coating',        price:50},
  {id:'wax',        cat:'ext', name:'Wax Sealant',            price:35},
  {id:'clay',       cat:'ext', name:'Clay Bar Treatment',     price:40},
  {id:'enginebay',  cat:'ext', name:'Engine Bay Cleaning',    price:50},
  {id:'sap',        cat:'ext', name:'Tree Sap Removal',       price:35},
  {id:'trim',       cat:'ext', name:'Trim / Mat Restoration', price:35},
  {id:'pethair',    cat:'int', name:'Pet Hair Removal',       price:30},
  {id:'protectant', cat:'int', name:'Interior Protectant',    price:30},
];
function svcById(id){ return SERVICES.find(s=>s.id===id); }
function addonsForCat(cat){ if(cat==='int') return ADDONS.filter(a=>a.cat==='int'); if(cat==='ext') return ADDONS.filter(a=>a.cat==='ext'); return ADDONS; }
const METHODS = ['Cash','Zelle','Venmo','Card'];
const AVC = ['linear-gradient(150deg,#E4832F,#CE6E1B)','linear-gradient(150deg,#8A6BD8,#6B4FBB)','linear-gradient(150deg,#5385E0,#3E68C4)','linear-gradient(150deg,#22A579,#178560)','linear-gradient(150deg,#EF6B5E,#D8493A)','linear-gradient(150deg,#E8739B,#CE5480)','linear-gradient(150deg,#5FA8B5,#3E8592)'];

/* ---------- icons ---------- */
const IC = {
  svc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 21l-5 2.6 1-5.5-4-3.9 5.5-.8z" stroke-linejoin="round"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4" stroke-linecap="round"/></svg>',
  dollar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-6.5-4.4-9-8.5C1.3 9.7 2.5 6 6 6c2 0 3.2 1.2 4 2.3C10.8 7.2 12 6 14 6c3.5 0 4.7 3.7 3 6.5-2.5 4.1-9 8.5-9 8.5z" stroke-linejoin="round"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14l3-3 3 2 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13l1.8-4.4A3 3 0 0 1 7.6 6.7h8.8a3 3 0 0 1 2.8 1.9L21 13v4a1 1 0 0 1-1 1h-1M6 18H5a1 1 0 0 1-1-1v-4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/></svg>',
  carLine:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M3 13l1.8-4.4A3 3 0 0 1 7.6 6.7h8.8a3 3 0 0 1 2.8 1.9L21 13"/><path d="M2.5 13h19v3.2a1 1 0 0 1-1 1H20"/><path d="M5 17.2H4a1 1 0 0 1-1-1V13"/><circle cx="7.5" cy="17.2" r="1.9"/><circle cx="16.5" cy="17.2" r="1.9"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3.5-6 7-6s7 2 7 6" stroke-linecap="round"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke-linecap="round"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6M18 14.5c2.3.6 4 2.4 4 5.5" stroke-linecap="round"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5c0 9 6 15 15 15l-1-4-4-1-2 2c-2-1-4-3-5-5l2-2-1-4z" stroke-linejoin="round"/></svg>',
  msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" stroke-linejoin="round"/></svg>',
  nav:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8-8 18-2-8z" stroke-linejoin="round"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" stroke-linejoin="round"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M7 5l12 7-12 7z" stroke-linejoin="round"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4" stroke-linecap="round"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 5 5.6.8-4 3.9 1 5.5L12 20l-5 2.7 1-5.5-4-3.9 5.6-.8z"/></svg>',
  camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M8 6l1.2-2.2A2 2 0 0 1 11 3h2a2 2 0 0 1 1.8 1L16 6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2"/></svg>',
  cloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 18 18z" stroke-linejoin="round"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke-linecap="round"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>',
  reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ---------- utils ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pad(n){ return String(n).padStart(2,'0'); }
function isoOf(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function todayISO(){ return isoOf(new Date()); }
function addDays(iso,n){ const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return isoOf(d); }
function dowMon(iso){ const d=new Date(iso+'T00:00:00'); return (d.getDay()+6)%7; }
function weekStart(iso){ return addDays(iso, -dowMon(iso)); }
function inRange(iso,a,b){ return iso>=a && iso<=b; }
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function monShort(iso){ return MON[+iso.slice(5,7)-1]; }
function dayNum(iso){ return +iso.slice(8,10); }
function fmtDateShort(iso){ return monShort(iso)+' '+dayNum(iso); }
function dowName(iso){ return DOW[new Date(iso+'T00:00:00').getDay()]; }
function time12(t){ if(!t) return {t:'--',ap:''}; let [h,m]=t.split(':').map(Number); const ap=h<12?'AM':'PM'; let hh=h%12; if(hh===0)hh=12; return {t:hh+':'+pad(m),ap}; }
function fmtTime(t){ const p=time12(t); return p.t+' '+p.ap; }
function cityOf(addr){ if(!addr) return ''; const p=addr.split(','); return p.length>1?p[1].trim():''; }
function initials(n){ return (String(n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('')||'?').toUpperCase(); }
function avColor(n){ let h=0; for(const c of String(n||'')) h=(h*31+c.charCodeAt(0))>>>0; return AVC[h%AVC.length]; }
function sum(a){ return a.reduce((s,x)=>s+(+x||0),0); }
function money(n){ return '$'+Math.round(n).toLocaleString('en-US'); }
function vehColor(v){ v=String(v||'').toLowerCase(); const m={black:'#141414',mythos:'#141414',sapphire:'#1a2540',navy:'#1a2540',blue:'#22406e',white:'#eef0f2',pearl:'#f0f2f4',silver:'#c9cdd2',grey:'#5c6066',gray:'#5c6066',steel:'#5c6066',magnetic:'#5c5f63',red:'#7a2b2b',green:'#3d5138',sarge:'#3d5138'}; for(const k in m) if(v.includes(k)) return m[k]; return '#3a3f45'; }

/* ---------- status ---------- */
function statusOf(j){
  if(j.status==='cancelled'||j.status==='noshow') return 'cancelled';
  if(j.status==='completed') return (j.paid===false)?'collect':'paid';
  if(j.startedAt) return 'progress';
  return 'upcoming';
}
const STMETA = { paid:['paid','Paid'], progress:['progress','In progress'], upcoming:['upcoming','Upcoming'], collect:['collect','Collect $'], cancelled:['cancelled','Cancelled'] };

/* ---------- mapping (live <-> app) ---------- */
function vehName(b){ return b.vehicle || b.vehicleModel || b.car || [b.vehName,b.vehType].filter(Boolean).join(' ') || 'Vehicle'; }
function bookingToJob(b){
  return { id:b.id, name:b.name||'Client', clientId:b.clientId||'', phone:b.phone||'', email:b.email||'',
    vehicle:vehName(b), vehType:b.vehType||'', service:b.service||'Detail', serviceId:b.serviceId||'', price:+b.price||0, tip:+b.tip||0, addons:Array.isArray(b.addons)?b.addons:[],
    date:b.date||'', time:(b.time||'').slice(0,5), address:b.address||'', notes:b.notes||'',
    status:b.status||'', paid:(typeof b.paid==='boolean')?b.paid:undefined, paymentMethod:b.paymentMethod||b.payment||'',
    startedAt:b.startedAt||null };
}
function jobToBooking(j){
  const o = { name:j.name, clientId:j.clientId||'', phone:j.phone||'', email:j.email||'', service:j.service, serviceId:j.serviceId||'', price:+j.price||0,
    basePrice:+j.basePrice||0, addonTotal:+j.addonTotal||0, tip:+j.tip||0, addons:j.addons||[], date:j.date, time:j.time, address:j.address||'', notes:j.notes||'',
    status:j.status||'', payment:j.paymentMethod||'', vehicle:j.vehicle||'', vehName:j.vehicle||'', vehType:j.vehType||'', manual:true, updatedAt:Date.now() };
  if(typeof j.paid==='boolean') o.paid=j.paid;
  if(j.startedAt) o.startedAt=j.startedAt;
  return o;
}
function clientToClient(c){ return { id:c.id, name:c.name||'Client', phone:c.phone||'', email:c.email||'', tag:c.tag||'', status:c.status||'', notes:c.notes||'' }; }
function clientToDoc(c){ return { name:c.name, phone:c.phone||'', email:c.email||'', tag:c.tag||'', status:c.status||'', notes:c.notes||'', updatedAt:Date.now() }; }

/* ---------- client aggregation ---------- */
function jobsForClient(c){ return App.jobs.filter(j=> (c.id && j.clientId===c.id) || (j.name && j.name===c.name)); }
function clientAgg(c){
  const js = jobsForClient(c);
  const done = js.filter(j=>j.status==='completed');
  const spend = sum(done.map(j=>j.price + (j.tip||0)));
  const tips = done.filter(j=>(j.tip||0)>0);
  const avgTip = tips.length? Math.round(sum(tips.map(j=>j.tip))/tips.length):0;
  const lastAddr = js.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  return { visits:done.length, spend, avgTip, city:cityOf(lastAddr&&lastAddr.address), vehicle:c.tag||(lastAddr&&lastAddr.vehicle)||'', jobs:js };
}

/* ============================================================
   SEED
   ============================================================ */
function buildSeed(){
  const T = todayISO();
  const clients = [
    {id:'c1', name:'Grace Liu', phone:'(617) 555-0110', email:'grace.liu@example.com', tag:'2022 Mercedes GLC 300', status:'vip', notes:'Prefers weekend mornings.'},
    {id:'c2', name:'Dave Coughlin', phone:'(617) 555-0188', email:'dcoughlin@example.com', tag:'2021 Audi Q5', status:'vip', notes:'Golden retriever, always pet hair.'},
    {id:'c3', name:'Ben Kaplan', phone:'(617) 555-0155', email:'', tag:'2022 BMW X3', status:'regular', notes:''},
    {id:'c4', name:'Sofia Almeida', phone:'(781) 555-0126', email:'sofia.a@example.com', tag:'2018 Jeep Wrangler', status:'regular', notes:'Off-roads on weekends.'},
    {id:'c5', name:'Priya Raman', phone:'(781) 555-0119', email:'', tag:'2019 Honda Odyssey', status:'regular', notes:'Three kids, second row gets messy.'},
    {id:'c6', name:'Marcus Bell', phone:'(617) 555-0173', email:'', tag:'2023 Tesla Model 3', status:'new', notes:'Low water pressure at building.'},
    {id:'c7', name:'Rachel Kim', phone:'(617) 555-0142', email:'', tag:'2020 Toyota RAV4', status:'regular', notes:''},
    {id:'c8', name:'Tom Alvarez', phone:'(617) 555-0164', email:'', tag:'2020 Honda Accord', status:'new', notes:''},
  ];
  const j=[]; let n=1; const mk=(o)=>{ o.id='seed-b-'+(n++); j.push(o); return o; };
  // today
  mk({name:'Rachel Kim',clientId:'c7',phone:'(617) 555-0142',vehicle:'2020 Toyota RAV4 Magnetic Grey',service:'Exterior Detail',price:130,tip:15,addons:['Bug removal','Tire shine'],date:T,time:'07:00',address:'33 Highland Ave, West Newton',notes:'Watch for sap on the hood.',status:'completed',paid:true,paymentMethod:'Venmo'});
  mk({name:'Dave Coughlin',clientId:'c2',phone:'(617) 555-0188',vehicle:'2021 Audi Q5 Mythos Black',service:'Signature Full Detail',price:220,tip:0,addons:['Clay bar','Ceramic spray','Pet hair'],date:T,time:'08:30',address:'42 Walnut St, Newtonville',notes:'Golden retriever, so heavy hair in back seats and trunk. Gate code #4412. Park in driveway, not street.',status:'',startedAt:Date.now()-22*60000});
  mk({name:'Priya Raman',clientId:'c5',phone:'(781) 555-0119',vehicle:'2019 Honda Odyssey Lunar Silver',service:'Interior Reset',price:170,tip:0,addons:['Steam clean','Leather condition'],date:T,time:'10:30',address:'15 Hancock St, Auburndale',notes:'Three kids, so expect crumbs and juice stains in second row.',status:''});
  mk({name:'Marcus Bell',clientId:'c6',phone:'(617) 555-0173',vehicle:'2023 Tesla Model 3 Pearl White',service:'Exterior Detail',price:130,tip:0,addons:['Bug removal'],date:T,time:'12:30',address:'88 Grove St, Watertown',notes:'Prefers waterless rinse, low water pressure at building.',status:''});
  mk({name:'Sofia Almeida',clientId:'c4',phone:'(781) 555-0126',vehicle:'2018 Jeep Wrangler Sarge Green',service:'Signature Full Detail',price:240,tip:0,addons:['Undercarriage','Ceramic spray'],date:T,time:'14:30',address:'271 Waverley Ave, Waltham',notes:'Back from a trail weekend, heavy mud on mats. Soft top, do not power wash the seams.',status:''});
  mk({name:'Ben Kaplan',clientId:'c3',phone:'(617) 555-0155',vehicle:'2022 BMW X3 Black Sapphire',service:'Interior Reset',price:160,tip:0,addons:['Steam clean','Odor treatment'],date:T,time:'16:30',address:'60 Hartman Rd, Newton Centre',notes:'Job complete, collect $160 cash on pickup. Smoke smell treated.',status:'completed',paid:false});
  // this week (earlier)
  mk({name:'Tom Alvarez',clientId:'c8',phone:'(617) 555-0164',vehicle:'2020 Honda Accord Modern Steel',service:'Interior Reset',price:150,tip:25,addons:['Steam clean'],date:addDays(T,-1),time:'11:00',address:'12 Cabot St, Newton',status:'completed',paid:true,paymentMethod:'Card'});
  mk({name:'Grace Liu',clientId:'c1',phone:'(617) 555-0110',vehicle:'2022 Mercedes GLC 300 Selenite Grey',service:'Signature Full Detail',price:240,tip:50,addons:['Ceramic spray'],date:addDays(T,-1),time:'14:00',address:'9 Beacon St, Brookline',status:'completed',paid:true,paymentMethod:'Zelle'});
  mk({name:'Marcus Bell',clientId:'c6',phone:'(617) 555-0173',vehicle:'2023 Tesla Model 3 Pearl White',service:'Exterior Detail',price:130,tip:10,addons:[],date:addDays(T,-3),time:'09:30',address:'88 Grove St, Watertown',status:'completed',paid:true,paymentMethod:'Cash'});
  mk({name:'Sofia Almeida',clientId:'c4',phone:'(781) 555-0126',vehicle:'2018 Jeep Wrangler Sarge Green',service:'Exterior Detail',price:130,tip:20,addons:['Bug removal'],date:addDays(T,-3),time:'13:00',address:'271 Waverley Ave, Waltham',status:'completed',paid:true,paymentMethod:'Zelle'});
  mk({name:'Grace Liu',clientId:'c1',phone:'(617) 555-0110',vehicle:'2022 Mercedes GLC 300 Selenite Grey',service:'Interior Reset',price:170,tip:35,addons:['Leather condition'],date:addDays(T,-4),time:'10:00',address:'9 Beacon St, Brookline',status:'completed',paid:true,paymentMethod:'Zelle'});
  // earlier weeks (for monthly)
  mk({name:'Ben Kaplan',clientId:'c3',phone:'(617) 555-0155',vehicle:'2022 BMW X3 Black Sapphire',service:'Exterior Detail',price:130,tip:20,addons:[],date:addDays(T,-9),time:'12:00',address:'60 Hartman Rd, Newton Centre',status:'completed',paid:true,paymentMethod:'Card'});
  mk({name:'Dave Coughlin',clientId:'c2',phone:'(617) 555-0188',vehicle:'2021 Audi Q5 Mythos Black',service:'Signature Full Detail',price:220,tip:40,addons:['Clay bar'],date:addDays(T,-11),time:'09:00',address:'42 Walnut St, Newtonville',status:'completed',paid:true,paymentMethod:'Zelle'});
  mk({name:'Priya Raman',clientId:'c5',phone:'(781) 555-0119',vehicle:'2019 Honda Odyssey Lunar Silver',service:'Interior Reset',price:150,tip:25,addons:['Steam clean'],date:addDays(T,-16),time:'15:00',address:'15 Hancock St, Auburndale',status:'completed',paid:true,paymentMethod:'Card'});
  mk({name:'Tom Alvarez',clientId:'c8',phone:'(617) 555-0164',vehicle:'2020 Honda Accord Modern Steel',service:'Interior Reset',price:150,tip:20,addons:[],date:addDays(T,-18),time:'11:30',address:'12 Cabot St, Newton',status:'completed',paid:true,paymentMethod:'Card'});
  mk({name:'Grace Liu',clientId:'c1',phone:'(617) 555-0110',vehicle:'2022 Mercedes GLC 300 Selenite Grey',service:'Signature Full Detail',price:240,tip:45,addons:['Ceramic spray'],date:addDays(T,-23),time:'10:30',address:'9 Beacon St, Brookline',status:'completed',paid:true,paymentMethod:'Zelle'});
  const expenses = [
    {id:'e1',amount:1139.73,category:'equipment',desc:'Steam cleaner + polisher',date:addDays(T,-25)},
    {id:'e2',amount:90,category:'marketing',desc:'Nextdoor Local Deal',date:addDays(T,-12)},
    {id:'e3',amount:22.29,category:'supplies',desc:'Microfiber + soap',date:addDays(T,-6)},
  ];
  return { clients, jobs:j, expenses };
}

/* ============================================================
   STORE
   ============================================================ */
function persistLocal(){ if(App.source==='seed') localStorage.setItem('yd_seed', JSON.stringify({jobs:App.jobs,clients:App.clients,expenses:App.expenses})); }
function loadSeed(){
  const saved = localStorage.getItem('yd_seed');
  if(saved){ try{ const d=JSON.parse(saved); App.jobs=d.jobs||[]; App.clients=d.clients||[]; App.expenses=d.expenses||[]; }catch(e){ freshSeed(); } }
  else freshSeed();
  App.source='seed'; renderAll();
}
function freshSeed(){ const d=buildSeed(); App.jobs=d.jobs; App.clients=d.clients; App.expenses=d.expenses; persistLocal(); }
function resetDemo(){ localStorage.removeItem('yd_seed'); freshSeed(); renderAll(); closeSheet(); toast('Demo data reset'); }

function saveRecord(coll,obj){
  return new Promise(resolve=>{
    const commit = async()=>{
      if(App.source==='live'){
        try{
          const fcoll = coll==='jobs'?'bookings':coll;
          const data = coll==='jobs'?jobToBooking(obj):(coll==='clients'?clientToDoc(obj):obj);
          if(obj.id && !String(obj.id).startsWith('new-')){ await db.collection(fcoll).doc(obj.id).set(data,{merge:true}); }
          else { const ref=await db.collection(fcoll).add(data); obj.id=ref.id; }
          toast('Saved to live CRM'); resolve(true);
        }catch(e){ toast('Save failed: '+(e.code||e.message||'error')); resolve(false); }
      } else {
        const arr = coll==='jobs'?App.jobs:(coll==='clients'?App.clients:App.expenses);
        const ex = obj.id && arr.find(x=>x.id===obj.id);
        if(ex) Object.assign(ex,obj);
        else { obj.id = obj.id || ('local-'+coll+'-'+Date.now()); arr.push(obj); }
        persistLocal(); renderAll(); toast('Saved'); resolve(true);
      }
    };
    if(App.source==='live'){
      confirmSheet({icon:IC.cloud,tint:'tint-b',title:'Update your live CRM?',msg:'This writes to your real YDdetailers Firestore data.',ok:'Save',onOk:commit,onCancel:()=>resolve(false)});
    } else commit();
  });
}

/* ============================================================
   RENDER
   ============================================================ */
function renderAll(){ renderJobs(); renderMoney(); renderClients(); renderPhotos(); updateFab(); updateReconcileBadge(); }

function topbar(eyebrow,title){
  return `<header class="topbar" data-anim style="--i:0"><div><div class="eyebrow">${esc(eyebrow)}</div><h1 class="screen-title">${esc(title)}<span class="dot">.</span></h1></div>
    <button class="avatar ${App.source==='live'?'live':''}" onclick="openSettings()" aria-label="Settings"><img src="logo.png" alt="YD Detailers"><span class="conn-dot"></span></button></header>`;
}
function pill(s){ const [cls,label]=STMETA[s]; return `<span class="pill ${cls}"><span class="d"></span>${label}</span>`; }

function jobCard(j,i,mini){
  const s=statusOf(j); const [cls]=STMETA[s]; const tp=time12(j.time);
  return `<button class="job ${mini?'mini-job':''}" data-anim style="--i:${i}" onclick="openJob('${j.id}')">
    <div class="job-time"><span class="t">${tp.t}</span><span class="ap">${tp.ap}</span></div>
    <div class="job-rail ${cls}"></div>
    <div class="job-main">
      <div class="job-row1"><span class="job-name">${esc(j.name)}</span>${pill(s)}</div>
      <div class="job-veh">${esc(j.vehicle)}</div>
      <div class="job-meta">${IC.svc}<span>${esc(j.service)}</span></div>
      ${j.address?`<div class="job-meta">${IC.pin}<span>${esc(j.address)}</span></div>`:''}
    </div>
    <div class="job-right"><span class="job-price">$${j.price}</span>${IC.chev}</div>
  </button>`;
}

function heroCard(j, mode){
  const s=statusOf(j);
  const recent = mode==='recent';
  const live = !recent && s==='progress';
  let badge, elapsed, cta;
  if(recent){ badge=`<span class="live-pill" style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.88)"><span class="rec" style="animation:none;background:#7fd6a6"></span>Last detail</span>`; elapsed=fmtDateShort(j.date); cta='View'; }
  else if(live){ badge=`<span class="live-pill"><span class="rec"></span>In progress</span>`; elapsed='Started '+Math.max(1,Math.round((Date.now()-j.startedAt)/60000))+' min ago'; cta='Continue'; }
  else { badge=`<span class="live-pill"><span class="rec"></span>Next up</span>`; elapsed=fmtTime(j.time); cta='Start job'; }
  return `<div class="hero-job" data-anim style="--i:3" onclick="openJob('${j.id}')">
    <div class="glow"></div><div class="sweep"></div>
    <div class="car-watermark">${IC.carLine}</div>
    <div class="hero-top">${badge}<span class="hero-elapsed">${elapsed}</span></div>
    <div class="hero-name">${esc(j.name)}</div>
    <div class="hero-veh">${esc(j.vehicle)}</div>
    <div class="hero-bottom"><div class="hero-svc"><span class="s">${esc(j.service)}</span><span class="p">$${j.price}</span></div>
    <button class="hero-cta" onclick="event.stopPropagation();openJob('${j.id}')">${cta} ${IC.arrow}</button></div>
  </div>`;
}

function renderJobs(){
  const el=document.getElementById('s-jobs'); const T=todayISO();
  let h = topbar(dowName(T)+' · '+monShort(T)+' '+dayNum(T), 'Today');
  // seg
  h += `<div class="seg" data-anim style="--i:1" id="jobseg"><span class="glider" style="transform:translateX(${App.jobView==='week'?'100%':'0'})"></span>
    <button class="${App.jobView==='today'?'on':''}" onclick="setJobView('today')">Today</button>
    <button class="${App.jobView==='week'?'on':''}" onclick="setJobView('week')">This Week</button></div>`;

  if(App.jobView==='week'){ el.innerHTML = h + weekView(); return; }

  const today = App.jobs.filter(j=>j.date===T && statusOf(j)!=='cancelled').sort((a,b)=>(a.time||'').localeCompare(b.time||''));

  if(today.length===0){ el.innerHTML = h + recentDayView(); return; }

  const inprog = today.find(j=>statusOf(j)==='progress');
  const upcoming = today.filter(j=>statusOf(j)==='upcoming');
  const done = today.filter(j=>['paid','collect'].includes(statusOf(j)));
  const collectN = today.filter(j=>statusOf(j)==='collect').length;
  const booked = sum(today.map(j=>j.price));
  const nextUp = upcoming[0];

  h += `<div class="chips" data-anim style="--i:1">
    <div class="chip"><span class="ic tint-o">${IC.cal}</span><div><div class="k">${today.length}</div><div class="l">jobs</div></div></div>
    <div class="chip"><span class="ic tint-g">${IC.dollar}</span><div><div class="k">${money(booked)}</div><div class="l">booked</div></div></div>
    <div class="chip"><span class="ic tint-c">${IC.alert}</span><div><div class="k">${collectN}</div><div class="l">to collect</div></div></div>
    <div class="chip"><span class="ic tint-b">${IC.clock}</span><div><div class="k">${nextUp?time12(nextUp.time).t+time12(nextUp.time).ap.toLowerCase()[0]:'—'}</div><div class="l">next up</div></div></div>
  </div>`;

  const hero = inprog || nextUp || done[0];
  if(hero) h += heroCard(hero, (!inprog && !nextUp) ? 'recent' : null);

  const rest = upcoming.filter(j=>!hero || j.id!==hero.id);
  if(rest.length){
    h += `<div class="section-label" data-anim style="--i:4"><h3>Up next</h3><span class="more">${rest.length} job${rest.length>1?'s':''}</span></div>`;
    rest.forEach((j,i)=> h+=jobCard(j,5+i));
  }
  if(done.length){
    h += `<div class="section-label" data-anim style="--i:9"><h3>Earlier today</h3></div>`;
    done.forEach((j,i)=> h+=jobCard(j,10+i,true));
  }
  el.innerHTML=h;
}

function recentDayView(){
  const T=todayISO(); const ws=weekStart(T);
  const recent = App.jobs.filter(j=>j.status==='completed' && j.date<=T).sort((a,b)=>(b.date+(b.time||'')).localeCompare(a.date+(a.time||''))).slice(0,6);
  const weekDone = App.jobs.filter(j=>j.status==='completed' && inRange(j.date,ws,addDays(ws,6)));
  const weekEarn = sum(weekDone.map(j=>j.price));
  const collectN = App.jobs.filter(j=>statusOf(j)==='collect').length;
  let h = `<div class="chips" data-anim style="--i:1">
    <div class="chip"><span class="ic tint-o">${IC.cal}</span><div><div class="k">0</div><div class="l">today</div></div></div>
    <div class="chip"><span class="ic tint-g">${IC.dollar}</span><div><div class="k">${money(weekEarn)}</div><div class="l">this week</div></div></div>
    <div class="chip"><span class="ic tint-b">${IC.check}</span><div><div class="k">${weekDone.length}</div><div class="l">jobs this wk</div></div></div>
    <div class="chip"><span class="ic tint-c">${IC.alert}</span><div><div class="k">${collectN}</div><div class="l">to collect</div></div></div>
  </div>`;
  h += `<div class="today-note" data-anim style="--i:2"><span class="ic">${IC.cal}</span><div><div class="tn-h">No details scheduled today</div><div class="tn-s">Enjoy the day off. Here's your recent work.</div></div></div>`;
  if(recent[0]) h += heroCard(recent[0],'recent');
  if(recent.length>1){
    h += `<div class="section-label" data-anim style="--i:4"><h3>Recent work</h3><span class="more">last ${recent.length-1}</span></div>`;
    recent.slice(1).forEach((j,i)=> h+=jobCard(j,5+i,true));
  }
  if(recent.length===0){
    h += emptyState(IC.cal,'No jobs yet','Add your first job with the + button, or connect your live CRM in Settings.','Add a job','onFab()');
  }
  return h;
}

function weekView(){
  const T=todayISO(); const ws=weekStart(T);
  let strip='<div class="weekstrip">';
  for(let i=0;i<7;i++){ const d=addDays(ws,i); const jobs=App.jobs.filter(j=>j.date===d && statusOf(j)!=='cancelled'); const isT=d===T;
    strip += `<div class="wday ${isT?'today':''} ${jobs.length?'':'off'}"><div class="dn">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</div><div class="dd">${dayNum(d)}</div><div class="dot"></div></div>`; }
  strip+='</div>';
  const weekEarn = sum(App.jobs.filter(j=>j.status==='completed' && inRange(j.date,ws,addDays(ws,6))).map(j=>j.price));
  let rows='';
  for(let i=0;i<7;i++){ const d=addDays(ws,i); const jobs=App.jobs.filter(j=>j.date===d && statusOf(j)!=='cancelled'); const doneN=jobs.filter(j=>j.status==='completed').length;
    const earn=sum(jobs.filter(j=>j.status==='completed').map(j=>j.price)); const isT=d===T; const rest=jobs.length===0;
    const ds = rest?'No jobs':(jobs.length+' job'+(jobs.length>1?'s':'')+' · '+doneN+' done');
    rows += `<div class="dayrow ${isT?'today':''} ${rest?'rest':''}"><div class="dcal"><span class="m">${monShort(d)}</span><span class="n">${dayNum(d)}</span></div>
      <div class="dinfo"><div class="dt">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]}${isT?' · Today':''}</div><div class="ds">${ds}</div></div>
      <div class="damt">${money(earn)}</div></div>`; }
  return `<div data-anim style="--i:2">${strip}<div class="badge">${IC.arrow}Week of ${fmtDateShort(ws)} · ${money(weekEarn)} earned</div>${rows}</div>`;
}

function emptyState(icon,title,msg,btn,action){
  return `<div class="empty" data-anim style="--i:2"><div class="eic">${icon}</div><h4>${esc(title)}</h4><p>${esc(msg)}</p>${btn?`<button class="btn-sm" onclick="${action}">${IC.plus}${esc(btn)}</button>`:''}</div>`;
}

function periodWindow(period, offset){
  const T=todayISO();
  if(period==='week'){ const start=addDays(weekStart(T), offset*7); return {from:start, to:addDays(start,6)}; }
  const d=new Date(T+'T00:00:00'); const y=d.getFullYear(), m=d.getMonth();
  return { from:isoOf(new Date(y, m+offset, 1)), to:isoOf(new Date(y, m+offset+1, 0)) };
}
function periodLabel(period, offset){
  if(offset===0) return period==='week'?'This week':'This month';
  if(offset===-1) return period==='week'?'Last week':'Last month';
  const w=periodWindow(period,offset);
  if(period==='week') return fmtDateShort(w.from)+' – '+dayNum(w.to);
  const d=new Date(w.from+'T00:00:00'); return MON[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'');
}
function moneyStats(period, offset){
  const completed = App.jobs.filter(j=>j.status==='completed');
  const w=periodWindow(period,offset), pw=periodWindow(period,offset-1);
  const set=completed.filter(j=>inRange(j.date,w.from,w.to));
  const prevSet=completed.filter(j=>inRange(j.date,pw.from,pw.to));
  const rev=sum(set.map(j=>j.price)); const prev=sum(prevSet.map(j=>j.price));
  const tips=sum(set.map(j=>j.tip||0)); const jobs=set.length; const avg=jobs?Math.round(rev/jobs):0;
  const unpaidSet=App.jobs.filter(j=>j.status==='completed' && j.paid===false); const unpaid=sum(unpaidSet.map(j=>j.price));
  const delta = prev>0? Math.round((rev-prev)/prev*100) : (rev>0?100:0);
  return {rev,tips,jobs,avg,unpaid,unpaidN:unpaidSet.length,delta,set};
}
function chartData(period, offset){
  const T=todayISO(); const completed=App.jobs.filter(j=>j.status==='completed'); const w=periodWindow(period,offset);
  if(period==='week'){ const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; const vals=[0,0,0,0,0,0,0];
    completed.forEach(j=>{ if(inRange(j.date,w.from,w.to)) vals[dowMon(j.date)]+=j.price; });
    const todayIdx = inRange(T,w.from,w.to)? dowMon(T) : -1;
    return {labels,vals,todayIdx};
  } else { const labels=[],vals=[]; let s=w.from, i=1, todayIdx=-1;
    while(s<=w.to){ const e=addDays(s,6)>w.to?w.to:addDays(s,6); let v=0; completed.forEach(j=>{ if(inRange(j.date,s,e)) v+=j.price; }); if(inRange(T,s,e)) todayIdx=labels.length; labels.push('W'+i); vals.push(v); s=addDays(e,1); i++; }
    return {labels,vals,todayIdx};
  }
}
function renderMoney(){
  const el=document.getElementById('s-money'); const p=App.moneyPeriod; const off=App.moneyOffset; const st=moneyStats(p,off);
  let h = topbar('Earnings','Money');
  h += `<div class="seg" data-anim style="--i:1" id="moneyseg"><span class="glider" style="transform:translateX(${p==='month'?'100%':'0'})"></span>
    <button class="${p==='week'?'on':''}" onclick="setMoneyPeriod('week')">Weekly</button>
    <button class="${p==='month'?'on':''}" onclick="setMoneyPeriod('month')">Monthly</button></div>`;
  h += `<div class="period-nav" data-anim style="--i:1">
    <button onclick="stepPeriod(-1)" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <span class="pl">${periodLabel(p,off)}</span>
    <button onclick="stepPeriod(1)" ${off>=0?'disabled':''} aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>`;
  h += `<div class="kpi-grid" data-anim style="--i:2">
    <div class="kpi span2"><div><div class="ktop"><span class="kic tint-o">${IC.dollar}</span><span class="kl">Revenue</span></div><div class="kv big kv-o">${money(st.rev)}</div></div>
      <div class="ksub up" style="text-align:right"><svg class="up-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 15l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg> ${st.delta>=0?'+':''}${st.delta}%<br><span style="color:var(--muted);font-weight:700">vs prev ${p==='week'?'week':'month'}</span></div></div>
    <div class="kpi"><div class="ktop"><span class="kic tint-b">${IC.check}</span><span class="kl">Jobs done</span></div><div class="kv">${st.jobs}</div></div>
    <div class="kpi"><div class="ktop"><span class="kic tint-g">${IC.heart}</span><span class="kl">Tips</span></div><div class="kv kv-g">${money(st.tips)}</div></div>
    <div class="kpi"><div class="ktop"><span class="kic tint-p">${IC.chart}</span><span class="kl">Avg ticket</span></div><div class="kv kv-p">${money(st.avg)}</div></div>
    <div class="kpi unpaid"><div class="ktop"><span class="kic tint-c">${IC.alert}</span><span class="kl">Unpaid</span></div><div class="kv kv-c">${money(st.unpaid)}</div><div class="ksub" style="color:var(--coral)">${st.unpaidN} job${st.unpaidN!==1?'s':''} to collect</div></div>
  </div>`;
  const cd=chartData(p,off); const max=Math.max(1,...cd.vals);
  let bars='';
  cd.labels.forEach((lb,idx)=>{ const v=cd.vals[idx]; const hh=v===0?4:Math.round(v/max*100); const isT=idx===cd.todayIdx;
    const cls=v===0?'bar zero':(isT?'bar today':'bar');
    bars+=`<div class="bar-col ${isT?'is-today':''}"><div class="bar-track"><div class="${cls}" style="height:${hh}%"><span class="bar-val">$${v}</span></div></div><span class="bar-lbl">${lb}</span></div>`; });
  h += `<div class="chart-card" data-anim style="--i:3"><div class="chart-head"><span class="ct">${esc(periodLabel(p,off))} · earnings</span><span class="cv">${money(sum(cd.vals))}</span></div><div class="chart" id="chart">${bars}</div></div>`;
  // payments in the selected window
  const pays = st.set.slice().sort((a,b)=>(b.date+ (b.time||'')).localeCompare(a.date+(a.time||''))).slice(0,8);
  h += `<div class="badge" data-anim style="--i:4">${IC.clock}Payments · ${esc(periodLabel(p,off).toLowerCase())}</div>`;
  if(pays.length===0) h += emptyState(IC.dollar,'No payments in this period','Use the arrows above to browse other weeks or months.','','');
  pays.forEach((j,i)=>{ const when = j.date===todayISO()?'Today':(j.date===addDays(todayISO(),-1)?'Yesterday':fmtDateShort(j.date));
    h += `<div class="pay" data-anim style="--i:${5+i}"><div class="pini" style="background:${avColor(j.name)}">${initials(j.name)}</div>
      <div class="pay-main"><div class="pay-name">${esc(j.name)}</div><div class="pay-sub">${esc(j.service)} · ${when} ${j.paymentMethod?`<span class="method">${esc(j.paymentMethod)}</span>`:(j.paid===false?'<span class="method">Unpaid</span>':'')}</div></div>
      <div class="pay-right"><div class="pay-amt">$${j.price}</div>${(j.tip||0)>0?`<div class="pay-tip">+$${j.tip} tip</div>`:''}</div></div>`; });
  el.innerHTML=h;
}

/* ---- reconcile: bookers with no client record ---- */
function reconcileList(){
  const known=new Set(App.clients.map(c=>(c.name||'').toLowerCase().trim()).filter(Boolean));
  const map={};
  App.jobs.forEach(j=>{ const nm=(j.name||'').trim(); if(!nm||j.clientId) return; const key=nm.toLowerCase(); if(known.has(key)) return;
    if(!map[key]) map[key]={name:nm,phone:j.phone||'',email:j.email||'',tag:j.vehicle||'',last:j.date||''};
    else if((j.date||'')>map[key].last){ map[key].last=j.date||''; if(j.phone)map[key].phone=j.phone; if(j.vehicle)map[key].tag=j.vehicle; }
  });
  return Object.values(map);
}
function reconcileBanner(rl){
  return `<div class="reco-banner" data-anim style="--i:1"><span class="rb-ic">${IC.users}</span>
    <div class="rb-txt"><div class="rb-h">${rl.length} booker${rl.length>1?'s':''} not in Clients yet</div><div class="rb-s">Add so they show up here${App.source==='live'?' and in your CRM':''}.</div></div>
    <button class="rb-add" onclick="addAllBookers()">Add</button><button class="rb-x" onclick="dismissReconcile()" aria-label="Dismiss">${IC.x}</button></div>`;
}
function dismissReconcile(){ App._dismissReconcile=true; renderClients(); updateReconcileBadge(); }
function addAllBookers(){
  const list=reconcileList(); if(!list.length) return;
  confirmSheet({icon:IC.users,tint:'tint-o',title:`Add ${list.length} client${list.length>1?'s':''}?`,msg:`These people have bookings but no client record. This creates ${list.length} new client${list.length>1?'s':''} in your ${App.source==='live'?'live CRM':'local list'}.`,ok:'Add all',onOk:async()=>{
    if(App.source==='live'){
      try{ for(const b of list){ await db.collection('clients').add({name:b.name,phone:b.phone||'',email:b.email||'',tag:b.tag||'',status:'new',notes:'',createdAt:Date.now(),updatedAt:Date.now()}); } toast('Added '+list.length+' client'+(list.length>1?'s':'')); }
      catch(e){ toast('Add failed: '+(e.code||e.message||'error')); }
    } else {
      list.forEach((b,i)=>App.clients.push({id:'local-clients-'+Date.now()+'-'+i,name:b.name,phone:b.phone||'',email:b.email||'',tag:b.tag||'',status:'new',notes:''}));
      persistLocal(); renderAll(); toast('Added '+list.length+' client'+(list.length>1?'s':''));
    }
    updateReconcileBadge();
  }});
}
function updateReconcileBadge(){ const b=document.getElementById('clientsBadge'); if(b) b.classList.toggle('show', reconcileList().length>0 && !App._dismissReconcile); }

function renderClients(){
  const el=document.getElementById('s-clients');
  const list = App.clients.map(c=>({c,agg:clientAgg(c)})).sort((a,b)=>b.agg.spend-a.agg.spend);
  let h = topbar(App.clients.length+' total','Clients');
  h += `<div class="search" data-anim style="--i:1">${IC.search}<input type="text" id="custSearch" placeholder="Search clients or vehicles" oninput="filterCust()"></div>`;
  const _rl = reconcileList(); if(_rl.length && !App._dismissReconcile) h += reconcileBanner(_rl);
  h += `<div class="badge" data-anim style="--i:2">${IC.star}Top regulars</div>`;
  if(list.length===0){ h += emptyState(IC.users,'No clients yet','Add your first client, or connect your live CRM in Settings.','Add client','openClientForm()'); el.innerHTML=h; return; }
  h += `<div id="custList">`;
  list.forEach(({c,agg},i)=>{ const vip=c.status==='vip';
    h += `<button class="cust" data-name="${esc((c.name+' '+(agg.vehicle||'')+' '+(agg.city||'')).toLowerCase())}" data-anim style="--i:${3+Math.min(i,8)}" onclick="openCust('${c.id}')">
      <div class="cust-av" style="background:${avColor(c.name)}">${initials(c.name)}</div>
      <div class="cust-main"><div class="cust-name">${esc(c.name)}</div><div class="cust-sub">${esc([agg.city,agg.vehicle].filter(Boolean).join(' · ')||'No vehicle on file')}</div>${vip?`<span class="star-tag">${IC.star}VIP</span>`:''}</div>
      <div class="cust-right"><div class="cust-spend">${money(agg.spend)}</div><div class="cust-visits">${agg.visits} visit${agg.visits!==1?'s':''}</div></div>
    </button>`; });
  h += `</div>`;
  el.innerHTML=h;
}
function filterCust(){ const q=(document.getElementById('custSearch').value||'').toLowerCase(); document.querySelectorAll('#custList .cust').forEach(c=>{ c.style.display=c.dataset.name.includes(q)?'flex':'none'; }); }

/* ---- angle presets + extra icons ---- */
IC.wheel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="M12 14.4V21M9.9 11.1 4.3 8M14.1 11.1 19.7 8" stroke-linecap="round"/></svg>';
IC.target = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round"/><circle cx="12" cy="12" r="2.5"/></svg>';
const ANGLES = [
  {id:'front34', name:'Front 3/4', hint:'Stand at the front driver-side corner', interior:false},
  {id:'driver',  name:'Driver side', hint:'Square on to the driver side', interior:false},
  {id:'rear34',  name:'Rear 3/4', hint:'Stand at the rear passenger-side corner', interior:false},
  {id:'interior',name:'Interior', hint:'Front seats and dash in frame', interior:true},
];

function jobPhotoStatus(jobId){ let b=0,a=0; App.photoKeys.forEach(k=>{ const p=k.split('|'); if(p[0]===jobId){ if(p[2]==='before')b++; else if(p[2]==='after')a++; } }); return {before:b,after:a}; }
function findFeaturedPair(){
  const m={}; App.photoKeys.forEach(k=>{ const [jid,ang,ph]=k.split('|'); const kk=jid+'|'+ang; (m[kk]=m[kk]||{})[ph]=true; });
  const cands=Object.keys(m).filter(kk=>m[kk].before&&m[kk].after);
  if(!cands.length) return null;
  let best=null;
  cands.forEach(kk=>{ const [jid,ang]=kk.split('|'); const j=jobById(jid); const d=j?j.date:''; if(!best||d>best.date){ best={jobId:jid,angle:ang,date:d,job:j}; } });
  return best;
}
function renderPhotos(){
  const el=document.getElementById('s-photos'); const T=todayISO();
  let h = topbar('Portfolio','Gallery');
  const pair = findFeaturedPair();
  if(pair){
    const j=pair.job; const ang=ANGLES.find(a=>a.id===pair.angle);
    h += `<div class="badge" data-anim style="--i:1">${IC.camera}Latest before / after</div>
      <div class="ba-featured" data-anim style="--i:2"><div class="ba-wrap" id="baWrap">
        <div class="ba-layer"><img id="featBefore" style="width:100%;height:100%;object-fit:cover;display:block" alt="Before"></div>
        <div class="ba-layer ba-after" id="baAfter"><img id="featAfter" style="width:100%;height:100%;object-fit:cover;display:block" alt="After"></div>
        <span class="ba-tag b">Before</span><span class="ba-tag a">After</span>
        <div class="ba-handle" id="baHandle"><div class="ba-knob">${IC.swap}</div></div>
      </div><div class="ba-caption"><div><div class="cn">${esc(j?j.name:'Job')} · ${esc(ang?ang.name:'')}</div><div class="cs">${esc(j?j.service:'')}</div></div><div class="cd">${j?(j.date===T?'Today':fmtDateShort(j.date)):''}</div></div></div>
      <div class="tap-hint" data-anim style="--i:3">Drag the slider to compare</div>`;
  } else {
    h += `<div class="badge" data-anim style="--i:1">${IC.camera}Before / after</div>
      <div class="today-note" data-anim style="--i:2"><span class="ic">${IC.camera}</span><div><div class="tn-h">No photos captured yet</div><div class="tn-s">Open a job below and shoot the before set. The app guides each angle.</div></div></div>`;
  }
  // capture list: today's jobs + recent completed
  const todays=App.jobs.filter(j=>j.date===T && statusOf(j)!=='cancelled');
  const recent=App.jobs.filter(j=>j.status==='completed').sort((a,b)=>(b.date).localeCompare(a.date)).slice(0,10);
  const seen=new Set(); const jobs=[];
  todays.concat(recent).forEach(j=>{ if(!seen.has(j.id)){ seen.add(j.id); jobs.push(j); } });
  h += `<div class="section-label" data-anim style="--i:3"><h3>Capture</h3><span class="more">${jobs.length} job${jobs.length!==1?'s':''}</span></div>`;
  if(jobs.length===0){ h += emptyState(IC.camera,'No jobs to shoot','Add a job first, then capture its before/after here.','Add a job','onFab()'); el.innerHTML=h; return; }
  jobs.forEach((j,i)=>{
    const st=jobPhotoStatus(j.id); let pc='none', pt='Not started';
    if(st.after>0){ pc=st.after>=ANGLES.length?'done':'part'; pt=st.after>=ANGLES.length?'Complete':st.after+'/'+ANGLES.length+' after'; }
    else if(st.before>0){ pc='part'; pt=st.before+'/'+ANGLES.length+' before'; }
    h += `<button class="pjob" data-anim style="--i:${4+Math.min(i,8)}" onclick="openCamera('${j.id}')">
      <div class="pj-thumb" id="thumb-${j.id}"><div class="pj-ph">${IC.camera}</div></div>
      <div class="pj-main"><div class="pj-n">${esc(j.name)}</div><div class="pj-s">${esc(j.vehicle)}</div><span class="pj-prog ${pc}">${st.after>=ANGLES.length?IC.check:''}${pt}</span></div>
      <div class="pj-cam">${IC.camera}</div></button>`;
  });
  el.innerHTML=h;
  if(App.tab==='photos'){ if(pair) loadFeatured(pair); loadThumbs(jobs); }
  initSlider();
}
async function loadFeatured(pair){
  const b=await photoGet(pair.jobId+'|'+pair.angle+'|before'); const a=await photoGet(pair.jobId+'|'+pair.angle+'|after');
  const be=document.getElementById('featBefore'), ae=document.getElementById('featAfter');
  if(be&&b) be.src=b; if(ae&&a) ae.src=a;
}
async function loadThumbs(jobs){
  for(const j of jobs){
    let key=null;
    for(const ang of ANGLES){ if(App.photoKeys.has(j.id+'|'+ang.id+'|after')){ key=j.id+'|'+ang.id+'|after'; break; } }
    if(!key) for(const ang of ANGLES){ if(App.photoKeys.has(j.id+'|'+ang.id+'|before')){ key=j.id+'|'+ang.id+'|before'; break; } }
    if(key){ const data=await photoGet(key); const el=document.getElementById('thumb-'+j.id); if(el&&data) el.innerHTML='<img src="'+data+'">'; }
  }
}

/* ============================================================
   CAMERA CAPTURE  (before/after with angle guidance)
   ============================================================ */
const Cam = { jobId:null, angleIdx:0, phase:'before', stream:null, frozen:null };
function openCamera(jobId){
  const j=jobById(jobId); if(!j) return;
  Cam.jobId=jobId; Cam.phase='before'; Cam.frozen=null;
  const first=ANGLES.findIndex(a=>!App.photoKeys.has(jobId+'|'+a.id+'|before')); Cam.angleIdx=first>=0?first:0;
  buildCameraUI(j);
  document.getElementById('cameraView').classList.add('open');
  startCam(); refreshCam();
}
function buildCameraUI(j){
  document.getElementById('cameraView').innerHTML = `
    <div class="cam-head">
      <button class="cam-x" onclick="closeCamera()">${IC.x}</button>
      <div class="cam-title"><div class="h">${esc(j.name)}</div><div class="s">${esc(j.vehicle)}</div></div>
      <div class="cam-phase"><button id="camPhaseB" class="on" onclick="setCamPhase('before')">Before</button><button id="camPhaseA" onclick="setCamPhase('after')">After</button></div>
    </div>
    <div class="cam-stage" id="camStage">
      <video id="camVideo" autoplay playsinline muted></video>
      <img class="cam-ghost" id="camGhost" alt="">
      <img class="cam-frozen" id="camFrozen" alt="">
      <div class="cam-grid"></div>
      <div class="cam-guide" id="camGuide"></div>
      <div class="cam-hint" id="camHint"></div>
      <div class="cam-nocam" id="camNoCam" style="display:none">${IC.camera}<div>Live camera isn't available here.<br>On your phone this shows the live view.</div>
        <label class="cn-btn">${IC.camera}<span>Pick / take a photo</span><input type="file" accept="image/*" capture="environment" style="display:none" onchange="onCamFile(this)"></label></div>
    </div>
    <div class="cam-angles" id="camAngles"></div>
    <div class="cam-controls" id="camControls">
      <button class="cam-side" onclick="closeCamera()" aria-label="Gallery">${IC.camera}</button>
      <button class="cam-shutter" id="camShutter" onclick="capturePhoto()" aria-label="Shutter"></button>
      <button class="cam-side hidden"></button>
    </div>
    <div class="cam-review" id="camReview">
      <button class="cam-retake" onclick="retakePhoto()">${IC.reset}<span>Retake</span></button>
      <button class="cam-use" id="camUse" onclick="usePhoto()">${IC.check}<span>Use photo</span></button>
    </div>`;
}
async function startCam(){
  const v=document.getElementById('camVideo'), no=document.getElementById('camNoCam');
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw 0;
    Cam.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    v.srcObject=Cam.stream; v.style.display='block'; no.style.display='none';
  }catch(e){ v.style.display='none'; no.style.display='flex'; const g=document.getElementById('camGuide'); if(g) g.style.display='none'; document.querySelectorAll('#cameraView .cam-grid').forEach(x=>x.style.display='none'); }
}
function stopCam(){ if(Cam.stream){ Cam.stream.getTracks().forEach(t=>t.stop()); Cam.stream=null; } }
function refreshCam(){
  renderCamAngles();
  const ang=ANGLES[Cam.angleIdx]; const aft=Cam.phase==='after';
  document.getElementById('camPhaseB').className = aft?'':'on';
  document.getElementById('camPhaseA').className = aft?'on aft':'';
  const hint=document.getElementById('camHint'); hint.className='cam-hint'+(aft?' aft':'');
  hint.innerHTML = (aft?IC.swap:IC.target)+'<span>'+(aft?'Match the ghosted before shot':ang.hint)+'</span>';
  document.getElementById('camGuide').innerHTML = ang.interior?IC.wheel:IC.carLine;
  document.getElementById('camShutter').className='cam-shutter'+(aft?' aft':'');
  document.getElementById('camUse').className='cam-use'+(aft?' aft':'');
  Cam.frozen=null; const fr=document.getElementById('camFrozen'); fr.style.display='none';
  document.getElementById('camReview').className='cam-review'; document.getElementById('camControls').style.display='flex';
  loadGhost();
}
function renderCamAngles(){
  document.getElementById('camAngles').innerHTML = ANGLES.map((a,i)=>{
    const has=App.photoKeys.has(Cam.jobId+'|'+a.id+'|'+Cam.phase);
    return `<button class="cam-angle ${i===Cam.angleIdx?'on':''}" onclick="setCamAngle(${i})">
      <span class="aico">${a.interior?IC.wheel:IC.carLine}</span><span class="anm">${a.name}</span>${has?`<span class="adone">${IC.check}</span>`:''}</button>`;
  }).join('');
}
function setCamAngle(i){ Cam.angleIdx=i; refreshCam(); }
function setCamPhase(p){ Cam.phase=p; const first=ANGLES.findIndex(a=>!App.photoKeys.has(Cam.jobId+'|'+a.id+'|'+p)); Cam.angleIdx=first>=0?first:0; refreshCam(); }
async function loadGhost(){
  const g=document.getElementById('camGhost'), guide=document.getElementById('camGuide');
  if(Cam.phase==='after'){
    const data=await photoGet(Cam.jobId+'|'+ANGLES[Cam.angleIdx].id+'|before');
    if(data){ g.src=data; g.style.display='block'; guide.style.display='none'; return; }
  }
  g.style.display='none'; g.removeAttribute('src'); guide.style.display='grid';
}
function frameToDataURL(video){
  const vw=video.videoWidth, vh=video.videoHeight; const scale=Math.min(1,1280/vw);
  const cw=Math.round(vw*scale), ch=Math.round(vh*scale);
  const c=document.createElement('canvas'); c.width=cw; c.height=ch; c.getContext('2d').drawImage(video,0,0,cw,ch);
  return c.toDataURL('image/jpeg',0.75);
}
function showFrozen(data){
  Cam.frozen=data; const fr=document.getElementById('camFrozen'); fr.src=data; fr.style.display='block';
  document.getElementById('camControls').style.display='none'; document.getElementById('camReview').className='cam-review show';
}
function capturePhoto(){
  const v=document.getElementById('camVideo');
  if(!Cam.stream || !v.videoWidth){ const inp=document.querySelector('#camNoCam input'); if(inp) inp.click(); return; }
  showFrozen(frameToDataURL(v));
}
function onCamFile(input){
  const f=input.files&&input.files[0]; if(!f) return; const url=URL.createObjectURL(f); const img=new Image();
  img.onload=()=>{ const scale=Math.min(1,1280/img.width); const cw=Math.round(img.width*scale),ch=Math.round(img.height*scale);
    const c=document.createElement('canvas'); c.width=cw;c.height=ch;c.getContext('2d').drawImage(img,0,0,cw,ch); URL.revokeObjectURL(url); showFrozen(c.toDataURL('image/jpeg',0.75)); };
  img.src=url;
}
function retakePhoto(){ Cam.frozen=null; document.getElementById('camFrozen').style.display='none'; document.getElementById('camControls').style.display='flex'; document.getElementById('camReview').className='cam-review'; }
async function usePhoto(){
  if(!Cam.frozen) return;
  const ang=ANGLES[Cam.angleIdx]; const key=Cam.jobId+'|'+ang.id+'|'+Cam.phase;
  try{ await photoPut(key,Cam.frozen); App.photoKeys.add(key); toast((Cam.phase==='before'?'Before':'After')+' · '+ang.name+' saved'); }
  catch(e){ toast('Could not save photo'); }
  const next=ANGLES.findIndex((a,i)=>i>Cam.angleIdx && !App.photoKeys.has(Cam.jobId+'|'+a.id+'|'+Cam.phase));
  if(next>=0) Cam.angleIdx=next;
  refreshCam(); renderPhotos();
}
function closeCamera(){ stopCam(); document.getElementById('cameraView').classList.remove('open'); renderPhotos(); }

/* IndexedDB photo store */
let _idb=null;
function idb(){ return new Promise((res,rej)=>{ if(_idb) return res(_idb); if(!('indexedDB' in window)) return rej('no-idb');
  const r=indexedDB.open('yd-photos',1); r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains('photos')) r.result.createObjectStore('photos'); };
  r.onsuccess=()=>{ _idb=r.result; res(_idb); }; r.onerror=()=>rej(r.error); }); }
function photoPut(key,val){ return idb().then(d=>new Promise((res,rej)=>{ const t=d.transaction('photos','readwrite'); t.objectStore('photos').put(val,key); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); })); }
function photoGet(key){ return idb().then(d=>new Promise(res=>{ const t=d.transaction('photos','readonly'); const rq=t.objectStore('photos').get(key); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>res(null); })).catch(()=>null); }
function loadPhotoKeys(){ idb().then(d=>{ const t=d.transaction('photos','readonly'); const rq=t.objectStore('photos').getAllKeys(); rq.onsuccess=()=>{ App.photoKeys=new Set((rq.result||[]).map(String)); if(App.tab==='photos') renderPhotos(); }; }).catch(()=>{}); }

/* ============================================================
   NAV / TABS
   ============================================================ */
function setTab(name){
  App.tab=name;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.tab===name));
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById('s-'+name); el.classList.add('active');
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); el.scrollTop=0;
  updateFab();
  if(name==='money') requestAnimationFrame(()=>requestAnimationFrame(playChart));
  if(name==='photos') renderPhotos();
}
function setJobView(v){ App.jobView=v; renderJobs(); const el=document.getElementById('s-jobs'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
function setMoneyPeriod(p){ App.moneyPeriod=p; App.moneyOffset=0; renderMoney(); requestAnimationFrame(()=>requestAnimationFrame(playChart)); }
function stepPeriod(dir){ const n=App.moneyOffset+dir; if(n>0) return; App.moneyOffset=n; renderMoney(); requestAnimationFrame(()=>requestAnimationFrame(playChart)); }
function playChart(){ const c=document.getElementById('chart'); if(c){ void c.offsetWidth; c.classList.add('play'); } }
function updateFab(){ const fab=document.getElementById('fab'); fab.classList.toggle('hide', !(App.tab==='jobs'||App.tab==='clients')); }
function onFab(){ if(App.tab==='clients') openClientForm(); else openJobForm(); }

/* ============================================================
   JOB DETAIL
   ============================================================ */
function jobById(id){ return App.jobs.find(j=>j.id===id); }
function clientById(id){ return App.clients.find(c=>c.id===id); }

function openJob(id){
  const j=jobById(id); if(!j) return; const s=statusOf(j);
  const body=document.getElementById('jobDetailBody');
  body.innerHTML = `
    <div class="dhead"><button class="iconbtn" onclick="closeJob()" aria-label="Back">${IC.back}</button><span class="dtitle">Job Detail</span><button class="iconbtn" onclick="openJobForm('${j.id}')" aria-label="Edit">${IC.edit}</button></div>
    <div class="spec-hero"><div class="glow"></div><svg class="carg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">${IC.carLine.replace(/<\/?svg[^>]*>/g,'')}</svg>
      <div class="row1"><span class="color-chip" style="background:${vehColor(j.vehicle)}"></span>${pill(s)}</div>
      <div class="veh">${esc(j.vehicle)}</div><div class="vsub">${esc(j.service)} · ${fmtTime(j.time)}</div></div>
    <div class="spec-sheet">
      <div class="spec-row"><span class="sic">${IC.svc}</span><div><div class="sl">Service</div><div class="sv">${esc(j.service)}</div></div><div class="sright"><div class="sl">Price</div><div class="sv">$${j.price}${(j.tip||0)>0?` <span style="color:var(--green)">+$${j.tip}</span>`:''}</div></div></div>
      ${(j.addons&&j.addons.length)?`<div class="spec-row"><span class="sic">${IC.plus}</span><div style="flex:1"><div class="sl">Add-ons</div><div class="addons">${j.addons.map(a=>`<span class="addon">${esc(a)}</span>`).join('')}</div></div></div>`:''}
      <div class="spec-row"><span class="sic">${IC.clock}</span><div><div class="sl">Date & time</div><div class="sv">${fmtDateShort(j.date)} · ${fmtTime(j.time)}</div></div><div class="sright"><div class="sl">Payment</div><div class="sv">${j.paymentMethod?esc(j.paymentMethod):(s==='collect'?'Due':(s==='paid'?'Paid':'—'))}</div></div></div>
      <div class="spec-row"><span class="sic">${IC.user}</span><div><div class="sl">Client</div><div class="sv">${esc(j.name)}</div></div>${j.phone?`<div class="sright"><div class="sl">Phone</div><div class="sv">${esc(j.phone)}</div></div>`:''}</div>
      ${j.address?`<div class="spec-row"><span class="sic">${IC.pin}</span><div><div class="sl">Address</div><div class="sv">${esc(j.address)}</div></div></div>`:''}
    </div>
    ${j.notes?`<div class="notes-card"><div class="nt">${IC.check}Job notes</div><p>${esc(j.notes)}</p></div>`:''}
    <div class="act-grid">
      <button class="act" onclick="navTo('${j.id}')"><span class="aic tint-b">${IC.nav}</span><span class="al">Navigate</span></button>
      <button class="act" onclick="onMyWay('${j.id}')"><span class="aic tint-o">${IC.car}</span><span class="al">On my way</span></button>
      <button class="act" onclick="callJob('${j.id}')"><span class="aic tint-g">${IC.phone}</span><span class="al">Call</span></button>
      <button class="act" onclick="openJobForm('${j.id}')"><span class="aic tint-p">${IC.edit}</span><span class="al">Edit</span></button>
    </div>`;
  const dock=document.getElementById('jobDetailDock');
  dock.innerHTML = jobCTA(j,s);
  document.getElementById('jobDetail').classList.add('open');
}
function jobCTA(j,s){
  const secondary = `<button class="btn-ghost" onclick="callJob('${j.id}')" aria-label="Call">${IC.phone}</button>`;
  if(s==='upcoming') return `<button class="btn-primary" onclick="markStarted('${j.id}')">${IC.play}<span>Start job</span></button>${secondary}`;
  if(s==='progress') return `<button class="btn-primary done" onclick="completeFlow('${j.id}')">${IC.check}<span>Complete job</span></button>${secondary}`;
  if(s==='collect') return `<button class="btn-primary collect" onclick="collectFlow('${j.id}')">${IC.dollar}<span>Collect $${j.price}</span></button>${secondary}`;
  return `<button class="btn-primary done" style="opacity:.9" onclick="toast('Job complete')">${IC.check}<span>Completed</span></button>${secondary}`;
}
function closeJob(){ document.getElementById('jobDetail').classList.remove('open'); }
function afterMark(id){ if(App.source==='live'){ closeJob(); } else { openJob(id); } }

function markStarted(id){ const j={...jobById(id), startedAt:Date.now(), status:''}; saveRecord('jobs',j).then(ok=>{ if(ok){ toast('Job started'); afterMark(id); } }); }
function completeFlow(id){ methodSheet(id,true); }
function collectFlow(id){ methodSheet(id,false); }

/* ============================================================
   CUSTOMER DETAIL
   ============================================================ */
function openCust(id){
  const c=clientById(id); if(!c) return; const agg=clientAgg(c);
  const hist = agg.jobs.slice().sort((a,b)=>(b.date).localeCompare(a.date)).slice(0,8);
  const body=document.getElementById('custDetailBody');
  body.innerHTML = `
    <div class="dhead"><button class="iconbtn" onclick="closeCust()" aria-label="Back">${IC.back}</button><span class="dtitle">Client</span><button class="iconbtn" onclick="openClientForm('${c.id}')" aria-label="Edit">${IC.edit}</button></div>
    <div class="cust-hero"><div class="big-av" style="background:${avColor(c.name)}">${initials(c.name)}</div><h2>${esc(c.name)}</h2>
      <div class="ch-sub">${agg.city?IC.pin+'<span>'+esc(agg.city)+'</span> · ':''}<span>${c.status?statusLabel(c.status):'Client'}</span></div></div>
    <div class="cust-stats"><div class="cstat"><div class="cv">${agg.visits}</div><div class="cl">Visits</div></div>
      <div class="cstat"><div class="cv g">${money(agg.spend)}</div><div class="cl">Lifetime</div></div>
      <div class="cstat"><div class="cv p">${money(agg.avgTip)}</div><div class="cl">Avg tip</div></div></div>
    <div class="contact-row">
      <button class="cround call" onclick="callNum('${esc(c.phone)}')"><span class="cr-ic">${IC.phone}</span><span class="crl">Call</span></button>
      <button class="cround text" onclick="textNum('${esc(c.phone)}','Hi ${esc(c.name.split(' ')[0])}, it\\'s YD Detailers.')"><span class="cr-ic">${IC.msg}</span><span class="crl">Text</span></button>
      <button class="cround rebook" onclick="rebook('${c.id}')"><span class="cr-ic">${IC.cal}</span><span class="crl">Rebook</span></button>
    </div>
    <div class="sub-label">Vehicle</div>
    <div class="veh-card"><span class="vic">${IC.car}</span><div style="flex:1"><div class="vn">${esc(agg.vehicle||'No vehicle on file')}</div><div class="vs">${esc(c.phone||c.email||'')}</div></div><span class="color-chip" style="background:${vehColor(agg.vehicle)};border-color:var(--line)"></span></div>
    <div class="sub-label">Job history</div>
    ${hist.length? hist.map(j=>`<div class="hist"><div class="hdate"><div class="hm">${monShort(j.date)}</div><div class="hd">${pad(dayNum(j.date))}</div></div>
      <div class="hinfo"><div class="hs">${esc(j.service)}</div><div class="hy">${j.date.slice(0,4)} · ${esc(j.paymentMethod||statusLabelJob(j))}</div></div>
      <div class="hamt"><div class="ha">$${j.price}</div>${(j.tip||0)>0?`<div class="ht">+$${j.tip}</div>`:''}</div></div>`).join('') : `<p style="color:var(--muted);font-weight:600;font-size:13px;padding:4px 2px">No jobs yet.</p>`}`;
  document.getElementById('custDetail').classList.add('open');
}
function closeCust(){ document.getElementById('custDetail').classList.remove('open'); }
function statusLabel(s){ return ({new:'New',regular:'Regular',vip:'VIP',inactive:'Inactive'})[s]||s; }
function statusLabelJob(j){ const s=statusOf(j); return STMETA[s]?STMETA[s][1]:'Done'; }
function rebook(id){ closeCust(); const c=clientById(id); openJobForm(null,c); }

/* ============================================================
   TAP ACTIONS
   ============================================================ */
function callNum(p){ if(!p){toast('No phone number');return;} location.href='tel:'+p.replace(/[^0-9+]/g,''); }
function textNum(p,body){ if(!p){toast('No phone number');return;} location.href='sms:'+p.replace(/[^0-9+]/g,'')+'?&body='+encodeURIComponent(body||''); }
function callJob(id){ callNum(jobById(id).phone); }
function onMyWay(id){ const j=jobById(id); textNum(j.phone, `Hi ${j.name.split(' ')[0]}, it's YD Detailers, on my way for your ${j.service.toLowerCase()}. See you soon.`); }
function navTo(id){ const j=jobById(id); if(!j.address){toast('No address');return;} window.open('https://maps.google.com/?q='+encodeURIComponent(j.address),'_blank'); }

/* ============================================================
   SHEETS: job form, client form, method, confirm, settings
   ============================================================ */
const sheetEl=()=>document.getElementById('sheet'); const scrimEl=()=>document.getElementById('scrim');
function openSheet(html){ sheetEl().innerHTML=html; requestAnimationFrame(()=>{ scrimEl().classList.add('open'); sheetEl().classList.add('open'); }); }
function closeSheet(){ scrimEl().classList.remove('open'); sheetEl().classList.remove('open'); }

let JF = { vehType:'Sedan', serviceId:'interior', addons:[], _manual:false };
function guessServiceId(job){
  if(job){ if(job.serviceId && svcById(job.serviceId)) return job.serviceId;
    const n=(job.service||'').toLowerCase();
    if(n.includes('full')||n.includes('signature')) return 'full';
    if(n.includes('interior')) return 'interior';
    if(n.includes('exterior')) return 'exterior'; }
  return 'interior';
}
function openJobForm(id, prefillClient){
  const j = id? jobById(id) : null; const pc = prefillClient||null;
  JF = { vehType:(j&&j.vehType&&VTYPES.includes(j.vehType))?j.vehType:'Sedan', serviceId:guessServiceId(j), addons:[], _manual:!!j };
  if(j&&Array.isArray(j.addons)) j.addons.forEach(nm=>{ const a=ADDONS.find(a=>a.name.toLowerCase()===String(nm).toLowerCase()||String(nm).toLowerCase().includes(a.name.toLowerCase().split(' ')[0])); if(a&&!JF.addons.includes(a.id)) JF.addons.push(a.id); });
  const name=j?j.name:(pc?pc.name:''); const phone=j?j.phone:(pc?pc.phone:''); const veh=j?j.vehicle:(pc?pc.tag:'');
  const date=j?j.date:todayISO(); const time=j?j.time:'09:00'; const addr=j?j.address:''; const notes=j?j.notes:'';
  const cid=j?j.clientId:(pc?pc.id:''); const price=j?j.price:'';
  openSheet(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${j?'Edit job':'New job'}</h3><button class="x" onclick="closeSheet()">${IC.x}</button></div>
    <div class="sheet-body">
      <input type="hidden" id="f_id" value="${j?j.id:''}"><input type="hidden" id="f_cid" value="${esc(cid)}">
      <div class="field"><label>Client name</label><input id="f_name" value="${esc(name)}" placeholder="Full name"></div>
      <div class="field-row"><div class="field"><label>Phone</label><input id="f_phone" type="tel" value="${esc(phone)}" placeholder="(617) 555-0123"></div>
        <div class="field"><label>Vehicle (make / model)</label><input id="f_veh" value="${esc(veh)}" placeholder="2021 Audi Q5 Black"></div></div>
      <div class="field"><label>Vehicle type</label><div class="vtype" id="jf_vtype"></div></div>
      <div class="field"><label>Service</label><div class="svc-tiles" id="jf_services"></div></div>
      <div class="field"><label>Add-ons</label><div class="addon-row" id="jf_addons"></div></div>
      <div class="field-row"><div class="field"><label>Price ($)</label><input id="f_price" type="number" inputmode="numeric" value="${price}" oninput="JF._manual=true"></div>
        <div class="field"><label>Date</label><input id="f_date" type="date" value="${date}"></div></div>
      <div class="field-row"><div class="field"><label>Time</label><input id="f_time" type="time" value="${time}"></div>
        <div class="field"><label>Address</label><input id="f_addr" value="${esc(addr)}" placeholder="Street, city"></div></div>
      <div class="field"><label>Notes</label><textarea id="f_notes" placeholder="Gate codes, pets, problem areas…">${esc(notes)}</textarea></div>
    </div>
    <div class="sheet-cta"><button class="btn-primary" onclick="submitJob()">${IC.check}<span>${j?'Save changes':'Add job'}</span></button></div>`);
  jfRenderVtype(); jfRenderServices(); jfRenderAddons();
  if(!j) jfRecalc();
}
function jfRenderVtype(){ document.getElementById('jf_vtype').innerHTML = VTYPES.map(t=>`<button type="button" class="${JF.vehType===t?'on':''}" onclick="jfSetVtype('${t}')">${t}</button>`).join(''); }
function jfRenderServices(){ document.getElementById('jf_services').innerHTML = SERVICES.map(s=>`<button type="button" class="svc-tile ${JF.serviceId===s.id?'on':''}" onclick="jfSetService('${s.id}')"><div><div class="st-n">${s.name}</div><div class="st-d">${s.cat==='int'?'Interior only':s.cat==='ext'?'Exterior only':'Interior + exterior'}</div></div><div class="st-p">$${s.prices[JF.vehType]}</div></button>`).join(''); }
function jfRenderAddons(){ const s=svcById(JF.serviceId); const list=addonsForCat(s?s.cat:'full'); JF.addons=JF.addons.filter(id=>list.some(a=>a.id===id));
  document.getElementById('jf_addons').innerHTML = list.map(a=>`<button type="button" class="addon-chip ${JF.addons.includes(a.id)?'on':''}" onclick="jfToggleAddon('${a.id}')">${a.name} <span class="ap">+$${a.price}</span></button>`).join(''); }
function jfSetVtype(t){ JF.vehType=t; JF._manual=false; jfRenderVtype(); jfRenderServices(); jfRecalc(); }
function jfSetService(id){ JF.serviceId=id; JF._manual=false; jfRenderServices(); jfRenderAddons(); jfRecalc(); }
function jfToggleAddon(id){ const i=JF.addons.indexOf(id); if(i>=0)JF.addons.splice(i,1); else JF.addons.push(id); JF._manual=false; jfRenderAddons(); jfRecalc(); }
function jfBase(){ const s=svcById(JF.serviceId); return s?s.prices[JF.vehType]:0; }
function jfAddTotal(){ return ADDONS.filter(a=>JF.addons.includes(a.id)).reduce((x,a)=>x+a.price,0); }
function jfRecalc(){ if(JF._manual) return; const el=document.getElementById('f_price'); if(el) el.value = jfBase()+jfAddTotal(); }
function submitJob(){
  const name=document.getElementById('f_name').value.trim();
  if(!name){ toast('Enter a client name'); return; }
  const s=svcById(JF.serviceId); const addObjs=ADDONS.filter(a=>JF.addons.includes(a.id));
  const j={ id:document.getElementById('f_id').value||('new-'+Date.now()), clientId:document.getElementById('f_cid').value||'',
    name, phone:document.getElementById('f_phone').value.trim(), vehicle:document.getElementById('f_veh').value.trim(), vehType:JF.vehType,
    service:s?s.name:'Detail', serviceId:JF.serviceId, price:+document.getElementById('f_price').value||0, basePrice:jfBase(), addonTotal:jfAddTotal(),
    date:document.getElementById('f_date').value||todayISO(), time:document.getElementById('f_time').value||'09:00',
    address:document.getElementById('f_addr').value.trim(), notes:document.getElementById('f_notes').value.trim(), addons:addObjs.map(a=>a.name) };
  const existing = jobById(j.id); if(existing){ j.status=existing.status; j.paid=existing.paid; j.tip=existing.tip; j.paymentMethod=existing.paymentMethod; j.startedAt=existing.startedAt; }
  else { j.status=''; j.tip=0; }
  saveRecord('jobs',j).then(ok=>{ if(ok){ closeSheet(); closeJob(); } });
}

function openClientForm(id){
  const c=id?clientById(id):null;
  openSheet(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${c?'Edit client':'New client'}</h3><button class="x" onclick="closeSheet()">${IC.x}</button></div>
    <div class="sheet-body">
      <input type="hidden" id="cf_id" value="${c?c.id:''}">
      <div class="field"><label>Name</label><input id="cf_name" value="${esc(c?c.name:'')}" placeholder="Full name"></div>
      <div class="field-row"><div class="field"><label>Phone</label><input id="cf_phone" type="tel" value="${esc(c?c.phone:'')}" placeholder="(617) 555-0123"></div>
        <div class="field"><label>Email</label><input id="cf_email" type="email" value="${esc(c?c.email:'')}" placeholder="name@email.com"></div></div>
      <div class="field"><label>Vehicle</label><input id="cf_tag" value="${esc(c?c.tag:'')}" placeholder="2021 Audi Q5 Black"></div>
      <div class="field"><label>Status</label><select id="cf_status">${['new','regular','vip','inactive'].map(s=>`<option value="${s}" ${c&&c.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></div>
      <div class="field"><label>Notes</label><textarea id="cf_notes" placeholder="Preferences, pets, access…">${esc(c?c.notes:'')}</textarea></div>
    </div>
    <div class="sheet-cta"><button class="btn-primary" onclick="submitClient()">${IC.check}<span>${c?'Save changes':'Add client'}</span></button></div>`);
}
function submitClient(){
  const name=document.getElementById('cf_name').value.trim(); if(!name){ toast('Enter a name'); return; }
  const c={ id:document.getElementById('cf_id').value||('new-'+Date.now()), name, phone:document.getElementById('cf_phone').value.trim(),
    email:document.getElementById('cf_email').value.trim(), tag:document.getElementById('cf_tag').value.trim(),
    status:document.getElementById('cf_status').value, notes:document.getElementById('cf_notes').value.trim() };
  saveRecord('clients',c).then(ok=>{ if(ok){ closeSheet(); closeCust(); } });
}

let _methodTip=0;
function methodSheet(id, completing){
  const j=jobById(id); _methodTip=j.tip||0;
  openSheet(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${completing?'Complete & collect':'Collect payment'}</h3><button class="x" onclick="closeSheet()">${IC.x}</button></div>
    <div class="sheet-body">
      <div class="field"><label>Amount</label><input value="$${j.price}" disabled style="opacity:.7"></div>
      <div class="field"><label>Tip ($)</label><input id="m_tip" type="number" inputmode="numeric" value="${j.tip||0}"></div>
      <div class="field"><label>Payment method</label><div class="chip-select" id="m_methods">${METHODS.map((m,i)=>`<button type="button" class="chip-opt ${i===0?'on':''}" onclick="pickMethod(this)">${m}</button>`).join('')}</div></div>
    </div>
    <div class="sheet-cta" style="display:flex;gap:10px">
      <button class="btn-primary done" onclick="finishPayment('${id}',${!!completing},true)">${IC.check}<span>Mark paid</span></button>
      <button class="btn-ghost" style="width:auto;padding:0 16px;font-family:var(--font-d);font-weight:600" onclick="finishPayment('${id}',${!!completing},false)">Collect later</button>
    </div>`);
}
function pickMethod(btn){ document.querySelectorAll('#m_methods .chip-opt').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
function finishPayment(id, completing, paid){
  const j={...jobById(id)}; j.status='completed';
  j.tip=+document.getElementById('m_tip').value||0;
  const m=document.querySelector('#m_methods .chip-opt.on'); j.paymentMethod = paid? (m?m.textContent:'Cash') : '';
  j.paid = paid;
  saveRecord('jobs',j).then(ok=>{ if(ok){ closeSheet(); toast(paid?'Payment collected':'Marked to collect'); afterMark(id); } });
}

function confirmSheet({icon,tint,title,msg,ok,okClass,onOk,onCancel}){
  openSheet(`
    <div class="sheet-grip"></div>
    <div class="confirm-body"><div class="cf-ic ${tint||'tint-o'}">${icon||IC.alert}</div><h3>${esc(title)}</h3><p>${esc(msg)}</p></div>
    <div class="confirm-actions"><button class="btn-cancel" id="cf_cancel">Cancel</button><button class="btn-confirm ${okClass||''}" id="cf_ok">${esc(ok||'Confirm')}</button></div>`);
  document.getElementById('cf_ok').onclick=()=>{ closeSheet(); if(onOk) onOk(); };
  document.getElementById('cf_cancel').onclick=()=>{ closeSheet(); if(onCancel) onCancel(); };
}

/* ============================================================
   SETTINGS / LIVE CONNECT
   ============================================================ */
function openSettings(){
  const live = App.source==='live';
  openSheet(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Settings</h3><button class="x" onclick="closeSheet()">${IC.x}</button></div>
    <div class="sheet-body">
      <div class="mode-banner ${live?'live':''}">${live?IC.cloud:IC.gear}${live?'Live · connected to your CRM':'Local mode · demo data on this device'}</div>
      <div class="set-row"><span class="si ${live?'tint-g':'tint-o'}">${IC.cloud}</span><div class="st"><div class="h">${live?'Connected':'Connect to live CRM'}</div><div class="s">${live?(App.user&&App.user.email?esc(App.user.email):'Signed in'):'Sign in with Google to sync real bookings, clients & money.'}</div></div>
        <button class="set-btn ${live?'on':''}" onclick="${live?'disconnectLive()':'connectLive()'}">${live?'Disconnect':'Connect'}</button></div>
      <div class="set-row"><span class="si tint-b">${IC.reset}</span><div class="st"><div class="h">Reset demo data</div><div class="s">Restore the sample jobs & clients (local mode only).</div></div>
        <button class="set-btn" onclick="resetDemo()">Reset</button></div>
      <p style="font-size:12px;color:var(--muted);font-weight:600;line-height:1.5;padding:6px 4px 0">Live mode reads and writes your real YDdetailers Firestore. Writes are merge-only and ask you to confirm. Add this page to your home screen to run it like an app.</p>
    </div>`);
}
function fbInit(){ if(typeof firebase==='undefined') throw new Error('offline'); if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG); return firebase.firestore(); }
async function connectLive(){
  try{
    db=fbInit();
    const provider=new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
    App.user=firebase.auth().currentUser; App.source='live'; localStorage.setItem('yd_source','live');
    subscribeLive(); closeSheet(); toast('Connected to live CRM');
  }catch(e){ toast('Sign-in failed: '+(e.code||e.message||'error')); }
}
function subscribeLive(){
  unsubAll(); if(!db) db=firebase.firestore();
  App._unsub.push(db.collection('bookings').onSnapshot(s=>{ App.jobs=s.docs.map(d=>bookingToJob({id:d.id,...d.data()})); renderAll(); }, e=>toast('Bookings read error: '+e.code)));
  App._unsub.push(db.collection('clients').onSnapshot(s=>{ App.clients=s.docs.map(d=>clientToClient({id:d.id,...d.data()})); renderAll(); }, e=>toast('Clients read error: '+e.code)));
  App._unsub.push(db.collection('expenses').onSnapshot(s=>{ App.expenses=s.docs.map(d=>({id:d.id,...d.data()})); renderAll(); }, e=>{}));
}
function unsubAll(){ App._unsub.forEach(u=>{try{u();}catch(e){}}); App._unsub=[]; }
function disconnectLive(){ unsubAll(); try{ firebase.auth().signOut(); }catch(e){} App.source='seed'; localStorage.setItem('yd_source','seed'); loadSeed(); closeSheet(); toast('Switched to local mode'); }
function tryResumeLive(){
  try{ db=fbInit(); }catch(e){ App.source='seed'; return; }
  firebase.auth().onAuthStateChanged(u=>{ if(u){ App.user=u; App.source='live'; subscribeLive(); } else { App.source='seed'; renderAll(); } });
}

/* ============================================================
   TOAST / SLIDER / CLOCK / PWA
   ============================================================ */
let _toastT=null;
function toast(msg){ const t=document.getElementById('toast'); document.getElementById('toastMsg').textContent=msg; t.classList.add('show'); clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove('show'),2600); }

function initSlider(){
  const wrap=document.getElementById('baWrap'); if(!wrap) return;
  const after=document.getElementById('baAfter'); const handle=document.getElementById('baHandle');
  after.style.clipPath='inset(0 0 0 50%)'; handle.style.left='50%'; let drag=false;
  function set(x){ const r=wrap.getBoundingClientRect(); let p=(x-r.left)/r.width*100; p=Math.max(2,Math.min(98,p)); after.style.clipPath=`inset(0 0 0 ${p}%)`; handle.style.left=p+'%'; }
  wrap.addEventListener('pointerdown',e=>{ drag=true; set(e.clientX); });
  window.addEventListener('pointermove',e=>{ if(drag) set(e.clientX); });
  window.addEventListener('pointerup',()=>drag=false);
}

function registerSW(){ if('serviceWorker' in navigator){ try{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }catch(e){} } }

function applyHash(){
  const h=(location.hash||'').replace('#',''); if(!h) return; const [k,v]=h.split('=');
  if(['jobs','money','clients','photos'].includes(k)) setTab(k);
  else if(k==='week'){ setTab('jobs'); setJobView('week'); }
  else if(k==='month'){ setTab('money'); setMoneyPeriod('month'); }
  else if(k==='job'&&v){ setTab('jobs'); openJob(v); }
  else if(k==='cust'&&v){ setTab('clients'); openCust(v); }
  else if(k==='settings'){ openSettings(); }
  else if(k==='newjob'){ setTab('jobs'); openJobForm(); }
  else if(k==='newclient'){ setTab('clients'); openClientForm(); }
  else if(k==='pay'&&v){ setTab('jobs'); methodSheet(v,true); }
  else if(k==='camera'&&v){ setTab('photos'); openCamera(v); }
}

/* ---------- boot ---------- */
function boot(){
  loadSeed();
  setTab('jobs');
  registerSW();
  loadPhotoKeys();
  if(localStorage.getItem('yd_source')==='live') tryResumeLive();
  window.addEventListener('hashchange',applyHash);
  applyHash();
}
document.addEventListener('DOMContentLoaded',boot);
