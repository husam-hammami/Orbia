export type TimeSegment = 'morning' | 'work' | 'break' | 'afternoon' | 'evening' | 'night';

export interface RoutineTheme {
  id: TimeSegment;
  label: string;
  bgGradient: string;
  borderColor: string;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  progressColor: string;
  completedBg: string;
  completedBorder: string;
  nodeBg: string;
}

export const routineThemes: RoutineTheme[] = [
  {
    id: 'morning',
    label: 'Morning',
    bgGradient: 'from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30',
    borderColor: 'border-amber-300/60 dark:border-amber-700/50',
    accentColor: '#d97706',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-700 dark:text-amber-300',
    progressColor: '#d97706',
    completedBg: 'bg-amber-50 dark:bg-amber-950/40',
    completedBorder: 'border-amber-400 dark:border-amber-600',
    nodeBg: 'bg-amber-500',
  },
  {
    id: 'work',
    label: 'Work',
    bgGradient: 'from-sky-50/80 to-blue-50/60 dark:from-sky-950/40 dark:to-blue-950/30',
    borderColor: 'border-sky-300/60 dark:border-sky-700/50',
    accentColor: '#0284c7',
    iconBg: 'bg-sky-100 dark:bg-sky-900/50',
    iconColor: 'text-sky-700 dark:text-sky-300',
    progressColor: '#0284c7',
    completedBg: 'bg-sky-50 dark:bg-sky-950/40',
    completedBorder: 'border-sky-400 dark:border-sky-600',
    nodeBg: 'bg-sky-500',
  },
  {
    id: 'break',
    label: 'Break',
    bgGradient: 'from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/30',
    borderColor: 'border-emerald-300/60 dark:border-emerald-700/50',
    accentColor: '#059669',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    progressColor: '#059669',
    completedBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    completedBorder: 'border-emerald-400 dark:border-emerald-600',
    nodeBg: 'bg-emerald-500',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    bgGradient: 'from-lime-50/80 to-green-50/60 dark:from-lime-950/40 dark:to-green-950/30',
    borderColor: 'border-lime-300/60 dark:border-lime-700/50',
    accentColor: '#65a30d',
    iconBg: 'bg-lime-100 dark:bg-lime-900/50',
    iconColor: 'text-lime-700 dark:text-lime-300',
    progressColor: '#65a30d',
    completedBg: 'bg-lime-50 dark:bg-lime-950/40',
    completedBorder: 'border-lime-400 dark:border-lime-600',
    nodeBg: 'bg-lime-500',
  },
  {
    id: 'evening',
    label: 'Evening',
    bgGradient: 'from-violet-50/80 to-purple-50/60 dark:from-violet-950/40 dark:to-purple-950/30',
    borderColor: 'border-violet-300/60 dark:border-violet-700/50',
    accentColor: '#7c3aed',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-700 dark:text-violet-300',
    progressColor: '#7c3aed',
    completedBg: 'bg-violet-50 dark:bg-violet-950/40',
    completedBorder: 'border-violet-400 dark:border-violet-600',
    nodeBg: 'bg-violet-500',
  },
  {
    id: 'night',
    label: 'Night',
    bgGradient: 'from-slate-50/80 to-gray-50/60 dark:from-slate-900/40 dark:to-gray-900/30',
    borderColor: 'border-slate-300/60 dark:border-slate-600/50',
    accentColor: '#475569',
    iconBg: 'bg-slate-100 dark:bg-slate-800/50',
    iconColor: 'text-slate-700 dark:text-slate-300',
    progressColor: '#475569',
    completedBg: 'bg-slate-50 dark:bg-slate-900/40',
    completedBorder: 'border-slate-400 dark:border-slate-500',
    nodeBg: 'bg-slate-500',
  },
];

export function getThemeBySegment(segment: TimeSegment): RoutineTheme {
  const theme = routineThemes.find(t => t.id === segment);
  return theme || routineThemes[0];
}

export function inferTimeSegment(blockName: string, startTime?: string): TimeSegment {
  const nameLower = blockName.toLowerCase();

  if (nameLower.includes('morning') || nameLower.includes('wake')) {
    return 'morning';
  }
  if (nameLower.includes('break') || nameLower.includes('rest')) {
    return 'break';
  }
  if (nameLower.includes('work') || nameLower.includes('focus') || nameLower.includes('block')) {
    return 'work';
  }
  if (nameLower.includes('afternoon')) {
    return 'afternoon';
  }
  if (nameLower.includes('evening')) {
    return 'evening';
  }
  if (nameLower.includes('night') || nameLower.includes('sleep')) {
    return 'night';
  }

  if (startTime) {
    const [hours] = startTime.split(':').map(Number);
    
    if (hours < 12) {
      return hours < 9 ? 'morning' : 'work';
    }
    if (hours >= 12 && hours < 14) {
      return 'break';
    }
    if (hours >= 14 && hours < 18) {
      return 'afternoon';
    }
    if (hours >= 18 && hours < 21) {
      return 'evening';
    }
    if (hours >= 21) {
      return 'night';
    }
  }

  return 'work';
}
