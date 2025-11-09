import { useState, useEffect, useMemo } from 'react';
import api from '../api/auth';
import CompanyCard, { Company } from '../components/explore/CompanyCard';

const GraduateDashboard = () => {
  const companies: Company[] = [
    {
      name: "TechCorp",
      role: "Frontend Developer",
      match: 90,
      contract: "3 months contract",
      location: "San Francisco",
      wageType: "Annual",
      wage: "80k-100k",
      image: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2342"
    },
    {
      name: "DataFlow Solutions",
      role: "Backend Developer",
      match: 85,
      contract: "6 months contract",
      location: "New York",
      wageType: "Annual",
      wage: "100k-120k",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069"
    },
    {
      name: "CloudVault Inc",
      role: "Full Stack Developer",
      match: 85,
      contract: "Full-time",
      location: "Austin",
      wageType: "Annual",
      wage: "95k-115k",
      image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069"
    },
    {
      name: "CodeForge",
      role: "React Developer",
      match: 92,
      contract: "1 year contract",
      location: "Seattle",
      wageType: "Annual",
      wage: "85k-105k",
      image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069"
    },
    {
      name: "Digital Dynamics",
      role: "Node.js Developer",
      match: 87,
      contract: "Full-time",
      location: "Boston",
      wageType: "Annual",
      wage: "90k-110k",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070"
    },
    {
      name: "InnovateLabs",
      role: "Vue.js Developer",
      match: 83,
      contract: "6 months contract",
      location: "Los Angeles",
      wageType: "Annual",
      wage: "75k-95k",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070"
    },
    {
      name: "SwiftTech",
      role: "Python Developer",
      match: 91,
      contract: "Full-time",
      location: "Chicago",
      wageType: "Annual",
      wage: "95k-115k",
      image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2069"
    },
    {
      name: "WebWorks",
      role: "Angular Developer",
      match: 79,
      contract: "3 months contract",
      location: "Denver",
      wageType: "Annual",
      wage: "70k-90k",
      image: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2342"
    },
  ]

  // helper: return n random items from an array (non-mutating)
  const getRandom = (arr: Company[], n: number) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  };

  // compute 4 random companies for each section once per mount
  const availableCompanies = useMemo(() => getRandom(companies, 4), []);
  const contractCompanies = useMemo(() => getRandom(companies, 4), []);

  const handleButtonClick = (companyName: string, buttonText: string) => {
    console.log(`${buttonText} clicked for ${companyName}`);
  };

  return (
    <div className='py-[35px] px-[20px] pb-[120px] lg:px-[150px] flex flex-col gap-[43px] items-start justify-center bg-[#F9F9F9]'>

      
    <div className='flex flex-col gap-[20px] w-full md:gap-[30px]'>
      <p className='font-medium text-[22px] text-[#1C1C1C]'>
          Available Opportunites
        </p>
     
      <div className='grid grid-cols-1    md:grid-cols-2 lg:grid-cols-4 gap-8  w-full'>
        {availableCompanies.map((company, index) => (
          <CompanyCard
            key={index}
            company={company}
            buttonText="Preview"
            onButtonClick={() => handleButtonClick(company.name, index === 0 ? "Preview" : "Get in Touch")}
          />
        ))}
      </div>
    </div>
    <div className='flex flex-col gap-[20px] w-full md:gap-[30px]'>
      <p className='font-medium text-[22px] text-[#1C1C1C]'>
          Contract offers
        </p>
     
      <div className='grid grid-cols-1    md:grid-cols-2 lg:grid-cols-4 gap-8  w-full'>
        {contractCompanies.map((company, index) => (
          <CompanyCard
            key={index}
            company={company}
            buttonText="Get in Touch"
            onButtonClick={() => handleButtonClick(company.name, index === 0 ? "Preview" : "Get in Touch")}
          />
        ))}
      </div>
    </div>
  </div>
  );
};

export default GraduateDashboard;
