import { useState, useEffect } from 'react';
import { HiOutlineDocumentText, HiSparkles } from 'react-icons/hi2';

interface CoverLetterStepProps {
  companyName: string;
  jobRole: string;
  onBack: () => void;
  onNext: (coverLetter: string, isAIGenerated: boolean) => void;
  initialCoverLetter?: string;
  initialIsAIGenerated?: boolean;
}

const CoverLetterStep: React.FC<CoverLetterStepProps> = ({ 
  companyName, 
  jobRole, 
  onBack, 
  onNext,
  initialCoverLetter,
  initialIsAIGenerated 
}) => {
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [useAI, setUseAI] = useState(initialIsAIGenerated || false);

  useEffect(() => {
    if (initialCoverLetter) {
      setCoverLetter(initialCoverLetter);
      setUseAI(initialIsAIGenerated || false);
    }
  }, [initialCoverLetter, initialIsAIGenerated]);

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setUseAI(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generatedLetter = `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobRole} position at ${companyName}. With my background in software development and passion for creating innovative solutions, I am excited about the opportunity to contribute to your team.

Throughout my career, I have developed strong technical skills and a deep understanding of modern development practices. I am particularly drawn to ${companyName} because of your commitment to excellence and innovation in the industry. Your recent projects and company culture align perfectly with my professional values and career aspirations.

I am confident that my technical expertise, problem-solving abilities, and collaborative approach would make me a valuable addition to your team. I am eager to bring my skills and enthusiasm to ${companyName} and contribute to your continued success.

I would welcome the opportunity to discuss how my background and skills would benefit your team. Thank you for considering my application.

Sincerely,
[Your Name]`;

      setCoverLetter(generatedLetter);
    } catch (error) {
      console.error('Error generating cover letter:', error);
      alert('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (coverLetter.trim()) {
      onNext(coverLetter, useAI);
    }
  };

  const isNextDisabled = !coverLetter.trim() || isGenerating;
  const charCount = coverLetter.length;
  const wordCount = coverLetter.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-[24px] text-[#1C1C1C]">
          Cover Letter
        </h2>
        <p className="text-[14px] text-[#1C1C1CBF]">
          Write a compelling cover letter for {jobRole} at {companyName}
        </p>
      </div>

      {/* AI Generation Option */}
      <div className="p-4 rounded-[12px] bg-gradient-to-br from-button/5 to-button/10 border border-button/20">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-[40px] h-[40px] rounded-[10px] bg-button/10 flex-shrink-0">
            <HiSparkles className="text-[20px] text-button" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-[14px] text-[#1C1C1C] mb-1">
              AI-Powered Cover Letter
            </p>
            <p className="text-[12px] text-[#1C1C1CBF] mb-3">
              Let AI generate a professional cover letter tailored to this position. You can edit it afterwards.
            </p>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-[8px] text-[14px] font-medium transition-all ${
                isGenerating
                  ? 'bg-button/50 text-white cursor-not-allowed'
                  : 'bg-button text-white hover:bg-button/90 hover:scale-105'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <HiSparkles className="text-[16px]" />
                  Generate with AI
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-[1px] bg-fade" />
        <span className="text-[14px] text-[#1C1C1CBF]">OR</span>
        <div className="flex-1 h-[1px] bg-fade" />
      </div>

      {/* Manual Input */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-[16px] text-[#1C1C1C]">
            Write Your Own
          </p>
          <div className="text-[12px] text-[#1C1C1CBF]">
            {wordCount} words • {charCount} characters
          </div>
        </div>
        
        <div className="relative">
          <textarea
            value={coverLetter}
            onChange={(e) => {
              setCoverLetter(e.target.value);
              if (e.target.value && !isGenerating) setUseAI(false);
            }}
            placeholder="Dear Hiring Manager,

I am writing to express my interest in the position at your company...

[Write your cover letter here. A good cover letter should be:
- Personalized to the company and role
- Highlight your relevant skills and experience
- Express enthusiasm for the opportunity
- Be concise and professional (300-500 words recommended)]"
            disabled={isGenerating}
            className={`w-full min-h-[300px] p-4 rounded-[12px] border-2 border-fade bg-[#F8F8F8] text-[14px] text-[#1C1C1C] resize-y focus:outline-none focus:border-button focus:bg-white transition-all ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ fontFamily: 'inherit' }}
          />
          {coverLetter && (
            <div className="absolute top-2 right-2">
              <HiOutlineDocumentText className="text-[20px] text-button/50" />
            </div>
          )}
        </div>

        {/* Writing Tips */}
        {!coverLetter && (
          <div className="p-3 rounded-[10px] bg-blue-50 border border-blue-200">
            <p className="text-[12px] font-medium text-blue-900 mb-2">
              💡 Cover Letter Tips:
            </p>
            <ul className="text-[11px] text-blue-800 space-y-1 ml-4">
              <li>• Address the hiring manager by name if possible</li>
              <li>• Explain why you're interested in this specific role</li>
              <li>• Highlight 2-3 relevant achievements or skills</li>
              <li>• Show enthusiasm for the company and its mission</li>
              <li>• Keep it concise - aim for 300-500 words</li>
              <li>• Proofread for grammar and spelling errors</li>
            </ul>
          </div>
        )}
      </div>

      {/* Character Limit Warning */}
      {charCount > 3000 && (
        <div className="p-3 rounded-[10px] bg-amber-50 border border-amber-200">
          <p className="text-[12px] text-amber-800">
            ⚠️ Your cover letter is quite long. Consider keeping it under 3000 characters for better readability.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className={`flex-1 py-3 px-6 rounded-[10px] border-2 font-semibold text-[16px] transition-all ${
            isGenerating
              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
              : 'border-button text-button hover:bg-button/5'
          }`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`flex-1 py-3 px-6 rounded-[10px] font-semibold text-[16px] transition-all ${
            isNextDisabled
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

export default CoverLetterStep;