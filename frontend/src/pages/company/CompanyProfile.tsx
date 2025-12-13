import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  HiBuildingOffice2,
  HiGlobeAlt,
  HiMapPin,
  HiUsers,
  HiBriefcase,
  HiPencilSquare,
  HiLink,
} from 'react-icons/hi2';
import { companyApi } from '../../api/company';
import { LoadingSpinner } from '../../index';
import ChangePassword from '../../components/ChangePassword';
import ProfileEditModal from '../../components/profile/ProfileEditModal';
import CalendlyIntegration from '../../components/company/CalendlyIntegration';
import { DEFAULT_COMPANY_IMAGE } from '../../utils/job.utils';
import { useToastContext } from '../../context/ToastContext';

const CompanyProfile = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToastContext();

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

  // Handle Calendly OAuth callback redirect
  useEffect(() => {
    const calendlyStatus = searchParams.get('calendly');

    if (calendlyStatus === 'connected') {
      success('Calendly account connected successfully!');
      // Invalidate Calendly status query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['calendlyStatus'] });
      // Clean up URL
      searchParams.delete('calendly');
      setSearchParams(searchParams, { replace: true });
    } else if (calendlyStatus === 'error') {
      const errorMessage =
        searchParams.get('message') || 'Failed to connect Calendly account';
      showError(decodeURIComponent(errorMessage));
      // Clean up URL
      searchParams.delete('calendly');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, success, showError, queryClient]);

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
    <div className="py-[24px] px-[24px] flex flex-col gap-[32px]">
      {/* Header Section */}
      <div className="flex flex-col gap-[24px]">
        <div className="flex flex-wrap items-start justify-between gap-[16px]">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1C1C1C] mb-[8px]">
              Company Profile
            </h1>
            <p className="text-[14px] text-[#1C1C1C80]">
              Manage your organization&apos;s details and preferences
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-[20px] py-[12px] rounded-[12px] border border-button bg-button text-white hover:bg-[#176300] transition-colors flex items-center gap-[8px] font-medium"
          >
            <HiPencilSquare className="text-[18px]" />
            Edit Profile
          </button>
        </div>

        <div className="rounded-[20px] border border-fade bg-white p-[32px] shadow-sm">
          <div className="flex flex-col md:flex-row gap-[24px] items-start md:items-center">
            <div className="w-[120px] h-[120px] rounded-[16px] overflow-hidden bg-[#F8F8F8] border-2 border-fade shrink-0">
              <img
                src={company.logoUrl || DEFAULT_COMPANY_IMAGE}
                alt={company.companyName || 'Company Logo'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COMPANY_IMAGE;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[24px] font-semibold text-[#1C1C1C] mb-[8px]">
                {company.companyName || 'Company Name'}
              </h2>
              {company.industry && (
                <div className="flex items-center gap-[8px] text-[14px] text-[#1C1C1C80] mb-[12px]">
                  <HiBriefcase className="text-[16px]" />
                  <span className="capitalize">{company.industry}</span>
                </div>
              )}
              {company.location && (
                <div className="flex items-center gap-[8px] text-[14px] text-[#1C1C1C80]">
                  <HiMapPin className="text-[16px]" />
                  <span>{company.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-[32px]">
        <div className="flex flex-col gap-[24px]">
          <div className="rounded-[20px] border border-fade bg-white p-[24px] shadow-sm">
            <h3 className="text-[18px] font-semibold text-[#1C1C1C] mb-[20px] flex items-center gap-[8px]">
              <HiBuildingOffice2 className="text-[20px] text-button" />
              Company Information
            </h3>
            <div className="grid gap-[20px]">
              <ProfileField
                icon={<HiMapPin />}
                label="Location"
                value={company.location}
              />
              <div className="grid grid-cols-2 gap-[20px]">
                <ProfileField
                  icon={<HiUsers />}
                  label="Company Size"
                  value={company.companySize}
                />
                <ProfileField
                  icon={<HiGlobeAlt />}
                  label="Website"
                  value={company.website}
                  isLink={!!company.website}
                />
              </div>
            </div>
          </div>

          {company.description && (
            <div className="rounded-[20px] border border-fade bg-white p-[24px] shadow-sm">
              <h3 className="text-[18px] font-semibold text-[#1C1C1C] mb-[16px]">
                About
              </h3>
              <p className="text-[15px] text-[#1C1C1C] leading-relaxed whitespace-pre-wrap">
                {company.description}
              </p>
            </div>
          )}

          <CalendlyIntegration />
        </div>

        <ChangePassword />
      </div>

      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profileType="company"
        profile={company}
      />
    </div>
  );
};

interface ProfileFieldProps {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
  isLink?: boolean;
}

const ProfileField = ({ label, value, icon, isLink }: ProfileFieldProps) => {
  const displayValue = value || 'Not specified';
  const isUrl = isLink && typeof value === 'string' && value.startsWith('http');

  return (
    <div className="flex items-start gap-[12px] p-[16px] rounded-[12px] bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors">
      {icon && <div className="text-button mt-[2px] shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#1C1C1C80] uppercase tracking-wide mb-[6px] font-medium">
          {label}
        </p>
        {isUrl ? (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] text-button hover:text-[#176300] font-medium flex items-center gap-[6px] transition-colors break-all"
          >
            <HiLink className="text-[16px] shrink-0" />
            <span className="truncate">{value}</span>
          </a>
        ) : (
          <p className="text-[15px] text-[#1C1C1C] font-medium">
            {displayValue}
          </p>
        )}
      </div>
    </div>
  );
};

export default CompanyProfile;
