/*
  sunflower-golden-angle
  Seeds placed with Vogel's model: seed n at angle n * theta, radius c * sqrt(n).
  https://github.com/evoluteur/sunflower-golden-angle
  (c) 2026 Olivier Giulieri
*/

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
  let shown = null; // number of seeds drawn during growth animation
  let anim = null;

  function css(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

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

  function draw(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const a = parseFloat(angleIn.value);
    const N = parseInt(countIn.value, 10);
    const n = shown == null ? N : Math.min(N, shown);
    const petals = petalsIn.checked;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = css('--sf-canvas');
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 * (petals ? 0.54 : 0.93);
    const c = R / Math.sqrt(N);
    const rad = a * Math.PI / 180;

    // petals: two staggered rings, placed with the same divergence angle
    if (petals){
      const gold = css('--sf-gold'), deep = css('--sf-gold-deep');
      const grownR = c * Math.sqrt(n);
      const k = 34;
      for (let ring = 0; ring < 2; ring++){
        ctx.fillStyle = ring === 0 ? deep : gold;
        ctx.globalAlpha = ring === 0 ? 0.55 : 0.95;
        for (let i = 0; i < k; i++){
          const t = (i + ring * 0.5) * 2 * Math.PI / k;
          const len = R * (ring === 0 ? 0.8 : 0.66);
          const px = cx + Math.cos(t) * (grownR + c * 0.6 + len * 0.5);
          const py = cy + Math.sin(t) * (grownR + c * 0.6 + len * 0.5);
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(t);
          ctx.beginPath();
          ctx.ellipse(0, 0, len * 0.5, R * 0.085, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }

    const seed = css('--sf-seed'), hi = css('--sf-seed-hi');
    const armA = css('--sf-arm-a'), armB = css('--sf-arm-b');
    const dot = Math.max(0.8, c * 0.46);
    // order the k arms around the head so neighbouring arms alternate colour
    const armColor = {};
    if (arm){
      const base = arm * Math.floor(n / 2 / arm);
      const order = [];
      for (let m = 0; m < arm; m++){
        const t = ((base + m) * rad) % (2 * Math.PI);
        order.push([t, m]);
      }
      order.sort((p, q) => p[0] - q[0]);
      order.forEach(([, m], rank) => { armColor[m] = rank === 0 ? 2 : rank % 2; });
    }
    for (let i = 1; i <= n; i++){
      const r = c * Math.sqrt(i);
      const t = i * rad;
      const x = cx + r * Math.cos(t), y = cy + r * Math.sin(t);
      if (arm){
        const k = armColor[i % arm];
        ctx.fillStyle = k === 2 ? armB : (k === 1 ? armA : seed);
        ctx.globalAlpha = k === 0 ? 0.3 : 1;
      } else {
        ctx.fillStyle = i / n > 0.985 ? hi : seed;
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    readout.textContent = `n = ${n}   θ = ${a.toFixed(3)}°   r = c·√n`;
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
  sync();
  resize();
}
