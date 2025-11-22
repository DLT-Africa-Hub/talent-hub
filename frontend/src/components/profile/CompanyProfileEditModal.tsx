import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '../../api/company';
import BaseModal from '../ui/BaseModal';
import { Button, FormField, Input, Textarea, InlineLoader } from '../ui';

interface CompanyProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any;
}

const CompanyProfileEditModal: React.FC<CompanyProfileEditModalProps> = ({
  isOpen,
  onClose,
  company,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    companySize: '',
    location: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    if (company && isOpen) {
      setFormData({
        companyName: company.companyName || '',
        industry: company.industry || '',
        companySize: company.companySize?.toString() || '',
        location: company.location || '',
        website: company.website || '',
        description: company.description || '',
      });
    }
  }, [company, isOpen]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await companyApi.updateProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyProfile'] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      companyName: formData.companyName.trim(),
      industry: formData.industry.trim(),
      location: formData.location.trim() || undefined,
      website: formData.website.trim() || undefined,
      description: formData.description.trim() || undefined,
    };

    if (formData.companySize) {
      const size = parseInt(formData.companySize, 10);
      if (!isNaN(size) && size > 0) {
        updateData.companySize = size;
      }
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
            Edit Company Profile
          </h2>
          <p className="text-[14px] text-[#1C1C1C80] mt-[4px]">
            Update your company information and details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
          <FormField label="Company Name" required>
            <Input
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="Enter company name"
              required
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <FormField label="Industry" required>
              <Input
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                placeholder="Enter industry"
                required
              />
            </FormField>

            <FormField label="Company Size" required>
              <Input
                type="number"
                value={formData.companySize}
                onChange={(e) => handleChange('companySize', e.target.value)}
                placeholder="Number of employees"
                min="1"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <FormField label="Location">
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Enter location"
              />
            </FormField>

            <FormField label="Website">
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://company.com"
              />
            </FormField>
          </div>

          <FormField label="About" required>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe your company"
              rows={5}
              required
            />
          </FormField>

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

export default CompanyProfileEditModal;

