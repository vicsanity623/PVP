const STORAGE_KEY_SERVER = 'gq_server_url';
const STORAGE_KEY_PLAYER = 'gq_player_id';
const DEFAULT_SERVER_URL = 'https://vics-imac-1.tail37b4f2.ts.net:8443';

let SERVER_URL = localStorage.getItem(STORAGE_KEY_SERVER) || DEFAULT_SERVER_URL;
let PLAYER_ID = localStorage.getItem(STORAGE_KEY_PLAYER) || '';
let profile = null;
let friendsCache = [];
let currentBattleId = null;
let battlePollTimer = null;
let challengePollTimer = null;
let dustTickTimer = null;
let campaignRealmData = [];
let activeCampaignRealm = null;
let campaignTimerId = null;
let currentBattleMode = 'unknown';
let currentCampaignDeadline = null;
let campaignEnemyPending = false;
const GIFT_OPEN_DAILY_LIMIT = 30;
const CAMPAIGN_TIME_LIMIT = 60;

/* ---------------- Splash / preload screen ---------------- */
const splashEl = document.getElementById('splash');
function hideSplash(){
  if(splashEl && splashEl.style.visibility !== 'hidden'){
    splashEl.classList.add('hide');
    setTimeout(()=>{ splashEl.style.display = 'none'; }, 450);
  }
}
setTimeout(hideSplash, 2200);

/* ---------------- PWA install banner ---------------- */
let installEvt = null;
const installBanner = document.getElementById('installBanner');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  if(!localStorage.getItem('gq_install_dismissed') && installBanner){
    installBanner.style.display = 'block';
  }
});
window.addEventListener('appinstalled', () => {
  installEvt = null;
  if(installBanner) installBanner.style.display = 'none';
});
document.getElementById('installAppBtn').onclick = async () => {
  if(!installEvt){ if(installBanner) installBanner.style.display = 'none'; return; }
  installEvt['prompt']();
  await installEvt.userChoice;
  installEvt = null;
  if(installBanner) installBanner.style.display = 'none';
};
document.getElementById('dismissInstallBtn').onclick = () => {
  localStorage.setItem('gq_install_dismissed', '1');
  if(installBanner) installBanner.style.display = 'none';
};

/* ---------------- COD Emblem / Gamer Tag Style Avatar ---------------- */
const defaultAvatarState = {
  version: 2,
  head: { shape: 'circle', color: '#f3c19a', x: 0, y: -5, scale: 1, rot: 0 },
  body: { shape: 'torso', color: '#ff6b6b', x: 0, y: 25, scale: 1, rot: 0 },
  hair: { shape: 'spiky', color: '#1d1d1d', x: 0, y: -22, scale: 1, rot: 0 },
  acc:  { shape: 'none', color: '#1a1a1a', x: 0, y: -5, scale: 1, rot: 0 }
};

let avatarState = JSON.parse(JSON.stringify(defaultAvatarState));
let activeAvatarSec = 'head';

const AV_COLORS = ['#f9dcba','#f3c19a','#e7a874','#d18a52','#b06d3a','#1d1d1d','#4a2f1d','#ff6b6b','#ffb545','#4be08a','#5c8bff','#8a6cff','#e85a7a','#f1ecff','#9b5de5','#00bbf9','#fee440','#00f5d4','#f15bb5','#333333'];

const AV_SHAPES = {
  head: {
    circle: '<circle cx="0" cy="0" r="22"/>',
    oval: '<ellipse cx="0" cy="0" rx="20" ry="25"/>',
    rounded: '<rect x="-20" y="-22" width="40" height="44" rx="12"/>',
    square: '<rect x="-20" y="-20" width="40" height="40" rx="4"/>',
    triangle: '<polygon points="0,-24 22,18 -22,18"/>',
    shield: '<path d="M-20,-20 L20,-20 Q20,10 0,25 Q-20,10 -20,-20 Z"/>',
    hexagon: '<polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11"/>',
    gem: '<polygon points="0,-24 20,0 12,22 -12,22 -20,0"/>'
  },
  body: {
    none: '',
    torso: '<path d="M-22,10 C-18,-5 18,-5 22,10 L28,45 L-28,45 Z"/>',
    rect: '<rect x="-22" y="-10" width="44" height="40" rx="6"/>',
    armor: '<path d="M-24,-8 L24,-8 L18,35 L-18,35 Z"/>',
    vshape: '<polygon points="-25,-10 25,-10 0,40"/>',
    roundtorso: '<ellipse cx="0" cy="15" rx="25" ry="20"/>',
    hoodie: '<path d="M-22,2 L-16,-16 L16,-16 L22,2 L24,40 L-24,40 Z"/><circle cx="0" cy="-10" r="8"/>',
    suit: '<path d="M-20,-10 L20,-10 L26,40 L-26,40 Z M0,-10 L0,14 L-9,24 M0,-10 L0,14 L9,24"/>'
  },
  hair: {
    none: '',
    spiky: '<path d="M-22,0 L-15,-20 L-8,-5 L0,-24 L8,-5 L15,-20 L22,0 Q0,-10 -22,0 Z"/>',
    short: '<path d="M-22,5 C-24,-20 24,-20 22,5 C12,-8 -12,-8 -22,5 Z"/>',
    afro: '<circle cx="0" cy="-5" r="24"/>',
    mohawk: '<rect x="-6" y="-28" width="12" height="30" rx="4"/>',
    long: '<path d="M-22,-10 C-24,-25 24,-25 22,-10 L24,25 Q0,15 -24,25 Z"/>',
    bangs: '<path d="M-22,-5 C-22,-22 22,-22 22,-5 L15,5 L5,-5 L-5,5 L-15,-5 Z"/>',
    curly: '<g><circle cx="-14" cy="-12" r="8"/><circle cx="0" cy="-20" r="9"/><circle cx="14" cy="-12" r="8"/><circle cx="-8" cy="-4" r="7"/><circle cx="8" cy="-4" r="7"/></g>',
    messy: '<path d="M-22,0 C-26,-14 -18,-22 -10,-20 C-12,-30 2,-32 10,-24 C18,-28 26,-20 22,-6 C28,-2 24,6 18,6 L-18,6 C-24,6 -26,-2 -22,0 Z"/>'
  },
  acc: {
    none: '',
    glasses: '<g fill="none" stroke="currentColor" stroke-width="3"><circle cx="-10" cy="0" r="7"/><circle cx="10" cy="0" r="7"/><line x1="-3" y1="0" x2="3" y2="0"/></g>',
    shades: '<g fill="currentColor"><path d="M-18,-5 L18,-5 L14,6 L-14,6 Z"/><line x1="-18" y1="-3" x2="-22" y2="-5" stroke="currentColor" stroke-width="2"/><line x1="18" y1="-3" x2="22" y2="-5" stroke="currentColor" stroke-width="2"/></g>',
    crown: '<polygon points="-18,5 -20,-15 -8,-5 0,-20 8,-5 20,-15 18,5"/>',
    cap: '<g fill="currentColor"><path d="M-20,0 C-20,-18 20,-18 20,0 Z"/><ellipse cx="10" cy="2" rx="16" ry="4"/></g>',
    mask: '<rect x="-18" y="-4" width="36" height="18" rx="4"/>',
    star: '<polygon points="0,-15 4,-4 15,-4 7,3 10,14 0,7 -10,14 -7,3 -15,-4 -4,-4"/>',
    headband: '<rect x="-24" y="-10" width="48" height="8" rx="2"/>',
    halo: '<ellipse cx="0" cy="-24" rx="11" ry="4.5" fill="none" stroke="currentColor" stroke-width="2.5"/>',
    scarf: '<rect x="-16" y="10" width="32" height="9" rx="4"/><path d="M10,13 L22,23 L18,29 L6,19 Z"/>'
  }
};

/* FIX 1: Safely deep-merge all default layer keys into avatar state */
function normalizeAvatarState(raw){
  const base = JSON.parse(JSON.stringify(defaultAvatarState));
  if (!raw) return base;
  return {
    version: 2,
    head: Object.assign({}, base.head, raw.head || { color: raw.skin }),
    body: Object.assign({}, base.body, raw.body || { color: raw.outfitColor }),
    hair: Object.assign({}, base.hair, raw.hair || { shape: raw.hairStyle === 'bald' ? 'none' : 'spiky', color: raw.hairColor }),
    acc:  Object.assign({}, base.acc, raw.acc || {})
  };
}

function renderAvatarSVG(rawState, size){
  const state = normalizeAvatarState(rawState || avatarState);
  const layers = [
    { key: 'body', defaultY: 25 },
    { key: 'head', defaultY: -5 },
    { key: 'hair', defaultY: -22 },
    { key: 'acc',  defaultY: -5 }
  ];

  const svgParts = ['<rect width="100" height="100" fill="#1f1838" rx="50"/>'];

  layers.forEach(({ key, defaultY }) => {
    const l = state[key] || {};
    const shapeSvg = (AV_SHAPES[key] && AV_SHAPES[key][l.shape]) || '';
    if (!shapeSvg) return;

    const x = 50 + (l.x || 0);
    const y = 50 + (l.y !== undefined ? l.y : defaultY);
    const scale = l.scale !== undefined ? l.scale : 1;
    const rot = l.rot || 0;
    const color = l.color || '#ffffff';

    svgParts.push(`
      <g transform="translate(${x}, ${y}) rotate(${rot}) scale(${scale})" fill="${color}" color="${color}">
        ${shapeSvg}
      </g>
    `);
  });

  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="avatar">${svgParts.join('')}</svg>`;
}

/* ---------------- In-game dialog ---------------- */
let dlgState = { resolve: null };
function showDialog(title, bodyHTML, opts = {}){
  dlgState = { resolve: null };
  document.getElementById('dlgTitle').textContent = title;
  document.getElementById('dlgBody').innerHTML = bodyHTML;
  const confBtn = document.getElementById('dlgConfirm');
  const cntBtn = document.getElementById('dlgCancel');
  confBtn.style.display = (opts.confirmText === false) ? 'none' : 'inline-block';
  cntBtn.style.display = (opts.cancelText === false) ? 'none' : 'inline-block';
  confBtn.textContent = opts.confirmText || 'OK';
  cntBtn.textContent = opts.cancelText || 'Cancel';
  document.getElementById('dialogBg').classList.add('show');
  return new Promise(res => { dlgState.resolve = res; });
}
function closeDialog(result = { ok: false, value: null }){
  document.getElementById('dialogBg').classList.remove('show');
  const r = dlgState.resolve;
  dlgState.resolve = null;
  if(r) r(result);
}
document.getElementById('dlgConfirm').onclick = () => {
  const inp = document.getElementById('dlgInput');
  const value = inp ? inp.value.trim() : dlgState.value || null;
  closeDialog({ ok: true, value });
};
document.getElementById('dlgCancel').onclick = closeDialog;
document.getElementById('dlgClose').onclick = closeDialog;
document.getElementById('dialogBg').addEventListener('click', (e)=>{
  if(e.target === document.getElementById('dialogBg')) closeDialog();
});
function pickDlgValue(v){
  dlgState.value = v;
  document.getElementById('dlgConfirm').click();
}

function askText(title, message, placeholder, initial, opts = {}){
  return showDialog(title,
    `<div class="dlg-body">${message ? `<p class="muted">${message}</p>`:''}<label>Enter value</label><input type="text" id="dlgInput" value="${escapeAttr(initial||'')}" placeholder="${escapeAttr(placeholder||'')}" style="margin-top:6px;"></div>`,
    opts);
}

let toastQueue = [];
let toastShowing = false;
function toast(msg, type){
  if(navigator.vibrate){
    try{ navigator.vibrate(type === 'error' ? 35 : 12); }catch(e){}
  }
  const t = document.getElementById('toast');
  if(!t) return;
  toastQueue.push({ msg: String(msg), type: type || 'info' });
  if(toastShowing) return;
  showNextToast();
}
function showNextToast(){
  const t = document.getElementById('toast');
  const item = toastQueue.shift();
  if(!item){ toastShowing = false; return; }
  toastShowing = true;
  t.textContent = item.msg;
  t.classList.remove('toast-success', 'toast-error', 'toast-info');
  t.classList.add('toast-' + item.type, 'show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(showNextToast, 200);
  }, 2200);
}

function escapeAttr(str){
  return String(str||'').replace(/"/g, '&quot;').replace(/</g,'&lt;');
}

async function api(path, method='GET', body=null){
  const opts = { method, headers: {} };
  if(body){ opts.headers['Content-Type']='application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(SERVER_URL.replace(/\/$/,'') + path, opts);
  let data;
  try{ data = await res.json(); } catch(e){ data = {}; }
  if(!res.ok){ throw new Error(data.error || ('Request failed: ' + res.status)); }
  return data;
}

/* ---------------- Setup / boot ---------------- */
function switchTab(screen){
  document.querySelectorAll('#tabbar .tab').forEach(b=>b.classList.toggle('active', b.dataset.screen===screen));
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+screen));
}

document.getElementById('setupSubmit').onclick = async () => {
  const name = document.getElementById('setupUsername').value.trim() || 'Trainer';
  SERVER_URL = DEFAULT_SERVER_URL;
  try{
    const p = await api('/api/register', 'POST', { username: name });
    PLAYER_ID = p.id;
    localStorage.setItem(STORAGE_KEY_SERVER, SERVER_URL);
    localStorage.setItem(STORAGE_KEY_PLAYER, PLAYER_ID);
    boot();
    switchTab('avatar');
    toast('Welcome! Customize your trainer, then hit Save Avatar.');
  }catch(e){ toast('Could not reach server: ' + e.message, 'error'); }
};

document.getElementById('setupRestore').onclick = async () => {
  const res = await askText('Restore player',
    'Enter your existing Player ID (find it in a previous export or your other device\'s storage).',
    'Paste your Player ID', '');
  if(!res.ok || !res.value) return;
  SERVER_URL = DEFAULT_SERVER_URL;
  PLAYER_ID = res.value;
  try{
    await api('/api/profile/' + PLAYER_ID);
    localStorage.setItem(STORAGE_KEY_SERVER, SERVER_URL);
    localStorage.setItem(STORAGE_KEY_PLAYER, PLAYER_ID);
    boot();
  }catch(e){ toast('Could not find that player: ' + e.message, 'error'); }
};

function boot(){
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  (async () => { await refreshProfile(); hideSplash(); })();
  refreshFriends();
  refreshGifts();
  refreshMissions();
  buildMoveList();
  loadCampaign();
  dustTickTimer = setInterval(tickDustCountdown, 1000);
  challengePollTimer = setInterval(pollChallenges, 4000);
  setInterval(refreshProfile, 20000);
}

if(PLAYER_ID){ boot(); } else { hideSplash(); }

/* ---------------- Tabs ---------------- */
document.querySelectorAll('#tabbar .tab').forEach(btn => {
  btn.onclick = () => {
    switchTab(btn.dataset.screen);
    if(btn.dataset.screen === 'friends') refreshFriends();
    if(btn.dataset.screen === 'battle'){ refreshFriends(); loadCampaign(); }
    if(btn.dataset.screen === 'missions') refreshMissions();
  };
});

/* ---------------- Profile / Home ---------------- */
async function refreshProfile(){
  try{
    profile = await api('/api/profile/' + PLAYER_ID);
  }catch(e){ return; }
  document.getElementById('headerDust').textContent = profile.dust;
  document.getElementById('homeUsername').textContent = profile.username;
  document.getElementById('homeLevel').textContent = profile.level;
  document.getElementById('myFriendCode').textContent = profile.friend_code;
  document.getElementById('beValue').textContent = profile.be + '/' + profile.be_max;
  document.getElementById('pvpValue').textContent = profile.pvp_wins + '-' + profile.pvp_losses;
  const xpPct = profile.xp_needed_this_level ? Math.min(100, (profile.xp_this_level/profile.xp_needed_this_level)*100) : 100;
  document.getElementById('xpBar').style.width = xpPct + '%';
  document.getElementById('xpLabel').textContent = profile.xp_this_level + ' / ' + (profile.xp_needed_this_level||'MAX') + ' XP';
  document.getElementById('homeAvatarThumb').innerHTML = renderAvatarSVG(profile.avatar, 62);
  avatarState = normalizeAvatarState(profile.avatar);
  renderAvatarEditor();

  const boostsCard = document.getElementById('activeBoostsCard');
  if(profile.boosts && profile.boosts.length){
    boostsCard.style.display='block';
    document.getElementById('boostsList').innerHTML = profile.boosts.map(b=>{
      const def = {dust_x2:'Dust x2', xp_x2:'XP x2', attack_up:'Attack Up', be_regen_up:'BE Regen Up'}[b.id]||b.id;
      const mins = Math.max(0, Math.round((b.expires_at - Date.now()/1000)/60));
      return `<div class="row" style="padding:4px 0;"><span>${def}</span><span class="muted">${mins}m left</span></div>`;
    }).join('');
  } else { boostsCard.style.display='none'; }

  // Re-render move list once profile is loaded (fixes race where the move
  // list renders before /api/profile returns and stays empty).
  if(window.ALL_MOVES && window.ALL_MOVES.length) renderMoveList();

  tickDustCountdown();
}

function tickDustCountdown(){
  if(!profile) return;
  const remain = profile.next_dust_collect_at - Date.now()/1000;
  const ring = document.getElementById('dustRing');
  const label = document.getElementById('dustRingLabel');
  const sub = document.getElementById('dustCountdown');
  const btn = document.getElementById('collectBtn');
  if(remain <= 0){
    ring.style.setProperty('--pct', 100);
    label.textContent = 'Ready!';
    sub.textContent = 'Dust is ready to collect';
    btn.disabled = false;
  } else {
    const pct = Math.max(0, 100 - (remain/3600*100));
    ring.style.setProperty('--pct', pct.toFixed(1));
    const m = Math.floor(remain/60), s = Math.floor(remain%60);
    label.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    sub.textContent = 'until next dust';
    btn.disabled = true;
  }
}

document.getElementById('collectBtn').onclick = async () => {
  try{
    const r = await api('/api/dust/collect', 'POST', { player_id: PLAYER_ID });
    toast(`+${r.collected} dust!`);
    profile = r.profile;
    refreshProfile();
  }catch(e){ toast(e.message); }
};

document.getElementById('spendDustBtn').onclick = async () => {
  if(!profile || profile.dust <= 0){ toast('No dust to spend'); return; }
  const max = profile.dust;
  const res = await showDialog('Spend Dust on XP',
    `<div class="dlg-body">
       <p class="muted">Convert dust to XP at a 1:1 rate. You have <b>${max}✨</b>.</p>
       <div class="quick-amounts">
         <button class="btn secondary" onclick="setDlgInput(10)">10</button>
         <button class="btn secondary" onclick="setDlgInput(50)">50</button>
         <button class="btn secondary" onclick="setDlgInput(100)">100</button>
         <button class="btn secondary" onclick="setDlgInput(${max})">All</button>
       </div>
       <label>Amount</label><input type="text" id="dlgInput" inputmode="numeric" value="${Math.min(100,max)}" style="margin-top:6px;"></div>`,
    { confirmText: 'Convert' });
  if(!res.ok) return;
  const amount = parseInt(res.value, 10);
  if(!amount || amount <= 0 || amount > max){ toast('Enter a valid amount'); return; }
  try{
    const r = await api('/api/dust/spend', 'POST', { player_id: PLAYER_ID, amount });
    toast('Converted to XP!');
    profile = r.profile; refreshProfile();
  }catch(e){ toast(e.message); }
};
function setDlgInput(v){
  const inp = document.getElementById('dlgInput');
  if(inp) inp.value = v;
}

/* ---------------- Friends ---------------- */
async function refreshFriends(){
  try{
    friendsCache = await api('/api/friends/' + PLAYER_ID);
  }catch(e){ return; }
  const list = document.getElementById('friendsList');
  const opensLeft = friendsCache.length ? friendsCache[0].opens_left : 0;
  const openLimit = friendsCache.length ? friendsCache[0].open_limit : GIFT_OPEN_DAILY_LIMIT;
  document.getElementById('giftOpenCount').textContent = `🎁 Gifts you can open today: ${opensLeft}/${openLimit}`;
  if(!friendsCache.length){
    list.innerHTML = '<p class="muted">No friends yet — add one above!</p>';
  } else {
    list.innerHTML = friendsCache.map(f => `
      <div class="friend-row" onclick="showFriendProfile('${f.id}')">
        <div class="avatar-thumb">${renderAvatarSVG(f.avatar, 46)}</div>
        <div class="friend-info">
          <div class="name">${escapeHtml(f.username)}</div>
          <div class="sub">Lv ${f.level} · ${f.pvp_wins}-${f.pvp_losses} PvP</div>
        </div>
        <div class="flevel">Friend Lv ${f.friendship_level}</div>
        <button class="gift-btn ${f.gift_from_friend && f.opens_left > 0 ? '' : 'greyed'}" onclick="event.stopPropagation(); tapFriendGift('${f.id}')" title="Open gift from ${escapeHtml(f.username)}">🎁</button>
      </div>
    `).join('');
  }

  const battleSel = document.getElementById('battleFriendSelect');
  if(friendsCache.length){
    battleSel.innerHTML = friendsCache.map(f=>{
      const locked = !f.pvp_unlocked;
      return `<option value="${f.id}" ${locked?'disabled':''}>${escapeHtml(f.username)} ${locked? '(friend lv '+f.friendship_level+'/10 to unlock)':''}</option>`;
    }).join('');
  } else {
    battleSel.innerHTML = '<option value="">Add a friend first</option>';
  }
}

function tapFriendGift(friendId){
  const f = friendsCache.find(x=>x.id===friendId);
  if(!f || !f.gift_from_friend) { toast('No gift from this friend right now.'); return; }
  if(f.opens_left <= 0) { toast('Daily gift limit reached — more tomorrow!'); return; }
  openGiftModal(f.gift_from_friend, f.username);
}

document.getElementById('addFriendBtn').onclick = async () => {
  const code = document.getElementById('addFriendCode').value.trim().toUpperCase();
  if(!code){ toast('Enter a friend code'); return; }
  try{
    const r = await api('/api/friends/add', 'POST', { player_id: PLAYER_ID, friend_code: code });
    toast('Added ' + r.friend.username + '!');
    document.getElementById('addFriendCode').value = '';
    refreshFriends();
  }catch(e){ toast(e.message); }
};

function showFriendProfile(friendId){
  const f = friendsCache.find(x=>x.id===friendId);
  if(!f) return;
  const xpPct = f.friendship_xp_needed ? Math.min(100,(f.friendship_xp/f.friendship_xp_needed)*100) : 0;
  document.getElementById('friendProfileContent').innerHTML = `
    <div class="center">
      <div style="width:96px;height:96px;margin:0 auto 10px;border-radius:50%;overflow:hidden;border:2px solid #4a3a80;">${renderAvatarSVG(f.avatar, 96)}</div>
      <h3 style="margin:4px 0;">${escapeHtml(f.username)}</h3>
      <p class="muted">Level ${f.level} · Friend Lv ${f.friendship_level}</p>
    </div>
    <div class="statgrid">
      <div class="stat"><div class="label">Dust</div><div class="value">${f.dust} ✨</div></div>
      <div class="stat"><div class="label">PvP Record</div><div class="value">${f.pvp_wins}-${f.pvp_losses}</div></div>
    </div>
    <div style="margin-top:12px;">
      <div class="bar-label"><span class="muted">Friendship</span><span class="muted">Lv ${f.friendship_level} → ${f.friendship_level+1}</span></div>
      <div style="background:var(--bg-deep); border-radius:999px; height:10px; overflow:hidden; margin-top:4px;">
        <div style="height:100%; width:${xpPct}%; background:linear-gradient(90deg,var(--accent),var(--accent-2));"></div>
      </div>
    </div>
    <p class="muted" style="margin-top:14px;">${f.pvp_unlocked ? 'Live PvP is unlocked with this friend! Head to the Battle tab.' : `Reach friendship level 10 (currently ${f.friendship_level}) to unlock live PvP battles together.`}</p>
    <div class="gift-open-row">
      <div class="gift-big">${f.gift_from_friend ? '🎁' : '📭'}</div>
      <div style="flex:1;">
        <strong>${f.gift_from_friend ? 'Gift waiting!' : 'No gift right now'}</strong>
        <p class="muted" style="margin:2px 0 0; font-size:12px;">${f.gift_from_friend
          ? `${escapeHtml(f.username)} sent you a gift — open it now!`
          : `${escapeHtml(f.username)} hasn't sent you a gift today.`}</p>
      </div>
      ${f.gift_from_friend
        ? `<button class="btn" onclick="tapFriendGift('${f.id}')">Open</button>`
        : `<button class="btn secondary" disabled style="opacity:.4;">Open</button>`}
    </div>
  `;
  document.getElementById('friendProfileModalBg').classList.add('show');
}
document.getElementById('closeFriendProfileModal').onclick = () => document.getElementById('friendProfileModalBg').classList.remove('show');

/* ---------------- Gifts ---------------- */
let giftsData = null;
async function refreshGifts(){
  try{ giftsData = await api('/api/gifts/' + PLAYER_ID); }catch(e){ return; }
  refreshFriends();
}

let missionsData = null;
async function refreshMissions(){
  try{ missionsData = await api('/api/missions/' + PLAYER_ID); }catch(e){ return; }
  const list = document.getElementById('missionsList');
  const mins = Math.max(0, Math.round(missionsData.reset_in/60));
  const h = Math.floor(mins/60), m = mins%60;
  document.getElementById('missionsResetLabel').textContent = `Resets in ${h}h ${m}m`;
  list.innerHTML = missionsData.missions.map(mn => {
    const pct = Math.min(100, (mn.progress/mn.target)*100);
    const done = mn.progress >= mn.target;
    const rewardBits = [];
    if(mn.reward_dust) rewardBits.push(mn.reward_dust + ' ✨');
    if(mn.reward_xp) rewardBits.push(mn.reward_xp + ' XP');
    return `<div class="gift-item">
      <div class="row"><strong>${escapeHtml(mn.name)}</strong><span class="muted">${done?'Complete!':mn.progress+'/'+mn.target}</span></div>
      <p class="muted" style="margin:4px 0 8px;">${escapeHtml(mn.desc)} · Reward: ${rewardBits.join(', ') || 'None'}</p>
      <div style="background:var(--bg-deep); border-radius:999px; height:10px; overflow:hidden;">
        <div style="height:100%; width:${pct}%; background:linear-gradient(90deg,var(--accent),var(--accent-2));"></div>
      </div>
      <button class="btn block" style="margin-top:8px;" onclick="claimMission('${mn.id}')" ${done&&!mn.claimed?'':'disabled'}>${mn.claimed?'Claimed ✓':(done?'Claim Reward':'Locked')}</button>
    </div>`;
  }).join('');
}
async function claimMission(missionId){
  try{
    const r = await api('/api/missions/' + PLAYER_ID + '/claim', 'POST', { mission_id: missionId });
    let msg = 'Mission complete!';
    if(r.reward_dust) msg += ' +' + r.reward_dust + ' dust';
    if(r.reward_xp) msg += ' +' + r.reward_xp + ' XP';
    toast(msg);
    profile = r.profile; refreshProfile(); refreshMissions();
  }catch(e){ toast(e.message); }
}

let openingGiftId = null;
function openGiftModal(giftId, senderName){
  openingGiftId = giftId;
  document.getElementById('confirmOpenGiftBtn').disabled = false;
  document.getElementById('openGiftTitle').textContent = 'Gift from ' + senderName;
  document.getElementById('openGiftContent').innerHTML = '<p class="muted">Tap below to see what\'s inside!</p>';
  document.getElementById('openGiftModalBg').classList.add('show');
}
document.getElementById('closeOpenGiftModal').onclick = () => document.getElementById('openGiftModalBg').classList.remove('show');

/* FIX 3: Disable button and reset openingGiftId upon opening gift */
document.getElementById('confirmOpenGiftBtn').onclick = async () => {
  if(!openingGiftId) return;
  const btn = document.getElementById('confirmOpenGiftBtn');
  btn.disabled = true;
  try{
    const r = await api('/api/gift/open', 'POST', { player_id: PLAYER_ID, gift_id: openingGiftId });
    let msg = '';
    if(r.reward.type==='dust') msg = `You found +${r.reward.amount} dust!`;
    else if(r.reward.type==='tm_charge') msg = 'You found a TM Charge! Use it to learn a new move.';
    else if(r.reward.type==='boost') msg = `You found a boost: ${r.reward.boost.name}!`;
    else msg = 'Just a nice postcard this time.';
    document.getElementById('openGiftContent').innerHTML = `<p style="font-size:16px; text-align:center; padding:12px 0;">🎉 ${msg}</p>`;
    openingGiftId = null;
    profile = r.profile; refreshProfile(); refreshGifts(); refreshFriends();
  }catch(e){ 
    toast(e.message);
    btn.disabled = false;
  }
};

/* ---------------- COD Emblem Studio Editor Logic ---------------- */
function renderAvatarEditor(){
  avatarState = normalizeAvatarState(avatarState);
  const prevWrap = document.getElementById('avatarPreview');
  if(prevWrap){
    prevWrap.outerHTML = renderAvatarSVG(avatarState, 180).replace('<svg', '<svg id="avatarPreview" style="width:100%;height:100%;"').replace('width="180" height="180"', '');
  }

  document.querySelectorAll('#avatarSectionTabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.sec === activeAvatarSec);
    b.onclick = () => { activeAvatarSec = b.dataset.sec; renderAvatarEditor(); };
  });

  const sec = activeAvatarSec;
  const layer = avatarState[sec] || { shape: 'none', color: '#ffffff', x: 0, y: 0, scale: 1, rot: 0 };
  const box = document.getElementById('avatarSectionControls');
  if(!box) return;

  const shapes = Object.keys(AV_SHAPES[sec] || {});
  
  box.innerHTML = `
    <div class="ed-group">
      <div class="ed-label">Choose Shape / Element</div>
      <div class="shape-grid">
        ${shapes.map(s => `<button class="shape-btn ${layer.shape===s?'selected':''}" data-s="${s}">${s}</button>`).join('')}
      </div>
    </div>

    <div class="ed-group">
      <div class="ed-label">Layer Color</div>
      <div class="swatches">
        ${AV_COLORS.map(c => `<div class="swatch ${layer.color===c?'selected':''}" style="background:${c}" data-c="${c}"></div>`).join('')}
        <input type="color" id="customColorPicker" value="${layer.color || '#ffffff'}" style="width:34px; height:34px; border:none; background:none; cursor:pointer; padding:0;">
      </div>
    </div>

    <div class="ed-group">
      <div class="ed-label">Position & Scale (COD Emblem Style)</div>
      <div class="slider-row">
        <label>Pos X</label>
        <input type="range" id="slX" min="-35" max="35" value="${layer.x||0}">
        <span class="val" id="valX">${layer.x||0}</span>
      </div>
      <div class="slider-row">
        <label>Pos Y</label>
        <input type="range" id="slY" min="-35" max="35" value="${layer.y||0}">
        <span class="val" id="valY">${layer.y||0}</span>
      </div>
      <div class="slider-row">
        <label>Scale</label>
        <input type="range" id="slScale" min="0.3" max="2.5" step="0.1" value="${layer.scale!==undefined?layer.scale:1}">
        <span class="val" id="valScale">${(layer.scale!==undefined?layer.scale:1).toFixed(1)}x</span>
      </div>
      <div class="slider-row">
        <label>Rotate</label>
        <input type="range" id="slRot" min="-180" max="180" step="5" value="${layer.rot||0}">
        <span class="val" id="valRot">${layer.rot||0}°</span>
      </div>
    </div>
  `;

  box.querySelectorAll('.shape-btn').forEach(b => {
    b.onclick = () => { avatarState[sec].shape = b.dataset.s; renderAvatarEditor(); };
  });

  box.querySelectorAll('.swatch').forEach(s => {
    s.onclick = () => { avatarState[sec].color = s.dataset.c; renderAvatarEditor(); };
  });
  const cp = box.querySelector('#customColorPicker');
  if(cp){
    cp.oninput = (e) => { avatarState[sec].color = e.target.value; renderAvatarEditor(); };
  }

  const slX = box.querySelector('#slX'), valX = box.querySelector('#valX');
  const slY = box.querySelector('#slY'), valY = box.querySelector('#valY');
  const slScale = box.querySelector('#slScale'), valScale = box.querySelector('#valScale');
  const slRot = box.querySelector('#slRot'), valRot = box.querySelector('#valRot');

  const updateTransforms = () => {
    avatarState[sec].x = parseInt(slX.value, 10);
    avatarState[sec].y = parseInt(slY.value, 10);
    avatarState[sec].scale = parseFloat(slScale.value);
    avatarState[sec].rot = parseInt(slRot.value, 10);

    valX.textContent = avatarState[sec].x;
    valY.textContent = avatarState[sec].y;
    valScale.textContent = avatarState[sec].scale.toFixed(1) + 'x';
    valRot.textContent = avatarState[sec].rot + '°';

    const p = document.getElementById('avatarPreview');
    if(p) p.outerHTML = renderAvatarSVG(avatarState, 180).replace('<svg', '<svg id="avatarPreview" style="width:100%;height:100%;"').replace('width="180" height="180"', '');
  };

  [slX, slY, slScale, slRot].forEach(sl => {
    if(sl) sl.oninput = updateTransforms;
  });
}
renderAvatarEditor();

const resetBtn = document.getElementById('resetAvatarBtn');
if(resetBtn){
  resetBtn.onclick = () => {
    avatarState = JSON.parse(JSON.stringify(defaultAvatarState));
    renderAvatarEditor();
  };
}

document.getElementById('randomizeAvatarBtn').onclick = () => {
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  const randRange = (min, max) => Math.floor(Math.random()*(max-min+1))+min;

  avatarState = {
    version: 2,
    head: { shape: pick(Object.keys(AV_SHAPES.head)), color: pick(AV_COLORS), x: randRange(-5, 5), y: randRange(-10, 0), scale: (randRange(8, 12)/10), rot: randRange(-15, 15) },
    body: { shape: pick(Object.keys(AV_SHAPES.body)), color: pick(AV_COLORS), x: randRange(-5, 5), y: randRange(20, 30), scale: (randRange(8, 12)/10), rot: randRange(-10, 10) },
    hair: { shape: pick(Object.keys(AV_SHAPES.hair)), color: pick(AV_COLORS), x: randRange(-5, 5), y: randRange(-25, -15), scale: (randRange(8, 12)/10), rot: randRange(-20, 20) },
    acc:  { shape: pick(Object.keys(AV_SHAPES.acc)),  color: pick(AV_COLORS), x: randRange(-5, 5), y: randRange(-10, 5), scale: (randRange(8, 12)/10), rot: randRange(-15, 15) }
  };
  renderAvatarEditor();
};

document.getElementById('editAvatarBtn').onclick = () => switchTab('avatar');

document.getElementById('saveAvatarBtn').onclick = async () => {
  try{
    await api('/api/avatar/' + PLAYER_ID, 'POST', { avatar: avatarState });
    toast('Avatar saved!');
    refreshProfile();
  }catch(e){ toast(e.message); }
};

document.getElementById('copyCodeBtn').onclick = async () => {
  const code = document.getElementById('myFriendCode').textContent;
  try{
    await navigator.clipboard.writeText(code);
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = code; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  toast('Friend code copied!');
};

/* ---------------- Moves ---------------- */
async function buildMoveList(){
  let allMoves;
  try{ allMoves = await api('/api/moves'); }catch(e){ return; }
  window.ALL_MOVES = allMoves;
  renderMoveList();
}
function renderMoveList(){
  if(!profile || !window.ALL_MOVES) return;
  const known = profile.moves || [];
  const box = document.getElementById('moveList');
  box.innerHTML = window.ALL_MOVES.map(m=>{
    const isKnown = known.includes(m.id);
    const isLocked = m.unlock_level > profile.level;
    return `<div class="move-item ${isLocked?'locked':''}">
      <div>
        <div class="name">${m.name} ${m.starter?'(starter)':''}</div>
        <div class="meta">${m.dmg_min}-${m.dmg_max} dmg · ${m.be_cost} BE · unlocks Lv ${m.unlock_level}</div>
      </div>
      ${isKnown ? '<span class="muted">Known ✓</span>' : (isLocked ? '<span class="muted">🔒</span>' : `<button class="btn secondary" onclick="learnMove('${m.id}')">Learn</button>`)}
    </div>`;
  }).join('');
  document.getElementById('tmChargesLabel').textContent = `TM Charges available: ${profile.tm_charges}`;
}
async function learnMove(moveId){
  if(profile.tm_charges < 1){ toast('No TM charges — find one in gifts!'); return; }
  let replaceId = null;
  if((profile.moves||[]).length >= 20){
    const known = (profile.moves||[]).filter(m=>m!=='slap_face_hard');
    if(!known.length){ toast('No moves available to replace'); return; }
    const res = await showDialog('Replace a Move',
      `<div class="dlg-body"><p class="muted">Your move list is full (20/20). Pick one to replace with the new move.</p>
       <div class="pick-list">${known.map(id=>{ const m=(window.ALL_MOVES||[]).find(x=>x.id===id); return `<button class="btn secondary" onclick="pickMoveToReplace('${id}')">${m?escapeHtml(m.name):id}</button>`; }).join('')}</div></div>`,
      { confirmText: false, cancelText: 'Cancel' });
    if(!res.ok || !res.value) return;
    replaceId = res.value;
  }
  try{
    const r = await api('/api/moves/learn', 'POST', { player_id: PLAYER_ID, move_id: moveId, replace_move_id: replaceId });
    toast('Move learned!');
    profile = await api('/api/profile/' + PLAYER_ID);
    renderMoveList();
    const sel = document.getElementById('specialMoveSelect');
    if(sel) sel.dataset.built = '0';
  }catch(e){ toast(e.message); }
}
function pickMoveToReplace(id){
  closeDialog({ ok: true, value: id });
}

/* ---------------- Campaign (Single-Player) ---------------- */
async function loadCampaign(){
  if(!PLAYER_ID) return;
  try{
    campaignRealmData = await api('/api/campaign/' + PLAYER_ID);
  }catch(e){ return; }
  if(!activeCampaignRealm && campaignRealmData.length){
    activeCampaignRealm = campaignRealmData[0].id;
  }
  renderCampaignUI();
}

function renderCampaignUI(){
  const tabsBox = document.getElementById('campaignRealmTabs');
  const gridBox = document.getElementById('campaignStageGrid');
  if(!campaignRealmData.length){
    tabsBox.innerHTML = '<p class="muted">No campaign data yet.</p>';
    gridBox.innerHTML = '';
    return;
  }
  tabsBox.innerHTML = campaignRealmData.map(r => `
    <button class="${r.id === activeCampaignRealm ? 'active' : ''}" onclick="selectCampaignRealm('${r.id}')">${r.emoji} ${escapeHtml(r.name)}</button>
  `).join('');

  const realm = campaignRealmData.find(r => r.id === activeCampaignRealm) || campaignRealmData[0];
  gridBox.innerHTML = realm.stages.map(st => {
    if(st.unlocked){
      const stars = '★'.repeat(st.stars) + `<span class="dim">${'★'.repeat(3 - st.stars)}</span>`;
      const cls = st.stars > 0 ? 'clear' : '';
      return `<button class="cpg-stage ${cls}" onclick="startCampaignStage('${realm.id}', ${st.stage})">
        <span>${st.stage}</span>
        <span class="stars">${st.stars ? stars : '<span class="dim">☆</span>'}</span>
      </button>`;
    }
    return `<button class="cpg-stage locked" disabled>
      <span>${st.stage}</span><span class="stars">🔒</span>
    </button>`;
  }).join('');
}

function selectCampaignRealm(realmId){
  activeCampaignRealm = realmId;
  renderCampaignUI();
}

async function startCampaignStage(realmId, stageIndex){
  try{
    const r = await api('/api/campaign/start', 'POST', { player_id: PLAYER_ID, realm_id: realmId, stage_index: stageIndex });
    const realm = campaignRealmData.find(x => x.id === realmId);
    enterBattle(r.battle_id, 'campaign', `${(realm?realm.name+' — ':'')}Stage ${stageIndex}`);
  }catch(e){ toast(e.message); }
}

/* ---------------- Battle ---------------- */
document.getElementById('rankLeagueBtn').onclick = async () => {
  try{
    const r = await api('/api/battle/rankleague', 'POST', { player_id: PLAYER_ID });
    enterBattle(r.battle_id);
  }catch(e){ toast(e.message); }
};

document.getElementById('challengeBtn').onclick = async () => {
  const friendId = document.getElementById('battleFriendSelect').value;
  if(!friendId){ toast('Pick a friend'); return; }
  try{
    await api('/api/battle/challenge', 'POST', { player_id: PLAYER_ID, friend_id: friendId });
    toast('Challenge sent! Waiting for them to accept...');
  }catch(e){ toast(e.message); }
};

async function pollChallenges(){
  if(!PLAYER_ID) return;
  try{
    const r = await api('/api/battle/pending/' + PLAYER_ID);
    const box = document.getElementById('incomingChallenge');
    if(r.incoming && r.incoming.length && !currentBattleId){
      const c = r.incoming[0];
      box.style.display = 'block';
      box.innerHTML = `<p>⚔️ <strong>${escapeHtml(c.challenger_username)}</strong> challenged you to battle!</p>
        <div class="row" style="gap:8px;">
          <button class="btn" style="flex:1;" onclick="respondChallenge('${c.challenge_id}', true)">Accept</button>
          <button class="btn secondary" style="flex:1;" onclick="respondChallenge('${c.challenge_id}', false)">Decline</button>
        </div>`;
    } else {
      box.style.display = 'none';
    }
    if(r.your_accepted_battle_id && !currentBattleId){
      enterBattle(r.your_accepted_battle_id);
    }
  }catch(e){}
}

async function respondChallenge(challengeId, accept){
  try{
    const r = await api('/api/battle/challenge/' + challengeId + '/respond', 'POST', { accept });
    document.getElementById('incomingChallenge').style.display = 'none';
    if(accept && r.battle_id) enterBattle(r.battle_id);
  }catch(e){ toast(e.message); }
}

function enterBattle(battleId, mode, label){
  currentBattleId = battleId;
  currentBattleMode = mode || 'unknown';
  document.getElementById('battleLobby').style.display = 'none';
  document.getElementById('campaignCard').style.display = 'none';
  document.getElementById('battleArenaCard').style.display = 'block';
  document.getElementById('battleLog').innerHTML = '';
  const timerRow = document.getElementById('campaignTimerRow');
  if(mode === 'campaign'){
    timerRow.style.display = 'flex';
    document.getElementById('campaignStageLabel').textContent = label || 'Stage';
    document.getElementById('campaignTimer').textContent = CAMPAIGN_TIME_LIMIT + 's';
    updateCampaignTimer();
  } else {
    timerRow.style.display = 'none';
  }
  updateBattleState();
  battlePollTimer = setInterval(updateBattleState, 1500);
}

function exitBattle(){
  currentBattleId = null;
  clearInterval(battlePollTimer);
  clearTimeout(campaignTimerId);
  currentCampaignDeadline = null;
  document.getElementById('battleLobby').style.display = 'block';
  document.getElementById('campaignCard').style.display = 'block';
  document.getElementById('battleArenaCard').style.display = 'none';
  document.getElementById('campaignTimerRow').style.display = 'none';
  refreshProfile();
  refreshFriends();
  loadCampaign();
}
document.getElementById('leaveBattleBtn').onclick = exitBattle;

async function updateBattleState(){
  if(!currentBattleId) return;
  let s;
  try{ s = await api(`/api/battle/${currentBattleId}/state?player_id=${PLAYER_ID}`); }catch(e){ return; }
  if(s.mode === 'campaign') currentBattleMode = 'campaign';
  renderBattleState(s);
  if(s.status === 'finished'){
    clearInterval(battlePollTimer);
    clearTimeout(campaignTimerId);
    currentCampaignDeadline = null;
    let msg, toastType;
    if(s.winner_id === s.you.player_id){
      toastType = 'success';
      if(s.reward && s.reward.stars){
        const stars = '⭐'.repeat(s.reward.stars);
        msg = `🏆 Victory! ${stars} ${s.reward.dust} dust, ${s.reward.xp} XP`;
        if(s.reward.tm) msg += ` + ${s.reward.tm} TM`;
      } else {
        msg = '🏆 Victory!';
        if(s.reward && s.reward.dust) msg += ' +' + s.reward.dust + ' dust';
        if(s.reward && s.reward.xp) msg += ' +' + s.reward.xp + ' XP';
      }
      loadCampaign();
    }
    else if(!s.winner_id){ toastType = 'info'; msg = 'Draw!'; }
    else { toastType = 'error'; msg = s.mode === 'campaign' ? 'Defeat — you ran out of time or fell!' : 'Defeat — good fight!'; }
    setTimeout(()=>toast(msg, toastType), 400);
  }
}

function renderBattleState(s){
  document.getElementById('fighterYouName').textContent = s.you.username;
  document.getElementById('fighterOppName').textContent = s.opponent.username;
  document.getElementById('fighterYouLevel').textContent = s.you.level || (profile ? profile.level : 1);
  document.getElementById('fighterOppLevel').textContent = s.opponent.level || 1;
  const oppTierBadge = document.getElementById('oppTierBadge');
  if(oppTierBadge){
    const oppTier = String(s.opponent.player_id || '').split(':')[4];
    if(oppTier === 'boss'){ oppTierBadge.textContent = ' 👑 BOSS'; oppTierBadge.style.color = 'var(--bad)'; }
    else if(oppTier === 'elite'){ oppTierBadge.textContent = ' 💎 Elite'; oppTierBadge.style.color = 'var(--accent-2)'; }
    else { oppTierBadge.textContent = ''; }
  }
  const youShape = (profile && profile.avatar) ? profile.avatar : s.you.avatar;
  document.getElementById('battleAvatarYou').innerHTML = renderAvatarSVG(youShape, 120);
  document.getElementById('battleAvatarOpp').innerHTML = renderAvatarSVG(s.opponent.avatar, 120);

  const hpYouPct = Math.max(0,(s.you.hp/s.you.hp_max)*100);
  const hpOppPct = Math.max(0,(s.opponent.hp/s.opponent.hp_max)*100);
  const hpYouEl = document.getElementById('hpYou'); hpYouEl.style.width = hpYouPct+'%'; hpYouEl.classList.toggle('low', hpYouPct<30);
  const hpOppEl = document.getElementById('hpOpp'); hpOppEl.style.width = hpOppPct+'%'; hpOppEl.classList.toggle('low', hpOppPct<30);
  document.getElementById('hpYouText').textContent = `${s.you.hp}/${s.you.hp_max}`;
  document.getElementById('hpOppText').textContent = `${s.opponent.hp}/${s.opponent.hp_max}`;
  document.getElementById('gaugeYou').style.width = s.you.gauge + '%';
  document.getElementById('gaugeOpp').style.width = s.opponent.gauge + '%';
  document.getElementById('gaugeYouText').textContent = Math.floor(s.you.gauge) + '%';
  document.getElementById('gaugeOppText').textContent = Math.floor(s.opponent.gauge) + '%';
  document.getElementById('beYou').textContent = s.you.be + ' BE';
  document.getElementById('beOpp').textContent = s.opponent.be + ' BE';
  document.getElementById('specialBtn').disabled = s.you.gauge < 100 || s.status !== 'active' || campaignEnemyPending;
  document.getElementById('attackBtn').disabled = s.status !== 'active' || campaignEnemyPending;

  const timerRow = document.getElementById('campaignTimerRow');
  if(s.mode === 'campaign'){
    currentBattleMode = 'campaign';
    timerRow.style.display = 'flex';
    if(s.status === 'active' && s.time_left != null){
      currentCampaignDeadline = Date.now()/1000 + s.time_left;
    }
    updateCampaignTimer();
  }

  const oppRec = document.getElementById('oppRecord');
  const friend = friendsCache.find(f=>f.id === s.opponent.player_id);
  oppRec.textContent = friend ? (friend.pvp_wins+'-'+friend.pvp_losses+' PvP') : '';

  /* FIX 2: Only mark dataset.built = '1' if window.ALL_MOVES is loaded */
  const specialSel = document.getElementById('specialMoveSelect');
  if(profile && specialSel.dataset.built !== '1' && window.ALL_MOVES){
    const known = (profile.moves||[]).filter(m=>m!=='slap_face_hard');
    specialSel.innerHTML = known.length
      ? known.map(id => { const m = window.ALL_MOVES.find(x=>x.id===id); return m ? `<option value="${id}">${m.name} (${m.be_cost} BE)</option>` : ''; }).join('')
      : '<option value="slap_face_hard">Slap Face Hard (fallback)</option>';
    specialSel.dataset.built = '1';
  }

  const log = document.getElementById('battleLog');
  log.innerHTML = s.log.map(l=>`<div>${escapeHtml(l)}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

async function sendBattleAction(action, moveId){
  if(!currentBattleId || campaignEnemyPending) return;
  const isCampaign = currentBattleMode === 'campaign';
  const body = { player_id: PLAYER_ID, action };
  if(moveId) body.move_id = moveId;
  if(isCampaign) body.phase = 'player';
  const s = await api(`/api/battle/${currentBattleId}/action`, 'POST', body);
  renderBattleState(s);
  if(isCampaign && s.status === 'active'){
    campaignEnemyPending = true;
    setTimeout(async () => {
      try{
        const s2 = await api(`/api/battle/${currentBattleId}/action`, 'POST', { player_id: PLAYER_ID, action: 'attack', phase: 'enemy' });
        campaignEnemyPending = false;
        renderBattleState(s2);
        if(s2.status === 'finished') updateBattleState();
      }catch(e){
        campaignEnemyPending = false;
        updateBattleState();
      }
    }, 1500);
  }
  if(s.status === 'finished') updateBattleState();
}

document.getElementById('attackBtn').onclick = () => {
  sendBattleAction('attack', null).catch(e => toast(e.message));
};
document.getElementById('specialBtn').onclick = () => {
  const moveId = document.getElementById('specialMoveSelect').value;
  sendBattleAction('special', moveId).catch(e => toast(e.message));
};

function updateCampaignTimer(){
  clearTimeout(campaignTimerId);
  const el = document.getElementById('campaignTimer');
  if(!el) return;
  if(!currentCampaignDeadline){
    el.textContent = CAMPAIGN_TIME_LIMIT + 's';
    return;
  }
  const tick = () => {
    if(!currentCampaignDeadline){ el.textContent = '0s'; return; }
    const left = currentCampaignDeadline - Date.now()/1000;
    if(left <= 0){
      el.textContent = '0s';
      el.classList.add('danger');
      currentCampaignDeadline = null;
      return;
    }
    el.textContent = Math.ceil(left) + 's';
    el.classList.toggle('danger', left <= 10);
    campaignTimerId = setTimeout(tick, 250);
  };
  tick();
}

/* ---------------- utils ---------------- */
function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  });
}
