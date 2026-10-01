// import { useEffect, useState } from "react";
// import "./Assessment.css";
// import {
//   Link,
//   useNavigate,
//   useParams,
// } from "react-router-dom";

// import {
//   createAssessmentSession,
//   getAssessment,
//   submitAssessment,
// } from "../services/api";

// function Assessment() {
//   const { skillId, assessmentId } = useParams();
//   const navigate = useNavigate();

//   const isRetest = Boolean(assessmentId);

//   const [assessment, setAssessment] = useState(null);

//   const [currentQuestionIndex, setCurrentQuestionIndex] =
//     useState(0);

//   const [answers, setAnswers] = useState({});

//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     async function loadAssessment() {
//       try {
//         setLoading(true);
//         setError("");

//         let data;

//         if (isRetest) {
//           // A targeted re-test already exists.
//           // Load that existing assessment.
//           data = await getAssessment(
//             Number(assessmentId),
//           );
//         } else {
//           // Normal assessment flow:
//           // create a new assessment for the skill.
//           data = await createAssessmentSession(
//             Number(skillId),
//           );
//         }

//         setAssessment(data);
//       } catch (error) {
//         console.error(
//           "Failed to load assessment:",
//           error,
//         );

//         setError(
//           error.message ||
//             "Unable to load the assessment. Please make sure the backend is running.",
//         );
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadAssessment();
//   }, [skillId, assessmentId, isRetest]);

//   if (loading) {
//     return (
//       <main className="dashboard">
//         <p>
//           {isRetest
//             ? "Preparing your targeted re-test..."
//             : "Preparing your assessment..."}
//         </p>
//       </main>
//     );
//   }

//   if (error) {
//     return (
//       <main className="dashboard">
//         <p>{error}</p>

//         <Link
//           to={
//             isRetest
//               ? `/assessments/${assessmentId}/gaps`
//               : `/skills/${skillId}`
//           }
//           className="back-link"
//         >
//           ← Back
//         </Link>
//       </main>
//     );
//   }

//   if (
//     !assessment ||
//     !assessment.questions ||
//     assessment.questions.length === 0
//   ) {
//     return (
//       <main className="dashboard">
//         <p>
//           {isRetest
//             ? "This targeted re-test was created, but no questions were generated yet."
//             : "No questions are available for this assessment."}
//         </p>

//         {isRetest ? (
//           <Link
//             to={`/assessments/${assessmentId}/gaps`}
//             className="back-link"
//           >
//             ← Back to Skill Gap Analysis
//           </Link>
//         ) : (
//           <Link
//             to={`/skills/${skillId}`}
//             className="back-link"
//           >
//             ← Back to Skill
//           </Link>
//         )}
//       </main>
//     );
//   }

//   const questions = assessment.questions;

//   const currentQuestion =
//     questions[currentQuestionIndex];

//   const selectedAnswer =
//     answers[currentQuestion.id];

//   const progress =
//     ((currentQuestionIndex + 1) /
//       questions.length) *
//     100;

//   function handleAnswerSelect(optionId) {
//     setAnswers((previousAnswers) => ({
//       ...previousAnswers,
//       [currentQuestion.id]: optionId,
//     }));
//   }

//   function handleNext() {
//     if (
//       currentQuestionIndex <
//       questions.length - 1
//     ) {
//       setCurrentQuestionIndex(
//         (previousIndex) =>
//           previousIndex + 1,
//       );
//     }
//   }

//   function handlePrevious() {
//     if (currentQuestionIndex > 0) {
//       setCurrentQuestionIndex(
//         (previousIndex) =>
//           previousIndex - 1,
//       );
//     }
//   }

//   async function handleSubmit() {
//     if (submitting) {
//       return;
//     }

//     const unansweredQuestions =
//       questions.filter(
//         (question) =>
//           answers[question.id] === undefined,
//       );

//     if (unansweredQuestions.length > 0) {
//       setError(
//         `Please answer all questions before submitting. ${unansweredQuestions.length} question(s) remaining.`,
//       );

//       return;
//     }

//     try {
//       setSubmitting(true);
//       setError("");

//       const formattedAnswers =
//         questions.map((question) => ({
//           question_id: question.id,
//           selected_option_id:
//             answers[question.id],
//         }));

//       const result = await submitAssessment(
//         assessment.id,
//         formattedAnswers,
//       );

//       navigate(
//         `/assessments/${assessment.id}/results`,
//         {
//           state: result,
//         },
//       );
//     } catch (error) {
//       console.error(
//         "Failed to submit assessment:",
//         error,
//       );

//       setError(
//         error.message ||
//           "Unable to submit the assessment. Please try again.",
//       );

//       setSubmitting(false);
//     }
//   }

//   return (
//     <main className="dashboard assessment-page">
//       <div className="assessment-top">
//         <div>
//           <p className="eyebrow">
//             {isRetest
//               ? "TARGETED RE-TEST"
//               : "SKILL ASSESSMENT"}
//           </p>

//           <h1>
//             {assessment.title ||
//               "Diagnostic Assessment"}
//           </h1>
//         </div>

//         <Link
//           to={
//             isRetest
//               ? `/assessments/${assessmentId}/gaps`
//               : `/skills/${skillId}`
//           }
//           className="back-link"
//         >
//           Exit Assessment
//         </Link>
//       </div>

//       <div className="assessment-progress-header">
//         <span>
//           Question{" "}
//           {currentQuestionIndex + 1} of{" "}
//           {questions.length}
//         </span>

//         <span>
//           {Math.round(progress)}%
//         </span>
//       </div>

//       <div className="assessment-progress-track">
//         <div
//           className="assessment-progress-bar"
//           style={{
//             width: `${progress}%`,
//           }}
//         />
//       </div>

//       {error && (
//         <div className="assessment-error">
//           {error}
//         </div>
//       )}

//       <section className="question-card">
//         <div className="question-meta">
//           <span>
//             Sub-topic ID:{" "}
//             {currentQuestion.subtopic_id}
//           </span>

//           <span>
//             {currentQuestion.difficulty ||
//               "Medium"}
//           </span>
//         </div>

//         <h2>
//           {currentQuestion.question_text}
//         </h2>

//         <div className="answer-options">
//           {currentQuestion.options.map(
//             (option, index) => {
//               const isSelected =
//                 selectedAnswer === option.id;

//               return (
//                 <button
//                   key={option.id}
//                   type="button"
//                   className={`answer-option ${
//                     isSelected
//                       ? "selected"
//                       : ""
//                   }`}
//                   onClick={() =>
//                     handleAnswerSelect(
//                       option.id,
//                     )
//                   }
//                   disabled={submitting}
//                 >
//                   <span className="answer-letter">
//                     {String.fromCharCode(
//                       65 + index,
//                     )}
//                   </span>

//                   <span>
//                     {option.option_text}
//                   </span>
//                 </button>
//               );
//             },
//           )}
//         </div>
//       </section>

//       <div className="assessment-navigation">
//         <button
//           type="button"
//           className="secondary-button"
//           onClick={handlePrevious}
//           disabled={
//             currentQuestionIndex === 0 ||
//             submitting
//           }
//         >
//           ← Previous
//         </button>

//         {currentQuestionIndex ===
//         questions.length - 1 ? (
//           <button
//             type="button"
//             className="assessment-submit-button"
//             onClick={handleSubmit}
//             disabled={submitting}
//           >
//             {submitting
//               ? "Submitting..."
//               : isRetest
//                 ? "Submit Re-test"
//                 : "Submit Assessment"}
//           </button>
//         ) : (
//           <button
//             type="button"
//             className="skill-button assessment-next-button"
//             onClick={handleNext}
//             disabled={
//               selectedAnswer === undefined ||
//               submitting
//             }
//           >
//             Next →
//           </button>
//         )}
//       </div>
//     </main>
//   );
// }

// export default Assessment;

import { useEffect, useState } from "react";
import "./Assessment.css";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createAssessmentSession,
  getAssessment,
  submitAssessment,
} from "../services/api";

function Assessment() {
  const { skillId, assessmentId } = useParams();
  const navigate = useNavigate();

  const isRetest = Boolean(assessmentId);

  const [assessment, setAssessment] = useState(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] =
    useState(0);

  const [answers, setAnswers] = useState({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Controls the unanswered-questions modal
  const [showIncompleteModal, setShowIncompleteModal] =
    useState(false);

  const [unansweredCount, setUnansweredCount] =
    useState(0);

  useEffect(() => {
    async function loadAssessment() {
      try {
        setLoading(true);
        setError("");

        let data;

        if (isRetest) {
          data = await getAssessment(
            Number(assessmentId),
          );
        } else {
          data = await createAssessmentSession(
            Number(skillId),
          );
        }

        setAssessment(data);
      } catch (error) {
        console.error(
          "Failed to load assessment:",
          error,
        );

        setError(
          error.message ||
            "Unable to load the assessment. Please make sure the backend is running.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssessment();
  }, [skillId, assessmentId, isRetest]);

  if (loading) {
    return (
      <main className="dashboard">
        <p>
          {isRetest
            ? "Preparing your targeted re-test..."
            : "Preparing your assessment..."}
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard">
        <p>{error}</p>

        <Link
          to={
            isRetest
              ? `/assessments/${assessmentId}/gaps`
              : `/skills/${skillId}`
          }
          className="back-link"
        >
          ← Back
        </Link>
      </main>
    );
  }

  if (
    !assessment ||
    !assessment.questions ||
    assessment.questions.length === 0
  ) {
    return (
      <main className="dashboard">
        <p>
          {isRetest
            ? "This targeted re-test was created, but no questions were generated yet."
            : "No questions are available for this assessment."}
        </p>

        {isRetest ? (
          <Link
            to={`/assessments/${assessmentId}/gaps`}
            className="back-link"
          >
            ← Back to Skill Gap Analysis
          </Link>
        ) : (
          <Link
            to={`/skills/${skillId}`}
            className="back-link"
          >
            ← Back to Skill
          </Link>
        )}
      </main>
    );
  }

  const questions = assessment.questions;

  const currentQuestion =
    questions[currentQuestionIndex];

  const selectedAnswer =
    answers[currentQuestion.id];

  const progress =
    ((currentQuestionIndex + 1) /
      questions.length) *
    100;

  const answeredCount =
    Object.keys(answers).length;

  const allQuestionsAnswered =
    answeredCount === questions.length;

  function handleAnswerSelect(optionId) {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentQuestion.id]: optionId,
    }));

    // Clear any previous page-level error
    setError("");
  }

  function handleQuestionNavigation(index) {
    if (submitting) {
      return;
    }

    setCurrentQuestionIndex(index);
    setError("");
  }

  function handleNext() {
    if (
      currentQuestionIndex <
      questions.length - 1
    ) {
      setCurrentQuestionIndex(
        (previousIndex) =>
          previousIndex + 1,
      );

      setError("");
    }
  }

  function handlePrevious() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(
        (previousIndex) =>
          previousIndex - 1,
      );

      setError("");
    }
  }

  function closeIncompleteModal() {
    setShowIncompleteModal(false);
  }

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    const unansweredQuestions =
      questions.filter(
        (question) =>
          answers[question.id] === undefined,
      );

    // -----------------------------------------------------
    // If questions are unanswered:
    // Stay on the same page and show the modal.
    // -----------------------------------------------------
    if (unansweredQuestions.length > 0) {
      setUnansweredCount(
        unansweredQuestions.length,
      );

      setShowIncompleteModal(true);

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const formattedAnswers =
        questions.map((question) => ({
          question_id: question.id,
          selected_option_id:
            answers[question.id],
        }));

      const result = await submitAssessment(
        assessment.id,
        formattedAnswers,
      );

      navigate(
        `/assessments/${assessment.id}/results`,
        {
          state: result,
        },
      );
    } catch (error) {
      console.error(
        "Failed to submit assessment:",
        error,
      );

      setError(
        error.message ||
          "Unable to submit the assessment. Please try again.",
      );

      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard assessment-page">

      {/* =====================================================
          Assessment Header
      ===================================================== */}

      <div className="assessment-top">
        <div>
          <p className="eyebrow">
            {isRetest
              ? "TARGETED RE-TEST"
              : "SKILL ASSESSMENT"}
          </p>

          <h1>
            {assessment.title ||
              "Diagnostic Assessment"}
          </h1>
        </div>

        <Link
          to={
            isRetest
              ? `/assessments/${assessmentId}/gaps`
              : `/skills/${skillId}`
          }
          className="back-link"
        >
          Exit Assessment
        </Link>
      </div>

      {/* =====================================================
          Progress
      ===================================================== */}

      <div className="assessment-progress-header">
        <span>
          Question{" "}
          {currentQuestionIndex + 1} of{" "}
          {questions.length}
        </span>

        <span>
          {Math.round(progress)}%
        </span>
      </div>

      <div className="assessment-progress-track">
        <div
          className="assessment-progress-bar"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {/* =====================================================
          Page Error
      ===================================================== */}

      {error && (
        <div className="assessment-error">
          {error}
        </div>
      )}

      {/* =====================================================
          Main Assessment Content
      ===================================================== */}

      <div className="assessment-content">

        {/* ===================================================
            Question Card
        =================================================== */}

        <section className="question-card">

          <div className="question-meta">
            <span>
              Sub-topic ID:{" "}
              {currentQuestion.subtopic_id}
            </span>

            <span>
              {currentQuestion.difficulty ||
                "Medium"}
            </span>
          </div>

          <h2>
            {currentQuestion.question_text}
          </h2>

          <div className="answer-options">
            {currentQuestion.options.map(
              (option, index) => {
                const isSelected =
                  selectedAnswer === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`answer-option ${
                      isSelected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleAnswerSelect(
                        option.id,
                      )
                    }
                    disabled={submitting}
                  >
                    <span className="answer-letter">
                      {String.fromCharCode(
                        65 + index,
                      )}
                    </span>

                    <span>
                      {option.option_text}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {/* =================================================
              Question Navigation
          ================================================= */}

          <div className="assessment-navigation">

            <button
              type="button"
              className="secondary-button"
              onClick={handlePrevious}
              disabled={
                currentQuestionIndex === 0 ||
                submitting
              }
            >
              ← Previous
            </button>

            {currentQuestionIndex ===
            questions.length - 1 ? (

              /*
               * IMPORTANT:
               * Submit is NOT disabled when questions
               * are unanswered.
               *
               * Clicking Submit will open the modal.
               */
              <button
                type="button"
                className="assessment-submit-button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : isRetest
                    ? "Submit Re-test"
                    : "Submit Assessment"}
              </button>

            ) : (

              /*
               * Next is allowed even when the current
               * question is unanswered.
               *
               * This allows free navigation.
               */
              <button
                type="button"
                className="skill-button assessment-next-button"
                onClick={handleNext}
                disabled={submitting}
              >
                Next →
              </button>

            )}
          </div>
        </section>

        {/* ===================================================
            Question Navigator
        =================================================== */}

        <aside className="question-navigator">

          <div className="question-navigator-header">

            <p className="eyebrow">
              QUESTION NAVIGATOR
            </p>

            <h2>
              {questions.length} Questions
            </h2>

          </div>

          <div className="question-number-grid">

            {questions.map(
              (question, index) => {

                const isCurrent =
                  index ===
                  currentQuestionIndex;

                const isAnswered =
                  answers[question.id] !==
                  undefined;

                return (
                  <button
                    key={question.id}
                    type="button"
                    className={`question-number ${
                      isCurrent
                        ? "current"
                        : ""
                    } ${
                      isAnswered
                        ? "answered"
                        : ""
                    }`}
                    onClick={() =>
                      handleQuestionNavigation(
                        index,
                      )
                    }
                    disabled={submitting}
                    aria-label={`Go to question ${
                      index + 1
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              },
            )}

          </div>

          {/* =================================================
              Navigator Legend
          ================================================= */}

          <div className="question-navigator-legend">

            <div className="navigator-legend-item">
              <span className="legend-box current" />
              <span>Current</span>
            </div>

            <div className="navigator-legend-item">
              <span className="legend-box answered" />
              <span>Answered</span>
            </div>

            <div className="navigator-legend-item">
              <span className="legend-box unanswered" />
              <span>Not answered</span>
            </div>

          </div>

          {/* =================================================
              Answer Summary
          ================================================= */}

          <div className="navigator-summary">

            <strong>
              {answeredCount} /{" "}
              {questions.length}
            </strong>

            <span>
              questions answered
            </span>

          </div>

        </aside>
      </div>

      {/* =====================================================
          INCOMPLETE ASSESSMENT MODAL
          
          This stays on the SAME assessment page.
          No navigation occurs.
      ===================================================== */}

      {showIncompleteModal && (
        <div
          className="assessment-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assessment-modal-title"
        >
          <div className="assessment-modal">

            <div className="assessment-modal-icon">
              !
            </div>

            <h2 id="assessment-modal-title">
              Assessment Incomplete
            </h2>

            <p>
              Please answer all questions
              before submitting.
            </p>

            <p className="assessment-modal-count">
              {unansweredCount}{" "}
              {unansweredCount === 1
                ? "question is"
                : "questions are"}{" "}
              still unanswered.
            </p>

            <p className="assessment-modal-hint">
              Use the question navigator to
              jump to any unanswered question.
            </p>

            <button
              type="button"
              className="assessment-modal-button"
              onClick={closeIncompleteModal}
            >
              OK
            </button>

          </div>
        </div>
      )}

    </main>
  );
}

export default Assessment;