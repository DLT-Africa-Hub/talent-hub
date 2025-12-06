import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../api/admin';
import { formatSalaryPerAnnum } from '../../../utils/job.utils';
import { Modal } from '@/components/ui';

interface GraduateModalProps {
  graduateId: string;
  onClose: () => void;
}

const GraduateModal: React.FC<GraduateModalProps> = ({ graduateId, onClose }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['graduateDetail', graduateId],
    queryFn: () => adminApi.getGraduateById(graduateId),
  });

  if (isLoading) return <Modal onClose={onClose}><p>Loading...</p></Modal>;
  if (error) return <Modal onClose={onClose}><p>Error loading graduate details.</p></Modal>;

  const grad = data.data;

  return (
    <Modal onClose={onClose} title={`${grad.firstName} ${grad.lastName}`}>
      <div className="flex flex-col gap-4">
        <p><strong>Position:</strong> {grad.position}</p>
        {grad.rank && <p><strong>Rank:</strong> {grad.rank}</p>}
        <p><strong>Experience Level:</strong> {grad.expLevel}</p>
        {grad.location && <p><strong>Location:</strong> {grad.location}</p>}
        {grad.salaryPerAnnum && <p><strong>Expected Salary:</strong> {formatSalaryPerAnnum(grad.salaryPerAnnum)}</p>}

        {grad.education && (
          <div>
            <strong>Education:</strong>
            <ul className="list-disc ml-5">
              <li>{grad.education.degree} - {grad.education.institution} ({grad.education.graduationYear})</li>
            </ul>
          </div>
        )}

        {grad.cv?.length > 0 && (
          <div>
            <strong>CV:</strong>
            <ul className="list-disc ml-5">
              {grad.cv.map((file: any) => (
                <li key={file._id}>
                  <a href={file.fileUrl} target="_blank" className="text-button underline">{file.fileName}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {grad.workExperiences?.length > 0 && (
          <div>
            <strong>Work Experience:</strong>
            <ul className="list-disc ml-5">
              {grad.workExperiences.map((work: any, idx: number) => (
                <li key={idx}>{work.position} at {work.company} ({work.years})</li>
              ))}
            </ul>
          </div>
        )}

        {grad.assessmentData?.lastScore !== undefined && (
          <p><strong>Assessment Score:</strong> {grad.assessmentData.lastScore}</p>
        )}

        {grad.portfolio && <a href={grad.portfolio} target="_blank" className="text-button underline">Portfolio</a>}
      </div>
    </Modal>
  );
};

export default GraduateModal;
