import { useState, useEffect } from 'react';
import { HiOutlineDocument, HiOutlineCheck } from 'react-icons/hi2';
import { HiOutlineUpload } from 'react-icons/hi';
import graduateApi from '../../api/graduate';

interface CV {
  _id: string;
  fileName: string;
  fileUrl: string;
  size: number;
  uploadedAt: string;
  onDisplay?: boolean;
}

interface CVSelectionStepProps {
  onBack: () => void;
  onNext: (selectedCV?: CV, newFile?: File) => void;
  selectedCVId?: string;
}

const CVSelectionStep: React.FC<CVSelectionStepProps> = ({
  onBack,
  onNext,
  selectedCVId,
}) => {
  const [selectedCV, setSelectedCV] = useState<string | null>(
    selectedCVId || null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingCVs, setExistingCVs] = useState<CV[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await graduateApi.getCVs();
      setExistingCVs(response.cvs || []);
    } catch (err) {
      console.error('Error fetching CVs:', err);
      setError('Failed to load your CVs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (
      !allowedMime.includes(file.type) &&
      !/\.(pdf|docx?|PDF|DOCX?)$/.test(file.name)
    ) {
      setError('Only PDF, DOC, and DOCX files are allowed');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError('Missing Cloudinary configuration');
      setIsUploading(false);
      return;
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'graduates/cvs');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = async () => {
      try {
        const resp = JSON.parse(xhr.responseText);
        if (
          xhr.status >= 200 &&
          xhr.status < 300 &&
          (resp.secure_url || resp.url)
        ) {
          const secureUrl = resp.secure_url || resp.url;
          const publicId = resp.public_id || resp.publicId;

          await graduateApi.addCV({
            fileName: file.name,
            fileUrl: secureUrl,
            size: file.size,
            publicId: publicId,
            onDisplay: existingCVs.length === 0,
          });

          await fetchCVs();

          setUploadedFile(file);
          setSelectedCV(null);

          e.target.value = '';
        } else {
          console.error('Cloudinary upload failed:', xhr.status, resp);
          setError(`Upload failed (${xhr.status})`);
        }
      } catch (err) {
        console.error('Invalid Cloudinary response', err, xhr.responseText);
        setError('Invalid response from Cloudinary');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    };

    xhr.onerror = () => {
      console.error('XHR error while uploading', xhr);
      setError('Network error during upload');
      setIsUploading(false);
      setUploadProgress(0);
    };

    xhr.send(formData);
  };

  const handleSelectCV = (cvId: string) => {
    setSelectedCV(cvId);
    setUploadedFile(null);
    setError(null);
  };

  const handleNext = () => {
    if (uploadedFile) {
      const latestCV = existingCVs[existingCVs.length - 1];
      onNext(latestCV, uploadedFile);
    } else if (selectedCV) {
      const cv = existingCVs.find((cv) => cv._id === selectedCV);
      onNext(cv);
    }
  };

  const isNextDisabled = !selectedCV && !uploadedFile;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-[24px] text-[#1C1C1C]">
          Select Your CV
        </h2>
        <p className="text-[14px] text-[#1C1C1CBF]">
          Choose an existing CV or upload a new one to continue with your
          application
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-[12px] bg-red-50 border border-red-200">
          <p className="text-[14px] text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-button"></div>
        </div>
      ) : (
        <>
          {/* Existing CVs */}
          {existingCVs.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="font-medium text-[16px] text-[#1C1C1C]">
                Your Saved CVs
              </p>
              <div className="flex flex-col gap-2">
                {existingCVs.map((cv) => (
                  <button
                    key={cv._id}
                    type="button"
                    onClick={() => handleSelectCV(cv._id)}
                    className={`flex items-center justify-between p-4 rounded-[12px] border-2 transition-all ${
                      selectedCV === cv._id
                        ? 'border-button bg-button/5'
                        : 'border-fade bg-[#F8F8F8] hover:border-button/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-[40px] h-[40px] rounded-[8px] ${
                          selectedCV === cv._id ? 'bg-button/10' : 'bg-white'
                        }`}
                      >
                        <HiOutlineDocument
                          className={`text-[20px] ${
                            selectedCV === cv._id
                              ? 'text-button'
                              : 'text-[#1C1C1C]'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col items-start">
                        <p className="font-medium text-[14px] text-[#1C1C1C]">
                          {cv.fileName}
                        </p>
                        <p className="text-[12px] text-[#1C1C1CBF]">
                          {formatDate(cv.uploadedAt)} •{' '}
                          {formatFileSize(cv.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cv.onDisplay && (
                        <span className="text-[10px] font-medium text-button bg-button/10 px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                      {selectedCV === cv._id && (
                        <div className="flex items-center justify-center w-[24px] h-[24px] rounded-full bg-button">
                          <HiOutlineCheck className="text-[16px] text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {existingCVs.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-fade" />
              <span className="text-[14px] text-[#1C1C1CBF]">OR</span>
              <div className="flex-1 h-px bg-fade" />
            </div>
          )}

          {/* Upload New CV */}
          <div className="flex flex-col gap-3">
            <p className="font-medium text-[16px] text-[#1C1C1C]">
              Upload New CV
            </p>
            <label
              htmlFor="cv-upload"
              className={`flex flex-col items-center justify-center p-8 rounded-[12px] border-2 border-dashed cursor-pointer transition-all ${
                uploadedFile
                  ? 'border-button bg-button/5'
                  : 'border-fade bg-[#F8F8F8] hover:border-button/30 hover:bg-button/5'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                type="file"
                id="cv-upload"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-[48px] h-[48px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-button"></div>
                  </div>
                  <p className="font-medium text-[14px] text-[#1C1C1C]">
                    Uploading... {uploadProgress}%
                  </p>
                  {uploadProgress > 0 && (
                    <div className="w-full max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-button transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-button/10">
                    <HiOutlineCheck className="text-[24px] text-button" />
                  </div>
                  <p className="font-medium text-[14px] text-[#1C1C1C]">
                    {uploadedFile.name}
                  </p>
                  <p className="text-[12px] text-[#1C1C1CBF]">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center w-[48px] h-[48px] rounded-full bg-button/10">
                    <HiOutlineUpload className="text-[24px] text-button" />
                  </div>
                  <p className="font-medium text-[14px] text-[#1C1C1C]">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-[12px] text-[#1C1C1CBF]">
                    PDF, DOC, or DOCX (max. 5MB)
                  </p>
                </div>
              )}
            </label>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isUploading}
          className={`flex-1 py-3 px-6 rounded-[10px] border-2 font-semibold text-[16px] transition-all ${
            isUploading
              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
              : 'border-button text-button hover:bg-button/5'
          }`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled || isLoading || isUploading}
          className={`flex-1 py-3 px-6 rounded-[10px] font-semibold text-[16px] transition-all ${
            isNextDisabled || isLoading || isUploading
              ? 'bg-button/50 text-white cursor-not-allowed'
              : 'bg-button text-white hover:bg-button/90 hover:scale-105'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default CVSelectionStep;
