/**
 * HauntedPhysics — Moteur Physique 2D & Éclairage Nocturne à la Chandelle (60 FPS)
 * - Squelettes anatomiques gravés façon José Guadalupe Posada (clavicules, cage thoracique,
 *   bassin, membres articulés à deux segments qui plient à l’impact).
 * - Désarticulation cinétique : catapulter violemment un squelette contre un mur ou un cadre
 *   le brise en crâne claquant, fémurs et côtes qui rebondissent séparément !
 * - Mode « Veillée à la chandelle » : voile de suie nocturne percé d’un halo de flamme
 *   physique qui vacille, rétrécit dans les courants d’air quand la souris accélère,
 *   et laisse luire les prunelles vermillon dans l’ombre.
 */
(function () {
  'use strict';

  const MAX_BODIES = 52;
  const GRAVITY = 1320;
  const SHATTER_THRESHOLD = 940;

  const PALETTE = {
    paper: '#EFE9DC',
    paperCard: '#F5F0E5',
    bone: '#F5EFE2',
    boneShade: '#D8CEB8',
    ink: '#171412',
    inkSoft: '#4E463E',
    vermilion: '#B82518',
    ochre: '#C45B1C',
    ochreLight: '#DF7A2E',
    stem: '#3B4D2B',
    nightVeil: 'rgba(15, 12, 10, 0.92)',
    flameRim: 'rgba(216, 104, 34, 0.22)',
    flameCore: 'rgba(245, 212, 145, 0.14)'
  };

  let canvas = null;
  let ctx = null;
  let cursorCanvas = null;
  let cursorCtx = null;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const bodies = [];
  const trail = [];
  const bats = [];
  const comicTexts = [];
  let domColliders = [];
  let trackedEyes = [];

  let totalSpawned = 0;
  let onStatsChange = null;
  let candleMode = false;
  let candleRadiusCurrent = 235;
  let flameClock = 0;

  const pointer = {
    x: width * 0.5,
    y: height * 0.42,
    prevX: width * 0.5,
    prevY: height * 0.42,
    vx: 0,
    vy: 0,
    active: false,
    grabbedBody: null,
    grabOffsetX: 0,
    grabOffsetY: 0
  };

  const hauntedHand = {
    enabled: true,
    visible: true,
    x: width * 0.5,
    y: height * 0.42,
    vx: 0,
    vy: 0,
    angle: 0,
    isPointing: false,
    clickProgress: 0,
    idleTimer: 0,
    drumClock: 0,
    lastDrumFinger: -1,
    thoughtBubble: null,
    thoughtTimer: 0,
    scuttleOffsetX: 0
  };

  const reducedMotion = Boolean(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  function resize() {
    if (!canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (cursorCanvas && cursorCtx) {
      cursorCanvas.width = Math.floor(width * dpr);
      cursorCanvas.height = Math.floor(height * dpr);
      cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    refreshColliders();
  }

  function refreshColliders() {
    const els = document.querySelectorAll('.collider-box');
    const list = [];
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 40 && r.height > 20 && r.top < height - 56 && r.bottom > 40) {
        list.push({
          left: r.left + 8,
          right: r.right - 8,
          top: r.top,
          bottom: r.top + 24
        });
      }
    });
    domColliders = list;
    trackedEyes = Array.from(document.querySelectorAll('.haunted-eye'));
  }

  function notifyStats() {
    if (typeof onStatsChange === 'function') {
      onStatsChange(totalSpawned, bodies.length);
    }
  }

  function createBody(x, y, type, vx, vy, canShatter = true, hasTopHat = false, hasTrumpet = false) {
    const chosenType = type === 'mixed'
      ? (['skeleton', 'skeleton', 'skull', 'bone', 'pumpkin'][Math.floor(Math.random() * 5)])
      : type;

    const radiusMap = {
      skeleton: 28,
      skull: 17,
      ribcage: 16,
      pumpkin: 20,
      bone: 14
    };

    const restitutionMap = {
      skeleton: 0.45,
      skull: 0.56,
      ribcage: 0.48,
      pumpkin: 0.58,
      bone: 0.52
    };

    if (bodies.length >= MAX_BODIES) {
      const idx = bodies.findIndex((b) => b !== pointer.grabbedBody);
      if (idx !== -1) bodies.splice(idx, 1);
    }

    const b = {
      id: ++totalSpawned,
      type: chosenType,
      x: x,
      y: y,
      vx: vx !== undefined ? vx : (Math.random() - 0.5) * 320,
      vy: vy !== undefined ? vy : -80 - Math.random() * 200,
      radius: radiusMap[chosenType] || 18,
      restitution: restitutionMap[chosenType] || 0.5,
      angle: (Math.random() - 0.5) * 1.2,
      omega: (Math.random() - 0.5) * 8.5,
      jawOpen: 0.25,
      limbPhase: Math.random() * Math.PI * 2,
      limbSwing: 0,
      kneeBend: 0.35,
      canShatter: Boolean(canShatter),
      hasTopHat: Boolean(hasTopHat),
      hasTrumpet: Boolean(hasTrumpet),
      opacity: 1,
      sweepingOut: false
    };

    bodies.push(b);
    notifyStats();
    return b;
  }

  function shatterSkeleton(b, impactX, impactY) {
    const idx = bodies.indexOf(b);
    if (idx === -1) return;
    bodies.splice(idx, 1);

    createBody(impactX, impactY - 14, 'skull', (Math.random() - 0.5) * 420, -280 - Math.random() * 180, false);
    createBody(impactX, impactY, 'ribcage', (Math.random() - 0.5) * 340, -200 - Math.random() * 150, false);
    createBody(impactX - 10, impactY + 8, 'bone', -180 - Math.random() * 240, -240 - Math.random() * 140, false);
    createBody(impactX + 10, impactY + 8, 'bone', 180 + Math.random() * 240, -240 - Math.random() * 140, false);

    if (window.HauntedAudio) {
      if (typeof window.HauntedAudio.playShatter === 'function') {
        window.HauntedAudio.playShatter();
      } else {
        window.HauntedAudio.playBoneClack(1);
      }
    }
    HauntedPhysics.spawnComicText(impactX, impactY - 26, 'Désarticulé !', true);
    notifyStats();
  }

  function spawnTrailParticle(x, y, speed) {
    if (reducedMotion) return;
    const isSpark = candleMode || Math.random() < 0.3;
    trail.push({
      x: x + (Math.random() - 0.5) * 7,
      y: y + (Math.random() - 0.5) * 7,
      vx: (Math.random() - 0.5) * 26,
      vy: -22 - Math.random() * 38,
      size: (candleMode ? 2.4 : 3) + Math.random() * 3.8 + Math.min(3.5, speed * 0.004),
      life: 1,
      decay: (candleMode ? 2.6 : 2.2) + Math.random() * 1.1,
      color: candleMode
        ? (Math.random() < 0.6 ? PALETTE.ochreLight : PALETTE.vermilion)
        : (isSpark ? PALETTE.vermilion : PALETTE.ink)
    });
    if (trail.length > 76) trail.shift();
  }

  // --- Gravures anatomiques Posada sur Canvas ---

  function drawAnatomicalSkull(g, scale, jawOpen, highlightVermilion) {
    g.save();
    g.scale(scale, scale);

    // Mandibule articulée avec rangée de dents ciselées
    g.save();
    g.translate(0, 6.5 + jawOpen * 6);
    g.fillStyle = PALETTE.boneShade;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-8.5, -2);
    g.lineTo(-7, 5.5);
    g.quadraticCurveTo(0, 8, 7, 5.5);
    g.lineTo(8.5, -2);
    g.closePath();
    g.fill();
    g.stroke();

    g.beginPath();
    for (let tx = -4.5; tx <= 4.5; tx += 3) {
      g.moveTo(tx, -2);
      g.lineTo(tx, 3.8);
    }
    g.stroke();
    g.restore();

    // Voûte crânienne + arcades zygomatiques saillantes
    g.fillStyle = PALETTE.bone;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-9, 6.5);
    g.lineTo(-11.5, 2.5);
    g.quadraticCurveTo(-14.5, -2, -13, -7);
    g.bezierCurveTo(-12, -16, 12, -16, 13, -7);
    g.quadraticCurveTo(14.5, -2, 11.5, 2.5);
    g.lineTo(9, 6.5);
    g.closePath();
    g.fill();
    g.stroke();

    // Suture coronale & hachures temporales de gravure sur bois
    g.strokeStyle = PALETTE.inkSoft;
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(-6, -12.5);
    g.quadraticCurveTo(0, -10.5, 6, -12.5);
    g.moveTo(-11.5, -5.5);
    g.lineTo(-8.5, -8.5);
    g.moveTo(-12, -2.5);
    g.lineTo(-9, -5.5);
    g.moveTo(11.5, -5.5);
    g.lineTo(8.5, -8.5);
    g.stroke();

    // Dents maxillaires supérieures
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1.4;
    g.beginPath();
    for (let tx = -4.5; tx <= 4.5; tx += 3) {
      g.moveTo(tx, 3.8);
      g.lineTo(tx, 6.5);
    }
    g.stroke();

    // Cavités orbitaires anguleuses
    g.fillStyle = PALETTE.ink;
    g.beginPath();
    g.ellipse(-5.2, -3.2, 3.9, 3.5, -0.15, 0, Math.PI * 2);
    g.ellipse(5.2, -3.2, 3.9, 3.5, 0.15, 0, Math.PI * 2);
    g.fill();

    if (highlightVermilion) {
      g.fillStyle = PALETTE.vermilion;
      g.beginPath();
      g.arc(-5.2, -3.2, 1.5, 0, Math.PI * 2);
      g.arc(5.2, -3.2, 1.5, 0, Math.PI * 2);
      g.fill();
    }

    // Ouverture piriforme nasale
    g.fillStyle = PALETTE.ink;
    g.beginPath();
    g.moveTo(0, -0.6);
    g.lineTo(-2.3, 3.4);
    g.lineTo(0, 2.6);
    g.lineTo(2.3, 3.4);
    g.closePath();
    g.fill();

    g.restore();
  }

  function drawTwoSegmentLimb(g, ox, oy, a1, len1, a2, len2, isLeg) {
    g.save();
    g.translate(ox, oy);
    g.rotate(a1);
    g.lineCap = 'round';

    // Segment proximal (humérus / fémur)
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 6.4;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, len1);
    g.stroke();

    g.strokeStyle = PALETTE.bone;
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, len1);
    g.stroke();

    // Articulation coude / rotule
    g.translate(0, len1);
    g.fillStyle = PALETTE.boneShade;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(0, 0, 2.7, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // Segment distal (radius-ulna / tibia)
    g.rotate(a2);
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 5.6;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, len2);
    g.stroke();

    g.strokeStyle = PALETTE.bone;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, len2);
    g.stroke();

    // Extrémité (main griffue ou pied osseux)
    g.translate(0, len2);
    g.fillStyle = PALETTE.bone;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1.6;
    g.beginPath();
    if (isLeg) {
      g.ellipse(2.2, 1.2, 4.2, 2.2, 0.2, 0, Math.PI * 2);
    } else {
      g.arc(0, 1.4, 2.8, 0, Math.PI * 2);
    }
    g.fill();
    g.stroke();

    g.restore();
  }

  function drawRibcageTorso(g) {
    // Rachis & sternum
    g.lineCap = 'round';
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 6.6;
    g.beginPath();
    g.moveTo(0, -10);
    g.lineTo(0, 14);
    g.stroke();

    g.strokeStyle = PALETTE.bone;
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(0, -10);
    g.lineTo(0, 14);
    g.stroke();

    // Clavicules en arc
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 5.2;
    g.beginPath();
    g.moveTo(-11, -7);
    g.quadraticCurveTo(0, -4.5, 11, -7);
    g.stroke();
    g.strokeStyle = PALETTE.bone;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-11, -7);
    g.quadraticCurveTo(0, -4.5, 11, -7);
    g.stroke();

    // 4 paires de côtes anatomiques
    [-3.5, 0.5, 4.5, 8.2].forEach((ry, idx) => {
      const w = 10.8 - idx * 1.35;
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 4.6;
      g.beginPath();
      g.moveTo(-w, ry);
      g.quadraticCurveTo(0, ry + 2.8, w, ry);
      g.stroke();

      g.strokeStyle = PALETTE.bone;
      g.lineWidth = 2.1;
      g.beginPath();
      g.moveTo(-w, ry);
      g.quadraticCurveTo(0, ry + 2.8, w, ry);
      g.stroke();
    });
  }

  function drawArticulatedSkeleton(g, b) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle * 0.48);
    g.globalAlpha = b.opacity;

    const sw = b.limbSwing;
    const bend = b.kneeBend;

    drawRibcageTorso(g);

    // Ailes iliaques du bassin
    g.fillStyle = PALETTE.boneShade;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1.9;
    g.beginPath();
    g.moveTo(-8.5, 12.5);
    g.quadraticCurveTo(-9.5, 17.5, -3.5, 17);
    g.lineTo(0, 15);
    g.lineTo(3.5, 17);
    g.quadraticCurveTo(9.5, 17.5, 8.5, 12.5);
    g.quadraticCurveTo(0, 14.5, -8.5, 12.5);
    g.fill();
    g.stroke();

    // Bras articulés (humérus + avant-bras)
    drawTwoSegmentLimb(g, -11, -6.5, 0.52 + sw * 0.95, 10.5, 0.45 + bend * 0.6, 10, false);
    drawTwoSegmentLimb(g, 11, -6.5, -0.52 - sw * 0.9, 10.5, -0.45 - bend * 0.6, 10, false);

    // Trompette en cuivre pour les squelettes du Bal
    if (b.hasTrumpet) {
      g.save();
      g.translate(10, -2);
      g.rotate(0.32 - sw * 0.25);
      g.fillStyle = PALETTE.ochreLight;
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(16, -6);
      g.lineTo(21, -12);
      g.lineTo(22, 2);
      g.lineTo(16, -2);
      g.lineTo(0, 1);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }

    // Jambes articulées (fémur + tibia)
    drawTwoSegmentLimb(g, -5.5, 16, 0.2 - sw * 0.78, 11.5, -0.35 - bend * 0.7, 11.5, true);
    drawTwoSegmentLimb(g, 5.5, 16, -0.2 + sw * 0.82, 11.5, 0.35 + bend * 0.7, 11.5, true);

    // Crâne Posada articulé au sommet du rachis
    g.translate(0, -19.5);
    g.rotate(sw * 0.28);
    drawAnatomicalSkull(g, 0.96, b.jawOpen, true);

    // Haut-de-forme victorien pour le Bal des Squelettes
    if (b.hasTopHat) {
      g.save();
      g.translate(0, -14);
      g.rotate(-0.08 + sw * 0.1);
      g.fillStyle = PALETTE.ink;
      g.beginPath();
      g.ellipse(0, 2, 13, 3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-8, -16, 16, 18);
      g.fillStyle = PALETTE.vermilion;
      g.fillRect(-8, 0, 16, 3);
      g.restore();
    }

    g.restore();
  }

  function drawBone(g, b) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle);
    g.globalAlpha = b.opacity;

    g.fillStyle = PALETTE.bone;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 2;

    g.beginPath();
    g.roundRect(-13.5, -3.2, 27, 6.4, 3);
    g.fill();
    g.stroke();

    [[-13.5, -3.4], [-13.5, 3.4], [13.5, -3.4], [13.5, 3.4]].forEach(([cx, cy]) => {
      g.beginPath();
      g.arc(cx, cy, 4.1, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    });

    g.restore();
  }

  function drawPumpkin(g, b) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle);
    g.globalAlpha = b.opacity;

    // Pédoncule torsadé
    g.fillStyle = PALETTE.stem;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-3.5, -14);
    g.quadraticCurveTo(-2, -23, 4.5, -22);
    g.lineTo(5.5, -19);
    g.quadraticCurveTo(1.5, -19, 3, -14);
    g.closePath();
    g.fill();
    g.stroke();

    // Côtes de courge gravées
    g.fillStyle = PALETTE.ochreLight;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(0, 0, 19.5, 16, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    g.lineWidth = 1.3;
    g.beginPath();
    g.ellipse(0, 0, 12.5, 15.6, 0, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.ellipse(0, 0, 5.5, 15.6, 0, 0, Math.PI * 2);
    g.stroke();

    // Visage découpé à l'encre de suie
    g.fillStyle = PALETTE.ink;
    g.beginPath();
    g.moveTo(-11, -2);
    g.lineTo(-6.5, -8.5);
    g.lineTo(-2, -2);
    g.closePath();
    g.moveTo(2, -2);
    g.lineTo(6.5, -8.5);
    g.lineTo(11, -2);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(-11.5, 3.5);
    g.lineTo(-7, 7.5);
    g.lineTo(-3.5, 4.8);
    g.lineTo(0, 8.2);
    g.lineTo(3.5, 4.8);
    g.lineTo(7, 7.5);
    g.lineTo(11.5, 3.5);
    g.quadraticCurveTo(0, 13.5, -11.5, 3.5);
    g.fill();

    g.restore();
  }

  function drawBat(g, bat) {
    g.save();
    g.translate(bat.x, bat.y);
    g.rotate(Math.atan2(bat.vy, bat.vx) * 0.22);
    g.scale(bat.scale, bat.scale);
    g.globalAlpha = Math.min(1, bat.life);

    const flap = Math.sin(bat.flapPhase) * 10.5;
    g.fillStyle = PALETTE.ink;
    g.strokeStyle = PALETTE.paper;
    g.lineWidth = 1.3;

    g.beginPath();
    g.moveTo(0, -1);
    g.lineTo(-2.5, -5);
    g.lineTo(-4, -1);
    g.quadraticCurveTo(-14, -13 + flap, -24, -2 + flap);
    g.quadraticCurveTo(-17, 2, -13, 7);
    g.quadraticCurveTo(-9, 3, -6, 8);
    g.lineTo(0, 4);
    g.lineTo(6, 8);
    g.quadraticCurveTo(9, 3, 13, 7);
    g.quadraticCurveTo(17, 2, 24, -2 + flap);
    g.quadraticCurveTo(14, -13 + flap, 4, -1);
    g.lineTo(2.5, -5);
    g.closePath();
    g.fill();
    g.stroke();

    g.restore();
  }

  function renderCandlelightOverlay(dt) {
    if (!candleMode) return;

    flameClock += dt;
    const pSpeed = Math.hypot(pointer.vx, pointer.vy);
    // La flamme rétrécit sous le courant d'air quand la souris file vite, puis reprend son souffle
    const draftShrink = Math.min(82, pSpeed * 0.045);
    const flicker = reducedMotion
      ? 0
      : (Math.sin(flameClock * 17) * 5.5 + Math.cos(flameClock * 29) * 3.5 + Math.sin(flameClock * 7.3) * 6);
    const targetRadius = Math.max(132, 238 - draftShrink + flicker);
    candleRadiusCurrent += (targetRadius - candleRadiusCurrent) * Math.min(1, dt * 14);

    const fx = pointer.x - pointer.vx * 0.012;
    const fy = pointer.y - 8 - pointer.vy * 0.012;
    const R = candleRadiusCurrent;

    // 1. Nappe d'obscurité de suie percée au niveau de la chandelle
    ctx.save();
    ctx.fillStyle = PALETTE.nightVeil;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = 'destination-out';
    const hole = ctx.createRadialGradient(fx, fy, R * 0.14, fx, fy, R);
    hole.addColorStop(0, 'rgba(0, 0, 0, 1)');
    hole.addColorStop(0.55, 'rgba(0, 0, 0, 0.86)');
    hole.addColorStop(0.82, 'rgba(0, 0, 0, 0.36)');
    hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(fx, fy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Halo chaud ambré de suif autour de la main osseuse
    ctx.save();
    const warm = ctx.createRadialGradient(fx, fy, R * 0.06, fx, fy, R * 0.95);
    warm.addColorStop(0, PALETTE.flameCore);
    warm.addColorStop(0.55, PALETTE.flameRim);
    warm.addColorStop(1, 'rgba(184, 37, 24, 0)');
    ctx.fillStyle = warm;
    ctx.beginPath();
    ctx.arc(fx, fy, R * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // Petite flamme de bougie vacillante si la main hantée n'est pas active
    if (!hauntedHand.enabled) {
      const lean = Math.max(-9, Math.min(9, -pointer.vx * 0.008));
      ctx.translate(pointer.x + 12, pointer.y - 10);
      ctx.fillStyle = PALETTE.ochreLight;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.quadraticCurveTo(-5, 0, lean * 0.6, -11);
      ctx.quadraticCurveTo(5, 0, 0, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = PALETTE.paperCard;
      ctx.beginPath();
      ctx.arc(lean * 0.25, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Prunelles vermillon luisant dans les ténèbres hors du halo !
    ctx.save();
    for (let i = 0; i < trackedEyes.length; i++) {
      const el = trackedEyes[i];
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.bottom < 0 || r.top > height) continue;
      const ex = r.left + r.width * 0.5;
      const ey = r.top + r.height * 0.5;
      const d = Math.hypot(ex - fx, ey - fy);
      if (d > R * 0.72) {
        const alpha = Math.min(0.88, (d - R * 0.72) / 140);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = PALETTE.vermilion;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function updateHauntedHand(dt) {
    if (!hauntedHand.enabled || !hauntedHand.visible) return;

    const pDist = Math.hypot(pointer.x - pointer.prevX, pointer.y - pointer.prevY);
    if (pDist < 1.4) {
      hauntedHand.idleTimer += dt;
    } else {
      hauntedHand.idleTimer = 0;
      hauntedHand.thoughtBubble = null;
      hauntedHand.scuttleOffsetX = 0;
    }

    const isIdle = hauntedHand.idleTimer > 2.8;

    // Détection de survol d'un élément cliquable
    hauntedHand.isPointing = false;
    if (pointer.active && !isIdle && document.elementFromPoint) {
      try {
        const el = document.elementFromPoint(pointer.x, pointer.y);
        if (
          el &&
          el.closest(
            'button, a, input, [role="button"], .clickable-trap, .ingredient-btn, .tombstone-card, #red-coffin-wrap, #blood-moon, #bone-chandelier, #gate-knocker'
          )
        ) {
          hauntedHand.isPointing = true;
        }
      } catch (_) {}
    }

    // Coordonnées cibles de la main
    let targetX = pointer.x;
    let targetY = pointer.y;

    if (isIdle) {
      // Repose sur la gazette et tapote
      targetY = pointer.y + 12;
      if (hauntedHand.idleTimer > 5.5) {
        hauntedHand.scuttleOffsetX = Math.sin((hauntedHand.idleTimer - 5.5) * 4) * 6;
        targetX += hauntedHand.scuttleOffsetX;
        if (!hauntedHand.thoughtBubble) {
          const quotes = [
            '« Quelqu’un code encore ici ? »',
            '« J’attends le prochain commit... »',
            '« N’ouvrez pas ce cercueil ! »',
            '« Tapez H pour le Bal des Squelettes ! »'
          ];
          hauntedHand.thoughtBubble = quotes[Math.floor(Math.random() * quotes.length)];
        }
      }
    }

    // Suivi par ressort physique (amortissement réactif)
    const k = isIdle ? 0.22 : 0.35;
    const damp = isIdle ? 0.74 : 0.65;
    const fx = (targetX - hauntedHand.x) * k;
    const fy = (targetY - hauntedHand.y) * k;
    hauntedHand.vx = (hauntedHand.vx + fx) * damp;
    hauntedHand.vy = (hauntedHand.vy + fy) * damp;
    hauntedHand.x += hauntedHand.vx;
    hauntedHand.y += hauntedHand.vy;

    // Inclinaison naturelle
    let targetAngle = 0;
    if (isIdle) {
      targetAngle = 0;
    } else if (hauntedHand.isPointing) {
      targetAngle = -0.16 + (reducedMotion ? 0 : Math.sin(flameClock * 22) * 0.04);
    } else {
      const tilt = Math.max(-0.5, Math.min(0.5, hauntedHand.vx * 0.007));
      targetAngle = -0.22 + tilt;
    }
    hauntedHand.angle += (targetAngle - hauntedHand.angle) * Math.min(1, dt * 14);

    // Amortissement du claquement de clic
    if (hauntedHand.clickProgress > 0) {
      hauntedHand.clickProgress = Math.max(0, hauntedHand.clickProgress - dt * 8);
    }

    // Tambourinement d'impatience quand la souris est inactive
    if (isIdle) {
      hauntedHand.drumClock += dt;
      const drumSpeed = 8.8;
      const cyclePos = (hauntedHand.drumClock * drumSpeed) % (Math.PI * 2);
      const currentFinger = Math.floor((cyclePos / (Math.PI * 2)) * 5);
      if (currentFinger !== hauntedHand.lastDrumFinger) {
        hauntedHand.lastDrumFinger = currentFinger;
        if (window.HauntedAudio && typeof window.HauntedAudio.playBoneTap === 'function') {
          window.HauntedAudio.playBoneTap(0.85 + currentFinger * 0.1);
        }
      }
    } else {
      hauntedHand.drumClock = 0;
      hauntedHand.lastDrumFinger = -1;
    }
  }

  function drawHauntedHand(g, hand) {
    if (!hand.enabled || !hand.visible) return;

    g.save();
    g.translate(hand.x, hand.y);
    g.rotate(hand.angle);

    const isIdle = hand.idleTimer > 2.8;
    const isPointing = hand.isPointing;
    const click = hand.clickProgress;

    // Ombre lithographique portée sur le papier
    g.save();
    g.translate(4, 5);
    g.fillStyle = 'rgba(23, 20, 18, 0.28)';
    g.beginPath();
    g.ellipse(0, 12, 16, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // Déplacement vertical d'impatience par doigt
    const getFingerTap = (idx) => {
      if (!isIdle) return 0;
      const phase = (hand.drumClock * 8.8) - idx * 1.15;
      const s = Math.sin(phase);
      return s > 0.4 ? (s - 0.4) * 8 : 0;
    };

    // 1. Coupe du poignet / Carpe tranché avec ligature vermillon
    g.fillStyle = PALETTE.vermilion;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(0, 24, 7.5, 3.2, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // 2. Os tranchés du carpe (Radius et Ulna)
    g.fillStyle = PALETTE.bone;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(-3.2, 23.5, 2.2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(3.2, 23.5, 1.9, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // 3. Carpe (cluster d'osselets)
    g.fillStyle = PALETTE.boneShade;
    g.beginPath();
    g.ellipse(0, 18, 9, 4.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // Hachures de gravure sur le carpe
    g.strokeStyle = PALETTE.inkSoft;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-4, 17); g.lineTo(-2, 19);
    g.moveTo(0, 16.5); g.lineTo(2, 19);
    g.moveTo(3, 17); g.lineTo(5, 19);
    g.stroke();

    // 4. Métacarpe (paume à 4 rayons osseux)
    g.fillStyle = PALETTE.bone;
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1.6;
    const metaX = [-6.2, -2.1, 2.1, 6.2];
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(metaX[i], 16);
      g.lineTo(metaX[i] * 1.15, 7);
      g.stroke();
    }

    // 5. Doigts articulés Posada

    // A. Pouce
    const thumbTap = getFingerTap(4);
    g.save();
    g.translate(-8.5, 15);
    g.rotate(-0.75 + (isPointing ? 0.35 : 0) - (click * 0.3) - thumbTap * 0.06);
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 4.2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -7); g.stroke();
    g.strokeStyle = PALETTE.bone;
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -7); g.stroke();
    g.translate(0, -7);
    g.rotate(0.35);
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 3.6;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -6); g.stroke();
    g.strokeStyle = PALETTE.bone;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -6); g.stroke();
    g.fillStyle = PALETTE.vermilion;
    g.beginPath(); g.arc(0, -6, 1.2, 0, Math.PI * 2); g.fill();
    g.restore();

    // B. Quatre doigts
    const drawPhalanges = (rootX, rootY, length, isIndexFinger, fingerIdx) => {
      const tap = getFingerTap(fingerIdx);
      g.save();
      g.translate(rootX, rootY);

      let bend1 = 0;
      let bend2 = 0;
      let bend3 = 0;

      if (isPointing) {
        if (isIndexFinger) {
          bend1 = -0.05;
          bend2 = -0.02;
          bend3 = 0;
        } else {
          bend1 = 1.35;
          bend2 = 1.25;
          bend3 = 0.85;
        }
      } else if (isIdle) {
        bend1 = 0.25 - tap * 0.08;
        bend2 = 0.35 - tap * 0.06;
        bend3 = 0.2;
      } else {
        bend1 = 0.12 + click * 0.35;
        bend2 = 0.18 + click * 0.45;
        bend3 = 0.15;
      }

      const segLen = length / 3;

      // Phalange 1
      g.rotate(bend1);
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 4.2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -segLen); g.stroke();
      g.strokeStyle = PALETTE.bone;
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -segLen); g.stroke();

      // Articulation 1
      g.translate(0, -segLen);
      g.fillStyle = PALETTE.boneShade;
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 1.8, 0, Math.PI * 2); g.fill(); g.stroke();

      // Phalange 2
      g.rotate(bend2);
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 3.6;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -segLen); g.stroke();
      g.strokeStyle = PALETTE.bone;
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -segLen); g.stroke();

      // Articulation 2
      g.translate(0, -segLen);
      g.beginPath(); g.arc(0, 0, 1.6, 0, Math.PI * 2); g.fill(); g.stroke();

      // Phalange 3
      g.rotate(bend3);
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -segLen); g.stroke();
      g.strokeStyle = PALETTE.bone;
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -segLen); g.stroke();

      g.fillStyle = isIndexFinger && isPointing ? PALETTE.vermilion : PALETTE.boneShade;
      g.beginPath();
      g.arc(0, -segLen, 1.4, 0, Math.PI * 2);
      g.fill();

      g.restore();
    };

    drawPhalanges(-6.5, 7, 18, true, 3);
    drawPhalanges(-2.1, 6.5, 20.5, false, 2);
    drawPhalanges(2.4, 7, 18.5, false, 1);
    drawPhalanges(6.8, 8, 15, false, 0);

    // 6. Bougeoir en laiton si Mode Chandelle actif
    if (candleMode) {
      g.save();
      g.translate(2, 4);
      g.fillStyle = PALETTE.ochreLight;
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(0, 3, 9, 3.2, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.arc(10, 4, 3, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = PALETTE.paperCard;
      g.fillRect(-2.5, -12, 5, 14);
      g.strokeRect(-2.5, -12, 5, 14);
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, -12);
      g.lineTo(0, -15);
      g.stroke();
      const flicker = Math.sin(flameClock * 22) * 1.5;
      g.fillStyle = PALETTE.ochreLight;
      g.beginPath();
      g.moveTo(0, -14);
      g.quadraticCurveTo(-4, -19 + flicker, 0, -25);
      g.quadraticCurveTo(4, -19 + flicker, 0, -14);
      g.fill();
      g.stroke();
      g.fillStyle = PALETTE.paperCard;
      g.beginPath();
      g.arc(0, -18 + flicker * 0.5, 1.8, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    g.restore();

    // 7. Bulle comique d'impatience
    if (hand.thoughtBubble) {
      g.save();
      g.translate(hand.x + 28, hand.y - 32);
      g.font = '700 italic 14px "Bodoni Moda", Georgia, serif';
      const tw = g.measureText(hand.thoughtBubble).width;
      const bw = tw + 20;
      const bh = 26;

      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(-bw * 0.5 + 3, -bh * 0.5 + 3, bw, bh);
      ctx.fillStyle = PALETTE.paperCard;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.4;
      ctx.fillRect(-bw * 0.5, -bh * 0.5, bw, bh);
      ctx.strokeRect(-bw * 0.5, -bh * 0.5, bw, bh);

      ctx.beginPath();
      ctx.moveTo(-10, bh * 0.5);
      ctx.lineTo(-16, bh * 0.5 + 8);
      ctx.lineTo(-4, bh * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = PALETTE.vermilion;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hand.thoughtBubble, 0, 1);
      g.restore();
    }
  }

  let lastTime = performance.now();

  function tick(now) {
    const dt = Math.min(0.035, (now - lastTime) / 1000);
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    // 0. Éclairage nocturne à la chandelle (sous les squelettes & cartels pour qu'ils restent nets)
    renderCandlelightOverlay(dt);

    // 1. Traînée de fumée d'encre ou flammèches derrière le curseur
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        trail.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.life * (candleMode ? 0.65 : 0.42);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Chauves-souris gravées
    for (let i = bats.length - 1; i >= 0; i--) {
      const bat = bats[i];
      bat.x += bat.vx * dt;
      bat.y += bat.vy * dt + Math.sin(bat.flapPhase * 0.5) * 42 * dt;
      bat.flapPhase += 22 * dt;
      bat.life -= 0.4 * dt;
      if (bat.life <= 0 || bat.x < -80 || bat.x > width + 80 || bat.y < -80) {
        bats.splice(i, 1);
        continue;
      }
      drawBat(ctx, bat);
    }

    // 3. Corps physiques 2D
    const floorY = height - 10;

    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];

      if (b.sweepingOut) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.omega * dt;
        b.opacity -= 1.9 * dt;
        if (b.opacity <= 0) {
          bodies.splice(i, 1);
          notifyStats();
          continue;
        }
      } else if (pointer.grabbedBody === b) {
        const targetX = pointer.x + pointer.grabOffsetX;
        const targetY = pointer.y + pointer.grabOffsetY;
        b.vx = (targetX - b.x) / Math.max(0.008, dt);
        b.vy = (targetY - b.y) / Math.max(0.008, dt);
        b.x = targetX;
        b.y = targetY;
        b.omega = b.vx * 0.013;
        b.angle += b.omega * dt;
        b.jawOpen = 0.82;
        b.limbSwing = Math.max(-1.2, Math.min(1.2, b.vx * 0.0026));
        b.kneeBend = 0.7;
      } else {
        const prevBottom = b.y + b.radius;

        b.vy += GRAVITY * dt;
        b.vx *= Math.pow(0.985, dt * 60);
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.omega * dt;
        b.omega *= Math.pow(0.97, dt * 60);

        b.jawOpen = Math.max(0, b.jawOpen - 2.5 * dt);
        b.kneeBend = Math.max(0.2, b.kneeBend - 1.8 * dt);
        b.limbPhase += (4.2 + Math.abs(b.vx) * 0.02) * dt;
        const speedMag = Math.hypot(b.vx, b.vy);
        b.limbSwing = Math.sin(b.limbPhase) * Math.min(0.98, speedMag / 400);

        if (pointer.active) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          const pSpeed = Math.hypot(pointer.vx, pointer.vy);
          if (dist < b.radius + 26 && pSpeed > 260) {
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            b.vx += pointer.vx * 0.44 + nx * 130;
            b.vy += pointer.vy * 0.36 - 150 + ny * 60;
            b.omega += (Math.random() - 0.5) * 11;
            b.jawOpen = 0.7;
            b.kneeBend = 0.85;
            if (window.HauntedAudio) window.HauntedAudio.playBoneClack(0.35);
          }
        }

        let shattered = false;

        if (b.vy > 0 && b.y < height - 90) {
          for (let c = 0; c < domColliders.length; c++) {
            const box = domColliders[c];
            if (
              b.x > box.left &&
              b.x < box.right &&
              prevBottom <= box.top + 12 &&
              b.y + b.radius >= box.top
            ) {
              const impact = Math.hypot(b.vx, b.vy);
              if (b.type === 'skeleton' && b.canShatter && impact > SHATTER_THRESHOLD) {
                shatterSkeleton(b, b.x, box.top - 10);
                shattered = true;
                break;
              }
              b.y = box.top - b.radius;
              b.vy = -b.vy * b.restitution * 0.74;
              b.vx += (b.x < (box.left + box.right) * 0.5 ? -58 : 58);
              b.omega = b.vx * 0.022;
              b.kneeBend = Math.min(1.1, Math.abs(b.vy) / 380);
              if (impact > 150) {
                b.jawOpen = Math.min(0.92, impact / 620);
                if (window.HauntedAudio) {
                  window.HauntedAudio.playBoneClack(Math.min(1, impact / 740));
                }
              }
              break;
            }
          }
        }
        if (shattered) continue;

        if (b.x - b.radius < 6) {
          const impact = Math.abs(b.vx);
          if (b.type === 'skeleton' && b.canShatter && impact > SHATTER_THRESHOLD) {
            shatterSkeleton(b, 24, b.y);
            continue;
          }
          b.x = 6 + b.radius;
          b.vx = Math.abs(b.vx) * 0.65;
          b.omega = -b.omega * 0.7;
        } else if (b.x + b.radius > width - 6) {
          const impact = Math.abs(b.vx);
          if (b.type === 'skeleton' && b.canShatter && impact > SHATTER_THRESHOLD) {
            shatterSkeleton(b, width - 24, b.y);
            continue;
          }
          b.x = width - 6 - b.radius;
          b.vx = -Math.abs(b.vx) * 0.65;
          b.omega = -b.omega * 0.7;
        }

        if (b.y + b.radius > floorY) {
          const impact = Math.abs(b.vy);
          if (b.type === 'skeleton' && b.canShatter && impact > SHATTER_THRESHOLD * 1.08) {
            shatterSkeleton(b, b.x, floorY - 18);
            continue;
          }
          b.y = floorY - b.radius;
          b.vy = -b.vy * b.restitution;
          b.vx *= 0.84;
          b.omega = b.vx * 0.025;
          b.kneeBend = Math.min(1.1, impact / 420);

          if (impact > 135) {
            b.jawOpen = Math.min(0.92, impact / 580);
            if (window.HauntedAudio) {
              window.HauntedAudio.playBoneClack(Math.min(1, impact / 740));
            }
          } else if (impact < 55) {
            b.vy = 0;
          }
        }
      }
    }

    // Empilement souple entre ossements
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (a.sweepingOut) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (b.sweepingOut) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = (a.radius + b.radius) * 0.86;
        if (dist > 0.01 && dist < minDist) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;

          if (pointer.grabbedBody !== a) {
            a.x -= nx * overlap;
            a.y -= ny * overlap;
          }
          if (pointer.grabbedBody !== b) {
            b.x += nx * overlap;
            b.y += ny * overlap;
          }

          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const sepVel = relVx * nx + relVy * ny;
          if (sepVel < 0) {
            const impulse = -sepVel * 0.42;
            if (pointer.grabbedBody !== a) {
              a.vx -= nx * impulse;
              a.vy -= ny * impulse;
            }
            if (pointer.grabbedBody !== b) {
              b.vx += nx * impulse;
              b.vy += ny * impulse;
            }
            if (Math.abs(sepVel) > 190 && window.HauntedAudio) {
              window.HauntedAudio.playBoneClack(Math.min(0.7, Math.abs(sepVel) / 800));
            }
          }
        }
      }
    }

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.type === 'skeleton') {
        drawArticulatedSkeleton(ctx, b);
      } else if (b.type === 'skull') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.globalAlpha = b.opacity;
        drawAnatomicalSkull(ctx, 1.15, b.jawOpen, true);
        ctx.restore();
      } else if (b.type === 'ribcage') {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.globalAlpha = b.opacity;
        drawRibcageTorso(ctx);
        ctx.restore();
      } else if (b.type === 'pumpkin') {
        drawPumpkin(ctx, b);
      } else {
        drawBone(ctx, b);
      }
    }

    // 4. Cartouches d'interjection typographiques Grand-Guignol
    for (let i = comicTexts.length - 1; i >= 0; i--) {
      const ct = comicTexts[i];
      ct.y += ct.vy * dt;
      ct.life -= 1.05 * dt;
      if (ct.life <= 0) {
        comicTexts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(ct.x, ct.y);
      ctx.rotate(ct.angle);
      ctx.globalAlpha = Math.min(1, ct.life * 1.4);
      ctx.font = '700 italic 17px "Bodoni Moda", Georgia, serif';
      const metrics = ctx.measureText(ct.text);
      const boxW = metrics.width + 26;
      const boxH = 30;

      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(-boxW * 0.5 + 3, -boxH * 0.5 + 3, boxW, boxH);
      ctx.fillStyle = PALETTE.paperCard;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.5;
      ctx.fillRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH);
      ctx.strokeRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH);

      ctx.fillStyle = ct.isVermilion ? PALETTE.vermilion : PALETTE.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ct.text, 0, 1);
      ctx.restore();
    }

    // 5. Souris Hantée : Main Posada suiveuse au premier plan absolu
    updateHauntedHand(dt);
    if (cursorCtx) {
      cursorCtx.clearRect(0, 0, width, height);
      drawHauntedHand(cursorCtx, hauntedHand);
    } else {
      drawHauntedHand(ctx, hauntedHand);
    }

    requestAnimationFrame(tick);
  }

  function bindEvents() {
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', refreshColliders, { passive: true });

    window.addEventListener('pointermove', (e) => {
      const nowVx = (e.clientX - pointer.x) * 28;
      const nowVy = (e.clientY - pointer.y) * 28;
      pointer.prevX = pointer.x;
      pointer.prevY = pointer.y;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.vx = pointer.vx * 0.4 + nowVx * 0.6;
      pointer.vy = pointer.vy * 0.4 + nowVy * 0.6;
      pointer.active = true;
      hauntedHand.visible = true;

      const dist = Math.hypot(pointer.x - pointer.prevX, pointer.y - pointer.prevY);
      if (dist > 4) {
        spawnTrailParticle(pointer.x, pointer.y, Math.hypot(pointer.vx, pointer.vy));
      }
    }, { passive: true });

    window.addEventListener('pointerdown', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;

      if (hauntedHand.enabled) {
        hauntedHand.clickProgress = 1.0;
        if (window.HauntedAudio && typeof window.HauntedAudio.playBoneTap === 'function') {
          window.HauntedAudio.playBoneTap(1.35);
        }
        spawnTrailParticle(pointer.x, pointer.y, 420);
      }

      if (
        e.target &&
        e.target.closest(
          'button, a, input, label, #iron-gate, .scare-modal, #spooky-hud, .ingredient-btn, .tombstone-card, #red-coffin-wrap, #blood-moon, #bone-chandelier, #ancestor-portrait'
        )
      ) {
        return;
      }

      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (b.sweepingOut) continue;
        const d = Math.hypot(e.clientX - b.x, e.clientY - b.y);
        if (d <= b.radius + 16) {
          if (b.type === 'skull' || b.type === 'bone' || b.type === 'ribcage') {
            b.vy = -380 - Math.random() * 220;
            b.vx = (Math.random() - 0.5) * 360;
            b.omega = (Math.random() - 0.5) * 22;
            if (window.HauntedAudio) window.HauntedAudio.playBoneClack(0.75);
            const boneGags = {
              skull: ['« Mon crâne ! »', '« Testez vos commits ! »', '« Zéro bug signalé ! »', '« Aïe le compilateur ! »'],
              ribcage: ['« Mes côtes ! »', '« Dette technique ! »', '« Refactoring nocturne ! »'],
              bone: ['« Mon fémur ! »', '« Clac ! »', '« En production depuis 1894 ! »']
            };
            const list = boneGags[b.type] || ['« Aïe ! »'];
            const gag = list[Math.floor(Math.random() * list.length)];
            HauntedPhysics.spawnComicText(b.x, b.y - 24, gag, true);
            e.preventDefault();
            break;
          }
          pointer.grabbedBody = b;
          pointer.grabOffsetX = b.x - e.clientX;
          pointer.grabOffsetY = b.y - e.clientY;
          document.body.classList.add('grabbing-bone');
          HauntedPhysics.spawnComicText(b.x, b.y - 26, 'Saisi ! Catapultez-le !', true);
          if (window.HauntedAudio) window.HauntedAudio.playBoneClack(0.5);
          e.preventDefault();
          break;
        }
      }
    });

    const releaseGrab = () => {
      if (pointer.grabbedBody) {
        const b = pointer.grabbedBody;
        b.vx = Math.max(-1550, Math.min(1550, pointer.vx * 0.96));
        b.vy = Math.max(-1550, Math.min(1350, pointer.vy * 0.96));
        b.omega = b.vx * 0.018;
        pointer.grabbedBody = null;
        document.body.classList.remove('grabbing-bone');
      }
    };

    window.addEventListener('pointerup', releaseGrab);
    window.addEventListener('pointercancel', releaseGrab);

    document.addEventListener('mouseleave', () => {
      hauntedHand.visible = false;
      document.body.classList.remove('has-haunted-mouse');
      if (cursorCtx) {
        cursorCtx.clearRect(0, 0, width, height);
      }
    });

    document.addEventListener('mouseenter', () => {
      hauntedHand.visible = true;
      if (hauntedHand.enabled && !reducedMotion && !window.matchMedia('(pointer: coarse)').matches) {
        document.body.classList.add('has-haunted-mouse');
      }
    });
  }

  const HauntedPhysics = {
    init(statsCallback) {
      onStatsChange = statsCallback;
      canvas = document.getElementById('fx-canvas');
      cursorCanvas = document.getElementById('cursor-canvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      if (cursorCanvas) {
        cursorCtx = cursorCanvas.getContext('2d');
      }
      resize();
      bindEvents();
      if (hauntedHand.enabled && !reducedMotion && !window.matchMedia('(pointer: coarse)').matches) {
        document.body.classList.add('has-haunted-mouse');
      }
      setInterval(refreshColliders, 1200);
      requestAnimationFrame((t) => {
        lastTime = t;
        tick(t);
      });
    },

    setCandleMode(enabled) {
      candleMode = Boolean(enabled);
      document.body.classList.toggle('candle-mode', candleMode);
      refreshColliders();
      return candleMode;
    },

    toggleCandleMode() {
      return this.setCandleMode(!candleMode);
    },

    isCandleMode() {
      return candleMode;
    },

    setHauntedMouse(enabled) {
      hauntedHand.enabled = Boolean(enabled);
      if (hauntedHand.enabled && !reducedMotion && !window.matchMedia('(pointer: coarse)').matches) {
        document.body.classList.add('has-haunted-mouse');
      } else {
        document.body.classList.remove('has-haunted-mouse');
        if (cursorCtx) {
          cursorCtx.clearRect(0, 0, width, height);
        }
      }
      return hauntedHand.enabled;
    },

    toggleHauntedMouse() {
      return this.setHauntedMouse(!hauntedHand.enabled);
    },

    isHauntedMouse() {
      return hauntedHand.enabled;
    },

    triggerBalDesSquelettes() {
      refreshColliders();
      for (let i = 0; i < 6; i++) {
        const x = width * (0.16 + i * 0.14);
        const vx = (Math.random() - 0.5) * 160;
        const vy = -110 - i * 40;
        createBody(x, vy, 'skeleton', vx, 140, true, true, i % 2 === 0);
      }
      this.spawnBats(width * 0.5, height * 0.32, 10);
      this.spawnComicText(width * 0.5, 120, 'Le Bal des Squelettes est ouvert !', true);
    },

    spawnRain(count = 12, originX = null, originY = null) {
      refreshColliders();
      for (let i = 0; i < count; i++) {
        const x = originX !== null
          ? originX + (Math.random() - 0.5) * 160
          : 50 + Math.random() * Math.max(100, width - 100);
        const y = originY !== null
          ? originY + (Math.random() - 0.5) * 28
          : -30 - i * 38;
        const vx = (Math.random() - 0.5) * 320;
        const vy = originY !== null ? (40 + Math.random() * 220) : (20 + Math.random() * 140);
        createBody(x, y, 'mixed', vx, vy, true);
      }
    },

    spawnBurst(x, y, count = 8, type = 'mixed') {
      refreshColliders();
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
        const speed = 260 + Math.random() * 420;
        createBody(
          x + (Math.random() - 0.5) * 24,
          y + (Math.random() - 0.5) * 20,
          type,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          true
        );
      }
    },

    spawnBats(x, y, count = 12) {
      if (window.HauntedAudio) window.HauntedAudio.playBatScreech();
      for (let i = 0; i < count; i++) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        bats.push({
          x: x + (Math.random() - 0.5) * 70,
          y: y + (Math.random() - 0.5) * 50,
          vx: dir * (160 + Math.random() * 240),
          vy: -60 - Math.random() * 150,
          flapPhase: Math.random() * Math.PI * 2,
          scale: 0.78 + Math.random() * 0.65,
          life: 2.2 + Math.random() * 1.1
        });
      }
    },

    spawnComicText(x, y, text, isVermilion = true) {
      comicTexts.push({
        x: Math.max(100, Math.min(width - 100, x)),
        y: Math.max(56, y),
        vy: -48,
        text: text,
        isVermilion: Boolean(isVermilion),
        angle: (Math.random() - 0.5) * 0.14,
        life: 1.25
      });
    },

    clearBones() {
      if (bodies.length === 0) return;
      bodies.forEach((b) => {
        b.sweepingOut = true;
        b.vx = (Math.random() > 0.5 ? 1 : -1) * (500 + Math.random() * 450);
        b.vy = -350 - Math.random() * 350;
        b.omega = (Math.random() - 0.5) * 18;
      });
      this.spawnComicText(width * 0.5, height - 96, 'Balayé aux oubliettes !', false);
    },

    getTotalSpawned() {
      return totalSpawned;
    },

    getActiveCount() {
      return bodies.length;
    }
  };

  window.HauntedPhysics = HauntedPhysics;
})();
