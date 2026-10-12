import { useState, useEffect } from "react";
import { updateTopic } from "../services/api";
import "./AddSkillModal.css";

function EditTopicModal({ isOpen, onClose, skillId, topic, onTopicUpdated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (topic) {
      setName(topic.name || "");
      setDescription(topic.description || "");
      setError("");
    }
  }, [topic, isOpen]);

  if (!isOpen || !topic) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Topic name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const updated = await updateTopic(skillId || topic.skill_id, topic.id, {
        name: name.trim(),
        description: description.trim() || null,
      });

      if (onTopicUpdated) onTopicUpdated(updated);
      onClose();
    } catch (err) {
      console.error("Failed to update topic:", err);
      setError(err.message || "Failed to update topic. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Edit Topic</h3>
          <button type="button" className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="edit-topic-name">
              Topic Name <span className="required-star">*</span>
            </label>
            <input
              id="edit-topic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-topic-description">Description</label>
            <textarea
              id="edit-topic-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-modal-button"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditTopicModal;
