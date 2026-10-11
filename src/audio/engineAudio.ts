import { VehicleSpec } from '../types/game';

class EngineAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private oscFundamental: OscillatorNode | null = null;
  private oscSubCrank: OscillatorNode | null = null;
  private oscInduction: OscillatorNode | null = null;
  private gainFundamental: GainNode | null = null;
  private gainSubCrank: GainNode | null = null;
  private gainInduction: GainNode | null = null;
  private exhaustShaper: WaveShaperNode | null = null;
  private exhaustFilter: BiquadFilterNode | null = null;
  private resonanceFilter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private gainNoise: GainNode | null = null;
  private gainMaster: GainNode | null = null;

  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private lastThrottle: number = 0;
  private crackleTimer: number = 0;
  private startupEndTime: number = 0;

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted && !this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }
    if (this.gainMaster && this.ctx) {
      this.gainMaster.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainMaster.gain.setTargetAtTime(this.isMuted ? 0 : 0.26, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public enableSound(): void {
    this.isMuted = false;
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.gainMaster && this.ctx) {
      this.gainMaster.gain.setTargetAtTime(0.26, this.ctx.currentTime, 0.06);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private makeExhaustDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  private init(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.oscFundamental = this.ctx.createOscillator();
      this.oscSubCrank = this.ctx.createOscillator();
      this.oscInduction = this.ctx.createOscillator();

      this.gainFundamental = this.ctx.createGain();
      this.gainSubCrank = this.ctx.createGain();
      this.gainInduction = this.ctx.createGain();

      this.exhaustShaper = this.ctx.createWaveShaper();
      this.exhaustShaper.curve = this.makeExhaustDistortionCurve(32);
      this.exhaustShaper.oversample = '2x';

      this.exhaustFilter = this.ctx.createBiquadFilter();
      this.exhaustFilter.type = 'lowpass';
      this.exhaustFilter.frequency.value = 580;
      this.exhaustFilter.Q.value = 2.6;

      this.resonanceFilter = this.ctx.createBiquadFilter();
      this.resonanceFilter.type = 'peaking';
      this.resonanceFilter.frequency.value = 195;
      this.resonanceFilter.Q.value = 1.8;
      this.resonanceFilter.gain.value = 7.5;

      this.gainMaster = this.ctx.createGain();
      this.gainMaster.gain.value = this.isMuted ? 0 : 0.22;

      this.oscFundamental.type = 'sawtooth';
      this.oscSubCrank.type = 'triangle';
      this.oscInduction.type = 'square';

      this.gainFundamental.gain.value = 0.52;
      this.gainSubCrank.gain.value = 0.48;
      this.gainInduction.gain.value = 0.16;

      // Connect oscillators -> harmonic gains -> waveshaper -> resonance -> lowpass -> master
      this.oscFundamental.connect(this.gainFundamental);
      this.oscSubCrank.connect(this.gainSubCrank);
      this.oscInduction.connect(this.gainInduction);

      this.gainFundamental.connect(this.exhaustShaper);
      this.gainSubCrank.connect(this.exhaustShaper);
      this.gainInduction.connect(this.exhaustShaper);

      this.exhaustShaper.connect(this.resonanceFilter);
      this.resonanceFilter.connect(this.exhaustFilter);
      this.exhaustFilter.connect(this.gainMaster);

      // Create looping white noise buffer for turbo spool, tire slip & exhaust overrun crackles
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.value = 1400;
      this.noiseFilter.Q.value = 3.4;

      this.gainNoise = this.ctx.createGain();
      this.gainNoise.gain.value = 0.0;

      this.noiseNode.connect(this.noiseFilter);
      this.noiseFilter.connect(this.gainNoise);
      this.gainNoise.connect(this.gainMaster);

      this.gainMaster.connect(this.ctx.destination);

      this.oscFundamental.start();
      this.oscSubCrank.start();
      this.oscInduction.start();
      this.noiseNode.start();

      this.isInitialized = true;
    } catch {
      // Ignore WebAudio restrictions if blocked
    }
  }

  public playIgnitionStartup(): void {
    this.enableSound();
    if (!this.ctx || !this.oscFundamental || !this.oscSubCrank || !this.exhaustFilter) return;
    try {
      const now = this.ctx.currentTime;
      this.startupEndTime = now + 0.85;
      this.oscFundamental.frequency.cancelScheduledValues(now);
      this.oscSubCrank.frequency.cancelScheduledValues(now);
      this.exhaustFilter.frequency.cancelScheduledValues(now);

      // Dramatic V10 startup flare & idle settle
      this.oscFundamental.frequency.setValueAtTime(55, now);
      this.oscFundamental.frequency.exponentialRampToValueAtTime(215, now + 0.35);
      this.oscFundamental.frequency.exponentialRampToValueAtTime(72, now + 0.85);

      this.oscSubCrank.frequency.setValueAtTime(28, now);
      this.oscSubCrank.frequency.exponentialRampToValueAtTime(108, now + 0.35);
      this.oscSubCrank.frequency.exponentialRampToValueAtTime(36, now + 0.85);

      this.exhaustFilter.frequency.setValueAtTime(380, now);
      this.exhaustFilter.frequency.exponentialRampToValueAtTime(2100, now + 0.32);
      this.exhaustFilter.frequency.exponentialRampToValueAtTime(520, now + 0.85);
    } catch {
      // Ignore WebAudio scheduling exceptions
    }
  }

  public update(
    spec: VehicleSpec,
    rpm: number,
    throttle: number,
    slipAngleDeg: number,
    wheelSpinRatio: number = 0
  ): void {
    if (this.isMuted) {
      return;
    }
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (
      !this.isInitialized ||
      !this.ctx ||
      !this.oscFundamental ||
      !this.oscSubCrank ||
      !this.oscInduction ||
      !this.exhaustFilter ||
      !this.resonanceFilter ||
      !this.gainInduction ||
      !this.gainNoise ||
      !this.noiseFilter ||
      !this.gainMaster
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    if (now < this.startupEndTime) {
      if (throttle > 0.1) {
        this.startupEndTime = 0;
        this.oscFundamental.frequency.cancelScheduledValues(now);
        this.oscSubCrank.frequency.cancelScheduledValues(now);
        this.exhaustFilter.frequency.cancelScheduledValues(now);
      } else {
        return;
      }
    }

    const rpmNorm = Math.max(0, Math.min(1, (rpm - spec.idleRPM) / Math.max(1000, spec.redlineRPM - spec.idleRPM)));

    // Cylinder firing order frequency multiplier per engine architecture
    // Firing freq = (RPM / 60) * (cylinders / 2)
    let firingRatio = 0.033; // 4-cyl / 6-cyl base
    let inductionMultiplier = 2.0;
    let subGain = 0.48;

    if (spec.engineSoundProfile === 'v10_scream') {
      firingRatio = 0.0415; // 10-cylinder high-pitched harmonic wail
      inductionMultiplier = 2.5;
      subGain = 0.38;
    } else if (spec.engineSoundProfile === 'v8_supercharged') {
      firingRatio = 0.0265; // Cross-plane V8 deep thrum
      inductionMultiplier = 1.5; // Supercharger whine fifth harmonic
      subGain = 0.68;
    } else if (spec.engineSoundProfile === 'flat6_gt') {
      firingRatio = 0.036; // Boxer-6 metallic rasp
      inductionMultiplier = 2.0;
      subGain = 0.44;
    } else if (spec.engineSoundProfile === 'hybrid_hyper') {
      firingRatio = 0.039;
      inductionMultiplier = 3.0; // E-axle turbine harmonic
      subGain = 0.42;
    } else {
      // i6_turbo smooth inline-6
      firingRatio = 0.032;
      inductionMultiplier = 2.0;
      subGain = 0.5;
    }

    // Add subtle idle lope modulation at low RPM
    const idleLope = rpm < spec.idleRPM + 350 ? Math.sin(now * 26) * 2.2 : 0;
    const baseFreq = Math.max(32, rpm * firingRatio + idleLope);

    this.oscFundamental.frequency.setTargetAtTime(baseFreq, now, 0.025);
    this.oscSubCrank.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.025);
    this.oscInduction.frequency.setTargetAtTime(baseFreq * inductionMultiplier, now, 0.025);

    if (this.gainSubCrank) {
      this.gainSubCrank.gain.setTargetAtTime(subGain, now, 0.04);
    }
    this.gainInduction.gain.setTargetAtTime(0.08 + throttle * 0.16 + rpmNorm * 0.1, now, 0.04);

    // Exhaust overrun crackle detection when lifting off throttle at high RPM
    if (this.lastThrottle > 0.55 && throttle < 0.15 && rpmNorm > 0.48) {
      this.crackleTimer = 0.35;
    }
    this.lastThrottle = throttle;
    if (this.crackleTimer > 0) {
      this.crackleTimer = Math.max(0, this.crackleTimer - 0.016);
    }

    const crackleBurst =
      this.crackleTimer > 0 && Math.random() > 0.45 ? 950 * Math.random() : 0;

    // Dynamic exhaust lowpass opens with RPM and throttle load
    const filterCutoff =
      220 + Math.pow(rpmNorm, 1.3) * 1850 + throttle * 780 + crackleBurst;
    this.exhaustFilter.frequency.setTargetAtTime(filterCutoff, now, 0.03);
    this.resonanceFilter.frequency.setTargetAtTime(140 + rpmNorm * 240, now, 0.04);

    // Turbo spool / supercharger hiss + tire slip screech (including stationary burnout wheelspin)
    const absSlip = Math.abs(slipAngleDeg);
    const lateralSlipLevel = absSlip > 10 ? Math.min(0.14, (absSlip - 10) * 0.005) : 0;
    const burnoutSlipLevel =
      wheelSpinRatio > 0.3 ? Math.min(0.14, (wheelSpinRatio - 0.3) * 0.13) : 0;
    const tireSlipLevel = Math.max(lateralSlipLevel, burnoutSlipLevel);
    const turboWhistleLevel =
      spec.baseAspiration !== 'NA' ? throttle * rpmNorm * 0.065 : throttle * rpmNorm * 0.025;

    const totalNoise = Math.min(0.18, tireSlipLevel + turboWhistleLevel + (crackleBurst > 0 ? 0.08 : 0));
    this.noiseFilter.frequency.setTargetAtTime(
      tireSlipLevel > 0.02 ? 1950 : 1200 + rpmNorm * 1600,
      now,
      0.04
    );
    this.gainNoise.gain.setTargetAtTime(totalNoise, now, 0.04);

    const masterVolume = 0.15 + throttle * 0.14 + rpmNorm * 0.08;
    this.gainMaster.gain.setTargetAtTime(this.isMuted ? 0 : masterVolume, now, 0.04);
  }

  public playCollisionThud(impactSpeedMs: number): void {
    if (this.isMuted) return;
    if (!this.isInitialized) {
      this.init();
    }
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') return;

    const now = this.ctx.currentTime;
    const intensity = Math.min(1, Math.max(0.15, impactSpeedMs / 28));

    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(115, now);
    thudOsc.frequency.exponentialRampToValueAtTime(34, now + 0.18);

    thudGain.gain.setValueAtTime(0.28 * intensity, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    thudOsc.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.21);
  }

  public playCountdownBeep(isFinalGo: boolean): void {
    if (this.isMuted) return;
    if (!this.isInitialized) {
      this.init();
    }
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const beepOsc = this.ctx.createOscillator();
    const beepGain = this.ctx.createGain();
    beepOsc.type = isFinalGo ? 'triangle' : 'sine';
    beepOsc.frequency.setValueAtTime(isFinalGo ? 880 : 440, now);
    if (isFinalGo) {
      beepOsc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18);
    }

    const duration = isFinalGo ? 0.36 : 0.16;
    beepGain.gain.setValueAtTime(0.22, now);
    beepGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    beepOsc.connect(beepGain);
    beepGain.connect(this.ctx.destination);
    beepOsc.start(now);
    beepOsc.stop(now + duration + 0.02);
  }
}

export const engineAudio = new EngineAudioSynthesizer();
