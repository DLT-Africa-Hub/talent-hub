import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { graduateApi } from '../../api/graduate';
import { LoadingSpinner } from '../../index';
import { ApiError } from '../../types/api';

interface AssessmentQuestionResponse {
  question: string;
  options: string[];
  answer: string;
  skill?: string;
}

interface Question {
  question: string;
  options: string[];
  answer: string;
  skill?: string;
}

const Assessment: React.FC = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [backendScore, setBackendScore] = useState<number | undefined>(
    undefined
  );
  const [backendPassed, setBackendPassed] = useState<boolean | undefined>(
    undefined
  );
  // const [attempt, setAttempt] = useState(1); // Reserved for future retake functionality
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const token =
        typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
      if (!token) {
        setError('Authentication required. Please log in again.');
        navigate('/login', { replace: true });
        return;
      }

      const response = await graduateApi.getAssessmentQuestions();
      const transformedQuestions: Question[] = response.questions.map(
        (q: AssessmentQuestionResponse) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          skill: q.skill,
        })
      );
      setQuestions(transformedQuestions);
      setAnswers([]);
      setStep(0);
      setShowResults(false);
      setBackendScore(undefined);
      setBackendPassed(undefined);
      setTimeRemaining(60);
      setTimerActive(true);
    } catch (err) {
      const error = err as ApiError;
      const errorMessage =
        error.response?.data?.message ||
        'Failed to load questions. Please try again.';
      setError(errorMessage);

      if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }

      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleSubmit = useCallback(
    async (forceSubmit = false) => {
      setTimerActive(false);

      const allAnswers: string[] = questions.map((_, index) => {
        const answer = answers[index];
        return answer && typeof answer === 'string' ? answer.trim() : '';
      });

      // Only validate if not forcing submit (i.e., when time elapses)
      if (!forceSubmit) {
        const unansweredCount = allAnswers.filter((a) => a === '').length;
        if (unansweredCount > 0) {
          setError(
            `Please answer all ${questions.length} questions before submitting. ${unansweredCount} question(s) remaining.`
          );
          return;
        }

        if (allAnswers.length === 0) {
          setError('No answers to submit. Please answer the questions first.');
          return;
        }
      }

      // Filter out empty answers for submission
      const validAnswers = allAnswers.filter((a) => a !== '');

      try {
        // Submit with valid answers (even if incomplete when forceSubmit is true)
        const response = await graduateApi.submitAssessment({
          answers: validAnswers,
        });

        // Store the backend-calculated score and passed status
        if (typeof response.score === 'number') {
          setBackendScore(response.score);
        }
        if (typeof response.passed === 'boolean') {
          setBackendPassed(response.passed);
        }

        queryClient.invalidateQueries({
          queryKey: ['graduateProfile', 'assessment'],
        });

        // If force submit (time elapsed), restart assessment instead of showing results
        if (forceSubmit) {
          // Show a brief message that time elapsed, then restart
          setError('Time has elapsed. Assessment submitted. Restarting...');
          setTimeout(() => {
            setError(''); // Clear error message
            fetchQuestions();
          }, 1500);
        } else {
          setShowResults(true);
        }
      } catch (err) {
        const error = err as ApiError;
        // If force submit (time elapsed), restart assessment anyway
        if (forceSubmit) {
          setError('Time has elapsed. Restarting assessment...');
          setTimeout(() => {
            setError(''); // Clear error message
            fetchQuestions();
          }, 1500);
        } else {
          setError(
            error.response?.data?.message ||
              'Failed to submit assessment. Please try again.'
          );
        }
      }
    },
    [answers, questions, queryClient, fetchQuestions]
  );

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (!timerActive || showResults || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          // Auto submit when time runs out (force submit bypasses validation)
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, showResults, questions.length, handleSubmit]);

  const handleSelectOption = (option: string) => {
    const updatedAnswers = [...answers];
    updatedAnswers[step] = option;
    setAnswers(updatedAnswers);
  };

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleRetry = () => {
    setBackendScore(undefined);
    setBackendPassed(undefined);
    fetchQuestions();
  };

  const handleGoToDashboard = () => {
    navigate('/graduate');
  };

  // Prevent copying text
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+V, Ctrl+S, F12 (DevTools)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' ||
          e.key === 'C' ||
          e.key === 'a' ||
          e.key === 'A' ||
          e.key === 'x' ||
          e.key === 'X' ||
          e.key === 'v' ||
          e.key === 'V' ||
          e.key === 's' ||
          e.key === 'S')
      ) {
        e.preventDefault();
        return false;
      }
      // Prevent F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Prevent Ctrl+Shift+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.answer) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner message="Loading questions..." size="lg" />
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full gap-4">
        <p className="text-red-500 text-[18px]">{error}</p>
        <button
          onClick={fetchQuestions}
          className="bg-button text-white p-[18px] rounded-[10px]"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalSteps = questions.length;
  const currentQuestion = questions[step];
  const selectedOption = answers[step];
  const isLastQuestion = step === totalSteps - 1;

  if (showResults) {
    // Use backend score if available, otherwise fall back to local calculation
    const scorePercentage =
      backendScore !== undefined ? backendScore : calculateScore().percentage;
    const passed =
      backendPassed !== undefined ? backendPassed : scorePercentage >= 60;

    return (
      <div className="flex justify-between items-center h-full pb-20 md:justify-center w-full flex-col md:gap-[70px] font-inter">
        <div className="flex flex-col w-full h-full justify-between lg:gap-[40px] items-center">
          <div className="flex flex-col w-full  max-w-[226px]  gap-2.5 text-left md:text-center">
            {passed ? (
              <img
                src="/congrats.png"
                className="object-cover w-full h-full "
                alt="pass symbol"
              />
            ) : (
              <img
                src="/fail.png"
                className="object-cover w-full h-full "
                alt="fail symbol"
              />
            )}
          </div>

          <div className="flex flex-col gap-5 w-full max-w-[542px] text-center">
            {passed ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-[#1C1C1C] text-[32px] font-semibold">
                  Congratulations!
                </p>
                <p className="font-normal text-[18px] text-[#1C1C1CBF]">
                  You passed the assessment and you got {scorePercentage}% of
                  the total score
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className="text-[#1C1C1C] text-[32px] font-semibold">
                  Almost there!
                </p>
                <p className="font-normal text-[18px] text-[#1C1C1CBF]">
                  You got {scorePercentage}%, you need 60% to pass. But
                  don&apos;t worry you can try again
                </p>
              </div>
            )}
          </div>

          <button
            onClick={passed ? handleGoToDashboard : handleRetry}
            className="bg-button w-full max-w-[400px] py-[18px] rounded-[10px] text-[#F8F8F8] text-[16px] font-medium"
          >
            {passed ? 'Go to Dashboard' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start h-full pb-20 md:justify-center w-full flex-col md:gap-8 font-inter px-5 overflow-y-auto">
      {error && (
        <div className="text-red-500 text-sm text-center max-w-[542px] w-full mt-4">
          {error}
        </div>
      )}

      <div className="w-full flex flex-col gap-6 max-w-[542px] mx-auto mt-6">
        <div className="flex flex-col md:items-center gap-2.5 w-full">
          <div className="flex justify-between items-center w-full">
            <p className="text-left text-[#1C1C1CBF] text-[18px] font-normal">
              Question {step + 1} of {totalSteps}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[#1C1C1CBF] text-[16px] font-medium">
                Time:
              </span>
              <span
                className={`text-[18px] font-semibold ${
                  timeRemaining <= 10 ? 'text-red-500' : 'text-[#1C1C1C]'
                }`}
              >
                {Math.floor(timeRemaining / 60)}:
                {String(timeRemaining % 60).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="h-[10px] w-full md:w-[542px] bg-[#D9D9D9] rounded-full overflow-hidden">
            <div
              className="h-full bg-button transition-all duration-500 ease-in-out"
              style={{
                width: `${((step + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col w-full gap-2.5 text-left md:text-center max-w-[542px] mx-auto">
          <h2
            className="font-semibold text-[20px] md:text-[24px] text-[#1C1C1C] leading-relaxed wrap-break-word select-none"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {currentQuestion.question}
          </h2>
          {currentQuestion.skill && (
            <p
              className="text-[14px] text-[#1C1C1CBF] font-normal select-none"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              Skill: {currentQuestion.skill}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 justify-center items-center w-full max-w-[542px] mx-auto">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedOption === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleSelectOption(option)}
              className={`flex items-start border p-4 gap-3 rounded-xl w-full justify-start transition-all duration-200 hover:border-button/50 ${
                isSelected
                  ? 'border-button bg-[#F0F5FF]'
                  : 'border-fade bg-white'
              }`}
            >
              <div
                className={`rounded-full h-5 w-5 p-1 border flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? 'border-button' : 'border-fade'
                }`}
              >
                {isSelected && (
                  <div className="h-full w-full bg-button rounded-full" />
                )}
              </div>
              <p
                className="text-[#1C1C1C] text-[15px] leading-relaxed wrap-break-word text-left flex-1 select-none"
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                {option}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-start w-full max-w-[542px] gap-4 mx-auto">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className={`rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 ${
            step === 0
              ? 'bg-fade text-[#F8F8F8] cursor-not-allowed border border-transparent'
              : 'border border-button text-button bg-white hover:bg-[#F0F4F9]'
          }`}
        >
          Previous
        </button>

        <button
          onClick={isLastQuestion ? () => handleSubmit(false) : nextStep}
          disabled={!selectedOption}
          className={`rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 ${
            !selectedOption
              ? 'bg-fade text-[#F8F8F8] cursor-not-allowed'
              : 'bg-button text-[#F8F8F8] hover:bg-button/90'
          }`}
        >
          {isLastQuestion ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default Assessment;
