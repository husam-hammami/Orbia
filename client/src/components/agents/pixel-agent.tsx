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

const CODE_CHARS = "01アイウエオカキクケコ{}[]<>=∞∑∫∂λΩπΔ";

interface CodeCol {
  x: number; y: number; speed: number; chars: string[];
  opacity: number; fontSize: number;
}

interface EnergyStream {
  points: { x: number; y: number }[];
  width: number;
  speed: number;
  phase: number;
  brightness: number;
}

interface NeuralCluster {
  x: number; y: number;
  radius: number;
  intensity: number;
  phase: number;
  pulseSpeed: number;
  type: "core" | "major" | "minor";
}

interface EnergyPulse {
  stream: number;
  t: number;
  speed: number;
  size: number;
  brightness: number;
}

function buildBrainStructure(seed: number, w: number, h: number) {
  const rng = seededRng(seed);

  const clusters: NeuralCluster[] = [];

  clusters.push({
    x: w * (0.45 + rng() * 0.1), y: h * (0.4 + rng() * 0.15),
    radius: Math.min(w, h) * (0.12 + rng() * 0.05),
    intensity: 1.0, phase: rng() * 6.28, pulseSpeed: 0.8 + rng() * 0.4,
    type: "core",
  });

  const majorCount = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < majorCount; i++) {
    const angle = (i / majorCount) * 6.28 + rng() * 0.8;
    const dist = Math.min(w, h) * (0.2 + rng() * 0.12);
    clusters.push({
      x: clusters[0].x + Math.cos(angle) * dist,
      y: clusters[0].y + Math.sin(angle) * dist,
      radius: Math.min(w, h) * (0.06 + rng() * 0.04),
      intensity: 0.6 + rng() * 0.3, phase: rng() * 6.28,
      pulseSpeed: 0.5 + rng() * 0.6, type: "major",
    });
  }

  const minorCount = 6 + Math.floor(rng() * 4);
  for (let i = 0; i < minorCount; i++) {
    const baseCluster = clusters[Math.floor(rng() * (majorCount + 1))];
    const angle = rng() * 6.28;
    const dist = Math.min(w, h) * (0.1 + rng() * 0.2);
    clusters.push({
      x: baseCluster.x + Math.cos(angle) * dist,
      y: baseCluster.y + Math.sin(angle) * dist,
      radius: Math.min(w, h) * (0.02 + rng() * 0.03),
      intensity: 0.3 + rng() * 0.4, phase: rng() * 6.28,
      pulseSpeed: 0.3 + rng() * 0.8, type: "minor",
    });
  }

  const streams: EnergyStream[] = [];

  for (let i = 1; i < clusters.length; i++) {
    const from = clusters[0];
    const to = clusters[i];
    if (to.type === "minor" && rng() > 0.5) continue;

    const pointCount = 5 + Math.floor(rng() * 4);
    const points: { x: number; y: number }[] = [];
    for (let p = 0; p <= pointCount; p++) {
      const t = p / pointCount;
      const baseX = from.x + (to.x - from.x) * t;
      const baseY = from.y + (to.y - from.y) * t;
      const perpX = -(to.y - from.y);
      const perpY = to.x - from.x;
      const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      const wave = Math.sin(t * 3.14 * (1 + rng())) * (rng() - 0.5) * Math.min(w, h) * 0.08;
      points.push({
        x: baseX + (perpX / len) * wave,
        y: baseY + (perpY / len) * wave,
      });
    }
    streams.push({
      points, width: to.type === "major" ? 2 + rng() * 2.5 : 1 + rng() * 1.5,
      speed: 0.3 + rng() * 0.5, phase: rng() * 6.28,
      brightness: to.type === "major" ? 0.6 + rng() * 0.3 : 0.3 + rng() * 0.3,
    });
  }

  for (let i = 1; i <= majorCount; i++) {
    for (let j = i + 1; j <= majorCount; j++) {
      if (rng() > 0.6) continue;
      const from = clusters[i], to = clusters[j];
      const pointCount = 4 + Math.floor(rng() * 3);
      const points: { x: number; y: number }[] = [];
      for (let p = 0; p <= pointCount; p++) {
        const t = p / pointCount;
        const baseX = from.x + (to.x - from.x) * t;
        const baseY = from.y + (to.y - from.y) * t;
        const wave = Math.sin(t * 3.14 * 2) * (rng() - 0.5) * Math.min(w, h) * 0.06;
        const perpX = -(to.y - from.y), perpY = to.x - from.x;
        const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        points.push({ x: baseX + (perpX / len) * wave, y: baseY + (perpY / len) * wave });
      }
      streams.push({
        points, width: 1 + rng() * 1.5, speed: 0.2 + rng() * 0.4,
        phase: rng() * 6.28, brightness: 0.2 + rng() * 0.3,
      });
    }
  }

  return { clusters, streams };
}

function initCodeCols(w: number, seed: number): CodeCol[] {
  const rng = seededRng(seed * 31 + 7);
  const cols: CodeCol[] = [];
  const spacing = 20;
  const count = Math.ceil(w / spacing);
  for (let i = 0; i < count; i++) {
    const len = 3 + Math.floor(rng() * 7);
    const chars: string[] = [];
    for (let j = 0; j < len; j++) chars.push(CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]);
    cols.push({
      x: i * spacing + spacing / 2 + (rng() - 0.5) * 6,
      y: -(rng() * 500),
      speed: 8 + rng() * 25,
      chars, opacity: 0.025 + rng() * 0.045,
      fontSize: 8 + Math.floor(rng() * 2),
    });
  }
  return cols;
}

function catmullRom(points: { x: number; y: number }[], t: number): { x: number; y: number } {
  const n = points.length - 1;
  const f = t * n;
  const i = Math.min(Math.floor(f), n - 1);
  const lt = f - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[Math.min(n, i + 1)];
  const p3 = points[Math.min(n, i + 2)];
  const t2 = lt * lt, t3 = t2 * lt;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * lt + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * lt + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function NeuralOrbit({ status, accentColor, seed = 0 }: NeuralOrbitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const pulsesRef = useRef<EnergyPulse[]>([]);
  const sparksRef = useRef<{x: number; y: number; size: number; alpha: number; life: number; maxLife: number}[]>([]);
  const colsRef = useRef<CodeCol[]>([]);
  const lastWRef = useRef(0);
  const brainRef = useRef<ReturnType<typeof buildBrainStructure> | null>(null);
  const lastDimRef = useRef("");

  const safeStatus = (["idle", "working", "error", "waiting"].includes(status) ? status : "idle") as NeuralOrbitProps["status"];
  const color = accentColor || "#6366f1";
  const rgb = useMemo(() => hexToRgb(color), [color]);

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

    const dimKey = `${Math.round(w)}_${Math.round(h)}`;
    if (lastDimRef.current !== dimKey) {
      brainRef.current = buildBrainStructure(seed, w, h);
      lastDimRef.current = dimKey;
    }
    if (lastWRef.current !== Math.round(w)) {
      colsRef.current = initCodeCols(w, seed);
      lastWRef.current = Math.round(w);
    }

    const brain = brainRef.current!;
    const dt = Math.min((time - timeRef.current) / 1000, 0.1);
    timeRef.current = time;

    const isWorking = safeStatus === "working";
    const isError = safeStatus === "error";
    const isWaiting = safeStatus === "waiting";
    const B = isWorking ? 1.0 : isError ? 0.5 : isWaiting ? 0.15 : 0.65;

    const cSpd = isWorking ? 1.2 : isError ? 2 : isWaiting ? 0.1 : 0.35;
    const cA = isWorking ? 1.0 : isError ? 0.3 : isWaiting ? 0.2 : 0.6;
    ctx.font = `8px 'JetBrains Mono', monospace`;
    for (const col of colsRef.current) {
      col.y += col.speed * cSpd * dt;
      const lh = col.fontSize + 2;
      if (col.y - col.chars.length * lh > h) {
        col.y = -(col.chars.length * lh) - 50;
        const r2 = seededRng(Math.floor(time * 0.06 + col.x));
        for (let j = 0; j < col.chars.length; j++) {
          if (r2() > 0.4) col.chars[j] = CODE_CHARS[Math.floor(r2() * CODE_CHARS.length)];
        }
      }
      if (col.fontSize !== 8) ctx.font = `${col.fontSize}px 'JetBrains Mono', monospace`;
      for (let j = 0; j < col.chars.length; j++) {
        const cy = col.y + j * lh;
        if (cy < -lh || cy > h + lh) continue;
        const fade = j === 0 ? 1.0 : Math.max(0, 1 - j / col.chars.length);
        const a = col.opacity * fade * cA;
        if (a < 0.005) continue;
        ctx.fillStyle = j === 0
          ? `rgba(255,255,255,${Math.min(a * 2, 0.3)})`
          : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
        ctx.fillText(col.chars[j], col.x, cy);
      }
      if (col.fontSize !== 8) ctx.font = `8px 'JetBrains Mono', monospace`;
    }

    const { clusters, streams } = brain;

    for (const cluster of clusters) {
      if (cluster.type !== "core") continue;
      const pulse = Math.sin(time * 0.001 * cluster.pulseSpeed + cluster.phase);
      const r = cluster.radius * (1.8 + pulse * 0.3) * B;
      const a = 0.03 * B;
      const g = ctx.createRadialGradient(cluster.x, cluster.y, 0, cluster.x, cluster.y, r);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 1.5})`);
      g.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
      g.addColorStop(0.7, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.3})`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cluster.x - r, cluster.y - r, r * 2, r * 2);
    }

    for (let si = 0; si < streams.length; si++) {
      const stream = streams[si];
      const timePulse = Math.sin(time * 0.002 * stream.speed + stream.phase) * 0.3 + 0.7;
      let alpha = stream.brightness * timePulse * B;
      if (isError) alpha *= 0.5 + Math.sin(time * 0.012 + si) * 0.3;

      const waveOffset = time * 0.0003 * stream.speed;
      const animPoints = stream.points.map((p, pi) => {
        const t = pi / (stream.points.length - 1);
        const wave = Math.sin(t * 6.28 * 2 + waveOffset + stream.phase) * 3;
        const dx = pi < stream.points.length - 1 ? stream.points[pi + 1].x - p.x : p.x - stream.points[pi - 1].x;
        const dy = pi < stream.points.length - 1 ? stream.points[pi + 1].y - p.y : p.y - stream.points[pi - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: p.x + (-dy / len) * wave, y: p.y + (dx / len) * wave };
      });

      const segments = 30;
      ctx.beginPath();
      const first = catmullRom(animPoints, 0);
      ctx.moveTo(first.x, first.y);
      for (let s = 1; s <= segments; s++) {
        const pt = catmullRom(animPoints, s / segments);
        ctx.lineTo(pt.x, pt.y);
      }

      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.06})`;
      ctx.lineWidth = stream.width * 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.15})`;
      ctx.lineWidth = stream.width * 4;
      ctx.stroke();

      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.5})`;
      ctx.lineWidth = stream.width * 1.5;
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.25})`;
      ctx.lineWidth = stream.width * 0.5;
      ctx.stroke();
    }

    const pulses = pulsesRef.current;
    const maxP = isWorking ? 30 : isError ? 4 : isWaiting ? 1 : 15;
    const spawnR = isWorking ? 0.6 : isError ? 0.08 : isWaiting ? 0.005 : 0.25;

    if (pulses.length < maxP && dt > 0) {
      const sr = seededRng(Math.floor(time * 0.04) + seed * 13);
      const spawns = isWorking ? 3 : isWaiting ? 1 : 2;
      for (let sp = 0; sp < spawns; sp++) {
        if (sr() < spawnR && pulses.length < maxP) {
          const si = Math.floor(sr() * streams.length);
          pulses.push({
            stream: si, t: 0,
            speed: 0.2 + sr() * (isWorking ? 0.6 : 0.35),
            size: 4 + sr() * 8,
            brightness: 0.6 + sr() * 0.4,
          });
        }
      }
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt * p.speed;
      if (p.t > 1) { pulses.splice(i, 1); continue; }

      const stream = streams[p.stream];
      if (!stream) { pulses.splice(i, 1); continue; }

      const waveOffset = time * 0.0003 * stream.speed;
      const animPoints = stream.points.map((pt, pi) => {
        const t2 = pi / (stream.points.length - 1);
        const wave = Math.sin(t2 * 6.28 * 2 + waveOffset + stream.phase) * 3;
        const dx = pi < stream.points.length - 1 ? stream.points[pi + 1].x - pt.x : pt.x - stream.points[pi - 1].x;
        const dy = pi < stream.points.length - 1 ? stream.points[pi + 1].y - pt.y : pt.y - stream.points[pi - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: pt.x + (-dy / len) * wave, y: pt.y + (dx / len) * wave };
      });

      const trailSteps = 8;
      for (let ts = trailSteps; ts >= 0; ts--) {
        const tt = Math.max(0, p.t - ts * 0.015);
        const pos = catmullRom(animPoints, tt);
        const trailFade = 1 - ts / trailSteps;
        const pA = Math.sin(p.t * 3.14) * p.brightness * trailFade * B;

        if (ts === 0) {
          const gR = p.size * 2.5;
          const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, gR);
          glow.addColorStop(0, `rgba(255,255,255,${pA * 0.95})`);
          glow.addColorStop(0.15, `rgba(255,255,255,${pA * 0.5})`);
          glow.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pA * 0.4})`);
          glow.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pA * 0.1})`);
          glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, gR, 0, 6.28);
          ctx.fillStyle = glow;
          ctx.fill();
        } else {
          const dotR = (p.size * 0.3) * trailFade;
          if (dotR > 0.3) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, dotR, 0, 6.28);
            ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${pA * 0.4})`;
            ctx.fill();
          }
        }
      }
    }

    for (const cluster of clusters) {
      const pulse = Math.sin(time * 0.001 * cluster.pulseSpeed + cluster.phase);
      const breathe = 1 + pulse * 0.15;
      let a = cluster.intensity * B;
      if (isError) a *= 0.4 + Math.sin(time * 0.02 + cluster.phase) * 0.6;

      const r = cluster.radius * breathe;

      if (cluster.type !== "minor") {
        const outerR = r * 3;
        const outerA = a * (cluster.type === "core" ? 0.12 : 0.06);
        const outerG = ctx.createRadialGradient(cluster.x, cluster.y, 0, cluster.x, cluster.y, outerR);
        outerG.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${outerA})`);
        outerG.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${outerA * 0.4})`);
        outerG.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.beginPath();
        ctx.arc(cluster.x, cluster.y, outerR, 0, 6.28);
        ctx.fillStyle = outerG;
        ctx.fill();
      }

      const midR = r * 1.5;
      const midA = a * (cluster.type === "core" ? 0.25 : cluster.type === "major" ? 0.15 : 0.08);
      const midG = ctx.createRadialGradient(cluster.x, cluster.y, 0, cluster.x, cluster.y, midR);
      midG.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${midA})`);
      midG.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${midA * 0.4})`);
      midG.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, midR, 0, 6.28);
      ctx.fillStyle = midG;
      ctx.fill();

      const coreR = r * 0.6;
      const coreG = ctx.createRadialGradient(
        cluster.x - coreR * 0.15, cluster.y - coreR * 0.15, 0,
        cluster.x, cluster.y, coreR
      );
      const coreA = a * (cluster.type === "core" ? 0.9 : cluster.type === "major" ? 0.7 : 0.5);
      coreG.addColorStop(0, `rgba(255,255,255,${coreA * 0.9})`);
      coreG.addColorStop(0.2, `rgba(255,255,255,${coreA * 0.5})`);
      coreG.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreA * 0.6})`);
      coreG.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${coreA * 0.1})`);
      ctx.beginPath();
      ctx.arc(cluster.x, cluster.y, coreR, 0, 6.28);
      ctx.fillStyle = coreG;
      ctx.fill();

      if (cluster.type === "core" && isWorking) {
        for (let ring = 1; ring <= 4; ring++) {
          const ringPhase = (time * 0.0015 + ring * 1.5) % 6.28;
          const ringR = r * (1.5 + ring * 1.2) * (0.85 + Math.sin(ringPhase) * 0.15);
          const ringA = a * (0.04 / ring);
          ctx.beginPath();
          ctx.arc(cluster.x, cluster.y, ringR, 0, 6.28);
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${ringA})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      if (cluster.type === "major" && isWorking) {
        const ringPhase = (time * 0.002 + cluster.phase) % 6.28;
        const ringR = r * (2 + Math.sin(ringPhase) * 0.5);
        ctx.beginPath();
        ctx.arc(cluster.x, cluster.y, ringR, 0, 6.28);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.05})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

    }

    const sparks = sparksRef.current;
    const maxSparks = isWorking ? 6 : isWaiting ? 0 : 3;
    const sparkSpawnRate = isWorking ? 0.012 : 0.004;
    if (sparks.length < maxSparks && dt > 0) {
      const sr = seededRng(Math.floor(time * 0.007) + seed * 31);
      if (sr() < sparkSpawnRate * dt) {
        const ci = Math.floor(sr() * clusters.length);
        const c = clusters[ci];
        const angle = sr() * 6.28;
        const dist = sr() * c.radius * 0.8;
        sparks.push({
          x: c.x + Math.cos(angle) * dist,
          y: c.y + Math.sin(angle) * dist,
          size: 1.5 + sr() * 2.5,
          alpha: 0.4 + sr() * 0.5,
          life: 0,
          maxLife: 80 + sr() * 150,
        });
      }
    }
    for (let si = sparks.length - 1; si >= 0; si--) {
      const sp = sparks[si];
      sp.life += dt;
      if (sp.life >= sp.maxLife) { sparks.splice(si, 1); continue; }
      const t = sp.life / sp.maxLife;
      const fade = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1;
      const a = sp.alpha * fade * B;
      const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size * 3);
      sg.addColorStop(0, `rgba(255,255,255,${a})`);
      sg.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.4})`);
      sg.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * 3, 0, 6.28);
      ctx.fillStyle = sg;
      ctx.fill();
    }

    if (isWorking) {
      const scanT = (time * 0.0003) % 1;
      const scanAngle = scanT * 6.28;
      const core = clusters[0];
      const scanLen = Math.max(w, h) * 0.8;
      const endX = core.x + Math.cos(scanAngle) * scanLen;
      const endY = core.y + Math.sin(scanAngle) * scanLen;
      const sGrad = ctx.createLinearGradient(core.x, core.y, endX, endY);
      sGrad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.02)`);
      sGrad.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.008)`);
      sGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.beginPath();
      ctx.moveTo(core.x, core.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = sGrad;
      ctx.lineWidth = 30;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    animRef.current = requestAnimationFrame(render);
  }, [safeStatus, rgb, seed]);

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
    const cx = w / 2, cy = h / 2;

    const outerR = Math.min(w, h) * 0.3;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
    g.addColorStop(0, `rgba(99,102,241,${0.03 * pulse})`);
    g.addColorStop(0.5, `rgba(99,102,241,${0.015 * pulse})`);
    g.addColorStop(1, `rgba(99,102,241,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 6.28);
    ctx.fillStyle = `rgba(99,102,241,${0.08 * pulse})`;
    ctx.fill();

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
