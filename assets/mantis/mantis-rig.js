/* The Mantis: idle rig ported from Mantis Synapse (src/mantis.cpp).
   Same parts, joints, forward kinematics and leg IK as the device; idle,
   wave, blink, glance and pet behaviours. */
(function () {
  const cv = document.getElementById("mantisRig");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const DEG = Math.PI / 180;
  const BASE = cv.dataset.base || "assets/mantis/";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // sprite sizes / pivots in rig units (from mantis_rig.h)
  const P = {
    torso:   { w: 76,  h: 124, pvx: 38.00, pvy: 120.65 },
    head:    { w: 123, h: 95,  pvx: 61.29, pvy: 89.56 },
    abdomen: { w: 76,  h: 117, pvx: 38.00, pvy: 5.89 },
    arm:     { w: 55,  h: 65,  pvx: 46.67, pvy: 10.06 },
    scythe:  { w: 78,  h: 69,  pvx: 4.22,  pvy: 21.75 },
    claw:    { w: 29,  h: 69,  pvx: 5.00,  pvy: 10.00 },
    thigh:   { w: 50,  h: 53,  pvx: 41.67, pvy: 6.73 },
    shin:    { w: 33,  h: 76,  pvx: 20.05, pvy: 5.04 }
  };
  const J = {
    neck: [38.00, 14.24], shL: [7.52, 26.81], shR: [68.48, 26.81],
    hipFL: [27.56, 113.11], hipFR: [48.44, 113.11], hipBL: [21.71, 103.05], hipBR: [54.29, 103.05],
    abd: [50.95, 100.54], eyeL: [37.36, 59.43], eyeR: [86.48, 59.43], mouth: [61.29, 82.44],
    armEnd: [34.17, 57.03], scyTip: [61.56, 66.91], clawTip: [12.56, 66.91], hinge: [54.00, 10.00],
    thighEnd: [8.33, 43.75], shinEnd: [18.38, 73.90]
  };
  const SKIN = "rgb(183,225,150)";

  const IMG = {};
  const names = Object.keys(P);
  let loaded = 0;
  names.forEach(n => {
    const im = new Image();
    im.onload = () => { if (++loaded === names.length) start(); };
    im.src = BASE + n + ".png";
    IMG[n] = im;
  });

  function bone(n, mirror) {
    const p = P[n];
    return { img: IMG[n], w: p.w, h: p.h, pvx: mirror ? p.w - p.pvx : p.pvx, pvy: p.pvy, opvx: p.pvx, mirror: !!mirror };
  }
  let B;

  // ---------- layout ----------
  let W = 0, H = 0, Z = 1, RX = 0, RY = 0, dpr = 1;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = W * 1.14;
    cv.style.height = H + "px";
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    Z = W / 300; RX = W / 2; RY = H * 0.69;
  }

  // ---------- kinematics ----------
  function fk(f, b, lx, ly, mir) {
    if (mir) lx = b.w - lx;
    const dx = (lx - b.pvx) * f.zx, dy = (ly - b.pvy) * f.zy;
    const c = Math.cos(f.a * DEG), s = Math.sin(f.a * DEG);
    return [f.x + c * dx - s * dy, f.y + s * dx + c * dy];
  }
  function boneAngle(b, ex, ey, mir) {
    const ex2 = mir ? b.w - ex : ex;
    return Math.atan2(ey - b.pvy, ex2 - b.pvx) / DEG;
  }
  function blit(b, f) {
    ctx.save();
    ctx.translate(RX + f.x * Z, RY + f.y * Z);
    ctx.rotate(f.a * DEG);
    ctx.scale(f.zx * Z, f.zy * Z);
    if (b.mirror) { ctx.scale(-1, 1); ctx.drawImage(b.img, -b.opvx, -b.pvy, b.w, b.h); }
    else ctx.drawImage(b.img, -b.pvx, -b.pvy, b.w, b.h);
    ctx.restore();
  }
  const scr = (x, y) => [RX + x * Z, RY + y * Z];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ---------- pose ----------
  const KEYS = ["x", "y", "torso", "head", "hx", "hy", "abd", "sq", "mouth", "strain"];
  function blank() { return { x: 0, y: 0, torso: 0, head: 0, hx: 0, hy: 0, abd: 0, sq: 0, mouth: 0, strain: 0, au: [0, 0], as: [0, 0], claw: [0.4, 0.4] }; }
  function lerpPose(a, b, k) {
    const o = blank();
    KEYS.forEach(n => o[n] = a[n] + (b[n] - a[n]) * k);
    for (let i = 0; i < 2; i++) {
      o.au[i] = a.au[i] + (b.au[i] - a.au[i]) * k;
      o.as[i] = a.as[i] + (b.as[i] - a.as[i]) * k;
      o.claw[i] = a.claw[i] + (b.claw[i] - a.claw[i]) * k;
    }
    return o;
  }
  const dip = f => 0.5 + 0.5 * Math.cos(6.2831853 * f);

  let t = 0, look = 0, lookT = 0;
  function evalMove(m, b) {
    const p = blank(), f = b - Math.floor(b), sin = Math.sin;
    if (m === "idle") {
      p.y = sin(t * 1.6) * 1.4;
      p.sq = sin(t * 1.6) * 0.25;
      p.head = look * 16 + sin(t * 0.7) * 4;
      p.hx = look * 3;
      p.torso = look * 4 + sin(t * 0.5) * 1.5;
      p.abd = sin(t * 1.1) * 5;
      p.as[0] = p.as[1] = sin(t * 2.7) * 5;
      p.au[0] = p.au[1] = 3 + 2 * sin(t * 1.3);
      p.claw[0] = 0.3 + 0.1 * sin(t * 0.9); p.claw[1] = 0.3 + 0.1 * sin(t * 0.8 + 1);
    } else {                                   // wave_l / wave_r
      const a = m === "wave_l" ? 0 : 1, d = a ? 1 : -1;
      p.au[a] = 150 + 6 * sin(6.2831853 * b); p.strain = 1;
      p.as[a] = -15 + 40 * sin(6.2831853 * b);
      p.au[1 - a] = 12; p.as[1 - a] = 6 * dip(f);
      p.torso = 6 * d; p.head = 10 * d + 5 * sin(3.14159 * b); p.x = 5 * d;
      p.y = 3.5 * dip(f); p.mouth = 0.25;
      p.abd = -10 * d;
    }
    return p;
  }

  // ---------- state ----------
  let move = "idle", prev = "idle", blend = 1, idleBeat = 0, idleWaveT = 4;
  let blinkT = 1.5, blink = 0, happy = 0, acc = 0, mouthOpen = 0;
  let glanceT = 3, glanceHold = 0, pointerAt = -1e9;
  const flipped = [false, false];
  const fx = [];
  function setMove(m) { if (m === move) return; prev = move; move = m; blend = 0; }

  // ---------- frame ----------
  function frame(dt) {
    t += dt;
    // gaze: follow the mouse, otherwise glance around now and then
    if (performance.now() - pointerAt > 2500) {
      glanceT -= dt;
      if (glanceT < 0) {
        if (glanceHold > 0) { lookT = 0; glanceHold = 0; glanceT = 3 + Math.random() * 4; }
        else { lookT = (Math.random() * 2 - 1) * 0.7; glanceHold = 1; glanceT = 1.2 + Math.random() * 1.5; }
      }
    }
    look += (lookT - look) * clamp(dt * 6, 0, 1);

    idleBeat += dt * 0.8;
    idleWaveT -= dt;
    if (idleWaveT < 0 && move === "idle") { setMove(Math.random() < 0.5 ? "wave_l" : "wave_r"); idleWaveT = 2.5; }
    else if (idleWaveT < 0) { setMove("idle"); idleWaveT = 7 + Math.random() * 6; }

    const pa = evalMove(prev, idleBeat), pb = evalMove(move, idleBeat);
    blend = Math.min(1, blend + dt * 3.2);
    const k = blend * blend * (3 - 2 * blend);
    const p = lerpPose(pa, pb, k);

    acc *= Math.exp(-dt * 7);
    p.y += 3 * acc; p.sq += 0.7 * acc; p.hy += 1.5 * acc;
    if (happy > 0) { happy -= dt; p.y -= 4 * Math.sin(t * 18) * Math.min(1, happy); p.mouth = Math.max(p.mouth, 0.35); }

    blinkT -= dt;
    if (blinkT < 0) { blink = 1; blinkT = 2 + Math.random() * 3; }
    blink = blink > 0 ? blink - dt * 7 : 0;
    const lid = blink > 0.5 ? (1 - blink) * 2 : blink * 2;

    mouthOpen += (p.mouth - mouthOpen) * clamp(dt * (p.mouth > mouthOpen ? 45 : 30), 0, 1);

    draw(p, lid, dt);
  }

  function draw(p, lid, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // floor glow
    const fy = RY + 88 * Z;
    const g = ctx.createRadialGradient(RX, fy, 2, RX, fy, 120 * Z);
    g.addColorStop(0, "rgba(0,165,165,0.42)"); g.addColorStop(1, "rgba(0,165,165,0)");
    ctx.save(); ctx.translate(0, fy); ctx.scale(1, 0.16); ctx.translate(0, -fy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(RX, fy, 120 * Z, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    const T = B.torso;
    const sq = clamp(p.sq, -0.8, 1.5);
    const tf = { x: p.x, y: p.y, a: p.torso, zx: 1 + sq * 0.05, zy: 1 - sq * 0.075 };
    const hipN = ["hipBL", "hipFL", "hipFR", "hipBR"];
    const hip = hipN.map(n => fk(tf, T, J[n][0], J[n][1]));
    const sh = [fk(tf, T, J.shL[0], J.shL[1]), fk(tf, T, J.shR[0], J.shR[1])];
    const nk = fk(tf, T, J.neck[0], J.neck[1]);
    const ab = fk(tf, T, J.abd[0], J.abd[1]);

    blit(B.abd, { x: ab[0], y: ab[1], a: -48 + p.abd + p.torso * 0.5, zx: 1, zy: 1 });

    // legs: 2-bone IK with planted feet
    const footBx = [-62, -34, 34, 62], floorY = 85;
    const L1 = Math.hypot(J.thighEnd[0] - P.thigh.pvx, J.thighEnd[1] - P.thigh.pvy);
    const L2 = Math.hypot(J.shinEnd[0] - P.shin.pvx, J.shinEnd[1] - P.shin.pvy);
    [0, 3, 1, 2].forEach(i => {
      const right = i >= 2;
      let fX = footBx[i], fY = floorY;
      const dx = fX - hip[i][0], dy = fY - hip[i][1];
      let d = Math.hypot(dx, dy);
      const reach = (L1 + L2) * 0.995;
      if (d > reach) { fX = hip[i][0] + dx / d * reach; fY = hip[i][1] + dy / d * reach; d = reach; }
      if (d < Math.abs(L1 - L2) + 1) d = Math.abs(L1 - L2) + 1;
      const th = Math.atan2(fY - hip[i][1], fX - hip[i][0]);
      const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const ka = right ? th - al : th + al;
      const kX = hip[i][0] + Math.cos(ka) * L1, kY = hip[i][1] + Math.sin(ka) * L1;
      const TH = right ? B.thiR : B.thiL, SH = right ? B.shiR : B.shiL;
      const thRest = boneAngle(TH, J.thighEnd[0], J.thighEnd[1], right);
      const shRest = boneAngle(SH, J.shinEnd[0], J.shinEnd[1], right);
      const shA = Math.atan2(fY - kY, fX - kX) / DEG;
      blit(TH, { x: hip[i][0], y: hip[i][1], a: ka / DEG - thRest, zx: 1, zy: 1 });
      blit(SH, { x: kX, y: kY, a: shA - shRest, zx: 1, zy: 1 });
    });

    blit(T, tf);

    const hf = { x: nk[0] + p.hx, y: nk[1] + p.hy, a: p.torso + p.head, zx: 1 - sq * 0.03, zy: 1 + sq * 0.02 };

    // arms: upper arm, hook, femur
    for (let a = 0; a < 2; a++) {
      const r = a === 1, sgn = r ? -1 : 1;
      const AR = r ? B.armR : B.armL, SC = r ? B.scyR : B.scyL, CL = r ? B.clawR : B.clawL;
      const uf = { x: sh[a][0], y: sh[a][1], a: p.torso + sgn * p.au[a], zx: 1, zy: 1 };
      const e = fk(uf, AR, J.armEnd[0], J.armEnd[1], r);
      const scf = { x: e[0], y: e[1], a: uf.a + sgn * p.as[a], zx: 1, zy: 1 };
      const ny = Math.cos(scf.a * DEG);
      if (p.strain > 0.5) flipped[a] = false;
      else if (!flipped[a] && ny < -0.45) flipped[a] = true;
      else if (flipped[a] && ny > -0.1) flipped[a] = false;
      const fz = flipped[a] ? -1 : 1;
      scf.zy = fz;
      const hg = fk(scf, SC, J.hinge[0], J.hinge[1], r);
      const clf = { x: hg[0], y: hg[1], a: scf.a + fz * sgn * (0.4 - clamp(p.claw[a], 0, 1)) * 112, zx: 1, zy: fz };
      blit(AR, uf);
      blit(CL, clf);
      blit(SC, scf);
    }
    blit(B.head, hf);
    drawFace(hf, lid);
    drawFx(dt);
  }

  function drawFace(hf, lid) {
    const hb = B.head, zs = hf.zx * Z;
    const eyes = [fk(hf, hb, J.eyeL[0], J.eyeL[1]), fk(hf, hb, J.eyeR[0], J.eyeR[1])];
    const isHappy = happy > 0.2;
    eyes.forEach(ep => {
      const [sx, sy] = scr(ep[0], ep[1]);
      const rx = 13.5 * zs, ry = 15.5 * zs;
      if (isHappy) {
        ctx.fillStyle = SKIN;
        ctx.beginPath(); ctx.ellipse(sx, sy, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2); ctx.fill();
        const w = rx - 2;
        ctx.strokeStyle = "rgb(20,50,25)"; ctx.lineWidth = 2.6 * zs; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(sx - w, sy + 3 * zs); ctx.lineTo(sx, sy - ry / 3); ctx.lineTo(sx + w, sy + 3 * zs); ctx.stroke();
      } else if (lid > 0.02) {
        ctx.save();
        ctx.beginPath(); ctx.ellipse(sx, sy, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2); ctx.clip();
        const cut = sy - ry - 1.5 + (2 * ry + 3) * lid;
        const sag = ry * 0.25 * (1 - lid);
        ctx.fillStyle = SKIN;
        ctx.beginPath();
        ctx.moveTo(sx - rx - 3, sy - ry - 3); ctx.lineTo(sx + rx + 3, sy - ry - 3);
        ctx.lineTo(sx + rx + 3, cut); ctx.quadraticCurveTo(sx, cut + 2 * sag, sx - rx - 3, cut);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgb(20,45,25)"; ctx.lineWidth = Math.max(1, 1.2 * zs);
        ctx.beginPath(); ctx.moveTo(sx + rx + 3, cut); ctx.quadraticCurveTo(sx, cut + 2 * sag, sx - rx - 3, cut); ctx.stroke();
        ctx.restore();
      }
    });
    if (isHappy || acc > 0.6) {
      const a = isHappy ? 1 : 0.5;
      ctx.fillStyle = `rgb(255,${Math.round(170 - a * 40)},${Math.round(190 - a * 30)})`;
      [38, 84].forEach(bx => {
        const c = fk(hf, hb, bx, 79); const [sx, sy] = scr(c[0], c[1]);
        ctx.beginPath(); ctx.ellipse(sx, sy, 5 * zs, 2.5 * zs, 0, 0, Math.PI * 2); ctx.fill();
      });
    }
    const mo = mouthOpen;
    if (mo > 0.06) {
      const m = fk(hf, hb, J.mouth[0], J.mouth[1] - 1); const [sx, sy] = scr(m[0], m[1]);
      const mw = Math.max(2, (7 - 2 * mo) * zs), mh = Math.max(1, (1.5 + 12 * mo) * zs);
      const Y = sy + mh / 3;
      ctx.fillStyle = "rgb(30,110,50)"; ctx.beginPath(); ctx.ellipse(sx, Y, mw + 2, mh + 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgb(40,8,22)"; ctx.beginPath(); ctx.ellipse(sx, Y, mw, mh, 0, 0, Math.PI * 2); ctx.fill();
      if (mh > 4) { ctx.fillStyle = "rgb(210,70,100)"; ctx.beginPath(); ctx.ellipse(sx, Y + mh / 2, mw * 2 / 3, mh / 3 + 1, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  // little hearts when you pet him
  function heart(x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#ff4fb0";
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9);
    ctx.fill(); ctx.restore();
  }
  function drawFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life -= dt; if (f.life <= 0) { fx.splice(i, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 10 * dt;
      heart(f.x, f.y, f.s, Math.min(1, f.life * 1.6));
    }
  }

  function pet(x, y) {
    const hx = RX, hy = RY - 150 * Z, r = 60 * Z + 20;
    const onHead = x === undefined || (x - hx) ** 2 + (y - hy) ** 2 < r * r;
    if (x === undefined) { x = hx; y = hy - 30 * Z; }
    if (onHead) {
      happy = 1.6; acc = 1;
      for (let i = 0; i < 4; i++) fx.push({ x, y, vx: (Math.random() * 2 - 1) * 40, vy: -40 - Math.random() * 50, s: 5 + Math.random() * 4, life: 1.1 + Math.random() * 0.5 });
    } else acc = 0.7;
    if (reduce) { frame(0.001); setTimeout(() => { happy = 0; acc = 0; frame(0.001); }, 1600); }
  }

  // ---------- run ----------
  let last = 0, running = false, visible = true;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    frame(dt);
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (reduce) return;
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    if (!on) running = false;
  }

  function start() {
    B = {
      torso: bone("torso"), head: bone("head"), abd: bone("abdomen"),
      armL: bone("arm"), armR: bone("arm", 1), scyL: bone("scythe"), scyR: bone("scythe", 1),
      clawL: bone("claw"), clawR: bone("claw", 1),
      thiL: bone("thigh"), thiR: bone("thigh", 1), shiL: bone("shin"), shiR: bone("shin", 1)
    };
    layout();
    window.addEventListener("resize", () => { layout(); if (reduce) frame(0.001); });
    const host = cv.closest("button") || cv;
    host.addEventListener("click", e => {
      const rc = cv.getBoundingClientRect();
      if (e.detail === 0) pet(); else pet(e.clientX - rc.left, e.clientY - rc.top);
    });
    window.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const rc = cv.getBoundingClientRect();
      lookT = clamp((e.clientX - (rc.left + rc.width / 2)) / (window.innerWidth * 0.35), -1, 1);
      pointerAt = performance.now();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; setRunning(visible); }).observe(cv);
    }
    cv.classList.add("ready");
    if (reduce) frame(0.001); else setRunning(true);
  }
})();
