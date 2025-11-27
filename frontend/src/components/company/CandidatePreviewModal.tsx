import { useState } from 'react';
import { HiOutlineBriefcase, HiVideoCamera } from 'react-icons/hi';
import { CandidateProfile } from '../../data/candidates';
import BaseModal from '../ui/BaseModal';
import { Input, Button } from '../ui';
import { formatJobType, formatSalaryRange, getSalaryType } from '../../utils/job.utils';

interface CandidatePreviewModalProps {
  isOpen: boolean;
  candidate: CandidateProfile | null;
  onClose: () => void;
  onChat?: (candidate: CandidateProfile) => void;
  onViewCV?: (candidate: CandidateProfile) => void;
  onAccept?: (candidate: CandidateProfile) => void;
  onReject?: (candidate: CandidateProfile) => void;
  onScheduleInterview?: (candidate: CandidateProfile, scheduledAt: string, interviewLink?: string) => void;
}


const CandidatePreviewModal: React.FC<CandidatePreviewModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onChat,
  onViewCV,
  onAccept,
  onReject,
  onScheduleInterview,
}) => {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [interviewLink, setInterviewLink] = useState('');

  if (!candidate) return null;
  console.log(candidate)

  const matchPercentage = candidate.matchPercentage ?? undefined;
  const summary = candidate.summary || 'No summary available.';
  
  // Format job details
  const jobType = candidate.jobType ? formatJobType(candidate.jobType) : 'Not specified';
  const salaryRange = formatSalaryRange(candidate.salary);
  const salaryType = candidate.jobType ? getSalaryType(candidate.jobType) : 'Annual';
  const locationParts = candidate.location ? candidate.location.split(' • ') : [];
  const locationCity = locationParts.length > 1 ? locationParts[1] : candidate.location;
  const locationType = locationParts.length > 0 ? locationParts[0] : '';


  const handleChat = () => {
    onChat?.(candidate);
    onClose();
  };

  const handleViewCV = () => {
    onViewCV?.(candidate);
  };
  

  const handleAccept = () => {
    onAccept?.(candidate);
  };

  const handleReject = () => {
    onReject?.(candidate);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduledAt) {
      onScheduleInterview?.(candidate, scheduledAt, interviewLink || undefined);
      setShowScheduleForm(false);
      setScheduledAt('');
      setInterviewLink('');
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      {/* Candidate Photo */}
      <div className="relative h-[200px] w-[200px] overflow-hidden rounded-[16px]">
        <img
          src={candidate.image}
          alt={candidate.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute left-[14px] top-[14px] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white/30 backdrop-blur-sm text-white">
          <HiOutlineBriefcase className="text-[22px]" />
        </div>
      </div>

      {/* Candidate Information */}
      <div className="flex flex-col gap-[16px]">
        <div className="flex items-start justify-between gap-[16px]">
          <div className="flex flex-col gap-[4px]">
            <h2 className="text-[28px] font-semibold text-[#1C1C1C]">
              {candidate.name}
            </h2>
            <p className="font-sf text-[18px] text-[#1C1C1CBF]">
              {candidate.role}
            </p>
          </div>
          <div className="flex items-center gap-[8px] rounded-full bg-[#E2F4DA] px-[14px] py-[8px]">
            <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-button text-[14px] font-semibold text-white">
              {candidate.rank}
            </span>
            {matchPercentage !== undefined && (
              <span className="text-[16px] font-semibold text-button">
                {matchPercentage}% match
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-[16px] leading-relaxed text-[#1C1C1CBF]">
          {summary}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-[12px]">
          {candidate.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-fade bg-[#F8F8F8] px-[16px] py-[8px] text-[14px] font-medium text-[#1C1C1C]"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Employment Details */}
        <div className="flex items-center gap-[16px] border-t border-[#E0E0E0] pt-[20px]">
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#1C1C1C]">
              {candidate.experience}
            </span>
            <span className="text-[14px] text-[#1C1C1CBF]">{jobType}</span>
          </div>
          <div className="h-[40px] w-px bg-[#E0E0E0]" />
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#1C1C1C]">
              {locationType || locationCity.split(',')[0]}
            </span>
            <span className="text-[14px] text-[#1C1C1CBF]">
              {locationType ? locationCity : 'Location'}
            </span>
          </div>
          <div className="h-[40px] w-px bg-[#E0E0E0]" />
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold text-[#1C1C1C]">
              {salaryRange === 'Not specified' ? '—' : salaryRange.replace(/[k$]/g, '')}
            </span>
            <span className="text-[14px] text-[#1C1C1CBF]">{salaryType}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-[8px] flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleViewCV}
              className="flex-1"
            >
              View CV
            </Button>
            {/* Only show Chat if direct contact is enabled */}
            {candidate.directContact !== false && (
              <Button
                variant="secondary"
                onClick={handleChat}
                className="flex-1"
              >
                Chat
              </Button>
            )}
          </div>

          {!showScheduleForm ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleAccept}
                  className="flex-1 bg-button text-white hover:bg-[#176300] font-semibold py-3"
                >
                  Accept
                </Button>
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 font-semibold py-3 border-0"
                >
                  Reject
                </Button>
              </div>
              {/* Only show Schedule Interview if direct contact is enabled */}
              {candidate.directContact !== false && (
                <Button
                  onClick={() => setShowScheduleForm(true)}
                  variant="secondary"
                  className="w-full border-2 border-button text-button hover:bg-button/5 font-medium py-3"
                >
                  <HiVideoCamera className="text-[18px] mr-2" />
                  Schedule Interview
                </Button>
              )}
              {candidate.directContact === false && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[14px] text-blue-800">
                    This application is being handled by DLT Africa admin team. They will review and manage this candidate on your behalf.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-3 p-4 border border-fade rounded-lg bg-[#F8F8F8]">
              <Input
                type="datetime-local"
                label="Interview Date & Time"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
              <Input
                type="url"
                label="Video Call Link (optional)"
                placeholder="https://meet.google.com/..."
                value={interviewLink}
                onChange={(e) => setInterviewLink(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  Schedule Interview
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                    setScheduledAt('');
                    setInterviewLink('');
                  }}
                  className="flex-1"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default CandidatePreviewModal;
