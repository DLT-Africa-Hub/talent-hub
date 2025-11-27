export type CandidateStatus = 'applied' | 'matched' | 'hired' | 'pending';

export interface CandidateProfile {
  id: number | string;
  name: string;
  role: string;
  status: CandidateStatus;
  rank: 'A' | 'B' | 'C' | 'D';
  statusLabel: string;
  experience: string;
  location: string;
  skills: string[];
  image: string;
  summary?: string;
  cv?: string;
  matchPercentage?: number;
  jobType?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  directContact?: boolean; 
}

export const companyCandidates: CandidateProfile[] = [
  {
    id: 1,
    name: 'David John',
    role: 'FrontEnd Developer',
    status: 'applied',
    rank: 'A',
    statusLabel: 'Applied',
    experience: '5+ yrs',
    location: 'Remote • Lagos, NG',
    skills: ['React', 'Node.Js', 'Typescript'],
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    name: 'David John',
    role: 'FrontEnd Developer',
    status: 'applied',
    rank: 'B',
    statusLabel: 'Applied',
    experience: '4 yrs',
    location: 'Hybrid • Nairobi, KE',
    skills: ['React', 'Node.Js', 'Typescript'],
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    name: 'Lilian Emily',
    role: 'FrontEnd Developer',
    status: 'applied',
    rank: 'C',
    statusLabel: 'Applied',
    experience: '3 yrs',
    location: 'Remote • Accra, GH',
    skills: ['React', 'Node.Js', 'Typescript'],
    image: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    name: 'Emily Peters',
    role: 'FrontEnd Developer',
    status: 'applied',
    rank: 'B',
    statusLabel: 'Applied',
    experience: '6 yrs',
    location: 'Onsite • Kigali, RW',
    skills: ['React', 'Node.Js', 'Typescript'],
    image: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80',
  },
];

