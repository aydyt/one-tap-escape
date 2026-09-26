(function (root) {
  "use strict";
  const OTE = (root.OTE = root.OTE || {});
  let ctx = null;
  let master = null;
  let noise = null;
  let ready = false;

  function ensure() {
    if (ctx) return true;
    const AudioCtx = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.42;
    master.connect(ctx.destination);
    return true;
  }

  OTE.audio = {
    unlock: function unlock() {
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume();
      ready = true;
    },

    blip: function blip() {
      tone(520, 0.07, "sine", 0.05, 700, 0);
    },

    go: function go() {
      tone(392, 0.09, "triangle", 0.07, 588, 0);
      tone(588, 0.12, "triangle", 0.06, 784, 0.08);
    },

    switchSide: function switchSide() {
      tone(620, 0.07, "sine", 0.07, 880, 0);
    },

    pass: function pass() {
      tone(740, 0.08, "triangle", 0.06, 980, 0);
    },

    near: function near() {
      tone(1040, 0.06, "square", 0.03, 1320, 0);
    },

    fanfare: function fanfare() {
      [523, 659, 784, 1046].forEach(function (freq, index) {
        tone(freq, 0.12, "triangle", 0.07, null, index * 0.08);
      });
    },

    death: function death() {
      if (!ready || !ctx) return;
      const buffer = noiseBuffer();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.28);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
      tone(180, 0.22, "sawtooth", 0.05, 55, 0);
    },
  };

  function tone(freq, duration, type, volume, slide, delay) {
    if (!ready || !ctx) return;
    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noiseBuffer() {
    if (noise) return noise;
    const length = Math.floor(ctx.sampleRate * 0.32);
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return noise;
  }
})(window);
