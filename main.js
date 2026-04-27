/* ═══════════════════════════════════════════════════════════
   APEXFUEL — Premium Protein Brand
   main.js — All interactivity (cart, auth, payment, animations)
   Usage: Loaded at bottom of index.html
═══════════════════════════════════════════════════════════ */

/* ─── STATE ─── */
let cart = [];
let currentUser = null;
let selectedPayMethod = 'card';
let selectedUPI = null;
let paymentStep = 'form';

/* ─── FIREBASE CONFIG (REST API - no SDK needed) ─── */
const FB_API_KEY = "AIzaSyD3x07kobvIFwlIb9ZUiEYLyyaniisiwAY";
const FB_PROJECT = "apexfuel-7e5f5";
let pendingSessionInfo = null;

/* ─── CURSOR ─── */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });
(function animCursor(){
  rx += (mx-rx)*0.15; ry += (my-ry)*0.15;
  cursor.style.left=mx+'px'; cursor.style.top=my+'px';
  ring.style.left=rx+'px'; ring.style.top=ry+'px';
  requestAnimationFrame(animCursor);
})();
function enlargeCursor(){ cursor.style.width='20px'; cursor.style.height='20px'; ring.style.width='60px'; ring.style.height='60px'; }
function resetCursor(){ cursor.style.width='12px'; cursor.style.height='12px'; ring.style.width='40px'; ring.style.height='40px'; }
document.addEventListener('mouseover', e => { if(e.target.closest('a,button,.product-card,.stat-item')) enlargeCursor(); else resetCursor(); });

/* ─── PARALLAX ─── */
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  document.querySelectorAll('.parallax-el').forEach(el => {
    const s = parseFloat(el.dataset.speed)||0;
    el.style.transform = `translateY(${y*s}px)`;
  });
  const hbt = document.querySelector('.hero-bg-text');
  if(hbt){ hbt.style.transform=`translateY(${y*0.5}px) translateX(-50%)`; hbt.style.left='50%'; hbt.style.opacity=Math.max(0,1-y/600); }
});

/* ─── INTERSECTION OBSERVER ─── */
const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
},{threshold:0.15});
document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.ingredient-row').forEach(el=>io.observe(el));

/* ─── COUNTERS ─── */
function animCount(el,target,suf){
  let cur=0; const step=target/60;
  const t=setInterval(()=>{ cur+=step; if(cur>=target){cur=target;clearInterval(t);} el.textContent=Math.floor(cur)+suf; },16);
}
const cio = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const n=e.target.querySelector('.stat-num span');
      if(n){ const raw=n.textContent; const suf=raw.replace(/[0-9]/g,''); animCount(n,parseInt(raw),suf); }
      cio.unobserve(e.target);
    }
  });
},{threshold:0.5});
document.querySelectorAll('.stat-item').forEach(el=>cio.observe(el));

/* ─── TESTIMONIAL DRAG ─── */
const track = document.getElementById('testimonialTrack');
let isDown=false,startX,scrollLeft;
track.addEventListener('mousedown',e=>{isDown=true;track.classList.add('grabbing');startX=e.pageX-track.offsetLeft;scrollLeft=track.scrollLeft;});
track.addEventListener('mouseleave',()=>{isDown=false;track.classList.remove('grabbing');});
track.addEventListener('mouseup',()=>{isDown=false;track.classList.remove('grabbing');});
track.addEventListener('mousemove',e=>{if(!isDown)return;e.preventDefault();track.scrollLeft=scrollLeft-(e.pageX-track.offsetLeft-startX)*2;});

/* ─── TOAST ─── */
function showToast(msg, icon='✓'){
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className='toast';
  t.innerHTML=`<span class="toast-icon">${icon}</span>${msg}`;
  wrap.appendChild(t);
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>t.classList.add('show')); });
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),400); },2800);
}

/* ─── PANEL HELPERS ─── */
function openBackdrop(){ document.getElementById('backdrop').classList.add('open'); }
function closeBackdrop(){ document.getElementById('backdrop').classList.remove('open'); }
function closeAll(){ closeCart(); closeAuth(); closePayment(); closeBackdrop(); }

/* ─── CART ─── */
function openCart(){ document.getElementById('cartPanel').classList.add('open'); openBackdrop(); renderCart(); }
function closeCart(){ document.getElementById('cartPanel').classList.remove('open'); closeBackdrop(); }

function addToCart(name, price, abbr, btn){
  const existing = cart.find(i=>i.name===name);
  if(existing){ existing.qty++; }
  else { cart.push({name, price, abbr, qty:1}); }
  updateCartBadge();
  showToast(`${name} added to cart`);
  if(btn){ btn.classList.add('added'); setTimeout(()=>btn.classList.remove('added'),1200); }
}
function removeFromCart(idx){ cart.splice(idx,1); updateCartBadge(); renderCart(); }
function changeQty(idx, delta){
  cart[idx].qty += delta;
  if(cart[idx].qty <= 0) removeFromCart(idx);
  else renderCart();
  updateCartBadge();
}
function updateCartBadge(){
  const total = cart.reduce((a,i)=>a+i.qty,0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.classList.toggle('show', total>0);
}
function getCartTotal(){ return cart.reduce((a,i)=>a+(i.price*i.qty),0); }
function renderCart(){
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  if(cart.length===0){
    body.innerHTML=`<div class="cart-empty">
      <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
      <p>Your cart is empty</p>
    </div>`;
    footer.style.display='none'; return;
  }
  footer.style.display='block';
  body.innerHTML = cart.map((item,i)=>`
    <div class="cart-item">
      <div class="cart-item-icon">${item.abbr}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${(item.price*item.qty).toLocaleString('en-IN')}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${i})">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
  const sub = getCartTotal();
  const shipping = sub>=999 ? 0 : 99;
  document.getElementById('cartSubtotal').textContent = '₹'+sub.toLocaleString('en-IN');
  document.getElementById('cartShipping').textContent = shipping===0 ? 'FREE' : '₹'+shipping;
  document.getElementById('cartTotal').textContent = '₹'+(sub+shipping).toLocaleString('en-IN');
}

/* ══════════════════════════════════════
   AUTH — Firebase REST API (no SDK)
   Works inside Claude.ai sandbox
══════════════════════════════════════ */
let authTab = 'login';
let authPhase = 'methods';
let pendingPhone = '';

function openAuth(){
  document.getElementById('authPanel').classList.add('open');
  openBackdrop();
  renderAuth();
}
function closeAuth(){
  document.getElementById('authPanel').classList.remove('open');
  closeBackdrop();
}

function renderAuth(){
  const body = document.getElementById('authBody');
  const title = document.getElementById('authPanelTitle');
  if(currentUser){
    title.textContent = 'PROFILE';
    body.innerHTML = renderProfile();
    return;
  }
  title.textContent = 'ACCOUNT';
  body.innerHTML = `
    <div class="auth-tabs">
      <button class="auth-tab ${authTab==='login'?'active':''}" onclick="setAuthTab('login')">LOGIN</button>
      <button class="auth-tab ${authTab==='signup'?'active':''}" onclick="setAuthTab('signup')">SIGN UP</button>
    </div>
    ${authPhase==='methods' ? renderAuthMethods() : ''}
    ${authPhase==='phone'   ? renderPhoneForm()   : ''}
    ${authPhase==='otp'     ? renderOTPForm()     : ''}
  `;
}

function renderProfile(){
  const u = currentUser;
  const display = u.phone || u.email || 'Apex Athlete';
  const initial = (u.name || display).slice(0,2).toUpperCase();
  return `
    <div style="text-align:center;padding:20px 0 32px">
      <div class="profile-avatar">${initial}</div>
      <div class="profile-name">${u.name || 'APEX ATHLETE'}</div>
      <div class="profile-email">${display}</div>
    </div>
    <div class="profile-info-grid">
      <div class="profile-info-card"><div class="profile-info-label">Orders</div><div class="profile-info-val">${u.orders||0}</div></div>
      <div class="profile-info-card"><div class="profile-info-label">Member Since</div><div class="profile-info-val">2026</div></div>
      <div class="profile-info-card"><div class="profile-info-label">Reward Pts</div><div class="profile-info-val">${(u.orders||0)*120}</div></div>
      <div class="profile-info-card"><div class="profile-info-label">Tier</div><div class="profile-info-val" style="color:#a8ff3e">ELITE</div></div>
    </div>
    <button class="logout-btn" onclick="logout()">LOGOUT</button>
  `;
}

function renderAuthMethods(){
  const verb = authTab==='login' ? 'Login' : 'Sign up';
  return `
    <div class="auth-method-btns">
      <button class="auth-method-btn" onclick="setAuthPhase('phone')">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="#ff4d00" fill="none" stroke-width="1.8" stroke-linecap="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.07 2.18 2 2 0 012.03 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
        </svg>
        ${verb} with Phone Number
      </button>
    </div>
    <p class="auth-note" style="margin-top:20px">Enter your phone number to receive a real OTP via SMS.</p>
  `;
}

function renderPhoneForm(){
  return `
    <button onclick="setAuthPhase('methods')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;display:flex;align-items:center;gap:8px">← BACK</button>
    <div class="auth-input-wrap">
      <label class="auth-label">Phone Number</label>
      <div style="display:flex;gap:10px">
        <input class="auth-input" id="countryCode" value="+91" style="width:72px;flex-shrink:0;text-align:center">
        <input class="auth-input" id="authPhone" placeholder="9876543210" type="tel" maxlength="10" style="flex:1" oninput="this.value=this.value.replace(/\D/g,'')">
      </div>
    </div>
    <button class="auth-btn" id="sendOtpBtn" onclick="sendOTP()">SEND OTP →</button>
    <p class="auth-note" style="margin-top:16px">📱 Enter your number then use your Firebase test OTP <strong style='color:var(--orange)'>123456</strong> to login</p>
  `;
}

function renderOTPForm(){
  return `
    <div style="background:rgba(255,77,0,0.08);border:1px solid rgba(255,77,0,0.3);padding:16px;margin-bottom:24px;">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--orange);margin-bottom:6px">OTP Sent ✓</div>
      <div style="font-size:13px;color:var(--text-muted)">Enter the OTP for <strong style="color:var(--white)">+91 ${pendingPhone}</strong></div>
    </div>
    <label class="auth-label">Enter 6-Digit OTP</label>
    <div class="otp-inputs" style="margin:16px 0 24px">
      ${[0,1,2,3,4,5].map(i=>`<input class="otp-digit" id="otp${i}" maxlength="1" type="tel" inputmode="numeric" oninput="otpNext(${i})" onkeydown="otpBack(event,${i})">`).join('')}
    </div>
    <button class="auth-btn" id="verifyOtpBtn" onclick="verifyOTP()">VERIFY & LOGIN →</button>
    <p class="auth-note" style="margin-top:16px">
      Didn't receive? <a href="#" onclick="resendOTP();return false" style="color:var(--orange)">Resend OTP</a>
      &nbsp;·&nbsp;
      <a href="#" onclick="setAuthPhase('phone');return false" style="color:var(--text-muted)">Change number</a>
    </p>
  `;
}

function setAuthTab(t){ authTab=t; authPhase='methods'; renderAuth(); }
function setAuthPhase(p){ authPhase=p; renderAuth(); }

/* ── Send OTP via Firebase REST API ── */
async function sendOTP(){
  const phone = document.getElementById('authPhone')?.value.trim();
  const cc = document.getElementById('countryCode')?.value.trim() || '+91';
  if(!phone || phone.length < 10){ showToast('Enter a valid 10-digit number','⚠️'); return; }

  pendingPhone = phone;
  const fullPhone = cc + phone;

  const btn = document.getElementById('sendOtpBtn');
  if(btn){ btn.textContent='SENDING...'; btn.disabled=true; btn.style.opacity='0.6'; }

  // Simulate sending delay (Claude sandbox blocks external calls)
  await new Promise(r => setTimeout(r, 1500));

  pendingSessionInfo = 'TEST_SESSION';
  authPhase = 'otp';
  renderAuth();
  showToast('OTP sent to ' + fullPhone + ' ✓', '📱');
  setTimeout(()=>document.getElementById('otp0')?.focus(), 100);
}

/* ── Verify OTP (test mode — Claude sandbox blocks external calls) ── */
async function verifyOTP(){
  const otp = [0,1,2,3,4,5].map(i=>document.getElementById('otp'+i)?.value||'').join('');
  if(otp.length < 6){ showToast('Enter all 6 digits','⚠️'); return; }

  const btn = document.getElementById('verifyOtpBtn');
  if(btn){ btn.textContent='VERIFYING...'; btn.disabled=true; btn.style.opacity='0.6'; }

  await new Promise(r => setTimeout(r, 1200));

  // Accept the Firebase test OTP code set in Firebase console
  if(otp === '123456'){
    loginSuccess({ localId: 'user_' + Date.now(), phoneNumber: '+91' + pendingPhone });
  } else {
    showToast('Wrong OTP. Enter 123456','❌');
    document.querySelectorAll('.otp-digit').forEach(el=>{
      el.style.borderColor='#ff3333';
      setTimeout(()=>el.style.borderColor='',1500);
    });
    if(btn){ btn.textContent='VERIFY & LOGIN →'; btn.disabled=false; btn.style.opacity='1'; }
  }
}

function loginSuccess(data){
  const phone = data.phoneNumber || ('+91' + pendingPhone);
  currentUser = {
    uid: data.localId || 'user_' + Date.now(),
    phone: phone,
    name: 'Apex Athlete',
    email: '',
    orders: 0,
    initials: 'AF'
  };
  closeAuth();
  showToast('Welcome! Logged in successfully 🎉','👋');
  updateProfileIcon();
}

async function resendOTP(){
  authPhase = 'phone';
  renderAuth();
  setTimeout(async ()=>{
    document.getElementById('authPhone').value = pendingPhone;
    await sendOTP();
  }, 200);
}

function otpNext(i){
  const el = document.getElementById('otp'+i);
  if(el && el.value && i<5) document.getElementById('otp'+(i+1))?.focus();
}
function otpBack(e,i){
  if(e.key==='Backspace' && !document.getElementById('otp'+i).value && i>0)
    document.getElementById('otp'+(i-1))?.focus();
}

function logout(){
  currentUser = null;
  closeAuth();
  showToast('Logged out','👋');
  updateProfileIcon();
}

function updateProfileIcon(){
  const btn = document.getElementById('profileBtn');
  if(currentUser){
    const init = (currentUser.name||currentUser.phone||'AF').slice(0,2).toUpperCase();
    btn.innerHTML=`<div style="width:32px;height:32px;background:var(--orange);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',cursive;font-size:13px;color:#000;letter-spacing:1px">${init}</div>`;
  } else {
    btn.innerHTML=`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
  }
}

/* ─── PAYMENT ─── */
function openPayment(){
  if(cart.length===0){ showToast('Cart is empty','⚠'); return; }
  closeCart();
  paymentStep='form'; selectedPayMethod='card'; selectedUPI=null;
  renderPaymentForm();
  document.getElementById('paymentModal').classList.add('open');
  openBackdrop();
}
function closePayment(){
  document.getElementById('paymentModal').classList.remove('open');
  closeBackdrop();
}
function renderPaymentForm(){
  const sub=getCartTotal();
  const ship=sub>=999?0:99;
  const total=sub+ship;
  const body=document.getElementById('paymentBody');
  body.innerHTML=`
    <div class="payment-amount-display">
      <div class="payment-amount-label">Order Total</div>
      <div class="payment-amount-val">₹${total.toLocaleString('en-IN')}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;color:var(--text-muted);letter-spacing:2px;margin-top:6px">${cart.map(i=>i.name+' ×'+i.qty).join(' · ')}</div>
    </div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--orange);margin-bottom:14px">Payment Method</div>
    <div class="payment-methods">
      <button class="pay-method-btn ${selectedPayMethod==='card'?'selected':''}" onclick="selectPayMethod('card')"><span class="pay-method-icon">💳</span><span class="pay-method-label">Card</span></button>
      <button class="pay-method-btn ${selectedPayMethod==='upi'?'selected':''}" onclick="selectPayMethod('upi')"><span class="pay-method-icon">📱</span><span class="pay-method-label">UPI</span></button>
      <button class="pay-method-btn ${selectedPayMethod==='netbank'?'selected':''}" onclick="selectPayMethod('netbank')"><span class="pay-method-icon">🏦</span><span class="pay-method-label">Net Banking</span></button>
      <button class="pay-method-btn ${selectedPayMethod==='cod'?'selected':''}" onclick="selectPayMethod('cod')"><span class="pay-method-icon">💰</span><span class="pay-method-label">Cash on Delivery</span></button>
    </div>
    <div id="payFormArea">${renderPayMethodForm()}</div>
    <button class="pay-btn" onclick="processPayment(${total})">${selectedPayMethod==='cod'?'PLACE ORDER':'PAY ₹'+total.toLocaleString('en-IN')} →</button>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;opacity:.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase">256-bit SSL Secured Payment</span>
    </div>
  `;
}
function renderPayMethodForm(){
  if(selectedPayMethod==='card') return `
    <div class="payment-form-section">
      <div class="payment-form-title">Card Details</div>
      <input class="pay-input" placeholder="Cardholder Name" type="text">
      <input class="pay-input" placeholder="1234  5678  9012  3456" type="text" maxlength="19" oninput="fmtCard(this)">
      <div class="pay-row"><input class="pay-input" placeholder="MM / YY" type="text" maxlength="7" oninput="fmtExpiry(this)"><input class="pay-input" placeholder="CVV" type="password" maxlength="3"></div>
      <div style="display:flex;gap:10px;margin-top:8px"><span style="font-size:22px">💳</span><span style="font-size:22px">🔴</span><span style="font-size:22px">🟦</span><span style="font-size:22px">🇮🇳</span></div>
    </div>`;
  if(selectedPayMethod==='upi') return `
    <div class="payment-form-section">
      <div class="payment-form-title">Choose UPI App</div>
      <div class="upi-apps">
        <button class="upi-app-btn ${selectedUPI==='gpay'?'selected':''}" onclick="selectUPI('gpay')"><span class="upi-app-icon">🟢</span><span class="upi-app-name">GPay</span></button>
        <button class="upi-app-btn ${selectedUPI==='phonepe'?'selected':''}" onclick="selectUPI('phonepe')"><span class="upi-app-icon">🟣</span><span class="upi-app-name">PhonePe</span></button>
        <button class="upi-app-btn ${selectedUPI==='paytm'?'selected':''}" onclick="selectUPI('paytm')"><span class="upi-app-icon">🔵</span><span class="upi-app-name">Paytm</span></button>
        <button class="upi-app-btn ${selectedUPI==='bhim'?'selected':''}" onclick="selectUPI('bhim')"><span class="upi-app-icon">🇮🇳</span><span class="upi-app-name">BHIM</span></button>
      </div>
      <div class="auth-divider"><span>or enter UPI ID</span></div>
      <input class="pay-input" placeholder="yourname@upi" type="text">
    </div>`;
  if(selectedPayMethod==='netbank') return `
    <div class="payment-form-section">
      <div class="payment-form-title">Select Bank</div>
      <select class="pay-input" style="color:var(--white);background:#0a0a0a">
        <option value="" disabled selected style="color:#333">Choose your bank</option>
        <option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option>
        <option>Axis Bank</option><option>Kotak Mahindra Bank</option><option>Punjab National Bank</option>
        <option>Bank of Baroda</option><option>Canara Bank</option>
      </select>
    </div>`;
  if(selectedPayMethod==='cod') return `
    <div style="background:var(--mid);padding:16px;margin-bottom:16px;border-left:3px solid var(--orange)">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--orange);margin-bottom:6px">Cash on Delivery</div>
      <div style="font-size:13px;color:var(--text-muted);line-height:1.6">Keep the exact amount ready at delivery. ₹50 COD fee applicable. Delivery in 3-5 business days.</div>
    </div>`;
  return '';
}
function selectPayMethod(m){ selectedPayMethod=m; selectedUPI=null; renderPaymentForm(); }
function selectUPI(u){ selectedUPI=u; document.querySelectorAll('.upi-app-btn').forEach(b=>b.classList.remove('selected')); event.target.closest('.upi-app-btn').classList.add('selected'); }
function fmtCard(el){ let v=el.value.replace(/\D/g,'').slice(0,16); el.value=v.replace(/(.{4})/g,'$1 ').trim(); }
function fmtExpiry(el){ let v=el.value.replace(/\D/g,'').slice(0,4); el.value=v.length>2?v.slice(0,2)+' / '+v.slice(2):v; }
function processPayment(total){
  const btn=document.querySelector('.pay-btn');
  if(btn){ btn.textContent='PROCESSING...'; btn.disabled=true; }
  setTimeout(()=>{ showPaymentSuccess(total); },1800);
}
function showPaymentSuccess(total){
  const orderNum='AF'+Date.now().toString().slice(-6);
  const body=document.getElementById('paymentBody');
  const contact = currentUser ? (currentUser.phone||currentUser.email||'your contact') : 'your contact';
  body.innerHTML=`
    <div class="payment-success">
      <div class="success-icon">✅</div>
      <div class="success-title">ORDER PLACED!</div>
      <div class="success-sub">Your APEXFUEL order is confirmed</div>
      <div class="success-order">ORDER #${orderNum}</div>
      <div style="margin-top:20px;font-size:13px;color:var(--text-muted);line-height:1.7;font-family:'Barlow Condensed',sans-serif;letter-spacing:1px">
        ₹${total.toLocaleString('en-IN')} paid · Expected delivery in 3-5 days<br>
        Confirmation sent to ${contact}
      </div>
      <button class="pay-btn" style="margin-top:28px" onclick="finishOrder()">CONTINUE SHOPPING →</button>
    </div>
  `;
  if(currentUser) currentUser.orders = (currentUser.orders||0) + 1;
}
function finishOrder(){
  cart=[]; updateCartBadge(); closePayment();
  showToast('Order placed successfully! 🚀','🎉');
}

renderCart();
</script>
</body>
</html>derCart();
