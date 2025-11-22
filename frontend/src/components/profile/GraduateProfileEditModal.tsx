import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graduateApi } from '../../api/graduate';
import BaseModal from '../ui/BaseModal';
import { Button, FormField, Input, Textarea, InlineLoader } from '../ui';

interface GraduateProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  graduate: any;
}

const GraduateProfileEditModal: React.FC<GraduateProfileEditModalProps> = ({
  isOpen,
  onClose,
  graduate,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    location: '',
    summary: '',
    portfolio: '',
    github: '',
    twitter: '',
    linkedin: '',
  });

  useEffect(() => {
    if (graduate && isOpen) {
      setFormData({
        firstName: graduate.firstName || '',
        lastName: graduate.lastName || '',
        phoneNumber: graduate.phoneNumber?.toString() || '',
        location: graduate.location || '',
        summary: graduate.summary || '',
        portfolio: graduate.portfolio || '',
        github: graduate.socials?.github || '',
        twitter: graduate.socials?.twitter || '',
        linkedin: graduate.socials?.linkedin || '',
      });
    }
  }, [graduate, isOpen]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await graduateApi.updateProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduateProfile'] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      location: formData.location.trim() || undefined,
      summary: formData.summary.trim() || undefined,
      portfolio: formData.portfolio.trim() || undefined,
    };

    if (formData.phoneNumber) {
      updateData.phoneNumber = formData.phoneNumber;
    }

    if (formData.github || formData.twitter || formData.linkedin) {
      updateData.socials = {
        github: formData.github.trim() || undefined,
        twitter: formData.twitter.trim() || undefined,
        linkedin: formData.linkedin.trim() || undefined,
      };
    }

    updateMutation.mutate(updateData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-[24px]">
        <div>
          <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
            Edit Profile
          </h2>
          <p className="text-[14px] text-[#1C1C1C80] mt-[4px]">
            Update your personal information and professional details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <FormField label="First Name" required>
              <Input
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Enter first name"
                required
              />
            </FormField>

            <FormField label="Last Name" required>
              <Input
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Enter last name"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <FormField label="Phone Number">
              <Input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                placeholder="Enter phone number"
              />
            </FormField>

            <FormField label="Location">
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Enter location"
              />
            </FormField>
          </div>

          <FormField label="Summary">
            <Textarea
              value={formData.summary}
              onChange={(e) => handleChange('summary', e.target.value)}
              placeholder="Write a brief summary about yourself"
              rows={4}
            />
          </FormField>

          <FormField label="Portfolio URL">
            <Input
              type="url"
              value={formData.portfolio}
              onChange={(e) => handleChange('portfolio', e.target.value)}
              placeholder="https://yourportfolio.com"
            />
          </FormField>

          <div className="border-t border-fade pt-[20px]">
            <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[16px]">
              Social Links
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
              <FormField label="GitHub">
                <Input
                  type="url"
                  value={formData.github}
                  onChange={(e) => handleChange('github', e.target.value)}
                  placeholder="https://github.com/username"
                />
              </FormField>

              <FormField label="Twitter">
                <Input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/username"
                />
              </FormField>

              <FormField label="LinkedIn">
                <Input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                />
              </FormField>
            </div>
          </div>

          {updateMutation.isError && (
            <div className="rounded-[12px] bg-red-50 border border-red-200 p-[12px]">
              <p className="text-[14px] text-red-600">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : 'Failed to update profile. Please try again.'}
              </p>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-[12px] justify-end pt-[8px]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <InlineLoader size="sm" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};

export default GraduateProfileEditModal;

