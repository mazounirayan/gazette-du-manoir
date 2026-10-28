/**
 * HauntedAudio — Synthétiseur 100% Web Audio API (Zéro MP3 externe, zéro latence)
 * Génère l'orgue gothique kitsch, le xylophone d'os, la trompette DOOT, le tonnerre,
 * les bulles du chaudron, le thérémine fantôme et le vrai jump scare du Cercueil Rouge.
 */
(function () {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let compressor = null;
  let organGain = null;
  let organTimer = null;
  let organStep = 0;
  let lastClackTime = 0;

  // Motif gothique kitsch en Ré mineur (façon Toccata & Fugue / Castlevania rétro)
  const ORGAN_NOTES = [
    // [fréquence mélodie, fréquence basse, durée en ms]
    [587.33, 146.83, 220], // D5, D3
    [554.37, 146.83, 220], // C#5
    [587.33, 146.83, 460], // D5
    [440.00, 146.83, 240], // A4
    [466.16, 116.54, 240], // Bb4, Bb2
    [440.00, 110.00, 240], // A4, A2
    [392.00, 98.00, 240],  // G4, G2
    [349.23, 87.31, 240],  // F4, F2
    [329.63, 110.00, 240], // E4, A2
    [293.66, 73.42, 680],  // D4, D2
    [0, 0, 220],           // Silence dramatique
    [440.00, 110.00, 210], // A4
    [466.16, 116.54, 210], // Bb4
    [554.37, 138.59, 420], // C#5 (diminué bien kitsch)
    [587.33, 146.83, 680], // D5
    [0, 0, 320]
  ];

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();

      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, ctx.currentTime);
      compressor.knee.setValueAtTime(18, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.2, ctx.currentTime);

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(HauntedAudio.muted ? 0 : 0.85, ctx.currentTime);

      organGain = ctx.createGain();
      organGain.gain.setValueAtTime(0.16, ctx.currentTime);

      organGain.connect(compressor);
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    HauntedAudio.unlocked = true;
    return true;
  }

  function createNoiseBuffer(durationSec) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function playOrganNote(melodyFreq, bassFreq, durationMs) {
    if (!ctx || HauntedAudio.muted || !HauntedAudio.organPlaying) return;
    if (melodyFreq <= 0) return;

    const now = ctx.currentTime;
    const dur = durationMs / 1000;

    // Tuyaux d'orgue : fondamental + octave + quinte légère + vibrato gothique
    const partials = [
      { mult: 1, type: 'sawtooth', amp: 0.28 },
      { mult: 2, type: 'triangle', amp: 0.18 },
      { mult: 0.5, type: 'triangle', amp: 0.22 }
    ];

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1650, now);
    filter.Q.setValueAtTime(2.2, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.45, now + 0.03);
    env.gain.setValueAtTime(0.38, now + Math.max(0.04, dur - 0.05));
    env.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.08);

    // LFO tremolo d'orgue hanté
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.8, now);
    lfoGain.gain.setValueAtTime(5, now);
    lfo.connect(lfoGain);
    lfo.start(now);
    lfo.stop(now + dur + 0.1);

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(melodyFreq * p.mult, now);
      lfoGain.connect(osc.frequency);
      g.gain.setValueAtTime(p.amp, now);
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + dur + 0.1);
    });

    if (bassFreq > 0) {
      const bass = ctx.createOscillator();
      const bg = ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(bassFreq, now);
      bg.gain.setValueAtTime(0.24, now);
      bass.connect(bg);
      bg.connect(filter);
      bass.start(now);
      bass.stop(now + dur + 0.1);
    }

    filter.connect(env);
    env.connect(organGain);
  }

  function scheduleOrganStep() {
    if (!HauntedAudio.organPlaying) return;
    const [mel, bass, dur] = ORGAN_NOTES[organStep % ORGAN_NOTES.length];
    organStep = (organStep + 1) % ORGAN_NOTES.length;
    playOrganNote(mel, bass, dur);
    organTimer = window.setTimeout(scheduleOrganStep, dur);
  }

  const HauntedAudio = {
    unlocked: false,
    muted: false,
    organPlaying: false,

    init(withSound = true) {
      this.muted = !withSound;
      if (withSound) {
        if (!ensureContext()) return;
        masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
        this.startOrgan();
      }
    },

    startOrgan() {
      if (!ensureContext()) return;
      if (this.organPlaying) return;
      this.organPlaying = true;
      if (organTimer) clearTimeout(organTimer);
      scheduleOrganStep();
    },

    stopOrgan() {
      this.organPlaying = false;
      if (organTimer) {
        clearTimeout(organTimer);
        organTimer = null;
      }
    },

    toggleOrgan() {
      if (this.muted) {
        this.muted = false;
        ensureContext();
        if (masterGain) masterGain.gain.setTargetAtTime(0.85, ctx.currentTime, 0.03);
        this.startOrgan();
        return true;
      }
      if (this.organPlaying) {
        this.stopOrgan();
      } else {
        this.startOrgan();
      }
      return this.organPlaying;
    },

    toggleMute() {
      this.muted = !this.muted;
      if (!this.muted) {
        if (ensureContext() && masterGain) {
          masterGain.gain.setTargetAtTime(0.85, ctx.currentTime, 0.03);
        }
      } else if (ctx && masterGain) {
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      }
      return { muted: this.muted, organPlaying: this.organPlaying };
    },

    // Grincement de grille en fer forgé + gong grave
    playGateCreak() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;

      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();

      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(210, now);
      carrier.frequency.exponentialRampToValueAtTime(430, now + 0.45);
      carrier.frequency.exponentialRampToValueAtTime(175, now + 0.95);

      mod.type = 'square';
      mod.frequency.setValueAtTime(28, now);
      mod.frequency.linearRampToValueAtTime(62, now + 0.9);
      modGain.gain.setValueAtTime(95, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(5, now);

      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.26, now + 0.08);
      env.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(filter);
      filter.connect(env);
      env.connect(compressor);

      mod.start(now);
      carrier.start(now);
      mod.stop(now + 1.05);
      carrier.stop(now + 1.05);
    },

    // Xylophone d'os quand les squelettes et crânes rebondissent
    playBoneClack(intensity = 0.6) {
      if (this.muted || !ensureContext()) return;
      const nowMs = performance.now();
      if (nowMs - lastClackTime < 48) return; // Anti-saturation en pluie massive
      lastClackTime = nowMs;

      const now = ctx.currentTime;
      const clamped = Math.min(1, Math.max(0.12, intensity));
      // Gamme mineure harmonique pour que les chutes d'os chantent comme dans un dessin animé !
      const pitches = [587.33, 659.25, 698.46, 783.99, 880, 932.33, 1108.73, 1174.66];
      const baseFreq = pitches[Math.floor(Math.random() * pitches.length)];

      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const env = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.085);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2.42, now); // Harmonique boisée de xylophone

      env.gain.setValueAtTime(0.32 * clamped, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      osc.connect(env);
      osc2.connect(env);
      env.connect(compressor);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.1);
      osc2.stop(now + 0.06);
    },

    // Clic osseux discret pour la souris hantée et les tapotements d’impatience
    playBoneTap(pitchMultiplier = 1) {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const baseFreq = 1680 * (pitchMultiplier || 1);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.038);
      env.gain.setValueAtTime(0.24, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
      osc.connect(env);
      env.connect(compressor);
      osc.start(now);
      osc.stop(now + 0.045);
    },

    // Désarticulation explosive quand un squelette s’écrase à vive allure
    playShatter() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const notes = [1046.5, 880, 1174.66, 698.46, 1396.91];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.024;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.08);
        env.gain.setValueAtTime(0.32, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(env);
        env.connect(compressor);
        osc.start(t);
        osc.stop(t + 0.1);
      });
    },

    // Allumage d’allumette pour la chandelle (grattement puis souffle de flamme)
    playMatchStrike() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(0.22);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3600, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
      filter.Q.setValueAtTime(4.2, now);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.38, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      noise.connect(filter);
      filter.connect(env);
      env.connect(compressor);
      noise.start(now);

      const hiss = ctx.createBufferSource();
      hiss.buffer = createNoiseBuffer(0.38);
      const hFilter = ctx.createBiquadFilter();
      hFilter.type = 'lowpass';
      hFilter.frequency.setValueAtTime(920, now + 0.07);
      const hEnv = ctx.createGain();
      hEnv.gain.setValueAtTime(0.001, now);
      hEnv.gain.linearRampToValueAtTime(0.24, now + 0.1);
      hEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      hiss.connect(hFilter);
      hFilter.connect(hEnv);
      hEnv.connect(compressor);
      hiss.start(now + 0.07);
    },

    // Le légendaire "DOOT DOOT !" du squelette trompettiste
    playDoot() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const notes = [
        { freq: 587.33, start: 0, dur: 0.14 },    // D5 — DOOT
        { freq: 698.46, start: 0.17, dur: 0.28 }  // F5 — DOOOOT!
      ];

      notes.forEach((n) => {
        const t = now + n.start;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const brassFilter = ctx.createBiquadFilter();
        const env = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(n.freq * 0.97, t);
        osc1.frequency.linearRampToValueAtTime(n.freq, t + 0.025);
        osc2.frequency.setValueAtTime(n.freq * 1.006, t);

        brassFilter.type = 'lowpass';
        brassFilter.frequency.setValueAtTime(600, t);
        brassFilter.frequency.exponentialRampToValueAtTime(2800, t + 0.04);
        brassFilter.frequency.exponentialRampToValueAtTime(1400, t + n.dur);
        brassFilter.Q.setValueAtTime(3.5, t);

        env.gain.setValueAtTime(0.001, t);
        env.gain.linearRampToValueAtTime(0.55, t + 0.02);
        env.gain.setValueAtTime(0.45, t + n.dur - 0.04);
        env.gain.exponentialRampToValueAtTime(0.001, t + n.dur + 0.05);

        osc1.connect(brassFilter);
        osc2.connect(brassFilter);
        brassFilter.connect(env);
        env.connect(compressor);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + n.dur + 0.06);
        osc2.stop(t + n.dur + 0.06);
      });
    },

    // Coup de tonnerre gothique
    playThunder() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(1.6);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 1.45);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.75, now);
      env.gain.exponentialRampToValueAtTime(0.28, now + 0.25);
      env.gain.linearRampToValueAtTime(0.45, now + 0.38); // Second craquement
      env.gain.exponentialRampToValueAtTime(0.001, now + 1.55);

      // Sub-bass d'impact
      const sub = ctx.createOscillator();
      const subEnv = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(85, now);
      sub.frequency.exponentialRampToValueAtTime(32, now + 0.9);
      subEnv.gain.setValueAtTime(0.55, now);
      subEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      noise.connect(filter);
      filter.connect(env);
      env.connect(compressor);

      sub.connect(subEnv);
      subEnv.connect(compressor);

      noise.start(now);
      sub.start(now);
      sub.stop(now + 1.0);
    },

    // Petit cri de chauve-souris rétro
    playBatScreech() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.09;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400 + i * 250, t);
        osc.frequency.exponentialRampToValueAtTime(1150, t + 0.065);
        env.gain.setValueAtTime(0.15, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(env);
        env.connect(compressor);
        osc.start(t);
        osc.stop(t + 0.08);
      }
    },

    // Bulle de chaudron de sorcière
    playBubble() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.075;
        const base = 220 + Math.random() * 260;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * 2.35, t + 0.08);
        env.gain.setValueAtTime(0.28, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(env);
        env.connect(compressor);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    },

    // Thérémine fantôme kitsch ("OoooOOoooh BOUH !")
    playCartoonBoo() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const env = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(790, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.7);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(11, now);
      lfoGain.gain.setValueAtTime(34, now);

      env.gain.setValueAtTime(0.01, now);
      env.gain.linearRampToValueAtTime(0.42, now + 0.08);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(env);
      env.connect(compressor);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.78);
      osc.stop(now + 0.78);
    },

    // Rire maléfique kitsch ("MOUA-HA-HA-HA-HAAA !")
    playWitchLaugh() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const steps = [680, 610, 540, 470, 390];
      steps.forEach((f, idx) => {
        const t = now + idx * 0.12;
        const dur = idx === steps.length - 1 ? 0.34 : 0.095;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const env = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.74, t + dur);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, t);
        filter.Q.setValueAtTime(2.5, t);

        env.gain.setValueAtTime(0.36, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(compressor);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      });
    },

    // Gémissement rigolo de main de zombie qui sort de terre
    playZombieGroan() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.linearRampToValueAtTime(175, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(98, now + 0.55);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.linearRampToValueAtTime(340, now + 0.55);
      filter.Q.setValueAtTime(4, now);

      env.gain.setValueAtTime(0.45, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

      osc.connect(filter);
      filter.connect(env);
      env.connect(compressor);
      osc.start(now);
      osc.stop(now + 0.6);
    },

    // Bris de chaîne métallique sur le Cercueil Rouge (1, 2)
    playChainBreak(step = 1) {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(0.28);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2100 + step * 500, now);
      filter.Q.setValueAtTime(6, now);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.6, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      // Bourdonnement grave de tension croissante
      const drone = ctx.createOscillator();
      const droneEnv = ctx.createGain();
      drone.type = 'sawtooth';
      drone.frequency.setValueAtTime(55 + step * 18, now);
      droneEnv.gain.setValueAtTime(0.32, now);
      droneEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      noise.connect(filter);
      filter.connect(env);
      env.connect(compressor);

      drone.connect(droneEnv);
      droneEnv.connect(compressor);

      noise.start(now);
      drone.start(now);
      drone.stop(now + 0.68);
    },

    // VRAI JUMP SCARE (Cercueil Rouge uniquement !)
    playRealJumpScare() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;

      // Accord strident dissonant (violons/cris type Psycho + hurlement)
      const freqs = [880, 932.33, 1244.51, 1661.22, 2349.32];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * (idx % 2 === 0 ? 1.28 : 0.76), now + 0.85);

        env.gain.setValueAtTime(0.55, now);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.92);

        osc.connect(env);
        env.connect(compressor);
        osc.start(now);
        osc.stop(now + 0.95);
      });

      // Impact bruité soudain
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(0.75);
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(1850, now);
      const nEnv = ctx.createGain();
      nEnv.gain.setValueAtTime(0.85, now);
      nEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

      noise.connect(nFilter);
      nFilter.connect(nEnv);
      nEnv.connect(compressor);
      noise.start(now);
    },

    // Petit jingle comique de soulagement 1,3s après le vrai jump scare ("Tadaaa / Langue de belle-mère")
    playReliefJingle() {
      if (this.muted || !ensureContext()) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const t = now + i * 0.08;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        env.gain.setValueAtTime(0.32, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(env);
        env.connect(compressor);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    }
  };

  window.HauntedAudio = HauntedAudio;
})();
