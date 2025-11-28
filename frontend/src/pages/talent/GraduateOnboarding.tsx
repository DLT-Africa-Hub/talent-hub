import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdArrowBack } from 'react-icons/io';
import { GraduateForm } from '../../constants/type';
import Personalnfo from '../../components/onboarding/graduateOnboarding/Personalnfo';
import RoleSelection from '../../components/onboarding/graduateOnboarding/RoleSelection';
import SkillSelection from '../../components/onboarding/graduateOnboarding/SkillSelection';
import { UploadedFile } from '../../components/ui/ResumeInput';
import Experience from '../../components/onboarding/graduateOnboarding/Experience';
import { useAuth } from '../../context/AuthContext';
import { graduateApi } from '../../api/graduate';
import { PageLoader } from '../../components/ui';

const GraduateOnboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<GraduateForm>({
    firstName: '',
    lastName: '',
    skills: [],
    roles: [],
    interests: [],
    socials: {},
    portfolio: '',
    rank: '',
    phoneNo: '',
    cv: [] as UploadedFile[],
    summary: '',
    yearsOfExperience: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [canRenderForm, setCanRenderForm] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  const storedUser =
    typeof window !== 'undefined' ? sessionStorage.getItem('user') : null;
  let parsedStoredUser: typeof user | null = null;
  if (storedUser) {
    try {
      parsedStoredUser = JSON.parse(storedUser);
    } catch (parseError) {
      console.error('Failed to parse stored user payload:', parseError);
    }
  }
  const currentUser = user || parsedStoredUser;
  const currentUserRole = currentUser?.role;
  const isAuth = isAuthenticated || Boolean(token && storedUser);

  useEffect(() => {
    let isMounted = true;

    const verifyOnboardingAccess = async () => {
      if (!isAuth) {
        navigate('/login', { replace: true });
        return;
      }

      if (currentUserRole !== 'graduate') {
        navigate('/', { replace: true });
        return;
      }

      try {
        const response = await graduateApi.getProfile();
        if (!isMounted) {
          return;
        }
        const graduate = response?.graduate;
        if (graduate) {
          const hasCompletedAssessment =
            graduate.assessmentData?.submittedAt != null;
          navigate(
            hasCompletedAssessment ? '/graduate' : '/assessment',
            { replace: true }
          );
          return;
        }

        setCanRenderForm(true);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setCanRenderForm(true);
        } else if (err?.response?.status === 401) {
          navigate('/login', { replace: true });
          return;
        } else {
          console.error('Graduate onboarding access check failed:', err);
          setAccessError(
            'We could not verify your onboarding status. Please try again.'
          );
        }
      } finally {
        if (isMounted) {
          setCheckingAccess(false);
        }
      }
    };

    setAccessError(null);
    setCanRenderForm(false);
    setCheckingAccess(true);
    verifyOnboardingAccess();

    return () => {
      isMounted = false;
    };
  }, [isAuth, currentUserRole, navigate, retryCount]);

  const handleChange = (patch: Partial<GraduateForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => Math.max(0, prev - 1));

  if (checkingAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-onBoard bg-center bg-white font-inter relative">
        <div className="absolute inset-0 bg-white/25"></div>
        <div className="relative z-10 w-full max-w-[542px]">
          <PageLoader message="Preparing onboarding..." />
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-onBoard bg-center bg-white font-inter relative px-4">
        <div className="absolute inset-0 bg-white/25"></div>
        <div className="relative z-10 w-full max-w-[542px] rounded-[20px] border border-[#1B77001A] bg-white p-6 text-center shadow-[0_20px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-[24px] font-semibold text-[#1C1C1C] mb-2">
            Unable to load onboarding
          </h2>
          <p className="text-[16px] text-[#1C1C1CBF] mb-6">{accessError}</p>
          <button
            onClick={() => setRetryCount((prev) => prev + 1)}
            className="w-full rounded-[12px] bg-button py-3 text-[16px] font-semibold text-white transition hover:bg-[#1B7700]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!canRenderForm) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center  lg:h-screen bg-onBoard  bg-center  bg-white md:py-[80px] md:px-[150px] font-inter">
      <div className="absolute inset-0 bg-white/25"></div>
      <div className="flex flex-col md:items-center pt-[75px] z-10 px-5 md:justify-center w-full rounded-[50px] md:py-[85px] gap-[30px]">
        <div className="flex flex-col w-full gap-2.5">
          {step !== 0 && (
            <div
              className=" flex items-center cursor-pointer text-[18px] gap-2.5 justify-start "
              onClick={prevStep}
            >
              <IoMdArrowBack />
              Previous
            </div>
          )}
          {/* ✅ Progress Bar */}
          <div className="flex flex-col md:items-center  gap-2.5 w-full">
            <p className="text-left text-[#1C1C1CBF] text-[18px] font-normal">
              Step {step + 1} of 4
            </p>

            <div className="h-[10px] w-full md:w-[542px] bg-[#D9D9D9] rounded-full overflow-hidden">
              <div
                className="h-full bg-button transition-all duration-500 ease-in-out"
                style={{ width: `${((step + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ✅ Form Steps */}
        {step === 0 && (
          <Personalnfo form={form} onChange={handleChange} onNext={nextStep} />
        )}
        {step === 1 && (
          <Experience form={form} onChange={handleChange} onNext={nextStep} />
        )}
        {step === 2 && (
          <RoleSelection
            form={form}
            onChange={handleChange}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 3 && (
          <SkillSelection
            form={form}
            onChange={handleChange}
            onBack={prevStep}
          />
        )}
      </div>
    </div>
  );
};

export default GraduateOnboarding;
