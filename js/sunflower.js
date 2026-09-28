/*
  sunflower-golden-angle
  Seeds placed with Vogel's model: seed n at angle n * theta, radius c * sqrt(n).
  https://github.com/evoluteur/sunflower-golden-angle
  (c) 2026 Olivier Giulieri
*/

// Same color schemes and backgrounds as golden-ratio's Sunflower tab.
// Seeds shade from h0 at the center to h1 at the rim.
const PALETTES = [
  { id: "sun", label: "Sun", h0: 48, h1: 8 },
  { id: "sea", label: "Sea", h0: 190, h1: 260 },
  { id: "forest", label: "Forest", h0: 70, h1: 150 },
  { id: "rose", label: "Rose", h0: 340, h1: 290 },
];
const BGS = [
  { id: "dark", label: "Dark", bg: "#1a212d", accent: "#ffa500" },
  { id: "light", label: "Light", bg: "#fbf6ea", accent: "#c26200" },
  { id: "clear", label: "Transparent", bg: null, accent: "#ffa500" },
];

function initSunflower() {
  const GOLDEN = 360 * (1 - 1 / ((1 + Math.sqrt(5)) / 2)); // 137.50776…
  const canvas = document.getElementById('flower');
  const ctx = canvas.getContext('2d');
  const angleIn = document.getElementById('angle');
  const countIn = document.getElementById('count');
  const petalsIn = document.getElementById('petals');
  const angleVal = document.getElementById('angleVal');
  const countVal = document.getElementById('countVal');
  const note = document.getElementById('note');
  const readout = document.getElementById('readout');
  const armBtns = [...document.querySelectorAll('#arms button')];
  const presetBtns = [...document.querySelectorAll('#presets button')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let arm = 0;
  const look = { palette: "sun", bg: "dark" };
  try {
    Object.assign(look, JSON.parse(localStorage.getItem("sunflower-settings") || "{}"));
  } catch (e) {}
  const saveLook = () => {
    try { localStorage.setItem("sunflower-settings", JSON.stringify(look)); } catch (e) {}
  };
  const pal = () => PALETTES.find(p => p.id === look.palette) || PALETTES[0];
  const bgOf = () => BGS.find(b => b.id === look.bg) || BGS[0];
  const hue = t => { const p = pal(); return p.h0 + (p.h1 - p.h0) * t; };
  // seed color, as in golden-ratio: hue by distance, slight odd/even shimmer
  const seedColor = (t, i) => {
    const l = bgOf().id === "light" ? 42 : 58;
    return `hsl(${hue(t).toFixed(0)} 78% ${l + (i % 2 ? 4 : -2)}%)`;
  };
  let shown = null; // number of seeds drawn during growth animation
  let anim = null;

  function resize(){
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function describe(a){
    const d = a - GOLDEN;
    if (Math.abs(d) < 0.005) return '<b>Golden angle.</b> Every new seed lands in the largest open gap, so the head fills evenly with no spokes.';
    const frac = a / 360;
    // find a close simple fraction
    let best = null;
    for (let q = 2; q <= 60; q++){
      const p = Math.round(frac * q);
      const err = Math.abs(frac - p / q) * 360;
      if (err < 0.02 && (!best || q < best.q)) best = {p, q};
    }
    if (best) return `<b>Rational: ${best.p}/${best.q} of a turn.</b> Seeds repeat every ${best.q} steps, so they stack into ${best.q} straight spokes with empty wedges between.`;
    if (Math.abs(d) < 0.5) return `<b>${d > 0 ? '+' : ''}${d.toFixed(3)}° off golden.</b> Close enough near the center, but the error accumulates and the outer seeds bend into curved spokes.`;
    return `<b>${d > 0 ? '+' : ''}${d.toFixed(2)}° off golden.</b> The angle is near a simple fraction of a turn, so seeds bunch into visible arms and leave gaps.`;
  }

  // Shapes for a head of N seeds, n of them grown, in a w x h box.
  // Shared by the on-screen canvas and the PNG / SVG downloads.
  function scene(w, h, n, N){
    const a = parseFloat(angleIn.value);
    const petals = petalsIn.checked;
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 * (petals ? 0.54 : 0.93);
    const c = R / Math.sqrt(N);
    const rad = a * Math.PI / 180;
    const out = { petals: [], seeds: [] };

    // petals: two staggered rings around the grown part of the head
    if (petals){
      const light = bgOf().id === 'light';
      const h0 = pal().h0;
      const gold = `hsl(${h0} 85% ${light ? 50 : 58}%)`;
      const deep = `hsl(${(h0 - 12 + 360) % 360} 75% ${light ? 38 : 44}%)`;
      const grownR = c * Math.sqrt(n);
      const k = 34;
      for (let ring = 0; ring < 2; ring++){
        const len = R * (ring === 0 ? 0.8 : 0.66);
        for (let i = 0; i < k; i++){
          const t = (i + ring * 0.5) * 2 * Math.PI / k;
          const d = grownR + c * 0.6 + len * 0.5;
          out.petals.push({
            x: cx + Math.cos(t) * d, y: cy + Math.sin(t) * d,
            rx: len * 0.5, ry: R * 0.085, rot: t,
            fill: ring === 0 ? deep : gold, alpha: ring === 0 ? 0.55 : 0.95,
          });
        }
      }
    }

    const accent = bgOf().accent;
    const dot = Math.max(0.8, c * 0.46);
    // order the k arms around the head so neighbouring arms alternate colour
    const armColor = {};
    if (arm){
      const base = arm * Math.floor(n / 2 / arm);
      const order = [];
      for (let m = 0; m < arm; m++){
        order.push([((base + m) * rad) % (2 * Math.PI), m]);
      }
      order.sort((p, q) => p[0] - q[0]);
      order.forEach(([, m], rank) => { armColor[m] = rank === 0 ? 2 : rank % 2; });
    }
    for (let i = 1; i <= n; i++){
      const r = c * Math.sqrt(i);
      const t = i * rad;
      let fill = seedColor(i / N, i), alpha = 1;
      if (arm){
        // every other arm stays lit, the rest fade; one arm in the accent color
        const k = armColor[i % arm];
        if (k === 2) fill = accent;
        alpha = k === 0 ? 0.22 : 1;
      }
      out.seeds.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t), r: dot, fill, alpha });
    }
    return out;
  }

  function paint(g, w, h, sc, bg){
    g.clearRect(0, 0, w, h);
    if (bg){
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    }
    for (const p of sc.petals){
      g.globalAlpha = p.alpha;
      g.fillStyle = p.fill;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.beginPath();
      g.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    for (const d of sc.seeds){
      g.globalAlpha = d.alpha;
      g.fillStyle = d.fill;
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  function draw(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const N = parseInt(countIn.value, 10);
    const n = shown == null ? N : Math.min(N, shown);
    paint(ctx, w, h, scene(w, h, n, N), bgOf().bg);
    readout.textContent = `n = ${n}   θ = ${parseFloat(angleIn.value).toFixed(3)}°   r = c·√n`;
  }

  // ------------------------------------------------------------ downloads

  function download(blob, name){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function fileName(){
    const a = parseFloat(angleIn.value).toFixed(3).replace('.', '_');
    return `sunflower-${a}-${countIn.value}-${look.palette}` + (arm ? `-arms${arm}` : '');
  }

  function exportPNG(){
    const size = 2000, N = parseInt(countIn.value, 10);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    paint(c.getContext('2d'), size, size, scene(size, size, N, N), bgOf().bg);
    c.toBlob(b => download(b, fileName() + '.png'));
  }

  function exportSVG(){
    const size = 1000, N = parseInt(countIn.value, 10);
    const sc = scene(size, size, N, N);
    const f = v => +v.toFixed(2);
    const op = a => a < 1 ? ` fill-opacity="${a}"` : '';
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
    out += `<title>Sunflower, ${parseFloat(angleIn.value).toFixed(3)}° divergence angle, ${N} seeds</title>`;
    if (bgOf().bg) out += `<rect width="${size}" height="${size}" fill="${bgOf().bg}"/>`;
    for (const p of sc.petals){
      out += `<ellipse cx="0" cy="0" rx="${f(p.rx)}" ry="${f(p.ry)}" fill="${p.fill}"${op(p.alpha)} transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.rot * 180 / Math.PI)})"/>`;
    }
    for (const d of sc.seeds){
      out += `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="${d.fill}"${op(d.alpha)}/>`;
    }
    out += '</svg>';
    download(new Blob([out], { type: 'image/svg+xml' }), fileName() + '.svg');
  }

  function renderLook(){
    document.querySelectorAll('#palettes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.pal === look.palette ? 'true' : 'false'));
    document.querySelectorAll('#backgrounds button').forEach(b => b.setAttribute('aria-pressed', b.dataset.bg === look.bg ? 'true' : 'false'));
    canvas.parentElement.classList.toggle('clear', !bgOf().bg);
    canvas.parentElement.dataset.bg = look.bg;
  }

  function sync(){
    const a = parseFloat(angleIn.value);
    angleVal.textContent = a.toFixed(3) + '°';
    countVal.textContent = countIn.value;
    note.innerHTML = describe(a);
    presetBtns.forEach(b => b.setAttribute('aria-pressed', Math.abs(parseFloat(b.dataset.a) - a) < 0.0006 ? 'true' : 'false'));
    armBtns.forEach(b => b.setAttribute('aria-pressed', parseInt(b.dataset.k, 10) === arm ? 'true' : 'false'));
    draw();
  }

  angleIn.addEventListener('input', sync);
  countIn.addEventListener('input', sync);
  petalsIn.addEventListener('change', draw);
  presetBtns.forEach(b => b.addEventListener('click', () => { angleIn.value = b.dataset.a; sync(); }));
  armBtns.forEach(b => b.addEventListener('click', () => { arm = parseInt(b.dataset.k, 10); sync(); }));
  document.querySelectorAll('#palettes button').forEach(b => b.addEventListener('click', () => { look.palette = b.dataset.pal; saveLook(); renderLook(); draw(); }));
  document.querySelectorAll('#backgrounds button').forEach(b => b.addEventListener('click', () => { look.bg = b.dataset.bg; saveLook(); renderLook(); draw(); }));

  document.getElementById('export-png').addEventListener('click', exportPNG);
  document.getElementById('export-svg').addEventListener('click', exportSVG);

  document.getElementById('grow').addEventListener('click', () => {
    if (anim) cancelAnimationFrame(anim);
    const N = parseInt(countIn.value, 10);
    if (reduceMotion){ shown = null; draw(); return; }
    const dur = 3200, start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      shown = Math.max(1, Math.round(N * (1 - Math.pow(1 - p, 2))));
      draw();
      if (p < 1) anim = requestAnimationFrame(step);
      else { shown = null; anim = null; draw(); }
    };
    anim = requestAnimationFrame(step);
  });

  new MutationObserver(draw).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  new ResizeObserver(resize).observe(canvas);
  const themeLink = document.getElementById('omg-theme-css');
  if (themeLink) themeLink.addEventListener('load', draw);

  angleIn.value = GOLDEN.toFixed(5);
  presetBtns[0].dataset.a = GOLDEN.toFixed(5);
  renderLook();
  sync();
  resize();
}
