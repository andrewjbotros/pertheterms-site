/* Institution -> provider routing (Andrew 2026-11-05). Keep in sync with Website/server/lib/routing.js. */
(function (g) {
  const PROVIDER = { plaid: 'Plaid', snaptrade: 'SnapTrade', none: '—' };
  const ROWS = [
    { id: 'wealthsimple', match: /^(ws|wealthsimple)\b/i, name: 'Wealthsimple', kind: 'broker', snap: 'covered', plaid: 'uncertain', note: 'SnapTrade read+trade' },
    { id: 'questrade', match: /^questrade\b/i, name: 'Questrade', kind: 'broker', snap: 'covered', plaid: 'uncertain', note: 'SnapTrade read-only' },
    { id: 'td-direct', match: /^(td direct|td waterhouse|td easy|tddi)\b/i, name: 'TD Direct Investing', kind: 'broker', snap: 'covered', plaid: 'uncertain', note: 'SnapTrade read-only' },
    { id: 'webull', match: /^webull\b/i, name: 'Webull Canada', kind: 'broker', snap: 'covered', plaid: 'uncertain', note: 'SnapTrade read+trade; Plaid coverage uncertain' },
    { id: 'rbc-di', match: /^(rbc direct|rbc di)\b/i, name: 'RBC Direct Investing', kind: 'broker', snap: 'not', plaid: 'uncertain', note: 'Not on SnapTrade; try Plaid' },
    { id: 'bmo-il', match: /^(bmo investor|bmo il)\b/i, name: 'BMO InvestorLine', kind: 'broker', snap: 'not', plaid: 'uncertain', note: 'Not on SnapTrade; try Plaid' },
    { id: 'scotia-itrade', match: /^(scotia\s*itrade|itrade)\b/i, name: 'Scotia iTRADE', kind: 'broker', snap: 'not', plaid: 'uncertain', note: 'Not on SnapTrade; try Plaid' },
    { id: 'td', match: /^td\b/i, name: 'TD', kind: 'broker', snap: 'covered', plaid: 'uncertain', note: 'TD Direct Investing on SnapTrade; bank side on Plaid' },
    { id: 'rbc', match: /^rbc\b/i, name: 'RBC', kind: 'bank', snap: 'not', plaid: 'covered', note: 'Bank/card on Plaid; DI not on SnapTrade' },
    { id: 'bmo', match: /^bmo\b/i, name: 'BMO', kind: 'bank', snap: 'not', plaid: 'covered', note: 'Bank/card on Plaid; InvestorLine not on SnapTrade' },
    { id: 'cibc', match: /^cibc\b/i, name: 'CIBC', kind: 'bank', snap: 'not', plaid: 'covered' },
    { id: 'scotia', match: /^(scotia|scotiabank|bns)\b/i, name: 'Scotiabank', kind: 'bank', snap: 'not', plaid: 'covered' },
    { id: 'tangerine', match: /^tangerine\b/i, name: 'Tangerine', kind: 'bank', snap: 'not', plaid: 'covered' },
    { id: 'mbna', match: /^mbna\b/i, name: 'MBNA', kind: 'card', snap: 'not', plaid: 'covered' },
    { id: 'pc-financial', match: /^(pc financial|pcf|president'?s choice)\b/i, name: 'PC Financial', kind: 'bank', snap: 'not', plaid: 'uncertain', note: 'Plaid coverage unconfirmed' },
    { id: 'ws-business', match: /wealthsimple\s*business/i, name: 'Wealthsimple Business', kind: 'bank', snap: 'uncertain', plaid: 'uncertain', note: 'Coverage unconfirmed' },
    { id: 'national-bank', match: /^(nbdb|nbc|national bank)\b/i, name: 'National Bank', kind: 'bank', snap: 'uncertain', plaid: 'covered' },
    { id: 'eq', match: /^eq\b/i, name: 'EQ Bank', kind: 'bank', snap: 'not', plaid: 'covered' },
    { id: 'simplii', match: /^simplii\b/i, name: 'Simplii', kind: 'bank', snap: 'not', plaid: 'covered' },
  ];
  const normInst = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const accountKind = it => {
    if (!it) return 'bank';
    if (it.kind === 'debt') return 'card';
    if (it.inv) return 'broker';
    const n = String(it.name || '') + ' ' + String(it.provider || '');
    if (/\b(tfsa|rrsp|fhsa|resp|rrif|lira|lif|rdsp|margin|crypto)\b/i.test(n)) return 'broker';
    if (/\b(visa|master\s*card|mastercard|amex|american express|credit card)\b/i.test(n)) return 'card';
    return 'bank';
  };
  function routeFor(institution, kind) {
    const src = normInst(institution), k = kind || 'bank';
    if (!src) return { preferred: PROVIDER.none, fallback: PROVIDER.none, coverage: 'unknown', institution: '', note: null, uncertain: true };
    const row = ROWS.find(r => r.match.test(src));
    if (!row) {
      if (k === 'broker') return { preferred: PROVIDER.snaptrade, fallback: PROVIDER.plaid, coverage: 'default-broker', institution: institution, note: 'Not in routing table; SnapTrade first', uncertain: true };
      return { preferred: PROVIDER.plaid, fallback: PROVIDER.none, coverage: 'default-bank', institution: institution, note: 'Not in routing table; Plaid first', uncertain: true };
    }
    const eff = k === 'broker' && row.kind !== 'broker' && /^(td|rbc|bmo|scotia)/i.test(row.id)
      ? Object.assign({}, row, { kind: 'broker', snap: row.id === 'td' ? 'covered' : 'not' })
      : row;
    let preferred = PROVIDER.none, fallback = PROVIDER.none, uncertain = false;
    if (eff.kind === 'broker' || k === 'broker') {
      if (eff.snap === 'covered') { preferred = PROVIDER.snaptrade; fallback = (eff.plaid === 'covered' || eff.plaid === 'uncertain') ? PROVIDER.plaid : PROVIDER.none; }
      else if (eff.snap === 'not') { preferred = PROVIDER.plaid; fallback = PROVIDER.none; }
      else { preferred = PROVIDER.snaptrade; fallback = PROVIDER.plaid; uncertain = true; }
      if (eff.plaid === 'uncertain' && preferred === PROVIDER.plaid) uncertain = true;
      if (eff.snap === 'uncertain') uncertain = true;
    } else {
      preferred = PROVIDER.plaid; fallback = PROVIDER.none;
      if (eff.plaid === 'uncertain') uncertain = true;
    }
    return { preferred, fallback, coverage: eff.snap === 'covered' ? 'snaptrade' : (eff.plaid === 'covered' ? 'plaid' : 'uncertain'), institution: eff.name, note: eff.note || null, uncertain };
  }
  function replaceLabel(institution, kind) {
    const r = routeFor(institution, kind);
    if (r.preferred === PROVIDER.none) return '—';
    const u = r.uncertain ? ' (?)' : '';
    if (r.fallback && r.fallback !== PROVIDER.none && r.fallback !== r.preferred) return r.preferred + u + ' / ' + r.fallback;
    return r.preferred + u;
  }
  g.PTT_ROUTE = { PROVIDER, ROWS, normInst, accountKind, routeFor, replaceLabel };
})(typeof window !== 'undefined' ? window : globalThis);

const D=window.__PTT_DATA, C=D.cards, IMGB=window.__PTT_IMG||null;
/* check/X marks (Andrew 2026-10-30): every ✓ is green and every ✗ red sitewide, tiles included */
const CK=s=>String(s??'').replace(/✓/g,'<span class=y>✓</span>').replace(/✗/g,'<span class=n>✗</span>');
const PLINES=PLINES_ALL.filter(p=>p[0]=='home'||(D.meta.lines||['cards']).includes(p[0])),PRODUCT=PLINES.filter(p=>p[0]!='home');/* enabled product lines (build flag PTT_LINES, default cards) */
const CARDS_ONLY=PRODUCT[0]&&PRODUCT[0][0]=='cards'/* new shell whenever Cards leads; Brokers + Banking ride in it (Andrew 2026-11-03) */,CT_ALL=CARDS_ONLY?['ovw','fees','dtl','rw','prom','ins']:null/* B11: Perks is a Rewards folder tab (RWT), not a top tab */,SUBONLY=new Set(['ov','trv','prot','rwS','rwL','rwF']),HIDE=new Set(['dtl','prom']),CTV=()=>CT_ALL&&CT_ALL.filter(i=>!HIDE.has(i));/* Credit Cards sub-tabs: Overview, Fees, Rewards, Insurance, Perks (this order). HIDE is the per-line config of hidden sub-tabs (Full Detail, Promotions): code and data stay, nav and routes skip them, a hidden id in a link or hash falls back to Overview. Cards-only release: the other Cards views and the user pages stay in the code, off the nav */
SUBONLY.add('perk');/* the per-card Perks sub-tab (PKF, PKTYPES, PMODES) belongs to the cards-only release; the all-lines build keeps its own Perks view (id perks) */
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Display case rule (Andrew 2026-10-30, Docs/naming.md): a standalone "none" value always reads "None" ("NONE" -> "None", "none stated" -> "None stated") in tables, filters, popups and card details. Display layer only: text nodes and titles are fixed as they render; stored values, keys and filter values are untouched. */
const NONECASE=s=>s.replace(/\bn\/a\b/gi,'N/A').split(' · ').map(x=>x.replace(/^(\s*)none\b(.*)$/is,(m,a,b)=>a+'None'+(/[a-z]/.test(b)?b:b.toLowerCase()))).join(' · ');
const NONEFIX=r=>{if(!r)return;if(r.nodeType==3){if(/(^|· )\s*none\b|\bn\/a\b/i.test(r.nodeValue)){const v=NONECASE(r.nodeValue);if(v!==r.nodeValue)r.nodeValue=v}return}if(r.nodeType!=1&&r.nodeType!=11)return;
 const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())if(/(^|· )\s*none\b|\bn\/a\b/i.test(n.nodeValue)&&!n.parentElement?.closest('script,style,textarea,input')){const v=NONECASE(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}
 for(const e of [r,...(r.querySelectorAll?r.querySelectorAll('[title],[aria-label]'):[])])for(const a of ['title','aria-label']){const v=e.getAttribute?.(a);if(v&&/(^|· )\s*none\b|\bn\/a\b/i.test(v)){const u=NONECASE(v);if(u!==v)e.setAttribute(a,u)}}};
new MutationObserver(ms=>{for(const m of ms){if(m.type=='characterData')NONEFIX(m.target);else m.addedNodes.forEach(NONEFIX)}}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.addEventListener('DOMContentLoaded',()=>NONEFIX(document.body));if(document.body)NONEFIX(document.body);
const money=v=>v==null?'<span class=u>—</span>':v==0?'<span class=y>$0</span>':'$'+v.toLocaleString();
const pct=(v,hi)=>v==null?'<span class=u>—</span>':hi!=null&&v>=hi?`<span class=hi>${v.toFixed(2)}%</span>`:`${v.toFixed(2)}%`;
const yn=v=>v===1?'<span class=y>✓</span>':v===0?'<span class=n>✗</span>':'<span class=u>—</span>';
const uniq=f=>[...new Set(C.map(f).filter(x=>x!=null&&x!==''))].sort();
const INS=[['emergency_medical','Medical'],['trip_cancellation','Trip cancel'],['trip_interruption','Trip interrupt'],['flight_delay','Flight delay'],['baggage','Baggage'],['hotel_burglary','Hotel burglary'],['rental_car_cdw','Rental CDW'],['purchase_protection','Purchase prot.'],['extended_warranty','Ext. warranty'],['mobile_device','Mobile device'],['price_protection','Price prot.'],['travel_accident','Travel accident'],['roadside','Roadside']];
const INS_TK=['emergency_medical','trip_cancellation','trip_interruption','flight_delay','baggage','travel_accident'],INS_T=INS.filter(x=>INS_TK.includes(x[0])),INS_P=INS.filter(x=>!INS_TK.includes(x[0]));/* Travel = trip coverages; Protection = everyday coverages that are not about a trip (purchase, warranty, rental car, roadside, hotel burglary, mobile, price) */
const insN=(c,L)=>L.filter(([k])=>c.ins[k]===1).length,insU=(c,L)=>L.filter(([k])=>c.ins[k]==null).length;
/* third-level row (one reusable component, keyed per sub-tab): GROUPS[sub-tab id] = [[screen id, label], ...]; st.g[sub-tab id] is the chosen one. A group's screen is an entry of S with that id, off the nav (SUBONLY). */
const GROUPS={ins:[['trv','Travel'],['prot','Protection']]},GKEY0=()=>GROUPS[st.s]?((st.g||{})[st.s]&&GROUPS[st.s].some(x=>x[0]==st.g[st.s])?st.g[st.s]:GROUPS[st.s][0][0]):st.s;
GROUPS.ovw=[['ov','Highlights']];/* Andrew 2026-11-05 (symmetry): Fees is its own Credit Cards view, no longer inside Overview *//* Underwriting view removed from the UI (Andrew 2026-11-03); its data stays in the database (Card/Bonus Limits included, not shown) */const IMG=['rw'];/* B12: these groups switch with the Insurance level selector (#imode), not the #grp row; keys st.g.ovw / st.g.rw unchanged */
/* B10 migration: a saved/linked screen on a former top-level view (ov/uw) opens Overview; a saved Overview › Fees sub-tab (pre 2026-11-05) opens the Fees view */
const OVN=()=>{if(st.s=='uw'){st.s='ovw';st.g={...(st.g||{}),ovw:'ov'}}if((st.g||{}).ovw=='uw')st.g={...st.g,ovw:'ov'};if((st.g||{}).ovw=='fees'){st.g={...st.g,ovw:'ov'};if(st.s=='ovw')st.s='fees'}if(st.pl!='bank'&&st.pl!='info'&&GROUPS.ovw.some(x=>x[0]==st.s)){st.g={...(st.g||{}),ovw:st.s};st.s='ovw'}};
GROUPS.rw=[['rwS','Snapshot'],['rwL','Living'],['rwF','Lifestyle']];
/* B11 (Andrew 2026-11-01): Rewards has folder tabs Points | Perks (the #grp row, same component as Insurance's Travel | Protection). Points = the Snapshot/Living/Lifestyle levels (GROUPS.rw, #imode); Perks = the former top-level Perks tab (S entry perk, PMODES). Chosen tab in st.g.rwt ('pts' | 'perk'); an old st.s 'perk' (saved or linked) opens Rewards > Perks. */
const RWT=[['pts','Points'],['perk','Perks']],RWTF=()=>(st.g||{}).rwt=='perk'?'perk':'pts',GKEY=()=>st.s=='rw'&&RWTF()=='perk'?'perk':GKEY0();/* Rewards = Summary | Living | Lifestyle (Andrew 2026-10-30), see RWLIV */
// filter option builders
const ge=(f,vals,u='%')=>vals.map(v=>[`≥ ${u=='$'?'$'+v.toLocaleString():v+u}`,c=>c[f]!=null&&c[f]>=v,v]);
/* bold earn cells derive only from the active filters: a cell is bold when its own column has an active ≥ filter and the value meets it; no filter, no bold */
const fhi=k=>{const i=st.f?.[k];return i==null||Array.isArray(i)?null:FI[k]?.o[i]?.[2]??null};
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
 FEEO=[['$0',c=>c.fee===0],['≤ $50',c=>c.fee!=null&&c.fee<=50],['≤ $100',c=>c.fee!=null&&c.fee<=100],['≤ $150',c=>c.fee!=null&&c.fee<=150],['≤ $250',c=>c.fee!=null&&c.fee<=250],['> $250',c=>c.fee>250],['Paid (> $0)',c=>c.fee>0]],
 OFFO=[['Yes',c=>!!c.offer],['No',c=>!c.offer]];
/* every field that has a column and a filter, by id: [filter id, label, options]. Overview is an explicit ordered list; Full Detail is every field not on Overview, so a new field is never lost. */
const ALLF={fee:['fee','Annual Cost',()=>FEEO],add:['add','Extra cards',()=>[['$0',c=>c.add===0],['≤ $50',c=>c.add!=null&&c.add<=50],['Not published',c=>c.add==null&&NPUB(c.addt)],['Not captured',c=>c.add==null&&!/^not offered/i.test(c.addt||'')&&!NPUB(c.addt)]]],other:['other','Base earn %',()=>ge('other',[0.5,1,1.25,1.5,2])],pcn:['npc','Earn Categories',()=>ge('npc',[1,2,3,4,5],'')],best:['best','Best earn %',()=>ge('best',RATES)],nins:['nins','Covers',()=>[2,4,6,8,10,12,13].map(v=>['Covers ≥ '+v,c=>c.nins>=v])],
 kind:['rt','Reward type',()=>eq('rt',RTO)],offer:['offer','Welcome offer',()=>OFFO],fyf:['fyf','Yr-1 Fee',()=>['Waived','Charged','N/A'].map(v=>[v,c=>c.fy3===v])],ofc:['ofl','Welcome offer',()=>[['Yes',OFLIVE],['No',c=>!OFLIVE(c)]]],
 i:['issuer','Issuer',()=>eq('i',uniq(c=>c.i))],cur:['cur','Currency',()=>eq('cur',['CAD','USD'])],acct:['acct','Account type',()=>eq('acct',['Personal','Business'])],nw:['net','Network',()=>eq('nw',uniq(c=>c.nw))],
 pt:['pt','Category',()=>eq('pt',['Fee','No fee','Secured'])],itest:['itest','Income Test',()=>[['Yes',c=>ITEST(c)===1],['No',c=>ITEST(c)===0],['Not known',c=>ITEST(c)==null]]],tier:['tier','Tier',()=>eq('tier',uniq(c=>c.tier))],it:['itype','Issuer type',()=>eq('it',uniq(c=>c.it))],st:['status','Status',()=>eq('st',uniq(c=>c.st))]};
/* B8 (Andrew 2026-11-01): Sponsor (issuer) + Network replace Annual Cost + Extra cards; Category (card_product_type: Fee / No fee / Secured, the only card category taxonomy in the data) takes Yr-1 Fee's spot (Yr-1 Fee moved to Fees, after Extra cards); Income Test sits right before Welcome offer */
const OV_LIST=['i','nw','pt','other','best','pcn','nins','kind','itest','ofc'];/* Andrew's Overview list, in order */
const FIELDS={ov:OV_LIST,dtl:Object.keys(ALLF).filter(k=>!OV_LIST.includes(k))},FDEF={ov:ALLF,dtl:ALLF};
const fcols=id=>FIELDS[id],ffilt=id=>FIELDS[id].map(k=>{const[i,l,o]=FDEF[id][k];return[i,l,o()]});
/* Perks sub-tab (Credit Cards): one row per card perk (D.pk, from card_perk_facts; a card with no perk row is absent). PKF is its ordered field config: the columns (FIELDS.perk) and the filter panel (pkFilt) are both read from it, so column order = filter order. A perk row has .card; a card has .cp (its perk rows), so a perk filter also works on the card views: a card matches when any of its perks does. Values are shown as stored: never annualised, never guessed. */
const PKCAT=[['statement_credit','Statement credit'],['lounge','Lounge'],['nexus_global_entry','NEXUS / Global Entry'],['membership','Membership'],['discount','Discount'],['other','Other']],PKREC=[['annual','Annual'],['monthly','Monthly'],['one_time','One-time'],['per_use','Per use'],['ongoing','Ongoing'],['every_48_months','Every 48 months']],PKCI={};
/* Perks reform (Andrew 2026-10-30): ONE Perks table, rows = the shared card rows, one column per perk type. A type is a perk_category, except 'other', which is split by the perk name into Checked bag and Companion pass; the rare rest of 'other' (birthday bonus, authorised-user earn boost, anniversary points) gets no column and stays in the card details. */
const PKTYPES=[['sc','Statement credit',r=>r.cat=='statement_credit'],['mem','Membership',r=>r.cat=='membership'],['disc','Discount',r=>r.cat=='discount'],['lounge','Lounge',r=>r.cat=='lounge'],['nexus','NEXUS',r=>r.cat=='nexus_global_entry'],['bag','Checked bag',r=>r.cat=='other'&&/checked bag/i.test(r.n)],['comp','Companion pass',r=>r.cat=='other'&&/companion/i.test(r.n)]];
C.forEach((c,i)=>{PKCI[c.id]=i;c.cp=[]});
const PKR=(D.pk||[]).map(r=>({...r,card:C[PKCI[r.c]]})).filter(r=>r.card);PKR.forEach(r=>r.card.cp.push(r));
const pkAny=f=>x=>(x.cp||[x]).some(f),pkOf=(k,L)=>L.filter(([v])=>PKR.some(r=>r[k]===v)).map(([v,l])=>[l,pkAny(r=>r[k]===v)]),pkVals=k=>[...new Set(PKR.map(r=>r[k]).filter(Boolean))].sort();
const PKDAYS=r=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(r.ex||'');return m?Math.round((new Date(+m[1],m[2]-1,+m[3])-TODAY)/864e5):null};
const PKF={pk_n:['pk_n','Card',()=>[...new Set(PKR.map(r=>r.card))].sort((a,b)=>a.n.localeCompare(b.n)).map(c=>[c.n,pkAny(r=>r.card===c)]),1],pk_perk:['pk_perk','Perk',null],
 pk_cat:['pk_cat','Perk type',()=>PKTYPES.filter(t=>PKR.some(t[2])).map(([,l,f])=>[l,pkAny(f)]),1],pk_val:['pk_val','Value',()=>[['Has a stated value',pkAny(r=>r.a!=null)],['No value stated',pkAny(r=>r.a==null)]]],
 pk_rec:['pk_rec','Recurrence',()=>pkOf('rec',PKREC),1],pk_en:['pk_en','Enrol',()=>[['Required',pkAny(r=>r.en===1)],['Not stated',pkAny(r=>r.en!==1)]]],
 pk_rg:['pk_rg','Region',()=>pkVals('rg').map(v=>[v,pkAny(r=>r.rg===v)]),1],
 pk_ex:['pk_ex','Expiry',()=>[['Ending within 30 days',pkAny(r=>{const d=PKDAYS(r);return d!=null&&d>=0&&d<=30})],['Has an end date',pkAny(r=>PKDAYS(r)!=null)],['Ongoing',pkAny(r=>r.ex=='ongoing')]]],
 pk_ev:['pk_ev','Evidence',()=>['CITED','REPORTED','ESTIMATE'].filter(v=>PKR.some(r=>r.ec===v)).map(v=>[v,pkAny(r=>r.ec===v)])],
 pk_i:['pk_i','Issuer',()=>[...new Set(PKR.map(r=>r.card.i))].sort().map(v=>[v,pkAny(r=>r.card.i===v)]),1],
 pk_st:['pk_st','Status',()=>[['Live',pkAny(r=>r.s=='live')],['Unverified',pkAny(r=>r.s=='unverified')]]]};
const PMCOLS=PKTYPES.map(t=>'pt_'+t[0]);/* Perks: one column per perk type (PKTYPES); the Benefit / Value / Recurrence / Expiry tabs (PMODES) pick what each cell shows */
const pkCols=['pk_n','pk_cat','pk_val','pk_rec','pk_ex','pk_ev','pk_en','pk_rg'];/* filter-only fields (Issuer, Status) follow the column-backed filters */
FIELDS.perk=pkCols;FDEF.perk=PKF;
const pkFilt=()=>[...FIELDS.perk,'pk_i','pk_st'].filter(k=>PKF[k][2]).map(k=>{const[i,l,o,m]=PKF[k];return m?[i,l,o(),1]:[i,l,o()]});
/* Rewards fits one window: the six most-carried categories and the base rate get their own column; every other category is merged into one 'More categories' cell (its filters stay) */
/* Store (Andrew backlog, 2026-10-30): single-store rates the card has its own earn row for (build 'own' st_* keys), e.g. Canadian Tire 4%; column + multi-select filter, in header order after Best earn % */
/* Income words (dash audit follow-up): $0 = the record states no minimum; N/A = the card's test is on the other income basis, or an age-only student test */
/* Not published (Docs/naming.md, 2026-10-30): the issuer was checked and does not publish the value; the record says so (CITED) and the number stays NULL. Shown as the muted words, never a dash; filters list it as its own option, never as Not captured. */
const NPUB=s=>/^\s*not published by issuer/i.test(s||''),NPC=s=>`<span class=mute title="${esc(s)}">Not published</span>`;
/* Income Test ESTIMATE (Andrew 2026-11-02: no blank cells): when the issuer publishes nothing (ITEST null), show our estimate, tagged Estimated. Display only: ITEST, the filter (Not known) and eligibility keep using the cited data.
   Method: Visa Infinite / Infinite Privilege and Mastercard World Elite are network tiers that carry an income minimum (Visa Infinite typically $60k personal / $100k household; World Elite $80k / $150k), so ✓; any other card ✗ (no stated minimum). */
const ITESTE=c=>/infinite|world elite|privilege/i.test((c.tier||'')+' '+(c.n||'')),ITESTW=c=>ITESTE(c)?'Estimate: '+(/elite/i.test((c.tier||'')+' '+c.n)?'World Elite cards usually need $80,000 personal or $150,000 household income':'Visa Infinite cards usually need $60,000 personal or $100,000 household income')+'. Not published by the issuer.':'Estimate: no income minimum expected for this card tier. Not published by the issuer.';
/* Income Test (B8): 1 = a personal or household minimum income is stated (inc/hinc > 0); 0 = the captured requirement is explicitly none ($0 or 'None'/'No minimum'); null (blank) otherwise, e.g. not published, student-only, not captured */
/* B9 Fees + Underwriting cells (schema v36): text as printed, issuer tag after it; blank when not captured (never guessed) */
const UWK={btf:'bt_fee',caf:'cash_advance_fee',rcf:'replacement_card_fee',pbt:'promo_bt_rate',assets:'income_assets_min',cscore:'credit_score_min',emp:'employment_requirement',bkr:'bankruptcy_requirement',cblim:'card_bonus_limits'};
const UWV=(c,k)=>k=='incalt'?c.xf?.incalt:(c.xf?.u||{})[UWK[k]],UWT=(c,k)=>{const v=UWV(c,k);if(v==null||v==='')return '';const f=k=='incalt'?'income_spend_alternative':UWK[k],t=c.ve?.[f];return (typeof v=='number'?'$'+v.toLocaleString():esc(v))+(t?` <span class=t title="${esc(t[1]||'')}">${esc(t[0])}</span>`:'')};
/* Overview > Fees tokens (Andrew 2026-11-04: "we want #'s ... a dotted underline on the number where on hover more details are revealed").
   The cell shows a short token built only from amounts the stored text already states; the full printed wording, its evidence tag and the evidence basis
   travel in the hover title, so nothing is lost. FEETOK returns the original text unchanged whenever it cannot reduce it honestly (never a guessed number).
   Rules, in order: (a) $0 / withdrawn -> $0; (b) "None listed" -> None; (c) promo BT rate + term -> 0% / 9 mo; (d) percent + dollar minimum
   (Greater of $5.00 or 1% -> $5 or 1%); (e) two amounts that differ by market ($5.00 in Canada; $7.50 outside Canada -> $5 / $7.50);
   (f) percent only -> up to 5% / 3%; (g) dollar amount only -> $20; (h) otherwise the printed text. A fee capped at a maximum, and any text mixing a
   percent with a dollar amount it cannot pair up, falls through to (h) and is listed for review rather than guessed at. */
const FEEAMT=s=>[...s.matchAll(/(US\$|\$)\s?(\d[\d,]*(?:\.\d+)?)/g)].map(m=>[m[1],+m[2].replace(/,/g,'')]),
 FEEMON=(cur,n)=>cur+(n%1?n.toFixed(2):String(n)),FEEPC=n=>String(+n)+'%';
function FEETOK(k,v){const t=String(v).replace(/\s+/g,' ').trim();
 if(/^\$0(?![\d.])/.test(t)||/\b(withdrawn|withdrew)\b/i.test(t))return '$0';
 if(/^none listed\b/i.test(t))return 'None';
 if(k=='pbt'){const r=/(\d+(?:\.\d+)?)\s*%/.exec(t),m=/(\d+)\s*(?:months?|statement periods?|billing periods?)/i.exec(t);return r&&m?FEEPC(r[1])+' / '+m[1]+' mo':t}
 if(/\bmax(imum)?\b/i.test(t))return t;
 const main=t.split(';')[0],pc=/(\d+(?:\.\d+)?)\s*%/.exec(main),A=FEEAMT(t),a0=A[0],aL=A[A.length-1];
 if(pc&&a0&&/\bminimum\b|\bmin\b|greater of/i.test(main))return FEEMON(a0[0],a0[1])+' or '+FEEPC(pc[1]);
 if(A.length>1&&a0[1]!==aL[1]&&/(outside canada|outside the country|internationally)/i.test(t))return FEEMON(a0[0],a0[1])+' / '+FEEMON(aL[0],aL[1]);
 const pa=/(\d+(?:\.\d+)?)\s*%/.exec(t);
 if(pa&&!A.length)return (/up to/i.test(t)?'up to ':'')+FEEPC(pa[1]);
 if(A.length&&!pa&&A.every(x=>x[1]===a0[1]))return FEEMON(a0[0],a0[1]);
 return t}
/* Fee cell: the token, dotted underline (.nyv, Andrew's "hover for more details"), title = the printed text · evidence tag · evidence basis */
const UWFEE=new Set(['btf','caf','rcf','pbt']),FEECELL=(c,k)=>{const v=UWV(c,k);if(v==null||v==='')return '';const raw=typeof v=='number'?'$'+v.toLocaleString():String(v),t=c.ve?.[UWK[k]],tag=t?t[0]:null,ttl=raw+(tag?' · '+tag:'')+(t&&t[1]?' · '+t[1]:'');return `<span class="fny${tag&&tag!='CITED'?' nyv':''}" title="${esc(ttl)}">${esc(FEETOK(k,raw))}</span>`};
const UWS=k=>[['Stated',c=>UWV(c,k)!=null&&UWV(c,k)!==''],['Not captured',c=>UWV(c,k)==null||UWV(c,k)==='']];
const ITEST=c=>c.inc>0||c.hinc>0?1:c.inc===0||c.hinc===0||INC0(c)?0:null;
const INC0=c=>/^(none\b|no minimum)/i.test(c.inct||''),STU=c=>/^students?\b/i.test(c.inct||''),NAI=(w,c)=>`<span class=mute title="${w=='student'?esc(c.inct):'The income test is on '+(w=='household'?'household':'personal')+' income only'}">N/A (${w=='student'?'student card':w+' test'})</span>`;
const EXPNA=c=>!c.exp&&!c.expt&&(c.rk=='none'||(c.kind=='Cash back'&&c.rt=='Cash back'));/* Points expiry n/a: no rewards, or a true cash-back card (no points programme) */
const stOf=c=>(c.own||[]).filter(k=>k.startsWith('st_')&&c['r_'+k]!=null).sort((a,b)=>c['r_'+b]-c['r_'+a]),STKS=Object.keys(CN).filter(k=>k.startsWith('st_')&&C.some(c=>stOf(c).includes(k))).sort((a,b)=>CN[a].localeCompare(CN[b]));
const RWTOP=RC.filter(k=>k!='other').slice(0,6),RWMORE=RC.filter(k=>k!='other'&&!RWTOP.includes(k));
/* Rewards split (Andrew 2026-10-30): Living = everyday essentials (food, getting around, the household's bills and pharmacy), Lifestyle = discretionary and travel spend. Only categories with >= 2 cards on record (RC) get a column; the rest stay in the database and the card detail */
const UWHID=new Set(['incalt','assets','cscore','emp']);/* Underwriting hides Spend alternative, Assets in lieu, Credit score and Employment (columns + their filters) at launch: under 20% complete (Andrew 2026-11-02); data and code kept */
const RWHID=new Set(['ride','office','whole','store']);/* B11 (Andrew 2026-11-01): Lifestyle hides Rideshare, Office/Business and Wholesale clubs; Living hides Store (columns + their filters); data and code kept; saved widths/orders for them are ignored (keys not in the view) */
const RWLIV=['groc','dine','deliv','gas','ev','transit','bills','util','drug'].filter(k=>RC.includes(k)),RWLIF=RC.filter(k=>k!='other'&&!RWLIV.includes(k));
/* Rewards filters (Andrew 2026-10-30): each third-level view lists the filters for its own columns, in column order, then the type filters; st.f is shared, so a filter set on one view keeps narrowing the one row set on all three */
const NCF=f=>['Not captured',c=>c[f]==null],RWE=k=>['r_'+k,CN[k],[...ge('r_'+k,k=='other'?[0.5,1,1.25,1.5,2]:RATES),NCF('r_'+k)]],RWSTORE=['store','Store',[['Any store',c=>stOf(c).length>0],...STKS.map(k=>[CN[k],c=>stOf(c).includes(k)])],1];
const RWF={rwS:[['prog','Program',eq('prog',uniq(c=>c.kind=='Points'?c.prog:null))],['other','Base earn %',[...ge('other',[0.5,1,1.25,1.5,2]),NCF('other')]],['best','Best earn %',[...ge('best',RATES),NCF('best')]],
  ['rt2','Reward type',eq('rt',['Points','Cash back','Travel/airline miles','Store dollars','No rewards','Unconfirmed'])],['tag','¢/pt tag',eq('tag',['CITED','ESTIMATE','REPORTED'])]],
 rwL:[...RWLIV.map(RWE),...(RWHID.has('store')?[]:[RWSTORE])],rwF:RWLIF.filter(k=>!RWHID.has(k)).map(RWE)};
/* insurance coverage filters (dash audit 2026-10-30): the same state rule as the cells (insV); blank never counts as Not included */
/* First-Year Fee (Andrew 2026-10-31): the cell is exactly Waived, Charged (red) or N/A, nothing else; the fee record's source tag sits in the title, and a value whose fee record is not CITED keeps the dotted underline */
const FY3=c=>{const v=c.fy3,t=c.ve?.fee_amount,tag=t?t[0]:null,ttl=esc(v+(tag?' · '+tag:'')+(t&&t[1]?' · '+t[1]:'')),cl=v=='Charged'?'fyc':v=='Waived'?'fyw':'mute';return `<span class="${cl}${tag&&tag!='CITED'?' nyv':''}" title="${ttl}">${v}</span>`};
/* Covered level groups, in the stored order (ins_parse.WHO_ORDER), only those present in the data */
const INSWHO=['Cardholder','Spouse','Dependent children','Family members','Authorized users','Authorized drivers','Travelling companions'].filter(w=>C.some(c=>Object.values(c.inscv||{}).some(g=>g.includes(w))));
const UNV=h=>`<span class=nyv title="Not yet verified">${h}</span>`;
const INSF=k=>[['Included',c=>insV(c,k)===1],['Not included',c=>insV(c,k)===0],['Not captured',c=>insV(c,k)==null]];
const S=[
 {id:'ovw',name:'Overview',/* B12: renamed from Overview to Profile; 2026-11-04 renamed back to Overview (Andrew); id ovw and saved keys unchanged */cols:[],f:[]},/* B10 nav entry (Andrew 2026-11-01): Overview = Snapshot | Fees | Underwriting, the same third-level file-folder row as Insurance (GROUPS.ovw) */
 {id:'ov',name:'Highlights',/* 2026-11-04: renamed from Snapshot (Andrew); id ov unchanged */cols:fcols('ov'),f:ffilt('ov')},
 {id:'dtl',name:'Full Detail',cols:fcols('dtl'),f:ffilt('dtl')},
 {id:'fees',name:'Fees',cols:['fee','add','fyf','fx','apr','btf','caf','rcf','pbt'],f:[
  ['fee','Annual Cost',FEEO],
  ['add','Extra cards',[['$0',c=>c.add===0],['≤ $50',c=>c.add!=null&&c.add<=50],['Not published',c=>c.add==null&&NPUB(c.addt)],['Not captured',c=>c.add==null&&!/^not offered/i.test(c.addt||'')&&!NPUB(c.addt)]]],
  ['fyf','Yr-1 Fee',['Waived','Charged','N/A'].map(v=>[v,c=>c.fy3===v])],
  ['fx','FX fee',[['None (0%)',c=>c.fx===0],['< 2.5%',c=>c.fx!=null&&c.fx<2.5],['≥ 2.5%',c=>c.fx>=2.5],['N/A (USD card)',c=>c.fx==null&&/^n\/a/i.test(c.fxt||'')],['Not published',c=>c.fx==null&&NPUB(c.fxt)],['Not captured',c=>c.fx==null&&!/^n\/a/i.test(c.fxt||'')&&!NPUB(c.fxt)]]],
  ['apr','Purchase APR',[...le('apr',[12.99,15,19.99,20.99]),['Not captured',c=>c.apr==null&&!c.aprd]]],
  ['btf','Balance transfer fee',UWS('btf')],['caf','Cash advance fee',UWS('caf')],['rcf','Replacement card fee',UWS('rcf')],['pbt','Promo BT rate',UWS('pbt')]]},
 {id:'rw',name:'Rewards',cols:[],f:[]},/* nav entry: the views are the third-level rows rwS (Summary), rwL (Living) and rwF (Lifestyle), see GROUPS; one filter set for all three */
 {id:'rwS',name:'Summary',cols:['kind','prog','cpp','other','best','pcn','caps','ofv','exp'],f:RWF.rwS},
 {id:'rwL',name:'Living',cols:[...RWLIV.map(k=>'r_'+k),...(RWHID.has('store')?[]:['store'])],f:RWF.rwL},
 {id:'rwF',name:'Lifestyle',cols:RWLIF.filter(k=>!RWHID.has(k)).map(k=>'r_'+k),f:RWF.rwF},
 {id:'ins',name:'Insurance',cols:[],f:[]},/* nav entry: the views are the third-level rows trv (Travel) and prot (Protection), see GROUPS */
 {id:'trv',name:'Travel',cols:['covT',...INS_T.map(x=>'ins_'+x[0])],f:[
  ...INS_T.map(([k,l])=>['ins_'+k,l,INSF(k)]),
  ['nt','Covers',[2,3,4,5,6].map(v=>['Covers ≥ '+v,c=>insN(c,INS_T)>=v])],['med','Medical limit',[1000000,2000000,5000000].map(v=>['≥ $'+v.toLocaleString(),c=>AMV(c,'med')!=null&&AMV(c,'med')>=v])],
  ['x_uw','Underwriter',[...new Set(C.flatMap(c=>c.ix.insurers?c.ix.insurers[0]:[]))].sort().map(n=>[n,c=>!!c.ix.insurers&&c.ix.insurers[0].includes(n)]).concat([['No included insurance',c=>!!c.ix.insurers&&!c.ix.insurers[0].length||!c.ix.insurers&&ALLNO(c)],['Not captured',c=>!c.ix.insurers&&!ALLNO(c)]]),1],
  ['x_who','Covered',INSWHO.filter(w=>C.some(c=>INS_T.some(([k])=>((c.inscv||{})[k]||[]).includes(w)))).map(w=>[w,c=>INS_T.some(([k])=>((c.inscv||{})[k]||[]).includes(w))]),1],
  ['x_cc','Common carrier AD&D',[['Stated',c=>AMV(c,'x_cc')>0],...[250000,500000,1000000].map(v=>['≥ $'+v.toLocaleString(),c=>AMV(c,'x_cc')>=v])]]]},
 {id:'prot',name:'Protection',cols:['covP',...INS_P.map(x=>'ins_'+x[0])],f:[
  ...INS_P.map(([k,l])=>['ins_'+k,l,INSF(k)]),
  ['np','Covers',[2,3,4,5,6,7].map(v=>['Covers ≥ '+v,c=>insN(c,INS_P)>=v])],['mob','Mobile cover',ge('mob',[500,1000,1500],'$')],
  ['x_uw','Underwriter',[...new Set(C.flatMap(c=>c.ix.insurers?c.ix.insurers[0]:[]))].sort().map(n=>[n,c=>!!c.ix.insurers&&c.ix.insurers[0].includes(n)]).concat([['No included insurance',c=>!!c.ix.insurers&&!c.ix.insurers[0].length||!c.ix.insurers&&ALLNO(c)],['Not captured',c=>!c.ix.insurers&&!ALLNO(c)]]),1],
  ['x_who','Covered',INSWHO.filter(w=>C.some(c=>INS_P.some(([k])=>((c.inscv||{})[k]||[]).includes(w)))).map(w=>[w,c=>INS_P.some(([k])=>((c.inscv||{})[k]||[]).includes(w))]),1],
  ['x_rad','Rental AD&D',[['Stated',c=>X(c,'rental_add_max')!=null]]],
  ['x_ppd','Price prot. window',[['Stated',c=>X(c,'pp_days')!=null],['≥ 60 days',c=>X(c,'pp_days')>=60]]],
  ['x_ppi','Price prot. per item',[['Stated',c=>X(c,'pp_item')!=null],['≥ $500',c=>X(c,'pp_item')>=500]]],
  ['x_ppy','Price prot. per year',[['Stated',c=>X(c,'pp_year')!=null],['≥ $1,000',c=>X(c,'pp_year')>=1000]]]]},
 {id:'perk',name:'Perks',cols:PMCOLS,f:pkFilt()},/* one table: card rows, perk-type columns; filters from PKF (Perk type first, as the columns) */
 {id:'perks',name:'Perks',cols:['fee','offer','tpo','odl','credits','perks','exp'],f:[
  ['offer','Welcome offer',OFFO],['tpo','Sign-up bonus',[['Has third-party offer',c=>c.tpo.length>0],...[25,50,100,150,200].map(v=>['≥ $'+v,c=>(c.tpo[0]?.a||0)>=v])]],['soon','Apply by',[['Within 30 days',SOON],['Within 60 days',c=>{const d=ODAYS(c);return d!=null&&d>=0&&d<=60}]]],['credits','Credits & bonuses',[['Any',c=>c.credits.length>0]]],
  ['perks','Partner perks',[['Any',c=>c.perks.length>0]]],['exp','Points expiry',[['None',c=>c.exp=='none'],['N/A (cash back or no rewards)',c=>EXPNA(c)],['Not captured',c=>!c.exp&&!c.expt&&!EXPNA(c)]]]]},
 {id:'val',name:'Point Conversion',cols:[],f:[]},
 {id:'prom',name:'Promotions',cols:[],f:[]},
 {id:'wfolder',name:'Wallet folder',cols:[],f:[]}
];
const COL={i:['Issuer','l',c=>c.i,c=>esc(c.i)],nw:['Network','ic',c=>c.nw,c=>icoCell('nw',c.nw)],kind:['Type','l',c=>c.rt,c=>c.rk=='none'?'No rewards':c.rt?RTCELL(c):'<span class=u>Not yet captured</span>'],
 prog:['Program','l',c=>c.prog,c=>c.prog=='—'&&(c.rk=='none'||c.rt=='No rewards')?'<span class=mute>No rewards</span>':esc(c.prog)],fee:['Annual Cost','',c=>c.fee,c=>{if(c.fee==null)return money(null);const r=cmods(c).find(r=>(r.when||[]).some(w=>w.f=='tier'));return r?'$'+effFee0(c).toLocaleString()+' → <b>$'+Math.max(0,c.fee+(r.value||0))+'</b>'+rateMark({...r,when:[{v:provTier(c.i)}]}):'$'+c.fee.toLocaleString()}],best:['Best earn %','',c=>c.best,c=>rwNull(c,c.best)??pct(c.best,fhi('best'))+(c.bestn&&c.bestn.includes('% at ')?`<small class=mute> ${esc(c.bestn.slice(c.bestn.indexOf('% at ')+2))}</small>`:'')+upTo(c)],
 other:['Base earn %','',c=>c.other,c=>rwNull(c,c.other)??pct(c.other,fhi('other'))+onPay(c)],pcn:['Earn Categories','',c=>c.npc,c=>c.npc==null?'<span class=u title="No base earn rate on record, so no count">—</span>':`<span title="Count of reward categories that earn strictly more than the base rate. Derived at build time from this card's sourced category rates${c.npcb=='ppd'?' (points per $1, as no ¢/pt value is on record)':''} (CITED data); a count, not a rate.">${c.npc}</span>`],nins:['Ins.','',c=>c.nins,c=>c.nins+'<span class=mute>/'+INS.length+'</span>'],
 offer:['Welcome offer','l',c=>c.offer?0:1,c=>c.offer?`<span class=ofr tabindex=0 role=button aria-haspopup=dialog data-ofr="${C.indexOf(c)}">${esc(c.offer.slice(0,46))}${c.offer.length>46?'…':''}</span>${ptoIcons(c)}`:'<span class=u>—</span>'+ptoIcons(c)],
 fyf:['1st yr','',c=>({Waived:0,Charged:1,'N/A':2})[c.fy3],c=>FY3(c)],add:['Extra cards','',c=>c.add,c=>c.add==null&&NPUB(c.addt)?NPC(c.addt):c.add==null?(/^not offered/i.test(c.addt||'')?'<span class=u title="'+esc(c.addt)+'">Not offered</span>':'<span class=u>—</span>'):'$'+c.add.toLocaleString()],
 fx:['FX','',c=>c.fx,c=>c.fx==null&&NPUB(c.fxt)?NPC(c.fxt):c.fx==null?(/^n\/a/i.test(c.fxt||'')?`<span class=mute title="${esc(c.fxt)}">N/A (USD card)</span>`:'<span class=u title="Not yet captured">—</span>'):c.fx==0?'<span class=y>0%</span>':c.fx+'%'],apr:['APR','',c=>c.apr,c=>c.aprd?`<span title="${esc(c.aprt||'')}">${esc(c.aprd)}</span>`:c.apr==null?'<span class=u title="Not yet captured">—</span>':c.apr.toFixed(2)+'%'],
 inc:['Income','',c=>c.inc??0,c=>c.inc?'$'+c.inc.toLocaleString():c.inc===0||INC0(c)?'$0':c.hinc?NAI('household'):STU(c)?NAI('student',c):NPUB(c.inct)?NPC(c.inct):'<span class=u title="Not yet captured">—</span>'],hinc:['Household','',c=>c.hinc??0,c=>c.hinc?'$'+c.hinc.toLocaleString():c.hinc===0||INC0(c)?'$0':c.inc?NAI('personal'):STU(c)?NAI('student',c):NPUB(c.inct)?NPC(c.inct):'<span class=u title="Not yet captured">—</span>'],
 ...Object.fromEntries([['btf','Balance Transfer Fee'],['caf','Cash Advance Fee'],['rcf','Replacement Card Fee'],['pbt','Promo BT Rate'],['incalt','Spend Alternative'],['assets','Assets in Lieu'],['cscore','Credit Score'],['emp','Employment'],['bkr','Bankruptcy'],['cblim','Card/Bonus Limits']].map(([k,l])=>[k,[l,'l',c=>{const v=UWV(c,k);return v==null||v===''?'~':typeof v=='number'?v:String(v)},c=>UWFEE.has(k)?FEECELL(c,k):UWT(c,k)]])),
 pt:['Category','l',c=>c.pt||'~',c=>c.pt?esc(c.pt):'<span class=u title="Not recorded">—</span>'],itest:['Income Test','',c=>{const v=ITEST(c);return v==null?2:1-v},c=>{const v=ITEST(c);return v===1?`<span class=y title="${esc(c.inct||'Income requirement stated')}">✓</span>`:v===0?`<span class=n title="${esc(c.inct||'No minimum income')}">✗</span>`:ITESTE(c)?`<span class=y>✓</span><span class="t ite" title="${esc(ITESTW(c))}">Est.</span>`:`<span class=n>✗</span><span class="t ite" title="${esc(ITESTW(c))}">Est.</span>`}],
 cpp:['¢/pt','',c=>c.kind=='Points'?c.cpp:-1,c=>c.kind=='Points'?`${c.cpp}<span class=t>${c.tag[0]}</span>`:'<span class=mute>cash</span>'],
 gas:['Gas','',c=>c.gas,c=>pct(c.gas,fhi('gas'))],groc:['Grocery','',c=>c.groc,c=>pct(c.groc,fhi('groc'))],dine:['Dining','',c=>c.dine,c=>pct(c.dine,fhi('dine'))],trav:['Travel','',c=>c.trav,c=>pct(c.trav,fhi('trav'))],
 med:['Med. limit','',c=>c.med??0,c=>c.med?'$'+(c.med>=1e6?c.med/1e6+'M':c.med.toLocaleString()):'<span class=u>—</span>'],mob:['Mobile','',c=>c.mob??0,c=>c.mob?'$'+c.mob.toLocaleString():'<span class=u>—</span>'],
 odl:['Apply by','',c=>c.odl||'9',c=>c.odl?esc(c.odl):'<span class=u>—</span>'],
 credits:['Credits & bonuses','wrapt',c=>-c.credits.length,c=>c.credits.length?esc(c.credits.join(' · ')):'<span class=u>—</span>'],
 perks:['Partner perks','wrapt',c=>-c.perks.length,c=>c.perks.length?esc(c.perks.join(' · ')):'<span class=u>—</span>'],
 exp:['Expiry','l',c=>c.exp||(c.expt?'y':EXPNA(c)?'x':'z'),c=>c.exp?esc(c.exp):c.expt?`<span title="${esc(c.expt)}">${esc(c.expt.split(/;|\. /)[0])}</span>`:EXPNA(c)?`<span class=mute title="${c.rk=='none'?'No rewards: nothing to expire':'Cash back: no points to expire'}">N/A</span>`:'<span class=u title="Not yet captured">—</span>']};
/* Summary columns (Andrew 2026-10-30), existing sourced fields only: caps = the card's bonus-category annual spend caps (the same caps the Wallet uses), ofv = the welcome offer's dollar value as already computed for the card detail (basis in the title) */
const CAPS=c=>Object.entries(Object.keys(c.caps||{}).length?c.caps:(c.xcaps||{})),CAPTXT=c=>!CAPS(c).length&&(c.erows||[]).some(e=>/\bcap|up to|first \$|maximum/i.test((e.cond||'')+' '+(e.txt||'')));
/* B11 (Andrew 2026-11-01): Bonus cap is a symbol: ✓ when the record states a cap (hover: one line per category, amount and period as printed, with the evidence tag), ∞ when the record states no cap, the dash when unknown. Sort: smallest cap first/last, uncapped = ∞, unknown last. */
const CAPUNK=c=>(c.rk=='nyc'&&!(c.erows||[]).length)||CAPTXT(c),CAPPER={YEAR:'/yr',MONTH:'/mo',BILLING_CYCLE:'/statement'},CAPAMT=v=>'$'+(v>=1000&&v%100==0?(v/1000).toLocaleString()+'k':v.toLocaleString());
const capLines=c=>CAPS(c).map(([k,v])=>{const e=(c.erows||[]).find(r=>r.cap==v&&r.capp);return `${CN[k]||k}: ${CAPAMT(v)}${CAPPER[e&&e.capp]||'/yr'} · ${c.tag||'ESTIMATE'}`});
COL.caps=['Bonus cap','ctr',c=>{const v=CAPS(c).map(x=>x[1]);return v.length?Math.min(...v):CAPUNK(c)?null:Infinity},c=>{const E=CAPS(c);if(!E.length)return CAPUNK(c)?`<span class=u title="${CAPTXT(c)?'A cap is stated in the earn text only':'Not yet captured'}">—</span>`:'<span class=capinf title="No bonus spend cap in the record (uncapped)" aria-label="Uncapped">∞</span>';const L=capLines(c);return `<span class="y capy" tabindex=0 title="${esc(L.join('\n'))}" aria-label="Capped: ${esc(L.join('; '))}">✓</span>`}];
COL.ofv=['Offer value','',c=>c.ofv?.[0]??null,c=>c.ofv?.[0]!=null?`<span title="${esc(c.ofv[1]||'')}">$${c.ofv[0].toLocaleString()}</span>`:c.ofa?'<span class=mute title="The record states there is no public welcome offer">None</span>':c.offer?`<span class=mute title="${esc((c.ofv?.[1]||'')+': '+c.offer)}">Not valued</span>`:'<span class=u title="Not yet captured">—</span>'];
const rmoreOf=c=>RWMORE.filter(k=>c['r_'+k]!=null&&c['r_'+k]>(c.other??0)).sort((a,b)=>c['r_'+b]-c['r_'+a]);
COL.store=['Store','l',c=>Math.max(0,...stOf(c).map(k=>c['r_'+k])),c=>{const L=stOf(c);return L.length?L.map(k=>`<span title="${esc(CN[k])}">${esc(CN[k])} ${c['r_'+k].toFixed(1)}%</span>`).join(', '):c.rk=='nyc'&&(!(c.erows||[]).length||c.stx)?'<span class=u title="No earn rate captured for this card yet">—</span>':'<span class=n title="No store-specific earn rate">✗</span>'}];
COL.rmore=['More categories','l',c=>Math.max(0,...rmoreOf(c).map(k=>c['r_'+k])),c=>{const L=rmoreOf(c);return L.length?L.map(k=>`<span title="${esc(CN[k])}">${esc(CN[k].replace(/ \(.*/,''))} ${fhi('r_'+k)!=null&&c['r_'+k]>=fhi('r_'+k)?`<b>${c['r_'+k].toFixed(1)}%</b>`:c['r_'+k].toFixed(1)+'%'}</span>`).join(', '):'<span class=u>—</span>'}];
RC.forEach(k=>COL['r_'+k]=[CN[k]+(k=='other'?'':` <span class=mute>(${CC[k]})</span>`),'',c=>c['r_'+k],c=>rwNull(c,c['r_'+k])??pct(c['r_'+k],fhi('r_'+k))+(k=='other'?onPay(c):'')]);
/* N/A rule (Andrew 2026-10-30, Docs/naming.md): on a no-rewards card every rewards field reads N/A, never a dash, 0% or a word. */
const NAR='<span class=mute title="This card has no rewards">N/A</span>';['prog','caps','exp','cpp','store','other','best','pcn','rmore',...RC.map(k=>'r_'+k)].forEach(k=>{const o=COL[k];if(!o)return;const f=o[3];o[3]=c=>c.rk=='none'||(k=='prog'&&c.rt=='No rewards')?NAR:f(c)});
/* G4 (Andrew 2026-10-29) Rewards cells never show the dash: a category with no rate of its own already carries the base rate (build); 'No rewards' cards show 0%; a card with no base rate on record says so. Payment-based earn gets an "on payments" marker; higher routes are a secondary "Up to" note, never the headline. */
function rwNull(c,v){if(v!=null)return null;return `<span class=u title="${c.rk=='nyc'?'No earn rate captured for this card yet':'No base (everything else) rate captured for this card yet'}">Not yet captured</span>`}
function onPay(c){const o=c.onpay;return o?`<small class=onpay title="${esc(`Earns ${o.ppd} points per $1 paid towards the balance, not per $1 spent. Shown as a rate on spend, assuming each $1 spent is paid off. ${o.ppd} pts × ${o.cpp}¢ = ${(o.ppd*o.cpp).toFixed(2)}%. ${o.tag}: ${o.basis||''}`)}"> on payments</small>`:''}
function upTo(c){if(c.kind!='Points'||!c.cpp||c.best==null||!c.pay||!c.pay.routes)return '';const R=c.pay.routes.filter(r=>r.lo!=null&&r.lo>c.cpp&&/VERIFIED|CITED/.test(r.ev||'')&&/travel|flight|air/i.test(r.r));if(!R.length)return '';const r=R.reduce((a,b)=>b.lo>a.lo?b:a),u=c.best/c.cpp*r.lo;return `<small class="mute upto" title="${esc(r.r+': '+(r.b||'')+(r.cond?' Conditions: '+r.cond:'')+' ('+r.ev+')')}"> Up to ${u.toFixed(2)}% via travel</small>`}
COL.pt=['Fee','l',c=>c.pt,c=>{const t=c.ve?.card_product_type;return esc(c.pt||'—')+(t&&t[0]=='ESTIMATE'?`<span class=t title="${esc(t[1]||'')}">Estimated</span>`:'')}];/* B10: Category shows no CITED tag; only an estimate is flagged (Estimated) */COL.tier=['Tier','l',c=>c.tier,c=>esc(c.tier||'—')];COL.it=['Issuer type','l',c=>c.it,c=>esc(c.it||'—')];COL.st=['Status','l',c=>c.st,c=>esc(c.st||'—')];COL.cur=['Currency','l',c=>c.cur,c=>esc(c.cur||'—')];COL.acct=['Account','ic',c=>c.acct,c=>icoCell('acct',c.acct)];
/* skinny icon columns (Account type; Network follows): original inline SVG marks, one vocabulary shared by the table cell and the active-filter chip; the full word is the title and aria-label, sorting and the filter still use the word */
const svgI=p=>`<svg viewBox="0 0 16 16" width=14 height=14 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=1.4 stroke-linecap=round stroke-linejoin=round>${p}</svg>`;
const ICOS={acct:{Personal:svgI('<circle cx=8 cy=5.2 r=2.6 /><path d="M3 13.5c.6-2.6 2.6-3.8 5-3.8s4.4 1.2 5 3.8"/>'),Business:svgI('<rect x=2 y=5 width=12 height=8.5 rx=1.2 /><path d="M5.8 5V3.6c0-.6.4-1 1-1h2.4c.6 0 1 .4 1 1V5M2 9h12"/>')}};
const NWB={Visa:'Visa',Mastercard:'MasterCard','American Express':'Amex'};/* network marks are text badges, full names (Andrew B10 2026-11-01: Visa / MasterCard / Amex, not V/MC/AX) */
const icoCell=(k,v)=>v?`<span class="ico" role=img aria-label="${esc(v)}" title="${esc(v)}">${ICOS[k]?.[v]||(k=='nw'?`<b class=nb>${esc(NWB[v]||v.slice(0,2))}</b>`:esc(v))}</span>`:'<span class=u title="Not recorded">—</span>';
COL.ofc=['Welcome offer','ic',c=>OFLIVE(c)?1:0,c=>{const on=OFLIVE(c),t=on?'Welcome offer: live now':'Welcome offer: none or expired';return on?`<span class="ico y ofi" tabindex=0 role=button aria-haspopup=dialog aria-label="Welcome offer: live now (issuer offer details)" data-ofr="${C.indexOf(c)}"><span class=y aria-hidden=true>✓</span></span>${ptoIcons(c)}`:`<span class="ico n" role=img aria-label="${t}" title="${t}"><span class=n aria-hidden=true>✗</span></span>${ptoIcons(c)}`}];
['itest','inc','hinc'].forEach(k=>{const f=COL[k][3];COL[k][3]=c=>{const h=f(c);return INCQ(c)?`<span class="inqh${k=='itest'?' inqn':''}" tabindex=0 data-inq="${C.indexOf(c)}" aria-haspopup=dialog>${k=='itest'?h.replace(/ title="[^"]*"/,''):h}</span>`:h}});/* B10: income cells open the qualifier hover */
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
const ynI=(c,k)=>{const v=insV(c,k);if(v==null&&c.insu&&c.insu[k])return `<span class=nyv title="Not yet verified">${yn(1).replace(/ title="[^"]*"/,'')}</span>`;return v=='nl'?'<span class=mute title="Not listed in this card’s insurance terms">—</span>':yn(v)};
/* Insurance sort by level (Andrew 2026-10-31: Limit / Medical limit did not sort). Coverage sorts included first; Limit/Trip and Limit/Person by the dollar amount shown, Covered by the number of covered groups, Terms by the length in days (emergency medical with age bands: the longest band). Unlimited = +Infinity (top when descending, just above the blanks when ascending); not included, not listed, None stated, N/A, Not published, not captured and the dash = null, which nlast keeps at the bottom in both directions. */
const INSAMT=v=>{if(v==null)return null;if(typeof v=='number')return v;const t=String(v);if(/unlimited/i.test(t)&&!/\$/.test(t))return Infinity;const m=/\$\s?(\d[\d,]*(?:\.\d+)?)\s*([kKmM]\b)?/.exec(t);if(m){const n=parseFloat(m[1].replace(/,/g,''));return n*({k:1e3,m:1e6}[(m[2]||'').toLowerCase()]||1)}
 const y=/^\+?(\d+(?:\.\d+)?)\s*yr/i.exec(t);if(y)return +y[1]/1000;/* extended warranty '+1 yr': a time extension, not dollars: below every dollar limit, ordered by years */
 const km=/tow\s+(\d[\d,]*)\s*km/i.exec(t);if(km)return +km[1].replace(/,/g,'');return null};
const INSDAYS=v=>{if(v==null)return null;const t=String(v);let m=/(\d[\d,]*)\s*days?\b/i.exec(t);if(m)return +m[1].replace(/,/g,'');m=/(\d+(?:\.\d+)?)\s*years?\b/i.exec(t);if(m)return +m[1]*365;m=/(\d+(?:\.\d+)?)\+?\s*hours?\b/i.exec(t);if(m)return +m[1]/24;return null};
function insKey(c,k){const m=IMODE(),v0=insV(c,k);if(m=='cov'||st.s!='ins')return v0===1?1:v0===0||v0=='nl'?0:null;/* included first on the first (descending) click, not captured at the bottom both ways */if(v0===0||v0=='nl')return null;
 if(m=='lim'){const r=(c.insr||{})[k];return r?INSAMT(r[1]):null}
 if(m=='limt'||m=='limp'){const b=(c.inslb||{})[k],v=b?b[m=='limt'?0:1]:null,r=(c.insr||{})[k];return v!=null?INSAMT(v):b&&b[2]&&r&&r[1]!=null?INSAMT(r[1]):null}/* B11: same value the cell shows (unclassified stated limit falls back) */
 if(m=='who'){const g=(c.inscv||{})[k];return g&&g.length?g.length:null}
 const r=(c.insr||{})[k],v=v0==null&&c.insu&&c.insu[k]?c.insu[k][2]:r?r[2]:null;
 if(k=='emergency_medical'&&c.medage)return Math.max(0,...c.medage.map(x=>x[2]||0))||null;/* age bands: the longest cover any age band gets */
 return INSDAYS(v)}
INS.forEach(([k,l])=>COL['ins_'+k]=[l,'ctr',c=>insKey(c,k),c=>insCell(c,k)]);
/* v3.5.2 single source of label truth: FIELD_LABEL names a field once; table headers and filters both read it, so they cannot drift. */
const FIELD_LABEL={i:'Sponsor',pt:'Category',itest:'Income Test',kind:'Reward type',acct:'Account type',fyf:'Yr-1 Fee',add:'Extra cards',fx:'FX fee',apr:'Purchase APR',inc:'Income required',best:'Best earn %',nins:'Insurance Covers',nt:'Covers',np:'Covers',med:'Medical limit',mob:'Mobile cover',x_cc:'Carrier AD&D',x_ppd:'Price protection window',x_ppi:'Price protection per item',x_ppy:'Price protection per year',exp:'Points expiry'};
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
const ALLNO=c=>INS.every(([k])=>c.ins[k]===0);
COL.x_uw=['Underwriter','wrapt',c=>c.ix.insurers?(c.ix.insurers[0].join('; ')||'~'):ALLNO(c)?'~':'~~',c=>!c.ix.insurers?(ALLNO(c)?'<span class=mute>No included insurance</span>':'<span class=u title="Underwriter not stated in the record">—</span>'):!c.ix.insurers[0].length?'<span class=mute>No included insurance</span>':esc(c.ix.insurers[0].join('; '))+XT(c,'insurers')];
COL.x_cc=['Carrier AD&D','',c=>X(c,'cc_add_max'),xm('cc_add_max')];COL.x_rad=['Rental AD&D','',c=>X(c,'rental_add_max'),xm('rental_add_max')];
COL.x_ppd=['PP days','',c=>X(c,'pp_days'),c=>X(c,'pp_days')==null?'<span class=u>—</span>':X(c,'pp_days')+XT(c,'pp_days')+(X(c,'pp_tier')?`<span class=t title="Only on the ${esc(X(c,'pp_tier'))} tier">${esc(X(c,'pp_tier'))} only</span>`:'')];
COL.x_ppi=['PP / item','',c=>X(c,'pp_item'),xm('pp_item')];COL.x_ppy=['PP / year','',c=>X(c,'pp_year'),xm('pp_year')];
const RM=matchMedia('(prefers-reduced-motion: reduce)');
// $0 = the record says the coverage is not included; ? = not stated / unverified. Unknown is never shown as $0.
const AMC={med:['med','emergency_medical'],mob:['mob','mobile_device'],x_cc:['cc_add_max','travel_accident'],x_rad:['rental_add_max',null],x_ppd:['pp_days','price_protection'],x_ppi:['pp_item','price_protection'],x_ppy:['pp_year','price_protection']};
const AMV=(c,k)=>{const[f,cov]=AMC[k],v=k=='med'&&c.medu?Infinity:k=='med'||k=='mob'?c[f]:k=='x_cc'&&X(c,f)==null&&typeof c.insr?.travel_accident?.[1]=='number'&&c.ins.travel_accident===1?c.insr.travel_accident[1]:X(c,f);if(v!=null&&v!==0)return v;if(cov&&c.ins[cov]===0)return 0;return null};
const AMT=(c,k)=>{const v=AMV(c,k),f=AMC[k][0];if(v===0)return '<span class=z title="Not included per the record">$0</span>';if(v==null)return '<span class=q title="Not stated or unverified">—</span>';
 if(v===Infinity)return 'Unlimited';const tag=k=='med'||k=='mob'||(k=='x_cc'&&X(c,f)==null)?'':XT(c,f);if(k=='x_ppd')return v+tag+(X(c,'pp_tier')?`<span class=t title="Only on the ${esc(X(c,'pp_tier'))} tier">${esc(X(c,'pp_tier'))} only</span>`:'');return '$'+(v>=1e6?v/1e6+'M':v.toLocaleString())+tag};
Object.keys(AMC).forEach(k=>{COL[k]=[COL[k][0],'',c=>AMV(c,k),c=>AMT(c,k)];const fl=S.filter(x=>SUBONLY.has(x.id)).flatMap(x=>x.f).find(x=>x[0]==k);if(fl)fl[2].push(['$0 (not included)',c=>AMV(c,k)===0],['Not captured',c=>AMV(c,k)==null])});
// ---- Wallet ----
const LS=(k,d)=>{try{return JSON.parse(storeGet(k))??d}catch(e){return d}},LSW=(k,v)=>{try{storeSet(k,JSON.stringify(v))}catch(e){}};
const SK='ptt.state',SV=3,NOW=()=>new Date().toISOString(),OLDK=['ptt.st','ptt.wallet','ptt.match'];
/* Andrew 2026-11-06: no long-lived local user data. Guest + signed-in working copy live in sessionStorage (this tab only).
   localStorage keeps UI-only prefs (theme, premium, plan). Logout wipes every ptt.* user key on the device. Server (D1) is source of truth when signed in. */
const THEMEK='ptt.theme',KEEP_LS=new Set([THEMEK,'ptt.premium','ptt.plan']),USERK=new Set([SK,'ptt.sync','ptt.user_promo',...OLDK]);
let PERSIST=true;
try{sessionStorage.setItem('ptt.t','1');sessionStorage.removeItem('ptt.t')}catch(e){PERSIST=false}
const storeGet=k=>{try{return sessionStorage.getItem(k)}catch(e){return null}};
const storeSet=(k,v)=>{try{sessionStorage.setItem(k,v)}catch(e){PERSIST=false;noteS()}};
const storeRm=k=>{try{sessionStorage.removeItem(k)}catch(e){}};
const themeGet=()=>{try{const t=localStorage.getItem(THEMEK);if(t==='dark'||t==='light')return t}catch(e){}return null};
const themeSet=t=>{try{t==='dark'||t==='light'?localStorage.setItem(THEMEK,t):localStorage.removeItem(THEMEK)}catch(e){}};
function wipeUserStores(){const kill=s=>{try{for(const k of Object.keys(s))if(/^ptt/i.test(k)&&!KEEP_LS.has(k))s.removeItem(k)}catch(e){}};kill(localStorage);kill(sessionStorage)}
function migrateLegacyLS(){/* drop legacy localStorage user data; lift into this tab's session when present (tests seed via LS); keep theme */
 try{if(!themeGet()){try{const o=JSON.parse(localStorage.getItem(SK)||'null');if(o&&o.ui&&(o.ui.theme==='dark'||o.ui.theme==='light'))themeSet(o.ui.theme)}catch(e){}}
  const raw=localStorage.getItem(SK);if(raw)storeSet(SK,raw);/* LS wins when both exist: one-shot upgrade + test seeds */
  for(const k of['ptt.sync','ptt.user_promo',...OLDK]){const v=localStorage.getItem(k);if(v!=null)storeSet(k,v)}
  for(const k of Object.keys(localStorage))if(/^ptt/i.test(k)&&!KEEP_LS.has(k))localStorage.removeItem(k)}catch(e){}}
const blankS=()=>({schema_version:SV,app:'PerTheTerms',app_version:D.ver||null,created_at:NOW(),updated_at:NOW(),
 wallet:{cards:[],banks:[],brokerage:[],tel:[],ins:[],points:[],services:[],subtiers:{},spend:{groc:600,dine:300,gas:200,bills:150,other:800},spmig:2,updated_at:NOW()},
 screen:{},saved_screens:[],ui:{}});
const svcTierDef=k=>{const s=(D.subsvc||[]).find(s=>s.k==k),T=s?s.tiers:[];return T.find(t=>t.dflt)||T[0]||null};
function migS(o){if(!o||typeof o!='object')return blankS();const b=blankS();const spm0=+(o.wallet&&o.wallet.spmig)||0;o={...b,...o,wallet:{...b.wallet,...(o.wallet||{})}};delete o.matchup;/* retired Compare store */
 const fix=a=>(a||[]).map(x=>typeof x=='string'?{id:x,added_at:NOW()}:x).filter(x=>x&&C.some(c=>c.id==x.id));o.wallet.cards=fix(o.wallet.cards);['banks','brokerage','tel','ins','points','services'].forEach(k=>{if(!Array.isArray(o.wallet[k]))o.wallet[k]=[]});Object.keys(o.wallet).forEach(k=>{if(Array.isArray(o.wallet[k])&&!['cards','banks','brokerage','tel','ins','points','services','archive','history_log','spx','spoff','mshow','subhide','loyhide','sectionOrder','spendSectionOrder','profileSectionOrder','promoSectionOrder','investSectionOrder','loyaltySectionOrder','ptiles','bspoff','bspx','gcards'].includes(k))delete o.wallet[k]});/* v3 (2026-10-29): one active tier per subscription in wallet.subtiers {service: tier} (wallet.tiers stays the provider relationship-tier map); a v2 service without a tier gets the tier the old
  catalogue priced (the default: Koodo Stream+ Basic, Netflix Standard with ads…). Nothing is dropped: services and unknown tiers stay. */
 {const P=o.wallet.points,isAM=x=>x&&/^air[ -]?miles\b/i.test(String(x.i||''));if(P.some(isAM)){const hb=P.some(x=>x&&x.i=='Blue Rewards');o.wallet.points=P.flatMap(x=>isAM(x)?(hb?[]:[{...x,i:'Blue Rewards'}]):[x])}if(Array.isArray(o.wallet.loyhide))o.wallet.loyhide=[...new Set(o.wallet.loyhide.map(k=>k=='air-miles'?'blue-rewards':k))];['points','kloy'].forEach(g=>{const O=o.wallet.order;if(O&&Array.isArray(O[g]))O[g]=[...new Set(O[g].map(k=>k=='air-miles'?'blue-rewards':/^air[ -]?miles\b/i.test(k)?'Blue Rewards':k))]})}/* AIR MILES became Blue Rewards 2026-06-02 (program id air-miles -> blue-rewards): held entries and hide/order keys migrate; idempotent, balance kept */
 if(o.wallet.services.includes('starbucks')){o.wallet.services=o.wallet.services.filter(k=>k!='starbucks');if(!o.wallet.points.some(x=>/starbucks/i.test(x.i||'')))o.wallet.points.push({i:'Starbucks Rewards (Canada)',added_at:NOW()})}/* Starbucks Rewards is a loyalty program, not a subscription (Andrew 2026-10-29) */
 /* Joint is not a broker account type (Andrew 2026-11-01): joint ownership is Solo/Joint on the tile. A held 'Broker · JOINT' becomes a joint Cash account; its instance key is pinned to the old key so wallet.order / kmap stay valid. Idempotent. */
 o.wallet.brokerage.forEach(x=>{if(!x||typeof x!='object')return;const[bi,t0]=String(x.i||'').split(' · ');if(x.acct=='JOINT'||(!x.acct&&t0=='JOINT')){if(!x.k)x.k=String(x.i);x.acct='CASH';if(t0=='JOINT')x.i=bi+' · CASH';x.own='joint'}if(Array.isArray(x.types)&&x.types.includes('JOINT')){x.types=x.types.filter(t=>t!='JOINT');if(!x.types.includes('CASH'))x.types.push('CASH');x.own='joint'}});
 const TR=o.wallet.subtiers;o.wallet.subtiers=TR&&typeof TR=='object'&&!Array.isArray(TR)?TR:{};o.wallet.services.forEach(k=>{if(!o.wallet.subtiers[k]){const d=svcTierDef(k);if(d)o.wallet.subtiers[k]=d.k}});
  /* B26 Gift Cards: wallet.gcards [{i (instance key), r (retailer), bal, l4, exp, cb, added_at, updated_at}]; anything else drops out */{const A=o.wallet.gcards;if(A!==undefined)o.wallet.gcards=Array.isArray(A)?A.filter(x=>x&&typeof x=='object'&&typeof x.i=='string'&&typeof x.r=='string'&&x.r.trim()):[]}
  /* B21 Profile tiles: wallet.ptiles [{k,added_at}]; unknown keys drop out */{const A=o.wallet.ptiles;if(A!==undefined)o.wallet.ptiles=Array.isArray(A)?A.filter(x=>x&&typeof x=='object'&&typeof x.k=='string').map(x=>({k:x.k,added_at:typeof x.added_at=='string'?x.added_at:NOW()})):[]}
/* B19 (Andrew 2026-11-05): every held item tracks added_at (not shown); backfill missing ones; services are keys, so their added time lives in wallet.svcadded {key: ISO} */{const NA=NOW();['cards','banks','brokerage','tel','ins','points'].forEach(k=>o.wallet[k].forEach(x=>{if(x&&typeof x=='object'&&!x.added_at)x.added_at=NA}));const SA=o.wallet.svcadded;o.wallet.svcadded=SA&&typeof SA=='object'&&!Array.isArray(SA)?SA:{};o.wallet.services.forEach(k=>{if(!o.wallet.svcadded[k])o.wallet.svcadded[k]=NA})}
 /* B24 (Andrew 2026-11-05): per-service details in wallet.svc {name:{…}}; list format wallet.services untouched; empty/unknown fields drop out (no invented values, no idle churn) */{const P=o.wallet.svc;if(P!==undefined){const n={},D8=/^\d{4}-\d\d-\d\d$/,CY=new Set(['monthly','yearly','weekly','quarterly']);if(P&&typeof P=='object'&&!Array.isArray(P))Object.keys(P).forEach(k=>{const r=P[k];if(!r||typeof r!='object'||Array.isArray(r))return;const x={};if(typeof r.tier=='string'&&r.tier)x.tier=r.tier;if(typeof r.plan=='string'&&r.plan.trim())x.plan=r.plan.trim().slice(0,60);if(r.mo!=null&&isFinite(+r.mo)&&+r.mo>=0)x.mo=+r.mo;if(r.price!=null&&isFinite(+r.price)&&+r.price>=0)x.price=+r.price;if(typeof r.cycle=='string'&&CY.has(r.cycle))x.cycle=r.cycle;if(typeof r.renew=='string'&&D8.test(r.renew))x.renew=r.renew;if(typeof r.paid=='string'&&r.paid)x.paid=r.paid;if(typeof r.cover=='string'&&r.cover.trim())x.cover=r.cover.trim().slice(0,300);if(typeof r.nick=='string'&&r.nick.trim())x.nick=r.nick.trim().slice(0,24);if(typeof r.via=='string'&&/^[-a-z0-9.#]{1,48}$/.test(r.via))x.via=r.via;/* bundles: parent sub key, card product id, or '-' */if(typeof r.pex=='string'&&(/^\d{4}-\d\d-\d\d$/.test(r.pex)||r.pex==='—'))x.pex=r.pex;/* Promotion Expiry Date: only stored when the via parent is a timed perk */if(typeof r.pact=='string'&&D8.test(r.pact))x.pact=r.pact;/* optional activation date for N-month card perks */if(typeof r.updated_at=='string'&&r.updated_at)x.updated_at=r.updated_at;if(Object.keys(x).length)n[k]=x});o.wallet.svc=n}}
 /* Loyalty › Status (2026-11-05): wallet.status {programKey:{tier,added_at,updated_at}}; tier '' = held, not picked. Known shapes only; nothing else is rewritten */{const P=o.wallet.status;if(P!==undefined){const n={};if(P&&typeof P=='object'&&!Array.isArray(P))Object.keys(P).forEach(k=>{const r=P[k];if(!/^st-[a-z0-9-]{1,40}$/.test(k)||!r||typeof r!='object'||Array.isArray(r))return;const x={tier:typeof r.tier=='string'&&/^[a-z0-9-]{0,40}$/.test(r.tier)?r.tier:''};if(typeof r.added_at=='string'&&r.added_at)x.added_at=r.added_at;if(typeof r.updated_at=='string'&&r.updated_at)x.updated_at=r.updated_at;n[k]=x});o.wallet.status=n}}
 /* Spending (Andrew 2026-10-30): Travel is no longer a default tile (5 defaults). Non-destructive, once per store: untouched old defaults lose the default $150 Travel; anyone who set Travel keeps it as an added tile (wallet.spx), amount unchanged */
 if(spm0<2){/* Spending categories (2026-10-30), non-destructive: an untouched old default Travel ($150 with every other old default) is dropped; any other saved spend on a non-core category becomes an added tile */const sp=o.wallet.spend||{},OLD={groc:600,dine:300,gas:200,trav:150,bills:150,other:800},ks=Object.keys(sp).filter(k=>+sp[k]);if(ks.length==6&&ks.every(k=>OLD[k]===+sp[k]))delete sp.trav;const core=['groc','gas','dine','bills','other'],x=new Set(Array.isArray(o.wallet.spx)?o.wallet.spx:[]);Object.keys(sp).forEach(k=>{if(+sp[k]>0&&!core.includes(k)&&!k.startsWith('st_'))x.add(k)});o.wallet.spx=[...x];o.wallet.spmig=2}
 if((o.wallet.spmig||0)<3){/* Spending superset (Andrew 2026-11-05): every old key keeps its store (W.spend card categories, wallet.bspend bank bills, wallet.mspend stores, wallet.gcards); only the page grouping changed, so nothing is rewritten. Bank bills added beyond the five preloaded ones live in wallet.bspx */if(!Array.isArray(o.wallet.bspx))o.wallet.bspx=[];{const A=o.wallet.spendSectionOrder;if(Array.isArray(A)){const B=A.filter(x=>x!='pw-bspend'&&x!='pw-life'),i=B.indexOf('pw-spend');B.splice(i<0?0:i+1,0,'pw-life');o.wallet.spendSectionOrder=B}}/* a saved section order gets Lifestyle right after Living; retired Banking dropped */o.wallet.spmig=3}
 /* PUSH 4 (2026-10-30), non-destructive: brokerage entries gain broker + acct fields parsed from 'Broker · TYPE' when missing; nothing is dropped or renamed */
 o.wallet.brokerage=o.wallet.brokerage.map(x=>{if(!x||typeof x!='object'||typeof x.i!='string')return x;const[br,t]=x.i.split(' · ');return {...x,broker:x.broker||br,...(t&&!x.acct?{acct:t}:{})}});o.wallet.acmig=1;
 ['cards','banks','brokerage'].forEach(g=>{const seen=new Set();o.wallet[g]=o.wallet[g].map(x=>{if(!x||typeof x!='object')return x;const base=String(g=='brokerage'?x.i:x.id);let k=typeof x.k=='string'&&x.k?x.k:base;if(seen.has(k))k=NEWK(base,seen);seen.add(k);return k===x.k?x:{...x,k}})});/* B4 instance keys, non-destructive */
 /* Accounts tile order (Andrew 2026-11-01: move tiles like iPhone icons), non-destructive: wallet.order {cards:[id],banks:[id],brokerage:[i]} is only an ordering hint (syncs as wallet.order, newest wins); keys no longer held drop out, tiles not listed follow in their added order */
 {const O0=o.wallet.order,O=O0&&typeof O0=='object'&&!Array.isArray(O0)?{...O0}:{},H={cards:o.wallet.cards.map(x=>IKEY('cards',x)),banks:o.wallet.banks.map(x=>IKEY('banks',x)),brokerage:o.wallet.brokerage.map(x=>IKEY('brokerage',x))};
  Object.keys(H).forEach(g=>{const h=new Set(H[g].filter(Boolean).map(String));O[g]=Array.isArray(O[g])?[...new Set(O[g].filter(k=>typeof k=='string'&&h.has(k)))]:[]});o.wallet.order=O;/* Dashboard v2 (Andrew 2026-11-03): the old two KPI sections (order.pacc / .pspd) split into one section per grouping; a saved tile order carries over to the section each KPI now lives in */
  {const OLD=[].concat(Array.isArray(O.pacc)?O.pacc:[],Array.isArray(O.pspd)?O.pspd:[]),G={kcards:['k-cards','k-cfee'],kbank:['k-bfee'],kloy:['k-pts'],kspend:['k-spm','k-top','k-mix','k-rew','k-rate']};if(O.pacc!==undefined||O.pspd!==undefined){Object.keys(G).forEach(g=>{const L=OLD.filter(k=>G[g].includes(k));if(O[g]===undefined&&L.length)O[g]=L});delete O.pacc;delete O.pspd}}
  ['spend','life','merch','services','points','kcards','kbank','kbrok','kloy','ksubs','kspend','ptiles'].forEach(g=>{if(O[g]!==undefined)O[g]=Array.isArray(O[g])?[...new Set(O[g].filter(k=>typeof k=='string'))]:[]})/* B7b: Spending order hints; Profile ptiles the same (unknown keys are harmless: ORD puts unlisted tiles last; a removed key stays so re-adding returns it) */}
 {const A=o.wallet.profileSectionOrder;if(Array.isArray(A)&&A.some(x=>x=='pw-pacc'||x=='pw-pspd'))o.wallet.profileSectionOrder=A.flatMap(x=>x=='pw-pacc'?['pw-kcards','pw-kbank','pw-kbrok','pw-kloy','pw-ksubs']:x=='pw-pspd'?['pw-kspend']:[x])}/* Dashboard v2 section split */
 {const K=o.wallet.kpis;if(K!==undefined){const n={};if(K&&typeof K=='object'&&!Array.isArray(K))Object.keys(K).forEach(g=>{if(Array.isArray(K[g]))n[g]=[...new Set(K[g].filter(x=>typeof x=='string'))]});o.wallet.kpis=n}}/* Dashboard KPI picks {group:[kpi id]} (syncs as wallet.kpis, newest wins); absent group = suggested defaults */
 ['sectionOrder','spendSectionOrder','profileSectionOrder','promoSectionOrder','investSectionOrder','loyaltySectionOrder'].forEach(K=>{const A=o.wallet[K];if(A!==undefined)o.wallet[K]=Array.isArray(A)?[...new Set(A.filter(x=>typeof x=='string'&&/^pw-[a-z0-9-]+$/.test(x)))]:[]})/* Accounts + Spending + Investments + Promotions section order, see SECORD */
 /* Accounts group collapse (Andrew 2026-11-01), non-destructive: ui.acol {cards,banks,brokerage,insts: true = collapsed} syncs as ui.acol (newest wins); only normalized when present (no key is created, so a fresh device never overwrites another's choice); unknown keys and non-true values drop out */
 {const u=o.ui;o.ui=u&&typeof u=='object'&&!Array.isArray(u)?u:{};const A=o.ui.acol;if(A!==undefined){const n={};if(A&&A.pacc===true)['kcards','kbank','kbrok','kloy','ksubs'].forEach(k=>A[k]=true);if(A&&A.pspd===true)A.kspend=true;/* Dashboard v2 section split */if(A&&typeof A=='object'&&!Array.isArray(A)){ACK.forEach(k=>{if(A[k]===true)n[k]=true});Object.keys(A).forEach(k=>{if(/^iv-[a-z0-9]+$/.test(k)&&A[k]===true)n[k]=true})}o.ui.acol=n}}
 /* Promotions (Andrew 2026-11-04), non-destructive: wallet.promo {promo key (p.k): {st:'enrolled'|'declined'|'complete', e:when he enrolled, v:the value he moved, done:when the payout arrived}}.
    Only a known st survives, a date that is not YYYY-MM-DD is dropped (the record then shows no date rather than a guess), a value that is not a number is dropped, and no key is created when absent. */
 {const P=o.wallet.promo;if(P!==undefined){const n={},D8=/^\d{4}-\d\d-\d\d$/;if(P&&typeof P=='object'&&!Array.isArray(P))Object.keys(P).forEach(k=>{const r=P[k];if(!r||typeof r!='object'||!['enrolled','declined','complete'].includes(r.st))return;const x={st:r.st};if(typeof r.e=='string'&&D8.test(r.e))x.e=r.e;if(r.v!=null&&isFinite(+r.v)&&+r.v>=0)x.v=+r.v;if(typeof r.done=='string'&&D8.test(r.done))x.done=r.done;n[k]=x});o.wallet.promo=n}}
 o.schema_version=SV;return o}
/* Accounts group headers (Andrew 2026-11-01): bigger subheaders; the whole header is one button (text + count + chevron) that collapses / expands the group. Chevron points right when collapsed, rotates down when open. State in STO.ui.acol. */
const ACK=['cards','banks','brokerage','insts','spend','life','merch','subs','loy','gc','lpts','lsta','pactive','ppros','pdecl','pexp','pcomp','kcards','kbank','kbrok','kloy','ksubs','kspend','psum','pdet'],ACO=g=>!!((STO.ui||{}).acol||{})[g];
/* B25: the one tile remove ✕ (CSS .rmx: hidden until hover/focus; always shown on touch). attrs = the data-* that says what to remove */
const RMX=(attrs,label)=>`<button type=button class=rmx ${attrs} aria-label="Remove ${esc(label)}" title="Remove">&#x2715;</button>`;
const ASG=n=>`<span class=asg data-asg role=button tabindex=-1 aria-label="Drag to move ${n}" title="Drag to move this section"><svg viewBox="0 0 10 16" width=10 height=16 aria-hidden=true focusable=false fill=currentColor><circle cx=2.5 cy=2 r=1.2 /><circle cx=7.5 cy=2 r=1.2 /><circle cx=2.5 cy=6 r=1.2 /><circle cx=7.5 cy=6 r=1.2 /><circle cx=2.5 cy=10 r=1.2 /><circle cx=7.5 cy=10 r=1.2 /><circle cx=2.5 cy=14 r=1.2 /><circle cx=7.5 cy=14 r=1.2 /></svg></span>`;/* the dotted grip, shared by page section headers and sidebar sub-links */
const ACH=(g,id,n,c,gr,wt)=>`<h3 class=ach>${gr?ASG(n):''}<button type=button class=acb data-acol=${g} aria-expanded=${!ACO(g)} aria-controls=${id}-t><span class=acn>${n}</span> <span class="mute acc">(${c})</span><svg class=acv viewBox="0 0 16 16" width=18 height=18 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2.2 stroke-linecap=round stroke-linejoin=round><path d="M6 3.5 10.5 8 6 12.5"/></svg></button>${wt?`<button type=button class=wplus ${wt.startsWith('sp:')?'data-spw='+wt.slice(3):wt.startsWith('kp:')?'data-kpw='+wt.slice(3):wt.startsWith('ly:')?'data-lyw='+wt.slice(3):'data-wiz='+wt} aria-haspopup=dialog aria-label="Add ${wt.startsWith('kp:')?n+' KPIs':n}" title="Add ${wt.startsWith('kp:')?n+' KPIs':n}"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button>`:''}</h3>`;/* Andrew 2026-11-03: + on each Accounts subsection opens Accounts + at that type's step 2; ly: = Loyalty + (Points/Status) */
/* Accounts section order (Andrew 2026-11-02: 'banking can be dragged ahead of credit cards'). wallet.sectionOrder [section ids] is an ordering hint (syncs as wallet.sectionOrder, newest wins):
   listed ids first in that order, sections not listed (new, or never moved) follow in their default order. A mouse drag starts only on the grip (.asg) — the page header or the matching sidebar sub-link — so tile drags, the collapse button and a click on the link are untouched. Touch is a press-and-hold on the whole row (the SECORD drag below). */
/* Spending mirrors it (Andrew 2026-11-02) in its own key wallet.spendSectionOrder (syncs as wallet.spendSectionOrder), so the two views never share an order. */
const SECK=v=>v&&v.querySelector(':scope>#pw-spend')?'spendSectionOrder':v&&v.querySelector(':scope>#pw-kcards')?'profileSectionOrder':v&&v.querySelector(':scope>#pw-pact')?'promoSectionOrder':v&&v.querySelector(':scope>[id^=pw-iv-]')?'investSectionOrder':v&&v.querySelector(':scope>#pw-lsta,:scope>#pw-loy')?'loyaltySectionOrder':'sectionOrder';
/* the category / account icon library (tiles at 28px, sidebar rows at 14px via MI): defined before the section lists that name its keys */
const CICO={groc:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.4 12h11.2L21 7H6"/>',gas:'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',ev:'<path d="M13 2 5 13h6l-1 9 8-11h-6z"/>',dine:'<path d="M6 2v8a2 2 0 0 0 4 0V2M8 10v12M17 22V2c-2 1-3.5 4-3.5 8 0 2 1.5 3 3.5 3"/>',deliv:'<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',trav:'<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L17 5.5a1.8 1.8 0 0 1 2.5 2.5L14.5 13l1 7.5L14 22l-2.5-7.5-3 3V20l-1.5 1.5-1-3.5-3.5-1L4 15.5h2.5l3-3"/>',fly:'<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L17 5.5a1.8 1.8 0 0 1 2.5 2.5L14.5 13l1 7.5L14 22l-2.5-7.5-3 3V20l-1.5 1.5-1-3.5-3.5-1L4 15.5h2.5l3-3"/>',hotel:'<path d="M3 20V5M3 15h18v5M3 11h7v4M10 11h8a3 3 0 0 1 3 3v1"/><circle cx="6.5" cy="8.5" r="1.5"/>',portal:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',transit:'<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="14" r=".8"/><circle cx="15" cy="14" r=".8"/>',ride:'<path d="M5 16V11l2-5h10l2 5v5H5zM5 11h14"/><circle cx="8" cy="16" r="1.8"/><circle cx="16" cy="16" r="1.8"/>',bills:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4"/>',util:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',stream:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M10.5 8.5v5l4-2.5z"/>',ent:'<path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3zM9 4v12"/>',drug:'<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="m9 9 6 6"/>',fxsp:'<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-1-1.8-1.5-3-1.5-1.7 0-3 1-3 2.5S10.3 12 12 12s3 .9 3 2.5S13.7 17 12 17c-1.2 0-2.3-.5-3-1.5M12 5v2M12 17v2"/>',office:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/>',online:'<path d="M5 7h14l-1 13H6zM9 10V6a3 3 0 0 1 6 0v4"/>',whole:'<path d="M3 10 12 4l9 6v10H3zM8 20v-6h8v6"/>',memb:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.6-2.2 3-2.2s2.5.7 3 2.2M15 10h3M15 13h3"/>',other:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'};
Object.assign(CICO,{wloy:'<circle cx="12" cy="12" r="8"/><path d="M12 8l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z"/>',ins:'<path d="M12 3.5l7.5 3v5.5c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6.5z"/>',wgc:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8c-1.5-3-5-3.5-5-1.2C7 8 9.5 8 12 8c2.5 0 5 0 5-1.2 0-2.3-3.5-1.8-5 1.2"/>',wsub:'<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"/>',wcard:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',wbank:'<path d="M3 9.5 12 4l9 5.5M4.5 10v8M9 10v8M15 10v8M19.5 10v8M3 20.5h18"/>',wbrk:'<path d="M3 20h18M5 16l4.5-5 3.5 3 6-7"/><path d="M15 7h4v4"/>',iv:'<path d="M4 18h16"/><path d="M6 14l3.5-3.5 3 3L18 6"/><path d="M14.5 6H18v3.5"/>'});/* PUSH 4 wizard type icons (original); iv = User › Investments section rows */
Object.assign(CICO,{bsp_rent:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',bsp_condo:'<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1"/>',bsp_homeins:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 16v-3l3-2.5 3 2.5v3z"/>',bsp_gasheat:'<path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 2 3 4"/>',bsp_autoins:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8 15v-2l1.2-3h5.6l1.2 3v2z"/>',bsp_carpay:'<path d="M3 17v-4l2-6h14l2 6v4z"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/><path d="M3 13h18"/>',bsp_lifeins:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M9 12h2l1-2 1 4 1-2h1"/>',bsp_childcare:'<circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/>',bsp_tuition:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v5"/>',bsp_fitness:'<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',bsp_pets:'<circle cx="7" cy="9" r="1.6"/><circle cx="12" cy="6.5" r="1.6"/><circle cx="17" cy="9" r="1.6"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/>',bsp_charity:'<path d="M12 12s-4-2.5-4-5a2 2 0 0 1 4-1 2 2 0 0 1 4 1c0 2.5-4 5-4 5z"/><path d="M3 16h4l3 2h5l5-3M3 20h18"/>',bsp_mortgage:'<path d="M3 10.5 12 4l9 6.5V20H3z"/><path d="M9.5 20v-5h5v5"/>',bsp_ptax:'<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 12.5h6M9 16h3"/>',bsp_water:'<path d="M12 3.5s5.5 6 5.5 10a5.5 5.5 0 0 1-11 0c0-4 5.5-10 5.5-10z"/>',bsp_hydro:'<path d="M13 2.5 5 13.5h5l-1 8 8-11h-5z"/>',bsp_tel:'<path d="M6.5 3h-2A1.5 1.5 0 0 0 3 4.7C3.4 13 11 20.6 19.3 21a1.5 1.5 0 0 0 1.7-1.5v-2a1.5 1.5 0 0 0-1.2-1.5l-2.6-.5a1.5 1.5 0 0 0-1.5.6l-.8 1a14.5 14.5 0 0 1-6-6l1-.8a1.5 1.5 0 0 0 .6-1.5l-.5-2.6A1.5 1.5 0 0 0 8.5 3z"/>'});
const cico=k=>`<svg class=cico viewBox="0 0 24 24" width=28 height=28 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round aria-hidden=true>${CICO[k]||CICO.other}</svg>`;
const SECRANK=K=>{const O=Array.isArray(STO.wallet[K])?STO.wallet[K]:[];return id=>{const i=O.indexOf(id);return i<0?1e6:i}},
 rankSort=(A,key,r)=>A.map((x,i)=>[x,i]).sort((p,q)=>r(key(p[0]))-r(key(q[0]))||p[1]-q[1]).map(p=>p[0]);/* listed ids first in the saved order, the rest in their default order */
const SECORD=(H,K='sectionOrder')=>rankSort(H,h=>(h.match(/ id=(pw-[a-z0-9-]+)/)||[])[1],SECRANK(K)).join('\n');
/* Andrew 2026-11-05 (usernav): the sections of Accounts and Spending, ONE list per page: [id, label, icon (CICO), Accounts + wizard type, shown?].
   The page headers (ACH) take their labels from it (USN), the Accounts + wizard its types (WZT), and the sidebar sub-nav under Accounts / Spending (#pfl)
   lists it in the page's own drag order (USECL), so a rename, removal or reorder shows everywhere at once. */
var usubNow=null;/* section-drag commit refreshes the sidebar sub-nav; assigned when the drawer is built */
const USEC={wallet:{K:'sectionOrder',L:[['pw-cards','Credit Cards','wcard','cards'],['pw-banks','Banking','wbank','banks'],['pw-brokers','Brokers','wbrk','brokers']]},
 spending:{K:'spendSectionOrder',L:[['pw-spend','Living','groc'],['pw-life','Lifestyle','fly'],['pw-merch','Retailers','online',0,()=>MERCH.length],['pw-gc','Gift Cards','wgc','gc']]}/* Andrew 2026-11-05: the four spending groups (D.spcat); pw-spend keeps its id (order key wallet.order.spend), Banking folded into Living / Lifestyle */,
 pointcards:{K:'loyaltySectionOrder',L:[['pw-loy','Points','wloy','loy'],['pw-lsta','Status','ins','status']]}/* Andrew 2026-11-06: Loyalty = Points + Status, same movable section nav as Spending */,
 assets:{K:'investSectionOrder',L:[]}};/* Profile › Assets (moved from PerYourTerms › Investments, Andrew 2026-11-06): rows are filled from Kubera (ivUse) in the page's drag order; ids stay pw-iv-*, distinct from Products › Investments (pl invest) */
const USN=id=>Object.values(USEC).flatMap(p=>p.L).find(x=>x[0]==id)[1],
 USECL=pg=>rankSort(USEC[pg].L.filter(x=>!x[4]||x[4]()),x=>x[0],SECRANK(USEC[pg].K));
/* go to a section on its page: scroll its header under the site header and focus its collapse button (sidebar sub-nav, old Subscriptions / Loyalty routes) */
function usecGo(id){let el=document.getElementById(id);if(!el)return;{const b=el.querySelector(':scope>h3.ach>.acb[aria-expanded=false]');if(b){b.click();el=document.getElementById(id)}}/* a collapsed section opens first, through the page's own toggle (saves STO.ui.acol) */scrollTo({top:el.getBoundingClientRect().top+scrollY-($('header')?.offsetHeight||0)-12});el.querySelector('.acb')?.focus({preventScroll:true})}
/* B22 shared drag-reorder (Andrew 2026-11-05: 'Moving from first position to last position just fucks the dog… True for everything').
   ONE helper for every drag-reorderable list on the site: Accounts tiles (Credit Cards / Banking / Brokers / Loyalty), Subscriptions page tiles,
   Spending tiles, Dashboard KPI tiles, Profile personal-info tiles (RG pw-metiles → wallet.order.ptiles), and Accounts / Spending / Profile / Promotions section order (SECORD grips).
   A later Promotions tile drag joins RG the same way — do not copy a per-section drag. See Docs/naming.md "Shared drag-reorder (B22)".
   Index math: drop the dragged item from the list, then insert before/after the target by the pointer vs the target's centre
   (horizontal half within a row; vertical for single-column lists and section stacks). Dropping past the last item, or on a
   trailing add/+ (.wplus / [data-rdadd]), means last. The source slot (.rdsrc / .asdrag) is the placeholder; .rdmark is the
   insertion marker (no per-pixel reflow jitter). Pointer + touch + Esc (keyboard cancel) as before; persist via onCommit.
   Touch on a section header or a sidebar sub-link — the phone drawer is the same list — is one press-and-hold in the SECORD drag below, so those surfaces share it. */
const RD_RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,RD_EZ='cubic-bezier(.2,.8,.2,1)';
/* insert index in `items` AFTER removing `dragged`; mode 'y' = single column / sections, 'grid' = wrapped tile row */
const rdInsertIndex=(items,dragged,x,y,mode)=>{const others=items.filter(t=>t&&t!==dragged&&t.isConnected);if(!others.length)return 0;
 if(mode==='y'){for(let i=0;i<others.length;i++){const r=others[i].getBoundingClientRect();if(y<r.top+r.height/2)return i}return others.length}
 for(let i=0;i<others.length;i++){const r=others[i].getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,prev=others[i-1],pr=prev&&prev.getBoundingClientRect(),sameRowAsPrev=!(!prev||Math.abs((pr.top+pr.height/2)-cy)>=r.height*.45),onRow=y>=r.top-2&&y<=r.bottom+2;
  if(onRow&&x<cx)return i;if(!onRow&&y<cy&&!sameRowAsPrev)return i}return others.length};
const rdRefAt=(items,dragged,idx)=>{const others=items.filter(t=>t&&t!==dragged);return others[idx]||null};
const rdIsAdd=el=>!!(el&&(el.matches?.('.wplus,[data-rdadd],.rdadd')||el.closest?.('.wplus,[data-rdadd],.rdadd')));
const rdMarkAt=(g,ref,dragged)=>{let m=g.querySelector(':scope>.rdmark');if(!m){m=document.createElement('div');m.className='rdmark';m.setAttribute('aria-hidden','true');g.appendChild(m)}
 const gr=g.getBoundingClientRect(),cs=getComputedStyle(g),pl=parseFloat(cs.paddingLeft)||0,pt=parseFloat(cs.paddingTop)||0;let left=pl,top=pt,h=48;
 if(ref){const r=ref.getBoundingClientRect();left=r.left-gr.left-2;top=r.top-gr.top;h=r.height}
 else{const last=[...g.querySelectorAll(':scope>[data-ok]')].filter(t=>t!==dragged).pop();if(last){const r=last.getBoundingClientRect();left=r.right-gr.left+2;top=r.top-gr.top;h=r.height}}
 Object.assign(m.style,{left:left+'px',top:top+'px',height:h+'px'});return m};
const rdClearMark=g=>{g&&g.querySelectorAll(':scope>.rdmark').forEach(m=>m.remove())};
{/* section order, both ways (Andrew 2026-11-05): the page header and the sidebar sub-link are one drag.
   rdInsertIndex mode 'y' (the shared vertical helper). Drop writes the page's own key (wallet.sectionOrder / spendSectionOrder / investSectionOrder / …).
   The other list (page sections, or the sidebar rows) is moved in place with it — no render. User-group rows (Profile, Accounts, Spending, …) have no order key, so they are not draggable.
   Mouse and pen still start on the grip only (.asg), after a few pixels. Touch — the phone drawer is this same #snav list — is a press-and-hold
   (HOLD ms, SLOP px of finger wobble) anywhere on the link row or the section header. A shorter tap still clicks. A vertical move before the hold scrolls.
   A horizontal move past SLOP before the hold is the phone drawer's swipe-to-close (below), not a reorder.
   Only once the row is picked up do touch-action and preventDefault lock page scroll; the drawer then auto-scrolls near its own edges. */
const HOLD=350,SLOP=10,EDGE=52;
const secs=v=>v?[...v.children].filter(x=>x.matches('section.acs[id]')):[];
const rows=v=>v?[...v.children].filter(x=>x.matches('button[data-usec]')):[];
let D0=null,SUP=0,SUPT=0;
const viewOf=pg=>{if(typeof st!='object'||st.s!==pg)return null;const v=document.querySelector('#view>.wsimple');return v&&secs(v).length?v:null};
const restore=(d,ids)=>{if(d.page)ids.forEach(k=>{const x=d.v.querySelector(':scope>#'+k);if(x)d.v.insertBefore(x,d.v.querySelector(':scope>#pw-pytlink'))});
  else ids.forEach(k=>{const x=[...d.v.children].find(n=>n.dataset.usec===k);if(x)d.v.appendChild(x)});
  if(!d.twin)return;const nodes=d.twinList(),by=new Map(nodes.map(n=>[d.tid(n),n])),after=nodes.length?nodes[nodes.length-1].nextSibling:null;
  ids.forEach(id=>{const n=by.get(id);if(n)d.twin.insertBefore(n,after)})};
const place=(d,x,y)=>{const items=d.list(),to=rdInsertIndex(items,d.s,x,y,'y'),ref=rdRefAt(items,d.s,to);if(d.s.nextSibling===ref||(!ref&&!d.s.nextSibling))return;d.s.style.transform='';const t0=d.s.getBoundingClientRect().top;d.v.insertBefore(d.s,ref);const t1=d.s.getBoundingClientRect().top;d.y0+=t1-t0;
  if(!d.twin)return;const order=d.list().map(d.sid),nodes=d.twinList(),by=new Map(nodes.map(n=>[d.tid(n),n])),after=nodes.length?nodes[nodes.length-1].nextSibling:null;
  order.forEach(id=>{const n=by.get(id);if(n)d.twin.insertBefore(n,after)})};
const scEl=d=>{if(d.page)return document.scrollingElement;const n=d.s.closest('#snav');return n&&n.scrollHeight>n.clientHeight+1?n:null};
const apply=d=>{d.s.style.transform=`translateY(${d.y-d.y0}px)`;place(d,d.x,d.y);d.s.style.transform=`translateY(${d.y-d.y0}px)`;edge(d)};
const edge=d=>{if(!d.touch||!d.on){d.edge=0;return}const el=scEl(d);if(!el){d.edge=0;return}const r=el===document.scrollingElement?{top:0,bottom:innerHeight}:el.getBoundingClientRect(),y=d.y;let dir=0;
 if(y<r.top+EDGE)dir=-Math.max(1,Math.round((EDGE-(y-r.top))/EDGE*14));else if(y>r.bottom-EDGE)dir=Math.max(1,Math.round((EDGE-(r.bottom-y))/EDGE*14));
 d.edge=dir;if(!dir||d.escr)return;
 const step=()=>{if(D0!==d||!d.on||!d.edge){d.escr=0;return}const b=el.scrollTop;el.scrollTop=b+d.edge;const m=el.scrollTop-b;if(m)d.y0-=m;apply(d);d.escr=requestAnimationFrame(step)};
 d.escr=requestAnimationFrame(step)};
const lift=d=>{if(!d||D0!==d||d.on)return;d.y0=d.y;d.on=true;d.s.classList.add('asdrag');d.s.style.touchAction='none';document.documentElement.classList.add('asdragging','aslock');
 try{d.g.setPointerCapture(d.id)}catch(_){}if(navigator.vibrate)try{navigator.vibrate(10)}catch(_){}apply(d)};
const boot=(sec,row,g,e,touch)=>{
 if(sec){const v=sec.parentElement,pg=Object.keys(USEC).find(k=>USEC[k].K===SECK(v)),box=pg&&document.getElementById('usub-'+pg);
  D0={s:sec,v,list:()=>secs(v),sid:n=>n.id,twin:box||null,twinList:()=>rows(box),tid:n=>n.dataset.usec,key:SECK(v),page:true,g,y0:e.clientY,x0:e.clientX,x:e.clientX,y:e.clientY,on:false,touch:!!touch,id:e.pointerId,ks:secs(v).map(x=>x.id),edge:0,escr:0}}
 else{const box=row.parentElement,pg=row.dataset.s,K=USEC[pg]&&USEC[pg].K;if(!K)return;const view=viewOf(pg);
  D0={s:row,v:box,list:()=>rows(box),sid:n=>n.dataset.usec,twin:view,twinList:()=>secs(view),tid:n=>n.id,key:K,page:false,g,y0:e.clientY,x0:e.clientX,x:e.clientX,y:e.clientY,on:false,touch:!!touch,id:e.pointerId,ks:rows(box).map(x=>x.dataset.usec),edge:0,escr:0}}
 if(touch)D0.tm=setTimeout(()=>{if(D0)lift(D0)},HOLD);else try{g.setPointerCapture(e.pointerId)}catch(_){}};
document.addEventListener('pointerdown',e=>{if(e.button>0||!e.isPrimary||D0)return;const touch=e.pointerType=='touch';let sec,row,g;
 if(touch){row=e.target.closest('#snav .usub button[data-usec]');
  if(row){g=row.querySelector('[data-asg]');if(!g)return}
  else{const head=e.target.closest('.wsimple>section.acs>h3.ach');if(!head||e.target.closest('.wplus,a,input,select,textarea'))return;sec=head.closest('section.acs');g=head.querySelector('[data-asg]');if(!sec||!g)return}}
 else{g=e.target.closest('[data-asg]');if(!g)return;sec=g.closest('.wsimple>section.acs');row=!sec&&g.closest('#snav .usub button[data-usec]');if(!sec&&!row)return;e.preventDefault()}
 boot(sec,row,g,e,touch)},true);
document.addEventListener('pointermove',e=>{const d=D0;if(!d||e.pointerId!=d.id)return;d.x=e.clientX;d.y=e.clientY;if(!d.on){const dx=e.clientX-d.x0,dy=e.clientY-d.y0;
 if(d.touch){if(dx*dx+dy*dy>SLOP*SLOP){clearTimeout(d.tm);D0=null}return}if(Math.abs(dy)<4&&Math.abs(dx)<4)return;d.on=true;d.s.classList.add('asdrag');document.documentElement.classList.add('asdragging')}
 if(e.cancelable)e.preventDefault();apply(d)},{passive:false});
document.addEventListener('touchmove',e=>{if(((D0&&D0.on)||(SW&&SW.on))&&e.cancelable)e.preventDefault()},{passive:false,capture:true});
document.addEventListener('selectstart',e=>{if(D0)e.preventDefault()},true);
document.addEventListener('contextmenu',e=>{if(D0&&D0.touch)e.preventDefault()},true);
const end=(e,ok)=>{const d=D0;if(!d||(e&&e.pointerId!=d.id))return;clearTimeout(d.tm);if(d.escr)cancelAnimationFrame(d.escr);d.edge=0;D0=null;if(!d.on)return;const s=d.s;document.documentElement.classList.remove('asdragging','aslock');
 if(!ok)restore(d,d.ks);
 const fin=()=>{s.classList.remove('asdrag','assettle');s.style.transform='';s.style.transition='';s.style.touchAction=''};if(RD_RM()||!ok)fin();else{s.classList.add('assettle');s.style.transition='transform .16s ease-out';s.style.transform='translateY(0)';setTimeout(fin,180)}
 if(ok){SUP=Date.now();SUPT=d.touch?1:0;const ids=d.list().map(d.sid);if(ids.join()!=d.ks.join()){STO.wallet[d.key]=ids;saveS();if(d.page&&typeof usubNow=='function')usubNow()}}};
document.addEventListener('pointerup',e=>end(e,true),true);document.addEventListener('pointercancel',e=>end(e,false),true);
document.addEventListener('keydown',e=>{if(e.key!='Escape'||!D0)return;if(D0.on){e.preventDefault();e.stopImmediatePropagation()}end(null,false)},true);
document.addEventListener('click',e=>{if(e.target.closest('[data-asg]')){e.preventDefault();e.stopImmediatePropagation();return}if(SUP&&Date.now()-SUP<500&&e.target.closest(SUPT?'#snav .usub,.wsimple>section.acs':'#snav .usub')){e.preventDefault();e.stopImmediatePropagation();SUP=0;SUPT=0}},true);
/* Phone overlay drawer (Andrew 2026-11-06): #snav is left-anchored and a flick or slide to the LEFT closes it. A rightward swipe does not.
   The same HOLD/SLOP as the reorder above — horizontal past SLOP before the hold is this swipe, vertical is scroll, the hold (D0.on) keeps the reorder.
   Desktop (the pushing sidebar, ≥1100) is untouched. The drawer tracks the finger 1:1 to the left. Past ~35% of its width, or a leftward flick quicker than ~0.4px/ms,
   it finishes the slide off the left edge; otherwise it eases home on RD_EZ. */
let SW=null,SWATE=0;
const txOf=n=>{const t=getComputedStyle(n).transform;if(!t||t==='none')return 0;try{return new DOMMatrix(t).m41||0}catch(e){return 0}};
const snavAt=s=>{const dx=(s.x-s.x0)/(s.z||1);s.along=Math.max(0,Math.min(s.lw,s.base+dx*s.dir));if(s.on)s.n.style.transform=`translateX(${s.dir*s.along}px)`};
const snavVel=s=>{const b=s.samples[s.samples.length-1];if(!b)return 0;let a=b;for(let i=s.samples.length-1;i>=0;i--){if(b.t-s.samples[i].t>100)break;a=s.samples[i]}const dt=b.t-a.t;return dt>0?(b.x-a.x)/dt:0};
const snavFlick=(s,commit)=>{const n=s.n;if(!n||!n.isConnected)return;SWATE=Date.now();n.classList.remove('snswipe');
 if(RD_RM()){n.classList.remove('snaway');n.style.transform='';n.style.transition='';n.style.animation='';if(commit){snavSet(false);$('#rtog')?.focus()}else n.style.animation='none';return}
 if(!commit){n.classList.add('snswipe');n.style.animation='none';n.style.transition=`transform .45s ${RD_EZ}`;void n.offsetWidth;n.style.transform='translateX(0)';const token=snavSet.flick||0;let done=false;
  const fin=()=>{if(done||(snavSet.flick||0)!==token||(SW&&SW.on&&SW.n===n))return;done=true;n.removeEventListener('transitionend',onE);n.classList.remove('snswipe');n.style.transform='';n.style.transition='';n.style.animation='none'};
  const onE=e=>{if(e.target===n&&e.propertyName==='transform')fin()};n.addEventListener('transitionend',onE);setTimeout(fin,560);return}
 n.classList.add('snaway');n.style.animation='none';n.style.transition='transform .22s ease-in';void n.offsetWidth;n.style.transform=`translateX(${s.dir*(n.offsetWidth||s.lw)}px)`;
 snavSet(false);$('#rtog')?.focus();const token=snavSet.flick||0;let done=false;
 const fin=()=>{if(done||(snavSet.flick||0)!==token||!n.classList.contains('snaway'))return;done=true;n.removeEventListener('transitionend',onE);n.hidden=true;n.classList.remove('snaway','out','snswipe');n.style.transform='';n.style.transition='';n.style.animation=''};
 const onE=e=>{if(e.target===n&&e.propertyName==='transform')fin()};n.addEventListener('transitionend',onE);setTimeout(fin,340)};
document.addEventListener('pointerdown',e=>{if(e.button>0||!e.isPrimary||e.pointerType!='touch'||innerWidth>=1100||(D0&&D0.on))return;const n=e.target.closest&&e.target.closest('#snav');if(!n||n.hidden)return;const r=n.getBoundingClientRect(),lw=n.offsetWidth||r.width;if(lw<40||r.width<20)return;const z=r.width/lw||1,dir=-1;/* off to the left; a rightward finger never closes */
 SW={id:e.pointerId,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,dir,z,lw,base:0,along:0,on:false,mode:0,n,samples:[{x:e.clientX,t:performance.now()}]}},true);
document.addEventListener('pointermove',e=>{const s=SW;if(!s||e.pointerId!=s.id||s.mode==='scroll'||s.mode==='drag')return;if(D0&&D0.on){s.mode='drag';return}s.x=e.clientX;s.y=e.clientY;s.samples.push({x:s.x,t:performance.now()});if(s.samples.length>40)s.samples.shift();
 if(!s.on){const dx=s.x-s.x0,dy=s.y-s.y0;if(dx*dx+dy*dy<=SLOP*SLOP)return;if(Math.abs(dy)>=Math.abs(dx)){s.mode='scroll';return}s.on=true;snavSet.flick=(snavSet.flick||0)+1;s.base=Math.max(0,Math.min(s.lw,txOf(s.n)*s.dir));s.n.classList.add('snswipe');s.n.style.animation='none';s.n.style.transition='none';try{s.n.setPointerCapture(e.pointerId)}catch(_){}}
 snavAt(s);if(e.cancelable)e.preventDefault()},{passive:false});
document.addEventListener('pointerup',e=>{const s=SW;if(!s||e.pointerId!=s.id)return;SW=null;if(!s.on)return;s.x=e.clientX;s.samples.push({x:s.x,t:performance.now()});snavAt(s);snavFlick(s,s.along>=s.lw*0.35||snavVel(s)*s.dir>0.4)},true);
document.addEventListener('pointercancel',e=>{const s=SW;if(!s||e.pointerId!=s.id)return;SW=null;if(s.on)snavFlick(s,false)},true);
document.addEventListener('keydown',e=>{if(e.key!='Escape'||!SW||!SW.on)return;e.preventDefault();e.stopImmediatePropagation();const s=SW;SW=null;snavFlick(s,true)},true);
document.addEventListener('click',e=>{if(SWATE&&Date.now()-SWATE<120){e.preventDefault();e.stopImmediatePropagation();SWATE=0}},true)}

document.addEventListener('click',e=>{const b=e.target.closest('.wsimple [data-acol]');if(!b)return;const g=b.dataset.acol,sec=b.closest('section'),t=sec&&sec.querySelector(':scope>.ptiles');if((!ACK.includes(g)&&!/^iv-[a-z0-9]+$/.test(g))||!t)return;
 const col=!ACO(g);STO.ui={...(STO.ui||{})};const A={...(STO.ui.acol||{})};if(col)A[g]=true;else delete A[g];STO.ui.acol=A;t.hidden=col;sec.classList.toggle('acol',col);b.setAttribute('aria-expanded',String(!col));saveS()});
/* Account instances (Andrew 2026-11-01, B4): the same product can be held more than once (two Wealthsimple Chequing: Solo + Joint). Each held entry in wallet.cards / banks / brokerage has a unique instance key k (first instance keeps the legacy key = card id / account id / 'Broker · TYPE', so wallet.order and any key-based mapping stay valid); optional nick (shown on the tile), cards: holders (cardholder names, bottom-right), banks: own 'solo'|'joint' (default solo). */
const IKEY=(g,x)=>x&&(x.k||String(g=='brokerage'?x.i:x.id)),NEWK=(base,taken)=>{let k;do k=base+'#'+Math.random().toString(36).slice(2,7);while(taken.has(k));return k},INST=(g,k)=>(STO.wallet[g]||[]).find(x=>IKEY(g,x)==k);
const ORD=(g,a,key)=>{const o=(STO.wallet.order||{})[g]||[],ix=new Map(o.map((k,i)=>[k,i])),r=x=>{const k=String(key(x));return ix.has(k)?ix.get(k):1e6};return a.map((x,i)=>[x,i]).sort((p,q)=>r(p[0])-r(q[0])||p[1]-q[1]).map(p=>p[0])};
function loadS(){migrateLegacyLS();if(!PERSIST)return blankS();try{const o=JSON.parse(storeGet(SK));if(o){const id=x=>typeof x=='string'?x:x&&x.id,w=JSON.parse(storeGet('ptt.wallet')||'null'),m=JSON.parse(storeGet('ptt.match')||'null');
  /* a leftover pre-v2 key next to ptt.state used to be ignored, then deleted by saveS (data loss): merge it first */
  if(w&&Array.isArray(w.cards)){o.wallet=o.wallet||{};const h=new Set((o.wallet.cards||[]).map(id));o.wallet.cards=[...(o.wallet.cards||[]),...w.cards.filter(x=>!h.has(id(x)))]}
  {const th=themeGet();if(th){o.ui=o.ui&&typeof o.ui=='object'?o.ui:{};if(!o.ui.theme)o.ui.theme=th}}
  return migS(o)}}catch(e){}
 const o=blankS(),g=k=>{try{return JSON.parse(storeGet(k))}catch(e){return null}},w=g('ptt.wallet'),m=g('ptt.match'),t=g('ptt.st');
 if(w){o.wallet.cards=w.cards||[];if(w.spend)o.wallet.spend=w.spend}if(t)o.screen=t;
 if(w||m||t)o.migrated_from=OLDK.filter(k=>g(k)!=null);
 {const th=themeGet();if(th)o.ui.theme=th}
 return migS(o)}
let STO=loadS();
function saveS(){{const w=STO&&STO.wallet;if(w&&typeof bunEnsureKids=='function')bunEnsureKids();else if(w&&Array.isArray(w.services)&&typeof bunKids=='function'){const SA0=w.svcadded||{};for(let i=0;i<w.services.length;i++){const p=w.services[i];if(!SA0[p])bunKids(p).forEach(c=>{if(!w.services.includes(c.k))w.services.push(c.k)})}}/* bundles: a newly held parent (sub or card) brings its children in at $0 (bunVia) */if(w&&Array.isArray(w.services)){const SA=w.svcadded=w.svcadded&&typeof w.svcadded=='object'?w.svcadded:{};w.services.forEach(k=>{if(!SA[k])SA[k]=NOW()})}}/* B19: stamp added_at for newly held services */const keep=(arr,ids)=>{const S=new Set(ids),out=arr.filter(x=>x&&S.has(x.id)),tk=new Set(out.map(x=>x.k));ids.forEach(id=>{if(!out.some(x=>x.id==id)){const k=tk.has(id)?NEWK(id,tk):id;tk.add(k);out.push({id,k,added_at:NOW()})}});return out};
 STO.wallet.cards=keep(STO.wallet.cards,W.cards);STO.wallet.spend=W.spend;
 const{card,...r}=st;STO.screen=r;STO.updated_at=NOW();
 if(STO.ui&&(STO.ui.theme==='dark'||STO.ui.theme==='light'))themeSet(STO.ui.theme);
 if(!PERSIST)return;
 try{storeSet(SK,JSON.stringify(STO));OLDK.forEach(storeRm);for(const k of USERK)try{localStorage.removeItem(k)}catch(e){}}catch(e){PERSIST=false;noteS()}}
function noteS(){if(PERSIST||document.getElementById('pnote'))return;const d=document.createElement('div');d.id='pnote';d.textContent="This browser isn't saving. Your wallet lasts until you close this tab.";document.body.append(d)}
function resetSignedOut(){/* logout / account delete: wipe device user data and return to a clean guest view */
 const th=themeGet();wipeUserStores();if(th)themeSet(th);
 STO=blankS();if(th)STO.ui.theme=th;W.cards=[];W.spend={...STO.wallet.spend};
 try{if(typeof st!='undefined'){st.card=null;st.usec=null}}catch(e){}
 try{if(typeof SYNC!='undefined'){SYNC={keys:{},q:[],cur:0,done:0,dev:Math.random().toString(36).slice(2,10)}}}catch(e){}
}
if(!PERSIST)setTimeout(noteS);const W={cards:[...new Set(STO.wallet.cards.map(x=>x.id))],spend:{...STO.wallet.spend}};W.cards=W.cards.filter(i=>C.some(c=>c.id==i));
const WCATS=['groc','dine','deliv','gas','ev','trav','fly','hotel','portal','transit','ride','bills','util','stream','ent','drug','online','whole','memb','office','fxsp',...Object.keys(CN).filter(k=>k.startsWith('st_')),'other'];/* st_*: single-store categories (schema v32), named for the store */
const WPAR={fly:'trav',hotel:'trav',portal:'trav',deliv:'dine',ride:'transit',util:'bills',ev:'gas'};
const wRate=(c,k)=>c['r_'+k]!=null?c['r_'+k]:WPAR[k]&&c['r_'+WPAR[k]]!=null?c['r_'+WPAR[k]]:c.other;
const SGRP=[['Food',['groc','dine','deliv']],['Getting around',['gas','transit','ride','ev']],['Travel',['fly','hotel','trav','portal','fxsp']],['Home and bills',['bills','util','stream','memb']],['Everything else',['drug','online','ent','whole','office','other']]];
function spendHTML(){const seen=new Set(),g=SGRP.map(([n,ks])=>[n,ks.filter(k=>WCATS.includes(k))]);g.forEach(x=>x[1].forEach(k=>seen.add(k)));const left=WCATS.filter(k=>!seen.has(k));if(left.length)g[g.length-1][1].push(...left);
 return `<div class=sgrps>${g.map(([n,ks])=>{const sub=ks.reduce((t,k)=>t+(+W.spend[k]||0),0);return `<fieldset class=sgrp><legend>${n}<span class=ssub>${sub?'$'+sub.toLocaleString()+'/mo':''}</span></legend>${ks.map(k=>`<label><span>${WNAME[k]||CN[k]}</span><input class=amt type=number min=0 step=10 inputmode=numeric data-sp="${k}" value="${W.spend[k]||''}" placeholder="0" aria-label="${esc(WNAME[k]||CN[k])} monthly spend"></label>`).join('')}</fieldset>`}).join('')}</div>`}
/* v3.5.4 Credit Cards spend (Spending › #pw-spend) is one store with one editor. Other views show this read-only summary and link to it. */
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
  if(/\bRESP\b/.test(tx)&&!/\b(TFSA|RRSP|FHSA|RRIF|LIRA|Cash|Margin)\b/.test(tx)&&!(P.kidsN>0)&&!(P.kids||[]).length)why.push('RESP offer: no kids in your profile');
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
/* Promotions, five sections (Andrew 2026-11-04): Active (what he enrolled in), Prospective (today's live-offer table, filtered to active offers he has
   not answered), Declined (what he passed on, reversible), Expired (a declined offer past its expiry, last 12 months only), Complete (an enrolled offer
   whose payout arrived or whose window closed). One enrolled record per offer in wallet.promo, keyed by the promo key p.k and synced as wallet.promo:
   {st:'enrolled'|'declined'|'complete', e:enrolled on, v:the value he moved, done:payout received on}. Nothing here is guessed: an earn is the record's
   value, or for a % match the amount he entered times the record's own match_pct (capped by the record's own cap); a term the record does not carry
   reads 'not stated on the record'. Only offers whose offer_status is active count in any total (PACT), as before. */
const PREG=()=>((STO.wallet.promo=STO.wallet.promo||{})),pReg=k=>PREG()[k]||null,
 pToday=()=>NOW().slice(0,10),
 pYrAgo=()=>{const d=new Date();d.setFullYear(d.getFullYear()-1);return d.toISOString().slice(0,10)},/* Expired looks back 12 months, no further */
 pEarn=(p,v)=>{if(p.benefit_type=='pct_match'&&p.match_pct!=null){if(v==null)return null;if(p.match_min_cad!=null&&v<p.match_min_cad)return 0;const e=v*p.match_pct/100;return p.match_cap_cad?Math.min(e,p.match_cap_cad):e}return p.v!=null?p.v:null},
 pEarnHow=(p,v)=>{if(p.benefit_type=='pct_match'&&p.match_pct!=null){if(v==null)return p.match_pct+'% of the amount you move'+(p.match_cap_cad?' up to $'+p.match_cap_cad.toLocaleString():'');return p.match_pct+'% × $'+Math.round(v).toLocaleString()+(p.match_cap_cad?' capped at $'+p.match_cap_cad.toLocaleString():'')+(p.match_min_cad!=null&&v<p.match_min_cad?' — under the record’s $'+p.match_min_cad.toLocaleString()+' minimum, so it pays nothing':'')}
  return p.v!=null?'the offer value on record'+(p.vm?' ('+p.vm+')':''):''},
 /* finished = the payout arrived (his own record) or the record no longer shows the offer live; the reason is quoted, never assumed */
 pFin=(p,r)=>{if(!r)return null;if(r.st=='complete')return r.done?'Payout received '+fmtD(r.done):'Payout received';if(!PACT(p))return p.offer_status=='ended'?'Window closed: the record marks the offer ended':'Window closed: the record no longer lists the offer as active'+(p.offer_status?' ('+p.offer_status+')':'');if(p.expiry_date&&p.expiry_date<pToday())return 'Window closed '+fmtD(p.expiry_date);return null},
 /* the accounts this offer involves, from what he holds: the product itself, or any account at that institution */
 pAccts=p=>{const L=[],I=String(p.inst||'').toLowerCase();
  if(p.pid)W.cards.map(i=>C[BYID0[i]]).filter(c=>c&&c.id==p.pid).forEach(c=>L.push(c.n||c.i));
  if(p.bid)(STO.wallet.banks||[]).filter(x=>x.id==p.bid).forEach(x=>L.push(((D.bank?.accounts||[]).find(a=>a.id==x.id)||{}).i||p.inst));
  if(p.line=='broker')(STO.wallet.brokerage||[]).filter(x=>x&&String(x.i).toLowerCase().startsWith(I)).forEach(x=>L.push(x.i));
  if(p.line=='tel')(STO.wallet.tel||[]).filter(x=>x&&String(x.i).toLowerCase().startsWith(I)).forEach(x=>L.push(x.i));
  if(p.line=='bank'&&!L.length)(STO.wallet.banks||[]).forEach(x=>{const a=(D.bank?.accounts||[]).find(q=>q.id==x.id);if(a&&a.i==p.inst)L.push(a.i)});
  return [...new Set(L)]},
 $$P=n=>'$'+Math.round(n).toLocaleString(),PD='<span class=mute>—</span>',
 /* one section: the shared Accounts header (h3.ach, chevron, collapse state in ui.acol) and a body the header controls. The body carries .ptiles
    because that is what the one collapse handler looks for; .pbody turns the tile grid off again for a table or a list (styles.css). */
 PSEC=(g,id,title,n,body,kind)=>`<section class="psec acs${ACO(g)?' acol':''}" id=${id}>${ACH(g,id,title,n,1)}<div class="${kind=='tiles'?'tiles ptiles':'ptiles pbody'}" id=${id}-t${ACO(g)?' hidden':''}>${body}</div></section>`,
 /* Andrew 2026-11-05: Promotions sections match Accounts — drag grip on every header, tiles with ✕ for Active/Declined/Expired/Complete, Prospective in the shared .wrap table shell. */
 pActs=k=>{const r=pReg(k);if(!r)return `<button type=button class="btn pab" data-penroll="${esc(k)}">Enrol</button><button type=button class="btn pab" data-pdecline="${esc(k)}">Decline</button>`;
  return r.st=='declined'?`<button type=button class="btn pab" data-pundo="${esc(k)}">Put back in Prospective</button>`:r.st=='complete'?`<button type=button class="btn pab" data-punroll="${esc(k)}">Remove from Complete</button>`:`<button type=button class="btn pab" data-pdone="${esc(k)}">Payout received</button><button type=button class="btn pab" data-punroll="${esc(k)}">Cancel enrolment</button>`},
 pEarnHTML=(p,v)=>pEarn(p,v)!=null?`<b>${$$P(pEarn(p,v))}</b> <span class=t>${p.source_tag||'CITED'}</span>`:PD,
 pRm=(k,n)=>`${RMX(`data-prm="${esc(k)}"`,n)}`,
 /* the Active tile's panel: the accounts involved, the value he moved, the earn from the stored terms, payout timing and the rollover or withdrawal */
 pPanel=p=>{const r=pReg(p.k)||{},v=r.v,earn=pEarn(p,v),A=pAccts(p),min=pMinK(p),how=pEarnHow(p,v);
  return `<div class="penrp pfull"><div class=penrh><b>${esc(p.inst)} · ${esc(p.prod)}</b> <span class="ptag g-${p.source_tag||'CITED'}">${p.source_tag||'CITED'}</span><button type=button class="btn pactc" data-pactc aria-label="Close the ${esc(p.inst)} offer">✕</button></div>
  <dl class=pdl><dt>Account</dt><dd>${A.length?A.map(n=>esc(n)).join(', ')+' — <button type=button class=lnk data-s=wallet>open in Accounts</button>':'No held account is linked to this offer yet. <button type=button class=lnk data-s=wallet>Open Accounts</button>'}</dd>
  <dt>Amount you moved</dt><dd><input class=amt type=number min=0 step=100 inputmode=numeric data-pval="${esc(p.k)}" value="${v??''}" placeholder="0" aria-label="Approximate transfer value or deposit">${min!=null?` <small class=mute>The record’s minimum: ${esc(p.min_deposit_or_spend||'$'+min.toLocaleString())}</small>`:''}</dd>
  <dt>You earn</dt><dd><span class=pearn data-pe="${esc(p.k)}">${pEarnHTML(p,v)}</span>${how?` <small class=mute>${esc(how)}</small>`:''}</dd>
  <dt>Payout timing</dt><dd>${p.match_period?esc(p.match_period):'<span class=mute>not stated on the record</span>'}</dd>
  <dt>Rollover / withdrawal</dt><dd>${p.holding_terms_short?esc(p.holding_terms_short):'<span class=mute>not stated on the record</span>'}${p.holding_days!=null&&p.holding_terms_short?` <small class=mute>(${p.holding_days} days)</small>`:''}</dd>
  <dt>Conditions</dt><dd>${p.cond?esc(p.cond):'<span class=mute>not stated on the record</span>'}</dd>
  <dt>Status</dt><dd>${esc(pFin(p,r)||'Active: '+(p.expiry_date?'the offer ends '+fmtD(p.expiry_date):'no end date on record'))} · enrolled ${r.e?fmtD(r.e):'date not recorded'}</dd></dl>
  <div class=pacts>${pActs(p.k)}</div></div>`};
function promosHTML(line){const cs=custSet(),REG=PREG(),rows=(line?PROMO.filter(p=>p.line==line):PROMO).map(p=>({p,e:promoElig(p,cs)})),tod=pToday(),yr=pYrAgo(),
 en=rows.filter(x=>{const r=REG[x.p.k];return r&&r.st=='enrolled'&&!pFin(x.p,r)}),
 dec=rows.filter(x=>REG[x.p.k]?.st=='declined'&&!(x.p.expiry_date&&x.p.expiry_date<tod)),
 exp=rows.filter(x=>REG[x.p.k]?.st=='declined'&&x.p.expiry_date&&x.p.expiry_date<tod&&x.p.expiry_date>=yr).sort((a,b)=>b.p.expiry_date.localeCompare(a.p.expiry_date)),
 cmp=rows.filter(x=>{const r=REG[x.p.k];return r&&(r.st=='complete'||(r.st=='enrolled'&&pFin(x.p,r)))}),
 ok=rows.filter(x=>x.e.ok&&PACT(x.p)&&!REG[x.p.k]),bestOf=b=>{const L={};ok.forEach(x=>{if(x.p.v==null||x.p.b!=b)return;const l=x.p.line;if(!L[l]||x.p.v>L[l].p.v)L[l]=x});return Object.values(L)},bfy=bestOf('fy'),bon=bestOf('on'),sm=a=>a.reduce((t,x)=>t+x.p.v,0),fy=sm(ok.filter(x=>x.p.v!=null&&x.p.b=='fy')),on=sm(ok.filter(x=>x.p.v!=null&&x.p.b=='on')),hid=rows.filter(x=>PACT(x.p)&&!x.e.ok&&!REG[x.p.k]).length,nInact=rows.filter(x=>!PACT(x.p)&&!REG[x.p.k]).length,ty=st.pty||'all';
 const so=st.psort||{k:'v',d:-1},elig=st.pelig!==false;
 /* Prospective: live offers he has not answered, in the shared product-table shell (.wrap / --hd / .nm), same columns and actions as before. */
 let R=rows.filter(x=>!REG[x.p.k]&&(st.pend||PACT(x.p))&&(!elig||x.e.ok)&&(ty=='all'||x.p.benefit_type==ty));
 const rk=(x,K)=>K!=null?0:so.k=='v'&&!/mute/.test(pVal(x.p).h)?1:2;/* v3.5.10: numbers, then text-only values (e.g. 'Fee waived'), then dashes; both directions */
 R.sort((a,b)=>{const A=pSortVal(a,so.k),B=pSortVal(b,so.k),ra=rk(a,A),rb=rk(b,B);if(ra!=rb)return ra-rb;if(A==null||B==null)return 0;return (A<B?-1:A>B?1:0)*so.d});
 const det=(p,e)=>{const it=[['Offer',p.t],['Conditions',p.cond],['Minimum',p.min_deposit_or_spend],['Who',PSC[p.sc]],['Cooldown',p.cd?`${p.cd} months`:null],['Value basis',p.vm],['Checked',p.verified_date?`${PACT(p)?'Active':p.offer_status=='ended'?'Ended':'Unverified'} on ${fmtD(p.verified_date)}`:null],['Evidence',p.status_note],['Ruled out',e.ok?null:e.why.join('; ')]].filter(x=>x[1]);
  return `<dl class=pdl>${it.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class=pacts>${pActs(p.k)}</div>`};
 const row=({p,e})=>{const op=st.popen==p.k,tag=p.source_tag||'CITED',V=pVal(p),wd=p.window_days??pDays(p.win),hd=p.holding_days??pDays(p.holding_terms_short),mk=pMinK(p),au=pAum(p),
   tw=p.win&&!/^\d+ days$/.test(p.win)?esc(p.win.replace(/(\d{4}-\d{2}-\d{2})/,m=>fmtD(m))):'',th2=p.holding_terms_short&&!/^\d+ days$/.test(p.holding_terms_short)?esc(p.holding_terms_short.replace(/(\d{4}-\d{2}-\d{2})/,m=>fmtD(m))):'',
   mw=(p.min_deposit_or_spend||'').match(/spend|deposit/i)?.[0]?.toLowerCase()||'',
   termTip=[p.archived_date?'Archived '+esc(fmtD(p.archived_date)):'',p.link_status=='ok'&&p.terms_url?`<a href="${esc(p.terms_url.split(' (')[0])}" target=_blank rel=noopener>Live page ↗</a>`:'',p.verified_date?`${PACT(p)?'Active':p.offer_status=='ended'?'Ended':'Unverified'} on ${esc(fmtD(p.verified_date))}`:'',p.status_note?esc(p.status_note):''].filter(Boolean).join('<br>');
  return `<tr class="prow${e.ok?'':' pdq'}${PACT(p)?'':' pinact'}${pHi(p)?' phi':''}${op?' open':''}" data-pk="${p.k}" tabindex=0 aria-expanded=${op}><td class="l nm"><span class=pcar aria-hidden=true>${op?'▾':'▸'}</span><b>${esc(p.inst)}</b><small>${esc(p.prod)}${(p.pid&&W.cards.some(i=>C[BYID0[i]]?.id==p.pid))||(p.bid&&(STO.wallet.banks||[]).some(x=>x.id==p.bid))?' <i class=phld><span class=y>✓</span> in wallet</i>':''}</small></td><td>${PCAT[p.line]}</td><td class=pv><b>${V.h}</b>${ip(V.tip)}</td><td><span class="pty t-${p.benefit_type}">${PBT[p.benefit_type]||'Other'}</span></td><td>${p.match_pct!=null?`<b>${p.match_pct}%</b>`:PD}</td><td class=paum>${au!=null?`<b>${$$P(au)}</b>${ip(esc(p.match_period||''))}`:PD}</td><td>${wd!=null?wd:p.win?'':PD}${wd==null&&p.win?esc(p.win):''}${ip(tw)}</td><td>${p.expiry_date?esc(fmtD(p.expiry_date)):p.dl=='ONGOING'?'Ongoing':PD}</td><td>${hd!=null?hd:PD}${ip(th2)}</td><td>${mk!=null?$$P(mk)+(mw?` <small class=ilw>${mw}</small>`:''):PD}</td><td class=pterm>${p.terms_pdf?`<button type=button class=ptbtn data-pdf="${esc(p.terms_pdf)}" data-pdft="${esc(p.inst+' · '+p.prod)}" data-pdfd="${esc(p.archived_date)}">Terms</button>`:PD}${ip(termTip,'Terms details')}${PACT(p)?'':`<small class=pst>${p.offer_status=='ended'?'Ended':'Unverified'}</small>`}<small class="ptag g-${tag}">${tag}</small></td></tr>${op?`<tr class=pdet><td colspan=${PCOLS.length}>${det(p,e)}</td></tr>`:''}`};
 const th=([k,n,c])=>`<th class="${k=='n'?'nm ':''}${c||''} ps${so.k==k?' on':''}" data-psort=${k} aria-sort=${so.k==k?(so.d>0?'ascending':'descending'):'none'}><button type=button>${n}<span class=sar aria-hidden=true>${so.k==k?(so.d>0?'▲':'▼'):'↕'}</span></button></th>`;
 const picks=bfy.concat(bon).map(x=>`<li><span>${PCAT[x.p.line]}</span>${esc(x.p.inst)}<b>${$$P(x.p.v)}${x.p.b=='on'?'/yr':''}</b></li>`).join('');
 const table=()=>`<label class=pelig><input type=checkbox data-pelig ${elig?'checked':''}> Only show offers I’m eligible for</label>
 <div class="hero phero"><div class=ptot><small>Best move per category</small><b>${$$P(sm(bfy))} <em>first year</em></b><b>${$$P(sm(bon))}/yr <em>ongoing</em></b>${picks?`<details class=ppk><summary>Picks</summary><ul>${picks}</ul></details>`:''}</div><div class=ptot><small>Everything you're eligible for</small><b>${$$P(fy)} <em>first year</em></b><b>${$$P(on)}/yr <em>ongoing</em></b></div><div><small>Eligible</small><b>${ok.length}</b></div><div><small>Ruled out</small><b>${hid}</b></div></div>
 <div class=pbar><span class=plab>Type</span>${PTY.map(k=>`<button type=button class="pchip2${ty==k?' on':''}" data-pty=${k} aria-pressed=${ty==k}>${k=='all'?'All':PBT[k]}<span>${rows.filter(x=>(k=='all'||x.p.benefit_type==k)&&(!elig||x.e.ok)&&(st.pend||PACT(x.p))&&!REG[x.p.k]).length}</span></button>`).join('')}<button type=button class="pchip2${so.k=='mp'?' on':''}" data-psort=mp>Sort by match %</button><label class=pend><input type=checkbox data-pend ${st.pend?'checked':''}> Show ended/unverified (${nInact})</label></div>
 <div class="wrap"><table class="vt ptab2"><thead><tr>${PCOLS.map(th).join('')}</tr></thead><tbody>${R.map(row).join('')||`<tr><td colspan=${PCOLS.length} class=mute>No live offer you have not already answered</td></tr>`}</tbody></table></div>`;
 /* Active: Accounts-style tiles with ✕; the tile opens its panel; ✕ removes the enrolment (back to Prospective) after the shared confirm. */
 const aEarned=en.reduce((t,x)=>t+(PACT(x.p)&&pEarn(x.p,REG[x.p.k].v)!=null?pEarn(x.p,REG[x.p.k].v):0),0),
  aGap=en.filter(x=>PACT(x.p)&&pEarn(x.p,REG[x.p.k].v)==null).length,
  act=en.length?`<div class="tiles ptiles">${en.map(({p})=>{const r=REG[p.k],earn=pEarn(p,r.v),op=st.pact==p.k;return btile({k:p.inst,name:p.prod,on:op,foot:earn!=null?`<b>${$$P(earn)}</b>`:'<span class=mute>value —</span>',attrs:`data-pact="${esc(p.k)}" role=button tabindex=0 aria-expanded=${op} title="${esc(p.inst)}" aria-label="${esc(p.inst+' · '+p.prod)}, enrolled"`,mark:''}).replace(/<\/div>$/,pRm(p.k,p.prod)+'</div>')}).join('')}</div>${st.pact&&en.some(x=>x.p.k==st.pact)?pPanel(en.find(x=>x.p.k==st.pact).p):''}<p class="mute pfull" id=pactsum>Expected from these campaigns: <b>${$$P(aEarned)}</b>${aGap?` · ${aGap} with no value entered yet`:''}. Only offers still active in the record count.</p>`
  :'<p class="mute pfull">No campaigns yet. Enrol in an offer under Prospective and it moves here, with what you moved, what the stored terms pay and how long the money has to stay.</p>';
 /* Declined / Expired / Complete: same tile + ✕ pattern as Accounts; ✕ clears the wallet.promo record (offer returns to Prospective). Nested .tiles.ptiles inside .pbody so notes stay full-width. */
 const pTiles=(L,mode)=>L.length?`<div class="tiles ptiles">${L.map(({p})=>{const r=REG[p.k],fin=pFin(p,r),earn=pEarn(p,r.v),
   foot=mode=='exp'?`Expired ${esc(fmtD(p.expiry_date))}`:mode=='cmp'?`${esc(fin||'Finished')}${earn!=null?' · '+$$P(earn):''}`:`Declined ${r.e?esc(fmtD(r.e)):'—'}`,
   mark=p.v!=null?$$P(p.v):(p.source_tag||'CITED');
   return btile({k:p.inst,name:p.prod,foot,mark,attrs:`data-pli="${esc(p.k)}" title="${esc(p.inst)}" aria-label="${esc(p.inst+' · '+p.prod)}"`}).replace(/<\/div>$/,pRm(p.k,p.prod)+'</div>')}).join('')}</div>`
  :`<p class=mute>${mode=='exp'?'No declined offer has expired in the last 12 months.':'Nothing here yet.'}</p>`;
 return SECORD([
  PSEC('pactive','pw-pact','Active',en.length,act,'list'),
  PSEC('ppros','pw-ppros','Prospective',R.length,table(),'list'),
  PSEC('pdecl','pw-pdecl','Declined',dec.length,pTiles(dec,'dec'),'list'),
  PSEC('pexp','pw-pexp','Expired',exp.length,pTiles(exp,'exp')+(exp.length?'<p class="mute pfull">Declined offers that have expired, last 12 months only, newest expiry first.</p>':''),'list'),
  PSEC('pcomp','pw-pcomp','Complete',cmp.length,pTiles(cmp,'cmp'),'list')
 ],'promoSectionOrder')}
/* PerYourTerms › Promotions (Andrew 2026-11-05): Accounts patterns — draggable sections (wallet.promoSectionOrder), Active/Declined/Expired/Complete as tiles with ✕, Prospective in the shared .wrap table. Per-line views (cards prom, tprom) share the same treatment. */
function promosPage(line){return `<div class="prof pstack wsimple" id=pw-promos><div class=vhead><h2>Promotions</h2></div><p class=lead>Offers from the record, in the order you deal with them: the ones you enrolled in, the ones still open to you, the ones you passed on, the ones that ran out, and the ones you finished. What you enter stays on this device and follows your account.</p>${promosHTML(line||null)}</div>`}
function renderPromos(line){$('#view').innerHTML=promosPage(line)}
/* PerYourTerms › Promotions (Andrew 2026-11-05): one inventory table of every broker promotion on record, current and past, with its terms
   (D.bpromo from Website/promos.py inventory(): broker-promos.csv, crypto platforms excluded, tier rows folded). Built on the shared broker
   table (skel + brTable + brRow + brTxt, as Brokers › Fees/Accounts/Features). REPORTED rows are listed and tagged; nothing is guessed: a
   term the record does not carry is a dash. Default order: Active first, then end date newest first; the Status chips filter. */
const BPS=[['active','Active'],['ended','Ended'],['all','All']],BPT={'transfer %':'Transfer %','cash':'Cash','free trades':'Free trades','free trades + cash':'Free trades + cash','referral':'Referral','match':'Match','rate boost':'Rate boost'};
function bpromosPage(){const A=D.bpromo||[],f=st.bps||'all',L=A.filter(p=>f=='all'||p.st==f).sort((a,b)=>(a.st!=b.st?(a.st=='active'?-1:1):0)||(b.end||'').localeCompare(a.end||'')||a.broker.localeCompare(b.broker)),
 d=x=>x&&/^\d{4}-\d\d-\d\d/.test(x)?esc(x.replace(/(\d{4}-\d\d-\d\d)/g,m=>fmtD(m))):x?esc(x):'',T=x=>x?brTxt(x.replace(/(\d{4}-\d\d-\d\d)/g,m=>fmtD(m))):BRDASH,
 win=p=>p.start||p.end?`${p.start?d(p.start):'…'} – ${p.end?d(p.end):'no end date on record'}`:BRDASH,
 stat=p=>p.st=='active'?`<b>Active</b>${p.end?`<br><small class=mute>ends ${d(p.end)}</small>`:''}`:`<b>Ended</b><br><small class=mute>${p.end?d(p.end):'date not on record'}</small>`,
 rows=L.map(p=>brRow(p.broker,[T(p.name),p.code?`<code>${esc(p.code)}</code>`:BRDASH,esc(BPT[p.type]||p.type),T(p.bonus),T(p.cap),T(p.min),T(p.accts),T(p.who),win(p),T(p.fund),T(p.hold),T(p.pay),stat(p),
  p.u?`<a href="${esc(p.u)}" target=_blank rel=noopener>source</a>`:BRDASH,`<span class="t ptag g-${p.tag}">${p.tag}</span>`]).replace('<tr',`<tr data-bpid="${esc(p.id)}" data-bpst=${p.st}`)),
 n=k=>A.filter(p=>k=='all'||p.st==k).length,chips=`<div class=pbar role=group aria-label="Status"><span class=plab>Status</span>${BPS.map(([k,l])=>`<button type=button class="pchip2${f==k?' on':''}" data-bps=${k} aria-pressed=${f==k}>${l}<span>${n(k)}</span></button>`).join('')}</div>`;
 return `<div class="prof pstack wsimple" id=pw-bpromos>${upPromptHTML('promo')}${skel('Promotions','Every broker promotion on record, current and past, with the terms as recorded in Database/datasets/broker-promos.csv. CITED = read on the broker’s own page or terms; REPORTED = forum, press or aggregator only, or an official page with conflicting terms. Historical rows come from the archived excerpts in Sources/broker-promo-history. A dash means the record does not state it. Active = the record has no past end date and the offer is not marked ended.',
  [['Promotions',A.length],['Active',n('active')],['Ended',n('ended')],['REPORTED',A.filter(p=>p.tag=='REPORTED').length]],
  chips+`<div class=bptab>${brTable('bpromo',['Broker','Promotion','Code','Type','Bonus','Cap','Min transfer / deposit','Eligible accounts','Eligibility notes','Register / enrol','Funding deadline','Holding period','Payout timing','Status','Source','Evidence'],rows)}</div>`,'')}</div>`}
const SPEND_LABEL='Spending';/* Andrew 2026-11-05: Credit Cards (was Monthly Credit Spend); same label as USEC / Spending › #pw-spend */
function spendSum(){const seen=new Set(),g=SGRP.map(([n,ks])=>[n,ks.filter(k=>WCATS.includes(k))]);g.forEach(x=>x[1].forEach(k=>seen.add(k)));const left=WCATS.filter(k=>!seen.has(k));if(left.length)g[g.length-1][1].push(...left);
 const tot=WCATS.reduce((t,k)=>t+(+W.spend[k]||0),0);
 return `<div class=ssum>${g.map(([n,ks])=>{const sub=ks.reduce((t,k)=>t+(+W.spend[k]||0),0);return `<div><span>${n}</span><b>$${sub.toLocaleString()}</b></div>`}).join('')}<div class=stot><span>Total</span><b>$${tot.toLocaleString()}/mo</b></div></div><button type=button class="btn sedit" data-pgo=spend>Edit ${SPEND_LABEL} →</button>`}
const WNAME={fxsp:'Foreign currency spend',trav:'Travel (other)'};
/* v3.4.1 broker tier: card fee after tier-linked waivers (edges WAIVES from a STATUS node; only CONFIRMED CAD/yr edges are exported) */
const BTIER=i=>((STO.wallet.brokerage||[]).find(x=>x&&x.i==i)||{}).tier||null;
const TWV=c=>(D.tierw||[]).find(w=>w.card==c.id&&w.tiers.includes(BTIER(w.inst)));
/* v3.7.3 rules table (Docs/rules-schema.md, D.cmod): one evaluator, no card-specific code. addl = additional cardholders per held card (Profile, captured at add time) */
/* B5 (Andrew 2026-11-01): card tile bottom-right = the cardholder count from card settings (1 primary + additional); card nicknames / cardholder names are retired (old values ignored, dropped on the next save) */
const HOLDN=id=>{const n=1+ADDL(id);return n<=1?'Solo':n==2?'Joint':'Multi'};
const ADDL=id=>{const n=+((STO.wallet.addl||{})[id]||0);return W.cards.includes(id)?n:0};
const RULEOP={'>=':(a,b)=>a>=b,'>':(a,b)=>a>b,'<=':(a,b)=>a<=b,'<':(a,b)=>a<b,'==':(a,b)=>a==b,'!=':(a,b)=>a!=b,in:(a,b)=>Array.isArray(b)&&b.includes(a),has:(a,b)=>Array.isArray(a)&&a.includes(b)};
const ruleOn=(r,cx)=>(r.when||[]).every(w=>cx[w.f]!=null&&RULEOP[w.op]&&RULEOP[w.op](cx[w.f],w.v));
const cmods=(c,n=ADDL(c.id))=>{const cx={...PRF(),addl_cardholders:n,owner:ownOf('cards',c.id),tier:typeof provTier=='function'?provTier(c.i):null};return (D.cmod||[]).filter(r=>r.card==c.id&&ruleOn(r,cx))};
const earnMul=(c,k,n)=>cmods(c,n).filter(r=>r.effect=='earn_multiplier'&&(r.scope=='all'||(r.scope||[]).includes(k))).reduce((m,r)=>m*r.value,1);
const effFee0=c=>c.fee==null?null:TWV(c)?Math.max(0,c.fee-TWV(c).amt):c.fee;
/* annual cost = fee (after waivers) + additional cardholders × the card's additional-card fee + fee_add rules */
/* Card settings (Accounts popup): FEECOV[id] = who covers the annual fee (employer|bank|fy|other); a covered fee is not a cost (ESTIMATE), additional-card fees still are */
const FEECOV=id=>W.cards.includes(id)?((STO.wallet.feecov||{})[id]||null):null;
/* Andrew 2026-11-06 form audit: when a held bank package rebates this card's fee (perk graph wv / feereb), derive coverage — don't ask. */
const feeCoverDerived=id=>{const held=(W.cards||[]).includes(id)||(STO.wallet.cards||[]).some(x=>x&&x.id==id);if(!held)return null;
  try{if(typeof PTTOptimize!='undefined'&&PTTOptimize.walletBankRebates){const w=PTTOptimize.walletBankRebates();if((w.rebates||[]).some(r=>r.card_id==id&&r.rebate_cad!=null)){const r=(w.rebates||[]).find(x=>x.card_id==id);return{how:'bank',label:r.label||'Bank package',tag:r.tag||'CITED',save:r.rebate_cad}}}
    const pkgs=typeof PTTOptimize!='undefined'&&PTTOptimize.packagesHeld?PTTOptimize.packagesHeld():[];
    for(const row of(D.feereb||[])){if(row.card_id!=id||row.rebate_cad==null)continue;if(pkgs.some(p=>p.key==row.package_key))return{how:'bank',label:row.package_label||row.package_key,tag:row.evidence_tag||'CITED',save:+row.rebate_cad}}
  }catch(e){}
  return null};window.feeCoverDerived=feeCoverDerived;
const FCL={employer:'Employer',bank:'Bank package rebate',fy:'First year waived',other:'Other'};
const effFee=c=>{const f0=effFee0(c);if(f0==null)return null;const f=FEECOV(c.id)?0:f0;const n=ADDL(c.id);/* negative fee_add (tier waivers) can't take the card fee below $0, and doesn't stack with a waiver already counted in TWV */
 const adj=cmods(c,n).filter(r=>r.effect=='fee_add').reduce((t,r)=>t+r.value,0);return Math.max(0,f+Math.min(0,adj)*(f>0?1:0))+Math.max(0,adj)+(n?(cmods(c,n).some(r=>r.effect=='addl_fee_first_only')?1:n)*(c.add||0):0)};
/* first-year additional-cardholder value from rules: AU bonus points (in their date window) at the card's cpp + first-year AU fee rebates. The ongoing AU fee is already in effFee. */
const fyAU=c=>{const n=ADDL(c.id);if(!n)return 0;const today=new Date().toISOString().slice(0,10),M=cmods(c,n);let v=0;
 M.filter(r=>r.effect=='welcome_bonus_extra'&&(!r.valid_from||today>=r.valid_from)&&(!r.valid_to||today<=r.valid_to)).forEach(r=>v+=(r.points||0)*(c.cpp||0)/100);
 M.filter(r=>r.effect=='addl_fee_rebate_y1').forEach(r=>{const paid=M.some(x=>x.effect=='addl_fee_first_only')?1:n;v+=Math.min(paid,r.count||1)*(c.add||0)});return v};
const boostNote=c=>cmods(c).filter(r=>r.effect=='earn_multiplier').map(r=>`Boosted: +${Math.round((r.value-1)*100)}% with an additional cardholder (${r.tag=='CITED'?'cited':'estimate'})`).join('; ');
/* pytRew: optimized rewards/yr for a set of cards. Each category's annual spend is routed to the best rate first,
   respecting per-category caps (overflow falls to the next best rate, including each card's base "other" rate). */
/* Merchant tiles (PUSH 6, Andrew 2026-10-29): only stores where a card's reward is specific to that store (D.meta.catn st_* = earn_tiers.merchant rows).
   Excluded: Neo partners and BMO Blue Rewards partners (partner networks, not one store); Home Depot (its consumer card earns no rewards).
   [spend key, name, logo, parent]: parent is the general category the store's spend is taken out of; where the store codes as that category
   (grocery banners, gas stations, Rogers bills, pharmacy) a card without a store rate earns its parent rate there, otherwise its base rate. */
const MERCH=[['st_amazon_ca_and_whole_foods_market','Amazon.ca & Whole Foods','m-amazon','other',0],['st_walmart','Walmart','m-walmart','other',0],['st_canadian_tire_family_stores','Canadian Tire','m-canadiantire','other',0],['st_gas_petro_canada','Petro-Canada / Gas+','m-petrocanada','gas',1],['st_costco_ca','Costco.ca','costco','other',0],['st_costco_in_store','Costco In-Store','costco','other',0],['st_costco_gas_stations','Costco gas','costco','gas',1],['st_loblaw_banner_grocery_stores','Loblaw grocery stores','m-loblaws','groc',1],['st_shoppers_drug_mart_pharmaprix','Shoppers Drug Mart','m-shoppers','other',0],['st_esso_mobil','Esso / Mobil','m-esso','gas',1],['st_joe_fresh','Joe Fresh','m-joefresh','other',0],['st_sobeys_family_empire_banners','Sobeys, Safeway, IGA, FreshCo','m-sobeys','groc',1],['st_home_hardware','Home Hardware','m-homehardware','other',0],['st_rogers','Rogers','m-rogers','bills',1]].filter(m=>CN[m[0]]||m[0]=='st_costco_in_store');
/* B4 Costco In-Store (Andrew 2026-11-01; rates 2026-11-02): its own store tile, distinct from Costco.ca and Costco gas. Rates are STORE rows (merchant 'Costco In-Store', quirk COSTCO-WAREHOUSE): Costco Canada warehouses take Mastercard only, so Visa / Amex rows are 0 (CITED) and NOACC stops the base-rate fallback for them; Mastercards carry the issuer's stated Costco rate (CITED / REPORTED) or, with no row, earn their base rate (ESTIMATE). The spend is taken out of Everything else (spNet). The Costco Executive 2% Reward (subscription tier costco-executive, CITED) is a membership reward, not a card rate; it is noted, not counted. */
const NOACC=(c,k)=>k.startsWith('st_')&&c['r_'+k]===0;
if(!WCATS.includes('st_costco_in_store'))WCATS.splice(WCATS.indexOf('other'),0,'st_costco_in_store');
const COSTCO_EXEC={store:'st_costco_in_store',sub:'costco',tier:'costco-executive'},costcoNote=()=>{const t=(subTiers(COSTCO_EXEC.sub)||[]).find(x=>x.k==COSTCO_EXEC.tier);const base=`Costco warehouses take Mastercard only: Visa and Amex cards earn 0 here (CITED). Mastercards earn the issuer's stated Costco rate where one is on record, otherwise their base rate (ESTIMATE).`;return t?`${base} Executive Membership adds Costco's own reward (${t.note||'2% Reward'}, ${t.tag||'CITED'}); not counted here.`:base};
MERCH.forEach(m=>{if(m[4])WPAR[m[0]]=m[3]});
/* Stores split (Andrew 2026-10-30: "any dual or multiple listed stores in one tile should be split with their own logo"): one tile per store. A shared rate key keeps the card data (CN/CC, earn tiers); each store's spend is kept in STO.wallet.mspend['<key>~<store>'] and W.spend[<key>] is their sum, so every calculation is unchanged. Old saved combined spend moves to the first store once. Gas+ has no openly licensed logo, so it shows initials. */
const MSPL={st_amazon_ca_and_whole_foods_market:[['amazon','Amazon.ca','m-amazon'],['wholefoods','Whole Foods','m-wholefoods']],st_gas_petro_canada:[['petrocanada','Petro-Canada','m-petrocanada'],['gasplus','Gas+','m-gasplus']],st_esso_mobil:[['esso','Esso','m-esso'],['mobil','Mobil','m-mobil']],st_sobeys_family_empire_banners:[['sobeys','Sobeys','m-sobeys'],['safeway','Safeway','m-safeway'],['iga','IGA','m-iga'],['freshco','FreshCo','m-freshco']]};
const MTILES=()=>MERCH.flatMap(([k,n,lg,p])=>MSPL[k]?MSPL[k].map(([s,sn,sl])=>({k,id:k+'~'+s,n:sn,lg:sl,p,share:MSPL[k].filter(x=>x[0]!=s).map(x=>x[1]).join(', ')})):[{k,id:k,n,lg,p}]);
function mspMigrate(){STO.wallet.mspend=STO.wallet.mspend||{};for(const k in MSPL){const ids=MSPL[k].map(x=>k+'~'+x[0]);if(+W.spend[k]>0&&!ids.some(i=>+STO.wallet.mspend[i]>0))STO.wallet.mspend[ids[0]]=+W.spend[k]}}
const mspGet=id=>id.includes('~')?(STO.wallet.mspend||{})[id]:W.spend[id];
function mspSet(id,v){if(!id.includes('~')){W.spend[id]=v;return}STO.wallet.mspend=STO.wallet.mspend||{};STO.wallet.mspend[id]=v;const k=id.split('~')[0];W.spend[k]=MSPL[k].reduce((t,x)=>t+(+STO.wallet.mspend[k+'~'+x[0]]||0),0)}
document.addEventListener('input',e=>{const id=e.target.dataset?.msp;if(!id)return;mspSet(id,Math.max(0,+e.target.value||0));saveS();e.target.closest('.btile')?.classList.toggle('on',+e.target.value>0)});
/* store spend is part of its general category: take it out there so it is never counted twice */
const spNet=sp=>{const o={...sp};MERCH.forEach(([k,,,p])=>{const v=+o[k]||0;if(v)o[p]=Math.max(0,(+o[p]||0)-v)});return o};
/* Spend → reward category: direct r_<k>, else WPAR parent (fly→trav, deliv→dine, …), else null (caller uses base / other). */
const spRewVia=(c,k)=>c['r_'+k]!=null?k:WPAR[k]&&c['r_'+WPAR[k]]!=null?WPAR[k]:null;
const spBaseNote=(c,k)=>{if(!c||k=='other')return '';const via=spRewVia(c,k);return via?'':`No matching reward category for ${spN(k)}; using this card's base earn rate`};
/* Shared earn candidates for pytRew / pytRewMkt (Andrew 2026-11-05: one builder). via = mapped key or 'other'. */
function pytCands(cs,k){const cand=[];cs.forEach(c=>{const fx=k=='fxsp'?(c.fx??0):0,pk=spRewVia(c,k);if(pk)cand.push({c,r:c['r_'+pk]*earnMul(c,pk)-fx,cap:c.caps?.[pk]??Infinity,via:pk});if(c.other!=null&&!NOACC(c,k))cand.push({c,r:c.other*earnMul(c,'other')-fx,cap:Infinity,via:'other'})});return cand}
function pytRew(cs,sp=W.spend){sp=spNet(sp);const rows=[];let rew=0,tot=0;
 for(const k of WCATS){const m=+sp[k]||0;if(!m)continue;let left=m*12;tot+=left;const cand=pytCands(cs,k);
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
const ctile=o=>`<div class="ctile${o.on?' on':''}" role=button tabindex=0 ${o.attrs} style="background:linear-gradient(135deg,${o.a},${o.b})">${IMGB&&o.img?`<img class=tart src="${IMGB}${o.img}" alt="${esc(o.alt||'')}" loading=lazy>`:''}${o.rm?RMX(o.rm,o.name):''}<span class=ti>${esc(o.top)}${o.nick?` <span class=tnk>${esc(o.nick)}</span>`:''}</span><span class=tn title="${esc(o.name)}">${esc(o.name)}</span>${o.kub||'<span class=tchip></span>'}<span class=tf>${CK(esc(o.foot))}</span><span class=tw>${CK(esc(o.mark||''))}</span></div>`;
const FCOL=D.fcol||{};
/* Filters popup (Andrew 2026-10-31): closes on a click or tap anywhere outside it and on Esc, not only via the Filters button; a click inside (dropdowns, checkboxes) keeps it open; selections stay applied. pointerdown runs before a filter's change re-renders the panel, so the target is still in the page */
const fpOpen=()=>{const f=document.querySelector('#filters');return STO.ui?.fcol===false&&!!f&&!f.classList.contains('fcol')&&getComputedStyle(f).display!='none'};
const fpClose=()=>{STO.ui={...(STO.ui||{}),fcol:true};saveS();render();$('#fcol')?.focus({preventScroll:true})};
document.addEventListener('pointerdown',e=>{if(!fpOpen()||!e.target.isConnected||e.target.closest('#filters,#fhead,#fsbg'))return;fpClose()},true);
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&fpOpen()&&!document.querySelector('details.ms[open]')){e.preventDefault();fpClose()}});
function walletIns(cs){return INS.map(([k,l])=>{const has=cs.filter(c=>c.ins[k]===1),st=has.length?1:cs.length&&cs.every(c=>c.ins[k]===0)?0:null;
 let best=null;has.forEach(c=>{const v0=(c.insr||{})[k]?.[1],v=v0==='Unlimited'?Infinity:typeof v0=='number'?v0:null;if(v!=null&&(!best||v>best.v))best={v,c}});return{k,l,st,has,best}})}
const COVI={"emergency_medical": "<path d='M12 6v12M6 12h12'/>", "trip_cancellation": "<path d='M3 17h18M6 14l3-8h2l1 5 5-2c1-.4 2.5.2 2.5 1.2 0 .6-.5 1-1.2 1.2L7 16'/><path d='M15 3l6 6M21 3l-6 6'/>", "trip_interruption": "<path d='M2 16h20M5 13l2.5-6h2l1 4 5-1.8c1.2-.4 2.5.2 2.5 1.2s-.6 1.2-1.4 1.4L6 15'/><path d='M12 19v2M9 19v2M15 19v2'/>", "flight_delay": "<circle cx='12' cy='12' r='7.5'/><path d='M12 8v4l3 2'/>", "baggage": "<rect x='5' y='8' width='14' height='11' rx='2'/><path d='M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8M9 12v3M15 12v3'/>", "hotel_burglary": "<path d='M4 20V9l8-5 8 5v11'/><rect x='9' y='12' width='6' height='8' rx='1'/><circle cx='13.2' cy='16' r='.6'/>", "rental_car_cdw": "<path d='M4 15l1.5-5A2 2 0 0 1 7.4 8.5h9.2a2 2 0 0 1 1.9 1.5L20 15v3H4z'/><circle cx='8' cy='18' r='1.5'/><circle cx='16' cy='18' r='1.5'/><path d='M4 15h16'/>", "purchase_protection": "<path d='M6 8h12l-1 12H7z'/><path d='M9 8V6.5a3 3 0 0 1 6 0V8'/><path d='M10 14l1.6 1.6L15 12'/>", "extended_warranty": "<path d='M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z'/><path d='M9 12l2 2 4-4'/>", "mobile_device": "<rect x='7' y='3' width='10' height='18' rx='2'/><path d='M11 17.5h2'/>", "price_protection": "<path d='M20 12l-8 8-8-8V4h8z'/><circle cx='8' cy='8' r='1.4'/><path d='M11 13l4-4'/>", "travel_accident": "<path d='M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z'/><path d='M8 12h2l1-2 2 4 1-2h2'/>", "roadside": "<path d='M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5L15 12l-3-3z'/>"};
const covI=(k,l,on)=>`<span class="covi${on===1?' on':on===0?' off':' unk'}" role=img aria-label="${esc(l)}: ${on===1?'covered by a wallet card':on===0?'not covered':'unconfirmed'}" title="${esc(l)}: ${on===1?'covered by a wallet card':on===0?'not covered by any wallet card':'unconfirmed'}"><svg viewBox="0 0 24 24" aria-hidden=true>${COVI[k]||'<circle cx="12" cy="12" r="6"/>'}</svg></span>`;
function renderCardsFolder(){const R=walletCalc(),cs=R.cs,IN=walletIns(cs),gaps=IN.filter(x=>x.st!==1),pb=cs.filter(c=>c.ptt&&c.ptt.v!=null).sort((a,b)=>b.ptt.v-a.ptt.v)[0];
 const perks=[...new Set(cs.flatMap(c=>[...(c.credits||[]),...(c.perks||[])]))];
 const tile=c=>{const[a,b]=icol(c);return ctile({a,b,img:'cards/'+c.id+'.svg',alt:'PerTheTerms mock card art for '+c.n+' (placeholder, not the issuer design)',top:c.i,name:c.n,foot:(LIVE(c)?'':'No longer offered · ')+(c.fee==null?(c.feet||'Fee —'):effFee(c)==0&&c.fee>0?'✓ Fee waived':'$'+c.fee),mark:(c.nw||'').toUpperCase(),attrs:`data-wtile="${C.indexOf(c)}" aria-label="${esc(c.n)} details"`})};
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
 const pool=C.filter(c=>!hs.has(c.id)&&c.st!='discontinued'&&c.fee!=null).map(c=>{let u=0;for(const k of WCATS){const m=+W.spend[k]||0;if(!m)continue;const r=(NOACC(c,k)?0:Math.max(wRate(c,k)??0,c.other??0))-(k=='fxsp'?(c.fx??0):0);u+=m*12*Math.max(r-(hb[k]||0),0)/100}return{c,u:u-effFee(c)+(c.pf?perkOf([c],null,false).tot:0)}}).sort((a,b)=>b.u-a.u).slice(0,24).map(x=>x.c);
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
const BRS=[{id:'brov',name:'Overview',r:()=>brShell(),shell:1},{id:'brfees',name:'Fees',r:()=>renderBrokerFees()},{id:'braccts',name:'Accounts',r:()=>renderBrokerAccts()},{id:'brfeat',name:'Features',r:()=>renderBrokerFeat()}];/* Andrew 2026-11-05: no Brokers Promotions view (promos live on PerYourTerms › Promotions); Brokers › Crypto (brcry) parked same day — DB/crypto_snapshots kept; restore notes in agent auditspec (ptt-auditspec.md) */
/* Brokers sub-tabs from the record: Fees / Features = D.bsnap (latest brokerage_snapshots row per broker, tag = its verification_status),
   Accounts = D.bacct (broker-accounts.csv, per account type: offered yes/no/unknown + tag). Empty = dash, nulls sort last. Crypto view parked (D.csnap kept). */
const BRDASH='<span class=q title="Not stated in the record">—</span>';
const BRNAMES=()=>[...new Set((D.bacct||[]).map(b=>b.i).concat((D.bsnap||[]).map(r=>r.i)))].sort();
const BSN=i=>(D.bsnap||[]).find(r=>r.i==i)||{i};
const brTxt=v=>v==null?BRDASH:`<span title="${esc(v)}">${esc(String(v).split(/(?<=[.;])\s/)[0])}</span>`;
const brTag=r=>r.verification_status?`<span class=t>${esc(r.verification_status)}</span>${r.source_url?` <a href="${esc(r.source_url)}" target=_blank rel=noopener>source</a>`:''}`:BRDASH;
const brHeld=i=>{const b=(D.bacct||[]).find(x=>x.i==i);return b?BHELD(b).length>0:false};
const brTable=(id,H,rows)=>`<table class="vt brtab" data-brtab=${id}><tr>${H.map((h,k)=>`<th${k==0?' class=l':''}>${h}</th>`).join('')}</tr>${rows.join('')||`<tr><td colspan=${H.length} class=empty>—</td></tr>`}</table>`;
const brRow=(i,cells,title)=>`<tr${brHeld(i)?' class=bheld':''}><td class=l${title?` title="${esc(title)}"`:''}><b>${esc(i)}</b>${brHeld(i)?'<br><span class=bmine>You hold</span>':''}</td>${cells.map(c=>`<td class=l>${c}</td>`).join('')}</tr>`;
const BRFEES=[['equity_commission','Stock trades'],['etf_commission','ETF trades'],['options_commission','Options'],['fx_conversion','FX conversion'],['admin_fees','Account / admin fees'],['inactivity_fees','Inactivity'],['transfer_out_fee','Transfer out']];
function renderBrokerFees(){const L=BRNAMES().map(BSN).sort((a,b)=>(a.equity_commission_cad==null)-(b.equity_commission_cad==null)||(a.equity_commission_cad??0)-(b.equity_commission_cad??0)||a.i.localeCompare(b.i));
 $('#view').innerHTML=skel('','Commissions and fees from each broker’s own pricing pages and fee schedules (brokerage_snapshots, latest capture). Hover a cell for the full text. Sorted by stock-trade commission, lowest first; not stated sorts last.',[['Brokers on record',L.length],['$0 stock trades',L.filter(r=>r.equity_commission_cad===0).length],['FX spread stated',L.filter(r=>r.fx_conversion).length]],
 brTable('brfees',['Broker',...BRFEES.map(x=>x[1]),'Tag'],L.map(r=>brRow(r.i,[...BRFEES.map(([k])=>brTxt(r[k])),brTag(r)]))),'')}
const BRACCTS=['TFSA','RRSP','SPOUSAL_RRSP','FHSA','RESP','RDSP','RRIF','LIRA','LIF','CASH','MARGIN','CORPORATE','CRYPTO'];
function renderBrokerAccts(){const B=[...(D.bacct||[])].sort((a,b)=>b.accts.length-a.accts.length||a.i.localeCompare(b.i));
 const cell=(b,t)=>{const a=b.accts.find(x=>x.t==t);if(a)return `<span class=bryes title="${esc(a.tag)}">✓${a.tag=='CITED'?'':' *'}</span>`;const n=(b.noacct||[]).find(x=>x.t==t);return n?(n.st=='no'?`<span class=brno title="${esc(n.tag)}">✗</span>`:`<span class=q title="${esc(n.tag)}">?</span>`):BRDASH};
 $('#view').innerHTML=skel('','Which account types each broker offers, from its own account pages (Database/datasets/broker-accounts.csv). ✓ offered, ✗ not offered, ? not confirmed, * = not CITED (hover for the tag), — = not on record.',[['Brokers on record',B.length],['Offer FHSA',B.filter(b=>b.accts.some(a=>a.t=='FHSA')).length],['Offer RDSP',B.filter(b=>b.accts.some(a=>a.t=='RDSP')).length]],
 brTable('braccts',['Broker',...BRACCTS.map(t=>t.replace('SPOUSAL_RRSP','Spousal RRSP').replace(/^(CASH|MARGIN|CORPORATE|CRYPTO)$/,m=>m[0]+m.slice(1).toLowerCase()))],B.map(b=>`<tr${BHELD(b).length?' class=bheld':''}><td class=l><b>${esc(b.i)}</b></td>${BRACCTS.map(t=>`<td>${cell(b,t)}</td>`).join('')}</tr>`)),'')}
const BRFEAT=[['fractional_shares','Fractional shares'],['usd_accounts','USD accounts'],['drip','DRIP'],['extended_hours','Extended hours'],['ipo_access','IPO access'],['margin_offered','Margin'],['shorting','Short selling'],['cash_interest','Cash interest'],['market_access','Markets']];
function renderBrokerFeat(){const n=r=>BRFEAT.filter(([k])=>r[k]).length,L=BRNAMES().map(BSN).sort((a,b)=>n(b)-n(a)||a.i.localeCompare(b.i));
 $('#view').innerHTML=skel('','Platform features as each broker states them (brokerage_snapshots, latest capture). Hover a cell for the full text; — = not stated in the captured pages, not proof the feature is absent.',[['Brokers on record',L.length],['Fractional shares stated',L.filter(r=>r.fractional_shares).length],['USD accounts stated',L.filter(r=>r.usd_accounts).length]],
 brTable('brfeat',['Broker',...BRFEAT.map(x=>x[1]),'Tag'],L.map(r=>brRow(r.i,[...BRFEAT.map(([k])=>brTxt(r[k])),brTag(r)]))),'')}
/* Brokers › Crypto view parked (Andrew 2026-11-05): UI removed (BRS/brcry, renderCrypto, CRYCOLS/CRYFLAG/cryRef/cryPro, SECI.brcry). Data stays: D.csnap / crypto_snapshots, referral_programs line crypto, broker-promos on crypto card_ids. Bring-back steps in agent auditspec (ptt-auditspec.md). */
/* Brokers › Overview in the shared table shell (Andrew 2026-11-03: "Similar to the credit card tables, where you can filter etc."): same #th/#tb table, sticky header,
   sort by header click, filter selects + chips (#filters/#bar), search (#q). Rows = D.bsnap (latest brokerage_snapshots row per broker) + D.bacct account types + D.promo broker rows.
   Columns = the snapshot fields with the best coverage on the Competitive Intelligence page. Blank = not stated. */
const BRV=r=>r==null||String(r).trim()==''?null:r;
const BRC={equity_commission:['Stock trades','l',r=>r.equity_commission_cad??(BRV(r.equity_commission)?1e6:null)],etf_commission:['ETF trades','l'],admin_fees:['Account / admin fees','l'],inactivity_fees:['Inactivity','l'],
 fx_conversion:['FX conversion','l'],usd_accounts:['USD accounts','l'],account_types:['Account types','l',r=>(BACC(r).length||null)],margin_rates:['Margin rates','l',r=>r.margin_rate_min_cad??(BRV(r.margin_rates)?1e6:null)],
 promo:['Sign-up promo','l',r=>BRPR(r).length||null,r=>BRPR(r).length?`<span title="${esc(BRPR(r).map(p=>p.t).join(' · '))}">${esc(BRPR(r)[0].t)}${BRPR(r).length>1?` <span class=mute>+${BRPR(r).length-1}</span>`:''}</span>`:BRDASH],
 tag:['Tag','l',r=>r.verification_status,r=>r.verification_status?`<span class=t>${esc(r.verification_status)}</span>`:BRDASH]};
const BACC=r=>((D.bacct||[]).find(b=>b.i==r.i)||{accts:[]}).accts,BRPR=r=>(D.promo||[]).filter(p=>p.line=='broker'&&(p.inst==r.i||r.i.startsWith(p.inst+' ')));
const BRACN=t=>t.replace('SPOUSAL_RRSP','Spousal RRSP').replace(/^(CASH|MARGIN|CORPORATE|CRYPTO)$/,m=>m[0]+m.slice(1).toLowerCase());
const BRF=()=>({acct:['Account type',[...new Set((D.bacct||[]).flatMap(b=>b.accts.map(a=>a.t)))].sort((a,b)=>BRACCTS.indexOf(a)-BRACCTS.indexOf(b)).map(t=>[BRACN(t),r=>BACC(r).some(a=>a.t==t)])],
 usd:['USD accounts',[['Stated',r=>!!BRV(r.usd_accounts)],['Not stated',r=>!BRV(r.usd_accounts)]]],
 eq:['Stock-trade fee',[['$0',r=>r.equity_commission_cad===0],['≤ $7',r=>r.equity_commission_cad!=null&&r.equity_commission_cad<=7],['> $7',r=>r.equity_commission_cad>7],['Per-share / other',r=>r.equity_commission_cad==null&&!!BRV(r.equity_commission)]]],
 mg:['Margin rate from',[['≤ 5%',r=>r.margin_rate_min_cad!=null&&r.margin_rate_min_cad<=5],['> 5%',r=>r.margin_rate_min_cad>5],['Not stated as a number',r=>r.margin_rate_min_cad==null]]]});
const BRCELL=(r,k)=>{if(BRC[k][3])return BRC[k][3](r);if(k=='account_types'){const a=BACC(r);return a.length?`<span title="${esc(r.account_types||a.map(x=>BRACN(x.t)).join(', '))}">${esc(a.map(x=>BRACN(x.t)).join(', '))}</span>`:brTxt(BRV(r.account_types))}const v=BRV(r[k]);return v==null?BRDASH:`<span class=brc title="${esc(v)}">${esc(String(v))}</span>`};
/* Filters / Reset head + floating panel, shared by Cards, Banking and Brokers (symmetry, Andrew 2026-11-03). rx = the reset attribute of the line's own handler. */
function fheadSet(na,rx){const fc=STO.ui?.fcol!==false,q=!!st.q,on=na||q;$('#fhead').innerHTML=`<button type=button id=fcol aria-expanded=${!fc} aria-controls=filters aria-label="Filters${na?', '+na+' active':''}">Filters</button><button type=button id=freset class="${on?'on':''}" ${rx}=__all aria-label="Reset filters and search${na?', '+na+' active':''}"${on?'':' disabled'}>Reset</button>`;$('#filters').classList.toggle('fcol',fc);$('#filters').insertAdjacentHTML('afterbegin',`<div class=fsh role=group aria-label=Filters><b>Filters${na?' <span class=mute>('+na+')</span>':''}</b><button type=button class=fshr ${rx}=__all${on?'':' disabled'}>Reset</button><button type=button class=fshd data-fdone>Done</button></div>`)}
/* rsShell(X): the shared #th/#tb table shell for the row-per-product lines (Brokers › Overview, every Investments view): same sticky header, header-click
   sort (nulls last), filter selects + chips (#filters/#bar), search (#q) and Filters/Reset head as Cards and Banking. X = the line's config:
   p state prefix (st[p+'f'|'sort'|'dir']), one/many nouns, first (first column label), C columns {key:[label, class, sort key, cell]}, F filters,
   rows, q (search text), cell(r,k), name(r) first-cell html, held(r). One handler set below serves every line through RSX(). */
function rsShell(X){$('#view').hidden=true;$('.wrap').hidden=false;$('#bar').hidden=false;$('#filters').hidden=false;$('#filters').style.display='';
 const F=X.F,C=X.C,bf=st[X.p+'f']||{},q=(st.q||'').toLowerCase(),ALL=X.rows;
 $('#filters').innerHTML=Object.entries(F).map(([id,[l,o]])=>`<label>${l}<select data-brf="${id}" class="${bf[id]!=null?'set':''}"><option value="">Any</option>${o.map((x,i)=>`<option value="${i}" ${bf[id]==i?'selected':''}>${esc(x[0])}</option>`).join('')}</select></label>`).join('');fheadSet(Object.keys(bf).filter(k=>F[k]).length,'data-brx');
 const R=ALL.filter(r=>Object.entries(bf).every(([k,i])=>!F[k]||F[k][1][i]?.[1](r))&&(!q||X.q(r).toLowerCase().includes(q)));
 const chips=Object.entries(bf).filter(([k])=>F[k]).map(([k,i])=>`<span class=chip><i>${X.chip} ·</i> ${F[k][0]} ${esc(F[k][1][i]?.[0]||'')}<button data-brx="${k}" aria-label="Remove">×</button></span>`);
 if(st.q)chips.push(`<span class=chip><i>Search ·</i> “${esc(st.q)}”<button data-brx="__q" aria-label="Remove">×</button></span>`);
 const so=st[X.p+'sort'],sk=so&&(so=='n'||C[so])?so:'n',dir=st[X.p+'dir']||1;
 if(so)chips.push(`<span class=chip><i>Sort ·</i> ${sk=='n'?X.first:C[sk][0]} ${dir>0?'▴':'▾'}<button data-brx="__sort" aria-label="Reset sort">×</button></span>`);
 $('#bar').innerHTML=`<span class=count>${R.length} <span>of ${ALL.length} ${X.many}</span></span>${chips.join('')}${chips.length?'<button class=clr data-brx="__all">Clear all</button>':''}`;
 const key=sk=='n'?X.nk:(C[sk][2]||(r=>BRV(r[sk])));R.sort(!so&&X.def?X.def:(a,b)=>nlast(key(a),key(b),dir)||X.nk(a).localeCompare(X.nk(b)));/* X.def = the line's default order when no header sort is set */
 const cols=['n',...Object.keys(C)];
 $('#th').innerHTML='<tr>'+cols.map(k=>`<th data-brk="${k}" class="${k=='n'?'l nm':C[k][1]} ${k==sk?'s'+(dir>0?' asc':''):''}">${k=='n'?X.first:C[k][0]}</th>`).join('')+'</tr>';
 $('#tb').innerHTML=R.length?R.map(r=>`<tr class="rsrow${X.held(r)?' bheld':''}">`+cols.map(k=>k=='n'?`<td class="l nm">${X.name(r)}</td>`:`<td class="${C[k][1]} rstd">${X.cell(r,k)}</td>`).join('')+'</tr>').join(''):`<tr><td class=empty colspan=${cols.length}>No ${X.many} match. Remove a filter.</td></tr>`}
const brShell=()=>rsShell({p:'br',many:'brokers',chip:'Brokers',first:'Broker',C:BRC,F:BRF(),rows:BRNAMES().map(BSN),nk:r=>r.i,q:r=>r.i+' '+(r.account_types||''),cell:BRCELL,held:r=>brHeld(r.i),
 name:r=>`<b class=cl>${esc(r.i)}</b>${brHeld(r.i)?'<span class=held>In wallet</span>':''}${r.snapshot_date?`<small>captured ${esc(r.snapshot_date)}</small>`:''}`});
/* which shell config is on screen: 'br' (Brokers › Overview) or 'iv' (any Investments view); null elsewhere */
const RSX=()=>st.card||USR.has(st.s)?null:st.pl=='broker'&&(!st.brs||st.brs=='brov')?'br':st.pl=='invest'?'iv':null;
document.addEventListener('click',e=>{const p=RSX();if(!p)return;const t=e.target;
 const k=t.closest('#th [data-brk]');if(k){e.stopPropagation();const x=k.dataset.brk;if(st[p+'sort']==x)st[p+'dir']=-(st[p+'dir']||1);else{st[p+'sort']=x;st[p+'dir']=1}render();return}
 const b=t.closest('[data-brx]');if(b){e.stopPropagation();const x=b.dataset.brx;if(x=='__all'){st[p+'f']={};st.q='';$('#q').value=''}else if(x=='__q'){st.q='';$('#q').value=''}else if(x=='__sort'){st[p+'sort']=null;st[p+'dir']=1}else{const f={...(st[p+'f']||{})};delete f[x];st[p+'f']=f}render()}},true);
document.addEventListener('change',e=>{const k=e.target.dataset.brf,p=RSX();if(!k||!p)return;e.stopPropagation();const f={...(st[p+'f']||{})};if(e.target.value==='')delete f[k];else f[k]=+e.target.value;st[p+'f']=f;render()},true);
/* Investments (schema v44, Andrew 2026-11-05): index ETFs from the funds table (D.funds). Four views, one row set, one filter state (st.ivf), all in rsShell.
   Every cell carries its evidence tag on hover (value · tag · source host); a non-CITED cell is dotted-underlined like the Cards fee cells.
   t / lt = the row's tag for its main / liquidity cells (fund_value_evidence), ve = any cell that differs. Blank = dash, nulls sort last.
   IVHID: columns under 20% complete at launch (same rule as Underwriting's UWHID, Andrew 2026-11-02): spread and premium/discount (data kept). */
const IVHID=new Set(['bid_ask_spread_pct','premium_discount_pct']),IVLIQ=new Set(['avg_daily_volume_shares','avg_daily_volume_dollars','avg_volume_period','bid_ask_spread_pct','spread_as_of','premium_discount_pct','liquidity_as_of']);
const ivTag=(r,k)=>r.ve?.[k]||(IVLIQ.has(k)?r.lt:r.t),ivHost=(r,k)=>{try{return new URL(IVLIQ.has(k)?r.liquidity_source_url:r.source_url).host.replace(/^www\./,'')}catch(_){return ''}};
const ivBig=v=>v>=1e9?(v/1e9).toFixed(v>=1e10?0:1)+'B':v>=1e6?(v/1e6).toFixed(v>=1e7?0:1)+'M':v>=1e3?(v/1e3).toFixed(v>=1e4?0:1)+'K':String(Math.round(v));
const ivFmt=(r,k)=>{const v=r[k];if(v==null)return null;if(/_pct$/.test(k))return (+v).toFixed(2)+'%';if(k=='aum')return ivBig(v)+(r.aum_currency?' '+r.aum_currency:'');if(k=='avg_daily_volume_dollars')return '$'+ivBig(v);if(k=='avg_daily_volume_shares')return ivBig(v);if(k=='holdings_count')return (+v).toLocaleString();return String(v)};
const IVCELL=(r,k)=>{const f=ivFmt(r,k);if(f==null)return BRDASH;const t=ivTag(r,k),h=ivHost(r,k);return `<span class="fny${t&&t!='CITED'?' nyv':''}" title="${esc(String(r[k])+(t?' · '+t:'')+(h?' · '+h:''))}">${esc(f)}</span>`};
const IVLAB={fund_name:'Fund',issuer:'Issuer',index_name:'Index',listing_country:'Listing',currency:'Currency',hedged:'Hedged',mer_pct:'MER',management_fee_pct:'Mgmt fee',aum:'AUM',distribution_yield_pct:'Yield',
 perf_1y_pct:'1y',perf_3y_ann_pct:'3y ann.',perf_5y_ann_pct:'5y ann.',perf_10y_ann_pct:'10y ann.',perf_as_of_date:'Returns as of',replication_structure:'Replication',exposure_basis:'Exposure basis',
 distribution_frequency:'Distributions',holdings_count:'Holdings',inception_date:'Inception',avg_daily_volume_shares:'Avg volume (shares)',avg_daily_volume_dollars:'Avg volume ($)',avg_volume_period:'Volume window',
 bid_ask_spread_pct:'Bid-ask spread',premium_discount_pct:'Premium / discount',liquidity_as_of:'Liquidity as of'};
const IVNUM=new Set(['mer_pct','management_fee_pct','aum','distribution_yield_pct','perf_1y_pct','perf_3y_ann_pct','perf_5y_ann_pct','perf_10y_ann_pct','holdings_count','avg_daily_volume_shares','avg_daily_volume_dollars','bid_ask_spread_pct','premium_discount_pct']);
const IVCOLS={ivov:['fund_name','issuer','index_name','currency','hedged','mer_pct','aum','distribution_yield_pct','perf_1y_pct','perf_5y_ann_pct','perf_10y_ann_pct'],
 ivcost:['mer_pct','management_fee_pct','replication_structure','exposure_basis','distribution_frequency','holdings_count','inception_date'],
 ivperf:['perf_1y_pct','perf_3y_ann_pct','perf_5y_ann_pct','perf_10y_ann_pct','perf_as_of_date'],
 ivliq:['avg_daily_volume_shares','avg_daily_volume_dollars','avg_volume_period','bid_ask_spread_pct','premium_discount_pct','liquidity_as_of']};
/* AUM sorts in CAD-or-USD as stated (no FX conversion: a converted figure would be an ESTIMATE) */
const IVC=v=>Object.fromEntries(IVCOLS[v].filter(k=>!IVHID.has(k)).map(k=>[k,[IVLAB[k],IVNUM.has(k)?'':'l',IVNUM.has(k)?(r=>r[k]??null):(r=>r[k]??null),r=>IVCELL(r,k)]]));
const ivOpts=(k,o)=>[...new Set((D.funds||[]).map(r=>r[k]).filter(Boolean))].sort(o||((a,b)=>a.localeCompare(b))).map(v=>[v,r=>r[k]==v]);
const IVF=()=>{const n={};(D.funds||[]).forEach(r=>n[r.index_name]=(n[r.index_name]||0)+1);return {ac:['Asset class',['Equity index','Fixed income','Multi-asset','Precious metals','Commodities','Crypto'].filter(k=>(D.funds||[]).some(r=>r.ac==k)).map(k=>[k,r=>r.ac==k])],/* derived at build (holdings_data.asset_class), default Any = all */idx:['Index',ivOpts('index_name')],ctry:['Listing country',ivOpts('listing_country')],ccy:['Currency',ivOpts('currency')],
 hdg:['Hedged',ivOpts('hedged')],iss:['Issuer',ivOpts('issuer')],mer:['MER',[['≤ 0.10%',r=>r.mer_pct!=null&&r.mer_pct<=.1],['≤ 0.25%',r=>r.mer_pct!=null&&r.mer_pct<=.25],['> 0.25%',r=>r.mer_pct>.25],['Not stated',r=>r.mer_pct==null]]]}};
const ivShell=v=>rsShell({p:'iv',many:'funds',chip:'Funds',first:'Ticker',C:IVC(v),F:IVF(),rows:D.funds||[],held:()=>false,cell:(r,k)=>IVC(v)[k][3](r),
 nk:r=>r.ticker,def:(a,b)=>a.index_name.localeCompare(b.index_name)||nlast(a.mer_pct,b.mer_pct,1)||a.ticker.localeCompare(b.ticker),/* default order: grouped by index, cheapest MER first */
 q:r=>[r.ticker,r.fund_name,r.issuer,r.index_name,r.benchmark_exact].join(' '),
 name:r=>`<b class=cl title="${esc(r.fund_name||'')}">${esc(r.ticker)}</b><small>${esc(r.exchange||'')}${r.listing_country?' · '+esc(r.listing_country):''}</small>`});
const IVS=[{id:'ivov',name:'Overview',r:()=>ivShell('ivov'),shell:1},{id:'ivcost',name:'Costs & Structure',r:()=>ivShell('ivcost'),shell:1},{id:'ivperf',name:'Performance',r:()=>ivShell('ivperf'),shell:1},{id:'ivliq',name:'Liquidity',r:()=>ivShell('ivliq'),shell:1}];
const TS=[{id:'tplans',name:'Plans',r:()=>renderTel('plan')},{id:'tcarr',name:'Carriers',r:()=>renderTel('carrier')},{id:'tmulti',name:'Multi-line discounts',r:()=>renderTel('multiline_discount')},{id:'tprom',name:'Promotions',r:()=>renderPromos('tel')}];
/* Telecom tab: the cited plan catalogue (D.telplans, Database/datasets/telecom-plans.csv). Your own plans live in Subscriptions › Telecom. */
const telHeld=p=>(STO.wallet.tel||[]).some(x=>x&&(x.hid==p.holding_id||x.i==p.brand+' · '+p.plan||(p.kind=='carrier'&&String(x.i||'').split(' · ')[0]==p.brand)));
function renderTel(kind){const L=(D.telplans||[]).filter(p=>p.kind==kind).sort((a,b)=>telHeld(b)-telHeld(a)||a.brand.localeCompare(b.brand)||(+a.price_cad_mo||0)-(+b.price_cad_mo||0)),dash='<span class=q title="Not stated in the record">—</span>',plan=kind!='carrier';
 const row=p=>`<tr${telHeld(p)?' class=theld':''}><td class=l><b>${esc(p.brand)}</b>${p.parent&&p.parent!=p.brand?`<br><small class=mute>${esc(p.parent)}</small>`:''}${telHeld(p)?'<br><span class=tmine>You have</span>':''}</td>${plan?`<td class=l>${esc(p.plan||'')}</td><td>${p.price_cad_mo!=null?(+p.price_cad_mo<0?'−$'+Math.abs(+p.price_cad_mo).toFixed(2):'$'+(+p.price_cad_mo).toFixed(2))+'<span class=mute>/mo</span>':dash}${p.price_basis?`<br><small class=mute>${esc(p.price_basis)}</small>`:''}</td>`:''}${kind=='plan'?`<td>${p.data_gb!=null?esc(p.data_gb)+' GB':dash}</td><td class=l><small>${p.perks?esc(p.perks):dash}</small></td>`:''}<td>${p.tag?`<span class=t>${esc(p.tag[0])}</span>`:dash}${p.source_url?` <a href="${esc(p.source_url)}" target=_blank rel=noopener>source</a>`:''}</td></tr>`;
 const H=kind=='plan'?['Carrier','Plan','Price','Data','Perks','Tag']:kind=='carrier'?['Carrier','Tag']:['Carrier','Discount','Amount','Tag'];
 $('#view').innerHTML=skel('','From each carrier’s own pages, captured with a quote (tag on each row: C = CITED). Your own plans live in Subscriptions.',[['Plans on record',(D.telplans||[]).filter(p=>p.kind=='plan').length],['Carriers',(D.telplans||[]).filter(p=>p.kind=='carrier').length],['You have',(STO.wallet.tel||[]).length]],
 `<table class="vt ttab" data-tel=${kind}><tr>${H.map((h,i)=>`<th${i<2||h=='Perks'?' class=l':''}>${h}</th>`).join('')}</tr>${L.map(row).join('')||`<tr><td colspan=${H.length} class=empty>—</td></tr>`}</table><p class=omute>Add the plans you have in <button type=button class="lnk plink" data-s=subscriptions data-subt=tel>Subscriptions › Telecom</button>.</p>`,'')}
const LSUB={broker:[BRS,'brs'],invest:[IVS,'ivs'],tel:[TS,'ts']};
const LTABS=k=>{const[L,key]=LSUB[k],cur=L.find(x=>x.id==st[key])||L[0];st[key]=cur.id;return L.map(x=>`<button data-${key}=${x.id} class="${x.id==cur.id?'on':''}">${x.name}</button>`).join('')};
function renderLine(k){const[L,key]=LSUB[k];if(!L.some(x=>x.id==st[key]))st[key]=L[0].id;return (L.find(x=>x.id==st[key])||L[0]).r()}
document.addEventListener('click',e=>{const t=e.target.closest('#tabs [data-brs],#tabs [data-ivs],#tabs [data-ts]');if(!t)return;e.stopPropagation();const KP=posGet();if(t.dataset.brs)st.brs=t.dataset.brs;else if(t.dataset.ivs)st.ivs=t.dataset.ivs;else st.ts=t.dataset.ts;render();posSet(KP)},true);
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
const waysHTML=ws=>ws.length?`<ul class=ways>${ws.map(w=>`<li class="w${w.ok}"><span class=wk>${w.ok=='yes'?'<span class=y>✓</span> You qualify':w.ok=='no'?'Not met':'Check'}</span><b>${esc(w.label)}</b> <span>${esc(w.text.slice(0,180))}${w.text.length>180?'…':''}</span>${w.src?` <a href="${esc(w.src)}" target=_blank rel=noopener class=mute>source</a>`:''}</li>`).join('')}</ul>`:'<p class=mute>No other ways on record.</p>';
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
const PTSP=['Aeroplan','Scene+','PC Optimum','Blue Rewards','WestJet Rewards','Marriott Bonvoy','Triangle Rewards','Starbucks Rewards (Canada)']/* Loyalty = programs a person joins; issuer-only card currencies (D.pts cat=issuer) stay in the data for valuations, off the Loyalty lists */;
const wCount=()=>W.cards.length+['banks','brokerage','tel','ins','points','services'].reduce((t,k)=>t+(STO.wallet[k]||[]).length,0);
const WSEC=()=>[
 ['cards','Credit cards',W.cards.map(i=>{const c=C[BYID0[i]];return c&&{k:i,n:c.n,sub:c.i}}).filter(Boolean),C.map(c=>[c.id,c.n])],
 ['banks','Bank accounts',(STO.wallet.banks||[]).map(x=>{const a=(D.bank?.accounts||[]).find(a=>a.id==x.id);return a&&{k:x.id,n:a.n,sub:a.i}}).filter(Boolean),(D.bank?.accounts||[]).map(a=>[a.id,a.i+' · '+a.n])],
 ['brokerage','Brokerage accounts',(STO.wallet.brokerage||[]).filter(x=>x&&x.i).map(x=>({k:x.i,n:x.i,sub:x.tier||''})),[...new Set((D.bacct||[]).flatMap(b=>b.accts.map(a=>b.i+' · '+a.t)).concat((D.brokers||[]).map(b=>b.i),PROMO.filter(p=>p.line=='broker').map(p=>p.inst)))].sort().map(n=>[n,n])],
 ['tel','Telecom plans',(STO.wallet.tel||[]).map(x=>({k:x.i,n:x.i})),[...new Set((D.telplans||[]).filter(p=>p.kind!='multiline_discount').map(p=>p.brand+' · '+p.plan).concat(D.ntel?.brands||[]))].map(n=>[n,n])],
 ['ins','Insurance policies',(STO.wallet.ins||[]).map(x=>({k:x.i,n:x.i})),null],
 ['services','Perks & subscriptions',(STO.wallet.services||[]).map(k=>{const s=SUBS.find(s=>s.k==k);return{k,n:s?s.n:k}}),SUBS.map(s=>[s.k,s.n])],
 ['points','Loyalty',(STO.wallet.points||[]).map(x=>({k:x.i,n:x.i})),PTSP.map(n=>[n,n])]];
function wAdd(sec,v){v=(v||'').trim();if(!v)return;const L=WSEC().find(x=>x[0]==sec),opt=L&&L[3]?(L[3].find(o=>o[0]==v||o[1].toLowerCase()==v.toLowerCase())||null):null,key=opt?opt[0]:v;
 if(sec=='cards'){if(!opt||W.cards.includes(key))return;W.cards.push(key)}
 else if(sec=='banks'){if(!opt||(STO.wallet.banks||[]).some(x=>x.id==key))return;STO.wallet.banks=[...(STO.wallet.banks||[]),{id:key,added_at:NOW()}]}
 else if(sec=='services'){if(!opt)return;STO.wallet.services=[...new Set([...(STO.wallet.services||[]),key])]}
 else{const A=STO.wallet[sec]=STO.wallet[sec]||[];if(A.some(x=>x.i==key))return;A.push({i:key,added_at:NOW()})}
 saveS();render()}
function wRm(sec,k){{const O=STO.wallet.order;if(O&&Array.isArray(O[sec]))O[sec]=O[sec].filter(x=>x!=k)}const rmI=g=>{const a=STO.wallet[g]||[],b=a.filter(x=>IKEY(g,x)!=k);STO.wallet[g]=b.length<a.length?b:a.filter(x=>String(g=='brokerage'?x&&x.i:x&&x.id)!=k)};/* B4: removes just that instance (legacy callers pass the product key: all its instances) */
 if(sec=='cards'){rmI('cards');W.cards=W.cards.filter(i=>STO.wallet.cards.some(x=>x.id==i))}else if(sec=='banks')rmI('banks');else if(sec=='brokerage')rmI('brokerage');else if(sec=='services')STO.wallet.services=STO.wallet.services.filter(x=>x!=k);else STO.wallet[sec]=(STO.wallet[sec]||[]).filter(x=>x.i!=k);saveS();render()}
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
function pwTiles(k,ord){const W2=STO.wallet,rm=(key,n)=>`data-wrm=${k} data-wk="${esc(key)}" aria-label="Remove ${esc(n)}"`;
 if(k=='cards'){const I0=(W2.cards||[]).filter(x=>x&&W.cards.includes(x.id)&&C[BYID0[x.id]]);return (ord?ORD('cards',I0,x=>IKEY('cards',x)):I0).map(x=>{const c=C[BYID0[x.id]];const[a,b]=icol(c);/* B4: bottom-left = annual fee, bottom-right = cardholders (no network name) */return ctile({a,b,img:'cards/'+c.id+'.svg',alt:'',top:c.i,name:c.n,foot:FEECOV(c.id)?'✓ Fee covered':c.fee==null?'Fee —':effFee(c)==0&&c.fee>0?'✓ Fee waived':'$'+effFee(c),mark:HOLDN(c.id),kub:ord&&typeof kubTile=='function'?kubTile(IKEY('cards',x)):'',attrs:`${ord?`data-ok="${esc(IKEY('cards',x))}" `:''}data-ck="${esc(IKEY('cards',x))}" data-wtile="${C.indexOf(c)}" data-cset="${c.id}" aria-haspopup=dialog aria-label="${esc(c.n)} settings"${boostNote(c)?` title="${esc(boostNote(c))}"`:''}`,rm:rm(IKEY('cards',x),c.n)})})}
 if(k=='banks')return (W2.banks||[]).map(x=>BANK.data().accounts.find(a=>a.id==x.id)).filter(Boolean).map(o=>BANK.btile(o));
 if(k=='services')return (W2.services||[]).map(s=>SUBS.find(x=>x.k==s)).filter(Boolean).map(subsTile);
 const[a,b]=PWCOL[k]||['#334155','#0f172a'];
 return (W2[k]||[]).filter(x=>x&&x.i).map(x=>{if(k=='points'){const p=ptsBy(x.i),val=ptsVal(x);return ctile({a,b,top:p?p.op:'Points',name:x.i,foot:(x.bal!=null?(+x.bal).toLocaleString()+' '+(p?.unit||'pts'):'Add balance below')+(val!=null?' · '+$$(val):''),mark:p&&p.cpp!=null?p.cpp.toFixed(2)+'¢':'',attrs:`data-hold=points`,rm:rm(x.i,x.i)})}
  return ctile({a,b,top:k=='brokerage'?'Broker':k=='tel'?'Telecom':'Insurance',name:x.i,foot:k=='brokerage'?[x.acct||String(x.i).split(' · ')[1],x.tier?x.tier+' tier':null].filter(Boolean).join(' · ')||'Self-directed':x.mo!=null?'$'+x.mo+'/mo'+(x.gb?' · '+x.gb+' GB':''):x.plan||'',mark:k=='brokerage'?'INVEST':k=='tel'?'MOBILE':'POLICY',attrs:`data-hold=${k}`,rm:rm(x.i,x.i)})})}
function pwSec([k,n]){const t=pwTiles(k).filter((_,i)=>!st.pmem||st.pmem=='all'||ownOf(k,pwKeys(k)[i]).includes(st.pmem)),WS=WSEC(),o=k=='points'?[...new Set(PTS.filter(p=>p.cat!='issuer').map(p=>p.n).concat(PTSP))].sort().map(x=>[x,x]):(WS.find(x=>x[0]==k)||[])[3];
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
 const g=e.target.closest('[data-pgo]');if(g){e.stopImmediatePropagation();const sec=g.dataset.pgo;if(PWS.some(x=>x[0]==sec))st.wt=sec;if(sec=='tel')st.subt='tel';st.s=sec=='pyt'?'pyt':sec=='points'?'points':sec=='tel'?'subscriptions':sec=='spend'?'spending':'wallet';/* dashboard hidden 2026-11-06: you/sum → wallet, spend → Spending */st.card=null;render();requestAnimationFrame(()=>{const el=document.getElementById('pw-'+sec);if(el)el.scrollIntoView({block:'start'});else scrollTo(0,0)});return}},true);
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
/* Dashboard KPIs (Andrew 2026-11-03, v2): PerYourTerms > Dashboard = one standard section per KPI-able grouping (Credit cards, Banking, Brokers, Loyalty, Subscriptions, Spending).
   Each section has a library of KPIs (KLIB) computed from the saved state (wallet) plus catalogue data only; missing input = dash + link; estimate-based = Est. tag.
   The user picks the tiles: wallet.kpis {group:[kpi id]} (absent = the 3 suggested defaults), x removes a tile, the section + opens a picker of the KPIs not shown.
   Tile order: wallet.order[group] (same drag mechanism as Accounts); section order: wallet.profileSectionOrder; collapse: ui.acol[group]. Every render recomputes from the state, so tiles follow any change. */
const KPI_E=`<span class="t ite" title="Estimate: based on estimated values">Est.</span>`;
const kpiT=(id,n,body,foot,est,g)=>`<div class="btile kpi" tabindex=0 data-ok=${id} aria-label="${esc(n)}"><span class=bn>${esc(n)}${est?' '+KPI_E:''}</span><div class=kpib>${body}</div><span class="bf mute">${foot}</span>${g?`${RMX(`data-kpirm="${g}|${id}"`,n)}`:''}</div>`;
const kpiN=v=>`<b class=kpiv>${v}</b>`,kpiX=h=>`<b class="kpiv kpid">—</b>`;
const kpiBar=P=>{const t=P.reduce((s,x)=>s+x[1],0);if(!t)return'';let x=0;return `<svg class=kpisb viewBox="0 0 100 8" preserveAspectRatio=none aria-hidden=true>${P.map(([n,v],i)=>{const w=v/t*100,r=`<rect x=${x.toFixed(2)} y=0 width=${w.toFixed(2)} height=8 class=kc${i}><title>${esc(n)} ${v}</title></rect>`;x+=w;return r}).join('')}</svg>`};
const kpiLeg=P=>`<span class=kpil>${P.filter(x=>x[1]).map(([n,v],i)=>`<span><i class=kc${P.indexOf(P.filter(x=>x[1])[i])}></i>${esc(n)} ${v}</span>`).join('')}</span>`;
const kpiDonut=P=>{const t=P.reduce((s,x)=>s+x[1],0),R=15.915;let o=0;return `<svg class=kpidn viewBox="0 0 42 42" aria-hidden=true><circle cx=21 cy=21 r=${R} class=kptr />${P.map(([n,v],i)=>{const d=v/t*100,c=`<circle cx=21 cy=21 r=${R} class="kpsg kc${i}" stroke-dasharray="${d.toFixed(2)} ${(100-d).toFixed(2)}" stroke-dashoffset="${(25-o).toFixed(2)}"><title>${esc(n)}</title></circle>`;o+=d;return c}).join('')}</svg>`};
const kpiHB=(P,f=$$)=>{const m=Math.max(...P.map(x=>x[1]))||1;return `<span class=kpihb>${P.map(([n,v],i)=>`<span class=kpir><span class=kpin>${esc(n)}</span><span class=kpit><i class=kc${i} style="width:${(Math.max(0,v)/m*100).toFixed(1)}%"></i></span><span class=kpia>${f(v)}</span></span>`).join('')}</span>`};
/* count-by helper: [[label,n]] sorted by n desc, then label */
const kpiCnt=a=>{const m=new Map();a.forEach(k=>{if(k!=null&&k!=='')m.set(k,(m.get(k)||0)+1)});return [...m].sort((p,q)=>q[1]-p[1]||String(p[0]).localeCompare(String(q[0])))};
const kpiMix=P=>P.length?kpiBar(P.slice(0,5))+kpiLeg(P.slice(0,5)):'';
const kpiS=(n,one,many)=>n+' '+(n==1?one:(many||one+'s'));
const kpiP=v=>(Math.round(v*100)/100).toString().replace(/\.0+$/,'');
const kpiM=v=>'$'+(+v).toFixed(2);
const KTY={chequing:'Chequing',savings:'Savings',hisa:'High-interest savings',usd:'USD',gic:'GIC',business:'Business'};
const kpiCap=s=>KTY[s]||String(s||'').replace(/_/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
/* one pass over the saved state; every KPI reads from this */
function kpiCtx(){const W2=STO.wallet,X={};
 X.cs=W.cards.map(i=>C[BYID0[i]]).filter(Boolean);
 X.bk=(W2.banks||[]).map(x=>({x,a:BANK.data().accounts.find(a=>a.id==x.id)})).filter(o=>o.a).map(o=>{let c=null;try{c=BANK.cost(o.a,BANK.inp()).c}catch(e){}return {...o,c}});
 X.br=(W2.brokerage||[]).filter(x=>x&&x.i).map(x=>{const[b,t]=String(x.i).split(' · ');return {x,b:x.broker||b,t:String(x.acct||t||'').toUpperCase()}});
 X.lp=(W2.points||[]).filter(x=>x&&x.i).map(x=>{const p=ptsBy(x.i)||null,bal=x.bal!=null&&x.bal!==''&&!isNaN(+x.bal)?+x.bal:null;return {x,p,n:p?loyN(p):x.i,bal,v:p&&p.cpp!=null&&bal!=null?bal*p.cpp/100:null,cash:!!(p&&/^cash/i.test(p.unit||''))}});
 X.sv=(W2.services||[]).map(k=>{const t=subTier(k),s=SUBS.find(s=>s.k==k)||(D.subsvc||[]).find(s=>s.k==k);return {k,n:(s&&s.n)||k,t,mo:t&&t.mo!=null?+t.mo:null,yr:t&&t.p!=null?(t.per=='year'?+t.p:+t.mo*12):null,per:t&&t.per}});
 const net=spNet(W.spend||{}),lab=k=>{const m=MERCH.find(x=>x[0]==k);return m?m[1]:spN(k)};
 X.SP=WCATS.map(k=>[lab(k),+net[k]||0,k]).filter(x=>x[1]>0).sort((p,q)=>q[1]-p[1]);X.tot=X.SP.reduce((t,x)=>t+x[1],0);/* = pytRew's spend basis (stores carved out of their parent category) */
 X.st=X.SP.filter(x=>x[2].startsWith('st_'));
 X.wc=X.cs.length?(()=>{try{return walletCalc()}catch(e){return null}})():null;X.rew=X.tot&&X.wc?X.wc.rew:null;
 return X}
const KADD={kcards:['wallet','Add cards'],kbank:['wallet','Add bank accounts'],kbrok:['wallet','Add broker accounts'],kloy:['pointcards','Add loyalty programs'],ksubs:['subscriptions','Add subscriptions'],kspend:['spending','Add spending']};
const kpiA=g=>`<button type=button class=lnk data-s=${KADD[g][0]}>${KADD[g][1]}</button>`;
/* KLIB[group] = [[id, name, default?, est?, X=>[body, foot] | null (= dash + add link)]] */
const KLIB={
 kcards:[
  ['k-cards','Cards held',1,0,X=>{const n=X.cs.length,i=new Set(X.cs.map(c=>c.i).filter(Boolean)).size;return n?[kpiN(n),kpiS(i,'issuer')]:null}],
  ['k-cfee','Annual card fees',1,0,X=>{const f=X.cs.map(effFee),k=f.filter(v=>v!=null);return k.length?[kpiN($$(k.reduce((t,v)=>t+v,0))),'Per year, after waivers'+(k.length<f.length?` · ${f.length-k.length} unknown`:'')]:null}],
  ['k-cfx','No FX fee cards',1,0,X=>{const k=X.cs.filter(c=>c.fx!=null);return X.cs.length?[kpiN(k.filter(c=>+c.fx===0).length),`of ${kpiS(X.cs.length,'card')}`+(k.length<X.cs.length?` · ${X.cs.length-k.length} unknown`:'')]:null}],
  ['k-cfavg','Average annual fee',0,0,X=>{const k=X.cs.map(effFee).filter(v=>v!=null);return k.length?[kpiN($$(k.reduce((t,v)=>t+v,0)/k.length)),'Per card, after waivers']:null}],
  ['k-cfwv','Fees waived',0,0,X=>{if(!X.cs.length)return null;const w=X.cs.reduce((t,c)=>{const e=effFee(c);if(e==null||c.fee==null)return t;const n=ADDL(c.id)||0,g=c.fee+(n?n*(c.add||0):0);return t+Math.max(0,g-e)},0);return [kpiN($$(w)),'Per year, list fees less what you pay']}],
  ['k-cfyf','First-year fee waivers',0,0,X=>X.cs.length?[kpiN(X.cs.filter(c=>c.fyf).length),`of ${kpiS(X.cs.length,'card')} waive year one`]:null],
  ['k-cnofee','No-fee cards',0,0,X=>X.cs.length?[kpiN(X.cs.filter(c=>c.fee===0).length),`of ${kpiS(X.cs.length,'card')}, list fee $0`]:null],
  ['k-cnet','Networks',0,0,X=>{const P=kpiCnt(X.cs.map(c=>c.nw));return P.length?[kpiMix(P),kpiS(P.length,'network')]:null}],
  ['k-ckind','Reward types',0,0,X=>{const P=kpiCnt(X.cs.map(c=>c.rt||c.kind));return P.length?[kpiMix(P),kpiS(P.length,'type')]:null}],
  ['k-cbest','Best earn rate',0,1,X=>{if(!X.cs.length)return null;const P=[['groc','Groceries'],['dine','Dining'],['gas','Gas'],['trav','Travel'],['other','Everything else']].map(([k,n])=>{let b=null;X.cs.forEach(c=>{const r=c['r_'+k]!=null?c['r_'+k]*earnMul(c,k):c.other!=null?c.other*earnMul(c,'other'):null;if(r!=null&&(b==null||r>b))b=r});return [n,b]}).filter(x=>x[1]!=null).slice(0,3);return P.length?[kpiHB(P,v=>kpiP(v)+'%'),'Your best held card per category']:null}],
  ['k-ctop','Top-earning card',0,1,X=>{if(!X.wc||!X.tot)return null;let b=null;X.cs.forEach(c=>{const e=cardEarn(c,X.wc);if(!b||e>b.e)b={c,e}});return b?[kpiN($$(b.e)),esc(b.c.n.split(' ').slice(0,2).join(' '))+' · per year']:null}]],
 kbank:[
  ['k-bacc','Accounts held',1,0,X=>X.bk.length?[kpiN(X.bk.length),'At '+kpiS(new Set(X.bk.map(o=>o.a.i)).size,'institution')]:null],
  ['k-bfee','Bank fees',1,0,X=>{const k=X.bk.filter(o=>o.c!=null);return k.length?[kpiN($$(k.reduce((t,o)=>t+o.c,0))),'Per year, at your balances'+(k.length<X.bk.length?` · ${X.bk.length-k.length} unknown`:'')]:null}],
  ['k-bfree','Fee-free accounts',1,0,X=>X.bk.length?[kpiN(X.bk.filter(o=>o.c===0).length),`of ${X.bk.length}, $0 at your balances`]:null],
  ['k-blist','Monthly fees, list',0,0,X=>{const k=X.bk.filter(o=>o.a.fee!=null);return k.length?[kpiN(kpiM(k.reduce((t,o)=>t+o.a.fee,0))),'Per month, before waivers']:null}],
  ['k-brate','Best interest rate',0,0,X=>{let b=null;X.bk.forEach(o=>{const r=rateOf(o.a);if(r&&r.rate!=null&&!isNaN(+r.rate)&&(!b||+r.rate>+b.r.rate))b={o,r}});return X.bk.length?b?[kpiN(esc(b.r.label)),esc(b.o.a.n)]:[kpiX(),'No rate on record']:null}],
  ['k-bint','Interest-paying accounts',0,0,X=>X.bk.length?[kpiN(X.bk.filter(o=>+o.a.intr>0).length),`of ${X.bk.length} pay interest`]:null],
  ['k-btype','Account types',0,0,X=>{const P=kpiCnt(X.bk.map(o=>kpiCap(o.a.ty)));return P.length?[kpiMix(P),kpiS(P.length,'type')]:null}],
  ['k-bseg','Account segments',0,0,X=>{const P=kpiCnt(X.bk.map(o=>kpiCap(o.a.seg)));return P.length?[kpiMix(P),kpiS(X.bk.length,'account')]:null}],
  ['k-busd','USD accounts',0,0,X=>X.bk.length?[kpiN(X.bk.filter(o=>o.a.cur=='USD').length),`of ${X.bk.length} held in USD`]:null],
  ['k-bet','Free e-Transfer',0,0,X=>X.bk.length?[kpiN(X.bk.filter(o=>o.a.et===1).length),`of ${X.bk.length} send free`]:null],
  ['k-binst','Institutions',0,0,X=>{const P=kpiCnt(X.bk.map(o=>o.a.i));return P.length?[kpiN(P.length),'Most at '+esc(P[0][0])+' ('+P[0][1]+')']:null}]],
 kbrok:[
  ['k-racc','Accounts held',1,0,X=>X.br.length?[kpiN(X.br.length),'At '+kpiS(new Set(X.br.map(o=>o.b)).size,'broker')]:null],
  ['k-rtype','Account types',1,0,X=>{const P=kpiCnt(X.br.map(o=>o.t));return P.length?[kpiMix(P),kpiS(P.length,'type')]:null}],
  ['k-rcf','$0 stock trades',1,0,X=>{const B=[...new Set(X.br.map(o=>o.b))];if(!B.length)return null;const s=B.map(b=>BSN(b)||{}),k=s.filter(r=>r.equity_commission_cad!=null);return [kpiN(k.filter(r=>+r.equity_commission_cad===0).length),`of ${kpiS(B.length,'broker')}`+(k.length<B.length?` · ${B.length-k.length} unknown`:'')]}],
  ['k-rreg','Registered accounts',0,0,X=>{if(!X.br.length)return null;const reg=o=>{const b=(D.bacct||[]).find(b=>b.i==o.b),a=b&&b.accts.find(a=>a.t==o.t);return a?(a.reg?'Registered':'Non-registered'):'Unknown'},P=kpiCnt(X.br.map(reg));return [kpiN(X.br.filter(o=>reg(o)=='Registered').length)+kpiMix(P),`of ${kpiS(X.br.length,'account')}`]}],
  ['k-rbrk','Brokers',0,0,X=>{const P=kpiCnt(X.br.map(o=>o.b));return P.length?[kpiN(P.length),'Most at '+esc(P[0][0])+' ('+P[0][1]+')']:null}],
  ['k-rcom','Stock trade commission',0,0,X=>{const v=[...new Set(X.br.map(o=>o.b))].map(b=>(BSN(b)||{}).equity_commission_cad).filter(v=>v!=null).map(Number);if(!X.br.length)return null;if(!v.length)return [kpiX(),'Not on record'];const lo=Math.min(...v),hi=Math.max(...v);return [kpiN(lo==hi?kpiM(lo):kpiM(lo)+'–'+kpiM(hi).slice(1)),'Per trade at your brokers']}],
  ['k-rmiss','Unheld registered types',0,0,X=>{if(!X.br.length)return null;const held=new Set(X.br.map(o=>o.t)),off=new Set();X.br.forEach(o=>{const b=(D.bacct||[]).find(b=>b.i==o.b);(b?b.accts:[]).forEach(a=>{if(a.reg&&!held.has(a.t))off.add(a.t)})});const L=[...off].sort();return [kpiN(L.length),L.length?esc(L.slice(0,4).join(', ')+(L.length>4?' …':'')):'You hold every type offered']}],
  ['k-rmargin','Margin accounts',0,0,X=>X.br.length?[kpiN(X.br.filter(o=>o.t=='MARGIN').length),`of ${kpiS(X.br.length,'account')}`]:null],
  ['k-rusd','USD-capable brokers',0,0,X=>{const B=[...new Set(X.br.map(o=>o.b))];if(!B.length)return null;const k=B.filter(b=>(BSN(b)||{}).usd_accounts);return [kpiN(k.length),`of ${kpiS(B.length,'broker')} offer USD`+(k.length<B.length?' · rest not stated':'')]}]],
 kloy:[
  ['k-lprog','Programs',1,0,X=>X.lp.length?[kpiN(X.lp.length),kpiS(X.lp.filter(o=>o.bal!=null).length,'with a balance','with a balance')]:null],
  ['k-pts','Points value',1,1,X=>{const v=X.lp.filter(o=>o.v!=null);if(!X.lp.length)return null;return v.length?[kpiN($$(v.reduce((t,o)=>t+o.v,0))),`${kpiS(v.length,'program')} at baseline ¢/pt`]:[kpiX(),`<button type=button class=lnk data-s=wallet>Add points balances</button>`]}],
  ['k-ltype','Program types',1,0,X=>{const P=kpiCnt(X.lp.map(o=>o.p&&o.p.type).filter(Boolean));return P.length?[kpiMix(P),kpiS(P.length,'type')]:null}],
  ['k-lbal','Balances entered',0,0,X=>X.lp.length?[kpiN(X.lp.filter(o=>o.bal!=null).length),`of ${kpiS(X.lp.length,'program')}`]:null],
  ['k-ltot','Points balance',0,0,X=>{const k=X.lp.filter(o=>o.bal!=null&&!o.cash);if(!X.lp.length)return null;return k.length?[kpiN(k.reduce((t,o)=>t+o.bal,0).toLocaleString()),`Across ${kpiS(k.length,'program')}, mixed units`]:[kpiX(),`<button type=button class=lnk data-s=wallet>Add points balances</button>`]}],
  ['k-ltop','Highest-value program',0,1,X=>{const k=X.lp.filter(o=>o.v!=null).sort((a,b)=>b.v-a.v);if(!X.lp.length)return null;return k.length?[kpiN($$(k[0].v)),esc(k[0].n)]:[kpiX(),`<button type=button class=lnk data-s=wallet>Add points balances</button>`]}],
  ['k-lcpp','Best ¢/pt',0,1,X=>{const k=X.lp.filter(o=>o.p&&o.p.cpp!=null&&!o.cash).sort((a,b)=>b.p.cpp-a.p.cpp);return X.lp.length?k.length?[kpiN(kpiP(k[0].p.cpp)+'¢/pt'),esc(k[0].n)+' · baseline']:[kpiX(),'No value on record']:null}],
  ['k-lavg','Average ¢/pt',0,1,X=>{const k=X.lp.filter(o=>o.p&&o.p.cpp!=null&&!o.cash);return X.lp.length?k.length?[kpiN(kpiP(k.reduce((t,o)=>t+o.p.cpp,0)/k.length)+'¢/pt'),`Across ${kpiS(k.length,'points program')}`]:[kpiX(),'No value on record']:null}],
  ['k-lcash','Cash-value programs',0,0,X=>X.lp.length?[kpiN(X.lp.filter(o=>o.cash).length),`of ${kpiS(X.lp.length,'program')} pay in cash`]:null],
  ['k-lcard','Earned by your cards',0,0,X=>{if(!X.lp.length)return null;const L=X.lp.filter(o=>{const a=String(o.x.i).toLowerCase().replace(/\s*\(.*\)$/,'');return X.cs.some(c=>c.prog&&String(c.prog).toLowerCase().includes(a))});return [kpiN(L.length),`of ${kpiS(X.lp.length,'program')} earn from a held card`]}]],
 ksubs:[
  ['k-scount','Subscriptions',1,0,X=>X.sv.length?[kpiN(X.sv.length),kpiS(X.sv.filter(o=>o.mo!=null).length,'price','prices')+' on record']:null],
  ['k-smo','Monthly cost',1,0,X=>{const k=X.sv.filter(o=>o.mo!=null);return k.length?[kpiN(kpiM(k.reduce((t,o)=>t+o.mo,0))),'Per month, at your plans'+(k.length<X.sv.length?` · ${X.sv.length-k.length} unknown`:'')]:null}],
  ['k-syr','Annual cost',1,0,X=>{const k=X.sv.filter(o=>o.yr!=null);return k.length?[kpiN($$(k.reduce((t,o)=>t+o.yr,0))),'Per year, at your plans']:null}],
  ['k-stop','Most expensive',0,0,X=>{const k=X.sv.filter(o=>o.mo!=null).sort((a,b)=>b.mo-a.mo);return k.length?[kpiN(kpiM(k[0].mo)),esc(k[0].n)+' · per month']:null}],
  ['k-savg','Average subscription',0,0,X=>{const k=X.sv.filter(o=>o.mo!=null);return k.length?[kpiN(kpiM(k.reduce((t,o)=>t+o.mo,0)/k.length)),'Per month, per service']:null}],
  ['k-sbar','Biggest subscriptions',0,0,X=>{const k=X.sv.filter(o=>o.mo!=null).sort((a,b)=>b.mo-a.mo).slice(0,3);return k.length?[kpiHB(k.map(o=>[o.n,o.mo]),kpiM),'Per month']:null}],
  ['k-sann','Billed yearly',0,0,X=>X.sv.length?[kpiN(X.sv.filter(o=>o.per=='year').length),`of ${kpiS(X.sv.length,'subscription')}`]:null],
  ['k-sshare','Share of spending',0,0,X=>{const k=X.sv.filter(o=>o.mo!=null),m=k.reduce((t,o)=>t+o.mo,0);return k.length&&X.tot?[kpiN(Math.round(m/X.tot*100)+'%'),'Subscriptions ÷ monthly spend']:null}]],
 kspend:[
  ['k-spm','Monthly spend',1,0,X=>X.tot?[kpiN($$(X.tot)),$$(X.tot*12)+' a year']:null],
  ['k-top','Top categories',1,0,X=>X.SP.length?[kpiHB(X.SP.slice(0,3)),`${esc(X.SP[0][0])} is ${Math.round(X.SP[0][1]/X.tot*100)}% of spend`]:null],
  ['k-rew','Annual rewards',1,1,X=>X.rew!=null?[kpiN($$(X.rew)),'Your cards at your spending']:null],
  ['k-mix','Spending mix',0,0,X=>{if(!X.SP.length)return null;const dm=X.SP.slice(0,3).concat(X.SP.length>3?[['Other',X.SP.slice(3).reduce((t,x)=>t+x[1],0)]]:[]);return [`<span class=kpidw>${kpiDonut(dm)}${kpiLeg(dm.map(([n,v])=>[n,Math.round(v/X.tot*100)+'%']))}</span>`,kpiS(X.SP.length,'category','categories')]}],
  ['k-rate','Rewards rate',0,1,X=>X.rew!=null&&X.tot?[kpiN((X.rew/(X.tot*12)*100).toFixed(2)+'%'),'Rewards ÷ annual spend']:null],
  ['k-spy','Annual spend',0,0,X=>X.tot?[kpiN($$(X.tot*12)),$$(X.tot)+' a month']:null],
  ['k-scat','Categories with spend',0,0,X=>X.SP.length?[kpiN(X.SP.length),kpiS(X.st.length,'store')+' included']:null],
  ['k-sstore','Retail spend',0,0,X=>X.tot?[kpiN($$(X.st.reduce((t,x)=>t+x[1],0))),'Per month at '+kpiS(X.st.length,'store')]:null],
  ['k-snet','Net rewards',0,1,X=>X.rew!=null&&X.wc?[kpiN((X.rew-X.wc.fees<0?'−':'')+$$(Math.abs(X.rew-X.wc.fees))),'Per year, rewards less card fees']:null],
  ['k-sbycard','Rewards by card',0,1,X=>{if(X.rew==null)return null;const P=X.cs.map(c=>[c.n.split(' ').slice(0,2).join(' '),cardEarn(c,X.wc)]).filter(x=>x[1]>0).sort((p,q)=>q[1]-p[1]).slice(0,3);return P.length?[kpiHB(P),'Per year, top '+P.length]:null}]]};
const KSEC=[['kcards','pw-kcards','Credit cards'],['kbank','pw-kbank','Banking'],['kbrok','pw-kbrok','Brokers'],['kloy','pw-kloy','Loyalty'],['ksubs','pw-ksubs','Subscriptions'],['kspend','pw-kspend','Spending']];
/* shown KPI ids for a group: wallet.kpis[g] when saved, else the suggested defaults; unknown ids drop out */
const kpiOn=g=>{const L=KLIB[g],s=((STO.wallet.kpis||{})[g]);return Array.isArray(s)?s.filter(id=>L.some(x=>x[0]==id)):L.filter(x=>x[2]).map(x=>x[0])};
const kpiSet=(g,ids)=>{const K=STO.wallet.kpis&&typeof STO.wallet.kpis=='object'&&!Array.isArray(STO.wallet.kpis)?{...STO.wallet.kpis}:{};K[g]=[...new Set(ids)];STO.wallet.kpis=K;STO.wallet.updated_at=NOW();saveS()};
const kpiTile=(X,g,d,rm)=>{const r=d[4](X);return kpiT(d[0],d[1],r?r[0]:kpiX(),r?r[1]:kpiA(g),d[3]&&r&&!/kpid/.test(r[0]),rm?g:'')};
function profKPIs(X=kpiCtx()){
 const sec=([g,id,n])=>{const on=kpiOn(g),L=ORD(g,on.map(k=>KLIB[g].find(x=>x[0]==k)),x=>x[0]);return `<section class="psec acs${ACO(g)?' acol':''}" id=${id}>${ACH(g,id,n,L.length,1,'kp:'+g)}<div class="tiles ptiles kpis" id=${id}-t${ACO(g)?' hidden':''}>${L.map(d=>kpiTile(X,g,d,1)).join('')}${L.length?'':`<p class="mute kpie">No KPIs shown. Use + to add some.</p>`}</div></section>`};
 return SECORD(KSEC.map(sec),'profileSectionOrder')}
function renderProfile(){
 $('#view').innerHTML=`<div class="prof pstack wsimple"><div class=vhead><h2>Dashboard <button type=button class=wplus data-kpw aria-haspopup=dialog aria-label="Add KPIs" title="Add KPIs"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button></h2></div><p class=lead>Your numbers at a glance, from your <button type=button class=lnk data-s=wallet>Accounts</button> and <button type=button class=lnk data-s=spending>Spending</button>. Use × to remove a tile and + to add one.</p>
 ${profKPIs()}</div>`;if(KPW.o)kpwDraw()}
/* KPI picker (Andrew 2026-11-03): same window as Accounts / Spending +. The Dashboard + starts at step 1 (which section, single tap), a section + opens step 2 for that section:
   live tiles of the KPIs not shown, tap to select (✓), Done adds them at the end of the section. */
const KPW={o:false,step:1,g:null,sel:new Set(),from:null};
function kpwDraw(){let h=document.querySelector('#kpww');if(!KPW.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='kpww';document.body.append(h)}
 const two=KPW.step==2,g=KPW.g,S=KSEC.find(s=>s[0]==g),X=kpiCtx(),off=g?KLIB[g].filter(d=>!kpiOn(g).includes(d[0])):[];
 const body=!two?`<div class="tiles ptiles wzt" role=radiogroup aria-label="Which section">${KSEC.map(([k,,n])=>{const m=KLIB[k].length-kpiOn(k).length;return `<div class="btile kpsec" tabindex=0 data-kpwt=${k} role=radio aria-checked=false><span class=bn>${esc(n)}</span><span class="bf mute">${m?kpiS(m,'KPI')+' to add':'All shown'}</span></div>`}).join('')}</div>`
  :off.length?`<div class="tiles ptiles wzs kpis">${off.map(d=>{const sl=KPW.sel.has(d[0]);return kpiTile(X,g,d,0).replace('<div class="btile kpi"',`<div class="btile kpi kpk${sl?' on':''}" role=checkbox aria-checked=${sl} data-kpwk=${d[0]}`).replace(/<\/div>$/,`<span class=bmk>${sl?'✓':''}</span></div>`)}).join('')}</div>`:`<p class=mute>Every ${esc(S[2])} KPI is on your Dashboard.</p>`;
 const ft=two?`<button type=button class=btn2 data-kpwback>Back</button><button type=button class=btn data-kpwadd>Done</button>`:`<button type=button class=btn2 data-kpwx>Cancel</button>`;
 h.innerHTML=`<div id=wzbg data-kpwx></div><div id=wiz role=dialog aria-modal=true aria-labelledby=kpwh><div class=wzhd><span class=wzst>Step ${KPW.step} of 2 · Dashboard</span><h3 id=kpwh>${two?'Add '+esc(S[2])+' KPIs':'Which section?'}</h3><button type=button class=wzx data-kpwx aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft>${ft}</div></div>`;document.body.classList.add('wzopen')}
function kpwClose(){KPW.o=false;kpwDraw();(KPW.from&&KPW.from.isConnected?KPW.from:document.querySelector('[data-kpw]'))?.focus()}
{const act=t=>{
  if(t.matches('[data-kpw]')){const g=t.dataset.kpw;Object.assign(KPW,{o:true,step:g&&KLIB[g]?2:1,g:g&&KLIB[g]?g:null,sel:new Set(),from:t});kpwDraw();document.querySelector('#kpww [data-kpwk],#kpww [data-kpwt],#kpww [data-kpwback]')?.focus();return}
  if(t.matches('[data-kpwx]'))return kpwClose();
  if(t.matches('[data-kpwt]')){KPW.g=t.dataset.kpwt;KPW.step=2;KPW.sel=new Set();kpwDraw();document.querySelector('#kpww [data-kpwk],#kpww [data-kpwback]')?.focus();return}
  if(t.matches('[data-kpwback]')){KPW.step=1;kpwDraw();document.querySelector(`#kpww [data-kpwt=${KPW.g}]`)?.focus();return}
  if(t.matches('[data-kpwk]')){const k=t.dataset.kpwk;KPW.sel.has(k)?KPW.sel.delete(k):KPW.sel.add(k);kpwDraw();document.querySelector(`#kpww [data-kpwk="${k}"]`)?.focus();return}
  if(t.matches('[data-kpwadd]')){const g=KPW.g;if(KPW.sel.size)kpiSet(g,[...kpiOn(g),...KLIB[g].map(d=>d[0]).filter(k=>KPW.sel.has(k))]);KPW.o=false;kpwDraw();const y=scrollY;render();scrollTo(0,y);document.querySelector(`#pw-${g} [data-kpw]`)?.focus();return}
  if(t.matches('[data-kpirm]')){const[g,k]=t.dataset.kpirm.split('|');if(!KLIB[g])return;kpiSet(g,kpiOn(g).filter(x=>x!=k));const y=scrollY;render();scrollTo(0,y);document.querySelector(`#pw-${g} [data-kpw]`)?.focus();return}};
 const SEL='[data-kpw],[data-kpwx],[data-kpwt],[data-kpwback],[data-kpwk],[data-kpwadd],[data-kpirm]';
 document.addEventListener('click',e=>{const t=e.target.closest(SEL);if(t){e.preventDefault();e.stopImmediatePropagation();act(t)}},true);
 document.addEventListener('keydown',e=>{if(KPW.o&&e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();kpwClose();return}const t=e.target.closest?.('[data-kpwk],[data-kpwt]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();act(t)}},true)}
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
const wxPayload=()=>{saveS();const extra={};try{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k&&k.startsWith('ptt.')&&k!=SK&&k!='ptt.sync'&&!OLDK.includes(k)&&!KEEP_LS.has(k))extra[k]=sessionStorage.getItem(k)}}catch(e){}return{format:'pertheterms-wallet',v:1,exported_at:NOW(),app_version:D.ver||null,state:JSON.parse(JSON.stringify(STO)),extra}};
const WXS=[['cards','Cards'],['banks','Bank accounts'],['brokerage','Brokerage'],['tel','Telecom'],['ins','Insurance'],['points','Loyalty'],['services','Perks'],['gcards','Gift Cards'],['archive','Archive (closed)'],['history_log','History entries']];
const wxCounts=st0=>{const w=st0.wallet||{};return WXS.map(([k,l])=>[l,(w[k]||[]).length])};
/* B23 (2026-11-05): match list items by INSTANCE key (x.k, as IKEY), not by product id: two tiles of the same account (bank-x#ab12, bank-x#cd34) are two items.
   Matching by id collapsed them on every merge, migS then re-keyed the duplicate with a random #k, the value changed, was re-sent, echoed back and merged again: a re-render every ~2 s while idle. */
const wxHid=(k,x)=>typeof x=='string'?x:!x?null:x.k||(k=='cards'||k=='banks'?x.id:(x.id||x.i));
const wxT=x=>x&&typeof x=='object'?Date.parse(x.updated_at||x.closed||x.added_at||'')||0:0;
/* one list item vs another with the same id: newer edit time wins; on a tie, the copy that holds a balance (bal) wins, then the one with more fields (2026-11-03, cross-device loyalty balances) */
const wxHasB=x=>x&&typeof x=='object'&&x.bal!=null&&x.bal!=='';
const wxPick=(a,b)=>{const ta=wxT(a),tb=wxT(b);if(ta!=tb)return tb>ta?b:a;if(wxHasB(a)!=wxHasB(b))return wxHasB(b)?b:a;return typeof b=='object'&&b&&typeof a=='object'&&a&&Object.keys(b).length>Object.keys(a).length?b:a};
/* a list key from the server (later syncs): server membership wins (keeps deletes), each shared item takes the newer copy, and a local-only item edited after the server write (st) is kept */
function wxList(k,loc,srv,st){if(!Array.isArray(srv)||!Array.isArray(loc)||k=='history_log')return srv;const L=new Map(loc.map(x=>[wxHid(k,x),x])),S=new Set(srv.map(x=>wxHid(k,x)));const out=srv.map(x=>{const id=wxHid(k,x),y=id==null?null:L.get(id);return y===undefined||y===null?x:wxPick(y,x)});const T=Date.parse(st||'')||0;loc.forEach(x=>{const id=wxHid(k,x);if(id!=null&&!S.has(id)&&wxT(x)>T)out.push(x)});return out}
function wxMerge(cur,inc){const o=JSON.parse(JSON.stringify(cur)),iw=inc.wallet||{};o.wallet=o.wallet||{};
 for(const[k]of WXS){if(k=='history_log'){const seen=new Set((o.wallet[k]||[]).map(x=>JSON.stringify(x)));o.wallet[k]=(o.wallet[k]||[]).concat((iw[k]||[]).filter(x=>!seen.has(JSON.stringify(x))));continue}
  const A=(o.wallet[k]||[]).slice(),ix=new Map(A.map((x,i)=>[wxHid(k,x),i]));for(const x of iw[k]||[]){const id=wxHid(k,x);if(id==null)continue;if(!ix.has(id)){ix.set(id,A.length);A.push(x)}else A[ix.get(id)]=wxPick(A[ix.get(id)],x)}if(A.length||iw[k])o.wallet[k]=A}
 const newer=(Date.parse((inc.wallet||{}).updated_at||inc.updated_at||'')||0)>(Date.parse(o.wallet.updated_at||o.updated_at||'')||0);
 {const a=o.wallet.svcadded||{},b=iw.svcadded||{},m={...b,...a};Object.keys(b).forEach(k=>{if(a[k]&&b[k]<a[k])m[k]=b[k]});if(Object.keys(m).length)o.wallet.svcadded=m}/* B19: earliest added time wins */
 if(newer){if(iw.spend)o.wallet.spend={...o.wallet.spend,...iw.spend};if(iw.profile)o.wallet.profile={...o.wallet.profile,...iw.profile};o.wallet.updated_at=iw.updated_at||NOW()}
 return o}
function wxGuestMerge(cur,inc){/* first sign-in from a guest tab: server wins on conflicts; guest-only holdings are kept (deduped) */
 const o=JSON.parse(JSON.stringify(cur)),iw=inc.wallet||{};o.wallet=o.wallet||{};
 for(const[k]of WXS){if(iw[k]===undefined)continue;if(k=='history_log'){const seen=new Set((o.wallet[k]||[]).map(x=>JSON.stringify(x)));o.wallet[k]=(Array.isArray(iw[k])?iw[k]:[]).concat((o.wallet[k]||[]).filter(x=>!seen.has(JSON.stringify(x))));continue}
  const srv=Array.isArray(iw[k])?iw[k]:[],loc=o.wallet[k]||[],S=new Set(srv.map(x=>wxHid(k,x))),out=srv.slice();
  loc.forEach(x=>{const id=wxHid(k,x);if(id!=null&&!S.has(id))out.push(x)});o.wallet[k]=out}
 for(const k of Object.keys(iw)){if(WXS.some(([w])=>w==k))continue;const loc=o.wallet[k],srv=iw[k];
  if(srv&&typeof srv=='object'&&!Array.isArray(srv)&&loc&&typeof loc=='object'&&!Array.isArray(loc))o.wallet[k]={...loc,...srv};/* per-field: server overwrites conflicts; guest-only keys stay */
  else o.wallet[k]=srv}
 return o}
/* B24 (Andrew 2026-11-05): a repaint the user did not cause (sync pull, Kubera) never runs while a popup/dialog is open or a text control has focus:
   it waits in UIQ and runs once when the UI is free (popup closed, focus left). A user render clears the pending one (it already shows the new data). */
const uiBusy=()=>{if(document.body.classList.contains('wzopen')||document.querySelector('dialog[open],#pdfm,#mbg.on'))return true;const a=document.activeElement;
 return !!a&&(a.matches('textarea,select,[contenteditable=""],[contenteditable=true]')||a.matches('input')&&!/^(checkbox|radio|button|submit|reset|range|color|file|image)$/.test(a.type))};
const UIQ=new Map(),uiLater=(k,f)=>{if(uiBusy())UIQ.set(k,f);else f()},
 uiFlush=()=>setTimeout(()=>{if(!UIQ.size||uiBusy())return;const L=[...UIQ.values()];UIQ.clear();L.forEach(f=>f())},0);
['focusout','click','keyup','close'].forEach(e=>document.addEventListener(e,uiFlush,true));
function wxApply(next,extra,mode){for(const[k,v]of Object.entries(extra||{})){if(!k.startsWith('ptt.')||k==SK||k=='ptt.sync'||KEEP_LS.has(k))continue;if(mode=='replace'||storeGet(k)==null)try{storeSet(k,v)}catch(e){}}
 const j0=JSON.stringify(STO);STO=migS(next);W.cards=STO.wallet.cards.map(x=>x.id).filter(i=>C.some(c=>c.id==i));W.spend={...STO.wallet.spend};saveS();if(mode=='sync'){if(JSON.stringify(STO)!=j0)uiLater('render',render)}else render()}/* B23: a sync merge that changed nothing does not repaint; B24: a sync change waits for a free UI */
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
function renderPoints(){const v=$('#view'),mine=new Set((STO.wallet.points||[]).map(x=>(ptsBy(x.i)||{}).id)),L=PTS.filter(p=>(p.cat!='issuer'&&!p.hid)||mine.has(p.id)).sort((a,b)=>mine.has(b.id)-mine.has(a.id)||(b.cpp??-1)-(a.cpp??-1)||a.n.localeCompare(b.n));
 v.innerHTML=skel('Loyalty','Your programs: balance × estimated cents per point. Catalogue: every program, its estimated value per point, where you earn and where you can transfer.',[['Your programs',(STO.wallet.points||[]).length],['Your est. value',$$((STO.wallet.points||[]).reduce((t,x)=>t+(ptsVal(x)||0),0))],['Programs on record',PTS.length],['Transfer routes',PTS.reduce((t,p)=>t+p.tx.length,0)]],
 `<section class=psec data-progs>${pwSec(['points','Your programs'])}</section><div><h3 class=ptscat>All programs</h3><table class=vt data-ptstable><tr><th class=l>Program</th><th class=l>Type</th><th>Est. value</th><th class=l>Earn from</th><th class=l>Transfers to</th></tr>${L.map(p=>`<tr data-pts="${esc(p.id)}"><td class=l><b>${esc(p.n)}</b>${mine.has(p.id)?' <i class=phld><span class=y>✓</span> yours</i>':''}<br><small class=mute>${esc(p.op)}</small></td><td class=l>${esc(p.type)}</td><td>${p.cpp!=null?`<b>${p.cpp.toFixed(2)}¢</b>${ip(esc(p.cppm||''))}`:'<span class=q title="No sourced estimate yet">—</span>'}</td><td class=l><small>${esc((p.earn||'').replace(/not_stated/g,'').replace(/[;,]\s*$/,''))||'—'}</small></td><td class=l><small>${p.tx.length?p.tx.map(t=>`${esc(t.n)} <span class=mute>${esc(t.rate)}</span>`).join('<br>'):'—'}</small></td></tr>`).join('')}</table></div>`,'')}
document.addEventListener('change',e=>{const k=e.target.dataset.ptbal;if(k==null)return;const x=(STO.wallet.points||[]).find(r=>r.i==k);if(!x)return;const b0=x.bal;x.bal=e.target.value===''?null:Math.max(0,+e.target.value);if(x.bal!==b0)x.updated_at=NOW();STO.wallet.updated_at=NOW();saveS();setTimeout(render,0)});/* deferred: change can fire from blur, and replacing the blurring node mid-event throws */


document.addEventListener('submit',e=>{const f=e.target.closest('[data-wadd]');if(!f)return;e.preventDefault();wAdd(f.dataset.wadd,f.v.value)});
document.addEventListener('click',e=>{const r=e.target.closest('[data-wrm][data-wk]');if(r){e.stopImmediatePropagation();wRm(r.dataset.wrm,r.dataset.wk);return}/* card tiles carry data-wrm=<card id> without data-wk; the card handler owns those */const g=e.target.closest('[data-gow]');if(g){st.pl=g.dataset.gow;st.s='wfolder';st.card=null;render();return}
 if(e.target.closest('[data-exp]')){const b=new Blob([JSON.stringify(STO,null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pertheterms-my-data-'+NOW().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2e3)}});
document.addEventListener('change',e=>{if(!e.target.matches('[data-imp]'))return;const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const o=JSON.parse(t);if(!o||!o.wallet)throw 0;STO=migS(o);W.cards=STO.wallet.cards.map(x=>x.id);W.spend={...STO.wallet.spend};saveS();render();alert('Imported')}catch(_){alert('Not a PerTheTerms export')}})});
/* Profile (Andrew 2026-11-05 B21): Accounts-style tiles for personal info.
   Tile 1 permanent Name+Email from Google (AUTH/syState), read-only. Then any ptiles the user added (✕ delete, added_at invisible).
   Add is the header + (HDTV, the same toolbar button as Accounts / Spending / Subscriptions; data-pfadd opens this picker). Clicking an info tile opens #cset (.csrow) to edit, with a plain-language note on what the field is used for.
   Values live in wallet.profile (PRF); which tiles are shown lives in wallet.ptiles [{k,added_at}] and syncs like the rest of the wallet.
   The grid is the shared Accounts / Spending / Subscriptions one (section.acs > .tiles.ptiles: five 220px tracks, equal side padding, 12px gaps). Tile order is wallet.order.ptiles via the shared B22 drag (RG pw-metiles); a removed key stays in that list so adding the tile again puts it back. A drop only moves the node — no render — and a popup or focused field still defers sync repaints (uiLater). */
const PROVN={AB:'Alberta',BC:'British Columbia',MB:'Manitoba',NB:'New Brunswick',NL:'Newfoundland and Labrador',NS:'Nova Scotia',NT:'Northwest Territories',NU:'Nunavut',ON:'Ontario',PE:'Prince Edward Island',QC:'Quebec',SK:'Saskatchewan',YT:'Yukon'};
const PIN_INC=BAND([0,40000,60000,80000,100000,150000],v=>v?'$'+(v/1000)+'k+':'Under $40k');
const PIN_HINC=BAND([0,60000,100000,150000,200000],v=>v?'$'+(v/1000)+'k+':'Under $60k');
const PIN_AUM=BAND([0,10000,25000,50000,100000,250000,500000,1000000],v=>v?'$'+(v>=1e6?v/1e6+'M':v/1000+'k')+'+':'Under $10k');
const PIN_CS=[['300-579','300–579 · Poor'],['580-669','580–669 · Fair'],['670-739','670–739 · Good'],['740-799','740–799 · Very good'],['800-900','800–900 · Excellent']];
const PIN_SP=BAND([0,500,1000,2000,3000,5000,8000],v=>v?'$'+(v>=1000?(v/1000)+'k':v)+'+ /mo':'Under $500 /mo');
const PIN_FEE=[['0','Prefer $0'],['low','Up to ~$120'],['mid','Up to ~$250'],['any','Any fee if it pays']];
const PIN_CAT=[['groc','Groceries'],['gas','Gas'],['dine','Dining'],['trav','Travel'],['bills','Bills'],['online','Online'],['other','Other']];
/* notes: use established site thresholds only (Visa Infinite $60k/$100k, World Elite $80k/$150k). Never invent Privilege or other cut-offs. */
const PINFO=[
 {g:'Location',fs:[
  {k:'prov',l:'Province',t:'select',starter:1,o:PROVS.map(p=>[p,PROVN[p]||p]),note:'Used to refine which provincial promos, bank products and telecom plans apply to you.'},
  {k:'pcode',l:'Postal code',t:'text',ph:'First 3 characters',max:3,note:'The first three characters narrow urban/rural and local offers. Optional.'},
  {k:'urban',l:'Urban / rural',t:'select',o:[['urban','Urban'],['suburban','Suburban'],['rural','Rural']],note:'Helps match branch access, delivery and regional promos.'}]},
 {g:'Household',fs:[
  {k:'marital',l:'Marital status',t:'select',starter:1,o:[['single','Single'],['common','Common-law'],['married','Married'],['separated','Separated'],['divorced','Divorced'],['widowed','Widowed']],note:'Used for joint accounts, additional cards and household income tests.'},
  {k:'kids',l:'Number of kids (plus ages)',t:'kids',starter:1,note:'Youth and student accounts, RESP offers and family plans use this.'},
  {k:'hhsize',l:'Household size',t:'number',note:'Total people in your household. Used for family and multi-line offers.'}]},
 {g:'Age & status',fs:[
  {k:'byear',l:'Birth year',t:'number',starter:1,min:1920,max:2010,note:'Age bands drive senior, student and youth eligibility without storing a full birth date.'},
  {k:'young',l:'Student',t:'check',note:'Student and youth accounts and their sign-up offers.'},
  {k:'newcomer',l:'Newcomer (years in Canada)',t:'select',o:[['0','Under 1 year'],['1','1–2 years'],['2','2–5 years'],['5','5+ years']],note:'Newcomer banking and credit-builder products look for recent arrivals.'},
  {k:'retired',l:'Retired',t:'check',note:'Senior and retirement products, fee waivers and income tests.'}]},
 {g:'Income',fs:[
  {k:'inc',l:'Personal income range',t:'select',num:1,starter:1,o:PIN_INC,note:'Visa Infinite cards usually need $60,000 personal or $100,000 household income; World Elite usually $80,000 / $150,000. Not published by every issuer.'},
  {k:'hinc',l:'Household income range',t:'select',num:1,o:PIN_HINC,note:'Used with personal income for Infinite and World Elite income tests ($60k/$100k and $80k/$150k).'},
  {k:'dd',l:'Payroll direct deposit possible',t:'check',note:'Many bank sign-up bonuses need a recurring payroll deposit.'}]},
 {g:'Wealth',fs:[
  {k:'aum',l:'Investable assets range',t:'select',num:1,o:PIN_AUM,note:'Broker % match and tiered cash offers scale with investable assets you could move.'},
  {k:'home',l:'Home owner / renter',t:'select',o:[['own','Owner'],['rent','Renter']],note:'Mortgage, tenant insurance and home-equity offers.'},
  {k:'ftb',l:'First-time buyer intent',t:'check',note:'First-time home buyer and FHSA-style offers.'}]},
 {g:'Credit',fs:[
  {k:'cscore',l:'Credit score range',t:'select',starter:1,o:PIN_CS,note:'Used to refine which new-card and loan offers are realistic for you. Optional and never shared off this device.'},
  {k:'opencards',l:'Open to new cards',t:'check',note:'When off, new-card promos stay out of your eligible list.'},
  {k:'feetol',l:'Annual fee tolerance',t:'select',o:PIN_FEE,note:'Filters premium cards whose fee is above what you will pay.'}]},
 {g:'Spending',fs:[
  {k:'cspend',l:'Monthly card spend',t:'select',num:1,starter:1,o:PIN_SP,note:'Rough monthly card spend for promo and rewards sizing. Detailed categories live in Spending.'},
  {k:'topcats',l:'Top categories',t:'multi',o:PIN_CAT,note:'Where most of your card spend goes — used to rank category earn rates.'},
  {k:'grocery',l:'Primary grocery store',t:'text',ph:'e.g. Loblaws, Costco',note:'Store-specific grocery cards and offers.'},
  {k:'gasbrand',l:'Gas brand',t:'text',ph:'e.g. Petro-Canada, Shell',note:'Gas co-brand and station-linked offers.'}]},
 {g:'Travel',fs:[
  {k:'trips',l:'Trips per year',t:'number',note:'Travel insurance value and trip-cancellation offers scale with how often you fly.'},
  {k:'travtype',l:'Domestic vs international',t:'select',o:[['dom','Mostly domestic'],['mix','Mix'],['int','Mostly international']],note:'FX fee and international insurance matter more for overseas trips.'},
  {k:'airport',l:'Home airport',t:'text',ph:'e.g. YYZ',note:'Lounge and airport offers near your home airport.'},
  {k:'airline',l:'Airline preference',t:'text',ph:'e.g. Air Canada',note:'Co-brand airline cards and transfer partners.'}]},
 {g:'Loyalty',fs:[
  {k:'ptspref',l:'Preferred points programs',t:'multi',o:PTSP.slice(0,12).map(n=>[n,n]),note:'Ranks transfer partners and co-brand cards you already care about.'}]},
 {g:'Telecom',fs:[
  {k:'carrier',l:'Carrier',t:'text',ph:'e.g. Rogers, Bell, Freedom',note:'Multi-line and carrier-bundle promos.'},
  {k:'lines',l:'Lines',t:'number',note:'Family and multi-line discounts.'},
  {k:'data',l:'Data needs',t:'select',o:[['low','Under 10 GB'],['mid','10–50 GB'],['high','50 GB+'],['unl','Unlimited']],note:'Plan matching for your data use.'}]},
 {g:'Insurance',fs:[
  {k:'car',l:'Car owned',t:'check',note:'Auto insurance and roadside offers.'},
  {k:'homeins',l:'Home / tenant policy',t:'check',note:'Bundle discounts with home or tenant insurance.'}]},
 {g:'Business',fs:[
  {k:'biz',l:'Self-employed / incorporated',t:'select',o:[['no','No'],['self','Self-employed'],['inc','Incorporated']],note:'Business cards, sole-prop banking and incorporation offers.'}]},
 {g:'Banking',fs:[
  {k:'pbank',l:'Primary bank',t:'text',ph:'e.g. Tangerine, TD',note:'Relationship pricing and switch bonuses at your main bank.'}]}
];
const PINFO_ALL=PINFO.flatMap(g=>g.fs.map(f=>({...f,g:g.g})));
const PINFO_BY=k=>PINFO_ALL.find(f=>f.k==k);
const PINFO_STARTER=PINFO_ALL.filter(f=>f.starter).map(f=>f.k);
const ptiles=()=>{const A=STO.wallet.ptiles;return Array.isArray(A)?A.filter(x=>x&&x.k&&PINFO_BY(x.k)):(STO.wallet.ptiles=[],[])};
const ptilesSet=A=>{STO.wallet.ptiles=A;STO.wallet.updated_at=NOW();saveS()};
const pfAcct=()=>{let S={};try{S=syState||{}}catch(e){}let m={};try{m=JSON.parse(storeGet('ptt.sync')||'{}')||{}}catch(e){}
 return{email:S.email||m.email||'',first:S.first||m.first||''}};
const pfDisp=f=>{const P=PRF();if(f.t=='kids'){const n=+P.kidsN||0,a=P.kids||[];return n?n+' kid'+(n==1?'':'s')+(a.length?' · '+a.join(', '):''):'';}
 if(f.t=='check')return P[f.k]?'Yes':'';if(f.t=='multi'){const a=P[f.k]||[];return a.length?a.map(v=>((f.o||[]).find(x=>String(x[0])===String(v))||[v,v])[1]).join(', '):''}
 const v=P[f.k];if(v==null||v==='')return '';if(f.t=='select'){const o=(f.o||[]).find(x=>String(x[0])===String(v));return o?o[1]:String(v)}return String(v)};
function pfAccountTile(){const A=pfAcct(),em=A.email,fn=A.first;
 return `<div class="btile pf pfacc" data-ptile=acct data-ok=acct tabindex=0 aria-label="Name and email"><span class=bn>Name and email</span>${em?`<span class=pv title="${esc(em)}">${esc(fn||em.split('@')[0])}</span><span class=pfe>${esc(em)}</span><span class=pfsrc><i class=dot></i>From Google sign-in</span>`
  :`<span class="pv pvna">Not signed in</span><span class=pfe>Name and email come from the Google account you sign in with. Read-only here.</span>`}</div>`}
function pfInfoTile(row){const f=PINFO_BY(row.k);if(!f)return '';const v=pfDisp(f);
 return `<div class="btile pf" data-ptile="${esc(f.k)}" data-ok="${esc(f.k)}" data-pset="${esc(f.k)}" tabindex=0 role=button aria-haspopup=dialog aria-label="${esc(f.l)}"><span class=bn>${esc(f.l)}</span><span class="pv${v?'':' pvna'}">${esc(v||'Not set')}</span><span class=pfe>${esc(f.g)}</span>${RMX(`data-pfrm="${esc(f.k)}"`,f.l)}</div>`}
/* B43 Profile Summary (Andrew 2026-11-06): a read-only menu-style overview above Details, sourced only from the Details tiles (wallet.ptiles + wallet.profile via pfDisp) and the Name/Email tile. No inputs. Groups follow PINFO; empty groups omit. */
const pfSumGroups=()=>{const on=new Set(ptiles().map(x=>x.k)),G=[];
 const A=pfAcct();if(A.email||A.first)G.push({g:'Account',rows:[{l:'Name',v:A.first||A.email.split('@')[0],tip:'From Google sign-in'},{l:'Email',v:A.email,tip:'From Google sign-in'}].filter(r=>r.v)});
 PINFO.forEach(g=>{const rows=g.fs.filter(f=>on.has(f.k)).map(f=>{const v=pfDisp(f);if(!v)return null;const P=PRF();let tip='Entered in Details';
  if(f.k=='byear'&&P.age)tip='Age band '+P.age+' (from birth year)';
  return{l:f.l,v,tip};}).filter(Boolean);if(rows.length)G.push({g:g.g,rows})});
 return G};
const pfSumCount=()=>pfSumGroups().reduce((n,g)=>n+g.rows.length,0);
const pfSumHTML=()=>{const G=pfSumGroups();if(!G.length)return`<p class="mute psume">Add personal info in Details to build your summary.</p>`;
 return G.map(g=>`<div class=psumg><h4 class=psumh>${esc(g.g)}</h4>${g.rows.map(r=>`<div class=psumr title="${esc(r.tip||'Entered in Details')}"><span class=psumlab>${esc(r.l)}</span><span class=psumdots aria-hidden=true></span><span class=psumval>${esc(r.v)}</span></div>`).join('')}</div>`).join('')};
function renderProfilePage(){
 const sn=pfSumCount(),dn=pfRows().length;
 $('#view').innerHTML=`<div class="prof pstack wsimple" id=pw-me><div class=vhead><h2>Profile <button type=button class=wplus data-pfadd aria-haspopup=dialog aria-label="Add personal info" title="Add personal info"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button></h2></div>
 <p class=lead>Optional facts that refine which promos, products, subscriptions and points offers fit you. Tap <b>+</b> to add one. Everything stays on this device and syncs with your wallet when signed in.</p>
 <section class="psec acs${ACO('psum')?' acol':''}" id=pw-psum>${ACH('psum','pw-psum','Summary',sn,0)}<div class="ptiles pbody psum" id=pw-psum-t${ACO('psum')?' hidden':''}>${pfSumHTML()}</div></section>
 <section class="psec acs${ACO('pdet')?' acol':''}" id=pw-metiles>${ACH('pdet','pw-metiles','Details',dn,0)}<div class="tiles ptiles" id=pw-metiles-t${ACO('pdet')?' hidden':''}>${pfGridHTML()}</div></section>${typeof syState!='undefined'&&syState.email?`<section class=acdz id=pw-acdel><h3>Delete account</h3><p class=mute>Permanently delete your account and everything synced to it. <a href='#{"pl":"info","s":"privacy"}'>Privacy Policy</a></p><button type=button class=acdbtn data-acdel>Delete account…</button></section>`:''}</div>`;if(PF.o)pfDraw();if(PFA.o)pfaDraw()}
/* B24: Profile edits (add, save, remove) repaint only the tile grid in place, never the whole page, so the open popup and the page do not flash.
   Order: wallet.order.ptiles (acct + field keys). Keys of removed tiles stay, so ORD puts a re-added tile back where it was. */
const pfRows=()=>[{k:'acct'},...ptiles()];
const pfGridHTML=()=>ORD('ptiles',pfRows(),x=>x.k).map(x=>x.k=='acct'?pfAccountTile():pfInfoTile(x)).join('');
function pfPaintSum(){const s=document.getElementById('pw-psum-t'),a=document.querySelector('#pw-psum .acc'),d=document.querySelector('#pw-metiles .acc');if(s)s.innerHTML=pfSumHTML();if(a)a.textContent='('+pfSumCount()+')';if(d)d.textContent='('+pfRows().length+')'}
function pfGrid(){const g=document.getElementById('pw-metiles-t');if(g){g.innerHTML=pfGridHTML();pfPaintSum()}else render()}
const PFA={o:false,from:null};
function pfaDraw(){let h=document.querySelector('#pfaw');if(!PFA.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='pfaw';document.body.append(h)}
 const on=new Set(ptiles().map(x=>x.k)),off=PINFO_ALL.filter(f=>!on.has(f.k)),starter=PINFO_STARTER.filter(k=>!on.has(k)).map(k=>PINFO_BY(k)).filter(Boolean);
 const tile=f=>`<button type=button class="btile pf pfpick" data-pfpick="${esc(f.k)}"><span class=bn>${esc(f.l)}</span><span class=pfe>${esc(f.g)}</span></button>`;
 const body=!off.length?`<p class=mute>Every personal-info field is already on your Profile.</p>`
  :`${starter.length?`<h4 class=pfah>Suggested</h4><div class="tiles ptiles pfgrid">${starter.map(tile).join('')}</div>`:''}${PINFO.map(g=>{const L=g.fs.filter(f=>!on.has(f.k)&&!PINFO_STARTER.includes(f.k));return L.length?`<h4 class=pfah>${esc(g.g)}</h4><div class="tiles ptiles pfgrid">${L.map(tile).join('')}</div>`:''}).join('')}`;
 h.innerHTML=`<div id=wzbg data-pfax></div><div id=wiz role=dialog aria-modal=true aria-labelledby=pfah0><div class=wzhd><span class=wzst>Profile</span><h3 id=pfah0>Add personal info</h3><button type=button class=wzx data-pfax aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class=btn2 data-pfax>Cancel</button></div></div>`;document.body.classList.add('wzopen')}
function pfaClose(){PFA.o=false;pfaDraw();(PFA.from&&PFA.from.isConnected?PFA.from:document.querySelector('[data-pfadd]'))?.focus()}
function pfaAdd(k){if(!PINFO_BY(k)||ptiles().some(x=>x.k==k))return;ptilesSet([...ptiles(),{k,added_at:NOW()}]);PFA.o=false;pfGrid();pfOpen(k,null,true);document.querySelector('#pfaw')?.remove()}/* B24: the picker hands over to the new tile's popup in one step (the backdrop and body.wzopen stay; no page render, no fade replay) */
const PF={o:false,k:null,d:{},from:null};
function pfKidsHTML(d){const n=Math.max(0,Math.min(12,+(d.kidsN||0)||0)),ages=Array.isArray(d.kids)?d.kids:[];
 return `<div class=csrow><span class=csl id=pf-kn>Number of kids</span><span class=cstep role=group aria-labelledby=pf-kn><button type=button data-pfkn=-1 aria-label="Fewer" ${n<=0?'disabled':''}>−</button><output data-pfn aria-live=polite>${n}</output><button type=button data-pfkn=1 aria-label="More" ${n>=12?'disabled':''}>+</button></span></div>
 ${n?`<div class="csrow iecol"><span class=csl>Ages<small class=mute>Optional age bands</small></span><div class=csopt role=group>${KIDB.map(b=>`<button type=button class="cso${ages.includes(b)?' on':''}" data-pfage="${esc(b)}" aria-pressed=${ages.includes(b)}>${esc(b)}</button>`).join('')}</div></div>`:''}`}
function pfFieldHTML(f,d){if(f.t=='kids')return pfKidsHTML(d);
 if(f.t=='check'){const on=!!d[f.k];return `<div class=csrow><span class=csl id=pf-ck>${esc(f.l)}</span><span class=csopt role=radiogroup aria-labelledby=pf-ck><button type=button class="cso${on?' on':''}" data-pfopt=1 role=radio aria-checked=${on}>Yes</button><button type=button class="cso${!on?' on':''}" data-pfopt=0 role=radio aria-checked=${!on}>No</button></span></div>`}
 if(f.t=='multi'){const a=new Set(Array.isArray(d[f.k])?d[f.k]:[]);return `<div class="csrow iecol"><span class=csl>${esc(f.l)}<small class=mute>Pick any that apply</small></span><div class=csopt role=group>${(f.o||[]).map(([v,l])=>`<button type=button class="cso${a.has(v)?' on':''}" data-pfmulti="${esc(v)}" aria-pressed=${a.has(v)}>${esc(l)}</button>`).join('')}</div></div>`}
 if(f.t=='select'){const v=d[f.k]==null?'':String(d[f.k]);return `<div class=csrow><label class=csl for=pf-v>${esc(f.l)}</label><select id=pf-v class=csin data-pff>${['<option value="">—</option>'].concat((f.o||[]).map(([o,l])=>`<option value="${esc(o)}"${v===String(o)?' selected':''}>${esc(l)}</option>`)).join('')}</select></div>`}
 if(f.t=='number'){return `<div class=csrow><label class=csl for=pf-v>${esc(f.l)}</label><input id=pf-v class=csin data-pff type=number ${f.min!=null?`min=${f.min}`:''} ${f.max!=null?`max=${f.max}`:''} step=1 inputmode=numeric value="${esc(d[f.k]??'')}" placeholder="—"></div>`}
 return `<div class=csrow><label class=csl for=pf-v>${esc(f.l)}</label><input id=pf-v class=csin data-pff type=text ${f.max?`maxlength=${f.max}`:''} value="${esc(d[f.k]??'')}" placeholder="${esc(f.ph||'—')}"></div>`}
function pfHTML(){const f=PINFO_BY(PF.k);if(!f)return '';
 return `<div id=csbg data-pfx></div><div id=cset role=dialog aria-modal=true aria-labelledby=pfh><div class=wzhd><span class=wzst>${esc(f.g)}</span><h3 id=pfh>${esc(f.l)}</h3><button type=button class=wzx data-pfx aria-label="Close without changes" title="Close">&#x2715;</button></div>
 <div class=wzbd>${pfFieldHTML(f,PF.d)}<p class="mute csnote" data-pfnote>${esc(f.note||'Used to refine which offers fit you. Optional.')}</p></div>
 <div class=wzft><button type=button class="btn2 csrm" data-pfcrm>Remove</button><span class=csgap></span><button type=button class=btn2 data-pfx>Cancel</button><button type=button class=btn data-pfsave>Save</button></div></div>`}
function pfDraw(){let h=document.querySelector('#pfw');if(!PF.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='pfw';document.body.append(h)}h.innerHTML=pfHTML();document.body.classList.add('wzopen')}
function pfOpen(k,from,swap){const f=PINFO_BY(k);if(!f)return;const P=PRF(),d={};if(f.t=='kids'){d.kidsN=P.kidsN||0;d.kids=[...(P.kids||[])]}else if(f.t=='multi')d[f.k]=[...(P[f.k]||[])];else if(P[f.k]!=null)d[f.k]=P[f.k];Object.assign(PF,{o:true,k,d,from:from||null});pfDraw();document.querySelector('#pfw')?.classList.toggle('swap',!!swap);document.querySelector('#cset [data-pfsave]')?.focus()}
function pfClose(){PF.o=false;pfDraw();const t=document.querySelector(`[data-pset="${CSS.escape(PF.k||'')}"]`)||PF.from;if(t&&t.isConnected)t.focus()}
function pfApplySide(f,P){if(f.k=='marital'){const m=P.marital;if(m=='married'||m=='common'){P.spouse=true;P.hh=m=='married'?'spouse':'common'}else if(m){if(P.spouse===true)delete P.spouse;if(m=='single')P.hh='none'}}
 if(f.k=='byear'){const y=+P.byear,Y=new Date().getFullYear();if(y>=1920&&y<=Y){const a=Y-y;P.age=a>=60?'60+':a>=35?'35–59':a>=25?'25–34':'18–24';P.senior=a>=60}else{delete P.age;delete P.senior}}
 if(f.k=='retired'&&P.retired)P.work='retired'}
function pfSave(){const f=PINFO_BY(PF.k);if(!f)return pfClose();const P=PRF(),d=PF.d;
 if(f.t=='kids'){const n=Math.max(0,Math.min(12,+(d.kidsN||0)||0));if(n)P.kidsN=n;else delete P.kidsN;const a=(d.kids||[]).filter(x=>KIDB.includes(x));if(a.length)P.kids=a;else delete P.kids}
 else if(f.t=='check'){if(d[f.k])P[f.k]=true;else delete P[f.k]}
 else if(f.t=='multi'){const a=(d[f.k]||[]).filter(Boolean);if(a.length)P[f.k]=a;else delete P[f.k]}
 else if(f.t=='number'||f.num){const v=d[f.k];if(v===''||v==null)delete P[f.k];else P[f.k]=Math.max(0,+v||0)}
 else{const v=typeof d[f.k]=='string'?d[f.k].trim():d[f.k];if(v==null||v==='')delete P[f.k];else P[f.k]=f.max&&typeof v=='string'?v.slice(0,f.max).toUpperCase():v}
 pfApplySide(f,P);STO.wallet.updated_at=NOW();saveS();pfGrid();pfClose()}
function pfRm(k){ptilesSet(ptiles().filter(x=>x.k!=k))}/* the key stays in wallet.order.ptiles so a later add returns the tile to its saved place */
{const act=t=>{
  if(t.matches('[data-pfadd]')){Object.assign(PFA,{o:true,from:t});pfaDraw();document.querySelector('#pfaw [data-pfpick],#pfaw [data-pfax]')?.focus();return}
  if(t.matches('[data-pfax]'))return pfaClose();
  if(t.matches('[data-pfpick]')){pfaAdd(t.dataset.pfpick);return}
  if(t.matches('[data-pfrm]')){pfRm(t.dataset.pfrm);pfGrid();document.querySelector('[data-pfadd]')?.focus();return}
  if(t.matches('[data-pset]')&&!PF.o){if(document.documentElement.classList.contains('rdragging')||document.querySelector('#pw-metiles-t .rdset,#pw-metiles-t .rdsrc'))return;pfOpen(t.dataset.pset,t);return}
  if(t.matches('[data-pfx]')||t.id=='csbg'&&t.closest('#pfw'))return pfClose();
  if(t.dataset.pfkn!=null){PF.d.kidsN=Math.max(0,Math.min(12,(+(PF.d.kidsN||0)||0)+ +t.dataset.pfkn));pfDraw();return}
  if(t.dataset.pfage!=null){const a=new Set(PF.d.kids||[]);a.has(t.dataset.pfage)?a.delete(t.dataset.pfage):a.add(t.dataset.pfage);PF.d.kids=[...a];pfDraw();return}
  if(t.dataset.pfopt!=null){PF.d[PINFO_BY(PF.k).k]=t.dataset.pfopt=='1';pfDraw();return}
  if(t.dataset.pfmulti!=null){const k=PINFO_BY(PF.k).k,a=new Set(PF.d[k]||[]);a.has(t.dataset.pfmulti)?a.delete(t.dataset.pfmulti):a.add(t.dataset.pfmulti);PF.d[k]=[...a];pfDraw();return}
  if(t.matches('[data-pfsave]'))return pfSave();
  if(t.matches('[data-pfcrm]')){const k=PF.k;PF.o=false;pfDraw();pfRm(k);pfGrid();document.querySelector('[data-pfadd]')?.focus()}};
 const SEL='[data-pfadd],[data-pfax],[data-pfpick],[data-pfrm],[data-pset],[data-pfx],[data-pfkn],[data-pfage],[data-pfopt],[data-pfmulti],[data-pfsave],[data-pfcrm],#csbg';
 document.addEventListener('click',e=>{if(e.target.closest('.rmx')&&!e.target.closest('[data-pfrm]'))return;const t=e.target.closest(SEL);if(!t)return;
  if(t.id=='csbg'&&!t.closest('#pfw'))return;if(t.matches('[data-pset]')&&(PF.o||PFA.o))return;
  if(t.matches('[data-pfrm]')){e.preventDefault();e.stopImmediatePropagation();act(t);return}
  e.preventDefault();e.stopImmediatePropagation();act(t)},true);
 document.addEventListener('input',e=>{if(!e.target.matches?.('#pfw [data-pff],#cset [data-pff]'))return;if(!document.querySelector('#pfw'))return;const f=PINFO_BY(PF.k);if(!f)return;PF.d[f.t=='kids'?'kidsN':f.k]=e.target.value},true);
 document.addEventListener('change',e=>{if(!e.target.matches?.('#pfw [data-pff],#cset [data-pff]'))return;if(!document.querySelector('#pfw'))return;const f=PINFO_BY(PF.k);if(!f)return;PF.d[f.k]=e.target.value},true);
 document.addEventListener('keydown',e=>{if(PFA.o&&e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();pfaClose();return}
  if(!PF.o){const t=e.target.closest?.('[data-pset],[data-pfadd]');if(t&&(e.key=='Enter'||e.key==' ')&&e.target==t){e.preventDefault();e.stopImmediatePropagation();act(t)}return}
  if(e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();pfClose()}},true)}
if(typeof syPaint=='function'){const _sp=syPaint;syPaint=function(){const r=_sp.apply(this,arguments);if(st&&st.s=='profile'&&st.pl=='cards'&&!st.card)setTimeout(()=>{try{render()}catch(e){}},0);return r}}
VIEWS.dashboard=renderProfile;VIEWS.profile=renderProfilePage;/* Andrew 2026-11-05 B21: Profile is personal-info tiles (Accounts pattern); KPIs stay on Dashboard. Andrew 2026-11-06: Dashboard off nav (dormant; route redirects to My Wallet). */
// ---- Presets: ready-made screens, shareable as #preset/<id> ----
/* per-line config read by the shared shell (super banner #pl, sub banner #tabs, filter panel, table). Super label: PLINES_ALL (bank.js). Sub-tabs, their columns and their filters: the line's tab defs (cards: S, via tabs()). Presets: pre(). A new line adds its entry here and its own tab defs; the shell code does not change. */
const LINECFG={cards:{tabs:()=>CTABS(),pre:()=>PRE}},PRESETS=(pl=st.pl||'cards')=>(LINECFG[pl]?.pre||(()=>[]))();
const PRE=[{id:'no-fee-cash-back',n:'Best no-fee cash back',s:'ov',f:{fee:'$0',rt:'Cash back'},sort:'other'},
 {id:'top-grocery',n:'Top grocery',s:'rwL',f:{},sort:'r_groc'},
 {id:'no-fx-travel',n:'No FX fee travel',s:'rwF',f:{fx:'None (0%)'},sort:'r_trav'},
 {id:'business',n:'Business cards',s:'ov',f:{acct:'Business'},sort:'best'},
 {id:'apply-by-soon',n:'Apply by soon',s:'perks',f:{soon:'Within 30 days'},sort:'odl',dir:1}];
function presetState(p){const f={};for(const[id,l]of Object.entries(p.f)){const i=FI[id]?.o.findIndex(x=>x[0]==l);if(i>=0)f[id]=i}return{s:p.s,f,q:'',sort:p.sort,dir:p.dir||-1,card:null}}
const curPre=()=>PRESETS().find(p=>{const x=presetState(p);return x.s==st.s&&x.sort==st.sort&&x.dir==st.dir&&!st.q&&JSON.stringify(x.f)==JSON.stringify(Object.fromEntries(Object.entries(st.f).sort()))&&Object.keys(x.f).length==Object.keys(st.f).length})?.id;
COL.ptt=['<img class=thlogo src="images/brand/logo-mark.svg" width=14 height=14 alt="PerTheTerms">Score','',c=>c.ptt.v,c=>`<span class="band b${c.ptt.band[0]}">${c.ptt.band}</span> <b>$${c.ptt.v}</b>${c.ptt.u?'<span class=mute>*</span>':''}<span class=mute>/yr</span>`];
const FMTD=d=>MON[+d.slice(5,7)-1]+' '+(+d.slice(8,10));/* 'YYYY-MM-DD' -> 'Oct 28' */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],dfmt=d=>d?MON[+d.slice(5,7)-1]+' '+(+d.slice(8,10)):'';
COL.tpo=['Sign-up bonus','',c=>c.tpo[0]?.a,c=>c.tpo.length?`<span class=ofr tabindex=0 role=button aria-haspopup=dialog data-tpo="${C.indexOf(c)}">$${c.tpo[0].a.toLocaleString()} · ${esc(c.tpo[0].s)}${new Set(c.tpo.map(x=>x.s)).size>1?` <span class=mute>+${new Set(c.tpo.map(x=>x.s)).size-1}</span>`:''}</span>`:''];
/* 2026-10-31 partner icons (Andrew): after the issuer offer, one small neutral monogram per third-party site with a stored sign-up offer for the card (c.tpa = every stored third_party_offers row for the card, from the sign-up offers refresh). Expired = every row of that site ended before today (checked in the page, not at build); shown greyed with Expired in the tooltip. Amounts are never filled in: a missing amount says so. */
const PSITE={gcr:['GC','Great Canadian Rebates (GCR)'],moneygenius:['MG','MoneyGenius (GeniusCash)'],ratehub:['RH','Ratehub'],finly:['FW','FinlyWealth (Finly)']};
const TISO=`${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}-${String(TODAY.getDate()).padStart(2,'0')}`;
const ptoExp=o=>!!(o.x&&o.x<TISO);
function ptoSites(c){const g={};(c.tpa||[]).forEach(o=>(g[o.k]=g[o.k]||[]).push(o));const ks=Object.keys(g).sort((a,b)=>{const i=Object.keys(PSITE),x=i.indexOf(a),y=i.indexOf(b);return (x<0?99:x)-(y<0?99:y)||a.localeCompare(b)});return ks.map(k=>({k,rows:g[k],exp:g[k].every(ptoExp)}))}
const ptoName=(k,s)=>PSITE[k]?.[1]||s||k,ptoMono=k=>PSITE[k]?.[0]||k.replace(/[^a-z]/gi,'').slice(0,2).toUpperCase();
const ptoSvg=k=>`<svg viewBox="0 0 18 18" width=18 height=18 aria-hidden=true><rect x=".75" y=".75" width="16.5" height="16.5" rx="4.5" fill="var(--ptobg)" stroke="currentColor" stroke-width="1.1"/><text x="9" y="12.2" text-anchor="middle" font-size="7.6" font-weight="700" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" fill="currentColor" letter-spacing="-.2">${esc(ptoMono(k))}</text></svg>`;
function ptoIcons(c){const L=ptoSites(c);if(!L.length)return '';const i=C.indexOf(c);return `<span class=ptos>${L.map(x=>{const t=ptoName(x.k,x.rows[0].s)+(x.exp?': Expired':': sign-up offer');return `<span class="pto${x.exp?' px':''}" tabindex=0 role=button aria-haspopup=dialog aria-label="${esc(t)}" data-pto="${i}|${esc(x.k)}">${ptoSvg(x.k)}</span>`}).join('')}</span>`}
const ptoAmt=o=>o.a!=null?'$'+o.a.toLocaleString():'Amount not stated in the stored offer';
const ptoDate=d=>d?dfmt(d)+', '+d.slice(0,4):'—';
function ptoHTML(v){const[i,k]=v.split('|'),c=C[+i],x=ptoSites(c).find(y=>y.k==k);if(!x)return '';
 return `<b>${esc(ptoName(k,x.rows[0].s))}</b>${x.exp?' <span class=pxb>Expired</span>':''}<div class=mute>${esc(c.n)}</div><table>${x.rows.map(o=>`<tr><th>Bonus</th><td><b>${esc(ptoAmt(o))}</b>${o.t&&o.a!=null&&o.t!=='$'+o.a?' <span class=mute>· '+esc(o.t)+'</span>':''}</td></tr><tr><th>Source</th><td><span class=t>${esc(o.tag||'—')}</span></td></tr><tr><th>Checked</th><td>${esc(ptoDate(o.f))}</td></tr><tr><th>Ends</th><td>${o.x?esc(ptoDate(o.x))+(ptoExp(o)?' · <b class=pxb>Expired</b>':''):'No end date stored'}</td></tr>`).join('<tr class=psep><td colspan=2></td></tr>')}</table>`}
function tpoHTML(c){return `<b>${esc(c.n)}</b> <span class=mute>· extra sign-up rewards from third-party sites</span><table>${c.tpo.map(o=>`<tr><th>${esc(o.s)}</th><td><b>$${o.a.toLocaleString()}</b> ${esc(o.fm||'')}${o.x?' · expires '+esc(o.x):''} · checked ${dfmt(o.f)} <span class=t>${esc(o.tag||'')}</span>${o.c?`<div class=mute style="margin-top:2px">${esc(o.c.length>260?o.c.slice(0,260)+'…':o.c)}</div>`:''}${o.u?`<div><a href="${esc(o.u)}" target=_blank rel=noopener>${esc(o.u.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])}</a></div>`:''}</td></tr>`).join('')}</table>`}
/* Issuer welcome-offer details (Andrew 2026-10-31): the popover on the Welcome offer check and the Offer cell, same style as the partner (GC/MG/RH/FW) popovers. Stored promo record only (promo_text, spend_requirement, first_year_fee, fyf_mechanics, deadline, snapshot_date); a missing field says Not stated; nothing is inferred. */
const OFRTAG=t=>{const m=/\[(CITED|ESTIMATE|REPORTED)\b([^\]]*)\]/.exec(t||'');return m?[m[1],m[2].replace(/^[\s;,]+/,'').trim()]:null};
const OFRTXT=t=>(t||'').replace(/\s*\[(CITED|ESTIMATE|REPORTED)\b[^\]]*\]/g,'').trim();
const OFRBONUS=t=>{const x=OFRTXT(t),m=/(?:up to )?\d[\d,]*(?:\.\d+)?\s*(?:bonus\s+)?(?:[A-Z][\w®&'’\-]*\s+){0,3}(?:points|miles|Scene\+ points|dollars)\b/i.exec(x)||/(?:up to )?\$\d[\d,]*(?:\.\d+)?(?:\s+(?:in\s+)?(?:cash ?back|statement credits?|bonus|welcome bonus|credit|value))?/i.exec(x);return m?m[0]:null};
const OFRFYF={WAIVED:'Waived',FREE:'Free',REBATED:'Rebated'};
/* B10 income qualifier hover (Andrew 2026-11-01): the actual qualifier from the income fields, each with its evidence tag; shared #ofp popover */
const KAMT=v=>'$'+(v>=1000&&v%1000==0?v/1000+'k':v.toLocaleString());
const INCQ=c=>{const a=[];if(c.inc>0)a.push(KAMT(c.inc)+' personal');if(c.hinc>0)a.push(KAMT(c.hinc)+' household');if(c.xf?.incalt>0)a.push(KAMT(c.xf.incalt)+' annual spend');const as=(c.xf?.u||{}).income_assets_min;if(as>0)a.push(KAMT(as)+' investable assets');return a.length?a.join(' or '):INC0(c)?'No income minimum':c.inct?String(c.inct):''};
function incHTML(c){const tg=f=>{const t=c.ve?.[f];return t?` <span class=t title="${esc(t[1]||'')}">${esc(t[0])}</span>`:''},as=(c.xf?.u||{}).income_assets_min,row=(l,v,f)=>v>0?`<tr><th>${l}</th><td>$${v.toLocaleString()}${tg(f)}</td></tr>`:'';
 return `<b>${esc(c.n)}</b> <span class=mute>· income qualifier</span><p class=inqq><b>${esc(INCQ(c)||'Not captured')}</b></p><table>${row('Personal',c.inc,'income_personal_min')}${row('Household',c.hinc,'income_household_min')}${row('Spend alternative',c.xf?.incalt,'income_spend_alternative')}${row('Assets in lieu',as,'income_assets_min')}${c.inct?`<tr><th>As printed</th><td>${esc(c.inct)}${tg('income_requirement')}</td></tr>`:''}</table>`}
function ofrHTML(c){const tg=OFRTAG(c.offer),b=OFRBONUS(c.offer),fy=OFRFYF[c.pro.fyf],e=c.odl=='ONGOING'?'Ongoing (no end date)':c.odl?esc(/^\d{4}-\d\d-\d\d$/.test(c.odl)?ptoDate(c.odl):c.odl)+soonB(c):'Not stated';
 return `<b>${esc(c.n)}</b> <span class=mute>· issuer welcome offer</span><table><tr><th>Bonus</th><td><b>${b?esc(b):'Not stated'}</b></td></tr><tr><th>Offer</th><td>${esc(OFRTXT(c.offer))}</td></tr>`
 +`<tr><th>Spend / window</th><td>${c.pro.spend?esc(c.pro.spend):'Not stated'}</td></tr>`
 +(fy?`<tr><th>First-year fee</th><td>${esc(fy)}${c.pro.fyfm?' · '+esc(c.pro.fyfm):''}</td></tr>`:'')
 +`<tr><th>Ends</th><td>${e}</td></tr><tr><th>Source</th><td><span class=t>${tg?tg[0]:'Not stated'}</span>${tg&&tg[1]?' <span class=mute>· '+esc(tg[1])+'</span>':''}</td></tr><tr><th>Checked</th><td>${c.pro.d?esc(ptoDate(c.pro.d)):'Not stated'}</td></tr></table>`}
/* v3.3.2 generic truncated-cell popover: any ellipsis cell (td.nm, .ell) whose text overflows, plus text cut in JS (.trc[data-tfull]) */
const OSEL='[data-pto],[data-ofr],[data-tpo],[data-trc],[data-inq]';
function trcText(el){if(el.dataset.tfull)return el.dataset.tfull;return (el.innerText||el.textContent).replace(/ⓘ/g,'').replace(/\s*\n\s*/g,' · ').replace(/\s+/g,' ').trim().replace(/^(· )+|( ·)+$/g,'')}
function trcHTML(el){return `<div class=trcp>${esc(trcText(el))}</div>`}
function trcScan(){document.querySelectorAll('td.nm,td.ell,th.ell').forEach(td=>{if(td.closest('#ofp'))return;const t=td.scrollWidth>td.clientWidth+1;if(t&&td.dataset.trc==null){td.dataset.trc='';if(!td.hasAttribute('tabindex'))td.tabIndex=0;td.classList.add('trcd')}else if(!t&&td.dataset.trc!=null){delete td.dataset.trc;td.removeAttribute('tabindex');td.classList.remove('trcd')}})}
let trcR=0;const trcQ=()=>{if(!trcR)trcR=requestAnimationFrame(()=>{trcR=0;trcScan()})};
new MutationObserver(m=>{if(m.some(x=>!(x.target.closest&&x.target.closest('#ofp'))))trcQ()}).observe(document.body,{childList:true,subtree:true});
addEventListener('resize',trcQ);
let ofrI=null;const ofrShow=el=>{const p=$('#ofp');p.innerHTML=el.dataset.inq!=null?incHTML(C[el.dataset.inq]):el.dataset.pto!=null?ptoHTML(el.dataset.pto):el.dataset.trc!=null?trcHTML(el):el.dataset.tpo!=null?tpoHTML(C[el.dataset.tpo]):ofrHTML(C[el.dataset.ofr]);p.hidden=false;const r=el.getBoundingClientRect(),w=Math.min(380,innerWidth-16);p.style.width=w+'px';
 p.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';const top=r.bottom+6;p.style.top=(top+p.offsetHeight>innerHeight?Math.max(8,r.top-p.offsetHeight-6):top)+'px';ofrI=el;ofrT=Date.now()};let ofrT=0;
const ofrHide=()=>{$('#ofp').hidden=true;ofrI=null};
document.addEventListener('pointerover',e=>{if(e.pointerType!='mouse')return;const o=e.target.closest(OSEL);if(o)ofrShow(o);else if(ofrI&&!e.target.closest('#ofp'))ofrHide()});
document.addEventListener('focusin',e=>{const o=e.target.closest(OSEL);if(o&&(o.dataset.trc==null||e.target==o))ofrShow(o)});document.addEventListener('focusout',e=>{if(e.target.closest(OSEL))ofrHide()});
document.addEventListener('keydown',e=>{if(e.key=='Escape')ofrHide()});addEventListener('scroll',()=>{if(ofrI&&Date.now()-ofrT>300)ofrHide()},true);
const NUNK=c=>INS.filter(([k])=>c.ins[k]==null).length;
/* B11 (Andrew 2026-11-01): Covers reads just n/total; unverified coverages are listed in the hover ('Unknown: Mobile device'), never as (+n ?). Sort unchanged: by count, fewer unknowns first. */
const covUL=(c,L)=>L.filter(([k])=>c.ins[k]==null).map(x=>x[1]),covC=(c,L,n,t)=>{const u=covUL(c,L);return `<span${u.length?` class=covu tabindex=0 title="${esc('Unknown: '+u.join(', '))}"`:''}><b>${n}</b>${t?`<span class=mute>/${t}</span>`:''}</span>`};
COL.covT=['Covers','',c=>insN(c,INS_T)*100-insU(c,INS_T),c=>covC(c,INS_T,insN(c,INS_T),INS_T.length)];
COL.covP=['Covers','',c=>insN(c,INS_P)*100-insU(c,INS_P),c=>covC(c,INS_P,insN(c,INS_P),INS_P.length)];
COL.cov=['Covers','',c=>c.nins*100-NUNK(c),c=>covC(c,INS,c.nins,0)];
const FI={};S.forEach(s=>s.f.forEach(([id,l,o])=>FI[id]={s,l,o}));
let st={pl:'home',s:'ov',f:{},q:'',sort:null,dir:-1};
const BYID={},CIX=new Map();C.forEach((c,i)=>{BYID[c.id]=i;CIX.set(c,i)});const BYID0=BYID;
function route(){const h=decodeURIComponent(location.hash.slice(1));st.card=null;
 if(h=='premium'){st.s='premium';return}
 if(h.startsWith('preset/')){const p=PRESETS('cards').find(p=>p.id==h.slice(7));if(p)Object.assign(st,presetState(p),{pl:'cards'});return}
 if(h.startsWith('card/')){const i=BYID[h.slice(5)];if(i!=null){st.card=C[i].id;st.pl='cards';if(USR.has(st.s)||st.s=='wfolder'||String(st.s||'').startsWith('soon_'))st.s=(typeof CTV=='function'&&CTV()||['ovw'])[0]||'ovw'}return}
 try{Object.assign(st,JSON.parse(h))}catch(e){}navR()}
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
/* PerYourTerms links (drawer entry, Accounts footer link, left-column item): one switch. Andrew 2026-11-01 kept it linked (it becomes the dashboard). */
const PYT_LINK=true;
const UNAV_ALL=[['profile','Profile'],['wallet','Accounts'],['spending','Spending'],['subscriptions','Subscriptions'],['points','Loyalty']].concat(PYT_LINK?[['pyt','Per Your Terms','Wallet optimization']]:[]);
const UNAV=CARDS_ONLY?UNAV_ALL.filter(u=>['wallet','spending'].includes(u[0])):UNAV_ALL;/* 2026-11-02: Loyalty is an Accounts section in cards-only (its routes redirect there) *//* 2026-11-05: Subscriptions is its own PerYourTerms page (sidebar link; not in UNAV filter) *//* cards-only: the Profile menu items (Accounts, Spending); Points Cards is a coming-soon page */
const USR=new Set([...UNAV.map(u=>u[0]),...(CARDS_ONLY?['profile','dashboard','subscriptions','pointcards','assets']/* subscriptions = PerYourTerms page; pointcards redirects to Accounts #pw-loy; investments = User › Investments, not Products pl invest */:['premium','investments'])]);
const PL=new Set(PLINES.map(p=>p[0]));
const railOpen=()=>CARDS_ONLY?true:(STO.ui?.rail??true);/* the logo button toggles the left column: collapses/expands it (persisted in STO.ui.rail, open by default) */
/* Section nav (Andrew 2026-11-04; SNAV_DRILL parked 2026-11-06): product sections expand in place (no '‹ Profile' subpage). When SNAV_DRILL is true the 85891b4 drill returns: column/drawer swap with a Profile back row.
   The same list fills the #snav drawer (what the menu button opens on a phone); the #tabs and #grp strips are not rendered in these sections, so the
   sidebar is the only view switcher there. Andrew 2026-11-06: product detail pages (#card/… / #page) use the same menu — the section the product belongs to stays open and highlighted; Profile pages keep the greeting. */
const SECL=new Set(['cards','bank','broker','invest']);
const SNAV_DRILL=false;/* Andrew 2026-11-06: park 85891b4 drill ('‹ Profile' subpage). false = expand/collapse sections in place in the main nav + phone drawer; true revives the drill. */
/* The #tabs / #grp strips are never rendered in these three sections; the section menu is the one switcher. Below 1400px the column cannot sit beside
   the widest table without taking its columns off (Perks is 1230px and the guard keeps every table inside one window), so the CSS hides the column and the
   SAME list is the top of the Profile drawer, opened from the menu button: the sidebar is still the only switcher, at every width. */
const secRail=()=>secOn();
const secOn=()=>SECL.has(st.pl)&&!USR.has(st.s)&&st.s!='wfolder'&&!String(st.s||'').startsWith('soon_')&&!!secItems().length;/* Andrew 2026-11-06: product detail (#card/…) stays in product mode (st.card no longer excludes it); Profile / Accounts / Spending keep UNAV. The Cards Wallet folder belongs to Accounts, not to a section menu. */
const secDot=id=>{const s=S.find(x=>x.id==id);return s&&s.f?s.f.filter(f=>st.f[f[0]]!=null).length:0};
function secItems(pl=st.pl){if(pl=='cards')/* Andrew 2026-11-05: exactly four rows, Overview, Rewards, Perks, Insurance (2026-11-05: Fees after Overview, five rows); only Insurance has child rows (Travel, Protection). The other table views stay on their in-page tabs. */
  return CTABS().flatMap(s=>s.id=='rw'?[{id:'rw',label:s.name,n:secDot('rw'),kids:[]},{id:'perk',label:(S.find(x=>x.id=='perk')||{}).name||'Perks',n:secDot('perk'),gk:'rwt',gv:'perk',kids:[]}]
   :[{id:s.id,label:s.name,n:secDot(s.id),kids:s.id=='ins'?GROUPS.ins.map(([id,n])=>({id,label:n,n:secDot(id),gk:'ins',gv:id})):[]}]);
 if(pl=='bank')return (typeof BANK!='undefined'&&BANK.sec?BANK.sec():[]).map(([id,label,n])=>({id,label,n,kids:[]}));
 return (pl=='broker'?BRS:pl=='invest'?IVS:[]).map(s=>({id:s.id,label:s.name,n:0,kids:[]}))}
const secCur=()=>st.pl=='cards'?(st.s=='rw'&&GKEY()=='perk'?'perk':st.s):(st.pl=='bank'?(st.bs||'bov'):st.pl=='invest'?(st.ivs||'ivov'):(st.brs||'brov'));
const secKid=()=>st.pl=='cards'&&st.s=='ins'?GKEY():null;/* only Insurance has child rows in the menu (Overview has no sub-tab selector since Fees became its own view, 2026-11-05) */
/* Collapse state for a parent row with children. One key per parent, '<section>:<view id>' in STO.ui.seccol ({'cards:rw':true} = collapsed), so it survives a
   reload and a future parent in any of the three sections gets it for free. Absent = expanded (the default); navigating into a child clears its parent's key,
   so arriving at Snapshot always shows Rewards open. */
const secCol=()=>((STO.ui||{}).seccol||{}),secOpen=id=>!(st.pl+':'+id in secCol());
/* Default: expanded, and always expanded for a parent whose child is the current view, whatever road brought the reader there (a row, pickView, a saved link,
   the back button). So landing on Rewards > Living shows Rewards open even if it was left collapsed last visit; the saved choice comes back on any other view. */
const secNorm=()=>{const kid=secKid(),M={...secCol()};let ch=0;
 for(const o of secItems())if(kid&&o.kids.some(k=>k.id==kid)&&(st.pl+':'+o.id)in M){delete M[st.pl+':'+o.id];ch=1}
 if(ch){STO.ui={...(STO.ui||{}),seccol:M};saveS()}};
/* secHTML(host): the section's own menu, host 'u' for the wide column (#urail) and 's' for the phone drawer (#snavsec). Both get the same rows, the same
   icons and the same collapse controls; only the aria-controls ids differ, so one document never carries two of the same id.
   Every data row carries a 16px outline icon (14px on a child row) inside <span class=ti aria-hidden=true>, drawn by MI(). A parent row with children
   (o.kids, from secItems()) is the row plus a small chevron <button class=ric> at its right edge: the chevron toggles the children, the row still
   navigates to the parent view. Andrew 2026-11-04. */
/* One outline icon per data nav label (Andrew 2026-11-04): 24x24 viewBox, stroke only, drawn through MI() so every row matches the drawer's language.
   A section's Overview keeps the same dashboard mark in all three sections, Fees the same percent, Promotions the same megaphone, so a reader learns one
   glyph per view role. '*' is the fallback, so a view added later still gets an icon instead of a blank slot. */
const SECI={ovw:'<rect x="3.5" y="4.5" width="7.5" height="6" rx="1.6"/><rect x="13" y="4.5" width="7.5" height="6" rx="1.6"/><rect x="3.5" y="13.5" width="7.5" height="6" rx="1.6"/><rect x="13" y="13.5" width="7.5" height="6" rx="1.6"/>',
 rw:'<circle cx="12" cy="12" r="8"/><path d="M12 8l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z"/>',
 rwS:'<path d="M4 17.5a8 8 0 1 1 16 0"/><path d="M12 17.5l3.6-5.2"/><circle cx="12" cy="17.5" r="1.4"/>',
 rwL:'<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/>',
 rwF:'<path d="M12 3.5l2.1 4.6 5 .5-3.8 3.3 1.1 4.9L12 14.3l-4.4 2.5 1.1-4.9L4.9 8.6l5-.5z"/>',
 perk:'<rect x="3.5" y="8.5" width="17" height="4" rx="1.2"/><path d="M5.5 12.5V20.5h13v-8"/><path d="M12 8.5V20.5"/><path d="M12 8.5c-1.6-3.2-5.8-3.1-5.8-.6s3.7 1.3 5.8.6zM12 8.5c1.6-3.2 5.8-3.1 5.8-.6s-3.7 1.3-5.8.6z"/>',
 ins:'<path d="M12 3.5l7.5 3v5.5c0 4.4-3.1 7.6-7.5 9-4.4-1.4-7.5-4.6-7.5-9V6.5z"/>',
 trv:'<path d="M3.5 13.2 20.5 5.5l-3.2 9-4.4 1.6-1.6 5.4-2.1-4.8z"/><path d="M12.9 16.1 8.5 12.4"/>',
 prot:'<path d="M12 4v1.6"/><path d="M4 12.8C4 8.2 7.6 5.6 12 5.6s8 2.6 8 7.2c-1.4-1.3-2.8-1.3-4.2 0-1.3-1.3-2.5-1.3-3.8 0-1.3-1.3-2.5-1.3-3.8 0-1.4-1.3-2.8-1.3-4.2 0z"/><path d="M12 12.8v6a2 2 0 0 0 4 0"/>',
 bfees:'<path d="M7 17.5 17 6.5"/><circle cx="8.4" cy="8.4" r="2.3"/><circle cx="15.6" cy="15.6" r="2.3"/>',
 bperks:'<rect x="3.5" y="8.5" width="17" height="4" rx="1.2"/><path d="M5.5 12.5V20.5h13v-8"/><path d="M12 8.5V20.5"/><path d="M12 8.5c-1.6-3.2-5.8-3.1-5.8-.6s3.7 1.3 5.8.6zM12 8.5c1.6-3.2 5.8-3.1 5.8-.6s-3.7 1.3-5.8.6z"/>',
 bacc:'<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 14.5h4"/>',
 binst:'<path d="M3 9.5 12 4l9 5.5z"/><path d="M6 10v7M10 10v7M14 10v7M18 10v7"/><path d="M3.5 20.5h17"/>',
 bprom:'<path d="M3.5 10v4l12 5V5z"/><path d="M6.5 14.6v4.9h3.2"/>',
 brfees:'<path d="M7 17.5 17 6.5"/><circle cx="8.4" cy="8.4" r="2.3"/><circle cx="15.6" cy="15.6" r="2.3"/>',
 braccts:'<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M8.5 9.5h7M8.5 13.5h4"/>',
 brfeat:'<path d="M13 3.5 6 13.5h4.5L10 20.5l7-10h-4.5z"/>',
 ivperf:'<path d="M3.5 19.5h17"/><path d="M5 15.5l4.5-4.5 3.5 3 6-6.5"/>',
 ivliq:'<path d="M12 3.5c3.2 4.2 5.5 7.3 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.9 2.3-6 5.5-10.2z"/>',
 back:'<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a4.5 4.5 0 0 1 0 9h-3"/>',
 '*':'<circle cx="12" cy="12" r="6.5"/>'};
/* the same glyph for the same role across sections: each section's Overview is the dashboard mark, each Promotions the megaphone (SECI.ovw / .bprom) */
SECI.bov=SECI.ovw;SECI.fees=SECI.brfees;SECI.brov=SECI.ovw;SECI.ivov=SECI.ovw;SECI.ivcost=SECI.brfees;
/* Andrew 2026-11-05 (prodnav): product mode shows every product as a group (Credit Cards, Banking, Brokers, Investments), each header a button.grp over a div.pytsub
   (aria-expanded/aria-controls, no chevrons), like the profile drawer groups. ONE EXPANSION AT A TIME (Andrew 2026-11-05, Docs/naming.md "Sidebar groups"): only the
   group of the active page is open by default; a header goes to its page at the top. Andrew 2026-11-06: clicking the open (active) header collapses it; click again to re-open; STO.ui.sgcol remembers the choice. */
const SECG=['cards','bank','broker','invest'];
/* Andrew 2026-11-06: active group is open by default, but a header click can collapse it (and click again to re-open). STO.ui.sgcol {key:true} = user-collapsed; key is the product id ('cards'), Insurance ('cards.ins'), or a drawer group's aria-controls id ('prsub','usub-wallet',…). One expansion at a time still holds — only the active group can be open, and only when it is not in sgcol. Survives reload via saveS (same store as the rest of ui). */
const sgCol=()=>((STO.ui||{}).sgcol||{}),sgIsCol=k=>!!sgCol()[k],sgSetCol=(k,on)=>{if(!k)return;STO.ui={...(STO.ui||{})};const M={...sgCol()};if(on)M[k]=true;else delete M[k];STO.ui.sgcol=Object.keys(M).length?M:undefined;if(!STO.ui.sgcol){const u={...STO.ui};delete u.sgcol;STO.ui=u}saveS()};
const secGOpen=pl=>{const[g,sub]=pl.split('.');const active=sub?g==st.pl&&secCur()==sub:pl==st.pl;return active&&!sgIsCol(pl)};/* open = active and not user-collapsed */
function secHTML(host='u'){const cur=secCur(),kid=secKid(),H=host=='s'?'s':host=='p'?'p':'u';/* host p = #prodsub expand-in-place (unique ids) */
 const ico=(id,isKid)=>`<span class=ti aria-hidden=true>${MI(SECI[id]||SECI['*'],isKid?14:16)}</span>`;
 const row=(pl,o,isKid)=>{const me=pl==st.pl,on=me&&(isKid?o.id==kid:o.id==cur&&!kid),par=me&&!isKid&&kid&&o.kids.some(k=>k.id==kid);
  return `<button type=button data-s="${o.id}" data-spl="${pl}" class="ri${isKid?' rik':''}${on?' on':''}${par?' onp':''}"${on?' aria-current=page':''}${o.gk?' data-gk="'+o.gk+'" data-gv="'+o.gv+'"':''}${o.rwt?' data-rwt="'+o.rwt+'"':''}>${ico(o.id,isKid)}<span class=rl>${esc(o.label)}</span>${me&&o.n?`<span class=dot>${o.n}</span>`:''}</button>`};
 const sub=(pl,o)=>{const k=pl+'.'+o.id,open=secGOpen(k),cid='sg-'+H+'-'+pl+'-'+o.id,par=pl==st.pl&&o.kids.some(x=>x.id==kid);/* Insurance subgroup: open while you are in it; its header opens Insurance */
  return `<button type=button class="ri grp secg secgk${par?' onp':''}" data-sg="${k}" data-spl="${pl}" aria-expanded="${open}" aria-controls="${cid}">${ico(o.id,0)}<span class=rl>${esc(o.label)}</span></button><div class="pytsub secsub secsubk" id="${cid}"${open?'':' hidden'}>${o.kids.map(x=>row(pl,x,1)).join('')}</div>`};
 const grp=pl=>{const L=(PLINES.find(p=>p[0]==pl)||[,pl])[1],open=secGOpen(pl),cid='sg-'+H+'-'+pl;
  return `<button type=button class="ri grp secg" data-sg="${pl}" aria-expanded="${open}" aria-controls="${cid}"><span class=ti aria-hidden=true></span><span class=rl>${esc(L)}</span></button><div class="pytsub secsub" id="${cid}"${open?'':' hidden'}>${secItems(pl).map(o=>o.id=='ins'&&o.kids.length?sub(pl,o):row(pl,o,0)+o.kids.map(k=>row(pl,k,1)).join('')).join('')}</div>`};
 const GS=SECG.filter(pl=>PLINES.some(p=>p[0]==pl));/* Profile back only when SNAV_DRILL; expand-in-place omits the subpage chrome (Andrew 2026-11-06) */
 const back=SNAV_DRILL?`${H=='s'?'<div class=snuh>':''}<button type=button class="ri ril-back" data-s=profile title="Back to profile"><span class=ti aria-hidden=true>${MI(SECI.back,16)}</span><span class=rl>Profile</span></button>${H=='s'?'</div>':''}`:'';
 const head=(SNAV_DRILL||H=='u')?`<div class="ri secall"><span class=rl>Products</span></div>`:'';
 return back+head+GS.map(grp).join('')}
/* pickView(id): switch to a section view without a click target, for the three sections whose #tabs strip the section menu replaced (Andrew 2026-11-04),
   so saved links, the hero's step cards and the tests keep one entry point. Handles a parent view, a group child (fees, trv, prot, rwS...) and Perks;
   works for Credit Cards, Banking and Brokers. Returns false for an id this section does not have. */
function pickView(id){
 /* resolve the product from the view id first (Investments/Brokers/Banking/Cards), so a sidebar row or pickView(id) works from any product — otherwise an Investments id while on Cards/Brokers returned false and looked like a dead link (Andrew 2026-11-05) */
 if(IVS.some(x=>x.id==id)){st.pl='invest';st.ivs=id;st.card=null;closeM();render();return true}
 if(BRS.some(x=>x.id==id)){st.pl='broker';st.brs=id;st.card=null;closeM();render();return true}
 {const own=typeof BANK!='undefined'&&BANK.sec?BANK.sec().map(x=>x[0]):[];if(own.includes(id)){st.pl='bank';st.bs=id;st.card=null;closeM();render();return true}}
 if(!(S.some(x=>x.id==id)||id=='perk'))return false;st.pl='cards';
 const par=Object.keys(GROUPS).find(p=>GROUPS[p].some(x=>x[0]==id));
 if(GROUPS[id]){st.g={...(st.g||{}),[id]:GROUPS[id].some(x=>x[0]==GKEY())?GKEY():GROUPS[id][0][0]};if(id=='rw')st.g.rwt='pts';st.s=id}
 else if(par){st.g={...(st.g||{}),[par]:id,...(par=='rw'&&(id=='rwS'||id=='rwL'||id=='rwF')?{rwt:st.g?.rwt||'pts'}:{})};st.s=par}
 else if(id=='perk'){st.g={...(st.g||{}),rwt:'perk'};st.s='rw'}
 else st.s=id;
 st.card=null;navR();render();return true}
function pickGroup(g){/* a child view of the current section (Snapshot/Living/Lifestyle, Travel/Protection): the same result whether it is clicked in the section menu or on the #imode level selector */
 const par=Object.keys(GROUPS).find(p=>GROUPS[p].some(x=>x[0]==g));if(!par)return false;
 st.g={...(st.g||{}),[par]:g,...(par=='rw'&&['rwS','rwL','rwF'].includes(g)?{rwt:'pts'}:{})};st.card=null;navR();render();return true}
/* one handler for the section rows in the left column and in the drawer: same pick either way (the older [data-s] handler never sees these clicks).
   Every row resolves to a section id plus, for a child row, its group key and value; pickView() then does exactly what the click would. */
document.addEventListener('click',e=>{const sg=e.target.closest('#urail .secg,#snavsec .secg,#pfl .secg,#prodsub .secg');if(sg){/* a product group header goes to its page at the top: another product → its table; the current
  product → top of its table; the Insurance subgroup → Insurance. Active group opens (others close). Andrew 2026-11-06: clicking the already-open active header collapses it (sgcol); click again to re-open. */
  e.stopImmediatePropagation();e.preventDefault();const pl=sg.dataset.sg,[g,sub]=pl.split('.');
  const active=sub?g==st.pl&&secCur()==sub:g==st.pl;
  if(active&&secGOpen(pl)){sgSetCol(pl,true);render();scrollTo(0,0);(document.querySelector(`.secg[data-sg="${pl}"]`)||sg).focus({preventScroll:true});return}/* collapse open active */
  if(active&&!secGOpen(pl)){sgSetCol(pl,false);if(sub)pickView(sub);else render();scrollTo(0,0);(document.querySelector(`.secg[data-sg="${pl}"]`)||sg).focus({preventScroll:true});return}/* re-open collapsed active */
  sgSetCol(pl,false);/* landing on this group opens it */
  if(g!=st.pl){const t=document.querySelector('#pl [data-pl='+g+']');if(t)t.click();else{st.pl=g;st.card=null;st.s='ov';render()}}
  if(sub)pickView(sub);else render();scrollTo(0,0);(document.querySelector(`.secg[data-sg="${pl}"]`)||sg).focus({preventScroll:true});return}
 const b=e.target.closest('#urail .ri,#snavsec .ri,#pfl .ri[data-spl],#prodsub .ri[data-spl]');if(!b)return;e.stopImmediatePropagation();e.preventDefault();
 const inRail=!!b.closest('#urail'),KP=inRail?posGet():null,id=b.dataset.s,gk=b.dataset.gk,gv=b.dataset.gv;
 if(b.dataset.spl&&b.dataset.spl!=st.pl){/* another product's row: pickView switches product for invest/broker/bank/cards ids; cards children (Travel/Perks) still need the #pl switch first */
  if(gk&&gv){const t=document.querySelector('#pl [data-pl='+b.dataset.spl+']');if(t)t.click();st.g={...(st.g||{}),[gk]:gv,...(b.dataset.rwt?{rwt:b.dataset.rwt}:{})};st.s=gk=='rwt'?'rw':gk;st.card=null;navR();render()}else pickView(id);
  (document.querySelector(`#snavsec .ri[data-s="${id}"].on`)||document.querySelector(`#prodsub .ri[data-s="${id}"].on`)||document.querySelector('#snavsec .ril-back')||document.querySelector('#pfl .prodb')).focus({preventScroll:true});return}
 if(id=='profile'&&!gk){st.pl='cards';st.s='profile';st.card=null;navR();render()}
 else if(gk){/* a child row (Snapshot/Living/Lifestyle, Perks, Travel/Protection) sets its group; a parent row keeps the child it had */
  if(gv){st.g={...(st.g||{}),[gk]:gv,...(b.dataset.rwt?{rwt:b.dataset.rwt}:{})};st.s=gk=='rwt'?'rw':gk;st.card=null;navR();render()}
  else pickView(id)}
 else pickView(id);
 if(inRail&&KP)posSet(KP);else if(!inRail)(document.querySelector(`#snavsec .ri[data-s="${id}"]${gk?'[data-gk]':''}.on`)||document.querySelector(`#prodsub .ri[data-s="${id}"]${gk?'[data-gk]':''}.on`)||b).focus({preventScroll:true})},true);

let hdtSync=()=>{};/* filled by the #hdt IIFE below; rail() paints the section title */
function rail(){const el=$('#urail');if(!el)return;document.documentElement.style.setProperty('--hh',($('header')?.offsetHeight||56)+'px');const o=railOpen();secNorm();
 const vh=$('#vh');if(vh){vh.hidden=true;vh.textContent=''}/* no page title above the tables: the column says where you are */
 const sec=secOn(),drill=SNAV_DRILL&&sec;document.body.classList.toggle('snavsec',drill);
 el.innerHTML=sec?secHTML('u'):`<div class=rh>You</div>`+UNAV.map(([k,n,sub])=>{const on=st.s==k&&!st.card,pm=PREM.has(k);return `<button type=button data-s=${k} class="ri${on?' on':''}${pm?' prem':''}"${on?' aria-current=page':''}><span class=ril>${n}${pm?'<span class=premg role=img aria-label=Premium title=Premium>◆</span>':''}${sub?`<small>${sub}</small>`:''}</span></button>`}).join('');
 const sn=$('#snav');if(sn){let d0=document.getElementById('snavsec');if(!d0){d0=document.createElement('div');d0.id='snavsec';d0.className='snsec';const h=sn.querySelector('.snh');h?h.after(d0):sn.prepend(d0)}
  d0.innerHTML=drill?secHTML('s'):'';d0.hidden=!drill;sn.classList.toggle('secc',drill);if(!SNAV_DRILL)paintProdExpand();snxPlace()}requestAnimationFrame(()=>wzFit());/* phones: the drawer carries the same list, '‹ Profile' first (Andrew 2026-11-04);
   Andrew 2026-11-04: in a section the drawer is ONLY that section's views: the user block below the list (#pfl: User/Profile/Accounts/Spending, PerYourTerms, the
   Settings group .conb + #setsub) and the Log In/Out pill are hidden there, because the '‹ Profile' row at the top of the list is the way back. Outside the three
   sections nothing changes (body.snavsec only exists inside them), and the CSS also covers a drawer built before the first section render. */
 el.setAttribute('aria-label',sec?((PLINES.find(p=>p[0]==st.pl)||[,st.pl])[1])+' views':'Your space');/* 'Credit Cards views' etc. */
 el.classList.toggle('open',o||sec);document.body.classList.toggle('rail',!CARDS_ONLY&&(o||sec))/* Andrew 2026-11-05: cards-only sections use the #snav drawer, which pushes the page like profile views */;const t=$('#rtog');if(t)t.setAttribute('aria-expanded',String(o||sec));el.inert=!(o||sec);if(typeof hdtSync=='function')hdtSync()/* Andrew 2026-11-06: section title in #hdt (Credit Cards / Banking / …) for list + product detail */}
if(CARDS_ONLY){document.body.classList.add('co');const r=$('#rtog');if(r){r.setAttribute('aria-label','Open the menu');r.title='Menu'}}/* cards-only: no side column and no header Wallet button; Wallet is the first item of the Profile menu */
/* left sidebar (Andrew 2026-10-29): the logo/name opens it; Home then the product lines; closes on outside tap, Esc or a pick */
/* wzFit(): Andrew 2026-11-05, the drawer pushes the page in Credit Cards / Banking / Brokers like profile views; while pushed, a table wider than the
   space left is scaled down (zoom on .wrap, --wz) so the page never scrolls sideways. Outside that state --wz is 1 and nothing changes. */
function wzFit(){const R=document.documentElement,on=R.classList.contains('snopen')&&document.body.classList.contains('co')&&innerWidth>=1100;R.style.setProperty('--wz','1');if(!on)return;const els=[...document.querySelectorAll('.wrap:not([hidden]),#view,#nav3,#ctl,#bar,#pre,#filters,#page,#sitefoot')].filter(e=>e.offsetParent&&e.offsetWidth);if(!els.length)return;let need=0,left=Infinity;for(const w of els){const r=w.getBoundingClientRect();need=Math.max(need,w.scrollWidth||0,r.width);left=Math.min(left,r.left)}const av=innerWidth-(left+scrollX)-12;if(need>av+1)R.style.setProperty('--wz',String(Math.max(.5,Math.floor(av/need*1000)/1000)))}/* Andrew 2026-11-06: SNAV_DRILL=false keeps product pages in #pfl (no body.snavsec); scale pushed chrome + tables to the viewport, not document.clientWidth (which can already be inflated) */
addEventListener('resize',()=>wzFit());
function paintProdExpand(){/* Andrew 2026-11-06 SNAV_DRILL=false: nest section views under #prodsub as collapsible product parents (same markup as secHTML). */
 if(SNAV_DRILL)return;const ps=$('#prodsub');if(!ps)return;const html=secHTML('p');if(ps._sec!=html){ps.innerHTML=html;ps._sec=html}/* not dataset: browsers lowercase data-* values */
 ps.querySelectorAll('.secg .ti:empty').forEach(t=>{const pl=(t.parentNode.dataset.sg||'').split('.')[0],g=document.querySelector('#pl [data-pl='+pl+'] svg');if(g)t.innerHTML=g.outerHTML})}
function snxPlace(){const sn=$('#snav');if(!sn)return;let x=document.getElementById('snx');if(!x){x=document.createElement('button');x.type='button';x.id='snx';x.setAttribute('aria-label','Close sidebar');x.title='Close sidebar';x.innerHTML='<svg viewBox="0 0 16 16" width=14 height=14 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M4 4l8 8M12 4l-8 8"/></svg>'}const h=document.body.classList.contains('snavsec')?sn.querySelector('#snavsec .snuh'):sn.querySelector('#pfl .snuh');if(h&&x.parentNode!==h)h.append(x);sn.querySelectorAll('#snavsec .secg .ti:empty').forEach(t=>{const g=document.querySelector('#pl [data-pl='+t.parentNode.dataset.sg+'] svg');if(g)t.innerHTML=g.outerHTML});sn.querySelectorAll('#prodsub [data-ppl] .ti:empty').forEach(t=>{const g=document.querySelector('#pl [data-pl='+t.parentNode.dataset.ppl+'] svg');if(g)t.innerHTML=g.outerHTML})}
function snavSet(o){const n=$('#snav'),l=$('#rtog'),hb=null;if(!n)return;const hd=$('header');if(o&&hd){const t=Math.max(0,Math.round(hd.getBoundingClientRect().bottom))+'px';n.style.top=t}clearTimeout(snavSet.t);const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;if(o){snavSet.flick=(snavSet.flick||0)+1;n.classList.remove('out','snswipe','snaway');n.style.transform='';n.style.transition='';n.style.animation='';n.hidden=false}else if(!n.hidden){if(n.classList.contains('snaway')){/* a phone flick is already sliding it off; closed state still persists below */}else if(RM){n.hidden=true;n.classList.remove('out','snswipe','snaway');n.style.transform='';n.style.transition='';n.style.animation=''}else{n.classList.remove('snswipe');n.style.transform='';n.style.transition='';n.style.animation='';n.classList.add('out');snavSet.t=setTimeout(()=>{n.hidden=true;n.classList.remove('out')},220)}}if(l){l.classList.toggle('snon',!!o);if(CARDS_ONLY){l.setAttribute('aria-expanded',String(!!o));l.setAttribute('aria-controls','snav')}}if(hb){hb.setAttribute('aria-expanded',String(!!o));hb.setAttribute('aria-label',o?'Close menu':'Open menu')}document.documentElement.classList.toggle('snopen',!!o);try{sessionStorage.setItem('ptt.snav',o?'1':'0')}catch(_){}wzFit();if(o&&!snavSet.keep)(n.querySelector('button.on')||n.querySelector('button'))?.focus()}
/* Andrew 2026-11-04: no outside-click close. The drawer closes from its ✕, the Profile toggle, Esc, or — on a phone — a flick toward the off-screen edge. A tap on the empty header row (not the label, not the ✕) does nothing. */document.addEventListener('click',e=>{if(e.target.closest('#snav .snuh')&&e.target.classList.contains('snuh')){e.preventDefault();e.stopImmediatePropagation();return}if(e.target.closest('#snx')){snavSet(false);$('#rtog')?.focus()}const so=e.target.closest('[data-soon]');if(so){e.stopImmediatePropagation();st.pl='info';st.s='soon_'+so.dataset.soon;st.card=null;render();scrollTo(0,0)}},true);
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&$('#snav')&&!$('#snav').hidden){snavSet(false);$('#rtog')?.focus()}});
function togRail(){if(CARDS_ONLY){snavSet($('#snav').hidden);return}STO.ui={...(STO.ui||{}),rail:!railOpen()};saveS();rail()}
/* Subscriptions lives in Accounts (2026-11-02, from B11 24d4f2d): in cards-only, navigating to the old Subscriptions page (a link, a saved or typed URL) opens Accounts at its Subscriptions section. Applied on navigation, not on internal renders. */
function navR(){if((st.s=='points'||st.s=='pointcards')&&!st.card){st.s='pointcards';if(st.pl=='info')st.pl='cards'}}/* 2026-11-05: Loyalty is its own User page (st.s pointcards). The old points route opens that page. Storage stays wallet.points. */
function render(){UIQ.delete('render');if(st.card){/* product detail page: stay in the product section menu (Andrew 2026-11-06), never the Profile greeting */
 if(!SECL.has(st.pl))st.pl='cards';if(USR.has(st.s)||st.s=='wfolder'||String(st.s||'').startsWith('soon_'))st.s=(typeof CTV=='function'&&CTV()||['ovw'])[0]||'ovw'}
 const fh0=$('#fhead');if(fh0)fh0.innerHTML='';/* a search always lives inside Credit Cards (Home never shows a results table without its tabs) */if(st.q&&st.pl=='home'){st.pl='cards';st.s=st.s||'ov'}render0();{/* Filters / Suggested / Reset sit above the panel and follow its visibility */const fh=$('#fhead'),f=$('#filters');if(fh)fh.hidden=!fh.innerHTML||f.hidden||f.style.display=='none';const ct=$('#ctl');if(ct)ct.hidden=st.pl=='home'||st.pl=='info'||!!st.card||USR.has(st.s)}rail();hero();vpSet();if(typeof hdtSync=='function')hdtSync()/* after vpSet: section #hdt left needs the post-zoom header layout */}
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
 const B=(id,t,sub,art,extra)=>`<section class=sbeat data-beat=${id} aria-labelledby=hb-${id}><div class=sin><div class="stx sfade">${t}<p class=ssub>${sub}</p>${extra||''}</div><div class="sart sfade" aria-hidden=true>${art}</div></div></section>`;
 return `${B('leak',`<h1 class=sh id=hb-leak>It pays to read the terms.</h1>`,`Bonuses you never claimed. Perks you never used. Rewards you never earned. Coverage you never knew you had.`,SIL.leak)}
 ${B('open',`<h2 class=sh id=hb-open><b class=hn title="${n(h.datapoints)} values on file">${n(h.dp_floor)}</b>+ data points, <em>traced to its original source.</em></h2>`,`Every account linked to its perks, insurance, earn rates and sources.`,SIL.open)}
 ${B('hid',`<h2 class=sh id=hb-hid>A wallet tailored to your <em>lifestyle.</em></h2>`,`How you shop, travel, eat, commute, save and invest decides which account benefits you the most. We match you to the products which best serve you, not the ones we're paid to promote.`,SIL.hid)}
 ${B('adv',`<h2 class=sh id=hb-adv>Now it's your <em>unfair advantage.</em></h2>`,`Set your spend, see the best account per category and what you leave behind.`,SIL.adv,`<div class=hcta><button type=button class="btn hline" data-hgo=wallet>Build your wallet</button></div>`)}
 <section class="sbeat send" data-beat=end aria-labelledby=hb-end><div class="sin"><div class="stx sfade"><h2 class=sh id=hb-end>Same spend. <em>Smarter wallet.</em></h2><div class=hcta><button type=button class="btn hfill" data-hgo=table>Open Credit Cards</button></div></div><div class="sart sfade" aria-hidden=true>${SIL.end}</div></div></section>`}
/*HERO-END*/

/* Home story: parts fade in as they scroll into view. Without IntersectionObserver or under prefers-reduced-motion nothing is hidden, so everything is simply visible. */
/* Story arrows: each panel but the last has a Next button that scrolls to the following panel (instant under reduced motion). */
function storyInit(){const el=$('#hero');if(!el||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;el.classList.add('sjs');const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.2});el.querySelectorAll('.sfade').forEach(b=>io.observe(b))}
function hero(){const el=$('#hero');if(!el)return;const on=st.pl=='home'&&!st.card&&!USR.has(st.s);el.hidden=!on;if(on&&!el.dataset.r){el.innerHTML=heroHTML();el.dataset.r='1';storyInit()}}
document.addEventListener('click',e=>{const g=e.target.closest('[data-hgo]');if(g){e.preventDefault();if(g.dataset.hgo=='wallet'){if(st.pl=='info'||st.pl=='home')st.pl='cards';st.s='wallet';st.card=null}else{st.pl='cards';st.s=g.dataset.hgo=='ins'?'ins':'ov';if(st.s=='ins')st.g={...(st.g||{}),ins:'trv'};st.card=null}render();scrollTo(0,0);return}});
const HTAG={CITED:'Checked against a primary source we archived.',ESTIMATE:'Derived by us from cited inputs; method shown.',REPORTED:'From a third party or an account record; not confirmed in a primary source.'};
/* Footer pages (About, Privacy, Terms of use, Disclaimer, Advertiser disclosure, Contact): pages at #{"pl":"info","s":<id>}. Methodology stays retired. About restored 2026-11-06 with approved story copy. Short, honest; nothing claims an address, registration or contact channel that does not exist. */
const INFOP={about:['About',''],/* Andrew 2026-11-06: body from aboutHTML() */
 privacy:['Privacy Policy',`<p class=infoup>Last updated: 2026-11-06</p><p>PerTheTerms compares Canadian credit cards, bank accounts, brokers and telecom plans, and helps you get more from the ones you hold. This page explains, plainly, what we keep and why.</p>
<h2>Browsing without an account</h2><p>You can use the comparison pages without signing in. Accounts you add, spend amounts and settings are kept in your browser’s storage on your device.</p>
<h2>Signing in</h2><ul><li>Sign-in is with Google only. We receive your Google account ID, email address and name. We never see your Google password.</li><li>Signing in sets one cookie, <code>__Host-ptt_s</code>. It is HttpOnly and Secure: page scripts cannot read it and it is only sent over HTTPS. We store only a hash of it. It is a sign-in cookie, not a tracker.</li></ul>
<h2>What we store when you sign in</h2><ul><li>Your wallet syncs to our database so it follows you across devices: the accounts, subscriptions, loyalty programs, spending and profile facts you choose to enter, and your settings.</li><li>The database is Cloudflare D1, which Cloudflare encrypts at rest. Every connection to the site uses HTTPS.</li><li>We do not ask for card numbers, bank account numbers or bank passwords.</li></ul>
<h2>Connections</h2><ul><li>Keys and tokens for connected services are encrypted individually with AES-GCM before they are stored. They are never sent back to your browser.</li><li>Kubera balances are read with a read-only Kubera API key and cached for up to an hour.</li><li>Planned: read-only bank and card connections through Plaid, and brokerage connections through SnapTrade. You sign in to your bank inside their screens, never ours. We would use the data only to show your balances, spending and missed rewards.</li></ul>
<h2>What we do not do</h2><ul><li>We do not sell or rent your data.</li><li>We do not run advertising or tracking scripts.</li><li>We do not share your data except with the services that run the site (Cloudflare for hosting and storage, Google for sign-in) and the connection providers you choose to link.</li></ul>
<h2>How long we keep it</h2><p>We keep your data while your account is active. When you delete your account, we delete your account and every row tied to it, including sessions, synced data, cached balances and connection keys and tokens, and we ask Plaid to revoke any linked bank connections.</p>
<h2>Delete your account</h2><p>Signed in, open <b>Profile</b> and choose <b>Delete account</b>, then type DELETE to confirm. It takes effect at once and cannot be undone. Data in your browser is cleared on that device. To clear another device, clear this site’s data in that browser.</p><p><button type=button class=acdbtn data-acdel>Delete account…</button></p>
<h2>Your rights</h2><p>We follow the principles of Canada’s Personal Information Protection and Electronic Documents Act (PIPEDA). You can ask to see, correct or delete your information. You can also contact the Office of the Privacy Commissioner of Canada.</p>
<h2>Changes</h2><p>If our practices change, we will update this page and the date above.</p>
<h2>Security</h2><p>Sessions use an HttpOnly cookie. Connection tokens are encrypted with AES-GCM. Before a bank link opens (when that feature is on), we email a one-time code to your account address. We keep a small audit log of sign-in, bank link/unlink, account deletion, code verification and contact form sends (timestamp, user id when signed in, hashed IP, and for contact the topic only — never passwords, tokens or message bodies). The full one-page policy for reviewers is <code>Docs/security-policy.md</code> in the project repository.</p>
<h2>Contact</h2><p>Privacy questions: <a href="mailto:admin@pertheterms.com">admin@pertheterms.com</a>.</p>`],
 terms:['Terms of Use',`<!-- Draft, pending legal review. --><p class=infoup>Last updated: October 29, 2026</p><p>These Terms of Use govern your use of pertheterms.com (the “Site”), operated by [TODO: legal entity name] (“PerTheTerms”, “we”, “us”). By using the Site you agree to these terms. If you do not agree, please do not use the Site.</p><h2>Information only</h2><p>The Site compares Canadian financial accounts using information taken from issuer documents and other sources. It is provided for general information only. It is not financial, legal, tax or insurance advice, and it is not an offer, solicitation or recommendation to apply for, keep or cancel any product.</p><h2>Accuracy and timeliness</h2><p>Issuers change their terms, fees, rates and offers, often without notice. We work to keep information accurate and to show the date and source of each figure, but we do not guarantee that any information on the Site is complete, current or free of errors. Always confirm the current terms with the issuer before you make a decision.</p><h2>No warranty</h2><p>The Site and its content are provided “as is” and “as available”, without warranties of any kind, express or implied, including warranties of accuracy, fitness for a particular purpose and non-infringement, to the fullest extent permitted by law.</p><h2>Limitation of liability</h2><p>To the fullest extent permitted by law, PerTheTerms and its operators will not be liable for any direct, indirect, incidental, consequential or special loss or damage arising from your use of, or reliance on, the Site or its content, including any decision you make about a financial product. Nothing in these terms limits liability that cannot be limited under applicable law.</p><h2>Estimates and tools</h2><p>Your personal figures and other values tagged ESTIMATE are our calculations from the inputs you provide and published terms. They are illustrations, not promises of what you will earn, pay or receive.</p><h2>Third-party links and trademarks</h2><p>The Site links to websites we do not control; we are not responsible for their content or practices. Product names, card names, logos and trademarks belong to their respective owners. Their use on the Site is for identification only and does not imply endorsement by, or affiliation with, those owners.</p><h2>Acceptable use</h2><p>Do not use the Site in a way that breaks the law, interferes with its operation, or copies its content in bulk for redistribution without our permission.</p><h2>Changes to these terms</h2><p>We may update these terms from time to time. The date above shows when they last changed. Continuing to use the Site after a change means you accept the updated terms.</p><h2>Governing law</h2><p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there. The courts of Ontario have exclusive jurisdiction over any dispute about these terms or the Site.</p><h2>Contact</h2><p><a href="mailto:admin@pertheterms.com">admin@pertheterms.com</a>. Mail: [TODO: legal entity name], [TODO: mailing address].</p>`],
 disclaimer:['Disclaimer',`<!-- Draft, pending legal review. --><p class=infoup>Last updated: October 29, 2026</p><h2>Not advice</h2><p>PerTheTerms provides general information about Canadian financial accounts. Nothing on the Site is financial, legal, tax or insurance advice, and nothing is a recommendation to open, keep or close any account. Consider your own circumstances and, where appropriate, speak with a qualified professional.</p><h2>Check with the issuer</h2><p>Terms, fees, interest rates, rewards and welcome offers change, and the issuer’s current documents always take precedence over the Site. Confirm every detail with the issuer before you apply.</p><h2>Insurance summaries</h2><p>Insurance information on the Site is a short summary of coverage described in issuer documents. It is not the policy wording. Coverage, limits, eligibility and exclusions are set only by the certificate or policy issued by the insurer; read it before you rely on any coverage.</p><h2>How figures are tagged</h2><p>Every figure on the Site carries one of three tags:</p><dl class=infodl>${['CITED','ESTIMATE','REPORTED'].map(k=>`<dt><span class=htag>${k}</span></dt><dd>${HTAG[k]}</dd>`).join('')}</dl><p>A dash means the value is unknown or not yet checked; we do not guess.</p><h2>Errors</h2><p>We correct errors when we find them. If you spot one, please tell us at <a href="mailto:admin@pertheterms.com">admin@pertheterms.com</a>.</p>`],
 ads:['Advertiser Disclosure',`<!-- Draft, pending legal review. --><p class=infoup>Last updated: October 29, 2026</p><h2>How PerTheTerms is paid</h2><p>PerTheTerms does not currently receive payment from any issuer or advertiser. There are no paid placements, sponsored listings or affiliate commissions on the Site today.</p><h2>How results are ordered</h2><p>The order of results comes from the filters and sort you choose and from the published terms of each account. It is not influenced by any payment or relationship with an issuer.</p><h2>Links</h2><p>Some links go to an issuer’s public landing page, and the issuer’s own address may include tracking or campaign codes. Those codes belong to the issuer or its partners; we do not earn anything when you use them.</p><h2>If this changes</h2><p>If PerTheTerms ever earns compensation from a listed company, this page will say so before it starts, and the affected listings or links will be clearly marked. Compensation will not change how accounts are ranked or what the figures say.</p>`],
 contact:['Contact',''],/* rendered by contactHTML() (Andrew 2026-11-06 form) */
 soon_bank:['Banking',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a bank building with a coin dropping onto a stack of coins"><defs><linearGradient id=sgb x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgbg cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgb)"/><circle cx=260 cy=180 r=190 fill="url(#sgbg)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><path d="M110 132 230 70l120 62z" fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 stroke-linejoin=round /><circle cx=230 cy=110 r=10 fill="#ffd23f"/><rect x=114 y=132 width=232 height=16 rx=4 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><g fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3><rect x=132 y=156 width=26 height=134 rx=6 /><rect x=180 y=156 width=26 height=134 rx=6 /><rect x=254 y=156 width=26 height=134 rx=6 /><rect x=302 y=156 width=26 height=134 rx=6 /></g><rect x=216 y=226 width=28 height=64 rx=10 fill="#3a7bff"/><rect x=104 y=296 width=252 height=22 rx=6 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /></g><g class="sanim sbob"><g fill="#ffd23f" stroke="#0a1020" stroke-width=2><rect x=372 y=290 width=76 height=18 rx=9 /><rect x=376 y=272 width=76 height=18 rx=9 /><rect x=370 y=254 width=76 height=18 rx=9 /><rect x=378 y=236 width=76 height=18 rx=9 /></g></g><g class="sanim sfall"><circle cx=414 cy=180 r=17 fill="#ffd23f" stroke="#0a1020" stroke-width=2 /><path d="M414 172v16" stroke="#0a1020" stroke-width=3 stroke-linecap=round /></g><g class="sanim sbob" opacity=.8><path d="M60 60l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/><path d="M470 96l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/></g></svg><p class=soonk>Coming soon</p></div>`],
 soon_broker:['Brokers',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a trading screen with price candles and a rising line"><defs><linearGradient id=sgr x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgrg cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgr)"/><circle cx=260 cy=180 r=190 fill="url(#sgrg)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><rect x=90 y=70 width=340 height=230 rx=22 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><path d="M90 106h340" stroke="rgba(255,255,255,.25)" stroke-width=3 /><g fill="#ff8a3d"><circle cx=114 cy=88 r=6 /></g><circle cx=134 cy=88 r=6 fill="#ffd23f"/><circle cx=154 cy=88 r=6 fill="#5ee0a0"/><g stroke="rgba(255,255,255,.12)" stroke-width=2><path d="M114 150h292M114 200h292M114 250h292"/></g><g stroke-width=4 stroke-linecap=round><path d="M146 214v58M196 194v54M246 204v48M296 156v62M346 138v52" stroke="rgba(255,255,255,.45)"/></g><rect x=134 y=228 width=24 height=30 rx=5 fill="#ff8a3d"/><rect x=184 y=206 width=24 height=30 rx=5 fill="#5ee0a0"/><rect x=234 y=214 width=24 height=26 rx=5 fill="#ff8a3d"/><rect x=284 y=170 width=24 height=34 rx=5 fill="#5ee0a0"/><rect x=334 y=148 width=24 height=30 rx=5 fill="#5ee0a0"/><path d="M120 262C170 250 200 222 240 222s60-46 100-60 50-26 70-40" fill=none stroke="#3a7bff" stroke-width=5 stroke-linecap=round /></g><g class="sanim sbob"><circle cx=420 cy=110 r=30 fill="#5ee0a0"/><path d="M406 120l14-16 14 16M420 104v26" fill=none stroke="#0a1020" stroke-width=5 stroke-linecap=round stroke-linejoin=round /></g><g class="sanim sbob" opacity=.8><path d="M56 250l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/><path d="M470 250l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#ff8a3d"/></g></svg><p class=soonk>Coming soon</p></div>`],
 soon_invest:['Investments',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a portfolio ring beside a sapling growing from a stack of coins"><defs><linearGradient id=sgi x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgig cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgi)"/><circle cx=260 cy=180 r=190 fill="url(#sgig)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><circle cx=200 cy=190 r=100 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><g fill=none stroke-width=30><circle cx=200 cy=190 r=66 stroke="#3a7bff" stroke-dasharray="166 415" transform="rotate(-90 200 190)"/><circle cx=200 cy=190 r=66 stroke="#ff8a3d" stroke-dasharray="104 415" stroke-dashoffset=-170 transform="rotate(-90 200 190)"/><circle cx=200 cy=190 r=66 stroke="#5ee0a0" stroke-dasharray="83 415" stroke-dashoffset=-278 transform="rotate(-90 200 190)"/><circle cx=200 cy=190 r=66 stroke="#ffd23f" stroke-dasharray="46 415" stroke-dashoffset=-365 transform="rotate(-90 200 190)"/></g><circle cx=200 cy=190 r=34 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 /></g><g fill="#ffd23f" stroke="#0a1020" stroke-width=2><rect x=330 y=300 width=90 height=18 rx=9 /><rect x=336 y=282 width=90 height=18 rx=9 /><rect x=328 y=264 width=90 height=18 rx=9 /></g><path d="M374 264v-74" stroke="#5ee0a0" stroke-width=5 stroke-linecap=round /><g class="sanim sbob"><path d="M374 216c-30 0-46-18-48-42 26 0 46 14 48 42z" fill="#5ee0a0"/><path d="M374 196c4-30 24-46 52-46-2 28-22 46-52 46z" fill="#5ee0a0" opacity=.8 /><circle cx=374 cy=186 r=6 fill="#ffd23f"/></g><g class="sanim sbob" opacity=.8><path d="M70 70l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/><path d="M456 60l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/></g></svg><p class=soonk>Coming soon</p></div>`],
 soon_tel:['Telecom',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a phone and a home router sending signal waves beside a TV"><defs><linearGradient id=sgt x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgtg cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgt)"/><circle cx=260 cy=180 r=190 fill="url(#sgtg)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><rect x=110 y=150 width=200 height=130 rx=16 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><rect x=126 y=166 width=168 height=98 rx=8 fill="#24366a"/><path d="M180 196l36 20-36 20z" fill="#ff8a3d"/><path d="M180 280v24M240 280v24M160 306h100" stroke="rgba(255,255,255,.5)" stroke-width=4 stroke-linecap=round /><rect x=330 y=120 width=90 height=170 rx=18 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><rect x=342 y=140 width=66 height=118 rx=6 fill="#3a7bff"/><circle cx=375 cy=274 r=6 fill="rgba(255,255,255,.5)"/><rect x=140 y=86 width=110 height=34 rx=10 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 /><circle cx=160 cy=103 r=4 fill="#5ee0a0"/><circle cx=174 cy=103 r=4 fill="#5ee0a0"/><circle cx=188 cy=103 r=4 fill="#ffd23f"/><path d="M226 86V62" stroke="rgba(255,255,255,.5)" stroke-width=4 stroke-linecap=round /></g><g class="sanim sbob" fill=none stroke="#5ee0a0" stroke-width=5 stroke-linecap=round><path d="M212 50a20 20 0 0 1 28 0"/><path d="M202 40a34 34 0 0 1 48 0" opacity=.6 /><path d="M392 100a24 24 0 0 0-34 0" stroke="#ffd23f"/><path d="M402 88a40 40 0 0 0-54 0" stroke="#ffd23f" opacity=.6 /></g><g class="sanim sbob" opacity=.8><path d="M60 70l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/><path d="M456 200l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/></g></svg><p class=soonk>Coming soon</p></div>`],
 soon_pyt:['PerYourTerms',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: three cards feeding a gear that lights a star"><defs><linearGradient id=sgp x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgpg cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgp)"/><circle cx=260 cy=180 r=190 fill="url(#sgpg)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><rect x=86 y=110 width=150 height=94 rx=14 fill="#3a7bff" transform="rotate(-10 160 160)"/><rect x=96 y=150 width=150 height=94 rx=14 fill="#ff8a3d" transform="rotate(-2 170 200)"/><rect x=106 y=190 width=150 height=94 rx=14 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><rect x=122 y=212 width=34 height=24 rx=6 fill="#ffd23f"/><path d="M258 236h40" stroke="#5ee0a0" stroke-width=5 stroke-linecap=round stroke-dasharray="2 12"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(0 332 200)"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(45 332 200)"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(90 332 200)"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(135 332 200)"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(180 332 200)"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(225 332 200)"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(270 332 200)"/><rect x=322 y=150 width=20 height=34 rx=4 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(315 332 200)"/><circle cx=332 cy=200 r=40 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><circle cx=332 cy=200 r=14 fill="#5ee0a0"/></g><g class="sanim sbob"><path d="M412 92l10 22 24 3-18 16 5 24-21-12-21 12 5-24-18-16 24-3z" fill="#ffd23f"/></g><g class="sanim sbob" opacity=.8><path d="M60 64l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/><path d="M450 250l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ff8a3d"/></g></svg><p class=soonk>Coming soon</p></div>`],
 soon_connections:['Connections',''],/* B26 (Andrew 2026-11-05): a real page, connsPage() */
 soon_promotions:['Promotions',`<div class=soon><h2>Promotions</h2><p class=soonk>Coming soon</p></div>`],/* Andrew 2026-11-03: PerYourTerms sub-pages, placeholders */
 soon_purchasing:['My Wallet',`<div class=soon><h2>My Wallet</h2><p class=soonk>Coming soon</p></div>`],
 soon_saving:['Saving',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a bank building with a coin dropping onto a stack of coins"><defs><linearGradient id=sgsv x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgsvg cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgsv)"/><circle cx=260 cy=180 r=190 fill="url(#sgsvg)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><path d="M110 132 230 70l120 62z" fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 stroke-linejoin=round /><circle cx=230 cy=110 r=10 fill="#ffd23f"/><rect x=114 y=132 width=232 height=16 rx=4 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><g fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3><rect x=132 y=156 width=26 height=134 rx=6 /><rect x=180 y=156 width=26 height=134 rx=6 /><rect x=254 y=156 width=26 height=134 rx=6 /><rect x=302 y=156 width=26 height=134 rx=6 /></g><rect x=216 y=226 width=28 height=64 rx=10 fill="#3a7bff"/><rect x=104 y=296 width=252 height=22 rx=6 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /></g><g class="sanim sbob"><g fill="#ffd23f" stroke="#0a1020" stroke-width=2><rect x=372 y=290 width=76 height=18 rx=9 /><rect x=376 y=272 width=76 height=18 rx=9 /><rect x=370 y=254 width=76 height=18 rx=9 /><rect x=378 y=236 width=76 height=18 rx=9 /></g></g><g class="sanim sfall"><circle cx=414 cy=180 r=17 fill="#ffd23f" stroke="#0a1020" stroke-width=2 /><path d="M414 172v16" stroke="#0a1020" stroke-width=3 stroke-linecap=round /></g><g class="sanim sbob" opacity=.8><path d="M60 60l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/><path d="M470 96l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/></g></svg><p class=soonk>Coming soon</p></div>`],/* Andrew 2026-11-05: User › Saving placeholder */
/* Andrew 2026-11-06: Profile › Assets placeholder */
 soon_liabilities:['Liabilities',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a balance scale with bills on one pan"><defs><linearGradient id=sgli x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sglig cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgli)"/><circle cx=260 cy=180 r=190 fill="url(#sglig)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><rect x=248 y=90 width=24 height=140 rx=8 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3/><circle cx=260 cy=88 r=16 fill="#3a7bff"/><path d="M120 160h280" stroke="rgba(255,255,255,.55)" stroke-width=6 stroke-linecap=round/><g><rect x=100 y=168 width=110 height=70 rx=12 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3/><path d="M118 190h74M118 206h54" stroke="#ff8a3d" stroke-width=4 stroke-linecap=round/><path d="M155 160v8" stroke="rgba(255,255,255,.55)" stroke-width=4/></g><g class="sanim sbob"><rect x=310 y=168 width=110 height=70 rx=12 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3/><path d="M328 190h74M328 206h40" stroke="#5ee0a0" stroke-width=4 stroke-linecap=round/><path d="M365 160v8" stroke="rgba(255,255,255,.55)" stroke-width=4/></g><rect x=220 y=268 width=80 height=18 rx=6 fill="#24366a"/></g><g class="sanim sbob" opacity=.8><path d="M70 70l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/><path d="M450 90l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#ff8a3d"/></g></svg><p class=soonk>Coming soon</p></div>`],/* Andrew 2026-11-06: Profile › Liabilities placeholder */
 soon_investing:['Investing',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a portfolio ring beside a sapling growing from a stack of coins"><defs><linearGradient id=sgiv x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgivg cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgiv)"/><circle cx=260 cy=180 r=190 fill="url(#sgivg)"/><ellipse cx=260 cy=346 rx=160 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><circle cx=200 cy=190 r=100 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><g fill=none stroke-width=30><circle cx=200 cy=190 r=66 stroke="#3a7bff" stroke-dasharray="166 415" transform="rotate(-90 200 190)"/><circle cx=200 cy=190 r=66 stroke="#ff8a3d" stroke-dasharray="104 415" stroke-dashoffset=-170 transform="rotate(-90 200 190)"/><circle cx=200 cy=190 r=66 stroke="#5ee0a0" stroke-dasharray="83 415" stroke-dashoffset=-278 transform="rotate(-90 200 190)"/><circle cx=200 cy=190 r=66 stroke="#ffd23f" stroke-dasharray="46 415" stroke-dashoffset=-365 transform="rotate(-90 200 190)"/></g><circle cx=200 cy=190 r=34 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 /></g><g fill="#ffd23f" stroke="#0a1020" stroke-width=2><rect x=330 y=300 width=90 height=18 rx=9 /><rect x=336 y=282 width=90 height=18 rx=9 /><rect x=328 y=264 width=90 height=18 rx=9 /></g><path d="M374 264v-74" stroke="#5ee0a0" stroke-width=5 stroke-linecap=round /><g class="sanim sbob"><path d="M374 216c-30 0-46-18-48-42 26 0 46 14 48 42z" fill="#5ee0a0"/><path d="M374 196c4-30 24-46 52-46-2 28-22 46-52 46z" fill="#5ee0a0" opacity=.8 /><circle cx=374 cy=186 r=6 fill="#ffd23f"/></g><g class="sanim sbob" opacity=.8><path d="M70 70l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/><path d="M456 60l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/></g></svg><p class=soonk>Coming soon</p></div>`],/* Andrew 2026-11-05: User › Investing placeholder */
 soon_inst:['Institutions',`<div class=soon><svg class=soonart viewBox="0 0 520 380" role=img aria-label="Illustration: a row of three institution buildings in different colours"><defs><linearGradient id=sgn x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgng cx=.5 cy=.45 r=.5><stop offset=0 stop-color="#4e8cff" stop-opacity=.32 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=380 rx=26 fill="url(#sgn)"/><circle cx=260 cy=180 r=190 fill="url(#sgng)"/><ellipse cx=260 cy=346 rx=180 ry=10 fill="rgba(0,0,0,.3)"/><g class="sanim sfloat"><path d="M64 194L120 170L176 194z" fill="#3a7bff"/><rect x=70 y=194 width=100 height=120 rx=6 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><rect x=84 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=108 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=132 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=156 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=64 y=310 width=112 height=8 rx=3 fill="#24366a"/><path d="M204 144L260 120L316 144z" fill="#ff8a3d"/><rect x=210 y=144 width=100 height=170 rx=6 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><rect x=224 y=150 width=8 height=136 rx=2 fill="rgba(255,255,255,.45)"/><rect x=248 y=150 width=8 height=136 rx=2 fill="rgba(255,255,255,.45)"/><rect x=272 y=150 width=8 height=136 rx=2 fill="rgba(255,255,255,.45)"/><rect x=296 y=150 width=8 height=136 rx=2 fill="rgba(255,255,255,.45)"/><rect x=204 y=310 width=112 height=8 rx=3 fill="#24366a"/><path d="M344 194L400 170L456 194z" fill="#5ee0a0"/><rect x=350 y=194 width=100 height=120 rx=6 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 /><rect x=364 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=388 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=412 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=436 y=200 width=8 height=86 rx=2 fill="rgba(255,255,255,.45)"/><rect x=344 y=310 width=112 height=8 rx=3 fill="#24366a"/></g><g class="sanim sbob" fill=none stroke="rgba(255,255,255,.35)" stroke-width=3 stroke-dasharray="4 8" stroke-linecap=round><path d="M170 200Q190 150 214 160"/><path d="M350 200Q330 150 306 160"/></g><g class="sanim sbob" opacity=.8><path d="M70 80l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="#ffd23f"/><path d="M450 90l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#5ee0a0"/></g></svg><p class=soonk>Coming soon</p></div>`],/* Andrew 2026-11-04: footer Intelligence > Institutions placeholder */
 ci:['Competitive Intelligence',''],/* Andrew 2026-11-03 (labels 2026-11-04): footer Intelligence > Product = data dictionary (renderCI) */
 soon_profile:['Profile',`<div class=soon><h2>Profile</h2><p class=soonk>Coming soon</p></div>`],/* Andrew 2026-11-03: Profile KPIs moved to Dashboard */
 soon_subscription:['Plans','']/* Andrew 2026-11-06: Settings > Plans (pricing v6); checkout not live */};
const INFOK=Object.keys(INFOP),TITLE0=document.title;
/* Plan tier for Settings › Plans (Andrew 2026-11-06 v6). Pre-launch everyone is Basic; ?plan=premium|ultra or localStorage ptt.plan for demos. */
const PLAN_ORDER=['basic','premium','ultra'];
const planTier=()=>{try{const q=new URLSearchParams(location.search).get('plan');if(PLAN_ORDER.includes(q))return q;const v=localStorage.getItem('ptt.plan');if(PLAN_ORDER.includes(v))return v}catch(e){}return 'basic'};
const planAtLeast=need=>{const a=PLAN_ORDER.indexOf(planTier()),b=PLAN_ORDER.indexOf(need);return a>=0&&b>=0&&a>=b};
(()=>{try{const q=new URLSearchParams(location.search),v=q.get('plan');if(v!=null){if(PLAN_ORDER.includes(v)&&v!='basic')localStorage.setItem('ptt.plan',v);else localStorage.removeItem('ptt.plan');q.delete('plan');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash)}}catch(e){}})();
/* Subtle upgrade prompt (Andrew 2026-11-06 v6): Basic hits any account, tracking, upload or connection area. Capabilities only; no invented savings. */
const UP_COPY={
 accounts:{need:'premium',title:'Track the accounts you hold',body:'Premium connects your money so balances, holdings and spend sit in one wallet. Basic stays a product comparison tool with no account values or tracking.',cta:'See Premium'},
 promo:{need:'premium',title:'See promos you actually qualify for',body:'With connected accounts, Promotions can surface sign-up bonuses and offers that match your profile and show progress toward spend thresholds from real activity.',cta:'See Premium'},
 wallet:{need:'premium',title:'Route spending from real activity',body:'Connected transactions power the best card per category, annual fee versus rewards earned, keep/cancel signals, and quantified savings from your own data.',cta:'See Premium'},
 invest:{need:'premium',title:'Audit fees and place assets smarter',body:'Connected brokerage data can flag MER drag, trading and FX costs, and help track TFSA, RRSP and FHSA room for better asset placement.',cta:'See Premium'},
 bank:{need:'premium',title:'Connect banks and spot fee drag',body:'Link chequing and savings (Plaid or your own connection) for fee audits, idle-cash checks, and the quantified savings story on your data.',cta:'See Premium'},
 upload:{need:'premium',title:'Upload statements and connect your own data',body:'Premium unlocks on-device uploads, Kubera-style custom connections, and bring-your-own AI via API/MCP. Basic has none of those.',cta:'See Premium'},
 tel:{need:'premium',title:'Right-size your telecom plan',body:'Usage and bill history from connected accounts can highlight overpaying and promo expiry on your mobile or home plan.',cta:'See Premium'},
 alerts:{need:'premium',title:'Catch renewals and matching offers',body:'Premium can watch for retention offers, annual fee renewals, promo expiries, price drops, rate changes and new offers that fit what you hold.',cta:'See Premium'},
 subs:{need:'premium',title:'Find duplicate and forgotten subscriptions',body:'Connected spend can surface overlapping or unused subscriptions so you can cancel or consolidate with evidence.',cta:'See Premium'},
 ultra:{need:'ultra',title:'Ask AI about your own numbers',body:'Ultra runs our hosted models on your linked data: plain-language Q&A, a monthly money briefing, an advisor-ready profile, and coming-soon investment statement history with ACB tracking.',cta:'See Ultra'}
};
function upPromptHTML(area){const o=UP_COPY[area];if(!o||planAtLeast(o.need))return '';
 return `<aside class=upprompt data-up=${esc(area)} data-need=${esc(o.need)} role=note><div class=upbd><p class=upt>${esc(o.title)}</p><p class=upb>${esc(o.body)}</p><p class=upft><button type=button class="btn2 upgo" data-soon=subscription>${esc(o.cta)}</button></p></div></aside>`}
/* Settings › Plans (st.s='soon_subscription'): pricing v6 (Andrew 2026-11-06). Basic = product comparison only. Premium = connected money + BYO data/AI + quantified savings. Ultra = Premium + our AI (+ ACB coming soon). */
function subHTML(){
 const basic=[['Product tables','Credit cards, banking, brokerage and more, with a source and evidence tag on every value'],
  ['Qualitative comparisons','See which product has a higher rate, a better perk, or a weaker term'],
  ['No account tracking','No balances, holdings, wallet or spend tracking on Basic'],
  ['No uploads or connections','No statement uploads, Plaid, Kubera-style links, or bring-your-own AI']];
 const premium=[['Connect your money','Plaid bank and card links, or bring your own data via custom connections such as Kubera'],
  ['Bring your own AI','Your assistant via API/MCP reads and writes against your connected account'],
  ['Wallet and spending','Account tracking, category routing, fee versus rewards, keep/cancel timing'],
  ['Quantified savings','We save you / we have saved you figures computed only from your real linked data at runtime'],
  ['Everything Basic compares','All product tables and qualitative comparisons stay included']];
 const ultra=[['Everything in Premium','Connections, wallet, BYO AI, and quantified savings from your data'],
  ['Plain-language Q&A','Ask our hosted AI about your own linked accounts and spending'],
  ['Monthly money briefing','A short read of what changed and what to watch'],
  ['Advisor-ready profile','An auto-drafted financial snapshot you can share'],
  ['Investment statements and ACB','Store statements, rebuild account history and adjusted cost base tracking','soon']];
 const li=a=>{const soon=a[2]==='soon'?` <span class=plsoon>Coming soon</span>`:'';return `<li><b>${esc(a[0])}${soon}</b>${a[1]?`<span>${esc(a[1])}</span>`:''}</li>`};
 const rows=[
  ['Product tables and qualitative comparisons','y','y','y'],
  ['Account values, balances and wallet tracking','n','y','y'],
  ['Data uploads and custom connections (e.g. Kubera)','n','y','y'],
  ['Plaid bank/card connections','n','y','y'],
  ['Bring your own AI (MCP/API)','n','y','y'],
  ['Quantified savings from your linked data','n','y','y'],
  ['Personalized promos, alerts, fee audits','n','y','y'],
  ['Hosted AI (Q&A, briefing, advisor profile)','n','n','y'],
  ['Investment statements and ACB tracking','n','n','soon']];
 const cell=v=>v=='y'?`<td class="plcy"><span class=plcyes aria-label="Included">Yes</span></td>`:v=='soon'?`<td class="plcn"><span class=plcsoon aria-label="Coming soon">Coming soon</span></td>`:`<td class="plcn"><span class=plcno aria-label="Not included">No</span></td>`;
 const UICO={promo:'<path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7z"/>',
  wallet:'<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 10h17M15 13.5h2.5"/>',
  invest:'<path d="M4 18h16M6 14l3.5-3.5 3 3L18 6"/><path d="M14.5 6H18v3.5"/>',
  bank:'<path d="M4 10l8-5 8 5v8H4z"/><path d="M8 18v-5h3v5M13 18v-5h3v5"/>',
  tel:'<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/>',
  alerts:'<path d="M12 4a6 6 0 0 1 6 6c0 4-2.5 6-2.5 6H8.5S6 14 6 10a6 6 0 0 1 6-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  subs:'<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"/>',
  save:'<path d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5"/>'};
 const uico=k=>`<span class=ulico aria-hidden=true><svg viewBox="0 0 24 24" width=22 height=22 fill=none stroke=currentColor stroke-width=1.7 stroke-linecap=round stroke-linejoin=round>${UICO[k]||UICO.wallet}</svg></span>`;
 const groups=[
  ['Savings story','save',[['Pays for itself','Quantified "we save you" and "we have saved you" figures appear only from your linked activity at runtime, never as invented marketing numbers'],['Fee versus rewards','Annual fees set against what each card actually earns on your spend']]],
  ['Promotions','promo',[['Qualified offers','Sign-up bonuses and promos that match your connected profile'],['Threshold progress','Track spend toward offer requirements from linked transactions']]],
  ['Wallet','wallet',[['Best card by category','Route each spend type using real category totals'],['Keep, cancel, downgrade','Signals when a card no longer pays for itself'],['Timing','First-year-free windows and retention offer timing']]],
  ['Investing','invest',[['MER and trading drag','Surface fee drag across held funds and accounts'],['FX and transfer patterns','Flag costly FX and transfers, including Norbert\'s gambit style moves'],['Account room','TFSA, RRSP and FHSA room tracking for smarter placement']]],
  ['Banking','bank',[['Fee audit','Monthly, NSF and e-transfer fees from linked chequing'],['Idle cash','Compare cash sitting in low-yield accounts with HISA-style alternatives']]],
  ['Telecom','tel',[['Plan right-sizing','Match plan cost to actual usage and bill history'],['Promo expiry','Watch when a telecom promo rolls off']]],
  ['Alerts','alerts',[['Renewals and retention','Annual fee renewals and retention offers on what you hold'],['Market moves','Promo expiries, price drops, rate changes and new matching offers']]],
  ['Subscriptions','subs',[['Duplicates and forgotten','Find overlapping or unused subscriptions from connected spend']]]
 ];
 const unlocks=`<section class=plunlocks id=pw-unlocks aria-labelledby=pl-unlocks-h data-plan=premium>
  <p class=plpay><span class=plpayk>Premium</span><span class=plpayh id=pl-unlocks-h>PerTheTerms pays for itself</span></p>
  <p class=lead>Connect accounts (Plaid, Kubera-style links, or bring-your-own AI) and the product turns your activity into a quantified savings story. Figures are computed only from your data when you link; nothing below invents a dollar amount.</p>
  <h3 class=plunlocks-sub>What your data unlocks</h3>
  <div class=ulg>${groups.map(([title,k,items])=>`<div class="ulgk" data-ulg=${k}><h4>${uico(k)}<span>${esc(title)}</span></h4><ul>${items.map(([a,b])=>`<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ul></div>`).join('')}</div>
 </section>`;
 return `<div class="prof pstack prempp" id=pw-subsplan data-bill=mo><div class=vhead><h2>Plans</h2><span class=submk>Pre-launch</span></div>
 <p class=lead>Three plans. Basic is a free product comparison tool (tables and qualitative comparisons only). Premium connects your money and unlocks wallet tracking plus quantified savings from your data. Ultra adds our hosted AI. Checkout is not live; join the waitlist.</p>
 <div class=plbill role=group aria-label="Billing period"><button type=button class="plbillb on" data-bill=mo aria-pressed=true>Monthly</button><button type=button class=plbillb data-bill=yr aria-pressed=false>Annual <span class=plbillsave>Save ~20%</span></button></div>
 <div class="plans plans3">
  <section class="plan" aria-labelledby=pl-basic><h3 id=pl-basic>Basic</h3><p class=plm><b>$0</b><span>forever</span></p><ul class=plfeat>${basic.map(li).join('')}</ul><button type=button class="btn plcta" disabled>Your current plan</button></section>
  <section class="plan" aria-labelledby=pl-prem data-mo="$9.99" data-yr="$95" data-mosub="per month" data-yrsub="per year, about $7.92 a month"><h3 id=pl-prem>Premium</h3><p class=plm><b data-plprice>$9.99</b><span data-plsub>per month</span></p><ul class=plfeat>${premium.map(li).join('')}</ul><button type=button class="btn plcta" data-waitlist=premium aria-disabled=true title="Checkout coming soon">Join the waitlist</button></section>
  <section class="plan pbest" aria-labelledby=pl-ultra data-mo="$16.99" data-yr="$159" data-mosub="per month" data-yrsub="per year, about $13.25 a month"><span class=plflag>Recommended</span><h3 id=pl-ultra>Ultra</h3><p class=plm><b data-plprice>$16.99</b><span data-plsub>per month</span></p><ul class=plfeat>${ultra.map(li).join('')}</ul><button type=button class="btn plcta" data-waitlist=ultra aria-disabled=true title="Checkout coming soon">Join the waitlist</button></section>
 </div>
 ${unlocks}
 <h3 class=plcmp-h>Compare</h3>
 <div class=plcmp wrap><table class=plcmp><thead><tr><th scope=col>Feature</th><th scope=col>Basic</th><th scope=col>Premium</th><th scope=col>Ultra</th></tr></thead><tbody>${rows.map(([n,a,b,c])=>`<tr><th scope=row>${esc(n)}</th>${cell(a)}${cell(b)}${cell(c)}</tr>`).join('')}</tbody></table></div>
 <p class=omute>Pre-launch pricing. Nothing here charges a card. Basic never stores account values. Premium and Ultra savings figures appear only after you connect real data. Cancel any time once billing ships.</p></div>`}
function plBillSet(bill){const root=$('#pw-subsplan');if(!root||(bill!='mo'&&bill!='yr'))return;root.dataset.bill=bill;
 root.querySelectorAll('.plbillb').forEach(b=>{const on=b.dataset.bill==bill;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
 root.querySelectorAll('.plan[data-mo]').forEach(p=>{const yr=bill=='yr';const pr=p.querySelector('[data-plprice]'),su=p.querySelector('[data-plsub]');if(pr)pr.textContent=yr?p.dataset.yr:p.dataset.mo;if(su)su.textContent=yr?p.dataset.yrsub:p.dataset.mosub;
  p.querySelectorAll('[data-plsave-mo]').forEach(e=>e.hidden=yr);p.querySelectorAll('[data-plsave-yr]').forEach(e=>e.hidden=!yr)})}
document.addEventListener('click',e=>{const b=e.target.closest('#pw-subsplan .plbillb');if(!b)return;e.preventDefault();plBillSet(b.dataset.bill)});

/* B26 Connections (Andrew 2026-11-05): Settings › Connections lists Kubera and GiftCash as tiles; a tile opens the shared settings popout (#cset).
   Kubera's key is server-managed (Pages secrets), so its popout is status only. GiftCash takes the user's own API key: PUT /api/connections?p=giftcash
   stores it encrypted server-side (D1 conn_keys, CONN_SECRET); the API only ever answers connected / added_at, so the key is never shown again.
   No GiftCash data sync yet. Signed out: tiles say so and nothing is fetched.
   B26b (Andrew 2026-11-05): below the tiles, a Kubera live-accounts table (institution, account, type, balance, Kubera provider) with a Replace-with
   column from PTT_ROUTE and a disabled Replace button (tooltip: Needs Plaid/SnapTrade keys) until those secrets exist. New-provider balance and
   match/diff stay empty (—) until a Plaid/SnapTrade link is stored. Kubera stays the source of truth; no wallet writes. */
const CONN={d:null,busy:null,o:null,err:'',sending:false},CONNP=[['kubera','Kubera','Balances on Accounts tiles'],['giftcash','GiftCash','Gift card cashback (sync coming later)']];
const connIn=()=>typeof AUTH!='undefined'&&AUTH&&typeof syState!='undefined'&&!!syState.email;
function connLoad(){if(!connIn())return Promise.resolve(null);if(CONN.busy)return CONN.busy;CONN.busy=syApi('connections').then(r=>r.ok?r.json():null).then(d=>{if(d){const j0=JSON.stringify(CONN.d);CONN.d=d;if(JSON.stringify(d)!=j0)uiLater('conn',connPaint)}return d}).catch(()=>null).finally(()=>{CONN.busy=null});return CONN.busy}
const connSt=k=>!connIn()?'Sign in to connect':!CONN.d?'Checking…':k=='kubera'?(CONN.d.kubera?.connected?'Connected':'Not set up'):(CONN.d[k]?.connected?'Connected':'Not connected');
const connTiles=()=>CONNP.map(([k,n,f])=>btile({k:n,name:n,foot:esc(connSt(k)),mark:connIn()&&CONN.d&&CONN.d[k]?.connected?'✓':'',attrs:`data-conn=${k} role=button aria-haspopup=dialog aria-label="${esc(n)} connection"`})).join('');
const connKindLab={broker:'Broker',bank:'Bank',card:'Credit'};
function connInst(it){const p=String(it&&it.provider||'').trim();if(p)return p;try{if(typeof kubInst=='function'){const a=kubInst(it);if(a)return a.replace(/\s+$/,'')} }catch(e){}try{const x=typeof kubParse=='function'?kubParse(it):null;if(x&&x.inst)return x.inst}catch(e){}return ''}
function connRows(){const R=(typeof window!='undefined'&&window.PTT_ROUTE)||(typeof PTT_ROUTE!='undefined'?PTT_ROUTE:null);if(!connIn())return {state:'signin',rows:[]};let on=false;try{on=typeof kubOn=='function'&&kubOn()}catch(e){}
 if(!on){const waiting=connIn()&&!(KUB&&KUB.d);return {state:waiting?'loading':(KUB&&KUB.err?'error':'empty'),rows:[]}}
 const items=(KUB.d&&KUB.d.items)||[];
 const rows=items.map(it=>{const kind=R?R.accountKind(it):(it.kind=='debt'?'card':(it.inv?'broker':'bank'));
  const inst=connInst(it)||'—',lab=R?R.replaceLabel(inst==='—'?'':inst,kind):'—',route=R?R.routeFor(inst==='—'?'':inst,kind):null;
  const bal=typeof kubCad=='function'?kubCad(it):it.value,prov=it.provider||(it.status==='Manual'?'Manual':null)||'—';
  return {id:it.id,inst,acct:it.name||'—',type:connKindLab[kind]||kind,bal,prov,status:it.status||'—',lab,uncertain:!!(route&&route.uncertain),note:route&&route.note||'',repl:null,diff:null}});
 return {state:'ok',rows}}
function connTbl(){const {state,rows}=connRows();const tip='Needs Plaid/SnapTrade keys';
 const H=['Institution','Account','Type','Balance','Kubera provider','Replace with','Replace','New balance','Match'];
 if(state=='signin')return `<section class="psec" id=pw-conn-tbl><h3>Kubera accounts</h3><p class=mute>Sign in to see the accounts Kubera has live.</p></section>`;
 if(state=='loading')return `<section class="psec" id=pw-conn-tbl><h3>Kubera accounts</h3><p class=mute>Loading Kubera…</p></section>`;
 if(state=='error')return `<section class="psec" id=pw-conn-tbl><h3>Kubera accounts</h3><p class=mute>Kubera is not available right now.</p></section>`;
 if(state=='empty'||!rows.length)return `<section class="psec" id=pw-conn-tbl><h3>Kubera accounts</h3><p class=mute>No live Kubera accounts yet.</p></section>`;
 const fmt=v=>{if(v==null)return '—';try{return typeof kubFmt=='function'?kubFmt(v,'CAD'):new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(v)}catch(e){return '—'}};
 const body=rows.map(r=>`<tr data-kid="${esc(r.id)}"><td class=l>${esc(r.inst)}</td><td class=l title="${esc(r.acct)}">${esc(r.acct)}</td><td>${esc(r.type)}</td><td class=n>${esc(fmt(r.bal))}</td><td class=l>${esc(r.prov)}</td><td class=l${r.uncertain?' title="'+esc(r.note||'Coverage uncertain')+'"':''}>${esc(r.lab)}</td><td><button type=button class="btn2 ctrepl" data-crepl="${esc(r.id)}" disabled title="${esc(tip)}" aria-label="Replace ${esc(r.acct)}">${esc('Replace')}</button></td><td class=n>—</td><td class=n>—</td></tr>`).join('');
 return `<section class="psec" id=pw-conn-tbl><h3>Kubera accounts <span class=mute>(${rows.length})</span></h3><p class=mute>Live from Kubera. Replace opens Plaid or SnapTrade for that institution once those keys are set; until then the button stays off.</p><div class=ivtab id=pw-conn-wrap><table class="vt brtab ctbl" data-brtab=conn><thead><tr>${H.map((h,i)=>`<th class="${i==0||i==1||i==4||i==5?'l':(i==3||i==7||i==8?'n':'')}">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></section>`}
function connsPage(){if(connIn()&&!CONN.d)setTimeout(connLoad,0);if(connIn()){try{if(typeof kubLoad=='function')setTimeout(()=>kubLoad(false,true),0)}catch(e){}}
 return `<div class="prof pstack wsimple" id=pw-conn><div class=vhead><h2>Connections</h2></div><p class=lead>Data sources you link with your own account. Keys are kept on the server, encrypted, and never shown again.</p>${upPromptHTML('bank')}${upPromptHTML('upload')}<section class=psec id=pw-conns><div class="tiles ptiles" id=pw-conn-t>${connTiles()}</div></section><div id=pw-conn-tbl-h>${connTbl()}</div></div>`}
function connPaint(){const t=document.getElementById('pw-conn-t');if(t)t.innerHTML=connTiles();const h=document.getElementById('pw-conn-tbl-h');if(h)h.innerHTML=connTbl();if(CONN.o)connDraw()}
function connPop(){const k=CONN.o,[,n,f]=CONNP.find(x=>x[0]==k)||[],d=(CONN.d||{})[k]||{},ro=(lab,v,sub)=>`<div class=csrow><span class=csl>${lab}${sub?`<small class=mute>${sub}</small>`:''}</span><span class=ieval>${v}</span></div>`;
 let body=ro('Status',esc(connSt(k)))+ro('Used for',esc(f)),ft=`<span class=csgap></span><button type=button class=btn2 data-cnx>Close</button>`;
 if(!connIn())body+=`<p class="mute csnote">Sign in first; connections belong to your account.</p>`;
 else if(k=='kubera')body+=`<p class="mute csnote">The Kubera key is set up on the server for this site, so there is nothing to enter here.</p>`;
 else if(d.connected){body+=ro('Connected since',esc(ieDate(d.added_at)));ft=`<button type=button class="btn2 csrm" data-cndel>Disconnect</button>`+ft}
 else{body+=`<div class=csrow><label class=csl for=cn-key>API key<small class=mute>Stored encrypted on the server; never shown again</small></label><input id=cn-key class=csin data-cnkey type=password autocomplete=off spellcheck=false maxlength=512 placeholder="—"></div>`;ft=`<span class=csgap></span><button type=button class=btn2 data-cnx>Cancel</button><button type=button class=btn data-cnsave${CONN.sending?' disabled':''}>Connect</button>`}
 if(CONN.err)body+=`<p class="wxerr csnote" role=alert>${esc(CONN.err)}</p>`;
 return `<div id=csbg data-cnx></div><div id=cset role=dialog aria-modal=true aria-labelledby=cnh><div class=wzhd><span class=wzst>Connection</span><h3 id=cnh>${esc(n)}</h3><button type=button class=wzx data-cnx aria-label="Close" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft>${ft}</div></div>`}
function connDraw(){let h=document.querySelector('#cnw');if(!CONN.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='cnw';document.body.append(h)}const v=h.querySelector('[data-cnkey]')?.value;h.innerHTML=connPop();const i=h.querySelector('[data-cnkey]');if(i&&v)i.value=v;document.body.classList.add('wzopen')}
function connClose(){const k=CONN.o;CONN.o=null;CONN.err='';connDraw();document.querySelector(`[data-conn=${k}]`)?.focus()}
async function connSend(m){const k=CONN.o,i=document.querySelector('#cnw [data-cnkey]'),key=i?i.value.trim():'';if(m=='PUT'&&key.length<8){CONN.err='Enter the full API key.';connDraw();return}
 CONN.sending=true;CONN.err='';connDraw();try{const r=await syApi('connections?p='+k,m=='PUT'?{method:'PUT',body:JSON.stringify({key})}:{method:'DELETE'});const d=await r.json().catch(()=>null);if(r.ok&&d){CONN.d=d;if(i)i.value=''}else CONN.err=r.status==503?'Connections are not set up on the server yet.':r.status==400?'That key does not look right.':'Could not save. Please try again.'}catch(e){CONN.err='Could not reach the server.'}
 CONN.sending=false;const t=document.getElementById('pw-conn-t');if(t)t.innerHTML=connTiles();connDraw();document.querySelector('#cnw [data-cnx]')?.focus()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-crepl]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();
 if(typeof syPlaidStart=='function')syPlaidStart(()=>{const tip=b.getAttribute('title')||'';alert(tip.includes('Needs')?'Plaid/SnapTrade keys are not on the server yet.':'Bank link will open here once Plaid is configured.')})},true);
document.addEventListener('click',e=>{const t=e.target.closest('[data-conn],[data-cnx],[data-cnsave],[data-cndel]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();
 if(t.dataset.conn){CONN.o=t.dataset.conn;CONN.err='';connDraw();connLoad();(document.querySelector('#cnw [data-cnkey]')||document.querySelector('#cnw [data-cnx]'))?.focus();return}
 if(t.matches('[data-cnx]'))return connClose();if(t.matches('[data-cnsave]'))return connSend('PUT');if(t.matches('[data-cndel]'))return connSend('DELETE')},true);
document.addEventListener('keydown',e=>{if(!CONN.o)return;if(e.key=='Escape'){e.preventDefault();connClose()}else if(e.key=='Enter'&&e.target.matches?.('[data-cnkey]')){e.preventDefault();connSend('PUT')}},true);

/* Contact form (Andrew 2026-11-06, v2): stacked hero, soft card, topic pills; posts to /api/contact. Nothing stored. No em dashes. */
const CONTACT_TO='admin@pertheterms.com';
const CONTACT_TOPICS=[
  {v:'General',l:'General'},
  {v:'Privacy & data requests',l:'Privacy & data'},
  {v:'Security report',l:'Security'},
  {v:'Partnerships',l:'Partnerships'}
];
function aboutHTML(){/* Andrew 2026-11-06: approved About copy as three linked story tiles (pieces, plan, invitation). Exact narrative; no em dashes. */
 return `<article class="infopg aboutpg" aria-labelledby=infoh>
  <div class=abinner>
   <div class=abhero>
    <p class=abkicker>Our story</p>
    <h1 id=infoh>About</h1>
    <p class=ablead>PerTheTerms started with a simple frustration: you can read every offer and still not know which combination is best for you.</p>
   </div>
   <ol class=abtiles>
    <li class="abtile abt1"><span class=abnode aria-hidden=true>1</span>
     <h2 class=abth>Small things add up</h2>
     <p>A fee waiver here, a transfer bonus there, better rewards on money you already spend. <em class="abem">Separately, small advantages.</em> <em class="abem abem2">Together, real money.</em> But finding them means doing the homework every institution leaves out: comparing itself with everyone else.</p>
    </li>
    <li class="abtile abt2"><span class=abnode aria-hidden=true>2</span>
     <h2 class=abth>So we're doing the homework</h2>
     <p class=abroad>We’re building the tool we wanted for that homework. <span class=abstep>Clear comparisons first.</span> <span class=abstep>Your own financial picture next.</span> <span class=abstep>Then help finding the worthwhile moves, without turning your life into an administrative hobby.</span></p>
    </li>
    <li class="abtile abt3"><span class=abnode aria-hidden=true>3</span>
     <svg class=abart viewBox="0 0 220 120" role=img aria-label="Illustration: three cards fanned out, linked by a dotted line"><defs><linearGradient id=abg1 x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#2563eb"/><stop offset=1 stop-color="#1e3a8a"/></linearGradient><linearGradient id=abg2 x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0d9488"/><stop offset=1 stop-color="#115e59"/></linearGradient><linearGradient id=abg3 x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#7c3aed"/><stop offset=1 stop-color="#4c1d95"/></linearGradient></defs><g transform="rotate(-10 60 70)"><rect x=22 y=40 width=78 height=50 rx=8 fill="url(#abg2)"/><rect x=32 y=52 width=14 height=10 rx=2 fill="#fcd34d" opacity=".9"/></g><g transform="rotate(8 160 70)"><rect x=120 y=40 width=78 height=50 rx=8 fill="url(#abg3)"/><rect x=130 y=52 width=14 height=10 rx=2 fill="#fcd34d" opacity=".9"/></g><rect x=71 y=28 width=78 height=50 rx=8 fill="url(#abg1)"/><rect x=81 y=40 width=14 height=10 rx=2 fill="#fcd34d"/><rect x=81 y=62 width=40 height=4 rx=2 fill="#fff" opacity=".55"/><path d="M40 108 Q110 96 180 108" fill=none stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap=round opacity=".55"/><circle cx=40 cy=108 r=3.5 fill="currentColor"/><circle cx=110 cy=101 r=3.5 fill="currentColor"/><circle cx=180 cy=108 r=3.5 fill="currentColor"/></svg>
     <h2 class=abth>Start with the comparison</h2>
     <p>Put a few cards side by side and see what each one is really worth to you.</p>
     <button type=button class=abgo data-abgo>Explore cards <span aria-hidden=true>→</span></button>
    </li>
   </ol>
  </div>
 </article>`}

document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-abgo]');if(!b)return;e.preventDefault();st.pl='cards';st.s='ovw';st.card=null;render();scrollTo(0,0)});/* About tile 3 action */
function contactHTML(){const chips=CONTACT_TOPICS.map((x,i)=>`<button type=button class="ctchip${i===0?' on':''}" role=radio aria-checked="${i===0?'true':'false'}" data-cttopic="${esc(x.v)}">${esc(x.l)}</button>`).join('');
 return `<article class="infopg contactpg" aria-labelledby=infoh>
  <div class=ctinner>
  <header class=cthero>
   <p class=ctkicker>Say hello</p>
   <h1 id=infoh aria-label="Get in touch"><span aria-hidden=true>Get in t</span><button type=button class=ctyo data-ctyo aria-label="Spin the PerTheTerms logo"><span class=ctyos aria-hidden=true></span><img class=ctyom src="images/brand/logo-mark.svg" alt="" width=32 height=32 draggable=false></button><span aria-hidden=true>uch</span></h1>
   <p class=ctlead>We read every note and reply from a real inbox.</p>
  </header>
  <div class=ctband>
   <div class=ctcard>
    <form class=ctform id=ctform novalidate>
     <div class=ctrow>
      <label class=ctfield><span class=ctl>Name</span><input name=name type=text autocomplete=name maxlength=80 required placeholder="Your name"></label>
      <label class=ctfield><span class=ctl>Email</span><input name=email type=email autocomplete=email maxlength=254 required placeholder="you@example.com"></label>
     </div>
     <fieldset class=ctfield cttopics>
      <legend class=ctl>Topic</legend>
      <div class=ctchips role=radiogroup aria-label=Topic>${chips}</div>
      <input type=hidden name=topic value="${esc(CONTACT_TOPICS[0].v)}" required>
     </fieldset>
     <label class="ctfield ctmsg"><span class=ctl>Message</span><textarea name=message rows=5 maxlength=4000 required placeholder="What can we help with?"></textarea></label>
     <input class=cthp type=text name=website tabindex=-1 autocomplete=off aria-hidden=true>
     <p class=cterr hidden role=alert></p>
     <button type=submit class="btn ctgo">Send message</button>
    </form>
    <div class=ctdone hidden role=status tabindex=-1>
     <div class=ctdone-mark aria-hidden=true>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
     </div>
     <h2>Thanks, we got it.</h2>
     <p>A real person will reply soon. Check spam if you do not see us.</p>
     <button type=button class="btn2" data-ctagain>Send another</button>
    </div>
   </div>
   <p class=ctor>Prefer email? <a href="mailto:${CONTACT_TO}">${CONTACT_TO}</a></p>
  </div>
  </div>
 </article>`}
async function contactSubmit(form){const err=form.querySelector('.cterr'),go=form.querySelector('.ctgo');
 err.hidden=true;err.textContent='';go.disabled=true;go.textContent='Sending…';
 const fd=new FormData(form),body={name:fd.get('name'),email:fd.get('email'),topic:fd.get('topic'),message:fd.get('message'),website:fd.get('website')};
 try{const r=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  let j={};try{j=await r.json()}catch(_){}
  if(r.status===204||(r.ok&&j.ok)){const card=form.closest('.ctcard');form.hidden=true;const d=card.querySelector('.ctdone');d.hidden=false;d.focus?.();return}
  err.textContent=j.error||(r.status===429?'Too many messages. Try again later.':r.status===503?'Email is briefly unavailable. Write us at '+CONTACT_TO+'.':'Could not send. Try again, or email '+CONTACT_TO+'.');err.hidden=false}
 catch(_){err.textContent='Could not reach the server. Email '+CONTACT_TO+' instead.';err.hidden=false}
 finally{go.disabled=false;go.textContent='Send message'}}
document.addEventListener('submit',e=>{const f=e.target.closest('#ctform');if(!f)return;e.preventDefault();contactSubmit(f)});
document.addEventListener('click',e=>{
 const chip=e.target.closest('[data-cttopic]');
 if(chip){e.preventDefault();const form=chip.closest('#ctform'),hid=form.querySelector('[name=topic]');
  form.querySelectorAll('[data-cttopic]').forEach(c=>{const on=c===chip;c.classList.toggle('on',on);c.setAttribute('aria-checked',on?'true':'false')});
  hid.value=chip.dataset.cttopic;return}
 const a=e.target.closest('[data-ctagain]');
 if(a){const card=a.closest('.ctcard'),f=card.querySelector('#ctform');card.querySelector('.ctdone').hidden=true;f.hidden=false;f.reset();
  const first=CONTACT_TOPICS[0].v;f.querySelector('[name=topic]').value=first;
  f.querySelectorAll('[data-cttopic]').forEach(c=>{const on=c.dataset.cttopic===first;c.classList.toggle('on',on);c.setAttribute('aria-checked',on?'true':'false')});
  f.querySelector('[name=name]')?.focus()}
});

/* Contact yo-yo (Andrew 2026-11-06): the o of "touch" is the logo mark; click/tap/Enter drops it on a string, spinning, and it springs back. Replays from the start on each press; reduced motion gets a still pulse. */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ctyo]');if(!b)return;e.preventDefault();
 const rm=matchMedia('(prefers-reduced-motion: reduce)').matches,c=rm?'ctyo-pulse':'ctyo-go';
 b.classList.remove('ctyo-go','ctyo-pulse');void b.offsetWidth;b.classList.add(c);
 clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove(c),rm?500:1500)});


function renderInfo(){const[t,b]=INFOP[st.s]||INFOP.contact;if(st.s=='ci'){['#pre','#page','.wrap','#bar','#filters','#fhead','#grp','#vh'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#tabs').innerHTML='';$('#view').hidden=false;document.title=t+' · PerTheTerms';return renderCI()}['#pre','#page','.wrap','#bar','#filters','#fhead','#grp','#vh'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#tabs').innerHTML='';const v=$('#view');v.hidden=false;if(st.s=='soon_saving'||st.s=='soon_invest'||st.s=='soon_liabilities'){v.innerHTML=`<div class="prof pstack wsimple"><div class=vhead><h2>${t}</h2></div>${b}</div>`;document.title=t+' · PerTheTerms';return}v.innerHTML=st.s=='about'?aboutHTML():st.s=='contact'?contactHTML():st.s=='soon_connections'?connsPage():st.s=='soon_subscription'?subHTML():st.s=='soon_promotions'?bpromosPage():st.s=='soon_purchasing'?`<div class="prof pstack wsimple" id=pyt-page><div class=vhead><h2>My Wallet</h2></div><p class=lead>Which card to use for each kind of spending, and what each of your cards covers. Built from your Accounts and Spending; it stays on this device.</p>${upPromptHTML('wallet')}${upPromptHTML('ultra')}${pytPur()}</div>`:st.s=='soon_pyt'?`<div class="prof pstack wsimple" id=pyt-page><div class=vhead><h2><span class=pytw>Per<b>Your</b>Terms</span></h2></div><p class=lead>Which card to use for each purchase, and what your cards cover. Built from your Accounts and Spending; it stays on this device.</p>${pytHTML()}</div>`:`<article class=infopg aria-labelledby=infoh><h1 id=infoh>${t}</h1>${b}</article>`;document.title=t+' · PerTheTerms'}
/* Andrew 2026-11-04: Home leaves the site menu (the wordmark/logo mark and the footer logo are the way home), so the Home action lives here and every
   entry point that used to click the menu item calls it: the logo mark, the footer logo, and any saved link. */
function goHome(){const h=document.querySelector('#pl [data-pl=home]');if(h){h.click();return}st.pl='home';st.s='ov';st.card=null;st.q='';if($('#q'))$('#q').value='';render();scrollTo(0,0)}
document.addEventListener('click',e=>{if(!e.target.closest('[data-home]'))return;e.preventDefault();goHome()});/* footer logo = home (hero story) */
document.addEventListener('click',e=>{const a=e.target.closest('[data-info]');if(a){e.preventDefault();st.pl='info';st.s=a.dataset.info;st.card=null;render();scrollTo(0,0)}});
/* Competitive Intelligence (Andrew 2026-11-03): data dictionary of every field we hold for Credit cards | Brokers | Banking.
   All numbers come from data/ci.json, built by ci_data.py from the database and the site's own table config at build time. */
const CI={tab:'cards',q:'',cats:new Set(),it:'',sk:'cov',dir:-1,schema:false,d:null};
const CIC={'Fee':'#b45309','Rate':'#0e7490','Reward':'#7c3aed','Perk':'#db2777','Promo':'#dc2626','Insurance':'#2563eb','Eligibility':'#4d7c0f','Account':'#475569','Capability':'#0f766e','Product':'#64748b','Source & evidence':'#78716c'};
const CIEV=[['CITED','Cited','#15803d'],['REPORTED','Reported','#ca8a04'],['ESTIMATE','Estimate','#ea580c'],['VERIFIED','Verified status','#64748b']];
const CICOLS=[['name','Field','l'],['cat','Category','l'],['type','Type','l'],['cov','Coverage',''],['pts','Data points',''],['shown','In tables','l'],['desc','Description','l wrapt'],['key','Raw key','l sch'],['table','Source table','l sch'],['child','Child table','l sch'],['sql','SQL type','l sch'],['unit','Unit','l sch']];
function renderCI(){const v=$('#view');if(!CI.d){v.innerHTML='<article class="cipg"><h1>Competitive Intelligence</h1><p class=mute>Loading…</p></article>';fetch('data/ci.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{CI.d=d;if(st.pl=='info'&&st.s=='ci')renderCI()}).catch(()=>{v.querySelector('.mute').textContent='Could not load the data dictionary.'});return}
 const D=CI.d,T=D[CI.tab],n0=x=>x.toLocaleString(),pc=x=>x==null?'—':x+'%';
 const evT=Object.fromEntries(CIEV.map(([k])=>[k,T.ev[k]||0])),evS=Object.values(evT).reduce((a,b)=>a+b,0)||1;
 const tiles=[['Products covered',n0(T.products)],['Fields',n0(T.fields)],['Data points',n0(T.points)],['Avg. field coverage',pc(T.cov)],['Tagged CITED',pc(T.cited)],['Sources archived',n0(T.archived)+(T.sources>T.archived?` <small>of ${n0(T.sources)}</small>`:'')],['Last updated',esc(T.updated||'—')]];
 const views=[...new Set(T.rows.flatMap(r=>r.shown.concat(r.sugg?['Suggested: '+r.sugg]:[])))].sort();
 v.innerHTML=`<article class=cipg aria-labelledby=cih><h1 id=cih>Competitive Intelligence</h1><p class=lead>Every field PerTheTerms holds, by product line: what it is, how much of the market it covers, how many data points back it, and how each value is evidenced. Computed from the database at build time.</p>
 <div class=citabs role=tablist aria-label="Product line">${Object.entries(D).map(([k,x])=>`<button type=button role=tab data-cit=${k} aria-selected=${k==CI.tab} class="${k==CI.tab?'on':''}">${esc(x.name)} <span class=mute>${x.fields}</span></button>`).join('')}</div>
 <div class=cihero>${tiles.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
 <div class=cievb aria-label="Evidence tags across all values"><div class=cievbar>${CIEV.map(([k,l,c])=>evT[k]?`<i style="width:${evT[k]/evS*100}%;background:${c}" title="${l}: ${n0(evT[k])}"></i>`:'').join('')}</div><div class=cievl>${CIEV.map(([k,l,c])=>`<span><i style="background:${c}"></i>${l} <b>${n0(evT[k])}</b> <span class=mute>${Math.round(evT[k]/evS*100)}%</span></span>`).join('')}</div></div>
 <div class=cictl><input type=search id=ciq placeholder="Search fields, keys, descriptions" value="${esc(CI.q)}" aria-label="Search fields"><select id=ciit aria-label="In tables"><option value="">In tables: all</option><option value="shown"${CI.it=='shown'?' selected':''}>Shown in a table</option><option value="none"${CI.it=='none'?' selected':''}>Not shown</option>${views.map(x=>`<option value="v:${esc(x)}"${CI.it=='v:'+x?' selected':''}>${esc(x)}</option>`).join('')}</select>
  <button type=button class="cibtn${CI.schema?' on':''}" data-cisch aria-pressed=${CI.schema}>Schema</button><span class=cidl><span class=cislb>Download</span><a href="data/ci-${CI.tab}.csv" download>CSV</a><a href="data/ci-${CI.tab}.json" download>JSON</a><span class=cislb>All tabs</span><a href="data/ci-all.csv" download>CSV</a><a href="data/ci-all.json" download>JSON</a></span></div>
 <div class=cichips role=group aria-label="Category">${[...new Set(T.rows.map(r=>r.cat))].sort().map(c=>`<button type=button class="cichip${CI.cats.has(c)?' on':''}" data-cicat="${esc(c)}" aria-pressed=${CI.cats.has(c)} style="--cc:${CIC[c]||'#64748b'}">${esc(c)} <span>${T.rows.filter(r=>r.cat==c).length}</span></button>`).join('')}${CI.cats.size?'<button type=button class=clr data-cicat="">Clear</button>':''}</div>
 <p class=mute id=cicount></p><div class=ciwrap><table class="citb${CI.schema?' schema':''}" id=citb><colgroup>${CICOLS.filter(c=>CI.schema||!c[2].includes('sch')).map(([k])=>`<col class=cic-${k}>`).join('')}</colgroup><thead><tr>${CICOLS.map(([k,l,c])=>`<th data-cik=${k} class="${c}${CI.sk==k?' s'+(CI.dir>0?' asc':''):''}" aria-sort=${CI.sk==k?(CI.dir>0?'ascending':'descending'):'none'} tabindex=0>${l}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
 <p class="mute cinote">Coverage = products with a value / products in the line. Data points = non-empty values (child tables count one per row). Evidence: CITED to the issuer’s own page, REPORTED by a third party, ESTIMATE where we derived a value, “verified status” is the row’s snapshot verification flag. “In tables” is read from the site’s table configuration; <i>Suggested</i> entries are proposals by category, not current placements.</p></article>`;
 ciRows()}
function ciRows(){const T=CI.d[CI.tab],q=CI.q.trim().toLowerCase(),n0=x=>x.toLocaleString();
 let R=T.rows.filter(r=>(!CI.cats.size||CI.cats.has(r.cat))&&(!q||(r.name+' '+r.key+' '+r.desc+' '+r.table+' '+r.cat).toLowerCase().includes(q))&&(!CI.it||(CI.it=='shown'?r.shown.length:CI.it=='none'?!r.shown.length:CI.it.startsWith('v:Suggested: ')?r.sugg==CI.it.slice(13):r.shown.includes(CI.it.slice(2)))));
 const kv={cov:r=>r.cov/r.n,pts:r=>r.pts,ev:r=>r.ev.CITED/(r.pts||1),shown:r=>r.shown.length?r.shown.join():'~'+(r.sugg||'')};const f=kv[CI.sk]||(r=>String(r[CI.sk]??'~').toLowerCase());
 R=R.slice().sort((a,b)=>{const x=f(a),y=f(b);return (x<y?-1:x>y?1:0)*CI.dir||a.name.localeCompare(b.name)});
 const tb=$('#citb tbody');if(!tb)return;
 tb.innerHTML=R.map(r=>{const p=r.cov/r.n*100,es=CIEV.reduce((t,[k])=>t+(r.ev[k]||0),0);return `<tr><td class=l title="${esc(r.name)} (${esc(r.key)})"><b>${esc(r.name)}</b><code>${esc(r.key)}</code></td><td class=l><span class=cicat style="--cc:${CIC[r.cat]||'#64748b'}">${esc(r.cat)}</span></td><td class=l>${esc(r.type)}${r.unit&&r.unit!=r.type?` <span class=mute>${esc(r.unit)}</span>`:''}</td>
 <td><span class=cicov title="${r.cov} of ${r.n}"><i style="width:${p}%"></i></span><span class=cicp>${p<1&&p>0?'<1':Math.round(p)}%</span><small class=mute>${r.cov}/${r.n}</small></td><td>${n0(r.pts)}</td>
 <td class=l>${r.shown.length?r.shown.map(x=>`<span class=ciview>${esc(x)}</span>`).join(''):`<span class=mute>Not shown</span>${r.sugg?`<br><i class=cisug>Suggested: ${esc(r.sugg)}</i>`:''}`}</td><td class="l wrapt">${esc(r.desc)}</td>
 <td class="l sch" title="${esc(r.key)}"><code>${esc(r.key)}</code></td><td class="l sch" title="${esc(r.parent||r.table)}">${esc(r.parent||r.table)}</td><td class="l sch" title="${esc(r.child||'')}">${esc(r.child||'—')}</td><td class="l sch">${esc(r.sql)}</td><td class="l sch">${esc(r.unit||'—')}</td></tr>`}).join('')||`<tr><td colspan=12 class=empty>No fields match.</td></tr>`;
 $('#cicount').innerHTML=`${R.length} <span class=mute>of ${T.rows.length} fields</span>`}
document.addEventListener('click',e=>{if(!(st.pl=='info'&&st.s=='ci'))return;const t=e.target.closest('[data-cit],[data-cicat],[data-cik],[data-cisch]');if(!t)return;
 if(t.dataset.cit){CI.tab=t.dataset.cit;CI.cats.clear();CI.it='';return renderCI()}
 if(t.dataset.cicat!=null){const c=t.dataset.cicat;c?(CI.cats.has(c)?CI.cats.delete(c):CI.cats.add(c)):CI.cats.clear();return renderCI()}
 if(t.dataset.cik){const k=t.dataset.cik;CI.dir=CI.sk==k?-CI.dir:(['name','cat','type','desc','key','table','child','sql','unit','shown'].includes(k)?1:-1);CI.sk=k;return renderCI()}
 if(t.matches('[data-cisch]')){CI.schema=!CI.schema;return renderCI()}});
document.addEventListener('keydown',e=>{const t=e.target.closest?.('#citb th[data-cik]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();t.click()}});
document.addEventListener('input',e=>{if(e.target.id=='ciq'){CI.q=e.target.value;ciRows()}});
document.addEventListener('change',e=>{if(e.target.id=='ciit'){CI.it=e.target.value;ciRows()}});
function render0(){OVN();/* Andrew 2026-11-06: Dashboard stays off nav (old hash → My Wallet). Saving is a Profile child coming-soon (soon_saving). Tests set window.__PTT_ALLOW_DASH to exercise Dashboard. */if(st.s=='dashboard'&&!window.__PTT_ALLOW_DASH){st.pl='info';st.s='soon_purchasing'}if(st.pl=='info'){if(!INFOK.includes(st.s))st.s='contact';$('#grp').hidden=true;syncLabels();save();BANK.bar();return renderInfo()}if(document.title!==TITLE0)document.title=TITLE0;$('#grp').hidden=true;$('#grp').innerHTML='';{if(st.s=='perk'&&st.pl!='bank'){st.g={...(st.g||{}),rwt:'perk'};st.s='rw'}const P=Object.keys(GROUPS).find(p=>GROUPS[p].some(x=>x[0]==st.s));if(P){st.g={...(st.g||{}),[P]:st.s,...(P=='rw'?{rwt:'pts'}:{})};st.s=P}}/* a group screen id (trv, prot, rwS, rwL, rwF) opens its parent sub-tab on that group */if(!PL.has(st.pl))st.pl='cards';if(!USR.has(st.s)&&!(S.some(s=>s.id==st.s)&&!HIDE.has(st.s)&&!SUBONLY.has(st.s)&&(!CTV()||CTV().includes(st.s)||st.s=='wfolder')))st.s='ovw';if(st.brs&&!BRS.some(x=>x.id==st.brs))st.brs='brov';if(st.ivs&&!IVS.some(x=>x.id==st.ivs))st.ivs='ivov';if(st.ts&&!TS.some(x=>x.id==st.ts))st.ts=TS[0].id;syncLabels();save();BANK.bar();
 if(st.card&&st.pl=='home')st.pl='cards';
 if(st.pl=='home'&&!st.card&&!USR.has(st.s)){['#pre','#page','.wrap','#bar','#filters','#view'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#tabs').innerHTML='';return}
 if(!st.card&&!USR.has(st.s)&&(st.pl=='broker'||st.pl=='invest'||st.pl=='tel')){['#pre','#page','.wrap','#bar','#filters'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#view').hidden=false;$('#tabs').innerHTML=secOn()?'':LTABS(st.pl);return renderLine(st.pl)}
 if(st.pl=='cards'&&st.s=='prom'&&!st.card){['#pre','#page','.wrap','#bar','#filters'].forEach(q=>{const e=$(q);if(e)e.hidden=true});$('#view').hidden=false;$('#tabs').innerHTML=secOn()?'':LINECFG.cards.tabs().map(s=>`<button data-s="${s.id}" class="${s.id==st.s?'on':''}">${s.name}</button>`).join('');return renderPromos('cards')}
 if(st.pl=='bank'&&!st.card&&!USR.has(st.s))return BANK.render();const scr=S.find(s=>s.id==GKEY());
 const pg=!!st.card,vw=!pg&&VIEWS[st.s];$('#pre').hidden=pg||!!vw;$('#page').hidden=!pg;$('#view').hidden=!vw;$('.wrap').hidden=pg||!!vw;$('#bar').hidden=pg||!!vw;$('#filters').hidden=pg||!!vw;
 if(vw){$('#tabs').innerHTML='';return vw()}
 if(pg){closeM();$('#tabs').innerHTML=secOn()?'':LINECFG.cards.tabs().map(s=>`<button data-s="${s.id}">${s.name}</button>`).join('');return renderCard(C[BYID[st.card]])}
 $('#tabs').innerHTML=secOn()?'':LINECFG.cards.tabs().map(s=>{const k=s.f.filter(f=>st.f[f[0]]!=null).length;return`<button data-s="${s.id}" class="${s.id==st.s?'on':''}">${s.name}${k?`<span class=dot>${k}</span>`:''}</button>`}).join('');/* the section nav replaces the strip in Credit Cards, Banking and Brokers (Andrew 2026-11-04) */
 if(st.s=='rw'&&!secRail()){const f=RWTF();$('#grp').hidden=false;$('#grp').setAttribute('aria-label','Rewards view');$('#grp').innerHTML=RWT.map(([id,n])=>`<button type=button data-rwt="${id}" class="${id==f?'on':''}"${id==f?' aria-current=true':''}>${n}</button>`).join('')}
 if(GROUPS[st.s]&&!IMG.includes(st.s)&&!secRail()){const gk=GKEY();$('#grp').hidden=false;$('#grp').setAttribute('aria-label',(S.find(x=>x.id==st.s)||{}).name+' view');$('#grp').innerHTML=GROUPS[st.s].map(([id,n])=>`<button type=button data-g="${id}" class="${id==gk?'on':''}"${id==gk?' aria-current=true':''}>${n}${(()=>{const k=S.find(x=>x.id==id).f.filter(f=>st.f[f[0]]!=null).length;return k?`<span class=dot>${k}</span>`:''})()}</button>`).join('')}
 $('#filters').innerHTML=scr.f.map(([id,l,o,m])=>m?`<label>${l}<details class="ms ${st.f[id]?.length?'set':''}"><summary>${st.f[id]?.length?st.f[id].length+' selected':'Any'}</summary><div>${o.map((x,i)=>`<label class=ck><input type=checkbox data-fm="${id}" value="${i}" ${st.f[id]?.includes(i)?'checked':''}> ${esc(x[0])}</label>`).join('')}</div></details></label>`:`<label>${l}<select data-f="${id}" class="${st.f[id]!=null?'set':''}"><option value="">Any</option>${o.map((x,i)=>`<option value="${i}" ${st.f[id]==i?'selected':''}>${esc(x[0])}</option>`).join('')}</select></label>`).join('');
 $('#filters').style.display=scr.f.length?'':'none';{const na=Object.keys(st.f).filter(k=>FI[k]).length,fc=STO.ui?.fcol!==false/* PUSH 14: the Filters panel floats over the frozen table, so it starts closed */;$('#fhead').innerHTML=`<button type=button id=fcol aria-expanded=${!fc} aria-controls=filters aria-label="Filters${na?', '+na+' active':''}">Filters</button><button type=button id=freset class="${na||st.q?'on':''}" data-x=__all aria-label="Reset filters and search${na?', '+na+' active':''}"${na||st.q?'':' disabled'}>Reset</button>`;$('#filters').classList.toggle('fcol',fc);if(scr.f.length)$('#filters').insertAdjacentHTML('afterbegin',`<div class=fsh role=group aria-label=Filters><b>Filters${na?' <span class=mute>('+na+')</span>':''}</b><button type=button class=fshr data-x=__all${na||st.q?'':' disabled'}>Reset</button><button type=button class=fshd data-fdone>Done</button></div>`);fsheet()}
 
 const R=rows(),chips=Object.entries(st.f).filter(([id])=>FI[id]).map(([id,i])=>`<span class=chip><i>${FI[id].s.name} ·</i> ${FI[id].l} ${CHIPI[id]&&!Array.isArray(i)?icoCell(CHIPI[id],FI[id].o[i][0]):''} ${esc(Array.isArray(i)?i.map(j=>FI[id].o[j][0]).join(' or '):FI[id].o[i][0])}<button data-x="${id}" aria-label="Remove">×</button></span>`);
 if(st.q)chips.push(`<span class=chip><i>Search ·</i> “${esc(st.q)}”<button data-x="__q">×</button></span>`);
 const SL=k=>k=='n'?'Card':String(COL[k]?.[0]||k).replace(/<[^>]+>/g,'').trim();
 if(st.sort&&(st.sort=='n'||COL[st.sort])&&!['val'].includes(st.s))chips.push(`<span class=chip><i>Sort ·</i> ${esc(SL(st.sort))} ${st.dir>0?'▴':'▾'}<button data-x="__sort" aria-label="Reset sort">×</button></span>`);
/* Suggested presets removed (Andrew 2026-10-29): no preset bubbles on card views */$('#pre').innerHTML='';$('#pre').hidden=true;if(0)PRESETS().map(p=>`<a href="#preset/${p.id}" class="pchip ${curPre()==p.id?'on':''}" data-pre="${p.id}">${esc(p.n)}</a>`).join('');
 $('#bar').innerHTML=`<span class=count>${R.length} <span>of ${C.filter(LIVE).length} cards</span></span><span class=chips id=chips>${chips.join('')}</span>${st.s=='ins'?`<span id=imode role=group aria-label="Insurance detail">${IMSET().map(([id,n])=>`<button type=button data-im=${id} class="${id==IMODE()?'on':''}" aria-pressed=${id==IMODE()}>${n}</button>`).join('')}</span>`:GKEY()=='perk'?`<span id=imode class=pmode role=group aria-label="Perk detail">${PMODES.map(([id,n])=>`<button type=button data-pm=${id} class="${id==PMODE()?'on':''}" aria-pressed=${id==PMODE()}>${n}</button>`).join('')}</span>`:IMG.includes(st.s)?`<span id=imode class=ovmode role=group aria-label="${(S.find(x=>x.id==st.s)||{}).name} view">${GROUPS[st.s].map(([id,n])=>`<button type=button data-g=${id} class="${id==GKEY()?'on':''}" aria-pressed=${id==GKEY()}>${n}</button>`).join('')}</span>`:''}`;/* B12 (Andrew 2026-11-01): Profile's Snapshot/Fees/Underwriting and Rewards' Summary/Living/Lifestyle (IMG) use the Insurance level selector (#imode), not the #grp file-folder row */
 chipFit();
 if(st.s=='val')return renderVal();
 const cols=['n',...scr.cols];
 /* PUSH 6 (Andrew 2026-10-30): every Credit Cards tab is one table. One row set (filters + search + sort applied once, ties and no sort in card-index order); a tab or sub-tab only swaps the columns, so row order and the anchored card hold across every switch */
 const sk=st.sort&&(st.sort=='n'||COL[st.sort])?st.sort:null,dir=sk?st.dir:1,key=sk=='n'?c=>c.n:sk?COL[sk][2]:null;
 R.sort((a,b)=>(key?nlast(key(a),key(b),dir):0)||CIX.get(a)-CIX.get(b));
 const tck=TCOVK(),tcs=tck?cols.filter(k=>/^ins_/.test(k)&&INS.some(x=>'ins_'+x[0]==k)):[],tc0=tcs[0];
 $('#th').innerHTML='<tr>'+cols.map(k=>{const [l,cl]=k=='n'?['Card','l nm']:COL[k],tv=tcs.includes(k),on=tv&&k=='ins_'+tck;return`<th data-k="${k}" class="${cl=='wrapt'?'l':cl} ${!tv&&k==sk?'s'+(dir>0?' asc':''):''}${tv?' tcov':''}${on?' tsel':''}"${tv?` aria-pressed=${on} title="Show these terms"`:''}>${l}</th>`}).join('')+'</tr>';
 $('#tb').innerHTML=R.length?R.map((c,ix)=>`<tr data-i="${C.indexOf(c)}">`+cols.map(k=>k=='n'?`<td class="l nm"><button type=button class=nmb data-m="${C.indexOf(c)}" aria-haspopup=dialog title="All details"><b class=cl>${esc(c.n)}</b></button>${c.st=='discontinued'?'<span class=disc>Discontinued</span>':''}<small>${esc(c.i)} · ${esc(c.prog)}</small></td>`:tcs.includes(k)?(k==tc0?`<td class="l tboxc" colspan=${tcs.length}>${termsBox(c,tck)}</td>`:''):`<td class="${COL[k][1]}">${COL[k][3](c)}</td>`).join('')+'</tr>').join(''):`<tr><td class=empty colspan=${cols.length}>No cards match. Remove a filter.</td></tr>`;
}
/* a perk row opens its quote and source under it (same pattern as the Insurance rows): the sentence from the issuer page, its link, the evidence class, the archived capture and the capture date */
const pkDet=(r,n)=>`<tr class="det pkd"><td colspan=${n}>${r.qt?`<p class=pkq>“${esc(r.qt)}”</p>`:''}<div class=pkm>${[r.el?`<span><b>Eligibility</b> ${esc(r.el)}</span>`:'',r.nt?`<span><b>Note</b> ${esc(r.nt)}</span>`:'',`<span><b>Source</b> ${r.su?lnk(r.su):'—'}</span>`,r.ec?`<span><b>Evidence</b> <span class=t>${esc(r.ec)}</span></span>`:'',r.ap?`<span><b>Archived</b> <code>${esc(r.ap)}</code></span>`:'',r.rt?`<span><b>Retrieved</b> ${esc(r.rt)}</span>`:''].filter(Boolean).join('')}</div></td></tr>`;
/* Perks (Andrew 2026-10-30): one table like Insurance. Tabs at the top right: Benefit (green ✓ / red ✗ per perk type), Value, Recurrence, Expiry (as stored in card_perk_facts). A card without the type shows the red ✗ in every tab (as Insurance). A field the perk row leaves empty shows the muted dash 'Not yet captured'; an unverified perk row shows its value with the dotted 'Not yet verified' underline. A cell opens the perks' quote and source under the row. */
const PMODES=[['ben','Benefit'],['val','Value'],['rec','Recurrence'],['exp','Expiry']],PMODE=()=>PMODES.some(m=>m[0]==st.pm)?st.pm:'ben';
const pmU=a=>[...new Set(a.filter(Boolean))],PMD='<span class=u title="Not yet captured">—</span>',PMON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ptRows=(c,t)=>c.cp.filter(r=>LIVEPK(r)&&t[2](r)),LIVEPK=r=>r.s=='live'||r.s=='unverified';
const ptOne=(r,m)=>{let h;if(m=='val')h=r.a!=null?esc(pkMoney(r)):r.u=='membership'?'Included':r.q!=null&&r.u?pkVal(r):null;
 else if(m=='rec')h=r.rec?esc(pkLab(PKREC,r.rec)):null;
 else{const x=/^(\d{4})-(\d\d)-(\d\d)$/.exec(r.ex||'');h=x?`${PMON[+x[2]-1]} ${+x[3]}, ${x[1]}`:r.ex=='ongoing'?'Ongoing':r.ex?esc(r.ex):null}
 return h==null?PMD:r.s=='unverified'?UNV(h):h};
const ptCell=(c,t)=>{const R0=ptRows(c,t),m=PMODE();if(!R0.length)return `<span class=n title="No ${esc(t[1])} perk on this card">✗</span>`;
 const h=m=='ben'?(R0.every(r=>r.s=='unverified')?UNV('<span class=y>✓</span>'):'<span class=y>✓</span>'):pmU(R0.map(r=>ptOne(r,m))).join(' · ');
 return `<button type=button class=pkb data-pki="${CIX.get(c)}" data-pt="${t[0]}" aria-expanded=false title="${esc(R0.map(r=>r.n).join('; '))}">${h}</button>`};
const ptKey=(c,t)=>{const R0=ptRows(c,t),m=PMODE();if(!R0.length)return null;if(m=='ben')return -1;if(m=='val'){const v=R0.filter(r=>r.a!=null);return v.length?-v.reduce((s,r)=>s+r.a,0):0}if(m=='rec')return PKREC.findIndex(x=>x[0]==R0[0].rec);const d=R0.map(r=>r.ex).filter(x=>/^\d{4}-/.test(x||'')).sort()[0];return d||(R0.some(r=>r.ex=='ongoing')?'9999':'99999')};
PKTYPES.forEach(t=>COL['pt_'+t[0]]=[t[1],'pt',c=>ptKey(c,t),c=>ptCell(c,t)]);
document.addEventListener('click',e=>{const b=e.target.closest('[data-pm]');if(!b)return;e.stopImmediatePropagation();const KP=posGet();st.pm=b.dataset.pm;render();posSet(KP)},true);
document.addEventListener('click',e=>{const b=e.target.closest('.pkb[data-pki]');if(!b||GKEY()!='perk')return;e.stopPropagation();const t=b.closest('tr'),open=b.getAttribute('aria-expanded')=='true';
 while(t.nextElementSibling?.classList.contains('pkd'))t.nextElementSibling.remove();t.classList.remove('op');t.querySelectorAll('.pkb').forEach(x=>x.setAttribute('aria-expanded','false'));if(open)return;
 t.classList.add('op');b.setAttribute('aria-expanded','true');t.insertAdjacentHTML('afterend',ptRows(C[+b.dataset.pki],PKTYPES.find(x=>x[0]==b.dataset.pt)).map(r=>pkDet(r,t.children.length)).join(''))},true);
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
/* Reward type cell (Andrew 2026-11-01, to fit the 1024 Sidecar width): wraps onto two lines (a slash may break), no visible source badge; the reward_type source tag and basis live in the hover title, dotted underline (.nyv) when not CITED */
const RTCELL=c=>{const v=c.ve?.reward_type,tag=v?v[0]:null;return `<span class="rtc${tag&&tag!='CITED'?' nyv':''}" title="${esc('Reward type: '+c.rt+(tag?' · '+tag:'')+(v&&v[1]?' · '+v[1]:''))}">${esc(c.rt).replace(/\//g,'/<wbr>')}</span>`};
const VE=(c,f)=>{const v=c.ve[f];return v?`<span class=t title="${esc(v[1]||'')}">${esc(v[0])}</span>`:''};
const lnk=u=>u?`<a href="${esc(u)}" target=_blank rel=noopener>${esc(u.replace(/^https?:\/\/(www\.)?/,'').slice(0,60))}</a>`:'';
const INSN={emergency_medical:'med',trip_cancellation:'trip',trip_interruption:'trip',flight_delay:'fd',baggage:'bag',rental_car_cdw:'cdw',purchase_protection:'pp',extended_warranty:'ew',mobile_device:'mob'};
/* Insurance table levels (st.im, persisted with the rest of the table state; Andrew 2026-10-31): Coverage = check or X only; Limit/Trip and Limit/Person read c.inslb[k] = [per-trip limit, per-person limit, reason not classified] (ins_parse.lim_basis: from the stored basis columns and the per trip / per person / per claim wording only; a limit the text does not classify shows the dash in both); Covered reads c.inscv[k] = the groups the stored text says are covered (ins_parse.who_cov); Terms reads c.insr[k][2]. Missing values show the dash. */
document.addEventListener('click',e=>{const h=e.target.closest('#th th.tcov');if(!h||e.target.closest('.lgrip'))return;e.stopImmediatePropagation();const g=GKEY(),k=h.dataset.k.slice(4);STO.ui={...(STO.ui||{}),tcov:{...((STO.ui||{}).tcov||{}),[g]:k}};saveS();const KP=posGet();render();posSet(KP)},true);
/* B11 (Andrew 2026-11-01): active-filter chips stay on one row. As many chips as fit, then a '+N more' chip (same .chip) that opens a popover (.tpop) listing every active condition, each with its ×, plus Clear all. The row height never changes. */
const CHP={o:false};
function chipFit(){const r=document.getElementById('chips');if(!r)return;const C0=[...r.querySelectorAll(':scope>.chip:not(.chipm)')];r.querySelector('.chipm')?.remove();C0.forEach(c=>c.hidden=false);
 if(r.scrollWidth>r.clientWidth+1){const m=document.createElement('button');m.type='button';m.className='chip chipm';m.setAttribute('aria-haspopup','dialog');r.append(m);let n=0;
  for(let i=C0.length-1;i>=0;i--){C0[i].hidden=true;n++;m.textContent='+'+n+' more';m.setAttribute('aria-label',n+' more active conditions');if(r.scrollWidth<=r.clientWidth+1)break}}
 chipPop(CHP.o)}
function chipPop(o){document.getElementById('chpop')?.remove();CHP.o=o;const r=document.getElementById('chips'),m=r&&r.querySelector('.chipm');if(!o||!r)return;const L=[...r.querySelectorAll(':scope>.chip:not(.chipm)')];if(!L.length||!m){CHP.o=false;return}
 const d=document.createElement('div');d.id='chpop';d.className='tpop';d.setAttribute('role','dialog');d.setAttribute('aria-label','Active conditions');
 d.innerHTML=`<div class=tph>Active conditions (${L.length})</div><div class=chpl>${L.map(c=>{const x=c.cloneNode(true);x.hidden=false;return x.outerHTML}).join('')}</div><p class=tpnote><button type=button class=clr data-x="__all">Clear all</button></p>`;
 document.body.append(d);const a=m.getBoundingClientRect(),w=d.offsetWidth;d.style.left=Math.max(8,Math.min(innerWidth-w-8,a.left))+scrollX+'px';d.style.top=a.bottom+6+scrollY+'px'}
document.addEventListener('click',e=>{if(e.target.closest('.chipm')){e.stopImmediatePropagation();chipPop(!CHP.o);return}if(CHP.o&&!e.target.closest('#chpop'))chipPop(false)},true);
document.addEventListener('keydown',e=>{if(e.key=='Escape'&&CHP.o){chipPop(false);document.querySelector('.chipm')?.focus()}});
addEventListener('resize',()=>chipFit());
/* B11 (Andrew 2026-11-01): Protection coverages are not per trip or per person, so Protection has one Limit level (lim): the stated limit (c.insr[k][1]) with its basis as printed (per claim / per item / per year / lifetime). Travel keeps Limit/Trip + Limit/Person. Saved st.im maps across: limt|limp -> lim on Protection, lim -> limt on Travel. */
const IMODES_T=[['cov','Coverage'],['limt','Limit/Trip'],['limp','Limit/Person'],['who','Covered'],['terms','Terms']],IMODES_P=[['cov','Coverage'],['lim','Limit'],['who','Covered'],['terms','Terms']];
let IMODES=IMODES_T;const IMSET=()=>{IMODES=st.s=='ins'&&GKEY()=='prot'?IMODES_P:IMODES_T;return IMODES},IMODE=()=>{const L=IMSET(),p=L===IMODES_P;let m=st.im;if(p&&(m=='limt'||m=='limp'))m='lim';if(!p&&m=='lim')m='limt';return L.some(x=>x[0]==m)?m:'cov'};
const LIMB=/\b(per (?:claim|item|occurrence|incident|account|calendar year|year|12[- ]month period|card(?:holder)?)|lifetime|annual(?:ly)?)\b/i,limBasis=r=>{const t=[r&&r[2],r&&r[3]].filter(Boolean).join(' · ');let m=null;if(typeof r?.[1]=='number'){const k=r[1]>=1000&&r[1]%1000==0?'\\$'+(r[1]/1000)+'k':null;const own=k&&new RegExp(k+'\\s+([a-z ]+?)(?:\\s*·|$)','i').exec(t);if(own&&LIMB.test(own[1]))m=LIMB.exec(own[1])[1]}if(!m){const x=t.split('·').map(z=>z.trim()).find(z=>LIMB.test(z)&&!/\$\d/.test(z));if(x)m=LIMB.exec(x)[1]}return m?m.toLowerCase():''};
const INSAMTF=v=>typeof v=='number'?'$'+(v>=1e6?v/1e6+'M':v.toLocaleString()):esc(v);
function insCell(c,cv){const m=IMODE(),st0=insV(c,cv);if(m=='cov'||st.s!='ins')return ynI(c,cv);const r=(c.insr||{})[cv];
 if(st0=='nl')return '<span class=mute title="Not listed in this card’s insurance terms">—</span>';
 if(st0===0)return '<span class=n>✗</span>';
 const W=x=>st0==null?UNV(x):x;/* class b: captured but not yet verified -> dotted underline, title 'Not yet verified' */
 const LC=(v,bs,t)=>W((t?`<span title="${esc(t)}">`:'')+INSAMTF(v)+(bs?` <small class=mute>${esc(bs)}</small>`:'')+(t?'</span>':''));/* B11 shared Limit cell spec (Protection Limit, Travel Limit/Trip, Limit/Person): stated amount as printed + its basis in small mute, unverified = dotted underline */
 if(m=='lim'){const v=r?r[1]:null;if(v==null)return '<span class=u title="No limit stated">—</span>';return LC(v,limBasis(r))}
 if(m=='limt'||m=='limp'){const b=(c.inslb||{})[cv],v=b?b[m=='limt'?0:1]:null;
  if(v!=null)return LC(v,m=='limt'?'per trip':'per person');
  const sv=r?r[1]:null;if(sv!=null&&b&&b[2])return LC(sv,limBasis(r),'Stated limit as printed; the record does not say whether it is per trip or per person ('+b[2]+')');
  return b&&b[2]?`<span class=u title="Limit not classified per trip or per person (${esc(b[2])})">—</span>`:b?`<span class=u title="${m=='limt'?'No per-trip limit stated':'No per-person limit stated'}">—</span>`:'<span class=u title="Not yet captured">—</span>'}
 if(m=='who'){const g=(c.inscv||{})[cv];return g&&g.length?W(`<span class=who title="Covered: ${esc(g.join(', '))}">${g.map(esc).join(', ')}</span>`):'<span class=u title="Who is covered is not captured">—</span>'}
 return termsBox(c,cv)}/* Terms (B11): never per cell; render0 merges the coverage columns into one box (termsBox) */
/* B11 (Andrew 2026-11-01): Insurance Terms level. The coverage headers select a coverage (STO.ui.tcov[trv|prot], default the first coverage; no sort, no toggle back) and every row shows that card's full terms for it in one box spanning the coverage columns: status, limit with its basis, every stated condition, who is covered, the issuer note, and the evidence tag with its source. */
const TCOVK=()=>{if(st.s!='ins'||IMODE()!='terms')return null;const L=(GKEY()=='trv'?INS_T:INS_P).map(x=>x[0]),v=((STO.ui||{}).tcov||{})[GKEY()];return L.includes(v)?v:L[0]};
const TVEK={emergency_medical:['travel_medical'],trip_cancellation:['trip:cancellation','trip'],trip_interruption:['trip:interruption','trip'],hotel_burglary:['other:hotel_burglary'],travel_accident:['other:travel_accident'],rental_car_cdw:['car_rental_cdw'],price_protection:['other:price_protection'],roadside:['other:roadside','other']},TVE=(c,k)=>{const V=c.ve||{};for(const x of [k,...(TVEK[k]||[])])if(V['ins_'+x])return V['ins_'+x];return null};/* evidence keys in c.ve (card_value_evidence field names) for each coverage */
function termsBox(c,k){const st0=insV(c,k),r=(c.insr||{})[k],u=c.insu&&c.insu[k],d=(c.insd||{})[k]||{},ev=TVE(c,k),nm=(INS.find(x=>x[0]==k)||[0,k])[1];
 const sts=st0===1?'<span class=y>✓</span> Included':st0===0?'<span class=n>✗</span> Not covered':st0=='nl'?'Not listed in this card’s insurance terms':u?'Captured, not yet verified':'Not captured';
 const v=st0==null&&u?u[2]:r?r[2]:null,lim=r&&r[1]!=null?INSAMTF(r[1])+(limBasis(r)?' '+esc(limBasis(r)):''):null,cv=(c.inscv||{})[k];
 const T=String(v||'').split(' · ').filter(Boolean),raw=r&&r[3]&&r[3]!==v?r[3]:null,src=ev&&/https?:\/\/\S+/.exec(ev[1]||'');
 const body=[`<b class=tbn>${esc(nm)}</b> <span class=tbs>${sts}</span>${lim?` · <span class=tbl>Limit ${lim}</span>`:''}`,
  k=='emergency_medical'&&c.medage?`<div class=tbt>${medAgeCell(c,v)}</div>`:T.length?`<ul class=tbt>${T.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'',
  raw?`<div class="tbr mute">As extracted: ${esc(raw)}</div>`:'',cv&&cv.length?`<div class=tbw>Covered: ${cv.map(esc).join(', ')}</div>`:'',d.b?`<div class="tbr mute">${esc(d.b)}</div>`:'',
  ev?`<div class=tbe><span class=t>${esc(ev[0])}</span> <span class=mute>${esc(String(ev[1]||'').replace(/;?\s*Source:\s*https?:\/\/\S+/,'').replace(/https?:\/\/\S+/,''))}</span>${src?` <a href="${esc(src[0])}" target=_blank rel=noopener>Source</a>`:''}</div>`:(st0==null?'<div class=tbe>'+(u?UNV('Not yet verified'):'<span class=mute title="Not captured in this card’s insurance terms">—</span>')+'</div>':'')/* 2026-11-02: Not yet verified only for captured-but-unverified coverages (c.insu), as in the Coverage cell; nothing captured = the dash */].filter(Boolean).join('');
 return `<div class=tbox>${body}</div>`}
/* G4 (Andrew 2026-10-29): emergency medical days by age band, as the card's own insurance terms state them (build: med_age.py); no age is assumed. */
function medAgeCell(c,v){const B=c.medage.map(([lo,hi,d])=>`<b>${lo==0?(hi==null?'All ages':'Under '+(hi+1)):hi==null?lo+' and over':lo+'–'+hi}</b> ${d?d+' days':'not covered'}`).join(' · '),rest=String(v||'').split(' · ').filter(x=>!/^\d+ days( per trip)?$|^age limits apply$/i.test(x)).join(' · ');return `<span class=cond title="Days of cover per trip by age, from the card's insurance terms (CITED)">${B}${rest?' · '+esc(rest):''}</span>`}
function insX(c){const u=(c.ix.ins_uw_by_cov||[{}])[0],ut=c.ix.ins_uw_by_cov?XT(c,'ins_uw_by_cov'):'',L=[['Common carrier AD&D (max)','cc_add_max','$'],['Rental vehicle AD&D (max)','rental_add_max','$'],['Price protection window','pp_days','d'],['Price protection per item','pp_item','$'],['Price protection per year','pp_year','$'],['Price protection minimum difference','pp_min','$'],['Price protection only on tier','pp_tier','']];
 const CV={cc_add_max:'travel_accident',pp_days:'price_protection',pp_item:'price_protection',pp_year:'price_protection',pp_min:'price_protection'};
 const r=L.map(([l,k,f])=>X(c,k)!=null?`<tr><td>${l}</td><td>${f=='$'?'$'+X(c,k).toLocaleString():f=='d'?X(c,k)+' days':esc(X(c,k))}</td><td>${XT(c,k)}</td></tr>`:CV[k]&&c.ins[CV[k]]===0?`<tr><td>${l}</td><td><span class=z>$0</span> <span class=mute>not included</span></td><td></td></tr>`:k=='pp_tier'||k=='pp_min'||k=='rental_add_max'?'':`<tr><td>${l}</td><td><span class=q>—</span></td><td></td></tr>`).filter(Boolean);
 const w=Object.entries(u).map(([k,v])=>`<tr><td>${esc((INS.find(x=>x[0]==k)||[,k])[1])}</td><td>${esc(v)}</td><td>${ut}</td></tr>`);
 return (r.length?`<table style="margin-top:8px"><tr><th>Limit</th><th>Value</th><th>Source</th></tr>${r.join('')}</table>`:'')+(w.length?`<table style="margin-top:8px"><tr><th>Coverage</th><th>Underwriter</th><th>Source</th></tr>${w.join('')}</table>`:c.insl.uw?`<table style="margin-top:8px"><tr><th>Underwriter</th><td>${esc(c.insl.uw)}</td></tr></table>`:'')}
function cardHTML(c,full,ctx){const kv=(l,v,f)=>`<div><span>${l}:</span> ${v??'<span class=u>—</span>'}${f?VE(c,f):''}</div>`;
 const er=c.erows.length?`<table><tr><th>Category</th><th>As stated</th><th>Baseline %</th><th>Condition / cap</th></tr>${c.erows.map(e=>`<tr><td>${esc(e.cat)}</td><td>${esc(e.txt)} <span class=mute>${esc(e.v||'')}</span></td><td>${e.pct==null?'—':e.pct.toFixed(2)+'%'}</td><td>${esc(e.cond||'')}${e.cap?` cap $${e.cap.toLocaleString()}/${esc((e.capp||'').toLowerCase())}`:''}</td></tr>`).join('')}</table>`:'<span class=u>No earn rows on record</span>';
 const ins=`<table><tr><th>Coverage</th><th>State</th><th>Terms / basis</th></tr>${INS.map(([k,l])=>{const d=c.insd[k]||{};return`<tr><td>${l}</td><td>${ynI(c,k)}</td><td>${esc((INSN[k]&&c.insl[INSN[k]])||d.b||'')}</td></tr>`}).join('')}</table>${insX(c)}`;
 const hero=`<div class=hero><div><span>Annual Cost</span><b>${c.fee==null?esc(c.feet||'—'):'$'+c.fee.toLocaleString()}</b></div><div><span>Base earn %</span><b>${c.other==null?'—':c.other.toFixed(2)+'%'}</b></div><div><span>Best earn %</span><b>${c.best==null?'—':c.best.toFixed(2)+'%'}</b></div><div><span>FX fee</span><b>${c.fx==null?'—':c.fx+'%'}</b></div><div><span>Insurance</span><b>${c.nins}/12</b></div></div>`;
 const srcF=re=>c.srcs.filter(x=>re.test((x.t||'')+' '+(x.f||'')));
 const srcL=L=>L.length?`<table><tr><th>Source</th><th>Type · date</th><th>Covers</th></tr>${L.map(x=>`<tr><td>${lnk(x.u)}</td><td>${esc(x.t||'')} · ${esc(x.d||'')}${x.vs&&x.vs!='VERIFIED'?' · '+esc(x.vs):''}</td><td>${esc(x.f||'')}</td></tr>`).join('')}</table>`:'';
 const P=D.val.programs.find(p=>p.program==c.prog);
 const SEC={
  fees:{t:'Fees & eligibility',one:()=>`${c.fee==null?esc(c.feet):'$'+c.fee.toLocaleString()} · FX ${c.fx==null?'—':c.fx+'%'} · APR ${c.apr==null?'—':c.apr+'%'}`,
   base:()=>`<div class=kv>${kv('Annual Cost',c.fee==null?esc(c.feet):money(c.fee),'fee_amount')}${kv('First-year fee',c.fy3)}${kv('Extra cards',esc(c.addt))}${kv('FX fee',c.fx==null?null:c.fx+'%'+(c.fxs?' <span class=mute>('+esc(c.fxs)+')</span>':''),'fx_pct')}${kv('Purchase APR',c.apr==null?esc(c.aprt):c.apr+'%')}${kv('Income (personal)',c.inc?'$'+c.inc.toLocaleString():esc(c.inct))}${kv('Income (household)',c.hinc?'$'+c.hinc.toLocaleString():null)}</div>`,
   deep:()=>`<table><tr><th>Field</th><th>Value</th><th>As stated / condition</th></tr>${[['Annual Cost',c.fee==null?'—':'$'+c.fee,esc(c.feet)+(c.xf.ffreq?' · billed '+esc(c.xf.ffreq):'')+VE(c,'fee_amount')],['First-year fee',c.fy3,esc([c.pro.fyf,c.pro.fyfm].filter(Boolean).join(' · '))],['Fee waiver path',c.xf.waiver?'Yes':'—',esc(c.xf.waiver||'')],['Extra cards',c.add==null?'—':'$'+c.add,esc(c.addt||'')],['FX fee',c.fx==null?'—':c.fx+'%',esc((c.fxt||'')+(c.xf.fxs?' · scope '+c.xf.fxs:''))+VE(c,'fx_pct')],['Purchase APR',c.apr==null?'—':c.apr+'%',esc(c.aprt||'')],['Cash advance',' ',esc(c.xf.cash||'')],['Income (personal)',c.inc?'$'+c.inc.toLocaleString():'—',esc(c.inct||'')],['Income (household)',c.hinc?'$'+c.hinc.toLocaleString():'—',''],['Spend alternative to income','',esc(c.xf.incalt||'')],['Product type',esc(c.pt||'—'),VE(c,'card_product_type')],['Currency / account',esc((c.cur||'—')+' · '+(c.acct||'—')),VE(c,'currency')+VE(c,'account_type')]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]||''}</td></tr>`).join('')}</table>${srcL(srcF(/fee|rate|schedule|apr|income|disclosure|product page/i))}`},
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
const acts=c=>{const on=W.cards.includes(c.id);return `<div class=acts><button class="btn ${on?'on':''}" data-wal="${c.id}">${on?'<span class=y>✓</span> In Wallet':'+ Wallet'}</button></div>`};
function openM(c,full){$('#mc').innerHTML=cardHTML(c,0,full?null:st.s)+acts(c);
 $('#mbg').classList.add('on');$('#mbg').setAttribute('aria-hidden','false');$('#mx').focus()}
const closeM=()=>{$('#mbg').classList.remove('on');$('#mbg').setAttribute('aria-hidden','true')};
/* Push C (2026-10-29): switching views keeps the table where it was: page scroll, horizontal scroll, and the same card row at the top of the view */
/* view switches (sub-tabs, sub-sub-tabs, table/view toggles; Andrew 2026-10-30): anchor on the card. If the sticky stack (#bar + column header row) is stuck, record the top visible card and its offset below the stack, and after the switch scroll (one frame, no animation) so the same card sits at the same offset; a card not in the new table lands at the top of the new table. If the stack is not stuck, the page does not move. */
const posNat=b=>{const p=b.style.position;b.style.position='static';const t=b.getBoundingClientRect().top+scrollY;b.style.position=p;return t};
const posHH=()=>(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'))||0)*(window.__tz||1)/* --hh is in the zoomed page's px on phone table pages */;
const posStack=()=>Math.max(($('#th th')||$('#th'))?.getBoundingClientRect().bottom||0,posHH());
const posGet=()=>{if(posHold.p&&posHold.p.stuck&&scrollY===posSet.last?.y)return posHold.p/* a switch before the last one settled keeps its anchor */;const b=$('#bar');if(!b||b.hidden||!b.offsetParent||!(scrollY>0))return {y:scrollY,stuck:false};const y=posStack();let a=null,o=0;for(const r of document.querySelectorAll('.wrap:not([hidden]) #tb tr[data-i]')){const q=r.getBoundingClientRect();if(q.bottom>y+1){a=r.dataset.i;o=q.top;break}}const L=posSet.last;if(L&&L.y===scrollY&&L.a===a){o=L.o;return {y:scrollY,stuck:true,a,o,s:L.s}}/* repeated switches keep the first offset: no sub-pixel creep */;return {y:scrollY,stuck:true,a,o,s:y}};
/* PUSH (Andrew 2026-10-30, Perks cold load): the anchor holds until layout settles. Right after a fresh load the new view's rows, logos, fonts and sticky offsets can still change size after the first restore (Safari has no scroll anchoring), which left the top card off until a later switch. posSet re-applies the same card + offset on the next frames and on every ResizeObserver change of the table and sticky stack for 1.2s, and a switch made during that window reuses the held anchor instead of re-measuring a half-settled page. Any user scroll input (wheel, touch, keys, scrollbar drag) ends the hold. */
const posHold={p:null,t:0,ro:null,f:0,stop(){this.p=null;clearTimeout(this.t);this.ro?.disconnect();cancelAnimationFrame(this.f)}};
['wheel','touchstart','keydown','mousedown'].forEach(ev=>addEventListener(ev,e=>{if(ev=='mousedown'&&e.target!==document.documentElement)return;if(ev=='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))return;posHold.stop()},{passive:true,capture:true}));
function posSet(p){if(!p)return;posSet0(p);if(!p.stuck||p.a==null||!posSet.last){posHold.stop();return}const H=posHold;H.stop();H.p=p;const again=()=>{if(H.p===p){posSet0(p);}};let n=0;const tick=()=>{again();if(++n<3&&H.p===p)H.f=requestAnimationFrame(tick)};H.f=requestAnimationFrame(tick);if(window.ResizeObserver){H.ro=new ResizeObserver(()=>again());const w=document.querySelector('.wrap:not([hidden]) table');[w,document.querySelector('#th'),document.querySelector('#bar'),document.querySelector('header')].forEach(e=>e&&H.ro.observe(e))}addEventListener('load',again,{once:true});document.fonts?.ready?.then(again);H.t=setTimeout(()=>H.stop(),1200)}
function posSet0(p){if(!p)return;window.stickySet?.();const b=$('#bar');if(!p.stuck||!b||b.hidden||!b.offsetParent){scrollTo(scrollX,p.y);return}const top=0;const r=p.a!=null&&document.querySelector(`.wrap:not([hidden]) #tb tr[data-i="${p.a}"]`);if(r){scrollTo(scrollX,Math.max(top,(window.__tz<1?x=>x:Math.round)(scrollY+r.getBoundingClientRect().top-(p.o+Math.max(0,posStack()-p.s)))/* phone table pages: the scaled page scrolls in fractional px, so no rounding *//* same screen y; if the new view's frozen header is taller, sit just under it */));posSet.last={a:p.a,o:p.o,s:p.s,y:scrollY}}else{scrollTo(scrollX,0);posSet.last=null}}
document.addEventListener('click',e=>{const b=e.target.closest('#grp [data-rwt]');if(!b)return;e.stopImmediatePropagation();st.g={...(st.g||{}),rwt:b.dataset.rwt};const KP=posGet();render();$('#grp [data-rwt].on')?.focus({preventScroll:true});posSet(KP)},true);
document.addEventListener('click',e=>{const b=e.target.closest('#grp [data-g],#imode [data-g]');if(!b)return;e.stopImmediatePropagation();st.g={...(st.g||{}),[st.s]:b.dataset.g};const KP=posGet();render();const n=$('#grp [data-g].on,#imode [data-g].on');if(n)n.focus({preventScroll:true});posSet(KP)},true);
document.addEventListener('keydown',e=>{const b=e.target.closest?.('#nav3 nav button');if(b&&['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){const L=[...b.closest('nav').querySelectorAll('button')],i=L.indexOf(b),n=e.key=='Home'?0:e.key=='End'?L.length-1:(i+(e.key=='ArrowRight'?1:-1)+L.length)%L.length;e.preventDefault();L[n].focus()}});
document.addEventListener('keydown',e=>{if(e.key=='Escape')closeM();if((e.key=='Enter'||e.key==' ')&&e.target.dataset?.mf){e.preventDefault();e.target.click()}if((e.key=='Enter'||e.key==' ')&&e.target.dataset?.wtile!=null){e.preventDefault();openM(C[+e.target.dataset.wtile])}if((e.key=='Enter'||e.key==' ')&&e.target.classList?.contains('prow')){e.preventDefault();e.target.click()}if(e.key=='Enter'&&e.target.id=='logo'){e.target.click()}});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-fdone],#fsbg')){STO.ui={...(STO.ui||{}),fcol:true};saveS();render();$('#fcol')?.focus();return}
 if(e.target.closest('#fcol')){STO.ui={...(STO.ui||{}),fcol:STO.ui?.fcol===false};saveS();render();$('#fcol')?.focus();return}

 {const mx=e.target.closest('[data-subsx]');if(mx){e.stopPropagation();STO.wallet.services=(STO.wallet.services||[]).filter(k=>k!=mx.dataset.subsx);saveS();render();return}}
 {const ms=e.target.closest('[data-subscriptions]');if(ms){const k=ms.dataset.subscriptions,S2=new Set(STO.wallet.services||[]);ms.checked?S2.add(k):S2.delete(k);STO.wallet.services=[...S2];saveS();render();return}}
 if(e.target.closest('#rtog')){togRail();return}
 {const bps=e.target.closest('[data-bps]');if(bps){st.bps=bps.dataset.bps;render();return}}
 {const t=e.target,pe=t.closest('[data-penroll],[data-pdecline],[data-pundo],[data-pdone],[data-punroll],[data-pactc],[data-prm]');
  /* Andrew 2026-11-04: the five sections answer here. Enrol writes one record {st:'enrolled',e:today} in wallet.promo (synced); decline is reversible;
     'Payout received' is his own statement that the money arrived, so it also leaves a date. Nothing is written for an offer the page is not showing. */
  if(pe){const p=PROMO.find(x=>x.k==(pe.dataset.penroll||pe.dataset.pdecline||pe.dataset.pundo||pe.dataset.pdone||pe.dataset.punroll||pe.dataset.prm));
   /* the page itself is the gate: each product line's Promotions view (cards prom, tel tprom) and the PerYourTerms page all
      render #pw-promos, so one handler serves them and no answer can be written from another view */
   if(p&&document.querySelector('#pw-promos')){const R=PREG(),k=p.k,r=R[k];
    if(pe.dataset.penroll){if(!r)R[k]={st:'enrolled',e:pToday()};st.pact=k}
    else if(pe.dataset.pdecline){R[k]={st:'declined',e:pToday()};st.pact=null;st.popen=null}
    else if(pe.dataset.pundo){delete R[k];st.popen=null}
    else if(pe.dataset.pdone){if(r){R[k]={...r,st:'complete',done:pToday()};st.pact=null}}
    else if(pe.dataset.punroll||pe.dataset.prm){delete R[k];st.pact=null;st.popen=null}
    else st.pact=st.pact==k?null:k;
    saveS();render();return}}
  if(t.closest('[data-pelig]')){st.pelig=t.closest('[data-pelig]').checked;render();return}if(t.closest('[data-pend]')){st.pend=t.closest('[data-pend]').checked;render();return}const py=t.closest('[data-pty]');if(py){st.pty=py.dataset.pty;render();return}const pb=t.closest('[data-pdf]');if(pb){pdfModal(pb.dataset.pdf,pb.dataset.pdft,pb.dataset.pdfd);return}if(t.closest('[data-pdfx]')||t.id=='pdfm'){$('#pdfm')?.remove();return}}
 {const t=e.target,pa=!t.closest('[data-prm]')&&t.closest('[data-pact]');if(pa){st.pact=st.pact==pa.dataset.pact?null:pa.dataset.pact;render();return}const ps=t.closest('[data-psort]'),pr=t.closest('tr.prow');if(ps){const k=ps.dataset.psort,o=st.psort||{k:'v',d:-1};st.psort={k,d:o.k==k?-o.d:(['v','mp','aum'].includes(k)?-1:1)};render();return}if(pr&&!t.closest('a,button,label')){st.popen=st.popen==pr.dataset.pk?null:pr.dataset.pk;render();return}}
{const t=e.target,cg=t.closest('[data-cardgo]'),sg=t.closest('[data-subsgo]');if(cg){st.pl='cards';st.card=cg.dataset.cardgo;if(USR.has(st.s)||st.s=='wfolder'||String(st.s||'').startsWith('soon_'))st.s=(typeof CTV=='function'&&CTV()||['ovw'])[0]||'ovw';render();scrollTo(0,0);return}if(sg){const k=sg.dataset.subsgo;st.subo=st.s=='subscriptions'&&st.subo==k?null:k;st.s='subscriptions';st.card=null;navR();render();document.querySelector(`[data-sub="${k}"]`)?.scrollIntoView({block:'nearest'});return}}
 if(e.target.id=='mbg'||e.target.id=='mx'){closeM();return}
 {const b=e.target.closest('[data-my1]');if(b){st.my1=+b.dataset.my1;render();return}}
 if(e.target.closest('[data-mdiff]')){st.mdiff=e.target.checked;render();return}
 const wb=e.target.closest('[data-wal],[data-wrm]');if(wb){const id=wb.dataset.wal||wb.dataset.wrm,i=W.cards.indexOf(id);if(i>=0)W.cards.splice(i,1);else W.cards.push(id);saveS();const inM=wb.closest('#modal');render();if(inM)openM(C[BYID[id]]);return}
 const of=e.target.closest(OSEL);if(of&&!(of.dataset.trc!=null&&e.target.closest('button,a,input,select,label'))){e.stopPropagation();ofrShow(of);return}if(!e.target.closest('#ofp'))ofrHide();
 const vm=e.target.closest('[data-vm]');if(vm){openVM(D.val.programs[vm.dataset.vm]);return}
 const vk=e.target.closest('[data-vk]');if(vk){const k=vk.dataset.vk;if(st.vsort==k)st.vdir=-(st.vdir||-1);else{st.vsort=k;st.vdir=-1}render();return}
 const pr=e.target.closest('[data-pre]');if(pr){e.preventDefault();const p=PRESETS().find(x=>x.id==pr.dataset.pre);if(curPre()==p.id){st.f={};st.sort=null}else Object.assign(st,presetState(p));$('#q').value='';go(hashOf());return}
 const fc=e.target.closest('[data-full-card]');if(fc){openM(C[fc.dataset.fullCard],1);$('#modal').scrollTop=0;return}
 
 {const wt=e.target.closest('[data-wtile]');if(wt&&!e.target.closest('[data-wrm]')){openM(C[+wt.dataset.wtile]);return}}const g=e.target.closest('[data-go]');if(g){e.preventDefault();closeM();go(g.getAttribute('href'));return}
 if(e.target.closest('[data-back]')){st.card=null;go(hashOf());return}
 if(e.target.closest('#modal'))return;
 const m=e.target.closest('[data-m]');if(m){e.stopPropagation();openM(C[m.dataset.m]);return}
 if(e.target.closest('#logo')){if(!CARDS_ONLY){snavSet($('#snav').hidden);return}goHome();return}
 {const im=e.target.closest('[data-im]');if(im){const KP=posGet();st.im=im.dataset.im;render();posSet(KP);return}}
 const t=e.target.closest('[data-s],[data-x],[data-k],tr[data-i]');if(!t)return;const KP=t.closest('#tabs')&&t.dataset.s?posGet():null;
 if(t.dataset.s){st.s=t.dataset.s;st.card=null;navR();if(st.pl=='info'&&USR.has(st.s))st.pl='cards'/* Contact / legal pages: a Profile item leaves the info view (else render0 resets st.s to contact) */}else if(t.dataset.x){const x=t.dataset.x;if(x=='__all'){st.f={};st.q='';$('#q').value=''}else if(x=='__f'){st.f={}}else if(x=='__sort'){st.sort=null;st.dir=-1}else if(x=='__q'){st.q='';$('#q').value=''}else delete st.f[x]}
 else if(t.dataset.k){const k=t.dataset.k;if(st.sort==k)st.dir=-st.dir;else{st.sort=k;st.dir=(k=='n'||k=='fee'||k=='apr'||k=='fx'||COL[k]?.[1]=='l')?1:-1}}
 else if(t.dataset.i){return;
  }
 render();if(KP)posSet(KP);else if(t.dataset.s&&!t.dataset.usec&&t.closest('#snav,#urail'))scrollTo(0,0)/* sidebar page links (not section sub-links) open at the top, including a second click on the page you are already on */});
const BYN={};C.forEach((c,i)=>{if(LIVE(c))BYN[c.n.toLowerCase()]=i});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.pkid!=null||t.dataset.pcust!=null){const P=PRF(),f=t.dataset.pkid!=null?'kids':'cust',v=t.dataset.pkid??t.dataset.pcust,a=new Set(P[f]||[]);t.checked?a.add(v):a.delete(v);P[f]=[...a];saveS();render();return}const k=e.target.dataset.prf;if(!k)return;const P=PRF();P[k]=e.target.type=='checkbox'?e.target.checked:Math.max(0,+e.target.value||0);saveS();render();const n=document.querySelector(`[data-prf=${k}]`);n&&n.focus()});
document.addEventListener('toggle',e=>{if(e.target.classList?.contains('mspend'))st.mspo=e.target.open},true);
document.addEventListener('input',e=>{const pk=e.target.dataset.pval;
 /* Andrew 2026-11-04: the value he moved is saved on every keystroke; the earn and the tile's figure are repainted in place, so the caret never jumps */
 if(pk){const p=PROMO.find(x=>x.k==pk);if(!p||!document.querySelector('#pw-promos'))return;const v=e.target.value===''?null:Math.max(0,+e.target.value||0),r=PREG()[pk];if(r){if(v==null)delete r.v;else r.v=v;saveS()}
  const eo=document.querySelector(`[data-pe="${CSS.escape(pk)}"]`),t=document.querySelector(`[data-pact="${CSS.escape(pk)}"] .bf`),h=pEarn(p,v);
  if(eo)eo.innerHTML=pEarnHTML(p,v);if(t)t.innerHTML=h!=null?`<b>${$$P(h)}</b>`:'<span class=mute>value —</span>';return}const bk=e.target.dataset.bsp;if(bk){if(!BSP.some(x=>x[0]==bk))return;BSPV()[bk]=Math.max(0,+e.target.value||0);saveS();return}const k=e.target.dataset.sp;if(k){W.spend[k]=Math.max(0,+e.target.value||0);saveS();if(st.s=='spending'||e.target.closest('#pw-spend .wsp')){const sg=e.target.closest('.sgrp');if(sg){const sub=[...sg.querySelectorAll('[data-sp]')].reduce((t,x)=>t+(+W.spend[x.dataset.sp]||0),0),o=sg.querySelector('legend .ssub');if(o)o.textContent=sub?'$'+sub.toLocaleString()+'/mo':''}return}/* Spending: no re-render while typing, so the caret and every keystroke stay */const f=document.activeElement?.dataset.sp,pos=e.target.selectionStart;(VIEWS[st.s]||renderCardsFolder)();const n=document.querySelector(`[data-sp="${f}"]`);n?.focus();return}
 const p=e.target.dataset.pick;if(p){const i=BYN[e.target.value.toLowerCase()];if(i!=null){pickCard(p,C[i].id)}}});
function pickCard(p,id){if(p=='wl'){if(!W.cards.includes(id))W.cards.push(id);saveS()}render();document.querySelector(`[data-pick="${p}"]`)?.focus()}
document.addEventListener('change',e=>{{const bt=e.target.dataset.btier;if(bt!=null){const L=STO.wallet.brokerage=(STO.wallet.brokerage||[]).filter(x=>x&&x.i!=bt);if(e.target.value)L.push({i:bt,tier:e.target.value});saveS();render();return}}const vfk=e.target.dataset.vf;if(vfk){st.vf={...(st.vf||{}),[vfk]:e.target.checked};render();return}const fm=e.target.dataset.fm;if(fm){const v=+e.target.value,a=new Set(st.f[fm]||[]);e.target.checked?a.add(v):a.delete(v);if(a.size)st.f[fm]=[...a].sort((x,y)=>x-y);else delete st.f[fm];const open=document.querySelector('details.ms[open]')?.querySelector('[data-fm]')?.dataset.fm;render();if(open)document.querySelector(`[data-fm="${open}"]`)?.closest('details').setAttribute('open','');return}
 const f=e.target.dataset.f;if(!f)return;if(e.target.value==='')delete st.f[f];else st.f[f]=+e.target.value;render()});
$('#q').value=st.q;$('#q').addEventListener('input',e=>{st.q=e.target.value;if(st.q&&st.pl=='home'){st.pl='cards';st.s='ov'}render()});
(()=>{const w=$('.wrap');let d=null,moved=false;
 w.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType=='touch'||e.target.closest('a,button,input,select,label,textarea,thead'))return;d={x:e.clientX,y:e.clientY,l:scrollX,id:e.pointerId};moved=false});
 w.addEventListener('pointermove',e=>{if(!d)return;const dx=e.clientX-d.x;
  if(!moved&&Math.abs(dx)>5&&Math.abs(dx)>Math.abs(e.clientY-d.y)){moved=true;w.classList.add('drag');w.setPointerCapture(d.id);getSelection().removeAllRanges()}
  if(moved){scrollTo(d.l-dx,scrollY);e.preventDefault()}});
 const up=()=>{if(!d)return;d=null;if(moved){w.classList.remove('drag');w.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault()},{capture:true,once:true});setTimeout(()=>moved=false,0)}};
 w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up)})();
// ---- Theme toggle (v3.3.1): default = OS setting; an explicit choice is saved in ptt.theme (localStorage UI pref) and STO.ui.theme ----
const curTheme=()=>document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
/* Profile menu (header): Wallet always first, Dark/Light always last; new profile items are added to PMENU and land between them */
const MI=(d,sz=16)=>`<svg viewBox="0 0 24 24" width=${sz} height=${sz} fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false>${d}</svg>`;/* Andrew 2026-11-04: sz lets the section menu draw the same outline set at 14px for a child row */
const MICO={profile:MI('<circle cx="12" cy="8" r="3.8"/><path d="M4.8 20c.8-3.9 3.9-5.9 7.2-5.9s6.4 2 7.2 5.9"/>'),login:MI('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4"/>',14),spending:MI('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M7.5 15.5v-3M12 15.5v-6M16.5 15.5v-4.5"/>'),wallet:MI('<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v2.5"/><rect x="4" y="7.5" width="16" height="11.5" rx="2.5"/><path d="M15.5 13.25h2"/>'),sun:MI('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),subscriptions:MI('<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2"/>'),pointcards:MI('<circle cx="12" cy="12" r="8"/><path d="M12 8l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z"/>'),moon:MI('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),saving:MI('<ellipse cx="12" cy="14" rx="7.5" ry="5.5"/><path d="M8 10.5c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5M16.5 11.5l2.2-1.2M9.5 8.2l.8-1.6"/>'),assets:MI('<path d="M4 19h16"/><path d="M6 19V9l6-4 6 4v10"/><path d="M10 19v-5h4v5"/>'),liabilities:MI('<path d="M12 3v18"/><path d="M5 8h14"/><path d="M7 8l5 11 5-11"/>'),investing:MI('<path d="M4 18h16"/><path d="M6 14l3.5-3.5 3 3L18 6"/><path d="M14.5 6H18v3.5"/>')};
const PMENU=[...(CARDS_ONLY?[['profile','Profile']]:[]),['wallet','Accounts'],['subscriptions','Subscriptions'],['pointcards','Loyalty'],['spending','Spending']];/* Andrew 2026-11-06: Profile children Accounts, Subscriptions, Loyalty | Spending, Saving | Assets, Liabilities (Saving/Assets/Liabilities are data-soon rows appended in #prsub). */
$('#pml').innerHTML=PMENU.map(([k,n])=>`<button type=button role=menuitem data-s=${k} tabindex=-1><span class=ti aria-hidden=true>${MICO[k]||''}</span><span class=tl>${n}</span></button>`).join('')+'<button type=button role=menuitem id=theme tabindex=-1><span class=ti aria-hidden=true></span><span class=tl></span></button>';
{const b=$('#pbtn'),l=$('#pml'),it=()=>[...l.querySelectorAll('[role=menuitem]')],shut=f=>{if(l.hidden)return;l.hidden=true;b.setAttribute('aria-expanded','false');if(f)b.focus()},open=()=>{l.hidden=false;b.setAttribute('aria-expanded','true');it()[0].focus()};
 b.addEventListener('click',()=>l.hidden?open():shut(true));
 l.addEventListener('click',e=>{if(e.target.closest('[role=menuitem]'))shut(false)});
 $('#pm').addEventListener('keydown',e=>{if(l.hidden)return;const a=it(),i=a.indexOf(document.activeElement);
  if(e.key=='Escape'){e.preventDefault();e.stopPropagation();shut(true)}else if(e.key=='ArrowDown'){e.preventDefault();a[(i+1)%a.length].focus()}else if(e.key=='ArrowUp'){e.preventDefault();a[(i-1+a.length)%a.length].focus()}else if(e.key=='Home'){e.preventDefault();a[0].focus()}else if(e.key=='End'){e.preventDefault();a[a.length-1].focus()}else if(e.key=='Tab')shut(false)},true);
 document.addEventListener('click',e=>{if(!e.target.closest('#pm'))shut(false)},true)}
/* PUSH 18 menu swap, superseded by PUSH 19 below: the logo mark now opens the site menu and a permanent profile icon opens the Profile drawer. Site menu (Home, Credit Cards, Banking soon, Brokers soon; Investments and Telecom hidden, parked 2026-10-30) in the Profile-dropdown style. The click/keyboard handlers are the existing ones: items keep their data-s / data-pl / data-soon attributes. */
if(CARDS_ONLY){const pf=document.createElement('nav');pf.id='pfl';pf.setAttribute('aria-label','Profile');[...$('#pml').children].forEach(b=>{b.removeAttribute('role');b.removeAttribute('tabindex');pf.append(b)});const sn=$('#snav'),pl=$('#pl');sn.setAttribute('aria-label','Profile');sn.append(pf);$('#pml').append(pl);$('#pml').setAttribute('aria-label','Site menu');/* Andrew 2026-11-04: Home leaves the site menu. bar() (bank.js) no longer renders its row in the cards-only shell, so there is nothing to hide here; the wordmark, the logo mark and the footer logo are the three ways home. */
 /* PUSH 20 (Andrew 2026-10-30: "The profile button should stay on the left side and the pertheterms logo on the right side. Same with their menus."): profile icon left, drawer from the left; logo mark right, site menu under it from the right; wordmark centred. PUSH 19 (Andrew 2026-10-30: "Our logo replaces the hamburger icon, and the profile icon becomes permanent... no confusion"): each icon does one thing, no hover morph. Left: the logo mark is the menu button (#pbtn) and opens the site menu (#pml) under it. Right: a permanent profile icon (#rtog) opens the Profile drawer (#snav, slides in from the right). */
 const pb=$('#pbtn'),PI=pb.innerHTML,rt=$('#rtog'),lm=rt&&rt.querySelector('.lmark');pb.innerHTML='';/* Andrew 2026-10-30: wordmark moves right, left of the logo; wordmark + logo are one menu button; Home via the menu */const lg0=$('#logo');if(lg0){const w=document.createElement('span');w.className='pbw logo';w.innerHTML=lg0.querySelector('span')?lg0.querySelector('span').innerHTML:'Per<b>The</b>Terms';pb.append(w);lg0.hidden=true;lg0.removeAttribute('tabindex')}if(lm)pb.append(lm);pb.setAttribute('aria-label','PerTheTerms menu');pb.title='Menu';$('header').append($('#pm'));
 if(rt){rt.innerHTML=PI;rt.setAttribute('aria-label','Profile');rt.title='Profile';rt.setAttribute('aria-controls','snav');rt.setAttribute('aria-haspopup','dialog');$('header').prepend(rt)}
 const roles=()=>pl.querySelectorAll('button:not([hidden])').forEach(b=>{b.setAttribute('role','menuitem');b.tabIndex=-1});roles();new MutationObserver(roles).observe(pl,{childList:true});
 addEventListener('click',e=>{if(e.target.closest('#pml #pl button')){$('#pml').hidden=true;pb.setAttribute('aria-expanded','false')}},true);
 /* Andrew 2026-11-03: picking a drawer item keeps the drawer open (page changes beside it); it closes only via the profile button, outside tap or Esc */
 /* Andrew 2026-10-30: no X in the drawer (redundant: Esc, outside tap and the profile icon close it); active item gets a vertical accent bar (.on) in both lists */
 $('#snav .snh')?.remove();
 /* PerYourTerms (Andrew 2026-10-30): wordmark with a red Your + sparkle icon; Andrew 2026-11-06: no special border/tint — sits above Products and the single Settings divider */
 if(PYT_LINK)pf.querySelector('#theme')?.insertAdjacentHTML('beforebegin','<button type=button class="pytb grp" aria-expanded=true aria-controls=pytsub><span class=ti aria-hidden=true><svg viewBox="0 0 24 24" width=16 height=16 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg></span><span class=tl><span class=pytw>Per<b>Your</b>Terms</span></span></button><div id=pytsub class=pytsub><button type=button class=pyts2 data-soon=purchasing><span class=ti aria-hidden=true><svg viewBox="0 0 24 24" width=16 height=16 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="7.5" width="16" height="11.5" rx="2.5"/><path d="M15 13.2h2"/></svg></span><span class=tl>My Wallet</span></button><button type=button class=pyts2 data-soon=promotions><span class=ti aria-hidden=true><svg viewBox="0 0 24 24" width=16 height=16 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false><path d="M3.5 12.5l8-8H19.5v8l-8 8z"/><circle cx="15.5" cy="8.5" r="1.4"/></svg></span><span class=tl>Promotions</span></button></div>');
 {/* Andrew 2026-11-06 drawer: Profile children Accounts, Subscriptions, Loyalty | Spending, Saving | Assets, Liabilities (subtle .pfsep lines); PerYourTerms | Products | Settings. Profile header navigates + toggles */const pr=pf.querySelector('[data-s=profile]');if(pr){pr.removeAttribute('data-s');pr.classList.add('grp','prg');pr.setAttribute('aria-expanded','true');pr.setAttribute('aria-controls','prsub');const w=document.createElement('div');w.id='prsub';w.className='pytsub';{const t=pr.querySelector('.tl');if(t)t.textContent='Profile'}
  const putUg=k=>{const b=pf.querySelector('[data-s='+k+']');if(!b)return;if(!USEC[k]){b.classList.add('pyts2');w.append(b);return}/* plain link when the page has no sections */
   b.removeAttribute('data-s');b.className='pyts2 grp';b.dataset.ug=k;b.setAttribute('aria-controls','usub-'+k);w.append(b);w.insertAdjacentHTML('beforeend','<div id=usub-'+k+' class="pytsub usub"></div>')};
  const sep=()=>w.insertAdjacentHTML('beforeend','<hr class=pfsep aria-hidden=true>');
  const soon=(k,lab,ico)=>w.insertAdjacentHTML('beforeend','<button type=button class=pyts2 data-soon='+k+'><span class=ti aria-hidden=true>'+ico+'</span><span class=tl>'+lab+'</span></button>');
  /* visible order (Andrew 2026-11-06): Accounts, Subscriptions, Loyalty || Spending, Saving || Assets, Liabilities */
  putUg('wallet');putUg('subscriptions');putUg('pointcards');sep();putUg('spending');soon('saving','Saving',MICO.saving);sep();w.insertAdjacentHTML('beforeend','<button type=button class="pyts2 grp" data-ug=assets aria-controls=usub-assets><span class=ti aria-hidden=true>'+MICO.assets+'</span><span class=tl>Assets</span></button><div id=usub-assets class="pytsub usub"></div>');soon('liabilities','Liabilities',MICO.liabilities);
  /* PerYourTerms: My Wallet, Promotions, Investments (coming soon, soon_invest; the holdings page moved to Profile › Assets, Andrew 2026-11-06). Dashboard remains off nav. */
  (pf.querySelector('#pytsub')||w).insertAdjacentHTML('beforeend','<button type=button class=pyts2 data-soon=invest><span class=ti aria-hidden=true>'+MICO.investing+'</span><span class=tl>Investments</span></button>');pr.after(w);(pf.querySelector('#pytsub')||w).insertAdjacentHTML('afterend','<button type=button class="conb grp" aria-expanded=true aria-controls=setsub><span class=ti aria-hidden=true><svg viewBox="0 0 24 24" width=16 height=16 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></span><span class=tl>Settings</span></button><div id=setsub class=pytsub><button type=button class=pyts2 data-soon=subscription><span class=ti aria-hidden=true><svg viewBox="0 0 24 24" width=16 height=16 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg></span><span class=tl>Plans</span></button><button type=button class=pyts2 data-soon=connections><span class=ti aria-hidden=true><svg viewBox="0 0 24 24" width=16 height=16 fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round focusable=false><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></span><span class=tl>Connections</span></button></div>')}}
 /* ONE EXPANSION AT A TIME (Andrew 2026-11-05, Docs/naming.md "Sidebar groups"): a group header goes to its page at the top (Accounts/Spending their page; Profile → Profile page; others their first row). Open follows the active page (pfGroups). Clicking the open active header collapses it (STO.ui.sgcol); click again to re-open. Profile collapses only when st.s==profile — not when a child page is active. */
 /* Profile (.prg): collapse/re-open ONLY when already on the Profile page. From any other page — including Profile children
    (Accounts, Spending, …) and Products / PerYourTerms / Settings / Contact — the header always navigates to Profile at the top
    and opens the group. (2026-11-06: treating children as "holds" made the toggle path swallow navigation; felt intermittent.)
    Other groups keep the prior rule: toggle when the active page is inside that group. */
 pf.addEventListener('click',e=>{const g=e.target.closest('button.grp');if(!g||g.classList.contains('secg'))return;/* .secg → document capture handler */e.stopPropagation();e.preventDefault();
  const k=g.getAttribute('aria-controls'),box=k&&document.getElementById(k),open=g.getAttribute('aria-expanded')=='true';
  const holds=g.classList.contains('prg')?st.s=='profile':!!(g.classList.contains('onp')||(box&&box.querySelector('[aria-current=page],.onp')));
  if(open&&holds){sgSetCol(k,true);markNav?markNav():(typeof pfGroups=='function'&&pfGroups());scrollTo(0,0);g.focus({preventScroll:true});return}/* collapse open active */
  if(!open&&holds){sgSetCol(k,false);markNav?markNav():0;scrollTo(0,0);g.focus({preventScroll:true});return}/* re-open collapsed active without leaving the page */
  sgSetCol(k,false);/* navigate into this group → open */
  if(g.classList.contains('prg')){st.s='profile';st.card=null;st.usec=null;if(st.pl=='info')st.pl='cards';navR();render()}
  else if(g.dataset.ug){st.s=g.dataset.ug;st.card=null;st.usec=null;if(st.pl=='info')st.pl='cards';navR();render()}else document.getElementById(g.getAttribute('aria-controls'))?.querySelector('button:not(.grp)')?.click();
  scrollTo(0,0);g.focus({preventScroll:true})},true);
 /* Andrew 2026-11-01: Light/Dark in Settings; auth-bottom: #authb under the list is Log in / Log out (sync.js); Welcome line is greeting only */
 {const th=pf.querySelector('#theme');if(th){th.classList.add('pyts2');(pf.querySelector('#setsub')||pf).append(th)}/* Andrew 2026-11-03: theme is a Settings sub-item, not a corner button */{let o0=null;try{o0=sessionStorage.getItem('ptt.snav')}catch(_){}if(o0=='1'){snavSet.keep=1;snavSet(true);snavSet.keep=0}}/* drawer open/closed persists across reloads in this tab *//* 2026-11-04: Log In / Log Out no longer closes the drawer: the sign-in dialog is modal (top layer) */}
 {if(!pf.querySelector('.snuh')){const wr=document.createElement('div');wr.className='snuh out';wr.innerHTML='<div class=sngwrap><div id=sngreet aria-live=polite>Welcome</div></div>';const pr=pf.querySelector('button.prg');(pr||pf.firstChild).before(wr)}snxPlace()}/* Andrew 2026-11-06 auth-bottom: snuh = Welcome or Hi, FirstName only (same style); Log in/out is bottom #authb. Profile group next. syPaint swaps the greeting — do not typeof-call it here (TDZ). */
 /* Andrew 2026-11-05: Products group (Credit Cards, Banking, Brokers, Investments). Andrew 2026-11-06: top-level order is Hi greeting, Profile, PerYourTerms, Products, one divider, Settings — Products sits below PerYourTerms. */
 {if(!pf.querySelector('#prodsub')){const ic=k=>(document.querySelector('#pl [data-pl='+k+'] svg')||{}).outerHTML||'';const kids=SNAV_DRILL?PLINES.filter(([k])=>['cards','bank','broker','invest'].includes(k)).map(([k,n])=>'<button type=button class=pyts2 data-ppl='+k+'><span class=ti aria-hidden=true>'+ic(k)+'</span><span class=tl>'+n+'</span></button>').join(''):'';
  const html='<button type=button class="prodb grp" aria-expanded=true aria-controls=prodsub><span class=ti aria-hidden=true>'+MI('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>')+'</span><span class=tl>Products</span></button><div id=prodsub class=pytsub>'+kids+'</div>';
  const anchor=pf.querySelector('#pytsub')||pf.querySelector('.pytb')||pf.querySelector('#prsub')||pf.querySelector('.snuh')||pf.querySelector('button.prg');
  if(anchor)anchor.insertAdjacentHTML('afterend',html);else pf.insertAdjacentHTML('afterbegin',html);
  pf.addEventListener('click',e=>{const b=e.target.closest('[data-ppl]');if(!b)return;e.stopPropagation();const t=document.querySelector('#pl [data-pl='+b.dataset.ppl+']');if(t)t.click()});
  if(!SNAV_DRILL)paintProdExpand()}
  /* enforce top-level order + single spacer before Settings (Andrew 2026-11-06) */
  {const sn=pf.querySelector('.snuh'),pg=pf.querySelector('button.prg'),pr=pf.querySelector('#prsub'),pd=pf.querySelector('.prodb'),ps=pf.querySelector('#prodsub'),yt=pf.querySelector('.pytb'),ys=pf.querySelector('#pytsub'),cb=pf.querySelector('.conb'),ss=pf.querySelector('#setsub');
   [sn,pg,pr,yt,ys,pd,ps,cb,ss].filter(Boolean).forEach(el=>pf.appendChild(el))/* Products below PerYourTerms (Andrew 2026-11-06) */}}
 const usub=()=>pf.querySelectorAll('[data-ug]').forEach(h=>{const pg=h.dataset.ug;if(pg=='assets'){try{USEC.assets.L=ivUse()}catch(e){}}const box=document.getElementById('usub-'+pg),H=USECL(pg).map(([id,n,ic])=>`<button type=button class="pyts2 usi" data-s=${pg} data-usec=${id}>${ASG(esc(n))}<span class=ti aria-hidden=true>${MI(CICO[ic],14)}</span><span class=tl>${esc(n)}</span></button>`).join('');
  h.classList.toggle('onp',st.s==pg);if(box.dataset.h!=H){box.innerHTML=H;box.dataset.h=H}});/* rebuilt only when the page's sections or their order change, so focus survives a render */
 usubNow=usub;
 pf.addEventListener('click',e=>{if(e.target.closest('[data-asg]'))return;const b=e.target.closest('[data-usec]');if(b){st.usec=b.dataset.usec;requestAnimationFrame(()=>usecGo(b.dataset.usec))}});/* the [data-s] handler opens the page; then the section. The grip does not navigate. */
 const pfGroups=()=>pf.querySelectorAll('button.grp').forEach(h=>{if(h.classList.contains('secg'))return;/* product section headers in #prodsub use secGOpen/paintProdExpand (Andrew 2026-11-06) */const box=document.getElementById(h.getAttribute('aria-controls'));if(!box)return;const ph=h.classList.contains('prg')&&(['profile','wallet','spending','subscriptions','pointcards'].includes(st.s)||st.s=='soon_saving'||st.s=='soon_invest'||st.s=='soon_liabilities');if(h.classList.contains('prg'))h.classList.toggle('onp',ph);const holds=ph||h.classList.contains('onp')||!!box.querySelector('[aria-current=page],.onp'),o=holds&&!sgIsCol(box.id);h.setAttribute('aria-expanded',String(o));box.hidden=!o});/* Profile holds itself + children; onp updated before holds */
 let markNav;markNav=()=>{usub();pf.querySelectorAll('button[data-s],button[data-soon]').forEach(b=>{if(b.closest('#prodsub'))return;/* product rows: paintProdExpand/secHTML owns .on (st.s vs secCur diverge for bank/perk/ins) */const on=b.dataset.usec?b.dataset.s==st.s&&b.dataset.usec==st.usec:b.dataset.s?b.dataset.s==st.s:st.pl=='info'&&st.s=='soon_'+b.dataset.soon;b.classList.toggle('on',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});pfGroups();if(!SNAV_DRILL)paintProdExpand()};const _rn=render;render=function(...a){const r=_rn.apply(this,a);markNav();return r};markNav()}
function paintTheme(){const t=curTheme(),b=$('#theme');if(!b)return;const nx=t=='dark'?'light':'dark';b.querySelector('.ti').innerHTML=t=='dark'?MICO.sun:MICO.moon;{const tl=b.querySelector('.tl');if(tl)tl.textContent=nx=='dark'?'Dark mode':'Light mode'}b.setAttribute('aria-label','Switch to '+nx+' theme');b.title='Switch to '+nx+' theme'}
$('#theme')?.addEventListener('click',()=>{const nx=curTheme()=='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',nx);STO.ui={...(STO.ui||{}),theme:nx};themeSet(nx);saveS();paintTheme()});
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
function leftOnTable(m='you'){const cs=custSet(m),en=new Set();try{(JSON.parse(storeGet('ptt.user_promo')||'[]')||[]).forEach(u=>{['promo_key','legacy_promo_key','promo_id'].forEach(k=>u&&u[k]&&en.add(u[k]))})}catch(e){}
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
/* sub-tab rows: shown or hidden by JS after every render from their nav's content (never a CSS :has() rule, which Safari can leave stale after a Home → Credit Cards transition) */
const navRows=()=>document.querySelectorAll('#nav3>.nrow').forEach(r=>{const n=r.querySelector('nav');r.hidden=!n||n.hidden||!n.children.length});
{const _r=render;render=function(){let out;try{out=_r.apply(this,arguments)}finally{navRows()}try{gate()}catch(e){}return out}}

/* 2026-10-30 (Andrew): the card-details popup opens only on an explicit click/tap or Enter/Space on the card name (.nmb is a <button>); the old hover-after-450ms opener is removed. Closes with the X, a click on the backdrop, or Esc. */


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
function pytPur(){try{return pytHTML('tables')}catch(e){console.error('My Wallet',e);return `<section class=psec id=pw-pyt data-err="${esc(String(e&&e.stack||e)).slice(0,300)}"><p class=mute>Couldn’t compute right now.</p></section>`}}
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
 return `<table class=vt data-addlt><tr><th class=l>Card</th><th>Additional cardholders</th><th>Extra cards</th><th>Annual cost</th><th class=l>Earn</th></tr>${cs.map(c=>{const n=ADDL(c.id),b=boostNote(c);return `<tr><td class=l>${esc(c.n)}</td><td><input type=number min=0 max=9 step=1 value="${n}" data-addl="${c.id}" aria-label="Additional cardholders on ${esc(c.n)}" style="width:5em"></td><td>${c.add==null?'—':c.add==0?'$0':'$'+c.add}</td><td>${effFee(c)==null?'—':'$'+effFee(c)}</td><td class=l>${b?`<span class=boost title="${esc(b)}" aria-label="${esc(b)}">↑ boosted</span>`:'—'}</td></tr>`}).join('')}</table>`}
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
 box.innerHTML=r.map((x,i)=>`<button type=button role=option class=wsr data-wpick=${i} ${wsHeld(x)?'disabled':''}><span class=wss>${esc(x.sec)}</span> ${esc(x.l)}${wsHeld(x)?' <small class=mute><span class=y>✓</span> in your wallet</small>':''}</button>`).join('')||(e.target.value.trim()?'<p class=mute>No match. Try fewer letters.</p>':'');box._r=r});
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
/* schema v33: services and their tiers (Database subscription_services / subscription_tiers); the service name on record names the tile */
const SUBSVC=D.subsvc||[],SVCBY=Object.fromEntries(SUBSVC.map(s=>[s.k,s]));
SUBSVC.forEach(a=>{const s=SUBS.find(s=>s.k==a.k);if(s)s.n=a.n;else SUBS.push({k:a.k,n:a.n,rows:[],cat:1})});
const subTiers=k=>(SVCBY[k]||{}).tiers||[],subTier=k=>{const w=(STO.wallet.subtiers||{})[k];return subTiers(k).find(t=>t.k==w)||svcTierDef(k)};
const subName=k=>(SUBS.find(s=>s.k==k)||{}).n||k,tierName=t=>{for(const s of SUBSVC){const x=s.tiers.find(x=>x.k==t);if(x)return x.n}return t||''};
function subPrice(k,t){t=t||subTier(k);if(t&&t.mo!=null)return{v:t.mo,tag:t.tag,src:t.src,t};const s=SUBS.find(s=>s.k==k),lp=s&&s.rows&&subsPrice(s);if(lp){const m=lp.p.match(/\$([\d.]+)\/(mo|yr)/);if(m)return{v:(+m[1])/(m[2]=='yr'?12:1),tag:lp.r.ev,src:lp.r.src}}return null}
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
 const live=(D.cmod||[]).filter(r=>r.effect=='grant_sub'&&ruleLive(r));for(let d=0;d<3;d++)live.forEach(r=>{if(inc[r.sub])return;if(r.from_sub){const f=r.from_sub,at=subHave(f)?(subTier(f)||{}).k:inc[f]?inc[f].tier:null;if((subHave(f)||inc[f])&&(!r.tiers||at in r.tiers))inc[r.sub]={via:[...(inc[f]?inc[f].via:[]),subName(f)+(at&&subTiers(f).length>1?' '+tierName(at):'')],rule:r,tier:r.tiers?r.tiers[at]||null:null}}else if(r.provider&&tel_held(r.provider))inc[r.sub]={via:[r.provider],rule:r}});return inc}
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
 <div class=subst role=group aria-label="${esc(x.n)}">${subTiers(x.k).length>1?`<button type=button class="chip tierb" data-subpick="${x.k}" aria-haspopup=dialog>${x.have?esc((subTier(x.k)||{}).n||'Tier'):'Tier'} ▾</button>`:''}${[['have','Have'],['would','Would use if discounted'],['no','Not interested']].map(([v,l])=>`<button type=button class="chip${x.st==v?' on':''}" data-subst="${x.k}" data-v=${v}>${l}</button>`).join('')}</div></div>`};
function renderSubscriptions(){const v=$('#view'),R=subRows(),tab=st.subt||'have',H=R.filter(x=>x.have||(x.inc&&x.st!='no'&&x.st!='would')).sort((a,b)=>(b.twice-a.twice)||(!!b.inc-!!a.inc)),U=R.filter(x=>!x.have&&!x.inc&&x.st!='no'&&(x.st=='would'||x.q.length)).sort((a,b)=>Math.max(0,...b.q.map(w=>w.net),...b.ways.map(w=>w.net))-Math.max(0,...a.q.map(w=>w.net),...a.ways.map(w=>w.net))||b.q.length-a.q.length);
 const paid=H.filter(x=>x.have&&x.p).reduce((t,x)=>t+x.p.v,0),net=H.filter(x=>x.have&&!x.twice&&x.p).reduce((t,x)=>t+x.p.v,0);
 v.innerHTML=`<div class="prof pstack"><div class=vhead><h2>Subscriptions</h2></div><p class=lead>Every subscription you have, paid or included with a card, plan or tier. What you pay, what you shouldn’t, and where to get the rest cheaper.</p>
 <p class=omute>Paying ${$$(paid)}/mo · net ${$$(net)}/mo after what’s already included · ${H.filter(x=>x.twice).length} paying twice · ${U.length} you could use</p>
 <div class=wsrch><input type=search data-ssearch placeholder="Find a subscription: ‘netflix’, ‘prime’, ‘dashpass’…" aria-label="Search subscriptions" autocomplete=off><div id=ssres></div></div>
 <div class=subtabs role=tablist><button role=tab class="${tab=='have'?'on':''}" aria-selected=${tab=='have'} data-subt=have>You have <span class=mute>${H.length}</span></button><button role=tab class="${tab=='could'?'on':''}" aria-selected=${tab=='could'} data-subt=could>You could use <span class=mute>${U.length}</span></button><button role=tab class="${tab=='tel'?'on':''}" aria-selected=${tab=='tel'} data-subt=tel>Telecom <span class=mute>${pwKeys('tel').length}</span></button></div>
 <section class="psec subpane" data-pane=${tab}>${tab=='tel'?pwSec(['tel','Your telecom plans']):tab=='have'?(H.length?`<div class="tiles stiles">${H.map(subTile).join('')}</div>`:'<p class=mute>Nothing yet. Search above and mark what you have.</p>'):(U.length?`<div class="tiles stiles">${U.map(subTile).join('')}</div>`:'<p class=mute>Nothing you qualify for yet. Mark subscriptions “Would use if discounted” to see where to get them free or cheaper.</p>')}</section>
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

/* cards-only release Wallet (Docs/naming.md build modes): your cards + Credit Cards spend tiles (credSpendTiles / W.spend), two result lines. Same store as the full Wallet (STO.wallet.cards / .spend).
   Line 1 = walletCalc().rows (best card per category among the cards you hold). Line 2 "leaving on the table" is derived from the same optimizer over live cards,
   ranked by net value on your spend (yearly rewards − DB annual fee when the card is not already held). First-year fee waiver / welcome bonus are notes only. */
const WSP=[['groc','Groceries'],['gas','Gas'],['dine','Dining'],['bills','Bills'],['other','Everything else']];
/* Banking spend (Andrew 2026-11-04; renamed from Monthly Bank Spend 2026-11-05): the bills paid from a bank account, not from a card, so they never touch a card's earn rate. Kept in wallet.bspend
   ({mortgage:2400}) and read by nothing else: this section is the record, not a pricing input. The five categories are fixed, so no remove x. */
const SPC=(D.spcat||{cats:[]}).cats,BSP=SPC.filter(c=>c.kind=='bank').map(c=>[c.k,c.n,c.g]),BSPDEF=new Set(SPC.filter(c=>c.kind=='bank'&&c.def).map(c=>c.k)),
 SPGRP=k=>(SPC.find(c=>c.kind=='card'&&c.k==k)||{}).g||(k.startsWith('st_')?'retail':'lifestyle')/* group of a card category: Database/datasets/spending-categories.json, else Lifestyle (Rewards split rule) */,
 BSPV=()=>((STO.wallet.bspend=STO.wallet.bspend||{})),BSPON=()=>BSP.filter(([k])=>BSPDEF.has(k)?!(STO.wallet.bspoff||[]).includes(k):(STO.wallet.bspx||[]).includes(k))/* B25: bank spend tiles removed with ✕ live in wallet.bspoff; + re-adds them */;
/* Market-best net of annual fee (Andrew 2026-11-05): rank by yearly rewards on the user's spend minus the DB annual_fee (c.fee). Cards already held skip the fee (already paid). Unknown fee → blank + flagged, never invented. First-year waiver / welcome bonus are hover notes only, not mixed into the ongoing net. */
const WGAP_METHOD='ESTIMATE: your monthly spend × earn rates on record. Market-best card ranked by yearly rewards on your spend minus its annual fee (fee skipped when you already hold it; unknown fee left blank). First-year fee waiver and welcome bonus are noted separately, not in the ongoing net. Category caps not on record are not counted.';
const pytHeldId=id=>W.cards.includes(id);
function pytCardNet(c,sp){const rew=pytRew([c],sp).rew,held=pytHeldId(c.id),raw=c.fee;/* c.fee = DB annual fee only; never invent */
 if(held)return{c,rew,held:1,fee:0,raw,net:rew,unk:false};
 if(raw==null)return{c,rew,held:0,fee:null,raw:null,net:null,unk:true};
 return{c,rew,held:0,fee:+raw,raw:+raw,net:rew-+raw,unk:false}}
function pytMktTip(c,N){const bits=[];
 if(!N||N.held)bits.push('Already in your wallet (annual fee not counted again)');
 else if(N.unk)bits.push('Annual fee not on record');
 else if(N.fee>0)bits.push('Ongoing net of $'+Number(N.fee).toLocaleString()+'/yr annual fee');
 else bits.push('No annual fee');
 if(c.fy3==='Waived')bits.push('First-year fee waived'+(c.pro&&c.pro.fyfm?': '+c.pro.fyfm:'')+(c.fee!=null?' (not in ongoing net)':''));
 if(c.ofv&&c.ofv[0]!=null)bits.push('Welcome bonus ≈$'+Number(c.ofv[0]).toLocaleString()+' (not in ongoing net)'+(c.ofv[1]?'; '+c.ofv[1]:''));
 else if(c.offer)bits.push('Welcome offer on record (not in ongoing net)');
 return bits.join(' · ')}
/* Market routing twin of pytRew: same caps/rates, but candidates ranked by pytCardNet (rewards − fee) so a high-fee card only wins when it really nets more; rate is the tie-break. Unknown-fee unheld cards sort last. */
function pytRewMkt(sp=W.spend,netSp){sp=spNet(sp);netSp=spNet(netSp||sp);const live=C.filter(LIVE),cache=new Map(),net=c=>{if(!cache.has(c.id))cache.set(c.id,pytCardNet(c,netSp));return cache.get(c.id)};
 const rows=[];let rew=0,tot=0;
 for(const k of WCATS){const m=+sp[k]||0;if(!m)continue;let left=m*12;tot+=left;const cand=pytCands(live,k);
  cand.sort((a,b)=>{const na=net(a.c),nb=net(b.c);if(na.unk!==nb.unk)return na.unk?1:-1;if(!na.unk&&!nb.unk&&nb.net!==na.net)return nb.net-na.net;return b.r-a.r||String(a.c.n).localeCompare(String(b.c.n))});
  const use=[];for(const x of cand){if(left<=0)break;const amt=Math.min(left,x.cap);if(amt<=0)continue;use.push({...x,amt,N:net(x.c)});left-=amt}
  const r=use.reduce((s,x)=>s+x.amt*Math.max(x.r,0)/100,0);rew+=r;rows.push({k,m,use,r})}
 return{rows,rew,sp:tot,net}}
function walletGap(R){const all=pytRewMkt({...W.spend},{...W.spend});let tot=0;const gross={},rows0=all.rows.map(a=>{const m=R.rows.find(r=>r.k==a.k),g=Math.max(0,a.r-(m?m.r:0)),u=a.use[0],N=u&&u.N;if(g>0&&u&&N&&!N.held&&!N.unk)gross[u.c.id]=(gross[u.c.id]||0)+g;return{k:a.k,best:a,mine:m,g,u,N}});
 const feePaid={};rows0.forEach(x=>{if(!(x.g>0)||!x.u||!x.N||x.N.held)return;if(x.N.unk){x.g=null;return}const id=x.u.c.id,G=gross[id]||0,f=x.N.fee||0,share=G>0?f*x.g/G:0;x.g=Math.max(0,x.g-share);if(!feePaid[id])feePaid[id]=1});
 rows0.forEach(x=>{if(x.g!=null)tot+=x.g});return{rows:rows0,tot}}
const INSTKEY=n=>String(n||'').toLowerCase().replace(/\b(royal bank|bank of canada|bank|financial|credit union|savings|canada|cards|rewards|inc|ltd)\b/g,'').replace(/[^a-z0-9]/g,'');
function instsHeld(){const M=new Map(),U=(n,lk,kind)=>{const k=INSTKEY(n)||n;const e=M.get(k)||{key:k,n,lk:null,c:{card:0,bank:0,brk:0}};if(!e.lk&&LOGOS[lk])e.lk=lk,e.n=n;else if(!e.lk&&LOGOS[n])e.lk=n,e.n=n;e.c[kind]++;M.set(k,e)};
 W.cards.map(i=>C[BYID0[i]]).filter(Boolean).forEach(c=>U(c.i,c.i,'card'));
 (STO.wallet.banks||[]).map(x=>(D.bank?.accounts||[]).find(a=>a.id==x.id)).filter(Boolean).forEach(o=>U(o.i,o.i,'bank'));
 (STO.wallet.brokerage||[]).filter(x=>x&&x.i).forEach(x=>{const bi=String(x.i).split(' · ')[0],b=(D.bacct||[]).find(q=>q.i==(x.broker||bi))||{i:x.broker||bi};U(b.i,b.issuer?BRLK(b):b.i,'brk')});
 const pl=(n,a,b)=>n+' '+(n==1?a:b);
 return [...M.values()].map(e=>({...e,lk:e.lk||e.n,parts:[e.c.card&&pl(e.c.card,'card','cards'),e.c.bank&&pl(e.c.bank,'bank account','bank accounts'),e.c.brk&&pl(e.c.brk,'broker account','broker accounts')].filter(Boolean)})).sort((a,b)=>a.n.localeCompare(b.n))}
/* Your result (Andrew 2026-10-30): moved from Accounts to the PerYourTerms page */
/* PerYourTerms (Andrew 2026-10-30: "a rewards routing maximizer and an insurance coverage maximizer. Done as two tables"). Both read only sourced fields already on each card record. */
const pytLim=(c,k)=>{const r=(c.insr||{})[k],v=r?r[1]:null;return typeof v=='number'?v:null},pytLimT=(c,k)=>{const r=(c.insr||{})[k],v=r?r[1]:null;return v==null?'Included, limit not stated':typeof v=='number'?'$'+(v>=1e6?v/1e6+'M':v.toLocaleString()):String(v)};
function pytInsBest(cs,k){const h=cs.filter(c=>insV(c,k)===1);h.sort((a,b)=>(pytLim(b,k)??-1)-(pytLim(a,k)??-1)||((effFee(a)??1e9)-(effFee(b)??1e9))||String(a.n).localeCompare(b.n));return h[0]||null}
/* My Wallet › Bank accounts (Andrew 2026-11-05; rate fix 2026-11-05): interest twin of the Rewards maximizer (.pytt).
   Rows = Kubera items linked to bank tiles (wallet.kmap). Balance in the item's own currency.
   Your rate = held product's CURRENT posted rate from Banking: fixed → base; bal → the tier at this balance; dd → base
   (without the DD condition); ws_tier → resolved Wealthsimple tier (wallet.tiers / brokerage tier / Kubera-inferred assets /
   else Core base), DD boost only when Profile dd is set; plan unknown without a plan. Hover explains the tier source.
   Best on the market = BEST IN CLASS by segment, like the card maximizer, posted non-promo unconditional rates only
   (ws_tier/plan excluded from the market best — your own tiered product can still beat it and then gap = $0 / Best):
     CAD chequing → best current CAD chequing (same seg); CAD savings/HISA → best savings|hisa (same seg);
     CAD youth → youth compared to best youth of the same kind; USD chequing → best usdty=chequing;
     USD savings → best usdty=savings. Promo rates shown flagged, never counted.
   Gap $/yr = max(0, balance × (best − yours)) in CAD at Kubera FX; already-best → $0 + Best mark. No evidence badges (hover only). */
function bkWsTier(){const U=(STO.wallet.tiers||{}),t0=U.Wealthsimple||((STO.wallet.brokerage||[]).find(x=>x&&x.tier&&/wealthsimple/i.test(String(x.i||'')+' '+(x.broker||'')))||{}).tier||BTIER('Wealthsimple');
 if(t0)return{t:t0,how:'your Wealthsimple '+t0+' tier'};
 let cad=0;try{if(typeof kubOn=='function'&&kubOn())for(const it of(KUB.d&&KUB.d.items)||[]){const n=((it.name||'')+' '+(it.institution||'')+' '+(it.connection||'')).toLowerCase();if(/wealthsimple|\bws\b/.test(n)&&it.kind!='debt'){const v=typeof kubCad=='function'?kubCad(it):null;if(v!=null)cad+=Math.max(0,+v||0)}}}catch(e){}
 if(cad>=500000)return{t:'Generation',how:'inferred Generation from linked Wealthsimple assets (≥$500k; set your tier in Profile to confirm)'};
 if(cad>=100000)return{t:'Premium',how:'inferred Premium from linked Wealthsimple assets (≥$100k; set your tier in Profile to confirm)'};
 if(cad>0)return{t:'Core',how:'inferred Core from linked Wealthsimple assets under $100k (set your tier in Profile to confirm)'};
 return{t:'Core',how:'assuming Core (set your Wealthsimple tier in Profile)'}}
function bkRateInfo(o,bal){const r=o&&o.rate;if(!r)return{rate:null,how:null};if(r.by=='fixed')return{rate:r.base??null,how:r.note||'as published'};
 if(r.by=='dd')return{rate:r.base??null,how:'base rate (direct-deposit boost not counted unless set in Profile)'};
 if(r.by=='bal'){const b=(r.bands||[]).filter(x=>(bal||0)>=x[0]).pop();return{rate:b?b[1]:null,how:b?'tier at this balance':'no tier for this balance'}}
 if(r.by=='ws_tier'){const {t,how}=bkWsTier(),base=r.tiers?r.tiers[t]:null;if(base==null)return{rate:null,how:how};const boost=(PRF().dd&&r.dd&&r.dd[t])?r.dd[t]:0;return{rate:base+boost,how:how+(boost?' + direct-deposit boost':'')+(r.note?'; '+r.note:'')}}
 return{rate:null,how:'plan not in your profile'}}
function bkRateOf(o,bal){return bkRateInfo(o,bal).rate}
function bkTag(o){return (o&&o.rate&&o.rate.tag)||(o&&o.tag)||null}
function bkKind(o){if(!o)return null;if(o.ty=='usd')return o.usdty=='chequing'?'usd_chequing':'usd_savings';if(o.ty=='chequing')return'chequing';if(o.ty=='savings'||o.ty=='hisa')return'savings';return null}
function bkKindMatch(o,kind){if(!kind)return false;if(kind=='savings')return o.ty=='savings'||o.ty=='hisa';if(kind=='chequing')return o.ty=='chequing';if(kind=='usd_chequing')return o.ty=='usd'&&o.usdty=='chequing';if(kind=='usd_savings')return o.ty=='usd'&&(o.usdty=='savings'||!o.usdty);return false}
function bkBest(cur,seg,bal,kind){const K=kind||((cur=='USD')?'usd_savings':'savings');
 const scan=sg=>{let best=null;for(const o of (D.bank&&D.bank.accounts)||[]){if(o.st!='current'||(o.cur||'CAD')!=cur||(o.seg||'personal')!=sg||!bkKindMatch(o,K))continue;
  if(!o.rate||o.rate.by=='ws_tier'||o.rate.by=='plan')continue;const r=bkRateOf(o,bal);if(r!=null&&(!best||r>best.r))best={o,r}}return best};
 const b=scan(seg||'personal');return b||((seg&&seg!='personal')?scan('personal'):null)}
function bkPromo(o){const t=new Date().toISOString().slice(0,10);return ((o&&o.pr)||[]).find(p=>!p.d||p.d>=t)||null}
function pytBankRows(){const out=[];let on=false;try{on=typeof kubOn=='function'&&kubOn()}catch(e){}
 const W0=STO.wallet.banks||[];if(!W0.length)return out;const T=typeof kubTiles=='function'?kubTiles():[],by=on?kubMap(KUB.d.items||[],T,STO.wallet.kmap).by:{};
 for(const x of W0){if(!x||!x.id)continue;const k=typeof IKEY=='function'?IKEY('banks',x):(x.k||x.id),o=((D.bank&&D.bank.accounts)||[]).find(a=>a.id==x.id),its=(by[k]||[]).filter(it=>it.kind!='debt');
  if(!its.length){out.push({o,x,it:null,bal:0,cur:(o&&o.cur)||'CAD',fx:1});continue}
  for(const it of its){const cur=String(it.currency||'CAD').toUpperCase(),bal=+it.value||0,cad=kubCad(it);out.push({o,x,it,bal,cur,fx:bal&&cad!=null?cad/bal:(cur=='CAD'?1:null)})}}
 return out.map(r=>{const seg=(r.o&&r.o.seg)||'personal',kind=bkKind(r.o)||(r.cur=='USD'?'usd_savings':'savings'),info=r.o&&(r.o.cur||'CAD')==r.cur?bkRateInfo(r.o,r.bal):{rate:null,how:null},mine=info.rate,mis=r.o&&(r.o.cur||'CAD')!=r.cur,b=bkBest(r.cur,seg,r.bal,kind),
  isBest=mine!=null&&b&&mine>=b.r,gap=mine!=null&&b&&r.fx!=null?Math.max(0,r.bal*(b.r-mine)/100*r.fx):null;return{...r,mine,mis,b,gap,isBest,how:info.how,kind,chq:r.o&&(r.o.ty=='chequing'||r.o.usdty=='chequing')}})}
function pytBankHTML(){const R=pytBankRows(),pc=x=>(+x).toFixed(2).replace(/\.?0+$/,'')+'%',mny=(v,c)=>new Intl.NumberFormat('en-CA',{style:'currency',currency:c||'CAD',maximumFractionDigits:0}).format(v),M='<span class=mute>—</span>';
 const ask=!(STO.wallet.banks||[]).length?'<p class="mute pytask">Add your bank accounts in <button type=button class=lnk data-s=wallet>Accounts</button> and link them to Kubera to see balances.</p>':'';
 let tot=0,top=null,chq=0;const pro=[];
 const rows=R.map(r=>{if(r.gap!=null){tot+=r.gap;if(!top||r.gap>top.gap)top=r}const p=r.b&&bkPromo(r.b.o),tg=[bkTag(r.o),r.how].filter(Boolean).join(' · ');
  const nm=esc(r.o?r.o.n:r.x.id),ht=esc((r.it?'Kubera: '+(r.it.name||''):'Not linked to Kubera')+(r.chq?' · Chequing: gap vs the best posted chequing rate in this segment':'')),bt=r.b?r.b.o.n+' · '+pc(r.b.r):'';if(p)pro.push(r.b.o.n+': '+String(p.t).split(/[;.]/)[0]+(p.d?' · ends '+p.d:''));if(r.chq)chq=1;
  return `<tr data-bk="${esc(r.x.id)}"><th scope=row title="${ht}"><span class=bkc>${nm}${r.chq?'<span class=mute>*</span>':''}</span></th>
   <td class=num data-l="Balance"><span class=bkc>${mny(r.bal,r.cur)}${r.cur!='CAD'?' <small class=mute>'+r.cur+'</small>':''}</span></td>
   <td class=num data-l="Your rate"><span class=bkc>${r.mis?`<span class=mute title="This account is in ${esc(r.o.cur||'CAD')}; the Kubera balance is in ${esc(r.cur)}">mismatch</span>`:r.mine!=null?`<span title="${esc(tg||'')}">${pc(r.mine)}</span>`:M}</span></td>
   <td data-l="Best on the market" title="${esc(bt+(r.b&&bkTag(r.b.o)?' ('+bkTag(r.b.o)+')':''))}${p?' · promo not counted':''}${r.isBest?' · you are at or above this rate':''}"><span class=bkc>${r.b?esc(bt):M}${r.isBest?' <span class=mute>Best</span>':''}${p?' <span class=mute>†</span>':''}</span></td>
   <td class=num data-l="Gap $/yr"><span class=bkc>${r.gap!=null?(r.gap>=1?'<b>'+$$(r.gap)+'</b>':'$0'):M}</span></td></tr>`}).join('');
 const ft=R.length?`<tfoot><tr class=pyttot><th scope=row><span class=bkc>Total</span></th><td colspan=2 class="mute pytbig"${top&&top.gap>=1?` title="${esc(top.o.n+': '+top.b.o.n+' pays '+pc(top.b.r)+'; yours pays '+pc(top.mine))}"`:''}><span class=bkc>${top&&top.gap>=1?'Biggest gap: '+esc(top.o.n):'Already at the best posted rate'}</span></td><td class=pytlot>Leaving on the table</td><td class=num data-l="Leaving on the table"><b class=wgap id=bkgap title="Balance × (best posted rate − your posted rate), never negative; unknown rates left out, promos not counted">${$$(tot)}/yr</b> <small class=mute id=bkgapm>${$$(tot/12)}/mo</small></td></tr></tfoot>`:'';
 return `<section class="psec pytsec" id=pyt-bank aria-labelledby=pyt-bh><h3 id=pyt-bh>Bank accounts</h3>${ask}<p class=mute>Interest your linked balances could earn at the best posted rate on record in the same currency and segment (chequing, savings/HISA, youth, USD chequing, USD savings). Promotional rates are shown, never counted.</p><div class=pytwrap><table class=pytt><thead><tr><th scope=col>Account</th><th scope=col class=num>Balance</th><th scope=col class=num>Your rate</th><th scope=col>Best on the market</th><th scope=col class=num>Gap $/yr</th></tr></thead><tbody>${rows}</tbody>${ft}</table></div>${chq||pro.length?`<p class="mute bkfn">${chq?'<span>* Chequing: compared to the best posted chequing rate in this segment.</span>':''}${pro.map(t=>`<span class=pytpro>† Promo, not counted: ${esc(t)}</span>`).join('')}</p>`:''}</section>`}
function pytHTML(only){const cs=W.cards.map(i=>C[BYID0[i]]).filter(Boolean),pc=x=>(+x).toFixed(2).replace(/\.?0+$/,'')+'%',N=k=>spN(k);
 /* One source of truth: Credit Cards spend tiles (Spending › #pw-spend), same order / removals / adds / amounts. $0 tiles omitted (cleaner than dimming). */
 const tiles=credSpendTiles().filter(t=>t.amt>0),cats=tiles.map(t=>t.k),has=cats.length>0;
 const sp={...W.spend};
 const M=pytRew(cs,sp),A=pytRewMkt(sp,sp),row=(O,k)=>O.rows.find(r=>r.k==k);
 const ask=!cs.length?'<p class="mute pytask">Add your cards in <button type=button class=lnk data-s=wallet>Accounts</button> and your monthly spend in <button type=button class=lnk data-s=spending>Spending</button> to fill these tables.</p>':!has?'<p class="mute pytask">Enter your monthly spend in <button type=button class=lnk data-s=spending>Spending</button> to see dollars per year.</p>':'';
 /* Pass 1: gross gap per category; Pass 2: subtract each unheld market card's annual fee once, shared across the categories it wins (held = fee 0; unknown fee → blank gap). */
 const raw=cats.map(k=>{const m=row(M,k),a=row(A,k),on=true,mu=m&&m.use[0],au=a&&a.use[0],NN=au&&(au.N||A.net(au.c)),e=m?m.r:null,gross=a?Math.max(0,a.r-(m?m.r:0)):null;return{k,m,a,on,mu,au,N:NN,e,gross}});
 const Gby={};raw.forEach(x=>{if(x.on&&x.gross>0&&x.au&&x.N&&!x.N.held&&!x.N.unk)Gby[x.au.c.id]=(Gby[x.au.c.id]||0)+x.gross});
 let te=0,tg=0,top=null;
 const rr=raw.map(x=>{const{k,on,mu,au,N:NN,e,gross}=x;let g=null,gGross=gross;
  if(e!=null)te+=e;
  if(gross!=null){if(au&&NN&&!NN.held&&NN.unk)g=null;else if(au&&NN&&!NN.held&&!NN.unk){const G=Gby[au.c.id]||0,share=G>0?(NN.fee||0)*gross/G:0;g=Math.max(0,gross-share)}else g=gross;
   if(g!=null){tg+=g;if(!top||g>top.g)top={k,g,gGross,au,mu,N:NN}}}
  const baseMine=mu?spBaseNote(mu.c,k):'',baseMkt=au?spBaseNote(au.c,k):'',tip=[au?pytMktTip(au.c,NN):'',baseMkt].filter(Boolean).join(' · '),gapTit=g==null&&au&&NN&&NN.unk?'Annual fee not on record':(gGross!=null&&g!=null&&gGross-g>0.5?`Gross +$${Math.round(gGross)}/yr before fee; ongoing net after annual fee`:WGAP_METHOD);
  return `<tr data-k="${k}"><th scope=row>${esc(N(k))}</th><td data-l="Your best card"${baseMine?` title="${esc(baseMine)}"`:''}>${mu?esc(mu.c.n):'<span class=mute>—</span>'}</td><td class=num data-l="Earn rate"${baseMine?` title="${esc(baseMine)}"`:''}>${mu?pc(mu.r):'—'}</td><td class=num data-l="Monthly spend">${$$(+W.spend[k]||0)}</td><td class=num data-l="Earned $/yr">${e!=null?$$(e):'<span class=mute>—</span>'}</td><td data-l="Best on the market" title="${esc(tip)}">${au?esc(au.c.n)+' <span class=mute>'+pc(au.r)+'</span>':'—'}</td><td class=num data-l="Gap $/yr" title="${esc(gapTit)}">${g!=null?(g>=1?'<b>'+$$(g)+'</b>':'$0'):'<span class=mute>—</span>'}</td></tr>`}).join('');
 const tot=cs.length&&has?`<tfoot><tr class=pyttot><th scope=row>Total</th><td colspan=3 class="mute pytbig">${top&&top.g>=1?'Biggest gap: '+esc(N(top.k))+'. '+esc(top.au.c.n)+' earns '+pc(top.au.r)+' there; your best earns '+(top.mu?pc(top.mu.r):'0%')+(top.N&&!top.N.held&&top.N.fee>0?' (gap net of $'+Number(top.N.fee).toLocaleString()+'/yr fee)':'')+'.':'Your wallet already holds the best net value on record for what you entered.'}</td><td class=num data-l="Earned $/yr"><b>${$$(te)}</b></td><td class=pytlot>Leaving on the table</td><td class=num data-l="Leaving on the table"><b class=wgap title="${esc(WGAP_METHOD)}">${$$(tg)}/yr</b></td></tr></tfoot>`:'';
 const t1=`<section class="psec pytsec" id=pyt-rew aria-labelledby=pyt-rh><h3 id=pyt-rh>Rewards routing maximizer</h3>${ask}<p class=mute>Which card to use for each spending category, from the earn rates on record. Market best is ranked by yearly rewards on your spend minus the annual fee.</p><div class=pytwrap><table class=pytt><thead><tr><th scope=col>Category</th><th scope=col>Your best card</th><th scope=col class=num>Earn rate</th><th scope=col class=num>Monthly spend</th><th scope=col class=num>Earned $/yr</th><th scope=col>Best on the market</th><th scope=col class=num>Gap $/yr</th></tr></thead><tbody>${rr}</tbody>${tot}</table></div></section>`;
 const LV=C.filter(LIVE),ir=INS.map(([k,l])=>{const b=pytInsBest(cs,k),a=pytInsBest(LV,k);
  return `<tr data-cov="${k}"><th scope=row>${esc(l)}</th><td data-l="Your best card">${b?esc(b.n):'<span class=n>✗</span> <span class=pytnc>Not covered</span>'}</td><td data-l="Limit / terms">${b?esc(pytLimT(b,k)):'<span class=mute>—</span>'}</td><td data-l="Best on the market">${a?esc(a.n):'—'}</td><td data-l="Market limit / terms">${a?esc(pytLimT(a,k)):'—'}</td></tr>`}).join('');
 const t2=`<section class="psec pytsec" id=pyt-ins aria-labelledby=pyt-ih><h3 id=pyt-ih>Insurance coverage maximizer</h3>${cs.length?'':'<p class="mute pytask">None yet. Add a card in <button type=button class=lnk data-s=wallet>Accounts</button> to see what it covers.</p>'}<p class=mute>The card in your wallet with the highest stated limit for each coverage, from each card's insurance terms (CITED).</p><div class=pytwrap><table class=pytt><thead><tr><th scope=col>Coverage</th><th scope=col>Your best card</th><th scope=col>Limit / terms</th><th scope=col>Best on the market</th><th scope=col>Limit / terms</th></tr></thead><tbody>${ir}</tbody></table></div></section>`;
 const cv=cs.filter(c=>FEECOV(c.id)),nx=cs.filter(c=>ADDL(c.id)&&c.add==null),csn=cv.length||nx.length?`<p class="mute pytcs" id=pyt-cset>From your card settings in <button type=button class=lnk data-s=wallet>Accounts</button>: ${cv.length?'fee covered, not counted as a cost: '+cv.map(c=>esc(c.n)+' ('+esc(FCL[FEECOV(c.id)]||'Other')+')').join(', ')+' <span class=t>ESTIMATE</span>':''}${cv.length&&nx.length?'. ':''}${nx.length?'extra-card fee not on record, so additional cards add $0: '+nx.map(c=>esc(c.n)).join(', '):''}.</p>`:'';
 const t3=pytBankHTML();
 return only=='tables'?`<div class=pytpage id=pw-result>${t1}${t3}${t2}</div>`:`<div class=pytpage id=pw-result>${csn}${t1}${t3}${t2}</div>`}/* Andrew 2026-11-04: My Wallet (was Shopping) shows the same two tables without the card-settings note */
function renderWalletSimple(){const R=walletCalc(),cs=R.cs;
 const tiles=pwTiles('cards',1).join(''),rmA=(k,key,n)=>`data-wrm=${k} data-wk="${esc(key)}" aria-label="Remove ${esc(n)}"`;
 const bk=ORD('banks',STO.wallet.banks||[],x=>IKEY('banks',x)).map(x=>[x,(D.bank?.accounts||[]).find(a=>a.id==x.id)]).filter(p=>p[1]).map(([x,o])=>atile({kind:'bank',kub:kubTile(IKEY('banks',x)),inst:o.i,lk:o.i,name:o.n,nick:x.nick,mark:x.own=='joint'?'Joint':'Solo',foot:(BATY.find(b=>b[0]==o.ty)||[0,''])[1]/* B12 (Andrew 2026-11-01): leaner bank tile like the broker tile: type only (fee lives in the details card), linked Kubera balance in place of the band */,attrs:`data-ok="${esc(IKEY('banks',x))}" data-hold=banks data-ied="banks|${esc(IKEY('banks',x))}" aria-haspopup=dialog aria-label="${esc(o.n)}${x.nick?' ('+esc(x.nick)+')':''} settings"`,rm:rmA('banks',IKEY('banks',x),o.n)}));
 const br=ORD('brokerage',(STO.wallet.brokerage||[]).filter(x=>x&&x.i),x=>IKEY('brokerage',x)).map(x=>{const[bi,t0]=String(x.i).split(' · '),b=(D.bacct||[]).find(q=>q.i==(x.broker||bi))||{i:x.broker||bi},t=x.acct||t0||'',a=(b.accts||[]).find(q=>q.t==t);return atile({kind:'brk',kub:kubTile(IKEY('brokerage',x)),inst:b.i,lk:b.issuer?BRLK(b):b.i,name:t?BRTL(t):'Account',nick:x.nick,mark:x.own=='joint'?'Joint':'Solo',foot:a?(a.reg?'Registered':'Non-registered'):(x.tier?x.tier+' tier':'Self-directed'),attrs:`data-ok="${esc(IKEY('brokerage',x))}" data-hold=brokerage data-ied="brokerage|${esc(IKEY('brokerage',x))}" aria-haspopup=dialog aria-label="${esc(t?BRTL(t):'Account')}${x.nick?' ('+esc(x.nick)+')':''} settings"`,rm:rmA('brokerage',IKEY('brokerage',x),x.i)})});
 $('#view').innerHTML=`<div class="prof pstack wsimple">${kpiAHTML()}<div class=vhead><h2>Accounts <button type=button class=wplus data-wiz aria-haspopup=dialog aria-label="Add cards or accounts" title="Add cards or accounts"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button></h2></div><p class=lead>The cards and accounts you hold. Tap <b>+</b> to add some; drag a tile (or press and hold on a phone) to move it. Your monthly spend lives in <button type=button class=lnk data-s=spending>Spending</button>. Loyalty programs live on <button type=button class=lnk data-s=pointcards>Loyalty</button>. It all stays on this device.</p>${upPromptHTML('accounts')}
 ${SECORD([
`<section class="psec acs${ACO('cards')?' acol':''}" id=pw-cards data-aws=cards>${ACH('cards','pw-cards',USN('pw-cards'),cs.length,1,'cards')}<div class="tiles ptiles" id=pw-cards-t${ACO('cards')?' hidden':''}>${tiles||'<p class=mute>None yet. Tap <b>+</b> next to Accounts to add your cards.</p>'}</div></section>`,
`<section class="psec acs${ACO('banks')?' acol':''}" id=pw-banks data-aws=banks>${ACH('banks','pw-banks',USN('pw-banks'),bk.length,1,'banks')}<div class="tiles ptiles" id=pw-banks-t${ACO('banks')?' hidden':''}>${bk.join('')||'<p class=mute>None yet. Tap <b>+</b> and pick Banking.</p>'}</div></section>`,
`<section class="psec acs${ACO('brokerage')?' acol':''}" id=pw-brokers data-aws=brokerage>${ACH('brokerage','pw-brokers',USN('pw-brokers'),br.length,1,'brokers')}<div class="tiles ptiles" id=pw-brokers-t${ACO('brokerage')?' hidden':''}>${br.join('')||'<p class=mute>None yet. Tap <b>+</b> and pick Brokers.</p>'}</div></section>`
])}
 ${PYT_LINK?`<p class=mute id=pw-pytlink>Your best card per category and what you leave on the table: <button type=button class=lnk data-soon=pyt><span class=pytw>Per<b>Your</b>Terms</span></button>.</p>`:''}</div>`}
/* Accounts picker (Andrew 2026-10-29): institution tiles, the same tile UI as Subscriptions. Tap an institution to open its cards on record, tap a card to add or remove it (W.cards). */
function instPickHTML(){const L=C.filter(LIVE),G={};L.forEach(c=>(G[c.i]=G[c.i]||[]).push(c));const I=Object.keys(G).sort((x,y)=>x.localeCompare(y)),op=st.winst&&G[st.winst]?st.winst:null,held=c=>W.cards.includes(c.id);
 const it=i=>{const n=G[i].filter(held).length;return btile({k:i,on:i==op,attrs:`data-instpick="${esc(i)}" role=button aria-expanded=${i==op}`,name:i,foot:esc(G[i].length+' card'+(G[i].length==1?'':'s')+' on record'),mark:n?'✓ '+n+' held':''})};
 const ct=c=>{const[a,b]=icol(c),on=held(c);return ctile({a,b,on,img:'cards/'+c.id+'.svg',alt:'',attrs:`data-cardpick="${c.id}" aria-pressed=${on}`,top:c.i,name:c.n,foot:c.fee==null?'Fee —':'$'+c.fee.toLocaleString(),mark:on?'✓ You have it':''})};
 return `<h4 class=ipk>Pick your institution</h4><div class="tiles ptiles" id=pw-insts>${I.map(it).join('')}</div>${op?`<h4 class=ipk>${esc(op)}: tap the cards you have</h4><div class="tiles ptiles" id=pw-instcards>${G[op].slice().sort((x,y)=>x.n.localeCompare(y.n)).map(ct).join('')}</div>`:''}`}
{const act=t=>{const y=scrollY;if(t.dataset.instpick!=null){const i=t.dataset.instpick;st.winst=st.winst==i?null:i;render();scrollTo(0,y);(document.querySelector('#pw-instcards')||t).scrollIntoView({block:'nearest'});return}
  const id=t.dataset.cardpick;W.cards=W.cards.includes(id)?W.cards.filter(x=>x!=id):[...W.cards,id];saveS();render();scrollTo(0,y);document.querySelector(`[data-cardpick="${id}"]`)?.focus()};
 document.addEventListener('click',e=>{const t=e.target.closest('[data-instpick],[data-cardpick]');if(t){e.stopImmediatePropagation();act(t)}},true);
 document.addEventListener('keydown',e=>{const t=e.target.closest?.('[data-instpick],[data-cardpick]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();act(t)}},true)}
/* PUSH 5 (Andrew 2026-10-29): Add wizard. '+' opens a dialog: 1) Pick your institution (logo tiles) -> Next, 2) pick the card(s) -> Add. Close / Cancel / Esc / backdrop change nothing. W.cards keeps its shape (no ptt.state migration needed). */
/* PUSH 17 (Andrew 2026-10-30): step 1 is multi-select (institution tiles toggle); step 2 shows the cards of every picked institution, grouped under its name, as Wallet-size card tiles (same ctile component and grid as Wallet); the dialog grows to the viewport and scrolls inside. */
/* PUSH 4 (Andrew 2026-10-30): Accounts setup wizard, 3 screens. 1) one account type (Credit Cards | Banking | Brokers, icon tiles, single choice); 2) the institutions for that type (multi-select, tap again to unpick);
   3) every product on record for the chosen institutions (multi-select tiles: card tiles for cards, account tiles for banking and brokers). Add writes W.cards / wallet.banks / wallet.brokerage (shapes unchanged). */
const WZT=(()=>{const A=USEC.wallet.L.slice();A.push(['pw-subs','Subscriptions','wsub','subs'],['pw-loy','Loyalty','wloy','loy']);return [...A,...USEC.spending.L]})().filter(x=>x[3]).map(([,n,ic,k])=>[k,n,ic]),
 WZA=WZT.filter(([k])=>!USEC.spending.L.some(x=>x[3]==k)&&k!='subs'&&k!='loy');/* Accounts + = Credit Cards / Banking / Brokers only (2026-11-05). Subscriptions and Loyalty keep WZT entries so their own page + can wizOpen('subs'|'loy'); Spending types stay off that step. */
/* Subscriptions in the + wizard (2026-11-02, from B11): no institution step, 2 screens (type, then the services you do not hold yet). WZ1 = the one-step types; their one product group key is ''. */
const WZ1=new Set(['subs','loy','gc']),WZN=T=>WZ1.has(T)?2:3,WZS=()=>WZ1.has(WZ.type)&&WZ.step==3?2:WZ.step;
const BRTL=t=>t=='SPOUSAL_RRSP'?'Spousal RRSP':/^(CASH|MARGIN|CORPORATE|CRYPTO)$/.test(t)?t[0]+t.slice(1).toLowerCase():t;
const BRLK=b=>LOGOS[b.issuer]?b.issuer:b.i;
const brKey=(b,t)=>b.i+' · '+t;
/* the products of one type, grouped by institution: [inst, [{id, n, held, tile(on, attrs, mark)}]] */
/* Subscriptions picker groups (Andrew 2026-11-06): every catalogue key in exactly one named group (News first, then the rest in the order below). Empty groups are omitted. */
const SUBGROUPS=[['Streaming Video',['netflix','disney','crave','appletv','paramountplus','discoveryplus','amcplus','acorn','britbox','starz','superchannel','cbcgem','dazn','sportsnetplus','tsn']],['Music & Audio',['spotify','applemusic','youtube']],['News',['globe','nationalpost','torontostar','montrealgazette','ottawacitizen','vancouversun','calgaryherald','edmontonjournal','ledevoir','lapresse','winnipegfp','thelogic','walrus','macleans','wrrecord','applenews']],['Delivery & Shopping',['dashpass','uberone','skip','instacart','prime','costco','walmart','pcexpress']],['Cloud, Software & AI',['chatgpt','claude','ghcopilot','googleai','microsoft365','copilotpro','midjourney','mistral','perplexity','xsub']],['Telecom & Bundles',['appleone','streamplus','telusstreamplus']],['Fitness & Health',['headspace','maple','strava']],['Other',['caa','prioritypass']]],
 NEWSKEYS=new Set((SUBGROUPS.find(([n])=>n=='News')||['News',[]])[1]),
 SVCG=Object.fromEntries(SUBGROUPS.flatMap(([n,ks])=>ks.map(k=>[k,n]))),
 svcGroup=k=>SVCG[k]||'Other',
 SUBGORD=Object.fromEntries(SUBGROUPS.map(([n],i)=>[n,i]));
function wzProducts(type){const G={},add=(i,x)=>(G[i]=G[i]||[]).push(x);
 if(type=='cards')C.filter(LIVE).forEach(c=>add(c.i,{id:c.id,n:c.n,held:W.cards.includes(c.id),tile:(on,attrs,mark)=>{const[a,b]=icol(c);return ctile({a,b,on,img:'cards/'+c.id+'.svg',alt:'',attrs,top:c.i,name:c.n,foot:c.fee==null?'Fee —':'$'+c.fee.toLocaleString(),mark})}}));
 /* bank build-out batch 1 (2026-11-01): every account on record (chequing, savings, HISA, USD; personal, youth, business), typed by o.ty / o.seg; accounts closed to new clients stay pickable (people still hold them), foot "Closed" */
 if(type=='banks')(D.bank?.accounts||[]).forEach(o=>add(o.i,{id:o.id,n:o.n,ty:o.ty,seg:o.seg,held:(STO.wallet.banks||[]).some(x=>x.id==o.id),tile:(on,attrs,mark)=>atile({kind:'bank',on,attrs,lk:o.i,inst:o.i,name:o.n,foot:[(BATY.find(x=>x[0]==o.ty)||[0,''])[1],o.seg&&o.seg!='personal'?(BSEG.find(x=>x[0]==o.seg)||[0,''])[1]:null,o.st=='discontinued'?'Closed':o.fee==null?null:o.fee===0?'$0/mo':'$'+o.fee.toFixed(2)+'/mo'].filter(Boolean).join(' · '),mark})}));
 if(type=='loy')LOYL().filter(p=>!loyHas(p)).forEach(p=>add('',{id:p.id,n:p.n,tile:(on,attrs,mark)=>btile({k:p.id,lc:1,on,attrs,name:loyN(p),foot:p.cpp!=null?'≈'+p.cpp+'¢/pt':'—',mark})}));
 /* B26 Gift Cards: every GiftCash CA retailer (a retailer can be held more than once: each add is a new tile) */
 if(type=='gc')GCL().forEach(x=>add('',{id:x.n,n:x.n,tile:(on,attrs,mark)=>btile({k:x.n,on,attrs,name:x.n,foot:esc(GCRT(x.cb)),mark})}));
 if(type=='subs')svcCat().filter(s=>!(STO.wallet.services||[]).includes(s.k)).forEach(s=>add(svcGroup(s.k),{id:s.k,n:s.n,tile:(on,attrs,mark)=>btile({k:s.k,on,sub:1,attrs,name:s.n,foot:subFoot(s.k,0).foot,mark})}));
 if(type=='brokers')(D.bacct||[]).forEach(b=>b.accts.forEach(a=>{const k=brKey(b,a.t);add(b.i,{id:k,n:BRTL(a.t),held:(STO.wallet.brokerage||[]).some(x=>x&&x.i==k),tile:(on,attrs,mark)=>atile({kind:'brk',on,attrs,lk:BRLK(b),inst:b.i,name:BRTL(a.t),foot:a.reg?'Registered':'Non-registered',mark})})}));
 return G}
/* Banking and Brokers account tiles: the card-tile size (same .ctile box and grid), their own design: light face, institution logo, a colour band (bank) or a growth line (broker) */
const atile=o=>{const[a,b]=bcolI(o.inst);return `<div class="ctile atile a${o.kind}${o.on?' on':''}" role=button tabindex=0 ${o.attrs||''} style="--a1:${a};--a2:${b}">${o.rm?RMX(o.rm,o.name):''}${o.ied?`<button type=button class=ted data-ied="${esc(o.ied)}" aria-label="Edit ${esc(o.name)}" title="Account details">✎</button>`:''}<span class=ahd><span class=alg>${logoImg(o.lk,o.inst)}</span><span class=ti>${esc(o.inst)}</span>${o.nick?`<span class=tnk>${esc(o.nick)}</span>`:''}</span><span class=tn title="${esc(o.name)}">${esc(o.name)}</span>${o.kub?o.kub:o.kind=='brk'?'<svg class=aspark viewBox="0 0 100 24" preserveAspectRatio=none aria-hidden=true focusable=false><path d="M0 22 L18 17 L32 19 L50 10 L66 13 L82 5 L100 2" fill=none stroke=currentColor stroke-width=2.4 stroke-linecap=round stroke-linejoin=round /></svg>':'<span class=aband></span>'}<span class=tf>${CK(esc(o.foot))}</span><span class=tw>${CK(esc(o.mark||(o.kind=='brk'?'INVEST':'BANK')))}</span></div>`};

const scol=k=>{const h=[...String(k)].reduce((a,ch)=>(a*31+ch.charCodeAt(0))%360,11);return [`hsl(${h} 42% 36%)`,`hsl(${(h+28)%360} 50% 28%)`]};
/* Spending tiles (Andrew 2026-11-06): same ctile/atile card as wallet credit-card / account tiles — icon square UL, name, amount in the foot. Edit via modal (no inline inputs). */
const stile=o=>{const[a,b]=scol(o.k||o.name);const amt=o.amt!=null&&o.amt!==''&&+o.amt>0?$$(+o.amt):'—';
 /* Andrew 2026-11-06: category (Groceries, Dining, store name, …) is the primary title beside the icon — not generic SPEND/BANK/STORE. */
 return `<div class="ctile atile aspend${o.on?' on':''}${o.bank?' asbank':''}" role=button tabindex=0 ${o.attrs||''} style="--a1:${a};--a2:${b}">${o.rm?RMX(o.rm,o.name):''}<span class=ahd><span class="alg aico">${o.icoHtml||cico(o.ico||o.k)}</span><span class=ti title="${esc(o.name)}">${esc(o.name)}</span></span><span class=aband></span><span class=tf>${amt}</span><span class=tw>/mo</span></div>`};
const SPED={o:false,kind:null,k:null,v:'',name:'',from:null};
function spedDraw(){let h=document.querySelector('#spedw');if(!SPED.o){if(h)h.remove();if(!document.querySelector('#iew,#csw,#wizw,#spww,#pfw,#kpww,#cnw,#sbww,#lbww,#lyww,#pfaw'))document.body.classList.remove('wzopen');return}
 if(!h){h=document.createElement('div');h.id='spedw';document.body.append(h)}
 const body=`<div class=csrow><label class=csl for=sped-amt>Monthly spend<small class=mute>Dollars a month for ${esc(SPED.name)}</small></label><input id=sped-amt class=csin data-spedamt type=number min=0 step=10 inputmode=numeric value="${esc(SPED.v??'')}" placeholder="0"></div>`;
 h.innerHTML=`<div id=csbg data-spedx></div><div id=cset class=sped role=dialog aria-modal=true aria-labelledby=spedh><div class=wzhd><span class=wzst>Spending</span><h3 id=spedh>${esc(SPED.name)}</h3><button type=button class=wzx data-spedx aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class=btn2 data-spedx>Cancel</button><button type=button class=btn data-spedsave>Save</button></div></div>`;
 document.body.classList.add('wzopen');h.querySelector('#sped-amt')?.focus();h.querySelector('#sped-amt')?.select()}
function spedClose(){SPED.o=false;spedDraw();const t=SPED.from;if(t&&t.isConnected)t.focus()}
function spedOpen(kind,k,name,v,from){SPED.o=true;SPED.kind=kind;SPED.k=k;SPED.name=name;SPED.v=v==null||v===''?'':String(v);SPED.from=from||null;spedDraw()}
function spedSave(){const raw=document.querySelector('#sped-amt')?.value;const n=Math.max(0,+raw||0);
 if(SPED.kind=='sp'){W.spend[SPED.k]=n;saveS()}
 else if(SPED.kind=='bsp'){BSPV()[SPED.k]=n;saveS()}
 else if(SPED.kind=='msp'){mspSet(SPED.k,n);saveS()}
 SPED.o=false;spedDraw();render()}
{const act=t=>{if(t.matches('[data-sped]')){if(t.closest('.rmx'))return;const[kind,...r]=t.dataset.sped.split('|'),k=r.join('|');
  const name=(t.querySelector('.ti')?.textContent||t.getAttribute('aria-label')||k).trim().split(',')[0].trim();
  let v='';if(kind=='bsp')v=BSPV()[k]||'';else if(kind=='msp')v=mspGet(k)||'';else v=W.spend[k]||'';
  spedOpen(kind,k,name,v,t);return}
 if(t.matches('[data-spedx]'))return spedClose();
 if(t.matches('[data-spedsave]'))return spedSave()};
 document.addEventListener('click',e=>{if(e.target.closest('.rmx'))return;const t=e.target.closest('[data-sped],[data-spedx],[data-spedsave]');if(t&&(!t.matches('[data-sped]')||!SPED.o)){e.preventDefault();e.stopImmediatePropagation();act(t)}},true);
 document.addEventListener('keydown',e=>{if(!SPED.o)return;if(e.key==='Escape'){e.preventDefault();spedClose();return}
  if(e.key==='Enter'&&e.target&&e.target.id==='sped-amt'){e.preventDefault();spedSave()}},true);
 document.addEventListener('keydown',e=>{const t=e.target.closest&&e.target.closest('.aspend[data-sped]');if(!t||SPED.o||e.target.closest('.rmx'))return;if(e.key==='Enter'||e.key===' '){e.preventDefault();act(t)}},true)}
const bcolI=i=>{const h=[...String(i)].reduce((a,ch)=>(a*31+ch.charCodeAt(0))%360,7);return [`hsl(${h} 55% 38%)`,`hsl(${(h+25)%360} 60% 22%)`]};
const WZ={o:false,step:1,type:null,insts:[],sel:new Set(),from:null,bty:'',bseg:''};
/* Banking step 3: Account type (BATY) and Segment (BSEG) filters, the same ids as the Banking tabs' filters and the account info card */
const wzBK=L=>WZ.type!='banks'?L:L.filter(x=>(!WZ.bty||x.ty==WZ.bty)&&(!WZ.bseg||x.seg==WZ.bseg));
const wzBF=G=>{const all=WZ.insts.flatMap(i=>G[i]||[]),n=(f,k)=>all.filter(x=>x[f]==k).length,row=(f,lab,L,cur)=>`<div class=wzflt><span class=wzfl id=wzf-${f}>${lab}</span><span class=csopt role=radiogroup aria-labelledby=wzf-${f}>${[['','All'],...L].map(([k,l])=>`<button type=button class="cso${cur==k?' on':''}" data-wzbf="${f}:${k}" role=radio aria-checked=${cur==k}${k&&!n(f,k)?' disabled':''}>${l}${k?` <span class=mute>${n(f,k)}</span>`:''}</button>`).join('')}</span></div>`;
 return `<div class=wzflts>${row('ty','Account type',BATY,WZ.bty)}${row('seg','Segment',BSEG,WZ.bseg)}</div>`+(WZ.insts.some(i=>G[i]&&wzBK(G[i]).length)?'':'<p class=mute>No accounts of this type at the banks you picked.</p>')};
function wizHTML(){const T=WZ.type,G=T?wzProducts(T):{},I=Object.keys(G).sort((x,y)=>x.localeCompare(y)),pk=new Set(WZ.insts),U=T=='cards'?['card','cards']:['account','accounts'];
 const body=WZ.step==1?`<div class="tiles ptiles wzt" role=radiogroup aria-label="Account type">${WZA.map(([k,n,ic])=>btile({k,ico:ic,on:T==k,attrs:`data-wztype=${k} role=radio aria-checked=${T==k}`,name:n,foot:esc(WZ1.has(k)?(x=>x+(k=='subs'?' subscription':k=='gc'?' retailer':' program')+(x==1?'':'s'))(Object.values(wzProducts(k)).reduce((n,a)=>n+a.length,0)):Object.keys(wzProducts(k)).length+' institutions'),mark:T==k?'✓':''})).join('')}</div>`
  :WZ.step==2?`<div class="tiles ptiles wzi">${I.map(i=>btile({k:T=='brokers'?BRLK((D.bacct||[]).find(b=>b.i==i)||{i}):i,on:pk.has(i),attrs:`data-wzinst="${esc(i)}" role=checkbox aria-checked=${pk.has(i)} title="${esc(i)}"`,name:i,foot:esc(G[i].length+' '+U[G[i].length==1?0:1]),mark:pk.has(i)?'✓':''})).join('')}</div>`
  :WZ1.has(T)?(T=='gc'?`<div class=csrow><label class=csl for=wz-gcc>Other retailer<small class=mute>Not in the list? Type its name</small></label><input id=wz-gcc class=csin data-wzgcc maxlength=40 value="${esc(WZ.gcc||'')}" placeholder="—"></div>`:'')+((()=>{const flat=(G['']||[]).slice().sort((x,y)=>x.n.localeCompare(y.n)),grp=Object.keys(G).filter(k=>k).sort((a,b)=>(SUBGORD[a]??99)-(SUBGORD[b]??99)||a.localeCompare(b));const tile=x=>x.tile(WZ.sel.has(x.id),`data-wzcard="${esc(x.id)}" role=checkbox aria-checked=${WZ.sel.has(x.id)}`,WZ.sel.has(x.id)?'✓ Selected':'');const empty=`<p class=mute>${T=='gc'?'No retailers on record.':'You have every '+(T=='subs'?'subscription':'loyalty program')+' on record.'}</p>`;if(!flat.length&&!grp.some(k=>(G[k]||[]).length))return empty;return (flat.length?`<div class="tiles ptiles wzc">${flat.map(tile).join('')}</div>`:'')+grp.filter(k=>(G[k]||[]).length).map(k=>`<section class=wzgrp><h4 class=wzgh>${esc(k)}</h4><div class="tiles ptiles wzc">${G[k].slice().sort((x,y)=>x.n.localeCompare(y.n)).map(tile).join('')}</div></section>`).join('')})())
  :(T=='banks'?wzBF(G):'')+WZ.insts.filter(i=>G[i]&&wzBK(G[i]).length).map(i=>`<section class=wzgrp><h4 class=wzgh>${esc(i)}</h4><div class="tiles ptiles wzc">${wzBK(G[i]).slice().sort((x,y)=>(T=='banks'?BATY.findIndex(b=>b[0]==x.ty)-BATY.findIndex(b=>b[0]==y.ty):0)||x.n.localeCompare(y.n)).map(x=>{return x.tile(WZ.sel.has(x.id),`data-wzcard="${esc(x.id)}" role=checkbox aria-checked=${WZ.sel.has(x.id)}${x.held?' data-wzheld':''}`,x.held?(WZ.sel.has(x.id)?'✓ Add another':'+ Add another'):WZ.sel.has(x.id)?'✓ Selected':'')}).join('')}</div></section>`).join('');
 const n=WZ.sel.size+(WZ.type=='gc'&&(WZ.gcc||'').trim()?1:0),ni=WZ.insts.length,TN=(WZT.find(x=>x[0]==T)||[])[1]||'';
 const h=WZ.step==1?'What do you want to add?':WZ.step==2?`Pick your ${T=='cards'?'card issuers':T=='banks'?'banks':'brokers'}`:`Pick your ${T=='cards'?'cards':T=='subs'?'subscriptions':T=='loy'?'loyalty programs':T=='gc'?'gift card retailers':'accounts'}`;
 const ft=WZ.step==1?`<button type=button class=btn2 data-wzx>Cancel</button><button type=button class=btn data-wznext ${T?'':'disabled'}>Next</button>`:WZ.step==2?`<button type=button class=btn2 data-wzback>Back</button><button type=button class=btn data-wznext ${ni?'':'disabled'}>Next${ni?' ('+ni+')':''}</button>`:`<button type=button class=btn2 data-wzback>Back</button><button type=button class=btn data-wzadd ${n?'':'disabled'}>Add${n?' '+n:''}</button>`;
 return `<div id=wzbg></div><div id=wiz class="wz${WZ.step}" role=dialog aria-modal=true aria-labelledby=wzh data-wzt="${T||''}"><div class=wzhd><span class=wzst>Step ${WZS()} of ${T?WZN(T):3}${WZ.step>1?' · '+esc(TN):''}</span><h3 id=wzh>${h}</h3><button type=button class=wzx data-wzx aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft>${ft}</div></div>`}
function wizDraw(){let h=document.querySelector('#wizw');if(!WZ.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='wizw';document.body.append(h)}const sy=h.querySelector('.wzbd')?.scrollTop||0;h.innerHTML=wizHTML();document.body.classList.add('wzopen');const b=h.querySelector('.wzbd');if(b&&WZ.keep)b.scrollTop=sy;WZ.keep=false}
function wizOpen(k){Object.assign(WZ,{o:true,step:1,type:null,insts:[],sel:new Set(),from:document.activeElement,bty:'',bseg:'',gcc:''});if(k&&WZT.some(x=>x[0]==k)){WZ.type=k;if(WZ1.has(k)){WZ.insts=[''];WZ.step=3;wizDraw();document.querySelector('#wiz [data-wzcard]')?.focus();return}WZ.step=2;wizDraw();document.querySelector('#wiz [data-wzinst]')?.focus();return}wizDraw();document.querySelector('#wiz [data-wztype]')?.focus()}/* a subsection + opens straight at step 2; Back goes to step 1 (type picked) */
/* B26: the custom gift card retailer field updates the Add button in place (no redraw while typing); Enter adds */
document.addEventListener('input',e=>{if(!e.target.matches?.('#wiz [data-wzgcc]'))return;WZ.gcc=e.target.value;const b=document.querySelector('#wiz [data-wzadd]'),n=WZ.sel.size+(WZ.gcc.trim()?1:0);if(b){b.disabled=!n;b.textContent='Add'+(n?' '+n:'')}},true);
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.matches?.('#wiz [data-wzgcc]')){e.preventDefault();document.querySelector('#wiz [data-wzadd]:not([disabled])')?.click()}},true);
function wizClose(){WZ.o=false;wizDraw();(WZ.from&&WZ.from.isConnected?WZ.from:document.querySelector('[data-wiz]'))?.focus()}
{const act=t=>{if(t.matches('[data-wiz]'))return wizOpen(t.dataset.wiz);if(t.matches('[data-wzx]')||t.id=='wzbg')return wizClose();
  if(t.dataset.wztype!=null){const k=t.dataset.wztype;if(WZ.type!=k){WZ.type=k;WZ.insts=[];WZ.sel=new Set()}WZ.keep=true;wizDraw();document.querySelector(`#wiz [data-wztype=${k}]`)?.focus();return}
  if(t.dataset.wzinst!=null){const i=t.dataset.wzinst,G=wzProducts(WZ.type);if(WZ.insts.includes(i)){WZ.insts=WZ.insts.filter(x=>x!=i);(G[i]||[]).forEach(x=>WZ.sel.delete(x.id))}else WZ.insts=[...WZ.insts,i];WZ.keep=true;wizDraw();document.querySelector(`#wiz [data-wzinst="${CSS.escape(i)}"]`)?.focus();return}
  if(t.dataset.wzbf!=null){const[f,k]=t.dataset.wzbf.split(':');WZ[f=='ty'?'bty':'bseg']=k;WZ.keep=true;wizDraw();document.querySelector(`#wiz [data-wzbf="${f}:${k}"]`)?.focus();return}
  if(t.matches('[data-wznext]')){if(WZ.step==1){if(!WZ.type)return;if(WZ1.has(WZ.type)){WZ.insts=[''];WZ.step=3;wizDraw();document.querySelector('#wiz [data-wzcard]')?.focus();return}WZ.step=2;wizDraw();document.querySelector('#wiz [data-wzinst]')?.focus();return}if(!WZ.insts.length)return;WZ.insts.sort((x,y)=>x.localeCompare(y));WZ.step=3;wizDraw();document.querySelector('#wiz [data-wzcard]:not([aria-disabled])')?.focus();return}
  if(t.matches('[data-wzback]')){WZ.step=WZ1.has(WZ.type)?1:WZ.step-1;wizDraw();document.querySelector(WZ.step==1?`#wiz [data-wztype=${WZ.type}]`:`#wiz [data-wzinst="${CSS.escape(WZ.insts[0]||'')}"]`)?.focus();return}
  if(t.dataset.wzcard!=null){const id=t.dataset.wzcard;if(t.getAttribute('aria-disabled')=='true')return;WZ.sel.has(id)?WZ.sel.delete(id):WZ.sel.add(id);WZ.keep=true;wizDraw();document.querySelector(`#wiz [data-wzcard="${CSS.escape(id)}"]`)?.focus();return}
  if(t.matches('[data-wzadd]')){const NW=NOW();if(WZ.type=='gc'){const L=[...WZ.sel],c=(WZ.gcc||'').trim().slice(0,40);if(c)L.push(c);if(!L.length)return;const W2=STO.wallet,a=W2.gcards=W2.gcards||[],tk=new Set(a.map(x=>x.i));L.forEach(r=>{const i=NEWK('gc',tk);tk.add(i);a.push({i,r,added_at:NW})});WZ.gcc='';W2.updated_at=NW;saveS();WZ.o=false;wizDraw();render();document.querySelector('[data-wiz]')?.focus();return}
   if(!WZ.sel.size)return;const L=[...WZ.sel];
   if(WZ.type=='loy'){const W2=STO.wallet;W2.points=W2.points||[];L.forEach(id=>{const p=PTS.find(x=>x.id==id);if(p&&!loyHas(p))W2.points.push({i:p.n,added_at:NW})});W2.loyhide=(W2.loyhide||[]).filter(k=>!L.includes(k));W2.updated_at=NW;saveS();WZ.o=false;wizDraw();render();document.querySelector('[data-wiz]')?.focus();return}
   if(WZ.type=='subs'){const W2=STO.wallet;W2.services=[...new Set([...(W2.services||[]),...L])];W2.subhide=(W2.subhide||[]).filter(k=>!L.includes(k));W2.updated_at=NW;saveS();WZ.o=false;wizDraw();render();document.querySelector('[data-wiz]')?.focus();return}
   /* B4: a product already held gets one more instance (own key); a new one gets the legacy key */
   const g=WZ.type=='cards'?'cards':WZ.type=='banks'?'banks':'brokerage',a=STO.wallet[g]=STO.wallet[g]||[],tk=new Set(a.map(x=>IKEY(g,x)));
   L.forEach(id=>{const k=tk.has(id)?NEWK(id,tk):id;tk.add(k);if(g=='brokerage'){const[br,t]=id.split(' · ');a.push({i:id,k,broker:br,acct:t,added_at:NW})}else a.push({id,k,added_at:NW})});
   if(g=='cards')W.cards=[...new Set([...W.cards,...L])];
   saveS();WZ.o=false;wizDraw();render();document.querySelector('[data-wiz]')?.focus()}};
 const SEL='[data-wiz],[data-wzx],#wzbg,[data-wztype],[data-wzinst],[data-wznext],[data-wzback],[data-wzcard],[data-wzadd],[data-wzbf]';
 document.addEventListener('click',e=>{const t=e.target.closest(SEL);if(t&&!t.disabled){e.stopImmediatePropagation();act(t)}},true);
 document.addEventListener('keydown',e=>{if(!WZ.o){const t=e.target.closest?.('[data-wiz]');return}if(e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();wizClose();return}const t=e.target.closest?.('[data-wztype],[data-wzinst],[data-wzcard]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();act(t)}
  if(e.key=='Tab'){const f=[...document.querySelectorAll('#wiz button:not([disabled]),#wiz [tabindex="0"]')];if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i==f.length-1){e.preventDefault();f[0].focus()}}},true)}
/* B5 account info cards (Andrew 2026-11-01; best-guess prototype, fields to be worked through). B6: tapping a Banking / Brokers tile opens (same trigger as a card tile opening card settings; no pencil, no product popup) this one instance's details, same modal pattern as card settings.
   Saved on the instance in ptt.state wallet.banks / wallet.brokerage (synced with the wallet). Empty fields are dropped, never guessed.
   Banking: own (solo|joint), nick, plan (fee accounts), bal (fee waiver derived), dd, opened. minbal yes/no removed 2026-11-06.
   Brokers: own, nick, types [account types], linked accounts (wallet.kmap: itemId -> tile key | '-'), last updated + value (read-only, from the linked accounts), plan, xfer (transfer bonus in progress, free text). */
const IE={o:false,g:null,k:null,d:{},lk:{},from:null};
const loyN=p=>String(p.n||'').replace(/ \(Canada\)$/,'');
/* Loyalty details card (2026-11-02, from B11): the points balance (wallet.points[].bal) + estimated value; IEX finds the entry, IEG the wallet group it removes from (wRm). */
/* B26: GiftCash catalogue (build-time, D.gcc: CITED, source + fetch date); GCBY = the entry for a retailer name, GCRT = its rate as text */
const GCL=()=>(D.gcc&&D.gcc.items)||[],GCBY=n=>{const l=String(n||'').trim().toLowerCase();return GCL().find(x=>x.n.toLowerCase()==l)||null},GCRT=cb=>cb==null?'—':'GiftCash '+(+cb).toLocaleString('en-CA',{maximumFractionDigits:2})+'% back';
const IEG={loy:'points',svc:'services',gc:'gcards'},IEX=(g,k)=>g=='gc'?(STO.wallet.gcards||[]).find(x=>x&&x.i==k):g=='loy'?(STO.wallet.points||[]).find(x=>x&&x.i==k):g=='svc'?((STO.wallet.svc||{})[k]||{}):INST(g,k);
const IEF={banks:['own','nick','plan','bal','dd','opened']/* B10: atype from product; Andrew 2026-11-06: minbal yes/no dropped — fee waiver derives from Kubera/entered bal */,brokerage:['own','nick','types','xfer','opened']/* Andrew 2026-11-06 form audit: plan/fee tier removed from form (derived from product) */,loy:['bal'],svc:['tier','plan','mo','cycle','renew','paid','cover','nick','via','pex','pact']/* B24: subscription settings in wallet.svc */,gc:['r','bal','l4','exp','cb']/* B26: gift card fields in wallet.gcards[] (added_at kept, not shown) */};
const BATY=[['chequing','Chequing'],['savings','Savings'],['hisa','HISA'],['usd','USD']],BSEG=[['personal','Personal'],['youth','Youth'],['business','Business']],YN=[['yes','Yes'],['no','No']],OWN=[['solo','Solo'],['joint','Joint']],SCYC=[['monthly','Monthly'],['yearly','Yearly'],['weekly','Weekly'],['quarterly','Quarterly']];
const ieCardOpts=()=>(STO.wallet.cards||[]).map(x=>{const c=C[BYID0[x.id]];if(!c)return null;const k=IKEY('cards',x);return[k,(x.nick?x.nick+' · ':'')+c.n]}).filter(Boolean);
/* linked accounts for one broker tile: [{it, on}] (signed in with balances only) */
const ieLinks=(k,lk=IE.lk,debt=false)=>{if(typeof kubOn!='function'||!kubOn())return null;const items=KUB.d.items||[],M=kubMap(items,kubTiles(),STO.wallet.kmap);return items.filter(it=>(it.kind=='debt')==debt).map(it=>({it,on:lk[it.id]!=null?lk[it.id]:M.link[it.id].k==k}))};/* cards list only Kubera credit card debts; banks/brokers only assets */
/* B11 (Andrew 2026-11-01): the Kubera account list is split under Kubera's own sheet headers (names and order as Kubera returns them), each with its total; a payload without sheets stays one list */
const ieLkG=L=>{const G=new Map();L.forEach(x=>{const k=x.it.sheet||'';if(!G.has(k))G.set(k,[]);G.get(k).push(x)});return [...G]},ieTot=I=>{const t=kubSum(I);return t==null?'—':kubFmt(t,'CAD')};/* CAD only */
const ieDate=iso=>{const d=new Date(iso);return isNaN(d)?'—':d.toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'})};
const ieLkB=(k=IE.k,lk=IE.lk,debt=false)=>{let body='';const ro=(lab,v,sub)=>`<div class=csrow><span class=csl>${lab}${sub?`<small class=mute>${sub}</small>`:''}</span><span class=ieval>${v}</span></div>`;  const L=ieLinks(k,lk,debt),on=(L||[]).filter(x=>x.on).map(x=>x.it);
  body+=`<div class="csrow iecol"><span class=csl id=ie-lkl>Linked accounts<small class=mute>${debt?'Balance owed shows on this tile':'Their values add up on this tile'}</small></span>${L==null?'<span class="mute ieval">Sign in to link accounts</span>':L.length?`<ul class=ielk aria-labelledby=ie-lkl>${ieLkG(L).map(([sh,G])=>{const rows=G.map(({it,on})=>`<li><label><input type=checkbox data-ielk="${esc(it.id)}"${on?' checked':''}> <span>${esc(it.name)}</span></label><b>${kubCad(it)==null?'—':esc(kubFmt(kubCad(it),'CAD'))}</b></li>`).join('');/* Andrew 2026-11-02: each Kubera sheet group has its own chevron, collapsed by default; open state kept for the session */return sh?`<li class=ielkg><details data-ielkg="${esc(sh)}"${(window.IEOG||(window.IEOG=new Set)).has(sh)?' open':''} ontoggle="(window.IEOG||(window.IEOG=new Set))[this.open?'add':'delete'](this.dataset.ielkg)"><summary class=ielkh><span>${esc(sh)} <small class=mute>(${G.length})</small></span><b>${esc(ieTot(G.map(x=>x.it)))}</b></summary><ul class=ielk>${rows}</ul></details></li>`:rows}).join('')}</ul>`:'<span class="mute ieval">None available</span>'}</div>`;
  const tsum=kubSum(on);/* CAD only */
  const up=on.map(it=>it.updated||KUB.d.fetched_at).filter(Boolean).sort()[0];
  return body+ro('Last updated',up?esc(ieDate(up)):'—')+ro(debt?'Balance owed':'Total value',tsum!=null?esc(kubFmt(tsum,'CAD')):'—',on.length>1?'Sum of '+on.length+' linked accounts':'')
   };/* B12: Linked accounts + Last updated + Total value, shared by the broker and bank details cards */
function ieHTML1(){const d=IE.d,ro=(lab,v,sub)=>`<div class=csrow><span class=csl>${lab}${sub?`<small class=mute>${sub}</small>`:''}</span><span class=ieval>${v}</span></div>`,p=ptsBy(IE.k)||{n:IE.k},v=d.bal===''||d.bal==null?null:+d.bal;
 const body=`<div class=csrow><label class=csl for=ie-bal>Points balance</label><input id=ie-bal class=csin data-ief=bal type=number min=0 step=1 inputmode=numeric value="${esc(d.bal??'')}" placeholder="—"></div>`+ro('Estimated value',v!=null&&p.cpp!=null?esc($$(v*p.cpp/100)):'—',p.cpp!=null?'At ≈'+p.cpp+'¢/pt':'');
 return `<div id=csbg data-iex></div><div id=cset class=ied role=dialog aria-modal=true aria-labelledby=ieh><div class=wzhd><span class=wzst>${esc(p.op||'Loyalty')}</span><h3 id=ieh>${esc(loyN(p))}</h3><button type=button class=wzx data-iex aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class="btn2 csrm" data-iecrm>Remove program</button><span class=csgap></span><button type=button class=btn2 data-iex>Cancel</button><button type=button class=btn data-iesave>Save</button></div></div>`}
function ieHTMLSvc(){const d=IE.d,s=SUBS.find(x=>x.k==IE.k)||SVCBY[IE.k]||{k:IE.k,n:IE.k},T=subTiers(IE.k),cur=d.tier||(STO.wallet.subtiers||{})[IE.k]||'',t=T.find(x=>x.k==cur)||(cur?null:subTier(IE.k)),ro=(lab,v,sub)=>`<div class=csrow><span class=csl>${lab}${sub?`<small class=mute>${sub}</small>`:''}</span><span class=ieval>${v}</span></div>`,seg=(f,L,lab)=>{const v=d[f]??'';return `<div class=csrow><span class=csl id=ie-${f}l>${lab}</span><span class=csopt role=radiogroup aria-labelledby=ie-${f}l>${L.map(([k,l])=>`<button type=button class="cso${v==k?' on':''}" data-ieopt="${f}:${k}" role=radio aria-checked=${v==k}>${l}</button>`).join('')}</span></div>`},txt=(f,lab,sub,a='')=>`<div class=csrow><label class=csl for=ie-${f}>${lab}${sub?`<small class=mute>${sub}</small>`:''}</label><input id=ie-${f} class=csin data-ief=${f} ${a} value="${esc(d[f]??'')}" placeholder="—"></div>`;
 const cards=ieCardOpts(),paid=d.paid||'';
 let body=(T.length?`<div class=csrow><span class=csl id=ie-tierl>Plan<small class=mute>The plan sets monthly or annual</small></span><span class=csopt role=radiogroup aria-labelledby=ie-tierl>${T.map(x=>`<button type=button class="cso${cur==x.k?' on':''}" data-ieopt="tier:${esc(x.k)}" role=radio aria-checked=${cur==x.k} title="${esc([x.tag,x.note,x.asof&&('as of '+x.asof)].filter(Boolean).join(' · '))}">${esc(planPick(x))}</button>`).join('')}</span></div>`:txt('plan','Plan or tier','Optional','maxlength=60'));
 {const PS=bunParents(IE.k);if(PS.length){const eff=d.via!=null?(d.via=='-'?null:d.via):bunVia(IE.k),cv=d.via??(eff||'-');
  body+=`<div class=csrow><span class=csl id=ie-vial>Included with<small class=mute>${eff?'Price $0 · '+esc(bunName(eff))+' carries the fee':'None · you pay for it on its own'}</small></span><span class=csopt role=radiogroup aria-labelledby=ie-vial>${[...PS.map(p=>[p,bunName(p)]),['-','None']].map(([k,l])=>`<button type=button class="cso${cv==k?' on':''}" data-ieopt="via:${esc(k)}" role=radio aria-checked=${cv==k}>${esc(l)}</button>`).join('')}</span></div>`;
  const dp=bunDouble(IE.k);if(dp&&d.via==null)body+=`<div class="csrow bdpr"><span class=csl>Included with ${esc(bunName(dp.p))} — you may be paying twice<small class=mute>$${dp.mo.toFixed(2)}/mo on its own</small></span><button type=button class="btn2 bdpm" data-bmove="${esc(IE.k)}">Move under ${esc(bunName(dp.p))}</button></div>`;
  /* Promotion Expiry Date: only when the effective (or selected) parent is a time-limited perk */
  const tp=eff&&bunTimed(eff,IE.k);if(tp){body+=txt('pex','Promotion Expiry Date',tp.months?`Complimentary for ${tp.months} months from activation`+(tp.ends?' · enrol by '+tp.ends:''):('Offer window'+(tp.ends?' to '+tp.ends:'')),'type=date');if(tp.months)body+=txt('pact','Activated on','Optional · used to compute the expiry when blank','type=date')}}
  const K=bunKids(IE.k);if(K.length)body+=`<div class="csrow iecol"><span class=csl>Includes<small class=mute>Standalone Canadian list price of the tier included</small></span><span class=ieval>${K.map(c=>`<span class=bkid title="${esc([c.tier&&c.tier.tag,c.tier&&c.tier.src].filter(Boolean).join(' · '))}">${esc(subName(c.k))}${c.tier&&subTiers(c.k).length>1?' '+esc(c.tier.n):''} · ${c.tier&&c.tier.mo!=null?'$'+(+c.tier.mo).toFixed(2)+'/mo':'—'}</span>`).join('')}</span></div>`}
 const perLab=t&&t.per==='year'?'per year':'per month';
 body+=txt('mo','Price',t&&t.p==null?'No catalogue price · enter what you pay, CAD '+perLab:'Optional · leave blank to use the catalogue · CAD '+perLab,'type=number min=0 step=0.01 inputmode=decimal');
 if(t&&t.p!=null)body+=`<div class=csrow title="${esc([t.tag,t.note,t.asof&&('as of '+t.asof)].filter(Boolean).join(' · '))}"><span class=csl>Catalogue price</span><span class=ieval>${esc(tierPrice(t))}</span></div>`;
 else if(t)body+=ro('Catalogue price','—','Not priced · enter a price above');
 body+=txt('renew','Renewal date','Optional','type=date');
 body+=`<div class=csrow><label class=csl for=ie-paid>Paid with<small class=mute>Optional · one of your Credit Cards</small></label><select id=ie-paid class=csin data-ief=paid>${['<option value="">—</option>'].concat(cards.map(([k,l])=>`<option value="${esc(k)}"${paid==k?' selected':''}>${esc(l)}</option>`)).join('')}</select></div>`;
 {const effVia=d.via!=null?(d.via=='-'?null:d.via):bunVia(IE.k);if(effVia)body+=ro('How it\'s covered','Included with '+esc(bunName(effVia))+' <span class=t>CITED</span>','Derived from the bundle — not asked');
  else body+=`<div class="csrow iecol"><label class=csl for=ie-cover>How it\'s covered<small class=mute>Optional · a card perk or membership reward</small></label><textarea id=ie-cover class="csin ieta" data-ief=cover maxlength=300 rows=2 placeholder="—">${esc(d.cover??'')}</textarea></div>`;}/* Nickname and Plan note stay in wallet.svc when already stored; they are not shown or edited */
 return `<div id=csbg data-iex></div><div id=cset class="ied svc" role=dialog aria-modal=true aria-labelledby=ieh><div class=wzhd><span class=wzst>Subscription</span><h3 id=ieh><span class="slogo${SUBPLATE.has(LGR(s.k,s.n))?' lgp':''}">${logoImg(s.k,s.n,1)}</span>${esc(s.n||IE.k)}</h3><button type=button class=wzx data-iex aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class="btn2 csrm" data-iecrm>Remove subscription</button><span class=csgap></span><button type=button class=btn2 data-iex>Cancel</button><button type=button class=btn data-iesave>Save</button></div></div>`}
function ieHTMLGc(){const d=IE.d,g=GCBY(d.r),ro=(lab,v,sub)=>`<div class=csrow><span class=csl>${lab}${sub?`<small class=mute>${sub}</small>`:''}</span><span class=ieval>${v}</span></div>`,txt=(f,lab,sub,a='')=>`<div class=csrow><label class=csl for=ie-${f}>${lab}${sub?`<small class=mute>${sub}</small>`:''}</label><input id=ie-${f} class=csin data-ief=${f} ${a} value="${esc(d[f]??'')}" placeholder="—"></div>`,G=D.gcc||{};
 const body=txt('r','Retailer','Any name; GiftCash retailers match their rate','maxlength=40 list=ie-gcl')+`<datalist id=ie-gcl>${GCL().map(x=>`<option value="${esc(x.n)}">`).join('')}</datalist>`+txt('bal','Balance','Optional · CAD','type=number min=0 step=0.01 inputmode=decimal')+txt('l4','Card number','Optional · last 4 digits only','maxlength=4 inputmode=numeric pattern="[0-9]{4}"')+txt('exp','Expiry','Optional','type=date')+txt('cb','Bought at cashback','Optional · % you got when you bought it','type=number min=0 max=100 step=0.01 inputmode=decimal')
  +ro('GiftCash cashback',g?`${esc(GCRT(g.cb))} <span class=t>${esc(G.tag||'CITED')}</span>`:'—',g?`Info · ${esc(G.source_name||'GiftCash')} catalogue, fetched ${esc(G.fetched_at||'')}`:'This retailer is not in the GiftCash catalogue');
 return `<div id=csbg data-iex></div><div id=cset class=ied role=dialog aria-modal=true aria-labelledby=ieh><div class=wzhd><span class=wzst>Gift Card</span><h3 id=ieh>${esc(d.r||'Gift card')}</h3><button type=button class=wzx data-iex aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class="btn2 csrm" data-iecrm>Remove gift card</button><span class=csgap></span><button type=button class=btn2 data-iex>Cancel</button><button type=button class=btn data-iesave>Save</button></div></div>`}
function ieHTML(){if(IE.g=='gc')return ieHTMLGc();if(IE.g=='loy')return ieHTML1();if(IE.g=='svc')return ieHTMLSvc();const X=INST(IE.g,IE.k)||{},d=IE.d,bank=IE.g=='banks',o=bank?(D.bank?.accounts||[]).find(a=>a.id==X.id)||{}:{},nm=bank?o.n||X.id:(x=>x?BRTL(x):X.i||'')(X.acct||String(X.i||'').split(' · ')[1]);
 const seg=(f,L,lab,def)=>{const v=d[f]??def;return `<div class=csrow><span class=csl id=ie-${f}l>${lab}</span><span class=csopt role=radiogroup aria-labelledby=ie-${f}l>${L.map(([k,l])=>`<button type=button class="cso${v==k?' on':''}" data-ieopt="${f}:${k}" role=radio aria-checked=${v==k}>${l}</button>`).join('')}</span></div>`};
 const txt=(f,lab,sub,a='')=>`<div class=csrow><label class=csl for=ie-${f}>${lab}${sub?`<small class=mute>${sub}</small>`:''}</label><input id=ie-${f} class=csin data-ief=${f} ${a} value="${esc(d[f]??'')}" placeholder="—"></div>`;
 const ro=(lab,v,sub)=>`<div class=csrow><span class=csl>${lab}${sub?`<small class=mute>${sub}</small>`:''}</span><span class=ieval>${v}</span></div>`;
 const bty=bank?'':BRTL(X.acct||String(X.i||'').split(' · ')[1]||'')/* 2026-11-02 (Andrew): broker tiles show Ownership only for RESP, Margin, Cash and Corporate (registered accounts are one owner); the Account types row is gone (implied by the tile's account); saved own/types stay in ptt.state */,ownOK=bank||/^(resp|margin|cash|corporate)\b/i.test(bty);
 let body=(ownOK?seg('own',OWN,'Ownership','solo'):'')+txt('nick','Nickname','Shown on this tile','maxlength=24');
 if(bank){const BB=(typeof BANK!='undefined'&&BANK.bal)?BANK.bal(o):{bal:null,src:null};const feeNote=(()=>{if(!(o.fee>0))return '';if(o.mbk=='waive'&&o.mb!=null){if(BB.bal!=null&&BB.bal>=o.mb)return ro('Monthly fee','$0 <span class=t>CITED</span>',`Fee waived: balance $${Math.round(BB.bal).toLocaleString()} >= $${Math.round(o.mb).toLocaleString()} min`+(BB.src=='kubera'?' · Kubera':BB.src=='entered'?' · entered':''));
  if(BB.bal!=null)return ro('Monthly fee','$'+Number(o.fee).toFixed(2)+'/mo <span class=t>CITED</span>',`Fee applies: balance $${Math.round(BB.bal).toLocaleString()} below $${Math.round(o.mb).toLocaleString()} min`);
  return ro('Monthly fee','$'+Number(o.fee).toFixed(2)+'/mo <span class=t>CITED</span>','Unknown balance — fee shown at list rate (link Kubera or enter a balance)');}
  if(o.mbk=='none-needed')return ro('Monthly fee','$0 <span class=t>CITED</span>','No balance condition');
  return ro('Monthly fee','$'+Number(o.fee).toFixed(2)+'/mo <span class=t>CITED</span>',o.mbk=='no-waiver'?'No balance waiver on record':'Waiver not stated');})();
  body+=(o.fee>0?txt('plan','Monthly fee plan','Plan or tier, if the account has one','maxlength=40')+feeNote+txt('bal','Balance','CAD · used to derive the fee waiver; Kubera wins when linked','type=number min=0 step=0.01 inputmode=decimal'):'')/* Andrew 2026-11-06: no minbal yes/no — derive from balance */+seg('dd',YN,'Direct deposit linked')+txt('opened','Account opened','Optional','type=date')+ieLkB();}
 else{const b=(D.bacct||[]).find(q=>q.i==(X.broker||String(X.i).split(' · ')[0]))||{},T=(b.accts||[]).map(a=>a.t),cur=d.types||[];[...cur].forEach(t=>{if(!T.includes(t))T.push(t)});
  /* Account types row removed 2026-11-02 */
  body+=txt('opened','Account opened','Optional','type=date')+ieLkB()
   /* Plan / fee tier removed 2026-11-02 (Andrew) */+`<div class="csrow iecol"><label class=csl for=ie-xfer>Transfer bonus in progress<small class=mute>Free text: offer, amount moved, deadline</small></label><textarea id=ie-xfer class="csin ieta" data-ief=xfer maxlength=300 rows=2 placeholder="—">${esc(d.xfer??'')}</textarea></div>`}
 return `<div id=csbg data-iex></div><div id=cset class=ied role=dialog aria-modal=true aria-labelledby=ieh><div class=wzhd><span class=wzst>${esc(bank?o.i||'':(X.broker||String(X.i||'').split(' · ')[0]))}</span><h3 id=ieh>${esc(nm)}${bank&&o.ty?` <span class=iety>· ${esc((BATY.find(b=>b[0]==o.ty)||[0,o.ty])[1])}</span>`:''}</h3><button type=button class=wzx data-iex aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class="btn2 csrm" data-iecrm>Remove account</button><span class=csgap></span><button type=button class=btn2 data-iex>Cancel</button><button type=button class=btn data-iesave>Save</button></div></div>`}
function ieDraw(){let h=document.querySelector('#iew');if(!IE.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='iew';document.body.append(h)}const sy=h.querySelector('.wzbd')?.scrollTop||0;h.innerHTML=ieHTML();const b=h.querySelector('.wzbd');if(b)b.scrollTop=sy;document.body.classList.add('wzopen')}
function ieClose(){IE.o=false;ieDraw();const t=document.querySelector(`[data-ied="${CSS.escape(IE.g+'|'+IE.k)}"]`)||IE.from;if(t&&t.isConnected)t.focus()}
function ieSave(){if(IE.g=='gc'){const X=IEX('gc',IE.k),d=IE.d;if(X){const j0=JSON.stringify(X),num=(v,mx)=>v===''||v==null||!isFinite(+v)||+v<0?null:Math.min(mx,Math.round(+v*100)/100);const r=String(d.r||'').trim().slice(0,40);if(r)X.r=r;
  const V={bal:num(d.bal,1e7),l4:/^\d{4}$/.test(String(d.l4||'').trim())?String(d.l4).trim():null,exp:/^\d{4}-\d\d-\d\d$/.test(d.exp||'')?d.exp:null,cb:num(d.cb,100)};Object.entries(V).forEach(([f,v])=>{if(v==null)delete X[f];else X[f]=v});if(JSON.stringify(X)!=j0){X.updated_at=NOW();STO.wallet.updated_at=NOW();saveS()}}IE.o=false;ieDraw();render();ieClose();return}
 if(IE.g=='svc'){const d=IE.d,M={...(STO.wallet.svc||{})},prev={...(M[IE.k]||{})},x={};delete prev.updated_at;IEF.svc.forEach(f=>{let v=d[f];if(typeof v=='string')v=v.trim();if(f=='mo')v=v===''||v==null?null:(isFinite(+v)&&+v>=0?+v:null);if(f=='cycle'&&v&&!SCYC.some(c=>c[0]==v))v=null;if(f=='renew'&&v&&!/^\d{4}-\d\d-\d\d$/.test(v))v=null;if(f=='paid'&&v&&!(STO.wallet.cards||[]).some(c=>IKEY('cards',c)==v))v=null;if(f=='tier'&&v&&!subTiers(IE.k).some(t=>t.k==v))v=null;if(f=='plan'&&v)v=v.slice(0,60);if(f=='cover'&&v)v=v.slice(0,300);if(f=='nick'&&v)v=v.slice(0,24);if(f=='via'&&v&&v!='-'&&!bunParents(IE.k).includes(v))v=null;if(f=='pex'&&v&&v!=='—'&&!/^\d{4}-\d\d-\d\d$/.test(v))v=null;if(f=='pact'&&v&&!/^\d{4}-\d\d-\d\d$/.test(v))v=null;if(v!=null&&v!=='')x[f]=v});if(prev.nick&&!x.nick)x.nick=prev.nick;if(subTiers(IE.k).length&&prev.plan&&!x.plan)x.plan=prev.plan;/* Nickname and Plan note are not on the form; a save keeps a value already stored. The plan sets the cycle. A typed price is that plan's charge: a monthly plan keeps it in mo (the old Monthly cost field); a yearly plan keeps the year charge in price so a later read does not treat it as a monthly amount. */const tt=(x.tier&&subTiers(IE.k).find(z=>z.k==x.tier))||subTier(IE.k);if(x.mo!=null&&tt&&tt.per==='year'){x.price=x.mo;delete x.mo}if(tt&&Object.keys(x).length)x.cycle=tt.per==='year'?'yearly':'monthly';if(Object.keys(x).length){if(JSON.stringify(x)!=JSON.stringify(prev))x.updated_at=NOW();else if(M[IE.k]&&M[IE.k].updated_at)x.updated_at=M[IE.k].updated_at;M[IE.k]=x}else delete M[IE.k];STO.wallet.svc=M;/* keep wallet.subtiers in step when a catalogue tier is picked */{const TR={...(STO.wallet.subtiers||{})};if(x.tier)TR[IE.k]=x.tier;STO.wallet.subtiers=TR}STO.wallet.updated_at=NOW();saveS();IE.o=false;ieDraw();render();ieClose();return}
 if(IE.g=='loy'){const X=IEX('loy',IE.k),d=IE.d;if(X){const v=d.bal===''||d.bal==null?null:Math.max(0,Math.round(+d.bal)||0);const b0=X.bal;if(v==null)delete X.bal;else X.bal=v;if(X.bal!==b0)X.updated_at=NOW();STO.wallet.updated_at=NOW();saveS()}IE.o=false;ieDraw();render();ieClose();return}const X=INST(IE.g,IE.k);if(X){const d=IE.d,j0=JSON.stringify(X);IEF[IE.g].forEach(f=>{let v=d[f];if(typeof v=='string')v=v.trim();if(f=='own'&&v!='joint')v=null;if(f=='bal')v=v===''||v==null?null:(isFinite(+v)&&+v>=0?Math.round(+v*100)/100:null);if(f=='txm')v=v===''||v==null?null:Math.max(0,Math.round(+v)||0);if(Array.isArray(v)&&!v.length)v=null;if(v==null||v==='')delete X[f];else X[f]=v});if(JSON.stringify(X)!=j0)X.updated_at=NOW();/* per-item edit time: sync merges list items newest-wins (wxPick) */
  if((IE.g=='brokerage'||IE.g=='banks')&&Object.keys(IE.lk).length){const km={...(STO.wallet.kmap||{})};Object.entries(IE.lk).forEach(([id,on])=>{if(on)km[id]=IE.k;else if(km[id]==IE.k||!km[id])km[id]='-'});STO.wallet.kmap=km}
  STO.wallet.updated_at=NOW();saveS()}IE.o=false;ieDraw();render();ieClose()}
{const act=t=>{if(t.matches('[data-ied]')){const[g,...r]=t.dataset.ied.split('|'),k=r.join('|'),X=IEX(g,k);if(!X&&g!='svc')return;const d={};(IEF[g]||[]).forEach(f=>{if(X&&X[f]!=null)d[f]=Array.isArray(X[f])?[...X[f]]:X[f]});if(g=='brokerage'&&!d.types){const a=X.acct||String(X.i).split(' · ')[1];if(a)d.types=[a]}if(g=='svc'){if(!d.tier){const t0=(STO.wallet.subtiers||{})[k];if(t0)d.tier=t0}const tier=subTiers(k).find(z=>z.k==d.tier)||subTier(k);if(X&&X.price!=null&&X.price!=='')d.mo=X.price;else if(tier&&tier.per==='year'&&d.mo!=null&&d.mo!=='')d.mo=Math.round(+d.mo*12*100)/100}Object.assign(IE,{o:true,g,k,d,lk:{},from:t});ieDraw();document.querySelector('#iew [data-ief=bal],#iew [data-ief=nick],#iew [data-ief=mo],#iew [data-ief=plan]')?.focus();return}
  if(t.matches('[data-iex]'))return ieClose();
  if(t.dataset.ieopt!=null){const[f,v]=t.dataset.ieopt.split(':');if(f=='tier'){if(IE.d.tier!==v){IE.d.tier=v;IE.d.mo='';delete IE.d.price}}else IE.d[f]=IE.d[f]==v&&f!='own'?null:v;ieDraw();document.querySelector(`#iew [data-ieopt="${f}:${v}"]`)?.focus();return}
  if(t.dataset.ietype!=null){const v=t.dataset.ietype,c=IE.d.types||[];IE.d.types=c.includes(v)?c.filter(x=>x!=v):[...c,v];ieDraw();document.querySelector(`#iew [data-ietype="${CSS.escape(v)}"]`)?.focus();return}
  if(t.matches('[data-iecrm]')){IE.o=false;ieDraw();wRm(IEG[IE.g]||IE.g,IE.k);document.querySelector('[data-wiz]')?.focus();return}
  if(t.matches('[data-iesave]'))return ieSave()};
 document.addEventListener('click',e=>{if(e.target.closest('.rmx'))return;const t=e.target.closest('[data-ied],[data-iex],[data-ieopt],[data-ietype],[data-iecrm],[data-iesave]');if(t&&(!t.matches('[data-ied]')||!IE.o)){e.preventDefault();e.stopImmediatePropagation();act(t)}},true);
 document.addEventListener('input',e=>{const f=e.target.dataset?.ief;if(f&&e.target.closest('#iew'))IE.d[f]=e.target.value},true);
 document.addEventListener('change',e=>{const f=e.target.dataset?.ief;if(f&&e.target.closest('#iew')&&e.target.matches('select'))IE.d[f]=e.target.value},true);
 document.addEventListener('change',e=>{const id=e.target.dataset?.ielk;if(id==null||!e.target.closest('#iew'))return;e.stopPropagation();IE.lk[id]=e.target.checked;const f=document.activeElement?.dataset?.ielk;ieDraw();if(f)document.querySelector(`#iew [data-ielk="${CSS.escape(f)}"]`)?.focus()},true);
 document.addEventListener('keydown',e=>{if(!IE.o){const t=e.target.closest?.('[data-ied]');if(t&&(e.key=='Enter'||e.key==' ')&&e.target==t){e.preventDefault();e.stopImmediatePropagation();act(t)}return}if(e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();ieClose();return}if(e.key=='Enter'&&e.target.matches('#iew input:not([type=checkbox])')){e.preventDefault();ieSave()}},true)}
/* Card settings popup (Andrew 2026-10-30): tapping a held card on Accounts opens this, not the card profile. Same modal pattern as the Accounts wizard.
   Cardholders = 1 primary + STO.wallet.addl[id]; fee = paid, or covered (STO.wallet.feecov[id]). Both feed effFee, so Per Your Terms uses them. */
const CS={o:false,id:null,k:null,h:1,fc:null,lk:{},from:null};
/* Credit limit (Andrew 2026-11-04): a card linked to a Kubera credit-card debt takes the limit from Kubera when the provider reports available
   credit (limit = amount owed + headroom, so it is derived, never guessed); otherwise the limit is a number the user types here, kept in
   STO.wallet.cardlim {card id: amount} and synced like the rest of the wallet. */
const kubCardLim=k=>{if(typeof kubOn!='function'||!kubOn())return null;const L=kubMap(KUB.d.items||[],kubTiles(),STO.wallet.kmap).by[k];if(!L||!L.length)return null;
 const xs=L.filter(it=>it.limit!=null&&it.limit>0);if(!xs.length)return null;
 const v=xs.reduce((a,it)=>a+it.limit,0),up=xs.map(it=>it.updated).filter(Boolean).sort()[0];return {v,up};};
function csHTML(){const c=C[BYID0[CS.id]];if(!c)return '';const fee=c.fee==null?'—':'$'+c.fee.toLocaleString(),ex=CS.h-1;
 const exl=c.add==null?(ex?`<p class="mute csnote" data-csnote>Extra-card fee not on record for this card, so ${ex} additional card${ex==1?'':'s'} add nothing to its cost.</p>`:''):`<p class="mute csnote">Extra-card fee: ${c.add==0?'$0':'$'+c.add+'/yr each'}${ex&&c.add?' · '+ex+' × $'+c.add+' = $'+(ex*c.add)+'/yr':''}</p>`;
 const opt=(v,l)=>{const on=v=='pay'?!CS.fc:!!CS.fc;return `<button type=button class="cso${on?' on':''}" data-csfc=${v} role=radio aria-checked=${on}>${l}</button>`};
 return `<div id=csbg></div><div id=cset role=dialog aria-modal=true aria-labelledby=csh><div class=wzhd><span class=wzst>${esc(c.i)}</span><h3 id=csh>${esc(c.n)}</h3><button type=button class=wzx data-csx aria-label="Close without changes" title="Close">&#x2715;</button></div>
 <div class=wzbd><div class=csrow><span class=csl id=cshl>Number of cardholders<small class=mute>Primary + additional cards</small></span><span class=cstep role=group aria-labelledby=cshl><button type=button data-csh=-1 aria-label="Fewer cardholders" ${CS.h<=1?'disabled':''}>−</button><output data-csn aria-live=polite>${CS.h}</output><button type=button data-csh=1 aria-label="More cardholders" ${CS.h>=10?'disabled':''}>+</button></span></div>${exl}
 ${(()=>{if(c.fee===0)return '';const der=feeCoverDerived(c.id);if(der){CS.fc=CS.fc||'bank';return `<div class=csrow><span class=csl>Annual fee<small class=mute>List ${fee}</small></span><span class=ieval>$0 <span class=t>${esc(der.tag)}</span></span></div><p class="mute csnote">Fee covered by ${esc(der.label)} (up to $${Math.round(der.save)}) — derived from your Accounts, not asked.</p>`;}
  return `<div class=csrow><span class=csl id=csfl>Do you pay the annual fee?<small class=mute>Annual fee ${fee}</small></span><span class="csopt" role=radiogroup aria-labelledby=csfl>${opt('pay','Yes')}${opt('cov','No')}</span></div>`
   +(c.fee!==0&&CS.fc&&CS.fc!='pay'?`<div class=csrow><span class=csl id=cswl>Who covers it?</span><span class="csopt cswho" role=radiogroup aria-labelledby=cswl>${Object.entries(FCL).filter(([k])=>k=='bank'||k=='fy'||k==CS.fc).map(([k,l])=>`<button type=button class="cso${CS.fc==k?' on':''}" data-csfc=${k} role=radio aria-checked=${CS.fc==k}>${l}</button>`).join('')}</span></div><p class="mute csnote">A covered fee is not counted as a cost in Per Your Terms (ESTIMATE).</p>`:'');})()}
 <div class=csrow><label class=csl for=cs-op>Account opened<small class=mute>Optional</small></label><input id=cs-op class=csin data-csop type=date value="${esc(CS.op||'')}" placeholder="—"></div>${c.fee>0?`<div class=csrow><label class=csl for=cs-rn>Renewal date<small class=mute>Optional · when the annual fee next bills</small></label><input id=cs-rn class=csin data-csrn type=date value="${esc(CS.rn||'')}" placeholder="—"></div>`:''}${(()=>{const K=kubCardLim(CS.k);/* linked card: Kubera's own figure, read-only */return K?`<div class=csrow><span class=csl>Credit limit<small class=mute>Amount owed plus available credit, from Kubera${K.up?' · updated '+esc(ieDate(K.up)):''}</small></span><span class=ieval>${esc(kubFmt(K.v,'CAD'))}</span></div>`:`<div class=csrow><label class=csl for=cs-lim>Credit limit<small class=mute>Optional · used for utilisation</small></label><input id=cs-lim class=csin data-cslim type=number min=0 step=100 inputmode=numeric value="${esc(CS.lim??'')}" placeholder="—"></div>`})()}${typeof kubOn=='function'&&kubOn()?ieLkB(CS.k,CS.lk,true):''}<p class=cslinks><button type=button class=lnk data-csview>View card details</button></p></div>
 <div class=wzft><button type=button class="btn2 csrm" data-csrm>Remove card</button><span class=csgap></span><button type=button class=btn2 data-csx>Cancel</button><button type=button class=btn data-cssave>Save</button></div></div>`}
function csDraw(){let h=document.querySelector('#csw');if(!CS.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='csw';document.body.append(h)}h.innerHTML=csHTML();document.body.classList.add('wzopen')}
function csOpen(id,from){const ck=from&&from.dataset&&from.dataset.ck;Object.assign(CS,{o:true,id,k:ck&&INST('cards',ck)?ck:IKEY('cards',(STO.wallet.cards||[]).find(x=>x.id==id)),h:1+ADDL(id),fc:FEECOV(id),lk:{},from});CS.rn=(INST('cards',CS.k)||{}).renew||'';CS.op=(INST('cards',CS.k)||{}).opened||'';CS.lim=(STO.wallet.cardlim||{})[id]??'';csDraw();document.querySelector('#cset [data-cssave]')?.focus()}
document.addEventListener('input',e=>{if(!e.target.matches?.('#cset [data-csrn],#cset [data-cslim],#cset [data-csop]'))return;if(e.target.matches('[data-csop]'))CS.op=e.target.value;else if(e.target.matches('[data-csrn]'))CS.rn=e.target.value;else CS.lim=e.target.value});
function csClose(){CS.o=false;csDraw();const t=document.querySelector(`[data-ck="${CSS.escape(CS.k||'')}"]`)||document.querySelector(`[data-cset="${CSS.escape(CS.id||'')}"]`)||CS.from;if(t&&t.isConnected)t.focus()}
{const act=t=>{if(t.matches('[data-cset]')&&!CS.o)return csOpen(t.dataset.cset,t);if(t.matches('[data-csx]')||t.id=='csbg')return csClose();
  if(t.dataset.csh!=null){CS.h=Math.max(1,Math.min(10,CS.h+ +t.dataset.csh));csDraw();(document.querySelector(`#cset [data-csh="${t.dataset.csh}"]:not([disabled])`)||document.querySelector('#cset [data-csh]:not([disabled])'))?.focus();return}
  if(t.dataset.csfc!=null){const v=t.dataset.csfc;CS.fc=v=='pay'?null:v=='cov'?(CS.fc&&CS.fc!='pay'?CS.fc:'bank'):v;csDraw();document.querySelector(`#cset [data-csfc=${v}]`)?.focus();return}
  if(t.matches('[data-cssave]')){const id=CS.id,X=INST('cards',CS.k);if(X){const j0=JSON.stringify(X);delete X.nick;delete X.holders;/* Andrew 2026-11-02: optional card renewal date (YYYY-MM-DD) on the held instance */const rn=CS.rn||'';if(rn)X.renew=rn;else delete X.renew;/* B19: Account opened (YYYY-MM-DD) */const op=CS.op||'';if(op)X.opened=op;else delete X.opened;if(JSON.stringify(X)!=j0)X.updated_at=NOW()}STO.wallet.addl={...(STO.wallet.addl||{}),[id]:CS.h-1};const f={...(STO.wallet.feecov||{})};if(CS.fc)f[id]=CS.fc;else delete f[id];STO.wallet.feecov=f;/* Andrew 2026-11-04: the typed credit limit (blank clears it) */{const cl={...(STO.wallet.cardlim||{})},v=String(CS.lim??'').trim(),n=v===''?null:+v;if(n!=null&&isFinite(n)&&n>0)cl[id]=Math.round(n);else delete cl[id];STO.wallet.cardlim=cl}if(Object.keys(CS.lk).length){const km={...(STO.wallet.kmap||{})};Object.entries(CS.lk).forEach(([i,on])=>{if(on)km[i]=CS.k;else if(km[i]==CS.k||!km[i])km[i]='-'});STO.wallet.kmap=km}STO.wallet.updated_at=NOW();saveS();CS.o=false;csDraw();render();csClose();return}
  if(t.matches('[data-csview]')){const c=C[BYID0[CS.id]];CS.o=false;csDraw();if(c)openM(c);return}
  if(t.matches('[data-csrm]')){const id=CS.id;CS.o=false;csDraw();if((STO.wallet.cards||[]).filter(x=>x.id==id).length<=1){const a={...(STO.wallet.addl||{})},f={...(STO.wallet.feecov||{})},cl={...(STO.wallet.cardlim||{})};delete a[id];delete f[id];delete cl[id];STO.wallet.addl=a;STO.wallet.feecov=f;STO.wallet.cardlim=cl}wRm('cards',CS.k||id);document.querySelector('[data-wiz]')?.focus()}};
 document.addEventListener('change',e=>{const id=e.target.dataset?.ielk;if(id==null||!e.target.closest('#csw'))return;e.stopPropagation();CS.lk[id]=e.target.checked;csDraw();document.querySelector(`#csw [data-ielk="${CSS.escape(id)}"]`)?.focus()},true);
 const SEL='[data-cset],[data-csx],#csbg,[data-csh],[data-csfc],[data-cssave],[data-csview],[data-csrm]';
 document.addEventListener('click',e=>{if(e.target.closest('.rmx'))return;const t=e.target.closest(SEL);if(t&&!t.disabled){e.preventDefault();e.stopImmediatePropagation();act(t)}},true);
 document.addEventListener('keydown',e=>{if(!CS.o){const t=e.target.closest?.('[data-cset]');if(t&&(e.key=='Enter'||e.key==' ')&&e.target==t){e.preventDefault();e.stopImmediatePropagation();act(t)}return}
  if(e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();csClose();return}
  if(e.key=='Tab'){const f=[...document.querySelectorAll('#cset button:not([disabled])')];if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i==f.length-1){e.preventDefault();f[0].focus()}}},true)}
if(CARDS_ONLY){renderWallet=renderWalletSimple;VIEWS.wallet=renderWalletSimple}
/* G3 category icons: one inline line-icon set drawn for PerTheTerms (24px grid, 1.8 stroke, currentColor). Original artwork, no third-party set; noted in images/logos/manifest.json. */
/* Spending (Andrew 2026-10-29): the monthly spend inputs, split out of Accounts. Same store (W.spend, saved by the shared data-sp input handler), same calculations. */
function spendingView(){if(CARDS_ONLY)mspMigrate();$('#view').innerHTML=`<div class="prof pstack wsimple"><div class=vhead><h2>Spending${CARDS_ONLY?` <button type=button class=wplus data-spw aria-haspopup=dialog aria-label="Add a spending category" title="Add a spending category"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button>`:''}</h2></div><p class=lead>What you spend each month. Used to value your cards in <button type=button class=lnk data-s=wallet>Accounts</button>. It stays on this device. Leave blank for $0.</p>${upPromptHTML('wallet')}
 ${CARDS_ONLY?SECORD([spSecHTML('living'),spSecHTML('lifestyle'),MERCH.length?`<section class="psec acs${ACO('merch')?' acol':''}" id=pw-merch>${ACH('merch','pw-merch',USN('pw-merch'),MTILES().filter(t=>mShown().includes(t.id)).length,1,'sp:store')}<p class=mute>Some cards earn more at one store. Enter what you spend there each month; it is taken out of its general category above, never counted twice.</p>${mShown().includes('st_costco_in_store')&&costcoNote()?`<p class="mute spnote" id=costco-note>${esc(costcoNote())}</p>`:''}<div class="tiles ptiles spg" id=pw-merch-t${ACO('merch')?' hidden':''}>${ORD('merch',MTILES().filter(t=>mShown().includes(t.id)),t=>t.id).map(t=>{const sp=t.id.includes('~'),v=mspGet(t.id);return stile({k:t.id,name:t.n,amt:v,ico:t.lg,on:+v>0,
 attrs:`data-ok="${t.id}" data-merch="${t.k}" data-store="${t.id}" data-sped="${sp?'msp':'sp'}|${esc(t.id)}" ${sp?`data-msp="${t.id}"`:`data-sp="${t.id}"`} aria-haspopup=dialog aria-label="${esc(t.n)}, ${+v>0?$$(+v)+' a month':'set monthly spend'} (part of ${esc(CN[t.p]||t.p)})" title="${esc(t.n)}"`,
 rm:`data-msrm="${t.id}"`})}).join('')}</div></section>`:'',gcSecHTML()],'spendSectionOrder'):`<section class=psec id=pw-spend><h3>Monthly spend</h3>${spendHTML()}</section>`}</div>`}
/* Living / Lifestyle (Andrew 2026-11-05): one section per spending group from the superset (D.spcat). Card-reward categories (W.spend, priced in Per Your Terms) keep the plain card-category mark (.sptile);
   household bills paid from a bank (wallet.bspend, never priced) use the bank-spend chip (.sptile.bsptile), so the two read apart at a glance. One drag order per section (wallet.order.spend / .life). */
function spSecHTML(g){const id=g=='living'?'pw-spend':'pw-life',og=g=='living'?'spend':'life',V=BSPV();
 const L=[...credSpendTiles().filter(t=>SPGRP(t.k)==g).map(t=>({...t,ok:t.k,b:0})),...BSPON().filter(x=>x[2]==g).map(([k,n])=>({k,n,ok:'bsp_'+k,b:1}))],T=ORD(og,L,t=>t.ok);
 return `<section class="psec acs${ACO(og)?' acol':''}" id=${id}>${ACH(og,id,USN(id),T.length,1,'sp:'+g)}<div class="tiles ptiles wsp spg" id=${id}-t${ACO(og)?' hidden':''}>${T.map(t=>{const amt=t.b?(V[t.k]||0):(W.spend[t.k]||0);
  return stile({k:t.ok,name:t.n,amt,bank:!!t.b,ico:t.ok,on:+amt>0,
   attrs:`data-ok="${esc(t.ok)}" data-sped="${t.b?'bsp':'sp'}|${esc(t.k)}" ${t.b?`data-bsp=${esc(t.k)}`:`data-sp=${esc(t.k)}`} aria-haspopup=dialog aria-label="${esc(t.n)}, ${+amt>0?$$(+amt)+' a month':'set monthly spend'}"${t.b?' title="Paid from a bank account: recorded, never earns card rewards"':''}`,
   rm:t.b?`data-bsprm=${t.k}`:`data-sprm="${t.k}"`})}).join('')||'<p class=mute>None yet. Tap <b>+</b> to add.</p>'}</div></section>`}
/* B26 Gift Cards (Andrew 2026-11-05: moved from Accounts to Spending, after Banking; data stays in wallet.gcards). Same tile + RMX ✕ + settings popout
   (IE editor, data-ied=gc|i) as Subscriptions; GiftCash rate shown as info; + opens the Accounts wizard at its Gift Cards step (data-wiz=gc). */
function gcSecHTML(){const gc=ORD('gcards',(STO.wallet.gcards||[]).filter(x=>x&&x.i),x=>x.i).map(x=>{const b=x.bal!=null&&x.bal!==''&&isFinite(+x.bal),g=GCBY(x.r);return btile({k:x.r,name:x.r,foot:b?$$(+x.bal)+(x.l4?' · ••'+esc(x.l4):''):(x.l4?'••'+esc(x.l4):g?esc(GCRT(g.cb)):'—'),attrs:`data-ok="${esc(x.i)}" data-ied="gc|${esc(x.i)}" role=button aria-haspopup=dialog aria-label="${esc(x.r)} gift card settings"`}).replace(/<\/div>$/,`${RMX(`data-wrm=gcards data-wk="${esc(x.i)}"`,x.r+' gift card')}</div>`)});
 return `<section class="psec acs${ACO('gc')?' acol':''}" id=pw-gc data-aws=gcards>${ACH('gc','pw-gc',USN('pw-gc'),gc.length,1,'gc')}<div class="tiles ptiles" id=pw-gc-t${ACO('gc')?' hidden':''}>${gc.join('')||'<p class=mute>None yet. Tap <b>+</b> and pick Gift Cards.</p>'}</div></section>`}
/* Spending categories (Andrew 2026-10-30, revised: "they can also be 'x'ed out like optional categories"): the 5 default tiles (WSP) are preloaded but removable with the same X; a removed default is kept in STO.wallet.spoff and can be re-added from the picker. The + button beside the Spending heading (same pattern as Accounts) opens a picker (same dialog and tile style as the Accounts + wizard) with every other category the engine prices (CN, minus stores, which have their own section). Picked ones (STO.wallet.spx) show after the core tiles with an X; removing one clears its spend. No toggles for unpicked categories anywhere.
   credSpendTiles (Andrew 2026-11-05): one source of truth for Credit Cards spend — Spending › #pw-spend tiles AND My Wallet › Rewards routing maximizer rows (order from wallet.order.spend, removals spoff, adds spx, amounts W.spend). */
const spOff=()=>(STO.wallet.spoff||[]).filter(k=>WSP.some(w=>w[0]==k)),SPOPT=()=>[...spOff(),...Object.keys(CN).filter(k=>!k.startsWith('st_')&&!WSP.some(w=>w[0]==k))],spN=k=>(WSP.find(w=>w[0]==k)||[])[1]||(k=='trav'?'Travel':CN[k]||k),spxOn=()=>(STO.wallet.spx||[]).filter(k=>CN[k]&&!k.startsWith('st_')&&!WSP.some(w=>w[0]==k));
const credSpendTiles=()=>ORD('spend',[...WSP.filter(([k])=>!spOff().includes(k)).map(([k,n])=>({k,n,x:0})),...spxOn().map(k=>({k,n:spN(k),x:1}))],t=>t.k).map(t=>({...t,amt:+(W.spend[t.k]||0)}));
const SPW={o:false,step:1,sel:new Set(),ms:new Set(),from:null};
/* Spending + (Andrew 2026-11-05): screen 1 = ONE of the four groups (single tap: Living, Lifestyle, Retailers, Gift Cards); screen 2 = multiselect inside that group, what you already track shown checked.
   Living / Lifestyle list the superset (D.spcat): card-reward categories (plain mark) and bank-paid bills (.bsptile chip). Gift Cards hands over to the Accounts wizard's gift card step (same store, wallet.gcards). */
const SPGS=()=>[['living','Living','groc'],['lifestyle','Lifestyle','fly'],...(MTILES().length?[['store','Retailers','online']]:[]),['gc','Gift Cards','wgc']],
 SPGC=g=>SPC.filter(c=>c.g==g&&(c.kind=='bank'||CN[c.k])),spOnK=()=>credSpendTiles().map(t=>t.k);
function spwDraw(){let h=document.querySelector('#spww');if(!SPW.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='spww';document.body.append(h)}const two=SPW.step==2,T=SPW.type,GN=(SPGS().find(x=>x[0]==T)||[])[1]||'';
 const cnt=g=>g=='store'?MTILES().length+' store'+(MTILES().length==1?'':'s'):g=='gc'?GCL().length+' retailer'+(GCL().length==1?'':'s'):SPGC(g).length+' categor'+(SPGC(g).length==1?'y':'ies');
 const body=!two?`<div class="tiles ptiles wzt" role=radiogroup aria-label="Which spending group">${SPGS().map(([k,n,ic])=>btile({ico:ic,on:false,attrs:`data-spwt=${k} role=radio aria-checked=false`,name:n,foot:esc(cnt(k)),mark:''})).join('')}</div>`
  :T=='store'?`<div class="tiles ptiles wzs wzm spg">${MTILES().map(t=>{const sl=SPW.ms.has(t.id);return btile({k:t.lg,name:t.n,on:sl,attrs:`data-spws="${t.id}" role=checkbox aria-checked=${sl} aria-label="${esc(t.n)}" title="${esc(t.n)}"`,foot:'',mark:sl?'✓':''})}).join('')}</div>`
  :`<p class="mute spkey"><span class="spk spkc"></span>Earns card rewards <span class="spk spkb"></span>Paid from a bank</p><div class="tiles ptiles wzs spg">${SPGC(T).map(c=>{if(c.kind=='bank'){const sl=SPW.bs.has(c.k);return btile({ico:'bsp_'+c.k,on:sl,attrs:`data-spwb=${c.k} role=checkbox aria-checked=${sl}`,name:c.n,foot:sl?'✓ Selected':'Paid from a bank',mark:''}).replace('class="btile','class="btile bsptile')}const k=c.k,sl=SPW.sel.has(k);return btile({ico:k,on:sl,attrs:`data-spwk="${k}" role=checkbox aria-checked=${sl}`,name:spN(k),foot:sl?'✓ Selected':esc((CC[k]||0)+' card'+((CC[k]||0)==1?'':'s')),mark:''})}).join('')}</div>`;
 const ft=two?`<button type=button class=btn2 data-spwback>Back</button><button type=button class=btn data-spwadd>Done</button>`:`<button type=button class=btn2 data-spwx>Cancel</button>`;
 h.innerHTML=`<div id=wzbg data-spwx></div><div id=wiz role=dialog aria-modal=true aria-labelledby=spwh><div class=wzhd><span class=wzst>Step ${SPW.step} of 2 · Spending</span><h3 id=spwh>${!two?'What do you want to add?':esc(GN)}</h3><button type=button class=wzx data-spwx aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft>${ft}</div></div>`;document.body.classList.add('wzopen')}
/* apply screen 2 of a Living / Lifestyle pick: only that group's keys change. Card: a preloaded default (WSP) off -> wallet.spoff, an added one -> wallet.spx. Bank: preloaded (BSPDEF) off -> wallet.bspoff, added -> wallet.bspx. Unpicking clears that amount. */
function spwApplyG(g){const isD=k=>WSP.some(w=>w[0]==k),on=new Set(spOnK()),V=BSPV(),w=STO.wallet;let off=new Set(w.spoff||[]),x=new Set(w.spx||[]),boff=new Set(w.bspoff||[]),bx=new Set(w.bspx||[]);
 SPGC(g).forEach(c=>{const k=c.k;if(c.kind=='bank'){const sl=SPW.bs.has(k);if(BSPDEF.has(k))sl?boff.delete(k):boff.add(k);else sl?bx.add(k):bx.delete(k);if(!sl)delete V[k];return}
  const sl=SPW.sel.has(k);if(sl){off.delete(k);if(!isD(k))x.add(k)}else{if(isD(k))off.add(k);else x.delete(k);if(on.has(k))delete W.spend[k]}});
 w.spoff=[...off];w.spx=[...x];w.bspoff=[...boff];w.bspx=[...bx];w.updated_at=NOW()}
/* Spending + is a 2-step window (Andrew 2026-10-30): 1 spending categories, 2 retail stores (logo-only tiles). Stores shown in the Stores section = STO.wallet.mshow (all stores until first saved); unpicking a store clears its spend. */
const mShown=()=>{const all=MTILES().map(t=>t.id),m=STO.wallet.mshow;return Array.isArray(m)?all.filter(i=>m.includes(i)):all};
function spwClose(){SPW.o=false;spwDraw();(SPW.from&&SPW.from.isConnected?SPW.from:document.querySelector('[data-spw]'))?.focus()}
{const act=t=>{if(t.matches('[data-spw]')){Object.assign(SPW,{o:true,step:1,sel:new Set(spOnK()),ms:new Set(mShown()),bs:new Set(BSPON().map(x=>x[0])),from:t});const k=t.dataset.spw;if(k=='living'||k=='lifestyle'||k=='store'&&MTILES().length){SPW.type=k;SPW.step=2;spwDraw();document.querySelector('#spww [data-spws],#spww [data-spwb],#spww [data-spwk]:not([aria-disabled=true])')?.focus();return}/* Andrew 2026-11-03: a Spending subsection + opens straight at step 2, like Accounts */spwDraw();document.querySelector('#spww [data-spwt]')?.focus();return}
  if(t.matches('[data-spwx]'))return spwClose();
  if(t.matches('[data-spwt]')){if(t.dataset.spwt=='gc'){spwClose();document.querySelector('[data-wiz=gc]')?.click();return}SPW.type=t.dataset.spwt;SPW.step=2;spwDraw();document.querySelector('#spww [data-spws],#spww [data-spwk]:not([aria-disabled=true])')?.focus();return}
  if(t.matches('[data-spwback]')){SPW.step=1;spwDraw();document.querySelector(`#spww [data-spwt=${SPW.type}]`)?.focus();return}
  if(t.matches('[data-spws]')){const k=t.dataset.spws;SPW.ms.has(k)?SPW.ms.delete(k):SPW.ms.add(k);spwDraw();document.querySelector(`#spww [data-spws="${k}"]`)?.focus();return}
  if(t.matches('[data-spwb]')){const k=t.dataset.spwb;SPW.bs.has(k)?SPW.bs.delete(k):SPW.bs.add(k);spwDraw();document.querySelector(`#spww [data-spwb="${k}"]`)?.focus();return}
  if(t.matches('[data-spwk]')){if(t.getAttribute('aria-disabled')=='true')return;const k=t.dataset.spwk;SPW.sel.has(k)?SPW.sel.delete(k):SPW.sel.add(k);spwDraw();document.querySelector(`#spww [data-spwk="${k}"]`)?.focus();return}
  if(t.matches('[data-spwadd]')){/* Done applies every pick made in this window (Back keeps them): stores, Living, Lifestyle; an untouched group is a no-op */MTILES().forEach(x=>{if(!SPW.ms.has(x.id)&&+mspGet(x.id)>0)mspSet(x.id,0)});if(MTILES().length)STO.wallet.mshow=[...SPW.ms];spwApplyG('living');spwApplyG('lifestyle');saveS();SPW.o=false;spwDraw();const y=scrollY;render();scrollTo(0,y);document.querySelector(`[data-spw="${SPW.type}"]`)?.focus();return}
  if(t.matches('[data-msrm]')){const k=t.dataset.msrm;if(+mspGet(k)>0)mspSet(k,0);STO.wallet.mshow=mShown().filter(x=>x!=k);saveS();const y=scrollY;render();scrollTo(0,y);document.querySelector('[data-spw]')?.focus();return}
  if(t.matches('[data-bsprm]')){const k=t.dataset.bsprm;if(BSPDEF.has(k))STO.wallet.bspoff=[...new Set([...(STO.wallet.bspoff||[]),k])];STO.wallet.bspx=(STO.wallet.bspx||[]).filter(x=>x!=k);delete BSPV()[k];STO.wallet.updated_at=NOW();saveS();const y=scrollY;render();scrollTo(0,y);document.querySelector('[data-spw]')?.focus();return}
  if(t.matches('[data-sprm]')){const k=t.dataset.sprm;if(WSP.some(w=>w[0]==k))STO.wallet.spoff=[...new Set([...(STO.wallet.spoff||[]),k])];STO.wallet.spx=(STO.wallet.spx||[]).filter(x=>x!=k);W.spend[k]=0;delete W.spend[k];saveS();const y=scrollY;render();scrollTo(0,y);document.querySelector('[data-spw]')?.focus()}};
 const SEL='[data-spw],[data-spwx],[data-spwk],[data-spwb],[data-bsprm],[data-spwt],[data-spwadd],[data-sprm],[data-msrm],[data-spwnext],[data-spwback],[data-spws]';
 document.addEventListener('click',e=>{const t=e.target.closest(SEL);if(t){e.preventDefault();e.stopImmediatePropagation();act(t)}},true);
 document.addEventListener('keydown',e=>{if(SPW.o&&e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();spwClose();return}const t=e.target.closest?.('[data-spwk],[data-spwt]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();act(t)}},true)}
VIEWS.spending=spendingView;
/* Subscriptions, cards-only (Andrew 2026-10-29): a tile picker over the services on record (D.subs + D.subcat). Tap a tile to mark it as one you have; same store as the full build (STO.wallet.services). */
/* G3 (Andrew 2026-10-29): brand tiles for Subscriptions and institutions. Neutral tile, same footprint as a card tile but no card cues (no gradient, chip or art). Logo = unaltered official icon from images/logos (manifest.json records source URL + fetch date); monogram when none is on file. */
const LOGOS=D.logos||{},LOGOK=D.logok||{},LGI=new Map(Object.keys(D.logos||{}).map(k=>[INSTKEY(k),k])),LGR=(k,n)=>LOGOS[k]?k:LGI.get(INSTKEY(k))||LGI.get(INSTKEY(n))||k;/* one logo per institution: 'Tangerine Bank' / 'DUCA Credit Union' resolve to the library key by INSTKEY */
/* Subscription marks in brand colour (Andrew 2026-11-05). SUBSVG is a full-colour SVG whose fill is the simple-icons brand hex, used where the raster on file is a single tone. SUBPLATE is an ink mark with no light field of its own: a white plate in dark mode, so it still reads. */
const SUBSVG={applemusic:'applemusic.svg',appleone:'appleone.svg'},SUBPLATE=new Set(['appleone','sportsnetplus','uberone','xsub','ghcopilot','midjourney','starz']);
const logoImg=(k0,n,color)=>{const k=LGR(k0,n),file=color&&SUBSVG[k]?SUBSVG[k]:LOGOS[k];return IMGB&&file?(color?`<img class=lgc src="${IMGB}logos/${file}" alt="${esc(n)} logo" width=40 height=40 loading=lazy>`:`<img class="lg lg-${(LOGOK[k]||['a'])[0]}" style="--lgk:${(LOGOK[k]||[0,1])[1]}" src="${IMGB}logos/${file}" alt="${esc(n)} logo" width=40 height=40 loading=lazy>`):`<b aria-hidden=true>${esc((n||'?').replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase())}</b>`};
const LOYC=D.loyc||{},LOGAR=D.logar||{},lcS=o=>{const k=LGR(o.k,o.name),c=o.lc&&LOYC[k];if(!o.lc)return'';
 /* logo size by aspect ratio (Andrew 2026-11-03): every mark gets the same visual area (45% of the logo box, box ratio 1.5); wide wordmarks go wide and short, square icons smaller and taller; neither side exceeds the box */
 /* trimmed content box, then w x h (fractions of the panel) with the same visual area for every mark (30% of the panel, panel ratio 1.5); wide wordmarks wide and short,
    square icons smaller and taller; caps keep a margin. The img is sized and shifted so the trimmed mark fills exactly w x h (overflow clipped by the panel). */
 const g=LOGAR[k]||[1,0,0,1,1],a=g[0],B=1.5,MW=.86,MH=.78;let w=Math.sqrt(.3*a/B),h=Math.sqrt(.3*B/a);if(w>MW){h*=MW/w;w=MW}if(h>MH){w*=MH/h;h=MH}
 const cw=g[3]-g[1],ch=g[4]-g[2],iw=w/cw,ih=h/ch,f=x=>(x*100).toFixed(2)+'%';
 const v=`--lw:${f(iw)};--lh:${f(ih)};--lx:${f(.5-w/2-g[1]*iw)};--ly:${f(.5-h/2-g[2]*ih)}`;return c?` blc${c[2]?' blcd':''}" style="--lcb:${c[0]};--lcf:${c[1]};${v}`:`" style="${v}`}/* loyalty tiles in the program's brand colour (Andrew 2026-11-03); colours in images/logos/manifest.json 'brand' */;
const btile=o=>{const plate=o.sub&&SUBPLATE.has(LGR(o.k,o.name));return `<div class="btile${o.ico?'':' bbrand'}${o.on?' on':''}${o.lc?' bloy':''}${o.sub?' bsub':''}${plate?' lgp':''}${lcS(o)}" tabindex=0 ${o.attrs}>${o.ico?`<span class="blogo bico">${cico(o.ico)}</span>`:`<span class=blogo>${logoImg(o.k,o.name,!!o.sub)}</span>`}<span class=bn>${esc(o.name)}</span>${o.inc?`<span class=binc>Includes ${esc(o.inc)}</span>`:''}<span class="bf${o.plan!=null?' bf3':''}">${o.plan!=null?`<span class=bpl${o.plan?` title="${esc(o.plan)}"`:''}>${esc(o.plan)}</span><span class=bpr>${CK(o.foot)}</span><i></i>`:CK(o.foot)}</span>${o.sw?`<span class="bsw${o.on?' on':''}" aria-hidden=true><i></i></span>`:o.mark?`<span class=bmk>${CK(esc(o.mark))}</span>`:''}</div>`};
/* bundle contents follow the tier: Stream+ Premium lists Netflix Premium; a rule scoped to other tiers (Prime Student: no DashPass) is left out */
const subIncl=k=>{const t=(subTier(k)||{}).k;return [...new Set((D.cmod||[]).filter(r=>r.effect=='grant_sub'&&r.from_sub==k&&r.sub&&(!r.tiers||t in r.tiers)).map(r=>{const g=r.tiers&&r.tiers[t];return g&&subTiers(r.sub).length>1?subName(r.sub)+' '+tierName(g):subName(r.sub)}))].join(', ')};
/* Tier picker (Andrew 2026-10-29): one tile per service; tap opens a small popup of its tiers (price as sold: /mo, or /yr with the /mo equivalent) and Off.
   Picking a tier makes it the one active tier (wallet.subtiers[k]); the tile shows it. One tier per service by construction. */
const m2=v=>'$'+(Number.isInteger(v)?v:v.toFixed(2));
/* B4 (Andrew 2026-11-01): tiles show one price: the yearly charge for an annual tier, else the monthly one */
const tilePrice=t=>t.p==null?'—':t.per=='year'?`${m2(t.p)}/yr`:`$${t.p.toFixed(2)}/mo`;
function planPick(t){const n=String(t.n||'').replace(/\s*\((annual|monthly|yearly)\)$/i,'');return n+' · '+tilePrice(t)}
const tierPrice=t=>t.p==null?'—':t.per=='year'?`${m2(t.p)}/yr · $${t.mo.toFixed(2)}/mo`:`$${t.p.toFixed(2)}/mo`;
const CADENCE=/^\s*(monthly|annual|annually|yearly|month|year|weekly|quarterly|per month|per year|monthly plan|annual plan)\s*$/i;
/* one footer spec for every Subscriptions tile (Accounts section, + wizard): plan name bottom-left, price bottom-centre; a cadence-only label ('Monthly') is dropped: the price already says /mo or /yr */
const subFoot=(k,on)=>{const T=subTiers(k),t=subTier(k),lo=T.filter(x=>x.mo!=null).sort((a,b)=>a.mo-b.mo)[0],pn=String(t&&t.n||'').replace(/\s*\((annual|monthly|yearly)\)$/i,'');
 return{plan:on&&t&&T.length>1&&!CADENCE.test(pn)?pn:'',foot:on?(t?tilePrice(t):'Active'):(!lo?'—':T.filter(x=>x.mo!=null).length>1?'from $'+lo.mo.toFixed(2)+'/mo':tilePrice(lo))}};
const subPickTile=s=>{const on=(STO.wallet.services||[]).includes(s.k),t=subTier(s.k),{plan,foot}=subFoot(s.k,on);
 return btile({k:s.k,on,sw:1,sub:1,attrs:`data-subpick="${s.k}" role=button aria-haspopup=dialog aria-pressed=${on} aria-label="${esc(s.n)}${on&&t?', '+esc(t.n):''}"`,name:s.n,foot,plan}).replace(/<\/div>$/,on?'</div>':`${RMX(`data-subrm="${s.k}"`,s.n)}</div>`)};
/* Subscriptions x and + (Andrew 2026-10-30): only a NON-active tile has an x; it hides the service from the page (STO.wallet.subhide, this device). The + by the heading opens a picker to add hidden services back. */
const subHid=()=>(STO.wallet.subhide||[]).filter(k=>SUBS.some(s=>s.k==k)&&!(STO.wallet.services||[]).includes(k));
const SBW={o:false,sel:new Set(),from:null};
function sbwDraw(){let h=document.querySelector('#sbww');if(!SBW.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='sbww';document.body.append(h)}
 const L=SUBS.filter(s=>subHid().includes(s.k)).sort((x,y)=>x.n.localeCompare(y.n)),n=SBW.sel.size;
 const body=L.length?`<div class="tiles ptiles wzs">${L.map(s=>{const sl=SBW.sel.has(s.k);return btile({k:s.k,name:s.n,on:sl,sub:1,attrs:`data-sbwk="${s.k}" role=checkbox aria-checked=${sl} aria-label="${esc(s.n)}"`,foot:sl?'✓ Selected':'',mark:''})}).join('')}</div>`:`<p class=mute>Nothing removed. Every subscription is on the page.</p>`;
 h.innerHTML=`<div id=wzbg data-sbwx></div><div id=wiz role=dialog aria-modal=true aria-labelledby=sbwh><div class=wzhd><span class=wzst>Subscriptions</span><h3 id=sbwh>Add subscriptions back</h3><button type=button class=wzx data-sbwx aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class=btn2 data-sbwx>Cancel</button><button type=button class=btn data-sbwadd${n?'':' disabled'}>Add${n?' ('+n+')':''}</button></div></div>`;document.body.classList.add('wzopen')}
{const act=t=>{if(t.matches('[data-sbw]')){Object.assign(SBW,{o:true,sel:new Set(),from:t});sbwDraw();(document.querySelector('#sbww [data-sbwk]')||document.querySelector('#sbww .wzx'))?.focus();return}
  if(t.matches('[data-sbwx]')){SBW.o=false;sbwDraw();(SBW.from&&SBW.from.isConnected?SBW.from:document.querySelector('[data-sbw]'))?.focus();return}
  if(t.matches('[data-sbwk]')){const k=t.dataset.sbwk;SBW.sel.has(k)?SBW.sel.delete(k):SBW.sel.add(k);sbwDraw();document.querySelector(`#sbww [data-sbwk="${k}"]`)?.focus();return}
  if(t.matches('[data-sbwadd]')){STO.wallet.subhide=(STO.wallet.subhide||[]).filter(k=>!SBW.sel.has(k));saveS();SBW.o=false;sbwDraw();const y=scrollY;render();scrollTo(0,y);document.querySelector('[data-sbw]')?.focus();return}
  if(t.matches('[data-subrm]')){const k=t.dataset.subrm;if((STO.wallet.services||[]).includes(k))return;STO.wallet.subhide=[...new Set([...(STO.wallet.subhide||[]),k])];saveS();closeTierPop();const y=scrollY;render();scrollTo(0,y);document.querySelector('[data-sbw]')?.focus()}};
 const SEL='[data-sbw],[data-sbwx],[data-sbwk],[data-sbwadd],[data-subrm]';
 document.addEventListener('click',e=>{const t=e.target.closest(SEL);if(t){e.stopImmediatePropagation();e.preventDefault();act(t)}},true);
 document.addEventListener('keydown',e=>{if(e.key=='Escape'&&SBW.o){SBW.o=false;sbwDraw();return}const t=e.target.closest?.('[data-sbwk]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();act(t)}},true)}
function tierPop(k,anchor){closeTierPop();const S=SVCBY[k]||{},T=subTiers(k),on=(STO.wallet.services||[]).includes(k),cur=on?(subTier(k)||{}).k||'*':'',n=subName(k);
 const row=(v,name,price,tag,title)=>`<button type=button class="tpr${cur==v?' on':''}" role=menuitemradio aria-checked=${cur==v} data-tierpick="${k}|${v}"${title?` title="${esc(title)}"`:''}><span class=tpn>${esc(name)}</span><span class=tpp>${price}</span>${tag&&tag!='CITED'?`<span class=t>${esc(tag)}</span>`:''}</button>`;
 const d=document.createElement('div');d.id='tpop';d.className='tpop';d.setAttribute('role','dialog');d.setAttribute('aria-label',n+' tiers');
 d.innerHTML=`<div class=tph><span class="slogo${SUBPLATE.has(LGR(k,n))?' lgp':''}">${logoImg(k,n,1)}</span>${esc(n)}</div><div role=menu>${T.length?T.map(t=>row(t.k,t.n,tierPrice(t),t.tag,[t.quote,t.note].filter(Boolean).join(' · '))).join(''):row('*','Have it','—','')}${row('','Off','','')}</div>${T.flatMap(t=>(t.ties||[]).map(x=>`<p class=tpnote data-tie="${esc(x.c)}">${esc(x.c=='rogers'?'Rogers':x.c=='bell'?'Bell':x.c)} ${esc(x.plans)}: ${esc(x.b)} · <a href="${esc(x.src)}" target=_blank rel=noopener>Source</a></p>`)).join('')}${S.note?`<p class=tpnote>${esc(S.note)}</p>`:''}${S.src?`<p class=tpsrc><a href="${esc(S.src)}" target=_blank rel=noopener>Source</a>${T[0]?' · read '+esc(T[0].asof):''}</p>`:''}`;
 document.body.append(d);const r=anchor.getBoundingClientRect(),w=d.offsetWidth;
 if(innerWidth>640){d.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+scrollX+'px';d.style.top=r.bottom+6+scrollY+'px'}else d.classList.add('sheet');
 (d.querySelector('.tpr.on')||d.querySelector('.tpr')).focus();tierPop.from=k}
function closeTierPop(){const d=document.getElementById('tpop');if(d)d.remove()}
function tierSet(k,v){const S2=new Set(STO.wallet.services||[]),SS=STO.wallet.substate;STO.wallet.subtiers=STO.wallet.subtiers||{};
 if(v){S2.add(k);if(v!='*')STO.wallet.subtiers[k]=v;if(!CARDS_ONLY)SUBST()[k]='have'}else{S2.delete(k);if(SS&&SS[k]=='have')delete SS[k]}
 STO.wallet.services=[...S2];STO.wallet.updated_at=NOW();closeTierPop();saveS();const y=scrollY;render();scrollTo(0,y);document.querySelector(`[data-subpick="${k}"]`)?.focus()}
function subsPickView(){const hid=subHid(),L=SUBS.filter(s=>!hid.includes(s.k)).sort((x,y)=>x.n.localeCompare(y.n)),n=L.filter(s=>(STO.wallet.services||[]).includes(s.k)).length;
 $('#view').innerHTML=`<div class="prof pstack wsimple"><div class=vhead><h2>Subscriptions <button type=button class=wplus data-sbw aria-haspopup=dialog aria-label="Add a subscription back" title="Add a subscription back"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button></h2></div><p class=lead>Tap the subscriptions you have. Tap again to remove one. It stays on this device.</p>
 <section class="psec acs${ACO('subs')?' acol':''}" id=pw-subs>${ACH('subs','pw-subs','Your subscriptions',n,0,'subs')}<div class="tiles ptiles" id=pw-subs-t${ACO('subs')?' hidden':''}>${L.map(subPickTile).join('')}</div></section></div>`}
/* Loyalty (Andrew 2026-10-29): the programs a person joins (coalition, merchant, travel), on the Subscriptions tile component. Issuer-only card
   currencies (D.pts cat=issuer) stay in the data for valuations but are not listed. Picks live in wallet.points ({i: program name}). */
const loyHas=p=>(STO.wallet.points||[]).some(x=>x.i==p.n||(ptsBy(x.i)||{}).id==p.id);
const loyTile=p=>{const on=loyHas(p);return btile({k:p.id,lc:1,on,sw:1,attrs:`data-loypick="${esc(p.id)}" role=button aria-pressed=${on} aria-label="${esc(p.n)}"`,name:p.n.replace(/ \(Canada\)$/,''),foot:p.cpp!=null?'≈'+p.cpp+'¢/pt':'—'}).replace(/<\/div>$/,on?'</div>':`${RMX(`data-loyrm="${esc(p.id)}"`,p.n)}</div>`)};
/* Loyalty x and + (Andrew 2026-10-31: "same as subscriptions"): only a NON-active tile has an x; it hides the program from the page (STO.wallet.loyhide, this device). The + by the heading opens a picker to add hidden programs back. Same code path as Subscriptions (subHid/SBW). */
const LOYL=()=>PTS.filter(p=>p.cat!='issuer'&&!p.hid&&!/^(aeroplan-estore)$/.test(p.id))/* p.hid = points-programs.csv site_hidden (foreign airlines, 2026-10-30) */;
const loyHid=()=>(STO.wallet.loyhide||[]).filter(id=>LOYL().some(p=>p.id==id&&!loyHas(p)));
const LBW={o:false,sel:new Set(),from:null};
function lbwDraw(){let h=document.querySelector('#lbww');if(!LBW.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='lbww';document.body.append(h)}
 const L=LOYL().filter(p=>loyHid().includes(p.id)).sort((x,y)=>x.n.localeCompare(y.n)),n=LBW.sel.size;
 const body=L.length?`<div class="tiles ptiles wzs">${L.map(p=>{const sl=LBW.sel.has(p.id);return btile({k:p.id,lc:1,name:p.n.replace(/ \(Canada\)$/,''),on:sl,attrs:`data-lbwk="${esc(p.id)}" role=checkbox aria-checked=${sl} aria-label="${esc(p.n)}"`,foot:sl?'✓ Selected':'',mark:''})}).join('')}</div>`:`<p class=mute>Nothing removed. Every loyalty program is on the page.</p>`;
 h.innerHTML=`<div id=wzbg data-lbwx></div><div id=wiz role=dialog aria-modal=true aria-labelledby=lbwh><div class=wzhd><span class=wzst>Loyalty</span><h3 id=lbwh>Add loyalty programs back</h3><button type=button class=wzx data-lbwx aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft><button type=button class=btn2 data-lbwx>Cancel</button><button type=button class=btn data-lbwadd${n?'':' disabled'}>Add${n?' ('+n+')':''}</button></div></div>`;document.body.classList.add('wzopen')}
{const act=t=>{if(t.matches('[data-lbw]')){Object.assign(LBW,{o:true,sel:new Set(),from:t});lbwDraw();(document.querySelector('#lbww [data-lbwk]')||document.querySelector('#lbww .wzx'))?.focus();return}
  if(t.matches('[data-lbwx]')){LBW.o=false;lbwDraw();(LBW.from&&LBW.from.isConnected?LBW.from:document.querySelector('[data-lbw]'))?.focus();return}
  if(t.matches('[data-lbwk]')){const k=t.dataset.lbwk;LBW.sel.has(k)?LBW.sel.delete(k):LBW.sel.add(k);lbwDraw();document.querySelector(`#lbww [data-lbwk="${k}"]`)?.focus();return}
  if(t.matches('[data-lbwadd]')){STO.wallet.loyhide=(STO.wallet.loyhide||[]).filter(k=>!LBW.sel.has(k));saveS();LBW.o=false;lbwDraw();const y=scrollY;render();scrollTo(0,y);document.querySelector('[data-lbw]')?.focus();return}
  if(t.matches('[data-loyrm]')){const k=t.dataset.loyrm,p=PTS.find(x=>x.id==k);if(!p||loyHas(p))return;STO.wallet.loyhide=[...new Set([...(STO.wallet.loyhide||[]),k])];saveS();const y=scrollY;render();scrollTo(0,y);document.querySelector('[data-lbw]')?.focus()}};
 const SEL='[data-lbw],[data-lbwx],[data-lbwk],[data-lbwadd],[data-loyrm]';
 document.addEventListener('click',e=>{const t=e.target.closest(SEL);if(t){e.stopImmediatePropagation();e.preventDefault();act(t)}},true);
 document.addEventListener('keydown',e=>{if(e.key=='Escape'&&LBW.o){LBW.o=false;lbwDraw();return}const t=e.target.closest?.('[data-lbwk]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();act(t)}},true)}
function pointCardsView(){const hid=loyHid(),L=LOYL().filter(p=>!hid.includes(p.id)).sort((a,b)=>a.n.localeCompare(b.n)),n=L.filter(loyHas).length;
 $('#view').innerHTML=`<div class="prof pstack wsimple"><div class=vhead><h2>Loyalty <button type=button class=wplus data-lbw aria-haspopup=dialog aria-label="Add a loyalty program back" title="Add a loyalty program back"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button></h2></div><p class=lead>Tap the loyalty programs you belong to. Tap again to remove one. It stays on this device.</p>
 <section class="psec acs${ACO('loy')?' acol':''}" id=pw-loy>${ACH('loy','pw-loy','Your programs',n,0,'loy')}<div class="tiles ptiles" id=pw-loy-t${ACO('loy')?' hidden':''}>${L.map(loyTile).join('')}</div></section></div>`}
function loySet(id){const p=PTS.find(x=>x.id==id);if(!p)return;const W2=STO.wallet;W2.points=W2.points||[];
 if(loyHas(p))W2.points=W2.points.filter(x=>!(x.i==p.n||(ptsBy(x.i)||{}).id==p.id));else W2.points.push({i:p.n,added_at:NOW()});
 W2.updated_at=NOW();saveS();const y=scrollY;render();scrollTo(0,y);document.querySelector(`[data-loypick="${id}"]`)?.focus()}
{document.addEventListener('click',e=>{const t=e.target.closest('[data-loypick]');if(t){e.stopImmediatePropagation();loySet(t.dataset.loypick)}},true);
 document.addEventListener('keydown',e=>{const t=e.target.closest?.('[data-loypick]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();loySet(t.dataset.loypick)}},true)}
/* PerYourTerms › Subscriptions (Andrew 2026-11-05): moved out of Accounts. Same held tiles (wallet.services + wallet.svc details),
   shared btile / RMX ✕ / ORD drag / IE settings popout (#cset via data-ied=svc|key). Storage keys unchanged. Page + opens wizOpen('subs'). */
function svcCat(){const m=new Map();SUBSVC.forEach(s=>m.set(s.k,s));SUBS.forEach(s=>{if(!m.has(s.k))m.set(s.k,s)});return [...m.values()]}
const subsTiles=()=>ORD('services',(STO.wallet.services||[]).map(k=>svcCat().find(x=>x.k==k)).filter(Boolean).sort((x,y)=>x.n.localeCompare(y.n)),x=>x.k).map(x=>{const b=billOf(x.k),nm=x.n,pn=b.t?String(b.t.n).replace(/\s*\((annual|monthly|yearly)\)$/i,''):'',plan=b.t&&subTiers(x.k).length>1&&!CADENCE.test(pn)?pn:'',when=b.renew?(' · '+new Date(b.renew+'T12:00').toLocaleDateString('en-CA',{day:'numeric',month:'short',year:'numeric'})):'',ft=b.v==null?'<span class=mute>add price</span>':((b.per=='year'?'$'+Number(b.v).toFixed(2)+'/yr':'$'+Number(b.v).toFixed(2)+'/mo')+when),tip=b.user?'REPORTED · price you entered':[b.tag,b.t&&b.t.note,b.t&&b.t.asof&&('as of '+b.t.asof)].filter(Boolean).join(' · ');
 const h=bunHead(x.k),dp=bunDouble(x.k),kids=(STO.wallet.services||[]).filter(c=>bunVia(c)==x.k).map(subName);let F=ft,P=plan,T=tip,extra='';
 if(h){P=h.t?String(h.t.n).replace(/\s*\((annual|monthly|yearly)\)$/i,''):'';F='$0/mo';T=`Included with ${bunName(h.p)} · headline ${h.v!=null?'$'+h.v.toFixed(2)+'/mo '+(h.tag||''):'—'}`;extra=bunBadge(h.p);const px=bunPex(x.k);if(px){if(px.expired){F='Promo ended';extra+=`<span class=bpex bexp>Promotion expired ${esc(px.end)} · pick paid or remove</span>`}else if(px.end==='—'){extra+=`<span class=bpex>Promotion Expiry Date —</span>`}else{extra+=`<span class=bpex>Promo ends ${esc(px.end)}</span>`;const days=(Date.parse(px.end+'T12:00')-Date.now())/864e5;if(days>=0&&days<=45)extra+=`<span class=bpex soon>Expiring soon</span>`}}}
 if(dp)extra+=`<span class=bdp>Included with ${esc(bunName(dp.p))} — you may be paying twice <button type=button class=bdpm data-bmove="${esc(x.k)}">Move under ${esc(bunName(dp.p))}</button></span>`;
 return btile({k:x.k,on:1,sub:1,name:nm,foot:F,plan:P,inc:kids.length?kids.join(', '):'',attrs:`data-ok="${esc(x.k)}" data-ied="svc|${esc(x.k)}" data-bun="${h?'child':dp?'double':kids.length?'parent':''}" role=button aria-haspopup=dialog aria-label="${esc(nm)} settings" title="${esc(T)}"`}).replace(/<\/div>$/,`${extra}${RMX(`data-wrm=services data-wk="${esc(x.k)}"`,x.n)}</div>`)});
/* Subscriptions KPIs (Andrew 2026-11-05): four read-only totals at the top of Subscriptions, same .akpi/.akp/.akn/.akv/.akd component as Accounts (B20; color classes akp-ch/iv/sv/cr reused, no new variant).
   Monthly / Annual come from the plan you picked. A price you typed (wallet.svc.price, or the older wallet.svc.mo monthly amount) is REPORTED and wins; otherwise the catalogue price is used, including a CAD ESTIMATE. A plan with no price is left out of the totals.
   Active = wallet.services length. Potential savings = cited annual plan versus the cited monthly plan of the same tier, per year, and only while you hold the monthly one.
   Function declarations: render can run before later consts. Live updates via full render on add/remove/edit; kpiSPaint for in-place strip refresh; sync-driven redraws stay in UIQ (uiLater). */
/* Subscription bundles (Andrew 2026-11-05; Docs/subscription-bundles.md). Catalogue = grant_sub rules in D.cmod, derived from the perk graph (connections-seed → perk-edges → Website/perk_bundles.py) and scoped by parent tier where stated. Embedded perks (rule id emb-*) are not bundles.
   Parents may be a subscription (from_sub) or a credit-card product (from_card). Any user holding the parent gets the grant — wallet-driven, not per-user.
   Wallet: wallet.svc[child].via = parent key (sub service key or card product id) or '-'. No via: included when a held parent grants it and you have not typed a price above $0.
   Time-limited card perks: wallet.svc[child].pex = Promotion Expiry Date (YYYY-MM-DD or '—'); optional .pact = activation date. Shown only when the active via is a timed perk. On expiry the tile prompts (never auto-charges). */
function bunIsCard(p){return !!(p&&C.some(c=>c.id==p))}
function bunCard(p){return C.find(c=>c.id==p)||null}
function bunName(p){if(!p)return '';const c=bunCard(p);if(c)return c.n;return subName(p)}
function bunRules(p){return (D.cmod||[]).filter(r=>r.effect=='grant_sub'&&r.sub&&!/^emb-/.test(r.id||'')&&subTiers(r.sub).length&&(r.from_sub==p||r.from_card==p))}
function bunKids(p,tk){const card=bunIsCard(p);tk=tk||(card?null:(subTier(p)||{}).k);const o=[];bunRules(p).forEach(r=>{if(!card&&r.tiers&&Object.keys(r.tiers).length&&!(tk in r.tiers))return;if(o.some(x=>x.k==r.sub))return;const g=!card&&r.tiers&&tk?r.tiers[tk]:null,T=subTiers(r.sub),t=(g&&T.find(x=>x.k==g))||T.find(x=>x.per=='month'&&x.dflt)||T.find(x=>x.per=='month')||null;o.push({k:r.sub,tier:t,named:!!g,tag:r.tag,src:r.source,dur:r.dur,promo_months:r.promo_months,offer_ends:r.offer_ends})});return o}
function bunParents(k){return [...new Set((D.cmod||[]).filter(r=>r.effect=='grant_sub'&&r.sub==k&&!/^emb-/.test(r.id||'')&&subTiers(k).length).flatMap(r=>[r.from_sub,r.from_card].filter(Boolean)))]}
const bunHeld=p=>bunIsCard(p)?(STO.wallet.cards||[]).some(x=>x.id==p):(STO.wallet.services||[]).includes(p);
const bunPkg=p=>!bunIsCard(p)&&bunKids(p).some(x=>x.named);
function bunVia(k){const det=(STO.wallet.svc||{})[k]||{},ok=p=>p&&p!=k&&bunHeld(p)&&bunKids(p).some(x=>x.k==k);if(det.via=='-')return null;if(det.via)return ok(det.via)?det.via:null;if(det.price!=null&&+det.price>0||det.mo!=null&&+det.mo>0)return null;return bunParents(k).find(ok)||null}
function bunDouble(k){if(!bunHeld(k)||bunVia(k))return null;const p=bunParents(k).find(p=>p!=k&&bunHeld(p)&&bunKids(p).some(x=>x.k==k));if(!p)return null;const b=billOf(k,1);return b.mo!=null&&b.mo>0?{p,mo:b.mo}:null}
function bunHead(k){const p=bunVia(k);if(!p)return null;const g=bunKids(p).find(x=>x.k==k),t=g&&g.tier;return{p,t,v:t&&t.mo!=null?+t.mo:null,tag:t&&t.tag,src:t&&t.src}}
function bunRule(p,k){return (D.cmod||[]).find(r=>r.effect=='grant_sub'&&r.sub==k&&!/^emb-/.test(r.id||'')&&(r.from_sub==p||r.from_card==p))||null}
function bunTimed(p,k){const r=bunRule(p,k);if(!r)return null;const d=r.dur||{};if(d.type=='intro_months'&&(r.promo_months||d.months))return{months:r.promo_months||d.months,ends:r.offer_ends||d.end_date||null,r};if(d.type=='promo_until'&&d.end_date)return{months:null,ends:d.end_date,r};return null}
function bunPex(k){const p=bunVia(k);if(!p)return null;const t=bunTimed(p,k);if(!t)return null;const det=(STO.wallet.svc||{})[k]||{};let end=det.pex||'';if(!end&&det.pact&&t.months){const d=new Date(det.pact+'T12:00:00');d.setMonth(d.getMonth()+t.months);end=d.toISOString().slice(0,10)}if(!end)end='—';return{p,end,months:t.months,offer_ends:t.ends,expired:end!='—'&&end<pToday()}}
const bunBadge=p=>{const c=bunCard(p),nm=bunName(p),lk=c?c.i:p,ln=c?c.i:nm;return `<span class="bbdg${SUBPLATE.has(LGR(lk,ln))?' lgp':''}" title="Included with ${esc(nm)}">${logoImg(lk,ln,1)}</span>`};
function bunMove(k){const p=(bunDouble(k)||{}).p;if(!p)return;const M={...(STO.wallet.svc||{})},x={...(M[k]||{})};x.via=p;x.updated_at=NOW();M[k]=x;STO.wallet.svc=M;STO.wallet.updated_at=NOW();saveS()}
window.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-bmove]');if(!t)return;e.stopImmediatePropagation();e.preventDefault();bunMove(t.dataset.bmove);if(typeof IE!='undefined'&&IE.o&&IE.g=='svc'){IE.d.via=(STO.wallet.svc[IE.k]||{}).via;ieDraw()}const y=scrollY;render();scrollTo(0,y)},true);
/* When a newly held card (or sub) grants children, add missing child tiles once (same as Stream+ auto-add). */
function bunEnsureKids(){const w=STO&&STO.wallet;if(!w||!Array.isArray(w.services))return;const SA=w.svcadded=w.svcadded&&typeof w.svcadded=='object'?w.svcadded:{};const add=p=>{if(!p||SA['bun:'+p])return;SA['bun:'+p]=NOW();bunKids(p).forEach(c=>{if(!w.services.includes(c.k))w.services.push(c.k)})};for(let g=0;g<8;g++){const n=w.services.length;(w.services||[]).forEach(add);(w.cards||[]).forEach(x=>x&&x.id&&add(x.id));if(w.services.length===n)break}}/* re-walk so a newly added child parent (Prime via Stream+) also brings its kids (DashPass) */

function KPIS(){return [['ch','mo','Monthly cost','What you pay'],['iv','yr','Annual cost','What you pay'],['sv','head','Headline value','Standalone prices, per month'],['cr','bsave','Bundle savings','Headline − paid, per month'],['ch','dbl','Double-pay','Possibly paying twice, per month'],['iv','n','Active','Subscriptions you hold'],['sv','save','Potential savings','Annual vs monthly, per year']]}
/* Price of the plan you picked. wallet.svc.price is a charge you typed for that plan's own cycle. wallet.svc.mo, when price is absent, is the older monthly amount (the field used to be Monthly cost), including on a yearly plan. No price (UNPRICED, and you have not typed one) is left out of the totals. */
function billOf(k,raw){const det=(STO.wallet.svc||{})[k]||{},t=subTier(k),per=t&&t.per==='year'?'year':'month';let v=null,tag=t&&t.tag||'UNPRICED',user=0;
 if(det.price!=null&&isFinite(+det.price)&&+det.price>=0){v=+det.price;tag='REPORTED';user=1}
 else if(det.mo!=null&&isFinite(+det.mo)&&+det.mo>=0){v=per==='year'?Math.round(+det.mo*12*100)/100:+det.mo;tag='REPORTED';user=1}
 else if(t&&t.p!=null&&isFinite(+t.p)){v=+t.p;tag=t.tag||'CITED'}
 const mo=v==null?null:per==='year'?Math.round(v/12*100)/100:v,yr=v==null?null:per==='year'?v:Math.round(v*12*100)/100;
 if(!raw){const p=bunVia(k);if(p)return{t,per,v:0,tag:'INCLUDED',user:0,mo:0,yr:0,inc:p,renew:''}}
 return{t,per,v,tag,user,mo,yr,renew:typeof det.renew=='string'&&/^\d{4}-\d\d-\d\d$/.test(det.renew)?det.renew:''}}
function subMoOf(k){return billOf(k).mo}
function subYrOf(k){return billOf(k).yr}
/* Cited annual plan vs the cited monthly plan of the same tier. Only when you hold the monthly one and the annual charge is lower. Estimates and prices you typed are not counted. */
function annSave(k){if(bunVia(k))return 0;const t=subTier(k);if(!t||t.per!=='month'||t.tag!=='CITED'||t.p==null)return 0;const T=subTiers(k);let a=T.find(x=>x.k===t.k+'-annual')||T.find(x=>t.k.endsWith('-monthly')&&x.k===t.k.replace(/-monthly$/,'-annual'));
 if(!a){const stem=t.n.replace(/\s*\((monthly|annual|yearly)\)$/i,'').trim().toLowerCase();a=T.find(x=>x.per==='year'&&x.n.replace(/\s*\((annual|yearly)\)$/i,'').trim().toLowerCase()===stem)}
 if(!a&&/^monthly$/i.test(t.n))a=T.find(x=>x.per==='year'&&/^annual$/i.test(x.n));
 if(!a||a.tag!=='CITED'||a.p==null)return 0;const s=Math.round((t.p*12-a.p)*100)/100;return s>0?s:0}
function subKpis(){const keys=STO.wallet.services||[];let mo=0,yr=0,nm=0,ny=0,save=0,hd=0,nh=0,dbl=0;keys.forEach(k=>{const b=billOf(k);if(b.mo!=null){mo+=b.mo;nm++}if(b.yr!=null){yr+=b.yr;ny++}save+=annSave(k);
  /* headline: an included child adds its standalone price; a package parent with included children adds nothing (its fee is their cost); anything else adds what you pay */const h=bunHead(k);if(h){if(h.v!=null){hd+=h.v;nh++}}else if(!(bunPkg(k)&&keys.some(c=>bunVia(c)==k))&&b.mo!=null){hd+=b.mo;nh++}const d=bunDouble(k);if(d)dbl+=d.mo});
 const r2=v=>Math.round(v*100)/100,M=nm?r2(mo):null,HD=nh?r2(hd):null;return{n:keys.length,mo:M,yr:ny?r2(yr):null,save:r2(save),head:HD,bsave:HD!=null&&M!=null?r2(HD-M):null,dbl:r2(dbl)}}
function kpiSFmt(id,v){if(id=='n')return String(v);if(v==null)return'—';return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(v)}
function kpiSHTML(){const r=subKpis();return kpiStrip('skpi','Subscription totals',KPIS().map(([cid,id,n,d])=>`<div class="akp akp-${cid}" data-skpi=${id}><span class=akn>${n}</span><b class=akv>${kpiSFmt(id,r[id])}</b><small class=akd>${d}</small></div>`).join(''))}
function kpiSPaint(){const e=document.getElementById('skpi');if(!e)return;(e.closest('.akc')||e).outerHTML=kpiSHTML();akcFit()}
function renderSubscriptionsPage(){const sv=subsTiles();
 $('#view').innerHTML=`<div class="prof pstack wsimple">${kpiSHTML()}${upPromptHTML('subs')}<div class=vhead><h2>Subscriptions <button type=button class=wplus data-wiz=subs aria-haspopup=dialog aria-label="Add subscriptions" title="Add subscriptions"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button></h2></div><p class=lead>The subscriptions you hold. Tap <b>+</b> to add one; tap a tile for its settings. Drag a tile (or press and hold on a phone) to move it. It stays on this device.</p>
 <section class="psec acs" id=pw-subs data-aws=services aria-label=Subscriptions><div class="tiles ptiles" id=pw-subs-t>${sv.join('')||'<p class=mute>None yet. Tap <b>+</b> to add a subscription.</p>'}</div></section></div>`}/* same section.acs > .tiles.ptiles grid as Spending › Credit Cards (centered tracks, no extra grid class; no in-page header — title and + stay in the toolbar) */
/* Loyalty page (Andrew 2026-11-05): the Accounts section, moved under Subscriptions in the User group. Same held tiles (wallet.points [{i, bal}]),
   same wallet.order.points drag (RG pw-loy), same RMX (data-wrm=points) and the same details card (data-ied=loy|name). Nothing is rewritten in storage.
   Page + opens wizOpen('loy'). No in-page section header: the title and + sit in #hdt. */
const loyTiles=()=>ORD('points',(STO.wallet.points||[]).filter(x=>x&&x.i),x=>x.i).map(x=>{const p=ptsBy(x.i)||{n:x.i},n=loyN(p);return btile({k:p.id||x.i,lc:1,name:n,foot:x.bal!=null&&x.bal!==''&&isFinite(+x.bal)?`<span class=lyv title="Estimated value at ${p.cpp!=null?p.cpp+'¢/pt':'no rate on record'}">${p.cpp!=null?'≈$'+Math.round(+x.bal*p.cpp/100).toLocaleString():'—'}</span><span class=lyp>${esc((+x.bal).toLocaleString()+' '+(p.unit||'pts').replace(/\s*\([^)]*\)$/,''))}</span>`:p.cpp!=null?'≈'+p.cpp+'¢/pt':'—',attrs:`data-ok="${esc(x.i)}" data-ied="loy|${esc(x.i)}" role=button aria-haspopup=dialog aria-label="${esc(n)} details"`}).replace(/<\/div>$/,`${RMX(`data-wrm=points data-wk="${esc(x.i)}"`,n)}</div>`)});
/* Four KPIs, same .akpi strip as Subscriptions. Derived only from wallet.points plus the catalogue ¢/pt already on the program (ptsBy → cpp, cppt / tag).
   Programs = how many you hold. Points value = balance × ¢/pt, CAD, and only for programs that have both a balance and a ¢/pt; the note is CITED when every one of those rates is CITED, otherwise ESTIMATE. A dash when none qualify (never a guessed rate).
   Top program = the largest of those CAD values. With a balance = how many held programs have a number typed in. There is no per-program expiry on wallet.points or the points catalogue, so "Expiring soon" is not a tile. */
function KPIL(){return [['ch','n','Programs','You hold'],['iv','val','Points value','CAD, where a ¢/pt exists'],['sv','top','Top program','Highest valued balance'],['cr','bal','With a balance','Programs with a points balance'],['ch','sth','Statuses held','Client statuses you hold'],['iv','stp','Perks unlocked','From the tiers you picked']]}/* Status KPIs (2026-11-05): Statuses held = wallet.status entries; Perks unlocked = Eligible-for perks of the picked tiers (a held status with no tier adds none) */
function loyRow(x){const p=ptsBy(x.i);if(!p||p.cpp==null||x.bal==null||x.bal===''||!isFinite(+x.bal))return null;const tag=String(p.cppt||p.tag||'ESTIMATE').toUpperCase();return {n:loyN(p),v:+x.bal*p.cpp/100,tag:tag=='CITED'?'CITED':'ESTIMATE'}}
function loyKpis(){const L=(STO.wallet.points||[]).filter(x=>x&&x.i),V=L.map(loyRow).filter(Boolean),top=V.slice().sort((a,b)=>b.v-a.v)[0]||null,bal=L.filter(x=>x.bal!=null&&x.bal!==''&&isFinite(+x.bal)).length;return {n:L.length,val:V.length?V.reduce((t,o)=>t+o.v,0):null,tag:V.length?(V.every(o=>o.tag=='CITED')?'CITED':'ESTIMATE'):null,top:top?top.n:null,topv:top?top.v:null,bal}}
function kpiLFmt(id,r){if(id=='sth')return String(stKpis().n);if(id=='stp')return String(stKpis().perks);if(id=='n'||id=='bal')return String(r[id]);const v=id=='top'?r.topv:r.val;if(v==null)return '—';return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:2,maximumFractionDigits:2}).format(v)}
function kpiLNote(id,r){if(id=='sth'){const u=stKpis().unset;return u?u+' to pick a tier':'Client statuses you hold'}if(id=='val')return r.tag||'No balance with a ¢/pt';if(id=='top')return r.top||'No valued balance';return KPIL().find(x=>x[1]==id)[3]}
function kpiLHTML(){const r=loyKpis();return kpiStrip('lkpi','Loyalty totals',KPIL().map(([cid,id,n])=>`<div class="akp akp-${cid}" data-lkpi=${id}><span class=akn>${n}</span><b class=akv>${kpiLFmt(id,r)}</b><small class=akd>${esc(kpiLNote(id,r))}</small></div>`).join(''))}
function kpiLPaint(){const e=document.getElementById('lkpi');if(!e)return;(e.closest('.akc')||e).outerHTML=kpiLHTML();if(typeof akcFit=='function')akcFit()}
/* Loyalty › Status (Andrew 2026-11-05; Docs/loyalty-status.md). Points = the programs you collect in (wallet.points, unchanged). Status = relationship / client tiers that set what you are eligible for
   (bundle discounts, perks, fee waivers). Catalogue STP: one program per brand, its tiers, and per tier the 'Eligible for' perks, each [text, tag, source]; ALL = perks on every tier.
   Wallet: wallet.status {programKey: {tier, added_at, updated_at}}; tier '' = held, tier not picked yet ('— pick tier'). Same tile (btile, brand colour, name top-left) and the same tap → tier popout as Subscriptions.
   sub = a subscription the perk makes you eligible for (Koodo client → Koodo Stream+). */
const STWS='https://help.wealthsimple.com/hc/en-ca/articles/14557325627803-Understand-the-different-client-statuses-offered-by-Wealthsimple',STRBC='https://www.rbcroyalbank.com/bank-accounts/chequing-accounts/',STRBC2='https://www.rbcroyalbank.com/banking-services/additional-account-services.html',STTEL='https://www.telus.com/en/deals-and-bundles/internet-tv-phone',STKOO='https://www.koodomobile.com/en/shop/entertainment/subscriptions/stream-plus';
const STK_SP=['Koodo Stream+: Netflix, Disney+ and Amazon Prime in one bundle, 15% savings','CITED',STKOO,'streamplus'],STK_10=['Up to 10% off additional streaming subscriptions with Stream+','CITED',STKOO,'streamplus'],STT_HOME=['$10/mo off qualifying TELUS Home Internet for 24 months','CITED',STTEL];
const STP=[
 {k:'st-wealthsimple',n:'Wealthsimple',prog:'Client status',src:STWS,asof:'2026-11-05',tiers:[
  {k:'core',n:'Core',req:'No minimum',perks:[['Chequing interest 1.25%','CITED'],['Managed investing fee 0.5%','CITED'],['Crypto trading fee 2%','CITED'],['Instant deposits up to $50,000','CITED'],['USD accounts $10/month','CITED']]},
  {k:'premium',n:'Premium',req:'$100,000+',perks:[['Chequing interest 1.75%','CITED'],['Managed investing fee 0.4%, tax-loss harvesting','CITED'],['Crypto trading fee 1%','CITED'],['Instant deposits up to $250,000','CITED'],['USD accounts included (opt in)','CITED'],['Priority email and phone support','CITED'],['Partner milestone rewards (0–3)','CITED'],['20% off Willful','CITED'],['Medcan 15–30% off (Ontario)','CITED']]},
  {k:'generation',n:'Generation',req:'$500,000+',perks:[['Chequing interest 2.25%','CITED'],['Managed investing fee from 0.4%, as low as 0.2%, tax-loss harvesting','CITED'],['Crypto trading fee 0.5%, staking fee 15%','CITED'],['Instant deposits up to $250,000','CITED'],['USD accounts included (opt in)','CITED'],['Priority email and phone support','CITED'],['3 partner milestone rewards','CITED'],['20% off Willful','CITED'],['Medcan 15–40% off (Ontario)','CITED']]}],
  note:'Tier = net deposits or total assets across your Wealthsimple accounts (excludes portfolio line of credit).'},
 {k:'st-rbc',n:'RBC',prog:'Banking package',src:STRBC,asof:'2026-11-05',tiers:[
  {k:'day-to-day',n:'Day to Day Banking',req:'$4/mo',perks:[['12 debits a month, plus unlimited e-Transfers','CITED']]},
  {k:'advantage',n:'Advantage Banking',req:'$12.95/mo',perks:[['Unlimited debit transactions in Canada','CITED'],['No RBC fee at other banks’ ATMs in Canada','CITED']]},
  {k:'signature-no-limit',n:'Signature No Limit Banking',s:'Signature No Limit',req:'$16.95/mo',perks:[['Unlimited debit transactions in Canada','CITED'],['Up to $48 credit card annual fee rebate','CITED'],['6 bank drafts a year included','CITED',STRBC2],['Overdraft protection monthly fee waived','CITED',STRBC2]]},
  {k:'vip',n:'VIP Banking',req:'$30/mo',perks:[['Unlimited debit transactions worldwide','CITED'],['Up to $120 credit card annual fee rebate','CITED'],['Up to 2 CAD + 1 USD companion accounts, monthly fees waived','CITED'],['12 bank drafts a year included','CITED',STRBC2],['Overdraft protection monthly fee waived','CITED',STRBC2]]}],
  all:[['Value Program monthly fee rebate eligible','CITED'],['3¢/L off at Petro-Canada with a linked RBC card','CITED']],
  note:'RBC’s premium line is RBC VIP Banking (no “Royal Circle” tier on rbcroyalbank.com).'},
 {k:'st-telus',n:'TELUS',prog:'Client bundle',src:STTEL,asof:'2026-11-05',tiers:[
  {k:'mobility',n:'Mobility customer',req:'',perks:[STT_HOME]},
  {k:'home',n:'Home Services customer',s:'Home Services',req:'',perks:[['$15/mo off the primary line on select 5G+ plans','CITED']]},
  {k:'mobility-home',n:'Mobility + Home Services',s:'Mobility + Home',req:'',perks:[STT_HOME,['$15/mo off the primary line on select 5G+ plans','CITED']]}],
  note:'TELUS Rewards points are a separate program: add them under Points.'},
 {k:'st-koodo',n:'Koodo',prog:'Client',src:STKOO,asof:'2026-11-05',tiers:[
  {k:'internet',n:'Internet customer',req:'',perks:[STK_SP,STK_10]},
  {k:'mobility',n:'Mobility customer',req:'',perks:[STK_SP,STK_10,STT_HOME]},
  {k:'mobility-internet',n:'Mobility + Internet',req:'',perks:[STK_SP,STK_10,STT_HOME]}]}];
const STBY=Object.fromEntries(STP.map(p=>[p.k,p]));
const stHeld=()=>{const S=STO.wallet.status;return S&&typeof S=='object'&&!Array.isArray(S)?S:{}};
const stTier=k=>{const p=STBY[k],x=stHeld()[k];return p&&x&&x.tier?p.tiers.find(t=>t.k==x.tier)||null:null};
const stPerks=(p,t)=>t?[...t.perks,...(p.all||[])].map(([tx,tag,src,sub])=>({tx,tag:tag||'ESTIMATE',src:src||(tag=='CITED'?p.src:''),sub:sub||''})):[];
function stKpis(){const H=stHeld(),K=STP.filter(p=>H[p.k]);return {n:K.length,perks:K.reduce((s,p)=>s+stPerks(p,stTier(p.k)).length,0),unset:K.filter(p=>!stTier(p.k)).length}}
const stTile=p=>{const on=!!stHeld()[p.k],t=stTier(p.k),n=stPerks(p,t).length;
 return btile({k:p.k,lc:1,on,name:p.n,foot:on?(t?esc(t.s||t.n):'— pick tier'):'Not held',attrs:`title="${t?esc(t.n)+' · '+n+' perk'+(n==1?'':'s'):''}" data-stk="${p.k}" data-ston=${on?1:0} role=button aria-haspopup=dialog aria-pressed=${on} aria-label="${esc(p.n)} ${esc(p.prog)}${t?', '+esc(t.n):''}"`})};
function stPop(k,anchor){closeTierPop();const p=STBY[k];if(!p)return;const x=stHeld()[k],cur=x?(x.tier||'*'):'',t=stTier(k);
 const row=(v,name,req)=>`<button type=button class="tpr${cur==v?' on':''}" role=menuitemradio aria-checked=${cur==v} data-stpick="${k}|${v}"><span class=tpn>${esc(name)}</span><span class=tpp>${esc(req||'')}</span></button>`;
 const subOn=s=>(STO.wallet.services||[]).includes(s);
 const L=stPerks(p,t).map(o=>`<li><span>${esc(o.tx)}</span>${o.sub?` <button type=button class=lnk data-s=subscriptions data-stsub="${esc(o.sub)}">${subOn(o.sub)?'You have it':'See Subscriptions'}</button>`:''} <span class=t title="${esc(o.tag)}">${esc(o.tag)}</span>${o.src?` <a href="${esc(o.src)}" target=_blank rel=noopener>Source</a>`:''}</li>`).join('');
 const d=document.createElement('div');d.id='tpop';d.className='tpop stpop';d.setAttribute('role','dialog');d.setAttribute('aria-label',p.n+' status');
 d.innerHTML=`<div class=tph>${esc(p.n)} <span class=mute>${esc(p.prog)}</span></div><div role=menu>${p.tiers.map(z=>row(z.k,z.n,z.req)).join('')}${row('*','Held · tier not set','—')}${row('','Off','')}</div><div class=stel><b>Eligible for</b>${x?(t?`<ul>${L}</ul>`:'<p class=mute>— pick tier</p>'):'<p class=mute>—</p>'}</div>${p.note?`<p class=tpnote>${esc(p.note)}</p>`:''}<p class=tpsrc><a href="${esc(p.src)}" target=_blank rel=noopener>Source</a> · read ${esc(p.asof)}</p>`;
 document.body.append(d);const r=anchor.getBoundingClientRect(),w=d.offsetWidth;
 if(innerWidth>640){d.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+scrollX+'px';d.style.top=r.bottom+6+scrollY+'px'}else d.classList.add('sheet');
 (d.querySelector('.tpr.on')||d.querySelector('.tpr')).focus();stPop.from=k}
function stSet(k,v){const H={...stHeld()},N=NOW();if(v==='')delete H[k];else{const o=H[k]||{added_at:N};H[k]={...o,tier:v=='*'?'':v,updated_at:N}}
 STO.wallet.status=H;STO.wallet.updated_at=N;closeTierPop();stPop.from=null;saveS();const y=scrollY;render();scrollTo(0,y);document.querySelector(`[data-stk="${k}"]`)?.focus()}
{document.addEventListener('click',e=>{const pk=e.target.closest('[data-stpick]');if(pk){e.stopImmediatePropagation();e.preventDefault();const[k,v]=pk.dataset.stpick.split('|');stSet(k,v);return}
  if(e.target.closest('[data-stsub]')){closeTierPop();return}
  const t=e.target.closest('[data-stk]');if(t){e.stopImmediatePropagation();if(document.getElementById('tpop')&&stPop.from==t.dataset.stk){closeTierPop();stPop.from=null}else stPop(t.dataset.stk,t);return}},true);
 document.addEventListener('keydown',e=>{if(e.key=='Escape'&&document.getElementById('tpop')&&stPop.from){const k=stPop.from;closeTierPop();stPop.from=null;document.querySelector(`[data-stk="${k}"]`)?.focus();return}
  const t=e.target.closest?.('[data-stk]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();stPop(t.dataset.stk,t)}},true)}
function renderLoyaltyPage(){const ly=loyTiles(),held=STP.filter(p=>stHeld()[p.k]),nh=held.length;
 /* Andrew 2026-11-06: same wallet-page pattern as Spending — movable sections (SECORD + loyaltySectionOrder), sidebar section nav (USEC.pointcards), two-screen + (LYW). Status shows held programs only (add via +); Points empty state matches Subscriptions. */
 $('#view').innerHTML=`<div class="prof pstack wsimple">${kpiLHTML()}<div class=vhead><h2>Loyalty <button type=button class=wplus data-lyw aria-haspopup=dialog aria-label="Add to Loyalty" title="Add to Loyalty"><svg viewBox="0 0 16 16" width=16 height=16 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round><path d="M8 3v10M3 8h10"/></svg></button></h2></div><p class=lead>Points: the programs you collect in. Status: your client tiers and what they make you eligible for. Tap <b>+</b> to add; tap a tile for its details. Drag a section (or press and hold on a phone) to move it. It stays on this device.</p>
 ${SECORD([`<section class="psec acs${ACO('lpts')?' acol':''}" id=pw-loy data-aws=points aria-label=Points>${ACH('lpts','pw-loy',USN('pw-loy'),ly.length,1,'ly:points')}<div class="tiles ptiles" id=pw-loy-t${ACO('lpts')?' hidden':''}>${ly.join('')||'<p class=mute>None yet. Tap <b>+</b> to add a loyalty program.</p>'}</div></section>`,
 `<section class="psec acs${ACO('lsta')?' acol':''}" id=pw-lsta aria-label=Status>${ACH('lsta','pw-lsta',USN('pw-lsta'),nh,1,'ly:status')}<div class="tiles ptiles" id=pw-lsta-t${ACO('lsta')?' hidden':''}>${held.map(stTile).join('')||'<p class=mute>None yet. Tap <b>+</b> to add a status.</p>'}</div></section>`],'loyaltySectionOrder')}</div>`}
function renderAssets(){/* Profile › Assets: investment holdings by account type (Kubera via ivBook), moved from PerYourTerms › Investments 2026-11-06 */let b=null;try{b=ivBook()}catch(e){b=null}
 const shell=(sig,body)=>{$('#view').innerHTML=`<div class="prof pstack wsimple" id=ivroot data-sig="${esc(sig)}">${upPromptHTML('invest')}${body}</div>`};
 if(!b)return shell('off','<div class=vhead><h2>Assets</h2></div><p class=mute>Nothing connected yet.</p>');
 if(!b.length)return shell('empty','<div class=vhead><h2>Assets</h2></div><p class=mute>No investment accounts yet.</p>');
 try{USEC.assets.L=ivUse()}catch(e){}
 const cols=['ch','iv','sv','cr'],tile=(id,name,val,desc,i)=>`<div class="akp akp-${cols[i%4]}" data-ikpi=${id}><span class=akn>${esc(name)}</span><b class=akv>${val==null?'—':ivCad(val)}</b><small class=akd>${desc}</small></div>`;
 const known=b.every(s=>s.total!=null),sum=known?b.reduce((t,s)=>t+s.total,0):null;
 const parts=[tile('total','Total',sum,'Combined',0),...b.map((s,i)=>tile(s.slug,s.name,s.total,s.accounts.length+' account'+(s.accounts.length==1?'':'s'),i+1))];
 const kpi=kpiStrip('ikpi','Investments by account type',parts.join(''));
 const sec=s=>{const rows=s.rows.map(r=>{const tick=r.ticker?`<span title="${esc(r.name&&r.name!==r.ticker?r.name:r.ticker)}">${esc(r.ticker)}</span>`:r.name==='holdings not itemized'?`<span>${esc(r.name)}</span>`:brTxt(r.name);return brRow(r.acct,[tick,brTxt(r.exch),brTxt(r.qty==null?null:ivQty(r.qty)),brTxt(r.price==null?null:ivPx(r.price,r.px)),brTxt(r.value==null?null:ivCad(r.value)),brTxt(ivPct(r.value,s.total))],r.ticker?r.name:null).replace('<td class=l','<td class="l nm"')}),H=['Account','Ticker','Exchange','Qty','Price','Market value','% of section'];
  return `<section class="psec acs${ACO(s.g)?' acol':''}" id=${s.id}>${ACH(s.g,s.id,s.name,s.rows.length,1)}<div class="ptiles" id=${s.id}-t${ACO(s.g)?' hidden':''}><div class=ivtab><table class="vt brtab" data-brtab=ivh><thead><tr>${H.map((h,i)=>`<th class="${i?'':'l nm'}">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div></div></section>`};
 shell(ivSig(b),`${kpi}<div class=vhead><h2>Assets</h2></div><p class=lead>What you hold in each account type.</p>${SECORD(b.map(sec),'investSectionOrder')}`);akcFit()}
/* One KPI strip for every page (Accounts, Subscriptions, Investments): the track is inset by symmetric gutters; arrows live in those gutters. The row loops: next at the end returns to the first tile, prev at the start to the last. */
function kpiStrip(id,label,inner){const chev=d=>`<svg viewBox="0 0 16 16" width=12 height=12 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round><path d="${d}"/></svg>`;return `<div class=akc><button type=button class=akcb data-akc=-1 aria-controls=${id} aria-label="Previous" hidden>${chev('M10 3.5 5.5 8 10 12.5')}</button><section class=akpi id=${id} tabindex=0 aria-label="${esc(label)}">${inner}</section><button type=button class=akcb data-akc=1 aria-controls=${id} aria-label="Next" hidden>${chev('M6 3.5 10.5 8 6 12.5')}</button></div>`}
function akcStep(sc){const t=sc.querySelector('.akp');if(!t)return sc.clientWidth;return t.getBoundingClientRect().width+(parseFloat(getComputedStyle(sc).columnGap||getComputedStyle(sc).gap)||0)}
function akcGo(box,dir){const sc=box&&box.querySelector('.akpi');if(!sc)return;const step=akcStep(sc)||sc.clientWidth,max=Math.max(0,sc.scrollWidth-sc.clientWidth);if(max<=4)return;const x=sc.scrollLeft;let left;if(dir>0&&x>=max-1)left=0;else if(dir<0&&x<=1)left=max;else left=Math.max(0,Math.min(max,(Math.round(x/step)+dir)*step));sc.scrollTo({left,behavior:'auto'});akcFit(box)}
function akcFit(root){const boxes=root?[root]:[...document.querySelectorAll('.akc')];for(const box of boxes){const sc=box.querySelector('.akpi');if(!sc)continue;const max=Math.max(0,sc.scrollWidth-sc.clientWidth),over=max>4,prev=box.querySelector('[data-akc="-1"]'),next=box.querySelector('[data-akc="1"]');if(prev)prev.hidden=!over;if(next)next.hidden=!over;if(!sc.dataset.bound){sc.dataset.bound='1';sc.addEventListener('scroll',()=>akcFit(box),{passive:true})}}}
document.addEventListener('click',e=>{const b=e.target.closest('.akc [data-akc]');if(!b||b.hidden)return;e.preventDefault();akcGo(b.closest('.akc'),+b.dataset.akc)});
document.addEventListener('keydown',e=>{if(e.key!='ArrowLeft'&&e.key!='ArrowRight')return;const box=e.target.closest?.('.akc');if(!box)return;e.preventDefault();akcGo(box,e.key=='ArrowRight'?1:-1)});
addEventListener('resize',()=>akcFit());
VIEWS.assets=renderAssets;
/* Loyalty + (Andrew 2026-11-06): same two-screen flow as Spending. Screen 1 = Points or Status (single tap). Screen 2 = multiselect of programs in that group (Points = catalogue programs; Status = STP client statuses). Section + opens straight at step 2. Storage stays wallet.points / wallet.status. */
const LYW={o:false,step:1,type:null,sel:new Set(),from:null};
const LYGS=()=>[['points','Points','wloy'],['status','Status','ins']],
 lyPtsOn=()=>new Set((STO.wallet.points||[]).map(x=>(ptsBy(x.i)||{}).id).filter(Boolean)),
 lyStaOn=()=>new Set(Object.keys(stHeld())),
 lyPtsCat=()=>PTS.filter(p=>p.cat!='issuer'&&!p.hid).sort((a,b)=>a.n.localeCompare(b.n));
function lywDraw(){let h=document.querySelector('#lyww');if(!LYW.o){if(h)h.remove();document.body.classList.remove('wzopen');return}if(!h){h=document.createElement('div');h.id='lyww';document.body.append(h)}
 const two=LYW.step==2,T=LYW.type,GN=(LYGS().find(x=>x[0]==T)||[])[1]||'';
 const cnt=g=>g=='points'?lyPtsCat().length+' program'+(lyPtsCat().length==1?'':'s'):STP.length+' status'+(STP.length==1?'':'es');
 const body=!two?`<div class="tiles ptiles wzt" role=radiogroup aria-label="Which Loyalty group">${LYGS().map(([k,n,ic])=>btile({ico:ic,on:false,attrs:`data-lywt=${k} role=radio aria-checked=false`,name:n,foot:esc(cnt(k)),mark:''})).join('')}</div>`
  :T=='status'?`<div class="tiles ptiles wzs">${STP.map(p=>{const sl=LYW.sel.has(p.k);return btile({k:p.k,lc:1,name:p.n,on:sl,attrs:`data-lyws="${p.k}" role=checkbox aria-checked=${sl}`,foot:sl?'✓ Selected':esc(p.prog),mark:sl?'✓':''})}).join('')}</div>`
  :`<div class="tiles ptiles wzs">${lyPtsCat().map(p=>{const sl=LYW.sel.has(p.id);return btile({k:p.id,lc:1,name:loyN(p),on:sl,attrs:`data-lywp="${p.id}" role=checkbox aria-checked=${sl}`,foot:sl?'✓ Selected':(p.cpp!=null?p.cpp+'¢/pt':'—'),mark:sl?'✓':''})}).join('')}</div>`;
 const ft=two?`<button type=button class=btn2 data-lywback>Back</button><button type=button class=btn data-lywadd>Done</button>`:`<button type=button class=btn2 data-lywx>Cancel</button>`;
 h.innerHTML=`<div id=wzbg data-lywx></div><div id=wiz role=dialog aria-modal=true aria-labelledby=lywh><div class=wzhd><span class=wzst>Step ${LYW.step} of 2 · Loyalty</span><h3 id=lywh>${!two?'What do you want to add?':esc(GN)}</h3><button type=button class=wzx data-lywx aria-label="Close without changes" title="Close">&#x2715;</button></div><div class=wzbd>${body}</div><div class=wzft>${ft}</div></div>`;document.body.classList.add('wzopen')}
function lywApplyPoints(){const on=lyPtsOn(),want=LYW.sel,W2=STO.wallet;W2.points=W2.points||[];
 /* remove unchecked held programs (by catalogue id); keep unknown custom names */
 W2.points=W2.points.filter(x=>{const id=(ptsBy(x.i)||{}).id;return!id||want.has(id)});
 lyPtsCat().forEach(p=>{if(want.has(p.id)&&!on.has(p.id))W2.points.push({i:p.n,added_at:NOW()})});
 W2.updated_at=NOW()}
function lywApplyStatus(){const H={...stHeld()},want=LYW.sel,N=NOW();
 STP.forEach(p=>{if(want.has(p.k)){if(!H[p.k])H[p.k]={tier:'',added_at:N,updated_at:N}}else delete H[p.k]});
 STO.wallet.status=H;STO.wallet.updated_at=N}
function lywClose(){LYW.o=false;lywDraw();(LYW.from&&LYW.from.isConnected?LYW.from:document.querySelector('[data-lyw]'))?.focus()}
{const act=t=>{if(t.matches('[data-lyw]')){const k=t.dataset.lyw||null;Object.assign(LYW,{o:true,step:1,type:null,sel:new Set(),from:t});
  if(k=='points'||k=='status'){LYW.type=k;LYW.step=2;LYW.sel=k=='points'?lyPtsOn():lyStaOn();lywDraw();document.querySelector('#lyww [data-lywp],#lyww [data-lyws]')?.focus();return}
  lywDraw();document.querySelector('#lyww [data-lywt]')?.focus();return}
  if(t.matches('[data-lywx]')||t.id=='wzbg'&&t.closest('#lyww'))return lywClose();
  if(t.matches('[data-lywt]')){LYW.type=t.dataset.lywt;LYW.step=2;LYW.sel=LYW.type=='points'?lyPtsOn():lyStaOn();lywDraw();document.querySelector('#lyww [data-lywp],#lyww [data-lyws]')?.focus();return}
  if(t.matches('[data-lywback]')){LYW.step=1;lywDraw();document.querySelector(`#lyww [data-lywt=${LYW.type}]`)?.focus();return}
  if(t.matches('[data-lywp]')){const id=t.dataset.lywp;LYW.sel.has(id)?LYW.sel.delete(id):LYW.sel.add(id);lywDraw();document.querySelector(`#lyww [data-lywp="${id}"]`)?.focus();return}
  if(t.matches('[data-lyws]')){const id=t.dataset.lyws;LYW.sel.has(id)?LYW.sel.delete(id):LYW.sel.add(id);lywDraw();document.querySelector(`#lyww [data-lyws="${id}"]`)?.focus();return}
  if(t.matches('[data-lywadd]')){if(LYW.type=='points')lywApplyPoints();else if(LYW.type=='status')lywApplyStatus();saveS();LYW.o=false;lywDraw();const y=scrollY;render();scrollTo(0,y);document.querySelector(`[data-lyw="${LYW.type}"]`)?.focus();return}};
 const SEL='[data-lyw],[data-lywx],[data-lywt],[data-lywback],[data-lywp],[data-lyws],[data-lywadd]';
 document.addEventListener('click',e=>{const t=e.target.closest(SEL);if(!t)return;if(t.matches('[data-lywx]')||t.id=='wzbg'){/* allow */}e.preventDefault();e.stopImmediatePropagation();act(t)},true);
 document.addEventListener('keydown',e=>{if(LYW.o&&e.key=='Escape'){e.preventDefault();e.stopImmediatePropagation();lywClose();return}const t=e.target.closest?.('[data-lywt],[data-lywp],[data-lyws]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();act(t)}},true)}
VIEWS.pointcards=renderLoyaltyPage;if(CARDS_ONLY)VIEWS.subscriptions=renderSubscriptionsPage;

{document.addEventListener('click',e=>{const p=e.target.closest('[data-tierpick]');if(p){e.stopImmediatePropagation();const[k,v]=p.dataset.tierpick.split('|');tierSet(k,v);return}
  const t=!e.target.closest('[data-wrm]')&&e.target.closest('[data-subpick]');if(t){e.stopImmediatePropagation();document.getElementById('tpop')&&tierPop.from==t.dataset.subpick?closeTierPop():tierPop(t.dataset.subpick,t);return}
  if(!e.target.closest('#tpop'))closeTierPop()},true);
 document.addEventListener('keydown',e=>{if(e.key=='Escape'&&document.getElementById('tpop')){const k=tierPop.from;closeTierPop();document.querySelector(`[data-subpick="${k}"]`)?.focus();return}
  const t=e.target.closest?.('[data-subpick]');if(t&&(e.key=='Enter'||e.key==' ')){e.preventDefault();e.stopImmediatePropagation();tierPop(t.dataset.subpick,t)}},true)}

/* Phone Filters sheet (Andrew 2026-10-30): on a phone (html.tz: the scaled table page) the open Filters panel is a bottom sheet over a dimmed backdrop: one filter per row, large tap targets, Reset + Done in its head. The sheet is counter-zoomed out of the scaled page, so it renders at true phone size. Desktop keeps the dropdown. */
function fsheet(){const R=document.documentElement,ph=R.classList.contains('tz');
 const f=document.getElementById('filters'),open=ph&&f&&!f.hidden&&f.offsetParent!==null&&!f.classList.contains('fcol')&&R.classList.contains('tblv');let b=document.getElementById('fsbg');if(open&&!b){b=document.createElement('div');b.id='fsbg';b.setAttribute('aria-hidden','true');document.body.appendChild(b)}if(b)b.hidden=!open;R.classList.toggle('fsopen',!!open)}
addEventListener('resize',()=>{try{fsheet()}catch(e){}});
/* boot last, so every view helper (Per Your Terms, rules, invites) is initialized before the first render.
   2026-11-05 (Andrew: refresh on My Wallet said "Couldn't compute right now", the sidebar link worked): the first render ran here, mid-script,
   before the rest of this file and sync.js (appended to js/app.js by the build) had run, so their const helpers (kubTiles, kubOn, AUTH, syState…)
   were still in the temporal dead zone (`typeof x` throws there too). A direct load of a page that reads them (My Wallet with a bank, Connections)
   threw; a click later worked because by then everything was defined. The first render now waits one microtask: after the whole script, before paint. */
BANK.init();queueMicrotask(()=>render());

/* Mobile: device width everywhere; html.resp (Home and footer pages) also reflows the content; other pages keep the desktop canvas and pan. */
function vpSet(){const m=document.querySelector('meta[name=viewport]');if(!m)return;const r=(st.pl=='home'&&!st.card)||st.pl=='info'||(USR.has(st.s)&&!st.card)/* tile pages (Spending, Accounts, Subscriptions, Loyalty, Profile) reflow too; tables keep the desktop canvas */;const TB=isTab(),dw=TB?tabW():0,cv=TB?((st.pl=='home'&&!st.card)?(dw<1024?1024:0):r?(dw>880?880:0)/* tile pages: at most 3 tiles per row in both orientations (Andrew 2026-10-30); landscape renders an 880px canvas scaled up, so the tiles grow */:(dw<1280?1280:0)):0/* tablet tier: Home renders the desktop hero on a 1024 canvas, tables the 1280 desktop canvas, both scaled to the screen by the viewport; tile/info pages use the device width with the desktop CSS */;const v=cv?`width=${cv},initial-scale=${Math.round(dw/cv*10000)/10000}`:'width=device-width,initial-scale=1';if(m.content!=v)m.content=v;document.documentElement.classList.toggle('tab',TB);document.documentElement.style.setProperty('--tsc',cv?cv/dw:1);document.documentElement.classList.toggle('resp',r);if(TB){window.__tz=1;document.documentElement.classList.remove('tz');document.documentElement.style.removeProperty('--tz')}else{/* 2026-10-30 (Andrew, final mobile spec): on phones a table page renders below the nav at the fixed 1280px desktop width and is scaled to the screen width as one unit (CSS zoom on body, counter-zoom on the nav and its menus/dialogs); the nav stays phone-size */const H=document.documentElement,W0=vpW(),z=!r&&W0<900?Math.round(W0/1280*10000)/10000:0;window.__tz=z||1;H.classList.toggle('tz',!!z);if(z)H.style.setProperty('--tz',z);else H.style.removeProperty('--tz')}const hd=document.querySelector('header');if(hd)document.documentElement.style.setProperty('--hh',hd.offsetHeight+'px')}
/* Tablet tier (Andrew 2026-10-30, iPad Pro 11": 834x1194): a touch device whose short screen side is >= 700 CSS px (iPad, Android tablet; iPad Safari's desktop mode reports a Mac with touch). Phones stay on the phone layout. */
function isTab(){const n=navigator,ua=n.userAgent||'',s=Math.min(screen.width||0,screen.height||0);return (n.maxTouchPoints||0)>0&&s>=700&&!/Windows/.test(ua)}
function tabW(){const sw=screen.width||innerWidth,sh=screen.height||innerHeight,ls=innerWidth>innerHeight;return ls?Math.max(sw,sh):Math.min(sw,sh)}
/* rotation (Andrew 2026-10-30): the phone scale and every width recompute on rotate/resize, both directions. screen.width stays at portrait width on iOS, so the cap uses the screen side that matches the current orientation */
function vpW(){const iw=innerWidth,sw=screen.width||iw,sh=screen.height||iw,ls=iw>(innerHeight||0),sc=ls?Math.max(sw,sh):Math.min(sw,sh);return Math.min(iw,sc||iw)}
const rotGet=()=>{const Z=window.__tz||1,p=posGet();return {...p,Z,pf:p.stuck?(p.o-p.s)/Z:0,py:scrollY/Z}};let rotA=null,rotF=0;
addEventListener('scroll',()=>{if(rotF)return;rotF=requestAnimationFrame(()=>{rotF=0;try{rotA=rotGet()}catch(e){}})},{passive:true});
function rotRun(){const Z0=window.__tz||1,w0=rotRun.w;const A=rotA||(()=>{try{return rotGet()}catch(e){return null}})();try{vpSet()}catch(e){}const hd=document.querySelector('header');if(hd)document.documentElement.style.setProperty('--hh',hd.offsetHeight+'px');const Z=window.__tz||1;rotRun.w=innerWidth;if(Z===Z0&&w0===innerWidth)return;try{window.stickySet?.()}catch(e){}try{fsheet()}catch(e){}if(!A)return;
 if(A.stuck&&A.a!=null){const r=document.querySelector(`.wrap:not([hidden]) #tb tr[data-i="${A.a}"]`);if(r){scrollTo(0,Math.max(0,scrollY+r.getBoundingClientRect().top-(posStack()+A.pf*Z)))}}else scrollTo(0,A.py*Z);if(scrollX)scrollTo(0,scrollY);try{rotA=rotGet()}catch(e){}}
rotRun.w=innerWidth;const rotQ=()=>{rotRun();[60,250,600].forEach(t=>setTimeout(rotRun,t))/* iOS Safari updates innerWidth late after a rotation */};
addEventListener('resize',rotQ);addEventListener('orientationchange',rotQ);window.visualViewport?.addEventListener('resize',rotQ);
/* first load: the header height settles after fonts and layout; keep --hh live so no stale offset leaves a gap above the Home hero */
{const hd=document.querySelector('header'),hh=()=>{if(hd)document.documentElement.style.setProperty('--hh',hd.offsetHeight+'px')};if(hd&&'ResizeObserver' in window)new ResizeObserver(hh).observe(hd);document.fonts?.ready?.then(hh);addEventListener('load',hh)}

/* PUSH 4 (Andrew 2026-10-29): sticky table chrome. Header stays; filters scroll away; the count line (+ its sub-sub-tabs) and the column header row stick under the header. No frozen columns: a wide table scrolls the page sideways. */
/* PUSH 14 (Andrew 2026-10-30): one width per column key in every Credit Cards view (a shared column is the same width everywhere; Card is 210px in every view). Widths come from measured content (header min-content and the p50/p90 cell widths; tools: /tmp measurement) so short values get narrow columns and every view fits 1230px (1280 window) with no horizontal scroll. Fixed layout: the table is the sum of its columns, nothing stretches. */
/* 2026-10-31 (Andrew): one width per column key, AutoFit-style at build time: the larger of the typical content and the longest header word (headers wrap only at spaces, at most 2 lines). CWSH = keys shown in more than one view: fixed at CW in every view. */
const CWSH=new Set(['itest','fee','add','fyf','other','best','pcn','kind','ptt']);
const CW={btf:104,caf:125,rcf:113,pbt:100,incalt:110,assets:100,cscore:100,emp:110,bkr:110,cblim:130,i:110,nw:80,pt:118,itest:76,prog:150,caps:90,ofv:80,exp:76,r_ev:119,r_deliv:118,r_util:86,r_drug:107,r_fly:80,r_hotel:70,r_portal:72,r_ride:90,r_stream:96,r_ent:132,r_fxsp:80,r_whole:100,r_memb:112,r_office:84,r_online:76,n:210,pk_n:210,fee:90,add:86,other:110,pcn:100,best:120,nins:108,kind:101,ofc:76,fyf:78,fx:70,apr:110,inc:120,hinc:110,cpp:60,r_groc:87,r_gas:62,r_dine:72,r_transit:80,r_bills:102,r_trav:72,r_other:100,store:60,rmore:96,covT:80,covP:80,ptt:120,x_uw:170,ins_emergency_medical:84,ins_trip_cancellation:76,ins_trip_interruption:92,ins_flight_delay:70,ins_baggage:82,ins_travel_accident:88,ins_hotel_burglary:90,ins_rental_car_cdw:76,ins_purchase_protection:90,ins_extended_warranty:94,ins_mobile_device:76,ins_price_protection:70,ins_roadside:84,pk_perk:300,pt_sc:150,pt_mem:150,pt_disc:140,pt_lounge:150,pt_nexus:130,pt_bag:140,pt_comp:160,pk_cat:110,pk_val:130,pk_rec:101,pk_en:60,pk_rg:90,pk_ex:76,pk_ev:133};
/* TEMPORARY layout mode (Andrew 2026-10-30): ?layout=1 only. Andrew drags column edges in every Credit Cards view at desktop width; widths are kept per view and column key in localStorage (ptt.layout.widths), Card stays 210px; a floating panel shows the total vs the table area (warns on horizontal scroll) and exports ptt-column-widths.json. A later push bakes the export into CW and deletes this block, the .lgrip/#lpanel CSS and tests/test_layout.py. */
const LAYOUT=/[?&]layout=1(&|$)/.test(location.search),LKEY='ptt.layout.widths';
let LW={};if(LAYOUT){try{LW=JSON.parse(localStorage.getItem(LKEY)||'{}')||{}}catch(e){LW={}}}
const LVK=()=>{const s=GKEY()=='perk'?'perk':document.querySelector('#tabs [data-s].on')?.dataset.s||st.s,g=document.querySelector('#grp [data-g].on,#imode [data-g].on')?.dataset.g,m=document.querySelector('#imode .on');return (s=='ovw'?[g||'ov']:[s,g,m&&(m.dataset.im||m.dataset.pm)]).filter(Boolean).join('/')};/* B10: Snapshot/Fees/Underwriting keep their saved width keys ov/fees/uw */
const LON=()=>LAYOUT&&innerWidth>=1024&&!(window.__tz<1);
/* 2026-10-31 (Andrew): Welcome offer is the single flexible column in every view where it appears (it takes the spare width; every other column in that view, Covers included, keeps its fixed AutoFit CW px). Views without it keep the rule above. */
const WOFLEX=new Set(['ofc','offer']);
const LCARD=k=>k=='n'||k=='pk_n';
function lSave(){try{localStorage.setItem(LKEY,JSON.stringify(LW))}catch(e){}}
function lPanel(){let p=document.getElementById('lpanel');const t=document.querySelector('.wrap:not([hidden]) table'),th=[...document.querySelectorAll('#th th')];if(!LON()||!t||!th.length||!t.closest('.wrap')?.offsetParent){if(p)p.hidden=true;return}
 if(!p){p=document.createElement('div');p.id='lpanel';p.innerHTML='<b>Layout mode</b><span data-lv></span><span data-lt></span><span data-lw></span><div><button type=button data-lexp>Export</button> <button type=button data-lrv>Reset view</button> <button type=button data-lra>Reset all</button></div>';document.body.appendChild(p)}
 p.hidden=false;const tot=Math.round(th.reduce((a,x)=>a+x.getBoundingClientRect().width,0)),av=Math.floor(t.closest('.wrap').clientWidth),vk=LVK(),n=Object.keys(LW).length;
 p.querySelector('[data-lv]').textContent=`View ${vk}${LW[vk]?' (edited)':''} · ${n} view${n==1?'':'s'} edited`;p.querySelector('[data-lt]').textContent=`Total ${tot}px of ${av}px · window ${innerWidth}px`;
 const over=tot>av+1,w=p.querySelector('[data-lw]');w.textContent=over?`Too wide by ${tot-av}px: the table would scroll sideways`:'';p.classList.toggle('over',over)}
function lGrips(){if(!LON())return;for(const x of document.querySelectorAll('#th th')){if(LCARD(x.dataset.k)||x.querySelector('.lgrip'))continue;const g=document.createElement('span');g.className='lgrip';g.title='Drag to resize';x.appendChild(g)}}
function lApply(t,th,vk){const o=LW[vk];th.forEach(x=>{const w=LCARD(x.dataset.k)?210:o[x.dataset.k]??Math.round(x.getBoundingClientRect().width);x.style.width=w+'px'});t.style.width=th.reduce((a,x)=>a+parseFloat(x.style.width),0)+'px'}
if(LAYOUT){let D=null,moved=false;
 addEventListener('pointerdown',e=>{const g=e.target.closest?.('.lgrip');if(!g||!LON())return;e.preventDefault();e.stopPropagation();const x=g.closest('th'),vk=LVK(),th=[...document.querySelectorAll('#th th')];if(!LW[vk]){LW[vk]={};th.forEach(h=>{if(!LCARD(h.dataset.k))LW[vk][h.dataset.k]=Math.round(h.getBoundingClientRect().width)})}D={x:e.clientX,w:LW[vk][x.dataset.k]??Math.round(x.getBoundingClientRect().width),k:x.dataset.k,vk};moved=false;document.documentElement.classList.add('ldrag')},true);
 addEventListener('pointermove',e=>{if(!D)return;moved=true;const w=Math.max(40,Math.round(D.w+e.clientX-D.x));LW[D.vk][D.k]=w;const t=document.querySelector('.wrap:not([hidden]) table');lApply(t,[...document.querySelectorAll('#th th')],D.vk);lSave();lPanel()});
 addEventListener('pointerup',()=>{if(!D)return;D=null;document.documentElement.classList.remove('ldrag');setTimeout(()=>moved=false,0)});
 addEventListener('click',e=>{if(e.target.closest?.('.lgrip')||moved){e.stopImmediatePropagation();e.preventDefault();return}
  if(e.target.closest?.('[data-lexp]')){const t=document.querySelector('.wrap:not([hidden]) table'),out={exported_at:new Date().toISOString(),viewport_width:innerWidth,table_area_width:t?Math.floor(t.closest('.wrap').clientWidth):null,card_px:210,widths:[]};for(const [v,o] of Object.entries(LW))for(const [k,px] of Object.entries(o))out.widths.push({view:v,column:k,px});out.views=LW;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='ptt-column-widths.json';document.body.append(a);a.click();a.remove();e.stopImmediatePropagation();return}
  if(e.target.closest?.('[data-lrv]')){delete LW[LVK()];lSave();render();e.stopImmediatePropagation();return}
  if(e.target.closest?.('[data-lra]')){if(confirm('Reset every saved column width?')){LW={};lSave();render()}e.stopImmediatePropagation();return}},true);
 addEventListener('resize',()=>{try{colW()}catch(e){}})}
/* table area = the wrap's width inside the visible window (the body can grow past the window when a wide view pans sideways; the area never follows it) */
const AVW=w=>{const cw=document.documentElement.clientWidth/(window.__tz||1),l=w.getBoundingClientRect().left+scrollX,b=w.offsetWidth-w.clientWidth;return Math.floor(window.__tz<1?w.clientWidth:Math.min(w.clientWidth,cw-2*l-b))};
function colW(){const t=document.querySelector('.wrap:not([hidden]) table'),th=[...document.querySelectorAll('#th th')];if(!t||!th.length){if(LAYOUT)lPanel();return}const ok=th.every(x=>CW[x.dataset.k]);/* 2026-10-31 refresh fix (Andrew): widths are a pure CSS function of the table area, never measured or cached. Fixed columns (Card 210, shared CWSH keys, yes/no and icon columns) get their CW px; the view's own columns get a percentage proportional to their CW. With table-layout:fixed, width:100% and min-width = the CW sum, the browser gives the fixed columns their px and splits exactly the rest of the area by those percentages, so the row always fills the area exactly, at every width, zoom level, scrollbar state and reload, and is exactly CW at the minimum (wrap scrolls below it). No JS runs on resize/zoom. */const FIX=x=>LCARD(x.dataset.k)||CWSH.has(x.dataset.k)||(st.s!='ins'&&/\b(ctr|ic)\b/.test(x.className)&&!/\b(l|wrapt|pkn)\b/.test(x.className));const WOF=th.filter(x=>WOFLEX.has(x.dataset.k));let g=WOF.length?WOF:th.filter(x=>!FIX(x));if(!g.length)g=th.filter(x=>!LCARD(x.dataset.k)&&!CWSH.has(x.dataset.k));if(!g.length)g=th.filter(x=>!LCARD(x.dataset.k));const gs=new Set(g),gsum=g.reduce((a,x)=>a+CW[x.dataset.k],0),base=ok?th.reduce((a,x)=>a+CW[x.dataset.k],0):0;th.forEach(x=>x.style.width=!ok?'':gs.has(x)?(CW[x.dataset.k]*100/gsum).toFixed(4)+'%':CW[x.dataset.k]+'px');th.forEach(x=>{if(x.querySelector(':scope>.thx'))return;const d=document.createElement('div');d.className='thx';while(x.firstChild)d.appendChild(x.firstChild);x.appendChild(d);if(!x.title)x.title=d.innerText.replace(/\s+/g,' ').trim()});t.style.width=ok?'100%':'';t.style.minWidth=ok?base+'px':'';t.classList.toggle('fx',ok);if(ok&&LON()&&LW[LVK()])lApply(t,th,LVK());if(ok)clampRows(t);if(LAYOUT){lGrips();lPanel()}}
/* PUSH 14 (Andrew 2026-10-30, Excel standard): every card row is the same height in every view. Each cell's content sits in a .cl box clamped to three 18px lines; clipped cells carry the full text as a title (hover) and expand on tap/Enter */
function clampRows(t){for(const td of t.querySelectorAll('#tb tr[data-i]>td')){if(td.firstElementChild?.classList.contains('cx')&&td.childNodes.length==1)continue;const d=document.createElement('div');d.className='cx';while(td.firstChild)d.appendChild(td.firstChild);td.appendChild(d)}requestAnimationFrame(()=>{for(const d of t.querySelectorAll('#tb .cx,#tb td.nm .cx>.nmb b,#tb td.nm .cx>small')){if(d.scrollHeight>d.clientHeight+1){d.classList.add('clip');if(!d.title)d.title=d.innerText.replace(/\s+/g,' ').trim();d.tabIndex=0}}})}
/* PUSH 14 (Andrew 2026-10-30): on table views the whole header stack is frozen (header, sub-tabs, filters bar, filters, count line + sub-sub-tabs, column headers); only the rows scroll. Each piece sticks at its own natural offset, so nothing moves when the page scrolls or a view switches. #stkbg paints the gaps between the pieces. */
(()=>{const R=document.documentElement,Q=['#nav3','#ctl','#pre','#bar'],set=()=>{const Z=window.__tz||1,h=document.querySelector('header'),w=document.querySelector('.wrap:not([hidden])');R.style.setProperty('--hh',(h?Math.round(h.getBoundingClientRect().height/Z):0)+'px');R.style.setProperty('--cw',R.clientWidth+'px')/* visible width (no scrollbar): the header pins to it when a wide table pans the page */;const on=!!(w&&w.offsetParent&&document.querySelector('#th th'));R.classList.toggle('tblv',on);let bg=document.getElementById('stkbg');if(!on){if(bg)bg.hidden=true;return}
 R.classList.add('stkm');const y=scrollY,tops=Q.map(q=>{const e=document.querySelector(q);return e&&e.offsetParent?[e,(e.getBoundingClientRect().top+y)/Z]:null}),th=(document.querySelector('#th th').getBoundingClientRect().top+y)/Z;R.classList.remove('stkm');
 tops.forEach(t=>{if(t)t[0].style.top=Math.round(t[1])+'px'});{const c=document.querySelector('#ctl'),f=document.querySelector('#filters');if(c&&f&&c.offsetParent){const q=c.getBoundingClientRect();f.style.setProperty('--ftop',Math.round(tops[1]?tops[1][1]+q.height/Z:q.bottom/Z)+'px');{/* compact Filters panel (Andrew 2026-10-30): ~560px wide, anchored at the Filters button, kept on screen; the phone sheet ignores these */const fb=document.querySelector('#fcol'),FW=Math.min(560,Math.round(q.width/Z)),bl=fb&&fb.offsetParent?fb.getBoundingClientRect().left/Z:q.left/Z,vw=document.documentElement.clientWidth/Z;f.style.setProperty('--fl',Math.round(Math.max(q.left/Z,Math.min(bl,vw-FW-16)))+'px');f.style.setProperty('--fw',FW+'px')}}}R.style.setProperty('--stk',Math.round(th)+'px');const b=document.querySelector('#bar');R.style.setProperty('--bh',(b&&b.offsetParent?Math.round(b.getBoundingClientRect().height/Z):0)+'px');
 if(!bg){bg=document.createElement('div');bg.id='stkbg';bg.setAttribute('aria-hidden','true');document.body.appendChild(bg)}bg.hidden=false};
window.stickySet=set;if(window.ResizeObserver){const ro=new ResizeObserver(()=>set());['header',...Q].forEach(q=>{const e=document.querySelector(q);if(e)ro.observe(e)})}addEventListener('resize',set);{const _r=render;render=function(){const o=_r.apply(this,arguments);try{colW()}catch(e){}try{set()}catch(e){}return o}}colW();set()})();

/* Insurance Terms (2026-10-30; level renamed from Conditions 2026-10-31): clamped to two lines so rows keep the shared height; hover shows the full text (title), tap/Enter expands it in place */
document.addEventListener('click',e=>{const c=e.target.closest('.wrap td .cond,.wrap td .cx.clip');if(c&&!e.target.closest('a,button,input,select')){c.classList.toggle('open')}});document.addEventListener('keydown',e=>{const c=e.target.closest?.('.wrap td .cond,.wrap td .cx.clip');if(c&&(e.key=='Enter'||e.key==' ')){e.preventDefault();c.classList.toggle('open')}});

/* Accounts tile reorder — uses B22 shared rdInsertIndex (Andrew 2026-11-01 icons; 2026-11-05 first↔last fix).
   Within Credit Cards / Banking / Brokers / Subs / Loyalty / Spending / Dashboard KPIs / Profile (RG). Mouse/pen: press+6px.
   Touch: press-hold 400ms. Ghost + FLIP; placeholder = .rdsrc; .rdmark tracks the insert index. Esc cancels.
   Saves STO.wallet.order[group]. Smoothness: compositor-only ghost (translate/scale/rotate), layout-slot hit-testing,
   one settle on drop. Drop past last / on trailing add/+ = last; before/after by pointer vs centre (shared helper). */
{const RG={'pw-cards':'cards','pw-banks':'banks','pw-brokers':'brokerage','pw-subs':'services','pw-loy':'points','pw-spend':'spend','pw-life':'life','pw-merch':'merch','pw-kcards':'kcards','pw-kbank':'kbank','pw-kbrok':'kbrok','pw-kloy':'kloy','pw-ksubs':'ksubs','pw-kspend':'kspend','pw-metiles':'ptiles'}/* 2026-11-02: Subs+Loyalty; B7b Spending; Profile personal-info (wallet.order.ptiles); B22: any new tile group joins RG and uses rdInsertIndex — do not add a parallel drag */,EZ=RD_EZ;let D0=null,SUP=0;
 const sibs=g=>[...g.querySelectorAll(':scope>[data-ok]')];
 const flip=(g,fn)=>{const ts=sibs(g).filter(t=>!t.classList.contains('rdsrc')),r0=new Map(ts.map(t=>[t,t.getBoundingClientRect()]));fn();if(RD_RM())return;
  ts.forEach(t=>{t.style.transition='none';t.style.translate=''});const r1=new Map(ts.map(t=>[t,t.getBoundingClientRect()]));
  ts.forEach(t=>{const a=r0.get(t),b=r1.get(t),dx=a.left-b.left,dy=a.top-b.top;if(Math.abs(dx)<.5&&Math.abs(dy)<.5){t.style.transition='';return}t.style.translate=`${dx}px ${dy}px`});
  g.offsetWidth;ts.forEach(t=>{if(!t.style.translate)return;t.style.transition=`translate .22s ${EZ}`;t.style.translate='';const done=e=>{if(e&&e.propertyName!='translate')return;t.style.transition='';t.removeEventListener('transitionend',done)};t.addEventListener('transitionend',done)})};
 const paint=()=>{const d=D0;if(!d||!d.gh)return;d.raf=0;d.gh.style.translate=`${d.px-d.ox-d.r0.left}px ${d.py-d.oy-d.r0.top}px`};
 const end=ok=>{const d=D0;if(!d)return;D0=null;clearTimeout(d.tm);if(d.raf)cancelAnimationFrame(d.raf);if(!d.on)return;SUP=Date.now();rdClearMark(d.g);
  if(!ok){flip(d.g,()=>{d.g.insertBefore(d.t,d.next)})}
  const fin=()=>{if(d.done)return;d.done=1;clearTimeout(d.ft);d.t.classList.remove('rdsrc');d.t.classList.add('rdset');d.gh.remove();document.documentElement.classList.remove('rdragging');rdClearMark(d.g);
   {const off=e=>{if(e.pointerType=='touch'||!d.t.isConnected||!d.t.contains(document.elementFromPoint(e.clientX,e.clientY))){d.t.classList.remove('rdset');document.removeEventListener('pointermove',off,true);document.removeEventListener('pointerdown',off,true)}};document.addEventListener('pointermove',off,true);document.addEventListener('pointerdown',off,true)}
   if(ok){const g=RG[d.sec],ks=sibs(d.g).map(t=>t.dataset.ok),was=d.ks.join('\n')!=ks.join('\n');if(was){STO.wallet.order=STO.wallet.order||{};STO.wallet.order[g]=ks;saveS()}}};
  if(RD_RM()){fin();return}
  const r=d.t.getBoundingClientRect(),gh=d.gh;gh.style.transition=`translate .2s ${EZ},scale .2s ${EZ},rotate .2s ${EZ},box-shadow .2s ${EZ}`;gh.classList.remove('lift');gh.classList.add('settle');gh.style.translate=`${r.left-d.r0.left}px ${r.top-d.r0.top}px`;
  gh.addEventListener('transitionend',e=>{if(e.propertyName=='translate')fin()});d.ft=setTimeout(fin,260)};
 const pick=()=>{const d=D0,r=d.t.getBoundingClientRect();d.on=1;d.r0=r;d.ox=d.x-r.left;d.oy=d.y-r.top;d.px=d.x;d.py=d.y;d.to=-1;
  try{getSelection().removeAllRanges()}catch(e){}if(document.activeElement&&d.g.contains(document.activeElement))document.activeElement.blur();
  const gh=d.t.cloneNode(true);gh.classList.add('rdghost');['id','data-ok','tabindex'].forEach(a=>gh.removeAttribute(a));gh.setAttribute('aria-hidden','true');gh.setAttribute('inert','');gh.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  Object.assign(gh.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',translate:'0px 0px'});d.g.appendChild(gh);
  {const q=gh.getBoundingClientRect();if(Math.abs(q.left-r.left)>.5||Math.abs(q.top-r.top)>.5){gh.style.left=(2*r.left-q.left)+'px';gh.style.top=(2*r.top-q.top)+'px'}}
  d.gh=gh;d.t.classList.add('rdsrc');document.documentElement.classList.add('rdragging');gh.offsetWidth;gh.classList.add('lift');if(d.touch&&navigator.vibrate)try{navigator.vibrate(8)}catch(e){}};
 /* B22: index after remove; half-based before/after; past last / on add = last. Only FLIP when the index changes (no jitter). */
 const move=(x,y)=>{const d=D0;d.px=x;d.py=y;if(!d.raf)d.raf=requestAnimationFrame(paint);
  const items=sibs(d.g),n=items.filter(t=>t!==d.t).length,gr=d.g.getBoundingClientRect();let to;
  /* outside the grid: above/left keeps the current index (no jump to 0); right/bottom or add/+ = last */
  const hit=document.elementFromPoint(x,y),sec=d.g.closest('section'),plus=sec&&sec.querySelector(':scope>h3.ach .wplus');
  const onPlus=rdIsAdd(hit)||(plus&&(()=>{const r=plus.getBoundingClientRect();return x>=r.left-4&&x<=r.right+4&&y>=r.top-4&&y<=r.bottom+4})());
  if(onPlus)to=n;
  else if(x>gr.right-4||y>gr.bottom-4)to=n;
  else if(y<gr.top-4||x<gr.left-4){if(d.to<0)return;to=d.to}
  else to=rdInsertIndex(items,d.t,x,y,'grid');
  if(to===d.to)return;d.to=to;const ref=rdRefAt(items,d.t,to);rdMarkAt(d.g,ref,d.t);
  if(d.t.nextSibling===ref||(!ref&&!d.t.nextSibling))return;
  flip(d.g,()=>{d.g.insertBefore(d.t,ref);rdMarkAt(d.g,ref,d.t)})};
 document.addEventListener('pointerdown',e=>{if(D0||e.button>0||!e.isPrimary)return;const t=e.target.closest('.wsimple [data-ok]');if(!t||e.target.closest('.rmx,[data-wrm],a,input,select'))return;const g=t.parentNode,sec=g.closest('section')?.id;if(!RG[sec])return;
  D0={t,g,sec,x:e.clientX,y:e.clientY,touch:e.pointerType=='touch',next:t.nextSibling,ks:sibs(g).map(x=>x.dataset.ok),on:0,id:e.pointerId,to:-1};if(D0.touch)D0.tm=setTimeout(()=>{if(D0&&!D0.on)pick()},400)});
 document.addEventListener('pointermove',e=>{const d=D0;if(!d||e.pointerId!=d.id)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.on){if(d.touch){if(dx*dx+dy*dy>64){clearTimeout(d.tm);D0=null}return}if(dx*dx+dy*dy<36)return;pick()}e.preventDefault();move(e.clientX,e.clientY)});
 document.addEventListener('touchmove',e=>{if(D0&&D0.on)e.preventDefault()},{passive:false});
 document.addEventListener('selectstart',e=>{if(D0)e.preventDefault()},true);
 document.addEventListener('pointerup',e=>{if(D0&&e.pointerId==D0.id)end(true)});document.addEventListener('pointercancel',e=>{if(D0&&e.pointerId==D0.id)end(!!D0.on)});
 document.addEventListener('keydown',e=>{if(e.key=='Escape'&&D0&&D0.on){e.preventDefault();e.stopImmediatePropagation();end(false)}},true);
 document.addEventListener('contextmenu',e=>{if(D0&&(D0.on||D0.touch)&&e.target.closest('.wsimple [data-ok]'))e.preventDefault()},true);
 window.addEventListener('click',e=>{if(SUP&&Date.now()-SUP<400&&e.target.closest('.wsimple [data-ok],.wsimple .ptiles')){e.preventDefault();e.stopImmediatePropagation();SUP=0}},true);
 document.addEventListener('dragstart',e=>{if(e.target.closest?.('.wsimple [data-ok]'))e.preventDefault()},true)}
/* 2026-11-02 (Andrew): on Accounts and Spending the page title and its + sit in the top nav bar (#hdt, in the header title spot (#hdt)), so they stay visible while scrolling. A copy of the in-page heading is kept in sync by watching #view, so every way of reaching the page (nav, back/forward, refresh, re-render) gives the same result; the in-page heading is hidden by CSS. Buttons keep their document-level handlers. */
/* the pages whose title (+ its + button, and the collapse-all count when they have collapsible sections) sit in the header toolbar #hdt instead of the body;
   Subscriptions joined 2026-11-05 (Andrew: the sidebar names the page, so no in-page section header);
   Profile joined the same list (title + + in the toolbar; the in-grid add tile is gone) */
const HDTV=['wallet','spending','dashboard','subscriptions','pointcards','profile','assets','soon_purchasing','soon_promotions','soon_saving','soon_invest','soon_liabilities'];
/* Andrew 2026-11-06: product sections (Credit Cards / Banking / Brokers / Investments) put their section title in #hdt too — list views and
   product detail (#card/… / #page) alike — so Profile / Accounts / product sections share the same #hdt title slot. hdtSync is called from rail(). */
(()=>{const T=()=>{const hd=document.querySelector('header'),v=document.getElementById('view');if(!hd)return;let s=document.getElementById('hdt');if(!s){s=document.createElement('div');s.id='hdt';hd.appendChild(s)}
 let k='';
 if(typeof st=='object'&&typeof secOn=='function'&&secOn()){/* section mode: title = PLINES label for st.pl (no +; the tables / product page have their own chrome) */
  const L=(PLINES.find(p=>p[0]==st.pl)||[,st.pl])[1];k=`<h2>${L}</h2>`}
 else{const h=v&&!v.hidden&&typeof st=='object'&&!st.card&&HDTV.includes(st.s)&&v.querySelector(':scope>.wsimple>.vhead>h2');k=h?h.outerHTML+(HDTV.includes(st.s)?(()=>{const bs=[...v.querySelectorAll(':scope>.wsimple>section.acs>h3.ach [data-acol]')];if(!bs.length)return'';const n=bs.reduce((t,b)=>t+(+(b.querySelector('.acc')?.textContent||'').replace(/\D/g,'')||0),0),open=bs.some(b=>b.getAttribute('aria-expanded')=='true');return`<button type=button class=hdtc data-acall=${open?'collapse':'expand'} aria-expanded=${open} title="${open?'Collapse all':'Expand all'}" aria-label="${open?'Collapse all sections':'Expand all sections'}"><span class="mute acc">(${n})</span><svg class=acv viewBox="0 0 16 16" width=18 height=18 aria-hidden=true focusable=false fill=none stroke=currentColor stroke-width=2.2 stroke-linecap=round stroke-linejoin=round><path d="M6 3.5 10.5 8 6 12.5"/></svg></button>`})():''):''}
 if(s.dataset.k!==k){s.dataset.k=k;s.innerHTML=k;const c=s.querySelector(':scope>.hdtc'),pl=s.querySelector('h2>.wplus');if(c&&pl)pl.before(c)}s.hidden=!k;document.documentElement.classList.toggle('hdton',!!k);const rt=document.getElementById('rtog');if(k&&rt)s.style.left=(rt.offsetLeft+rt.offsetWidth+14)+'px';else s.style.left=''/* Andrew 2026-11-06: same header-local offsetLeft as the profile button — getBoundingClientRect/zoom double-scaled under html.tz (product tables) and overlapped the profile icon */};hdtSync=T;addEventListener('resize',()=>T());document.addEventListener('click',e=>{const a=e.target.closest('#hdt [data-acall]');if(a){const c=a.dataset.acall=='collapse';document.querySelectorAll('#view>.wsimple>section.acs>h3.ach [data-acol]').forEach(b=>{if((b.getAttribute('aria-expanded')=='true')==c)b.click()})}if(a||e.target.closest('.wsimple [data-acol]'))setTimeout(T,0)});const go=()=>{const v=document.getElementById('view');if(!v)return setTimeout(go,50);new MutationObserver(T).observe(v,{childList:true,attributes:true,attributeFilter:['hidden']});const pg=document.getElementById('page');if(pg)new MutationObserver(T).observe(pg,{childList:true,attributes:true,attributeFilter:['hidden']});addEventListener('popstate',()=>setTimeout(T,0));addEventListener('hashchange',()=>setTimeout(T,0));T()};document.readyState=='loading'?document.addEventListener('DOMContentLoaded',go):go()})();
/* Andrew 2026-11-02: sticky section headers pin right under the nav bar; keep --hdrh equal to its real height */
(()=>{const h=document.querySelector('header');if(!h||!window.ResizeObserver)return;const f=()=>document.documentElement.style.setProperty('--hdrh',h.getBoundingClientRect().height+'px');new ResizeObserver(f).observe(h);f()})();
/* Andrew 2026-11-02: mark the pinned section band (.stuck) so it gets the floating fade */
(()=>{let q=0;const f=()=>{q=0;const t=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdrh'))||0;document.querySelectorAll('#view .wsimple section.acs>h3.ach').forEach(h=>{const s=h.parentElement.getBoundingClientRect(),r=h.getBoundingClientRect();h.classList.toggle('stuck',s.top<t-1&&r.top<=t+1&&s.bottom>r.bottom+2);h.classList.toggle('pend',s.top<t-1&&s.bottom<=r.bottom+2);h.style.setProperty('--sx',r.left+'px');h.style.setProperty('--sw',document.documentElement.clientWidth+'px')})};addEventListener('scroll',()=>{if(!q)q=requestAnimationFrame(f)},{passive:true});addEventListener('resize',f)})();

/* Confirm before any removal, branded pop-up (Andrew 2026-11-02) */
(()=>{let ok=null;const SEL='[data-wrm],[data-csrm],[data-hdel],[data-iecrm],[data-loyrm],[data-msrm],[data-sprm],[data-subrm],[data-prm],.rmx:not([data-kpirm])';/* KPI tiles re-add from +: no confirm (as before B25) */
 function ask(q,go){let m=document.getElementById('pcf');if(m)m.remove();
  m=document.createElement('div');m.id='pcf';m.innerHTML=`<div class=pcfbox role=alertdialog aria-modal=true aria-labelledby=pcfq><div class=pcfbr aria-hidden=true><span class=pcfwm>Per<b>The</b>Terms</span><img class=pcfmk src="images/brand/logo-mark.svg" width=24 height=24 alt=""></div><h3 id=pcfq></h3><p>This can't be undone.</p><div class=pcfft><button type=button class=pcfno>Cancel</button><button type=button class=pcfok>Remove</button></div></div>`;
  m.querySelector('#pcfq').textContent=q;document.body.appendChild(m);const close=()=>{m.remove();document.removeEventListener('keydown',k,true)};
  const k=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};document.addEventListener('keydown',k,true);
  m.addEventListener('click',e=>{e.stopPropagation();if(e.target===m||e.target.closest('.pcfno'))close();else if(e.target.closest('.pcfok')){close();go()}});m.querySelector('.pcfno').focus()}
 window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest(SEL);if(!b||b.closest('#pcf'))return;if(ok===b){ok=null;return}
  const al=b.getAttribute('aria-label')||'',tx=(b.textContent||'').trim(),t=b.closest('[data-ok],[data-wtile],[data-subpick],[data-ied],.btile,.ctile,tr'),nm=t&&t.querySelector('.ti,.bn,.nm,h4,td')?.textContent?.trim();
  const q=(/^Remove ./.test(al)?al:/^Remove ./.test(tx)?tx:'Remove '+(nm||'this item'))+'?';
  e.preventDefault();e.stopImmediatePropagation();ask(q,()=>{ok=b;b.click()})},true)})();

/* Optimize My Credit — pure cashback stack math (no DOM). Node + browser.
   Score = category-routed rewards (caps + service-linked rates) + sourced perks − effective annual fee.
   Joint/combo multipliers are NOT invented (see db-update-requests.md). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PTTOptMath = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CAT_KEYS = ['groc', 'dine', 'gas', 'bills', 'other', 'trav', 'ent', 'stream', 'deliv', 'ev', 'transit', 'ride', 'drug', 'online', 'util', 'hotel', 'fly', 'fxsp'];
  const EST_SPEND = { groc: 400, dine: 200, gas: 150, bills: 200, other: 400 };
  /* Store → parent category (must match Website/src/app.js MERCH). Store spend is carved out of the parent so it is never counted twice. */
  const MERCH_PARENTS = {
    st_amazon_ca_and_whole_foods_market: 'other', st_walmart: 'other', st_canadian_tire_family_stores: 'other',
    st_gas_petro_canada: 'gas', st_costco_ca: 'other', st_costco_in_store: 'other', st_costco_gas_stations: 'gas',
    st_loblaw_banner_grocery_stores: 'groc', st_shoppers_drug_mart_pharmaprix: 'other', st_esso_mobil: 'gas',
    st_joe_fresh: 'other', st_sobeys_family_empire_banners: 'groc', st_home_hardware: 'other', st_rogers: 'bills'
  };
  const ROGERS_BRANDS = ['rogers', 'fido', 'shaw', 'comwave'];

  function combos(arr, k) {
    const out = [];
    const n = arr.length;
    if (k <= 0 || k > n) return out;
    const idx = Array.from({ length: k }, (_, i) => i);
    for (;;) {
      out.push(idx.map(i => arr[i]));
      let i = k - 1;
      while (i >= 0 && idx[i] === i + n - k) i--;
      if (i < 0) break;
      idx[i]++;
      for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
    }
    return out;
  }

  /** Carve store spend out of parent categories (same as app.js spNet). */
  function spNetSpend(spendMo) {
    const o = { ...(spendMo || {}) };
    for (const [k, p] of Object.entries(MERCH_PARENTS)) {
      const v = +o[k] || 0;
      if (v) o[p] = Math.max(0, (+o[p] || 0) - v);
    }
    return o;
  }

  /** True when the wallet holds a Rogers/Fido/Shaw/Comwave service (CITED condition for Red 2%). */
  function rogersServiceHeld(wallet) {
    wallet = wallet || {};
    const hit = (s) => {
      const t = String(s || '').toLowerCase();
      return ROGERS_BRANDS.some(b => t === b || t.startsWith(b + ' ') || t.startsWith(b + '·') || t.startsWith(b + ' ·') || t.includes(b));
    };
    for (const x of (wallet.tel || [])) {
      if (!x) continue;
      if (hit(x.i) || hit(x.brand) || hit(String(x.i || '').split(' · ')[0])) return { held: true, via: 'tel', tag: 'CITED' };
    }
    for (const k of (wallet.services || [])) { if (hit(k)) return { held: true, via: 'services', tag: 'CITED' }; }
    for (const k of Object.keys(wallet.svc || {})) { if (hit(k)) return { held: true, via: 'svc', tag: 'CITED' }; }
    const st = wallet.status || {};
    for (const [prog, row] of Object.entries(st)) {
      if (hit(prog) || hit((row && row.tier) || '')) return { held: true, via: 'status', tag: 'CITED' };
    }
    return { held: false, via: null, tag: 'CITED' };
  }

  /**
   * Build an optimizer card from a screener card row.
   * Includes store rates + NOACC (r_st_* === 0). Applies Rogers service-linked rates when ctx.rogersHeld is set.
   */
  function cardFromDb(c, ctx) {
    ctx = ctx || {};
    if (!c || c.st === 'discontinued') return null;
    if (c.rt !== 'Cash back') return null;
    const rates = {};
    for (const k of CAT_KEYS) { if (c['r_' + k] != null) rates[k] = +c['r_' + k]; }
    if (c.other != null) rates.other = +c.other;
    for (const key of Object.keys(c)) {
      if (key.startsWith('r_st_') && c[key] != null) rates[key.slice(2)] = +c[key];
    }
    const noacc = {};
    for (const k of Object.keys(rates)) {
      if (k.startsWith('st_') && rates[k] === 0) noacc[k] = 1;
    }
    const notes = [];
    /* Rogers Red family: posted "other" is the service-linked accelerated rate; without the service use the base (CITED). */
    if (/^rogers-red/.test(c.id) && !/legend/.test(c.id)) {
      const isWE = /world-elite/.test(c.id);
      const accel = isWE ? 2 : 2;
      const base = isWE ? 1.5 : 1;
      const held = !!(ctx.rogersHeld && ctx.rogersHeld.held);
      const use = held ? accel : base;
      for (const k of Object.keys(rates)) {
        if (k === 'fxsp' && isWE) continue; /* WE keeps 3% FX when service-linked; without service FX stays at posted base if lower */
        if (+rates[k] > use) rates[k] = use;
      }
      rates.other = use;
      if (isWE && !held && rates.fxsp != null && rates.fxsp > 2) rates.fxsp = 2;
      notes.push({
        kind: 'rogers_rate',
        label: held
          ? ('Rogers-family service held → ' + use + '% accelerated rate')
          : ('No Rogers/Fido/Shaw/Comwave service → ' + use + '% base rate'),
        tag: (ctx.rogersHeld && ctx.rogersHeld.tag) || 'CITED',
        held
      });
    }
    const caps = c.caps ? { ...c.caps } : {};
    /* Annual accelerated-spend pool (Rogers: first $16k/$61k at accelerated rates). Stored as caps.other in the DB. */
    let accelCap = null;
    if (/^rogers-red/.test(c.id) && caps.other != null) {
      accelCap = +caps.other;
      delete caps.other; /* not a per-category other cap */
    }
    const perks = [];
    let perkCad = 0;
    for (const f of (c.pf || [])) {
      if (f.u === 'credit' && f.uv != null && f.cur === 'CAD') {
        const v = f.uv * (f.q || 1) / (f.fr === 'per_48_months' ? 4 : 1);
        if (f.fr === 'first_year') continue;
        perks.push({ kind: 'credit', title: f.ti || 'Statement credit', cad: v, tag: f.vb || f.ev || 'CITED' });
        perkCad += v;
      } else if (f.t === 'birthday_bonus' && f.u === 'pct_of_annual_earn' && f.q != null) {
        const capCad = (f.cap != null && c.cpp != null) ? f.cap * c.cpp / 100 : null;
        perks.push({ kind: 'birthday_pct', title: f.ti || 'Birthday bonus', pct: f.q, capCad, tag: f.vb || 'ESTIMATE' });
      }
    }
    for (const m of (c.credd || [])) {
      const amt = (m.v && /\$([0-9]+(?:\.[0-9]+)?)/.exec(m.v)) ? +RegExp.$1 : null;
      if (amt != null && /credit|rebate|refund/i.test(m.t || '')) {
        if (!perks.some(p => p.kind === 'credit' && p.cad === amt)) {
          perks.push({ kind: 'credit', title: m.t, cad: amt, tag: m.ev === 'VERIFIED' ? 'CITED' : (m.ev || 'CITED') });
          perkCad += amt;
        }
      }
    }
    return {
      id: c.id, name: c.n, fee: c.fee, rates, caps, other: rates.other, perks, perkCad, noacc,
      accelCap, accelBase: rates.other, rateNotes: notes
    };
  }

  /** Route annual spend across a stack. Respects per-category caps, NOACC, and card-level accelCap. */
  function routeRewards(cards, spendMo) {
    const rows = [];
    let rew = 0, tot = 0;
    const accelUsed = {};
    const keys = Object.keys(spendMo || {}).filter(k => +spendMo[k] > 0);
    const order = CAT_KEYS.filter(k => keys.includes(k)).concat(keys.filter(k => !CAT_KEYS.includes(k)));
    for (const k of order) {
      let left = (+spendMo[k] || 0) * 12;
      if (left <= 0) continue;
      tot += left;
      const cand = [];
      for (const c of cards) {
        if (c.noacc && c.noacc[k]) continue;
        const rCat = c.rates && c.rates[k] != null ? +c.rates[k] : null;
        const rBase = c.rates && c.rates.other != null ? +c.rates.other : (c.other != null ? +c.other : null);
        const catCap = (c.caps && c.caps[k] != null) ? +c.caps[k] : Infinity;
        if (rCat != null) cand.push({ id: c.id, r: rCat, cap: catCap, via: k, accel: c.accelCap != null });
        if (rBase != null && rCat == null) cand.push({ id: c.id, r: rBase, cap: Infinity, via: 'other', accel: c.accelCap != null });
        else if (rBase != null && rCat != null && rBase !== rCat) {
          /* base fallback after category / accel exhausted is handled below via remaining left */
        }
      }
      cand.sort((a, b) => b.r - a.r);
      const use = [];
      for (const x of cand) {
        if (left <= 0) break;
        let room = x.cap;
        if (x.accel) {
          const c = cards.find(z => z.id === x.id);
          if (c && c.accelCap != null) {
            const used = accelUsed[x.id] || 0;
            const rem = Math.max(0, c.accelCap - used);
            /* spend beyond accelCap earns at accelBase (usually equal to current other after service adjust) */
            if (rem <= 0) {
              const base = c.accelBase != null ? +c.accelBase : (c.rates && c.rates.other != null ? +c.rates.other : x.r);
              if (base < x.r) {
                /* defer to a lower-rate pass: inject base candidate */
                cand.push({ id: x.id, r: base, cap: Infinity, via: 'base_after_cap', accel: false });
                cand.sort((a, b) => b.r - a.r);
                continue;
              }
            } else room = Math.min(room, rem);
          }
        }
        const amt = Math.min(left, room);
        if (amt <= 0) continue;
        use.push({ ...x, amt });
        left -= amt;
        if (x.accel) accelUsed[x.id] = (accelUsed[x.id] || 0) + amt;
      }
      /* leftover after accel: try base rates for cards that hit accelCap */
      if (left > 0) {
        for (const c of cards) {
          if (left <= 0) break;
          if (!(c.accelCap != null && (accelUsed[c.id] || 0) >= c.accelCap)) continue;
          if (c.noacc && c.noacc[k]) continue;
          const base = c.accelBase != null ? +c.accelBase : (c.rates && c.rates.other != null ? +c.rates.other : null);
          /* When service held, accelBase equals accelerated rate — after cap issuer posts 1% (Red) / 1.5% (WE). */
          let post = base;
          if (/^rogers-red/.test(c.id) && !/legend/.test(c.id)) {
            post = /world-elite/.test(c.id) ? 1.5 : 1;
          }
          if (post == null) continue;
          const amt = left;
          use.push({ id: c.id, r: post, cap: Infinity, via: 'after_accel_cap', amt, accel: false });
          left = 0;
        }
      }
      const r = use.reduce((s, x) => s + x.amt * Math.max(x.r, 0) / 100, 0);
      rew += r;
      rows.push({ k, use, r, left });
    }
    return { rows, rew, sp: tot, accelUsed };
  }

  function perkValue(cards) {
    let tot = 0;
    const items = [];
    for (const c of cards) {
      for (const p of (c.perks || [])) {
        let v = null, tag = p.tag || 'ESTIMATE', why = '';
        if (p.kind === 'credit' && p.cad != null) { v = +p.cad; tag = p.tag || 'CITED'; }
        else if (p.kind === 'birthday_pct' && p.pct != null) {
          const e = (p.earn != null) ? +p.earn : 0;
          v = e * (+p.pct) / 100;
          if (p.capCad != null) v = Math.min(v, +p.capCad);
          tag = p.tag || 'ESTIMATE';
        } else { why = 'no sourced CAD value'; }
        if (v != null && v > 0) { tot += v; items.push({ id: c.id, title: p.title || p.kind, v, tag }); }
        else if (p.kind) items.push({ id: c.id, title: p.title || p.kind, v: null, tag, why: why || 'listed, not counted' });
      }
    }
    return { tot, items };
  }

  function applyFeeRebates(cards, packagesHeld, feereb, walletBankRebates) {
    const notes = [];
    const fee = {};
    for (const c of cards) fee[c.id] = c.fee == null ? null : +c.fee;
    const held = new Set((packagesHeld || []).map(p => p.key));
    const byPkg = {};
    for (const r of (feereb || [])) {
      if (!r.card_id || r.rebate_cad === '' || r.rebate_cad == null) continue;
      if (!held.has(r.package_key)) continue;
      (byPkg[r.package_key] = byPkg[r.package_key] || []).push(r);
    }
    for (const [pk, rows] of Object.entries(byPkg)) {
      let best = null;
      for (const r of rows) {
        if (!(r.card_id in fee) || fee[r.card_id] == null) continue;
        const save = Math.min(fee[r.card_id], +r.rebate_cad);
        if (save <= 0) continue;
        if (!best || save > best.save) best = { r, save };
      }
      if (best) {
        fee[best.r.card_id] = Math.max(0, fee[best.r.card_id] - best.save);
        notes.push({ card_id: best.r.card_id, label: 'Fee covered by ' + (best.r.package_label || pk), save: best.save, tag: best.r.evidence_tag || 'CITED', package_key: pk });
      }
    }
    const usedCard = new Set(notes.map(n => n.card_id));
    const byBank = {};
    for (const r of (walletBankRebates || [])) {
      if (!r.card_id || !(r.card_id in fee) || fee[r.card_id] == null) continue;
      if (usedCard.has(r.card_id)) continue;
      (byBank[r.bank_id || r.label] = byBank[r.bank_id || r.label] || []).push(r);
    }
    for (const rows of Object.values(byBank)) {
      let best = null;
      for (const r of rows) {
        const cap = r.rebate_cad != null && r.rebate_cad !== '' ? +r.rebate_cad : fee[r.card_id];
        const save = Math.min(fee[r.card_id], cap);
        if (save <= 0) continue;
        if (!best || save > best.save) best = { r, save };
      }
      if (best) {
        fee[best.r.card_id] = Math.max(0, fee[best.r.card_id] - best.save);
        usedCard.add(best.r.card_id);
        notes.push({ card_id: best.r.card_id, label: 'Fee covered by ' + (best.r.label || 'bank package'), save: best.save, tag: best.r.tag || 'CITED', package_key: best.r.bank_id || null });
      }
    }
    return { fee, notes };
  }

  function scoreStack(cards, spendMo, opts) {
    opts = opts || {};
    const spend = opts.skipSpNet ? (spendMo || {}) : spNetSpend(spendMo || {});
    const O = routeRewards(cards, spend);
    const earnBy = {};
    for (const row of O.rows) for (const u of row.use) earnBy[u.id] = (earnBy[u.id] || 0) + u.amt * Math.max(u.r, 0) / 100;
    const cards2 = cards.map(c => ({
      ...c,
      perks: (c.perks || []).map(p => p.kind === 'birthday_pct' ? { ...p, earn: earnBy[c.id] || 0 } : p)
    }));
    const P = perkValue(cards2);
    const FR = applyFeeRebates(cards, opts.packagesHeld, opts.feereb, opts.walletBankRebates);
    let fees = 0, unk = 0;
    const perCard = cards.map(c => {
      const f = FR.fee[c.id];
      if (f == null) unk++;
      else fees += f;
      const earn = earnBy[c.id] || 0;
      const note = FR.notes.filter(n => n.card_id === c.id);
      return { id: c.id, name: c.name, earn, fee: f, feeNotes: note, net: earn - (f || 0), rateNotes: c.rateNotes || [] };
    });
    const rateNotes = cards.flatMap(c => (c.rateNotes || []).map(n => ({ ...n, card_id: c.id })));
    const net = O.rew + P.tot - fees;
    return {
      net, rew: O.rew, perks: P.tot, fees, unk, rows: O.rows, perkItems: P.items, feeNotes: FR.notes,
      perCard, ids: cards.map(c => c.id), spend: O.sp, rateNotes, spendUsed: spend,
      jointNote: 'Joint/combo multipliers are not in the DB yet — not included.',
      estimatedSpend: !!opts.estimatedSpend
    };
  }

  function dominates(a, b, keys) {
    const fa = a.fee == null ? Infinity : +a.fee, fb = b.fee == null ? Infinity : +b.fee;
    if (fa > fb) return false;
    const pa = +(a.perkCad || 0), pb = +(b.perkCad || 0);
    if (pa < pb) return false;
    let strict = fa < fb || pa > pb;
    for (const k of keys) {
      const ra = a.rates && a.rates[k] != null ? +a.rates[k] : (a.rates && a.rates.other != null ? +a.rates.other : -1);
      const rb = b.rates && b.rates[k] != null ? +b.rates[k] : (b.rates && b.rates.other != null ? +b.rates.other : -1);
      if (ra < rb) return false;
      if (ra > rb) strict = true;
    }
    return strict;
  }

  function pruneDominated(cards, spendMo) {
    const keys = Object.keys(spendMo || {}).filter(k => +spendMo[k] > 0);
    const K = keys.length ? keys : ['groc', 'dine', 'gas', 'bills', 'other'];
    return cards.filter(c => !cards.some(o => o.id !== c.id && dominates(o, c, K)));
  }

  function bestStacks(cards, spendMo, opts) {
    opts = opts || {};
    const spend = opts.skipSpNet ? (spendMo || {}) : spNetSpend(spendMo || {});
    const use = opts.prune ? pruneDominated(cards, spend) : cards.slice();
    const out = {};
    for (const k of [1, 2, 3]) {
      let best = null;
      for (const stack of combos(use, Math.min(k, use.length))) {
        const s = scoreStack(stack, spendMo, opts);
        if (!best || s.net > best.net || (s.net === best.net && s.fees < best.fees)) best = s;
      }
      out[k] = best;
    }
    return { best: out, pool: use.length, poolIds: use.map(c => c.id) };
  }

  /** One-shot: build pool + run bestStacks from screener cards + wallet (shared by UI and harness). */
  function optimizeCashback(screenerCards, spendMo, wallet, opts) {
    opts = opts || {};
    const rogersHeld = rogersServiceHeld(wallet);
    const pool = (screenerCards || []).map(c => cardFromDb(c, { rogersHeld })).filter(Boolean);
    const live = opts.liveFilter ? pool.filter(opts.liveFilter) : pool;
    return {
      ...bestStacks(live, spendMo, opts),
      rogersHeld,
      spendNet: spNetSpend(spendMo || {}),
      poolAll: live.length
    };
  }

  return {
    CAT_KEYS, EST_SPEND, MERCH_PARENTS, ROGERS_BRANDS,
    combos, spNetSpend, rogersServiceHeld, cardFromDb,
    routeRewards, perkValue, applyFeeRebates, scoreStack,
    dominates, pruneDominated, bestStacks, optimizeCashback
  };
});

/* Accounts Optimize — coming-soon placeholder on Credit Cards / Banking / Brokers.
   Keeps PTTOptimize math helpers used by fee/rebate display and PerYourTerms.
   Old multi-step "Optimize My Credit" wizard removed (Andrew 2026-11-06). */
(function () {
  if (typeof PTTOptMath === 'undefined') return;
  const M = PTTOptMath;
  const OPT = { o: false, from: null };

  function walletBankRebates() {
    const out = [], miss = [];
    const banks = (STO.wallet && STO.wallet.banks) || [];
    const accs = (D.bank && D.bank.accounts) || [];
    for (const b of banks) {
      const o = accs.find(a => a.id == b.id); if (!o) continue;
      for (const w of (o.wv || [])) {
        if (w.cid) {
          let amt = null;
          if (w.v && /\$([0-9]+(?:\.[0-9]+)?)/.exec(w.v)) amt = +RegExp.$1;
          const card = C[BYID0[w.cid]];
          if (amt == null && card && card.fee != null) amt = +card.fee;
          out.push({ bank_id: o.id, label: o.n, card_id: w.cid, rebate_cad: amt, tag: w.cs === 'CONFIRMED' ? 'CITED' : (w.cs || 'CITED') });
        } else {
          miss.push({ bank: o.n, to: w.to || '', note: w.m || w.v || '' });
        }
      }
    }
    return { rebates: out, missing: miss };
  }
  function packagesHeld() {
    const out = [], seen = new Set();
    const banks = (STO.wallet && STO.wallet.banks) || [];
    const st = ((STO.wallet && STO.wallet.status) || {});
    for (const r of (D.feereb || [])) {
      if (seen.has(r.package_key)) continue;
      const bankHit = r.bank_account_id && banks.some(b => b && (b.id === r.bank_account_id || (b.k && String(b.k).startsWith(r.bank_account_id))));
      const stHit = r.status_program && st[r.status_program] && st[r.status_program].tier === r.status_tier;
      if (bankHit || stHit) { seen.add(r.package_key); out.push({ key: r.package_key, label: r.package_label || r.package_key }); }
    }
    const accs = (D.bank && D.bank.accounts) || [];
    for (const b of banks) {
      const o = accs.find(a => a.id == b.id); if (!o || !(o.wv || []).length) continue;
      const key = 'bank:' + o.id;
      if (seen.has(key)) continue;
      seen.add(key); out.push({ key, label: o.n });
    }
    return out;
  }
  function cardToOpt(c) {
    if (!c || !LIVE(c)) return null;
    return M.cardFromDb(c, { rogersHeld: M.rogersServiceHeld(STO.wallet || {}) });
  }
  function cashbackPool() {
    const rogersHeld = M.rogersServiceHeld(STO.wallet || {});
    return C.map(c => LIVE(c) ? M.cardFromDb(c, { rogersHeld }) : null).filter(Boolean);
  }
  function spendProfile() {
    const base = (STO.wallet && STO.wallet.spend) ? { ...STO.wallet.spend } : { ...(W.spend || {}) };
    const tot = Object.keys(base).reduce((t, k) => t + (+base[k] || 0), 0);
    if (tot > 0) return { spend: base, spendNet: M.spNetSpend(base), estimatedSpend: false };
    return { spend: { ...M.EST_SPEND }, spendNet: { ...M.EST_SPEND }, estimatedSpend: true };
  }
  function runOpt(k) {
    const { spend, spendNet, estimatedSpend } = spendProfile();
    const pkgs = packagesHeld();
    const WBR = walletBankRebates();
    const pool = cashbackPool();
    const opts = { prune: true, packagesHeld: pkgs, feereb: D.feereb || [], walletBankRebates: WBR.rebates, estimatedSpend };
    const r = M.bestStacks(pool, spend, opts);
    const full = M.bestStacks(pool, spend, { ...opts, prune: false });
    return { pick: r.best[k], all: r.best, pool: r.pool, full: full.best[k], packages: pkgs, bankRebates: WBR.rebates, missingBankEdges: WBR.missing, estimatedSpend, spend, spendNet, rogersHeld: M.rogersServiceHeld(STO.wallet || {}) };
  }

  /* Small Institutions-style art; succinct coming-soon copy (Andrew 2026-11-06). */
  const ART = `<svg class=soonart viewBox="0 0 520 280" role=img aria-label="Illustration: a small spark beside stacked cards"><defs><linearGradient id=sgop x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color="#0a1020"/><stop offset=.62 stop-color="#101c3a"/><stop offset=1 stop-color="#12306b"/></linearGradient><radialGradient id=sgopg cx=.5 cy=.4 r=.55><stop offset=0 stop-color="#4e8cff" stop-opacity=.3 /><stop offset=1 stop-color="#4e8cff" stop-opacity=0 /></radialGradient></defs><rect width=520 height=280 rx=22 fill="url(#sgop)"/><circle cx=260 cy=130 r=150 fill="url(#sgopg)"/><g class="sanim sfloat"><rect x=150 y=88 width=170 height=104 rx=14 fill="#1b2a52" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(-8 235 140)"/><rect x=170 y=108 width=170 height=104 rx=14 fill="#24366a" stroke="rgba(255,255,255,.5)" stroke-width=3 transform="rotate(4 255 160)"/><rect x=186 y=128 width=34 height=22 rx=5 fill="#ffd23f"/><path d="M360 150l8 18 20 2-15 13 4 20-17-10-17 10 4-20-15-13 20-2z" fill="#5ee0a0"/></g></svg>`;

  function draw() {
    let h = document.querySelector('#optiw');
    if (!OPT.o) {
      if (h) { h.innerHTML = ''; h.hidden = true; }
      document.body.classList.remove('wzopen');
      return;
    }
    if (!h) { h = document.createElement('div'); h.id = 'optiw'; document.body.append(h); }
    h.hidden = false;
    h.innerHTML = `<div id=wzbg data-optix></div><div id=wiz class=optisoon role=dialog aria-modal=true aria-labelledby=optih><div class=wzhd><h3 id=optih>Optimize</h3><button type=button class=wzx data-optix aria-label="Close" title="Close">&#x2715;</button></div><div class=wzbd><div class=soon>${ART}<p class=soonk>Optimization coming soon</p><p class="mute optisoonsub">A little optimization for the accounts you hold — not ready yet.</p></div></div><div class=wzft><button type=button class=btn data-optix>Close</button></div></div>`;
    document.body.classList.add('wzopen');
  }
  function open(from) { OPT.o = true; OPT.from = from || null; draw(); document.querySelector('#optiw [data-optix].btn, #optiw .wzx')?.focus(); }
  function close() { OPT.o = false; draw(); (OPT.from && OPT.from.isConnected ? OPT.from : document.querySelector('[data-opti]'))?.focus(); }

  const SECS = ['#pw-cards', '#pw-banks', '#pw-brokers'];
  function ensureBtn(root) {
    SECS.forEach(sel => {
      const head = (root || document).querySelector(sel + ' > h3.ach');
      if (!head || head.querySelector('[data-opti]')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'opti'; b.dataset.opti = '1';
      b.setAttribute('aria-haspopup', 'dialog');
      b.setAttribute('aria-label', 'Optimize'); b.title = 'Optimize';
      b.textContent = 'Optimize';
      /* + stays beside the title; Optimize sits at the trailing edge */
      head.append(b);
    });
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-opti],[data-optix]');
    if (!t) return;
    if (t.matches('[data-opti]')) { e.preventDefault(); e.stopImmediatePropagation(); open(t); return; }
    if (t.matches('[data-optix]') || (t.id === 'wzbg' && t.closest('#optiw'))) { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);
  document.addEventListener('keydown', e => {
    if (OPT.o && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);

  function hook() {
    try {
      if (VIEWS && VIEWS.wallet) {
        const prev = VIEWS.wallet;
        VIEWS.wallet = function () { const r = prev.apply(this, arguments); try { ensureBtn(); } catch (e) { } return r; };
      }
    } catch (e) { }
    ensureBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);
  else setTimeout(hook, 0);
  new MutationObserver(() => { if (document.querySelector('#pw-cards,#pw-banks,#pw-brokers')) ensureBtn(); })
    .observe(document.documentElement, { childList: true, subtree: true });

  window.PTTOptimize = { open, close, runOpt, packagesHeld, walletBankRebates, cashbackPool, spendProfile, cardToOpt, M, spNetSpend: M.spNetSpend, rogersServiceHeld: M.rogersServiceHeld, cardFromDb: M.cardFromDb };
})();

/* ---- Account sync (plan A, Docs/auth-billing-plan.md §9; Andrew 2026-10-31; session model Andrew 2026-11-06) ----
   Off unless the page carries <meta name="ptt-google-client-id" content="…"> (the deploy adds it for the Cloudflare host only),
   so the GitHub Pages build and file:// copies are unchanged: no Log in item, no network calls.
   Working copy: sessionStorage (this tab only) for guests and as a signed-in tab cache; never long-lived localStorage user data.
   Sync keys are fine-grained (SYNCK): wallet.<field>, ui.<field>, screen, saved_screens, ls.ptt.user_promo. Last write wins per key
   on the edit time (server compare-and-set). First sync on a device merges wallet lists with wxMerge; a guest's first sign-in in
   the same tab uses wxGuestMerge (server wins conflicts; guest-only holdings are kept, deduped). Later syncs merge wallet lists
   per item (wxList). Unsent keys wait in a queue (ptt.sync.q) until online + signed in. Logout wipes every user key on the device.
   Server: Website/server (Pages Functions + D1); the server re-checks the allowlist on every request. Values are plain JSON now;
   the protocol carries an `enc` field per key so encrypted values can be added later without a schema change. */
const AUTHCID=document.querySelector('meta[name="ptt-google-client-id"]')?.content||'',AUTH=!!AUTHCID&&/^https?:$/.test(location.protocol);
const SYM='ptt.sync',SYLS=['ptt.user_promo'],SYSKIP=new Set(['updated_at']);
const syH=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+':'+s.length};
const syMeta=()=>{let m;try{m=JSON.parse(storeGet(SYM)||'null')}catch(e){}m=m&&typeof m=='object'?m:{};m.keys=m.keys||{};m.q=Array.isArray(m.q)?m.q:[];m.cur=+m.cur||0;if(!m.dev)m.dev=Math.random().toString(36).slice(2,10);return m};
let SYNC=syMeta();const sySave=()=>{try{if(syState&&syState.email)storeSet(SYM,JSON.stringify(SYNC));else storeRm(SYM)}catch(e){}};
/* the fine-grained key set, read from the live store */
function SYNCK(){const o={};for(const k of Object.keys(STO.wallet||{}))if(!SYSKIP.has(k))o['wallet.'+k]=STO.wallet[k];for(const k of Object.keys(STO.ui||{}))o['ui.'+k]=STO.ui[k];
 o.screen=STO.screen||{};o.saved_screens=STO.saved_screens||[];for(const k of SYLS){const v=storeGet(k);o['ls.'+k]=v==null?null:v}return o}
const syGet=k=>SYNCK()[k];
function sySet(o,k,v){/* o = a copy of STO; ls.* keys go to the tab session store */
 if(k.startsWith('ls.')){const lk=k.slice(3);if(!SYLS.includes(lk))return;try{v==null?storeRm(lk):storeSet(lk,v)}catch(e){}return}
 const[a,b]=k.split(/\.(.+)/);if((a=='wallet'||a=='ui')&&b){o[a]=o[a]||{};if(v==null)delete o[a][b];else o[a][b]=v}else if(k=='screen')o.screen=v||{};else if(k=='saved_screens')o.saved_screens=v||[]}
/* scan after every save: a key whose value changed gets a new edit time and joins the queue */
function syScan(t=NOW()){const all=SYNCK();let n=0;for(const[k,v]of Object.entries(all)){const h=syH(JSON.stringify(v===undefined?null:v)),m=SYNC.keys[k];if(!m||m.h!=h){SYNC.keys[k]={h,t};if(!SYNC.q.includes(k))SYNC.q.push(k);n++}}
 for(const k of Object.keys(SYNC.keys))if(!(k in all)&&SYNC.keys[k].h!='-'){SYNC.keys[k]={h:'-',t};if(!SYNC.q.includes(k))SYNC.q.push(k);n++}/* a removed field syncs as null */
 if(n)sySave();return n}
const syApi=(p,o={})=>fetch('/api/'+p,{credentials:'same-origin',...o,headers:{'content-type':'application/json',...(o.headers||{})}});
let syBusy=null,syT=0;const syState={email:SYNC.email||null,first:SYNC.first||null,err:null,last:null};
/* apply remote items: first sync merges wallet lists (wxMerge, or wxGuestMerge when SYNC.guest); everything else is last write wins */
function syApply(items,first){if(!items.length)return 0;const o=JSON.parse(JSON.stringify(STO)),R={wallet:{}};let n=0;
 for(const it of items){if(it.enc)continue;/* encrypted values: not in this version */let v;try{v=JSON.parse(it.value)}catch(e){continue}
  const m=SYNC.keys[it.key],lw=it.key.startsWith('wallet.')&&WXS.some(([w])=>'wallet.'+w==it.key),wkey=it.key.startsWith('wallet.')?it.key.slice(7):null;
  const sh=syH(JSON.stringify(v===undefined?null:v));/* hash of the server copy: a merged result that differs is re-sent by syScan */
  if(m&&m.h==sh&&syH(JSON.stringify(syGet(it.key)===undefined?null:syGet(it.key)))==sh){if(it.updated_at>m.t)m.t=it.updated_at;SYNC.q=SYNC.q.filter(k=>k!=it.key);continue}/* B23: the server holds exactly what we hold (e.g. our own push echoed back by the next pull): nothing to apply, no repaint */
  if(first&&lw){R.wallet[wkey]=v;continue}
  if(first&&SYNC.guest&&wkey){R.wallet[wkey]=v;SYNC.keys[it.key]={h:sh,t:it.updated_at};SYNC.q=SYNC.q.filter(k=>k!=it.key);continue}/* guest first sign-in: every wallet.* key goes through wxGuestMerge */
  if(!first&&m&&m.t>=it.updated_at){/* local edit is newer (or the same): keep it, it is in the queue; a list still takes newer server items per item (local membership keeps local deletes) */
   if(lw){const w=it.key.slice(7),c=(o.wallet||{})[w];if(Array.isArray(c)&&Array.isArray(v)){const x=wxList(w,v,c,m.t);if(JSON.stringify(x)!=JSON.stringify(c)){o.wallet[w]=x;n++}}}continue}
  if(lw){const w=it.key.slice(7);v=wxList(w,(o.wallet||{})[w],v,it.updated_at)}/* 2026-11-03: per item newest-wins (wxPick), server membership (deletes stick), not whole-list replace */
  const b4=JSON.stringify(syGet(it.key)===undefined?null:syGet(it.key));sySet(o,it.key,v);SYNC.keys[it.key]={h:sh,t:it.updated_at};SYNC.q=SYNC.q.filter(k=>k!=it.key);if(JSON.stringify(v===undefined?null:v)==b4)continue;/* B23: merged value = what we hold: no repaint */n++}
 let next=o;if(first&&Object.keys(R.wallet).length){next=(SYNC.guest?wxGuestMerge:wxMerge)(o,R);n++}
 if(n){sySave();wxApply(next,{},'sync')}return n}
async function syPull(){const first=!SYNC.done,r=await syApi('sync?since='+(first?0:SYNC.cur));if(r.status==401||r.status==403){syOut(true);return false}if(!r.ok)throw new Error('sync '+r.status);
 const d=await r.json();syApply(d.items||[],first);SYNC.cur=d.now||SYNC.cur;if(first){SYNC.done=1;syScan()}sySave();return true}
async function syPush(){syScan();if(!SYNC.q.length)return true;const all=SYNCK(),ks=SYNC.q.slice(0,200),items=ks.map(k=>({key:k,value:JSON.stringify(all[k]===undefined?null:all[k]),enc:null,updated_at:SYNC.keys[k]?.t||NOW()}));
 const r=await syApi('sync',{method:'PUT',body:JSON.stringify({device:SYNC.dev,items})});if(r.status==401||r.status==403){syOut(true);return false}if(!r.ok)throw new Error('sync '+r.status);
 const d=await r.json(),done=new Set([...(d.applied||[]),...(d.stale||[]).map(x=>x.key)]);SYNC.q=SYNC.q.filter(k=>!done.has(k));sySave();syApply(d.stale||[],false);return true}
function syRun(){if(!AUTH||!syState.email||!navigator.onLine)return Promise.resolve(false);if(syBusy)return syBusy;
 syBusy=(async()=>{try{if(await syPull())await syPush();syState.err=null;syState.last=NOW();kubLoad(false,true)}catch(e){syState.err=String(e.message||e)}finally{syBusy=null;syPaint()}})();return syBusy}
const syLater=()=>{if(!AUTH||!syState.email)return;clearTimeout(syT);syT=setTimeout(()=>syRun(),2000)};
function syOut(local){const e=syState.email;syState.email=null;syState.first=null;if(KUB)KUB.d=null;kubPaint();
 try{resetSignedOut()}catch(e){wipeUserStores();STO=blankS();W.cards=[];W.spend={...STO.wallet.spend}}
 SYNC={keys:{},q:[],cur:0,done:0,dev:Math.random().toString(36).slice(2,10)};delete SYNC.guest;sySave();syPaint();
 try{if(typeof render=='function')render()}catch(e){}
 if(!local&&e)syApi('auth/logout',{method:'POST'}).catch(()=>{})}
const SYERR={403:'Only the site owner can sign in.',401:'Google sign-in was not accepted. Please try again.',denied:'Only the site owner can sign in.',csrf:'Sign-in check failed (cookie blocked?). Please try again.',error:'Sign-in failed. Please try again.',gsi:'Google sign-in could not load. Check your connection or content blockers, then try again.'};
const syMsg=(t,err)=>{const m=$('#authm');if(m){m.textContent=t||'';m.className=err?'wxerr':'mute'}};
async function syIn(credential){let r;try{r=await syApi('auth/google',{method:'POST',body:JSON.stringify({credential})})}catch(e){syMsg(SYERR.error,1);return false}
 if(!r.ok){syState.err=SYERR[r.status]||SYERR.error;syMsg(syState.err,1);syPaint();return false}
 const d=await r.json();syState.email=SYNC.email=d.email;syState.first=SYNC.first=syFirst(d);syState.err=null;
 SYNC.guest=!!(storeGet(SK)||(STO.wallet&&((STO.wallet.cards||[]).length||(STO.wallet.banks||[]).length||(STO.wallet.brokerage||[]).length||(STO.wallet.services||[]).length||(STO.wallet.points||[]).length||(STO.wallet.tel||[]).length||(STO.wallet.profile&&Object.keys(STO.wallet.profile).length))));
 SYNC.done=0;SYNC.cur=0;sySave();syClose();await syRun();delete SYNC.guest;sySave();return true}
/* Google Identity Services: official renderButton only (never One Tap). Popup when the browser allows it;
   otherwise full-page redirect (login_uri = /api/auth/google). initialize() is one-shot — mode switches tear GIS down.
   Andrew 2026-11-06: no "popup blocked?" copy. Detect a blocked popup / FedCM miss and fall back to redirect silently. */
let gsiP=null,gsiMode=null,syPopT=0;
const gsi=()=>gsiP||(gsiP=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>window.google?.accounts?.id?ok():no(new Error('gsi'));s.onerror=()=>{gsiP=null;s.remove();no(new Error('gsi'))};document.head.append(s)}));
function gsiReset(){gsiP=null;gsiMode=null;document.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]').forEach(s=>s.remove());try{if(window.google)delete window.google.accounts}catch(e){}}
function syClose(){clearTimeout(syPopT);const d=$('#authp');if(d){if(d.open&&d.close)d.close();d.remove()}}
const syDark=()=>{try{const t=document.documentElement.getAttribute('data-theme');if(t==='dark')return true;if(t==='light')return false;return matchMedia('(prefers-color-scheme:dark)').matches}catch(e){return false}};
/* Called under the Log In click (user gesture). A blocked window.open means GIS popup will fail too. */
function syCanPopup(){try{const w=window.open('about:blank','ptt_gis','popup=yes,width=120,height=120');if(!w||w.closed)return false;try{w.close()}catch(e){}return true}catch(e){return false}}
function syAltPaint(mode){const wrap=$('.authalt'),alt=$('#authr');if(!wrap||!alt)return;
 /* Always offer the server full-page path (GIS redirect alone is unreliable under FedCM). */
 wrap.hidden=false;alt.textContent='Continue in a new page'}
/* Full-page Google sign-in without GIS: top-level nav to a server 302 (Andrew 2026-11-06). */
function syFullPage(){location.assign(location.origin+'/api/auth/google/start')}
function syFallbackRedirect(){syFullPage()}
async function syBtn(mode){const d=$('#authp'),g=d&&d.querySelector('#authg');if(!g)return;clearTimeout(syPopT);g.innerHTML='';syMsg('');syAltPaint(mode);
 if(gsiMode&&gsiMode!==mode)gsiReset();
 try{await gsi()}catch(e){syMsg(SYERR.gsi,1);return}
 gsiMode=mode;d.dataset.mode=mode;
 const onCred=x=>{clearTimeout(syPopT);if(x&&x.credential)syIn(x.credential);else syFallbackRedirect()/* dismiss / FedCM miss → redirect, no lecture */};
 google.accounts.id.initialize(mode=='redirect'?{client_id:AUTHCID,ux_mode:'redirect',login_uri:location.origin+'/api/auth/google',auto_select:false}:{client_id:AUTHCID,ux_mode:'popup',auto_select:false,callback:onCred});
 google.accounts.id.renderButton(g,{type:'standard',theme:syDark()?'filled_black':'outline',size:'large',text:'signin_with',shape:'pill',logo_alignment:'left',width:280});
 if(mode=='popup'){/* If the Google iframe is activated and no popup steals focus, fall back quietly. */
  let armed=0;const arm=()=>{if(armed||d.dataset.mode!='popup')return;armed=1;let saw=0;const onBlur=()=>{saw=1};addEventListener('blur',onBlur);
   syPopT=setTimeout(()=>{removeEventListener('blur',onBlur);if(!saw&&d.dataset.mode=='popup'&&!syState.email)syFallbackRedirect()},900)};
  g.addEventListener('pointerdown',arm,{once:true});g.addEventListener('focusin',arm,{once:true})}}
function syLogin(){syClose();const d=document.createElement('dialog');d.id='authp';d.setAttribute('aria-labelledby','autht');
 d.innerHTML='<div class=authcard><img class=authmark src="images/brand/logo-mark.svg" width=40 height=40 alt=""><h2 id=autht>Log in</h2><p class=authlead>Your wallet, in sync across devices.</p><div id=authg class=authg></div><p id=authm class=mute role=status aria-live=polite></p><p class=authalt hidden><button type=button id=authr class=authr>Continue in a new page</button></p><button type=button id=authx class=authx>Cancel</button></div>';
 document.body.append(d);d.querySelector('#authx').addEventListener('click',syClose);d.querySelector('#authr').addEventListener('click',e=>{e.preventDefault();syFullPage()});d.addEventListener('close',()=>d.remove());
 d.addEventListener('click',e=>{if(e.target===d)syClose()});
 if(typeof d.showModal=='function')d.showModal();else d.setAttribute('open','');
 syBtn(syCanPopup()?'popup':'redirect')}
/* back from the redirect flow: /?login=ok|denied|csrf|error (the server set the session cookie on ok) */
function syReturn(){const q=new URLSearchParams(location.search),v=q.get('login');if(!v)return false;q.delete('login');try{history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:'')+location.hash)}catch(e){}
 if(v=='ok'){syApi('auth/me').then(r=>r.ok?r.json():null).then(d=>{if(d&&d.email){syState.email=SYNC.email=d.email;syState.first=SYNC.first=syFirst(d);
  SYNC.guest=!!(storeGet(SK)||(STO.wallet&&(STO.wallet.cards||[]).length));SYNC.done=0;SYNC.cur=0;sySave();syPaint();syRun().then(()=>{delete SYNC.guest;sySave()})}}).catch(()=>{});return true}
 syLogin();syMsg(SYERR[v]||SYERR.error,1);return true}
/* Profile menu: #authb is Log in (signed out) and Log out (signed in) in the same bottom spot (Andrew 2026-11-06 auth-bottom). Wider centered pill under the list. Welcome is greeting text only. Just before Dark/Light when shown (Docs/naming.md).
   Sidenav greeting (#sngreet): signed in = 'Hi, FirstName'; signed out = 'Welcome' (same style as Hi). Header #hey removed 2026-11-06. */
const syFirst=d=>d&&typeof d.first_name=='string'&&d.first_name.trim()?d.first_name.trim().slice(0,40):null;
function syPaint(){if(!AUTH)return;let b=$('#authb');const th=$('#theme');if(!b&&th){(th.closest('#pfl')||th).insertAdjacentHTML(th.closest('#pfl')?'afterend':'beforebegin',/* 2026-11-03: theme in Settings; #authb under the list = Log in / Log out (auth-bottom) */'<button type=button id=authb hidden><span class=ti aria-hidden=true>'+MI('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4"/>')+'</span><span class=tl></span></button>');b=$('#authb');
  if(th.getAttribute('role'))b.setAttribute('role','menuitem'),b.tabIndex=-1;b.addEventListener('click',()=>syState.email?syOut(false):syLogin())}
 const out=!syState.email;
 if(b){b.querySelector('.tl').textContent=out?'Log in':'Log out';b.dataset.auth=out?'in':'out';b.hidden=false;b.setAttribute('aria-label',out?'Log in':'Log out');b.title=out?'Log in':'Log out'}/* auth-bottom: same bottom pill for Log in / Log out */
 {/* Andrew 2026-11-06 auth-bottom: greeting only (Welcome / Hi, FirstName); no #sngin beside Welcome */
  const g=$('#sngreet'),si=$('#sngin'),uh=document.querySelector('#pfl .snuh');
  if(uh)uh.classList.toggle('out',out);
  if(g){g.hidden=false;g.textContent=syState.email&&syState.first?'Hi, '+syState.first:syState.email?'Hi':'Welcome'}
  if(si){si.hidden=true}}}
/* ---- Kubera balances on Accounts › Brokers (Andrew 2026-11-01) ----
   Read-only. Only while signed in (AUTH + syState.email): GET /api/kubera (server signs with its own secrets, caches 60 min in D1).
   Balances stay in memory only (never in ptt.state / localStorage). The item -> tile links live in ptt.state wallet.kmap
   {kuberaItemId: tileKey | '-'} (syncs as wallet.kmap); no entry = auto-suggest (kubSuggest). Values are shown in CAD only (B11 2026-11-02, kubCad). */
var KUB=null;
const KUBALIAS=[[/^(ws|wealthsimple)\b/,'wealthsimple'],[/^questrade\b/,'questrade'],[/^webull\b/,'webull'],[/^td\b/,'td '],[/^rbc\b/,'rbc'],[/^bmo\b/,'bmo'],[/^cibc\b/,'cibc'],[/^(scotia|scotiabank|bns)\b/,'scotia'],[/^(nbdb|nbc|national bank)\b/,'national bank'],[/^(ibkr|interactive)\b/,'interactive brokers'],[/^qtrade\b/,'qtrade'],[/^moomoo\b/,'moomoo'],[/^ci\b/,'ci direct'],[/^(disnat|desjardins)\b/,'desjardins']];
const KUBTYPE={RRSP:'RRSP',TFSA:'TFSA',FHSA:'FHSA',RESP:'RESP',RRIF:'RRIF',LIRA:'LIRA',LIF:'LIF',RDSP:'RDSP',MARGIN:'MARGIN',CASH:'CASH',JOINT:'CASH',CORP:'CORPORATE',CORPORATE:'CORPORATE',SPOUSAL:'SPOUSAL_RRSP',CRYPTO:'CRYPTO',BITCOIN:'CRYPTO',BTC:'CRYPTO',ETH:'CRYPTO',ETHEREUM:'CRYPTO'};
/* institution prefix (lower case) from the connection's provider ('Wealthsimple - Self Directed') or a manual name's suffix ('RRSP (TD)') */
/* B11 (Andrew 2026-11-01): two Kubera naming styles: 'Type (Bank)' ('RRSP (TD)') and 'Bank Kid (Type)' ('Questrade Cole (RESP)', 'WS Sadie (Savings)').
   kubParse -> {inst: institution text, type: account-type word}; the provider name, when connected, wins for the institution. */
const KUBTW=w=>KUBTYPE[String(w||'').trim().toUpperCase()]||(/^(savings|chequing|checking|hisa)$/i.test(String(w||'').trim())?String(w).trim().toUpperCase():null);
function kubParse(it){const n=String(it.name||'').trim(),m=n.match(/^(.*?)\s*\(([^)]+)\)\s*$/);if(m&&KUBTW(m[2]))return {inst:m[1],type:KUBTW(m[2]),rest:m[1]};if(m)return {inst:m[2],type:KUBTW(m[1].split(/\s+/)[0]),rest:m[1]};return {inst:'',type:KUBTW(n.split(/[\s(]+/)[0]),rest:n}}
function kubInst(it){const src=(it.provider||kubParse(it).inst||'').trim().toLowerCase();if(!src)return null;const a=KUBALIAS.find(([r])=>r.test(src));return a?a[1]:null}
const kubType=it=>kubParse(it).type||(/\b(crypto|bitcoin|btc|ethereum|eth)\b/i.test(String(it.name||'')+' '+String(it.provider||''))?'CRYPTO':null);
/* the household member named in the Kubera name ('Questrade Cole (RESP)' -> the member nicknamed Cole), else null */
const kubKid=it=>{if(typeof MEMS!='function')return null;const w=new Set(String(kubParse(it).rest||'').toLowerCase().split(/[^a-z0-9']+/).filter(Boolean));const m=MEMS().slice(1).find(([,l])=>w.has(String(l).toLowerCase()));return m?m[0]:null};
/* tiles = [{k, broker, acct, own}] (the held broker tiles). Auto-link only on the same broker AND the exact account type (B11: no single-tile fallback, so Webull Margin never lands on the Webull TFSA tile);
   a Kubera name that names a household member links only to a tile that member owns; otherwise only to a tile that is not a kid's alone. */
function kubSuggest(it,tiles){if(it.kind=='debt')return null;const p=kubInst(it),t=kubType(it);if(!p||!t)return null;const kid=kubKid(it);const c=tiles.filter(x=>!x.g&&String(x.broker||x.k).toLowerCase().startsWith(p)&&x.acct==t&&(kid?(x.own||[]).includes(kid):!(x.own||['you']).every(o=>/^kid/.test(o))));return c.length==1?c[0].k:c.length>1?c[0].k:null}
/* one entry per tile instance: k = the tile's instance key (IKEY: x.k, legacy x.i for the first instance), so two tiles of the same account each get their own Kubera links */
const kubTiles=()=>(STO.wallet.brokerage||[]).filter(x=>x&&x.i).map(x=>{const[b,t]=String(x.i).split(' · ');return {k:typeof IKEY=='function'?IKEY('brokerage',x):(x.k||x.i),broker:x.broker||b,acct:x.acct||t||null,own:typeof ownOf=='function'?ownOf('brokerage',x.i):['you'],label:x.i+(x.nick?' ('+x.nick+')':'')}}).concat((STO.wallet.banks||[]).filter(x=>x&&x.id).map(x=>({k:typeof IKEY=='function'?IKEY('banks',x):(x.k||x.id),g:'banks',label:x.id+(x.nick?' ('+x.nick+')':'')}))).concat((STO.wallet.cards||[]).filter(x=>x&&x.id).map(x=>({k:typeof IKEY=='function'?IKEY('cards',x):(x.k||x.id),g:'cards',label:x.id})));/* 2026-11-02 (Andrew): Credit Cards tiles link to Kubera credit card debts (kind 'debt'); manual links only *//* B12 (Andrew 2026-11-01): bank tiles link to Kubera accounts too (same map, wallet.kmap); manual links only, no auto-suggest for banks */
/* {by:{tileKey:[item]}, link:{itemId:{k,auto}}} with manual choices (wallet.kmap) over the suggestion */
function kubMap(items,tiles,km){const by={},link={},tg=new Map(tiles.map(t=>[t.k,t.g=='cards'])),ks={has:(k,it)=>tg.has(k)&&tg.get(k)==(it.kind=='debt')};/* a debt only on a card tile, an asset never on one */for(const it of items){const m=km&&km[it.id];let k=null,auto=false;if(m=='-')k=null;else if(m&&ks.has(m,it))k=m;else{k=kubSuggest(it,tiles);auto=true}link[it.id]={k,auto};if(k)(by[k]=by[k]||[]).push(it)}return {by,link}}
const kubOn=()=>!!(KUB&&KUB.d&&AUTH&&syState.email);
/* B11 (Andrew 2026-11-02): balances are CAD only, never USD or 'CAD + USD'. kubCad = the item's CAD value: CAD as is (v3 server values are CAD, converted with Kubera's own CAD rate); a native non-CAD value from an older payload converts with Kubera's FX map (KUB.d.fx); otherwise null (shows —, left out of totals). kubSum = CAD total or null */
const kubCad=it=>{if(!it||it.value==null)return null;const c=String(it.currency||'CAD').toUpperCase();if(c=='CAD')return it.value;const r=((KUB&&KUB.d&&KUB.d.fx)||{})[c];return r>0?it.value*r:null},kubSum=L=>{let t=null;L.forEach(it=>{const v=kubCad(it);if(v!=null)t=(t||0)+v});return t};
const kubFmt=(v,c)=>{try{return new Intl.NumberFormat('en-CA',{style:'currency',currency:c||'CAD',maximumFractionDigits:0}).format(v)}catch(e){return (c||'')+' '+Math.round(v).toLocaleString()}};
function kubAgo(iso){const s=Math.max(0,(Date.now()-Date.parse(iso))/1000);return s<90?'just now':s<5400?Math.round(s/60)+' min ago':s<129600?Math.round(s/3600)+' h ago':Math.round(s/86400)+' d ago'}
const kubErr=it=>/error|disconnect|fail|reconnect/i.test(it.status||'');
/* B5 (Andrew 2026-11-01): the tile shows only the value, no source name, error badge or account count. Its colour grades freshness by the oldest linked account's last update:
   fr0 < 1 day, fr1 1-3 days, fr2 3-7 days, fr3 1-4 weeks, fr4 older; an account with a connection error counts as stale (fr4). Tooltip = the date only. Linking lives in the broker info card (Linked accounts). */
const kubFresh=(iso,err)=>{if(err)return 4;const d=(Date.now()-Date.parse(iso))/864e5;return !(d>=0)?0:d<1?0:d<3?1:d<7?2:d<28?3:4};
function kubTile(key){if(!KUB||!kubOn())return '';const L=kubMap(KUB.d.items||[],kubTiles(),STO.wallet.kmap).by[key];if(!L||!L.length)return '';
 const sm=kubSum(L),v=sm==null?'—':kubFmt(sm,'CAD'),fa=new Date(KUB.d.fetched_at).toISOString(),up=L.map(it=>it.updated||fa).sort()[0],f=kubFresh(up,L.some(kubErr));
 let dt='';try{dt=new Date(up).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'})}catch(e){}
 return `<span class=kub data-kub><b class="kubv fr${f}" data-fr=${f} title="${esc(dt?'Updated '+dt:'')}">${esc(v)}</b></span>`}
/* repaint in place (no full render, so a drag in progress is untouched) */
/* B20 Accounts KPIs (Andrew 2026-11-05): four read-only CAD totals at the very top of Accounts, straight from the Kubera items LINKED to your tiles (kubMap, wallet.kmap + auto-suggest).
   Credit Balance = amounts owed on Kubera debts linked to Credit Cards tiles (|value|). Investment Balance = items linked to Brokers tiles.
   Checking vs Savings (bank tiles): the bank tile's catalogue account type wins (ty 'chequing' -> Checking; 'savings' or 'hisa' -> Savings);
   when the tile has no such type (ty 'usd', unknown), the Kubera name decides: /sav|hisa/ -> Savings, else Checking ('Checking (Tangerine)', 'Checking Joint (WS)' -> Checking; 'Savings USD (Tangerine)' -> Savings).
   Unlinked, unsynced or null values count as 0; Kubera off or signed out = $0 on every tile (Andrew: 'count it as zero'), never a dash.
   Function declarations only (no consts): the Accounts render can run before this file's consts initialize. */
function KPIA(){return [['cr','Credit Balance','Owed on linked credit cards'],['ch','Checking Balance','Linked checking accounts'],['sv','Savings Balance','Linked savings accounts'],['iv','Investment Balance','Linked broker accounts']]}
function kubBankKind(tile,it){const id=tile&&tile.id,o=id&&typeof D!='undefined'&&D.bank&&(D.bank.accounts||[]).find(a=>a.id==id),ty=o&&String(o.ty||'').toLowerCase();if(ty=='chequing')return 'ch';if(ty=='savings'||ty=='hisa')return 'sv';return /sav|hisa/i.test(String(it.name||''))?'sv':'ch'}
function kubKpis(){const r={cr:0,ch:0,sv:0,iv:0};try{if(!kubOn())return r}catch(e){return r}const T=kubTiles(),by=kubMap(KUB.d.items||[],T,STO.wallet.kmap).by,G=new Map(T.map(t=>[t.k,t.g||'brokerage'])),bk=new Map((STO.wallet.banks||[]).filter(x=>x&&x.id).map(x=>[typeof IKEY=='function'?IKEY('banks',x):(x.k||x.id),x]));
 for(const k in by){const g=G.get(k);for(const it of by[k]){const v=kubCad(it);if(v==null)continue;if(g=='cards'){if(it.kind=='debt')r.cr+=Math.abs(v)}else if(it.kind=='debt')continue;else if(g=='banks')r[kubBankKind(bk.get(k),it)]+=v;else r.iv+=v}}return r}
function kpiAHTML(){const r=kubKpis(),f=v=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(v);return kpiStrip('akpi','Account balances',KPIA().map(([id,n,d])=>`<div class="akp akp-${id}" data-akpi=${id}><span class=akn>${n}</span><b class=akv>${f(r[id])}</b><small class=akd>${d}</small></div>`).join(''))}
function kpiAPaint(){const e=document.getElementById('akpi');if(!e)return;(e.closest('.akc')||e).outerHTML=kpiAHTML();if(typeof akcFit=='function')akcFit()}
function kubPaint(){kpiAPaint();if(typeof IE!='undefined'&&IE.o&&(IE.g=='brokerage'||IE.g=='banks'))ieDraw();document.querySelectorAll('#pw-brokers [data-hold=brokerage][data-ok],#pw-banks [data-hold=banks][data-ok]').forEach(t=>{const h=kubTile(t.dataset.ok),o=t.querySelector('.kub'),bk=t.dataset.hold=='banks',sp=t.querySelector(bk?'.aband':'.aspark');
  if(o&&!h){o.insertAdjacentHTML('beforebegin',bk?'<span class=aband></span>':'<svg class=aspark viewBox="0 0 100 24" preserveAspectRatio=none aria-hidden=true focusable=false><path d="M0 22 L18 17 L32 19 L50 10 L66 13 L82 5 L100 2" fill=none stroke=currentColor stroke-width=2.4 stroke-linecap=round stroke-linejoin=round /></svg>');o.remove()}
  else if(h){if(o)o.outerHTML=h;else if(sp)sp.outerHTML=h}});
 document.querySelectorAll('#pw-cards [data-ck]').forEach(t=>{const h=kubTile(t.dataset.ck),o=t.querySelector('.kub'),sp=t.querySelector('.tchip');if(o&&!h)o.outerHTML='<span class=tchip></span>';else if(h){if(o)o.outerHTML=h;else if(sp)sp.outerHTML=h}});
 if(typeof CS!='undefined'&&CS.o)csDraw();
 ivPaint();
 if(typeof connPaint=='function'&&document.getElementById('pw-conn'))connPaint();
}
/* B23: a sync run (soft) refetches Kubera at most every KUBTTL ms, and the tiles repaint only when the payload changed */
const KUBTTL=5*60e3;
function kubLoad(force,soft){if(!AUTH||!syState.email||!navigator.onLine)return Promise.resolve(false);KUB=KUB||{d:null};if(KUB.busy)return KUB.busy;if(soft&&!force&&KUB.d&&Date.now()-(KUB.at||0)<KUBTTL)return Promise.resolve(true);const j0=KUB.d?JSON.stringify(KUB.d):null;
 KUB.busy=syApi('kubera'+(force?'?refresh=1':'')).then(r=>{if(r.status==401||r.status==403){KUB.d=null;return false}return r.ok?r.json().then(d=>{KUB.d=d;KUB.at=Date.now();KUB.err=null;return true}):(KUB.err=r.status,false)}).catch(e=>{KUB.err=String(e.message||e);return false}).finally(()=>{KUB.busy=null;if(!soft||(KUB.d?JSON.stringify(KUB.d):null)!==j0)uiLater('kub',kubPaint)});/* B24: never redraws an open popup or focused input */return KUB.busy}
/* User › Investments (Andrew 2026-11-05). Account type is kubType (KUBTYPE / the name), not a guess from tax status or the Kubera sheet.
   Holdings are items[].holdings from the same /api/kubera payload (child assets). One row per account and holding — the same ticker in two accounts stays two rows.
   Missing holdings → one row, the account name, ticker column 'holdings not itemized'. Gain is value − cost only when both CAD figures exist. A price is rate.price, never value/qty. */
const IVORD=['TFSA','RRSP','LIRA','RESP','FHSA','RRIF','LIF','RDSP','SPOUSAL_RRSP','CASH','MARGIN','CORPORATE','CRYPTO','OTH'];
const IVBANK=new Set(['CHEQUING','CHECKING','SAVINGS','HISA']);
function kubReady(){try{return typeof kubOn=='function'}catch(e){return false}}
function ivLab(t){return {CASH:'Non-registered',MARGIN:'Margin',CORPORATE:'Corporate',CRYPTO:'Crypto',SPOUSAL_RRSP:'Spousal RRSP',OTH:'Other'}[t]||t}
function ivSlug(t){return String(t).toLowerCase().replace(/_/g,'')}
function ivType(it){if(!it||it.kind=='debt')return null;let t=null;try{t=kubType(it)}catch(e){}
 if(t&&IVBANK.has(t))return null;if(t&&IVORD.includes(t)&&t!='OTH')return t;const name=String(it.name||'');
 if(/\bnon-?registered\b/i.test(name))return 'CASH';
 for(const k of IVORD){if(k=='OTH'||k=='CASH')continue;if((k=='SPOUSAL_RRSP'?/\bspousal(?:\s+rrsp)?\b/i:new RegExp('\\b'+k+'\\b','i')).test(name))return k}
 if(/\b(crypto|bitcoin|btc|ethereum|eth)\b/i.test(name+' '+String(it.provider||'')))return 'CRYPTO';
 if(it.inv||(Array.isArray(it.holdings)&&it.holdings.length))return 'OTH';return null}
function ivCad(v){return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(v)}
function ivPx(v,c){return new Intl.NumberFormat('en-CA',{style:'currency',currency:c||'CAD',minimumFractionDigits:2,maximumFractionDigits:4}).format(v)}
function ivQty(v){return new Intl.NumberFormat('en-CA',{maximumFractionDigits:4}).format(v)}
function ivGain(v){const s=v>0?'+':v<0?'−':'';return s+ivCad(Math.abs(v))}
function ivPct(part,tot){if(part==null||!(tot>0))return null;const n=Math.round(part/tot*1000)/10;return (Number.isInteger(n)?String(n):n.toFixed(1))+'%'}
function ivBook(){if(!kubReady()||!kubOn())return null;const g=new Map();
 for(const it of KUB.d.items||[]){const t=ivType(it);if(!t)continue;if(!g.has(t))g.set(t,{t,slug:ivSlug(t),id:'pw-iv-'+ivSlug(t),g:'iv-'+ivSlug(t),name:ivLab(t),accounts:[],rows:[]});
  const s=g.get(t),acc=it.name||'Account',hs=(Array.isArray(it.holdings)?it.holdings:[]).filter(h=>h&&(h.name||h.ticker||h.value!=null));
  s.accounts.push(acc);
  if(!hs.length){/* no children and no ticker on the account (a leaf ticker arrives as holdings[] from the server) */s.rows.push({acct:acc,name:'holdings not itemized',ticker:null,exch:null,qty:null,price:null,px:null,value:it.value==null?null:+it.value,gain:null});continue}
  for(const h of hs){const value=h.value==null?null:+h.value,cost=h.cost==null?null:+h.cost;
   s.rows.push({acct:acc,name:h.name||h.ticker||'Holding',ticker:h.ticker||null,exch:h.exch||null,qty:h.qty==null?null:+h.qty,price:h.price==null?null:+h.price,px:h.px||null,value,cost,gain:value!=null&&cost!=null?Math.round((value-cost)*100)/100:null})}}
 const rank=t=>{const i=IVORD.indexOf(t);return i<0?IVORD.length:i},byVal=(a,b)=>(b.value==null)-(a.value==null)||(b.value||0)-(a.value||0),out=[];
 for(const s of g.values()){const buckets=new Map();
  for(const r of s.rows){if(!buckets.has(r.acct))buckets.set(r.acct,{acct:r.acct,rows:[],value:null});buckets.get(r.acct).rows.push(r)}
  const groups=[...buckets.values()];
  for(const b of groups){b.rows.sort((a,c)=>byVal(a,c)||String(a.ticker||a.name).localeCompare(String(c.ticker||c.name)));const known=b.rows.filter(r=>r.value!=null);b.value=known.length?Math.round(known.reduce((t,r)=>t+r.value,0)*100)/100:null}
  groups.sort((a,b)=>byVal(a,b)||a.acct.localeCompare(b.acct));
  s.rows=groups.flatMap(b=>b.rows);
  s.total=s.rows.some(r=>r.value!=null)?Math.round(s.rows.reduce((t,r)=>t+(r.value||0),0)*100)/100:null;
  s.accounts=[...new Set(s.accounts)];out.push(s)}
 out.sort((a,b)=>rank(a.t)-rank(b.t)||a.name.localeCompare(b.name));return out}
function ivUse(){const b=ivBook();return b?b.map(s=>[s.id,s.name,'iv']):[]}
function ivSig(b){try{return syH(JSON.stringify(b))}catch(e){return 'x'}}
let ivP=0;function ivPaint(){if(ivP||typeof st=='undefined'||st.s!='assets'||document.documentElement.classList.contains('asdragging'))return;let sig='off';try{const b=ivBook();sig=!b?'off':b.length?ivSig(b):'empty'}catch(e){}
 const n=document.getElementById('ivroot');if(n&&n.dataset.sig===sig)return;ivP=1;try{const y=scrollY;render();scrollTo(0,y)}finally{ivP=0}}
if(AUTH){const s0=saveS;saveS=function(){s0.apply(this,arguments);if(syState.email&&syScan())syLater()}/* stamp the edit time at save, send 2 s later; B23: only when a synced value really changed (a nav render's saveS with nothing new arms no sync) */;syPaint();syReturn();
 if(syState.email)syApi('auth/me').then(async r=>{if(r.ok){try{const d=await r.clone().json();const f=syFirst(d);if(f!==syState.first){syState.first=SYNC.first=f;sySave();syPaint()}}catch(e){}return syRun()}if(r.status==401||r.status==403)syOut(true)}).catch(()=>{});
 addEventListener('online',()=>syRun());document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible')syRun();else syScan()})}/* hidden: the queue is kept and sent on the next visit */

/* Email code before bank linking (Plaid security gap, Andrew 2026-11-06). Gate is off until EMAIL_CODE_ENABLED=1 and Email Sending is live.
   syPlaidStart() checks /api/auth/email-code/status; if a code is required and this session is not ok, opens the dialog. */
function syEmailCodeOpen(onOk){if(!syState.email)return syLogin();document.querySelector('#emcodep')?.remove();
 const d=document.createElement('dialog');d.id='emcodep';d.setAttribute('aria-labelledby','emcodet');
 d.innerHTML='<h2 id=emcodet>Verify your email</h2><p>Before linking a bank we email a 6-digit code to <b id=emcodem></b>. It expires in 10 minutes.</p><p id=emcodes class=mute role=status aria-live=polite></p><div class=emcodeb><button type=button id=emcodesend>Send code</button></div><label for=emcodei class=mute>Enter the code</label><input id=emcodei inputmode=numeric autocomplete=one-time-code maxlength=6 spellcheck=false><p id=emcoderr class=mute role=status aria-live=polite></p><div class=acdelb><button type=button id=emcodex>Cancel</button><button type=button id=emcodego disabled>Verify</button></div>';
 document.body.append(d);const i=d.querySelector('#emcodei'),go=d.querySelector('#emcodego'),st=d.querySelector('#emcodes'),err=d.querySelector('#emcoderr'),send=d.querySelector('#emcodesend');
 const setM=e=>{d.querySelector('#emcodem').textContent=e||syState.email||'your account email'};setM();
 i.addEventListener('input',()=>{go.disabled=!/^\d{6}$/.test(i.value.trim());err.textContent='';err.className='mute'});
 d.querySelector('#emcodex').addEventListener('click',()=>d.close());d.addEventListener('close',()=>d.remove());
 send.addEventListener('click',async()=>{send.disabled=true;st.textContent='Sending…';err.textContent='';
  try{const r=await syApi('auth/email-code/send',{method:'POST'});const j=await r.json().catch(()=>({}));
   if(r.status==503||r.status==404){st.textContent='Email verification is not turned on yet.';st.className='mute';send.disabled=false;return}
   if(!r.ok)throw new Error(j.error||r.status);setM(j.email);st.textContent='Code sent. Check your inbox.';st.className='mute';i.focus()}
  catch(e){st.textContent='Could not send a code right now.';st.className='wxerr';send.disabled=false}});
 go.addEventListener('click',async()=>{const c=i.value.trim();if(!/^\d{6}$/.test(c))return;go.disabled=true;err.textContent='Checking…';err.className='mute';
  try{const r=await syApi('auth/email-code/verify',{method:'POST',body:JSON.stringify({code:c})});const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||r.status);d.close();if(typeof onOk=='function')onOk()}
  catch(e){err.textContent=e.message=='wrong code'||e.message=='invalid code'?'That code is not right.':e.message=='expired'?'That code expired. Send a new one.':e.message=='too many attempts'?'Too many tries. Send a new code.':'Could not verify. Try again.';err.className='wxerr';go.disabled=!/^\d{6}$/.test(i.value.trim())}});
 if(typeof d.showModal=='function')d.showModal();else d.setAttribute('open','');send.focus()}
async function syPlaidStart(next){if(!syState.email)return syLogin();
 try{const r=await syApi('auth/email-code/status');const j=await r.json().catch(()=>({}));
  if(r.ok&&j.required&&!j.ok)return syEmailCodeOpen(()=>syPlaidStart(next));
 }catch(e){}
 if(typeof next=='function')return next()}
/* Delete account (Privacy gap #1, Andrew 2026-11-06): DELETE /api/account removes the user and every synced row server-side (Plaid items revoked).
   Strong confirm: the button stays disabled until the user types DELETE. On success this device's PerTheTerms storage is cleared too. */
function syDelOpen(){if(!syState.email)return syLogin();syClose();document.querySelector('#acdelp')?.remove();const d=document.createElement('dialog');d.id='acdelp';d.setAttribute('aria-labelledby','acdelt');
 d.innerHTML='<h2 id=acdelt>Delete your account?</h2><p>This permanently deletes your PerTheTerms account and everything synced to it: accounts, spending, settings and connection keys. Linked bank connections are revoked. This cannot be undone.</p><label for=acdeli class=mute>Type <b>DELETE</b> to confirm</label><input id=acdeli autocomplete=off spellcheck=false autocapitalize=characters><p id=acdelm class=mute role=status aria-live=polite></p><div class=acdelb><button type=button id=acdelx>Cancel</button><button type=button id=acdelgo disabled>Delete account</button></div>';
 document.body.append(d);const i=d.querySelector('#acdeli'),go=d.querySelector('#acdelgo'),m=d.querySelector('#acdelm');
 i.addEventListener('input',()=>{go.disabled=i.value.trim()!=='DELETE'});d.querySelector('#acdelx').addEventListener('click',()=>d.close());d.addEventListener('close',()=>d.remove());
 go.addEventListener('click',async()=>{if(i.value.trim()!=='DELETE')return;go.disabled=true;m.textContent='Deleting…';m.className='mute';
  try{const r=await syApi('account',{method:'DELETE'});if(!r.ok)throw new Error(r.status);
   syOut(true);
   d.innerHTML='<h2>Account deleted</h2><p>Your account and its synced data are gone.</p><div class=acdelb><button type=button id=acdelok>Done</button></div>';d.querySelector('#acdelok').addEventListener('click',()=>{d.close();location.replace(location.pathname)})}
  catch(e){m.textContent='Could not delete right now. Nothing was removed on this device. Try again.';m.className='wxerr';go.disabled=false}});
 if(typeof d.showModal=='function')d.showModal();else d.setAttribute('open','');i.focus()}
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-acdel]');if(!t)return;e.preventDefault();syDelOpen()});
