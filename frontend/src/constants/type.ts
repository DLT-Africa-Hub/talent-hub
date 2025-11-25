import { UploadedFile } from "../components/ui/ResumeInput";





export interface GraduateForm {
    firstName: string;
    lastName: string;
    skills: string[];
    roles: string[];
    interests: string[];
    socials?: {
      github?: string;
      twitter?: string;
      linkedin?: string;
    };
    phoneNo?: string;
    portfolio?: string;
    yearsOfExperience?: string;
    rank?: string;
    cv: UploadedFile[]; 
    summary?:string;
    createdAt: Date;
    updatedAt: Date;
  }
