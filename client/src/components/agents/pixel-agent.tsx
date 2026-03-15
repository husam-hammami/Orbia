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

interface Vec3 { x: number; y: number; z: number }
interface Node3D { pos: Vec3; r: number; layer: number; phase: number }
interface Edge3D { a: number; b: number; w: number }
interface Signal { edge: number; t: number; speed: number }

function buildNetwork(seed: number) {
  const rng = seededRng(seed);
  const nodes: Node3D[] = [];
  const edges: Edge3D[] = [];

  nodes.push({ pos: { x: 0, y: 0, z: 0 }, r: 6, layer: 0, phase: rng() * 6.28 });

  for (let i = 0; i < 4; i++) {
    const phi = (i / 4) * 6.28 + rng() * 0.8;
    const theta = 0.6 + rng() * 1.0;
    const dist = 28 + rng() * 12;
    nodes.push({
      pos: {
        x: Math.sin(theta) * Math.cos(phi) * dist,
        y: Math.sin(theta) * Math.sin(phi) * dist,
        z: Math.cos(theta) * dist * 0.7,
      },
      r: 3.5 + rng() * 1.5, layer: 1, phase: rng() * 6.28,
    });
    edges.push({ a: 0, b: nodes.length - 1, w: 0.7 + rng() * 0.3 });
  }

  for (let i = 0; i < 8; i++) {
    const phi = (i / 8) * 6.28 + rng() * 0.5;
    const theta = 0.3 + rng() * 2.2;
    const dist = 50 + rng() * 20;
    nodes.push({
      pos: {
        x: Math.sin(theta) * Math.cos(phi) * dist,
        y: Math.sin(theta) * Math.sin(phi) * dist,
        z: Math.cos(theta) * dist * 0.5,
      },
      r: 2 + rng() * 1.2, layer: 2, phase: rng() * 6.28,
    });
    const parent = 1 + Math.floor(rng() * 4);
    edges.push({ a: parent, b: nodes.length - 1, w: 0.4 + rng() * 0.4 });
    if (rng() > 0.5) {
      const other = 5 + Math.floor(rng() * i);
      if (other < nodes.length - 1) edges.push({ a: nodes.length - 1, b: other, w: 0.15 + rng() * 0.3 });
    }
  }

  for (let i = 0; i < 12; i++) {
    const phi = (i / 12) * 6.28 + rng() * 0.7;
    const theta = rng() * 3.14;
    const dist = 70 + rng() * 30;
    nodes.push({
      pos: {
        x: Math.sin(theta) * Math.cos(phi) * dist,
        y: Math.sin(theta) * Math.sin(phi) * dist,
        z: Math.cos(theta) * dist * 0.4,
      },
      r: 1 + rng() * 0.8, layer: 3, phase: rng() * 6.28,
    });
    const parent = 5 + Math.floor(rng() * 8);
    if (parent < nodes.length - 1) edges.push({ a: parent, b: nodes.length - 1, w: 0.1 + rng() * 0.25 });
    if (rng() > 0.65) {
      const other = 13 + Math.floor(rng() * i);
      if (other < nodes.length - 1) edges.push({ a: nodes.length - 1, b: other, w: 0.05 + rng() * 0.15 });
    }
  }

  return { nodes, edges };
}

function project(p: Vec3, w: number, h: number, fov: number): { sx: number; sy: number; depth: number; scale: number } {
  const d = fov / (fov + p.z + 150);
  return { sx: w / 2 + p.x * d, sy: h / 2 + p.y * d, depth: p.z, scale: d };
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

export function NeuralOrbit({ status, accentColor, seed = 0 }: NeuralOrbitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const signalsRef = useRef<Signal[]>([]);

  const safeStatus = (["idle", "working", "error", "waiting"].includes(status) ? status : "idle") as NeuralOrbitProps["status"];
  const color = accentColor || "#6366f1";
  const rgb = useMemo(() => hexToRgb(color), [color]);
  const network = useMemo(() => buildNetwork(seed), [seed]);

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

    const dt = (time - timeRef.current) / 1000;
    timeRef.current = time;

    const isWorking = safeStatus === "working";
    const isError = safeStatus === "error";
    const isWaiting = safeStatus === "waiting";

    const rotSpeed = isWorking ? 0.15 : isError ? 0.25 : isWaiting ? 0.03 : 0.06;
    const tilt = 0.3 + Math.sin(time * 0.0003) * 0.08;
    const rotAngle = time * 0.001 * rotSpeed;

    const fov = Math.min(w, h) * 1.8;
    const pulse = Math.sin(time * (isWorking ? 0.004 : 0.002));
    const globalAlpha = isWaiting ? 0.4 : isError ? 0.65 : 0.85;

    const { nodes, edges } = network;

    const projected = nodes.map((n, i) => {
      let p = n.pos;
      p = rotateY(p, rotAngle);
      p = rotateX(p, tilt);
      const breathe = 1 + Math.sin(time * 0.003 + n.phase) * (isWorking ? 0.06 : 0.03);
      p = { x: p.x * breathe, y: p.y * breathe, z: p.z * breathe };
      const proj = project(p, w, h, fov);
      return { ...proj, node: n, idx: i };
    });

    const edgesProj = edges.map(e => ({
      edge: e,
      fromP: projected[e.a],
      toP: projected[e.b],
      avgDepth: (projected[e.a].depth + projected[e.b].depth) / 2,
    }));
    edgesProj.sort((a, b) => a.avgDepth - b.avgDepth);

    for (const ep of edgesProj) {
      const { fromP, toP, edge } = ep;
      const depthFade = Math.max(0.1, Math.min(1, (fromP.scale + toP.scale) / 2 * 1.5));
      const edgePulse = Math.sin(time * 0.003 + edge.a * 0.5) * 0.3 + 0.7;
      let alpha = edge.w * depthFade * edgePulse * globalAlpha * 0.5;
      if (isWorking) alpha *= 1.5;
      if (isError) alpha *= 0.5 + Math.sin(time * 0.01 + edge.a) * 0.3;

      const lineW = Math.max(0.3, edge.w * depthFade * (isWorking ? 2.5 : 1.5));

      const grad = ctx.createLinearGradient(fromP.sx, fromP.sy, toP.sx, toP.sy);
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.3})`);
      grad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.3})`);

      const mx = (fromP.sx + toP.sx) / 2 + (fromP.sy - toP.sy) * 0.12;
      const my = (fromP.sy + toP.sy) / 2 + (toP.sx - fromP.sx) * 0.12;

      ctx.beginPath();
      ctx.moveTo(fromP.sx, fromP.sy);
      ctx.quadraticCurveTo(mx, my, toP.sx, toP.sy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.stroke();

      if (isWorking && edge.w > 0.3) {
        ctx.beginPath();
        ctx.moveTo(fromP.sx, fromP.sy);
        ctx.quadraticCurveTo(mx, my, toP.sx, toP.sy);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.15})`;
        ctx.lineWidth = lineW * 4;
        ctx.stroke();
      }
    }

    if (isWorking) {
      const signals = signalsRef.current;
      if (signals.length < 8 && dt > 0) {
        const rng = seededRng(Math.floor(time * 0.01) + seed);
        if (rng() > 0.92) {
          const eIdx = Math.floor(rng() * edges.length);
          signals.push({ edge: eIdx, t: 0, speed: 0.4 + rng() * 0.6 });
        }
      }

      for (let i = signals.length - 1; i >= 0; i--) {
        const sig = signals[i];
        sig.t += dt * sig.speed;
        if (sig.t > 1) { signals.splice(i, 1); continue; }

        const e = edges[sig.edge];
        if (!e) { signals.splice(i, 1); continue; }
        const fp = projected[e.a], tp = projected[e.b];
        const t = sig.t;
        const mx = (fp.sx + tp.sx) / 2 + (fp.sy - tp.sy) * 0.12;
        const my = (fp.sy + tp.sy) / 2 + (tp.sx - fp.sx) * 0.12;
        const u = 1 - t;
        const sx = u * u * fp.sx + 2 * u * t * mx + t * t * tp.sx;
        const sy = u * u * fp.sy + 2 * u * t * my + t * t * tp.sy;
        const sigAlpha = Math.sin(t * 3.14) * 0.9;

        const sigGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
        sigGrad.addColorStop(0, `rgba(255,255,255,${sigAlpha})`);
        sigGrad.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${sigAlpha * 0.6})`);
        sigGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, 6.28);
        ctx.fillStyle = sigGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, 6.28);
        ctx.fillStyle = `rgba(255,255,255,${sigAlpha})`;
        ctx.fill();
      }
    } else {
      signalsRef.current = [];
    }

    projected.sort((a, b) => a.depth - b.depth);

    for (const p of projected) {
      const { sx, sy, scale, node } = p;
      const isCore = node.layer === 0;
      const baseR = node.r * scale * (isWorking ? 1.15 : 1);
      const depthAlpha = Math.max(0.15, Math.min(1, scale * 1.5));
      const nodePulse = Math.sin(time * (isWorking ? 0.005 : 0.002) + node.phase);

      const r = baseR * (1 + nodePulse * (isCore ? 0.15 : 0.08));
      let alpha = depthAlpha * globalAlpha * (isCore ? 1 : node.layer === 1 ? 0.85 : node.layer === 2 ? 0.65 : 0.4);
      if (isError) alpha *= 0.6 + Math.sin(time * 0.015 + node.phase) * 0.4;

      if (isCore || node.layer === 1) {
        const glowR = r * (isCore ? 6 : 3.5) * (1 + nodePulse * 0.2);
        const glowAlpha = alpha * (isCore ? 0.25 : 0.12) * (isWorking ? 1.5 : 1);
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        glow.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${glowAlpha})`);
        glow.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${glowAlpha * 0.3})`);
        glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, 6.28);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      if (isCore && isWorking) {
        const ringR = r * 3 * (1 + pulse * 0.15);
        ctx.beginPath();
        ctx.arc(sx, sy, ringR, 0, 6.28);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.1 + pulse * 0.05})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        const ringR2 = r * 5 * (1 + pulse * 0.1);
        ctx.beginPath();
        ctx.arc(sx, sy, ringR2, 0, 6.28);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.05 + pulse * 0.03})`;
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      const nodeGrad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
      nodeGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
      nodeGrad.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.8})`);
      nodeGrad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.2})`);

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.5, r), 0, 6.28);
      ctx.fillStyle = nodeGrad;
      ctx.fill();

      if (isCore) {
        const highlight = ctx.createRadialGradient(sx - r * 0.2, sy - r * 0.25, 0, sx, sy, r * 0.6);
        highlight.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
        highlight.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.6, 0, 6.28);
        ctx.fillStyle = highlight;
        ctx.fill();
      }
    }

    animRef.current = requestAnimationFrame(render);
  }, [safeStatus, rgb, network, seed]);

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

    const rot = time * 0.0002;
    const tilt = 0.4;
    const fov = Math.min(w, h) * 1.5;

    const ghostNodes = [
      { x: 0, y: 0, z: 0, r: 3 },
      { x: 30, y: 20, z: 10, r: 2 },
      { x: -25, y: 15, z: -15, r: 1.8 },
      { x: 20, y: -25, z: 5, r: 1.5 },
      { x: -15, y: -20, z: -10, r: 1.5 },
    ];
    const ghostEdges = [[0,1],[0,2],[0,3],[0,4],[1,2],[3,4]];

    const proj = ghostNodes.map(n => {
      let p = { x: n.x, y: n.y, z: n.z };
      p = rotateY(p, rot);
      p = rotateX(p, tilt);
      const pr = project(p, w, h, fov);
      return { ...pr, r: n.r };
    });

    const pulse = Math.sin(time * 0.001) * 0.3 + 0.7;

    for (const [a, b] of ghostEdges) {
      const f = proj[a], t = proj[b];
      ctx.beginPath();
      ctx.moveTo(f.sx, f.sy);
      ctx.lineTo(t.sx, t.sy);
      ctx.strokeStyle = `rgba(99,102,241,${0.06 * pulse})`;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const p of proj) {
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, Math.max(0.5, p.r * p.scale), 0, 6.28);
      ctx.fillStyle = `rgba(99,102,241,${0.15 * pulse})`;
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
