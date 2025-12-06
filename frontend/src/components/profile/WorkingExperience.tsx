/* ---------- Component ---------- */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import graduateApi from '../../api/graduate';
import { Edit, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface WorkExperienceItem {
  _id?: string;
  company: string;
  title: string;
  startDate: string | Date;
  endDate?: string | Date;
  current?: boolean;
  description?: string;
}

interface WorkingExperienceProps {
  workExperiences?: WorkExperienceItem[];
}

type BannerType = 'success' | 'error' | null;

const WorkingExperience: React.FC<WorkingExperienceProps> = ({
  workExperiences = [],
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<WorkExperienceItem | null>(null);
  const [localExperiences, setLocalExperiences] =
    useState<WorkExperienceItem[]>(workExperiences);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<BannerType>(null);

  const gradProfileQuery = useQuery({
    queryKey: ['graduateProfile', 'header'],
    queryFn: async () => {
      const profileResponse = await graduateApi.getProfile();
      return profileResponse.graduate || profileResponse;
    },
    enabled: user?.role === 'graduate',
    staleTime: 60 * 1000,
  });

  // Sync and sort experiences
  useEffect(() => {
    const serverExperiences: WorkExperienceItem[] | undefined =
      gradProfileQuery.data?.workExperiences ||
      gradProfileQuery.data?.work_experiences ||
      workExperiences;

    if (serverExperiences && Array.isArray(serverExperiences)) {
      const sorted = [...serverExperiences].sort((a, b) => {
        if (a.current && !b.current) return -1;
        if (!a.current && b.current) return 1;
        if (a.current && b.current)
          return (
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
        return bEnd - aEnd;
      });
      setLocalExperiences(sorted);
    } else if (!gradProfileQuery.isLoading && !serverExperiences) {
      setLocalExperiences(workExperiences);
    }
  }, [gradProfileQuery.data, gradProfileQuery.isLoading, workExperiences]);

  useEffect(() => {
    if (!bannerMessage) return;
    const t = setTimeout(() => {
      setBannerMessage(null);
      setBannerType(null);
    }, 4000);
    return () => clearTimeout(t);
  }, [bannerMessage]);

  const addExpMutation = useMutation({
    mutationFn: async (exp: WorkExperienceItem) => {
      if (editingExp?._id) {
        return await graduateApi.updateWorkExperience(
          editingExp._id,
          exp as unknown as Record<string, unknown>
        );
      } else {
        return await graduateApi.addWorkExperience(
          exp as unknown as Record<string, unknown>
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['graduateProfile', 'header'],
      });
      setBannerMessage(
        editingExp
          ? 'Work experience updated successfully'
          : 'Work experience added successfully'
      );
      setBannerType('success');
      setEditingExp(null);
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setBannerMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to save experience'
      );
      setBannerType('error');
    },
  });

  const deleteExpMutation = useMutation({
    mutationFn: async (id: string) =>
      await graduateApi.deleteWorkExperience(id),
    onSuccess: (_, id) => {
      setLocalExperiences((prev) => prev.filter((exp) => exp._id !== id));
      queryClient.invalidateQueries({
        queryKey: ['graduateProfile', 'header'],
      });
      setBannerMessage('Work experience deleted');
      setBannerType('success');
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setBannerMessage(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete experience'
      );
      setBannerType('error');
    },
  });

  const openAddModal = () => {
    setEditingExp(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: WorkExperienceItem) => {
    setEditingExp(exp);
    setIsModalOpen(true);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (id?: string) => {
    if (!id) return;
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteExpMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="rounded-[24px] border border-fade bg-white p-[24px] flex flex-col gap-[24px]">
      <SectionHeading title="Experience" />

      {/* Banner */}
      {bannerMessage && (
        <div
          className={`p-3 rounded-md border text-sm ${
            bannerType === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {bannerMessage}
        </div>
      )}

      {localExperiences.length === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-[#1C1C1CBF] font-normal text-[14px]">
            No work experience added
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="bg-button text-white font-semibold px-6 py-2 rounded-[12px] hover:opacity-90 transition"
          >
            Add Work Experience
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6">
            {localExperiences.map((exp, idx) => (
              <div
                key={exp._id ?? idx}
                className="flex flex-col gap-1.5 border-b italic border-fade pb-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[20px] text-[#1c1c1ca1]">
                      {exp.title}
                    </p>
                    <p className="font-medium text-[14px] text-[#1C1C1CBF]">
                      {exp.company}
                    </p>
                    <p className="text-[12px] text-[#1C1C1CBF]">
                      {formatDate(exp.startDate)} -{' '}
                      {exp.current
                        ? 'Present'
                        : exp.endDate
                          ? formatDate(exp.endDate)
                          : ''}
                    </p>
                    {exp.description && (
                      <p className="text-[14px] text-[#1C1C1CBF]">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(exp)}
                      className="text-blue-500 text-sm"
                    >
                      <Edit />
                    </button>
                    <button
                      onClick={() => handleDelete(exp._id)}
                      className="text-red-500 text-sm"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 self-start bg-button text-white font-semibold px-6 py-2 rounded-[12px] hover:opacity-90 transition"
          >
            Add Another Experience
          </button>
        </>
      )}

      {isModalOpen && (
        <AddExperienceModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={(exp) => addExpMutation.mutate(exp)}
          submitting={addExpMutation.isPending}
          defaultErrorMessage={
            addExpMutation.isError
              ? String(
                  (addExpMutation.error as { message?: string })?.message ||
                    'Error'
                )
              : undefined
          }
          defaultValues={editingExp || undefined}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Delete Experience"
        message="Are you sure you want to delete this experience? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        isLoading={deleteExpMutation.isPending}
      />
    </div>
  );
};

export default WorkingExperience;

/* ---------- Modal with edit support ---------- */
interface AddExperienceModalProps {
  onClose: () => void;
  onSubmit: (exp: WorkExperienceItem) => void;
  submitting?: boolean;
  defaultErrorMessage?: string;
  defaultValues?: WorkExperienceItem; // For editing
}

const AddExperienceModal: React.FC<AddExperienceModalProps> = ({
  onClose,
  onSubmit,
  submitting = false,
  defaultErrorMessage,
  defaultValues,
}) => {
  const [company, setCompany] = useState(defaultValues?.company || '');
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [startDate, setStartDate] = useState(
    defaultValues?.startDate ? formatInputMonth(defaultValues.startDate) : ''
  );
  const [endDate, setEndDate] = useState(
    defaultValues?.endDate ? formatInputMonth(defaultValues.endDate) : ''
  );
  const [description, setDescription] = useState(
    defaultValues?.description || ''
  );
  const [current, setCurrent] = useState(defaultValues?.current || false);
  const [localError, setLocalError] = useState<string | null>(
    defaultErrorMessage || null
  );

  useEffect(() => {
    setLocalError(defaultErrorMessage || null);
  }, [defaultErrorMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!company.trim() || !title.trim() || !startDate) {
      setLocalError(
        'Please fill in required fields (Company, Title, Start Date).'
      );
      return;
    }

    if (!current && endDate) {
      const start = new Date(startDate + '-01');
      const end = new Date(endDate + '-01');
      if (start > end) {
        setLocalError('Start date cannot be after end date.');
        return;
      }
    }

    onSubmit({
      company: company.trim(),
      title: title.trim(),
      startDate,
      endDate: current ? undefined : endDate || undefined,
      current,
      description: description?.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-[16px] p-6 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-[18px] font-semibold text-[#1C1C1C]">
          {defaultValues ? 'Edit Work Experience' : 'Add Work Experience'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="border border-fade rounded-[8px] p-2"
            required
            disabled={submitting}
          />
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-fade rounded-[8px] p-2"
            required
            disabled={submitting}
          />
          <div className="flex gap-2">
            <input
              type="month"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-fade rounded-[8px] p-2 flex-1"
              required
              disabled={submitting}
            />
            <input
              type="month"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-fade rounded-[8px] p-2 flex-1"
              disabled={submitting || current}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={current}
              onChange={(e) => setCurrent(e.target.checked)}
              disabled={submitting}
            />
            Currently Working Here
          </label>

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-fade rounded-[8px] p-2 resize-none"
            disabled={submitting}
          />

          {localError && <p className="text-red-500 text-sm">{localError}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] border border-fade"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-[8px] bg-button text-white font-semibold"
            >
              {submitting
                ? defaultValues
                  ? 'Saving...'
                  : 'Adding...'
                : defaultValues
                  ? 'Save'
                  : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------- Helpers ---------- */
const SectionHeading = ({ title }: { title: string }) => (
  <p className="text-[16px] font-semibold text-[#1C1C1C]">{title}</p>
);

const formatDate = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
};

const formatInputMonth = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
};
