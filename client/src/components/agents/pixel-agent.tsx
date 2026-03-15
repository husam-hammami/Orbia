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
  x: number; y: number; z: number;
  r: number;
  layer: number;
  phase: number;
  activity: number;
}

interface Synapse {
  from: number; to: number;
  weight: number;
  ctrlX: number; ctrlY: number;
}

interface Pulse {
  synapse: number;
  t: number;
  speed: number;
  intensity: number;
}

interface CodeCol {
  x: number; y: number;
  speed: number;
  chars: string[];
  opacity: number;
  fontSize: number;
}

const CODE_CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン{}[]<>=;:./\\|&!@#$%^*()+-~`";

function buildBrain(seed: number) {
  const rng = seededRng(seed);
  const neurons: Neuron[] = [];
  const synapses: Synapse[] = [];

  const layerConfig = [
    { count: 3,  yRange: [0.06, 0.14], rMin: 2.0, rMax: 3.0, label: "input" },
    { count: 8,  yRange: [0.16, 0.28], rMin: 1.5, rMax: 2.5, label: "embed" },
    { count: 14, yRange: [0.30, 0.42], rMin: 1.8, rMax: 3.2, label: "attention-1" },
    { count: 18, yRange: [0.44, 0.58], rMin: 1.2, rMax: 2.8, label: "ffn" },
    { count: 14, yRange: [0.60, 0.72], rMin: 1.5, rMax: 3.0, label: "attention-2" },
    { count: 10, yRange: [0.74, 0.86], rMin: 1.3, rMax: 2.2, label: "norm" },
    { count: 4,  yRange: [0.88, 0.95], rMin: 2.2, rMax: 3.5, label: "output" },
  ];

  for (let li = 0; li < layerConfig.length; li++) {
    const cfg = layerConfig[li];
    for (let i = 0; i < cfg.count; i++) {
      const xSpread = 0.08 + (cfg.count > 10 ? 0.84 : 0.7);
      const xBase = (1 - xSpread) / 2;
      const xPos = xBase + (i / (cfg.count - 1 || 1)) * xSpread + (rng() - 0.5) * 0.06;
      const yPos = cfg.yRange[0] + rng() * (cfg.yRange[1] - cfg.yRange[0]);
      const z = (rng() - 0.5) * 60;
      neurons.push({
        x: xPos, y: yPos, z,
        r: cfg.rMin + rng() * (cfg.rMax - cfg.rMin),
        layer: li,
        phase: rng() * 6.28,
        activity: 0.3 + rng() * 0.7,
      });
    }
  }

  let layerStart = 0;
  for (let li = 0; li < layerConfig.length - 1; li++) {
    const currCount = layerConfig[li].count;
    const nextCount = layerConfig[li + 1].count;
    const nextStart = layerStart + currCount;

    for (let i = 0; i < currCount; i++) {
      const connectCount = Math.min(nextCount, 2 + Math.floor(rng() * 3));
      const used = new Set<number>();
      for (let c = 0; c < connectCount; c++) {
        let target = Math.floor(rng() * nextCount);
        let attempts = 0;
        while (used.has(target) && attempts < 10) { target = Math.floor(rng() * nextCount); attempts++; }
        used.add(target);
        const fromIdx = layerStart + i;
        const toIdx = nextStart + target;
        if (toIdx < neurons.length) {
          const fn = neurons[fromIdx], tn = neurons[toIdx];
          const mx = (fn.x + tn.x) / 2 + (rng() - 0.5) * 0.08;
          const my = (fn.y + tn.y) / 2 + (rng() - 0.5) * 0.04;
          synapses.push({ from: fromIdx, to: toIdx, weight: 0.15 + rng() * 0.85, ctrlX: mx, ctrlY: my });
        }
      }
    }

    if (li < layerConfig.length - 2) {
      const skipCount = Math.floor(rng() * 3);
      const skipLayerStart = nextStart + nextCount;
      for (let s = 0; s < skipCount; s++) {
        const fromIdx = layerStart + Math.floor(rng() * currCount);
        const skipLayerCount = layerConfig[li + 2]?.count || 0;
        if (skipLayerCount > 0) {
          const toIdx = skipLayerStart + Math.floor(rng() * skipLayerCount);
          if (toIdx < neurons.length) {
            const fn = neurons[fromIdx], tn = neurons[toIdx];
            synapses.push({
              from: fromIdx, to: toIdx, weight: 0.05 + rng() * 0.3,
              ctrlX: (fn.x + tn.x) / 2 + (rng() - 0.5) * 0.12,
              ctrlY: (fn.y + tn.y) / 2,
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
    for (let l = 0; l < li; l++) start += layerConfig[l].count;
    const count = layerConfig[li].count;
    const lateralCount = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < lateralCount; i++) {
      const a = start + Math.floor(rng() * count);
      let b = start + Math.floor(rng() * count);
      if (a !== b) {
        const fn = neurons[a], tn = neurons[b];
        synapses.push({
          from: a, to: b, weight: 0.08 + rng() * 0.2,
          ctrlX: (fn.x + tn.x) / 2 + (rng() - 0.5) * 0.04,
          ctrlY: (fn.y + tn.y) / 2 + (rng() - 0.5) * 0.06,
        });
      }
    }
  }

  return { neurons, synapses };
}

function initCodeCols(w: number, seed: number): CodeCol[] {
  const rng = seededRng(seed * 31 + 7);
  const cols: CodeCol[] = [];
  const spacing = 16;
  const count = Math.ceil(w / spacing);
  for (let i = 0; i < count; i++) {
    const len = 3 + Math.floor(rng() * 10);
    const chars: string[] = [];
    for (let j = 0; j < len; j++) chars.push(CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]);
    cols.push({
      x: i * spacing + spacing / 2 + (rng() - 0.5) * 4,
      y: -(rng() * 400),
      speed: 12 + rng() * 35,
      chars,
      opacity: 0.04 + rng() * 0.09,
      fontSize: 9 + Math.floor(rng() * 2),
    });
  }
  return cols;
}

export function NeuralOrbit({ status, accentColor, seed = 0 }: NeuralOrbitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const pulsesRef = useRef<Pulse[]>([]);
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

    const codeSpd = isWorking ? 1.5 : isError ? 2.5 : isWaiting ? 0.2 : 0.5;
    const codeAlpha = isWorking ? 1.4 : isError ? 0.5 : isWaiting ? 0.3 : 0.8;

    ctx.font = `9px 'JetBrains Mono', monospace`;
    for (const col of colsRef.current) {
      col.y += col.speed * codeSpd * dt;
      const lineH = col.fontSize + 2;
      if (col.y - col.chars.length * lineH > h) {
        col.y = -(col.chars.length * lineH) - 30;
        const r2 = seededRng(Math.floor(time * 0.1 + col.x));
        for (let j = 0; j < col.chars.length; j++) {
          if (r2() > 0.5) col.chars[j] = CODE_CHARS[Math.floor(r2() * CODE_CHARS.length)];
        }
      }
      if (col.fontSize !== 9) ctx.font = `${col.fontSize}px 'JetBrains Mono', monospace`;
      for (let j = 0; j < col.chars.length; j++) {
        const cy = col.y + j * lineH;
        if (cy < -lineH || cy > h + lineH) continue;
        const fade = j === 0 ? 1.0 : Math.max(0, 1 - j / col.chars.length);
        const a = col.opacity * fade * codeAlpha;
        if (a < 0.01) continue;
        ctx.fillStyle = j === 0
          ? `rgba(255,255,255,${Math.min(a * 2, 0.5)})`
          : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
        ctx.fillText(col.chars[j], col.x, cy);
      }
      if (col.fontSize !== 9) ctx.font = `9px 'JetBrains Mono', monospace`;
    }

    const { neurons, synapses } = brain;
    const globalPulse = Math.sin(time * 0.002);
    const baseBrightness = isWorking ? 1.0 : isError ? 0.5 : isWaiting ? 0.25 : 0.6;
    const breathe = 1 + Math.sin(time * 0.001) * 0.02;

    const pad = 20;
    const drawW = w - pad * 2;
    const drawH = h - pad * 2;

    const toScreen = (nx: number, ny: number, nz: number) => {
      const perspective = 1 + nz * 0.002;
      return {
        sx: pad + nx * drawW * perspective,
        sy: pad + ny * drawH * perspective,
        depth: nz,
        scale: 0.8 + nz * 0.003 + 0.2,
      };
    };

    const screenNeurons = neurons.map((n, i) => {
      const wobbleX = Math.sin(time * 0.0008 + n.phase) * 0.005 * breathe;
      const wobbleY = Math.cos(time * 0.0006 + n.phase * 1.3) * 0.004 * breathe;
      const p = toScreen(n.x + wobbleX, n.y + wobbleY, n.z);
      return { ...p, neuron: n, idx: i };
    });

    for (let si = 0; si < synapses.length; si++) {
      const syn = synapses[si];
      const from = screenNeurons[syn.from];
      const to = screenNeurons[syn.to];
      if (!from || !to) continue;

      const ctrl = toScreen(syn.ctrlX, syn.ctrlY, (from.depth + to.depth) / 2);
      const avgScale = (from.scale + to.scale) / 2;
      const synPulse = Math.sin(time * 0.003 + si * 0.7) * 0.3 + 0.7;
      let alpha = syn.weight * avgScale * synPulse * baseBrightness * 0.35;

      if (isError) alpha *= 0.4 + Math.sin(time * 0.012 + si) * 0.3;

      const isCrossLayer = Math.abs(neurons[syn.from].layer - neurons[syn.to].layer) > 1;
      const lineW = isCrossLayer
        ? Math.max(0.2, syn.weight * 0.5)
        : Math.max(0.3, syn.weight * avgScale * (isWorking ? 1.2 : 0.8));

      const grad = ctx.createLinearGradient(from.sx, from.sy, to.sx, to.sy);
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.4})`);
      grad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.4})`);

      ctx.beginPath();
      ctx.moveTo(from.sx, from.sy);
      ctx.quadraticCurveTo(ctrl.sx, ctrl.sy, to.sx, to.sy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.stroke();

      if (isWorking && syn.weight > 0.5) {
        ctx.beginPath();
        ctx.moveTo(from.sx, from.sy);
        ctx.quadraticCurveTo(ctrl.sx, ctrl.sy, to.sx, to.sy);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.08})`;
        ctx.lineWidth = lineW * 5;
        ctx.stroke();
      }
    }

    const pulses = pulsesRef.current;
    const maxPulses = isWorking ? 25 : isError ? 5 : isWaiting ? 2 : 8;
    const spawnRate = isWorking ? 0.7 : isError ? 0.15 : isWaiting ? 0.02 : 0.12;

    if (pulses.length < maxPulses && dt > 0) {
      const spawnRng = seededRng(Math.floor(time * 0.05) + seed * 17);
      if (spawnRng() < spawnRate) {
        const si = Math.floor(spawnRng() * synapses.length);
        pulses.push({
          synapse: si,
          t: 0,
          speed: 0.3 + spawnRng() * (isWorking ? 0.8 : 0.5),
          intensity: 0.5 + spawnRng() * 0.5,
        });
      }
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt * p.speed;
      if (p.t > 1) { pulses.splice(i, 1); continue; }

      const syn = synapses[p.synapse];
      if (!syn) { pulses.splice(i, 1); continue; }
      const from = screenNeurons[syn.from];
      const to = screenNeurons[syn.to];
      if (!from || !to) continue;

      const ctrl = toScreen(syn.ctrlX, syn.ctrlY, (from.depth + to.depth) / 2);
      const t = p.t;
      const u = 1 - t;
      const px = u * u * from.sx + 2 * u * t * ctrl.sx + t * t * to.sx;
      const py = u * u * from.sy + 2 * u * t * ctrl.sy + t * t * to.sy;
      const pAlpha = Math.sin(t * 3.14) * p.intensity;

      const outerR = 6 + p.intensity * 4;
      const glow = ctx.createRadialGradient(px, py, 0, px, py, outerR);
      glow.addColorStop(0, `rgba(255,255,255,${pAlpha * 0.9})`);
      glow.addColorStop(0.2, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pAlpha * 0.7})`);
      glow.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pAlpha * 0.2})`);
      glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.beginPath();
      ctx.arc(px, py, outerR, 0, 6.28);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, 6.28);
      ctx.fillStyle = `rgba(255,255,255,${pAlpha})`;
      ctx.fill();
    }

    const sortedNeurons = [...screenNeurons].sort((a, b) => a.depth - b.depth);

    for (const sn of sortedNeurons) {
      const { sx, sy, scale, neuron } = sn;
      const layerFactor = [1, 0.9, 0.8, 0.75, 0.8, 0.85, 1][neuron.layer] || 0.7;
      const nodePulse = Math.sin(time * (isWorking ? 0.004 : 0.0015) + neuron.phase);
      const baseR = neuron.r * scale * breathe * (1 + nodePulse * 0.1);
      let alpha = layerFactor * baseBrightness * neuron.activity;

      if (isError) alpha *= 0.5 + Math.sin(time * 0.018 + neuron.phase) * 0.5;

      const isImportant = neuron.layer === 0 || neuron.layer === 6 || neuron.r > 2.5;

      if (isImportant) {
        const glowR = baseR * (neuron.layer === 0 || neuron.layer === 6 ? 8 : 5);
        const gAlpha = alpha * (isWorking ? 0.2 : 0.1);
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        glow.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${gAlpha})`);
        glow.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${gAlpha * 0.3})`);
        glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, 6.28);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      const nGrad = ctx.createRadialGradient(sx - baseR * 0.25, sy - baseR * 0.25, 0, sx, sy, baseR);
      nGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
      nGrad.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.85})`);
      nGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.15})`);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, baseR), 0, 6.28);
      ctx.fillStyle = nGrad;
      ctx.fill();

      if (isImportant && isWorking) {
        const ringR = baseR * 3 + Math.sin(time * 0.003 + neuron.phase) * baseR;
        ctx.beginPath();
        ctx.arc(sx, sy, ringR, 0, 6.28);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.1})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
    }

    if (isWorking) {
      const attentionTime = (time * 0.0005) % 1;
      const scanY = pad + attentionTime * drawH;
      const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
      scanGrad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      scanGrad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.03)`);
      scanGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 15, w, 30);
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
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: "auto" }}
      />
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

    const ghostNeurons = [
      [0.2, 0.2], [0.5, 0.15], [0.8, 0.25],
      [0.3, 0.45], [0.7, 0.5],
      [0.15, 0.7], [0.5, 0.75], [0.85, 0.7],
      [0.4, 0.9], [0.6, 0.88],
    ];
    const ghostEdges = [[0,1],[1,2],[0,3],[2,4],[3,5],[3,6],[4,6],[4,7],[5,8],[6,8],[6,9],[7,9]];

    for (const [a, b] of ghostEdges) {
      const [ax, ay] = ghostNeurons[a];
      const [bx, by] = ghostNeurons[b];
      ctx.beginPath();
      ctx.moveTo(pad + ax * (w - pad * 2), pad + ay * (h - pad * 2));
      ctx.lineTo(pad + bx * (w - pad * 2), pad + by * (h - pad * 2));
      ctx.strokeStyle = `rgba(99,102,241,${0.04 * pulse})`;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const [nx, ny] of ghostNeurons) {
      const sx = pad + nx * (w - pad * 2);
      const sy = pad + ny * (h - pad * 2);
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
