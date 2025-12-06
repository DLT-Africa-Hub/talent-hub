import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  FiActivity,
  FiBriefcase,
  FiFileText,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import adminApi from '@/api/admin';

export interface ActivityItemProps {
  activity: string;
  time: string;
  metadata: {
    jobId?: string;
    graduateId?: string;
    companyId?: string;
    [key: string]: any;
  };
  type: string;
  action: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  time,
  metadata,
  type,
  action,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activityDetail, setActivityDetail] = useState<{
    graduateName?: string;
    jobTitle?: string;
    companyName?: string;
  } | null>(null);

  const [companyDetail, setCompanyDetail] = useState<{
    companyName: string;
  } | null>(null);

  const [loadingDetail, setLoadingDetail] = useState(false);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-700';
      case 'updated':
        return 'bg-blue-100 text-blue-700';
      case 'deleted':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    const iconClass = 'w-6 h-6 text-[#1C1C1C]';

    switch (type) {
      case 'user':
        return <FiUser className={iconClass} />;
      case 'job':
        return <FiBriefcase className={iconClass} />;
      case 'application':
        return <FiFileText className={iconClass} />;
      case 'match':
        return <FiUsers className={iconClass} />;
      default:
        return <FiActivity className={iconClass} />;
    }
  };

  const fetchApplicationOrMatchDetail = async () => {
    if (!metadata?.jobId || !metadata?.graduateId) return;

    try {
      setLoadingDetail(true);
      const res = await adminApi.getApplicationActivityDetail({
        jobId: metadata.jobId,
        graduateId: metadata.graduateId,
      });

      setActivityDetail(res.data);
    } catch (error) {
      console.error('Failed to fetch application/match detail', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchCompanyDetail = async () => {
    if (!metadata?.companyId) return;

    try {
      setLoadingDetail(true);
      const res = await adminApi.getCompanyById(metadata.companyId);
      setCompanyDetail(res.data);
    } catch (error) {
      console.error('Failed to fetch company detail', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);

    // application & match
    if (type === 'application' || type === 'match') {
      fetchApplicationOrMatchDetail();
    }

    // job created
    if (type === 'job' && action === 'created') {
      fetchCompanyDetail();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActivityDetail(null);
    setCompanyDetail(null);
  };

  /* ---------------- COPY RENDERERS ---------------- */

  const renderActivitySentence = () => {
    // Application
    if (type === 'application' && activityDetail) {
      return (
        <>
          <strong>{activityDetail.graduateName}</strong> applied for the role of{' '}
          <strong>{activityDetail.jobTitle}</strong> at{' '}
          <strong>{activityDetail.companyName}</strong>.
        </>
      );
    }

    // Match
    if (type === 'match' && activityDetail) {
      return (
        <>
          <strong>{activityDetail.graduateName}</strong> was matched to the role
          of <strong>{activityDetail.jobTitle}</strong> at{' '}
          <strong>{activityDetail.companyName}</strong>.
        </>
      );
    }

    // Job created
    if (type === 'job' && action === 'created' && companyDetail) {
      return (
        <>
          <strong>{companyDetail.companyName}</strong> put up a job.
        </>
      );
    }

    return null;
  };

  return (
    <>
      {/* Activity Item */}
      <div
        className="px-2 flex items-center gap-[10px] cursor-pointer hover:bg-gray-50 rounded-lg transition-colors p-2"
        onClick={handleOpenModal}
      >
        <div className="w-[55px] h-[55px] bg-[#D9D9D9] rounded-full flex items-center justify-center">
          {getTypeIcon(type)}
        </div>
        <div className="flex flex-col items-start text-left text-[#1C1C1CBF] gap-[6px] flex-1">
          <p className="font-medium text-[18px]">{activity}</p>
          <p className="font-medium text-[14px]">{time}</p>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[#1C1C1C]">
                Activity Details
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Summary
                </h3>
                <p className="text-lg text-[#1C1C1C]">{activity}</p>
              </div>

              {/* Dynamic Activity Copy */}
              {(type === 'application' ||
                type === 'match' ||
                (type === 'job' && action === 'created')) && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-600 uppercase mb-2">
                    Activity
                  </h3>

                  {loadingDetail ? (
                    <p className="text-sm text-blue-500">
                      Loading activity details...
                    </p>
                  ) : (
                    <p className="text-[16px] text-[#1C1C1C] leading-relaxed">
                      {renderActivitySentence()}
                    </p>
                  )}
                </div>
              )}

              {/* Type & Action */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Type
                  </h3>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(type)}
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium capitalize">
                      {type}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Action
                  </h3>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${getActionColor(
                      action
                    )}`}
                  >
                    {action}
                  </span>
                </div>
              </div>

              {/* Time */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Time
                </h3>
                <p className="text-[#1C1C1C]">{time}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 bg-[#1C1C1C] text-white rounded-lg hover:bg-[#333333] transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActivityItem;
