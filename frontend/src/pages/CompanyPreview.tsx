import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { PiBuildingApartmentLight } from 'react-icons/pi';
import {  BsSend } from "react-icons/bs";
import { useParams } from 'react-router-dom';
import React from 'react';
import { CiMail } from "react-icons/ci";




export interface Company {
  name: string;
  role: string;
  match: number;
  contract: string;
  location: string;
  wageType: string;
  wage: string;
  image: string;
  jobDesc: string;
  id: number;
  skills: string[];
}

interface CompanyPreviewProps {
    mode :string;
  }


const CompanyPreview: React.FC<CompanyPreviewProps>= ({ mode = "application" }) => {
  const { id } = useParams();

  const companies: Company[] = [
    {
      id: 1,
      name: 'TechCorp',
      role: 'Frontend Developer',
      match: 90,
      contract: '3 months contract',
      location: 'San Francisco',
      wageType: 'Annual',
      wage: '80k-100k',
      image:
        'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2342',
      jobDesc:
        'We are seeking a talented Frontend Developer to join our dynamic team. You will be responsible for building and maintaining user-facing features using React and modern JavaScript. You will work closely with our design team to implement responsive, accessible, and performant web applications. The ideal candidate has experience with React, JavaScript, CSS, and HTML, and is passionate about creating exceptional user experiences. You will collaborate with backend developers to integrate APIs and ensure seamless data flow.',
      skills: ['React', 'JavaScript', 'CSS', 'HTML'],
    },
    {
      id: 2,
      name: 'DataFlow Solutions',
      role: 'Backend Developer',
      match: 85,
      contract: '6 months contract',
      location: 'New York',
      wageType: 'Annual',
      wage: '100k-120k',
      image:
        'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069',
      jobDesc:
        'Join our backend engineering team to design and develop scalable server-side applications. You will be responsible for building robust APIs, managing database operations, and ensuring system reliability and performance. The role involves working with Node.js and Python to create efficient backend services, writing optimized SQL queries, and developing RESTful APIs. You will collaborate with frontend developers and DevOps teams to deliver high-quality solutions. Experience with database design, API development, and cloud services is highly valued.',
      skills: ['Node.js', 'Python', 'SQL', 'API Development'],
    },
    {
      id: 3,
      name: 'CloudVault Inc',
      role: 'Full Stack Developer',
      match: 85,
      contract: 'Full-time',
      location: 'Austin',
      wageType: 'Annual',
      wage: '95k-115k',
      image:
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069',
      jobDesc:
        'We are looking for a skilled Full Stack Developer to work on end-to-end feature development. You will build both frontend interfaces using React and backend services with Node.js. This role requires expertise in MongoDB for database management and REST API design. You will be involved in the entire software development lifecycle, from concept to deployment. The ideal candidate can seamlessly switch between frontend and backend tasks, write clean and maintainable code, and work collaboratively in an agile environment. You will help architect solutions and mentor junior developers.',
      skills: ['React', 'Node.js', 'MongoDB', 'REST APIs'],
    },
    {
      id: 4,
      name: 'CodeForge',
      role: 'React Developer',
      match: 92,
      contract: '1 year contract',
      location: 'Seattle',
      wageType: 'Annual',
      wage: '85k-105k',
      image:
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069',
      jobDesc:
        'We are seeking an experienced React Developer to join our frontend team. You will develop complex, interactive web applications using React, TypeScript, and Redux for state management. Your responsibilities include building reusable components, implementing responsive designs, and writing comprehensive tests with Jest. You will work on optimizing application performance, implementing best practices, and ensuring code quality through code reviews. The ideal candidate has strong React expertise, TypeScript proficiency, and experience with modern frontend tooling and testing frameworks.',
      skills: ['React', 'TypeScript', 'Redux', 'Jest'],
    },
    {
      id: 5,
      name: 'Digital Dynamics',
      role: 'Node.js Developer',
      match: 87,
      contract: 'Full-time',
      location: 'Boston',
      wageType: 'Annual',
      wage: '90k-110k',
      image:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070',
      jobDesc:
        'Join our backend development team to build scalable and high-performance server applications using Node.js and Express. You will develop RESTful APIs, work with MongoDB for data persistence, and implement efficient database queries. The role involves designing system architecture, optimizing application performance, and ensuring code reliability through testing. You will collaborate with frontend teams to define API contracts and work on microservices architecture. Strong experience with Node.js ecosystem, Express framework, and NoSQL databases is required.',
      skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs'],
    },
    {
      id: 6,
      name: 'InnovateLabs',
      role: 'Vue.js Developer',
      match: 83,
      contract: '6 months contract',
      location: 'Los Angeles',
      wageType: 'Annual',
      wage: '75k-95k',
      image:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070',
      jobDesc:
        'We are looking for a Vue.js Developer to create elegant and efficient user interfaces. You will work with Vue.js framework, Vuex for state management, and modern JavaScript to build interactive web applications. Your responsibilities include developing responsive components, implementing Vue.js best practices, and writing clean, maintainable code. You will collaborate with designers and backend developers to deliver seamless user experiences. The ideal candidate has strong Vue.js experience, proficiency in JavaScript, and expertise in CSS for styling responsive layouts.',
      skills: ['Vue.js', 'JavaScript', 'Vuex', 'CSS'],
    },
    {
      id: 7,
      name: 'SwiftTech',
      role: 'Python Developer',
      match: 91,
      contract: 'Full-time',
      location: 'Chicago',
      wageType: 'Annual',
      wage: '95k-115k',
      image:
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069',
      jobDesc:
        'Join our Python development team to build robust backend systems using Django framework. You will develop web applications, create REST APIs, and work with PostgreSQL for database management. The role involves deploying applications on AWS cloud infrastructure, optimizing database performance, and implementing security best practices. You will work on scalable solutions, integrate third-party services, and collaborate with cross-functional teams. Strong Python skills, Django framework expertise, and experience with cloud platforms are essential for this role.',
      skills: ['Python', 'Django', 'PostgreSQL', 'AWS'],
    },
    {
      id: 8,
      name: 'WebWorks',
      role: 'Angular Developer',
      match: 79,
      contract: '3 months contract',
      location: 'Denver',
      wageType: 'Annual',
      wage: '70k-90k',
      image:
        'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2342',
      jobDesc:
        'We are seeking an Angular Developer to build enterprise-level web applications. You will work with Angular framework, TypeScript, and RxJS for reactive programming to create scalable frontend solutions. Your responsibilities include developing complex single-page applications, implementing Angular best practices, and writing type-safe code with TypeScript. You will work with HTML/CSS to create polished user interfaces and integrate with backend APIs. The ideal candidate has strong Angular experience, TypeScript proficiency, and expertise in RxJS for managing asynchronous data streams.',
      skills: ['Angular', 'TypeScript', 'RxJS', 'HTML/CSS'],
    },
  ];

  const company = companies.find((office) => office.id === Number(id));

  if (!company) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#1C1C1C]">
            Company not found
          </p>
          <p className="text-[16px] text-[#1C1C1CBF] mt-2">
            The company you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full lg:h-screen w-full font-inter">
      <div className="border flex flex-col gap-[20px] border-fade py-[45px] w-full h-full max-w-[1058px] lg:h-auto px-[15px] lg:px-[150px] rounded-[20px] ">
        <div className="w-full h-[232px] relative">
          <img
            src={company.image}
            className="object-cover w-full h-full rounded-[10px]"
            alt={company.name}
          />
          <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-xs text-[18px] border border-white/30 p-[12px] rounded-full shadow-lg">
            <PiBuildingApartmentLight className="text-[#F8F8F8]" />
          </div>
        </div>
        <div className="flex justify-between w-full">
          <div className="flex flex-col gap-[5px]">
            <p className="font-semibold text-[24px] max-w-[114px] text-[#1C1C1C]">
              {company.name}
            </p>
            <p className="font-sf font-normal text-[16px] max-w-[114px]  text-[#1C1C1CBF]">
              {company.role}
            </p>
          </div>
          <div className="flex items-center  h-[49px]  bg-fade text-[#1C1C1CBF] text-[16px]  py-[15px] px-6 rounded-[70px]">
            {company.match}% match
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <p className="font-semibold text-[20px] text-[#1C1C1C]">
            Job Description
          </p>
          <p className="text-[16px] font-normal text-[#1C1C1CBF] leading-relaxed">
            {company.jobDesc}
          </p>
        </div>

        <div className="flex flex-col gap-[27px]">
          <div className="flex items-center gap-[6px]">
            {company.skills.map((skill) => (
              <button className="border border-button text-button rounded-[50px] py-[5px] px-2.5 text-[14px]">
                {skill}
              </button>
            ))}
          </div>

          <div className="flex w-full items-center  justify-between ">
            <p className="text-center w-full font-semibold text-[16px]">
              {company.contract}
            </p>
            <div className='h-[20px] bg-black w-0.5'/>
            <p className="text-center w-full font-semibold ">
              {company.location}
            </p>
            <div className='h-[20px] bg-black w-0.5'/>
            <p className="text-center w-full font-semibold ">
              {company.wage} {company.wageType}
            </p>
          </div>

         {
            mode === "application" ? (
                <div className='flex flex-col md:flex-row w-full gap-[15px] items-center justify-center'>
                <button className='w-full flex items-center justify-center gap-[12px] border border-button py-[15px] rounded-[10px] text-button cursor-pointer '>
                   <HiOutlineChatBubbleLeftRight className='text-[24px]'/>
                   <p className='text-[16px] font-medium'>Chat</p>
                </button>
                <button className='w-full  flex items-center justify-center gap-[12px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer'>
                    <BsSend className='text-[24px]'/>
                    <p className='text-[16px] font-medium' >View CV</p>
                </button>
              </div>
            ):(
                <div className='flex flex-col md:flex-row w-full gap-[15px] items-center justify-center'>
                     <button className='w-full  flex items-center justify-center gap-[12px] bg-button py-[15px] rounded-[10px] text-[#F8F8F8] cursor-pointer'>
                    <CiMail className='text-[24px]'/>
                    <p className='text-[16px] font-medium' >Get in Touch</p>
                </button>
                </div>
            )
         }
        </div>
      </div>
    </div>
  );
};

export default CompanyPreview;
