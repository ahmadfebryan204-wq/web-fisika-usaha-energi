// ============================================================================
// PRAKTIKUM 04 - USAHA DAN ENERGI: SEPEDA DI JALAN MENURUN
// Interactive Physics Simulation & Two-Way Energy/Variable Calculator
// ============================================================================

const state = {
  m: 80,        // Massa total (kg)
  g: 10,        // Percepatan gravitasi (m/s^2)
  h1: 4.2,      // Ketinggian puncak (m)
  v1: 4,        // Kelajuan di puncak (m/s)
  v2: 10,       // Kelajuan di dasar sebelum direm (m/s)
  v3: 5,        // Kelajuan akhir setelah direm (m/s)

  // Energies & Work (Joule)
  EP1: 3360,
  EK1: 640,
  EM1: 4000,
  Wg: 3360,
  EK2: 4000,
  EK3: 1000,

  // Animation state
  progress: 0,      // 0 to 100 along track
  isPlaying: false,
  simSpeed: 1.0,
  showStaticPoses: true,
  wheelAngle: 0,
  lastTimestamp: 0,
  trials: []
};

// Formatters (Indonesian locale style)
function fmtNum(val, maxDec = 2) {
  if (!Number.isFinite(val)) return "0";
  const rounded = Math.round(val * Math.pow(10, maxDec)) / Math.pow(10, maxDec);
  return rounded.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDec
  });
}

function fmtInput(val, maxDec = 2) {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * Math.pow(10, maxDec)) / Math.pow(10, maxDec);
}

// ============================================================================
// PHYSICS ENGINE & TWO-WAY SYNCHRONIZATION
// ============================================================================

function computeFromPhysical() {
  state.m = Math.max(0.1, Number(state.m) || 80);
  state.g = Math.max(0.1, Number(state.g) || 10);
  state.h1 = Math.max(0, Number(state.h1) || 0);
  state.v1 = Math.max(0, Number(state.v1) || 0);
  state.v3 = Math.max(0, Number(state.v3) || 0);

  state.EP1 = state.m * state.g * state.h1;
  state.EK1 = 0.5 * state.m * state.v1 * state.v1;
  state.EM1 = state.EP1 + state.EK1;

  state.Wg = state.EP1; // Wg = Ep1 - Ep2 = m * g * h1 - 0
  state.EK2 = state.EK1 + state.Wg;
  state.v2 = Math.sqrt((2 * state.EK2) / state.m);

  state.EK3 = 0.5 * state.m * state.v3 * state.v3;
}

// Sync all DOM inputs, step-by-step solutions, and telemetry
function updateUI(skipActiveInputId = null) {
  const setVal = (id, val, dec = 2) => {
    if (skipActiveInputId === id) return;
    const el = document.getElementById(id);
    if (el) el.value = fmtInput(val, dec);
  };

  // Physical inputs & sliders
  setVal("inpMass", state.m, 1);
  setVal("rngMass", state.m, 1);
  setVal("inpHeight", state.h1, 2);
  setVal("rngHeight", state.h1, 2);
  setVal("inpV1", state.v1, 2);
  setVal("rngV1", state.v1, 2);
  setVal("inpV3", state.v3, 2);
  setVal("rngV3", state.v3, 2);
  setVal("inpG", state.g, 2);
  setVal("inpV2", state.v2, 2);

  // Direct Energy & Work inputs
  setVal("inpEP1", state.EP1, 1);
  setVal("inpEK1", state.EK1, 1);
  setVal("inpEM1", state.EM1, 1);
  setVal("inpEK3", state.EK3, 1);
  setVal("inpWg", state.Wg, 1);

  // Warning if v3 > v2
  const warnEl = document.getElementById("physicsWarning");
  if (state.v3 > state.v2 + 0.001) {
    warnEl.hidden = false;
    warnEl.textContent = `Catatan Fisika: Kelajuan akhir setelah direm (v3 = ${fmtNum(state.v3)} m/s) lebih besar dari kelajuan di dasar sebelum direm (v2 = ${fmtNum(state.v2)} m/s). Dalam kondisi direm, nilai v3 seharusnya lebih kecil atau sama dengan v2.`;
  } else {
    warnEl.hidden = true;
  }

  // Update 3 Phase Cards below canvas
  document.getElementById("card1H").textContent = `${fmtNum(state.h1)} m`;
  document.getElementById("card1V").textContent = `${fmtNum(state.v1)} m/s`;
  document.getElementById("card1EP").textContent = `${fmtNum(state.EP1)} J`;
  document.getElementById("card1EK").textContent = `${fmtNum(state.EK1)} J`;

  document.getElementById("card2Wg").textContent = `${fmtNum(state.Wg)} J`;
  document.getElementById("card2V2").textContent = `${fmtNum(state.v2)} m/s`;
  document.getElementById("card2EK2").textContent = `${fmtNum(state.EK2)} J`;

  document.getElementById("card3V3").textContent = `${fmtNum(state.v3)} m/s`;
  document.getElementById("card3EK3").textContent = `${fmtNum(state.EK3)} J`;

  // Update Problem Statement text
  document.getElementById("txtMass").textContent = `${fmtNum(state.m)} kg`;
  document.getElementById("txtV1").textContent = `${fmtNum(state.v1)} m/s`;
  document.getElementById("txtH1").textContent = `${fmtNum(state.h1)} m`;
  document.getElementById("txtV3").textContent = `${fmtNum(state.v3)} m/s`;
  document.getElementById("txtG").textContent = fmtNum(state.g);

  // Update "Diketahui" list
  document.getElementById("dikM").textContent = `${fmtNum(state.m)} kg`;
  document.getElementById("dikG").textContent = `${fmtNum(state.g)} m/s²`;
  document.getElementById("dikH1").textContent = `${fmtNum(state.h1)} m`;
  document.getElementById("dikV1").textContent = `${fmtNum(state.v1)} m/s`;
  document.getElementById("dikV3").textContent = `${fmtNum(state.v3)} m/s`;

  // Intermediate values for step-by-step display (matching the screenshot format)
  const halfM = 0.5 * state.m;
  const v1Sq = state.v1 * state.v1;
  const v2Sq = (2 * state.EK2) / state.m;
  const v3Sq = state.v3 * state.v3;

  // a.1 Ep1
  document.getElementById("mathEp1").innerHTML = `
    <div>Ep1 = m × g × h1</div>
    <div>Ep1 = ${fmtNum(state.m)} × ${fmtNum(state.g)} × ${fmtNum(state.h1)}</div>
    <div class="math-result">Ep1 = <strong>${fmtNum(state.EP1)} J</strong></div>
  `;

  // a.2 Ek1
  document.getElementById("mathEk1").innerHTML = `
    <div>Ek1 = 1/2 × m × v1²</div>
    <div>Ek1 = 1/2 × ${fmtNum(state.m)} × ${fmtNum(state.v1)}²</div>
    <div>Ek1 = ${fmtNum(halfM)} × ${fmtNum(v1Sq)}</div>
    <div class="math-result">Ek1 = <strong>${fmtNum(state.EK1)} J</strong></div>
  `;

  // a.3 Em1
  document.getElementById("mathEm1").innerHTML = `
    <div>Em1 = Ep1 + Ek1</div>
    <div>Em1 = ${fmtNum(state.EP1)} + ${fmtNum(state.EK1)}</div>
    <div class="math-result">Em1 = <strong>${fmtNum(state.EM1)} J</strong></div>
  `;

  // b.1 Wg
  document.getElementById("mathWg").innerHTML = `
    <div>Wg = Ep1 - Ep2</div>
    <div>Wg = ${fmtNum(state.EP1)} - (${fmtNum(state.m)} × ${fmtNum(state.g)} × 0)</div>
    <div>Wg = ${fmtNum(state.EP1)} - 0</div>
    <div class="math-result">Wg = <strong>${fmtNum(state.Wg)} J</strong></div>
  `;

  // b.2 v2
  document.getElementById("mathV2").innerHTML = `
    <div>Ek2 = Ek1 + Wg</div>
    <div>Ek2 = ${fmtNum(state.EK1)} + ${fmtNum(state.Wg)}</div>
    <div>Ek2 = <strong>${fmtNum(state.EK2)} J</strong></div>
    <div class="math-spacer"></div>
    <div>Ek2 = 1/2 × m × v2²</div>
    <div>${fmtNum(state.EK2)} = 1/2 × ${fmtNum(state.m)} × v2²</div>
    <div>${fmtNum(state.EK2)} = ${fmtNum(halfM)} × v2²</div>
    <div>v2² = ${fmtNum(state.EK2)} / ${fmtNum(halfM)}</div>
    <div>v2² = ${fmtNum(v2Sq)}</div>
    <div>v2 = √${fmtNum(v2Sq)}</div>
    <div class="math-result">v2 = <strong>${fmtNum(state.v2)} m/s</strong></div>
  `;

  // c.1 Ek3
  document.getElementById("mathEk3").innerHTML = `
    <div>Ek3 = 1/2 × m × v3²</div>
    <div>Ek3 = 1/2 × ${fmtNum(state.m)} × ${fmtNum(state.v3)}²</div>
    <div>Ek3 = ${fmtNum(halfM)} × ${fmtNum(v3Sq)}</div>
    <div class="math-result">Ek3 = <strong>${fmtNum(state.EK3)} J</strong></div>
  `;

  updateTelemetryAtProgress(state.progress);
}

// ============================================================================
// INSTANTANEOUS TELEMETRY ALONG THE TRACK (0% -> 100%)
// ============================================================================

function getInstantaneousState(progress) {
  const p = Math.max(0, Math.min(100, progress));
  let h = state.h1;
  let ep = state.EP1;
  let ek = state.EK1;
  let wg = 0;
  let v = state.v1;
  let phase = 1;
  let label = "Fase 1: Di Atas Puncak";

  if (p <= 22) {
    h = state.h1;
    ep = state.EP1;
    ek = state.EK1;
    wg = 0;
    v = state.v1;
    phase = 1;
    label = "Fase 1: Di Atas Puncak";
  } else if (p <= 64) {
    const t = (p - 22) / (64 - 22);
    const dropFactor = 0.5 * (1 - Math.cos(Math.PI * t));
    h = state.h1 * (1 - dropFactor);
    ep = state.m * state.g * h;
    ek = state.EM1 - ep;
    wg = state.EP1 - ep;
    v = Math.sqrt(Math.max(0, (2 * ek) / state.m));
    phase = 2;
    label = t < 0.95 ? "Fase 2: Saat Meluncur Turun" : "Tiba di Dasar (Sebelum Direm)";
  } else {
    const t = (p - 64) / (100 - 64);
    h = 0;
    ep = 0;
    ek = state.EK2 + (state.EK3 - state.EK2) * t;
    wg = state.Wg;
    v = Math.sqrt(Math.max(0, (2 * ek) / state.m));
    phase = 3;
    label = t < 0.98 ? "Fase 3: Saat Direm (Jalan Datar)" : "Posisi Akhir (Jalan Datar)";
  }

  const em = ep + ek;
  return { p, h, ep, ek, wg, em, v, phase, label };
}

function updateTelemetryAtProgress(progress) {
  const inst = getInstantaneousState(progress);

  document.getElementById("livePosLabel").textContent = inst.label;
  document.getElementById("liveH").textContent = `${fmtNum(inst.h)} m`;
  document.getElementById("liveV").textContent = `${fmtNum(inst.v)} m/s`;

  document.getElementById("liveEP").textContent = `${fmtNum(inst.ep)} J`;
  document.getElementById("liveEK").textContent = `${fmtNum(inst.ek)} J`;
  document.getElementById("liveEM").textContent = `${fmtNum(inst.em)} J`;
  document.getElementById("liveWg").textContent = `${fmtNum(inst.wg)} J`;

  const maxEnergyRef = Math.max(1, state.EM1, state.EK3);
  document.getElementById("barEP").style.width = `${Math.min(100, (inst.ep / maxEnergyRef) * 100)}%`;
  document.getElementById("barEK").style.width = `${Math.min(100, (inst.ek / maxEnergyRef) * 100)}%`;
  document.getElementById("barEM").style.width = `${Math.min(100, (inst.em / maxEnergyRef) * 100)}%`;
  document.getElementById("barWg").style.width = `${Math.min(100, (inst.wg / maxEnergyRef) * 100)}%`;

  // Phase badge & active phase card highlight
  const badge = document.getElementById("phaseBadge");
  const c1 = document.getElementById("cardPhase1");
  const c2 = document.getElementById("cardPhase2");
  const c3 = document.getElementById("cardPhase3");
  c1.classList.remove("active-phase");
  c2.classList.remove("active-phase");
  c3.classList.remove("active-phase");

  if (inst.phase === 1) {
    badge.textContent = "1. Di Atas";
    badge.className = "phase-pill phase-top";
    c1.classList.add("active-phase");
  } else if (inst.phase === 2) {
    badge.textContent = "2. Saat Meluncur";
    badge.className = "phase-pill phase-slide";
    c2.classList.add("active-phase");
  } else {
    badge.textContent = "3. Saat Direm";
    badge.className = "phase-pill phase-brake";
    c3.classList.add("active-phase");
  }
}

// ============================================================================
// CANVAS RENDERING: FAITHFUL ILLUSTRATION + CONSISTENT CYCLIST OUTFIT
// ============================================================================

const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// Consistent outfit colors for the cyclist across all phases!
const CYCLIST_SHIRT = "#e07a3c";
const CYCLIST_PANTS = "#1f4e70";

function getTrackPoint(progress) {
  const xStart = 65;
  const xEnd = 915;
  const x = xStart + (progress / 100) * (xEnd - xStart);

  const hRatio = Math.min(1.35, Math.max(0.25, state.h1 / 4.2));
  const yBottom = 310;
  const yTop = yBottom - 115 * hRatio;

  const p1 = 22;
  const p2 = 64;

  let y = yTop;
  let angle = 0;

  if (progress <= p1) {
    y = yTop;
    angle = 0;
  } else if (progress <= p2) {
    const t = (progress - p1) / (p2 - p1);
    const drop = 0.5 * (1 - Math.cos(Math.PI * t));
    y = yTop + (yBottom - yTop) * drop;

    const dxTotal = ((p2 - p1) / 100) * (xEnd - xStart);
    const dyDt = (yBottom - yTop) * 0.5 * Math.PI * Math.sin(Math.PI * t);
    const dyDx = dyDt / dxTotal;
    angle = Math.atan(dyDx);
  } else {
    y = yBottom;
    angle = 0;
  }

  return { x, y, angle, yTop, yBottom };
}

function drawCyclist(ctx, x, y, angle, options = {}) {
  const {
    shirtColor = CYCLIST_SHIRT,
    pantsColor = CYCLIST_PANTS,
    alpha = 1,
    wheelRot = 0,
    leanForward = false,
    scale = 1
  } = options;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const wheelRadius = 17;
  const rearX = -24;
  const frontX = 24;
  const wheelY = -wheelRadius - 2;

  // Shadow on ground
  ctx.fillStyle = "rgba(15, 35, 52, 0.14)";
  ctx.beginPath();
  ctx.ellipse(0, -1, 38, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helper to draw wheel
  const drawWheel = (wx, wy) => {
    ctx.save();
    ctx.translate(wx, wy);

    // Tire
    ctx.strokeStyle = "#172533";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner rim
    ctx.strokeStyle = "#7a93a6";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius - 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating spokes
    ctx.rotate(wheelRot);
    ctx.strokeStyle = "rgba(23, 37, 51, 0.45)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * (wheelRadius - 3), -Math.sin(a) * (wheelRadius - 3));
      ctx.lineTo(Math.cos(a) * (wheelRadius - 3), Math.sin(a) * (wheelRadius - 3));
      ctx.stroke();
    }

    // Hub
    ctx.fillStyle = "#172533";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  drawWheel(rearX, wheelY);
  drawWheel(frontX, wheelY);

  // Bicycle Frame coordinates
  const crankX = -3;
  const crankY = wheelY + 2;
  const seatX = -14;
  const seatY = wheelY - 22;
  const headX = 16;
  const headY = wheelY - 24;

  ctx.strokeStyle = "#2b6f96";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Rear triangle & frame diamond
  ctx.beginPath();
  ctx.moveTo(rearX, wheelY);
  ctx.lineTo(seatX, seatY);
  ctx.lineTo(crankX, crankY);
  ctx.lineTo(rearX, wheelY);
  ctx.moveTo(seatX, seatY);
  ctx.lineTo(headX, headY);
  ctx.lineTo(crankX, crankY);
  // Front fork
  ctx.moveTo(headX, headY);
  ctx.lineTo(frontX, wheelY);
  ctx.stroke();

  // Seat & Handlebars
  ctx.strokeStyle = "#172533";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(seatX - 5, seatY - 3);
  ctx.lineTo(seatX + 4, seatY - 3);
  ctx.moveTo(headX, headY);
  ctx.lineTo(headX - 2, headY - 7);
  ctx.lineTo(headX + 5, headY - 7);
  ctx.stroke();

  // Rider Body
  const hipX = seatX;
  const hipY = seatY - 5;
  const shoulderX = leanForward ? headX - 1 : headX - 6;
  const shoulderY = leanForward ? headY - 22 : headY - 26;

  // Rider Legs
  ctx.strokeStyle = pantsColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(-4, wheelY - 11);
  ctx.lineTo(crankX + 2, crankY - 2);
  ctx.stroke();

  // Rider Torso (Shirt — always consistent color)
  ctx.strokeStyle = shirtColor;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.stroke();

  // Rider Arm reaching handlebar
  ctx.strokeStyle = "#f2b88b";
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY + 2);
  ctx.lineTo(headX + 3, headY - 7);
  ctx.stroke();

  // Rider Head & Hair/Helmet
  const headCenterX = shoulderX + 4;
  const headCenterY = shoulderY - 9;
  ctx.fillStyle = "#f2b88b";
  ctx.beginPath();
  ctx.arc(headCenterX, headCenterY, 6.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2c1e16";
  ctx.beginPath();
  ctx.arc(headCenterX - 1, headCenterY - 2, 6.4, Math.PI, Math.PI * 2.15);
  ctx.fill();

  ctx.restore();
}

function renderScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Clean warm paper background matching illustration card
  ctx.fillStyle = "#fdf8ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sampleStart = getTrackPoint(0);
  const yTop = sampleStart.yTop;
  const yBottom = sampleStart.yBottom;

  // 1. Draw Terrain Fill (Light icy-blue under the slope)
  ctx.beginPath();
  ctx.moveTo(65, yTop);
  for (let p = 0; p <= 100; p += 1) {
    const pt = getTrackPoint(p);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.lineTo(915, yBottom + 36);
  ctx.lineTo(65, yBottom + 36);
  ctx.closePath();

  const terrainGrad = ctx.createLinearGradient(0, yTop, 0, yBottom + 36);
  terrainGrad.addColorStop(0, "#d7e8f0");
  terrainGrad.addColorStop(1, "#e6f1f6");
  ctx.fillStyle = terrainGrad;
  ctx.fill();

  // Ground base baseline at h = 0
  ctx.strokeStyle = "rgba(25, 55, 78, 0.2)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(65, yBottom);
  ctx.lineTo(620, yBottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // Height Dimension Marker (h1) on the left
  if (state.h1 > 0.05) {
    const dimX = 46;
    ctx.strokeStyle = "#1d6fa5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dimX, yTop);
    ctx.lineTo(dimX, yBottom);
    ctx.moveTo(dimX - 6, yTop);
    ctx.lineTo(dimX + 6, yTop);
    ctx.moveTo(dimX - 6, yBottom);
    ctx.lineTo(dimX + 6, yBottom);
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "#114b73";
    ctx.font = "700 12px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`h1 = ${fmtNum(state.h1)} m`, 72, yTop + (yBottom - yTop) / 2 + 4);
    ctx.restore();
  }

  // 2. Draw Road Surface Line & Sub-stroke
  ctx.beginPath();
  for (let p = 0; p <= 100; p += 1) {
    const pt = getTrackPoint(p);
    if (p === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.strokeStyle = "#1a2736";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  for (let p = 0; p <= 100; p += 1) {
    const pt = getTrackPoint(p);
    if (p === 0) ctx.moveTo(pt.x, pt.y + 6);
    else ctx.lineTo(pt.x, pt.y + 6);
  }
  ctx.strokeStyle = "#c1cfd8";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 3. Draw "Arah gerak" Arrow & Label above the slope
  const midSlopePt = getTrackPoint(46);
  ctx.save();
  ctx.translate(midSlopePt.x + 28, midSlopePt.y - 54);
  ctx.rotate(midSlopePt.angle);

  ctx.fillStyle = "#1e658f";
  ctx.font = "800 14px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Arah gerak", 10, -14);

  ctx.strokeStyle = "#1d6fa5";
  ctx.fillStyle = "#1d6fa5";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-36, -4);
  ctx.lineTo(54, -4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(58, -4);
  ctx.lineTo(47, -10);
  ctx.lineTo(47, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Optional 3 Reference Pose Cyclists (All wearing the exact same shirt & pants!)
  if (state.showStaticPoses) {
    const pt1 = getTrackPoint(12);
    const ghostAlpha1 = Math.abs(state.progress - 12) < 9 ? 0.16 : 0.38;
    drawCyclist(ctx, pt1.x, pt1.y, pt1.angle, {
      shirtColor: CYCLIST_SHIRT,
      pantsColor: CYCLIST_PANTS,
      alpha: ghostAlpha1,
      leanForward: false
    });

    const pt2 = getTrackPoint(43);
    const ghostAlpha2 = Math.abs(state.progress - 43) < 9 ? 0.16 : 0.38;
    drawCyclist(ctx, pt2.x, pt2.y, pt2.angle, {
      shirtColor: CYCLIST_SHIRT,
      pantsColor: CYCLIST_PANTS,
      alpha: ghostAlpha2,
      leanForward: true
    });

    const pt3 = getTrackPoint(84);
    const ghostAlpha3 = Math.abs(state.progress - 84) < 9 ? 0.16 : 0.38;
    drawCyclist(ctx, pt3.x, pt3.y, pt3.angle, {
      shirtColor: CYCLIST_SHIRT,
      pantsColor: CYCLIST_PANTS,
      alpha: ghostAlpha3,
      leanForward: false
    });
  }

  // 5. Active Animated Cyclist at current progress (Always consistent shirt & pants!)
  const activePt = getTrackPoint(state.progress);
  const inst = getInstantaneousState(state.progress);
  const isSliding = inst.phase === 2;

  drawCyclist(ctx, activePt.x, activePt.y, activePt.angle, {
    shirtColor: CYCLIST_SHIRT,
    pantsColor: CYCLIST_PANTS,
    alpha: 1,
    wheelRot: state.wheelAngle,
    leanForward: isSliding,
    scale: 1.06
  });

  // 6. Floating Live Telemetry Tag above the Active Cyclist
  const boxW = 190;
  const boxH = 44;
  const tagX = Math.min(canvas.width - boxW / 2 - 10, Math.max(boxW / 2 + 10, activePt.x));
  const tagY = Math.max(36, activePt.y - 106);

  ctx.save();
  ctx.fillStyle = "rgba(15, 41, 66, 0.92)";
  ctx.strokeStyle = "#e07a3c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(tagX - boxW / 2, tagY - boxH / 2, boxW, boxH, 8);
  } else {
    ctx.rect(tagX - boxW / 2, tagY - boxH / 2, boxW, boxH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 12px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`v = ${fmtNum(inst.v)} m/s | h = ${fmtNum(inst.h)} m`, tagX, tagY - 4);

  ctx.fillStyle = "#9ad8ff";
  ctx.font = "600 11px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`Ep: ${fmtNum(inst.ep, 0)} J | Ek: ${fmtNum(inst.ek, 0)} J`, tagX, tagY + 13);
  ctx.restore();
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate(timestamp) {
  if (!state.lastTimestamp) state.lastTimestamp = timestamp;
  const dt = Math.min(0.05, (timestamp - state.lastTimestamp) / 1000);
  state.lastTimestamp = timestamp;

  if (state.isPlaying) {
    const inst = getInstantaneousState(state.progress);
    const visualSpeedFactor = Math.max(2.5, inst.v) * 2.4 * state.simSpeed;
    state.progress += visualSpeedFactor * dt;
    state.wheelAngle += visualSpeedFactor * dt * 0.25;

    if (state.progress >= 100) {
      state.progress = 100;
      state.isPlaying = false;
      updatePlayButtonUI();
    }

    document.getElementById("progressSlider").value = state.progress;
    updateTelemetryAtProgress(state.progress);
  }

  renderScene();
  requestAnimationFrame(animate);
}

function updatePlayButtonUI() {
  const icon = document.getElementById("playIcon");
  const text = document.getElementById("playText");
  if (state.isPlaying) {
    icon.textContent = "⏸";
    text.textContent = "Jeda Simulasi";
  } else {
    icon.textContent = "▶";
    text.textContent = state.progress >= 100 ? "Putar Ulang" : "Mulai Meluncur";
  }
}

// ============================================================================
// EXPERIMENT LOG TABLE (TABEL DATA PERCOBAAN)
// ============================================================================

function recordCurrentTrial() {
  const trial = {
    id: Date.now() + Math.random(),
    m: state.m,
    g: state.g,
    h1: state.h1,
    v1: state.v1,
    EP1: state.EP1,
    EK1: state.EK1,
    EM1: state.EM1,
    Wg: state.Wg,
    v2: state.v2,
    v3: state.v3,
    EK3: state.EK3
  };
  state.trials.push(trial);
  renderTrialTable();
}

function renderTrialTable() {
  const tbody = document.getElementById("trialTableBody");
  tbody.innerHTML = "";

  if (state.trials.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="12" style="padding:18px; color:#627d98;">Belum ada data percobaan. Klik <strong>"＋ Catat Hasil Percobaan"</strong> untuk menyimpan data.</td>`;
    tbody.appendChild(tr);
    return;
  }

  state.trials.forEach((t, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>#${idx + 1}</strong></td>
      <td>${fmtNum(t.m)}</td>
      <td>${fmtNum(t.h1)}</td>
      <td>${fmtNum(t.v1)}</td>
      <td>${fmtNum(t.EP1)}</td>
      <td>${fmtNum(t.EK1)}</td>
      <td><strong>${fmtNum(t.EM1)}</strong></td>
      <td>${fmtNum(t.Wg)}</td>
      <td><strong>${fmtNum(t.v2)}</strong></td>
      <td>${fmtNum(t.v3)}</td>
      <td><strong>${fmtNum(t.EK3)}</strong></td>
      <td>
        <button type="button" class="btn-load-row" data-idx="${idx}" title="Muat nilai percobaan ini">Muat</button>
        <button type="button" class="btn-del-row" data-del="${idx}" title="Hapus baris ini">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================================
// EVENT LISTENERS (TWO-WAY INPUT BINDING & CONTROLS)
// ============================================================================

function bindEvents() {
  const bindPhysicalPair = (numId, rngId, prop) => {
    const numEl = document.getElementById(numId);
    const rngEl = document.getElementById(rngId);

    const onInput = (sourceId, rawVal) => {
      if (rawVal === "" || Number.isNaN(parseFloat(rawVal))) return;
      const val = Math.max(0, parseFloat(rawVal));
      state[prop] = prop === "m" ? Math.max(0.1, val) : val;
      computeFromPhysical();
      updateUI(sourceId);
    };

    numEl.addEventListener("input", (e) => onInput(numId, e.target.value));
    if (rngEl) {
      rngEl.addEventListener("input", (e) => onInput(rngId, e.target.value));
    }
  };

  bindPhysicalPair("inpMass", "rngMass", "m");
  bindPhysicalPair("inpHeight", "rngHeight", "h1");
  bindPhysicalPair("inpV1", "rngV1", "v1");
  bindPhysicalPair("inpV3", "rngV3", "v3");

  const inpG = document.getElementById("inpG");
  inpG.addEventListener("input", (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) return;
    state.g = Math.max(0.1, parseFloat(e.target.value));
    computeFromPhysical();
    updateUI("inpG");
  });

  document.querySelectorAll(".mini-btn[data-g]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.g = parseFloat(btn.dataset.g);
      computeFromPhysical();
      updateUI();
    });
  });

  const inpV2 = document.getElementById("inpV2");
  inpV2.addEventListener("input", (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) return;
    const v2Target = Math.max(0, parseFloat(e.target.value));
    const ek2Target = 0.5 * state.m * v2Target * v2Target;
    const ep1Needed = Math.max(0, ek2Target - state.EK1);
    state.h1 = ep1Needed / (state.m * state.g);
    if (ek2Target < state.EK1) {
      state.h1 = 0;
      state.v1 = v2Target;
    }
    computeFromPhysical();
    updateUI("inpV2");
  });

  // Direct Energy Inputs
  document.getElementById("inpEP1").addEventListener("input", (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) return;
    const ep1Val = Math.max(0, parseFloat(e.target.value));
    state.h1 = ep1Val / (state.m * state.g);
    computeFromPhysical();
    updateUI("inpEP1");
  });

  document.getElementById("inpEK1").addEventListener("input", (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) return;
    const ek1Val = Math.max(0, parseFloat(e.target.value));
    state.v1 = Math.sqrt((2 * ek1Val) / state.m);
    computeFromPhysical();
    updateUI("inpEK1");
  });

  document.getElementById("inpEM1").addEventListener("input", (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) return;
    const em1Val = Math.max(0, parseFloat(e.target.value));
    if (em1Val >= state.EK1) {
      const ep1New = em1Val - state.EK1;
      state.h1 = ep1New / (state.m * state.g);
    } else {
      state.h1 = 0;
      state.v1 = Math.sqrt((2 * em1Val) / state.m);
    }
    computeFromPhysical();
    updateUI("inpEM1");
  });

  document.getElementById("inpEK3").addEventListener("input", (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) return;
    const ek3Val = Math.max(0, parseFloat(e.target.value));
    state.v3 = Math.sqrt((2 * ek3Val) / state.m);
    computeFromPhysical();
    updateUI("inpEK3");
  });

  document.getElementById("inpWg").addEventListener("input", (e) => {
    if (e.target.value === "" || Number.isNaN(parseFloat(e.target.value))) return;
    const wgVal = Math.max(0, parseFloat(e.target.value));
    state.h1 = wgVal / (state.m * state.g);
    computeFromPhysical();
    updateUI("inpWg");
  });

  // Direct Canvas Click & Drag to scrub bicycle position along the hill
  let isDraggingCanvas = false;
  const scrubFromCanvasEvent = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const xStart = 65;
    const xEnd = 915;
    const pct = Math.max(0, Math.min(100, ((canvasX - xStart) / (xEnd - xStart)) * 100));
    state.isPlaying = false;
    state.progress = pct;
    state.wheelAngle = pct * 0.35;
    document.getElementById("progressSlider").value = pct;
    updatePlayButtonUI();
    updateTelemetryAtProgress(pct);
  };

  canvas.addEventListener("pointerdown", (e) => {
    isDraggingCanvas = true;
    scrubFromCanvasEvent(e);
  });
  window.addEventListener("pointermove", (e) => {
    if (isDraggingCanvas) scrubFromCanvasEvent(e);
  });
  window.addEventListener("pointerup", () => {
    isDraggingCanvas = false;
  });

  // Preset Scenario Buttons
  const presets = {
    soal: { m: 80, g: 10, h1: 4.2, v1: 4, v3: 5 },
    diam: { m: 80, g: 10, h1: 5.0, v1: 0, v3: 4 },
    berhenti: { m: 80, g: 10, h1: 4.2, v1: 4, v3: 0 },
    curam: { m: 75, g: 10, h1: 8.0, v1: 2, v3: 6 }
  };

  document.querySelectorAll(".chip-btn[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chip-btn[data-preset]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const p = presets[btn.dataset.preset];
      if (p) {
        Object.assign(state, p);
        computeFromPhysical();
        updateUI();
      }
    });
  });

  document.getElementById("btnResetDefault").addEventListener("click", () => {
    Object.assign(state, presets.soal);
    state.progress = 0;
    state.isPlaying = false;
    document.getElementById("progressSlider").value = 0;
    updatePlayButtonUI();
    computeFromPhysical();
    updateUI();
  });

  // Simulation Playback Controls
  document.getElementById("btnPlayPause").addEventListener("click", () => {
    if (state.progress >= 100) {
      state.progress = 0;
    }
    state.isPlaying = !state.isPlaying;
    updatePlayButtonUI();
  });

  document.getElementById("btnRestartSim").addEventListener("click", () => {
    state.progress = 0;
    state.isPlaying = false;
    document.getElementById("progressSlider").value = 0;
    updatePlayButtonUI();
    updateTelemetryAtProgress(0);
  });

  document.getElementById("progressSlider").addEventListener("input", (e) => {
    state.isPlaying = false;
    state.progress = parseFloat(e.target.value) || 0;
    state.wheelAngle = state.progress * 0.35;
    updatePlayButtonUI();
    updateTelemetryAtProgress(state.progress);
  });

  document.getElementById("simSpeedSelect").addEventListener("change", (e) => {
    state.simSpeed = parseFloat(e.target.value) || 1.0;
  });

  document.getElementById("chkShowPoses").addEventListener("change", (e) => {
    state.showStaticPoses = e.target.checked;
  });

  document.querySelectorAll(".phase-card[data-jump]").forEach((card) => {
    card.addEventListener("click", () => {
      state.isPlaying = false;
      state.progress = parseFloat(card.dataset.jump) || 0;
      state.wheelAngle = state.progress * 0.35;
      document.getElementById("progressSlider").value = state.progress;
      updatePlayButtonUI();
      updateTelemetryAtProgress(state.progress);
    });
  });

  // Experiment Log Table actions
  document.getElementById("btnRecordTrial").addEventListener("click", recordCurrentTrial);
  document.getElementById("btnAddTrialBottom").addEventListener("click", recordCurrentTrial);

  document.getElementById("btnClearTable").addEventListener("click", () => {
    state.trials = [];
    renderTrialTable();
  });

  document.getElementById("trialTableBody").addEventListener("click", (e) => {
    const loadBtn = e.target.closest(".btn-load-row");
    if (loadBtn) {
      const idx = parseInt(loadBtn.dataset.idx, 10);
      const t = state.trials[idx];
      if (t) {
        state.m = t.m;
        state.g = t.g;
        state.h1 = t.h1;
        state.v1 = t.v1;
        state.v3 = t.v3;
        computeFromPhysical();
        updateUI();
      }
      return;
    }

    const delBtn = e.target.closest(".btn-del-row");
    if (delBtn) {
      const idx = parseInt(delBtn.dataset.del, 10);
      state.trials.splice(idx, 1);
      renderTrialTable();
    }
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  computeFromPhysical();
  updateUI();
  bindEvents();
  recordCurrentTrial();
  requestAnimationFrame(animate);
}

init();
