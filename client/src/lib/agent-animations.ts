export const agentAnimations = {
  cardEnter: {
    initial: { opacity: 0, y: 24, scale: 0.96 } as const,
    animate: { opacity: 1, y: 0, scale: 1 } as const,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
  cardStagger: 0.1,

  idleFloat: {
    animate: { y: [-1.5, 1.5] },
    transition: { duration: 3.2, repeat: Infinity, repeatType: "reverse" as const, ease: "easeInOut" as const },
  },

  workingPulse: {
    animate: { scale: [1, 1.015, 1] },
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const },
  },

  panelSlideUp: {
    initial: { opacity: 0, y: 60 } as const,
    animate: { opacity: 1, y: 0 } as const,
    exit: { opacity: 0, y: 60 } as const,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },

  errorShake: {
    animate: { x: [-3, 3, -3, 3, 0] },
    transition: { duration: 0.4 },
  },

  wizardStep: {
    initial: { opacity: 0, x: 30 } as const,
    animate: { opacity: 1, x: 0 } as const,
    exit: { opacity: 0, x: -30 } as const,
    transition: { duration: 0.25 },
  },
};

export const glassPanel = "bg-black/40 backdrop-blur-xl border border-indigo-500/15 shadow-[0_0_15px_rgba(100,80,255,0.04)] rounded-2xl";
export const glassPanelGlow = "bg-black/40 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(100,80,255,0.06)] rounded-2xl";
export const glassPanelAccent = (color: string) =>
  `bg-black/40 backdrop-blur-xl border rounded-2xl` as const;
