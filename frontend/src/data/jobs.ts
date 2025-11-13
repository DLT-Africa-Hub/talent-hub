export type JobStatus = 'active' | 'paused' | 'closed';

export interface CompanyJob {
  id: number;
  title: string;
  location: string;
  description: string;
  duration: string;
  salaryRange: string;
  salaryType: string;
  matchedCount: number;
  status: JobStatus;
  image: string;
}

export const companyJobs: CompanyJob[] = [
  {
    id: 1,
    title: 'Frontend Developer',
    location: 'San Fransisco, US',
    description: 'Looking for an experienced frontend developer with at least 3 years in the field',
    duration: '3 months',
    salaryRange: '$80k-100k',
    salaryType: 'Annual',
    matchedCount: 4,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 2,
    title: 'Graphic Designer',
    location: 'San Fransisco, US',
    description: 'Looking for an experienced graphics designer with at least 3 years in the field',
    duration: '3 months',
    salaryRange: '$80k-100k',
    salaryType: 'Annual',
    matchedCount: 4,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    title: 'Backend Engineer',
    location: 'Remote • Austin, US',
    description: 'Seeking a backend engineer proficient in Node.js and cloud-native architecture.',
    duration: '6 months',
    salaryRange: '$110k-140k',
    salaryType: 'Annual',
    matchedCount: 6,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=1200&q=80',
  },
];

