import React, { useRef, useEffect, useMemo, useCallback } from "react";

interface NeuralOrbitProps {
  status: "idle" | "working" | "error" | "waiting";
  accentColor: string;
  seed?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) || 99,
    parseInt(h.substring(2, 4), 16) || 102,
    parseInt(h.substring(4, 6), 16) || 241,
  ];
}

function seededRng(s: number) {
  let v = Math.abs(s * 7919 + 1301) | 1;
  return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; };
}

interface Neuron {
  x: number; y: number;
  r: number;
  layer: number;
  phase: number;
  energy: number;
}

interface Synapse {
  from: number; to: number;
  weight: number;
  curve1x: number; curve1y: number;
  curve2x: number; curve2y: number;
}

interface Pulse {
  synapse: number;
  t: number;
  speed: number;
  intensity: number;
  trailLen: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
}

const CODE_CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ{}[]<>=;:.∞∑∫∂λΩπΔ";

interface CodeCol {
  x: number; y: number;
  speed: number;
  chars: string[];
  opacity: number;
  fontSize: number;
}

function buildBrain(seed: number) {
  const rng = seededRng(seed);
  const neurons: Neuron[] = [];
  const synapses: Synapse[] = [];

  const layers = [
    { count: 4,  yMin: 0.06, yMax: 0.14, rMin: 2.5, rMax: 4.0 },
    { count: 8,  yMin: 0.17, yMax: 0.28, rMin: 1.8, rMax: 3.0 },
    { count: 12, yMin: 0.31, yMax: 0.44, rMin: 1.5, rMax: 3.5 },
    { count: 16, yMin: 0.46, yMax: 0.58, rMin: 1.2, rMax: 2.8 },
    { count: 12, yMin: 0.60, yMax: 0.72, rMin: 1.5, rMax: 3.2 },
    { count: 8,  yMin: 0.74, yMax: 0.85, rMin: 1.8, rMax: 2.5 },
    { count: 3,  yMin: 0.88, yMax: 0.94, rMin: 2.8, rMax: 4.5 },
  ];

  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    for (let i = 0; i < L.count; i++) {
      const spread = L.count > 10 ? 0.88 : L.count > 5 ? 0.78 : 0.6;
      const base = (1 - spread) / 2;
      const xPos = base + (i / Math.max(1, L.count - 1)) * spread + (rng() - 0.5) * 0.05;
      const yPos = L.yMin + rng() * (L.yMax - L.yMin);
      neurons.push({
        x: xPos, y: yPos,
        r: L.rMin + rng() * (L.rMax - L.rMin),
        layer: li,
        phase: rng() * 6.28,
        energy: 0.4 + rng() * 0.6,
      });
    }
  }

  let layerStart = 0;
  for (let li = 0; li < layers.length - 1; li++) {
    const currCount = layers[li].count;
    const nextStart = layerStart + currCount;
    const nextCount = layers[li + 1].count;

    for (let i = 0; i < currCount; i++) {
      const conns = Math.min(nextCount, 2 + Math.floor(rng() * 3));
      const used = new Set<number>();
      for (let c = 0; c < conns; c++) {
        let t = Math.floor(rng() * nextCount);
        let att = 0;
        while (used.has(t) && att < 10) { t = Math.floor(rng() * nextCount); att++; }
        used.add(t);
        const fi = layerStart + i;
        const ti = nextStart + t;
        if (ti < neurons.length) {
          const fn = neurons[fi], tn = neurons[ti];
          const dx = tn.x - fn.x;
          const dy = tn.y - fn.y;
          const bendX = (rng() - 0.5) * 0.15;
          const bendY = (rng() - 0.5) * 0.06;
          const t1 = 0.25 + rng() * 0.15;
          const t2 = 0.6 + rng() * 0.15;
          synapses.push({
            from: fi, to: ti,
            weight: 0.2 + rng() * 0.8,
            curve1x: fn.x + dx * t1 + bendX,
            curve1y: fn.y + dy * t1 + bendY,
            curve2x: fn.x + dx * t2 - bendX * 0.7,
            curve2y: fn.y + dy * t2 - bendY * 0.5,
          });
        }
      }
    }

    if (li < layers.length - 2) {
      const skipCount = 1 + Math.floor(rng() * 2);
      for (let s = 0; s < skipCount; s++) {
        const fi = layerStart + Math.floor(rng() * currCount);
        const skipStart = nextStart + nextCount;
        const skipCount2 = layers[li + 2]?.count || 0;
        if (skipCount2 > 0) {
          const ti = skipStart + Math.floor(rng() * skipCount2);
          if (ti < neurons.length) {
            const fn = neurons[fi], tn = neurons[ti];
            const dx = tn.x - fn.x;
            const dy = tn.y - fn.y;
            const bend = (rng() - 0.5) * 0.2;
            synapses.push({
              from: fi, to: ti,
              weight: 0.05 + rng() * 0.25,
              curve1x: fn.x + dx * 0.3 + bend,
              curve1y: fn.y + dy * 0.3,
              curve2x: fn.x + dx * 0.7 - bend * 0.5,
              curve2y: fn.y + dy * 0.7,
            });
          }
        }
      }
    }

    layerStart += currCount;
  }

  const lateralLayers = [2, 3, 4];
  for (const li of lateralLayers) {
    let start = 0;
    for (let l = 0; l < li; l++) start += layers[l].count;
    const count = layers[li].count;
    const lCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < lCount; i++) {
      const a = start + Math.floor(rng() * count);
      const b = start + Math.floor(rng() * count);
      if (a !== b) {
        const fn = neurons[a], tn = neurons[b];
        const mx = (fn.x + tn.x) / 2;
        const my = (fn.y + tn.y) / 2;
        const bend = (rng() - 0.5) * 0.12;
        synapses.push({
          from: a, to: b, weight: 0.1 + rng() * 0.2,
          curve1x: mx + bend, curve1y: my - 0.03,
          curve2x: mx - bend * 0.5, curve2y: my + 0.03,
        });
      }
    }
  }

  return { neurons, synapses };
}

function initCodeCols(w: number, seed: number): CodeCol[] {
  const rng = seededRng(seed * 31 + 7);
  const cols: CodeCol[] = [];
  const spacing = 18;
  const count = Math.ceil(w / spacing);
  for (let i = 0; i < count; i++) {
    const len = 3 + Math.floor(rng() * 8);
    const chars: string[] = [];
    for (let j = 0; j < len; j++) chars.push(CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]);
    cols.push({
      x: i * spacing + spacing / 2 + (rng() - 0.5) * 5,
      y: -(rng() * 500),
      speed: 10 + rng() * 30,
      chars,
      opacity: 0.03 + rng() * 0.06,
      fontSize: 8 + Math.floor(rng() * 2),
    });
  }
  return cols;
}

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export function NeuralOrbit({ status, accentColor, seed = 0 }: NeuralOrbitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const pulsesRef = useRef<Pulse[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const colsRef = useRef<CodeCol[]>([]);
  const lastWRef = useRef(0);

  const safeStatus = (["idle", "working", "error", "waiting"].includes(status) ? status : "idle") as NeuralOrbitProps["status"];
  const color = accentColor || "#6366f1";
  const rgb = useMemo(() => hexToRgb(color), [color]);
  const brain = useMemo(() => buildBrain(seed), [seed]);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (lastWRef.current !== Math.round(w)) {
      colsRef.current = initCodeCols(w, seed);
      lastWRef.current = Math.round(w);
    }

    const dt = Math.min((time - timeRef.current) / 1000, 0.1);
    timeRef.current = time;

    const isWorking = safeStatus === "working";
    const isError = safeStatus === "error";
    const isWaiting = safeStatus === "waiting";
    const brightness = isWorking ? 1.0 : isError ? 0.55 : isWaiting ? 0.2 : 0.55;

    const codeSpd = isWorking ? 1.3 : isError ? 2 : isWaiting ? 0.15 : 0.4;
    const codeA = isWorking ? 1.2 : isError ? 0.4 : isWaiting ? 0.25 : 0.7;
    ctx.font = `8px 'JetBrains Mono', monospace`;
    for (const col of colsRef.current) {
      col.y += col.speed * codeSpd * dt;
      const lh = col.fontSize + 2;
      if (col.y - col.chars.length * lh > h) {
        col.y = -(col.chars.length * lh) - 40;
        const r2 = seededRng(Math.floor(time * 0.08 + col.x));
        for (let j = 0; j < col.chars.length; j++) {
          if (r2() > 0.4) col.chars[j] = CODE_CHARS[Math.floor(r2() * CODE_CHARS.length)];
        }
      }
      if (col.fontSize !== 8) ctx.font = `${col.fontSize}px 'JetBrains Mono', monospace`;
      for (let j = 0; j < col.chars.length; j++) {
        const cy = col.y + j * lh;
        if (cy < -lh || cy > h + lh) continue;
        const fade = j === 0 ? 1.0 : Math.max(0, 1 - j / col.chars.length);
        const a = col.opacity * fade * codeA;
        if (a < 0.005) continue;
        ctx.fillStyle = j === 0
          ? `rgba(255,255,255,${Math.min(a * 2, 0.35)})`
          : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
        ctx.fillText(col.chars[j], col.x, cy);
      }
      if (col.fontSize !== 8) ctx.font = `8px 'JetBrains Mono', monospace`;
    }

    const { neurons, synapses } = brain;
    const pad = 12;
    const dW = w - pad * 2;
    const dH = h - pad * 2;

    const toS = (nx: number, ny: number) => ({
      sx: pad + nx * dW,
      sy: pad + ny * dH,
    });

    const sNeurons = neurons.map((n, i) => {
      const wx = Math.sin(time * 0.0007 + n.phase) * 0.004;
      const wy = Math.cos(time * 0.0005 + n.phase * 1.4) * 0.003;
      const p = toS(n.x + wx, n.y + wy);
      return { ...p, neuron: n, idx: i };
    });

    const nebulaLayers = [
      { y: 0.38, spread: 0.08 },
      { y: 0.52, spread: 0.06 },
      { y: 0.67, spread: 0.07 },
    ];
    for (const neb of nebulaLayers) {
      const nebPulse = Math.sin(time * 0.001 + neb.y * 10) * 0.3 + 0.7;
      const ny = pad + neb.y * dH;
      const spreadPx = neb.spread * dH;
      const nebAlpha = 0.012 * brightness * nebPulse;
      const nebGrad = ctx.createRadialGradient(w / 2, ny, 0, w / 2, ny, Math.max(w * 0.5, spreadPx * 3));
      nebGrad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${nebAlpha})`);
      nebGrad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${nebAlpha * 0.3})`);
      nebGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, ny - spreadPx * 3, w, spreadPx * 6);
    }

    for (let si = 0; si < synapses.length; si++) {
      const syn = synapses[si];
      const from = sNeurons[syn.from];
      const to = sNeurons[syn.to];
      if (!from || !to) continue;

      const c1 = toS(syn.curve1x, syn.curve1y);
      const c2 = toS(syn.curve2x, syn.curve2y);
      const synPulse = Math.sin(time * 0.002 + si * 0.5) * 0.25 + 0.75;
      let alpha = syn.weight * synPulse * brightness * 0.25;
      if (isError) alpha *= 0.5 + Math.sin(time * 0.015 + si) * 0.3;

      const isSkip = Math.abs(neurons[syn.from].layer - neurons[syn.to].layer) > 1;
      const lineW = isSkip
        ? Math.max(0.2, syn.weight * 0.4)
        : Math.max(0.3, syn.weight * (isWorking ? 1.0 : 0.6));

      if (isWorking && syn.weight > 0.4) {
        ctx.beginPath();
        ctx.moveTo(from.sx, from.sy);
        ctx.bezierCurveTo(c1.sx, c1.sy, c2.sx, c2.sy, to.sx, to.sy);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.06})`;
        ctx.lineWidth = lineW * 8;
        ctx.stroke();
      }

      if (syn.weight > 0.3) {
        ctx.beginPath();
        ctx.moveTo(from.sx, from.sy);
        ctx.bezierCurveTo(c1.sx, c1.sy, c2.sx, c2.sy, to.sx, to.sy);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.12})`;
        ctx.lineWidth = lineW * 3;
        ctx.stroke();
      }

      const grad = ctx.createLinearGradient(from.sx, from.sy, to.sx, to.sy);
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.5})`);
      grad.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
      grad.addColorStop(0.7, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.5})`);

      ctx.beginPath();
      ctx.moveTo(from.sx, from.sy);
      ctx.bezierCurveTo(c1.sx, c1.sy, c2.sx, c2.sy, to.sx, to.sy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.stroke();
    }

    const pulses = pulsesRef.current;
    const maxPulses = isWorking ? 30 : isError ? 4 : isWaiting ? 1 : 10;
    const spawnRate = isWorking ? 0.8 : isError ? 0.1 : isWaiting ? 0.01 : 0.15;

    if (pulses.length < maxPulses && dt > 0) {
      const sr = seededRng(Math.floor(time * 0.04) + seed * 13);
      const spawns = isWorking ? 2 : 1;
      for (let sp = 0; sp < spawns; sp++) {
        if (sr() < spawnRate && pulses.length < maxPulses) {
          const si = Math.floor(sr() * synapses.length);
          pulses.push({
            synapse: si,
            t: 0,
            speed: 0.25 + sr() * (isWorking ? 0.7 : 0.4),
            intensity: 0.5 + sr() * 0.5,
            trailLen: 0.08 + sr() * 0.12,
          });
        }
      }
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt * p.speed;
      if (p.t > 1) { pulses.splice(i, 1); continue; }

      const syn = synapses[p.synapse];
      if (!syn) { pulses.splice(i, 1); continue; }
      const from = sNeurons[syn.from];
      const to = sNeurons[syn.to];
      if (!from || !to) continue;

      const c1 = toS(syn.curve1x, syn.curve1y);
      const c2 = toS(syn.curve2x, syn.curve2y);

      const trailSteps = 6;
      for (let ts = trailSteps; ts >= 0; ts--) {
        const tt = Math.max(0, p.t - (ts / trailSteps) * p.trailLen);
        const px = cubicBezier(tt, from.sx, c1.sx, c2.sx, to.sx);
        const py = cubicBezier(tt, from.sy, c1.sy, c2.sy, to.sy);
        const trailFade = 1 - ts / trailSteps;
        const pAlpha = Math.sin(p.t * 3.14) * p.intensity * trailFade;

        if (ts === 0) {
          const outerR = 5 + p.intensity * 6;
          const glow = ctx.createRadialGradient(px, py, 0, px, py, outerR);
          glow.addColorStop(0, `rgba(255,255,255,${pAlpha * 0.95})`);
          glow.addColorStop(0.15, `rgba(255,255,255,${pAlpha * 0.6})`);
          glow.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pAlpha * 0.5})`);
          glow.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pAlpha * 0.15})`);
          glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
          ctx.beginPath();
          ctx.arc(px, py, outerR, 0, 6.28);
          ctx.fillStyle = glow;
          ctx.fill();
        } else {
          const dotR = 1.5 * trailFade;
          ctx.beginPath();
          ctx.arc(px, py, dotR, 0, 6.28);
          ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pAlpha * 0.5})`;
          ctx.fill();
        }
      }
    }

    const particles = particlesRef.current;
    const maxParticles = isWorking ? 30 : isWaiting ? 3 : 12;
    if (particles.length < maxParticles && dt > 0) {
      const pr = seededRng(Math.floor(time * 0.03) + seed * 23);
      if (pr() < (isWorking ? 0.5 : 0.1)) {
        const ni = Math.floor(pr() * neurons.length);
        const n = neurons[ni];
        const p = toS(n.x, n.y);
        particles.push({
          x: p.sx, y: p.sy,
          vx: (pr() - 0.5) * 15,
          vy: (pr() - 0.5) * 15,
          life: 0, maxLife: 1.5 + pr() * 2,
          size: 0.3 + pr() * 0.8,
        });
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life += dt;
      if (pt.life > pt.maxLife) { particles.splice(i, 1); continue; }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
      const lifeRatio = pt.life / pt.maxLife;
      const ptAlpha = Math.sin(lifeRatio * 3.14) * 0.3 * brightness;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, 6.28);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${ptAlpha})`;
      ctx.fill();
    }

    for (const sn of sNeurons) {
      const { sx, sy, neuron } = sn;
      const layerBright = [1, 0.85, 0.75, 0.65, 0.75, 0.85, 1][neuron.layer] || 0.7;
      const nodePulse = Math.sin(time * (isWorking ? 0.004 : 0.0015) + neuron.phase);
      const breathe = 1 + Math.sin(time * 0.001 + neuron.phase) * 0.03;
      const baseR = neuron.r * breathe * (1 + nodePulse * 0.12);
      let alpha = layerBright * brightness * neuron.energy;
      if (isError) alpha *= 0.4 + Math.sin(time * 0.02 + neuron.phase) * 0.6;

      const isKey = neuron.layer === 0 || neuron.layer === 6 || neuron.r > 3;

      if (isKey) {
        const g3 = baseR * (neuron.layer === 0 || neuron.layer === 6 ? 12 : 7);
        const g3a = alpha * (isWorking ? 0.08 : 0.04);
        const glow3 = ctx.createRadialGradient(sx, sy, 0, sx, sy, g3);
        glow3.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${g3a})`);
        glow3.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, g3, 0, 6.28);
        ctx.fillStyle = glow3;
        ctx.fill();
      }

      const g2 = baseR * 4;
      const g2a = alpha * (isWorking ? 0.15 : 0.08);
      const glow2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, g2);
      glow2.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${g2a})`);
      glow2.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${g2a * 0.25})`);
      glow2.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.beginPath();
      ctx.arc(sx, sy, g2, 0, 6.28);
      ctx.fillStyle = glow2;
      ctx.fill();

      const nGrad = ctx.createRadialGradient(sx - baseR * 0.2, sy - baseR * 0.2, 0, sx, sy, baseR);
      nGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
      nGrad.addColorStop(0.25, `rgba(255,255,255,${alpha * 0.7})`);
      nGrad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.8})`);
      nGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.1})`);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, baseR), 0, 6.28);
      ctx.fillStyle = nGrad;
      ctx.fill();

      if (isKey && isWorking) {
        const rings = neuron.layer === 0 || neuron.layer === 6 ? 3 : 2;
        for (let r = 1; r <= rings; r++) {
          const ringPhase = (time * 0.002 + neuron.phase + r * 1.2) % 6.28;
          const ringR = baseR * (2 + r * 1.8) * (0.8 + Math.sin(ringPhase) * 0.2);
          const ringA = alpha * (0.06 / r);
          ctx.beginPath();
          ctx.arc(sx, sy, ringR, 0, 6.28);
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${ringA})`;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }
    }

    if (isWorking) {
      const scanPhase = (time * 0.0004) % 1;
      const scanY = pad + scanPhase * dH;
      const sGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      sGrad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      sGrad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.025)`);
      sGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = sGrad;
      ctx.fillRect(0, scanY - 20, w, 40);
    }

    animRef.current = requestAnimationFrame(render);
  }, [safeStatus, rgb, brain, seed]);

  useEffect(() => {
    timeRef.current = performance.now();
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ imageRendering: "auto" }} />
    </div>
  );
}

export function EmptyOrbit({ onClick }: { onClick?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pulse = Math.sin(time * 0.001) * 0.3 + 0.5;
    const pad = 30;
    const dW = w - pad * 2, dH = h - pad * 2;

    const ghostN = [
      [0.2, 0.15], [0.5, 0.1], [0.8, 0.18],
      [0.15, 0.4], [0.5, 0.45], [0.85, 0.38],
      [0.3, 0.65], [0.7, 0.7],
      [0.5, 0.9],
    ];
    const ghostE = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,6],[4,6],[4,7],[5,7],[6,8],[7,8]];

    for (const [a, b] of ghostE) {
      const [ax, ay] = ghostN[a];
      const [bx, by] = ghostN[b];
      const fsx = pad + ax * dW, fsy = pad + ay * dH;
      const tsx = pad + bx * dW, tsy = pad + by * dH;
      const mx = (fsx + tsx) / 2 + (fsy - tsy) * 0.15;
      const my = (fsy + tsy) / 2 + (tsx - fsx) * 0.1;
      ctx.beginPath();
      ctx.moveTo(fsx, fsy);
      ctx.quadraticCurveTo(mx, my, tsx, tsy);
      ctx.strokeStyle = `rgba(99,102,241,${0.04 * pulse})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    for (const [nx, ny] of ghostN) {
      const sx = pad + nx * dW, sy = pad + ny * dH;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, 6.28);
      ctx.fillStyle = `rgba(99,102,241,${0.08 * pulse})`;
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${onClick ? "cursor-pointer group" : ""}`}
      onClick={onClick}
      {...(onClick ? { role: "button" as const, tabIndex: 0, "aria-label": "Add new agent" } : {})}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-[1px] bg-indigo-500/20 group-hover:bg-indigo-400/40 transition-colors" />
        <div className="absolute h-6 w-[1px] bg-indigo-500/20 group-hover:bg-indigo-400/40 transition-colors" />
      </div>
    </div>
  );
}
