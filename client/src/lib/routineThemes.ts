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
    bgGradient: 'from-[#F7F3EF] to-[#F5F0E8]',
    borderColor: 'border-[#E1D7C7]',
    accentColor: '#8B6A45',
    iconBg: 'bg-[#EFE4D5]',
    iconColor: 'text-[#8B6A45]',
    progressColor: '#8B6A45',
    completedBg: 'bg-[#F7F3EF]',
    completedBorder: 'border-[#C9B8A0]',
    nodeBg: 'bg-[#8B6A45]',
  },
  {
    id: 'work',
    label: 'Work',
    bgGradient: 'from-[#F2F5F9] to-[#EDF1F7]',
    borderColor: 'border-[#D4DEE8]',
    accentColor: '#4F6E8F',
    iconBg: 'bg-[#E4ECF5]',
    iconColor: 'text-[#4F6E8F]',
    progressColor: '#4F6E8F',
    completedBg: 'bg-[#F2F5F9]',
    completedBorder: 'border-[#B8C9DC]',
    nodeBg: 'bg-[#4F6E8F]',
  },
  {
    id: 'break',
    label: 'Break',
    bgGradient: 'from-[#F1F5F4] to-[#ECF2EF]',
    borderColor: 'border-[#CFE2DA]',
    accentColor: '#4D7A63',
    iconBg: 'bg-[#E0EBE6]',
    iconColor: 'text-[#4D7A63]',
    progressColor: '#4D7A63',
    completedBg: 'bg-[#F1F5F4]',
    completedBorder: 'border-[#B5D4C4]',
    nodeBg: 'bg-[#4D7A63]',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    bgGradient: 'from-[#F3F5F1] to-[#EEF2EA]',
    borderColor: 'border-[#D8E0D1]',
    accentColor: '#557565',
    iconBg: 'bg-[#E7ECDD]',
    iconColor: 'text-[#557565]',
    progressColor: '#557565',
    completedBg: 'bg-[#F3F5F1]',
    completedBorder: 'border-[#B8CABA]',
    nodeBg: 'bg-[#557565]',
  },
  {
    id: 'evening',
    label: 'Evening',
    bgGradient: 'from-[#F4F2F7] to-[#EFEDF4]',
    borderColor: 'border-[#D8D2E3]',
    accentColor: '#6B5B7A',
    iconBg: 'bg-[#E8E3F0]',
    iconColor: 'text-[#6B5B7A]',
    progressColor: '#6B5B7A',
    completedBg: 'bg-[#F4F2F7]',
    completedBorder: 'border-[#C5BCD4]',
    nodeBg: 'bg-[#6B5B7A]',
  },
  {
    id: 'night',
    label: 'Night',
    bgGradient: 'from-[#F0F2F5] to-[#EBEEF3]',
    borderColor: 'border-[#D0D6E0]',
    accentColor: '#5A6578',
    iconBg: 'bg-[#E0E4EC]',
    iconColor: 'text-[#5A6578]',
    progressColor: '#5A6578',
    completedBg: 'bg-[#F0F2F5]',
    completedBorder: 'border-[#B8C0CE]',
    nodeBg: 'bg-[#5A6578]',
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
