import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graduateApi } from '../../api/graduate';
import { companyApi } from '../../api/company';
import BaseModal from '../ui/BaseModal';
import { Button, FormField, Input, Textarea, InlineLoader } from '../ui';

export type ProfileType = 'graduate' | 'company';

interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'tel' | 'url' | 'number' | 'textarea';
  placeholder?: string;
  required?: boolean;
  gridCols?: 1 | 2; // For grid layout
  rows?: number; // For textarea
  section?: string; // For grouping fields (e.g., "Social Links")
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileType: ProfileType;
  profile: Record<string, unknown>;
}

// Field configurations for each profile type
const GRADUATE_FIELDS: FieldConfig[] = [
  { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true, gridCols: 2 },
  { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true, gridCols: 2 },
  { name: 'phoneNumber', label: 'Phone Number', type: 'tel', placeholder: 'Enter phone number', gridCols: 2 },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'Enter location', gridCols: 2 },
  { name: 'summary', label: 'Summary', type: 'textarea', placeholder: 'Write a brief summary about yourself', rows: 4 },
  { name: 'portfolio', label: 'Portfolio URL', type: 'url', placeholder: 'https://yourportfolio.com' },
  { name: 'github', label: 'GitHub', type: 'url', placeholder: 'https://github.com/username', section: 'Social Links', gridCols: 2 },
  { name: 'twitter', label: 'Twitter', type: 'url', placeholder: 'https://twitter.com/username', section: 'Social Links', gridCols: 2 },
  { name: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/username', section: 'Social Links', gridCols: 2 },
];

const COMPANY_FIELDS: FieldConfig[] = [
  { name: 'companyName', label: 'Company Name', type: 'text', placeholder: 'Enter company name', required: true },
  { name: 'industry', label: 'Industry', type: 'text', placeholder: 'Enter industry', required: true, gridCols: 2 },
  { name: 'companySize', label: 'Company Size', type: 'number', placeholder: 'Number of employees', required: true, gridCols: 2 },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'Enter location', gridCols: 2 },
  { name: 'website', label: 'Website', type: 'url', placeholder: 'https://company.com', gridCols: 2 },
  { name: 'description', label: 'About', type: 'textarea', placeholder: 'Describe your company', required: true, rows: 5 },
];

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profileType,
  profile,
}) => {
  const queryClient = useQueryClient();
  
  // Get field configuration based on profile type
  const fields = useMemo(() => {
    return profileType === 'graduate' ? GRADUATE_FIELDS : COMPANY_FIELDS;
  }, [profileType]);

  // Initialize form data from fields
  const initialFormData = useMemo(() => {
    const data: Record<string, string> = {};
    fields.forEach((field) => {
      data[field.name] = '';
    });
    return data;
  }, [fields]);

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);

  // Populate form data from profile
  useEffect(() => {
    if (profile && isOpen) {
      const newFormData: Record<string, string> = {};
      
      fields.forEach((field) => {
        if (profileType === 'graduate') {
          // Graduate-specific field mapping
          if (field.name === 'github' || field.name === 'twitter' || field.name === 'linkedin') {
            const socials = (profile.socials || {}) as Record<string, string>;
            newFormData[field.name] = socials[field.name] || '';
          } else if (field.name === 'phoneNumber') {
            newFormData[field.name] = profile.phoneNumber?.toString() || '';
          } else {
            newFormData[field.name] = String(profile[field.name] || '');
          }
        } else {
          // Company-specific field mapping
          if (field.name === 'companySize') {
            newFormData[field.name] = profile.companySize?.toString() || '';
          } else {
            newFormData[field.name] = String(profile[field.name] || '');
          }
        }
      });
      
      setFormData(newFormData);
    }
  }, [profile, isOpen, fields, profileType]);

  // Mutation for updating profile
  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (profileType === 'graduate') {
        return await graduateApi.updateProfile(data);
      } else {
        return await companyApi.updateProfile(data);
      }
    },
    onSuccess: () => {
      const queryKey = profileType === 'graduate' ? ['graduateProfile'] : ['companyProfile'];
      queryClient.invalidateQueries({ queryKey });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: Record<string, unknown> = {};

    if (profileType === 'graduate') {
      // Graduate-specific data transformation
      updateData.firstName = formData.firstName.trim();
      updateData.lastName = formData.lastName.trim();
      updateData.location = formData.location.trim() || undefined;
      updateData.summary = formData.summary.trim() || undefined;
      updateData.portfolio = formData.portfolio.trim() || undefined;

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
    } else {
      // Company-specific data transformation
      updateData.companyName = formData.companyName.trim();
      updateData.industry = formData.industry.trim();
      updateData.location = formData.location.trim() || undefined;
      updateData.website = formData.website.trim() || undefined;
      updateData.description = formData.description.trim() || undefined;

      if (formData.companySize) {
        const size = parseInt(formData.companySize, 10);
        if (!isNaN(size) && size > 0) {
          updateData.companySize = size;
        }
      }
    }

    updateMutation.mutate(updateData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Group fields by section
  const groupedFields = useMemo(() => {
    const groups: Record<string, FieldConfig[]> = { main: [] };
    
    fields.forEach((field) => {
      const section = field.section || 'main';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(field);
    });
    
    return groups;
  }, [fields]);

  // Modal configuration
  const modalConfig = useMemo(() => {
    if (profileType === 'graduate') {
      return {
        title: 'Edit Profile',
        description: 'Update your personal information and professional details',
      };
    } else {
      return {
        title: 'Edit Company Profile',
        description: 'Update your company information and details',
      };
    }
  }, [profileType]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col gap-[24px]">
        <div>
          <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
            {modalConfig.title}
          </h2>
          <p className="text-[14px] text-[#1C1C1C80] mt-[4px]">
            {modalConfig.description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[20px]">
          {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
            <div key={sectionName}>
              {/* Section Header (for non-main sections) */}
              {sectionName !== 'main' && (
                <div className="border-t border-fade pt-[20px] mb-[16px]">
                  <p className="text-[16px] font-semibold text-[#1C1C1C] mb-[16px]">
                    {sectionName}
                  </p>
                </div>
              )}

              {/* Render fields in grid or single column */}
              <div className="flex flex-col gap-[20px]">
                {(() => {
                  const renderedFields: JSX.Element[] = [];
                  let i = 0;
                  
                  while (i < sectionFields.length) {
                    const field = sectionFields[i];
                    const fieldValue = formData[field.name] || '';
                    
                    // Handle textarea fields (always full width)
                    if (field.type === 'textarea') {
                      renderedFields.push(
                        <FormField key={field.name} label={field.label} required={field.required}>
                          <Textarea
                            value={fieldValue}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            rows={field.rows || 4}
                            required={field.required}
                          />
                        </FormField>
                      );
                      i++;
                      continue;
                    }
                    
                    // Check if we should create a grid pair
                    const nextField = sectionFields[i + 1];
                    const shouldPair = field.gridCols === 2 && nextField && nextField.gridCols === 2 && nextField.type !== 'textarea';
                    
                    if (shouldPair) {
                      // Render two fields in a grid
                      renderedFields.push(
                        <div key={`${field.name}-pair`} className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                          <FormField label={field.label} required={field.required}>
                            <Input
                              type={field.type}
                              value={fieldValue}
                              onChange={(e) => handleChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              required={field.required}
                            />
                          </FormField>
                          <FormField label={nextField.label} required={nextField.required}>
                            <Input
                              type={nextField.type}
                              value={formData[nextField.name] || ''}
                              onChange={(e) => handleChange(nextField.name, e.target.value)}
                              placeholder={nextField.placeholder}
                              required={nextField.required}
                            />
                          </FormField>
                        </div>
                      );
                      i += 2; // Skip both fields
                    } else {
                      // Render single field
                      renderedFields.push(
                        <FormField key={field.name} label={field.label} required={field.required}>
                          <Input
                            type={field.type}
                            value={fieldValue}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                          />
                        </FormField>
                      );
                      i++;
                    }
                  }
                  
                  return renderedFields;
                })()}
              </div>
            </div>
          ))}

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

export default ProfileEditModal;

