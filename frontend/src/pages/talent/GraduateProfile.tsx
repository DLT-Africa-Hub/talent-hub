import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graduateApi } from '../../api/graduate';
import { LoadingSpinner } from '../../index';
import { DEFAULT_PROFILE_IMAGE } from '../../utils/job.utils';

const GraduateProfile = () => {
  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['graduateProfile', 'profilePage'],
    queryFn: async () => {
      const response = await graduateApi.getProfile();
      return response.graduate || response;
    },
  });

  const graduate = useMemo(() => profileData || null, [profileData]);

  const fullName = graduate
    ? `${graduate.firstName || ''} ${graduate.lastName || ''}`.trim()
    : '';
  const headline =
    graduate?.position ||
    graduate?.roles?.join(', ') ||
    'Full-Stack Developer, Product Designer';
  const summary =
    graduate?.summary ||
    graduate?.bio ||
    'Your profile summary goes here. Highlight your achievements, experience, and what makes you unique as a professional.';

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

  if (!graduate) {
    return (
      <div className="p-[24px]">
        <p className="text-sm text-[#1C1C1C80]">No profile data available.</p>
      </div>
    );
  }

  return (
    <div className="p-[20px] lg:p-[32px] flex flex-col gap-[32px]">
      <div className="flex flex-wrap items-start justify-between gap-[16px]">
        <div>
          <p className="text-[22px] font-semibold text-[#1C1C1C]">Profile</p>
          <p className="text-[14px] text-[#1C1C1C80]">
            Review your personal details and professional summary
          </p>
        </div>
        <button
          type="button"
          disabled
          className="px-[20px] py-[12px] rounded-[12px] border border-[#1C1C1C1A] text-[#1C1C1C80] bg-[#F5F5F5] cursor-not-allowed flex items-center gap-[8px]"
        >
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-[32px]">
        <div className="rounded-[24px] border border-fade bg-white p-[24px] flex flex-col gap-[24px]">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-[12px] ">
            <div className="flex md:flex-row gap-[12px]">
              <div className="w-[150px] h-[150px] rounded-[10px] overflow-hidden bg-[#F4F4F4]">
                <img
                  src={graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE}
                  alt={fullName || 'Profile'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <p className="text-[20px] font-semibold text-[#1C1C1C]">
                  {fullName || 'Profile Name'}
                </p>
                <p className="text-[14px] text-[#1C1C1C80] capitalize">
                  {headline}
                </p>
              </div>
            </div>

            <div className="w-full">
              <p className="text-[16px] font-semibold text-[#1C1C1C]">
                Summary
              </p>
              <p className="text-[14px] text-[#1C1C1C80] leading-relaxed mt-[8px]">
                {summary}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-fade bg-white p-[24px] space-y-[16px]">
          <SectionHeading title="Details" />
          <DetailList
            items={[
              {
                label: 'Availability',
                value: graduate.availability || 'Not specified',
              },
              {
                label: 'Years of experience',
                value:
                  typeof graduate.expYears === 'number'
                    ? `${graduate.expYears} ${
                        graduate.expYears === 1 ? 'year' : 'years'
                      }`
                    : 'Not specified',
              },
              {
                label: 'Location',
                value: graduate.location || 'Not specified',
              },
              
              {
                label: 'Skills',
                value:
                  graduate.skills?.length > 0
                    ? graduate.skills.join(', ')
                    : 'Add your key skills',
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

interface DetailItem {
  label: string;
  value?: string | number | null;
}

const DetailList = ({ items }: { items: DetailItem[] }) => (
  <div className="space-y-[12px]">
    {items.map((item) => (
      <div
        key={item.label}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-[16px] rounded-[14px] border border-[#F0F0F0]"
      >
        <p className="text-[14px] text-[#1C1C1C80]">{item.label}</p>
        <p className="text-[15px] font-medium text-[#1C1C1C] mt-[6px] sm:mt-0 sm:text-right">
          {item.value || 'Not specified'}
        </p>
      </div>
    ))}
  </div>
);

const SectionHeading = ({ title }: { title: string }) => (
  <p className="text-[16px] font-semibold text-[#1C1C1C]">{title}</p>
);

const formatLabel = (value?: string) => {
  if (!value) return 'Not specified';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default GraduateProfile;
