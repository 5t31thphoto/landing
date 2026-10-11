/* Mantis Synapse: TUNNEL > fractal, ported from src/main.cpp (fractalRender).
   An infinite dive into a self-similar point of a Julia set, rendered at the
   device's 160x120 buffer with the same cosine + opal palette. Tap for a new world. */
(function () {
  const cv = document.getElementById("synapseFractal");
  if (!cv) return;
  const LW = 160, LH = 120;
  cv.width = LW; cv.height = LH;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(LW, LH);
  const px = new Uint32Array(img.data.buffer);
  const buf = new Uint8Array(LW * LH);
  const pal = new Uint32Array(256), rgb = new Float32Array(256 * 3);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

  const PRESETS = [[-0.8, 0.156], [0.285, 0.01], [-0.4, 0.6], [-0.70176, -0.3842],
                   [0.355, 0.355], [-0.835, -0.2321], [-0.1, 0.651], [0.37, -0.1]];
  let t = 0, fx = 0, fy = 0, fs = 2.2 / 160, frot = 0, du = 0, colOff = 0, wraps = 0, tg = 0;
  let preset = 0, cTr = 1, cr0 = -0.8, ci0 = 0.156, crP = -0.8, ciP = 0.156;
  const MAXIT = 34, HUE = 160;

  function setPal(i, r, g, b) {
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
    r = r | 0; g = g | 0; b = b | 0;
    pal[i] = little ? (255 << 24) | (b << 16) | (g << 8) | r : (r << 24) | (g << 16) | (b << 8) | 255;
  }
  function palCosine(ar, ag, ab, br, bg, bb, cr, cg, cb, dr, dg, db, shift) {
    for (let i = 0; i < 256; i++) {
      const u = i / 255, ramp = u < 0.16 ? u / 0.16 : 1;
      const r = ar + br * Math.cos(6.2831853 * (cr * u + dr + shift));
      const g = ag + bg * Math.cos(6.2831853 * (cg * u + dg + shift));
      const b = ab + bb * Math.cos(6.2831853 * (cb * u + db + shift));
      setPal(i, clamp(r * ramp, 0, 1) * 255, clamp(g * ramp, 0, 1) * 255, clamp(b * ramp, 0, 1) * 255);
    }
  }
  const K = [[0, 115, 115], [93, 0, 93], [140, 255, 40], [0, 115, 115]];
  function palOpal(amt, sheen, tt, glint) {
    const band = sheen - Math.floor(sheen);
    for (let i = 1; i < 256; i++) {
      let r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
      const u = i / 255; let q = u * 3 + tt; q -= Math.floor(q / 3) * 3;
      const k = q | 0, f = q - k, br = 0.25 + 0.85 * u;
      const mr = (K[k][0] + (K[k + 1][0] - K[k][0]) * f) * br;
      const mg = (K[k][1] + (K[k + 1][1] - K[k][1]) * f) * br;
      const mb = (K[k][2] + (K[k + 1][2] - K[k][2]) * f) * br;
      r += (mr - r) * amt; g += (mg - g) * amt; b += (mb - b) * amt;
      let d = Math.abs(u - band); if (d > 0.5) d = 1 - d;
      const gl = d < 0.07 ? (1 - d / 0.07) * glint : 0;
      if (gl > 0) {
        const h = u * 6 + tt * 2;
        r += (128 + 127 * Math.cos(h)) * gl; g += (128 + 127 * Math.cos(h - 2.094)) * gl; b += (128 + 127 * Math.cos(h + 2.094)) * gl;
      }
      setPal(i, Math.min(255, r), Math.min(255, g), Math.min(255, b));
    }
  }
  function csq(ar, ai) {
    const m = Math.sqrt(ar * ar + ai * ai);
    const rr = Math.sqrt(Math.max(0, (m + ar) * 0.5));
    const ri = Math.sign(ai || 1) * Math.sqrt(Math.max(0, (m - ar) * 0.5));
    return [rr, ri];
  }

  function frame(dt) {
    t += dt;
    const level = 0.12 + 0.05 * Math.sin(t * 0.7);           // a quiet room
    cTr = Math.min(1, cTr + dt * 0.8);
    const tr = cTr * cTr * (3 - 2 * cTr);
    cr0 = crP + (PRESETS[preset][0] - crP) * tr;
    ci0 = ciP + (PRESETS[preset][1] - ciP) * tr;
    const cr = cr0 + 0.006 * Math.cos(t * 0.31), ci = ci0 + 0.006 * Math.sin(t * 0.23);

    let [wr, wi] = csq(1 - 4 * cr, -4 * ci);
    let zsr = (1 + wr) * 0.5, zsi = wi * 0.5;
    if (zsr * zsr + zsi * zsi < 0.25) { zsr = (1 - wr) * 0.5; zsi = -wi * 0.5; }
    const lr = 2 * zsr, li = 2 * zsi;
    let lAbs = Math.hypot(lr, li); const lArg = Math.atan2(li, lr);
    if (lAbs < 1.05) lAbs = 1.05;
    const TX = [zsr, -zsr], TY = [zsi, -zsi];
    for (let q = 1; q < 7 && TX.length < 15; q++) {
      const [pr, pi] = csq(TX[q] - cr, TY[q] - ci);
      if (TX.length < 15) { TX.push(pr); TY.push(pi); }
      if (TX.length < 15) { TX.push(-pr); TY.push(-pi); }
    }
    const nT = TX.length, S0 = 2.2 / 160;
    {
      let bd = 1e9, bi = tg;
      for (let k = 0; k < nT; k++) { const dx = TX[k] - fx, dy = TY[k] - fy, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = k; } }
      const cdx = TX[tg % nT] - fx, cdy = TY[tg % nT] - fy;
      if (bi !== tg && bd < 0.36 * (cdx * cdx + cdy * cdy)) tg = bi;
      tg %= nT;
    }
    const tx0 = TX[tg], ty0 = TY[tg];
    const pull = clamp(dt * 1.8, 0, 1);
    fx += (tx0 - fx) * pull; fy += (ty0 - fy) * pull;
    du += dt * (0.14 + level * 0.3);
    frot += 0.03 * dt;
    if (du >= 1) {
      const dxr = fx - tx0, dxi = fy - ty0, view = S0 * 160;
      if (dxr * dxr + dxi * dxi < view * view) {
        du -= 1; colOff += 9; wraps++;
        fx = tx0 + (dxr * lr - dxi * li); fy = ty0 + (dxr * li + dxi * lr);
        if (wraps % 10 === 0) { preset = (preset + 1 + ((Math.random() * 3) | 0)) % 8; crP = cr0; ciP = ci0; cTr = 0; }
      }
    }
    fs = S0 * Math.pow(lAbs, -du);
    if (fs < 3e-6) { du = 0; fx = tx0; fy = ty0; fs = S0; }
    const rotNow = frot - lArg * du;
    const c = Math.cos(rotNow), s = Math.sin(rotNow);
    const ux = c * fs, uy = s * fs, vx = -s * fs, vy = c * fs;
    const ox = fx - ux * 80 - vx * 60, oy = fy - uy * 80 - vy * 60;
    const ph = ((t * 40) | 0) + colOff;

    for (let y = 0; y < LH; y++) {
      const zr0 = ox + vx * y, zi0 = oy + vy * y, row = y * LW;
      for (let x = 0; x < LW; x++) {
        let zr = zr0 + ux * x, zi = zi0 + uy * x, trap = 10, trap2 = 100, k = 0;
        for (; k < MAXIT; k++) {
          const r2 = zr * zr, i2 = zi * zi;
          if (r2 + i2 > 16) break;
          zi = 2 * zr * zi + ci; zr = r2 - i2 + cr;
          const ax = zr < 0 ? -zr : zr, ay = zi < 0 ? -zi : zi;
          const tx = ax < ay ? ax : ay; if (tx < trap) trap = tx;
          const tp = (zr - 0.15) * (zr - 0.15) + zi * zi; if (tp < trap2) trap2 = tp;
        }
        let v;
        if (k < MAXIT) {
          const m = zr * zr + zi * zi;
          const fine = (clamp(1 - (m - 16) / (m + 16), 0, 1) * 12) | 0;
          v = 24 + ((k * 9 + fine + ((Math.sqrt(trap) * 110) | 0) + ph) & 127);
        } else v = 152 + ((((Math.sqrt(trap2) * 240) | 0) + ((trap * 40) | 0) - ph * 2) & 103);
        buf[row + x] = v;
      }
    }
    const h = HUE / 360 + 0.06;
    palCosine(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2, 1, 1 + level, 0.5 + h, 0.2 + h, 0.25 + h, t * 0.03);
    palOpal(0.25, 0.5, t * 0.04, 0.3);
    for (let i = 0; i < LW * LH; i++) px[i] = pal[buf[i]];
    ctx.putImageData(img, 0, 0);
  }

  // ---------- run ----------
  let running = false, last = 0;
  function loop(now) {
    if (!running) return;
    frame(Math.min(0.05, Math.max(0.001, (now - last) / 1000))); last = now;
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (reduce) return;
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    if (!on) running = false;
  }
  const host = cv.closest("button") || cv;
  host.addEventListener("click", () => {
    preset = (preset + 1) % 8; crP = cr0; ciP = ci0; cTr = 0;
    if (reduce) { cTr = 1; frame(0.001); }
  });
  for (let i = 0; i < 40; i++) frame(0.05);                   // start a little way into the dive
  if ("IntersectionObserver" in window) new IntersectionObserver(es => setRunning(es[0].isIntersecting)).observe(cv);
  else setRunning(true);
})();
