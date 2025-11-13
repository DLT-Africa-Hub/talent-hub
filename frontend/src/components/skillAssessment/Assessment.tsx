import React, { useState } from "react";

interface Question {
  question: string;
  options: string[];
  answer: string;
}

const Assessment: React.FC = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const questions: Question[] = [
    {
      question: "What does HTML stand for?",
      options: [
        "Hyper Text Markup Language",
        "HighText Machine Language",
        "Hyperlink and Text Markup Language",
        "Home Tool Markup Language",
      ],
      answer: "Hyper Text Markup Language",
    },
    {
      question: "Which of the following is a JavaScript framework?",
      options: ["Laravel", "React", "Django", "Flask"],
      answer: "React",
    },
    {
      question: "What is the default port for HTTP?",
      options: ["8080", "443", "80", "3000"],
      answer: "80",
    },
    {
      question: "Which of these is used to style a webpage?",
      options: ["CSS", "HTML", "Python", "C++"],
      answer: "CSS",
    },
    {
      question: "What does SQL stand for?",
      options: [
        "Structured Query Language",
        "Simple Query Language",
        "Standard Question Language",
        "System Query Language",
      ],
      answer: "Structured Query Language",
    },
  ];

  const totalSteps = questions.length;

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

  const handleSubmit = () => {
    setShowResults(true);
  };

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

  const currentQuestion = questions[step];
  const selectedOption = answers[step];
  const isLastQuestion = step === totalSteps - 1;

  // Results Screen
  if (showResults) {
    const score = calculateScore();
    const passed = score.percentage >= 60;

    return (
      <div className="flex justify-between items-center h-full pb-20 md:justify-center w-full flex-col md:gap-[70px] font-inter">
        <div className="flex flex-col w-full h-full justify-between lg:gap-[40px] items-center">
          <div className="flex flex-col w-full  max-w-[226px]  gap-2.5 text-left md:text-center">
          {passed
                  ? (<img src="/congrats.png" className="object-cover w-full h-full " alt="pass symbol" />)
                  : (<img src="/fail.png" className="object-cover w-full h-full " alt="fail symbol" />)}
            
            
          </div>

          <div className="flex flex-col gap-5 w-full max-w-[542px] text-center">
          {passed
                  ? (
                  <div className="flex flex-col gap-2.5">
                      <p className="text-[#1C1C1C] text-[32px] font-semibold">
                        Congratulations!
                      </p>
                      <p className="font-normal text-[18px] text-[#1C1C1CBF]">
                        You passed the assessment and you got {score.percentage}% of the total score
                      </p>
                  </div>
                  )
                  : (
                    <div className="flex flex-col gap-2.5">
                    <p className="text-[#1C1C1C] text-[32px] font-semibold">
                    Almost there!
                    </p>
                    <p className="font-normal text-[18px] text-[#1C1C1CBF]">
                    You got {score.percentage}%, you need 60% to pass. But don’t worry you can try again
                    </p>
                </div>
                  )}
          </div>

          <button className="bg-button w-full max-w-[400px] py-[18px] rounded-[10px] text-[#F8F8F8] text-[16px] font-medium">
                    {passed ? "Go to Dashboard":"Try gain"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center h-full pb-20 md:justify-center w-full flex-col md:gap-[70px] font-inter">
      {/* ✅ Progress Bar */}
      <div className="w-full flex flex-col gap-[30px]">
        <div className="flex flex-col md:items-center gap-2.5 w-full">
          <p className="text-left text-[#1C1C1CBF] text-[18px] font-normal">
            Question {step + 1} of {totalSteps}
          </p>

          <div className="h-[10px] w-full md:w-[542px] bg-[#D9D9D9] rounded-full overflow-hidden">
            <div
              className="h-full bg-button transition-all duration-500 ease-in-out"
              style={{
                width: `${((step + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col w-full gap-2.5 text-left md:text-center">
          <h2 className="font-semibold text-[32px] text-[#1C1C1C]">
            {currentQuestion.question}
          </h2>
        </div>
      </div>

      {/* ✅ Options */}
      <div className="flex flex-col gap-2.5 justify-center items-center w-full">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedOption === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleSelectOption(option)}
              className={`flex items-center border-[1px] p-5 gap-2.5 rounded-xl w-full max-w-[542px] justify-start transition-all duration-200 ${
                isSelected
                  ? "border-button bg-[#F0F5FF]"
                  : "border-fade bg-white"
              }`}
            >
              <div
                className={`rounded-full h-5 w-5 p-1 border-[1px] flex items-center justify-center ${
                  isSelected ? "border-button" : "border-fade"
                }`}
              >
                {isSelected && (
                  <div className="h-full w-full bg-button rounded-full" />
                )}
              </div>
              <p className="text-[#1C1C1C]">{option}</p>
            </button>
          );
        })}
      </div>

      {/* ✅ Navigation Buttons */}
      <div className="flex justify-between w-full max-w-[542px] gap-4">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className={`rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 flex-1 ${
            step === 0
              ? "bg-fade text-[#F8F8F8] cursor-not-allowed border-[1px] border-transparent"
              : "border-[1px] border-button text-button bg-white hover:bg-[#F0F4F9]"
          }`}
        >
          Previous
        </button>

        <button
          onClick={isLastQuestion ? handleSubmit : nextStep}
          disabled={!selectedOption}
          className={`rounded-[10px] text-[16px] p-[18px] font-medium transition-all duration-200 flex-1 ${
            !selectedOption
              ? "bg-fade text-[#F8F8F8] cursor-not-allowed"
              : "bg-button text-[#F8F8F8] hover:bg-[#A9B9D3]"
          }`}
        >
          {isLastQuestion ? "Submit" : "Next"}
        </button>
      </div>
    </div>
  );
};

export default Assessment;
