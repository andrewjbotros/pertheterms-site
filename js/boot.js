// Loads data/screener-data.json, then starts js/app.js. Served over HTTP (fetch does not work from file://).
window.__PTT_IMG='images/';
fetch('data/screener-data.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(d=>{window.__PTT_DATA=d;const b=document.createElement('script');b.src='js/bank.js?v=74e37904c8';b.onload=()=>{const s=document.createElement('script');s.src='js/app.js?v=4f5fa474e2';document.body.append(s)};document.body.append(b)})
 .catch(e=>{document.body.insertAdjacentHTML('afterbegin','<p style="padding:16px;font:14px system-ui">PerTheTerms could not load its data ('+String(e.message||e)+'). Open this site through a web server, not as a file.</p>')});
