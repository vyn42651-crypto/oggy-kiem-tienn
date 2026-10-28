const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n || 0);
const today = () => new Date().toISOString().slice(0,10);
const sampleEntries = [
 {id:'e1',date:today(),title:'Thiết lập phòng thử nghiệm OGGY',body:'Tạo bộ khung website, xác định cách ghi nhận thu chi và tách rõ dữ liệu minh họa khỏi dữ liệu đã xác nhận.',status:'Đã hoàn thành'},
 {id:'e2',date:shiftDate(-1),title:'Chọn một vấn đề nhỏ để giải quyết',body:'Ưu tiên sản phẩm có phạm vi nhỏ, có thể làm bản thử và lấy phản hồi trước khi đầu tư thêm thời gian.',status:'Đang thử nghiệm'},
 {id:'e3',date:shiftDate(-2),title:'Xác định nguyên tắc minh bạch',body:'Không ghi khoản đang chờ thành doanh thu thật. Mỗi kết quả cần có bằng chứng và ngày cập nhật.',status:'Đã hoàn thành'}
];
const sampleTransactions = [
 {id:'t1',date:shiftDate(-2),title:'Vốn khởi tạo (minh họa)',type:'income',amount:1200000,status:'confirmed',demo:true},
 {id:'t2',date:shiftDate(-1),title:'Tên miền & thử nghiệm (minh họa)',type:'expense',amount:85000,status:'confirmed',demo:true},
 {id:'t3',date:today(),title:'Bán template — chờ xác nhận (minh họa)',type:'income',amount:150000,status:'pending',demo:true}
];
let entries = load('oggy_entries', sampleEntries);
let transactions = load('oggy_transactions', sampleTransactions);
let activeFilter='all';
let apiAvailable=false;
let aiConfigured=false;
let storageConfigured=false;
function shiftDate(d){const x=new Date();x.setDate(x.getDate()+d);return x.toISOString().slice(0,10)}
function load(key, fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}}
function save(){localStorage.setItem('oggy_entries',JSON.stringify(entries));localStorage.setItem('oggy_transactions',JSON.stringify(transactions))}
function formatDate(date){const d=new Date(date+'T12:00:00');return {day:String(d.getDate()).padStart(2,'0'),month:d.toLocaleDateString('vi-VN',{month:'short'}).replace('.','').toUpperCase(),full:d.toLocaleDateString('vi-VN')}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)}
function safe(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderDashboard(){
 const income=transactions.filter(t=>t.type==='income'&&t.status==='confirmed').reduce((s,t)=>s+t.amount,0);
 const expenses=transactions.filter(t=>t.type==='expense'&&t.status==='confirmed').reduce((s,t)=>s+t.amount,0);
 const balance=income-expenses; const pct=Math.min(100,Math.round(income/10000000*100));
 $('#balance').textContent=money(balance);$('#income').textContent=money(income);$('#expenses').textContent=money(expenses);
 $('#goalAmount').textContent=money(income);$('#goalPct').textContent=pct+'%';$('#goalPercent2').textContent=pct+'% hoàn thành';
 $('#goalBar').style.width=pct+'%';$('#goalBar2').style.width=pct+'%';
 $('#projectDay').textContent=String(Math.min(30,Math.max(1,31-new Date().getDate()))).padStart(2,'0')+' / 30';
 $('#entryCount').textContent=String(entries.length).padStart(2,'0');
}
function renderJournal(){
 $('#journalList').innerHTML=entries.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(e=>{const d=formatDate(e.date);return `<article class="journal-item panel"><div class="date-chip"><b>${d.day}</b>${d.month}</div><div><h3>${safe(e.title)}</h3><p>${safe(e.body)}</p><span class="entry-status">↳ ${safe(e.status)} · ${d.full}</span></div></article>`}).join('');
 $('#entryCount').textContent=String(entries.length).padStart(2,'0');
}
function renderLedger(){
 const list=transactions.filter(t=>activeFilter==='all'||t.type===activeFilter).slice().sort((a,b)=>b.date.localeCompare(a.date));
 $('#ledgerRows').innerHTML=list.map(t=>`<tr><td>${formatDate(t.date).full}</td><td>${safe(t.title)}${t.demo?' <span class="muted">(demo)</span>':''}</td><td>${t.type==='income'?'Khoản thu':'Khoản chi'}</td><td><span class="status-chip ${t.status==='pending'?'pending':''}">${t.status==='confirmed'?'Đã xác nhận':'Đang chờ'}</span></td><td class="right amount ${t.type}">${t.type==='income'?'+':'−'}${money(t.amount)}</td></tr>`).join('');
 $('#ledgerCount').textContent=list.length+' giao dịch';$('#emptyLedger').classList.toggle('hidden',list.length>0);
}
function render(){renderDashboard();renderJournal();renderLedger();$('#dataMode').textContent=apiAvailable?'Cloud API':'Demo cục bộ'}
async function checkApi(){
 try{
  const r=await fetch('/api/health',{cache:'no-store'});
  if(!r.ok)throw new Error('health unavailable');
  const d=await r.json();apiAvailable=!!d.ok;aiConfigured=!!d.aiConfigured;storageConfigured=!!d.storageConfigured;
  $('#aiStatus').textContent=aiConfigured?'AI đã cấu hình':'cần cấu hình AI';
  $('#aiStatus').style.color=aiConfigured?'var(--neon)':'var(--yellow)';
  $('#chatSub').textContent=aiConfigured?'Trợ lý dự án · AI máy chủ đã cấu hình':'Trợ lý dự án · chưa có khóa API';
  $('#requestStatus').textContent=storageConfigured?'Yêu cầu sẽ được lưu trên máy chủ.':'Chế độ demo: yêu cầu chưa được lưu trên máy chủ.';
  $('#dataMode').textContent=storageConfigured?'Cloudflare D1':'Demo cục bộ';
 }catch{apiAvailable=false;aiConfigured=false;storageConfigured=false;$('#aiStatus').textContent='demo local';$('#chatSub').textContent='Trợ lý dự án · chế độ demo';$('#requestStatus').textContent='Bản demo sẽ lưu yêu cầu trên trình duyệt.';$('#dataMode').textContent='Demo cục bộ'}
}
$('#themeToggle').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem('oggy_theme',document.body.classList.contains('light')?'light':'dark')});
if(localStorage.getItem('oggy_theme')==='light')document.body.classList.add('light');
$('#year').textContent=new Date().getFullYear();
$$('.filter').forEach(b=>b.addEventListener('click',()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;renderLedger()}));
const entryDialog=$('#entryDialog'),txDialog=$('#transactionDialog');
$('#addEntryBtn').addEventListener('click',()=>entryDialog.showModal());
$('#addTransactionBtn').addEventListener('click',()=>{const f=$('#transactionForm');f.date.value=today();txDialog.showModal()});
$$('.close-modal').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('#entryForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;entries.unshift({id:crypto.randomUUID(),date:today(),title:f.title.value.trim(),body:f.body.value.trim(),status:f.status.value});save();render();f.reset();entryDialog.close();toast('Đã lưu nhật ký trên trình duyệt.')});
$('#transactionForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget;transactions.unshift({id:crypto.randomUUID(),date:f.date.value,title:f.title.value.trim(),type:f.type.value,amount:Number(f.amount.value),status:f.status.value,demo:true});save();render();f.reset();txDialog.close();toast('Đã lưu giao dịch demo trên trình duyệt.')});
$('#requestForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;const payload=Object.fromEntries(new FormData(f));const status=$('#requestStatus');status.textContent='Đang gửi…';try{const r=await fetch('/api/requests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'API chưa sẵn sàng');if(d.mode==='demo'){const local=load('oggy_requests',[]);local.unshift({...payload,id:d.id,createdAt:new Date().toISOString()});localStorage.setItem('oggy_requests',JSON.stringify(local));status.textContent='Chế độ demo: yêu cầu chỉ lưu trong trình duyệt này; chưa gửi/lưu trên máy chủ.';toast('Đã lưu yêu cầu demo cục bộ.')}else{status.textContent='Đã lưu yêu cầu trên máy chủ. Mã tham chiếu: '+d.id;toast('Đã gửi yêu cầu tới máy chủ.')}f.reset()}catch(err){status.textContent=err.message||'Không gửi được. Vui lòng thử lại.';toast('Không gửi được yêu cầu.')}});
function addMessage(text,role='assistant',error=false){const el=document.createElement('div');el.className='message '+role+(error?' error':'');el.textContent=text;$('#chatMessages').append(el);$('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;return el}
async function sendChat(text){
 if(!text.trim())return;addMessage(text,'user');const pending=addMessage('OGGY đang suy nghĩ…');$('#chatInput').value='';$$('.suggestions button').forEach(b=>b.disabled=true);
 try{const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Máy chủ AI chưa được cấu hình.');pending.remove();addMessage(data.reply||'Mình chưa có câu trả lời phù hợp.')}catch(err){pending.remove();addMessage(err.message||'Chưa kết nối được AI. Hãy kiểm tra cấu hình AI_API_KEY, model và hạn mức trên Cloudflare Pages.', 'assistant',true)}finally{$$('.suggestions button').forEach(b=>b.disabled=false)}
}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();sendChat($('#chatInput').value)});
$$('.suggestions button').forEach(b=>b.addEventListener('click',()=>sendChat(b.textContent)));
$('#clearChat').addEventListener('click',()=>{$('#chatMessages').innerHTML='<div class="message assistant">Cuộc trò chuyện đã được làm mới. Bạn muốn thử ý tưởng nào?</div>'});
$('#chatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#chatForm').requestSubmit()}});
render();checkApi();
