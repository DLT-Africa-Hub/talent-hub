import { SearchIcon } from 'lucide-react'
import React from 'react'
import { IoFilterOutline } from 'react-icons/io5'
import JobItem from '../../components/admin/jobs/job-item';

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  status: "Active" | "Hired" | "Closed";
  applicants: number;
  views: number;
  salary: string;
  postedAt: string;
}

export const jobsData: JobItem[] = [
  {
    id: "1",
    title: "Senior Product Manager",
    company: "Tech Innovations Inc",
    location: "San Francisco, CA",
    status: "Active",
    applicants: 234,
    views: 1250,
    salary: "$150K - $200K Annually",
    postedAt: "2 days ago",
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "Tech Innovations Inc",
    location: "San Francisco, CA",
    status: "Active",
    applicants: 234,
    views: 1250,
    salary: "$150K - $200K Annually",
    postedAt: "5 days ago",
  },
  {
    id: "3",
    title: "UX Designer",
    company: "Tech Innovations Inc",
    location: "San Francisco, CA",
    status: "Active",
    applicants: 234,
    views: 1250,
    salary: "$150K - $200K Annually",
    postedAt: "1 week ago",
  },
  {
    id: "4",
    title: "Data Scientist",
    company: "Tech Innovations Inc",
    location: "San Francisco, CA",
    status: "Hired",
    applicants: 234,
    views: 1250,
    salary: "$150K - $200K Annually",
    postedAt: "2 weeks ago",
  },

  // ---- Extra data you can use ---- //

  {
    id: "5",
    title: "Frontend Developer",
    company: "Bright Labs",
    location: "New York, NY",
    status: "Active",
    applicants: 180,
    views: 980,
    salary: "$120K - $160K Annually",
    postedAt: "3 days ago",
  },
  {
    id: "6",
    title: "Backend Engineer",
    company: "Bright Labs",
    location: "New York, NY",
    status: "Closed",
    applicants: 156,
    views: 820,
    salary: "$130K - $165K Annually",
    postedAt: "1 month ago",
  },
  {
    id: "7",
    title: "Product Designer",
    company: "NextGen Systems",
    location: "Austin, TX",
    status: "Active",
    applicants: 210,
    views: 1400,
    salary: "$110K - $150K Annually",
    postedAt: "6 days ago",
  },
  {
    id: "8",
    title: "AI Research Engineer",
    company: "DeepTech Labs",
    location: "Seattle, WA",
    status: "Active",
    applicants: 320,
    views: 2400,
    salary: "$180K - $240K Annually",
    postedAt: "1 day ago",
  },
  {
    id: "9",
    title: "DevOps Engineer",
    company: "CloudSync",
    location: "Remote",
    status: "Active",
    applicants: 275,
    views: 1650,
    salary: "$140K - $190K Annually",
    postedAt: "4 days ago",
  },
  {
    id: "10",
    title: "Mobile App Developer",
    company: "AppNation",
    location: "Los Angeles, CA",
    status: "Hired",
    applicants: 198,
    views: 1120,
    salary: "$130K - $170K Annually",
    postedAt: "3 weeks ago",
  }
];


const Jobs = () => {
  return (
    <div className="py-[20px] px-[20px]  lg:px-0 lg:pr-[20px] flex flex-col gap-[43px] font-inter items-start overflow-y-auto h-full">
    <div className='flex flex-col gap-2.5'>
    <p className="text-[#1C1C1C] font-semibold text-[26px]">Jobs</p>
    <p className='text-[#1C1C1CBF] font-medium text-[18px]'>Manage all job postings</p>
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
   
     </div>
     <div className='flex flex-col gap-[20px] w-full'>
     {jobsData.map((job) => (
      <JobItem applicants={job.applicants} company={job.company} id={job.id} location={job.location} postedAt={job.postedAt} salary={job.salary} status={job.status} title={job.title} views={job.views} key={job.id}/>
     ))}
     </div>
     </div>
  )
}

export default Jobs