import { useState, useEffect } from 'react';
import Modal from '../auth/Modal';
import { Button } from '../ui';
import RichTextEditor from '../ui/RichTextEditor';

interface JobDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (description: string) => void;
}

const JobDescriptionModal = ({
  isOpen,
  onClose,
  value,
  onChange,
}: JobDescriptionModalProps) => {
  const [description, setDescription] = useState(value);

  // Sync with parent value when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription(value);
    }
  }, [isOpen, value]);

  const handleSave = () => {
    onChange(description);
    onClose();
  };

  const handleCancel = () => {
    setDescription(value); // Reset to original value
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[24px] font-semibold text-[#1C1C1C]">
            Job Description
          </h2>
          <p className="text-[15px] text-[#1C1C1C80]">
            Add a detailed description of the role, responsibilities, and
            requirements. You can format the text using the toolbar above.
          </p>
        </div>

        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Describe the role, responsibilities, and requirements in detail..."
          // rows={12}
        />

        <div className="flex justify-end gap-3 pt-2 border-t border-fade">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            className="w-full md:w-auto md:min-w-[150px] mx-0"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            className="w-full md:w-auto md:min-w-[150px] mx-0"
          >
            Save Description
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default JobDescriptionModal;
