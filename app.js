/* ==========================================================================
   CÂY TRI ÂN TÂY NGUYÊN – CODE THE THANKS 2026
   Báo Tường Điện Tử 20/11 · Đại học Tây Nguyên
   Thuần JavaScript: Gọi trực tiếp REST API của Supabase bằng fetch().
   ========================================================================== */
(() => {
  'use strict';

  const CFG = window.CTT_CONFIG || {};
  const BASE = (CFG.SUPABASE_URL || '').replace(/\/+$/, '');
  const DEMO = !BASE || !CFG.SUPABASE_KEY || /YOUR|xxxx/i.test(BASE);
  const PARAMS = new URLSearchParams(location.search);
  const SCREEN = PARAMS.has('screen') || PARAMS.has('moment');
  const POLL_MS = Math.max(3000, CFG.POLL_MS || 8000);
  const TABLE = 'gratitude_messages';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);

  const RECIPIENTS = {
    thay_co:               { label: 'Thầy cô',              hue: 145, flower: false, dot: '#2B6E4E' },
    mai_truong:            { label: 'Mái trường',           hue: 172, flower: false, dot: '#2E9C8F' },
    bai_hoc:               { label: 'Một bài học',          hue: 88,  flower: false, dot: '#7CB342' },
    nguoi_truyen_cam_hung: { label: 'Người truyền cảm hứng', hue: 45,  flower: true,  dot: '#FBC02D' },
  };

  /* ---------- Dữ liệu: Supabase hoặc Demo ---------- */
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
      id: 'seed' + i,
      sender_name: r[0],
      is_anonymous: r[0] === null,
      recipient_type: r[1],
      recipient_name: r[2] || null,
      message: r[3],
      created_at: new Date(now - (DEMO_SEED.length - i) * 3600e3).toISOString(),
    }));
    let mine = [];
    try { mine = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); } catch (e) { /* bỏ qua */ }
    return seed.concat(demoFill(now), mine);
  }

  // ?fill=60: thêm lá mẫu để quay video / thử cây đầy (chỉ ở chế độ demo)
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
      out.push({
        id: 'fill' + i,
        sender_name: i % 5 === 4 ? null : FILL_NAMES[i % FILL_NAMES.length],
        is_anonymous: i % 5 === 4,
        recipient_type: types[(i * 7 + (i >> 2)) % types.length],
        recipient_name: null,
        message: FILL_MSGS[(i * 3) % FILL_MSGS.length],
        created_at: new Date(now - (n - i) * 60e3 - 86400e3).toISOString()
      });
    }
    return out;
  }

  function headers(extra) {
    const h = { apikey: CFG.SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (CFG.SUPABASE_KEY && CFG.SUPABASE_KEY.indexOf('eyJ') === 0) {
      h.Authorization = 'Bearer ' + CFG.SUPABASE_KEY;
    }
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
      mine.push({
        id: 'me' + Date.now(),
        sender_name: p.sender_name,
        is_anonymous: p.is_anonymous,
        recipient_type: p.recipient_type,
        recipient_name: p.recipient_name,
        message: p.message,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(DEMO_KEY, JSON.stringify(mine));
      return;
    }
    const r = await fetch(BASE + '/rest/v1/' + TABLE, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(p),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  }

  /* ---------- Cây: Bố cục lá theo Phyllotaxis (Góc vàng Fibonacci) ---------- */
  const CX = 512, CY = 248, RX = 390, RY = 188, CAP = 200;
  const svg = $('#tree'), gLeaves = $('#leaves'), gSlots = $('#slots');
  let current = [];            // Danh sách đã hiển thị
  const nodes = new Map();     // id -> phần tử <g>

  function rnd(seed) {         // Mulberry32: Sinh số ngẫu nhiên cố định theo seed
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

  function leafScale(n) {
    return Math.max(0.85, 1.45 - Math.max(0, n - 40) * 0.0035);
  }

  /* Tạo hình chiếc lá / hoa kèm thẻ điều ước treo trên cành theo phong cách báo tường */
  function buildLeaf(m, i, n, isNew) {
    const meta = RECIPIENTS[m.recipient_type] || RECIPIENTS.thay_co;
    const p = place(i), r1 = rnd(i * 7 + 1), r2 = rnd(i * 7 + 2), r3 = rnd(i * 7 + 3);
    const s = leafScale(n);
    
    const g = el('g', {
      class: 'leaf' + (isNew ? ' new' : ''),
      transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')',
      tabindex: '0',
      role: 'button',
      'aria-label': 'Đọc lời tri ân từ ' + who(m)
    });

    const grow = el('g', { class: 'grow' });
    const rot = el('g', { transform: 'rotate(' + (p.ang + (r1 - 0.5) * 65).toFixed(1) + ') scale(' + s.toFixed(2) + ')' });
    const shape = el('g', { class: 'shape' });

    if (meta.flower) {
      // Hoa dã quỳ vàng nở rộ cho "Người truyền cảm hứng"
      const f = el('g', { transform: 'translate(10 0)' });
      for (let k = 0; k < 8; k++) {
        f.appendChild(el('ellipse', {
          cx: 0, cy: -8, rx: 3, ry: 7.5,
          fill: '#FBC02D', stroke: '#F57F17', 'stroke-width': '.5',
          transform: 'rotate(' + (k * 45) + ')'
        }));
      }
      f.appendChild(el('circle', { r: 4, fill: '#6D4C41', stroke: '#3E2723', 'stroke-width': '.6' }));
      shape.appendChild(f);
    } else {
      // Chiếc lá xanh tự nhiên kèm thẻ thiệp ước nguyện nhỏ viền chỉ đung đưa
      const light = 34 + r2 * 22, sat = 48 + r3 * 22;
      const leafColor = 'hsl(' + (meta.hue + (r3 - 0.5) * 16).toFixed(0) + ' ' + sat.toFixed(0) + '% ' + light.toFixed(0) + '%)';
      
      // Phiến lá
      shape.appendChild(el('path', {
        d: 'M0 0 C7 -10 22 -10 30 0 C22 10 7 10 0 0Z',
        fill: leafColor,
        stroke: 'rgba(255,255,255,0.25)',
        'stroke-width': '.8'
      }));
      // Gân lá
      shape.appendChild(el('path', {
        d: 'M2 0 L26 0',
        stroke: 'rgba(255,255,255,0.45)',
        'stroke-width': '.9',
        fill: 'none'
      }));
      
      // Thẻ thiệp ước nguyện mini treo dưới lá (như trên bản concept báo tường)
      const tagGroup = el('g', { transform: 'translate(16 3)', class: 'wish-tag' });
      // Sợi dây treo
      tagGroup.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: 12, stroke: '#8D6E63', 'stroke-width': '1' }));
      // Thẻ giấy kem
      tagGroup.appendChild(el('rect', { x: -6, y: 12, width: 12, height: 16, rx: 2, fill: '#FFFDF7', stroke: '#8D6E63', 'stroke-width': '.8' }));
      // Trái tim đỏ nhỏ giữa thẻ
      tagGroup.appendChild(el('path', {
        d: 'M0 16 C-2 14 -4.5 15.5 -4.5 18 C-4.5 20.5 0 23 0 23 C0 23 4.5 20.5 4.5 18 C4.5 15.5 2 14 0 16 Z',
        fill: '#E53935'
      }));
      shape.appendChild(tagGroup);
    }

    rot.appendChild(shape);
    grow.appendChild(rot);
    g.appendChild(grow);

    // Vùng chạm ngón tay rộng (Touch target r=24) cho điện thoại
    g.appendChild(el('circle', { r: 24, fill: 'transparent', cx: 0, cy: 0 }));

    if (isNew) g.style.animationDelay = '0s';

    const open = () => showLeaf(m);
    g.addEventListener('click', open);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    return g;
  }

  function drawSlots(n) {
    gSlots.textContent = '';
    const total = Math.min(Math.max(n + 24, 48), CAP);
    for (let i = n; i < total; i++) {
      const p = place(i);
      gSlots.appendChild(el('circle', { class: 'slot', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 5 }));
    }
  }

  /* Render cây: Tối ưu không phá vỡ DOM cũ để lá mới nảy mầm bung nở mượt mà */
  function renderTree(list, animateNew) {
    const sameBase = current.length <= list.length && current.every((m, i) => list[i] && list[i].id === m.id);
    
    if (!sameBase) {
      // Có lá bị gỡ hoặc cấu trúc thay đổi hoàn toàn: vẽ lại toàn bộ
      gLeaves.textContent = '';
      nodes.clear();
      list.forEach((m, i) => {
        const g = buildLeaf(m, i, list.length, false);
        nodes.set(m.id, g);
        gLeaves.appendChild(g);
      });
    } else {
      // Chỉ có lá mới thêm vào: nạp tiếp các lá mới và kích hoạt animation bung nở
      for (let i = current.length; i < list.length; i++) {
        const g = buildLeaf(list[i], i, list.length, animateNew);
        nodes.set(list[i].id, g);
        gLeaves.appendChild(g);
      }
    }

    const added = list.slice(current.length);
    current = list.slice();
    drawSlots(list.length);
    
    const emptyHint = $('#emptyHint');
    if (emptyHint) emptyHint.hidden = list.length > 0;
    
    animateCount(list.length);
    return sameBase ? added : [];
  }

  let shownCount = 0;
  function animateCount(to) {
    const out = $('#count'), from = shownCount;
    shownCount = to;
    if (!out) return;
    if (from === to) { out.textContent = to; return; }
    const t0 = performance.now(), dur = 700;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      out.textContent = Math.round(from + (to - from) * k);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Đọc lời tri ân (Vintage Postcard Modal) ---------- */
  function who(m) {
    return m.is_anonymous || !m.sender_name ? 'Một người ẩn danh' : m.sender_name;
  }

  function toLabel(m) {
    const meta = RECIPIENTS[m.recipient_type] || RECIPIENTS.thay_co;
    return meta.label + (m.recipient_name ? ' · ' + m.recipient_name : '');
  }

  function showLeaf(m) {
    $('#lcFrom').textContent = who(m) + ' gửi lời tri ân';
    $('#lcMsg').textContent = '“' + m.message + '”';
    $('#lcTo').textContent = 'Gửi đến: ' + toLabel(m);
    
    const timeEl = $('#lcTime');
    if (timeEl && m.created_at) {
      try {
        const d = new Date(m.created_at);
        timeEl.textContent = 'Gửi lúc ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) {
        timeEl.textContent = '';
      }
    }
    
    $('#leafOverlay').hidden = false;
  }

  $('#closeLeaf').addEventListener('click', () => { $('#leafOverlay').hidden = true; });
  $('#leafOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'leafOverlay') e.currentTarget.hidden = true;
  });

  /* ---------- Form 3 bước (Wizard) ---------- */
  const overlay = $('#formOverlay');
  const state = { name: '', anon: false, type: 'thay_co' };

  function setStep(n) {
    overlay.querySelectorAll('section[data-step]').forEach((s) => {
      s.hidden = Number(s.dataset.step) !== n;
    });
    overlay.querySelectorAll('.steps i').forEach((i, k) => i.classList.toggle('on', k < n));
    const sheet = overlay.querySelector('.sheet');
    if (sheet) sheet.scrollTop = 0;
  }

  function openForm() {
    overlay.hidden = false;
    setStep(1);
    $('#formError').hidden = true;
    setTimeout(() => $('#nameInput').focus(), 50);
  }

  function closeForm() {
    overlay.hidden = true;
  }

  $('#plantBtn').addEventListener('click', openForm);
  $('#closeForm').addEventListener('click', closeForm);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeForm(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeForm();
      $('#leafOverlay').hidden = true;
      closeMomentTheater();
    }
  });

  // Bước 1: Nhập tên hoặc chọn ẩn danh
  const nameInput = $('#nameInput'), anonChk = $('#anonChk'), toStep2 = $('#toStep2');
  function validStep1() {
    state.anon = anonChk.checked;
    state.name = nameInput.value.trim().replace(/\s+/g, ' ');
    nameInput.disabled = state.anon;
    toStep2.disabled = !(state.anon || state.name.length >= 2);
  }
  nameInput.addEventListener('input', validStep1);
  anonChk.addEventListener('change', validStep1);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !toStep2.disabled) toStep2.click();
  });

  toStep2.addEventListener('click', () => {
    $('#consentText').textContent = state.anon
      ? 'Tôi đồng ý cho hiển thị lời nhắn của mình (ẩn danh) trên Cây Tri Ân sau khi được kiểm duyệt.'
      : 'Tôi đồng ý cho hiển thị lời nhắn và tên gọi của mình trên Cây Tri Ân sau khi được kiểm duyệt.';
    setStep(2);
    validStep2();
  });

  // Bước 2: Người nhận + Lời nhắn + Cam kết
  const chips = $('#recipChips');
  Object.keys(RECIPIENTS).forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.type = k;
    b.setAttribute('role', 'radio');
    b.textContent = RECIPIENTS[k].label;
    b.addEventListener('click', () => {
      state.type = k;
      syncChips();
      validStep2();
    });
    chips.appendChild(b);
  });

  function syncChips() {
    chips.querySelectorAll('.chip').forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.type === state.type));
    });
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

  function showError(t) {
    const e = $('#formError');
    e.textContent = t;
    e.hidden = false;
  }

  submitBtn.addEventListener('click', async () => {
    $('#formError').hidden = true;
    if ($('#website').value) { setStep(3); return; } // Bẫy bot: ô ẩn bị điền
    
    const last = Number(localStorage.getItem('ctt_last') || 0);
    if (Date.now() - last < 20000) {
      showError('Bạn vừa gieo một lời cảm ơn xong. Chờ vài giây rồi gieo tiếp nhé.');
      return;
    }

    const text = msg.value.trim();
    if (text.length < 5) {
      showError('Lời nhắn cần ít nhất 5 ký tự.');
      return;
    }

    const payload = {
      sender_name: state.anon ? null : state.name.slice(0, 30),
      is_anonymous: state.anon,
      recipient_type: state.type,
      recipient_name: ($('#recipName').value.trim().slice(0, 40)) || null,
      message: text.slice(0, 400),
    };
    if ($('#recipNameWrap').hidden) payload.recipient_name = null;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gieo mầm...';

    try {
      await submitMessage(payload);
      try { localStorage.setItem('ctt_last', String(Date.now())); } catch (e) { /* bỏ qua */ }
      $('#doneText').textContent = DEMO
        ? 'Chế độ demo: Chiếc lá của bạn xuất hiện ngay trên cây. Khi chạy thật, lá sẽ hiện sau khi được Ban tổ chức phê duyệt.'
        : 'Sau khi được Ban tổ chức phê duyệt, chiếc lá tri ân của bạn sẽ xuất hiện lung linh trên cây tri ân chung.';
      msg.value = '';
      consent.checked = false;
      $('#recipName').value = '';
      setStep(3);
      if (DEMO) poll();
    } catch (err) {
      showError('Chưa gửi được lời nhắn. Kiểm tra kết nối mạng rồi thử lại nhé.');
    } finally {
      submitBtn.textContent = '🌱 Gieo lời cảm ơn';
      validStep2();
    }
  });

  $('#againBtn').addEventListener('click', () => { setStep(2); validStep2(); });
  $('#viewTree').addEventListener('click', closeForm);

  /* ---------- Cập nhật định kỳ (Polling) ---------- */
  let firstLoad = true, pollTimer = null;
  const allApproved = { list: [], index: 0 };

  async function poll() {
    try {
      const list = await fetchApproved();
      const added = renderTree(list, !firstLoad);
      allApproved.list = list.slice();
      
      if (momentTheaterOpen) {
        if (added.length) {
          allApproved.index = list.indexOf(added[added.length - 1]);
        }
        renderTheaterGallery();
        renderMomentSlide();
      }
      
      firstLoad = false;
    } catch (e) {
      if (firstLoad) {
        const hint = $('#emptyHint');
        if (hint) {
          hint.textContent = 'Chưa tải được cây. Kiểm tra kết nối mạng và tải lại trang.';
          hint.hidden = false;
        }
      }
    }
  }

  function schedule() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (!document.hidden) poll(); }, POLL_MS);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });

  /* ==========================================================================
     CHẾ ĐỘ "KHOẢNH KHẮC CÂY TRI ÂN" (EXHIBITION GALA GALLERY)
     Triển lãm nghệ thuật quy tụ tất cả lời tri ân đã duyệt
     ========================================================================== */
  let momentTheaterOpen = false;
  let momentAutoTimer = null;
  let momentPlaying = true;
  const theaterOverlay = $('#momentTheater');

  /* Hiển thị toàn bộ thiệp nghệ thuật vào không gian triển lãm */
  function renderTheaterGallery() {
    const gallery = $('#theaterGallery');
    if (!gallery) return;

    if (!allApproved.list.length) {
      gallery.innerHTML = `
        <div class="theater-empty-state">
          <div class="empty-icon">🌱</div>
          <h3>Chưa có lời tri ân nào được duyệt</h3>
          <p>Mỗi lời tri ân bạn gửi sẽ trở thành một mầm xanh trên cây và xuất hiện tại triển lãm này sau khi được ban biên tập duyệt.</p>
        </div>
      `;
      const progEl = $('#thProgress');
      if (progEl) progEl.textContent = '0 / 0';
      return;
    }

    gallery.innerHTML = '';
    const fragment = document.createDocumentFragment();

    allApproved.list.forEach((m, idx) => {
      const card = document.createElement('article');
      card.className = 'exhibition-card' + (idx === allApproved.index ? ' active' : '');
      card.dataset.idx = idx;
      card.dataset.id = m.id;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Xem lời tri ân từ ${who(m)}`);

      // Header thẻ thiệp: Tag đối tượng + Con dấu 20-11
      const header = document.createElement('div');
      header.className = 'card-decor-header';

      const tag = document.createElement('div');
      tag.className = 'card-tag-pill ' + (m.recipient_type || 'thay_co');

      const icon = document.createElement('span');
      icon.className = 'card-tag-icon';
      icon.textContent = m.recipient_type === 'nguoi_truyen_cam_hung' ? '🌼' : (m.recipient_type === 'ban_be' ? '🌱' : '🪷');

      const label = document.createElement('span');
      label.className = 'card-tag-text';
      label.textContent = (RECIPIENTS[m.recipient_type] || RECIPIENTS.thay_co).label;

      tag.appendChild(icon);
      tag.appendChild(label);

      const seal = document.createElement('span');
      seal.className = 'card-seal-badge';
      seal.textContent = '20 · 11';

      header.appendChild(tag);
      header.appendChild(seal);
      card.appendChild(header);

      // Nội dung lời nhắn trích dẫn
      const quote = document.createElement('blockquote');
      quote.className = 'card-message';
      quote.textContent = '“' + m.message + '”';
      card.appendChild(quote);

      // Đường kẻ hoa văn phân cách
      const flourish = document.createElement('div');
      flourish.className = 'card-divider-flourish';
      flourish.setAttribute('aria-hidden', 'true');
      flourish.innerHTML = '<span class="fl-line"></span><span class="fl-heart">♡</span><span class="fl-line"></span>';
      card.appendChild(flourish);

      // Metadata người gửi, người nhận, thời gian
      const meta = document.createElement('div');
      meta.className = 'card-meta';

      const people = document.createElement('div');
      people.className = 'card-people';

      const senderRow = document.createElement('div');
      senderRow.className = 'person-row sender';
      const senderRole = document.createElement('span');
      senderRole.className = 'person-role';
      senderRole.textContent = 'Người gửi: ';
      const senderName = document.createElement('strong');
      senderName.className = 'person-name';
      senderName.textContent = who(m);
      senderRow.appendChild(senderRole);
      senderRow.appendChild(senderName);

      const recipientRow = document.createElement('div');
      recipientRow.className = 'person-row recipient';
      const recipRole = document.createElement('span');
      recipRole.className = 'person-role';
      recipRole.textContent = 'Gửi đến: ';
      const recipName = document.createElement('span');
      recipName.className = 'recipient-name';
      recipName.textContent = m.recipient_name || (RECIPIENTS[m.recipient_type] || RECIPIENTS.thay_co).label;
      recipientRow.appendChild(recipRole);
      recipientRow.appendChild(recipName);

      people.appendChild(senderRow);
      people.appendChild(recipientRow);
      meta.appendChild(people);

      if (m.created_at) {
        try {
          const d = new Date(m.created_at);
          const time = document.createElement('time');
          time.className = 'card-timestamp';
          time.textContent = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
          meta.appendChild(time);
        } catch (e) {}
      }

      card.appendChild(meta);

      // Tương tác khi click hoặc phím chọn thẻ
      card.addEventListener('click', () => {
        allApproved.index = idx;
        renderMomentSlide();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          allApproved.index = idx;
          renderMomentSlide();
        }
      });

      fragment.appendChild(card);
    });

    gallery.appendChild(fragment);
  }

  function renderMomentSlide() {
    if (!allApproved.list.length) return;
    const m = allApproved.list[allApproved.index % allApproved.list.length];
    
    // Cập nhật các elements tương thích ngược và bộ đếm
    const txtEl = $('#thTxt'), whoEl = $('#thWho'), toEl = $('#thTo'), timeEl = $('#thTime'), progEl = $('#thProgress');
    if (txtEl) txtEl.textContent = '“' + m.message + '”';
    if (whoEl) whoEl.textContent = who(m);
    if (toEl) toEl.textContent = 'Gửi đến: ' + toLabel(m);
    if (progEl) progEl.textContent = (allApproved.index + 1) + ' / ' + allApproved.list.length;
    
    if (timeEl && m.created_at) {
      try {
        const d = new Date(m.created_at);
        timeEl.textContent = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) { timeEl.textContent = ''; }
    }

    // Cập nhật trạng thái active cho card trong triển lãm và cuộn tới vị trí đó
    const gallery = $('#theaterGallery');
    if (gallery) {
      const cards = gallery.querySelectorAll('.exhibition-card');
      cards.forEach((c) => c.classList.remove('active'));
      const activeCard = gallery.querySelector(`.exhibition-card[data-idx="${allApproved.index}"]`);
      if (activeCard) {
        activeCard.classList.add('active');
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    // Làm nổi bật chiếc lá tương ứng trên cây
    nodes.forEach((g) => g.classList.remove('glow'));
    const g = nodes.get(m.id);
    if (g) {
      g.classList.add('glow');
    }
  }

  function nextMomentSlide() {
    if (!allApproved.list.length) return;
    allApproved.index = (allApproved.index + 1) % allApproved.list.length;
    renderMomentSlide();
  }

  function prevMomentSlide() {
    if (!allApproved.list.length) return;
    allApproved.index = (allApproved.index - 1 + allApproved.list.length) % allApproved.list.length;
    renderMomentSlide();
  }

  function toggleMomentPlay() {
    momentPlaying = !momentPlaying;
    const btn = $('#momentPlayBtn');
    if (btn) btn.textContent = momentPlaying ? '⏸ Tạm dừng' : '▶ Tiếp tục';
    
    clearInterval(momentAutoTimer);
    if (momentPlaying) {
      momentAutoTimer = setInterval(nextMomentSlide, 7000);
    }
  }

  function openMomentTheater() {
    momentTheaterOpen = true;
    theaterOverlay.hidden = false;
    document.body.classList.add('moment-active');

    // Nạp triển lãm toàn bộ thiệp
    renderTheaterGallery();

    // Vẽ mã QR Offline góc màn hình nếu chưa có
    const qrCanvasWrap = $('#theaterQrCanvas');
    if (qrCanvasWrap && !qrCanvasWrap.hasChildNodes()) {
      try {
        const url = 'https://tetsuya47.github.io/cay-tri-an-tay-nguyen/';
        const cv = document.createElement('canvas');
        window.CTTQR.draw(cv, url, 120, '#000000');
        qrCanvasWrap.appendChild(cv);
      } catch (e) { /* Bỏ qua nếu lỗi canvas */ }
    }

    renderMomentSlide();
    clearInterval(momentAutoTimer);
    momentPlaying = true;
    const btn = $('#momentPlayBtn');
    if (btn) btn.textContent = '⏸ Tạm dừng';
    momentAutoTimer = setInterval(nextMomentSlide, 7000);
  }

  function closeMomentTheater() {
    if (!momentTheaterOpen) return;
    momentTheaterOpen = false;
    theaterOverlay.hidden = true;
    document.body.classList.remove('moment-active');
    clearInterval(momentAutoTimer);
    nodes.forEach((g) => g.classList.remove('glow'));
  }

  // Lắng nghe sự kiện Khoảnh Khắc Cây Tri Ân
  const triggerBtn = $('#momentTriggerBtn');
  if (triggerBtn) triggerBtn.addEventListener('click', openMomentTheater);

  const prevBtn = $('#momentPrevBtn');
  if (prevBtn) prevBtn.addEventListener('click', prevMomentSlide);

  const nextBtn = $('#momentNextBtn');
  if (nextBtn) nextBtn.addEventListener('click', nextMomentSlide);

  const playBtn = $('#momentPlayBtn');
  if (playBtn) playBtn.addEventListener('click', toggleMomentPlay);

  const exitBtn = $('#momentExitBtn');
  if (exitBtn) exitBtn.addEventListener('click', closeMomentTheater);

  // Điều khiển bằng phím mũi tên trên bàn phím máy tính
  document.addEventListener('keydown', (e) => {
    if (!momentTheaterOpen) return;
    if (e.key === 'ArrowRight') nextMomentSlide();
    if (e.key === 'ArrowLeft') prevMomentSlide();
    if (e.key === ' ') {
      e.preventDefault();
      toggleMomentPlay();
    }
  });

  /* ---------- Khởi động ---------- */
  const legend = $('#legend');
  if (legend) {
    Object.keys(RECIPIENTS).forEach((k) => {
      const li = document.createElement('li');
      const i = document.createElement('i');
      i.style.background = RECIPIENTS[k].dot;
      li.appendChild(i);
      li.appendChild(document.createTextNode(RECIPIENTS[k].label));
      legend.appendChild(li);
    });
  }

  if (DEMO) {
    const banner = $('#demoBanner');
    if (banner) banner.hidden = false;
  }

  // Khởi tạo mã QR ở Header nếu có
  try {
    const qrEl = $('#qr');
    const url = 'https://tetsuya47.github.io/cay-tri-an-tay-nguyen/';
    const qrUrl = $('#qrUrl');
    if (qrUrl) qrUrl.textContent = url.replace(/^https?:\/\//, '');
    if (qrEl && !qrEl.hasChildNodes()) {
      const cv = document.createElement('canvas');
      window.CTTQR.draw(cv, url, 120, '#000000');
      qrEl.appendChild(cv);
    }
  } catch (e) { /* Bỏ qua */ }

  // Tự động mở chế độ Gala nếu URL có ?screen=1 hoặc ?moment=1
  if (SCREEN) {
    setTimeout(openMomentTheater, 300);
  }

  poll();
  schedule();
})();
