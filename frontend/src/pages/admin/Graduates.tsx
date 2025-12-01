import { SearchIcon } from 'lucide-react'
import React from 'react'
import { IoFilterOutline } from 'react-icons/io5'
import GraduateCard from '../../components/admin/graduates/graduate-card';

export interface Graduate {
  id: string;
  name: string;
  role: string;
  email: string;
  matchScore: number;
  skills: string[];
  avatar: string;
}

export const graduates: Graduate[] = [
  {
    id: "1",
    name: "David John",
    role: "FrontEnd Developer",
    email: "davidjohn@gmail.com",
    matchScore: 95,
    skills: ["React", "Node.Js", "Typescript"],
    avatar: "/images/avatars/dev1.png",
  },
  {
    id: "2",
    name: "Sarah Michael",
    role: "UI/UX Designer",
    email: "sarahm@gmail.com",
    matchScore: 92,
    skills: ["Figma", "UX Research", "Prototyping"],
    avatar: "/images/avatars/dev2.png",
  },
  {
    id: "3",
    name: "Emeka Johnson",
    role: "Backend Developer",
    email: "emeka.backend@gmail.com",
    matchScore: 88,
    skills: ["Node.Js", "Express", "MongoDB"],
    avatar: "/images/avatars/dev3.png",
  },
  {
    id: "4",
    name: "Fatima Yusuf",
    role: "Fullstack Developer",
    email: "fatimayusuf@gmail.com",
    matchScore: 90,
    skills: ["React", "Node.Js", "TailwindCSS"],
    avatar: "/images/avatars/dev4.png",
  },
  {
    id: "5",
    name: "Michael Ade",
    role: "Mobile Developer",
    email: "michaelade@gmail.com",
    matchScore: 87,
    skills: ["Flutter", "Dart", "Firebase"],
    avatar: "/images/avatars/dev5.png",
  },
  {
    id: "6",
    name: "Chidinma Okafor",
    role: "Product Manager",
    email: "chidinma.pm@gmail.com",
    matchScore: 93,
    skills: ["Roadmap", "Scrum", "User Stories"],
    avatar: "/images/avatars/dev6.png",
  },
];


const Graduates = () => {
  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
    <div className='flex flex-col gap-2.5'>
    <p className="text-[#1C1C1C] font-semibold text-[26px]">Graduates</p>
    <p className='text-[#1C1C1CBF] font-medium text-[18px]'>Manage all registered graduates</p>
    </div>

    <div className='flex flex-col gap-[18px] w-full'>
     <div className='flex gap-[20px] w-full'>
       <div className='flex items-center border w-full border-fade rounded-[10px]'>
         <p className='text-fade  p-[15px]'><SearchIcon /></p>
         <div className='w-px h-[20px] bg-fade' />
         <input type="text" placeholder='Search Graduates'  className='w-full outline-none  text-[16px] p-[15px] placeholder:text-fade' />
       </div>
       <div className='text-fade text-[20px] px-[20px] py-[15px] border border-fade rounded-[10px] cursor-pointer'>
         <IoFilterOutline/>
       </div>

     

     </div>
     <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]'>
       {graduates.map((grad) => (
  <GraduateCard key={grad.id} id={grad.id} name={grad.name} role={grad.role} email={grad.email} matchScore={grad.matchScore} skills={grad.skills} avatar={grad.avatar} />
))}

       </div>
     </div>
     </div>
  )
}

export default Graduates