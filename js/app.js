const D=window.__PTT_DATA, C=D.cards, IMGB=window.__PTT_IMG||null;
const PLINES=PLINES_ALL.filter(p=>p[0]=='home'||(D.meta.lines||['cards','bank','broker','tel']).includes(p[0])),PRODUCT=PLINES.filter(p=>p[0]!='home');/* enabled product lines (build flag PTT_LINES, default cards) */
const CARDS_ONLY=PRODUCT.length==1&&PRODUCT[0][0]=='cards',CT_ALL=CARDS_ONLY?['ov','dtl','rw','prom','ins','perk','fees']:null,SUBONLY=new Set(['trv','prot','pkT','pkE']),HIDE=new Set(['dtl','prom']),CTV=()=>CT_ALL&&CT_ALL.filter(i=>!HIDE.has(i));/* Credit Cards sub-tabs: Overview, Rewards, Insurance, Perks, Fees (this order). HIDE is the per-line config of hidden sub-tabs (Full Detail, Promotions): code and data stay, nav and routes skip them, a hidden id in a link or hash falls back to Overview. Cards-only release: the other Cards views and the user pages stay in the code, off the nav */
if(!CARDS_ONLY)SUBONLY.add('perk');/* the per-card Perks sub-tab (PKF, renderPerks) belongs to the cards-only release; the all-lines build keeps its own Perks view (id perks) */
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=v=>v==null?'<span class=u>—</span>':v==0?'<span class=y>Free</span>':'$'+v.toLocaleString();
const pct=(v,hi)=>v==null?'<span class=u>—</span>':`<span class="${hi&&v>=hi?'hi':''}">${v.toFixed(2)}%</span>`;
const yn=v=>v===1?'<span class=y>✓</span>':v===0?'<span class=n>✗</span>':'<span class=u>—</span>';
const uniq=f=>[...new Set(C.map(f).filter(x=>x!=null&&x!==''))].sort();
const INS=[['emergency_medical','Medical'],['trip_cancellation','Trip cancel'],['trip_interruption','Trip interrupt'],['flight_delay','Flight delay'],['baggage','Baggage'],['hotel_burglary','Hotel burglary'],['rental_car_cdw','Rental CDW'],['purchase_protection','Purchase prot.'],['extended_warranty','Ext. warranty'],['mobile_device','Mobile device'],['price_protection','Price prot.'],['travel_accident','Travel accident'],['roadside','Roadside']];
const INS_TK=['emergency_medical','trip_cancellation','trip_interruption','flight_delay','baggage','travel_accident'],INS_T=INS.filter(x=>INS_TK.includes(x[0])),INS_P=INS.filter(x=>!INS_TK.includes(x[0]));/* Travel = trip coverages; Protection = everyday coverages that are not about a trip (purchase, warranty, rental car, roadside, hotel burglary, mobile, price) */
const insN=(c,L)=>L.filter(([k])=>c.ins[k]===1).length,insU=(c,L)=>L.filter(([k])=>c.ins[k]==null).length;
/* third-level row (one reusable component, keyed per sub-tab): GROUPS[sub-tab id] = [[screen id, label], ...]; st.g[sub-tab id] is the chosen one. A group's screen is an entry of S with that id, off the nav (SUBONLY). */
const GROUPS={ins:[['trv','Travel'],['prot','Protection']]},GKEY=()=>GROUPS[st.s]?((st.g||{})[st.s]&&GROUPS[st.s].some(x=>x[0]==st.g[st.s])?st.g[st.s]:GROUPS[st.s][0][0]):st.s;
GROUPS.perk=[['pkT','Travel'],['pkE','Everyday']];/* Perks = Travel | Everyday, keyed to perk_group (PKG) */
// filter option builders
const ge=(f,vals,u='%')=>vals.map(v=>[`≥ ${u=='$'?'$'+v.toLocaleString():v+u}`,c=>c[f]!=null&&c[f]>=v]);
const le=(f,vals,u='%')=>vals.map(v=>[`≤ ${u=='$'?'$'+v.toLocaleString():v+u}`,c=>c[f]!=null&&c[f]<=v]);
const eq=(f,vals)=>vals.map(v=>[v,c=>c[f]===v]);
const RATES=[1,1.5,2,2.5,3,4,5];
const TODAY=new Date();TODAY.setHours(0,0,0,0);
const ODAYS=c=>{if(!c.offer||!/^\d{4}-\d\d-\d\d$/.test(c.odl||''))return null;const [y,m,d]=c.odl.split('-').map(Number);return Math.round((new Date(y,m-1,d)-TODAY)/864e5)};
/* a welcome offer is live when the record has one and its deadline (when it is a date) has not passed; derived from the existing offer and deadline fields */
const OFLIVE=c=>!!c.offer&&!(ODAYS(c)!=null&&ODAYS(c)<0);
const SOON=c=>{const d=ODAYS(c);return d!=null&&d>=0&&d<=30};
const soonB=c=>SOON(c)?`<span class=soon title="Offer deadline ${esc(c.odl)}">${ODAYS(c)==0?'Ends today':'Ends in '+ODAYS(c)+'d'}</span>`:'';
const CN=D.meta.catn,CC=D.meta.catcount,RC=Object.keys(CN).filter(k=>k=='other'||CC[k]>=2).sort((a,b)=>a=='other'?1:b=='other'?-1:CC[b]-CC[a]);
/* One ordered field config per sub-tab: FIELDS[tab] lists the fields; the table columns and the filter panel are both read from it, so they match one to one (test_nav asserts it). */
const RTO=['Points','Cash back','Travel/airline miles','Store dollars','No rewards','Unconfirmed'],
 FEEO=[['$0/yr',c=>c.fee===0],['≤ $50',c=>c.fee!=null&&c.fee<=50],['≤ $100',c=>c.fee!=null&&c.fee<=100],['≤ $150',c=>c.fee!=null&&c.fee<=150],['≤ $250',c=>c.fee!=null&&c.fee<=250],['> $250',c=>c.fee>250],['Paid (> $0)',c=>c.fee>0]],
 OFFO=[['Yes',c=>!!c.offer],['No',c=>!c.offer]];
/* every field that has a column and a filter, by id: [filter id, label, options]. Overview is an explicit ordered list; Full Detail is every field not on Overview, so a new field is never lost. */
const ALLF={fee:['fee','Cost',()=>FEEO],other:['other','Base earn %',()=>ge('other',[0.5,1,1.25,1.5,2])],pcn:['npc','Premium Categories',()=>ge('npc',[1,2,3,4,5],'')],best:['best','Best earn %',()=>ge('best',RATES)],nins:['nins','Covers',()=>[2,4,6,8,10,12,13].map(v=>['Covers ≥ '+v,c=>c.nins>=v])],
 kind:['rt','Reward type',()=>eq('rt',RTO)],offer:['offer','Welcome offer',()=>OFFO],ofc:['ofl','Welcome offer',()=>[['Yes',OFLIVE],['No',c=>!OFLIVE(c)]]],
 i:['issuer','Issuer',()=>eq('i',uniq(c=>c.i))],cur:['cur','Currency',()=>eq('cur',['CAD','USD'])],acct:['acct','Account type',()=>eq('acct',['Personal','Business'])],nw:['net','Network',()=>eq('nw',uniq(c=>c.nw))],
 pt:['pt','Fee',()=>eq('pt',['Fee','No fee','Prepaid','Secured'])],tier:['tier','Tier',()=>eq('tier',uniq(c=>c.tier))],it:['itype','Issuer type',()=>eq('it',uniq(c=>c.it))],st:['status','Status',()=>eq('st',uniq(c=>c.st))]};
const OV_LIST=['fee','other','pcn','best','nins','kind','ofc'];/* Andrew's Overview list, in order */
const FIELDS={ov:OV_LIST,dtl:Object.keys(ALLF).filter(k=>!OV_LIST.includes(k))},FDEF={ov:ALLF,dtl:ALLF};
const fcols=id=>FIELDS[id],ffilt=id=>FIELDS[id].map(k=>{const[i,l,o]=FDEF[id][k];return[i,l,o()]});
/* Perks sub-tab (Credit Cards): one row per card perk (D.pk, from card_perk_facts; a card with no perk row is absent). PKF is its ordered field config: the columns (FIELDS.perk) and the filter panel (pkFilt) are both read from it, so column order = filter order. A perk row has .card; a card has .cp (its perk rows), so a perk filter also works on the card views: a card matches when any of its perks does. Values are shown as stored: never annualised, never guessed. */
const PKCAT=[['statement_credit','Statement credit'],['lounge','Lounge'],['nexus_global_entry','NEXUS / Global Entry'],['membership','Membership'],['discount','Discount'],['other','Other']],PKREC=[['annual','Annual'],['monthly','Monthly'],['one_time','One-time'],['per_use','Per use'],['ongoing','Ongoing'],['every_48_months','Every 48 months']],PKG={pkT:'Travel',pkE:'Everyday'},PKCI={};
C.forEach((c,i)=>{PKCI[c.id]=i;c.cp=[]});
const PKR=(D.pk||[]).map(r=>({...r,card:C[PKCI[r.c]]})).filter(r=>r.card);PKR.forEach(r=>r.card.cp.push(r));
const pkAny=f=>x=>(x.cp||[x]).some(f),pkOf=(k,L)=>L.filter(([v])=>PKR.some(r=>r[k]===v)).map(([v,l])=>[l,pkAny(r=>r[k]===v)]),pkVals=k=>[...new Set(PKR.map(r=>r[k]).filter(Boolean))].sort();
const PKDAYS=r=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(r.ex||'');return m?Math.round((new Date(+m[1],m[2]-1,+m[3])-TODAY)/864e5):null};
const PKF={pk_n:['pk_n','Card',()=>[...new Set(PKR.map(r=>r.card))].sort((a,b)=>a.n.localeCompare(b.n)).map(c=>[c.n,pkAny(r=>r.card===c)]),1],pk_perk:['pk_perk','Perk',null],
 pk_cat:['pk_cat','Category',()=>pkOf('cat',PKCAT),1],pk_val:['pk_val','Value',()=>[['Has a stated value',pkAny(r=>r.a!=null)],['No value stated',pkAny(r=>r.a==null)]]],
 pk_rec:['pk_rec','Recurrence',()=>pkOf('rec',PKREC),1],pk_en:['pk_en','Enrol',()=>[['Required',pkAny(r=>r.en===1)],['Not stated',pkAny(r=>r.en!==1)]]],
 pk_rg:['pk_rg','Region',()=>pkVals('rg').map(v=>[v,pkAny(r=>r.rg===v)]),1],
 pk_ex:['pk_ex','Expiry',()=>[['Ending within 30 days',pkAny(r=>{const d=PKDAYS(r);return d!=null&&d>=0&&d<=30})],['Has an end date',pkAny(r=>PKDAYS(r)!=null)],['Ongoing',pkAny(r=>r.ex=='ongoing')]]],
 pk_ev:['pk_ev','Evidence',()=>['CITED','REPORTED','ESTIMATE'].filter(v=>PKR.some(r=>r.ec===v)).map(v=>[v,pkAny(r=>r.ec===v)])],
 pk_i:['pk_i','Issuer',()=>[...new Set(PKR.map(r=>r.card.i))].sort().map(v=>[v,pkAny(r=>r.card.i===v)]),1],
 pk_st:['pk_st','Status',()=>[['Live',pkAny(r=>r.s=='live')],['Unverified',pkAny(r=>r.s=='unverified')]]]};
const pkCols=['pk_n','pk_perk','pk_cat','pk_val','pk_rec','pk_en','pk_rg','pk_ex','pk_ev'];/* filter-only fields (Issuer, Status) follow the column-backed filters */
FIELDS.perk=pkCols;FDEF.perk=PKF;
const pkFilt=()=>[...FIELDS.perk,'pk_i','pk_st'].filter(k=>PKF[k][2]).map(k=>{const[i,l,o,m]=PKF[k];return m?[i,l,o(),1]:[i,l,o()]});
/* Rewards fits one window: the six most-carried categories and the base rate get their own column; every other category is merged into one 'More categories' cell (its filters stay) */
const RWTOP=RC.filter(k=>k!='other').slice(0,6),RWMORE=RC.filter(k=>k!='other'&&!RWTOP.includes(k));
const S=[
 {id:'ov',name:'Overview',cols:fcols('ov'),f:ffilt('ov')},
 {id:'dtl',name:'Full Detail',cols:fcols('dtl'),f:ffilt('dtl')},
 {id:'fees',name:'Fees',cols:['fee','fyf','add','fx','apr','inc','hinc'],f:[
  ['fee','Cost',FEEO],
  ['fyf','First-year fee',[['Waived',c=>c.fyf]]],
  ['add','Extra card fee',[['Free',c=>c.add===0],['≤ $50',c=>c.add!=null&&c.add<=50]]],
  ['fx','FX fee',[['None (0%)',c=>c.fx===0],['< 2.5%',c=>c.fx!=null&&c.fx<2.5],['≥ 2.5%',c=>c.fx>=2.5]]],
  ['apr','Purchase APR',le('apr',[12.99,15,19.99,20.99])],
  ['inc','Income required',[['None stated',c=>!c.inc],...le('inc',[15000,40000,60000,80000],'$')]]]},
 {id:'rw',name:'Rewards',cols:['kind','prog','cpp',...RWTOP.map(k=>'r_'+k),'r_other','best','rmore'],f:[
  ...RC.map(k=>['r_'+k,CN[k],ge('r_'+k,k=='other'?[0.5,1,1.25,1.5,2]:RATES)]),['best','Best earn %',ge('best',RATES)],
  ['rt2','Reward type',eq('rt',['Points','Cash back','Travel/airline miles','Store dollars','No rewards','Unconfirmed'])],['prog','Program',eq('prog',uniq(c=>c.kind=='Points'?c.prog:null))],
  ['tag','¢/pt tag',eq('tag',['CITED','ESTIMATE','REPORTED'])]]},
 {id:'ins',name:'Insurance',cols:[],f:[]},/* nav entry: the views are the third-level rows trv (Travel) and prot (Protection), see GROUPS */
 {id:'trv',name:'Travel',cols:['covT','ptt','x_uw',...INS_T.map(x=>'ins_'+x[0])],f:[
  ...INS_T.map(([k,l])=>['ins_'+k,l,[['Included',c=>c.ins[k]===1],['Not included',c=>c.ins[k]===0]]]),
  ['nt','Covers',[2,3,4,5,6].map(v=>['Covers ≥ '+v,c=>insN(c,INS_T)>=v])],['med','Medical limit',ge('med',[1000000,2000000,5000000],'$')],
  ['ptt','PTT Score',[['Good (≥ $200)',c=>c.ptt.v>=200],['Fair ($75–199)',c=>c.ptt.v>=75&&c.ptt.v<200],['Weak (< $75)',c=>c.ptt.v<75],['Fully verified (no *)',c=>!c.ptt.u]]],
  ['x_uw','Underwriter',[...new Set(C.flatMap(c=>c.ix.insurers?c.ix.insurers[0]:[]))].sort().map(n=>[n,c=>!!c.ix.insurers&&c.ix.insurers[0].includes(n)]).concat([['No included insurance',c=>!!c.ix.insurers&&!c.ix.insurers[0].length],['Not stated (?)',c=>!c.ix.insurers]]),1],
  ['x_cc','Common carrier AD&D',[['Stated',c=>X(c,'cc_add_max')!=null],...[250000,500000,1000000].map(v=>['≥ $'+v.toLocaleString(),c=>X(c,'cc_add_max')>=v])]]]},
 {id:'prot',name:'Protection',cols:['covP','ptt','x_uw',...INS_P.map(x=>'ins_'+x[0])],f:[
  ...INS_P.map(([k,l])=>['ins_'+k,l,[['Included',c=>c.ins[k]===1],['Not included',c=>c.ins[k]===0]]]),
  ['np','Covers',[2,3,4,5,6,7].map(v=>['Covers ≥ '+v,c=>insN(c,INS_P)>=v])],['mob','Mobile cover',ge('mob',[500,1000,1500],'$')],
  ['ptt','PTT Score',[['Good (≥ $200)',c=>c.ptt.v>=200],['Fair ($75–199)',c=>c.ptt.v>=75&&c.ptt.v<200],['Weak (< $75)',c=>c.ptt.v<75],['Fully verified (no *)',c=>!c.ptt.u]]],
  ['x_uw','Underwriter',[...new Set(C.flatMap(c=>c.ix.insurers?c.ix.insurers[0]:[]))].sort().map(n=>[n,c=>!!c.ix.insurers&&c.ix.insurers[0].includes(n)]).concat([['No included insurance',c=>!!c.ix.insurers&&!c.ix.insurers[0].length],['Not stated (?)',c=>!c.ix.insurers]]),1],
  ['x_rad','Rental AD&D',[['Stated',c=>X(c,'rental_add_max')!=null]]],
  ['x_ppd','Price prot. window',[['Stated',c=>X(c,'pp_days')!=null],['≥ 60 days',c=>X(c,'pp_days')>=60]]],
  ['x_ppi','Price prot. per item',[['Stated',c=>X(c,'pp_item')!=null],['≥ $500',c=>X(c,'pp_item')>=500]]],
  ['x_ppy','Price prot. per year',[['Stated',c=>X(c,'pp_year')!=null],['≥ $1,000',c=>X(c,'pp_year')>=1000]]]]},
 {id:'pkT',name:'Travel',cols:[],f:pkFilt()},{id:'pkE',name:'Everyday',cols:[],f:pkFilt()},/* cols stay empty here: the perk table (pkCols = FIELDS.perk) is drawn by renderPerks, and its filters are labelled and ordered by PKF */
 {id:'perk',name:'Perks',cols:[],f:pkFilt()},/* nav entry (after its two groups so the chips name Perks): the views are the third-level rows pkT (Travel) and pkE (Everyday), see GROUPS */
 {id:'perks',name:'Perks',cols:['fee','offer','tpo','odl','credits','perks','exp'],f:[
  ['offer','Welcome offer',OFFO],['tpo','Sign-up bonus',[['Has third-party offer',c=>c.tpo.length>0],...[25,50,100,150,200].map(v=>['≥ $'+v,c=>(c.tpo[0]?.a||0)>=v])]],['soon','Apply by',[['Within 30 days',SOON],['Within 60 days',c=>{const d=ODAYS(c);return d!=null&&d>=0&&d<=60}]]],['credits','Credits & bonuses',[['Any',c=>c.credits.length>0]]],
  ['perks','Partner perks',[['Any',c=>c.perks.length>0]]],['exp','Points expiry',[['None',c=>c.exp=='none']]]]},
 {id:'val',name:'Point Conversion',cols:[],f:[]},
 {id:'prom',name:'Promotions',cols:[],f:[]},
 {id:'wfolder',name:'Wallet folder',cols:[],f:[]}
];
const COL={i:['Issuer','l',c=>c.i,c=>esc(c.i)],nw:['Network','ic',c=>c.nw,c=>icoCell('nw',c.nw)],kind:['Type','l',c=>c.rt,c=>esc(c.rt)+VE(c,'reward_type')],
 prog:['Program','l',c=>c.prog,c=>esc(c.prog)],fee:['Cost','',c=>c.fee,c=>{if(c.fee==null)return money(null);const r=cmods(c).find(r=>(r.when||[]).some(w=>w.f=='tier'));return r?'$'+effFee0(c).toLocaleString()+'/yr → <b>$'+Math.max(0,c.fee+(r.value||0))+'/yr</b>'+rateMark({...r,when:[{v:provTier(c.i)}]}):'$'+c.fee.toLocaleString()+'/yr'}],best:['Best earn %','',c=>c.best,c=>pct(c.best,3)],
 other:['Base earn %','',c=>c.other,c=>pct(c.other,1.5)],pcn:['Premium Categories','',c=>c.npc,c=>c.npc==null?'<span class=u title="No base earn rate on record, so no count">—</span>':`<span title="Count of reward categories that earn strictly more than the base rate. Derived at build time from this card's sourced category rates (CITED data); a count, not a rate.">${c.npc}</span>`],nins:['Ins.','',c=>c.nins,c=>c.nins+'<span class=mute>/'+INS.length+'</span>'],
 offer:['Welcome offer','l',c=>c.offer?0:1,c=>c.offer?`<span class=ofr tabindex=0 role=button aria-haspopup=dialog data-ofr="${C.indexOf(c)}">${esc(c.offer.slice(0,46))}${c.offer.length>46?'…':''}</span>`:'<span class=u>—</span>'],
 fyf:['1st yr','',c=>c.fyf?0:1,c=>c.fyf?'<span class=y>Waived</span>':'<span class=u>—</span>'],add:['Extra card','',c=>c.add,c=>money(c.add)],
 fx:['FX','',c=>c.fx,c=>c.fx==null?'<span class=u>—</span>':c.fx==0?'<span class=y>0%</span>':c.fx+'%'],apr:['APR','',c=>c.apr,c=>c.apr==null?'<span class=u>—</span>':c.apr.toFixed(2)+'%'],
 inc:['Income','',c=>c.inc??0,c=>c.inc?'$'+c.inc.toLocaleString():'<span class=u>—</span>'],hinc:['Household','',c=>c.hinc??0,c=>c.hinc?'$'+c.hinc.toLocaleString():'<span class=u>—</span>'],
 cpp:['¢/pt','',c=>c.kind=='Points'?c.cpp:-1,c=>c.kind=='Points'?`${c.cpp}<span class=t>${c.tag[0]}</span>`:'<span class=mute>cash</span>'],
 gas:['Gas','',c=>c.gas,c=>pct(c.gas,3)],groc:['Grocery','',c=>c.groc,c=>pct(c.groc,3)],dine:['Dining','',c=>c.dine,c=>pct(c.dine,3)],trav:['Travel','',c=>c.trav,c=>pct(c.trav,3)],
 med:['Med. limit','',c=>c.med??0,c=>c.med?'$'+(c.med>=1e6?c.med/1e6+'M':c.med.toLocaleString()):'<span class=u>—</span>'],mob:['Mobile','',c=>c.mob??0,c=>c.mob?'$'+c.mob.toLocaleString():'<span class=u>—</span>'],
 odl:['Apply by','',c=>c.odl||'9',c=>c.odl?esc(c.odl):'<span class=u>—</span>'],
 credits:['Credits & bonuses','wrapt',c=>-c.credits.length,c=>c.credits.length?esc(c.credits.join(' · ')):'<span class=u>—</span>'],
 perks:['Partner perks','wrapt',c=>-c.perks.length,c=>c.perks.length?esc(c.perks.join(' · ')):'<span class=u>—</span>'],
 exp:['Expiry','l',c=>c.exp||'z',c=>c.exp?esc(c.exp):'<span class=u>—</span>']};
const rmoreOf=c=>RWMORE.filter(k=>c['r_'+k]!=null&&c['r_'+k]>(c.other??0)).sort((a,b)=>c['r_'+b]-c['r_'+a]);
COL.rmore=['More categories','l',c=>Math.max(0,...rmoreOf(c).map(k=>c['r_'+k])),c=>{const L=rmoreOf(c);return L.length?L.map(k=>`<span title="${esc(CN[k])}">${esc(CN[k].replace(/ \(.*/,''))} <b>${c['r_'+k].toFixed(1)}%</b></span>`).join(', '):'<span class=u>—</span>'}];
RC.forEach(k=>COL['r_'+k]=[CN[k]+(k=='other'?'':` <span class=mute>(${CC[k]})</span>`),'',c=>c['r_'+k],c=>pct(c['r_'+k],3)]);
COL.pt=['Fee','l',c=>c.pt,c=>esc(c.pt||'—')+VE(c,'card_product_type')];COL.tier=['Tier','l',c=>c.tier,c=>esc(c.tier||'—')];COL.it=['Issuer type','l',c=>c.it,c=>esc(c.it||'—')];COL.st=['Status','l',c=>c.st,c=>esc(c.st||'—')];COL.cur=['Currency','l',c=>c.cur,c=>esc(c.cur||'—')];COL.acct=['Account','ic',c=>c.acct,c=>icoCell('acct',c.acct)];
/* skinny icon columns (Account type; Network follows): original inline SVG marks, one vocabulary shared by the table cell and the active-filter chip; the full word is the title and aria-label, sorting and the filter still use the word */
const svgI=p=>`<svg viewBox="0 0 16 16" width=14 height=14 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=1.4 stroke-linecap=round stroke-linejoin=round>${p}</svg>`;
const ICOS={acct:{Personal:svgI('<circle cx=8 cy=5.2 r=2.6 /><path d="M3 13.5c.6-2.6 2.6-3.8 5-3.8s4.4 1.2 5 3.8"/>'),Business:svgI('<rect x=2 y=5 width=12 height=8.5 rx=1.2 /><path d="M5.8 5V3.6c0-.6.4-1 1-1h2.4c.6 0 1 .4 1 1V5M2 9h12"/>')}};
const NWB={Visa:'V',Mastercard:'MC','American Express':'AX'};/* network marks are compact text badges (original, not official logos) */
const icoCell=(k,v)=>v?`<span class="ico" role=img aria-label="${esc(v)}" title="${esc(v)}">${ICOS[k]?.[v]||(k=='nw'?`<b class=nb>${esc(NWB[v]||v.slice(0,2))}</b>`:esc(v))}</span>`:'<span class=u title="Not recorded">—</span>';
COL.ofc=['Welcome offer','ic',c=>OFLIVE(c)?1:0,c=>{const on=OFLIVE(c),t=on?'Welcome offer: live now':'Welcome offer: none or expired';return `<span class="ico ${on?'y':'u'}" role=img aria-label="${t}" title="${t}">${on?svgI('<path d="M3 8.5l3.2 3.2L13 4.5"/>'):svgI('<path d="M4 4l8 8M12 4l-8 8"/>')}</span>`}];
const CHIPI={acct:'acct',net:'nw'};
/* Perks columns, over a perk row r (not a card): [label, class, sort key, cell] */
const PKU={visits:['visit','visits'],voucher:['voucher','vouchers'],bag:['bag','bags'],credit:['credit','credits'],points:['point','points']},
 pkMoney=r=>(r.vu=='USD'?'US$':'$')+r.a.toLocaleString(undefined,{maximumFractionDigits:2}),
 pkVal=r=>{if(r.a!=null)return esc(pkMoney(r))+(r.q>1&&r.u=='visits'?`<span class=mute> · ${r.q} visits</span>`:'')+(r.vb?`<span class=t title="Value basis: how the dollar figure was derived (${esc(r.vb)})">${esc(r.vb)}</span>`:'');if(r.u=='membership')return '<span class=mute>Included</span>';if(r.q==null||!r.u)return '<span class=u>—</span>';
  if(r.u=='pct_of_plan'||r.u=='pct_of_annual_earn')return `${r.q}${r.u=='pct_of_plan'?'% of plan':'% of annual earn'}`;const w=PKU[r.u];return `${r.q.toLocaleString()} ${w?(r.q==1?w[0]:w[1]):esc(r.u)}`},
 pkLab=(L,v)=>(L.find(x=>x[0]==v)||[,v])[1];
COL.pk_n=['Card','l nm pkc',r=>r.card?r.card.n:r.n,r=>`<button type=button class=nmb data-m="${C.indexOf(r.card)}" aria-haspopup=dialog title="All details"><b class=cl>${esc(r.card.n)}</b></button><small>${esc(r.card.i)}</small>`];
COL.pk_perk=['Perk','pkn',r=>r.n,r=>`<button type=button class=pkb aria-expanded=false title="Quote and source">${esc(r.n)}</button>`];
COL.pk_cat=['Category','l',r=>pkLab(PKCAT,r.cat),r=>esc(pkLab(PKCAT,r.cat))];
COL.pk_val=['Value','',r=>r.a,pkVal];
COL.pk_rec=['Recurrence','l',r=>PKREC.findIndex(x=>x[0]==r.rec),r=>r.rec?esc(pkLab(PKREC,r.rec)):'<span class=u>—</span>'];
COL.pk_en=['Enrol','ctr',r=>r.en===1?1:0,r=>r.en===1?'<span class=y title="Enrolment is required">✓</span>':'<span class=u title="Not stated">—</span>'];
COL.pk_rg=['Region','l',r=>r.rg,r=>r.rg?esc(r.rg):'<span class=u>—</span>'];
COL.pk_ex=['Expiry','l',r=>PKDAYS(r)!=null?r.ex:r.ex=='ongoing'?'9999':null,r=>{const d=PKDAYS(r);return d==null?(r.ex=='ongoing'?'Ongoing':r.ex?esc(r.ex):'<span class=u>—</span>'):esc(r.ex)+(d>=0&&d<=30?`<span class=soon title="Ending soon">${d==0?'Ends today':'Ends in '+d+'d'}</span>`:'')}];
COL.pk_ev=['Evidence','l',r=>r.ec||null,r=>(r.ec?`<span class=t title="Evidence class: ${esc(r.ec)}">${esc(r.ec)}</span>`:'<span class=u title="Evidence class not recorded">—</span>')+(r.s=='unverified'?'<span class="t unv" title="Not yet re-checked against the issuer page">unverified</span>':'')];
/* v3.5.2: '?' only when genuinely unknown. A card whose record says it carries no included insurance shows ✗ for every type;
   roadside (rarely a card benefit) not listed in an otherwise-captured coverage list shows '—' (not listed), not '?'. */
const NOINS=c=>c.ix.insurers&&c.ix.insurers[0]&&c.ix.insurers[0].length==0;
const insV=(c,k)=>c.ins[k]!=null?c.ins[k]:NOINS(c)?0:(k=='roadside'&&c.nins>0)?'nl':null;
const ynI=(c,k)=>{const v=insV(c,k);return v=='nl'?'<span class=mute title="Not listed in this card’s insurance terms">—</span>':yn(v)};
INS.forEach(([k,l])=>COL['ins_'+k]=[l,'ctr',c=>{const v=insV(c,k);return -(v===1?1:v===0||v=='nl'?0:-.5)},c=>ynI(c,k)]);
/* v3.5.2 single source of label truth: FIELD_LABEL names a field once; table headers and filters both read it, so they cannot drift. */
const FIELD_LABEL={kind:'Reward type',acct:'Account type',fyf:'First-year fee',add:'Extra card fee',fx:'FX fee',apr:'Purchase APR',inc:'Income required',best:'Best earn %',nins:'Covers',nt:'Covers',np:'Covers',med:'Medical limit',mob:'Mobile cover',x_cc:'Carrier AD&D',x_ppd:'Price protection window',x_ppi:'Price protection per item',x_ppy:'Price protection per year',exp:'Points expiry'};
Object.entries(FIELD_LABEL).forEach(([k,l])=>{if(COL[k])COL[k][0]=l});
const FLD=k=>FIELD_LABEL[k]||(COL[k]?String(COL[k][0]).replace(/<[^>]+>/g,'').replace('ⓘ','').trim():null);
/* 2026-10-20 filters and headers (Docs/naming.md): FBY maps a filter id to the column it filters (when the ids differ) and an optional condition suffix.
   A filter backed by a column of its view takes that column's label (+ suffix) and the column's position; filter-only fields keep their order, after them. */
const FBY={issuer:['i'],itype:['it'],status:['st'],net:['nw'],rt:['kind'],rt2:['kind'],tag:['cpp',' tag'],nins:['cov'],npc:['pcn'],ofl:['ofc'],nt:['covT'],np:['covP'],soon:['odl']};
const syncLabels=()=>{Object.entries(FIELD_LABEL).forEach(([k,l])=>{if(COL[k])COL[k][0]=l});S.forEach(s=>{const ek=f=>s.cols.includes(f[0])?[f[0]]:(FBY[f[0]]||[f[0]]),pos=f=>{const i=s.cols.indexOf(ek(f)[0]);return i<0?1e3:i};
 s.f.forEach(f=>{const[k,suf='']=ek(f),l=s.cols.includes(k)?FLD(k):FIELD_LABEL[f[0]];if(l)f[1]=l+(s.cols.includes(k)?suf:'')});
 s.f=s.f.map((f,i)=>[f,i]).sort((a,b)=>pos(a[0])-pos(b[0])||a[1]-b[1]).map(x=>x[0])})};syncLabels();
const X=(c,k)=>c.ix[k]?c.ix[k][0]:null,XT=(c,k)=>c.ix[k]?`<span class=t>${c.ix[k][1][0]}</span>`:'';
const xm=k=>c=>X(c,k)==null?'<span class=u>—</span>':'$'+(X(c,k)>=1e6?X(c,k)/1e6+'M':X(c,k).toLocaleString())+XT(c,k);
COL.x_uw=['Underwriter','wrapt',c=>c.ix.insurers?(c.ix.insurers[0].join('; ')||'~'):'~~',c=>!c.ix.insurers?'<span class=u title="Underwriter not stated in the record">—</span>':!c.ix.insurers[0].length?'<span class=mute>No included insurance</span>':esc(c.ix.insurers[0].join('; '))+XT(c,'insurers')];
COL.x_cc=['Carrier AD&D','',c=>X(c,'cc_add_max'),xm('cc_add_max')];COL.x_rad=['Rental AD&D','',c=>X(c,'rental_add_max'),xm('rental_add_max')];
COL.x_ppd=['PP days','',c=>X(c,'pp_days'),c=>X(c,'pp_days')==null?'<span class=u>—</span>':X(c,'pp_days')+XT(c,'pp_days')+(X(c,'pp_tier')?`<span class=t title="Only on the ${esc(X(c,'pp_tier'))} tier">${esc(X(c,'pp_tier'))} only</span>`:'')];
COL.x_ppi=['PP / item','',c=>X(c,'pp_item'),xm('pp_item')];COL.x_ppy=['PP / year','',c=>X(c,'pp_year'),xm('pp_year')];
const RM=matchMedia('(prefers-reduced-motion: reduce)');
// $0 = the record says the coverage is not included; ? = not stated / unverified. Unknown is never shown as $0.
const AMC={med:['med','emergency_medical'],mob:['mob','mobile_device'],x_cc:['cc_add_max','travel_accident'],x_rad:['rental_add_max',null],x_ppd:['pp_days','price_protection'],x_ppi:['pp_item','price_protection'],x_ppy:['pp_year','price_protection']};
const AMV=(c,k)=>{const[f,cov]=AMC[k],v=k=='med'||k=='mob'?c[f]:X(c,f);if(v!=null&&v!==0)return v;if(cov&&c.ins[cov]===0)return 0;return null};
const AMT=(c,k)=>{const v=AMV(c,k),f=AMC[k][0];if(v===0)return '<span class=z title="Not included per the record">$0</span>';if(v==null)return '<span class=q title="Not stated or unverified">—</span>';
 const tag=k=='med'||k=='mob'?'':XT(c,f);if(k=='x_ppd')return v+tag+(X(c,'pp_tier')?`<span class=t title="Only on the ${esc(X(c,'pp_tier'))} tier">${esc(X(c,'pp_tier'))} only</span>`:'');return '$'+(v>=1e6?v/1e6+'M':v.toLocaleString())+tag};
Object.keys(AMC).forEach(k=>{COL[k]=[COL[k][0],'',c=>AMV(c,k),c=>AMT(c,k)];const fl=S.filter(x=>SUBONLY.has(x.id)).flatMap(x=>x.f).find(x=>x[0]==k);if(fl)fl[2].push(['$0 (not included)',c=>AMV(c,k)===0],['? (not stated)',c=>AMV(c,k)==null])});
// ---- Wallet ----
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},LSW=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const SK='ptt.state',SV=2,NOW=()=>new Date().toISOString(),OLDK=['ptt.st','ptt.wallet','ptt.match'];let PERSIST=true;
try{localStorage.setItem('ptt.t','1');localStorage.removeItem('ptt.t')}catch(e){PERSIST=false}
const blankS=()=>({schema_version:SV,app:'PerTheTerms',app_version:D.ver||null,created_at:NOW(),updated_at:NOW(),
 wallet:{cards:[],banks:[],brokerage:[],tel:[],ins:[],points:[],services:[],spend:{groc:600,dine:300,gas:200,trav:150,bills:150,other:800},updated_at:NOW()},
 screen:{},saved_screens:[],ui:{}});
function migS(o){if(!o||typeof o!='object')return blankS();const b=blankS();o={...b,...o,wallet:{...b.wallet,...(o.wallet||{})}};delete o.matchup;/* retired Compare store */
 const fix=a=>(a||[]).map(x=>typeof x=='string'?{id:x,added_at:NOW()}:x).filter(x=>x&&C.some(c=>c.id==x.id));o.wallet.cards=fix(o.wallet.cards);['banks','brokerage','tel','ins','points','services'].forEach(k=>{if(!Array.isArray(o.wallet[k]))o.wallet[k]=[]});Object.keys(o.wallet).forEach(k=>{if(Array.isArray(o.wallet[k])&&!['cards','banks','brokerage','tel','ins','points','services','archive','history_log'].includes(k))delete o.wallet[k]});o.schema_version=SV;return o}
function loadS(){if(!PERSIST)return blankS();try{const o=JSON.parse(localStorage.getItem(SK));if(o){const id=x=>typeof x=='string'?x:x&&x.id,w=JSON.parse(localStorage.getItem('ptt.wallet')||'null'),m=JSON.parse(localStorage.getItem('ptt.match')||'null');
  /* a leftover pre-v2 key next to ptt.state used to be ignored, then deleted by saveS (data loss): merge it first */
  if(w&&Array.isArray(w.cards)){o.wallet=o.wallet||{};const h=new Set((o.wallet.cards||[]).map(id));o.wallet.cards=[...(o.wallet.cards||[]),...w.cards.filter(x=>!h.has(id(x)))]}

  return migS(o)}}catch(e){}
 const o=blankS(),g=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},w=g('ptt.wallet'),m=g('ptt.match'),t=g('ptt.st');
 if(w){o.wallet.cards=w.cards||[];if(w.spend)o.wallet.spend=w.spend}if(t)o.screen=t;
 if(w||m||t)o.migrated_from=OLDK.filter(k=>g(k)!=null);return migS(o)}
let STO=loadS();
function saveS(){const keep=(arr,ids)=>ids.map(id=>arr.find(x=>x.id==id)||{id,added_at:NOW()});
 STO.wallet.cards=keep(STO.wallet.cards,W.cards);STO.wallet.spend=W.spend;
 const{card,...r}=st;STO.screen=r;STO.updated_at=NOW();if(!PERSIST)return;
 try{localStorage.setItem(SK,JSON.stringify(STO));OLDK.forEach(k=>localStorage.removeItem(k))}catch(e){PERSIST=false;noteS()}}
function noteS(){if(PERSIST||document.getElementById('pnote'))return;const d=document.createElement('div');d.id='pnote';d.textContent="This browser isn't saving. Your wallet and settings last until you close this tab.";document.body.append(d)}
if(!PERSIST)setTimeout(noteS);const W={cards:STO.wallet.cards.map(x=>x.id),spend:{...STO.wallet.spend}};W.cards=W.cards.filter(i=>C.some(c=>c.id==i));
const WCATS=['groc','dine','deliv','gas','ev','trav','fly','hotel','portal','transit','ride','bills','util','stream','ent','drug','online','whole','memb','office','fxsp','other'];
const WPAR={fly:'trav',hotel:'trav',portal:'trav',deliv:'dine',ride:'transit',util:'bills',ev:'gas'};
const wRate=(c,k)=>c['r_'+k]!=null?c['r_'+k]:WPAR[k]&&c['r_'+WPAR[k]]!=null?c['r_'+WPAR[k]]:c.other;
const SGRP=[['Food',['groc','dine','deliv']],['Getting around',['gas','transit','ride','ev']],['Travel',['fly','hotel','trav','portal','fxsp']],['Home and bills',['bills','util','stream','memb']],['Everything else',['drug','online','ent','whole','office','other']]];
function spendHTML(){const seen=new Set(),g=SGRP.map(([n,ks])=>[n,ks.filter(k=>WCATS.includes(k))]);g.forEach(x=>x[1].forEach(k=>seen.add(k)));const left=WCATS.filter(k=>!seen.has(k));if(left.length)g[g.length-1][1].push(...left);
 return `<div class=sgrps>${g.map(([n,ks])=>{const sub=ks.reduce((t,k)=>t+(+W.spend[k]||0),0);return `<fieldset class=sgrp><legend>${n}<span class=ssub>${sub?'$'+sub.toLocaleString()+'/mo':''}</span></legend>${ks.map(k=>`<label><span>${WNAME[k]||CN[k]}</span><input class=amt type=number min=0 step=10 inputmode=numeric data-sp="${k}" value="${W.spend[k]||''}" placeholder="0" aria-label="${esc(WNAME[k]||CN[k])} monthly spend"></label>`).join('')}</fieldset>`}).join('')}</div>`}
/* v3.5.4 Monthly Spend is one store with one editor (left rail). Other views show this read-only summary and link to it. */
/* v3.5.6 Promotions: one list of current sourced promos across lines (promos.py), filtered by the profile. */
const PROMO=D.promo||[],KIDB=['0–5','6–12','13–17','18–24'];
const PCUST=()=>[...new Set(PROMO.filter(p=>p.line=='broker'||p.line=='tel').map(p=>p.inst).concat((D.bank?.accounts||[]).map(a=>a.i)))].sort();
function custSet(m='you'){const s=new Set(),P=PRF();s.m=m;W.cards.filter(i=>mine('cards',i,m)).map(i=>C[BYID0[i]]).filter(Boolean).forEach(c=>s.add(c.i.split(' ')[0].toLowerCase()));(STO.wallet.banks||[]).filter(x=>mine('banks',x.id,m)).map(x=>(D.bank?.accounts||[]).find(a=>a.id==x.id)).filter(Boolean).forEach(a=>s.add(a.i.split(' ')[0].toLowerCase()));(STO.wallet.brokerage||[]).filter(x=>x&&mine('brokerage',x.i,m)).forEach(x=>x&&x.i&&s.add(x.i.toLowerCase()));(STO.wallet.tel||[]).filter(x=>x&&mine('tel',x.i,m)).concat((STO.wallet.ins||[]).filter(x=>x&&mine('ins',x.i,m))).forEach(x=>{const n=(x.i||'').toLowerCase();if(n){s.add(n);s.add(n.split(' ')[0])}});if(m=='you')(P.cust||[]).forEach(i=>{s.add(i.toLowerCase());s.add(i.split(' ')[0].toLowerCase())});return s}
function promoElig(p,cs=custSet()){const P=PRF(),held=p.pid?W.cards.some(i=>C[BYID0[i]]?.id==p.pid&&mine('cards',i,cs.m||'you')):p.bid?(STO.wallet.banks||[]).some(x=>x.id==p.bid&&mine('banks',x.id,cs.m||'you')):false,cust=cs.has(p.ik),why=[];
 if(p.sc=='new_prod'&&held)why.push('You already hold this product; the offer is for new accounts');
 if(p.sc=='new_inst'&&cust)why.push('New clients only, and you are a '+p.inst+' customer');
 if(p.sc=='existing'&&!cust)why.push('Existing '+p.inst+' customers only');
 if(p.youth&&!P.young&&P.age!='18–24'&&!(P.kids||[]).length&&!(P.kidsN>0))why.push('Student/youth only: no student or kids in your profile');
 /* 'You' inputs (Profile): only applied when the answer is given and the record states the rule */
 {const c=p.pid&&C[BYID0[p.pid]],tx=(p.prod||'')+' '+(p.t||'')+' '+(p.cond||'');
  if(c&&c.inc&&P.inc!=null&&P.inc<c.inc&&!(c.hinc&&P.hinc!=null&&P.hinc>=c.hinc))why.push(`Income below the card's requirement ($${c.inc.toLocaleString()} personal${c.hinc?' or $'+c.hinc.toLocaleString()+' household':''})`);
  if(/\bRESP\b/.test(tx)&&!(P.kidsN>0)&&!(P.kids||[]).length)why.push('RESP offer: no kids in your profile');
  if(p.line=='broker'&&/\b(TFSA|RRSP|FHSA|RESP)\b/.test(tx)){const B=(D.bacct||[]).find(b=>b.i==p.inst),t=tx.match(/\b(TFSA|RRSP|FHSA|RESP)\b/)[1];if(B&&!B.accts.some(a=>a.t==t))why.push(p.inst+' has no '+t+' account')}
  if(/newcomer/i.test(tx)&&P.newcomer===false)why.push('Newcomers only');
  if(P.prov=='QC'&&/(excluding|except|not available (in|to residents of)|outside( of)?) Qu[eé]bec/i.test(tx))why.push('Not available in Quebec')}
 return{ok:!why.length,why}}
const PSC={new_prod:'New accounts of this product',new_inst:'New clients of the institution only',existing:'Existing clients only',any:'New and existing clients',unknown:'Client rule not stated in the filed terms'};
const PLN={cards:'Cards',bank:'Banking',broker:'Brokerage',tel:'Telecom'};
/* v3.5.8 Promotions: one big sortable, filterable table of comparable columns (schema v23 promo_terms). Fine print lives in the row expander only. */
const PCAT={cards:'Credit cards',bank:'Banks',broker:'Brokers',crypto:'Crypto',tel:'Telecom'},PBT={cash:'Cash',points:'Points',pct_match:'% match',gift:'Gift',other:'Other'};
const PCOLS=[['n','Institution / Product','l'],['cat','Category'],['v','Value ($)'],['ty','Type'],['mp','Match %'],['aum','At my AUM'],['win','Window (days)'],['exp','Expiry'],['hold','Holding (days)'],['min','Min deposit/spend'],['src','Terms']];
/* v3.5.10: numeric sort keys (never the display string) and short cell values; commentary lives in ⓘ popups. */
const BUILT=new Date((D.meta?.built||new Date().toISOString().slice(0,10))+'T12:00'),
 pDays=t=>{if(!t)return null;let m=/(\d+)\s*(day|week|month|year)/i.exec(t);if(m)return +m[1]*{day:1,week:7,month:30,year:365}[m[2].toLowerCase()];m=/(\d{4}-\d{2}-\d{2})/.exec(t);if(m){const d=Math.round((new Date(m[1]+'T12:00')-BUILT)/864e5);return d}return null},
 pMoney=t=>{const m=/\$\s*([\d,]+(?:\.\d+)?)/.exec(t||'');return m?+m[1].replace(/,/g,''):null},
 pK=n=>n>=1e6?(+(n/1e6).toFixed(1))+'M':n>=1e3?(+(n/1e3).toFixed(1))+'K':String(n),
 SHORTRW={'First-year annual fee waived':'Fee waived','First-year cash back match':'Cash back match','Free 30-day trial of paid plan':'30-day trial','0% promotional annual interest':'0% interest','0.99% introductory interest ra':'0.99% interest','Free trades':'Free trades','Rate boost':'Rate boost','New iPad':'iPad'},
 ip=(h,lab='Details')=>h?`<span class=ip tabindex=0 role=button aria-label="${lab}">ⓘ<span class=ipb role=tooltip>${h}</span></span>`:'',
 pExpK=p=>p.expiry_date?new Date(p.expiry_date+'T12:00').getTime():p.dl=='ONGOING'?8.64e15:null,
 pMinK=p=>p.match_min_cad??pMoney(p.min_deposit_or_spend),
 pVal=p=>{const rw=(p.rw||'').trim(),le=/^up to/i.test(rw),LE=le?'<i class=le title="up to">≤</i>':'',$$=n=>'$'+Math.round(n).toLocaleString();
  if(p.benefit_type=='pct_match')return{h:p.match_cap_cad?LE+$$(p.match_cap_cad):'—',tip:[p.match_cap_cad?'Cap '+$$(p.match_cap_cad):'No cap stated',p.match_pct_alt,p.match_period].filter(Boolean).map(esc).join('<br>')};
  if(p.benefit_type=='points'){const m=/^([\d,]+)\s+(.*?)\s*pts$/i.exec(rw);if(m)return{h:pK(+m[1].replace(/,/g,''))+' pts',tip:[m[2]?esc(m[2])+' points':'',p.v!=null?'≈'+$$(p.v)+' estimated value':''].filter(Boolean).join('<br>')}}
  const pc=/([\d.]+)%/.exec(rw);if(pc&&!/\$/.test(rw))return{h:LE+pc[1]+'%',tip:esc(rw)};
  const mo=pMoney(rw);if(mo!=null)return{h:LE+$$(mo)+(/\/mo/.test(rw)?'<em>/mo</em>':p.b=='on'?'<em>/yr</em>':''),tip:/^(up to )?\$[\d,]+( cash)?$/i.test(rw)?'':esc(rw)};
  if(p.v!=null)return{h:$$(p.v),tip:esc(rw)};
  if(SHORTRW[rw])return{h:esc(SHORTRW[rw]),tip:''};
  return{h:'<span class=mute>—</span>',tip:rw&&!/not stated/i.test(rw)?esc(rw):''}};
/* v3.5.9: only offers verified active on the live page show by default and count in totals; % match value at the profile's investable assets */
const PACT=p=>p.offer_status=='active',PTY=['all','pct_match','cash','points','gift'],AUM=()=>+PRF().aum||0,
 pAum=p=>{if(p.benefit_type!='pct_match'||p.match_pct==null||!AUM())return null;const a=AUM();if(p.match_min_cad&&a<p.match_min_cad)return 0;const v=a*p.match_pct/100;return p.match_cap_cad?Math.min(v,p.match_cap_cad):v},
 pHi=p=>p.benefit_type=='pct_match'&&p.match_pct>=0.5&&p.match_pct<=3;
const fmtD=d=>{if(!d)return null;const x=new Date(d+'T12:00');return isNaN(x)?d:x.toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})};
const pSortVal=(x,k)=>{const p=x.p;return{n:(p.inst+' '+p.prod).toLowerCase(),cat:PCAT[p.line],v:p.v??(p.benefit_type=='pct_match'?p.match_cap_cad:pMoney(p.rw)),ty:PBT[p.benefit_type]||'',win:p.window_days??pDays(p.win),exp:pExpK(p),hold:p.holding_days??pDays(p.holding_terms_short),min:pMinK(p),src:p.archived_date,mp:p.match_pct,aum:pAum(p)}[k]};
function renderPromos(line){const cs=custSet(),rows=PROMO.filter(p=>p.line==line).map(p=>({p,e:promoElig(p,cs)})),ok=rows.filter(x=>x.e.ok&&PACT(x.p)),bestOf=b=>{const L={};ok.forEach(x=>{if(x.p.v==null||x.p.b!=b)return;const l=x.p.line;if(!L[l]||x.p.v>L[l].p.v)L[l]=x});return Object.values(L)},bfy=bestOf('fy'),bon=bestOf('on'),sm=a=>a.reduce((t,x)=>t+x.p.v,0),fy=sm(ok.filter(x=>x.p.v!=null&&x.p.b=='fy')),on=sm(ok.filter(x=>x.p.v!=null&&x.p.b=='on')),hid=rows.filter(x=>PACT(x.p)&&!x.e.ok).length,nInact=rows.filter(x=>!PACT(x.p)).length,ty=st.pty||'all';
 const so=st.psort||{k:'v',d:-1},elig=st.pelig!==false;
 let R=rows.filter(x=>(!elig||x.e.ok)&&(st.pend||PACT(x.p))&&(ty=='all'||x.p.benefit_type==ty));
 const rk=(x,K)=>K!=null?0:so.k=='v'&&!/mute/.test(pVal(x.p).h)?1:2;/* v3.5.10: numbers, then text-only values (e.g. 'Fee waived'), then dashes; both directions */
 R.sort((a,b)=>{const A=pSortVal(a,so.k),B=pSortVal(b,so.k),ra=rk(a,A),rb=rk(b,B);if(ra!=rb)return ra-rb;if(A==null||B==null)return 0;return (A<B?-1:A>B?1:0)*so.d});
 const D='<span class=mute>—</span>',$$=n=>'$'+Math.round(n).toLocaleString();
 const det=(p,e)=>{const it=[['Offer',p.t],['Conditions',p.cond],['Minimum',p.min_deposit_or_spend],['Who',PSC[p.sc]],['Cooldown',p.cd?`${p.cd} months`:null],['Value basis',p.vm],['Checked',p.verified_date?`${PACT(p)?'Active':p.offer_status=='ended'?'Ended':'Unverified'} on ${fmtD(p.verified_date)}`:null],['Evidence',p.status_note],['Ruled out',e.ok?null:e.why.join('; ')]].filter(x=>x[1]);
  return `<dl class=pdl>${it.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`};
 const row=({p,e})=>{const op=st.popen==p.k,tag=p.source_tag||'CITED',V=pVal(p),wd=p.window_days??pDays(p.win),hd=p.holding_days??pDays(p.holding_terms_short),mk=pMinK(p),au=pAum(p),
   tw=p.win&&!/^\d+ days$/.test(p.win)?esc(p.win.replace(/(\d{4}-\d{2}-\d{2})/,m=>fmtD(m))):'',th2=p.holding_terms_short&&!/^\d+ days$/.test(p.holding_terms_short)?esc(p.holding_terms_short.replace(/(\d{4}-\d{2}-\d{2})/,m=>fmtD(m))):'',
   mw=(p.min_deposit_or_spend||'').match(/spend|deposit/i)?.[0]?.toLowerCase()||'',
   termTip=[p.archived_date?'Archived '+esc(fmtD(p.archived_date)):'',p.link_status=='ok'&&p.terms_url?`<a href="${esc(p.terms_url.split(' (')[0])}" target=_blank rel=noopener>Live page ↗</a>`:'',p.verified_date?`${PACT(p)?'Active':p.offer_status=='ended'?'Ended':'Unverified'} on ${esc(fmtD(p.verified_date))}`:'',p.status_note?esc(p.status_note):''].filter(Boolean).join('<br>');
  return `<tr class="prow${e.ok?'':' pdq'}${PACT(p)?'':' pinact'}${pHi(p)?' phi':''}${op?' open':''}" data-pk="${p.k}" tabindex=0 aria-expanded=${op}><td class=l><span class=pcar aria-hidden=true>${op?'▾':'▸'}</span><b>${esc(p.inst)}</b><small>${esc(p.prod)}${(p.pid&&W.cards.some(i=>C[BYID0[i]]?.id==p.pid))||(p.bid&&(STO.wallet.banks||[]).some(x=>x.id==p.bid))?' <i class=phld>✓ in wallet</i>':''}</small></td><td>${PCAT[p.line]}</td><td class=pv><b>${V.h}</b>${ip(V.tip)}</td><td><span class="pty t-${p.benefit_type}">${PBT[p.benefit_type]||'Other'}</span></td><td>${p.match_pct!=null?`<b>${p.match_pct}%</b>`:D}</td><td class=paum>${au!=null?`<b>${$$(au)}</b>${ip(esc(p.match_period||''))}`:D}</td><td>${wd!=null?wd:p.win?'':D}${wd==null&&p.win?esc(p.win):''}${ip(tw)}</td><td>${p.expiry_date?esc(fmtD(p.expiry_date)):p.dl=='ONGOING'?'Ongoing':D}</td><td>${hd!=null?hd:D}${ip(th2)}</td><td>${mk!=null?$$(mk)+(mw?` <small class=ilw>${mw}</small>`:''):D}</td><td class=pterm>${p.terms_pdf?`<button type=button class=ptbtn data-pdf="${esc(p.terms_pdf)}" data-pdft="${esc(p.inst+' · '+p.prod)}" data-pdfd="${esc(p.archived_date)}">Terms</button>`:D}${ip(termTip,'Terms details')}${PACT(p)?'':`<small class=pst>${p.offer_status=='ended'?'Ended':'Unverified'}</small>`}<small class="ptag g-${tag}">${tag}</small></td></tr>${op?`<tr class=pdet><td colspan=${PCOLS.length}>${det(p,e)}</td></tr>`:''}`};
 const th=([k,n,c])=>`<th class="${c||''} ps${so.k==k?' on':''}" data-psort=${k} aria-sort=${so.k==k?(so.d>0?'ascending':'descending'):'none'}><button type=button>${n}<span class=sar aria-hidden=true>${so.k==k?(so.d>0?'▲':'▼'):'↕'}</span></button></th>`;
 const picks=bfy.concat(bon).map(x=>`<li><span>${PCAT[x.p.line]}</span>${esc(x.p.inst)}<b>${$$(x.p.v)}${x.p.b=='on'?'/yr':''}</b></li>`).join('');
 $('#view').innerHTML=`<label class=pelig><input type=checkbox data-pelig ${elig?'checked':''}> Only show offers I’m eligible for</label>
 <div class="hero phero"><div class=ptot><small>Best move per category</small><b>${$$(sm(bfy))} <em>first year</em></b><b>${$$(sm(bon))}/yr <em>ongoing</em></b>${picks?`<details class=ppk><summary>Picks</summary><ul>${picks}</ul></details>`:''}</div><div class=ptot><small>Everything you're eligible for</small><b>${$$(fy)} <em>first year</em></b><b>${$$(on)}/yr <em>ongoing</em></b></div><div><small>Eligible</small><b>${ok.length}</b></div><div><small>Ruled out</small><b>${hid}</b></div></div>
 <div class=pbar><span class=plab>Type</span>${PTY.map(k=>`<button type=button class="pchip2${ty==k?' on':''}" data-pty=${k} aria-pressed=${ty==k}>${k=='all'?'All':PBT[k]}<span>${rows.filter(x=>(k=='all'||x.p.benefit_type==k)&&(!elig||x.e.ok)&&(st.pend||PACT(x.p))).length}</span></button>`).join('')}<button type=button class="pchip2${so.k=='mp'?' on':''}" data-psort=mp>Sort by match %</button><label class=pend><input type=checkbox data-pend ${st.pend?'checked':''}> Show ended/unverified (${nInact})</label></div>
 <div class="tw ptw"><table class="vt ptab2"><thead><tr>${PCOLS.map(th).join('')}</tr></thead><tbody>${R.map(row).join('')||`<tr><td colspan=${PCOLS.length} class=mute>No offers</td></tr>`}</tbody></table></div>`}
const SPEND_LABEL='Monthly Spend';
function spendSum(){const seen=new Set(),g=SGRP.map(([n,ks])=>[n,ks.filter(k=>WCATS.includes(k))]);g.forEach(x=>x[1].forEach(k=>seen.add(k)));const left=WCATS.filter(k=>!seen.has(k));if(left.length)g[g.length-1][1].push(...left);
 const tot=WCATS.reduce((t,k)=>t+(+W.spend[k]||0),0);
 return `<div class=ssum>${g.map(([n,ks])=>{const sub=ks.reduce((t,k)=>t+(+W.spend[k]||0),0);return `<div><span>${n}</span><b>$${sub.toLocaleString()}</b></div>`}).join('')}<div class=stot><span>Total</span><b>$${tot.toLocaleString()}/mo</b></div></div><button type=button class="btn sedit" data-pgo=spend>Edit ${SPEND_LABEL} →</button>`}
const WNAME={fxsp:'Foreign currency spend',trav:'Travel (other)'};
/* v3.4.1 broker tier: card fee after tier-linked waivers (edges WAIVES from a STATUS node; only CONFIRMED CAD/yr edges are exported) */
const BTIER=i=>((STO.wallet.brokerage||[]).find(x=>x&&x.i==i)||{}).tier||null;
const TWV=c=>(D.tierw||[]).find(w=>w.card==c.id&&w.tiers.includes(BTIER(w.inst)));
/* v3.7.3 rules table (Docs/rules-schema.md, D.cmod): one evaluator, no card-specific code. addl = additional cardholders per held card (Profile, captured at add time) */
const ADDL=id=>{const n=+((STO.wallet.addl||{})[id]||0);return W.cards.includes(id)?n:0};
const RULEOP={'>=':(a,b)=>a>=b,'>':(a,b)=>a>b,'<=':(a,b)=>a<=b,'<':(a,b)=>a<b,'==':(a,b)=>a==b,'!=':(a,b)=>a!=b,in:(a,b)=>Array.isArray(b)&&b.includes(a),has:(a,b)=>Array.isArray(a)&&a.includes(b)};
const ruleOn=(r,cx)=>(r.when||[]).every(w=>cx[w.f]!=null&&RULEOP[w.op]&&RULEOP[w.op](cx[w.f],w.v));
const cmods=(c,n=ADDL(c.id))=>{const cx={...PRF(),addl_cardholders:n,owner:ownOf('cards',c.id),tier:typeof provTier=='function'?provTier(c.i):null};return (D.cmod||[]).filter(r=>r.card==c.id&&ruleOn(r,cx))};
const earnMul=(c,k,n)=>cmods(c,n).filter(r=>r.effect=='earn_multiplier'&&(r.scope=='all'||(r.scope||[]).includes(k))).reduce((m,r)=>m*r.value,1);
const effFee0=c=>c.fee==null?null:TWV(c)?Math.max(0,c.fee-TWV(c).amt):c.fee;
/* annual cost = fee (after waivers) + additional cardholders × the card's additional-card fee + fee_add rules */
const effFee=c=>{const f=effFee0(c);if(f==null)return null;const n=ADDL(c.id);/* negative fee_add (tier waivers) can't take the card fee below $0, and doesn't stack with a waiver already counted in TWV */
 const adj=cmods(c,n).filter(r=>r.effect=='fee_add').reduce((t,r)=>t+r.value,0);return Math.max(0,f+Math.min(0,adj)*(f>0?1:0))+Math.max(0,adj)+(n?(cmods(c,n).some(r=>r.effect=='addl_fee_first_only')?1:n)*(c.add||0):0)};
/* first-year additional-cardholder value from rules: AU bonus points (in their date window) at the card's cpp + first-year AU fee rebates. The ongoing AU fee is already in effFee. */
const fyAU=c=>{const n=ADDL(c.id);if(!n)return 0;const today=new Date().toISOString().slice(0,10),M=cmods(c,n);let v=0;
 M.filter(r=>r.effect=='welcome_bonus_extra'&&(!r.valid_from||today>=r.valid_from)&&(!r.valid_to||today<=r.valid_to)).forEach(r=>v+=(r.points||0)*(c.cpp||0)/100);
 M.filter(r=>r.effect=='addl_fee_rebate_y1').forEach(r=>{const paid=M.some(x=>x.effect=='addl_fee_first_only')?1:n;v+=Math.min(paid,r.count||1)*(c.add||0)});return v};
const boostNote=c=>cmods(c).filter(r=>r.effect=='earn_multiplier').map(r=>`Boosted: +${Math.round((r.value-1)*100)}% with an additional cardholder (${r.tag=='CITED'?'cited':'estimate'})`).join('; ');
/* pytRew: optimized rewards/yr for a set of cards. Each category's annual spend is routed to the best rate first,
   respecting per-category caps (overflow falls to the next best rate, including each card's base "other" rate). */
function pytRew(cs,sp=W.spend){const rows=[];let rew=0,tot=0;
 for(const k of WCATS){const m=+sp[k]||0;if(!m)continue;let left=m*12;tot+=left;const cand=[];
  cs.forEach(c=>{const fx=k=='fxsp'?(c.fx??0):0,pk=c['r_'+k]!=null?k:WPAR[k]&&c['r_'+WPAR[k]]!=null?WPAR[k]:null;if(pk)cand.push({c,r:c['r_'+pk]*earnMul(c,pk)-fx,cap:c.caps?.[pk]??Infinity});if(c.other!=null)cand.push({c,r:c.other*earnMul(c,'other')-fx,cap:Infinity})});
  cand.sort((a,b)=>b.r-a.r);const use=[];
  for(const x of cand){if(left<=0)break;const amt=Math.min(left,x.cap);if(amt<=0)continue;use.push({...x,amt});left-=amt}
  const r=use.reduce((s,x)=>s+x.amt*Math.max(x.r,0)/100,0);rew+=r;rows.push({k,m,use,r})}
 return{rows,rew,sp:tot}}
/* v3.5.0 card perks (card_perk_facts). A perk counts ONLY when the profile meets its conditions and a sourced value exists. Never mixed into Rewards*. */
const PRF=()=>STO.wallet.profile||(STO.wallet.profile={});
const PKT={lounge_passes:'Lounge visits',lounge_access:'Lounge access',nexus_global_entry_credit:'NEXUS / Global Entry credit',free_checked_bags:'Free checked bag',companion_voucher:'Companion voucher',travel_credit:'Travel credit',dining_credit:'Dining credit',lifestyle_credit:'Lifestyle credit',statement_credit:'Statement credit',subscription:'Subscription',birthday_bonus:'Birthday bonus',authorized_user_bonus:'Authorized-user bonus',anniversary_bonus:'Anniversary bonus',other:'Perk'};
function cardEarn(c,O){let e=0;for(const r of O.rows)for(const x of r.use)if(x.c===c)e+=x.amt*Math.max(x.r,0)/100;return e}
function perkOf(cs,O,yr1){const P=PRF(),items=[];let tot=0;O=O||pytRew(cs);
 for(const c of cs)for(const f of (c.pf||[])){const miss=[f.au&&!P.au?'adding an authorized user':null,f.tr&&!(+P.trips>0)?'travelling':null,f.nx&&!P.nexus?'applying for NEXUS / Global Entry':null].filter(Boolean);
  let v=null,why='';
  if(f.u=='credit'&&f.uv!=null&&f.cur=='CAD'){if(f.fr=='first_year'&&!yr1)why='first year only';else v=f.uv*(f.q||1)/(f.fr=='per_48_months'?4:1)}
  else if(f.u=='pct_of_annual_earn'&&f.q!=null){const e=cardEarn(c,O);v=e*f.q/100;if(f.cap!=null&&c.cpp!=null)v=Math.min(v,f.cap*c.cpp/100)}
  else if(f.u=='points'&&f.q!=null&&f.vb=='ESTIMATE'&&c.cpp!=null)v=f.q*c.cpp/100;
  else why=f.uv!=null&&f.cur&&f.cur!='CAD'?'value stated in '+f.cur+', not converted':'no sourced value';
  const counted=v!=null&&!miss.length&&v>0;if(counted)tot+=v;
  items.push({c,f,v,counted,why:miss.length?'needs '+miss.join(' and '):why})}
 return{tot,items}}
const pkTip=P=>{const on=P.items.filter(x=>x.counted),off=P.items.filter(x=>!x.counted);return (on.length?'Counted: '+on.map(x=>`${x.f.ti} (${x.c.n}) $${Math.round(x.v)}/yr${x.f.vb=='ESTIMATE'?' (est.)':''}`).join('; ')+'. ':'')+(off.length?'Listed, not counted: '+off.slice(0,8).map(x=>`${x.f.ti} (${x.why})`).join('; ')+(off.length>8?'; and '+(off.length-8)+' more':'')+'.':'')||'No perks on record.'};
const PKL=(P,lab='Perks')=>`<span class=rwl tabindex=0 role=button aria-haspopup=dialog data-trc=1 data-tfull="${esc(pkTip(P))}">${lab}</span>`;
function profHTML(){const P=PRF();return `<section class=pq aria-labelledby=pqh><h3 id=pqh>Perks that fit you <span class=mute>(optional)</span></h3><p class=omute>Answer only what you like. A card perk is counted only when your answers meet its conditions; otherwise it is listed, not counted.</p>
 <label class=pqr><input type=checkbox data-prf=au ${P.au?'checked':''}> Adding an authorized user</label><h4>Other institutions you're a customer of</h4><p class=mute>Used by Promotions for new-client-only and existing-client-only rules. Cards and bank accounts in your wallets count automatically.</p><div class=svpick>${PCUST().map(i=>`<label class="chip subs-c${(P.cust||[]).includes(i)?' on':''}"><input type=checkbox data-pcust="${esc(i)}" ${(P.cust||[]).includes(i)?'checked':''}>${esc(i)}</label>`).join('')}</div>
 <label class=pqr>Trips by air a year <input class=amt type=number min=0 step=1 inputmode=numeric data-prf=trips value="${P.trips||''}" placeholder="0"></label>
 <label class=pqr><input type=checkbox data-prf=nexus ${P.nexus?'checked':''}> Applying for or renewing NEXUS / Global Entry</label>
 <h4>Banking</h4><label class=pqr><input type=checkbox data-prf=dd ${P.dd?'checked':''}> Direct deposit of $2,000+ a month</label><label class=pqr>Lowest daily balance you keep <input class=amt type=number min=0 step=500 inputmode=numeric data-prf=bal value="${P.bal||''}" placeholder="0"></label>
 <label class=pqr>Other products at your bank (mortgage, loan, investments) <input class=amt type=number min=0 max=5 step=1 inputmode=numeric data-prf=np value="${P.np||''}" placeholder="0"></label></section>`}
function walletCalc(){const cs=W.cards.map(i=>C[BYID0[i]]),O=pytRew(cs);
 const fees=cs.reduce((s,c)=>s+(effFee(c)||0),0),unk=cs.filter(c=>c.fee==null),P=perkOf(cs,O,false);return{cs,rows:O.rows,rew:O.rew,sp:O.sp,fees,unk,P,pk:P.tot,net:O.rew-fees+P.tot}}
const $$=v=>'$'+Math.round(v).toLocaleString();
const LIVE=c=>c&&c.st!='discontinued';
const picker=(id,ph)=>`<input class=pick list="${id}" placeholder="${ph}" data-pick="${id}"><datalist id="${id}">${C.filter(LIVE).map(c=>`<option value="${esc(c.n)}">`).join('')}</datalist>`;
const icol=c=>c.col||['#334155','#0f172a'];
const ctile=o=>`<div class="ctile${o.on?' on':''}" role=button tabindex=0 ${o.attrs} style="background:linear-gradient(135deg,${o.a},${o.b})">${IMGB&&o.img?`<img class=tart src="${IMGB}${o.img}" alt="${esc(o.alt||'')}" loading=lazy>`:''}${o.rm?`<button class=trm ${o.rm}>×</button>`:''}<span class=ti>${esc(o.top)}</span><span class=tn>${esc(o.name)}</span><span class=tchip></span><span class=tf>${esc(o.foot)}</span><span class=tw>${esc(o.mark||'')}</span></div>`;
const FCOL=D.fcol||{};
function walletIns(cs){return INS.map(([k,l])=>{const has=cs.filter(c=>c.ins[k]===1),st=has.length?1:cs.length&&cs.every(c=>c.ins[k]===0)?0:null;
 let best=null;has.forEach(c=>{const v=(c.insr||{})[k]?.[1];if(v!=null&&(!best||v>best.v))best={v,c}});return{k,l,st,has,best}})}
const COVI={"emergency_medical": "<path d='M12 6v12M6 12h12'/>", "trip_cancellation": "<path d='M3 17h18M6 14l3-8h2l1 5 5-2c1-.4 2.5.2 2.5 1.2 0 .6-.5 1-1.2 1.2L7 16'/><path d='M15 3l6 6M21 3l-6 6'/>", "trip_interruption": "<path d='M2 16h20M5 13l2.5-6h2l1 4 5-1.8c1.2-.4 2.5.2 2.5 1.2s-.6 1.2-1.4 1.4L6 15'/><path d='M12 19v2M9 19v2M15 19v2'/>", "flight_delay": "<circle cx='12' cy='12' r='7.5'/><path d='M12 8v4l3 2'/>", "baggage": "<rect x='5' y='8' width='14' height='11' rx='2'/><path d='M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M9 12v3M15 12v3'/>", "hotel_burglary": "<path d='M4 20V9l8-5 8 5v11'/><rect x='9' y='12' width='6' height='8' rx='1'/><circle cx='13.2' cy='16' r='.6'/>", "rental_car_cdw": "<path d='M4 15l1.5-5A2 2 0 0 1 7.4 8.5h9.2a2 2 0 0 1 1.9 1.5L20 15v3H4z'/><circle cx='8' cy='18' r='1.5'/><circle cx='16' cy='18' r='1.5'/><path d='M4 15h16'/>", "purchase_protection": "<path d='M6 8h12l-1 12H7z'/><path d='M9 8V6.5a3 3 0 0 1 6 0V8'/><path d='M10 14l1.6 1.6L15 12'/>", "extended_warranty": "<path d='M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z'/><path d='M9 12l2 2 4-4'/>", "mobile_device": "<rect x='7' y='3' width='10' height='18' rx='2'/><path d='M11 17.5h2'/>", "price_protection": "<path d='M20 12l-8 8-8-8V4h8z'/><circle cx='8' cy='8' r='1.4'/><path d='M11 13l4-4'/>", "travel_accident": "<path d='M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z'/><path d='M8 12h2l1-2 2 4 1-2h2'/>", "roadside": "<path d='M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5L15 12l-3-3z'/>"};
const covI=(k,l,on)=>`<span class="covi${on===1?' on':on===0?' off':' unk'}" role=img aria-label="${esc(l)}: ${on===1?'covered by a wallet card':on===0?'not covered':'unconfirmed'}" title="${esc(l)}: ${on===1?'covered by a wallet card':on===0?'not covered by any wallet card':'unconfirmed'}"><svg viewBox="0 0 24 24" aria-hidden=true>${COVI[k]||'<circle cx="12" cy="12" r="6"/>'}</svg></span>`;
function renderCardsFolder(){const R=walletCalc(),cs=R.cs,IN=walletIns(cs),gaps=IN.filter(x=>x.st!==1),pb=cs.filter(c=>c.ptt&&c.ptt.v!=null).sort((a,b)=>b.ptt.v-a.ptt.v)[0];
 const perks=[...new Set(cs.flatMap(c=>[...(c.credits||[]),...(c.perks||[])]))];
 const tile=c=>{const[a,b]=icol(c);return ctile({a,b,img:'cards/'+c.id+'.svg',alt:'PerTheTerms mock card art for '+c.n+' (placeholder, not the issuer design)',top:c.i,name:c.n,foot:(LIVE(c)?'':'No longer offered · ')+(c.fee==null?(c.feet||'Fee —'):effFee(c)==0&&c.fee>0?'✓ Fee waived':'$'+c.fee+'/yr'),mark:(c.nw||'').toUpperCase(),attrs:`data-wtile="${C.indexOf(c)}" aria-label="${esc(c.n)} details"`})};
 $('#view').innerHTML=`<div class=vhead><h2>Wallet · Credit</h2></div>
 <div class=wlay><div class=wmain>
 <div class=hero><div><span>Annual cost</span><b>${$$(R.fees)}${R.unk.length?' <span class=q title="Fee not numeric for '+R.unk.length+' card(s)">—</span>':''}</b></div><div><span>${RWL}</span><b>${$$(R.rew)}</b>${R.P.items.length?`<small class=hsub>+ ${PKL(R.P)} ${$$(R.pk)}</small>`:''}</div><div><span>Net value</span><b class="${R.net<0?'neg':''}">${R.net<0?'−':''}${$$(Math.abs(R.net))}</b></div><div><span>Coverages</span><b>${IN.filter(x=>x.st===1).length}<span class=mute>/${INS.length}</span></b></div><div><span>Best PTT Score</span><b>${pb?'$'+Math.round(pb.ptt.v)+(pb.ptt.u?'*':''):'—'}</b></div></div>
 <p class=mute style="font-size:12.5px;margin:6px 0 0">* Rewards are optimized per category. Assumes you always use the best card for each category; most people don’t, so treat it as a ceiling.</p>
  <h3>Cards</h3><table class=vt><tr><th class=l>Card</th><th>Cost</th><th>Earn / year</th><th>Net</th></tr>${cs.map(c=>{const e=R.rows.reduce((t,r)=>t+r.use.filter(x=>x.c===c).reduce((u,x)=>u+x.amt*Math.max(x.r,0)/100,0),0),f=c.fee||0;return`<tr><td class=l>${esc(c.n)}</td><td>${c.fee==null?'<span class=q>—</span>':$$(f)}</td><td>${$$(e)}</td><td class="${e-f<0?'neg':''}">${e-f<0?'−':''}${$$(Math.abs(e-f))}</td></tr>`}).join('')}${cs.length?`<tr class=tot><th class=l>Total</th><th>${$$(R.fees)}</th><th>${$$(R.rew)}</th><th class="${R.net<0?'neg':''}">${R.net<0?'−':''}${$$(Math.abs(R.net))}</th></tr>`:'<tr><td colspan=4 class=empty>No cards yet. Add one on the right.</td></tr>'}</table>
 <h3>Best card per category</h3><table class=vt><tr><th class=l>Category</th><th>Monthly</th><th class=l>Card</th><th>Return</th><th>${RWL}</th></tr>${R.rows.map(r=>`<tr><td class=l>${WNAME[r.k]||CN[r.k]}</td><td>${$$(r.m)}</td><td class=l>${r.use.map(x=>esc(x.c.n)+(r.use.length>1?' <span class=mute>('+$$(x.amt)+'/yr)</span>':'')).join('<br>')||'<span class=u>—</span>'}</td><td>${r.use.map(x=>x.r.toFixed(2)+'%').join('<br>')||'—'}</td><td>${$$(r.r)}</td></tr>`).join('')||'<tr><td colspan=5 class=empty>Enter monthly spend below.</td></tr>'}</table>
 <h3>Combined insurance</h3><table class=vt><tr><th class=l>Coverage</th><th></th><th class=l>From</th><th>Best limit</th></tr>${IN.map(x=>`<tr class=covr><td class=l><span class=covl>${covI(x.k,x.l,x.st)}<span>${x.l}</span></span></td><td>${yn(x.st)}</td><td class=l>${x.has.map(c=>esc(c.n)).join(', ')||'<span class=mute>—</span>'}</td><td>${x.best?'$'+x.best.v.toLocaleString():'<span class=mute>—</span>'}</td></tr>`).join('')}</table>
 ${cs.length&&gaps.length?`<p class=gaps><b>Gaps:</b> ${gaps.map(x=>`${x.l} ${yn(x.st)}`).join(' · ')}</p>`:''}
 <h3>PTT Score by card</h3><table class=vt>${cs.map(c=>`<tr><td class=l>${esc(c.n)}</td><td>${c.ptt&&c.ptt.v!=null?'$'+Math.round(c.ptt.v)+(c.ptt.u?'*':'')+'/yr':'—'}</td></tr>`).join('')||'<tr><td class=empty>No cards yet.</td></tr>'}</table>
 <h3>Perks &amp; credits</h3>${perks.length?`<ul class=wperk>${perks.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:'<p class=mute>None listed.</p>'}
 <h3>${SPEND_LABEL}</h3>${spendSum()}
 </div><aside class=wside><h3>Your cards <span class=mute>(${cs.length})</span></h3><div class=tiles>${cs.map(tile).join('')||'<div class=wempty><span class=wei aria-hidden=true>＋</span><b>Start your wallet</b><p>Add the cards you hold in Wallet. Everything stays on this device.</p></div>'}</div>${pgoLink('cards','Add or remove cards in Wallet ›')}${waivNote(cs)}${connHTML()}${offersHTML()}</aside></div>`}
/* v3.4.0 My Offers: client-side move evaluator. Never feeds any ranking. */
const RWL=`<span class=rwl tabindex=0 role=button aria-haspopup=dialog data-trc=1 data-tfull="Optimized per category. Assumes you always use the best card for each category; most people don’t, so treat it as a ceiling.">Rewards*</span>`;
const OFQ=()=>(D.bank&&D.bank.accounts)||[];
function bankFees(cs){/* annual bank fees after any product-count rebate (conditional_fee_rules, new enrolments) */
 const hb=(STO.wallet.banks||[]).map(x=>OFQ().find(a=>a.id==x.id)).filter(Boolean);let tot=0;const reb=[];
 for(const a of hb){const base=(a.fee||0)*12;let amt=0,rl=null;
  const rs=(a.rules||[]).filter(r=>r.t=='PRODUCT_COUNT_REBATE'&&r.new==1);
  if(rs.length){const n=(cs.some(c=>c.i==a.i)?1:0)+((STO.wallet.brokerage||[]).some(x=>x&&x.i==a.i)?1:0);
   rl=rs.find(r=>(r.lo==null||n>=r.lo)&&(r.hi==null||n<=r.hi));if(rl)amt=Math.min(rl.amt||0,a.fee||0)*12}
  tot+=base-amt;reb.push({a,amt,rl})}
 return{tot,reb}}
function netOf(cs){const O=pytRew(cs),B=bankFees(cs),f=cs.reduce((t,c)=>t+(effFee(c)||0),0),P=perkOf(cs,O,false);return{net:O.rew-f-B.tot+P.tot,O,B,f,P}}
const OCAT=k=>(WNAME[k]||CN[k]||k).toLowerCase();
function whyOf(base,res,move){/* biggest per-category reward change, plus fee and rebate effects */
 const bm={};base.O.rows.forEach(r=>bm[r.k]=r);let best=null;
 res.O.rows.forEach(r=>{const b=bm[r.k],d=r.r-(b?b.r:0);if(!best||Math.abs(d)>Math.abs(best.d))best={k:r.k,d,r,b}});
 const rt=r=>r&&r.use[0]?r.use[0].r.toFixed(r.use[0].r%1?1:0)+'%':'0%';
 const pd=res.P.tot-base.P.tot,pk=Math.abs(pd)>=1?`; perks ${pd>0?'+':'−'}${$$(Math.abs(pd))}/yr (${(pd>0?res:base).P.items.filter(x=>x.counted).map(x=>x.f.ti).slice(0,2).join(', ')})`:'';
 const rb0=res.B.tot<base.B.tot-0.5?` and cuts bank fees ${$$(base.B.tot-res.B.tot)}/yr (product-count rebate)`:res.B.tot>base.B.tot+0.5?`; bank rebate drops ${$$(res.B.tot-base.B.tot)}/yr`:'',rb=rb0+pk;
 if(move.t=='close'){const lost=base.O.rew-res.O.rew;return `Saves the ${$$(effFee(move.x)||0)} fee; your other cards cover its spend and you lose only ${$$(lost)}/yr in rewards${rb}.`}
 const diffs=res.O.rows.map(r=>{const b=bm[r.k];return{k:r.k,d:r.r-(b?b.r:0),r,b}}).filter(x=>x.d>0.5).sort((a,b)=>b.d-a.d);
 const cap=t=>t[0].toUpperCase()+t.slice(1),fd=res.f-base.f;
 if(diffs.length){const top=diffs.slice(0,2).map(x=>`${OCAT(x.k)} ${rt(x.r)} vs ${rt(x.b)} (+${$$(x.d)})`).join('; ');
  return `${cap(top)}${diffs.length>2?` and ${diffs.length-2} more categor${diffs.length-2>1?'ies':'y'}`:''}: +${$$(res.O.rew-base.O.rew)}/yr rewards${Math.abs(fd)>=1?`, ${fd>0?'+':'−'}${$$(Math.abs(fd))} fees`:''}${rb}.`}
 return `Lower fees: ${$$(base.f-res.f)}/yr less for about the same rewards${rb}.`}
function offers(){const held=W.cards.map(i=>C[BYID0[i]]).filter(Boolean);if(!Object.values(W.spend).some(v=>+v>0))return{moves:[],base:null};
 const base=netOf(held),hs=new Set(held.map(c=>c.id)),moves=[];
 /* pruning: an upper bound on what card y can add = sum over categories of spend*(y's rate − best held rate)+ − fee.
    Only the 24 best-bounded candidates are evaluated exactly. */
 const hb={};base.O.rows.forEach(r=>hb[r.k]=r.use[0]?r.use[0].r:0);
 const pool=C.filter(c=>!hs.has(c.id)&&c.st!='discontinued'&&c.fee!=null).map(c=>{let u=0;for(const k of WCATS){const m=+W.spend[k]||0;if(!m)continue;const r=Math.max(wRate(c,k)??0,c.other??0)-(k=='fxsp'?(c.fx??0):0);u+=m*12*Math.max(r-(hb[k]||0),0)/100}return{c,u:u-effFee(c)+(c.pf?perkOf([c],null,false).tot:0)}}).sort((a,b)=>b.u-a.u).slice(0,24).map(x=>x.c);
 const add=(t,res,o)=>{const g=res.net-base.net;if(g>0.5)moves.push({t,g,res,...o})};
 for(const y of pool)add('add',netOf([...held,y]),{y});
 for(const x of held){if(x.fee==null)continue;const rest=held.filter(c=>c!==x);add('close',netOf(rest),{x});
  for(const y of pool.slice(0,12))add('swap',netOf([...rest,y]),{x,y})}
 moves.sort((a,b)=>b.g-a.g);const seen=new Set(),top=[];
 for(const m of moves){const key=m.t+(m.y?m.y.id:'')+(m.x?m.x.id:'');if(seen.has(key))continue;seen.add(key);m.why=whyOf(base,m.res,m);top.push(m);if(top.length==3)break}
 return{moves:top,base}}
/* v3.5.0 Profile = single source of truth for institutions, products, tiers and perk conditions (STO.wallet).
   Sections only consume derived effects (effFee via TWV, bankFees, perkOf). */
const profLink=t=>`<button type=button class="lnk plink" data-s=profile>${t}</button>`;
function waivNote(cs){const w=cs.filter(c=>TWV(c));return `<div class=bkr><h3>From your profile</h3>${w.length?`<ul class=bkp>${w.map(c=>{const x=TWV(c);return `<li><b>${esc(c.n)}</b>: $${c.fee} fee ${effFee(c)==0?'waived':'reduced to $'+effFee(c)} via your ${esc(x.inst)} ${esc(BTIER(x.inst))} tier <span class=ev>${esc(x.ev)}</span></li>`}).join('')}</ul>`:''}<p class=omute>Tiers, bundles and perk conditions are set once in your ${profLink('Profile')} and feed every section.</p></div>`}
/* v3.5.2 sections without a full build yet share the Wallet skeleton (hero row + main + aside). Services is derived (ARCHITECTURE §22). */
const SUBS=D.subs||[],SUBSBY={};SUBS.forEach(s=>s.rows.forEach(r=>{if(r.pid)(SUBSBY[r.pid]=SUBSBY[r.pid]||new Set).add(s.k)}));
/* Brokers tab + wallet Brokers folder: D.bacct (account types offered, account fee, tags) and D.promo broker rows */
const BHELD=b=>(STO.wallet.brokerage||[]).filter(x=>x&&(x.broker==b.i||String(x.i).startsWith(b.i)));
const BPROMO=b=>(D.promo||[]).filter(p=>p.line=='broker'&&(p.inst==b.i||b.i.startsWith(p.inst+' ')));
const bProm=(p,held)=>`<li>${p.v?`<b>${$$(p.v)}</b> `:''}${esc(p.t||'')}${p.dl?' · ends '+esc(p.dl):''}${p.sc=='new_inst'?` <span class=mute>· new clients only${held?' (you hold this broker)':''}</span>`:''}${p.sc=='unknown'?' <span class=mute>· who qualifies not stated</span>':''} <span class=t>${esc(p.tag||'ESTIMATE')}</span></li>`;
const bFee=b=>`${esc(String(b.fee||'—').split(/(?<=\.)\s/)[0])} <span class=t>${esc(b.fee_tag||'ESTIMATE')}</span>`;
function renderBrokerOverview(){const v=$('#view'),B=D.bacct||[],H=B.filter(b=>BHELD(b).length),P=(D.promo||[]).filter(p=>p.line=='broker');
 const row=b=>{const h=BHELD(b),pr=BPROMO(b),q=pr.filter(p=>p.sc!='new_inst'||!h.length);return `<tr${h.length?' class=bheld':''}><td class=l><b>${esc(b.i)}</b>${h.length?`<br><span class=bmine>You hold: ${esc(h.map(x=>x.acct||String(x.i).split(' · ')[1]||'account').join(', '))}</span>`:''}</td>
  <td class=l>${b.accts.map(a=>`<span class="chip bac" title="${esc(a.tag)}">${esc(a.t.replace('_',' '))}${a.tag=='CITED'?'':' *'}</span>`).join(' ')}</td><td class=l>${bFee(b)}</td>
  <td class=l>${q.length?`<ul class=wprom>${q.map(p=>bProm(p,h.length)).join('')}</ul>`:pr.length?'<span class=mute>New clients only</span>':'—'}</td></tr>`};
 v.innerHTML=skel('','Account types and fees are from each broker’s own pages (tag on each value; * = not CITED). Promos list only what you can get: new-client offers drop off for brokers you hold.',[['Brokers on record',B.length],['You hold',H.length],['Promos you qualify for',B.reduce((t,b)=>t+BPROMO(b).filter(p=>p.sc!='new_inst'||!BHELD(b).length).length,0)],['Broker promos',P.length]],
  `<table class="vt btab"><tr><th class=l>Broker</th><th class=l>Account types</th><th class=l>Account fee</th><th class=l>Promos you qualify for</th></tr>${[...H,...B.filter(b=>!H.includes(b))].map(row).join('')}</table><p class=omute>Add the accounts you hold in <button type=button class="lnk plink" data-pgo=brokerage>Wallet › Brokers</button>; tier rates live in <button type=button class="lnk plink" data-s=profile>Profile</button>.</p>`,'')}
function skel(t,sub,tiles,main,aside){return `${t?`<div class=vhead><h2>${t}</h2></div>`:''}<div class=wlay><div class=wmain><div class="hero sk">${tiles.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>${main}${sub?`<details class=vnote><summary>About this view</summary><div>${sub}</div></details>`:''}</div>${aside?`<aside class=wside>${aside}</aside>`:''}</div>`}
const soon=(what)=>`<div class=soon><p>${what}</p></div>`;
/* product-tab sub-tabs (#tabs, folder row under the top tabs): Cards = S, Banking = BS (bank.js), Brokers = BRS, Telecom = TS */
const CTABS=()=>CTV()?CTV().map(id=>S.find(s=>s.id==id)):S.filter(s=>s.id!='wfolder'&&!HIDE.has(s.id)&&!SUBONLY.has(s.id));
const BRS=[{id:'brov',name:'Overview',r:()=>renderBrokerOverview()},{id:'brfees',name:'Fees',r:()=>renderBrokerFees()},{id:'braccts',name:'Accounts',r:()=>renderBrokerAccts()},{id:'brfeat',name:'Features',r:()=>renderBrokerFeat()},{id:'brcry',name:'Crypto',r:()=>renderCrypto()},{id:'brprom',name:'Promotions',r:()=>renderPromos('broker')}];
/* Brokers sub-tabs from the record: Fees / Features = D.bsnap (latest brokerage_snapshots row per broker, tag = its verification_status),
   Accounts = D.bacct (broker-accounts.csv, per account type: offered yes/no/unknown + tag), Promotions = D.promo broker rows. Empty = dash, nulls sort last. */
const BRDASH='<span class=q title="Not stated in the record">—</span>';
const BRNAMES=()=>[...new Set((D.bacct||[]).map(b=>b.i).concat((D.bsnap||[]).map(r=>r.i)))].sort();
const BSN=i=>(D.bsnap||[]).find(r=>r.i==i)||{i};
const brTxt=v=>v==null?BRDASH:`<span title="${esc(v)}">${esc(String(v).split(/(?<=[.;])\s/)[0])}</span>`;
const brTag=r=>r.verification_status?`<span class=t>${esc(r.verification_status)}</span>${r.source_url?` <a href="${esc(r.source_url)}" target=_blank rel=noopener>source</a>`:''}`:BRDASH;
const brHeld=i=>{const b=(D.bacct||[]).find(x=>x.i==i);return b?BHELD(b).length>0:false};
const brTable=(id,H,rows)=>`<table class="vt brtab" data-brtab=${id}><tr>${H.map((h,k)=>`<th${k==0?' class=l':''}>${h}</th>`).join('')}</tr>${rows.join('')||`<tr><td colspan=${H.length} class=empty>—</td></tr>`}</table>`;
const brRow=(i,cells)=>`<tr${brHeld(i)?' class=bheld':''}><td class=l><b>${esc(i)}</b>${brHeld(i)?'<br><span class=bmine>You hold</span>':''}</td>${cells.map(c=>`<td class=l>${c}</td>`).join('')}</tr>`;
const BRFEES=[['equity_commission','Stock trades'],['etf_commission','ETF trades'],['options_commission','Options'],['fx_conversion','FX conversion'],['admin_fees','Account / admin fees'],['inactivity_fees','Inactivity'],['transfer_out_fee','Transfer out']];
function renderBrokerFees(){const L=BRNAMES().map(BSN).sort((a,b)=>(a.equity_commission_cad==null)-(b.equity_commission_cad==null)||(a.equity_commission_cad??0)-(b.equity_commission_cad??0)||a.i.localeCompare(b.i));
 $('#view').innerHTML=skel('','Commissions and fees from each broker’s own pricing pages and fee schedules (brokerage_snapshots, latest capture). Hover a cell for the full text. Sorted by stock-trade commission, lowest first; not stated sorts last.',[['Brokers on record',L.length],['$0 stock trades',L.filter(r=>r.equity_commission_cad===0).length],['FX spread stated',L.filter(r=>r.fx_conversion).length]],
 brTable('brfees',['Broker',...BRFEES.map(x=>x[1]),'Tag'],L.map(r=>brRow(r.i,[...BRFEES.map(([k])=>brTxt(r[k])),brTag(r)]))),'')}
const BRACCTS=['TFSA','RRSP','SPOUSAL_RRSP','FHSA','RESP','RDSP','RRIF','LIRA','LIF','CASH','MARGIN','JOINT','CORPORATE'];
function renderBrokerAccts(){const B=[...(D.bacct||[])].sort((a,b)=>b.accts.length-a.accts.length||a.i.localeCompare(b.i));
 const cell=(b,t)=>{const a=b.accts.find(x=>x.t==t);if(a)return `<span class=bryes title="${esc(a.tag)}">✓${a.tag=='CITED'?'':' *'}</span>`;const n=(b.noacct||[]).find(x=>x.t==t);return n?(n.st=='no'?`<span class=brno title="${esc(n.tag)}">✗</span>`:`<span class=q title="${esc(n.tag)}">?</span>`):BRDASH};
 $('#view').innerHTML=skel('','Which account types each broker offers, from its own account pages (Database/datasets/broker-accounts.csv). ✓ offered, ✗ not offered, ? not confirmed, * = not CITED (hover for the tag), — = not on record.',[['Brokers on record',B.length],['Offer FHSA',B.filter(b=>b.accts.some(a=>a.t=='FHSA')).length],['Offer RDSP',B.filter(b=>b.accts.some(a=>a.t=='RDSP')).length]],
 brTable('braccts',['Broker',...BRACCTS.map(t=>t.replace('SPOUSAL_RRSP','Spousal RRSP').replace(/^(CASH|MARGIN|JOINT|CORPORATE)$/,m=>m[0]+m.slice(1).toLowerCase()))],B.map(b=>`<tr${BHELD(b).length?' class=bheld':''}><td class=l><b>${esc(b.i)}</b></td>${BRACCTS.map(t=>`<td>${cell(b,t)}</td>`).join('')}</tr>`)),'')}
const BRFEAT=[['fractional_shares','Fractional shares'],['usd_accounts','USD accounts'],['drip','DRIP'],['extended_hours','Extended hours'],['ipo_access','IPO access'],['margin_offered','Margin'],['shorting','Short selling'],['cash_interest','Cash interest'],['market_access','Markets']];
function renderBrokerFeat(){const n=r=>BRFEAT.filter(([k])=>r[k]).length,L=BRNAMES().map(BSN).sort((a,b)=>n(b)-n(a)||a.i.localeCompare(b.i));
 $('#view').innerHTML=skel('','Platform features as each broker states them (brokerage_snapshots, latest capture). Hover a cell for the full text; — = not stated in the captured pages, not proof the feature is absent.',[['Brokers on record',L.length],['Fractional shares stated',L.filter(r=>r.fractional_shares).length],['USD accounts stated',L.filter(r=>r.usd_accounts).length]],
 brTable('brfeat',['Broker',...BRFEAT.map(x=>x[1]),'Tag'],L.map(r=>brRow(r.i,[...BRFEAT.map(([k])=>brTxt(r[k])),brTag(r)]))),'')}
/* Brokers › Crypto (schema v30): crypto_snapshots + shared referral_programs / broker-promos.csv rows (D.csnap) */
const CRYCOLS=[['simple_trade_fee_pct','Simple-trade fee'],['instant_buy_fee','Simple / instant buy'],['spread','Spread'],['maker_fee','Maker'],['taker_fee','Taker'],['funding_methods','Funding'],['deposit_fees','Deposit fees'],['fiat_withdrawal_fees','CAD withdrawal'],['network_withdrawal_fees','Network withdrawal'],['staking','Staking'],['tokenized_stocks','Tokenized stocks'],['registered_accounts','Registered accounts'],['subscription_plans','Fee plans'],['minimums_waivers','Minimums'],['custody','Custody'],['legal_entity','Registered entity'],['regulator_scope','CSA scope'],['unique_feature','Notable']];
const CRYFLAG={ok:'<span title="No CSA flag">None</span>',wind_down:'<span class=brno title="CSA terms require wind-down of its registrable business">Wind-down</span>',limited_province:'<span class=q title="Authorized in some provinces only">Limited provinces</span>',institutional_only:'<span class=q title="Institutional clients only">Institutional</span>'};
const cryRef=r=>(r.ref||[]).map(x=>`<span title="${esc(x.conditions||'')}">${x.referrer_amount!=null?'$'+x.referrer_amount+' '+(x.referrer_currency||''):'?'} / ${x.referee_amount!=null?'$'+x.referee_amount+' '+(x.referee_currency||''):'?'}${x.status!='active'?' <small>('+esc(x.status)+')</small>':''}</span>`).join('<br>')||BRDASH;
const cryPro=r=>(r.promos||[]).map(x=>`<span title="${esc(x.notes||'')}">${esc(x.type.replace(/_/g,' '))}${x.max?' up to $'+esc(x.max):x.rate?' '+esc(x.rate)+'%':''} <small>${esc(x.start||'')}${x.end?' – '+esc(x.end):''}</small></span>`).join('<br>')||BRDASH;
function renderCrypto(){const L=[...(D.csnap||[])].sort((a,b)=>((a.platform_flag!='ok')-(b.platform_flag!='ok'))||(a.simple_trade_fee_pct==null)-(b.simple_trade_fee_pct==null)||(a.simple_trade_fee_pct??0)-(b.simple_trade_fee_pct??0)||a.i.localeCompare(b.i));
 $('#view').innerHTML=skel('','Crypto trading platforms on the CSA list of platforms authorized to do business with Canadians (crypto_snapshots, captured 2026-10-20). Simple-trade fee is the explicit fee on a simple buy at the lowest tier, excluding spread (0% = spread only). Referral (referrer / friend) and promotions, current and past, share the broker tables. Hover a cell for the full text; — = not stated in the captured pages.',[['Platforms on record',L.length],['Spread-only (0% fee)',L.filter(r=>r.simple_trade_fee_pct===0).length],['Flagged',L.filter(r=>r.platform_flag&&r.platform_flag!='ok').length]],
 brTable('brcry',['Platform','Flag',...CRYCOLS.map(x=>x[1]),'Referral (referrer / friend)','Promotions','Tag'],L.map(r=>brRow(r.i,[CRYFLAG[r.platform_flag]||'',...CRYCOLS.map(([k])=>k=='simple_trade_fee_pct'?(r[k]==null?BRDASH:r[k]+'%'):brTxt(r[k])),cryRef(r),cryPro(r),brTag(r)]))),'')}
const TS=[{id:'tplans',name:'Plans',r:()=>renderTel('plan')},{id:'tcarr',name:'Carriers',r:()=>renderTel('carrier')},{id:'tmulti',name:'Multi-line discounts',r:()=>renderTel('multiline_discount')},{id:'tprom',name:'Promotions',r:()=>renderPromos('tel')}];
/* Telecom tab: the cited plan catalogue (D.telplans, Database/datasets/telecom-plans.csv). Your own plans live in Subscriptions › Telecom. */
const telHeld=p=>(STO.wallet.tel||[]).some(x=>x&&(x.hid==p.holding_id||x.i==p.brand+' · '+p.plan||(p.kind=='carrier'&&String(x.i||'').split(' · ')[0]==p.brand)));
function renderTel(kind){const L=(D.telplans||[]).filter(p=>p.kind==kind).sort((a,b)=>telHeld(b)-telHeld(a)||a.brand.localeCompare(b.brand)||(+a.price_cad_mo||0)-(+b.price_cad_mo||0)),dash='<span class=q title="Not stated in the record">—</span>',plan=kind!='carrier';
 const row=p=>`<tr${telHeld(p)?' class=theld':''}><td class=l><b>${esc(p.brand)}</b>${p.parent&&p.parent!=p.brand?`<br><small class=mute>${esc(p.parent)}</small>`:''}${telHeld(p)?'<br><span class=tmine>You have</span>':''}</td>${plan?`<td class=l>${esc(p.plan||'')}</td><td>${p.price_cad_mo!=null?(+p.price_cad_mo<0?'−$'+Math.abs(+p.price_cad_mo).toFixed(2):'$'+(+p.price_cad_mo).toFixed(2))+'<span class=mute>/mo</span>':dash}${p.price_basis?`<br><small class=mute>${esc(p.price_basis)}</small>`:''}</td>`:''}${kind=='plan'?`<td>${p.data_gb!=null?esc(p.data_gb)+' GB':dash}</td><td class=l><small>${p.perks?esc(p.perks):dash}</small></td>`:''}<td>${p.tag?`<span class=t>${esc(p.tag[0])}</span>`:dash}${p.source_url?` <a href="${esc(p.source_url)}" target=_blank rel=noopener>source</a>`:''}</td></tr>`;
 const H=kind=='plan'?['Carrier','Plan','Price','Data','Perks','Tag']:kind=='carrier'?['Carrier','Tag']:['Carrier','Discount','Amount','Tag'];
 $('#view').innerHTML=skel('','From each carrier’s own pages, captured with a quote (tag on each row: C = CITED). Your own plans live in Subscriptions.',[['Plans on record',(D.telplans||[]).filter(p=>p.kind=='plan').length],['Carriers',(D.telplans||[]).filter(p=>p.kind=='carrier').length],['You have',(STO.wallet.tel||[]).length]],
 `<table class="vt ttab" data-tel=${kind}><tr>${H.map((h,i)=>`<th${i<2||h=='Perks'?' class=l':''}>${h}</th>`).join('')}</tr>${L.map(row).join('')||`<tr><td colspan=${H.length} class=empty>—</td></tr>`}</table><p class=omute>Add the plans you have in <button type=button class="lnk plink" data-s=subscriptions data-subt=tel>Subscriptions › Telecom</button>.</p>`,'')}
const LSUB={broker:[BRS,'brs'],tel:[TS,'ts']};
const LTABS=k=>{const[L,key]=LSUB[k],cur=L.find(x=>x.id==st[key])||L[0];st[key]=cur.id;return L.map(x=>`<button data-${key}=${x.id} class="${x.id==cur.id?'on':''}">${x.name}</button>`).join('')};
function renderLine(k){const[L,key]=LSUB[k];return (L.find(x=>x.id==st[key])||L[0]).r()}
document.addEventListener('click',e=>{const t=e.target.closest('#tabs [data-brs],#tabs [data-ts]');if(!t)return;e.stopPropagation();if(t.dataset.brs)st.brs=t.dataset.brs;else st.ts=t.dataset.ts;render();scrollTo(0,0)},true);
/* v3.5.4 My Services: status of each service the user pays for, from their held products across all sections. Sourced subsidies only. */
function subsHeld(r){const cs=W.cards.map(i=>C[BYID0[i]]).filter(Boolean),who=(r.who||'').toLowerCase();
 if(r.pid)return cs.find(c=>c.id==r.pid)||null;
 if(r.line=='cards'){const c=cs.find(c=>who.startsWith(c.i.toLowerCase().split(' ')[0])&&/card/.test(who));return c||null}
 if(r.line=='broker'&&/wealthsimple/.test(who)){const t=BTIER('Wealthsimple');return t?{n:'Wealthsimple '+t}:null}
 if(r.line=='bank'){const b=(STO.wallet.banks||[]).map(x=>(D.bank?.accounts||[]).find(a=>a.id==x.id)).filter(Boolean).find(a=>who.includes(a.i.toLowerCase().split(' ')[0]));return b||null}
 return null}
/* targeted/invite-only or conditional REPORTED rebates are offers, never coverage */
const rowCond=r=>/targeted|invite[- ]only|by invitation|select clients/i.test((r.who||'')+' '+(r.prod||'')+' '+(r.cond||''))||(r.ev!='CITED'&&/rebate/i.test(r.what||'')&&!!r.cond);
function subsStatus(s){if(s.pending||!s.rows.length)return{k:'full',t:'Paying full price',d:'No sourced subsidy on record yet.'};
 for(const r of s.rows){if(rowCond(r))continue;const h=subsHeld(r);if(h)return{k:'cov',t:'Covered by '+h.n,d:(r.what||'')+(r.cond?' · '+r.cond:''),r}}
 for(const r of s.rows){if(!rowCond(r))continue;const h=subsHeld(r);if(h)return{k:'cond',t:'Conditional offer via '+h.n,d:'Targeted/conditional, not counted as included: '+(r.what||'')+(r.cond?' · '+r.cond:''),r}}
 const r=s.rows[0];return{k:'avail',t:'Available via '+(r.prod||r.who),d:(r.what||'')+(r.cond?' · '+r.cond:''),r,n:s.rows.length}}
const subsGaps=()=>(STO.wallet.services||[]).map(k=>SUBS.find(s=>s.k==k)).filter(Boolean).map(s=>({s,st:subsStatus(s)})).filter(x=>x.st.k=='avail');
const SUBSOL={dashpass:['#ff3008','#a81c00'],skip:['#ff8000','#b34700'],uberone:['#1f1f1f','#000000'],prime:['#00a8e1','#146eb4'],walmart:['#0071ce','#004c91'],netflix:['#e50914','#7a0006'],disney:['#113ccf','#061a66'],crave:['#1a1a6e','#090933'],appletv:['#3a3a3c','#111111'],costco:['#e31837','#005daa'],globe:['#2b2b2b','#0d0d0d'],starbucks:['#00704a','#1e3932']};
const subsPrice=s=>{for(const r of s.rows){const m=((r.what||'')+' '+(r.cond||'')).match(/(?:normally|regularly|retail(?: value)?|list price|usually)\s*(?:of\s*)?\$\s?(\d+(?:\.\d{2})?)\s?\/\s?(mo|month|yr|year)/i);if(m)return{p:'$'+m[1]+'/'+(m[2][0].toLowerCase()=='m'?'mo':'yr'),r}}return null};
function subsTile(s,ro){const st=subsStatus(s),[a,b]=SUBSOL[s.k]||['#6d28d9','#3b0764'],lp=subsPrice(s);
 return ctile({a,b,top:st.k=='cov'?'✓ Covered':st.k=='avail'?'Free via another product':'Full price',name:s.n,foot:st.k=='full'?'Paying full price':st.t,mark:'List '+(lp?lp.p:'price —'),rm:ro?'':`data-subsx="${s.k}" aria-label="Remove ${esc(s.n)}"`,attrs:`data-subsgo="${s.k}" title="${esc(st.d||'')}" data-sst=${st.k}`})}
/* Hook (ARCHITECTURE §18 Profile opportunities): one ranked list across lines. Today only card moves feed it; bank/broker switches and unclaimed perks plug in here later. */
const opportunities=()=>[...subsGaps().map(g=>({line:'subs',kind:'service',gain:null,why:g.s.n+': '+g.st.t+' ('+(g.st.r?.ev||'')+')'})),...connSavings().map(x=>({line:'connect',kind:'saved',gain:x.amt,why:x.txt+' ('+x.rule+')'})),...offers().moves.map(m=>({line:'cards',kind:m.t,gain:m.g,why:m.why,m}))];
/* v3.5.1 reusable product components (Banking now; Brokerage later for cash interest and account/trading fee waivers).
   rateOf(p): applicable sourced rate given the profile. waysToLower(p,ctx): every sourced path to a lower fee, with qualification. */
function rateOf(p){const r=p.rate,P=PRF();if(!r)return{rate:null,label:'—',why:'rate not in the record'};
 if(r.by=='fixed')return{rate:r.base,label:r.base.toFixed(2).replace(/\.00$/,'')+'%',why:r.note||'as published'};
 if(r.by=='dd'){const x=P.dd?r.ddr:r.base;return{rate:x,label:x.toFixed(2)+'%',why:P.dd?'with your $2,000+/mo direct deposit':'base rate; '+r.ddr.toFixed(2)+'% with $2,000+/mo direct deposit',range:[r.base,r.ddr]}}
 if(r.by=='bal'){const b=r.bands,lo=Math.min(...b.map(x=>x[1])),hi=Math.max(...b.map(x=>x[1])),bal=+(P.bal||0);if(!bal)return{rate:b[0][1],label:b[0][1].toFixed(2)+'%',why:`under $${(b[1]?b[1][0]:0).toLocaleString()}; ${lo}–${hi}% by balance (${r.tag=='CITED'?'cited':'estimate'})`,range:[lo,hi]};const x=[...b].reverse().find(t=>bal>=t[0])[1];return{rate:x,label:x.toFixed(2)+'%',why:'for your balance (cited)'}}
 const v=Object.values(r.tiers),lo=Math.min(...v),hi=Math.max(...v);
 if(r.by=='ws_tier'){const t=BTIER('Wealthsimple');if(!t)return{rate:null,label:lo+'–'+(hi+0.5)+'%',why:'by Wealthsimple tier: set yours in Profile',range:[lo,hi]};const x=r.tiers[t]+(P.dd&&r.dd&&r.dd[t]?r.dd[t]:0);return{rate:x,label:x.toFixed(2)+'%',why:'your '+t+' tier'+(P.dd&&r.dd&&r.dd[t]?' + direct-deposit boost':'')}}
 return{rate:null,label:lo+'–'+hi+'%',why:'by plan ('+Object.entries(r.tiers).map(([k,x])=>k+' '+x+'%').join(', ')+'); plan not in your profile',range:[lo,hi]}}
const WAYK=[['student','Student / youth',/student|youth|ages? (0|18)|24 and under|under-18|kids|teens/i,'young'],['senior','Senior',/senior|60\+|65\+|ages? 60/i,'senior'],['newcomer','Newcomer',/newcomer|startright|first year in canada/i,'newcomer'],['mortgage','Mortgage',/mortgage/i,null],['card','Premium card bundle',/mastercard|visa|credit card/i,null],['dd','Direct deposit',/direct deposit/i,'dd'],['rel','Relationship balance',/relationship/i,null],['other','Other eligibility',/indigenous|rdsp|guaranteed income|social assistance/i,null]];
function waysToLower(p,ctx){const P=PRF(),out=[],bal=+(P.bal||0);
 if(p.mbk=='waive'&&p.mb!=null)out.push({k:'balance',label:'Minimum balance',text:'Keep a '+'$'+p.mb.toLocaleString()+' minimum balance',ok:bal>=p.mb?'yes':'no',src:p.url});
 for(const r of (p.rules||[]).filter(r=>r.new==1&&r.amt>0)){const n=ctx&&ctx.n!=null?ctx.n:null,ok=n==null?'?':(r.lo==null||n>=r.lo)&&(r.hi==null||n<=r.hi)?'yes':'no';out.push({k:'bundle',label:r.p,text:`${r.lo==null?'—':r.lo+(r.hi==null?'+':r.hi!=r.lo?'–'+r.hi:'')} ${r.u||'products'} → $${(r.after??0).toFixed(2)}/mo${r.act?'. Needs: '+r.act:''}`,ok,src:r.src})}
 for(const sen of (p.wvt||'').split(/(?<=[.;])\s+/)){for(const [k,l,re,flag] of WAYK){if(re.test(sen)&&!out.some(o=>o.k==k)&&!(k=='dd'&&(p.rules||[]).length)){out.push({k,label:l,text:sen.trim(),ok:flag?(P[flag]?'yes':'?'):'?',src:p.url});break}}}
 return out}
const waysHTML=ws=>ws.length?`<ul class=ways>${ws.map(w=>`<li class="w${w.ok}"><span class=wk>${w.ok=='yes'?'✓ You qualify':w.ok=='no'?'Not met':'Check'}</span><b>${esc(w.label)}</b> <span>${esc(w.text.slice(0,180))}${w.text.length>180?'…':''}</span>${w.src?` <a href="${esc(w.src)}" target=_blank rel=noopener class=mute>source</a>`:''}</li>`).join('')}</ul>`:'<p class=mute>No other ways on record.</p>';
/* Connection savings: cross-product waivers/rebates the profile already triggers (ARCHITECTURE §20). */
function connSavings(){const cs=W.cards.map(i=>C[BYID0[i]]).filter(Boolean),out=[];
 for(const c of cs){const x=TWV(c);if(x)out.push({amt:c.fee-effFee(c),txt:`${x.inst} ${BTIER(x.inst)} tier waives the ${c.n} fee`,rule:`edges WAIVES (edge ${x.edge}) · ${x.ev}`,src:null})}
 for(const r of bankFees(cs).reb)if(r.amt>0)out.push({amt:r.amt,txt:`${r.rl.p}: holding other ${r.a.i} products cuts the ${r.a.n} fee`,rule:'conditional_fee_rules PRODUCT_COUNT_REBATE · '+(r.rl.ev||''),src:r.rl.src});
 for(const b of (STO.wallet.banks||[])){const a=(D.bank?.accounts||[]).find(o=>o.id==b.id);if(!a)continue;for(const w of a.wv||[]){const c=w.cid&&cs.find(x=>x.id==w.cid);if(c)out.push({amt:null,txt:`${a.n} rebates the fee on your ${c.n}`,rule:'waiver_chains · '+(w.cs||''),src:null})}}
 return out}
let connHTML=()=>{const L=connSavings();return L.length?`<section class=conn><h3>Saved by connecting the dots</h3><ul class=bkp>${L.map(x=>`<li><b>${x.amt!=null?'$'+Math.round(x.amt).toLocaleString()+'/yr':'—'}</b> ${esc(x.txt)} <span class=mute>(${esc(x.rule)})</span>${x.src?` <a href="${esc(x.src)}" target=_blank rel=noopener>source</a>`:''}</li>`).join('')}</ul></section>`:''};
function brokerHTML(cs){return (D.brokers||[]).map(b=>{const t=BTIER(b.i),pk=(D.tperk||[]).filter(x=>x.inst==b.i&&t&&x.tiers.includes(t)),wv=(D.tierw||[]).filter(w=>w.inst==b.i&&t&&w.tiers.includes(t));
 return `<div class=bkr><h3>Brokerage status</h3><label class=bkl>${esc(b.i)} tier <select data-btier="${esc(b.i)}"><option value="">Not a client</option>${b.tiers.map(x=>`<option${x==t?' selected':''}>${x}</option>`).join('')}</select></label><p class=omute>${esc(b.note)}</p>
 ${wv.length?`<ul class=bkp>${wv.map(w=>{const held=cs.some(c=>c.id==w.card);return `<li><b>Fee waiver</b> ${esc(w.txt)} <span class=ev>${esc(w.ev)}</span>${held?' <span class=y>applied</span>':''}</li>`}).join('')}</ul>`:''}
 ${pk.length?`<h4>Tier perks (freebies where known)</h4><ul class=bkp>${pk.map(x=>`<li><b>${esc(x.to)}</b>: ${esc(x.val)} <span class=ev title="${esc(x.cond)}">${esc(x.ev)}</span>${x.src?` <a href="${esc(x.src)}" target=_blank rel=noopener>source</a>`:''}</li>`).join('')}</ul><p class=omute>Not valued in $: amounts depend on plans you buy. Shown for context; not counted in My Offers.</p>`:''}</div>`}).join('')}
function offersHTML(){const O=offers(),lab=m=>m.t=='add'?`Add <b>${esc(m.y.n)}</b>`:m.t=='close'?`Close <b>${esc(m.x.n)}</b>`:`Swap <b>${esc(m.x.n)}</b> for <b>${esc(m.y.n)}</b>`;
 const tg={add:'ADD',swap:'SWAP',close:'CLOSE'};
 return `<section class=offers aria-labelledby=offh><h3 id=offh>My Offers</h3><p class=omute>Moves that would raise your net value a year (${RWL} on your spend, minus card fees and bank fees after rebates). Welcome bonuses and first-year waivers are not counted. These never change any ranking.</p>
 ${O.moves.length?`<ol class=olist>${O.moves.map(m=>`<li><span class="otag o${m.t}">${tg[m.t]}</span><div class=obody><div class=omove>${lab(m)}</div><div class=owhy>${esc(m.why)}</div></div><b class=ogain>+${$$(m.g)}<small>/yr</small></b></li>`).join('')}</ol>`:`<div class=oempty><b>No moves to suggest</b><p>${O.base?'With your spend, no single add, swap or close beats your current wallet.':'Enter your monthly spend to see moves.'}</p></div>`}</section>`}
const VIEWS={wfolder:renderCardsFolder};
/* v3.5.10 Wallet: every holding (cards, bank accounts, brokerage, telecom, insurance, perks/subscriptions, points), one versioned key (ptt.state v2). */
const PTSP=['Aeroplan','Amex Membership Rewards','RBC Avion','TD Rewards','CIBC Aventura','Scene+','PC Optimum','AIR MILES','BMO Rewards','WestJet Rewards','Marriott Bonvoy','Triangle Rewards'];
const wCount=()=>W.cards.length+['banks','brokerage','tel','ins','points','services'].reduce((t,k)=>t+(STO.wallet[k]||[]).length,0);
const WSEC=()=>[
 ['cards','Credit cards',W.cards.map(i=>{const c=C[BYID0[i]];return c&&{k:i,n:c.n,sub:c.i}}).filter(Boolean),C.map(c=>[c.id,c.n])],
 ['banks','Bank accounts',(STO.wallet.banks||[]).map(x=>{const a=(D.bank?.accounts||[]).find(a=>a.id==x.id);return a&&{k:x.id,n:a.n,sub:a.i}}).filter(Boolean),(D.bank?.accounts||[]).map(a=>[a.id,a.i+' · '+a.n])],
 ['brokerage','Brokerage accounts',(STO.wallet.brokerage||[]).filter(x=>x&&x.i).map(x=>({k:x.i,n:x.i,sub:x.tier||''})),[...new Set((D.bacct||[]).flatMap(b=>b.accts.map(a=>b.i+' · '+a.t)).concat((D.brokers||[]).map(b=>b.i),PROMO.filter(p=>p.line=='broker').map(p=>p.inst)))].sort().map(n=>[n,n])],
 ['tel','Telecom plans',(STO.wallet.tel||[]).map(x=>({k:x.i,n:x.i})),[...new Set((D.telplans||[]).filter(p=>p.kind!='multiline_discount').map(p=>p.brand+' · '+p.plan).concat(D.ntel?.brands||[]))].map(n=>[n,n])],
 ['ins','Insurance policies',(STO.wallet.ins||[]).map(x=>({k:x.i,n:x.i})),null],
 ['services','Perks & subscriptions',(STO.wallet.services||[]).map(k=>{const s=SUBS.find(s=>s.k==k);return{k,n:s?s.n:k}}),SUBS.map(s=>[s.k,s.n])],
 ['points','Points programs',(STO.wallet.points||[]).map(x=>({k:x.i,n:x.i})),PTSP.map(n=>[n,n])]];
function wAdd(sec,v){v=(v||'').trim();if(!v)return;const L=WSEC().find(x=>x[0]==sec),opt=L&&L[3]?(L[3].find(o=>o[0]==v||o[1].toLowerCase()==v.toLowerCase())||null):null,key=opt?opt[0]:v;
 if(sec=='cards'){if(!opt||W.cards.includes(key))return;W.cards.push(key)}
 else if(sec=='banks'){if(!opt||(STO.wallet.banks||[]).some(x=>x.id==key))return;STO.wallet.banks=[...(STO.wallet.banks||[]),{id:key,added_at:NOW()}]}
 else if(sec=='services'){if(!opt)return;STO.wallet.services=[...new Set([...(STO.wallet.services||[]),key])]}
 else{const A=STO.wallet[sec]=STO.wallet[sec]||[];if(A.some(x=>x.i==key))return;A.push({i:key,added_at:NOW()})}
 saveS();render()}
function wRm(sec,k){if(sec=='cards')W.cards=W.cards.filter(i=>i!=k);else if(sec=='banks')STO.wallet.banks=STO.wallet.banks.filter(x=>x.id!=k);else if(sec=='services')STO.wallet.services=STO.wallet.services.filter(x=>x!=k);else STO.wallet[sec]=(STO.wallet[sec]||[]).filter(x=>x.i!=k);saveS();render()}
/* Wallet › Brokers folder: deep panel (held accounts, their fees, promos open to existing clients) */
function renderBrokerageWallet(){const v=$('#view');
 const[k,n,items]=WSEC().find(x=>x[0]=='brokerage'),bk=k=='brokerage'?(D.bacct||[]).filter(b=>BHELD(b).length):[];v.innerHTML=`<div class=vhead><h2>Wallet · Brokers</h2></div><section class=aws data-aws=${k} data-ro><h3>${n} <span class=mute>${items.length}</span></h3><ul>${items.map(x=>`<li><span><b>${esc(x.n)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:''}</span></li>`).join('')||'<li class=mute>None yet</li>'}</ul>${pgoLink(k,'Add or edit in Wallet ›')}</section>${bk.length?`<section class=psec data-bfees><h3>Your account fees and how to lower them</h3><ul class=wprom>${bk.map(b=>`<li><b>${esc(b.i)}</b>: ${esc(b.fee||'—')} <span class=t>${esc(b.fee_tag||'ESTIMATE')}</span></li>`).join('')}</ul></section><section class=psec data-bprom><h3>Active promos you qualify for</h3>${(()=>{const L=bk.flatMap(b=>BPROMO(b).filter(p=>p.sc!='new_inst'));return L.length?`<ul class=wprom>${L.map(p=>bProm({...p,t:p.inst+': '+p.t},1)).join('')}</ul>`:'<p class=mute>None open to existing clients right now.</p>'})()}</section>`:''}`}
/* v3.7.0 Profile IS the wallet (Andrew 2026-10-16): one long screen. 'You' (schema-driven eligibility inputs) → every holding as a visual card, grouped,
   with add/remove here only → product history (closed products, bonuses) → your data. Other tabs show read-only summaries that link to #pw-<section>. */
const PROVS=['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
const BAND=(a,fmt)=>a.map(v=>[v,fmt(v)]);
/* add a field here and it appears in Profile, is saved in ptt.state (wallet.profile), exported encrypted, and can be read by eligibility via PRF()[k] */
const YOU_FIELDS=[
 {k:'prov',l:'Province',t:'select',o:PROVS.map(p=>[p,p])},
 {k:'inc',l:'Personal income',t:'select',num:1,o:BAND([0,40000,60000,80000,100000,150000],v=>v?'$'+(v/1000)+'k+':'Under $40k'),h:'Visa Infinite / World Elite thresholds'},
 {k:'hinc',l:'Household income',t:'select',num:1,o:BAND([0,60000,100000,150000,200000],v=>v?'$'+(v/1000)+'k+':'Under $60k')},
 {k:'age',l:'Age',t:'select',o:[['18–24','18–24'],['25–34','25–34'],['35–59','35–59'],['60+','60+']]},
 {k:'newcomer',l:'Newcomer to Canada (first 1–2 years)',t:'check'},
 {k:'young',l:'Student',t:'check'},
 {k:'aum',l:'Investable assets you could move',t:'select',num:1,o:BAND([0,10000,25000,50000,100000,250000,500000,1000000],v=>v?'$'+(v>=1e6?v/1e6+'M':v/1000+'k')+'+':'Under $10k'),h:'used for broker % match payouts'},
 {k:'pulls',l:'Credit inquiries, last 24 months',t:'number',h:'manual; for your own pacing'},
 {k:'spouse',l:'Spouse or partner',t:'check',h:'additional cards, joint accounts, multi-line plans'},
 {k:'kidsN',l:'Kids',t:'number',h:'youth/student accounts, RESP offers'},
 {k:'kids',l:'Kids’ ages',t:'multi',o:KIDB.map(b=>[b,b])}];
function youHTML(){const P=PRF(),f=x=>{const v=P[x.k];if(x.t=='check')return `<label class="pqr you-c"><input type=checkbox data-you=${x.k} ${v?'checked':''}> ${esc(x.l)}${x.h?` <small class=mute>${esc(x.h)}</small>`:''}</label>`;
  if(x.t=='multi')return `<div class="pqr you-m">${esc(x.l)}: ${x.o.map(([o,l])=>`<label class=kidb><input type=checkbox data-pkid="${esc(o)}" ${(P.kids||[]).includes(o)?'checked':''}> ${esc(l)}</label>`).join(' ')}</div>`;
  if(x.t=='number')return `<label class=pqr>${esc(x.l)} <input class=amt type=number min=0 step=1 inputmode=numeric data-you=${x.k} value="${v??''}" placeholder="0">${x.h?` <small class=mute>${esc(x.h)}</small>`:''}</label>`;
  return `<label class=pqr>${esc(x.l)} <select data-you=${x.k}><option value="">—</option>${x.o.map(([o,l])=>`<option value="${esc(o)}" ${v!=null&&String(v)===String(o)?'selected':''}>${esc(l)}</option>`).join('')}</select>${x.h?` <small class=mute>${esc(x.h)}</small>`:''}</label>`};
 return `<section class=psec id=pw-you><h3>You <span class=mute>(optional, stays on this device)</span></h3><p class=omute>Used for eligibility and the achievable promo figure. Answer only what you like.</p><div class=yougrid>${YOU_FIELDS.map(f).join('')}</div>${memNames()}</section>`}
document.addEventListener('change',e=>{const k=e.target.dataset.you;if(!k)return;const x=YOU_FIELDS.find(f=>f.k==k),P=PRF(),t=e.target;
 if(x.t=='check')P[k]=t.checked;else if(t.value==='')delete P[k];else P[k]=x.t=='number'||x.num?Math.max(0,+t.value||0):t.value;
 if(k=='age')P.senior=t.value=='60+';STO.wallet.updated_at=NOW();saveS();if(k=='spouse'||k=='kidsN')setTimeout(render,0)});/* no re-render: the inputs already show the answer, and re-rendering a focused control throws on blur */
const PWS=[['banks','Banks'],['cards','Credit'],['brokerage','Brokers']];/* Wallet = Cards/Banking/Brokers partners; telecom plans live in Subscriptions › Telecom, points programs in Points *//* subscriptions live in Subscriptions *//* insurance holdings stay in the store; no section until the line ships */
const PWCOL={brokerage:['#14532d','#15803d'],points:['#4b2a7b','#7a4fc0'],tel:['#7f1d1d','#b91c1c'],ins:['#1e3a5f','#2f5d8a']};
function pwTiles(k){const W2=STO.wallet,rm=(key,n)=>`data-wrm=${k} data-wk="${esc(key)}" aria-label="Remove ${esc(n)}"`;
 if(k=='cards')return W.cards.map(i=>C[BYID0[i]]).filter(Boolean).map(c=>{const[a,b]=icol(c);return ctile({a,b,img:'cards/'+c.id+'.svg',alt:'',top:c.i,name:c.n,foot:c.fee==null?'Fee —':effFee(c)==0&&c.fee>0?'✓ Fee waived':'$'+effFee(c)+'/yr',mark:(ADDL(c.id)?'+'+ADDL(c.id)+' ':'')+(c.nw||'').toUpperCase(),attrs:`data-wtile="${C.indexOf(c)}" aria-label="${esc(c.n)} details"${boostNote(c)?` title="${esc(boostNote(c))}"`:''}`,rm:rm(c.id,c.n)})});
 if(k=='banks')return (W2.banks||[]).map(x=>BANK.data().accounts.find(a=>a.id==x.id)).filter(Boolean).map(o=>BANK.btile(o));
 if(k=='services')return (W2.services||[]).map(s=>SUBS.find(x=>x.k==s)).filter(Boolean).map(subsTile);
 const[a,b]=PWCOL[k]||['#334155','#0f172a'];
 return (W2[k]||[]).filter(x=>x&&x.i).map(x=>{if(k=='points'){const p=ptsBy(x.i),val=ptsVal(x);return ctile({a,b,top:p?p.op:'Points',name:x.i,foot:(x.bal!=null?(+x.bal).toLocaleString()+' '+(p?.unit||'pts'):'Add balance below')+(val!=null?' · '+$$(val):''),mark:p&&p.cpp!=null?p.cpp.toFixed(2)+'¢':'',attrs:`data-hold=points`,rm:rm(x.i,x.i)})}
  return ctile({a,b,top:k=='brokerage'?'Broker':k=='tel'?'Telecom':'Insurance',name:x.i,foot:k=='brokerage'?[x.acct||String(x.i).split(' · ')[1],x.tier?x.tier+' tier':null].filter(Boolean).join(' · ')||'Self-directed':x.mo!=null?'$'+x.mo+'/mo'+(x.gb?' · '+x.gb+' GB':''):x.plan||'',mark:k=='brokerage'?'INVEST':k=='tel'?'MOBILE':'POLICY',attrs:`data-hold=${k}`,rm:rm(x.i,x.i)})})}
function pwSec([k,n]){const t=pwTiles(k).filter((_,i)=>!st.pmem||st.pmem=='all'||ownOf(k,pwKeys(k)[i]).includes(st.pmem)),WS=WSEC(),o=k=='points'?[...new Set(PTS.map(p=>p.n).concat(PTSP))].sort().map(x=>[x,x]):(WS.find(x=>x[0]==k)||[])[3];
 const pts=k=='points'&&(STO.wallet.points||[]).length?`<table class=vt><tr><th class=l>Program</th><th>Balance</th><th>¢ / pt</th><th>Est. value</th></tr>${STO.wallet.points.map(x=>{const p=ptsBy(x.i),val=ptsVal(x);return `<tr><td class=l>${esc(x.i)}</td><td><input type=number min=0 step=1 value="${x.bal??''}" data-ptbal="${esc(x.i)}" aria-label="${esc(x.i)} balance" style="width:9em"></td><td>${p&&p.cpp!=null?p.cpp.toFixed(2)+'¢':'—'}</td><td>${val!=null?$$(val):'—'}</td></tr>`}).join('')}</table>`:'';
 return `<section class="pws" id=pw-${k} data-aws=${k}><h4>${esc(n)} <span class=mute>(${t.length})</span></h4><div class="tiles ptiles">${t.join('')||'<p class=mute>None yet.</p>'}</div>${pts}
 <form class=awadd data-wadd=${k}><input name=v list="pwl-${k}" placeholder="+ Add ${esc(n.toLowerCase())}…" autocomplete=off aria-label="Add to ${esc(n)}">${o?`<datalist id="pwl-${k}">${o.map(x=>`<option value="${esc(x[1])}">`).join('')}</datalist>`:''}${k=='cards'?'<label class=addl>Additional cardholders <input name=addl type=number min=0 max=9 step=1 value=0 inputmode=numeric></label>':''}${MEMS().length>1?`<label class=addl>Owner <select name=own>${MEMS().map(([id,l])=>`<option value=${id}>${esc(l)}</option>`).join('')}${MEMS().some(x=>x[0]=='spouse')?'<option value="you,spouse">Joint (you + spouse)</option>':''}</select></label>`:''}<button type=submit class=btn>Add</button></form>${k=='cards'?addlRows():''}${k=='tel'?telMulti():''}${ownRows(k)}</section>`}
/* multi-line discounts (D.telplans kind multiline_discount): the tier matching how many lines you hold with that brand */
function telMulti(){const n={};(STO.wallet.tel||[]).forEach(x=>{const b=x&&(x.brand||String(x.i||'').split(' · ')[0]);if(b)n[b]=(n[b]||0)+1});
 const L=(D.telplans||[]).filter(p=>{if(p.kind!='multiline_discount')return false;const m=/(\d+)(?:-(\d+))?-lines$/.exec(p.holding_id)||[],c=n[p.brand]||0;return c>=+m[1]&&c<=+(m[2]||m[1])});
 return L.length?`<ul class=wprom>${L.map(p=>`<li><b>$${(-p.price_cad_mo).toFixed(2)}/line/mo off</b> ${esc(p.brand)} ${esc(p.plan)} with your ${n[p.brand]} lines <span class=mute>· ${esc(p.price_basis||'')} · ${esc(p.tag)}</span></li>`).join('')}</ul>`:''}
/* product history: closed products and bonuses received; feeds re-eligibility (promoState) and the achievable figure */
function histHTML(){const A=STO.wallet.archive||[],nm=a=>a.sec=='cards'?(C[BYID0[a.id]]||{}).n||a.id:a.sec=='banks'?((D.bank?.accounts||[]).find(o=>o.id==a.id)||{}).n||a.id:a.i||a.id;
 const opts=[...C.map(c=>c.n),...(D.bank?.accounts||[]).map(o=>o.n)];
 return `<section class=psec id=pw-history><h3>Product history <span class=mute>(${A.length})</span></h3><p class=omute>Products you closed and bonuses you received. Promotions use these dates for new-client and re-eligibility rules.</p>
 ${A.length?`<table class=vt data-hist><tr><th class=l>Product</th><th>Opened</th><th>Closed</th><th>Bonus received</th><th></th></tr>${A.map((a,i)=>{const b=(a.bonus||[])[0]||{};return `<tr><td class=l>${esc(nm(a))}</td><td>${esc(a.opened||'—')}</td><td>${esc(a.closed||'—')}</td><td>${b.value_cad!=null?'$'+(+b.value_cad).toLocaleString()+(b.received?' · '+esc(b.received):''):'—'}</td><td><button type=button class=lnk data-hdel=${i}>Remove</button></td></tr>`}).join('')}</table>`:''}
 <form class="awadd hadd" data-hadd><input name=p list=phl placeholder="Closed product…" aria-label="Closed product" required><datalist id=phl>${opts.map(n=>`<option value="${esc(n)}">`).join('')}</datalist><label class=addl>Opened <input name=o type=date></label><label class=addl>Closed <input name=c type=date required></label><input name=bv type=number min=0 placeholder="Bonus $" aria-label="Bonus received, dollars"><label class=addl>Bonus on <input name=bd type=date></label><button type=submit class=btn>Add</button></form></section>`}
document.addEventListener('submit',e=>{const f=e.target.closest('[data-hadd]');if(!f)return;e.preventDefault();const n=f.p.value.trim().toLowerCase(),c=C.find(x=>x.n.toLowerCase()==n),o=(D.bank?.accounts||[]).find(x=>x.n.toLowerCase()==n);if(!n||!f.c.value)return;
 const row={sec:c?'cards':o?'banks':'other',...(c?{id:c.id}:o?{id:o.id}:{i:f.p.value.trim()}),opened:f.o.value||null,closed:f.c.value,status:'closed',bonus:f.bv.value?[{value_cad:+f.bv.value,type:'cash',received:f.bd.value||null}]:[],added_at:NOW()};
 STO.wallet.archive=[...(STO.wallet.archive||[]),row];STO.wallet.updated_at=NOW();saveS();render();document.getElementById('pw-history')?.scrollIntoView()});
document.addEventListener('click',e=>{const d=e.target.closest('[data-hdel]');if(d){(STO.wallet.archive||[]).splice(+d.dataset.hdel,1);saveS();render();return}
 const g=e.target.closest('[data-pgo]');if(g){e.stopImmediatePropagation();const sec=g.dataset.pgo;if(PWS.some(x=>x[0]==sec))st.wt=sec;if(sec=='tel')st.subt='tel';st.s=sec=='pyt'?'pyt':sec=='points'?'points':sec=='tel'?'subscriptions':['you','spend','sum'].includes(sec)?'profile':'wallet';st.card=null;render();requestAnimationFrame(()=>{const el=document.getElementById('pw-'+sec);if(el)el.scrollIntoView({block:'start'});else scrollTo(0,0)});return}},true);
const pgoLink=(sec,label='Edit in Wallet ›')=>`<p class=omute><button type=button class=lnk data-pgo=${sec}>${label}</button></p>`;
/* v3.8.0 FINAL IA: Wallet (top nav, st.s='wallet') = the one place to add/edit holdings; Profile = inputs + summary + Per Your Terms. One store. */
function renderWallet(){const nh=PWS.reduce((t,[k])=>t+pwKeys(k).length,0);
 $('#view').innerHTML=`<div class="prof pstack"><div class=vhead><h2>Accounts</h2></div><p class=lead>Everything you hold, as cards. Add, edit or remove here; every tab reads from it.</p>
 <section class=psec id=pw-all><h3>What you hold <span class=mute>(${nh})</span></h3>${MEMS().length>1?`<div class=pmem role=group aria-label="Show holdings for">${[['all','All'],...MEMS()].map(([id,l])=>`<button type=button class="chip${(st.pmem||'all')==id?' on':''}" data-pmem=${id}>${esc(l)}</button>`).join('')}</div>`:''}<div class=wsrch><input type=search data-wsearch placeholder="Add a card, bank account or broker: try ‘eclipse’, ‘tangerine’, ‘questrade’…" aria-label="Search everything to add" autocomplete=off><div id=wsres role=listbox aria-label=Results></div></div><nav class=pwnav aria-label="Holdings sections">${PWS.map(([k,n])=>`<a href="#" data-pgo=${k}>${esc(n)}</a>`).join(' · ')}</nav>${PWS.map(pwSec).join('')}</section>
 ${histHTML()}
 <section class=psec id=pw-data><h3>Your data</h3><p><button type=button class=btn data-wxexp>Export wallet</button> <button type=button class=btn data-wximp>Import wallet</button></p><div id=wxp class=wxp hidden></div><p class=omute>Encrypted with your passphrase, on this device. No account, nothing stored on a server. <button type=button class=lnk data-exp>Unencrypted JSON</button> · <label class=lnk>import JSON<input type=file accept=application/json,.json data-imp hidden></label></p></section></div>`}
/* holdings that lack fields affecting $: cards/banks without an opened date, points without a balance, telecom without a price */
function missingDetails(){let n=0;W.cards.forEach(i=>{const r=(STO.wallet.cards||[]).find(x=>(x.id||x)==i);if(!r||!r.opened)n++});(STO.wallet.banks||[]).forEach(x=>{if(!x.opened)n++});(STO.wallet.points||[]).forEach(x=>{if(x&&x.bal==null)n++});(STO.wallet.tel||[]).forEach(x=>{if(x&&x.mo==null)n++});return n}
function walletSummary(){const M=MEMS(),cnt=k=>pwKeys(k).length,own=m=>PWS.reduce((t,[k])=>t+pwKeys(k).filter(key=>ownOf(k,key).includes(m)).length,0);
 const fees=W.cards.map(i=>C[BYID0[i]]).filter(Boolean).reduce((t,c)=>t+(effFee(c)||0),0)+(STO.wallet.banks||[]).reduce((t,x)=>{const o=BANK.data().accounts.find(a=>a.id==x.id);const c=o&&BANK.cost(o,BANK.inp()).c;return t+(c||0)},0);
 const val=(()=>{try{return walletCalc().rew}catch(e){return 0}})()+(STO.wallet.points||[]).reduce((t,x)=>t+(ptsVal(x)||0),0),miss=missingDetails();
 return `<section class=psec id=pw-sum><h3>Your wallet at a glance</h3><table class=vt data-wsum><tr>${PWS.map(([k,n])=>`<th>${esc(n)}</th>`).join('')}</tr><tr>${PWS.map(([k])=>`<td><button type=button class=lnk data-pgo=${k}>${cnt(k)}</button></td>`).join('')}</tr></table>
 ${M.length>1?`<p class=omute>By owner: ${M.map(([id,l])=>`${esc(l)} ${own(id)}`).join(' · ')}</p>`:''}<p>Annual fees ${$$(fees)} · Est. value ${$$(val)}/yr <small class=mute>(rewards at your spending + points value)</small></p>
 ${miss?`<p class=omute data-miss=${miss}>${miss} holding${miss==1?'':'s'} missing details that affect your numbers. <button type=button class=lnk data-pgo=all>Add details in Wallet ›</button></p>`:''}<p><button type=button class=btn data-s=wallet>Open Wallet</button></p></section>`}
function renderProfile(){
 $('#view').innerHTML=`<div class="prof pstack"><div class=vhead><h2>Profile</h2></div><p class=lead>About you, your spending, and what it adds up to. Holdings live in <button type=button class=lnk data-s=wallet>Wallet</button>.</p>
 ${youHTML()}
 <section class=psec id=pw-spend><h3>${SPEND_LABEL}</h3><p class=omute>Used to value cards and the spend caps on promos. Leave blank for $0.</p>${spendHTML()}</section>
 ${walletSummary()}
 <section class=psec>${profHTML()}</section>
 ${tiersHTML()}<section class=psec>${[...new Set((D.brokers||[]).map(b=>b.i).concat(Object.keys(STO.wallet.tiers||{})))].map(provRatesHTML).join('')}${brokerHTML(W.cards.map(i=>C[BYID0[i]]).filter(Boolean))}</section>${grantsHTML()}</div>`}

/* v3.6.2 Encrypted wallet export/import (Profile › Your data). Zero server data: everything runs in this browser with WebCrypto; no network calls.
   File (.ptt, binary): "PTTW" | ver u8 (=1) | kdf u8 (1 = PBKDF2-SHA256) | iterations u32 BE | salt[16] | iv[12] | AES-256-GCM ciphertext (header bytes are the GCM additional data).
   Plaintext: {format:'pertheterms-wallet',v:1,exported_at,state:STO,extra:{other ptt.* keys, e.g. future ptt.user_promo}}.
   Later (note only): QR / device-to-device transfer can reuse the same envelope. */
const WX={MAGIC:[80,84,84,87],VER:1,KDF:1,ITER:600000,file:null,data:null};
const wxKey=async(pass,salt,iter,use)=>{const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},base,{name:'AES-GCM',length:256},false,[use])};
async function wxEncrypt(obj,pass){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),h=new Uint8Array(38);h.set(WX.MAGIC,0);h[4]=WX.VER;h[5]=WX.KDF;new DataView(h.buffer).setUint32(6,WX.ITER);h.set(salt,10);h.set(iv,26);
 const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:h},await wxKey(pass,salt,WX.ITER,'encrypt'),new TextEncoder().encode(JSON.stringify(obj))));const out=new Uint8Array(h.length+ct.length);out.set(h);out.set(ct,h.length);return out}
async function wxDecrypt(buf,pass){const b=new Uint8Array(buf);if(b.length<54||WX.MAGIC.some((m,i)=>b[i]!==m))throw new Error('This is not a PerTheTerms wallet file.');if(b[4]!==1||b[5]!==1)throw new Error('This wallet file was made by a newer version of PerTheTerms.');
 const h=b.slice(0,38),iter=new DataView(h.buffer).getUint32(6);if(iter<100000||iter>1e7)throw new Error('This wallet file header is damaged.');let pt;
 try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:h.slice(26,38),additionalData:h},await wxKey(pass,h.slice(10,26),iter,'decrypt'),b.slice(38))}catch(e){throw new Error('Wrong passphrase, or the file was changed. Nothing was imported.')}
 const o=JSON.parse(new TextDecoder().decode(pt));if(!o||o.format!='pertheterms-wallet'||!o.state||!o.state.wallet)throw new Error('This file does not contain a PerTheTerms wallet.');return o}
const wxPayload=()=>{saveS();const extra={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('ptt.')&&k!=SK&&!OLDK.includes(k))extra[k]=localStorage.getItem(k)}return{format:'pertheterms-wallet',v:1,exported_at:NOW(),app_version:D.ver||null,state:JSON.parse(JSON.stringify(STO)),extra}};
const WXS=[['cards','Cards'],['banks','Bank accounts'],['brokerage','Brokerage'],['tel','Telecom'],['ins','Insurance'],['points','Points'],['services','Perks'],['archive','Archive (closed)'],['history_log','History entries']];
const wxCounts=st0=>{const w=st0.wallet||{};return WXS.map(([k,l])=>[l,(w[k]||[]).length])};
const wxHid=(k,x)=>typeof x=='string'?x:k=='cards'||k=='banks'?x&&x.id:x&&(x.id||x.i);
const wxT=x=>x&&typeof x=='object'?Date.parse(x.updated_at||x.closed||x.added_at||'')||0:0;
function wxMerge(cur,inc){const o=JSON.parse(JSON.stringify(cur)),iw=inc.wallet||{};o.wallet=o.wallet||{};
 for(const[k]of WXS){if(k=='history_log'){const seen=new Set((o.wallet[k]||[]).map(x=>JSON.stringify(x)));o.wallet[k]=(o.wallet[k]||[]).concat((iw[k]||[]).filter(x=>!seen.has(JSON.stringify(x))));continue}
  const A=(o.wallet[k]||[]).slice(),ix=new Map(A.map((x,i)=>[wxHid(k,x),i]));for(const x of iw[k]||[]){const id=wxHid(k,x);if(id==null)continue;if(!ix.has(id)){ix.set(id,A.length);A.push(x)}else if(wxT(x)>wxT(A[ix.get(id)]))A[ix.get(id)]=x}if(A.length||iw[k])o.wallet[k]=A}
 const newer=(Date.parse((inc.wallet||{}).updated_at||inc.updated_at||'')||0)>(Date.parse(o.wallet.updated_at||o.updated_at||'')||0);
 if(newer){if(iw.spend)o.wallet.spend={...o.wallet.spend,...iw.spend};if(iw.profile)o.wallet.profile={...o.wallet.profile,...iw.profile};o.wallet.updated_at=iw.updated_at||NOW()}
 return o}
function wxApply(next,extra,mode){for(const[k,v]of Object.entries(extra||{})){if(!k.startsWith('ptt.')||k==SK)continue;if(mode=='replace'||localStorage.getItem(k)==null)try{localStorage.setItem(k,v)}catch(e){}}
 STO=migS(next);W.cards=STO.wallet.cards.map(x=>x.id).filter(i=>C.some(c=>c.id==i));W.spend={...STO.wallet.spend};saveS();render()}
const wxBox=()=>document.getElementById('wxp');
const wxMsg=(t,err)=>{const m=document.getElementById('wxmsg');if(m){m.textContent=t;m.className=err?'wxerr':'mute'}};
function wxShow(html){const b=wxBox();if(b){b.innerHTML=html;b.hidden=false;b.querySelector('input:not([type=file]),button')?.focus()}}
const wxPassHTML=(confirm,act,label)=>`<form class=wxform data-wxform=${act}><label>Passphrase <input type=password data-wxp1 autocomplete=${confirm?'new-password':'current-password'} minlength=${confirm?10:1} required></label>${confirm?'<label>Repeat passphrase <input type=password data-wxp2 autocomplete=new-password required></label>':''}<button type=submit class=btn>${label}</button> <button type=button class=lnk data-wxx>Cancel</button><p id=wxmsg class=mute role=status aria-live=polite>${confirm?'At least 10 characters. We can’t recover it: without the passphrase the file can’t be opened.':''}</p></form>`;
document.addEventListener('click',e=>{const t=e.target;
 if(t.closest('[data-wxexp]')){wxShow(`<h4>Export wallet</h4><p class=mute>Everything you hold, your history, archive and enrolled promos, encrypted on this device with your passphrase (AES-256-GCM, PBKDF2-SHA256 ${WX.ITER.toLocaleString()} rounds). Nothing is sent anywhere.</p>`+wxPassHTML(true,'exp','Download encrypted file'));return}
 if(t.closest('[data-wximp]')){WX.file=null;WX.data=null;wxShow(`<h4>Import wallet</h4><p><label class=btn>Choose .ptt file<input type=file accept=".ptt,application/octet-stream" data-wxfile hidden></label> <span class=mute data-wxfn>No file chosen</span></p>`+wxPassHTML(false,'imp','Decrypt'));return}
 if(t.closest('[data-wxx]')){const b=wxBox();if(b){b.hidden=true;b.innerHTML=''}WX.file=WX.data=null;return}
 const m=t.closest('[data-wxmode]');if(m&&WX.data){const mode=m.dataset.wxmode,inc=WX.data.state,next=mode=='replace'?inc:wxMerge(JSON.parse(JSON.stringify(STO)),inc);wxApply(next,WX.data.extra,mode);WX.data=null;const b=wxBox();if(b){b.hidden=false;b.innerHTML=`<p class=wxok role=status>${mode=='replace'?'Wallet replaced':'Wallet merged'} from the file. Every view now uses it.</p>`}}});
document.addEventListener('change',e=>{if(!e.target.matches('[data-wxfile]'))return;WX.file=e.target.files[0]||null;const n=document.querySelector('[data-wxfn]');if(n)n.textContent=WX.file?WX.file.name:'No file chosen'});
document.addEventListener('submit',async e=>{const f=e.target.closest('[data-wxform]');if(!f)return;e.preventDefault();const p1=f.querySelector('[data-wxp1]').value,btn=f.querySelector('button[type=submit]');
 if(f.dataset.wxform=='exp'){const p2=f.querySelector('[data-wxp2]').value;if(p1.length<10)return wxMsg('Use at least 10 characters.',1);if(p1!==p2)return wxMsg('The two passphrases don’t match.',1);
  btn.disabled=true;wxMsg('Encrypting…');try{const bin=await wxEncrypt(wxPayload(),p1),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bin],{type:'application/octet-stream'}));a.download='pertheterms-wallet-'+new Date().toLocaleDateString('en-CA')+'.ptt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2e3);wxMsg('Downloaded '+a.download+'. Keep the passphrase somewhere safe.')}catch(err){wxMsg('Export failed: '+(err.message||err),1)}btn.disabled=false;return}
 if(!WX.file)return wxMsg('Choose a .ptt file first.',1);btn.disabled=true;wxMsg('Decrypting…');
 try{const o=await wxDecrypt(await WX.file.arrayBuffer(),p1);WX.data=o;const cs=wxCounts(o.state),cur=wxCounts(STO);
  wxShow(`<h4>Import wallet · preview</h4><p class=mute>File exported ${esc(fmtD?fmtD(String(o.exported_at).slice(0,10))||'':'')}. Nothing has changed yet.</p><table class=vt data-wxprev><tr><th class=l>Section</th><th>In file</th><th>On this device</th></tr>${cs.map(([l,n],i)=>`<tr><td class=l>${l}</td><td>${n}</td><td>${cur[i][1]}</td></tr>`).join('')}</table><p><button type=button class=btn data-wxmode=merge>Merge</button> <button type=button class=btn data-wxmode=replace>Replace</button> <button type=button class=lnk data-wxx>Cancel</button></p><p class=mute>Merge keeps everything on this device and adds the file’s holdings; when both have the same holding, the newer one wins. Replace swaps this device’s wallet for the file’s.</p>`)}
 catch(err){WX.data=null;wxMsg(err.message||'Could not read that file. Nothing was imported.',1)}btn.disabled=false});

/* Points (left column, ◆): your active points programs (STO.wallet.points, balances, value) on top, then the program catalogue (D.pts from Database/datasets/points-programs.csv + points-transfers.csv), yours first. */
const ptsN=n=>String(n||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/^amex\b/,'american express').replace(/[^a-z0-9+]+/g,' ').trim(),PTS=D.pts||[],ptsBy=n=>{const l=ptsN(n);return PTS.find(p=>ptsN(p.n)==l||p.id==String(n).toLowerCase())||PTS.find(p=>ptsN(p.n).startsWith(l)||l.startsWith(ptsN(p.n)))||null};
const ptsVal=x=>{const p=ptsBy(x.i);return p&&p.cpp!=null&&x.bal!=null?x.bal*p.cpp/100:null};
function renderPoints(){const v=$('#view'),mine=new Set((STO.wallet.points||[]).map(x=>(ptsBy(x.i)||{}).id)),L=[...PTS].sort((a,b)=>mine.has(b.id)-mine.has(a.id)||(b.cpp??-1)-(a.cpp??-1)||a.n.localeCompare(b.n));
 v.innerHTML=skel('Points','Your programs: balance × estimated cents per point. Catalogue: every program, its estimated value per point, where you earn and where you can transfer.',[['Your programs',(STO.wallet.points||[]).length],['Your est. value',$$((STO.wallet.points||[]).reduce((t,x)=>t+(ptsVal(x)||0),0))],['Programs on record',PTS.length],['Transfer routes',PTS.reduce((t,p)=>t+p.tx.length,0)]],
 `<section class=psec data-progs>${pwSec(['points','Your programs'])}</section><div><h3 class=ptscat>All programs</h3><table class=vt data-ptstable><tr><th class=l>Program</th><th class=l>Type</th><th>Est. value</th><th class=l>Earn from</th><th class=l>Transfers to</th></tr>${L.map(p=>`<tr data-pts="${esc(p.id)}"><td class=l><b>${esc(p.n)}</b>${mine.has(p.id)?' <i class=phld>✓ yours</i>':''}<br><small class=mute>${esc(p.op)}</small></td><td class=l>${esc(p.type)}</td><td>${p.cpp!=null?`<b>${p.cpp.toFixed(2)}¢</b>${ip(esc(p.cppm||''))}`:'<span class=q title="No sourced estimate yet">—</span>'}</td><td class=l><small>${esc((p.earn||'').replace(/not_stated/g,'').replace(/[;,]\s*$/,''))||'—'}</small></td><td class=l><small>${p.tx.length?p.tx.map(t=>`${esc(t.n)} <span class=mute>${esc(t.rate)}</span>`).join('<br>'):'—'}</small></td></tr>`).join('')}</table></div>`,'')}
document.addEventListener('change',e=>{const k=e.target.dataset.ptbal;if(k==null)return;const x=(STO.wallet.points||[]).find(r=>r.i==k);if(!x)return;x.bal=e.target.value===''?null:Math.max(0,+e.target.value);STO.wallet.updated_at=NOW();saveS();setTimeout(render,0)});/* deferred: change can fire from blur, and replacing the blurring node mid-event throws */


document.addEventListener('submit',e=>{const f=e.target.closest('[data-wadd]');if(!f)return;e.preventDefault();wAdd(f.dataset.wadd,f.v.value)});
document.addEventListener('click',e=>{const r=e.target.closest('[data-wrm][data-wk]');if(r){e.stopImmediatePropagation();wRm(r.dataset.wrm,r.dataset.wk);return}/* card tiles carry data-wrm=<card id> without data-wk; the card handler owns those */const g=e.target.closest('[data-gow]');if(g){st.pl=g.dataset.gow;st.s='wfolder';st.card=null;render();return}
 if(e.target.closest('[data-exp]')){const b=new Blob([JSON.stringify(STO,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pertheterms-my-data-'+NOW().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2e3)}});
document.addEventListener('change',e=>{if(!e.target.matches('[data-imp]'))return;const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const o=JSON.parse(t);if(!o||!o.wallet)throw 0;STO=migS(o);W.cards=STO.wallet.cards.map(x=>x.id);W.spend={...STO.wallet.spend};saveS();render();alert('Imported')}catch(_){alert('Not a PerTheTerms export')}})});
VIEWS.profile=renderProfile;VIEWS.wallet=renderWallet;VIEWS.subscriptions=renderSubscriptions;VIEWS.points=renderPoints;VIEWS.pyt=renderPyt;
// ---- Presets: ready-made screens, shareable as #preset/<id> ----
/* per-line config read by the shared shell (super banner #pl, sub banner #tabs, filter panel, table). Super label: PLINES_ALL (bank.js). Sub-tabs, their columns and their filters: the line's tab defs (cards: S, via tabs()). Presets: pre(). A new line adds its entry here and its own tab defs; the shell code does not change. */
const LINECFG={cards:{tabs:()=>CTABS(),pre:()=>PRE}},PRESETS=(pl=st.pl||'cards')=>(LINECFG[pl]?.pre||(()=>[]))();
const PRE=[{id:'no-fee-cash-back',n:'Best no-fee cash back',s:'ov',f:{fee:'$0/yr',rt:'Cash back'},sort:'other'},
 {id:'top-grocery',n:'Top grocery',s:'rw',f:{},sort:'r_groc'},
 {id:'no-fx-travel',n:'No FX fee travel',s:'rw',f:{fx:'None (0%)'},sort:'r_trav'},
 {id:'business',n:'Business cards',s:'ov',f:{acct:'Business'},sort:'best'},
 {id:'apply-by-soon',n:'Apply by soon',s:'perks',f:{soon:'Within 30 days'},sort:'odl',dir:1}];
function presetState(p){const f={};for(const[id,l]of Object.entries(p.f)){const i=FI[id]?.o.findIndex(x=>x[0]==l);if(i>=0)f[id]=i}return{s:p.s,f,q:'',sort:p.sort,dir:p.dir||-1,card:null}}
const curPre=()=>PRESETS().find(p=>{const x=presetState(p);return x.s==st.s&&x.sort==st.sort&&x.dir==st.dir&&!st.q&&JSON.stringify(x.f)==JSON.stringify(Object.fromEntries(Object.entries(st.f).sort()))&&Object.keys(x.f).length==Object.keys(st.f).length})?.id;
COL.ptt=['PTT Score','',c=>c.ptt.v,c=>`<span class="band b${c.ptt.band[0]}">${c.ptt.band}</span> <b>$${c.ptt.v}</b>${c.ptt.u?`<span class=mute title="At least this much: ${c.ptt.u} coverage(s) unverified">*</span>`:''}<span class=mute>/yr</span>`];
const FMTD=d=>MON[+d.slice(5,7)-1]+' '+(+d.slice(8,10));/* 'YYYY-MM-DD' -> 'Oct 28' */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],dfmt=d=>d?MON[+d.slice(5,7)-1]+' '+(+d.slice(8,10)):'';
COL.tpo=['Sign-up bonus','',c=>c.tpo[0]?.a,c=>c.tpo.length?`<span class=ofr tabindex=0 role=button aria-haspopup=dialog data-tpo="${C.indexOf(c)}">$${c.tpo[0].a.toLocaleString()} · ${esc(c.tpo[0].s)}${new Set(c.tpo.map(x=>x.s)).size>1?` <span class=mute>+${new Set(c.tpo.map(x=>x.s)).size-1}</span>`:''}</span>`:''];
function tpoHTML(c){return `<b>${esc(c.n)}</b> <span class=mute>· extra sign-up rewards from third-party sites</span><table>${c.tpo.map(o=>`<tr><th>${esc(o.s)}</th><td><b>$${o.a.toLocaleString()}</b> ${esc(o.fm||'')}${o.x?' · expires '+esc(o.x):''} · checked ${dfmt(o.f)} <span class=t>${esc(o.tag||'')}</span>${o.c?`<div class=mute style="margin-top:2px">${esc(o.c.length>260?o.c.slice(0,260)+'…':o.c)}</div>`:''}${o.u?`<div><a href="${esc(o.u)}" target=_blank rel=noopener>${esc(o.u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])}</a></div>`:''}</td></tr>`).join('')}</table>`}
function ofrHTML(c){const parts=c.offer.split(/;\s+|\s\+\s/).filter(Boolean),fyf={WAIVED:'Waived',FREE:'Free',REBATED:'Rebated',NOT_PART_OF_OFFER:'Not part of the offer'}[c.pro.fyf]||c.pro.fyf;
 return `<b>${esc(c.n)}</b><table>${parts.length>1?parts.map((p,i)=>`<tr><th>${i?'Then':'Offer'}</th><td>${esc(p)}</td></tr>`).join(''):`<tr><th>Offer</th><td>${esc(c.offer)}</td></tr>`}
 ${c.pro.spend?`<tr><th>Spend / window</th><td>${esc(c.pro.spend)}</td></tr>`:''}${fyf?`<tr><th>First-year fee</th><td>${esc(fyf)}${c.pro.fyfm?' · '+esc(c.pro.fyfm):''}</td></tr>`:''}
 <tr><th>Ends</th><td>${c.odl&&c.odl!='ONGOING'?esc(c.odl)+soonB(c):'No end date published'}</td></tr><tr><th>Source</th><td><span class=t>${c.url?'CITED':'REPORTED'}</span> issuer page, captured ${esc(c.pro.d||c.snap)}</td></tr></table>`}
/* v3.3.2 generic truncated-cell popover: any ellipsis cell (td.nm, .ell) whose text overflows, plus text cut in JS (.trc[data-tfull]) */
const OSEL='[data-ofr],[data-tpo],[data-trc]';
function trcText(el){if(el.dataset.tfull)return el.dataset.tfull;return (el.innerText||el.textContent).replace(/ⓘ/g,'').replace(/\s*\n\s*/g,' · ').replace(/\s+/g,' ').trim().replace(/^(· )+|( ·)+$/g,'')}
function trcHTML(el){return `<div class=trcp>${esc(trcText(el))}</div>`}
function trcScan(){document.querySelectorAll('td.nm,td.ell,th.ell').forEach(td=>{if(td.closest('#ofp'))return;const t=td.scrollWidth>td.clientWidth+1;if(t&&td.dataset.trc==null){td.dataset.trc='';if(!td.hasAttribute('tabindex'))td.tabIndex=0;td.classList.add('trcd')}else if(!t&&td.dataset.trc!=null){delete td.dataset.trc;td.removeAttribute('tabindex');td.classList.remove('trcd')}})}
let trcR=0;const trcQ=()=>{if(!trcR)trcR=requestAnimationFrame(()=>{trcR=0;trcScan()})};
new MutationObserver(m=>{if(m.some(x=>!(x.target.closest&&x.target.closest('#ofp'))))trcQ()}).observe(document.body,{childList:true,subtree:true});
addEventListener('resize',trcQ);
let ofrI=null;const ofrShow=el=>{const p=$('#ofp');p.innerHTML=el.dataset.trc!=null?trcHTML(el):el.dataset.tpo!=null?tpoHTML(C[el.dataset.tpo]):ofrHTML(C[el.dataset.ofr]);p.hidden=false;const r=el.getBoundingClientRect(),w=Math.min(380,innerWidth-16);p.style.width=w+'px';
 p.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';const top=r.bottom+6;p.style.top=(top+p.offsetHeight>innerHeight?Math.max(8,r.top-p.offsetHeight-6):top)+'px';ofrI=el;ofrT=Date.now()};let ofrT=0;
const ofrHide=()=>{$('#ofp').hidden=true;ofrI=null};
document.addEventListener('pointerover',e=>{if(e.pointerType!='mouse')return;const o=e.target.closest(OSEL);if(o)ofrShow(o);else if(ofrI&&!e.target.closest('#ofp'))ofrHide()});
document.addEventListener('focusin',e=>{const o=e.target.closest(OSEL);if(o&&(o.dataset.trc==null||e.target==o))ofrShow(o)});document.addEventListener('focusout',e=>{if(e.target.closest(OSEL))ofrHide()});
document.addEventListener('keydown',e=>{if(e.key=='Escape')ofrHide()});addEventListener('scroll',()=>{if(ofrI&&Date.now()-ofrT>300)ofrHide()},true);
const NUNK=c=>INS.filter(([k])=>c.ins[k]==null).length;
COL.covT=['Covers','',c=>insN(c,INS_T)*100-insU(c,INS_T),c=>`<b>${insN(c,INS_T)}</b><span class=mute>/${INS_T.length}</span>${insU(c,INS_T)?` <span class=mute title="${insU(c,INS_T)} coverage(s) not verified">(+${insU(c,INS_T)} ?)</span>`:''}`];
COL.covP=['Covers','',c=>insN(c,INS_P)*100-insU(c,INS_P),c=>`<b>${insN(c,INS_P)}</b><span class=mute>/${INS_P.length}</span>${insU(c,INS_P)?` <span class=mute title="${insU(c,INS_P)} coverage(s) not verified">(+${insU(c,INS_P)} ?)</span>`:''}`];
COL.cov=['Covers','',c=>c.nins*100-NUNK(c),c=>`<b>${c.nins}</b>${NUNK(c)?` <span class=mute title="${NUNK(c)} coverage(s) not verified">(+${NUNK(c)} ?)</span>`:''}`];
const FI={};S.forEach(s=>s.f.forEach(([id,l,o])=>FI[id]={s,l,o}));
let st={pl:'home',s:'ov',f:{},q:'',sort:null,dir:-1};
const BYID={};C.forEach((c,i)=>BYID[c.id]=i);const BYID0=BYID;
function route(){const h=decodeURIComponent(location.hash.slice(1));st.card=null;
 if(h=='premium'){st.s='premium';return}
 if(h.startsWith('preset/')){const p=PRESETS('cards').find(p=>p.id==h.slice(7));if(p)Object.assign(st,presetState(p),{pl:'cards'});return}
 if(h.startsWith('card/')){const i=BYID[h.slice(5)];if(i!=null)st.card=C[i].id;return}
 try{Object.assign(st,JSON.parse(h))}catch(e){}}
if(!location.hash&&STO.screen)Object.assign(st,STO.screen,{pl:'home',s:'ov',card:null});/* a plain visit always lands on Home; the saved filters wait in Credit Cards */
route();
const hashOf=()=>{if(st.card)return '#card/'+st.card;if(st.s=='premium')return '#premium';if(st.pl&&st.pl!='cards'){const{card,...r}=st;return '#'+encodeURIComponent(JSON.stringify(r))}const cp=curPre();if(cp)return '#preset/'+cp;const{card,...r}=st;return '#'+encodeURIComponent(JSON.stringify(r))};
// Safari throws after 100 history calls per 10 s; debounce and never let URL saving break rendering.
let saveT=0,navK=null;const NAVK=()=>JSON.stringify([st.pl,st.s,st.bs,st.wt,st.subt,st.card]);const doSave=()=>{const h=hashOf(),k=NAVK();saveS();try{if(location.hash!==h){if(navK!=null&&k!=navK)history.pushState(null,'',h);else history.replaceState(null,'',h)}}catch(e){}navK=k};
const save=()=>{clearTimeout(saveT);saveT=setTimeout(doSave,250)};addEventListener('pagehide',()=>{clearTimeout(saveT);doSave()});
const go=h=>{try{history.pushState(null,'',h)}catch(e){location.hash=h};route();render();window.scrollTo(0,0)};
window.addEventListener('popstate',()=>{route();navK=NAVK();render()});
function rows(){const q=st.q.toLowerCase();return C.filter(c=>LIVE(c)&&Object.entries(st.f).every(([id,i])=>FI[id]?(Array.isArray(i)?(!i.length||i.some(j=>FI[id].o[j]?.[1](c))):FI[id].o[i]?.[1](c)):true)&&(!q||(c.n+' '+c.i+' '+c.prog+' '+c.nw).toLowerCase().includes(q)))}
/* left column = the user side (Docs/naming.md): the same six items on every view, product tabs included. #tabs (sub-tabs) stays under the top tabs. */
const UNAV_ALL=[['profile','Profile'],['wallet','Accounts'],['subscriptions','Subscriptions'],['points','Points'],['pyt','Per Your Terms','Wallet optimization']];
const UNAV=CARDS_ONLY?UNAV_ALL.filter(u=>u[0]=='wallet'):UNAV_ALL;/* cards-only: Wallet is the one user page */
const USR=new Set([...UNAV.map(u=>u[0]),...(CARDS_ONLY?[]:['premium'])]);
const PL=new Set(PLINES.map(p=>p[0]));
const railOpen=()=>CARDS_ONLY?true:(STO.ui?.rail??true);/* the logo button toggles the left column: collapses/expands it (persisted in STO.ui.rail, open by default) */
function rail(){const el=$('#urail');if(!el)return;document.documentElement.style.setProperty('--hh',($('header')?.offsetHeight||56)+'px');const o=railOpen();
 const tb=$('#tabs'),cur=tb.querySelector('button.on'),vh=$('#vh'),TN=Object.fromEntries(PLINES);if(vh){vh.hidden=true;vh.textContent=''}/* no page title above the tables: the tabs say where you are */
 el.innerHTML=`<div class=rh>You</div>`+UNAV.map(([k,n,sub])=>{const on=st.s==k&&!st.card,pm=PREM.has(k);return `<button type=button data-s=${k} class="ri${on?' on':''}${pm?' prem':''}"${on?' aria-current=page':''}><span class=ril>${n}${pm?'<span class=premg role=img aria-label=Premium title=Premium>◆</span>':''}${sub?`<small>${sub}</small>`:''}</span></button>`}).join('');
 el.classList.toggle('open',o);document.body.classList.toggle('rail',o&&!CARDS_ONLY);const t=$('#rtog');if(t)t.setAttribute('aria-expanded',String(o));el.inert=!o}
if(CARDS_ONLY)document.body.classList.add('co');/* cards-only: no side column and no header Wallet button; Wallet is the first item of the Profile menu */
function togRail(){if(CARDS_ONLY){$('#logo')?.click();return}STO.ui={...(STO.ui||{}),rail:!railOpen()};saveS();rail()}
function render(){const fh0=$('#fhead');if(fh0)fh0.innerHTML='';/* a search always lives inside Credit Cards (Home never shows a results table without its tabs) */if(st.q&&st.pl=='home'){st.pl='cards';st.s=st.s||'ov'}render0();{/* Filters / Suggested / Reset sit above the panel and follow its visibility */const fh=$('#fhead'),f=$('#filters');if(fh)fh.hidden=!fh.innerHTML||f.hidden||f.style.display=='none';const ct=$('#ctl');if(ct)ct.hidden=st.pl=='home'||st.pl=='info'||!!st.card||USR.has(st.s)}rail();hero()}
/* Home story hero: four beats, a close, insurance tiles and the numbers that come from the database at build time (build_screener.py HERO_SQL → D.meta.hero). No number is typed here; the build fails if this block carries a digit. */
/*HERO-START*/
/* Home story: four beats and a close, one full-height section each. Every illustration is drawn here (no stock art, no third-party marks); colours are fixed on the navy hero so it reads the same in light and dark. */
const SHADE=k=>`<defs><linearGradient id=gA${k} x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#2f4a94"/><stop offset=1 stop-color="#15234b"/></linearGradient><linearGradient id=gB${k} x1=0 y1=0 x2=1 y2=0><stop offset=0 stop-color="#ff8a3d"/><stop offset=.5 stop-color="#ffd23f"/><stop offset=1 stop-color="#5ee0a0"/></linearGradient></defs>`;
const SIL={
 leak:`<svg class=sasvg viewBox="0 0 520 420" aria-hidden=true focusable=false><ellipse cx=250 cy=396 rx=170 ry=11 fill="rgba(0,0,0,.28)"/><g class="sanim sfloat"><path d="M130 40h170l60 60v260a14 14 0 0 1-14 14H130a14 14 0 0 1-14-14V54a14 14 0 0 1 14-14z" fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><path d="M300 40v60h60" fill="none" stroke="rgba(255,255,255,.5)" stroke-width=3 stroke-linejoin=round /><g stroke="rgba(255,255,255,.35)" stroke-width=6 stroke-linecap=round><path d="M150 80h110M150 110h160M150 140h140M150 170h160M150 260h150M150 290h120M150 320h140"/></g><rect x=144 y=196 width=180 height=40 rx=8 fill="rgba(94,224,160,.18)" stroke="#5ee0a0" stroke-width=3 /><path d="M158 216h120" stroke="#5ee0a0" stroke-width=6 stroke-linecap=round /></g>
<g class="sanim sbob"><circle cx=340 cy=230 r=62 fill="rgba(255,255,255,.08)" stroke="#ffd23f" stroke-width=8 /><path d="M384 274l62 62" stroke="#ffd23f" stroke-width=14 stroke-linecap=round /></g><g class="sanim sfall" style="animation-delay:-1s"><circle cx=440 cy=110 r=22 fill="#ffd23f" stroke="#ff8a3d" stroke-width=3 /><text x=440 y=118 text-anchor=middle font-size=22 font-weight=800 fill="#8a4a00">$</text><path d="M470 60l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/><path d="M60 150l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/></g></svg>`,
 hid:`<svg class=sasvg viewBox="0 0 520 420" aria-hidden=true focusable=false><ellipse cx=260 cy=396 rx=170 ry=11 fill="rgba(0,0,0,.28)"/><g class="sanim sfloat"><rect x=150 y=96 width=170 height=106 rx=14 fill="#3a7bff" transform="rotate(-16 235 300)"/><rect x=165 y=86 width=170 height=106 rx=14 fill="#ff8a3d" transform="rotate(-4 250 300)"/><rect x=180 y=86 width=170 height=106 rx=14 fill="#5ee0a0" transform="rotate(9 265 300)"/><rect x=120 y=200 width=280 height=170 rx=24 fill="#1b2a52" stroke="rgba(255,255,255,.45)" stroke-width=3 /><path d="M120 236h280" stroke="rgba(255,255,255,.25)" stroke-width=3 /><rect x=330 y=262 width=70 height=48 rx=12 fill="#24366a" stroke="rgba(255,255,255,.45)" stroke-width=3 /><circle cx=362 cy=286 r=8 fill="#ffd23f"/></g>
<g class="sanim sbob" fill="none" stroke-width=4 stroke-linecap=round stroke-linejoin=round><g stroke="#ffd23f"><circle cx=56 cy=110 r=34 fill="rgba(255,210,63,.12)"/><path d="M42 100h28l-4 18H46zM46 124h0M66 124h0"/></g><g stroke="#5ee0a0"><circle cx=460 cy=110 r=34 fill="rgba(94,224,160,.12)"/><path d="M444 116l32-14-10 22-6-6z"/></g><g stroke="#ff8a3d"><circle cx=56 cy=300 r=34 fill="rgba(255,138,61,.12)"/><path d="M46 288v24M46 300h8M66 288v24M60 288c0 8 12 8 12 0"/></g><g stroke="#8fb3ff"><circle cx=466 cy=300 r=34 fill="rgba(143,179,255,.12)"/><rect x=448 y=288 width=36 height=20 rx=5 /><circle cx=456 cy=312 r=3 /><circle cx=476 cy=312 r=3 /></g></g><g stroke="rgba(255,255,255,.35)" stroke-width=2 stroke-dasharray="4 6" fill="none"><path d="M90 116C130 130 150 150 170 190"/><path d="M426 116C390 130 370 150 350 190"/><path d="M90 296h30"/><path d="M432 296h-32"/></g></svg>`,
 open:`<svg class=sasvg viewBox="0 0 520 420" aria-hidden=true focusable=false>${SHADE('open')}<g class="sanim sfloat"><g transform="rotate(-8 170 90)"><path d="M70 40h170l-34 100H70a22 22 0 0 1-22-22V62a22 22 0 0 1 22-22z" fill="url(#gAopen)" stroke="rgba(157,184,255,.8)" stroke-width=3 /><rect x=70 y=74 width=52 height=12 rx=3 fill="rgba(255,213,63,.9)"/></g><g transform="rotate(7 380 90)"><path d="M290 40h150a22 22 0 0 1 22 22v56a22 22 0 0 1-22 22H256z" fill="url(#gAopen)" stroke="rgba(157,184,255,.8)" stroke-width=3 /><circle cx=424 cy=108 r=11 fill="rgba(255,138,61,.85)"/><circle cx=406 cy=108 r=11 fill="rgba(255,213,63,.85)"/></g></g>
  <path d="M232 112l-14 52h86l-18-52z" fill="url(#gBopen)" opacity=.55 /><g class="sanim sfloat" style="animation-delay:-3s"><rect x=60 y=172 width=300 height=214 rx=18 fill="#0f1a3a" stroke="#9db8ff" stroke-width=3 /><rect x=60 y=172 width=300 height=40 rx=18 fill="rgba(157,184,255,.2)"/><rect x=80 y=187 width=90 height=10 rx=5 fill="rgba(255,255,255,.7)"/>
  <g fill="none" stroke="#5ee0a0" stroke-width=3.5 stroke-linecap=round stroke-linejoin=round><circle cx=88 cy=240 r=11 /><path d="M83 240l4 4 7-8"/><circle cx=88 cy=282 r=11 /><path d="M83 282l4 4 7-8"/><circle cx=88 cy=324 r=11 /><path d="M83 324l4 4 7-8"/><circle cx=88 cy=366 r=11 /><path d="M83 366l4 4 7-8"/></g>
  <g fill="rgba(255,255,255,.35)"><rect x=112 y=235 width=88 height=10 rx=5 /><rect x=112 y=277 width=104 height=10 rx=5 /><rect x=112 y=319 width=76 height=10 rx=5 /><rect x=112 y=361 width=96 height=10 rx=5 /></g><g fill="url(#gBopen)"><rect x=250 y=235 width=84 height=10 rx=5 /><rect x=250 y=277 width=62 height=10 rx=5 /><rect x=250 y=319 width=72 height=10 rx=5 /><rect x=250 y=361 width=54 height=10 rx=5 /></g></g>
  <g class="sanim sfloat" style="animation-delay:-5s"><path d="M388 236h58l26 26v94a8 8 0 0 1-8 8H388a8 8 0 0 1-8-8V244a8 8 0 0 1 8-8z" fill="#14214a" stroke="#ffd23f" stroke-width=3 /><path d="M446 236v26h26" fill="none" stroke="#ffd23f" stroke-width=3 /><g stroke="rgba(255,255,255,.4)" stroke-width=4 stroke-linecap=round><path d="M396 286h60M396 304h48M396 322h56"/></g></g><path d="M334 282c26 0 34-8 46-8" fill="none" stroke="#ffd23f" stroke-width=3 stroke-dasharray="4 7" stroke-linecap=round /></svg>`,
 adv:`<svg class=sasvg viewBox="0 0 520 420" aria-hidden=true focusable=false>${SHADE('adv')}<path d="M50 366h430" stroke="rgba(255,255,255,.35)" stroke-width=3 stroke-linecap=round /><g class="sanim sfloat">
  <rect x=78 y=262 width=48 height=104 rx=8 fill="none" stroke="rgba(255,255,255,.55)" stroke-width=3 /><rect x=134 y=170 width=48 height=196 rx=8 fill="url(#gBadv)"/>
  <rect x=236 y=292 width=48 height=74 rx=8 fill="none" stroke="rgba(255,255,255,.55)" stroke-width=3 /><rect x=292 y=214 width=48 height=152 rx=8 fill="url(#gBadv)"/>
  <rect x=394 y=316 width=48 height=50 rx=8 fill="none" stroke="rgba(255,255,255,.55)" stroke-width=3 /><rect x=450 y=252 width=48 height=114 rx=8 fill="url(#gBadv)"/>
  <g fill="rgba(255,210,63,.1)" stroke="#ffd23f" stroke-width=2.5 stroke-dasharray="5 6"><rect x=78 y=170 width=48 height=92 rx=8 /><rect x=236 y=214 width=48 height=78 rx=8 /><rect x=394 y=252 width=48 height=64 rx=8 /></g></g>
  <g fill="none" stroke="#9db8ff" stroke-width=3 stroke-linecap=round stroke-linejoin=round><path d="M90 386h24l-3 14h-18zM96 386l5-9h6l5 9"/><circle cx=260 cy=392 r=9 /><path d="M240 384v16M244 384v6M236 384v6M280 384v16"/><path d="M418 378c-10 10-12 17-2 25 10-8 12-15 2-25z" /></g>
  <g class="sanim sbob"><path d="M58 216l66-70 36 32 96-92" fill="none" stroke="#5ee0a0" stroke-width=7 stroke-linecap=round stroke-linejoin=round /><path d="M228 84h30v30" fill="none" stroke="#5ee0a0" stroke-width=7 stroke-linecap=round stroke-linejoin=round /></g>
  <g class="sanim sfloat" style="animation-delay:-2s"><circle cx=392 cy=170 r=24 fill="#ffd23f" stroke="#ff8a3d" stroke-width=3 /><text x=392 y=178 text-anchor=middle font-size=24 font-weight=800 fill="#8a4a00">$</text><rect x=346 y=52 width=132 height=34 rx=17 fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.4)" stroke-width=2 /><text x=412 y=75 text-anchor=middle font-size=15 font-weight=800 letter-spacing=1.5 fill="#ffd23f">ESTIMATE</text></g></svg>`,
 end:`<svg class=sasvg viewBox="0 0 520 420" aria-hidden=true focusable=false>${SHADE('end')}<ellipse cx=260 cy=396 rx=180 ry=11 fill="rgba(0,0,0,.28)"/><g class="sanim sfloat"><g transform="rotate(-9 270 160)"><rect x=150 y=70 width=250 height=156 rx=18 fill="url(#gBend)"/><rect x=170 y=110 width=48 height=34 rx=6 fill="rgba(10,16,32,.5)"/><rect x=170 y=176 width=120 height=10 rx=5 fill="rgba(10,16,32,.5)"/></g><rect x=90 y=150 width=340 height=216 rx=30 fill="url(#gAend)" stroke="rgba(157,184,255,.75)" stroke-width=3 /><rect x=350 y=224 width=108 height=72 rx=20 fill="#0f1a3a" stroke="#9db8ff" stroke-width=3 /><circle cx=394 cy=260 r=11 fill="#ffd23f"/><circle cx=176 cy=296 r=34 fill="#5ee0a0"/><path d="M160 296l11 12 22-26" fill="none" stroke="#0a1020" stroke-width=7 stroke-linecap=round stroke-linejoin=round /></g></svg>`};
function heroHTML(){const h=D.meta.hero.v,n=x=>x.toLocaleString('en-CA');
 const B=(id,t,sub,art,extra)=>`<section class=sbeat data-beat=${id} aria-labelledby=hb-${id}><div class=sin><div class="stx sfade">${t}<p class=ssub>${sub}</p>${extra||''}</div><div class="sart sfade" aria-hidden=true>${art}</div></div><button type=button class=scue data-snext aria-label=Next><svg viewBox="0 0 24 24" aria-hidden=true focusable=false><path d="M6 9l6 6 6-6"/></svg></button></section>`;
 return `${B('leak',`<h1 class=sh id=hb-leak>It pays to read the terms.</h1>`,`Bonuses you never claimed. Perks you never used. Rewards you never earned. Coverage you never knew you had.`,SIL.leak)}
 ${B('open',`<h2 class=sh id=hb-open><b class=hn title="${n(h.datapoints)} values on file">${n(h.dp_floor)}</b>+ data points, <em>traced to its source.</em></h2>`,`Every account linked to its perks, insurance, earn rates and sources.`,SIL.open)}
 ${B('hid',`<h2 class=sh id=hb-hid>The best wallet, tailored to your <em>lifestyle.</em></h2>`,`How you shop, travel, eat, commute, save and invest decides which account benefits you the most. We match the accounts to the way you live.`,SIL.hid)}
 ${B('adv',`<h2 class=sh id=hb-adv>Now it's your <em>unfair advantage.</em></h2>`,`Set your spend, see the best account per category and what you leave behind.`,SIL.adv,`<div class=hcta><button type=button class="btn hline" data-hgo=wallet>Build your wallet</button></div>`)}
 <section class="sbeat send" data-beat=end aria-labelledby=hb-end><div class="sin"><div class="stx sfade"><h2 class=sh id=hb-end>Same spend. <em>Smarter wallet.</em></h2><div class=hcta><button type=button class="btn hfill" data-hgo=table>Open Credit Cards</button></div></div><div class="sart sfade" aria-hidden=true>${SIL.end}</div></div></section>`}
/*HERO-END*/

/* Home story: parts fade in as they scroll into view. Without IntersectionObserver or under prefers-reduced-motion nothing is hidden, so everything is simply visible. */
/* Story arrows: each panel but the last has a Next button that scrolls to the following panel (instant under reduced motion). */
document.addEventListener('click',e=>{const b=e.target.closest('[data-snext]');if(!b)return;const n=b.closest('.sbeat')?.nextElementSibling;if(n)n.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})});
function storyInit(){const el=$('#hero');if(!el||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;el.classList.add('sjs');const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.2});el.querySelectorAll('.sfade').forEach(b=>io.observe(b))}
function hero(){const el=$('#hero');if(!el)return;const on=st.pl=='home'&&!st.card&&!USR.has(st.s);el.hidden=!on;if(on&&!el.dataset.r){el.innerHTML=heroHTML();el.dataset.r='1';storyInit()}}
document.addEventListener('click',e=>{const g=e.target.closest('[data-hgo]');if(g){e.preventDefault();if(g.dataset.hgo=='wallet'){if(st.pl=='info'||st.pl=='home')st.pl='cards';st.s='wallet';st.card=null}else{st.pl='cards';st.s=g.dataset.hgo=='ins'?'ins':'ov';if(st.s=='ins')st.g={...(st.g||{}),ins:'trv'};st.card=null}render();scrollTo(0,0);return}});
const HTAG={CITED:'Checked against a primary source we archived.',ESTIMATE:'Derived by us from cited inputs; method shown.',REPORTED:'From a third party or an account record; not confirmed in a primary source.'};
/* Footer pages (About, Methodology, Privacy, Terms of use, Disclaimer, Advertiser disclosure, Contact): plain pages at #{"pl":"info","s":<id>}. Short, honest copy; nothing here claims an address, a registration or a contact channel that does not exist. */
const INFOP={about:['About',`<p>PerTheTerms compares Canadian financial accounts by what their terms actually say: fees, earn rates, welcome offers, perks and insurance, set out in one consistent set of fields.</p><p>Each figure is linked to the document it came from, so you can check it yourself.</p>`],
 method:['Methodology',`<p>Figures are read from issuer documents and pages that we archive, then entered into one consistent set of fields. Every figure carries one of three tags:</p><dl class=infodl>${['CITED','ESTIMATE','REPORTED'].map(k=>`<dt><span class=htag>${k}</span></dt><dd>${HTAG[k]}</dd>`).join('')}</dl><p>Where a value is unknown or not yet checked, the cell shows a dash rather than a guess. Each account page lists its sources with the date they were retrieved.</p><p>Wallet figures are estimates: they combine the spend you enter with the published earn rates and fees.</p>`],
 privacy:['Privacy Policy',`<!-- Draft, pending legal review. --><p class=infoup>Last updated: October 29, 2026</p><p>This Privacy Policy explains how PerTheTerms (operated by [TODO: legal entity name], “we”, “us”) handles personal information on pertheterms.com (the “Site”). We follow the principles of Canada’s Personal Information Protection and Electronic Documents Act (PIPEDA).</p><h2>What we collect</h2><p>The Site has no sign-up, no login and no forms that send information to us. We do not ask for your name, email address or financial account numbers.</p><h2>What stays on your device</h2><ul><li>Your wallet (the accounts you add), the spend amounts you enter, saved filters and display settings such as the light or dark theme are stored in your browser’s local storage and session storage on your device.</li><li>This information is not sent to us or to anyone else. We cannot see it.</li><li>You can export your accounts list from the Accounts page. You can delete everything at any time by clearing this Site’s data in your browser settings.</li></ul><h2>Cookies, analytics and advertising</h2><p>The Site does not set cookies, does not run analytics or advertising scripts, and does not use tracking pixels. Its pages, data file and images are served from this domain only.</p><h2>Hosting and server logs</h2><p>The Site is hosted on GitHub Pages. When your browser requests a page, GitHub may record technical information such as your IP address, browser type and the time of the request, as standard web-server logs. GitHub handles that information under its own privacy statement. We do not receive or use those logs to identify you.</p><h2>Links to other sites</h2><p>The Site links to issuer and third-party websites. When you follow a link, that website’s own privacy practices apply. We are not responsible for them.</p><h2>Your rights</h2><p>Because we do not collect personal information about you, we generally hold none to access, correct or delete. If you believe we hold information about you, or you have a question or complaint about privacy, contact us using the details below. You may also contact the Office of the Privacy Commissioner of Canada.</p><h2>Children</h2><p>The Site is not directed to children and we do not knowingly collect information from them.</p><h2>Changes to this policy</h2><p>If our practices change, for example if we add a contact form, analytics or accounts, we will update this policy and the date above before the change takes effect.</p><h2>Contact</h2><p>Privacy questions: [TODO: contact email]. Mail: [TODO: legal entity name], [TODO: mailing address].</p>`],
 terms:['Terms of Use',`<!-- Draft, pending legal review. --><p class=infoup>Last updated: October 29, 2026</p><p>These Terms of Use govern your use of pertheterms.com (the “Site”), operated by [TODO: legal entity name] (“PerTheTerms”, “we”, “us”). By using the Site you agree to these terms. If you do not agree, please do not use the Site.</p><h2>Information only</h2><p>The Site compares Canadian financial accounts using information taken from issuer documents and other sources. It is provided for general information only. It is not financial, legal, tax or insurance advice, and it is not an offer, solicitation or recommendation to apply for, keep or cancel any product.</p><h2>Accuracy and timeliness</h2><p>Issuers change their terms, fees, rates and offers, often without notice. We work to keep information accurate and to show the date and source of each figure, but we do not guarantee that any information on the Site is complete, current or free of errors. Always confirm the current terms with the issuer before you make a decision.</p><h2>No warranty</h2><p>The Site and its content are provided “as is” and “as available”, without warranties of any kind, express or implied, including warranties of accuracy, fitness for a particular purpose and non-infringement, to the fullest extent permitted by law.</p><h2>Limitation of liability</h2><p>To the fullest extent permitted by law, PerTheTerms and its operators will not be liable for any direct, indirect, incidental, consequential or special loss or damage arising from your use of, or reliance on, the Site or its content, including any decision you make about a financial product. Nothing in these terms limits liability that cannot be limited under applicable law.</p><h2>Estimates and tools</h2><p>Wallet figures and other values tagged ESTIMATE are our calculations from the inputs you provide and published terms. They are illustrations, not promises of what you will earn, pay or receive.</p><h2>Third-party links and trademarks</h2><p>The Site links to websites we do not control; we are not responsible for their content or practices. Product names, card names, logos and trademarks belong to their respective owners. Their use on the Site is for identification only and does not imply endorsement by, or affiliation with, those owners.</p><h2>Acceptable use</h2><p>Do not use the Site in a way that breaks the law, interferes with its operation, or copies its content in bulk for redistribution without our permission.</p><h2>Changes to these terms</h2><p>We may update these terms from time to time. The date above shows when they last changed. Continuing to use the Site after a change means you accept the updated terms.</p><h2>Governing law</h2><p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there. The courts of Ontario have exclusive jurisdiction over any dispute about these terms or the Site.</p><h2>Contact</h2><p>[TODO: contact email]. Mail: [TODO: legal entity name], [TODO: mailing address].</p>`],
 disclaimer:['Disclaimer',`<!-- Draft, pending legal review. --><p class=infoup>Last updated: October 29, 2026</p><h2>Not advice</h2><p>PerTheTerms provides general information about Canadian financial accounts. Nothing on the Site is financial, legal, tax or insurance advice, and nothing is a recommendation to open, keep or close any account. Consider your own circumstances and, where appropriate, speak with a qualified professional.</p><h2>Check with the issuer</h2><p>Terms, fees, interest rates, rewards and welcome offers change, and the issuer’s current documents always take precedence over the Site. Confirm every detail with the issuer before you apply.</p><h2>Insurance summaries</h2><p>Insurance information on the Site is a short summary of coverage described in issuer documents. It is not the policy wording. Coverage, limits, eligibility and exclusions are set only by the certificate or policy issued by the insurer; read it before you rely on any coverage.</p><h2>How figures are tagged</h2><p>Every figure on the Site carries one of three tags:</p><dl class=infodl>${['CITED','ESTIMATE','REPORTED'].map(k=>`<dt><span class=htag>${k}</span></dt><dd>${HTAG[k]}</dd>`).join('')}</dl><p>A dash means the value is unknown or not yet checked; we do not guess.</p><h2>Errors</h2><p>We correct errors when we find them. If you spot one, please tell us at [TODO: contact email].</p>`],
 ads:['Advertiser Disclosure',`<!-- Draft, pending legal review. --><p class=infoup>Last updated: October 29, 2026</p><h2>How PerTheTerms is paid</h2><p>PerTheTerms does not currently receive payment from any issuer or advertiser. There are no paid placements, sponsored listings or affiliate commissions on the Site today.</p><h2>How results are ordered</h2><p>The order of results comes from the filters and sort you choose and from the published terms of each account. It is not influenced by any payment or relationship with an issuer.</p><h2>Links</h2><p>Some links go to an issuer’s public landing page, and the issuer’s own address may include tracking or campaign codes. Those codes belong to the issuer or its partners; we do not earn anything when you use them.</p><h2>If this changes</h2><p>If PerTheTerms ever earns compensation from a listed company, this page will say so before it starts, and the affected listings or links will be clearly marked. Compensation will not change how accounts are ranked or what the figures say.</p>`],
 contact:['Contact',`<p>Coming soon.</p>`]};
const INFOK=Object.keys(INFOP),TITLE0=document.title;
function renderInfo(){const[t,b]=INFOP[st.s]||INFOP.about;['#pre','#page','.wrap','#bar','#filters','#fhead','#grp','#vh'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#tabs').innerHTML='';const v=$('#view');v.hidden=false;v.innerHTML=`<article class=infopg aria-labelledby=infoh><h1 id=infoh>${t}</h1>${b}</article>`;document.title=t+' · PerTheTerms'}
document.addEventListener('click',e=>{const a=e.target.closest('[data-info]');if(a){e.preventDefault();st.pl='info';st.s=a.dataset.info;st.card=null;render();scrollTo(0,0)}});
function render0(){if(st.pl=='info'){if(!INFOK.includes(st.s))st.s='about';$('#grp').hidden=true;syncLabels();save();return renderInfo()}if(document.title!==TITLE0)document.title=TITLE0;$('#grp').hidden=true;$('#grp').innerHTML='';if(st.s=='trv'||st.s=='prot'){st.g={...(st.g||{}),ins:st.s};st.s='ins'}if(!PL.has(st.pl))st.pl='cards';if(!USR.has(st.s)&&!(S.some(s=>s.id==st.s)&&!HIDE.has(st.s)&&!SUBONLY.has(st.s)&&(!CTV()||CTV().includes(st.s)||st.s=='wfolder')))st.s='ov';syncLabels();save();BANK.bar();
 if(st.card&&st.pl=='home')st.pl='cards';
 if(st.pl=='home'&&!st.card&&!USR.has(st.s)){['#pre','#page','.wrap','#bar','#filters','#view'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#tabs').innerHTML='';return}
 if(!st.card&&!USR.has(st.s)&&(st.pl=='broker'||st.pl=='tel')){['#pre','#page','.wrap','#bar','#filters'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#view').hidden=false;$('#tabs').innerHTML=LTABS(st.pl);return renderLine(st.pl)}
 if(st.pl=='cards'&&st.s=='prom'&&!st.card){['#pre','#page','.wrap','#bar','#filters'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#view').hidden=false;$('#tabs').innerHTML=LINECFG.cards.tabs().map(s=>`<button data-s="${s.id}" class="${s.id==st.s?'on':''}">${s.name}</button>`).join('');return renderPromos('cards')}
 if(st.pl=='bank'&&!st.card&&!USR.has(st.s))return BANK.render();const scr=S.find(s=>s.id==GKEY());
 const pg=!!st.card,vw=!pg&&VIEWS[st.s];$('#pre').hidden=pg||!!vw;$('#page').hidden=!pg;$('#view').hidden=!vw;$('.wrap').hidden=pg||!!vw;$('#bar').hidden=pg||!!vw;$('#filters').hidden=pg||!!vw;
 if(vw){$('#tabs').innerHTML='';return vw()}
 if(pg){closeM();$('#tabs').innerHTML=LINECFG.cards.tabs().map(s=>`<button data-s="${s.id}">${s.name}</button>`).join('');return renderCard(C[BYID[st.card]])}
 $('#tabs').innerHTML=LINECFG.cards.tabs().map(s=>{const k=s.f.filter(f=>st.f[f[0]]!=null).length;return`<button data-s="${s.id}" class="${s.id==st.s?'on':''}">${s.name}${k?`<span class=dot>${k}</span>`:''}</button>`}).join('');
 if(GROUPS[st.s]){const gk=GKEY();$('#grp').hidden=false;$('#grp').setAttribute('aria-label',(S.find(x=>x.id==st.s)||{}).name+' view');$('#grp').innerHTML=GROUPS[st.s].map(([id,n])=>`<button type=button data-g="${id}" class="${id==gk?'on':''}"${id==gk?' aria-current=true':''}>${n}${(()=>{const k=S.find(x=>x.id==id).f.filter(f=>st.f[f[0]]!=null).length;return k?`<span class=dot>${k}</span>`:''})()}</button>`).join('')}
 $('#filters').innerHTML=scr.f.map(([id,l,o,m])=>m?`<label>${l}<details class="ms ${st.f[id]?.length?'set':''}"><summary>${st.f[id]?.length?st.f[id].length+' selected':'Any'}</summary><div>${o.map((x,i)=>`<label class=ck><input type=checkbox data-fm="${id}" value="${i}" ${st.f[id]?.includes(i)?'checked':''}> ${esc(x[0])}</label>`).join('')}</div></details></label>`:`<label>${l}<select data-f="${id}" class="${st.f[id]!=null?'set':''}"><option value="">Any</option>${o.map((x,i)=>`<option value="${i}" ${st.f[id]==i?'selected':''}>${esc(x[0])}</option>`).join('')}</select></label>`).join('');
 $('#filters').style.display=scr.f.length?'':'none';{const na=Object.keys(st.f).filter(k=>FI[k]).length,fc=STO.ui?.fcol===true,pc=STO.ui?.pcol===true;$('#fhead').innerHTML=`<button type=button id=fcol aria-expanded=${!fc} aria-controls=filters aria-label="Filters${na?', '+na+' active':''}">Filters</button><button type=button id=pcol aria-expanded=${!pc} aria-controls=pre aria-label="Suggested filters">Suggested</button><button type=button id=freset data-x=__f aria-label="Reset filters${na?', '+na+' active':''}"${na?'':' disabled'}>Reset</button>`;$('#filters').classList.toggle('fcol',fc);$('#pre').classList.toggle('pcol',pc)}
 
 const R=rows(),chips=Object.entries(st.f).filter(([id])=>FI[id]).map(([id,i])=>`<span class=chip><i>${FI[id].s.name} ·</i> ${FI[id].l} ${CHIPI[id]&&!Array.isArray(i)?icoCell(CHIPI[id],FI[id].o[i][0]):''} ${esc(Array.isArray(i)?i.map(j=>FI[id].o[j][0]).join(' or '):FI[id].o[i][0])}<button data-x="${id}" aria-label="Remove">×</button></span>`);
 if(st.q)chips.push(`<span class=chip><i>Search ·</i> “${esc(st.q)}”<button data-x="__q">×</button></span>`);
 const SL=k=>k=='n'?'Card':String(COL[k]?.[0]||k).replace(/<[^>]+>/g,'').trim();
 if(st.sort&&(st.sort=='n'||COL[st.sort])&&!['val'].includes(st.s))chips.push(`<span class=chip><i>Sort ·</i> ${esc(SL(st.sort))} ${st.dir>0?'▴':'▾'}<button data-x="__sort" aria-label="Reset sort">×</button></span>`);
 $('#pre').innerHTML=PRESETS().map(p=>`<a href="#preset/${p.id}" class="pchip ${curPre()==p.id?'on':''}" data-pre="${p.id}">${esc(p.n)}</a>`).join('');
 $('#bar').innerHTML=`<span class=count>${R.length} <span>of ${C.filter(LIVE).length} cards</span></span>${chips.join('')}${chips.length?'<button class=clr data-x="__all">Clear all</button>':''}${st.s=='ins'?'<button class=how data-pttwhy>How the PTT Score is estimated</button>':''}`;
 if(st.s=='val')return renderVal();
 const cols=['n',...scr.cols];
 let sk=st.sort&&(st.sort=='n'||COL[st.sort])?st.sort:(st.s=='rw'?'best':st.s=='fees'?'fee':st.s=='ins'?(GKEY()=='prot'?'covP':'covT'):'best');
 const dir=st.sort==sk?st.dir:(sk=='fee'||sk=='apr'||sk=='fx'?1:-1);
 const key=sk=='n'?c=>c.n:COL[sk][2];
 R.sort((a,b)=>nlast(key(a),key(b),dir)||a.n.localeCompare(b.n));
 $('#th').innerHTML='<tr>'+cols.map(k=>{const [l,cl]=k=='n'?['Card','l nm']:COL[k];return`<th data-k="${k}" class="${cl=='wrapt'?'l':cl} ${k==sk?'s'+(dir>0?' asc':''):''}">${l}</th>`}).join('')+'</tr>';
 $('#tb').innerHTML=R.length?R.map((c,ix)=>`<tr data-i="${C.indexOf(c)}">`+cols.map(k=>k=='n'?`<td class="l nm"><button type=button class=nmb data-m="${C.indexOf(c)}" aria-haspopup=dialog title="All details"><b class=cl>${esc(c.n)}</b></button>${c.st=='discontinued'?'<span class=disc>Discontinued</span>':''}${soonB(c)}<small>${esc(c.i)} · ${esc(c.prog)}</small></td>`:`<td class="${COL[k][1]}">${COL[k][3](c)}</td>`).join('')+'</tr>').join(''):`<tr><td class=empty colspan=${cols.length}>No cards match. Remove a filter.</td></tr>`;
}
/* Perks sub-tab body: bar and the per-perk table (one row per card perk). The tab row, group row and filter panel are drawn by render0 like every other sub-tab. */
const PKPRE=['lounge','nexus_global_entry','statement_credit','membership'],pkCatI=v=>FI.pk_cat?.o.findIndex(o=>o[0]==pkLab(PKCAT,v))??-1;
const pkOn=v=>{const f=st.f.pk_cat;return Array.isArray(f)&&f.length==1&&f[0]===pkCatI(v)};
const pkPre=()=>PKPRE.filter(v=>PKR.some(r=>r.cat===v)&&pkCatI(v)>=0).map(v=>`<a href="#" class="pchip ${pkOn(v)?'on':''}" data-pkpre="${v}">${esc(pkLab(PKCAT,v))}</a>`).join('');
document.addEventListener('click',e=>{const a=e.target.closest('[data-pkpre]');if(!a)return;e.preventDefault();const i=pkCatI(a.dataset.pkpre);if(i<0)return;if(pkOn(a.dataset.pkpre))delete st.f.pk_cat;else st.f.pk_cat=[i];/* Category is a multi-select: its state is a list of option indexes */go(hashOf())});
function renderPerks(scr){
 const grp=PKG[GKEY()]||'Travel',q=st.q.toLowerCase(),keep=r=>Object.entries(st.f).every(([id,i])=>{const F=FI[id];if(!F)return true;const x=F.s.id=='perk'?r:r.card;return Array.isArray(i)?(!i.length||i.some(j=>F.o[j]?.[1](x))):F.o[i]?.[1](x)});
 const all=PKR.filter(r=>LIVE(r.card)&&r.g==grp),R=all.filter(r=>keep(r)&&(!q||(r.card.n+' '+r.card.i+' '+r.n).toLowerCase().includes(q)));
 const chips=Object.entries(st.f).filter(([id])=>FI[id]).map(([id,i])=>`<span class=chip><i>${FI[id].s.name} ·</i> ${FI[id].l} ${esc(Array.isArray(i)?i.map(j=>FI[id].o[j]?.[0]).join(' or '):FI[id].o[i]?.[0])}<button data-x="${id}" aria-label="Remove">×</button></span>`);
 if(st.q)chips.push(`<span class=chip><i>Search ·</i> “${esc(st.q)}”<button data-x="__q">×</button></span>`);
 const so=st.sort=='n'?'pk_n':st.sort,sk=pkCols.includes(so)?so:'pk_n',dir=sk==so?st.dir:1;
 if(sk==so)chips.push(`<span class=chip><i>Sort ·</i> ${esc(COL[sk][0])} ${dir>0?'▴':'▾'}<button data-x="__sort" aria-label="Reset sort">×</button></span>`);
 $('#pre').innerHTML=pkPre();/* Perks has its own preset row (category filters from the data), not the card presets */
 $('#bar').innerHTML=`<span class=count>${R.length} <span>of ${all.length} ${grp} perks on ${new Set(R.map(r=>r.card)).size} cards</span></span>${chips.join('')}${chips.length?'<button class=clr data-x="__all">Clear all</button>':''}`;
 const key=COL[sk][2];R.sort((a,b)=>nlast(key(a),key(b),dir)||a.card.n.localeCompare(b.card.n)||a.n.localeCompare(b.n));
 $('#th').innerHTML='<tr>'+pkCols.map(k=>`<th data-k="${k}" class="${COL[k][1]} ${k==sk?'s'+(dir>0?' asc':''):''}">${COL[k][0]}</th>`).join('')+'</tr>';
 $('#tb').innerHTML=R.length?R.map(r=>`<tr data-pk="${PKR.indexOf(r)}">`+pkCols.map(k=>`<td class="${COL[k][1]}">${COL[k][3](r)}</td>`).join('')+'</tr>').join(''):`<tr><td class=empty colspan=${pkCols.length}>No perks match. Remove a filter.</td></tr>`}
/* a perk row opens its quote and source under it (same pattern as the Insurance rows): the sentence from the issuer page, its link, the evidence class, the archived capture and the capture date */
const pkDet=(r,n)=>`<tr class="det pkd"><td colspan=${n}>${r.qt?`<p class=pkq>“${esc(r.qt)}”</p>`:''}<div class=pkm>${[r.el?`<span><b>Eligibility</b> ${esc(r.el)}</span>`:'',r.nt?`<span><b>Note</b> ${esc(r.nt)}</span>`:'',`<span><b>Source</b> ${r.su?lnk(r.su):'—'}</span>`,r.ec?`<span><b>Evidence</b> <span class=t>${esc(r.ec)}</span></span>`:'',r.ap?`<span><b>Archived</b> <code>${esc(r.ap)}</code></span>`:'',r.rt?`<span><b>Retrieved</b> ${esc(r.rt)}</span>`:''].filter(Boolean).join('')}</div></td></tr>`;
/* render0 draws the tab row, group row and filter panel (and, for the card views, the card table); on the Perks sub-tab the perk table replaces that table straight after */
{const r0=render0;render0=function(){const x=r0.apply(this,arguments);if(st.pl=='cards'&&st.s=='perk'&&!st.card&&!$('.wrap').hidden)renderPerks(S.find(s=>s.id==GKEY()));return x}}
document.addEventListener('click',e=>{const t=e.target.closest('tr[data-pk]');if(!t||st.s!='perk'||e.target.closest('a,.nmb'))return;const b=t.querySelector('.pkb'),n=t.nextElementSibling;
 if(n&&n.classList.contains('pkd')){n.remove();t.classList.remove('op');b&&b.setAttribute('aria-expanded','false');return}
 t.classList.add('op');b&&b.setAttribute('aria-expanded','true');t.insertAdjacentHTML('afterend',pkDet(PKR[t.dataset.pk],t.children.length))});
function renderVal(){const P=D.val.programs,cnt=p=>C.filter(c=>c.prog==p).length,rt=(p,k)=>p.routes&&p.routes[k];
 const VC=[['cpp','Baseline ¢/pt',p=>p.cpp],['cash','Cash / statement credit',p=>rt(p,'cash')?.[0]],['travel','Travel (fixed / portal)',p=>rt(p,'travel')?.[0]],['transfer','Transfer partners',p=>rt(p,'transfer')?.[0]],['gift','Gift cards / merchandise',p=>rt(p,'gift')?.[0]],['cards','Cards',p=>cnt(p.program)]];
 const vf=st.vf||{},VF=[['c1','Cash / statement credit ≥ 1¢',p=>rt(p,'cash')?.[0]>=1],['t1','Travel (fixed / portal) ≥ 1¢',p=>rt(p,'travel')?.[0]>=1],['tr','Transfer partners: any',p=>rt(p,'transfer')?.[0]>0]];
 $('#filters').style.display='';$('#filters').innerHTML=VF.map(([k,l])=>`<label class=ck><input type=checkbox data-vf="${k}" ${vf[k]?'checked':''}> ${l}</label>`).join('');
 const sk=st.vsort||'cpp',dir=st.vdir||-1,col=VC.find(x=>x[0]==sk)||VC[0];
 const L=P.filter(p=>VF.every(([k,,f])=>!vf[k]||f(p))).sort((a,b)=>nlast(col[2](a),col[2](b),dir)||a.program.localeCompare(b.program));
 $('.count').innerHTML=`${L.length} <span>of ${P.length} programs</span>`;
 const cell=(p,k)=>{if(k=='cpp')return `${p.cpp}<span class=t>${esc(p.tag[0])}</span>`;if(k=='cards')return cnt(p.program);const v=rt(p,k);if(!v)return '<span class=q title="Not stated in the record">—</span>';return (k=='transfer'?v[0]:v[0]+'¢')+`<span class=t title="${esc(v[2]||'')}">${esc(v[1][0])}</span>`};
 $('#th').innerHTML='<tr><th class="l nm">Program</th>'+VC.map(([k,l])=>`<th data-vk="${k}" class="${k==sk?'s'+(dir>0?' asc':''):''}">${l}</th>`).join('')+'</tr>';
 $('#tb').innerHTML=L.map(p=>`<tr><td class="l nm"><button type=button class=nmb data-vm="${P.indexOf(p)}" aria-haspopup=dialog><b>${esc(p.program)}</b></button></td>${VC.map(([k])=>`<td>${cell(p,k)}</td>`).join('')}</tr>`).join('');}
function openVM(p){$('#mc').innerHTML=`<h2>${esc(p.program)}</h2><div class=mute>Baseline ${p.cpp}¢/pt <span class=t>${esc(p.tag)}</span></div><h3>Baseline basis</h3><p>${esc(p.basis)}</p><p>${lnk(p.source)}</p>
 <h3>Redemption routes</h3>${(p.route_list||[]).length?`<table><tr><th>Route</th><th>¢/pt</th><th>Basis</th><th>Conditions</th></tr>${p.route_list.map(r=>`<tr><td>${esc(r.route)}</td><td>${r.low??'—'}${r.high&&r.high!=r.low?'–'+r.high:''} <span class=t>${esc(r.evidence||'')}</span></td><td>${esc(r.basis||'')}</td><td>${esc(r.conditions||'')}</td></tr>`).join('')}</table>`:'<span class=u>No routes recorded</span>'}`;
 $('#mbg').classList.add('on');$('#mbg').setAttribute('aria-hidden','false')}
const tg=x=>x?`<span class=t>${esc(x[0]||x)}</span>`:'';
const VE=(c,f)=>{const v=c.ve[f];return v?`<span class=t title="${esc(v[1]||'')}">${esc(v[0])}</span>`:''};
const lnk=u=>u?`<a href="${esc(u)}" target=_blank rel=noopener>${esc(u.replace(/^https?:\/\/(www\.)?/,'').slice(0,60))}</a>`:'';
const INSN={emergency_medical:'med',trip_cancellation:'trip',trip_interruption:'trip',flight_delay:'fd',baggage:'bag',rental_car_cdw:'cdw',purchase_protection:'pp',extended_warranty:'ew',mobile_device:'mob'};
const DEDK=new Set(['emergency_medical','mobile_device','rental_car_cdw']);
function insSub(c,keys){const L=['Deductible','Limit','Conditions'];
 return L.map((l,j)=>`<tr class="det sub"><td class="l nm"><span class=mute>${l}</span></td>${keys.slice(1).map(k=>{if(!k.startsWith('ins_'))return '<td></td>';const cv=k.slice(4),st=insV(c,cv),r=(c.insr||{})[cv];if(st=='nl')return '<td><span class=mute>—</span></td>';
  if(st===0)return `<td>${j==1?'<span class=z>$0</span>':j==2?'<span class=mute>Not included</span>':'<span class=mute>n/a</span>'}</td>`;
  if(st==null)return '<td><span class=q>—</span></td>';const v=r?r[j]:null;if(v==null&&j==0&&!DEDK.has(cv))return '<td><span class=mute title="No deductible applies to this coverage type">—</span></td>';if(v==null&&j==2)return '<td class=cond><span class=mute>None stated</span></td>';
  return `<td class=${j==2?'cond':''}>${v==null?'<span class=q>—</span>':j==1&&typeof v=='number'?'$'+(v>=1e6?v/1e6+'M':v.toLocaleString()):j==0&&v===0?'$0':esc(v)}</td>`}).join('')}</tr>`).join('')}
function insX(c){const u=(c.ix.ins_uw_by_cov||[{}])[0],ut=c.ix.ins_uw_by_cov?XT(c,'ins_uw_by_cov'):'',L=[['Common carrier AD&D (max)','cc_add_max','$'],['Rental vehicle AD&D (max)','rental_add_max','$'],['Price protection window','pp_days','d'],['Price protection per item','pp_item','$'],['Price protection per year','pp_year','$'],['Price protection minimum difference','pp_min','$'],['Price protection only on tier','pp_tier','']];
 const CV={cc_add_max:'travel_accident',pp_days:'price_protection',pp_item:'price_protection',pp_year:'price_protection',pp_min:'price_protection'};
 const r=L.map(([l,k,f])=>X(c,k)!=null?`<tr><td>${l}</td><td>${f=='$'?'$'+X(c,k).toLocaleString():f=='d'?X(c,k)+' days':esc(X(c,k))}</td><td>${XT(c,k)}</td></tr>`:CV[k]&&c.ins[CV[k]]===0?`<tr><td>${l}</td><td><span class=z>$0</span> <span class=mute>not included</span></td><td></td></tr>`:k=='pp_tier'||k=='pp_min'||k=='rental_add_max'?'':`<tr><td>${l}</td><td><span class=q>—</span></td><td></td></tr>`).filter(Boolean);
 const w=Object.entries(u).map(([k,v])=>`<tr><td>${esc((INS.find(x=>x[0]==k)||[,k])[1])}</td><td>${esc(v)}</td><td>${ut}</td></tr>`);
 return (r.length?`<table style="margin-top:8px"><tr><th>Limit</th><th>Value</th><th>Source</th></tr>${r.join('')}</table>`:'')+(w.length?`<table style="margin-top:8px"><tr><th>Coverage</th><th>Underwriter</th><th>Source</th></tr>${w.join('')}</table>`:c.insl.uw?`<table style="margin-top:8px"><tr><th>Underwriter</th><td>${esc(c.insl.uw)}</td></tr></table>`:'')}
function cardHTML(c,full,ctx){const kv=(l,v,f)=>`<div><span>${l}:</span> ${v??'<span class=u>—</span>'}${f?VE(c,f):''}</div>`;
 const er=c.erows.length?`<table><tr><th>Category</th><th>As stated</th><th>Baseline %</th><th>Condition / cap</th></tr>${c.erows.map(e=>`<tr><td>${esc(e.cat)}</td><td>${esc(e.txt)} <span class=mute>${esc(e.v||'')}</span></td><td>${e.pct==null?'—':e.pct.toFixed(2)+'%'}</td><td>${esc(e.cond||'')}${e.cap?` cap $${e.cap.toLocaleString()}/${esc((e.capp||'').toLowerCase())}`:''}</td></tr>`).join('')}</table>`:'<span class=u>No earn rows on record</span>';
 const ins=`<table><tr><th>Coverage</th><th>State</th><th>Terms / basis</th></tr>${INS.map(([k,l])=>{const d=c.insd[k]||{};return`<tr><td>${l}</td><td>${ynI(c,k)}</td><td>${esc((INSN[k]&&c.insl[INSN[k]])||d.b||'')}</td></tr>`}).join('')}</table>${insX(c)}`;
 const hero=`<div class=hero><div><span>Cost</span><b>${c.fee==null?esc(c.feet||'—'):'$'+c.fee.toLocaleString()+'/yr'}</b></div><div><span>Base earn %</span><b>${c.other==null?'—':c.other.toFixed(2)+'%'}</b></div><div><span>Best earn %</span><b>${c.best==null?'—':c.best.toFixed(2)+'%'}</b></div><div><span>FX fee</span><b>${c.fx==null?'—':c.fx+'%'}</b></div><div><span>Insurance</span><b>${c.nins}/12</b></div></div>`;
 const srcF=re=>c.srcs.filter(x=>re.test((x.t||'')+' '+(x.f||'')));
 const srcL=L=>L.length?`<table><tr><th>Source</th><th>Type · date</th><th>Covers</th></tr>${L.map(x=>`<tr><td>${lnk(x.u)}</td><td>${esc(x.t||'')} · ${esc(x.d||'')}${x.vs&&x.vs!='VERIFIED'?' · '+esc(x.vs):''}</td><td>${esc(x.f||'')}</td></tr>`).join('')}</table>`:'';
 const P=D.val.programs.find(p=>p.program==c.prog);
 const SEC={
  fees:{t:'Fees & eligibility',one:()=>`${c.fee==null?esc(c.feet):'$'+c.fee.toLocaleString()+'/yr'} · FX ${c.fx==null?'—':c.fx+'%'} · APR ${c.apr==null?'—':c.apr+'%'}`,
   base:()=>`<div class=kv>${kv('Cost',c.fee==null?esc(c.feet):money(c.fee),'fee_amount')}${kv('First-year fee',c.fyf?'Waived':'Not waived')}${kv('Additional card',esc(c.addt))}${kv('FX fee',c.fx==null?null:c.fx+'%'+(c.fxs?' <span class=mute>('+esc(c.fxs)+')</span>':''),'fx_pct')}${kv('Purchase APR',c.apr==null?esc(c.aprt):c.apr+'%')}${kv('Income (personal)',c.inc?'$'+c.inc.toLocaleString():esc(c.inct))}${kv('Income (household)',c.hinc?'$'+c.hinc.toLocaleString():null)}</div>`,
   deep:()=>`<table><tr><th>Field</th><th>Value</th><th>As stated / condition</th></tr>${[['Cost',c.fee==null?'—':'$'+c.fee,esc(c.feet)+(c.xf.ffreq?' · billed '+esc(c.xf.ffreq):'')+VE(c,'fee_amount')],['First-year fee',c.fyf?'Waived':'Not waived',esc([c.pro.fyf,c.pro.fyfm].filter(Boolean).join(' · '))],['Fee waiver path',c.xf.waiver?'Yes':'—',esc(c.xf.waiver||'')],['Additional card',c.add==null?'—':'$'+c.add,esc(c.addt||'')],['FX fee',c.fx==null?'—':c.fx+'%',esc((c.fxt||'')+(c.xf.fxs?' · scope '+c.xf.fxs:''))+VE(c,'fx_pct')],['Purchase APR',c.apr==null?'—':c.apr+'%',esc(c.aprt||'')],['Cash advance',' ',esc(c.xf.cash||'')],['Income (personal)',c.inc?'$'+c.inc.toLocaleString():'—',esc(c.inct||'')],['Income (household)',c.hinc?'$'+c.hinc.toLocaleString():'—',''],['Spend alternative to income','',esc(c.xf.incalt||'')],['Product type',esc(c.pt||'—'),VE(c,'card_product_type')],['Currency / account',esc((c.cur||'—')+' · '+(c.acct||'—')),VE(c,'currency')+VE(c,'account_type')]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]||''}</td></tr>`).join('')}</table>${srcL(srcF(/fee|rate|schedule|apr|income|disclosure|product page/i))}`},
  rw:{t:'Rewards',one:()=>`${esc(c.rt||'—')} · ${esc(c.prog)} · base ${c.other==null?'—':c.other.toFixed(2)+'%'} · best ${c.best==null?'—':c.best.toFixed(2)+'%'}`,
   base:()=>`<div class=kv>${kv('Fee',esc(c.pt),'card_product_type')}${kv('Reward type',esc(c.rt),'reward_type')}${kv('Program',esc(c.prog))}${kv('Point conversion',c.kind=='Points'?c.cpp+'¢/pt '+tg(c.tag):'cash (stated %)')}${kv('Points expiry',esc(c.exp))}</div><div class=kv style="margin:6px 0">${RC.filter(k=>c['r_'+k]!=null&&(c.own.includes(k)||k=='other')).map(k=>kv(CN[k],c['r_'+k].toFixed(2)+'%')).join('')}</div>${er}`,
   deep:()=>`${SEC.rw.base()}<h4>Category caps used in Wallet</h4>${Object.keys(c.caps||{}).length?`<div class=kv>${Object.entries(c.caps).map(([k,v])=>kv(CN[k],'$'+v.toLocaleString()+' / year')).join('')}</div>`:'<span class=u>No caps on record</span>'}
    <h4>Point conversion</h4><div class=kv>${kv('Earn structure',esc(c.earn))}${c.kind=='Points'&&P?kv('Program value',P.cpp+'¢/pt '+tg(P.tag))+kv('Basis',esc(P.basis))+kv('Source',lnk(P.source)):''}${kv('Redemption minimum',esc(c.pay.min))}${kv('Expiry terms',esc(c.pay.exp))}</div>
    ${c.pay.routes.length?`<table><tr><th>Redemption route</th><th>¢/pt</th><th>Basis</th><th>Condition</th></tr>${c.pay.routes.map(r=>`<tr><td>${esc(r.r)}</td><td>${r.lo??'—'}</td><td>${esc(r.b||'')} ${r.ev?'<span class=t>'+esc(r.ev)+'</span>':''}</td><td>${esc(r.cond||'')}</td></tr>`).join('')}</table>`:''}${srcL(srcF(/earn|reward|point|program|product page/i))}`},
  ins:{t:`Insurance (${c.nins}/${INS.length})`,one:()=>`${c.nins} of ${INS.length} coverages${c.ix.insurers?' · '+esc(c.ix.insurers[0].join('; ')||'no included insurance'):''}${X(c,'cc_add_max')?' · carrier AD&D $'+X(c,'cc_add_max').toLocaleString():''}`,
   base:()=>ins,deep:()=>`${ins}${c.insl.oth?`<h4>Other insurance terms (as stated)</h4><p class=mute>${esc(c.insl.oth)}</p>`:''}${c.inspr?`<h4>Summary</h4><p class=mute>${esc(c.inspr)}</p>`:''}<div class=kv>${kv('Underwriter (as stated)',esc(c.insl.uw))}</div>${srcL(srcF(/insurance|certificate|coverage|benefit/i))}`},
  perks:{t:'Perks & offers',one:()=>`${c.offer?'Offer'+(c.odl&&c.odl!='ONGOING'?' to '+esc(c.odl):''):'No public offer'} · ${c.credits.length} credits · ${c.perks.length} partner perks`,
   base:()=>`<div class=kv>${kv('Welcome offer',c.offer?esc(c.offer)+(c.odl?' <span class=mute>(apply by '+esc(c.odl)+')</span>':''):null)}${kv('Credits & bonuses',c.credits.length?esc(c.credits.join(' · ')):null)}${kv('Partner perks',c.perks.length?esc(c.perks.join(' · ')):null)}</div>`,
   deep:()=>`<table><tr><th>Welcome offer</th><td>${c.offer?esc(c.offer):'<span class=u>None public</span>'}</td></tr><tr><th>Spend requirement</th><td>${esc(c.pro.spend||'—')}</td></tr><tr><th>Apply by</th><td>${esc(c.odl||'—')}</td></tr><tr><th>First-year fee</th><td>${esc([c.pro.fyf,c.pro.fyfm].filter(Boolean).join(' · ')||'—')}</td></tr><tr><th>Offer captured</th><td>${esc(c.pro.d||'—')}</td></tr></table>
    ${c.credd.length?`<h4>Credits & bonuses</h4><table><tr><th>Credit</th><th>Value</th><th>Cap</th><th>Conditions</th></tr>${c.credd.map(m=>`<tr><td>${esc(m.t)}</td><td>${esc(m.v||'')}</td><td>${esc(m.cap||'')}</td><td>${esc(m.cond||'')} ${m.ev?'<span class=t>'+esc(m.ev)+'</span>':''}</td></tr>`).join('')}</table>`:''}
    ${c.perkd.length?`<h4>Partner perks</h4><table><tr><th>Perk</th><th>What you get</th><th>Conditions</th></tr>${c.perkd.map(m=>`<tr><td>${esc(m.n)}</td><td>${esc(m.v||m.m||'')}</td><td>${esc(m.cond||'')} ${m.cs?'<span class=t>'+esc(m.cs)+'</span>':''}</td></tr>`).join('')}</table>`:''}${srcL(srcF(/offer|promo|perk|benefit|product page/i))}`}};
 const head=`<h2>${esc(c.n)}${c.st=='discontinued'?'<span class=disc>Discontinued</span>':''}${soonB(c)}</h2><div class=mute>${esc(c.i)} · ${esc(c.nw||'')} ${esc(c.tier||'')}</div>`;
 const tail=`<h3>Evidence tags</h3><div class=kv>${Object.entries(c.ve).map(([f,v])=>`<div title="${esc(v[1]||'')}"><span>${esc(f)}:</span> <span class=t>${esc(v[0])}</span></div>`).join('')||'<span class=u>—</span>'}</div>
 <h3>Sources</h3><div style="font-size:12.5px">${c.url?'Issuer page: '+lnk(c.url)+'<br>':''}${c.srcs.map(x=>`${lnk(x.u)} <span class=mute>${esc(x.t||'')} · ${esc(x.d||'')}${x.vs&&x.vs!='VERIFIED'?' · '+esc(x.vs):''}</span>`).join('<br>')}</div>
 <p class=mute>Data as of ${esc(c.snap)}.</p>`;
 if(ctx&&SEC[ctx]){const o=Object.keys(SEC).filter(k=>k!=ctx);
  return head+`<h3>${SEC[ctx].t}</h3>${SEC[ctx].deep()}<h3>Other details</h3><table class=one>${o.map(k=>`<tr><th>${SEC[k].t.replace(/ \(.*/,'')}</th><td>${SEC[k].one()}</td></tr>`).join('')}</table><p class=mute>Data as of ${esc(c.snap)}.</p>`}
 return head+(full?hero:'')+Object.values(SEC).map(x=>`<h3>${x.t}</h3>${x.base()}`).join('')+tail}
function renderCard(c){const sv=[...(SUBSBY[c.id]||[])].map(k=>SUBS.find(s=>s.k==k));$('#page').innerHTML=`<button class=back data-back>← Screener</button>${cardHTML(c,1)}${sv.length?`<p class=svback><span class=mute>Subsidizes:</span> ${sv.map(s=>`<button class=chip data-subsgo="${s.k}">${esc(s.n)}</button>`).join(' ')}</p>`:''}${acts(c)}`}
const acts=c=>{const on=W.cards.includes(c.id);return `<div class=acts><button class="btn ${on?'on':''}" data-wal="${c.id}">${on?'✓ In Wallet':'+ Wallet'}</button></div>`};
function openWhy(){$('#mc').innerHTML=`<h2>How the PTT Score is estimated</h2>
<p>The PTT Score is a rough dollar figure for what a card's included insurance is worth to you each year.</p>
<p><b>Pure premium.</b> For each coverage we multiply how likely a claim is in a year by what the card would pay out, then add up the coverages. That is the expected payout, before any insurer's costs or profit.</p>
<p><b>Standard traveller.</b> The figure is for one 40-year-old who takes one 6-day US trip ($800 prepaid) and one 14-day overseas trip ($2,500 prepaid) a year, books both on the card, rents a car for 7 days, buys a $1,200 phone and $3,000 of other goods on the card, and has $1,000 of purchases under warranty.</p>
<p><b>Bands.</b> Good is $200 or more a year, Fair is $75 to $199, and Weak is under $75.</p>
<p><b>*</b> means we don't know whether some coverages are included or what they pay, so the score may be low.</p><p><b>Roadside.</b> An included roadside membership adds what the matching CAA membership costs (CAA South Central Ontario, caasco.com): Basic at $80/yr when the tow limit is under 200 km, Plus at $124/yr when it is 200 km or more. This is an estimate. Pay-per-use dispatch and optional paid Auto Club add-ons do not count.</p>
<p class=mute>This is an estimate, not a quote. What you actually get depends on your trips, your age and the card's certificate of insurance.</p>`;
 $('#mbg').classList.add('on');$('#mbg').setAttribute('aria-hidden','false');$('#mx').focus()}
function openM(c,full){$('#mc').innerHTML=cardHTML(c,0,full?null:st.s)+acts(c);
 $('#mbg').classList.add('on');$('#mbg').setAttribute('aria-hidden','false');$('#mx').focus()}
const closeM=()=>{$('#mbg').classList.remove('on');$('#mbg').setAttribute('aria-hidden','true')};
document.addEventListener('click',e=>{const b=e.target.closest('#grp [data-g]');if(!b)return;e.stopImmediatePropagation();st.g={...(st.g||{}),[st.s]:b.dataset.g};st.sort=null;render();const n=$('#grp [data-g].on');if(n)n.focus()},true);
document.addEventListener('keydown',e=>{const b=e.target.closest?.('#nav3 nav button');if(b&&['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){const L=[...b.closest('nav').querySelectorAll('button')],i=L.indexOf(b),n=e.key=='Home'?0:e.key=='End'?L.length-1:(i+(e.key=='ArrowRight'?1:-1)+L.length)%L.length;e.preventDefault();L[n].focus()}});
document.addEventListener('keydown',e=>{if(e.key=='Escape')closeM();if((e.key=='Enter'||e.key==' ')&&e.target.dataset?.mf){e.preventDefault();e.target.click()}if((e.key=='Enter'||e.key==' ')&&e.target.dataset?.wtile!=null){e.preventDefault();openM(C[+e.target.dataset.wtile])}if((e.key=='Enter'||e.key==' ')&&e.target.classList?.contains('prow')){e.preventDefault();e.target.click()}if(e.key=='Enter'&&e.target.id=='logo'){e.target.click()}});
document.addEventListener('click',e=>{
 if(e.target.closest('#fcol')){STO.ui={...(STO.ui||{}),fcol:STO.ui?.fcol!==true};saveS();render();$('#fcol')?.focus();return}
 if(e.target.closest('#pcol')){STO.ui={...(STO.ui||{}),pcol:STO.ui?.pcol!==true};saveS();render();$('#pcol')?.focus();return}
 {const mx=e.target.closest('[data-subsx]');if(mx){e.stopPropagation();STO.wallet.services=(STO.wallet.services||[]).filter(k=>k!=mx.dataset.subsx);saveS();render();return}}
 {const ms=e.target.closest('[data-subscriptions]');if(ms){const k=ms.dataset.subscriptions,S2=new Set(STO.wallet.services||[]);ms.checked?S2.add(k):S2.delete(k);STO.wallet.services=[...S2];saveS();render();return}}
 if(e.target.closest('#rtog')){togRail();return}
 {const t=e.target;if(t.closest('[data-pelig]')){st.pelig=t.closest('[data-pelig]').checked;render();return}if(t.closest('[data-pend]')){st.pend=t.closest('[data-pend]').checked;render();return}const py=t.closest('[data-pty]');if(py){st.pty=py.dataset.pty;render();return}const pb=t.closest('[data-pdf]');if(pb){pdfModal(pb.dataset.pdf,pb.dataset.pdft,pb.dataset.pdfd);return}if(t.closest('[data-pdfx]')||t.id=='pdfm'){$('#pdfm')?.remove();return}}
 {const t=e.target,ps=t.closest('[data-psort]'),pr=t.closest('tr.prow');if(ps){const k=ps.dataset.psort,o=st.psort||{k:'v',d:-1};st.psort={k,d:o.k==k?-o.d:(['v','mp','aum'].includes(k)?-1:1)};render();return}if(pr&&!t.closest('a,button,label')){st.popen=st.popen==pr.dataset.pk?null:pr.dataset.pk;render();return}}
{const t=e.target,cg=t.closest('[data-cardgo]'),sg=t.closest('[data-subsgo]');if(cg){st.pl='cards';st.card=cg.dataset.cardgo;render();scrollTo(0,0);return}if(sg){const k=sg.dataset.subsgo;st.subo=st.s=='subscriptions'&&st.subo==k?null:k;st.s='subscriptions';st.card=null;render();document.querySelector(`[data-sub="${k}"]`)?.scrollIntoView({block:'nearest'});return}}
 if(e.target.id=='mbg'||e.target.id=='mx'){closeM();return}
 {const b=e.target.closest('[data-my1]');if(b){st.my1=+b.dataset.my1;render();return}}
 if(e.target.closest('[data-mdiff]')){st.mdiff=e.target.checked;render();return}
 const wb=e.target.closest('[data-wal],[data-wrm]');if(wb){const id=wb.dataset.wal||wb.dataset.wrm,i=W.cards.indexOf(id);if(i>=0)W.cards.splice(i,1);else W.cards.push(id);saveS();const inM=wb.closest('#modal');render();if(inM)openM(C[BYID[id]]);return}
 const of=e.target.closest(OSEL);if(of&&!(of.dataset.trc!=null&&e.target.closest('button,a,input,select,label'))){e.stopPropagation();ofrShow(of);return}if(!e.target.closest('#ofp'))ofrHide();
 const vm=e.target.closest('[data-vm]');if(vm){openVM(D.val.programs[vm.dataset.vm]);return}
 const vk=e.target.closest('[data-vk]');if(vk){const k=vk.dataset.vk;if(st.vsort==k)st.vdir=-(st.vdir||-1);else{st.vsort=k;st.vdir=-1}render();return}
 const pr=e.target.closest('[data-pre]');if(pr){e.preventDefault();const p=PRESETS().find(x=>x.id==pr.dataset.pre);if(curPre()==p.id){st.f={};st.sort=null}else Object.assign(st,presetState(p));$('#q').value='';go(hashOf());return}
 const fc=e.target.closest('[data-full-card]');if(fc){openM(C[fc.dataset.fullCard],1);$('#modal').scrollTop=0;return}
 if(e.target.closest('[data-pttwhy]')){openWhy();return}
 {const wt=e.target.closest('[data-wtile]');if(wt&&!e.target.closest('[data-wrm]')){openM(C[+wt.dataset.wtile]);return}}const g=e.target.closest('[data-go]');if(g){e.preventDefault();closeM();go(g.getAttribute('href'));return}
 if(e.target.closest('[data-back]')){st.card=null;go(hashOf());return}
 if(e.target.closest('#modal'))return;
 const m=e.target.closest('[data-m]');if(m){e.stopPropagation();openM(C[m.dataset.m]);return}
 if(e.target.closest('#logo')){st.pl='home';st.s='ov';st.card=null;st.q='';if($('#q'))$('#q').value='';render();window.scrollTo(0,0);return}
 const t=e.target.closest('[data-s],[data-x],[data-k],tr[data-i]');if(!t)return;
 if(t.dataset.s){st.s=t.dataset.s;st.card=null}else if(t.dataset.x){const x=t.dataset.x;if(x=='__all'){st.f={};st.q='';$('#q').value=''}else if(x=='__f'){st.f={}}else if(x=='__sort'){st.sort=null;st.dir=-1}else if(x=='__q'){st.q='';$('#q').value=''}else delete st.f[x]}
 else if(t.dataset.k){const k=t.dataset.k;if(st.sort==k)st.dir=-st.dir;else{st.sort=k;st.dir=(k=='n'||k=='fee'||k=='apr'||k=='fx'||COL[k]?.[1]=='l')?1:-1}}
 else if(t.dataset.i){if(st.s!='ins')return;let n=t.nextElementSibling;if(n&&n.classList.contains('det')){while(n&&n.classList.contains('det')){const x=n.nextElementSibling;n.remove();n=x}t.classList.remove('op');return}const c=C[t.dataset.i];t.classList.add('op');t.insertAdjacentHTML('afterend',insSub(c,[...$('#th tr').children].map(h=>h.dataset.k)));return;
  }
 render()});
const BYN={};C.forEach((c,i)=>{if(LIVE(c))BYN[c.n.toLowerCase()]=i});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.pkid!=null||t.dataset.pcust!=null){const P=PRF(),f=t.dataset.pkid!=null?'kids':'cust',v=t.dataset.pkid??t.dataset.pcust,a=new Set(P[f]||[]);t.checked?a.add(v):a.delete(v);P[f]=[...a];saveS();render();return}const k=e.target.dataset.prf;if(!k)return;const P=PRF();P[k]=e.target.type=='checkbox'?e.target.checked:Math.max(0,+e.target.value||0);saveS();render();const n=document.querySelector(`[data-prf=${k}]`);n&&n.focus()});
document.addEventListener('toggle',e=>{if(e.target.classList?.contains('mspend'))st.mspo=e.target.open},true);
document.addEventListener('input',e=>{const k=e.target.dataset.sp;if(k){W.spend[k]=Math.max(0,+e.target.value||0);saveS();const f=document.activeElement?.dataset.sp,pos=e.target.selectionStart;(VIEWS[st.s]||renderCardsFolder)();const n=document.querySelector(`[data-sp="${f}"]`);n?.focus();return}
 const p=e.target.dataset.pick;if(p){const i=BYN[e.target.value.toLowerCase()];if(i!=null){pickCard(p,C[i].id)}}});
function pickCard(p,id){if(p=='wl'){if(!W.cards.includes(id))W.cards.push(id);saveS()}render();document.querySelector(`[data-pick="${p}"]`)?.focus()}
document.addEventListener('change',e=>{{const bt=e.target.dataset.btier;if(bt!=null){const L=STO.wallet.brokerage=(STO.wallet.brokerage||[]).filter(x=>x&&x.i!=bt);if(e.target.value)L.push({i:bt,tier:e.target.value});saveS();render();return}}const vfk=e.target.dataset.vf;if(vfk){st.vf={...(st.vf||{}),[vfk]:e.target.checked};render();return}const fm=e.target.dataset.fm;if(fm){const v=+e.target.value,a=new Set(st.f[fm]||[]);e.target.checked?a.add(v):a.delete(v);if(a.size)st.f[fm]=[...a].sort((x,y)=>x-y);else delete st.f[fm];const open=document.querySelector('details.ms[open]')?.querySelector('[data-fm]')?.dataset.fm;render();if(open)document.querySelector(`[data-fm="${open}"]`)?.closest('details').setAttribute('open','');return}
 const f=e.target.dataset.f;if(!f)return;if(e.target.value==='')delete st.f[f];else st.f[f]=+e.target.value;render()});
$('#q').value=st.q;$('#q').addEventListener('input',e=>{st.q=e.target.value;if(st.q&&st.pl=='home'){st.pl='cards';st.s='ov'}render()});
(()=>{const w=$('.wrap');let d=null,moved=false;
 w.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType=='touch'||e.target.closest('a,button,input,select,label,textarea,thead'))return;d={x:e.clientX,y:e.clientY,l:w.scrollLeft,id:e.pointerId};moved=false});
 w.addEventListener('pointermove',e=>{if(!d)return;const dx=e.clientX-d.x;
  if(!moved&&Math.abs(dx)>5&&Math.abs(dx)>Math.abs(e.clientY-d.y)){moved=true;w.classList.add('drag');w.setPointerCapture(d.id);getSelection().removeAllRanges()}
  if(moved){w.scrollLeft=d.l-dx;e.preventDefault()}});
 const up=()=>{if(!d)return;d=null;if(moved){w.classList.remove('drag');w.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault()},{capture:true,once:true});setTimeout(()=>moved=false,0)}};
 w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up)})();
// ---- Theme toggle (v3.3.1): default = OS setting; an explicit choice is saved in ptt.state.ui.theme ----
const curTheme=()=>document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
/* Profile menu (header): Wallet always first, Dark/Light always last; new profile items are added to PMENU and land between them */
const MI=d=>`<svg viewBox="0 0 24 24" width=16 height=16 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false>${d}</svg>`;
const MICO={wallet:MI('<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v2.5"/><rect x="4" y="7.5" width="16" height="11.5" rx="2.5"/><path d="M15.5 13.25h2"/>'),sun:MI('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),moon:MI('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>')};
const PMENU=[['wallet','Accounts']];
$('#pml').innerHTML=PMENU.map(([k,n])=>`<button type=button role=menuitem data-s=${k} tabindex=-1><span class=ti aria-hidden=true>${MICO[k]||''}</span><span class=tl>${n}</span></button>`).join('')+'<button type=button role=menuitem id=theme tabindex=-1><span class=ti aria-hidden=true></span><span class=tl></span></button>';
{const b=$('#pbtn'),l=$('#pml'),it=()=>[...l.querySelectorAll('[role=menuitem]')],shut=f=>{if(l.hidden)return;l.hidden=true;b.setAttribute('aria-expanded','false');if(f)b.focus()},open=()=>{l.hidden=false;b.setAttribute('aria-expanded','true');it()[0].focus()};
 b.addEventListener('click',()=>l.hidden?open():shut(true));
 l.addEventListener('click',e=>{if(e.target.closest('[role=menuitem]'))shut(false)});
 $('#pm').addEventListener('keydown',e=>{if(l.hidden)return;const a=it(),i=a.indexOf(document.activeElement);
  if(e.key=='Escape'){e.preventDefault();e.stopPropagation();shut(true)}else if(e.key=='ArrowDown'){e.preventDefault();a[(i+1)%a.length].focus()}else if(e.key=='ArrowUp'){e.preventDefault();a[(i-1+a.length)%a.length].focus()}else if(e.key=='Home'){e.preventDefault();a[0].focus()}else if(e.key=='End'){e.preventDefault();a[a.length-1].focus()}else if(e.key=='Tab')shut(false)},true);
 document.addEventListener('click',e=>{if(!e.target.closest('#pm'))shut(false)},true)}
function paintTheme(){const t=curTheme(),b=$('#theme');if(!b)return;const nx=t=='dark'?'light':'dark';b.querySelector('.ti').innerHTML=t=='dark'?MICO.sun:MICO.moon;b.querySelector('.tl').textContent=nx=='dark'?'Dark':'Light';b.setAttribute('aria-label','Switch to '+nx+' theme');b.title='Switch to '+nx+' theme'}
$('#theme')?.addEventListener('click',()=>{const nx=curTheme()=='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',nx);STO.ui={...(STO.ui||{}),theme:nx};saveS();paintTheme()});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{if(!(STO.ui&&STO.ui.theme)){document.documentElement.setAttribute('data-theme',e.matches?'dark':'light');paintTheme()}});
paintTheme();
/* v3.6.2 Premium gating (◆ tabs: Perks, Points, Promotions). Cosmetic, not security: the real view renders, blurred and inert, under a quiet unlock card.
   Premium status = localStorage 'ptt.premium' ('1'). Hidden dev toggle: ?premium=1 / ?premium=0 (the param is stripped from the URL at once). No network calls. */
const PREMIUM_PRICE='$5/mo or $50/yr',PREMIUM_URL={mo:'#premium',yr:'#premium'}/* invite popups open the ◆ Premium page; checkout lives there */;
(()=>{try{const q=new URLSearchParams(location.search),v=q.get('premium');if(v!=null){v=='1'?localStorage.setItem('ptt.premium','1'):localStorage.removeItem('ptt.premium');q.delete('premium');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash)}}catch(e){}})();
/* THE paywall switch (one place). false = every user is treated as a paying customer (Andrew 2026-10-17: build the site as paid):
   no locks, blurs or invite overlays; ◆ stays as a marker. Set true to turn ◆ gating back on (ptt.premium + the ?premium= dev toggle). */
const PAYWALL=false;
const isPaid=()=>{if(!PAYWALL)return true;try{return localStorage.getItem('ptt.premium')=='1'}catch(e){return false}};
/* v3.6.3 achievable promos (Docs/wallet-history-spec.md §3, evaluated on-device):
   series  = one offer line (line + institution + product); live runs in a series are mutually exclusive, so only the best payout counts (active and achievable).
   blocked = you hold the product now (new-product offers) · you're a customer (new-client offers) · not a customer (existing-client offers) · closed within the run's cooldown · enrolled already (ptt.user_promo) · youth-only without a student/kid.
   check   = closed or bonus received before, but the run's lookback isn't in the filed terms: never guessed, so not counted.
   caps    = one new-client bonus per institution; card minimum spends must fit 12 months of your Monthly Spend (best value per dollar of spend first). */
const pSeries=p=>p.line+'|'+p.ik+'|'+(p.pid||p.bid||String(p.prod||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());
const addMo=(d,n)=>{const x=new Date(String(d).length==7?d+'-01':d);if(isNaN(x))return null;x.setMonth(x.getMonth()+n);return x};
function promoState(p,ctx){const why=[];let st='ok';const e=promoElig(p,ctx.cs);if(!e.ok){st='blocked';why.push(...e.why)}
 if(ctx.en.has(p.k)||ctx.en.has(p.pk)){st='blocked';why.push('Already enrolled')}
 const past=ctx.arch.filter(a=>(p.pid&&a.sec=='cards'&&a.id==p.pid)||(p.bid&&a.sec=='banks'&&a.id==p.bid)||(p.sc=='new_inst'&&ctx.archInst(a)==p.ik));
 for(const a of past){const end=a.closed||null;if(p.cd&&end){const from=addMo(end,+p.cd);if(from&&from>ctx.today){if(st!='blocked')st='blocked';why.push(`Closed ${end}; eligible again ${from.toISOString().slice(0,10)} (${p.cd}-month cooldown)`)}}
  else if(st=='ok'){st='check';why.push(`You had this before${end?' (closed '+end+')':''}; the re-eligibility window isn't in the filed terms`)}}
 return{st,why}}
function leftOnTable(m='you'){const cs=custSet(m),en=new Set();try{(JSON.parse(localStorage.getItem('ptt.user_promo')||'[]')||[]).forEach(u=>{['promo_key','legacy_promo_key','promo_id'].forEach(k=>u&&u[k]&&en.add(u[k]))})}catch(e){}
 const arch=(STO.wallet.archive||[]).filter(a=>a&&a.sec),archInst=a=>a.sec=='cards'?((C[BYID0[a.id]]||{}).i||'').split(' ')[0].toLowerCase():a.sec=='banks'?(((D.bank?.accounts||[]).find(o=>o.id==a.id)||{}).i||'').split(' ')[0].toLowerCase():String(a.i||'').toLowerCase();
 const ctx={cs,en,arch,archInst,today:new Date()},isE=p=>(p.source_tag&&p.source_tag!='CITED')||/estimate/i.test(p.vm||''),sum=a=>a.reduce((t,p)=>t+p.v,0);
 /* broker % match offers pay on what you move: with 'Investable assets' set, use the payout at your amount (pAum) */
 const pv=p=>p.line=='broker'&&AUM()>0&&p.match_pct!=null&&pAum(p)!=null?Math.min(p.v,pAum(p)):p.v;
 const live=PROMO.filter(p=>PACT(p)&&typeof p.v=='number'&&p.v>0),best=L=>{const g={};L.forEach(p=>{const k=pSeries(p);if(!g[k]||p.v>g[k].v)g[k]=p});return Object.values(g)};
 const act=best(live),S=live.map(p=>({p,...promoState(p,ctx)})),ok=S.filter(x=>x.st=='ok').map(x=>x.p),nCheck=new Set(S.filter(x=>x.st=='check').map(x=>pSeries(x.p))).size;
 let ach=best(ok.map(p=>({...p,v:pv(p)})).filter(p=>p.v>0));{const top={};ach.filter(p=>p.sc=='new_inst').forEach(p=>{const k=p.line+'|'+p.ik;if(!top[k]||p.v>top[k].v)top[k]=p});ach=ach.filter(p=>p.sc!='new_inst'||top[p.line+'|'+p.ik]===p)}
 const yr=12*WCATS.reduce((t,k)=>t+(+W.spend[k]||0),0),need=p=>p.line=='cards'&&/spend/i.test(p.min_deposit_or_spend||'')?pMinK(p)||0:0;let left=yr,nSpend=0;
 ach=ach.sort((a,b)=>(b.v/Math.max(need(b),1))-(a.v/Math.max(need(a),1))).filter(p=>{const n=need(p);if(!n)return true;if(n<=left){left-=n;return true}nSpend++;return false});
 return{achL:ach,empty:!wCount(),nLive:act.length,tot:sum(act),nAch:ach.length,ach:sum(ach),estT:act.some(isE),estA:ach.some(isE),nCheck,nSpend,spendYr:yr}}
/* One reusable invite for every ◆ tab: INV[tab]() -> {rows:[{v,label,est,big}],how,note}. All figures computed on this device. */
const INV={};/* invite copy per premium view (only pyt), shown when PAYWALL is on */
const invHTML=pl=>{const f=INV[pl];if(!f)return '';const o=f(),E=x=>x?'<small class=plest title="Includes estimated values">est.</small>':'';return o.rows.map(r=>`<div class=plrow><span class=${r.big?'plbig':'plmid'}>${$$(r.v)}${E(r.est)}</span> <span class=plsub>${r.label}</span></div>`).join('')+(o.how?`<p class=plhow>${o.how}</p>`:'')+`<p class=plnote>${o.note}</p>`};
function gate(){const v0=$('#view');if(!v0)return;v0.querySelectorAll('#plock').forEach(e=>e.remove());v0.querySelectorAll('.plocked').forEach(e=>e.classList.remove('plocked'));
 /* premium views = PREM (only Per Your Terms, which locks its own figures in pytHTML); a view may mark its premium part [data-prem]. Profile, Wallet, Subscriptions, Points and every product tab are free */
 const v=v0.querySelector('[data-prem]')||v0,lock=!isPaid()&&PREM.has(st.s)&&st.s!='pyt'&&!st.card&&!v0.hidden;
 v.classList.toggle('plocked',lock);[...v.children].forEach(c=>{if(lock){c.setAttribute('inert','');c.setAttribute('aria-hidden','true')}else{c.removeAttribute('inert');c.removeAttribute('aria-hidden')}});if(!lock)return;
 let body=invHTML(st.s);
 const d=document.createElement('div');d.id='plock';d.setAttribute('role','dialog');d.setAttribute('aria-label','Premium');
 let nn=false;try{nn=sessionStorage.getItem('ptt.plnow')=='1'}catch(e){}
 d.innerHTML=nn?'':`<div class=plcard>${body}<p class=plprice><span class=premg aria-hidden=true>◆</span> Premium</p><p class=plbtns><a class="btn plbtn" href="${PREMIUM_URL.mo}" data-unlock=mo>Unlock for $5/mo</a> <a class="btn plbtn2" href="${PREMIUM_URL.yr}" data-unlock=yr>$50/yr</a></p><button type=button class=lnk data-plnow>Not now</button></div>`;v.prepend(d)}
/* 'Not now' hides the invitation for this browser session; the view stays blurred */
document.addEventListener('click',e=>{if(!e.target.closest('[data-plnow]'))return;try{sessionStorage.setItem('ptt.plnow','1')}catch(_){}const c=document.querySelector('#plock .plcard');if(c)c.remove()});
{const _r=render;render=function(){const out=_r.apply(this,arguments);try{gate()}catch(e){}return out}}

/* v3.5.2: the card name itself opens its popup (click, Enter/Space, or hover after a short pause on pointer devices). */
{let ht;const HOV=matchMedia('(hover:hover) and (pointer:fine)');document.addEventListener('mouseover',e=>{const b=e.target.closest&&e.target.closest('.nmb');if(!b||!HOV.matches)return;clearTimeout(ht);ht=setTimeout(()=>{if(b.matches(':hover')&&!document.querySelector('#mbg.on'))b.click()},450)});document.addEventListener('mouseout',e=>{if(e.target.closest&&e.target.closest('.nmb'))clearTimeout(ht)})}


/* v3.5.9 archived terms viewer: our dated PDF copy in an in-app modal (close, open in new tab, download) */
function pdfModal(u,t,d){$('#pdfm')?.remove();document.body.insertAdjacentHTML('beforeend',`<div id=pdfm role=dialog aria-modal=true aria-label="Archived terms"><div class=pdfbox><div class=pdfhd><div><b>${esc(t)}</b><small>Archived ${esc(fmtD(d))}</small></div><a class=btn href="${esc(u)}" target=_blank rel=noopener>Open in new tab ↗</a><a class=btn href="${esc(u)}" download>Download</a><button type=button class=btn data-pdfx aria-label=Close>✕</button></div><iframe src="${esc(u)}#view=FitH" title="Archived terms PDF"></iframe></div></div>`);$('#pdfm [data-pdfx]').focus()}
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&$('#pdfm'))$('#pdfm').remove()});

/* v3.7.1 Per Your Terms: one ranked list of actions by $/yr across everything you hold, computed on-device from Profile.
   cards  = rewards at your Monthly Spend minus effective fees (perks not added); Replace/Add/Cancel/Downgrade tested one move at a time; income rules respected.
   bank   = sourced fees after balance waivers and product-count rebates (same engine as Banking); Switch when another account costs less.
   promos = achievable offers (leftOnTable), one-time, shown as Enroll. Telecom/points: no priced moves in the data yet, so nothing is invented. */
function pytActions(){const A=[],P=PRF(),cs=W.cards.map(i=>C[BYID0[i]]).filter(Boolean),net=L=>pytRew(L).rew-L.reduce((t,c)=>t+(effFee(c)||0),0),base=net(cs);
 const elig=c=>!(c.inc&&P.inc!=null&&P.inc<c.inc&&!(c.hinc&&P.hinc!=null&&P.hinc>=c.hinc)),pool=C.filter(c=>LIVE(c)&&!cs.includes(c)&&elig(c)),sp=WCATS.some(k=>+W.spend[k]>0);
 if(sp){cs.forEach(h=>{const rest=cs.filter(c=>c!=h);let b=null;pool.forEach(c=>{const g=net([...rest,c])-base;if(!b||g>b.g)b={c,g}});
   const gc=net(rest)-base;if(gc>=10&&(!b||gc>=b.g))A.push({t:'Cancel',v:gc,txt:`Cancel ${h.n}`,why:`Its $${effFee(h)||0}/yr fee is more than the rewards it adds over your other cards at your spending.`});
   else if(b&&b.g>=10){const dn=b.c.i==h.i&&(effFee(b.c)||0)<(effFee(h)||0);A.push({t:dn?'Downgrade':'Replace',v:b.g,txt:`${dn?'Downgrade':'Replace'} ${h.n} with ${b.c.n}`,why:`Net of fees at your Monthly Spend: ${$$(net([...rest,b.c]))}/yr vs ${$$(base)}/yr now.${b.c.fee?' Fee $'+b.c.fee+'/yr included.':''}`})}});
  let b=null;pool.forEach(c=>{const g=net([...cs,c])-base;if(!b||g>b.g)b={c,g}});if(b&&b.g>=10)A.push({t:'Add',v:b.g,txt:`Add ${b.c.n}`,why:`Earns ${$$(b.g)}/yr more than your current cards on the categories it wins, after its fee.`})}
 const inp=BANK.inp(),acc=BANK.data().accounts.filter(o=>o.st!='discontinued');(STO.wallet.banks||[]).forEach(x=>{const o=acc.find(a=>a.id==x.id)||BANK.data().accounts.find(a=>a.id==x.id);if(!o)return;const c0=BANK.cost(o,inp).c;if(c0==null)return;
  let b=null;acc.forEach(a=>{if(a==o)return;const c=BANK.cost(a,inp);if(c.c!=null&&(!b||c.c<b.c))b={a,...c}});if(b&&c0-b.c>=10)A.push({t:'Switch',v:c0-b.c,txt:`Switch chequing to ${b.a.n}${b.c==0?': fee waived':''}`,why:`${o.n} costs ${$$(c0)}/yr at your inputs; ${b.a.n} costs ${$$(b.c)}/yr${b.why.length?' ('+b.why.join(', ').replace(/<[^>]+>/g,'')+')':''}.`})});
 (STO.wallet.tel||[]).filter(x=>x&&x.mo!=null).forEach(x=>{const gb=+x.gb||0;let b=null;(D.telplans||[]).forEach(p=>{const m=+p.price_cad_mo;if(p.kind!='plan'||!p.price_cad_mo||isNaN(m)||p.holding_id==x.hid||(+p.data_gb||0)<gb)return;if(!b||m<b.m)b={p,m}});
  if(b&&(x.mo-b.m)*12>=10)A.push({t:'Switch',v:(x.mo-b.m)*12,tag:b.p.tag,txt:`Switch ${x.i} to ${b.p.brand} ${b.p.plan}`,why:`$${b.m}/mo vs $${x.mo}/mo with at least your data (${b.p.data_gb||'?'} GB). Price basis: ${b.p.price_basis||'as listed'}.`})});
 /* tier and multi-line value, from the same rules (D.cmod provider rows, D.telplans multiline_discount); only $-denominated rows with an input to price them count */
 pytTierMoves().forEach(m=>A.push(m));
 try{leftOnTable().achL.forEach(p=>A.push({t:'Enroll',v:p.v,once:1,tag:p.tag||p.source_tag,txt:(()=>{const n=p.prod||p.t||'',i=p.inst||'';return 'Enroll: '+(i&&!n.toLowerCase().startsWith(i.toLowerCase().split(' ')[0])?i+' '+n:n||i).trim()})(),why:`Achievable sign-up offer for your wallet and history${p.min_deposit_or_spend?'; requires '+p.min_deposit_or_spend:''}. One-time value.`}))}catch(e){}
 return A.sort((a,b)=>b.v-a.v)}
INV.pyt=()=>{const A=pytActions(),v=A.reduce((t,a)=>t+a.v,0);return{rows:[{v,label:'more per year on your terms',big:1}],how:'see the exact moves',note:`${A.length} action${A.length==1?'':'s'} across cards, banking and promos, from your Profile.${wCount()?'':' Add your holdings and spending above for a sharper number.'}`}};
function pytTierMoves(){const A=[],P=PRF(),tg=r=>r.tag=='CITED'?'CITED':r.tag=='REPORTED'?'REPORTED':'ESTIMATE';
 provGrants().forEach(g=>{const v=+g.value;if(!(v>0))return;let amt=null,how='';
  if(g.target=='credit_card_annual_fee'&&g.unit=='CAD/yr'){const c=W.cards.map(i=>C[BYID0[i]]).filter(c=>c&&c.fee>0&&c.i.startsWith(g.provider.split(' ')[0])&&effFee(c)>=c.fee).sort((a,b)=>b.fee-a.fee)[0];if(c){amt=Math.min(v,c.fee);how=` on your ${c.n} ($${c.fee}/yr fee)`}}
  else if(g.unit=='CAD/yr')amt=v;else if(g.unit=='CAD/mo')amt=v*12;
  if(amt>=1)A.push({t:'Tier',v:amt,tag:tg(g),txt:`${g.perk}${how} via ${g.via}`,why:`From your ${g.via} tier (rules table, ${tg(g)}). Make sure it is applied to your account.${g.qual?' Qualifies: '+g.qual+'.':''}`})});
 const bal=+P.bal||0;if(bal>0)[...new Set((D.cmod||[]).filter(r=>r.provider&&r.effect=='rate'&&r.metric=='chequing_interest').map(r=>r.provider))].forEach(i=>{const r=provRate(i,'chequing_interest');if(!r)return;
  const base=Math.min(...(D.cmod||[]).filter(x=>x.provider==i&&x.effect=='rate'&&x.metric=='chequing_interest').map(x=>x.value)),amt=bal*(r.value-base)/100;
  if(amt>=1)A.push({t:'Tier',v:amt,tag:tg(r),txt:`${i} ${provTier(i)} chequing interest ${r.value}% (vs ${base}%)`,why:`On your $${bal.toLocaleString()} balance: ${r.value}% at ${provTier(i)} vs ${base}% at the base tier (${tg(r)}).`})});
 const n={};(STO.wallet.tel||[]).forEach(x=>{const b=x&&(x.brand||String(x.i||'').split(' · ')[0]);if(b)n[b]=(n[b]||0)+1});
 (D.telplans||[]).filter(p=>p.kind=='multiline_discount').forEach(p=>{const m=/(\d+)(?:-(\d+))?-lines$/.exec(p.holding_id)||[],c=n[p.brand]||0;if(!(c>=+m[1]&&c<=+(m[2]||m[1])))return;
  A.push({t:'Claim',v:-p.price_cad_mo*c*12,tag:tg(p),txt:`${p.brand} ${p.plan}: $${(-p.price_cad_mo).toFixed(2)}/line/mo × ${c} lines`,why:`${p.price_basis}. Check your bill shows it (${tg(p)}).`})});
 return A}
/* Per Your Terms (left column, st.s='pyt'): wallet optimization, the ranked moves for what you hold and your inputs in Profile */
function renderPyt(){$('#view').innerHTML=`<div class="prof pstack"><div class=vhead><h2>Per Your Terms</h2><span class=premg role=img aria-label=Premium title=Premium>◆</span></div><p class=lead>Wallet optimization: your next moves, ranked by dollars a year, from what you hold and your inputs in <button type=button class=lnk data-s=profile>Profile</button>.</p>${pytHTML()}</div>`}
function pytHTML(){try{return pytHTML0()}catch(e){console.error('Per Your Terms',e);return `<section class=psec id=pw-pyt data-err="${esc(String(e&&e.stack||e)).slice(0,300)}"><h3 class=pyt>Per <em>Your</em> Terms</h3><p class=mute>Couldn’t compute right now.</p></section>`}}
function pytHTML0(){const A=pytActions(),tot=A.reduce((t,a)=>t+a.v,0),lock=!isPaid();
 const list=A.length?`<ol class=pytl>${A.map((a,i)=>`<li><span class=oty>${a.t}</span><span class=otx>${esc(a.txt)} <span class=t title="${a.tag?'from the source row':'computed at your inputs'}">${a.tag||'ESTIMATE'}</span></span><b class=ov>+${$$(a.v)}${a.once?'':'<small>/yr</small>'}</b><button type=button class=lnk data-ocm=${i} aria-label="Why: ${esc(a.txt)}">Why</button></li>`).join('')}</ol>`:'<p class=mute>No moves worth $10+ a year at your current inputs.</p>';
 return `<section class=psec id=pw-pyt><h3 class=pyt>Per <em>Your</em> Terms <span class=premg title=Premium aria-label=Premium>◆</span></h3><div class=pytw${lock?' data-lock':''}><div class=optin ${lock?'inert aria-hidden=true':''}>${MEMS().length>1?`<p class=omute>Achievable promos by person: ${MEMS().map(([id,l])=>`${esc(l)} ${$$(leftOnTable(id).ach)}`).join(' · ')}</p>`:''}<p class=omute>Your situation, every line at once: ${$$(tot)} a year in moves, ranked.</p>${list}</div>${lock?`<div class=pytlock role=dialog aria-label=Premium>${plCard(invHTML('pyt'))}</div>`:''}</div></section>`}
const plCard=body=>`<div class=plcard>${body}<p class=plprice><span class=premg aria-hidden=true>◆</span> Premium</p><p class=plbtns><a class="btn plbtn" href="${PREMIUM_URL.mo}" data-unlock=mo>Unlock for $5/mo</a> <a class="btn plbtn2" href="${PREMIUM_URL.yr}" data-unlock=yr>$50/yr</a></p><button type=button class=lnk data-plnow>Not now</button></div>`;
document.addEventListener('click',e=>{const b=e.target.closest('[data-ocm]');if(!b)return;const a=pytActions()[+b.dataset.ocm];if(!a)return;$('#ocm')?.remove();
 document.body.insertAdjacentHTML('beforeend',`<div id=ocm role=dialog aria-modal=true aria-label="${esc(a.t)}"><div class=plcard><p class=plsub>${esc(a.t)}</p><div class=plrow><span class=plbig>+${$$(a.v)}</span> <span class=plsub>${a.once?'one-time':'per year'}</span></div><p><b>${esc(a.txt)}</b></p><p class=plnote>${esc(a.why)}</p><button type=button class=btn data-ocx>Close</button></div></div>`);$('#ocm [data-ocx]').focus()});
document.addEventListener('click',e=>{if(e.target.closest('[data-ocx]')||e.target.id=='ocm')$('#ocm')?.remove()});

/* v3.7.2 D.bacct (broker account types) + D.telplans (cited telecom plans): a Profile add of "Broker · TFSA" or "Brand · Plan" stores structured fields on the holding */
const TPL=k=>(D.telplans||[]).find(p=>p.brand+' · '+p.plan==k),BAC=k=>{const[b,t]=String(k).split(' · ');const B=(D.bacct||[]).find(x=>x.i==b);return B&&t?{B,a:B.accts.find(a=>a.t==t)}:null};
{const _w=wAdd;wAdd=function(sec,v){const r=_w.apply(this,arguments);const x=(STO.wallet[sec]||[]).find(h=>h&&h.i==String(v||'').trim());if(x){
 if(sec=='tel'){const p=TPL(x.i);if(p)Object.assign(x,{hid:p.holding_id,brand:p.brand,plan:p.plan,mo:p.price_cad_mo!=''&&p.price_cad_mo!=null?+p.price_cad_mo:null,gb:p.data_gb})}
 if(sec=='brokerage'){const b=BAC(x.i);if(b)Object.assign(x,{broker:b.B.i,acct:b.a?.t||null,reg:!!b.a?.reg})}saveS()}return r}}

/* additional cardholders: captured at add time, editable per card; feeds annual cost (fee + n × additional-card fee) and earn rules */
function addlRows(){const cs=W.cards.map(i=>C[BYID0[i]]).filter(Boolean);if(!cs.length)return '';
 return `<table class=vt data-addlt><tr><th class=l>Card</th><th>Additional cardholders</th><th>Additional-card fee</th><th>Annual cost</th><th class=l>Earn</th></tr>${cs.map(c=>{const n=ADDL(c.id),b=boostNote(c);return `<tr><td class=l>${esc(c.n)}</td><td><input type=number min=0 max=9 step=1 value="${n}" data-addl="${c.id}" aria-label="Additional cardholders on ${esc(c.n)}" style="width:5em"></td><td>${c.add==null?'—':c.add==0?'$0/yr':'$'+c.add+'/yr'}</td><td>${effFee(c)==null?'—':'$'+effFee(c)+'/yr'}</td><td class=l>${b?`<span class=boost title="${esc(b)}" aria-label="${esc(b)}">↑ boosted</span>`:'—'}</td></tr>`}).join('')}</table>`}
document.addEventListener('submit',e=>{const f=e.target.closest('[data-wadd=cards]');if(!f||!f.addl)return;const n=Math.max(0,Math.min(9,+f.addl.value||0)),v=f.v.value.trim().toLowerCase(),c=C.find(x=>x.n.toLowerCase()==v||x.id==v);if(c&&!W.cards.includes(c.id)){STO.wallet.addl={...(STO.wallet.addl||{}),[c.id]:n}}},true);
document.addEventListener('change',e=>{const id=e.target.dataset.addl;if(!id)return;STO.wallet.addl={...(STO.wallet.addl||{}),[id]:Math.max(0,Math.min(9,+e.target.value||0))};STO.wallet.updated_at=NOW();saveS();setTimeout(render,0)});

/* v3.7.4 household ownership: every holding has owners (member ids). Members come from You › household: you, spouse (if set), kid1..kidN (nicknames optional).
   Stored in wallet.owner {"sec|key":[ids]} (absent = ['you']); exported with the wallet. Eligibility is per person: custSet(m)/leftOnTable(m) count only holdings that member owns (joint counts for each owner). */
const MEMS=()=>{const P=PRF(),N=P.names||{},o=[['you','You']];if(P.spouse)o.push(['spouse',N.spouse||'Spouse']);for(let i=1;i<=Math.min(+P.kidsN||0,8);i++)o.push(['kid'+i,N['kid'+i]||'Kid '+i]);return o};
const ownOf=(sec,k)=>((STO.wallet.owner||{})[sec+'|'+k])||['you'];
const mine=(sec,k,m='you')=>ownOf(sec,k).includes(m);
const pwKeys=k=>k=='cards'?W.cards.filter(i=>C[BYID0[i]]):k=='banks'?(STO.wallet.banks||[]).filter(x=>BANK.data().accounts.some(a=>a.id==x.id)).map(x=>x.id):k=='services'?(STO.wallet.services||[]).filter(s=>SUBS.some(x=>x.k==s)):(STO.wallet[k]||[]).filter(x=>x&&x.i).map(x=>x.i);
function setOwn(sec,k,ids){STO.wallet.owner={...(STO.wallet.owner||{})};if(!ids.length||(ids.length==1&&ids[0]=='you'))delete STO.wallet.owner[sec+'|'+k];else STO.wallet.owner[sec+'|'+k]=ids;STO.wallet.updated_at=NOW();saveS()}
function ownRows(k){const M=MEMS();if(M.length<2)return '';const ks=pwKeys(k);if(!ks.length)return '';const nm=WSEC().find(x=>x[0]==k)?.[2]||[];
 return `<div class=owrs>${ks.map(key=>{const o=ownOf(k,key),n=(nm.find(x=>x.k==key)||{}).n||key;return `<div class=owr><span>${esc(n)}</span>${M.map(([id,l])=>`<label class="chip${o.includes(id)?' on':''}"><input type=checkbox data-own="${esc(k+'|'+key)}" value=${id} ${o.includes(id)?'checked':''}> ${esc(l)}</label>`).join('')}</div>`}).join('')}</div>`}
document.addEventListener('change',e=>{const d=e.target.dataset.own;if(!d)return;const[sec,...r]=d.split('|'),k=r.join('|'),ids=[...document.querySelectorAll(`[data-own="${CSS.escape(d)}"]`)].filter(x=>x.checked).map(x=>x.value);setOwn(sec,k,ids.length?ids:['you']);setTimeout(render,0)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-pmem]');if(!b)return;st.pmem=b.dataset.pmem;render()});
/* owner chosen at add time: remember the form's owner, apply once the holding exists */
document.addEventListener('submit',e=>{const f=e.target.closest('[data-wadd]');if(!f||!f.own)return;const sec=f.dataset.wadd,ids=f.own.value.split(','),before=new Set(pwKeys(sec));setTimeout(()=>{pwKeys(sec).filter(k=>!before.has(k)).forEach(k=>setOwn(sec,k,ids));render()},0)},true);
/* nicknames for household members (You › household) */
function memNames(){const M=MEMS().slice(1);return M.length?`<div class="pqr you-m">Names (optional): ${M.map(([id,l])=>`<label class=kidb>${id=='spouse'?'Spouse':id.replace('kid','Kid ')} <input data-mname=${id} value="${esc((PRF().names||{})[id]||'')}" placeholder="${esc(l)}" style="width:7em"></label>`).join(' ')}</div>`:''}
document.addEventListener('change',e=>{const id=e.target.dataset.mname;if(!id)return;const P=PRF();P.names={...(P.names||{})};const v=e.target.value.trim();if(v)P.names[id]=v.slice(0,24);else delete P.names[id];saveS();setTimeout(render,0)});
/* v3.8.1 one search box across the whole database: tap a result to add it; fee/earn/perks/logo come from the record, you add only owner/cardholders/dates */
const WSI=()=>{const L=[];WSEC().forEach(([k,n,_,o])=>{if(!PWS.some(x=>x[0]==k)||!o)return;const sec=PWS.find(x=>x[0]==k)[1];o.forEach(([key,l])=>L.push({k,key,l,sec,q:(l+' '+key).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}))});
 return L};
function wsFind(q){q=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();if(!q)return [];const t=q.split(/\s+/),L=WSI();
 return L.map(x=>{if(!t.every(w=>x.q.includes(w)))return null;const sc=(x.q.startsWith(q)?0:1)+(x.q.split(/\W+/).some(w=>w.startsWith(t[0]))?0:1);return{...x,sc}}).filter(Boolean).sort((a,b)=>a.sc-b.sc||a.l.length-b.l.length).slice(0,8)}
const wsHeld=x=>pwKeys(x.k).some(k=>k==x.key||k==x.l);
document.addEventListener('input',e=>{if(!e.target.matches('[data-wsearch]'))return;const r=wsFind(e.target.value),box=document.getElementById('wsres');if(!box)return;
 box.innerHTML=r.map((x,i)=>`<button type=button role=option class=wsr data-wpick=${i} ${wsHeld(x)?'disabled':''}><span class=wss>${esc(x.sec)}</span> ${esc(x.l)}${wsHeld(x)?' <small class=mute>✓ in your wallet</small>':''}</button>`).join('')||(e.target.value.trim()?'<p class=mute>No match. Try fewer letters.</p>':'');box._r=r});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.matches('[data-wsearch]')){e.preventDefault();document.querySelector('#wsres [data-wpick]:not([disabled])')?.click()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-wpick]');if(!b)return;const x=document.getElementById('wsres')._r[+b.dataset.wpick];if(!x)return;
 const before=new Set(pwKeys(x.k));wAdd(x.k,x.k=='banks'||x.k=='cards'?x.key:x.l);const nk=pwKeys(x.k).filter(k=>!before.has(k));
 render();requestAnimationFrame(()=>{const el=document.getElementById('pw-'+x.k);el?.scrollIntoView({block:'start'});el?.classList.add('flash');const i=document.querySelector('[data-wsearch]');if(i)i.focus()})});
/* v3.8.2 tier-aware provider rates (FREE): same rules table (D.cmod, provider rows). Applies only when you hold the provider. */
/* rules generated from CSVs name cards (card_name); resolve to ids once, by normalized name */
{const nz=x=>String(x||'').toLowerCase().replace(/[®*™]/g,'').replace(/\bfrom american express\b|\bamerican express\b|\bamex\b|\bcard\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim(),N={};C.forEach(c=>{N[nz(c.n)]=c.id;N[nz(c.i+' '+c.n)]=c.id});(D.cmod||[]).forEach(r=>{if(!r.card&&r.card_name)r.card=N[nz(r.card_name)]||N[nz('American Express '+r.card_name)]||null})}
/* a held bank account named for a provider tier (e.g. RBC VIP Banking) puts you in that tier */
const provBankTier=i=>{const T=[...new Set((D.cmod||[]).filter(r=>r.provider==i).flatMap(r=>(r.when||[]).filter(w=>w.f=='tier').map(w=>w.v)).flat())];for(const x of STO.wallet.banks||[]){const a=(D.bank?.accounts||[]).find(a=>a.id==x.id);if(a&&a.i.startsWith(i.split(' ')[0])){const t=T.find(t=>typeof t=='string'&&a.n.toLowerCase().includes(t.toLowerCase().replace(/ banking$| package$| plan$/,'')));if(t)return t}}return null};
const provHeld=i=>(STO.wallet.brokerage||[]).some(x=>x&&(x.i==i||x.broker==i||String(x.i).startsWith(i+' ')))||(STO.wallet.banks||[]).some(x=>((D.bank?.accounts||[]).find(a=>a.id==x.id)||{}).i==i);
function provTier(i){const ut=(STO.wallet.tiers||{})[i];if(ut)return ut;const bt=provBankTier(i);if(bt)return bt;if(!provHeld(i))return null;const t=BTIER(i)||((STO.wallet.brokerage||[]).find(x=>x&&(x.broker==i)&&x.tier)||{}).tier;if(t)return t;const b=(D.cmod||[]).find(r=>r.provider==i&&r.effect=='tier_bands'),v=PRF()[b?.field];if(!b||v==null)return null;let o=null;b.bands.forEach(([m,n])=>{if(+v>=m)o=n});return o}
function provRate(i,metric){const t=provTier(i);if(!t)return null;const cx={...PRF(),tier:t};return (D.cmod||[]).find(r=>r.provider==i&&r.effect=='rate'&&r.metric==metric&&ruleOn(r,cx))||null}
const rateMark=r=>`<span class=rmk tabindex=0 role=note title="${esc(r.when?.[0]?.v||'')} rate (${r.tag=='CITED'?'cited':'estimate'})" aria-label="${esc(r.when?.[0]?.v||'')} rate (${r.tag=='CITED'?'cited':'estimate'})">◇</span>`;
{const _ro=rateOf;rateOf=function(p){const r=p&&p.i&&provRate(p.i,'chequing_interest');if(r)return{rate:r.value,label:r.value+'%'+rateMark(r),why:`${r.when[0].v} rate for your tier (${r.tag=='CITED'?'cited':'estimate'})`};return _ro.apply(this,arguments)}}
function provRatesHTML(i){const t=provTier(i);if(!t)return '';const cx={...PRF(),tier:t},R=(D.cmod||[]).filter(r=>r.provider==i&&r.effect=='rate'&&ruleOn(r,cx));return R.length?`<p class="omute provr" data-provr="${esc(i)}">Your ${esc(t)} rates: ${R.map(r=>`${esc(r.label)} <b>${r.value}${r.unit}</b>${rateMark(r)}`).join(' · ')}</p>`:''}
function provGrants(){const out=[];(D.brokers||[]).map(b=>b.i).concat([...new Set((D.cmod||[]).filter(r=>r.provider).map(r=>r.provider))]).filter((v,i,a)=>a.indexOf(v)==i).forEach(i=>{const t=provTier(i);if(!t)return;const cx={...PRF(),tier:t};(D.cmod||[]).filter(r=>r.provider==i&&r.effect=='grant_perk'&&ruleOn(r,cx)).forEach(r=>out.push({...r,via:i+' '+t}))});return out}
/* relationship tiers you declare (invitation or balance tiers with no account of their own, e.g. RBC Royal Circle); Wealthsimple comes from your holdings and assets */
const TIERP=()=>{const M={};(D.cmod||[]).forEach(r=>{if(r.provider&&r.provider!='Wealthsimple')(r.when||[]).forEach(w=>{if(w.f=='tier'&&typeof w.v=='string')(M[r.provider]=M[r.provider]||new Set).add(w.v)})});return Object.entries(M).sort()};
const tiersHTML=()=>{const U=STO.wallet.tiers||{};return `<section class=psec id=pw-tiers><h3>Relationship tiers</h3><p class=omute>Pick a tier you have with a provider. Its rates and perks then apply everywhere.</p><div class=ptiers>${TIERP().map(([i,T])=>`<label class=addl>${esc(i)} <select data-ptier="${esc(i)}"><option value="">—</option>${[...T].map(t=>`<option${U[i]==t?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`).join('')}</div></section>`};
document.addEventListener('change',e=>{const t=e.target.closest('[data-ptier]');if(!t)return;const U=STO.wallet.tiers={...(STO.wallet.tiers||{})};if(t.value)U[t.dataset.ptier]=t.value;else delete U[t.dataset.ptier];STO.wallet.updated_at=NOW();saveS();render()});
const grantsHTML=()=>{const G=provGrants();return G.length?`<section class=psec data-grants><h3>Perks from your tiers</h3><ul class=bkp>${G.map(g=>`<li><b>${esc(g.perk)}</b> <span class=mute>via ${esc(g.via)}</span> <span class=t title="${esc(g.quote||'')}">${g.tag=='CITED'?'cited':'estimate'}</span></li>`).join('')}</ul></section>`:''};
/* Brokerage tab (free): tier rate tables for every provider with rate rules; your column highlighted when you hold the provider */
function provTables(){const P=[...new Set((D.cmod||[]).filter(r=>r.provider&&r.effect=='rate').map(r=>r.provider))];return P.map(i=>{const R=(D.cmod||[]).filter(r=>r.provider==i&&r.effect=='rate'),T=((D.cmod||[]).find(r=>r.provider==i&&r.effect=='tier_bands')||{bands:[]}).bands.map(b=>b[1]),me=provTier(i),M=[...new Set(R.map(r=>r.metric))];
 return `<section class=psec data-provt="${esc(i)}"><h3>${esc(i)} rates by tier${me?` <span class=mute>· you: ${esc(me)}</span>`:''}</h3><table class=vt><tr><th class=l>Rate</th>${T.map(t=>`<th${t==me?' class=on':''}>${esc(t)}</th>`).join('')}</tr>${M.map(m=>{const l=R.find(r=>r.metric==m).label;return `<tr><td class=l>${esc(l)}</td>${T.map(t=>{const r=R.find(r=>r.metric==m&&ruleOn(r,{tier:t}));return `<td${t==me?' class=on':''}>${r?r.value+r.unit+(t==me?rateMark(r):'')+(r.tag!='CITED'?' <small class=mute>est.</small>':''):'—'}</td>`}).join('')}</tr>`}).join('')}</table></section>`}).join('')}
{const _rl=renderLine;renderLine=function(k){const o=_rl.apply(this,arguments);if(k=='broker'&&st.brs=='brov')$('#view').insertAdjacentHTML('beforeend',provTables());return o}}
/* relations web ("connecting the dots"): perks and fee waivers your provider tiers grant, from the same rules */
{const _cs=connSavings;connSavings=function(){const L=_cs.apply(this,arguments)||[];try{provGrants().forEach(g=>L.push({amt:null,txt:`${g.perk} via ${g.via}`,rule:g.tag=='CITED'?'tier rule, cited':'tier rule, estimate',src:(g.source||'').split(' ; ')[0]}));
 W.cards.map(i=>C[BYID0[i]]).filter(Boolean).forEach(c=>cmods(c).filter(r=>r.effect=='fee_add'&&r.value<0&&(r.when||[]).some(w=>w.f=='tier')).forEach(r=>L.push({amt:-r.value,txt:`${c.n} fee waived via ${c.i} ${provTier(c.i)}`,rule:'tier rule, '+(r.tag=='CITED'?'cited':'estimate'),src:r.source})))}catch(e){}return L}}
/* v3.9.0 Subscriptions (top nav, st.s='subscriptions'): perks ARE subscriptions. One list of every sub you have, paid or included (card/plan/tier/sub chain).
   Two folders: 'You have' (paying-twice, could-be-free flags) and 'You could use' (marked Would use + where to get them free/cheaper). State per sub in wallet.substate (exported). */
const SUBCAT=D.subcat||{prices:[],add:[]};
SUBCAT.add.forEach(a=>{if(!SUBS.some(s=>s.k==a.k))SUBS.push({k:a.k,n:a.n,rows:[],cat:1})});
const subName=k=>(SUBS.find(s=>s.k==k)||{}).n||k;
function subPrice(k){const p=SUBCAT.prices.find(x=>x.k==k)||SUBCAT.add.find(x=>x.k==k);if(p&&p.price_mo!=null)return{v:p.price_mo,tag:p.tag,src:p.source};const s=SUBS.find(s=>s.k==k),lp=s&&s.rows&&subsPrice(s);if(lp){const m=lp.p.match(/\$([\d.]+)\/(mo|yr)/);if(m)return{v:(+m[1])/(m[2]=='yr'?12:1),tag:lp.r.ev,src:lp.r.src}}return null}
const TODAYS=()=>new Date().toISOString().slice(0,10);
const ruleLive=r=>{const d=r.dur;return !(d&&d.type=='promo_until'&&d.end_date&&TODAYS()>d.end_date)};
const durFrac=r=>{const d=r.dur;if(!d||d.type=='permanent'||d.type=='reported_unverified')return 1;if(d.type=='promo_until'&&d.end_date){const m=(new Date(d.end_date)-new Date())/2629800000;return Math.max(0,Math.min(12,m))/12}if(d.type=='intro_months')return Math.min(12,+d.months||0)/12;return 1};
/* durability stated in a card perk row's own text (sourced row; blank when the text says nothing) */
const rowDur=r=>{const t=((r&&r.what)||'')+' '+((r&&r.cond)||''),m=t.match(/(\d+)[- ]?(?:months?|mo)\b[^.;]*?(?:free|trial)|free[^.;]*?(?:for up to |for )(\d+) months?|for up to (\d+) months/i);if(m)return{type:'intro_months',months:+(m[1]||m[2]||m[3])};if(/while linked/i.test(t))return{type:'while_linked'};return null};
const durWord=r=>{const d=r&&r.dur;if(!d)return '';if(d.type=='promo_until'&&d.end_date)return 'until '+new Date(d.end_date+'T12:00').toLocaleDateString('en-CA',{month:'short',year:'numeric'});if(d.type=='intro_months')return 'intro '+d.months+' mo';if(d.type=='reported_unverified')return 'reported, unverified';if(d.type=='permanent')return 'permanent';if(d.type=='while_linked')return 'while linked';return ''};
const DUR_RANK={permanent:0,promo_until:1,intro_months:1,reported_unverified:2};
const SUBST=()=>STO.wallet.substate||(STO.wallet.substate={});
const subHave=k=>(STO.wallet.services||[]).includes(k)||SUBST()[k]=='have';
/* what's included for you, with the chain that grants it: held products (card/plan rows), provider tiers, and sub→sub rules (closure, depth 3) */
function subIncluded(){const inc={};SUBS.forEach(s=>{if(!s.rows||!s.rows.length)return;const st=subsStatus(s);if(st.k=='cov')inc[s.k]={via:[st.t.replace(/^Covered by /,'')],row:st.r,dur:rowDur(st.r)}});
 const live=(D.cmod||[]).filter(r=>r.effect=='grant_sub'&&ruleLive(r));for(let d=0;d<3;d++)live.forEach(r=>{if(inc[r.sub])return;if(r.from_sub){if(subHave(r.from_sub)||inc[r.from_sub])inc[r.sub]={via:[...(inc[r.from_sub]?inc[r.from_sub].via:[]),subName(r.from_sub)],rule:r}}else if(r.provider&&tel_held(r.provider))inc[r.sub]={via:[r.provider],rule:r}});return inc}
const tel_held=p=>(STO.wallet.tel||[]).some(x=>x&&String(x.i||'').toLowerCase().startsWith(p.toLowerCase()));
const eligCard=c=>{const P=PRF();return !(c.inc&&P.inc!=null&&P.inc<c.inc&&!(c.hinc&&P.hinc!=null&&P.hinc>=c.hinc))};
/* ways to get sub k free/cheaper with something you don't hold yet (cards via perk rows; bundles via offer_sub rules on a provider you hold) */
function subWays(k){const out=[],lp=subPrice(k),s=SUBS.find(s=>s.k==k);
 (s&&s.rows||[]).forEach(r=>{if(rowCond(r)||subsHeld(r)||!r.pid)return;const c=C[BYID0[r.pid]];if(!c||!LIVE(c)||!eligCard(c))return;const fee=effFee0(c)||0,save=lp?lp.v*12:0;out.push({t:fee>0?'Switch':'Add',kind:'free',how:`free with ${c.n}`,net:save-fee,fee,tag:r.ev,src:r.src,dur:{type:r.ev=='CITED'?'permanent':'reported_unverified'}})});
 (D.cmod||[]).filter(r=>r.effect=='offer_sub'&&ruleLive(r)&&(r.grants||[]).includes(k)&&tel_held(r.provider)).forEach(r=>{const list=(r.grants||[]).reduce((t,g)=>t+((subPrice(g)||{}).v||0),0)||r.list_mo,share=lp?lp.v*r.price_mo/list:null;
  out.push({t:'Add',kind:'cheaper',how:`$${share!=null?share.toFixed(2):'—'}/mo via ${r.provider}: ${subName(r.sub).replace(new RegExp("^"+r.provider+" "),"")}`,net:lp&&share!=null?(lp.v-share)*12*durFrac(r):0,fee:0,tag:r.tag,src:r.source,dur:r.dur,rule:r})});
 return out.sort((a,b)=>b.net-a.net)}
/* discounts you already qualify for through what you hold: bundle offers on a held plan/tier, targeted offers on a held product */
function subQual(k){const s=SUBS.find(s=>s.k==k),c=s&&s.rows&&s.rows.length&&subsStatus(s);return [...subWays(k).filter(w=>w.kind=='cheaper'),...(c&&c.k=='cond'?[{kind:'targeted',how:c.t+': '+(c.r.what||''),net:0,tag:c.r.ev,src:c.r.src}]:[])]}
function subRows(){const inc=subIncluded(),S=SUBST(),keys=[...new Set([...(STO.wallet.services||[]),...Object.keys(S).filter(k=>S[k]),...Object.keys(inc),...SUBS.filter(s=>subQual(s.k).length).map(s=>s.k)])].filter(k=>SUBS.some(s=>s.k==k));
 return keys.map(k=>{const have=subHave(k),i=inc[k],p=subPrice(k)||(i&&i.rule&&i.rule.value_mo!=null?{v:+i.rule.value_mo,tag:i.rule.tag}:null),st=S[k]||(have?'have':null);const twice=have&&!!i,ways=(have&&!i)||st=='would'?subWays(k):[],q=i?[]:subQual(k);
  return{k,n:subName(k),have,st,inc:i,p,twice,ways,q,save:twice&&p?p.v*12:0}})}
/* details opened in place under a tile: chain, durability, cost, how you qualify, cheaper via what you hold */
function subDet(x){const r=x.inc&&(x.inc.rule||x.inc.row),dw=x.inc&&durWord(x.inc.rule||x.inc),tag=r&&(r.tag||r.ev),qual=r?[r.what||r.value_text,r.cond,r.qual,r.quote&&'“'+r.quote+'”'].filter(Boolean).join(' · '):'',src=r&&(r.source||r.src);
 const W2=[...x.q,...x.ways.filter(w=>!x.q.includes(w))],li=w=>`<li>${esc(w.how)}${w.fee?` (fee $${w.fee}/yr)`:''}${w.net?` · net ${$$(w.net)}/yr`:''}${durWord(w)?' · '+esc(durWord(w)):''} <span class=t>${esc(w.tag||'ESTIMATE')}</span></li>`;
 return `<dl class=sdet><dt>Chain</dt><dd>${x.inc?esc(x.inc.via.join(' → '))+' → '+esc(x.n):x.have?'Paid by you':'—'}</dd><dt>Lasts</dt><dd>${dw?esc(dw):'—'}</dd>
 <dt>Cost</dt><dd>${x.p?'$'+x.p.v.toFixed(2)+'/mo list <span class=t>'+esc(x.p.tag||'ESTIMATE')+'</span>':'—'}${x.inc||x.twice?' · $0/mo with what you hold':''}</dd>
 <dt>How you qualify</dt><dd>${qual?esc(qual)+(tag?` <span class=t>${esc(tag)}</span>`:''):'—'}${/^https?:/.test(src||'')?` · <a href="${esc(String(src).split(' ; ')[0])}" target=_blank rel=noopener>source</a>`:''}</dd>
 <dt>Cheaper via</dt><dd>${W2.length?`<ul>${W2.map(li).join('')}</ul>`:'—'}</dd></dl>`}
const subTile=x=>{const[a,b]=SUBSOL[x.k]||['#6d28d9','#3b0764'],pr=x.p?'$'+x.p.v.toFixed(2)+'/mo':'Price —',net=x.twice||(!x.have&&x.inc)?'$0/mo net':pr,dw=x.inc?durWord(x.inc.rule||x.inc):'';
 return `<div class=subc data-sub=${x.k}>${ctile({a,b,top:x.inc?'Included with what you hold':x.have?'Paid':x.q.length?'You qualify for a discount':'Not yet',name:x.n,foot:net+(dw?' · '+dw:''),mark:x.twice?'PAYING TWICE':'',attrs:`data-subsgo="${x.k}" aria-expanded=${st.subo==x.k}`})}${st.subo==x.k?subDet(x):`<p class=omute>${esc(x.inc?'via '+x.inc.via.join(' → '):x.have?'Paid by you':x.q[0]?x.q[0].how:'')}</p>`}
 ${x.twice?`<p class="sflag tw">Paying twice: already included via ${esc(x.inc.via.join(' → '))}. Cancel to save ${$$(x.save)}/yr.</p>`:''}
 ${(()=>{const S=SUBS.find(z=>z.k==x.k),c=S&&S.rows&&S.rows.length&&subsStatus(S);return c&&c.k=='cond'?`<p class="sflag cd">${esc(c.t)}: targeted, not counted as included.</p>`:''})()}
 ${x.ways.length?`<p class="sflag cf">${x.have?'Could be free/cheaper':'Get it'}: ${esc(x.ways[0].how)}${x.ways[0].fee?` (fee $${x.ways[0].fee}/yr)`:''} · net ${$$(x.ways[0].net)}/yr${durWord(x.ways[0])?' · '+esc(durWord(x.ways[0])):''}</p>`:''}
 <div class=subst role=group aria-label="${esc(x.n)}">${[['have','Have'],['would','Would use if discounted'],['no','Not interested']].map(([v,l])=>`<button type=button class="chip${x.st==v?' on':''}" data-subst="${x.k}" data-v=${v}>${l}</button>`).join('')}</div></div>`};
function renderSubscriptions(){const v=$('#view'),R=subRows(),tab=st.subt||'have',H=R.filter(x=>x.have||(x.inc&&x.st!='no'&&x.st!='would')).sort((a,b)=>(b.twice-a.twice)||(!!b.inc-!!a.inc)),U=R.filter(x=>!x.have&&!x.inc&&x.st!='no'&&(x.st=='would'||x.q.length)).sort((a,b)=>Math.max(0,...b.q.map(w=>w.net),...b.ways.map(w=>w.net))-Math.max(0,...a.q.map(w=>w.net),...a.ways.map(w=>w.net))||b.q.length-a.q.length);
 const paid=H.filter(x=>x.have&&x.p).reduce((t,x)=>t+x.p.v,0),net=H.filter(x=>x.have&&!x.twice&&x.p).reduce((t,x)=>t+x.p.v,0);
 v.innerHTML=`<div class="prof pstack"><div class=vhead><h2>Subscriptions</h2></div><p class=lead>Every subscription you have, paid or included with a card, plan or tier. What you pay, what you shouldn’t, and where to get the rest cheaper.</p>
 <p class=omute>Paying ${$$(paid)}/mo · net ${$$(net)}/mo after what’s already included · ${H.filter(x=>x.twice).length} paying twice · ${U.length} you could use</p>
 <div class=wsrch><input type=search data-ssearch placeholder="Find a subscription: ‘netflix’, ‘prime’, ‘dashpass’…" aria-label="Search subscriptions" autocomplete=off><div id=ssres></div></div>
 <div class=subtabs role=tablist><button role=tab class="${tab=='have'?'on':''}" aria-selected=${tab=='have'} data-subt=have>You have <span class=mute>${H.length}</span></button><button role=tab class="${tab=='could'?'on':''}" aria-selected=${tab=='could'} data-subt=could>You could use <span class=mute>${U.length}</span></button><button role=tab class="${tab=='tel'?'on':''}" aria-selected=${tab=='tel'} data-subt=tel>Telecom <span class=mute>${pwKeys('tel').length}</span></button></div>
 <section class="psec subpane" data-pane=${tab}>${tab=='tel'?pwSec(['tel','Your telecom plans'])+'<p class=omute>Plans and carriers on record: the <button type=button class="lnk plink" data-pl=tel>Telecom</button> tab.</p>':tab=='have'?(H.length?`<div class="tiles stiles">${H.map(subTile).join('')}</div>`:'<p class=mute>Nothing yet. Search above and mark what you have.</p>'):(U.length?`<div class="tiles stiles">${U.map(subTile).join('')}</div>`:'<p class=mute>Nothing you qualify for yet. Mark subscriptions “Would use if discounted” to see where to get them free or cheaper.</p>')}</section>
 ${grantsHTML()}</div>`}
document.addEventListener('click',e=>{const t=e.target.closest('[data-subt]');if(t){st.subt=t.dataset.subt;render();return}
 const b=e.target.closest('[data-subst]');if(b){const k=b.dataset.subst,v=b.dataset.v,S=SUBST(),cur=S[k]||(subHave(k)?'have':null),nv=cur==v?null:v;
  STO.wallet.services=(STO.wallet.services||[]).filter(x=>x!=k);if(nv=='have')STO.wallet.services.push(k);if(nv)S[k]=nv;else delete S[k];STO.wallet.updated_at=NOW();saveS();render();return}
 const r=e.target.closest('[data-spick]');if(r){const[k,v]=r.dataset.spick.split('|'),S=SUBST();STO.wallet.services=(STO.wallet.services||[]).filter(x=>x!=k);if(v=='have')STO.wallet.services.push(k);S[k]=v;saveS();st.subt=v=='have'?'have':'could';render();document.querySelector('[data-ssearch]')?.focus()}},true);
document.addEventListener('input',e=>{if(!e.target.matches('[data-ssearch]'))return;const q=e.target.value.toLowerCase().trim(),box=document.getElementById('ssres');if(!box)return;
 const L=q?SUBS.filter(s=>(s.n+' '+s.k).toLowerCase().includes(q)).slice(0,8):[];box.innerHTML=L.map(s=>`<div class=wsr><span>${esc(s.n)}</span> <button type=button class=chip data-spick="${s.k}|have">I have it</button> <button type=button class=chip data-spick="${s.k}|would">Would use</button></div>`).join('')||(q?'<p class=mute>No match.</p>':'')});
/* Per Your Terms: Cancel (paying twice), Switch/Add (free/cheaper another way, for paid subs and Would-use subs) */
function subActions(){const A=[];subRows().forEach(x=>{if(x.twice)A.push({t:'Cancel',v:x.save,txt:`Cancel ${x.n} (already included via ${x.inc.via.join(' → ')})`,why:'You pay for it and also get it included. One-time setup: activate the included one first.',dr:DUR_RANK[(x.inc.rule&&x.inc.rule.dur||{}).type]??0});
 const w=x.ways[0];if(w&&w.net>=10&&(x.have||x.st=='would'))A.push({t:w.t,v:w.net,txt:`${x.n}: ${w.how}`,why:`${x.have?'You pay '+(x.p?'$'+x.p.v.toFixed(2)+'/mo':'for it'):'You said you would use it if discounted'}; ${w.how}${w.fee?', net of the $'+w.fee+'/yr fee':''}.${durWord(w)?' '+durWord(w)+'.':''}`,dr:DUR_RANK[(w.dur||{}).type]??0})});return A}
{const _oa=pytActions;pytActions=function(){const A=_oa.apply(this,arguments);try{A.push(...subActions())}catch(e){}return A.sort((a,b)=>b.v-a.v||(a.dr||0)-(b.dr||0))}}

/* v3.9.1 Wallet = summary of everything held, then folder tabs Credit / Banking / Brokers / Telecom / Points.
   Each folder: the editor for that section + the deep context panel (same render as the tab's own Wallet, Banking panel untouched) + promos you qualify for in that category. */
const WFOLD=[['cards','Credit','cards',()=>renderCardsFolder(),['card','credit']],['banks','Banking','bank',()=>VIEWS.wfolder(),['bank']],['brokerage','Brokers','broker',()=>renderBrokerageWallet(),['broker','brokerage','invest']]];
function wDeep(pl,fn){const v=$('#view'),s0={pl:st.pl,s:st.s};let h='';try{st.pl=pl;st.s='wfolder';v.innerHTML='';fn();const d=document.createElement('div');d.innerHTML=v.innerHTML;d.querySelectorAll('.vhead,h2,[data-pgo],.pwnav').forEach(e=>e.remove());h=d.innerHTML}catch(e){console.error('wDeep',pl,e);h='<p class=mute>Details unavailable.</p>'}Object.assign(st,s0);return h}
function wPromos(kw){let L=[];try{L=(leftOnTable().achL||[]).filter(p=>{const k=String(p.kind||p.cat||p.type||p.line||'').toLowerCase();return kw.some(w=>k.includes(w))})}catch(e){}
 return `<section class=psec><h3>Active promos you qualify for <span class=mute>(${L.length})</span></h3>${L.length?`<ul class=wprom>${L.sort((a,b)=>b.v-a.v).slice(0,8).map(p=>`<li><b>${$$(p.v)}</b> ${esc(p.inst||'')}${p.t?': '+esc(p.t):''}${p.sc=='new_inst'?` <span class=mute>· New ${esc(p.inst||'')} customers only${p.cond?' · '+esc(p.cond):''}</span>`:''}</li>`).join('')}</ul>`:'<p class=mute>None right now for what you hold and your history.</p>'}</section>`}
{const _rmw=renderWallet;renderWallet=function(){_rmw();const v=$('#view'),all=v.querySelector('#pw-all');if(!all)return;const tab=st.wt&&WFOLD.some(f=>f[0]==st.wt)?st.wt:'cards',F=WFOLD.find(f=>f[0]==tab);
 const secs={};all.querySelectorAll('[id^=pw-]').forEach(s=>{if(s.id!='pw-all')secs[s.id.slice(3)]=s.outerHTML});const head=all.cloneNode(true);head.querySelectorAll('[id^=pw-],.pwnav').forEach(e=>e.remove());
 const sum=WFOLD.map(([k,n])=>{const c=pwKeys(k).length;return `<button type=button class="wsum${k==tab?' on':''}" data-wt=${k}><b>${c}</b> ${esc(n)}</button>`}).join('');
 const rest=[...v.querySelector('.pstack').children].filter(e=>e!==all&&!e.matches('.vhead,.lead')).map(e=>e.outerHTML).join('');
 const deep=wDeep(F[2],F[3]);
 v.innerHTML=`<div class="prof pstack"><div class=vhead><h2>Accounts</h2></div><p class=lead>Everything you hold. Pick a folder to edit it, see how to lower its fees, and the promos you qualify for.</p>
 <section class=psec id=pw-all>${head.innerHTML}<div class=wsums>${sum}</div></section>
 <div class="subtabs wtabs" role=tablist aria-label="Accounts folders">${WFOLD.map(([k,n])=>`<button role=tab class="${k==tab?'on':''}" aria-selected=${k==tab} data-wt=${k}>${esc(n)} <span class=mute>${pwKeys(k).length}</span></button>`).join('')}</div>
 <div class="subpane wfold" data-pane=${tab}>${secs[tab]||''}<section class="psec wdeep">${deep}</section>${tab=='brokerage'?'':wPromos(F[4])}</div>${rest}</div>`}}
VIEWS.wallet=renderWallet;
document.addEventListener('click',e=>{const t=e.target.closest('[data-wt]');if(t){st.wt=t.dataset.wt;render()}},true);
/* deep links from context strips / search land on the right folder */
document.addEventListener('click',e=>{const g=e.target.closest('[data-pgo]');if(g&&WFOLD.some(f=>f[0]==g.dataset.pgo))st.wt=g.dataset.pgo},true);

/* ◆ Premium page (route #premium, st.s='premium'): the upsell every invite popup links to. Stripe placeholders until checkout ships. */
const PIMG=/demo\.html$/.test(location.pathname)?'site/images/':'images/';
const STRIPE={mo:'#stripe-monthly-placeholder',yr:'#stripe-yearly-placeholder'}/* replace with Stripe Payment Links */;
const PREMF=[['pyt','Per Your Terms','Your next moves, ranked by $/yr.']];
function renderPremium(){const paid=isPaid();
 $('#view').innerHTML=`<div class="prof premp"><div class=vhead><h2><span class=premg aria-hidden=true>◆</span> Premium</h2></div>
 <p class=lead>Free shows every product and fee. Premium shows what your wallet is worth and what to do next.</p>
 <div class=prembuy>${paid?'<p><b>You have Premium.</b></p>':`<a class="btn plbtn" href="${STRIPE.mo}" data-stripe=mo aria-disabled=true title="Checkout coming soon">$5/mo</a> <a class="btn plbtn2" href="${STRIPE.yr}" data-stripe=yr aria-disabled=true title="Checkout coming soon">$50/yr</a> <span class=mute>Cancel anytime. Your data stays on this device.</span>`}</div>
 <div class=premgrid>${PREMF.map(([k,t,d])=>`<figure class=premf><img src="${PIMG}premium/${k}.png" alt="${esc(t)} screenshot" loading=lazy><figcaption><b>${esc(t)}</b><span>${esc(d)}</span></figcaption></figure>`).join('')}</div>
 <p class=omute>Free forever: every table, Wallet, and tier rates and fee waivers applied to what you hold.</p></div>`}
VIEWS.premium=renderPremium;if(!CARDS_ONLY)USR.add('premium');
document.addEventListener('click',e=>{const u=e.target.closest('[data-unlock],[data-premgo]');if(u){e.preventDefault();e.stopImmediatePropagation();st.s='premium';st.card=null;render();scrollTo(0,0);return}
 const s=e.target.closest('[data-stripe]');if(s){e.preventDefault();s.textContent='Checkout coming soon'}},true);
/* relations web is premium: free users get a blurred teaser with the figure */
{const _ch=connHTML;connHTML=function(){const h=_ch.apply(this,arguments);if(!PREM.has('web')||isPaid()||!h)return h;/* relations web is free: only Per Your Terms is premium */let n=0,v=0;try{const L=connSavings();n=L.length;v=L.reduce((t,x)=>t+(x.amt||0),0)}catch(e){}if(!n)return h;
 return `<div class=pytw data-relock><div class=premblur aria-hidden=true inert>${h}</div><div class=pytlock><p><b>${v?$$(v)+'/yr':n+' connections'}</b> in waivers and perks across what you hold.</p><button type=button class="btn plbtn" data-premgo>◆ See Premium</button></div></div>`}}

/* cards-only release Wallet (Docs/naming.md build modes): your cards, four monthly spend inputs, two result lines. Same store as the full Wallet (STO.wallet.cards / .spend).
   Line 1 = walletCalc().rows (best card per category among the cards you hold). Line 2 "leaving on the table" is not a walletCalc output, so it is derived here from the same optimizer:
   pytRew() over every live card on record for the same spend, per category, minus what your wallet earns. ESTIMATE, before annual fees and welcome bonuses. */
const WSP=[['groc','Groceries'],['dine','Dining'],['gas','Gas'],['other','Everything else']];
const WGAP_METHOD='ESTIMATE: your monthly spend × the earn rates on record (best live card per category, spend routed to the best rate first). Annual fees, welcome bonuses and category caps not on record are not counted. A ceiling, not a promise.';
function walletGap(R){const all=pytRew(C.filter(LIVE),{...W.spend});let tot=0;const rows=all.rows.map(a=>{const m=R.rows.find(r=>r.k==a.k),g=Math.max(0,a.r-(m?m.r:0));tot+=g;return{k:a.k,best:a,mine:m,g}});return{rows,tot}}
function renderWalletSimple(){const R=walletCalc(),cs=R.cs,has=WSP.some(([k])=>+W.spend[k]>0),nm=k=>(WSP.find(x=>x[0]==k)||[])[1]||CN[k]||k,pc=x=>(+x.r).toFixed(2).replace(/\.?0+$/,'')+'%';
 let l1,l2='';
 if(!cs.length)l1='<span class=mute>Add a card to see which one to use for each category.</span>';
 else if(!has)l1='<span class=mute>Enter your monthly spend to see which of your cards to use for each category.</span>';
 else{l1=R.rows.map(r=>`<b>${esc(nm(r.k))}</b> → ${r.use.length?esc(r.use[0].c.n)+' <span class=mute>'+pc(r.use[0])+'</span>':'<span class=mute>—</span>'}`).join('<br>');
  const G=walletGap(R),top=G.rows.slice().sort((a,b)=>b.g-a.g)[0];
  l2=G.tot>=1?`<b class=wgap>${$$(G.tot)}/yr</b> <span class="t" title="${esc(WGAP_METHOD)}">ESTIMATE</span><small>Biggest gap: ${esc(nm(top.k))}. ${esc(top.best.use[0].c.n)} earns ${pc(top.best.use[0])} there; your best earns ${top.mine&&top.mine.use[0]?pc(top.mine.use[0]):'0%'}.</small>`:`<b class=wgap>$0/yr</b> <span class="t" title="${esc(WGAP_METHOD)}">ESTIMATE</span><small>Your wallet already holds the best earn rate on record for what you entered.</small>`}
 const tiles=pwTiles('cards').join('');
 $('#view').innerHTML=`<div class="prof pstack wsimple"><div class=vhead><h2>Accounts</h2></div><p class=lead>Add the cards you hold and what you spend each month. It stays on this device.</p>
 <section class=psec id=pw-cards data-aws=cards><h3>Your cards <span class=mute>(${cs.length})</span></h3><div class="tiles ptiles">${tiles||'<p class=mute>None yet.</p>'}</div>
 <form class=awadd data-wadd=cards><input name=v list=pwl-cards placeholder="+ Add a card…" autocomplete=off aria-label="Add a card"><datalist id=pwl-cards>${C.filter(LIVE).map(c=>`<option value="${esc(c.n)}">`).join('')}</datalist><button type=submit class=btn>Add</button></form></section>
 <section class=psec id=pw-spend><h3>Monthly spend</h3><div class=wsp>${WSP.map(([k,n])=>`<label><span>${n}</span><input class=amt type=number min=0 step=10 inputmode=numeric data-sp=${k} value="${W.spend[k]||''}" placeholder="0" aria-label="${n}, dollars a month"></label>`).join('')}</div></section>
 <section class=psec id=pw-result><h3>Your result</h3><div class=wl1><span class=wlk>Best card per category</span><p>${l1}</p></div>${l2?`<div class=wl2><span class=wlk>Leaving on the table</span><p>${l2}</p></div>`:''}</section></div>`}
if(CARDS_ONLY){renderWallet=renderWalletSimple;VIEWS.wallet=renderWalletSimple}

/* boot last, so every view helper above (Per Your Terms, rules, invites) is initialized before the first render */
BANK.init();render();
