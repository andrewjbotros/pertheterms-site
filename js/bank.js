/* sort helper shared with app.js: numeric/text compare, missing (null/''/NaN) always last whatever the direction */
const nlast=(x,y,dir)=>{const nx=x==null||x===''||Number.isNaN(x),ny=y==null||y===''||Number.isNaN(y);if(nx||ny)return nx&&ny?0:nx?1:-1;return (x<y?-1:x>y?1:0)*dir};
const PREM=new Set(['pyt']);/* the only premium view: Per Your Terms (violet ◆); gated only when PAYWALL is on */
const PLINES_ALL=[['home','Home'],['cards','Credit Cards'],['bank','Banking'],['broker','Brokers'],['tel','Telecom']];/* app.js filters it to D.meta.lines (build flag PTT_LINES); top tabs = the product side; each tab's sub-tabs render in #tabs below them */
// ---- Banking product line (v3.3.0). Loaded before app.js; everything here runs lazily after app.js defines its globals. ----
// Conventions shared with Cards: ✓/✗/— cells; $0 is a real zero; '—' = not stated in the record (never '?'). Never invents a value.
const BANK=(()=>{
 const BD=()=>(D.bank||{accounts:[],inst:[],fam:[]}),A=()=>BD().accounts,BI={};let inited=false;
 const m2=v=>v==null?'<span class=q title="Not stated in the record">—</span>':v===0?'<span class=z>$0</span>':'$'+v.toFixed(2);
 const m0=v=>v==null?'<span class=q title="Not stated in the record">—</span>':v===0?'<span class=z>$0</span>':'$'+v.toLocaleString(undefined,{maximumFractionDigits:2});
 const famN=id=>(BD().fam.find(f=>f.id==id)||{}).n;
 const lowRule=o=>{const r=o.rules.filter(x=>x.t=='PRODUCT_COUNT_REBATE'&&x.new!==0&&x.after!=null&&x.lo!=null&&x.amt>0);if(!r.length)return null;return r.reduce((a,b)=>b.after<a.after||(b.after==a.after&&b.lo<a.lo)?b:a)};
 const ruleCell=o=>{if(!o.rules.length)return '<span class=mute>None on record</span>';const open=o.rules.filter(x=>x.new!==0&&x.amt>0),use=open.length?open:o.rules.filter(x=>x.amt>0);
  return use.map(x=>`<span title="${esc(x.p)}${x.new===0?' (closed to new accounts)':''}">${x.lo==null?'<span class=q>—</span>':x.lo+(x.hi==null?'+':'')} ${x.lo===1&&x.hi===1?'product':'products'} → ${m2(x.after)}<span class=t>${esc((x.ev||'')[0]||'')}</span>${x.new===0?'<span class=mute> legacy</span>':''}</span>`).join('<br>')};
 const mbCell=o=>o.mbk=='waive'?m0(o.mb):o.mbk=='none-needed'?'<span class=z title="No balance needed: the fee is $0">$0</span>':o.mbk=='no-waiver'?'<span class=mute title="The record says no balance waiver">No waiver</span>':'<span class=q title="Not stated in the record">—</span>';
 const wvCell=o=>o.wv.length?'<span class=y>✓</span> '+esc(o.wv.map(w=>w.to).join(' · ').slice(0,70)):'<span class=mute>None on record</span>';
 const cut=(t,n=60)=>t?(t.length>n?`<span class=trc data-trc=1 data-tfull="${esc(t)}" tabindex=0 role=button aria-haspopup=dialog>${esc(t.slice(0,n))}…</span>`:`<span>${esc(t)}</span>`):'<span class=q title="Not stated in the record">—</span>';
 const BCOL={
  fam:['Family','l',o=>o.fam?famN(o.fam):'~',o=>o.fam?`<span class=fam>${esc(famN(o.fam))}</span>`:'<span class=q>—</span>'],
  i:['Institution','l',o=>o.i,o=>esc(o.i)],
  fee:['Monthly fee','',o=>o.fee,o=>m2(o.fee)],
  feey:['Fee $/yr','',o=>o.feey,o=>m0(o.feey)],
  tx:['Transactions','',o=>o.tx=='Unlimited'?1e6:o.tx?+o.tx:null,o=>o.tx?(o.tx=='Unlimited'?'<span class=y>Unlimited</span>':esc(o.tx)+'<span class=mute>/mo</span>'):cut(o.txt,24)],
  mb:['Min. balance to waive','',o=>o.mbk=='waive'?o.mb:o.mbk=='none-needed'?0:o.mbk=='no-waiver'?1e8:1e9,mbCell],
  wvt:['Waiver conditions','wrapt',o=>o.wvt||'',o=>cut(o.wvt,90)],
  rule:['Product-count rebate <button class=info data-bh=rule aria-label="About product-count rebates">ⓘ</button>','wrapt',o=>{const r=lowRule(o);return r?r.after*100+r.lo:1e9},ruleCell],
  wv:['Waives card fee <button class=info data-bh=wv aria-label="About card-fee waivers">ⓘ</button>','wrapt',o=>-o.wv.length,wvCell],
  pr:['Sign-up offer','wrapt',o=>o.pr.length?0:1,o=>o.pr.length?cut(o.pr[0].t,80):'<span class=mute>None on record</span>'],
  svc:['Included services','wrapt',o=>o.svc||'~',o=>cut(o.svc,90)],
  uf:['Stand-out feature','wrapt',o=>o.uf||'~',o=>cut(o.uf,90)],
  et:['e-Transfer send free','',o=>-(o.et??-.5),o=>`<span title="${esc(o.ett||'Not stated')}">${yn(o.et)}</span>`],
  etl:['e-Transfer limits','wrapt',o=>o.etl||'~',o=>cut(o.etl,50)],
  nets:['ATM networks named','wrapt',o=>o.nets.join(),o=>o.nets.length?esc(o.nets.join(' · ')):'<span class=q title="No network named in the record">—</span>'],
  atm:['ATM fees','wrapt',o=>o.atm||'~',o=>cut(o.atm,90)],
  atmr:['ATM fee refund <button class=info data-bh=atmr aria-label="About ATM fee reimbursement">ⓘ</button>','',o=>o.atmr?-(o.atmr.st??-.5):.5,o=>o.atmr?`<span title="${esc(o.atmr.cond||o.atmr.notes||'Not stated')}">${yn(o.atmr.st)}</span>${o.atmr.tag&&o.atmr.st!=null?`<span class=t>${esc(o.atmr.tag[0])}</span>`:''}`:yn(null)],
  atmc:['Refund cap','l',o=>{const a=o.atmr;return !a||a.st==null?null:a.st!==1?1e9:a.unl?0:(a.ev||99)*(a.n||99)},o=>{const a=o.atmr;if(!a||a.st==null)return '<span class=q title="Not stated">—</span>';if(a.st===0)return '<span class=mute>n/a</span>';if(a.unl)return '<span class=y>No cap</span>';const p=[a.ev!=null?'$'+a.ev+'/withdrawal':null,a.n!=null?a.n+'/month':null].filter(Boolean);return p.length?esc(p.join(' · ')):'<span class=q title="Cap not stated">—</span>'}],
  atms:['Refund scope','l',o=>o.atmr?.sc||'~',o=>{const a=o.atmr;if(!a||a.st!==1)return a&&a.st===0?'<span class=mute>n/a</span>':'<span class=q>—</span>';return ({CANADA:'Canada only',OUTSIDE_CANADA:'Outside Canada only',WORLDWIDE:'Worldwide',UNSTATED:'<span class=q>—</span>'})[a.sc]||'<span class=q>—</span>'}],
  atmp:['Refund conditions','wrapt',o=>o.atmr?.plan||'~',o=>o.atmr&&o.atmr.st===1?cut(o.atmr.plan+'. '+(o.atmr.cond||''),70):'<span class=mute>—</span>'],
  intr:['Pays interest','',o=>-(o.intr??-.5),o=>`<span title="${esc(o.intt||'Not stated')}">${yn(o.intr)}</span>`]};
 const fb=(l,f)=>[l,f],FEEB=[fb('$0',o=>o.fee===0),fb('≤ $5/mo',o=>o.fee!=null&&o.fee<=5),fb('≤ $15/mo',o=>o.fee!=null&&o.fee<=15),fb('> $15/mo',o=>o.fee>15),fb('Not stated',o=>o.fee==null)];
 const BLBL=k=>BCOL[k]?String(BCOL[k][0]).replace(/<[^>]+>.*$/,'').replace(/<[^>]+>/g,'').trim():null;
 const BF=()=>BFS(BF0());
 const BFS=o=>{for(const k in o){const l=BLBL(k);if(l)o[k][0]=l}return o};
 const BF0=()=>({fam:['Family',BD().fam.map(f=>[f.n,o=>o.fam==f.id])],inst:['Institution',[...new Set(A().map(o=>o.i))].sort().map(i=>[i,o=>o.i==i])],fee:['Monthly fee',FEEB],
  wv:['Waives a card fee',[['Yes',o=>o.wv.length>0],['None on record',o=>!o.wv.length]]],rule:['Product-count rebate',[['Yes',o=>o.rules.length>0]]],
  mb:['Min. balance',[['$0 / none needed',o=>o.mbk=='none-needed'],['≤ $4,000',o=>o.mbk=='waive'&&o.mb<=4000],['No balance waiver',o=>o.mbk=='no-waiver']]],
  pr:['Sign-up offer',[['Yes',o=>o.pr.length>0]]],et:['e-Transfer',[['Send free',o=>o.et===1]]],atmr:['ATM fee refund',[['Yes',o=>o.atmr?.st===1],['No',o=>o.atmr?.st===0],['? (unconfirmed)',o=>!o.atmr||o.atmr.st==null],['No cap',o=>o.atmr?.unl===1]]],intr:['Interest',[['Pays interest',o=>o.intr===1],['No interest',o=>o.intr===0]]]});
 const BS=[{id:'bov',name:'Overview',cols:['fam','i','fee','feey','tx'],f:['fam','inst','fee']},
  {id:'bfees',name:'Fees & waivers',cols:['fee','feey','mb','rule','wv','wvt'],f:['fee','mb','rule','wv','inst']},
  {id:'bperks',name:'Perks & sign-up',cols:['pr','svc','uf'],f:['pr','inst']},
  {id:'bacc',name:'Access',cols:['et','etl','atmr','atmc','atms','atmp','nets','atm','intr'],f:['et','atmr','intr','inst']},
  {id:'binst',name:'Institutions',cols:[],f:[]},
  {id:'bprom',name:'Promotions',cols:[],f:[]}];
 const HELP={wv:'<h2>Waives card fee</h2><p>From the record’s fee-waiver links (<code>edges</code>, type WAIVES) and <code>waiver_chains</code>: holding this account rebates or waives the annual fee on the named credit card(s). “None on record” means no link is recorded, not that one is impossible.</p>',
  rule:'<h2>Product-count rebates</h2><p>Some banks lower the monthly fee by how many of their other products you hold. Each cell reads “N products → fee after rebate”. Rows come from <code>conditional_fee_rules</code>; <b>C</b> = CITED to the issuer’s terms. RBC Value Program: an enrolled account plus 2 product categories rebates $6/mo, 3 or more rebates $12.95/mo (capped at the account fee), and needs one monthly activity (direct deposit, pre-authorized payment or eligible bill payment). “legacy” rows are the grandfathered MultiProduct Rebate, closed to accounts opened on or after April 27, 2021. ? = the product count is not stated.</p>'};
 HELP.atmr='<h2>ATM fee reimbursement</h2><p>Whether the institution pays back the fee another ATM operator charges you. From <code>account_perk_facts</code> (perk ATM_FEE_REIMBURSEMENT), CITED to the institution\'s own terms, archived. ✓ offered (see the plan or tier it needs), ✗ the official text says other operators\' surcharges may still apply, ? not confirmed in an official source. A bank waiving its <i>own</i> ATM fee is not a reimbursement.</p>';
 const on=()=>st.pl=='bank';
 function bar(){const el=$('#pl');if(!el)return;const cur=st.pl||'cards',on=k=>cur==k&&!USR.has(st.s);el.hidden=false;el.classList.remove('one');/* super banner: one enabled line shows as the single current item (hidden lines are not shown) */el.innerHTML=PLINES.map(([k,n])=>`<button data-pl=${k} class="${on(k)?'on':''}" aria-current=${on(k)}>${n}</button>`).join('');/* phones: the tab strip scrolls, keep the active tab in view */if(matchMedia('(max-width:640px)').matches)requestAnimationFrame(()=>{const on=el.querySelector('.on');if(on)el.scrollLeft+=on.getBoundingClientRect().left-el.getBoundingClientRect().left-(el.clientWidth-on.offsetWidth)/2})}
 function rows(){const q=(st.q||'').toLowerCase(),F=BF(),f=st.bf||{};return A().filter(o=>o.st!='discontinued'&&Object.entries(f).every(([k,i])=>!F[k]||F[k][1][i]?.[1](o))&&(!q||(o.n+' '+o.i+' '+(famN(o.fam)||'')).toLowerCase().includes(q)))}
 function tabs(cur){const nb=(STO.wallet.banks||[]).length,nw=W.cards.length+nb;return BS.filter(x=>!x.hide).map(x=>{const k=x.f.filter(id=>(st.bf||{})[id]!=null).length;return `<button data-bs="${x.id}" class="${x.id==cur?'on':''}">${x.name}${k?`<span class=dot>${k}</span>`:''}</button>`}).join('')}
 function bSplit(o,inp){const l=o.fee==null?null:o.fee*12;if(l==null)return{l:null,bw:0,rb:0,paid:null};const c=bCost(o,inp);const bw=o.mbk=='waive'&&o.mb!=null&&inp.bal>=o.mb?l:0;return{l,bw,rb:Math.max(0,l-bw-c.c),paid:c.c}}
 const binp=()=>{const P=PRF();return{bal:+(P.bal||0),np:+(P.np||0)}};
 const nAt=(o,inp)=>(W.cards.map(i=>C[BYID[i]]).filter(Boolean).some(c=>c.i==o.i)?1:0)+((STO.wallet.brokerage||[]).some(x=>x&&x.i==o.i)?1:0)+(inp.np||0);
 function bCost(o,inp){if(o.fee==null)return{c:null,why:'Fee not stated'};let m=o.fee,why=[];
  if(o.mbk=='waive'&&o.mb!=null&&inp.bal>=o.mb){m=0;why.push('waived at your '+m0(inp.bal)+' balance')}
  else if(o.mbk=='none-needed')why.push('no condition');
  const rs=(o.rules||[]).filter(r=>r.t=='PRODUCT_COUNT_REBATE'&&r.new==1);
  if(m>0&&rs.length){const n=nAt(o,inp);if(0)(W.cards.map(i=>C[BYID[i]]).filter(Boolean).some(c=>c.i==o.i)?1:0)+((STO.wallet.brokerage||[]).some(x=>x&&x.i==o.i)?1:0)+(inp.np||0);
   const rl=rs.find(r=>(r.lo==null||n>=r.lo)&&(r.hi==null||n<=r.hi));if(rl&&rl.amt){const a=Math.min(rl.amt,m);m-=a;why.push(`${esc(rl.p)} rebate ${m2(a)}/mo at ${n} product${n==1?'':'s'}`)}}
  return{c:Math.round(m*12*100)/100,why}}
 const bcol=o=>o.col||(()=>{const h=[...o.i].reduce((a,ch)=>(a*31+ch.charCodeAt(0))%360,7);return [`hsl(${h} 55% 32%)`,`hsl(${(h+25)%360} 60% 16%)`]})();
 const btile=(o,x={})=>{const[a,b]=bcol(o);return ctile({a,b,img:'banks/'+o.id+'.svg',alt:'PerTheTerms mock account art for '+o.n+' (placeholder, not the issuer design)',top:o.i,name:o.n,foot:(o.st=='discontinued'?'No longer offered · ':'')+(o.fee==null?'Fee —':o.fee===0?'No monthly fee':'$'+o.fee.toFixed(2)+'/mo'),mark:'BANK',attrs:`data-bm="${o.id}" aria-label="${esc(o.n)} details"`,rm:x.rm===false?'':`data-bwrm="${o.id}" aria-label="Remove ${esc(o.n)}"`})};
 const bperks=o=>[o.atmr?.st===1?'ATM fee refund':null,o.et===1?'Free e-Transfer':null,o.wv.length?'Waives a card fee':null,o.pr.length?'Sign-up offer':null,o.intr===1?'Pays interest':null].filter(Boolean);
 function bFolder(){const m0=v=>v==null?'<span class=q>—</span>':'$'+Math.round(v).toLocaleString();const v=$('#view'),os=(STO.wallet.banks||[]).map(x=>BI[x.id]).filter(Boolean),inp=binp(),sp=os.map(o=>({o,...bSplit(o,inp)})),unk=sp.some(x=>x.l==null);
  const sum=k=>sp.reduce((t,x)=>t+(x[k]||0),0),paid=sum('paid'),bw=sum('bw'),rb=sum('rb'),rts=os.map(o=>rateOf(o)),intV=!os.length?null:rts.every(r=>r.rate===0)?0:rts.every(r=>r.rate!=null)&&os.length==1&&inp.bal>0?inp.bal*rts[0].rate/100:null,intK=intV!=null,net=-paid+(intV||0);
  const reb=Object.fromEntries(sp.map(x=>[x.o.id,x]));
  v.innerHTML=`<div class=vhead><h2>Wallet</h2></div><div class=wlay><div class=wmain>
  <div class=hero><div><span title="Per year, after waivers and rebates">Fees paid</span><b>${m0(paid)}${unk?' <span class=q>—</span>':''}</b></div><div><span title="Per year, by balance">Fees waived</span><b>${m0(bw)}</b></div><div><span title="Per year">Interest</span><b>${!os.length?'—':intK?m0(intV):'<span class=q title=\"Interest rates are not captured in the record yet\">—</span>'}</b></div><div><span title="Per year: product-count rebates; perks with no sourced value are not counted">Rebates &amp; perks</span><b>${m0(rb)}</b></div><div><span title="Per year">Net value</span><b class="${net<0?'neg':''}">${!os.length?'—':(net<0?'−':'')+m0(Math.abs(net))}${!intK&&os.length?' <span class=q title=\"Interest rates are not captured in the record yet\">—</span>':''}</b></div></div>
  <h3>Your accounts</h3>${os.length?os.map(o=>{const r=reb[o.id],q='<span class=q title="Not stated in the record">—</span>',T=t=>t?esc(t):q,ar=o.atmr,rl=bCost(o,inp);
   const atmR=!ar||ar.st==null?q+' <span class=mute>unconfirmed</span>':ar.st===0?'<span class=mute>No third-party refund</span>':`<span class=y>✓</span> ${ar.unl?'No cap':[ar.ev!=null?'up to $'+ar.ev+'/withdrawal':null,ar.n!=null?ar.n+'/month':null].filter(Boolean).join(', ')||'cap ?'} · ${({CANADA:'Canada',OUTSIDE_CANADA:'outside Canada',WORLDWIDE:'worldwide'})[ar.sc]||'scope ?'}${ar.plan?' · '+esc(ar.plan):''} <span class=t>${esc(ar.tag||'CITED')}</span>`;
   return `<article class=bacct><header><span class=bdot style="background:linear-gradient(135deg,${bcol(o)[0]},${bcol(o)[1]})"></span><div><button class=lnk data-bm="${o.id}"><b>${esc(o.n)}</b></button><div class=mute>${esc(o.i)}${o.st=='discontinued'?' · <span class=disc>No longer offered</span>':''}</div></div><span class="brate${(rateOf(o).rate||0)>0?' pos':''}" title="${esc(rateOf(o).why)}"><b>${rateOf(o).label}</b><small>interest</small></span><b class=bfee>${m2(o.fee)}<small>/mo</small></b></header>
   <dl class=bkv><dt>Waiver</dt><dd>${o.mbk=='waive'?`${r.bw?'<span class=y>Waived</span> at your balance':'Waived at '+m0(o.mb)+' balance'}`:o.mbk=='none-needed'?'No condition needed':o.mbk=='no-waiver'?'<span class=mute>No balance waiver</span>':q}${o.wvt?`<div class=mute>${esc(o.wvt.slice(0,140))}${o.wvt.length>140?'…':''}</div>`:''}</dd>
   <dt>Rebate / bundle</dt><dd>${r.rb?`<span class=y>${m0(r.rb)}/yr</span> <span class=mute>${rl.why.filter(w=>/rebate/.test(w)).join('; ')}</span>`:(o.rules||[]).length?'<span class=mute>Not met with your current products</span>':'<span class=mute>None on record</span>'}</dd>
   <dt>Transactions</dt><dd>${o.tx?esc(o.tx)+(o.tx!='Unlimited'?'/mo':''):q}${o.ptx?`<div class=mute>${esc(o.ptx.slice(0,100))}</div>`:''}</dd>
   <dt>e-Transfer</dt><dd>${o.et===1?'<span class=y>Send free</span>':o.et===0?'Fee applies':q}${o.etl?` · <span class=mute>${esc(o.etl.slice(0,90))}</span>`:''}</dd>
   <dt>ATM</dt><dd>${o.atm?esc(o.atm.slice(0,120))+(o.atm.length>120?'…':''):q}</dd>
   <dt>Non-network ATM refund</dt><dd>${atmR}</dd>
   <dt>Interest</dt><dd><b>${rateOf(o).label}</b> <span class=mute>${esc(rateOf(o).why)}</span>${o.intt?`<div class=mute>${esc(o.intt.slice(0,140))}${o.intt.length>140?'…':''}</div>`:''}</dd>
   <dt>Ways to lower your fee</dt><dd>${waysHTML(waysToLower(o,{n:nAt(o,inp)}))}</dd>
   <dt>Sign-up offer</dt><dd>${o.pr.length?esc(o.pr[0].t.slice(0,160))+(o.pr[0].t.length>160?'…':''):'<span class=mute>None on record</span>'}</dd></dl></article>`}).join(''):'<p class=empty>No bank accounts yet. Add yours on the right.</p>'}
  <p class=omute>Rebates use the product counts in your <button type=button class="lnk plink" data-s=profile>Profile</button> (cards and brokerage at the same institution). Perks are listed, not valued.</p></div>
  <aside class=wside><h3>Your accounts <span class=mute>(${os.length})</span></h3><div class=tiles>${os.map(o=>btile(o,{rm:false})).join('')||'<div class=wempty><span class=wei aria-hidden=true>＋</span><b>Start your banking wallet</b><p>Add the chequing and savings accounts you hold. Credit cards live in Cards › Wallet.</p></div>'}</div>
  ${pgoLink('banks','Add or remove accounts in Wallet ›')}${connHTML()}</aside></div>`}
 function bRender(){const s=BS.find(x=>x.id==st.bs)||BS[0];st.bs=s.id;closeM();
  $('#tabs').innerHTML=tabs(st.s=='wfolder'?'wallet':s.id);
  $('#pre').hidden=true;$('#page').hidden=true;
  if(s.id=='binst')return renderInst();
  if(s.id=='bprom'){$('.wrap').hidden=true;$('#bar').hidden=true;$('#filters').hidden=true;$('#view').hidden=false;return renderPromos('bank')}
  $('#view').hidden=true;$('.wrap').hidden=false;$('#bar').hidden=false;$('#filters').hidden=false;
  const F=BF(),bf=st.bf||{};
  $('#filters').innerHTML=s.f.map(id=>`<label>${F[id][0]}<select data-bf="${id}" class="${bf[id]!=null?'set':''}"><option value="">Any</option>${F[id][1].map((x,i)=>`<option value="${i}" ${bf[id]==i?'selected':''}>${esc(x[0])}</option>`).join('')}</select></label>`).join('');
  $('#filters').style.display='';
  const R=rows(),chips=Object.entries(bf).filter(([k])=>F[k]).map(([k,i])=>`<span class=chip><i>Banking ·</i> ${F[k][0]} ${esc(F[k][1][i]?.[0]||'')}<button data-bx="${k}" aria-label="Remove">×</button></span>`);
  if(st.q)chips.push(`<span class=chip><i>Search ·</i> “${esc(st.q)}”<button data-x="__q">×</button></span>`);
  const sk=st.bsort&&(st.bsort=='n'||BCOL[st.bsort])?st.bsort:'fee',dir=st.bsort==sk?(st.bdir||1):1;
  if(st.bsort)chips.push(`<span class=chip><i>Sort ·</i> ${sk=='n'?'Account':BCOL[sk][0].replace(/<[^>]+>.*$/,'').trim()} ${dir>0?'▴':'▾'}<button data-bx="__sort" aria-label="Reset sort">×</button></span>`);
  $('#bar').innerHTML=`<span class=count>${R.length} <span>of ${A().filter(o=>o.st!='discontinued').length} accounts</span></span>${chips.join('')}${chips.length?'<button class=clr data-bx="__all">Clear all</button>':''}`;
  const key=sk=='n'?o=>o.n:BCOL[sk][2];R.sort((a,b)=>nlast(key(a),key(b),dir)||a.n.localeCompare(b.n));
  const cols=['n',...s.cols];
  $('#th').innerHTML='<tr>'+cols.map(k=>{const[l,cl]=k=='n'?['Account','l nm']:BCOL[k];return `<th data-bk="${k}" class="${cl=='wrapt'?'l':cl} ${k==sk?'s'+(dir>0?' asc':''):''}">${l}</th>`}).join('')+'</tr>';
  $('#tb').innerHTML=R.length?R.map(o=>`<tr data-bi="${o.id}">`+cols.map(k=>k=='n'?`<td class="l nm"><button type=button class=nmb data-bm="${o.id}" aria-haspopup=dialog title="All details"><b class=cl>${esc(o.n)}</b></button>${o.st=='discontinued'?'<span class=disc>Discontinued</span>':''}${(STO.wallet.banks||[]).some(x=>x.id==o.id)?'<span class=held>In wallet</span>':''}<small>${esc(o.i)}${o.fam?' · '+esc(famN(o.fam)):''}</small></td>`:`<td class="${BCOL[k][1]}">${BCOL[k][3](o)}</td>`).join('')+'</tr>').join(''):`<tr><td class=empty colspan=${cols.length}>No accounts match. Remove a filter.</td></tr>`}
 function renderInst(){$('.wrap').hidden=true;$('#bar').hidden=true;$('#filters').hidden=true;$('#view').hidden=false;
  const I=BD().inst;$('#view').innerHTML=`<div class=vhead><h2>Institutions</h2><span class=mute>${I.length} Canadian institutions · ${A().length} chequing accounts</span></div>
  <div class=bwrap><table class=vt><tr><th class=l>Institution</th><th>Accounts</th><th>Lowest monthly fee</th><th>$0 accounts</th><th>Waive a card fee</th><th>Product rebates</th><th>Waiver chains</th><th>Sign-up offers</th></tr>
  ${I.map(x=>`<tr><td class=l><button class=lnk data-binst="${esc(x.i)}">${esc(x.i)}</button></td><td>${x.n}</td><td>${m2(x.lo)}</td><td>${x.free}</td><td>${x.wv?'<span class=y>✓</span> '+x.wv:'<span class=mute>0</span>'}</td><td>${x.rules?'<span class=y>✓</span> '+x.rules:'<span class=mute>0</span>'}</td><td>${x.ch}</td><td>${x.pr}</td></tr>`).join('')}</table></div>
  <p class=mute>Derived from the record at build time (no institutions table in the database). Waiver chains = rows in <code>waiver_chains</code> for the institution.</p>`}
 function html(o){const held=(STO.wallet.banks||[]).some(x=>x.id==o.id),row=(l,v)=>`<tr><th>${l}</th><td>${v==null||v===''?'<span class=q>—</span>':v}</td></tr>`,t=v=>v==null||v===''?null:esc(v);
  return `<h2>${esc(o.n)}${o.st=='discontinued'?'<span class=disc>Discontinued</span>':''}</h2><div class=mute>${esc(o.i)} · ${o.fam?esc(famN(o.fam))+' <span class=mute>('+esc(o.famb)+')</span> · ':''}captured ${esc(o.snap)} <span class=t>${esc(o.tag)}</span></div>
  <div class=hero><div><span>Monthly fee</span><b>${m2(o.fee)}</b></div><div><span>Per year</span><b>${m0(o.feey)}</b></div><div><span>Min. balance to waive</span><b>${mbCell(o)}</b></div><div><span>Transactions</span><b>${o.tx?esc(o.tx):'<span class=q>—</span>'}</b></div></div>
  <p><button class=btn data-bwal="${o.id}">${held?'Remove from Wallet':'+ I hold this account'}</button></p>
  <h3>Fees &amp; waivers</h3><table class=kv>${row('Monthly fee (as published)',t(o.feet))}${row('Waiver conditions',t(o.wvt))}${row('Opening minimum',t(o.om))}${row('Per-transaction fee',t(o.ptx))}${row('NSF',t(o.nsf))}${row('Overdraft',t(o.od))}${row('Stop payment',t(o.stop))}${row('Drafts',t(o.draft))}${row('Certified cheque',t(o.cert))}${row('Paper statements',t(o.paper))}${row('FX',t(o.fx))}</table>
  ${o.rules.length?`<h3>Product-count rebates</h3><table class=kv><tr><th>Program</th><td><b>Products</b> → fee after</td></tr>${o.rules.map(x=>`<tr><th>${esc(x.p)}</th><td>${x.lo==null?'<span class=q>—</span>':x.lo+(x.hi==null?'+':x.hi!=x.lo?'–'+x.hi:'')} ${esc(x.u||'')} → <b>${m2(x.after)}</b>/mo (rebate ${m2(x.amt)}) <span class=t>${esc(x.ev)}</span>${x.new===0?' <span class=mute>closed to new accounts</span>':''}<div class=mute>${esc(x.act||'')}</div><div class=mute>${esc(x.n||'')}</div>${x.src?`<div><a href="${esc(x.src)}" target=_blank rel=noopener>Source</a>${x.arc?' · archived '+esc(x.arc):''}</div>`:''}</td></tr>`).join('')}</table>${o.rules[0].cp?`<p class=mute><b>Counts:</b> ${esc(o.rules.find(x=>x.new!==0)?.cp||o.rules[0].cp)}</p>`:''}`:''}
  <h3>Card-fee waivers</h3>${o.wv.length?`<ul>${o.wv.map(w=>`<li>${w.cid?`<a href="#card/${esc(w.cid)}" data-go>${esc(w.to)}</a>`:esc(w.to)} <span class=t>${w.cs=='CONFIRMED'?'CITED':'REPORTED'}</span>${w.v?' · '+esc(w.v):''}</li>`).join('')}</ul>`:'<p class=mute>None on record.</p>'}
  <h3>Perks &amp; sign-up</h3><table class=kv>${row('Sign-up offer',o.pr.map(p=>esc(p.t)).join('<br>')||null)}${row('Included services',t(o.svc))}${row('Stand-out feature',t(o.uf))}</table>
  <h3>Access</h3><table class=kv>${row('Transactions',t(o.txt))}${row('Interac e-Transfer',t(o.ett))}${row('e-Transfer limits',t(o.etl))}${row('ATM fees',t(o.atm))}${row('ATM fee reimbursement',o.atmr&&o.atmr.st!=null?yn(o.atmr.st)+' '+esc([o.atmr.plan,o.atmr.cond].filter(Boolean).join('. '))+(o.atmr.notes&&o.atmr.st===1?'<div class=mute>'+esc(o.atmr.notes)+'</div>':'')+(o.atmr.u?` <a href="${esc(o.atmr.u)}" target=_blank rel=noopener>Source</a> <span class=t>${esc(o.atmr.tag||'')}</span>`:''):null)}${row('Interest',t(o.intt))}${row('Branches','<span class=q title="Branch access is not in the record yet">—</span>')}</table>
  ${o.notes?`<p class=mute><b>Record notes:</b> ${esc(o.notes)}</p>`:''}
  <h3>Sources</h3><ul class=srcs>${[{u:o.url,t:'product page',d:o.snap,vs:o.tag},...o.srcs.filter(s=>s.u!=o.url)].filter(s=>s.u).map(s=>`<li><a href="${esc(s.u)}" target=_blank rel=noopener>${esc(s.u.replace(/^https?:\/\//,'').slice(0,70))}</a> <span class=mute>${esc(s.t||'')} · ${esc(s.d||'')}</span> <span class=t>${esc(s.vs||'')}</span></li>`).join('')}</ul>`}
 function openB(o){$('#mc').innerHTML=html(o);$('#mbg').classList.add('on');$('#mbg').setAttribute('aria-hidden','false');$('#mx').focus()}
 function openH(k){$('#mc').innerHTML=HELP[k];$('#mbg').classList.add('on');$('#mbg').setAttribute('aria-hidden','false');$('#mx').focus()}
 function wallet(){const v=$('#view');if(!v)return;const hb=STO.wallet.banks||[],os=hb.map(x=>BI[x.id]).filter(Boolean),wc=W.cards.map(i=>C[BYID[i]]).filter(Boolean);
  const fy=os.reduce((s,o)=>s+(o.feey||0),0),unk=os.some(o=>o.feey==null);
  const sec=`<section class=wbank id=wbank><h3>Bank accounts <span class=mute>(${os.length})</span></h3>
  <table class=vt><tr><th class=l>Account</th><th>List fee / yr</th><th class=l>Fee conditions</th><th class=l>Card-fee links</th><th></th></tr>${os.map(o=>`<tr><td class=l><button class=lnk data-bm="${o.id}">${esc(o.n)}</button></td><td>${m0(o.feey)}</td><td class=l>${o.rules.length?ruleCell(o)+'<br>':''}${o.mbk=='waive'?'Waived at '+m0(o.mb)+' balance':o.mbk=='none-needed'?'No condition':'<span class=mute>See waiver terms</span>'}</td><td class=l>${o.wv.length?o.wv.map(w=>esc(w.to)+(w.cid&&W.cards.includes(w.cid)?' <span class=y>✓ held</span>':'')).join('<br>'):'<span class=mute>None on record</span>'}</td><td><button class=lnk data-bwrm="${o.id}" aria-label="Remove ${esc(o.n)}">Remove</button></td></tr>`).join('')}
  ${os.length?`<tr class=tot><th class=l>Total list fees</th><th>${'$'+Math.round(fy).toLocaleString()}${unk?' <span class=q title="At least one fee is not stated">—</span>':''}</th><th colspan=3 class=l><span class=mute>Before waivers and rebates. ${wc.length} card(s) in your wallet; product-count pricing will use these holdings in a later release.</span></th></tr>`:'<tr><td colspan=5 class=empty>No bank accounts yet. Add one below or from Banking.</td></tr>'}</table>
  ${pgoLink('banks','Add or remove accounts in Wallet ›')}</section>`;
  const m=v.querySelector('.wmain');if(m)m.insertAdjacentHTML('beforeend',sec)}
 const setW=(id,add)=>{const a=STO.wallet.banks=STO.wallet.banks||[],i=a.findIndex(x=>x.id==id);if(i>=0&&!add)a.splice(i,1);else if(i<0)a.push({id,added_at:new Date().toISOString()});STO.wallet.updated_at=new Date().toISOString();saveS()};
 function init(){if(inited)return;inited=true;A().forEach(o=>BI[o.id]=o);STO.wallet.banks=(STO.wallet.banks||[]).filter(x=>x&&BI[x.id]);
  const rw=VIEWS.wfolder;VIEWS.wfolder=()=>on()?bFolder():rw();
  document.addEventListener('click',e=>{const t=e.target;
   const pl=t.closest('[data-pl]');if(pl){e.stopPropagation();const k=pl.dataset.pl;st.card=null;if(k!=st.pl||USR.has(st.s)){if(k!=st.pl)st.bs='bov';st.s='ov'}st.pl=k;render();scrollTo(0,0);return}
   const bh=t.closest('[data-bh]');if(bh){e.stopPropagation();e.preventDefault();openH(bh.dataset.bh);return}
   const bw=t.closest('[data-bwal],[data-bwrm]');if(bw){e.stopPropagation();const id=bw.dataset.bwal||bw.dataset.bwrm,inM=bw.closest('#modal');setW(id,false);render();if(inM)openB(BI[id]);return}
   const bm=t.closest('[data-bm]');if(bm){e.stopPropagation();openB(BI[bm.dataset.bm]);return}
   if(t.closest('#modal'))return;
   const bi=t.closest('[data-binst]');if(bi){e.stopPropagation();const ix=[...new Set(A().map(o=>o.i))].sort().indexOf(bi.dataset.binst);st.bf={inst:ix};st.bs='bov';render();return}
   if(on()&&!st.card){const bs=t.closest('[data-bs]');if(bs){e.stopPropagation();st.bs=bs.dataset.bs;if(st.s=='wfolder')st.s='ov';render();scrollTo(0,0);return}}
   if(!on()||st.card||st.s=='wfolder')return;
   const bk=t.closest('[data-bk]');if(bk){e.stopPropagation();const k=bk.dataset.bk;if(st.bsort==k)st.bdir=-(st.bdir||1);else{st.bsort=k;st.bdir=(k=='n'||BCOL[k][1]!='')||['fee','feey','mb'].includes(k)?1:-1}render();return}
   const bx=t.closest('[data-bx]');if(bx){e.stopPropagation();const x=bx.dataset.bx;if(x=='__all'){st.bf={};st.q='';$('#q').value=''}else if(x=='__sort'){st.bsort=null;st.bdir=1}else{const f={...(st.bf||{})};delete f[x];st.bf=f}render();return}
   {const tr=t.closest('[data-trc]');if(tr&&!tr.matches('td.nm')&&!t.closest('a,button'))return}
   if(t.closest('#tb tr[data-bi]'))e.stopPropagation()},true);
  document.addEventListener('change',e=>{const k=e.target.dataset.bf;if(!k)return;e.stopPropagation();const f={...(st.bf||{})};if(e.target.value==='')delete f[k];else f[k]=+e.target.value;st.bf=f;render()},true);
  document.addEventListener('input',e=>{const k=e.target.dataset.bmi;if(k){e.stopPropagation();st[k]=Math.max(0,+e.target.value||0);const pos=e.target.value;save();render();const n=document.querySelector(`[data-bmi=${k}]`);if(n){n.focus();n.value=pos}return}},true);
  document.addEventListener('input',e=>{if(!e.target.dataset.bpick)return;e.stopPropagation();const o=A().find(x=>x.n.toLowerCase()==e.target.value.toLowerCase());if(o){setW(o.id,true);render();document.querySelector('[data-bpick]')?.focus()}},true)}
 return {init,bar,tabs,btile,render:bRender,on,wallet,open:openB,data:BD,cost:bCost,inp:binp};
})();
