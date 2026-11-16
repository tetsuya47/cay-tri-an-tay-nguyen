/* Cây Tri Ân Tây Nguyên – Code the Thanks 2026
   Không cần thư viện: gọi trực tiếp REST API của Supabase bằng fetch. */
(() => {
  'use strict';

  const CFG = window.CTT_CONFIG || {};
  const BASE = (CFG.SUPABASE_URL || '').replace(/\/+$/, '');
  const DEMO = !BASE || !CFG.SUPABASE_KEY || /YOUR|xxxx/i.test(BASE);
  const PARAMS = new URLSearchParams(location.search);
  const SCREEN = PARAMS.has('screen');
  const POLL_MS = Math.max(3000, CFG.POLL_MS || 8000);
  const TABLE = 'gratitude_messages';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);

  const RECIPIENTS = {
    thay_co:               { label: 'Thầy cô',              hue: 145, flower: false, dot: '#3FA66B' },
    mai_truong:            { label: 'Mái trường',           hue: 172, flower: false, dot: '#2E9C8F' },
    bai_hoc:               { label: 'Một bài học',          hue: 88,  flower: false, dot: '#8CC63F' },
    nguoi_truyen_cam_hung: { label: 'Người truyền cảm hứng', hue: 45,  flower: true,  dot: '#F5B82E' },
  };

  /* ---------- Dữ liệu: Supabase hoặc demo ---------- */
  const DEMO_KEY = 'ctt_demo_v1';
  const DEMO_SEED = [
    ['Minh Anh', 'thay_co', 'cô chủ nhiệm', 'Cảm ơn cô đã kiên nhẫn chờ em hiểu bài, kể cả khi em hỏi lại lần thứ ba.'],
    ['Hoàng', 'mai_truong', '', 'Mái trường cho em một nơi để thử, để sai và để lớn lên.'],
    [null, 'bai_hoc', '', 'Bài học về đúng giờ, đến khi đi làm thêm em mới hiểu nó quý đến thế nào.'],
    ['Kim Ngân', 'nguoi_truyen_cam_hung', '', 'Có một người thầy chưa từng nói "cố lên", nhưng luôn đứng ở cuối lớp chờ em làm xong.'],
    ['Thu', 'thay_co', 'thầy dạy Toán', 'Em sợ Toán suốt ba năm, cho tới khi thầy vẽ một đường tròn lên bảng và kể chuyện về nó.'],
    ['Bảo', 'thay_co', '', 'Cảm ơn các thầy cô đã thức khuya chấm bài cho chúng em.'],
    [null, 'mai_truong', '', 'Buôn Ma Thuột những chiều mưa, hành lang trường là nơi em nhớ nhất.'],
    ['Lan Chi', 'bai_hoc', '', 'Một câu góp ý thẳng thắn của cô đã giúp em dám sửa đồ án lần cuối.'],
    ['Đức', 'nguoi_truyen_cam_hung', '', 'Cảm ơn người đã tin em làm được khi chính em còn chưa tin.'],
    ['Mai', 'thay_co', 'cô dạy Văn', 'Cô dạy em viết, và dạy em lắng nghe trước khi viết.'],
    ['Tuấn', 'mai_truong', '', 'Cảm ơn mái trường đã cho em nhiều bạn bè từ khắp Tây Nguyên.'],
    [null, 'thay_co', '', 'Gửi các thầy cô: chúng em nhớ từng lời dặn, dù không nói ra.'],
  ];
  function demoLoad() {
    const now = Date.now();
    const seed = DEMO_SEED.map((r, i) => ({
      id: 'seed' + i, sender_name: r[0], is_anonymous: r[0] === null, recipient_type: r[1],
      recipient_name: r[2] || null, message: r[3], created_at: new Date(now - (DEMO_SEED.length - i) * 3600e3).toISOString(),
    }));
    let mine = [];
    try { mine = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); } catch (e) { /* bỏ qua */ }
    return seed.concat(demoFill(now), mine);
  }
  // ?fill=60 : thêm lá mẫu để quay video / thử cây đầy (chỉ ở chế độ demo)
  const FILL_NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khoa', 'Linh', 'My', 'Nam', 'Oanh', 'Phúc', 'Quân', 'Sương', 'Trang', 'Uyên', 'Việt', 'Yến'];
  const FILL_MSGS = [
    'Cảm ơn thầy cô đã không bỏ rơi em những ngày em chán học nhất.',
    'Một lời khen nhỏ của cô năm đó, em mang theo đến tận bây giờ.',
    'Thầy dạy em cách đặt câu hỏi, điều đó quý hơn mọi đáp án.',
    'Mái trường này cho em những người bạn và cả những cơn mưa chiều đáng nhớ.',
    'Cảm ơn cô đã chờ em nộp bài muộn mà không một lời trách.',
    'Em nhớ giọng thầy giảng bài vào buổi sáng sương mù trên cao nguyên.',
    'Bài học về sự trung thực của thầy giúp em đứng vững ngoài đời.',
    'Gửi thầy cô: mỗi tấm bằng của chúng em đều có dấu chân của thầy cô.',
    'Cảm ơn người đã tin em làm được khi em chưa tin vào mình.',
    'Những buổi học thêm miễn phí của thầy, em chưa bao giờ quên.',
  ];
  function demoFill(now) {
    const n = Math.min(300, Math.max(0, parseInt(PARAMS.get('fill') || '0', 10) || 0));
    const types = Object.keys(RECIPIENTS), out = [];
    for (let i = 0; i < n; i++) {
      out.push({ id: 'fill' + i, sender_name: i % 5 === 4 ? null : FILL_NAMES[i % FILL_NAMES.length], is_anonymous: i % 5 === 4,
        recipient_type: types[(i * 7 + (i >> 2)) % types.length], recipient_name: null,
        message: FILL_MSGS[(i * 3) % FILL_MSGS.length], created_at: new Date(now - (n - i) * 60e3 - 86400e3).toISOString() });
    }
    return out;
  }

  function headers(extra) {
    const h = { apikey: CFG.SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (CFG.SUPABASE_KEY.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + CFG.SUPABASE_KEY;
    return Object.assign(h, extra || {});
  }

  async function fetchApproved() {
    if (DEMO) return demoLoad();
    const url = BASE + '/rest/v1/' + TABLE +
      '?select=id,sender_name,is_anonymous,recipient_type,recipient_name,message,created_at' +
      '&status=eq.approved&order=created_at.asc&limit=1000';
    const r = await fetch(url, { headers: headers(), cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  async function submitMessage(p) {
    if (DEMO) {
      let mine = [];
      try { mine = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); } catch (e) { /* bỏ qua */ }
      mine.push({ id: 'me' + Date.now(), sender_name: p.sender_name, is_anonymous: p.is_anonymous,
        recipient_type: p.recipient_type, recipient_name: p.recipient_name, message: p.message,
        created_at: new Date().toISOString() });
      localStorage.setItem(DEMO_KEY, JSON.stringify(mine));
      return;
    }
    const r = await fetch(BASE + '/rest/v1/' + TABLE, {
      method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(p),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  }

  /* ---------- Cây: bố cục lá theo phyllotaxis ---------- */
  const CX = 300, CY = 242, RX = 262, RY = 205, CAP = 200;
  const svg = $('#tree'), gLeaves = $('#leaves'), gSlots = $('#slots');
  let current = [];            // danh sách đã hiển thị (theo thứ tự thời gian)
  const nodes = new Map();     // id -> phần tử <g>

  function rnd(seed) {         // mulberry32: ngẫu nhiên cố định theo chỉ số lá
    let a = seed + 0x6D2B79F5;
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  }
  function place(i) {
    const idx = i % CAP, layer = Math.floor(i / CAP);
    const t = Math.sqrt(0.025 + 0.975 * (idx + 0.5) / CAP) * (layer ? 0.9 : 1);
    const th = idx * 2.39996323 + layer * 1.3;
    const x = CX + RX * t * Math.cos(th), y = CY + RY * t * Math.sin(th);
    return { x, y, ang: Math.atan2(y - CY, x - CX) * 180 / Math.PI };
  }
  const el = (name, attrs) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  function leafScale(n) { return Math.max(0.62, 1.3 - Math.max(0, n - 40) * 0.0045); }

  function buildLeaf(m, i, n, isNew) {
    const meta = RECIPIENTS[m.recipient_type] || RECIPIENTS.thay_co;
    const p = place(i), r1 = rnd(i * 7 + 1), r2 = rnd(i * 7 + 2), r3 = rnd(i * 7 + 3);
    const s = leafScale(n);
    const g = el('g', { class: 'leaf' + (isNew ? ' new' : ''), transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')',
      tabindex: '0', role: 'button', 'aria-label': 'Đọc lời tri ân ' + (i + 1) });
    const grow = el('g', { class: 'grow' });
    const rot = el('g', { transform: 'rotate(' + (p.ang + (r1 - 0.5) * 70).toFixed(1) + ') scale(' + s.toFixed(2) + ')' });
    const shape = el('g', { class: 'shape' });
    if (meta.flower) {
      const f = el('g', { transform: 'translate(12 0)' });
      for (let k = 0; k < 6; k++) f.appendChild(el('ellipse', { cx: 0, cy: -7, rx: 3.4, ry: 7.5, fill: '#F7C531', transform: 'rotate(' + (k * 60) + ')' }));
      f.appendChild(el('circle', { r: 3.8, fill: '#8A3B1E' }));
      shape.appendChild(f);
    } else {
      const light = 36 + r2 * 20, sat = 50 + r3 * 20;
      shape.appendChild(el('path', { d: 'M0 0 C7 -10 21 -10 29 0 C21 10 7 10 0 0Z', fill: 'hsl(' + (meta.hue + (r3 - .5) * 16).toFixed(0) + ' ' + sat.toFixed(0) + '% ' + light.toFixed(0) + '%)' }));
      shape.appendChild(el('path', { d: 'M2 0 L25 0', stroke: 'rgba(255,255,255,.38)', 'stroke-width': '.9', fill: 'none' }));
    }
    rot.appendChild(shape);
    grow.appendChild(rot);
    g.appendChild(grow);
    g.appendChild(el('circle', { r: 17, fill: 'transparent', cx: 0, cy: 0 })); // vùng chạm lớn cho điện thoại
    if (isNew) g.style.animationDelay = '0s';
    const open = () => showLeaf(m);
    g.addEventListener('click', open);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return g;
  }

  function drawSlots(n) {
    gSlots.textContent = '';
    const total = Math.min(Math.max(n + 24, 48), CAP);
    for (let i = n; i < total; i++) {
      const p = place(i);
      gSlots.appendChild(el('circle', { class: 'slot', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4 }));
    }
  }

  function renderTree(list, animateNew) {
    const sameBase = current.length <= list.length && current.every((m, i) => list[i] && list[i].id === m.id);
    const scaleChanged = leafScale(current.length) !== leafScale(list.length);
    if (!sameBase || scaleChanged) {                 // vẽ lại toàn bộ (có lá bị gỡ, hoặc cây đầy hơn)
      gLeaves.textContent = ''; nodes.clear();
      list.forEach((m, i) => { const g = buildLeaf(m, i, list.length, false); nodes.set(m.id, g); gLeaves.appendChild(g); });
    } else {
      for (let i = current.length; i < list.length; i++) {
        const g = buildLeaf(list[i], i, list.length, animateNew);
        nodes.set(list[i].id, g); gLeaves.appendChild(g);
      }
    }
    const added = list.slice(current.length);
    current = list.slice();
    drawSlots(list.length);
    $('#emptyHint').hidden = list.length > 0;
    animateCount(list.length);
    return sameBase ? added : [];
  }

  let shownCount = 0;
  function animateCount(to) {
    const out = $('#count'), from = shownCount;
    shownCount = to;
    if (from === to) { out.textContent = to; return; }
    const t0 = performance.now(), dur = 700;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      out.textContent = Math.round(from + (to - from) * k);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Đọc lời tri ân ---------- */
  function who(m) { return m.is_anonymous || !m.sender_name ? 'Một người ẩn danh' : m.sender_name; }
  function toLabel(m) {
    const meta = RECIPIENTS[m.recipient_type] || RECIPIENTS.thay_co;
    return meta.label + (m.recipient_name ? ' · ' + m.recipient_name : '');
  }
  function showLeaf(m) {
    $('#lcFrom').textContent = who(m) + ' gửi lời cảm ơn';
    $('#lcMsg').textContent = '“' + m.message + '”';
    $('#lcTo').textContent = 'Gửi đến: ' + toLabel(m);
    $('#leafOverlay').hidden = false;
  }
  $('#closeLeaf').addEventListener('click', () => { $('#leafOverlay').hidden = true; });
  $('#leafOverlay').addEventListener('click', (e) => { if (e.target.id === 'leafOverlay') e.currentTarget.hidden = true; });

  /* ---------- Form 3 bước ---------- */
  const overlay = $('#formOverlay');
  const state = { name: '', anon: false, type: 'thay_co' };
  function setStep(n) {
    overlay.querySelectorAll('section[data-step]').forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    overlay.querySelectorAll('.steps i').forEach((i, k) => i.classList.toggle('on', k < n));
    const sheet = overlay.querySelector('.sheet'); if (sheet) sheet.scrollTop = 0;
  }
  function openForm() {
    overlay.hidden = false; setStep(1); $('#formError').hidden = true;
    setTimeout(() => $('#nameInput').focus(), 50);
  }
  function closeForm() { overlay.hidden = true; }
  $('#plantBtn').addEventListener('click', openForm);
  $('#closeForm').addEventListener('click', closeForm);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeForm(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeForm(); $('#leafOverlay').hidden = true; }
  });

  // Bước 1: nhập tên hoặc ẩn danh
  const nameInput = $('#nameInput'), anonChk = $('#anonChk'), toStep2 = $('#toStep2');
  function validStep1() {
    state.anon = anonChk.checked;
    state.name = nameInput.value.trim().replace(/\s+/g, ' ');
    nameInput.disabled = state.anon;
    toStep2.disabled = !(state.anon || state.name.length >= 2);
  }
  nameInput.addEventListener('input', validStep1);
  anonChk.addEventListener('change', validStep1);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !toStep2.disabled) toStep2.click(); });
  toStep2.addEventListener('click', () => {
    $('#consentText').textContent = state.anon
      ? 'Tôi đồng ý cho hiển thị lời nhắn của mình (ẩn danh) trên Cây Tri Ân sau khi được kiểm duyệt.'
      : 'Tôi đồng ý cho hiển thị lời nhắn và tên gọi của mình trên Cây Tri Ân sau khi được kiểm duyệt.';
    setStep(2); validStep2();
  });

  // Bước 2: người nhận + lời nhắn + đồng ý
  const chips = $('#recipChips');
  Object.keys(RECIPIENTS).forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.type = k; b.setAttribute('role', 'radio');
    b.textContent = RECIPIENTS[k].label;
    b.addEventListener('click', () => { state.type = k; syncChips(); validStep2(); });
    chips.appendChild(b);
  });
  function syncChips() {
    chips.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.type === state.type)));
    $('#recipNameWrap').hidden = !(state.type === 'thay_co' || state.type === 'nguoi_truyen_cam_hung');
  }
  syncChips();
  const msg = $('#msg'), consent = $('#consentChk'), submitBtn = $('#submitBtn');
  function validStep2() {
    $('#msgCount').textContent = msg.value.length + '/400';
    submitBtn.disabled = !(msg.value.trim().length >= 5 && consent.checked);
  }
  msg.addEventListener('input', validStep2);
  consent.addEventListener('change', validStep2);
  $('#backTo1').addEventListener('click', () => setStep(1));

  function showError(t) { const e = $('#formError'); e.textContent = t; e.hidden = false; }
  submitBtn.addEventListener('click', async () => {
    $('#formError').hidden = true;
    if ($('#website').value) { setStep(3); return; }               // bẫy bot: ô ẩn bị điền
    const last = Number(localStorage.getItem('ctt_last') || 0);
    if (Date.now() - last < 20000) { showError('Bạn vừa gieo một lời cảm ơn xong. Chờ vài giây rồi gieo tiếp nhé.'); return; }
    const text = msg.value.trim();
    if (text.length < 5) { showError('Lời nhắn cần ít nhất 5 ký tự.'); return; }
    const payload = {
      sender_name: state.anon ? null : state.name.slice(0, 30),
      is_anonymous: state.anon,
      recipient_type: state.type,
      recipient_name: ($('#recipName').value.trim().slice(0, 40)) || null,
      message: text.slice(0, 400),
    };
    if ($('#recipNameWrap').hidden) payload.recipient_name = null;
    submitBtn.disabled = true; submitBtn.textContent = 'Đang gieo...';
    try {
      await submitMessage(payload);
      try { localStorage.setItem('ctt_last', String(Date.now())); } catch (e) { /* bỏ qua */ }
      $('#doneText').textContent = DEMO
        ? 'Chế độ demo: chiếc lá của bạn xuất hiện ngay. Khi chạy thật, lá sẽ hiện sau khi được duyệt.'
        : 'Sau khi được duyệt, chiếc lá sẽ xuất hiện trên cây tri ân chung.';
      msg.value = ''; consent.checked = false; $('#recipName').value = '';
      setStep(3);
      if (DEMO) poll();
    } catch (err) {
      showError('Chưa gửi được lời nhắn. Kiểm tra kết nối mạng rồi thử lại nhé.');
    } finally {
      submitBtn.textContent = 'Gieo lời cảm ơn'; validStep2();
    }
  });
  $('#againBtn').addEventListener('click', () => { setStep(2); validStep2(); });
  $('#viewTree').addEventListener('click', closeForm);

  /* ---------- Cập nhật định kỳ ---------- */
  let firstLoad = true, timer = null;
  const ticker = { list: [], i: 0, t: null };
  async function poll() {
    try {
      const list = await fetchApproved();
      const added = renderTree(list, !firstLoad);
      if (SCREEN) {
        ticker.list = list.slice();
        if (added.length) { ticker.i = list.indexOf(added[added.length - 1]); tick(true); }
        else if (firstLoad) tick(true);
      }
      firstLoad = false;
    } catch (e) {
      if (firstLoad) { $('#emptyHint').textContent = 'Chưa tải được cây. Kiểm tra kết nối mạng và tải lại trang.'; $('#emptyHint').hidden = false; }
    }
  }
  function schedule() {
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) poll(); }, POLL_MS);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });

  /* ---------- Chế độ màn hình lớn: ?screen=1 ---------- */
  function tick(now) {
    if (!ticker.list.length) return;
    if (!now) ticker.i = (ticker.i + 1) % ticker.list.length;
    const m = ticker.list[ticker.i % ticker.list.length];
    $('#tkWho').textContent = who(m) + ' gửi đến ' + toLabel(m);
    $('#tkTxt').textContent = '“' + m.message + '”';
    nodes.forEach((g) => g.classList.remove('glow'));
    const g = nodes.get(m.id); if (g) g.classList.add('glow');
  }
  function initScreen() {
    document.body.classList.add('screen');
    $('#ticker').hidden = false;
    $('#qrBox').hidden = false;
    const url = location.origin + location.pathname;
    $('#qrUrl').textContent = url.replace(/^https?:\/\//, '');
    try {
      const cv = document.createElement('canvas');
      window.CTTQR.draw(cv, url, 170);
      $('#qr').appendChild(cv);
    } catch (e) { $('#qr').hidden = true; }
    ticker.t = setInterval(() => tick(false), 7000);
  }

  /* ---------- Khởi động ---------- */
  const legend = $('#legend');
  Object.keys(RECIPIENTS).forEach((k) => {
    const li = document.createElement('li');
    const i = document.createElement('i'); i.style.background = RECIPIENTS[k].dot;
    li.appendChild(i); li.appendChild(document.createTextNode(RECIPIENTS[k].label));
    legend.appendChild(li);
  });
  if (DEMO) $('#demoBanner').hidden = false;
  if (SCREEN) initScreen();
  poll(); schedule();
})();
