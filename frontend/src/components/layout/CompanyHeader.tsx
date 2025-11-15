import { useEffect, useState } from 'react';
import { RiHomeSmile2Line } from 'react-icons/ri';
import { companyApi } from '../../api/company';

const CompanyHeader = () => {
  const [companyName, setCompanyName] = useState('Company');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await companyApi.getProfile();
        if (profile?.companyName) {
          setCompanyName(profile.companyName);
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-[32px] sticky z-10 top-0 w-full h-[100px] font-inter">
      <div className="p-[32px] flex items-center justify-center gap-[6px] text-[20px] font-semibold text-[#1C1C1C] border border-fade rounded-br-[16px] bg-[#F8F8F8]">
        <RiHomeSmile2Line className="text-button text-[22px]" />
        <p>Talent Match</p>
      </div>
      <div className="flex items-center justify-between px-[24px] py-[32px] bg-[#F8F8F8] h-full grow border border-fade rounded-bl-[16px]">
        {!loading && (
          <p className="font-semibold text-[18px] text-[#1c1c1c]">
            Hi, {companyName}
          </p>
        )}
      </div>
    </div>
  );
};

export default CompanyHeader;
