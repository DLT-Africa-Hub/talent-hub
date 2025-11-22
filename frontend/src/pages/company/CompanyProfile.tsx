import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';
import ChangePassword from '../../components/ChangePassword';
import CompanyProfileEditModal from '../../components/profile/CompanyProfileEditModal';

const CompanyProfile = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['companyProfile', 'profilePage'],
    queryFn: async () => {
      const response = await companyApi.getProfile();
      return response;
    },
  });

  const company = useMemo(() => profileData || null, [profileData]);

  if (isLoading) {
    return <LoadingSpinner message="Loading profile..." fullPage />;
  }

  if (error) {
    return (
      <div className="p-[24px]">
        <p className="text-red-600 text-sm">
          Failed to load profile. Please try again later.
        </p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-[24px]">
        <p className="text-sm text-[#1C1C1C80]">No profile data available.</p>
      </div>
    );
  }

  return (
    <div className="p-[24px] flex flex-col gap-[24px]">
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div>
          <p className="text-[22px] font-semibold text-[#1C1C1C]">
            Company Profile
          </p>
          <p className="text-[14px] text-[#1C1C1C80]">
            Manage your organization&apos;s details and preferences
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="px-[20px] py-[12px] rounded-[12px] border border-button bg-button text-white hover:bg-[#176300] transition-colors flex items-center gap-[8px]"
        >
          Edit Profile
        </button>
      </div>

      <div className="grid gap-[24px] max-w-[600px]">
        <div className="grid gap-[16px]">
        <ProfileField label="Company Name" value={company.companyName} />
        <ProfileField label="Industry" value={company.industry} />
        <ProfileField label="Location" value={company.location} />
        <ProfileField label="Company Size" value={company.companySize} />
        <ProfileField label="Website" value={company.website} />
        <ProfileField label="About" value={company.description} />
        </div>
        <ChangePassword />
      </div>

      <CompanyProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={company}
      />
    </div>
  );
};

interface ProfileFieldProps {
  label: string;
  value?: string | number | null;
}

const ProfileField = ({ label, value }: ProfileFieldProps) => (
  <div className="flex flex-col border border-fade rounded-[12px] p-[16px] bg-white">
    <p className="text-[12px] text-[#1C1C1C80] uppercase tracking-wide">{label}</p>
    <p className="text-[16px] text-[#1C1C1C] font-medium mt-[4px]">
      {value || '—'}
    </p>
  </div>
);

export default CompanyProfile;

