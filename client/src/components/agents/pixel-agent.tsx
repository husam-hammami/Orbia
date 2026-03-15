import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface NeuralOrbitProps {
  status: "idle" | "working" | "error" | "waiting";
  accentColor: string;
  seed?: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) || 99,
    g: parseInt(h.substring(2, 4), 16) || 102,
    b: parseInt(h.substring(4, 6), 16) || 241,
  };
}

function seededRandom(s: number) {
  let v = s;
  return () => {
    v = (v * 16807 + 0) % 2147483647;
    return (v - 1) / 2147483646;
  };
}

interface NeuralNode {
  x: number;
  y: number;
  r: number;
  layer: number;
  bright: boolean;
}

interface NeuralEdge {
  from: number;
  to: number;
  strength: number;
}

function generateNeuralNetwork(seed: number) {
  const rng = seededRandom(seed * 7919 + 1301);

  const nodes: NeuralNode[] = [];
  const coreX = 30 + rng() * 40;
  const coreY = 30 + rng() * 40;
  nodes.push({ x: coreX, y: coreY, r: 3.5, layer: 0, bright: true });

  for (let i = 0; i < 3; i++) {
    const angle = (i * 120 + rng() * 60) * (Math.PI / 180);
    const dist = 12 + rng() * 10;
    nodes.push({
      x: coreX + Math.cos(angle) * dist,
      y: coreY + Math.sin(angle) * dist,
      r: 2.2 + rng() * 0.8,
      layer: 1,
      bright: rng() > 0.5,
    });
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 + rng() * 40 - 20) * (Math.PI / 180);
    const dist = 22 + rng() * 18;
    nodes.push({
      x: coreX + Math.cos(angle) * dist,
      y: coreY + Math.sin(angle) * dist,
      r: 1.2 + rng() * 0.8,
      layer: 2,
      bright: rng() > 0.6,
    });
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 + rng() * 30 - 15) * (Math.PI / 180);
    const dist = 35 + rng() * 15;
    nodes.push({
      x: coreX + Math.cos(angle) * dist,
      y: coreY + Math.sin(angle) * dist,
      r: 0.7 + rng() * 0.6,
      layer: 3,
      bright: rng() > 0.7,
    });
  }

  const edges: NeuralEdge[] = [];

  for (let i = 1; i <= 3; i++) {
    edges.push({ from: 0, to: i, strength: 0.7 + rng() * 0.3 });
  }

  for (let i = 4; i <= 9; i++) {
    const parent = 1 + Math.floor(rng() * 3);
    edges.push({ from: parent, to: i, strength: 0.4 + rng() * 0.4 });
    if (rng() > 0.6) {
      const other = 4 + Math.floor(rng() * 6);
      if (other !== i) edges.push({ from: i, to: other, strength: 0.2 + rng() * 0.3 });
    }
  }

  for (let i = 10; i < nodes.length; i++) {
    const parent = 4 + Math.floor(rng() * 6);
    edges.push({ from: parent, to: i, strength: 0.15 + rng() * 0.35 });
    if (rng() > 0.7) {
      const other = 10 + Math.floor(rng() * (nodes.length - 10));
      if (other !== i && other < nodes.length) edges.push({ from: i, to: other, strength: 0.1 + rng() * 0.2 });
    }
  }

  return { nodes, edges };
}

export function NeuralOrbit({ status, accentColor, seed = 0 }: NeuralOrbitProps) {
  const safeStatus = (["idle", "working", "error", "waiting"].includes(status) ? status : "idle") as NeuralOrbitProps["status"];
  const color = accentColor || "#6366f1";
  const rgb = hexToRgb(color);
  const uid = `nn-${seed}`;

  const isWorking = safeStatus === "working";
  const isError = safeStatus === "error";
  const isWaiting = safeStatus === "waiting";

  const network = useMemo(() => generateNeuralNetwork(seed), [seed]);

  const baseEdgeOpacity = isWorking ? 0.4 : isError ? 0.15 : isWaiting ? 0.08 : 0.15;
  const baseNodeOpacity = isWorking ? 0.9 : isError ? 0.5 : isWaiting ? 0.3 : 0.55;
  const pulseSpeed = isWorking ? 1.5 : isError ? 0.8 : isWaiting ? 5 : 3;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <radialGradient id={`${uid}-cg`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-ng`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-glow`}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {isError && (
            <filter id={`${uid}-err`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed * 3} />
              <feDisplacementMap in="SourceGraphic" scale="2.5" />
            </filter>
          )}
        </defs>

        <g filter={isError ? `url(#${uid}-err)` : undefined}>
          {network.edges.map((edge, i) => {
            const from = network.nodes[edge.from];
            const to = network.nodes[edge.to];
            if (!from || !to) return null;

            const mx = (from.x + to.x) / 2 + (from.y - to.y) * 0.15;
            const my = (from.y + to.y) / 2 + (to.x - from.x) * 0.15;
            const path = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
            const opacity = baseEdgeOpacity * edge.strength;

            return (
              <React.Fragment key={`e-${i}`}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={edge.strength > 0.5 ? 0.6 : 0.35}
                  opacity={opacity}
                  animate={isWorking ? {
                    opacity: [opacity * 0.4, opacity * 1.5, opacity * 0.4],
                    strokeWidth: [0.3, edge.strength > 0.5 ? 0.9 : 0.5, 0.3],
                  } : {
                    opacity: [opacity * 0.6, opacity, opacity * 0.6],
                  }}
                  transition={{
                    duration: pulseSpeed + (i % 3) * 0.7,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i % 5) * 0.3,
                  }}
                />
                {isWorking && edge.strength > 0.5 && (
                  <motion.circle r="0.8" fill="#ffffff" opacity={0}>
                    <animateMotion
                      dur={`${1.5 + (i % 3) * 0.5}s`}
                      repeatCount="indefinite"
                      path={path}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.8;0"
                      dur={`${1.5 + (i % 3) * 0.5}s`}
                      repeatCount="indefinite"
                    />
                  </motion.circle>
                )}
              </React.Fragment>
            );
          })}

          {network.nodes.map((node, i) => {
            const isCore = node.layer === 0;
            const nodeR = node.r;
            const opacity = baseNodeOpacity * (isCore ? 1 : node.layer === 1 ? 0.9 : node.layer === 2 ? 0.7 : 0.5);

            return (
              <React.Fragment key={`n-${i}`}>
                {isCore && (
                  <motion.circle
                    cx={node.x} cy={node.y} r={nodeR * 4}
                    fill={`url(#${uid}-ng)`}
                    opacity={0.3}
                    animate={{
                      r: [nodeR * 3.5, nodeR * 5, nodeR * 3.5],
                      opacity: isWorking ? [0.3, 0.6, 0.3] : [0.15, 0.3, 0.15],
                    }}
                    transition={{ duration: pulseSpeed * 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {node.layer <= 1 && (
                  <motion.circle
                    cx={node.x} cy={node.y} r={nodeR * 2.5}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.2"
                    opacity={0.15}
                    animate={{
                      r: [nodeR * 2, nodeR * 3, nodeR * 2],
                      opacity: [0.05, 0.2, 0.05],
                    }}
                    transition={{ duration: pulseSpeed * 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                  />
                )}

                <motion.circle
                  cx={node.x} cy={node.y}
                  r={nodeR}
                  fill={node.bright ? `url(#${uid}-cg)` : color}
                  filter={node.layer <= 1 ? `url(#${uid}-glow)` : undefined}
                  opacity={opacity}
                  animate={{
                    r: isWorking
                      ? [nodeR, nodeR * 1.4, nodeR]
                      : [nodeR, nodeR * 1.15, nodeR],
                    opacity: [opacity * 0.6, opacity, opacity * 0.6],
                  }}
                  transition={{
                    duration: pulseSpeed + (i % 4) * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: (i % 6) * 0.2,
                  }}
                />

                {isCore && (
                  <circle cx={node.x} cy={node.y} r={nodeR * 0.5} fill="#ffffff" opacity={isWaiting ? 0.5 : 0.9} />
                )}
              </React.Fragment>
            );
          })}

          {isWorking && (
            <>
              {[0, 1, 2].map(i => {
                const rng = seededRandom(seed * 100 + i * 37);
                const core = network.nodes[0];
                const angle = (i * 120 + 30) * (Math.PI / 180);
                const endX = core.x + Math.cos(angle) * (40 + rng() * 10);
                const endY = core.y + Math.sin(angle) * (40 + rng() * 10);
                return (
                  <motion.line
                    key={`pulse-${i}`}
                    x1={core.x} y1={core.y} x2={endX} y2={endY}
                    stroke={color}
                    strokeWidth="0.15"
                    opacity={0}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 1 }}
                  />
                );
              })}
            </>
          )}
        </g>
      </svg>

      <div
        className="absolute pointer-events-none"
        style={{
          left: `${network.nodes[0].x}%`,
          top: `${network.nodes[0].y}%`,
          transform: "translate(-50%, -50%)",
          width: isWorking ? 80 : 50,
          height: isWorking ? 80 : 50,
          background: `radial-gradient(circle, rgba(${rgb.r},${rgb.g},${rgb.b},${isWorking ? 0.12 : 0.06}) 0%, transparent 70%)`,
          filter: `blur(${isWorking ? 15 : 10}px)`,
        }}
      />
    </div>
  );
}

export function EmptyOrbit({ onClick }: { onClick?: () => void }) {
  const interactive = !!onClick;
  const Container = interactive ? motion.div : ("div" as any);

  const ghostNodes = [
    { x: 40, y: 45, r: 2 },
    { x: 55, y: 35, r: 1.5 },
    { x: 60, y: 55, r: 1.2 },
    { x: 35, y: 60, r: 1 },
    { x: 50, y: 50, r: 2.5 },
  ];
  const ghostEdges = [
    [4, 0], [4, 1], [4, 2], [4, 3], [0, 1], [2, 3],
  ];

  return (
    <Container
      className={`absolute inset-0 overflow-hidden ${interactive ? "cursor-pointer group" : ""}`}
      {...(interactive ? {
        whileHover: { scale: 1.02 },
        onClick,
        role: "button",
        tabIndex: 0,
        "aria-label": "Add new agent",
      } : {})}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full opacity-15 group-hover:opacity-30 transition-opacity duration-700">
        {ghostEdges.map(([from, to], i) => (
          <motion.line
            key={`ge-${i}`}
            x1={ghostNodes[from].x} y1={ghostNodes[from].y}
            x2={ghostNodes[to].x} y2={ghostNodes[to].y}
            stroke="#6366f1" strokeWidth="0.3" strokeDasharray="2 3"
            opacity={0.4}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        {ghostNodes.map((n, i) => (
          <motion.circle
            key={`gn-${i}`}
            cx={n.x} cy={n.y} r={n.r}
            fill="#6366f1" opacity={0.3}
            animate={{ opacity: [0.15, 0.4, 0.15], r: [n.r * 0.8, n.r * 1.2, n.r * 0.8] }}
            transition={{ duration: 3 + i * 0.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-[1px] bg-indigo-500/25 group-hover:bg-indigo-400/40 transition-colors" />
        <div className="absolute h-6 w-[1px] bg-indigo-500/25 group-hover:bg-indigo-400/40 transition-colors" />
      </div>
    </Container>
  );
}
