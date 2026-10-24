import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AddTopicModal from "../components/AddTopicModal";
import AddSubTopicModal from "../components/AddSubTopicModal";
import EditSkillModal from "../components/EditSkillModal";
import EditTopicModal from "../components/EditTopicModal";
import EditSubTopicModal from "../components/EditSubTopicModal";
import { useAuth } from "../context/AuthContext";
import "./SkillDetails.css";

import {
  getSkills,
  getTopicsBySkill,
  getSubTopicsByTopic,
  getLearningMaterials,
  generateQuestions,
  deleteAllQuestionsForSkill,
  deleteSkill,
  deleteTopic,
  deleteSubTopic,
} from "../services/api";

function SkillDetails() {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [skill, setSkill] = useState(null);
  const [topics, setTopics] = useState([]);

  const [loading, setLoading] = useState(true);
  const [generatingSubTopicId, setGeneratingSubTopicId] = useState(null);
  const [generationMessages, setGenerationMessages] = useState({});

  const [questionCount, setQuestionCount] = useState({});
  const [questionDifficulty, setQuestionDifficulty] = useState({});
  const [customInstructions, setCustomInstructions] = useState({});

  const [deletingQuestions, setDeletingQuestions] = useState(false);
  const [deletingSkill, setDeletingSkill] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [selectedTopicForSubTopic, setSelectedTopicForSubTopic] = useState(null);
  const [isEditingSkill, setIsEditingSkill] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingSubTopic, setEditingSubTopic] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSkillDetails() {
      try {
        setLoading(true);
        setError("");

        const skills = await getSkills();

        const foundSkill = skills.find(
          (item) => String(item.id) === String(skillId)
        );

        if (!foundSkill) {
          setError("Skill not found.");
          return;
        }

        setSkill(foundSkill);

        const topicData = await getTopicsBySkill(skillId);

        const topicsWithSubTopics = await Promise.all(
          topicData.map(async (topic) => {
            const subTopics = await getSubTopicsByTopic(topic.id);

            const subTopicsWithMaterials = await Promise.all(
              subTopics.map(async (subTopic) => {
                const materials = await getLearningMaterials(subTopic.id);

                return {
                  ...subTopic,
                  learningMaterials: materials,
                };
              })
            );

            return {
              ...topic,
              subTopics: subTopicsWithMaterials,
            };
          })
        );

        setTopics(topicsWithSubTopics);
      } catch (err) {
        console.error("Failed to load skill details:", err);

        setError(
          "Unable to load this skill. Please make sure the backend is running."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSkillDetails();
  }, [skillId]);

  function handleTopicCreated(newTopic) {
    setTopics((previous) => [
      ...previous,
      { ...newTopic, subTopics: [] },
    ]);
  }

  function handleSubTopicCreated(topicId, newSubTopic) {
    setTopics((previous) =>
      previous.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              subTopics: [
                ...topic.subTopics,
                { ...newSubTopic, learningMaterials: [] },
              ],
            }
          : topic
      )
    );
  }

  function handleCountChange(subTopicId, value) {
    const count = parseInt(value, 10);

    setQuestionCount((previous) => ({
      ...previous,
      [subTopicId]: Number.isNaN(count)
        ? 3
        : Math.min(10, Math.max(1, count)),
    }));
  }

  function handleDifficultyChange(subTopicId, difficulty) {
    setQuestionDifficulty((previous) => ({
      ...previous,
      [subTopicId]: difficulty,
    }));

    setGenerationMessages((previous) => ({
      ...previous,
      [subTopicId]: "",
    }));
  }

  function handleCustomInstructionsChange(subTopicId, instructions) {
    setCustomInstructions((previous) => ({
      ...previous,
      [subTopicId]: instructions,
    }));
  }

  async function handleDeleteSkill() {
    if (
      !window.confirm(
        `Are you sure you want to delete the skill "${skill.name}"? This will permanently delete all topics, sub-topics, learning materials, questions, and assessment records under this skill.`
      )
    ) {
      return;
    }

    try {
      setDeletingSkill(true);
      setDeleteMessage("");

      await deleteSkill(skill.id);

      navigate("/");
    } catch (err) {
      console.error("Failed to delete skill:", err);

      setDeleteMessage(err.message || "Failed to delete skill.");
      setDeletingSkill(false);
    }
  }

  async function handleDeleteTopic(topicId, topicName) {
    if (
      !window.confirm(
        `Are you sure you want to delete the topic "${topicName}"? This will permanently delete all sub-topics, learning materials, and questions under this topic.`
      )
    ) {
      return;
    }

    try {
      await deleteTopic(skillId, topicId);

      setTopics((previous) =>
        previous.filter((topic) => topic.id !== topicId)
      );
    } catch (err) {
      console.error("Failed to delete topic:", err);
      alert(err.message || "Failed to delete topic.");
    }
  }

  async function handleDeleteSubTopic(
    topicId,
    subTopicId,
    subTopicName
  ) {
    if (
      !window.confirm(
        `Are you sure you want to delete the sub-topic "${subTopicName}"? This will permanently delete all learning materials and questions under this sub-topic.`
      )
    ) {
      return;
    }

    try {
      await deleteSubTopic(topicId, subTopicId);

      setTopics((previous) =>
        previous.map((topic) =>
          topic.id === topicId
            ? {
                ...topic,
                subTopics: topic.subTopics.filter(
                  (subTopic) => subTopic.id !== subTopicId
                ),
              }
            : topic
        )
      );
    } catch (err) {
      console.error("Failed to delete sub-topic:", err);
      alert(err.message || "Failed to delete sub-topic.");
    }
  }

  async function handleDeleteAllQuestions() {
    if (
      !window.confirm(
        `Are you sure you want to delete all generated questions for ${skill.name}? This will not delete topics, sub-topics, or learning materials.`
      )
    ) {
      return;
    }

    try {
      setDeletingQuestions(true);
      setDeleteMessage("");

      const result = await deleteAllQuestionsForSkill(skill.id);

      setDeleteMessage(
        result.message || "All questions deleted successfully."
      );
    } catch (err) {
      console.error("Failed to delete questions:", err);

      setDeleteMessage(
        err.message || "Failed to delete questions."
      );
    } finally {
      setDeletingQuestions(false);
    }
  }

  async function handleGenerateQuestions(subTopicId) {
    const count = questionCount[subTopicId] ?? 3;
    const difficulty = questionDifficulty[subTopicId] ?? "medium";
    const instructions = customInstructions[subTopicId] ?? "";

    if (difficulty === "custom" && !instructions.trim()) {
      setGenerationMessages((previous) => ({
        ...previous,
        [subTopicId]:
          "Please enter custom instructions before generating questions.",
      }));
      return;
    }

    try {
      setGeneratingSubTopicId(subTopicId);

      setGenerationMessages((previous) => ({
        ...previous,
        [subTopicId]: "",
      }));

      await generateQuestions(
        subTopicId,
        count,
        difficulty,
        instructions
      );

      setGenerationMessages((previous) => ({
        ...previous,
        [subTopicId]:
          `Generated ${count} ${difficulty} question${
            count === 1 ? "" : "s"
          } successfully!`,
      }));
    } catch (err) {
      console.error("Failed to generate AI questions:", err);

      setGenerationMessages((previous) => ({
        ...previous,
        [subTopicId]:
          err.message || "Failed to generate AI questions.",
      }));
    } finally {
      setGeneratingSubTopicId(null);
    }
  }

  const controlStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  };

  const controlLabelStyle = {
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontWeight: "600",
  };

  const selectStyle = {
    padding: "6px 10px",
    borderRadius: "6px",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    border: "1px solid #475569",
    cursor: "pointer",
  };

  const customInputStyle = {
    minWidth: "240px",
    maxWidth: "100%",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #475569",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
  };

  if (loading) {
    return (
      <main className="dashboard">
        <p>Loading skill...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard">
        <p>{error}</p>

        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
      </main>
    );
  }

  if (!skill) {
    return (
      <main className="dashboard">
        <p>Skill not found.</p>
        <Link to="/" className="back-link">
          ← Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="dashboard skill-details">
      <Link to="/" className="back-link">
        ← Back to Dashboard
      </Link>

      {/* Skill Details */}

      <section className="skill-hero">
        <div className="skill-hero-icon">
          {skill.name.charAt(0).toUpperCase()}
        </div>

        <div>
          <p className="eyebrow">SKILL</p>

          <h1>{skill.name}</h1>

          <p>
            {skill.description || "No description available."}
          </p>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsEditingSkill(true)}
                style={{
                  backgroundColor: "rgba(234, 179, 8, 0.18)",
                  color: "#fde047",
                  border: "1px solid rgba(234, 179, 8, 0.4)",
                  padding: "0.6rem 1.2rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                }}
              >
                ✏️ Edit Skill
              </button>
            )}
            <button
              type="button"
              className="delete-button"
              disabled={deletingSkill}
              onClick={handleDeleteSkill}
              style={{
                backgroundColor: "#b91c1c",
                color: "#ffffff",
                border: "none",
                padding: "0.6rem 1.2rem",
                borderRadius: "6px",
                cursor: deletingSkill ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              {deletingSkill
                ? "Deleting Skill..."
                : "❌ Delete Skill"}
            </button>

            <button
              type="button"
              className="delete-button"
              disabled={deletingQuestions}
              onClick={handleDeleteAllQuestions}
              style={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                padding: "0.6rem 1.2rem",
                borderRadius: "6px",
                cursor: deletingQuestions ? "not-allowed" : "pointer",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              {deletingQuestions
                ? "Deleting..."
                : "🗑️ Delete All Questions"}
            </button>
          </div>

          {deleteMessage && (
            <p
              style={{
                marginTop: "0.5rem",
                color: "#ef4444",
                fontSize: "0.9rem",
                fontWeight: "500",
              }}
            >
              {deleteMessage}
            </p>
          )}
        </div>
      </section>

      {/* Topics and Sub-topics */}

      <section className="learning-overview">
        <div
          className="section-heading"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow">YOUR LEARNING JOURNEY</p>

            <h2>Topics &amp; Sub-topics</h2>

            <p className="section-description">
              Explore and manage the concepts that make up this skill.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsAddTopicModalOpen(true)}
          >
            + Add Topic
          </button>
        </div>

        {topics.length === 0 ? (
          <div className="empty-learning-state">
            <h3>Learning content coming soon</h3>

            <p>
              Topics and learning material have not been configured
              for this skill yet.
            </p>
          </div>
        ) : (
          <div className="topics-list">
            {topics.map((topic, index) => (
              <article className="topic-card" key={topic.id}>
                <div className="topic-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="topic-content">
                  <div
                    className="topic-header-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3>{topic.name}</h3>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="secondary-button"
                        style={{
                          fontSize: "12px",
                          padding: "5px 10px",
                        }}
                        onClick={() =>
                          setSelectedTopicForSubTopic(topic)
                        }
                      >
                        + Add Sub-topic
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          style={{
                            backgroundColor: "rgba(234, 179, 8, 0.18)",
                            color: "#fde047",
                            border: "1px solid rgba(234, 179, 8, 0.4)",
                            borderRadius: "8px",
                            padding: "5px 9px",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          onClick={() => setEditingTopic(topic)}
                          title="Edit Topic"
                        >
                          ✏️ Edit Topic
                        </button>
                      )}

                      <button
                        type="button"
                        style={{
                          backgroundColor: "rgba(220, 38, 38, 0.2)",
                          color: "#ef4444",
                          border:
                            "1px solid rgba(239, 68, 68, 0.4)",
                          borderRadius: "8px",
                          padding: "5px 9px",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                        onClick={() =>
                          handleDeleteTopic(topic.id, topic.name)
                        }
                        title="Delete Topic"
                      >
                        🗑️ Delete Topic
                      </button>
                    </div>
                  </div>

                  <p className="topic-description">
                    {topic.description || "No description available."}
                  </p>

                  <div className="subtopic-list">
                    {!topic.subTopics ||
                    topic.subTopics.length === 0 ? (
                      <p>
                        No sub-topics available. Click "+ Add
                        Sub-topic" above.
                      </p>
                    ) : (
                      topic.subTopics.map((subTopic) => (
                        <div
                          className="subtopic-card"
                          key={subTopic.id}
                        >
                          {/* Sub-topic heading */}

                          <div
                            className="subtopic-item"
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "0.75rem",
                              width: "100%",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <span className="subtopic-dot">✓</span>

                              <strong>{subTopic.name}</strong>
                            </div>

                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              {isAdmin && (
                                <button
                                  type="button"
                                  style={{
                                    backgroundColor: "rgba(234, 179, 8, 0.15)",
                                    color: "#fde047",
                                    border: "1px solid rgba(234, 179, 8, 0.3)",
                                    borderRadius: "6px",
                                    padding: "3px 8px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                  }}
                                  onClick={() => setEditingSubTopic(subTopic)}
                                  title="Edit Sub-topic"
                                >
                                  ✏️ Edit
                                </button>
                              )}

                              <button
                                type="button"
                                style={{
                                  backgroundColor: "rgba(220, 38, 38, 0.15)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                }}
                                onClick={() =>
                                  handleDeleteSubTopic(topic.id, subTopic.id, subTopic.name)
                                }
                                title="Delete Sub-topic"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>

                          {subTopic.description && (
                            <p className="subtopic-description">
                              {subTopic.description}
                            </p>
                          )}

                          {/* Learning Materials */}

                          <div className="learning-materials">
                            <h4>Learning Materials</h4>

                            {subTopic.learningMaterials?.length > 0 ? (
                              <div>
                                {subTopic.learningMaterials.map(
                                  (material) => (
                                    <div
                                      className="learning-material-item"
                                      key={material.id}
                                    >
                                      <strong>{material.title}</strong>

                                      {material.description && (
                                        <p>{material.description}</p>
                                      )}

                                      {material.source_type && (
                                        <small>
                                          Type: {material.source_type}
                                        </small>
                                      )}

                                      {material.source_url && (
                                        <div>
                                          <a
                                            href={material.source_url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Open Learning Material →
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <p>No learning materials available.</p>
                            )}
                          </div>

                          {/* AI Question Generation */}

                          <div
                            className="ai-question-section"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              marginTop: "1rem",
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Question Count */}

                            <div style={controlStyle}>
                              <label
                                htmlFor={`count-${subTopic.id}`}
                                style={controlLabelStyle}
                              >
                                Questions:
                              </label>

                              <input
                                id={`count-${subTopic.id}`}
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={questionCount[subTopic.id] ?? 3}
                                onChange={(event) =>
                                  handleCountChange(
                                    subTopic.id,
                                    event.target.value
                                  )
                                }
                                style={{
                                  width: "80px",
                                  accentColor: "#38bdf8",
                                  cursor: "pointer",
                                }}
                              />

                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#38bdf8",
                                  fontWeight: "700",
                                  minWidth: "16px",
                                  textAlign: "center",
                                }}
                              >
                                {questionCount[subTopic.id] ?? 3}
                              </span>
                            </div>

                            {/* Difficulty Dropdown */}

                            <div style={controlStyle}>
                              <label
                                htmlFor={`difficulty-${subTopic.id}`}
                                style={controlLabelStyle}
                              >
                                Difficulty:
                              </label>

                              <select
                                id={`difficulty-${subTopic.id}`}
                                value={
                                  questionDifficulty[subTopic.id] ??
                                  "medium"
                                }
                                onChange={(event) =>
                                  handleDifficultyChange(
                                    subTopic.id,
                                    event.target.value
                                  )
                                }
                                style={selectStyle}
                              >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                                <option value="custom">Custom</option>
                              </select>
                            </div>

                            {/* Custom Instructions */}

                            {questionDifficulty[subTopic.id] ===
                              "custom" && (
                              <input
                                type="text"
                                aria-label="Custom question instructions"
                                placeholder="Enter custom instructions"
                                value={
                                  customInstructions[subTopic.id] ?? ""
                                }
                                onChange={(event) =>
                                  handleCustomInstructionsChange(
                                    subTopic.id,
                                    event.target.value
                                  )
                                }
                                style={customInputStyle}
                              />
                            )}

                            {/* Generate Button */}

                            <button
                              type="button"
                              className="topic-button"
                              disabled={
                                generatingSubTopicId === subTopic.id
                              }
                              onClick={() =>
                                handleGenerateQuestions(subTopic.id)
                              }
                            >
                              {generatingSubTopicId === subTopic.id
                                ? "Generating..."
                                : "🤖 Generate AI Questions"}
                            </button>

                            {/* Generation Message */}

                            {generationMessages[subTopic.id] && (
                              <p
                                className="ai-generation-message"
                                style={{ width: "100%" }}
                              >
                                {generationMessages[subTopic.id]}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Topic Footer */}

                  <div className="topic-footer">
                    <span>
                      {topic.subTopics?.length ?? 0} sub-topics
                    </span>

                    <span>
                      {(topic.subTopics || []).reduce(
                        (total, subTopic) =>
                          total +
                          (subTopic.learningMaterials || []).length,
                        0
                      )}{" "}
                      learning materials
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Assessment */}

      <section className="assessment-cta">
        <div>
          <p className="eyebrow">READY TO CHECK YOUR KNOWLEDGE?</p>

          <h2>Take an Assessment</h2>

          <p>
            Your assessment will help identify which sub-topics you
            already understand and where you need more practice.
          </p>
        </div>

        <Link
          to={`/skills/${skillId}/assessment`}
          className="assessment-button assessment-link"
        >
          Start Assessment →
        </Link>
      </section>

      {/* Add Topic Modal */}

      <AddTopicModal
        isOpen={isAddTopicModalOpen}
        onClose={() => setIsAddTopicModalOpen(false)}
        skillId={skillId}
        onTopicCreated={handleTopicCreated}
      />

      {/* Add Sub-topic Modal */}

      <AddSubTopicModal
        isOpen={Boolean(selectedTopicForSubTopic)}
        onClose={() => setSelectedTopicForSubTopic(null)}
        topic={selectedTopicForSubTopic}
        onSubTopicCreated={handleSubTopicCreated}
      />

      <EditSkillModal
        isOpen={isEditingSkill}
        skill={skill}
        onClose={() => setIsEditingSkill(false)}
        onSkillUpdated={(updatedSkill) => {
          setSkill(updatedSkill);
        }}
      />

      <EditTopicModal
        isOpen={Boolean(editingTopic)}
        skillId={skillId}
        topic={editingTopic}
        onClose={() => setEditingTopic(null)}
        onTopicUpdated={(updatedTopic) => {
          setTopics((prevTopics) =>
            prevTopics.map((t) =>
              t.id === updatedTopic.id
                ? { ...t, name: updatedTopic.name, description: updatedTopic.description }
                : t
            )
          );
        }}
      />

      <EditSubTopicModal
        isOpen={Boolean(editingSubTopic)}
        subtopic={editingSubTopic}
        onClose={() => setEditingSubTopic(null)}
        onSubTopicUpdated={(updatedSubTopic) => {
          setTopics((prevTopics) =>
            prevTopics.map((t) => ({
              ...t,
              subTopics: t.subTopics.map((s) =>
                s.id === updatedSubTopic.id
                  ? {
                      ...s,
                      name: updatedSubTopic.name,
                      description: updatedSubTopic.description,
                    }
                  : s
              ),
            }))
          );
        }}
      />
    </main>
  );
}

export default SkillDetails;