/**
 * MansionGags — Orchestrateur des quatre actes de la Gazette du Manoir
 * Portail en fer forgé, yeux suiveurs à ressort, mode Veillée à la chandelle,
 * portrait à rayons X, apothicairerie, stèles, Cercueil Vermillon et diplôme notarié Canvas 1200x630.
 */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const state = {
    gateOpen: false,
    visitorName: '',
    bonesCount: 0,
    scaresCount: 0,
    potionsCount: 0,
    portraitClicks: 0,
    selectedIngredients: [],
    wokenTombs: new Set(),
    coffinChainsBroken: 0,
    coffinOpenedOnce: false,
    hauntedMouseActive: true,
    skeletonBallUnlocked: false,
    scrollThresholdsHit: { first: false, second: false },
    hangingTimeout: null
  };

  const PORTRAIT_QUOTES = [
    '« Doucement avec cet index décharné sur le vernis de mon cadre. »',
    '« En 1894, nous livrions en production à la chandelle, sans possibilité d’annuler. »',
    '« J’ai lu votre dernier message de commit intitulé "correctif final v4". Effroyable. »',
    '« Un clic de plus et je convoque le Spectre des conflits de branches. »',
    '« Mes prunelles vous suivront jusqu’à votre prochaine revue de code. »'
  ];

  const HANGING_MESSAGES = [
    'Halte-là : un console.log(« ici ») traîne en production.',
    'Avis nocturne : votre certificat TLS expire ce soir à minuit.',
    'J’attends la fin de npm install depuis l’automne 2019.',
    'Conseil d’ami : ne touchez pas aux trois chaînes de la cave.'
  ];

  const TOMB_REACTIONS = {
    ie: '« Délai dépassé : la main du défunt met quatorze secondes à sortir de terre. »',
    sideproject: '« Le revenant vous tend une facture de renouvellement de nom de domaine. »',
    jira: '« Le ticket repasse immédiatement à l’état "À chiffrer au prochain cycle". »',
    prod: '« Zéro ligne restaurée. Même les spectres gardent une minute de silence. »'
  };

  const CARTOON_SCARES = {
    doot: {
      title: 'Monsieur Calcium, soliste d’outre-tombe',
      text: 'Le squelette trompettiste surgit des vapeurs de fonte : fanfare funèbre et averse immédiate d’ossements sur la gazette.',
      sound: 'doot',
      svg: `
        <svg viewBox="0 0 220 168" aria-hidden="true">
          <!-- Trompettiste Posada ciselé -->
          <path d="M50 72c0-22 17-38 38-38s38 16 38 38c0 13-7 23-16 28v18H66V100c-9-5-16-15-16-28Z" fill="#F6F1E6" stroke="#171412" stroke-width="3"/>
          <path d="M64 72a9 9 0 1 0 18 0a9 9 0 1 0-18 0ZM94 72a9 9 0 1 0 18 0a9 9 0 1 0-18 0Z" fill="#171412"/>
          <path d="M71 72a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0-5.6 0ZM101 72a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0-5.6 0Z" fill="#B82518"/>
          <path d="M78 102v16M88 102v16M98 102v16" stroke="#171412" stroke-width="2.5"/>
          <!-- Pavillon de cuivre et notes de musique -->
          <path d="M104 106l72-22l20-20l4 52l-24-18l-72 14Z" fill="#DF7A2E" stroke="#171412" stroke-width="3.2"/>
          <path d="M162 36v24m0-24l20-6v24" fill="none" stroke="#B82518" stroke-width="3" stroke-linecap="round"/>
        </svg>`
    },
    gitghost: {
      title: 'Le Spectre des quarante-sept conflits Git',
      text: 'L’esprit du vendredi soir s’élève du chaudron : « Trente-huit fichiers marqués <<<<<<< HEAD, et l’auteur vient de quitter le bureau. »',
      sound: 'boo',
      svg: `
        <svg viewBox="0 0 220 168" aria-hidden="true">
          <path d="M56 150V80a54 54 0 0 1 108 0v70l-18-14l-18 14l-18-14l-18 14l-18-14Z" fill="#F6F1E6" stroke="#171412" stroke-width="3.2"/>
          <path d="M80 80c0-8 5-13 11-13s11 5 11 13s-5 13-11 13s-11-5-11-13ZM118 80c0-8 5-13 11-13s11 5 11 13s-5 13-11 13s-11-5-11-13Z" fill="#171412"/>
          <path d="M96 110c0-10 6-16 14-16s14 6 14 16s-6 16-14 16s-14-6-14-16Z" fill="#B82518" stroke="#171412" stroke-width="2.6"/>
          <rect x="52" y="16" width="116" height="24" fill="#171412"/>
          <text x="110" y="32" text-anchor="middle" fill="#F6F1E6" font-family="monospace" font-size="11" font-weight="700">&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</text>
        </svg>`
    },
    recruiter: {
      title: 'Le Comte Recrutor frappe à la vitre',
      text: '« Bonsoir ! J’ai admiré votre parcours C# : seriez-vous libre pour un poste Junior exigeant quinze ans d’expérience sur un outil paru mardi ? »',
      sound: 'laugh',
      svg: `
        <svg viewBox="0 0 220 168" aria-hidden="true">
          <path d="M42 160l26-72l42 26l42-26l26 72Z" fill="#B82518" stroke="#171412" stroke-width="3.2"/>
          <path d="M70 76c0-24 18-40 40-40s40 16 40 40s-18 40-40 40s-40-16-40-40Z" fill="#F6F1E6" stroke="#171412" stroke-width="3.2"/>
          <path d="M70 66c2-36 40-32 40-32s38-4 40 32c-19-17-32-6-40 2c-8-8-21-19-40-2Z" fill="#171412"/>
          <rect x="76" y="66" width="28" height="16" fill="#EFE9DC" stroke="#171412" stroke-width="2.5"/>
          <rect x="116" y="66" width="28" height="16" fill="#EFE9DC" stroke="#171412" stroke-width="2.5"/>
          <path d="M104 74h12M88 100q22 13 44 0" fill="none" stroke="#171412" stroke-width="2.8"/>
          <polygon points="93,102 98,113 103,104" fill="#F6F1E6" stroke="#171412" stroke-width="1.5"/>
          <polygon points="117,104 122,113 127,102" fill="#F6F1E6" stroke="#171412" stroke-width="1.5"/>
        </svg>`
    },
    spider: {
      title: 'L’Araignée du code sans tests',
      text: 'Une tarentule à besicles descend des poutres accompagnée d’une volée de courges rebondissantes. Ce n’est pas une anomalie, c’est historique.',
      sound: 'boo',
      svg: `
        <svg viewBox="0 0 220 168" aria-hidden="true">
          <path d="M110 6v50" stroke="#171412" stroke-width="2.5"/>
          <path d="M76 86Q36 62 28 96M73 98Q30 94 24 126M76 110Q42 124 38 150M144 86Q184 62 192 96M147 98Q190 94 196 126M144 110Q178 124 182 150" fill="none" stroke="#171412" stroke-width="3.8" stroke-linecap="round"/>
          <path d="M74 96a36 36 0 1 0 72 0a36 36 0 1 0-72 0Z" fill="#171412"/>
          <path d="M82 94a12 12 0 1 0 24 0a12 12 0 1 0-24 0ZM114 94a12 12 0 1 0 24 0a12 12 0 1 0-24 0Z" fill="#F6F1E6" stroke="#B82518" stroke-width="2.5"/>
          <path d="M91 94a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0-7.6 0ZM123 94a3.8 3.8 0 1 0 7.6 0a3.8 3.8 0 1 0-7.6 0Z" fill="#171412"/>
          <path d="M106 94h8" stroke="#B82518" stroke-width="2.8"/>
        </svg>`
    }
  };

  // --- Utilitaires visuels ---

  function triggerLightning() {
    const flash = document.getElementById('lightning-flash');
    if (flash) {
      flash.classList.remove('flash-active');
      void flash.offsetWidth;
      flash.classList.add('flash-active');
    }
    // Révèle le crâne à rayons X du Comte Legacy pendant 420 ms !
    document.body.classList.remove('xray-flash');
    void document.body.offsetWidth;
    document.body.classList.add('xray-flash');
    setTimeout(() => document.body.classList.remove('xray-flash'), 440);
  }

  function triggerMiniShake() {
    document.body.classList.remove('mini-shake');
    void document.body.offsetWidth;
    document.body.classList.add('mini-shake');
    setTimeout(() => document.body.classList.remove('mini-shake'), 420);
  }

  function addScare(count = 1) {
    state.scaresCount += count;
    updateHudStats();
    renderCertificate();
  }

  function updateHudStats() {
    const elBones = document.getElementById('stat-bones');
    const elScares = document.getElementById('stat-scares');
    if (elBones) elBones.textContent = String(state.bonesCount);
    if (elScares) elScares.textContent = String(state.scaresCount);
  }

  function syncAudioButtons() {
    const btnOrgan = document.getElementById('btn-toggle-organ');
    const btnMute = document.getElementById('btn-toggle-mute');
    if (!window.HauntedAudio) return;

    const isMuted = window.HauntedAudio.muted;
    const isOrgan = window.HauntedAudio.organPlaying && !isMuted;

    if (btnOrgan) {
      btnOrgan.textContent = isOrgan ? 'Orgue : marche' : 'Orgue : arrêt';
      btnOrgan.setAttribute('aria-pressed', String(isOrgan));
      btnOrgan.classList.toggle('is-active', isOrgan);
    }
    if (btnMute) {
      btnMute.textContent = isMuted ? 'Mode silence' : 'Son : actif';
      btnMute.setAttribute('aria-pressed', String(!isMuted));
      btnMute.classList.toggle('is-active', !isMuted);
    }
  }

  function syncCandleButton() {
    const btn = document.getElementById('btn-toggle-candle');
    if (!btn || !window.HauntedPhysics) return;
    const active = window.HauntedPhysics.isCandleMode();
    btn.textContent = active ? 'Veillée : chandelle active' : 'Veillée : chandelle';
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-active', active);
  }

  function syncMouseButton() {
    const btn = document.getElementById('btn-toggle-mouse');
    if (!btn || !window.HauntedPhysics) return;
    const active = window.HauntedPhysics.isHauntedMouse();
    state.hauntedMouseActive = active;
    btn.textContent = active ? 'Souris : hantée' : 'Souris : sobre';
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-active', active);
  }

  const KONAMI_SEQUENCE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
  let konamiCursor = 0;

  function triggerSkeletonBall() {
    state.skeletonBallUnlocked = true;
    triggerLightning();
    triggerMiniShake();
    if (window.HauntedAudio) {
      window.HauntedAudio.playDoot();
      setTimeout(() => {
        if (window.HauntedAudio) window.HauntedAudio.playReliefJingle();
      }, 520);
    }
    if (window.HauntedPhysics) {
      window.HauntedPhysics.triggerBalDesSquelettes();
    }
    addScare(2);
    renderCertificate();
  }

  // --- 1. Yeux suiveurs à ressort (.haunted-eye) ---

  function initEyeTracking() {
    const eyeNodes = Array.from(document.querySelectorAll('.haunted-eye')).map((el) => ({
      el,
      maxMove: parseFloat(el.getAttribute('data-max-move') || '4.5'),
      cx: 0,
      cy: 0,
      vx: 0,
      vy: 0,
      tx: 0,
      ty: 0
    }));

    let pointerMoved = false;
    let animating = false;

    function stepSpring() {
      let stillMoving = false;
      for (let i = 0; i < eyeNodes.length; i++) {
        const item = eyeNodes[i];
        item.vx = (item.vx + (item.tx - item.cx) * 0.28) * 0.66;
        item.vy = (item.vy + (item.ty - item.cy) * 0.28) * 0.66;
        item.cx += item.vx;
        item.cy += item.vy;

        item.el.style.setProperty('--pupil-x', item.cx.toFixed(2) + 'px');
        item.el.style.setProperty('--pupil-y', item.cy.toFixed(2) + 'px');

        if (
          Math.abs(item.tx - item.cx) > 0.04 ||
          Math.abs(item.ty - item.cy) > 0.04 ||
          Math.abs(item.vx) > 0.04 ||
          Math.abs(item.vy) > 0.04
        ) {
          stillMoving = true;
        }
      }

      if (stillMoving) {
        requestAnimationFrame(stepSpring);
      } else {
        animating = false;
      }
    }

    window.addEventListener('pointermove', (e) => {
      for (let i = 0; i < eyeNodes.length; i++) {
        const item = eyeNodes[i];
        const rect = item.el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        const ox = rect.left + rect.width * 0.5;
        const oy = rect.top + rect.height * 0.5;
        const dx = e.clientX - ox;
        const dy = e.clientY - oy;
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(item.maxMove, Math.hypot(dx, dy) / 26);
        item.tx = Math.cos(angle) * dist;
        item.ty = Math.sin(angle) * dist;

        if (!pointerMoved) {
          item.cx = item.tx * 0.5;
          item.cy = item.ty * 0.5;
          item.el.style.setProperty('--pupil-x', item.cx.toFixed(2) + 'px');
          item.el.style.setProperty('--pupil-y', item.cy.toFixed(2) + 'px');
        }
      }
      pointerMoved = true;
      if (!animating) {
        animating = true;
        requestAnimationFrame(stepSpring);
      }
    }, { passive: true });
  }

  // --- 2. Grille en fer forgé & Heurtoir ---

  function openIronGate(withSound) {
    if (state.gateOpen) return;
    state.gateOpen = true;

    const gate = document.getElementById('iron-gate');
    const knocker = document.getElementById('gate-knocker');
    if (knocker) knocker.classList.add('knocking');

    if (window.HauntedAudio) {
      window.HauntedAudio.init(withSound);
      if (withSound) {
        window.HauntedAudio.playGateCreak();
        setTimeout(() => window.HauntedAudio.playThunder(), 260);
      }
    }

    syncAudioButtons();
    triggerLightning();

    setTimeout(() => {
      if (gate) gate.classList.add('is-open');
      document.body.classList.remove('gate-locked');

      if (window.HauntedPhysics) {
        window.HauntedPhysics.spawnBats(window.innerWidth * 0.5, window.innerHeight * 0.35, 12);
        window.HauntedPhysics.spawnRain(7);
        window.HauntedPhysics.spawnComicText(
          window.innerWidth * 0.5,
          136,
          withSound ? 'Entrée au son de l’orgue !' : 'Entrée feutrée en silence',
          withSound
        );
      }
    }, 240);
  }

  // --- 3. Squelette pendu au défilement ---

  function dropHangingSkeleton(customMessage) {
    const trap = document.getElementById('hanging-skeleton');
    const msgEl = document.getElementById('hanging-skeleton-msg');
    if (!trap || trap.classList.contains('dropped')) return;

    const msg = customMessage || HANGING_MESSAGES[Math.floor(Math.random() * HANGING_MESSAGES.length)];
    if (msgEl) msgEl.textContent = msg;

    trap.classList.add('dropped');
    addScare(1);

    if (window.HauntedAudio) window.HauntedAudio.playCartoonBoo();
    if (window.HauntedPhysics) {
      window.HauntedPhysics.spawnComicText(window.innerWidth - 150, 120, 'Gare au fil !', true);
    }

    if (state.hangingTimeout) clearTimeout(state.hangingTimeout);
    state.hangingTimeout = setTimeout(() => {
      trap.classList.remove('dropped');
    }, 5800);
  }

  function initScrollTraps() {
    const trap = document.getElementById('hanging-skeleton');
    if (trap) {
      const dismiss = () => {
        if (!trap.classList.contains('dropped')) return;
        const rect = trap.getBoundingClientRect();
        trap.classList.remove('dropped');
        if (window.HauntedAudio) window.HauntedAudio.playBoneClack(0.8);
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnBurst(rect.left + rect.width * 0.5, rect.bottom - 30, 3, 'skull');
          window.HauntedPhysics.spawnComicText(rect.left + 40, rect.top + 60, 'Fil tranché !', false);
        }
      };
      trap.addEventListener('click', dismiss);
      trap.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dismiss();
        }
      });
    }

    window.addEventListener('scroll', () => {
      if (!state.gateOpen) return;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 100) return;
      const progress = window.scrollY / docHeight;

      if (progress > 0.24 && !state.scrollThresholdsHit.first) {
        state.scrollThresholdsHit.first = true;
        dropHangingSkeleton(HANGING_MESSAGES[0]);
      } else if (progress > 0.62 && !state.scrollThresholdsHit.second) {
        state.scrollThresholdsHit.second = true;
        dropHangingSkeleton(HANGING_MESSAGES[1]);
      }
    }, { passive: true });
  }

  // --- 4. Modale d'apparition d'Apothicairerie ---

  function showCartoonScare(key) {
    const scare = CARTOON_SCARES[key] || CARTOON_SCARES.doot;
    const modal = document.getElementById('cartoon-scare-modal');
    const art = document.getElementById('cartoon-scare-art');
    const title = document.getElementById('cartoon-scare-title');
    const text = document.getElementById('cartoon-scare-text');
    if (!modal || !art || !title || !text) return;

    art.innerHTML = scare.svg;
    title.textContent = scare.title;
    text.textContent = scare.text;
    modal.hidden = false;

    triggerMiniShake();
    addScare(1);

    if (window.HauntedAudio) {
      if (scare.sound === 'doot') window.HauntedAudio.playDoot();
      else if (scare.sound === 'laugh') window.HauntedAudio.playWitchLaugh();
      else window.HauntedAudio.playCartoonBoo();
    }

    if (window.HauntedPhysics) {
      if (key === 'doot') {
        window.HauntedPhysics.spawnRain(10);
        window.HauntedPhysics.spawnComicText(window.innerWidth * 0.5, 150, 'Fanfare d’outre-tombe !', true);
      } else if (key === 'spider') {
        window.HauntedPhysics.spawnBurst(window.innerWidth * 0.5, 220, 9, 'pumpkin');
      } else {
        window.HauntedPhysics.spawnBats(window.innerWidth * 0.5, window.innerHeight * 0.4, 10);
      }
    }
  }

  function closeCartoonScare() {
    const modal = document.getElementById('cartoon-scare-modal');
    if (modal) modal.hidden = true;
  }

  // --- 5. Acte I : Lustre, Tonnerre & Portrait du Comte Legacy ---

  function initZone1() {
    const chandelier = document.getElementById('bone-chandelier');
    if (chandelier) {
      chandelier.addEventListener('click', () => {
        chandelier.classList.remove('shaking');
        void chandelier.offsetWidth;
        chandelier.classList.add('shaking');
        const r = chandelier.getBoundingClientRect();
        if (window.HauntedAudio) window.HauntedAudio.playBoneClack(0.95);
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnRain(10, r.left + r.width * 0.5, r.bottom);
          window.HauntedPhysics.spawnComicText(r.left + r.width * 0.5, r.bottom + 24, 'Crac ! Le lustre cède !', true);
        }
      });
    }

    const heroRain = document.getElementById('btn-hero-rain');
    if (heroRain) {
      heroRain.addEventListener('click', () => {
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnRain(14);
          window.HauntedPhysics.spawnComicText(window.innerWidth * 0.5, 160, 'Avalanche d’ossements !', true);
        }
      });
    }

    const moon = document.getElementById('blood-moon');
    if (moon) {
      moon.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerLightning();
        triggerMiniShake();
        const r = moon.getBoundingClientRect();
        if (window.HauntedAudio) window.HauntedAudio.playThunder();
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnBats(r.left + r.width * 0.5, r.top + r.height * 0.5, 14);
          window.HauntedPhysics.spawnComicText(r.left, r.top + 20, 'Coup de tonnerre !', true);
        }
      });
    }

    const portrait = document.getElementById('ancestor-portrait');
    const quoteEl = document.getElementById('portrait-quote');
    if (portrait) {
      const pokePortrait = (e) => {
        if (e && e.target && e.target.closest('#blood-moon')) return;
        state.portraitClicks++;
        const quote = PORTRAIT_QUOTES[(state.portraitClicks - 1) % PORTRAIT_QUOTES.length];
        if (quoteEl) quoteEl.textContent = quote;

        const r = portrait.getBoundingClientRect();
        if (state.portraitClicks % 4 === 0) {
          showCartoonScare('gitghost');
        } else {
          triggerLightning();
          if (window.HauntedAudio) window.HauntedAudio.playWitchLaugh();
          if (window.HauntedPhysics) {
            window.HauntedPhysics.spawnBats(r.left + r.width * 0.5, r.top + 60, 6);
            window.HauntedPhysics.spawnComicText(r.left + r.width * 0.5, r.top + 32, 'Quel toupet !', false);
          }
        }
      };

      portrait.addEventListener('click', pokePortrait);
      portrait.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target && e.target.closest('#blood-moon')) return;
          e.preventDefault();
          pokePortrait(e);
        }
      });
    }
  }

  // --- 6. Acte II : L'Apothicairerie des mises en prod ---

  function initZone2() {
    const ingButtons = document.querySelectorAll('.ingredient-btn');
    const cauldron = document.getElementById('witch-cauldron');
    const liquid = document.getElementById('cauldron-liquid');
    const statusEl = document.getElementById('cauldron-status');
    const brewBtn = document.getElementById('btn-brew-potion');

    const liquidColors = {
      toad: '#3B4D2B',
      spider: '#4E463E',
      gitpush: '#B82518',
      linkedin: '#87190F',
      calcium: '#DF7A2E'
    };

    function resetIngredientStamps() {
      ingButtons.forEach((b) => {
        b.classList.remove('is-selected');
        const stamp = b.querySelector('.ing-stamp');
        if (stamp) stamp.textContent = 'Verser';
      });
    }

    function brewPotion() {
      if (cauldron) {
        cauldron.classList.remove('bubbling-hard');
        void cauldron.offsetWidth;
        cauldron.classList.add('bubbling-hard');
      }

      state.potionsCount++;
      const ings = state.selectedIngredients.slice();

      let scareKey = 'spider';
      if (ings.includes('calcium')) scareKey = 'doot';
      else if (ings.includes('gitpush')) scareKey = 'gitghost';
      else if (ings.includes('linkedin')) scareKey = 'recruiter';
      else if (ings.includes('spider')) scareKey = 'spider';
      else scareKey = ['doot', 'gitghost', 'recruiter', 'spider'][state.potionsCount % 4];

      state.selectedIngredients = [];
      resetIngredientStamps();
      if (statusEl) {
        statusEl.textContent = `Décoction n° ${state.potionsCount} servie. Choisissez deux nouveaux ingrédients.`;
      }

      renderCertificate();
      showCartoonScare(scareKey);
    }

    ingButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const ing = btn.getAttribute('data-ing');
        const label = btn.getAttribute('data-label') || ing;

        if (window.HauntedAudio) window.HauntedAudio.playBubble();
        if (liquid && liquidColors[ing]) {
          liquid.setAttribute('fill', liquidColors[ing]);
        }

        const r = btn.getBoundingClientRect();
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnComicText(r.right - 60, r.top, `Ajout : ${label}`, false);
        }

        if (!state.selectedIngredients.includes(ing)) {
          state.selectedIngredients.push(ing);
          btn.classList.add('is-selected');
          const stamp = btn.querySelector('.ing-stamp');
          if (stamp) stamp.textContent = 'Dans la fonte';
        }

        if (state.selectedIngredients.length >= 2) {
          setTimeout(brewPotion, 300);
        } else if (statusEl) {
          statusEl.textContent = `Premier ingrédient versé (${label}). Ajoutez un second extrait.`;
        }
      });
    });

    if (brewBtn) {
      brewBtn.addEventListener('click', () => {
        if (window.HauntedAudio) window.HauntedAudio.playBubble();
        brewPotion();
      });
    }
  }

  // --- 7. Acte III : Le Cimetière des projets abandonnés ---

  function initZone3() {
    const tombs = document.querySelectorAll('.tombstone-card');
    tombs.forEach((tomb) => {
      const wakeTomb = () => {
        const key = tomb.getAttribute('data-tomb');
        const reactionEl = tomb.querySelector('.tomb-reaction');
        const r = tomb.getBoundingClientRect();

        tomb.classList.add('awakened');
        if (reactionEl && TOMB_REACTIONS[key]) {
          reactionEl.textContent = TOMB_REACTIONS[key];
        }

        triggerMiniShake();
        if (window.HauntedAudio) window.HauntedAudio.playZombieGroan();
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnBurst(r.left + r.width * 0.5, r.top + 30, 6, 'mixed');
          window.HauntedPhysics.spawnComicText(r.left + r.width * 0.5, r.top + 10, 'Exhumation !', true);
        }

        if (!state.wokenTombs.has(key)) {
          state.wokenTombs.add(key);
          addScare(1);

          if (state.wokenTombs.size === 4) {
            setTimeout(() => {
              if (window.HauntedAudio) window.HauntedAudio.playDoot();
              if (window.HauntedPhysics) {
                window.HauntedPhysics.spawnRain(12);
                window.HauntedPhysics.spawnComicText(
                  window.innerWidth * 0.5,
                  window.innerHeight * 0.35,
                  'Nécromancien du code legacy !',
                  true
                );
              }
            }, 440);
          }
        }
      };

      tomb.addEventListener('click', wakeTomb);
      tomb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          wakeTomb();
        }
      });
    });
  }

  // --- 8. Acte IV : Le Cercueil Vermillon (3 Chaînes -> Sursaut -> Punchline) ---

  function triggerRealJumpScare() {
    const overlay = document.getElementById('real-jumpscare-overlay');
    const monsterStage = document.getElementById('jumpscare-monster-stage');
    const reliefCard = document.getElementById('relief-card');
    const noFlash = document.getElementById('chk-no-flash');
    if (!overlay || !monsterStage || !reliefCard) return;

    state.coffinOpenedOnce = true;
    addScare(2);

    monsterStage.hidden = false;
    reliefCard.hidden = true;
    overlay.hidden = false;

    const disableFlash = noFlash && noFlash.checked;
    if (!disableFlash) {
      overlay.classList.add('strobe-on');
      document.body.classList.add('mega-shake');
    }

    if (window.HauntedAudio) {
      window.HauntedAudio.playRealJumpScare();
    }

    setTimeout(() => {
      overlay.classList.remove('strobe-on');
      document.body.classList.remove('mega-shake');
      monsterStage.hidden = true;
      reliefCard.hidden = false;

      if (window.HauntedAudio) {
        window.HauntedAudio.playReliefJingle();
      }
      if (window.HauntedPhysics) {
        window.HauntedPhysics.spawnRain(16);
      }
      renderCertificate();
    }, 1250);
  }

  function resetCoffinChains() {
    state.coffinChainsBroken = 0;
    const wrap = document.getElementById('red-coffin-wrap');
    const status = document.getElementById('coffin-status');
    const btn = document.getElementById('btn-hit-coffin');

    document.querySelectorAll('.coffin-chain-line').forEach((c) => c.classList.remove('broken'));
    if (wrap) wrap.classList.remove('tension-1', 'tension-2');
    if (status) status.textContent = 'Cercueil refermé et cadenassé à neuf pour le prochain visiteur.';
    if (btn) btn.textContent = 'Briser la première chaîne (1/3)';
  }

  function initZone4() {
    const wrap = document.getElementById('red-coffin-wrap');
    const status = document.getElementById('coffin-status');
    const btn = document.getElementById('btn-hit-coffin');
    const closeRelief = document.getElementById('btn-close-relief');
    const nameInput = document.getElementById('cert-visitor-name');

    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        state.visitorName = e.target.value.trim();
        renderCertificate();
      });
    }

    const hitCoffin = () => {
      if (state.coffinChainsBroken >= 3) {
        resetCoffinChains();
        return;
      }

      state.coffinChainsBroken++;
      const step = state.coffinChainsBroken;
      const chainEl = document.querySelector(`.coffin-chain-line[data-chain="${step}"]`);
      if (chainEl) chainEl.classList.add('broken');

      const r = wrap
        ? wrap.getBoundingClientRect()
        : { left: window.innerWidth * 0.4, top: window.innerHeight * 0.5, width: 120 };

      if (step === 1) {
        if (wrap) wrap.classList.add('tension-1');
        if (status) status.textContent = 'Première chaîne rompue (1/3). On gratte furieusement sous les planches.';
        if (btn) btn.textContent = 'Briser la deuxième chaîne (2/3)';
        if (window.HauntedAudio) window.HauntedAudio.playChainBreak(1);
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnComicText(r.left + r.width * 0.5, r.top, 'Premier cadenas rompu !', false);
        }
      } else if (step === 2) {
        if (wrap) {
          wrap.classList.remove('tension-1');
          wrap.classList.add('tension-2');
        }
        triggerLightning();
        if (status) status.textContent = 'Deuxième chaîne rompue (2/3). Dernière sommation avant ouverture.';
        if (btn) btn.textContent = 'Faire sauter le dernier verrou (3/3)';
        if (window.HauntedAudio) window.HauntedAudio.playChainBreak(2);
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnComicText(r.left + r.width * 0.5, r.top, 'Dernier verrou !', true);
        }
      } else if (step === 3) {
        if (wrap) wrap.classList.remove('tension-1', 'tension-2');
        if (status) status.textContent = 'Cercueil ouvert. Votre sang-froid est dûment consigné.';
        if (btn) btn.textContent = 'Refermer et cadenasser le cercueil';
        triggerRealJumpScare();
      }
    };

    if (btn) btn.addEventListener('click', hitCoffin);
    if (wrap) {
      wrap.addEventListener('click', hitCoffin);
      wrap.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hitCoffin();
        }
      });
    }

    if (closeRelief) {
      closeRelief.addEventListener('click', () => {
        const overlay = document.getElementById('real-jumpscare-overlay');
        if (overlay) overlay.hidden = true;
      });
    }
  }

  // --- 9. Diplôme Notarié Imprimé pour LinkedIn (Canvas 1200x630) ---

  function getSurvivorRank() {
    if (state.coffinOpenedOnce && state.wokenTombs.size === 4) {
      return 'Grand-Maître du Cercueil Vermillon et du Code Legacy';
    }
    if (state.coffinOpenedOnce) {
      return 'Sang-Froid Certifié : Survivant du Cercueil Vermillon';
    }
    if (state.bonesCount >= 25 || state.potionsCount >= 2) {
      return 'Maître Apothicaire des Mises en Production';
    }
    if (state.scaresCount >= 2) {
      return 'Inspecteur Nocturne des Régressions';
    }
    return 'Visiteur Prudent de la Gazette du Manoir';
  }

  function drawWaxSeal(g, cx, cy, radius) {
    g.save();
    g.translate(cx, cy);
    g.rotate(-0.12);

    // Rubans de cire vermillon pendants
    g.fillStyle = '#87190F';
    g.beginPath();
    g.moveTo(-16, radius - 8);
    g.lineTo(-26, radius + 38);
    g.lineTo(-12, radius + 28);
    g.lineTo(0, radius + 38);
    g.lineTo(8, radius - 8);
    g.closePath();
    g.fill();

    g.fillStyle = '#B82518';
    g.beginPath();
    g.moveTo(4, radius - 8);
    g.lineTo(22, radius + 34);
    g.lineTo(10, radius + 26);
    g.lineTo(-2, radius + 34);
    g.lineTo(-6, radius - 8);
    g.closePath();
    g.fill();

    // Cachet rond festonné
    g.fillStyle = '#B82518';
    g.strokeStyle = '#171412';
    g.lineWidth = 2.5;
    g.beginPath();
    const lobes = 20;
    for (let i = 0; i <= lobes * 4; i++) {
      const a = (i / (lobes * 4)) * Math.PI * 2;
      const r = radius + Math.sin(a * lobes) * 4.2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    g.stroke();

    // Double filet intérieur
    g.strokeStyle = '#F6F1E6';
    g.lineWidth = 1.8;
    g.beginPath();
    g.arc(0, 0, radius - 11, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = '#F6F1E6';
    g.textAlign = 'center';
    g.font = '700 14px "IBM Plex Sans", sans-serif';
    g.fillText('31 OCTOBRE', 0, -6);
    g.font = '900 19px "Bodoni Moda", Georgia, serif';
    g.fillText('CERTIFIÉ', 0, 16);
    g.restore();
  }

  function renderCertificate() {
    const c = document.getElementById('cert-preview-canvas');
    if (!c) return;
    const g = c.getContext('2d');
    const W = 1200;
    const H = 630;

    // Fond papier vélin d'imprimerie
    g.fillStyle = '#EFE9DC';
    g.fillRect(0, 0, W, H);

    // Double filet typographique Grand-Guignol avec coins fleuronnés
    g.strokeStyle = '#171412';
    g.lineWidth = 5;
    g.strokeRect(24, 24, W - 48, H - 48);

    g.lineWidth = 1.5;
    g.strokeRect(36, 36, W - 72, H - 72);

    const corners = [
      [44, 44],
      [W - 56, 44],
      [44, H - 56],
      [W - 56, H - 56]
    ];
    g.fillStyle = '#B82518';
    corners.forEach(([x, y]) => {
      g.fillRect(x, y, 12, 12);
    });

    // En-tête de manchette officielle
    g.textAlign = 'left';
    g.fillStyle = '#B82518';
    g.font = '700 17px "IBM Plex Sans", sans-serif';
    g.fillText('GAZETTE DU MANOIR   |   ÉDITION DU 31 OCTOBRE   |   DIPLÔME OFFICIEL DE SURVIE', 72, 88);

    // Filet noir sous manchette
    g.fillStyle = '#171412';
    g.fillRect(72, 102, W - 260, 2);

    // Titre principal monumental
    g.fillStyle = '#171412';
    g.font = '900 44px "Bodoni Moda", Georgia, serif';
    g.fillText('Le Grand-Guignol des développeurs', 72, 154);

    // Ligne personnalisée de l'attestation
    g.fillStyle = '#4E463E';
    g.font = '700 italic 24px "Bodoni Moda", Georgia, serif';
    if (state.visitorName) {
      g.fillText('Décerné solennellement à : ' + state.visitorName, 72, 196);
      g.font = '600 16px "IBM Plex Sans", sans-serif';
      g.fillStyle = '#B82518';
      g.fillText('Rang homologué : ' + getSurvivorRank(), 72, 224);
    } else {
      g.fillText('Titre officiel : ' + getSurvivorRank(), 72, 202);
    }

    // Cachet de cire vermillon à rubans en haut à droite
    drawWaxSeal(g, 1064, 136, 62);

    // Ruban commémoratif du Bal des Squelettes si déverrouillé
    if (state.skeletonBallUnlocked) {
      g.save();
      g.fillStyle = '#171412';
      g.fillRect(W - 478, 52, 276, 30);
      g.fillStyle = '#B82518';
      g.fillRect(W - 480, 50, 276, 30);
      g.strokeStyle = '#171412';
      g.lineWidth = 1.5;
      g.strokeRect(W - 480, 50, 276, 30);
      g.fillStyle = '#F6F1E6';
      g.font = '700 12px "IBM Plex Sans", sans-serif';
      g.textAlign = 'center';
      g.fillText('MAÎTRE DU BAL DES SQUELETTES 1897', W - 342, 69);
      g.restore();
    }

    // Quatre registres comptables à ombre franche
    const cards = [
      { label: 'Ossements tombés', value: String(state.bonesCount), accent: false },
      { label: 'Frayeurs subies', value: String(state.scaresCount), accent: false },
      { label: 'Décoctions servies', value: String(state.potionsCount), accent: false },
      {
        label: 'Cercueil Vermillon',
        value: state.coffinOpenedOnce ? 'OUVERT' : 'SCELLÉ',
        accent: state.coffinOpenedOnce
      }
    ];

    const startX = 72;
    const cardW = 248;
    const gap = 21;
    const cardY = 262;
    const cardH = 210;

    cards.forEach((item, idx) => {
      const x = startX + idx * (cardW + gap);

      // Ombre portée au plomb
      g.fillStyle = '#171412';
      g.fillRect(x + 5, cardY + 5, cardW, cardH);

      // Carte papier d'archive
      g.fillStyle = item.accent ? '#EAD5CD' : '#F6F1E6';
      g.fillRect(x, cardY, cardW, cardH);
      g.strokeStyle = '#171412';
      g.lineWidth = 2;
      g.strokeRect(x, cardY, cardW, cardH);

      // Filet d'accent supérieur
      g.fillStyle = item.accent ? '#B82518' : '#171412';
      g.fillRect(x, cardY, cardW, 6);

      // Valeur chiffrée ou mot
      g.fillStyle = item.accent ? '#B82518' : '#171412';
      const isWord = Number.isNaN(Number(item.value));
      g.font = isWord
        ? '900 38px "Bodoni Moda", Georgia, serif'
        : '900 58px "Bodoni Moda", Georgia, serif';
      g.fillText(item.value, x + 24, cardY + (isWord ? 104 : 110));

      // Séparateur fin
      g.fillStyle = '#BFB4A0';
      g.fillRect(x + 24, cardY + 142, cardW - 48, 1.5);

      // Libellé de registre
      g.fillStyle = '#4E463E';
      g.font = '600 18px "IBM Plex Sans", sans-serif';
      g.fillText(item.label, x + 24, cardY + 176);
    });

    // Colophon bas de page
    g.fillStyle = '#171412';
    g.fillRect(72, 516, W - 144, 1.5);

    g.fillStyle = '#171412';
    g.font = '700 19px "IBM Plex Sans", sans-serif';
    g.fillText(
      'Feuilleton interactif conçu et codé par Rayan Mazouni  |  Vanilla JS, Physique Canvas 2D et Web Audio',
      72,
      552
    );
  }

  function initCertificateActions() {
    const btnDownload = document.getElementById('btn-download-cert');
    const btnCopy = document.getElementById('btn-copy-linkedin');
    const feedback = document.getElementById('copy-feedback');

    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        renderCertificate();
        const c = document.getElementById('cert-preview-canvas');
        if (!c) return;
        const link = document.createElement('a');
        link.download = 'diplome-gazette-du-manoir.png';
        link.href = c.toDataURL('image/png');
        link.click();
        if (feedback) {
          feedback.textContent = 'Diplôme PNG enregistré, prêt à illustrer votre publication LinkedIn.';
        }
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const coffinTxt = state.coffinOpenedOnce ? 'Ouvert (trois chaînes brisées)' : 'Maintenu scellé';
        const namePrefix = state.visitorName ? `Par ${state.visitorName} : ` : '';
        const balSuffix = state.skeletonBallUnlocked ? '\nSecret : A mené le Bal des Squelettes 1897 !' : '';
        const shareText =
          `${namePrefix}J’ai traversé la Gazette du Manoir (édition Grand-Guignol du 31 octobre) :\n` +
          `${state.bonesCount} ossements tombés | ${state.scaresCount} frayeurs | ${state.potionsCount} décoctions | Cercueil Vermillon : ${coffinTxt}\n` +
          `Titre décerné : ${getSurvivorRank()}${balSuffix}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareText).then(() => {
            if (feedback) feedback.textContent = 'Résumé copié dans le presse-papiers.';
          });
        } else if (feedback) {
          feedback.textContent = shareText;
        }
      });
    }
  }

  // --- Initialisation Générale ---

  function init() {
    if (window.HauntedPhysics) {
      window.HauntedPhysics.init((totalSpawned) => {
        state.bonesCount = totalSpawned;
        updateHudStats();
        renderCertificate();
      });
      window.HauntedPhysics.spawnBats(window.innerWidth * 0.65, 160, 6);
    }

    initEyeTracking();
    syncMouseButton();

    const btnSound = document.getElementById('btn-enter-sound');
    const btnMute = document.getElementById('btn-enter-mute');
    if (btnSound) btnSound.addEventListener('click', () => openIronGate(true));
    if (btnMute) btnMute.addEventListener('click', () => openIronGate(false));

    const hudRain = document.getElementById('btn-rain-skeletons');
    const hudSweep = document.getElementById('btn-sweep-bones');
    const hudOrgan = document.getElementById('btn-toggle-organ');
    const hudMute = document.getElementById('btn-toggle-mute');
    const hudCandle = document.getElementById('btn-toggle-candle');
    const hudMouse = document.getElementById('btn-toggle-mouse');

    if (hudMouse) {
      hudMouse.addEventListener('click', () => {
        if (window.HauntedPhysics) {
          const isNowActive = window.HauntedPhysics.toggleHauntedMouse();
          syncMouseButton();
          if (window.HauntedAudio && typeof window.HauntedAudio.playBoneTap === 'function') {
            window.HauntedAudio.playBoneTap(1.25);
          }
          window.HauntedPhysics.spawnComicText(
            window.innerWidth * 0.5,
            120,
            isNowActive ? 'Main hantée réveillée !' : 'Main calmée',
            isNowActive
          );
        }
      });
    }

    if (hudRain) {
      hudRain.addEventListener('click', () => {
        if (window.HauntedPhysics) {
          window.HauntedPhysics.spawnRain(12);
          window.HauntedPhysics.spawnComicText(window.innerWidth * 0.5, 120, 'Pluie de squelettes !', true);
        }
      });
    }
    if (hudSweep) {
      hudSweep.addEventListener('click', () => {
        if (window.HauntedPhysics) window.HauntedPhysics.clearBones();
      });
    }
    if (hudOrgan) {
      hudOrgan.addEventListener('click', () => {
        if (window.HauntedAudio) {
          window.HauntedAudio.toggleOrgan();
          syncAudioButtons();
        }
      });
    }
    if (hudMute) {
      hudMute.addEventListener('click', () => {
        if (window.HauntedAudio) {
          window.HauntedAudio.toggleMute();
          syncAudioButtons();
        }
      });
    }

    if (hudCandle) {
      hudCandle.addEventListener('click', () => {
        if (window.HauntedPhysics) {
          const isNowActive = window.HauntedPhysics.toggleCandleMode();
          syncCandleButton();
          if (window.HauntedAudio) {
            if (isNowActive && typeof window.HauntedAudio.playMatchStrike === 'function') {
              window.HauntedAudio.playMatchStrike();
            } else {
              window.HauntedAudio.playBubble();
            }
          }
          window.HauntedPhysics.spawnComicText(
            window.innerWidth * 0.5,
            120,
            isNowActive ? 'Veillée allumée : cherchez l’encre secrète !' : 'Lumière rétablie',
            isNowActive
          );
        }
      });
    }

    // Raccourcis clavier (Chandelle: C, Souris: M, Bal: H, Konami)
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key === 'c' || e.key === 'C') {
        if (window.HauntedPhysics) {
          const isNowActive = window.HauntedPhysics.toggleCandleMode();
          syncCandleButton();
          if (window.HauntedAudio) {
            if (isNowActive && typeof window.HauntedAudio.playMatchStrike === 'function') {
              window.HauntedAudio.playMatchStrike();
            } else {
              window.HauntedAudio.playBubble();
            }
          }
          window.HauntedPhysics.spawnComicText(
            window.innerWidth * 0.5,
            120,
            isNowActive ? 'Veillée allumée !' : 'Lumière rétablie',
            isNowActive
          );
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        if (window.HauntedPhysics) {
          const isNowActive = window.HauntedPhysics.toggleHauntedMouse();
          syncMouseButton();
          if (window.HauntedAudio && typeof window.HauntedAudio.playBoneTap === 'function') {
            window.HauntedAudio.playBoneTap(1.25);
          }
          window.HauntedPhysics.spawnComicText(
            window.innerWidth * 0.5,
            120,
            isNowActive ? 'Main hantée réveillée !' : 'Main calmée',
            isNowActive
          );
        }
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        triggerSkeletonBall();
        return;
      }

      if (e.key.toLowerCase() === KONAMI_SEQUENCE[konamiCursor].toLowerCase()) {
        konamiCursor++;
        if (konamiCursor === KONAMI_SEQUENCE.length) {
          konamiCursor = 0;
          triggerSkeletonBall();
        }
      } else {
        konamiCursor = 0;
      }
    });

    const btnCloseCartoon = document.getElementById('btn-close-cartoon-scare');
    const cartoonModal = document.getElementById('cartoon-scare-modal');
    if (btnCloseCartoon) btnCloseCartoon.addEventListener('click', closeCartoonScare);
    if (cartoonModal) {
      cartoonModal.addEventListener('click', (e) => {
        if (e.target === cartoonModal) closeCartoonScare();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCartoonScare();
        const relief = document.getElementById('relief-card');
        const realOverlay = document.getElementById('real-jumpscare-overlay');
        if (realOverlay && !realOverlay.hidden && relief && !relief.hidden) {
          realOverlay.hidden = true;
        }
      }
    });

    initScrollTraps();
    initZone1();
    initZone2();
    initZone3();
    initZone4();
    initCertificateActions();
    renderCertificate();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => renderCertificate());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.MansionGags = { state, renderCertificate };
})();
