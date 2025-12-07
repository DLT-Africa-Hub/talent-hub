import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../api/admin';
import { formatSalaryPerAnnum } from '../../../utils/job.utils';
import Modal from '../../auth/Modal';
import { ImageWithFallback } from '../../ui';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Award,
  FileText,
  ExternalLink,
  Github,
  Linkedin,
  Twitter,
  Calendar,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

interface GraduateModalProps {
  graduateId: string;
  onClose: () => void;
}

const GraduateModal: React.FC<GraduateModalProps> = ({
  graduateId,
  onClose,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['graduateDetail', graduateId],
    queryFn: () => adminApi.getGraduateById(graduateId),
  });

  if (isLoading)
    return (
      <Modal isOpen={true} onClose={onClose} size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
        </div>
      </Modal>
    );
  if (error)
    return (
      <Modal isOpen={true} onClose={onClose} size="lg">
        <div className="text-center py-12">
          <p className="text-red-600">Error loading graduate details.</p>
        </div>
      </Modal>
    );

  const grad = data.data;

  return (
    <Modal isOpen={true} onClose={onClose} size="xl">
      <div className="flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
        {/* Header Section with Profile Picture */}
        <div className="flex items-start gap-6 pb-6 border-b border-fade">
          <ImageWithFallback
            src={grad.profilePictureUrl || ''}
            alt={`${grad.firstName} ${grad.lastName}`}
            className="w-24 h-24 rounded-xl object-cover border-2 border-fade"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-[#1C1C1C] mb-2">
              {grad.firstName} {grad.lastName}
            </h2>
            <p className="text-lg text-[#1C1C1CBF] mb-4 capitalize">
              {grad.position?.replace(/([A-Z])/g, ' $1').trim()}
            </p>

            {/* Quick Info Row */}
            <div className="flex flex-wrap gap-4 text-sm text-[#1C1C1C80]">
              {grad.rank && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-button" />
                  <span className="font-medium text-[#1C1C1C]">
                    Rank {grad.rank}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="capitalize">{grad.expLevel}</span>
              </div>
              {grad.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{grad.location}</span>
                </div>
              )}
              {grad.salaryPerAnnum && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatSalaryPerAnnum(grad.salaryPerAnnum)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Section */}
        {grad.summary && (
          <div className="bg-[#F8F8F8] rounded-xl p-5 border border-fade">
            <h3 className="text-lg font-semibold text-[#1C1C1C] mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-button" />
              Summary
            </h3>
            <p className="text-[#1C1C1CBF] leading-relaxed">{grad.summary}</p>
          </div>
        )}

        {/* Skills Section */}
        {grad.skills && grad.skills.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-fade">
            <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-button" />
              Skills ({grad.skills.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {grad.skills.map((skill: string) => (
                <span
                  key={skill}
                  className="border-button border px-4 py-2 rounded-lg bg-[#EFFFE2] text-button text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience Section */}
        {grad.workExperiences && grad.workExperiences.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-fade">
            <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-button" />
              Work Experience
            </h3>
            <div className="flex flex-col gap-4">
              {grad.workExperiences.map((work: any, idx: number) => {
                const startDate = work.startDate
                  ? new Date(work.startDate)
                  : null;
                const endDate = work.endDate ? new Date(work.endDate) : null;

                return (
                  <div
                    key={idx}
                    className="border-l-2 border-button pl-4 py-2 bg-[#F8F8F8] rounded-r-lg"
                  >
                    <div className="font-semibold text-[#1C1C1C]">
                      {work.title || work.position}
                    </div>
                    <div className="text-[#1C1C1CBF] text-sm">
                      {work.company}
                    </div>
                    {startDate && (
                      <div className="flex items-center gap-1 text-xs text-[#1C1C1C80] mt-1">
                        <Calendar className="w-3 h-3" />
                        {format(startDate, 'MMM yyyy')}
                        {endDate
                          ? ` - ${format(endDate, 'MMM yyyy')}`
                          : work.current
                            ? ' - Present'
                            : ''}
                      </div>
                    )}
                    {work.description && (
                      <p className="text-sm text-[#1C1C1CBF] mt-2">
                        {work.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assessment Score */}
        {grad.assessmentData?.lastScore !== undefined && (
          <div className="bg-white rounded-xl p-5">
            <h3 className="text-lg font-semibold text-[#1C1C1C] mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-button" />
              Assessment Score
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-button">
                {grad.assessmentData.lastScore}%
              </div>
              <div className="flex-1 h-2 bg-[#F0F0F0] rounded-full overflow-hidden border-0">
                <div
                  className="h-full bg-button rounded-full transition-all"
                  style={{ width: `${grad.assessmentData.lastScore}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Links Section */}
        <div className="flex flex-wrap gap-4">
          {grad.portfolio && (
            <a
              href={grad.portfolio}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#F8F8F8] rounded-lg border border-fade hover:bg-[#EFFFE2] transition-colors text-[#1C1C1C]"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">Portfolio</span>
            </a>
          )}
          {grad.socials?.github && (
            <a
              href={grad.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#F8F8F8] rounded-lg border border-fade hover:bg-[#EFFFE2] transition-colors text-[#1C1C1C]"
            >
              <Github className="w-4 h-4" />
              <span className="text-sm font-medium">GitHub</span>
            </a>
          )}
          {grad.socials?.linkedin && (
            <a
              href={grad.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#F8F8F8] rounded-lg border border-fade hover:bg-[#EFFFE2] transition-colors text-[#1C1C1C]"
            >
              <Linkedin className="w-4 h-4" />
              <span className="text-sm font-medium">LinkedIn</span>
            </a>
          )}
          {grad.socials?.twitter && (
            <a
              href={grad.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#F8F8F8] rounded-lg border border-fade hover:bg-[#EFFFE2] transition-colors text-[#1C1C1C]"
            >
              <Twitter className="w-4 h-4" />
              <span className="text-sm font-medium">Twitter</span>
            </a>
          )}
        </div>

        {/* CV Section */}
        {grad.cv && grad.cv.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-fade">
            <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-button" />
              Resume/CV ({grad.cv.length})
            </h3>
            <div className="flex flex-col gap-2">
              {grad.cv.map((file: any) => (
                <a
                  key={file._id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-[#F8F8F8] rounded-lg border border-fade hover:bg-[#EFFFE2] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-button" />
                    <span className="text-sm font-medium text-[#1C1C1C]">
                      {file.fileName}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#1C1C1C80] group-hover:text-button transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GraduateModal;
