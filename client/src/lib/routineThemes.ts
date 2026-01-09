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
    bgGradient: 'from-amber-50 to-orange-50',
    borderColor: 'border-amber-200',
    accentColor: '#f59e0b',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    progressColor: '#f59e0b',
    completedBg: 'bg-amber-50',
    completedBorder: 'border-amber-300',
    nodeBg: 'bg-amber-500',
  },
  {
    id: 'work',
    label: 'Work',
    bgGradient: 'from-blue-50 to-slate-50',
    borderColor: 'border-blue-200',
    accentColor: '#3b82f6',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    progressColor: '#3b82f6',
    completedBg: 'bg-blue-50',
    completedBorder: 'border-blue-300',
    nodeBg: 'bg-blue-500',
  },
  {
    id: 'break',
    label: 'Break',
    bgGradient: 'from-teal-50 to-emerald-50',
    borderColor: 'border-teal-200',
    accentColor: '#14b8a6',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    progressColor: '#14b8a6',
    completedBg: 'bg-teal-50',
    completedBorder: 'border-teal-300',
    nodeBg: 'bg-teal-500',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    bgGradient: 'from-yellow-50 to-amber-50',
    borderColor: 'border-yellow-200',
    accentColor: '#eab308',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    progressColor: '#eab308',
    completedBg: 'bg-yellow-50',
    completedBorder: 'border-yellow-300',
    nodeBg: 'bg-yellow-500',
  },
  {
    id: 'evening',
    label: 'Evening',
    bgGradient: 'from-indigo-50 to-violet-50',
    borderColor: 'border-indigo-200',
    accentColor: '#6366f1',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    progressColor: '#6366f1',
    completedBg: 'bg-indigo-50',
    completedBorder: 'border-indigo-300',
    nodeBg: 'bg-indigo-500',
  },
  {
    id: 'night',
    label: 'Night',
    bgGradient: 'from-purple-50 to-slate-100',
    borderColor: 'border-purple-200',
    accentColor: '#7c3aed',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    progressColor: '#7c3aed',
    completedBg: 'bg-purple-50',
    completedBorder: 'border-purple-300',
    nodeBg: 'bg-purple-500',
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
