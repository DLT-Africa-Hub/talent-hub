import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaGithub, FaLinkedin, FaLink } from 'react-icons/fa';
import { graduateApi } from '../../api/graduate';
import { PageLoader, ErrorState } from '../../components/ui';
import { DEFAULT_PROFILE_IMAGE } from '../../utils/job.utils';
import ChangePassword from '../../components/ChangePassword';
import GraduateProfileEditModal from '../../components/profile/GraduateProfileEditModal';
import ProfilePictureEditor from '../../components/profile/ProfilePictureEditor';
import { useQueryClient } from '@tanstack/react-query';
import WorkingExperience from '../../components/profile/WorkingExperience';
import ResumeModal from '../../components/profile/ResumeModal';

const GraduateProfile = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

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

  // Extract username from GitHub URL
  const getGitHubUsername = (url?: string): string | null => {
    if (!url) return null;
    try {
      const match = url.match(/github\.com\/([^\/\?]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  // Extract username from LinkedIn URL
  const getLinkedInUsername = (url?: string): string | null => {
    if (!url) return null;
    try {
      const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const githubUrl = graduate?.socials?.github;
  const linkedinUrl = graduate?.socials?.linkedin;
  const portfolioUrl = graduate?.portfolio;
  const githubUsername = getGitHubUsername(githubUrl);
  const linkedinUsername = getLinkedInUsername(linkedinUrl);

  if (isLoading) {
    return <PageLoader message="Loading profile..." />;
  }

  if (error) {
    return (
      <div className="p-[24px]">
        <ErrorState
          message="Failed to load profile. Please try again later."
          variant="fullPage"
        />
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

  const handleProfilePictureUpload = async (file: Blob) => {
    try {
      setIsUploading(true);

      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error(
          'Missing Cloudinary configuration. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.'
        );
      }

      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

      const fileToUpload =
        file instanceof File ? file : new File([file], 'profile.jpg', { type: (file as Blob).type || 'image/jpeg' });

      const form = new FormData();
      form.append('file', fileToUpload);
      form.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(url, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Cloudinary upload failed: ${res.status} ${errText}`);
      }

      const data = await res.json();
      const secureUrl: string | undefined = data.secure_url || data.secureUrl || data.url;

      if (!secureUrl) {
        throw new Error('Cloudinary response did not include secure_url');
      }

      await graduateApi.updateProfilePicture(secureUrl);
      queryClient.invalidateQueries({ queryKey: ['graduateProfile', 'profilePage'] });

      console.log('Profile picture updated:', secureUrl);
    } catch (err: any) {
      console.error('Failed to upload profile picture', err);
      alert(err?.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

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
          onClick={() => setIsEditModalOpen(true)}
          className="px-[20px] py-[12px] rounded-[12px] border border-button bg-button text-white hover:bg-[#176300] transition-colors flex items-center gap-[8px]"
        >
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-[32px]">
        <div className='flex flex-col gap-[32px]'>
          <div className="rounded-[24px] border border-fade bg-white p-[24px] flex flex-col gap-[24px]">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-[12px] ">
              <div className='w-full flex flex-col-reverse gap-[20px] lg:flex-row items-start justify-between'>
                <div className="flex md:flex-row gap-[12px]">
                  <div className="w-[150px] h-[150px] rounded-[10px] overflow-hidden bg-[#F4F4F4]">
                    <ProfilePictureEditor
                      imageUrl={graduate.profilePictureUrl || DEFAULT_PROFILE_IMAGE}
                      size={150}
                      onUpload={handleProfilePictureUpload}
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

                <button 
                  onClick={() => setIsResumeModalOpen(true)}
                  className='px-[20px] py-[12px] rounded-[12px] border border-button bg-button text-white hover:bg-[#176300] transition-colors flex items-center gap-[8px]'
                >
                  Resume
                </button>
              </div>

              <div className="w-full">
                <p className="text-[16px] font-semibold text-[#1C1C1C]">
                  Summary
                </p>
                <p className="text-[14px] text-[#1C1C1C80] leading-relaxed mt-[8px]">
                  {summary}
                </p>
              </div>

              {/* Social Links Section */}
              <div className="w-full mt-[24px] pt-[24px] border-t border-fade">
                <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[16px]">
                  Links
                </p>
                <div className="flex flex-wrap gap-[12px]">
                  {githubUrl ? (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-[8px] px-[16px] py-[10px] rounded-[10px] border border-fade bg-white hover:bg-[#F8F8F8] hover:border-button transition-colors"
                    >
                      <FaGithub className="text-[18px] text-[#1C1C1C]" />
                      <span className="text-[14px] font-medium text-[#1C1C1C]">
                        {githubUsername || 'GitHub'}
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center gap-[8px] px-[16px] py-[10px] rounded-[10px] border border-fade bg-white hover:bg-[#F8F8F8] hover:border-button transition-colors"
                    >
                      <FaGithub className="text-[18px] text-[#1C1C1C80]" />
                      <span className="text-[14px] font-medium text-[#1C1C1C80]">
                        Connect
                      </span>
                    </button>
                  )}

                  {linkedinUrl ? (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-[8px] px-[16px] py-[10px] rounded-[10px] border border-fade bg-white hover:bg-[#F8F8F8] hover:border-button transition-colors"
                    >
                      <FaLinkedin className="text-[18px] text-[#0077B5]" />
                      <span className="text-[14px] font-medium text-[#1C1C1C]">
                        {linkedinUsername || 'LinkedIn'}
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center gap-[8px] px-[16px] py-[10px] rounded-[10px] border border-fade bg-white hover:bg-[#F8F8F8] hover:border-button transition-colors"
                    >
                      <FaLinkedin className="text-[18px] text-[#1C1C1C80]" />
                      <span className="text-[14px] font-medium text-[#1C1C1C80]">
                        Connect
                      </span>
                    </button>
                  )}

                  {portfolioUrl ? (
                    <a
                      href={portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-[8px] px-[16px] py-[10px] rounded-[10px] border border-fade bg-white hover:bg-[#F8F8F8] hover:border-button transition-colors"
                    >
                      <FaLink className="text-[18px] text-[#1C1C1C]" />
                      <span className="text-[14px] font-medium text-[#1C1C1C]">
                        Personal Portfolio
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="flex items-center gap-[8px] px-[16px] py-[10px] rounded-[10px] border border-fade bg-white hover:bg-[#F8F8F8] hover:border-button transition-colors"
                    >
                      <FaLink className="text-[18px] text-[#1C1C1C80]" />
                      <span className="text-[14px] font-medium text-[#1C1C1C80]">
                        Connect
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <WorkingExperience workExperiences={graduate.workExperiences}/>
        </div>

        <div className="flex flex-col gap-[32px]">
          <div className="rounded-[24px] border border-fade bg-white p-[24px] space-y-[16px]">
            <SectionHeading title="Details" />
            <DetailList
              items={[
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
          <ChangePassword />
        </div>
      </div>

      <GraduateProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        graduate={graduate}
      />

      <ResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />
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

export default GraduateProfile;