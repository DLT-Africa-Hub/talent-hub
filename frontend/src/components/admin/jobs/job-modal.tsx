import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { adminApi } from '../../../api/admin';
import { LoadingSpinner, EmptyState, Button } from '../../ui';
import { toast } from 'react-hot-toast';
import { ApiError } from '../../../types/api';

interface JobDetailsModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  jobId,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'applications'>(
    'overview'
  );
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);

  const {
    data: jobData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminJob', jobId],
    queryFn: () => adminApi.getJobById(jobId),
    enabled: !!jobId && isOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: 'active' | 'closed' | 'draft') =>
      adminApi.updateJobStatus(jobId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminJob', jobId] });
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      toast.success('Job status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update job status');
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: () => adminApi.deleteJob(jobId),
    onSuccess: () => {
      toast.success('Job deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || 'Failed to delete job');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { applicationId: string; message: string }) =>
      adminApi.sendMessageToApplicant(data.applicationId, data.message),
    onSuccess: () => {
      toast.success('Message sent successfully');
      setShowMessageModal(false);
      setMessageText('');
      setSelectedApplication(null);
      queryClient.invalidateQueries({ queryKey: ['adminJob', jobId] });
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(err.response?.data?.message || 'Failed to send message');
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: (data: {
      applicationId: string;
      scheduledAt: string;
      durationMinutes: number;
    }) =>
      adminApi.scheduleInterviewForApplicant(data.applicationId, {
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes,
      }),
    onSuccess: () => {
      toast.success('Interview scheduled successfully');
      setShowScheduleModal(false);
      setScheduleDate('');
      setScheduleTime('');
      setDurationMinutes(30);
      setSelectedApplication(null);
      queryClient.invalidateQueries({ queryKey: ['adminJob', jobId] });
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast.error(
        err.response?.data?.message || 'Failed to schedule interview'
      );
    },
  });

  if (!isOpen) return null;

  const handleDelete = () => {
    if (
      window.confirm(
        'Are you sure you want to delete this job? This action cannot be undone.'
      )
    ) {
      deleteJobMutation.mutate();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-red-100 text-red-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'reviewed':
        return 'bg-blue-100 text-blue-700';
      case 'shortlisted':
        return 'bg-purple-100 text-purple-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'hired':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute flex items-center justify-center inset-0 overflow-hidden">
        <div className="pointer-events-none fixed inset-y-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-5xl">
            <div className="flex h-full flex-col bg-white shadow-xl">
              {/* Header */}
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isLoading ? (
                      <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
                    ) : error || !jobData?.data ? (
                      <h2 className="text-xl font-semibold text-gray-900">
                        Job not found
                      </h2>
                    ) : (
                      <>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {jobData.data.job.title}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {jobData.data.job.companyId?.companyName}
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Action Buttons */}
                {jobData?.data && (
                  <div className="flex items-center gap-3 mt-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        jobData.data.job.status
                      )}`}
                    >
                      {jobData.data.job.status.charAt(0).toUpperCase() +
                        jobData.data.job.status.slice(1)}
                    </span>

                    {jobData.data.job.status === 'active' ? (
                      <button
                        onClick={() => updateStatusMutation.mutate('closed')}
                        disabled={updateStatusMutation.isPending}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Close Job
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatusMutation.mutate('active')}
                        disabled={updateStatusMutation.isPending}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        Activate Job
                      </button>
                    )}

                    <button
                      onClick={handleDelete}
                      disabled={deleteJobMutation.isPending}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Tabs */}
              {jobData?.data && (
                <div className="border-b border-gray-200 px-6">
                  <div className="flex gap-8">
                    <button
                      onClick={() => setSelectedTab('overview')}
                      className={`pb-3 px-1 font-medium transition-colors ${
                        selectedTab === 'overview'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setSelectedTab('applications')}
                      className={`pb-3 px-1 font-medium transition-colors ${
                        selectedTab === 'applications'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Applications ({jobData.data.stats.total})
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {isLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <LoadingSpinner />
                  </div>
                ) : error || !jobData?.data ? (
                  <EmptyState
                    title="Job not found"
                    description="This job may have been deleted"
                  />
                ) : selectedTab === 'overview' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Job Details Card */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Job Details
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="flex items-start gap-3">
                            <Building2
                              className="text-gray-400 mt-1"
                              size={20}
                            />
                            <div>
                              <p className="text-sm text-gray-600">Company</p>
                              <p className="font-medium">
                                {jobData.data.job.companyId?.companyName}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <MapPin className="text-gray-400 mt-1" size={20} />
                            <div>
                              <p className="text-sm text-gray-600">Location</p>
                              <p className="font-medium">
                                {jobData.data.job.location || 'Not specified'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <Clock className="text-gray-400 mt-1" size={20} />
                            <div>
                              <p className="text-sm text-gray-600">Job Type</p>
                              <p className="font-medium">
                                {jobData.data.job.jobType}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <DollarSign
                              className="text-gray-400 mt-1"
                              size={20}
                            />
                            <div>
                              <p className="text-sm text-gray-600">Salary</p>
                              <p className="font-medium">
                                {jobData.data.job.salary
                                  ? `${jobData.data.job.salary.currency} ${jobData.data.job.salary.amount.toLocaleString()}`
                                  : 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Preferred Rank
                          </p>
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {jobData.data.job.preferedRank}
                          </span>
                        </div>

                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Application Handling
                          </p>
                          <p className="font-medium">
                            {jobData.data.job.directContact
                              ? 'Direct Contact with Company'
                              : 'Managed by DLT Africa'}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Job Description
                        </h3>
                        {(() => {
                          let description =
                            jobData.data.job.descriptionHtml ||
                            jobData.data.job.description ||
                            'No description provided';
                          
                          // Decode HTML entities (handles &lt; &gt; &amp; &nbsp; etc.)
                          const decodeHtmlEntities = (str: string): string => {
                            const textarea = document.createElement('textarea');
                            textarea.innerHTML = str;
                            return textarea.value;
                          };
                          
                          // Decode HTML entities first
                          description = decodeHtmlEntities(description);
                          
                          // Check if description contains HTML tags after decoding
                          const hasHtmlTags = /<[a-z][\s\S]*>/i.test(description);
                          
                          if (hasHtmlTags) {
                            return (
                              <div
                                className="prose prose-sm max-w-none text-gray-700 
                                  prose-headings:text-gray-900 prose-headings:font-semibold
                                  prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-3
                                  prose-strong:text-gray-900 prose-strong:font-semibold
                                  prose-em:text-gray-700 prose-em:italic
                                  prose-ul:text-gray-700 prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6
                                  prose-ol:text-gray-700 prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6
                                  prose-li:text-gray-700 prose-li:my-1
                                  prose-a:text-blue-600 prose-a:underline
                                  prose-h1:text-2xl prose-h1:font-bold prose-h1:my-4
                                  prose-h2:text-xl prose-h2:font-semibold prose-h2:my-3"
                                dangerouslySetInnerHTML={{
                                  __html: description,
                                }}
                              />
                            );
                          } else {
                            return (
                              <p className="text-sm text-gray-700 whitespace-pre-line">
                                {description}
                              </p>
                            );
                          }
                        })()}
                      </div>

                      {/* Requirements */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Requirements
                        </h3>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Required Skills
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {jobData.data.job.requirements.skills.map(
                              (skill: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-sm"
                                >
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {jobData.data.job.requirements.extraRequirements &&
                          jobData.data.job.requirements.extraRequirements
                            .length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">
                                Additional Requirements
                              </p>
                              <ul className="space-y-2">
                                {jobData.data.job.requirements.extraRequirements.map(
                                  (req: any, index: number) => (
                                    <li
                                      key={index}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <span className="w-2 h-2 bg-gray-400 rounded-full" />
                                      <span>
                                        {req.label} ({req.type})
                                        {req.required && (
                                          <span className="text-red-500 ml-1">
                                            *
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                      {/* Stats Card */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Statistics
                        </h3>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users size={20} className="text-gray-400" />
                              <span className="text-gray-600 text-sm">
                                Total Applications
                              </span>
                            </div>
                            <span className="font-semibold text-lg">
                              {jobData.data.stats.total}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock size={20} className="text-yellow-400" />
                              <span className="text-gray-600 text-sm">
                                Pending
                              </span>
                            </div>
                            <span className="font-semibold text-lg">
                              {jobData.data.stats.pending}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle
                                size={20}
                                className="text-purple-400"
                              />
                              <span className="text-gray-600 text-sm">
                                Shortlisted
                              </span>
                            </div>
                            <span className="font-semibold text-lg">
                              {jobData.data.stats.shortlisted}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle
                                size={20}
                                className="text-green-400"
                              />
                              <span className="text-gray-600 text-sm">
                                Hired
                              </span>
                            </div>
                            <span className="font-semibold text-lg">
                              {jobData.data.stats.hired}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <XCircle size={20} className="text-red-400" />
                              <span className="text-gray-600 text-sm">
                                Rejected
                              </span>
                            </div>
                            <span className="font-semibold text-lg">
                              {jobData.data.stats.rejected}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Company Info */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">
                          Company Information
                        </h3>

                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Industry</p>
                            <p className="font-medium">
                              {jobData.data.job.companyId?.industry ||
                                'Not specified'}
                            </p>
                          </div>

                          {jobData.data.job.companyId?.website && (
                            <div>
                              <p className="text-sm text-gray-600">Website</p>
                              <a
                                href={jobData.data.job.companyId.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                {jobData.data.job.companyId.website}
                              </a>
                            </div>
                          )}

                          {jobData.data.job.companyId?.location && (
                            <div>
                              <p className="text-sm text-gray-600">
                                Company Location
                              </p>
                              <p className="font-medium">
                                {jobData.data.job.companyId.location}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Timeline</h3>

                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-gray-600">Posted</p>
                            <p className="font-medium">
                              {new Date(
                                jobData.data.job.createdAt
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-600">Last Updated</p>
                            <p className="font-medium">
                              {new Date(
                                jobData.data.job.updatedAt
                              ).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Applications Tab */
                  <div className="bg-gray-50 rounded-lg">
                    {jobData.data.applications.length === 0 ? (
                      <div className="p-8">
                        <EmptyState
                          title="No applications yet"
                          description="This job hasn't received any applications"
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Candidate
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Applied
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Updated
                              </th>
                              {jobData.data.job.directContact === false && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {jobData.data.applications.map(
                              (application: any) => (
                                <tr
                                  key={application.id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      {application.candidate?.profilePicture ? (
                                        <img
                                          src={
                                            application.candidate.profilePicture
                                          }
                                          alt={application.candidate.name}
                                          className="h-10 w-10 rounded-full"
                                        />
                                      ) : (
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                          <span className="text-gray-600 font-medium">
                                            {application.candidate?.name?.charAt(
                                              0
                                            ) || '?'}
                                          </span>
                                        </div>
                                      )}
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                          {application.candidate?.name ||
                                            'Unknown'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {application.candidate?.email ||
                                            'No email'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getApplicationStatusColor(
                                        application.status
                                      )}`}
                                    >
                                      {application.status
                                        .charAt(0)
                                        .toUpperCase() +
                                        application.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(
                                      application.appliedAt
                                    ).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(
                                      application.updatedAt
                                    ).toLocaleDateString()}
                                  </td>
                                  {jobData.data.job.directContact === false && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setSelectedApplication(application);
                                            setShowMessageModal(true);
                                          }}
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                          title="Send Message"
                                        >
                                          <MessageSquare size={18} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedApplication(application);
                                            setShowScheduleModal(true);
                                          }}
                                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                          title="Schedule Interview"
                                        >
                                          <Calendar size={18} />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMessageModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Send Message</h3>
            <p className="text-sm text-gray-600 mb-4">
              To: {selectedApplication.candidate?.name || 'Applicant'}
            </p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message here..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageText('');
                  setSelectedApplication(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (messageText.trim()) {
                    sendMessageMutation.mutate({
                      applicationId: selectedApplication.id,
                      message: messageText,
                    });
                  }
                }}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Schedule Interview</h3>
            <p className="text-sm text-gray-600 mb-4">
              With: {selectedApplication.candidate?.name || 'Applicant'}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleDate('');
                  setScheduleTime('');
                  setDurationMinutes(30);
                  setSelectedApplication(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (scheduleDate && scheduleTime) {
                    const scheduledAt = new Date(
                      `${scheduleDate}T${scheduleTime}`
                    ).toISOString();
                    scheduleInterviewMutation.mutate({
                      applicationId: selectedApplication.id,
                      scheduledAt,
                      durationMinutes,
                    });
                  } else {
                    toast.error('Please select both date and time');
                  }
                }}
                disabled={
                  !scheduleDate ||
                  !scheduleTime ||
                  scheduleInterviewMutation.isPending
                }
              >
                {scheduleInterviewMutation.isPending
                  ? 'Scheduling...'
                  : 'Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetailsModal;
