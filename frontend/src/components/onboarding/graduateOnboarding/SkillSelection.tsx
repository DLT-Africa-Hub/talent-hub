import React, { useState } from 'react'
import { GraduateForm } from '../../../constants/type';
import { skills } from '../../../utils/material.utils';



interface Props {
    form: GraduateForm;
    onChange: (patch: Partial<GraduateForm>) => void;
    onBack: () => void; 
  }

const SkillSelection: React.FC<Props> = ({ onChange, form}) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(form.skills || []);
  const filled = true
  

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
  
    if (name === "github" || name === "linkedin" || name === "twitter") {
     
      onChange({
        socials: {
          ...form.socials,
          [name]: value,
        },
      });
    } else {
      
      onChange({ [name]: value });
    }
  };
  

  const handleSelectSkill = (skill: string) => {
    let updatedSkills: string[];

    if (selectedSkills.includes(skill)) {
      updatedSkills = selectedSkills.filter((r) => r !== skill);
    } else {
      updatedSkills = [...selectedSkills, skill];
    }

    setSelectedSkills(updatedSkills);
    onChange({ skills: updatedSkills });
  };

 
  

  return (
    <div className=" relative flex items-center justify-center w-full flex-col gap-[30px] font-inter">

     
      {/* Header */}
      <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
        <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
        Your Skills and Links
        </h2>
        <p className="font-normal text-[18px] text-[#1C1C1CBF]">
          Tell us more about you
        </p>
      </div>

      {/* Skill List */}
  <div className='flex flex-col gap-2.5'>
    <p className='text-[#1C1C1C] text-[18px] font-normal'>Skills</p>
  <div className="flex gap-2.5 justify-start items-center w-full max-w-[542px] flex-wrap">
        {skills.map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => handleSelectSkill(skill)}
              className={`flex items-center border-[1px] py-5 px-3.5 gap-2.5 rounded-xl max-w-[542px] justify-start transition-all duration-200 ${
                isSelected
                  ? "border-button bg-white"
                  : "border-fade "
              }`}
            >
              <p className="text-[#1C1C1C33] text-[18px] font-normal">{skill}</p>
            </button>
          );
        })}
      </div>
  </div>

      {/* Links*/}

      <div
        className="flex flex-col gap-2.5 items-center justify-center w-full"
      >
       
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal" >
          Portfolio URL
          </label>
          <input
            type="text"
            placeholder="https://yourportfolio.com"
            name="portfolio"
            value={form.portfolio}
            onChange={handleInputChange}
            className="h-[62px] border border-fade rounded-xl w-full px-5 bg-[#FFFFFF] placeholder:text-[#1C1C1C33]"
          />
        </div>

        
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal">
          GitHub
          </label>
          <input
            type="text"
            placeholder="https://github.com/you"
            name="socials.github"
            value={form.socials?.github}
            onChange={handleInputChange}
            className="h-[62px] border border-fade rounded-xl w-full px-5 bg-[#FFFFFF] placeholder:text-[#1C1C1C33]"
          />
        </div>
        <div className="w-full flex flex-col gap-[10px] max-w-[542px]">
          <label className="text-[#1C1C1CBF] text-[18px] font-normal">
          LinkedIn
          </label>
          <input
            type="text"
            placeholder="https://linkedin.com/you"
            name="socials.linkedin"
            value={form.socials?.linkedin}
            onChange={handleInputChange}
            className="h-[62px] border border-fade rounded-xl w-full px-5 bg-[#FFFFFF] placeholder:text-[#1C1C1C33]"
          />
        </div>

     
      </div>
    
  
        <button
         
          disabled={!filled}
          className={`cursor-pointer rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200  w-full max-w-[400px] ${
            !filled
              ? "bg-[#1c770092] text-[#F8F8F8] cursor-not-allowed"
              : "bg-button text-[#F8F8F8]"
          }`}
        >
          Continue
        </button>
 
    </div>
  )
}

export default SkillSelection