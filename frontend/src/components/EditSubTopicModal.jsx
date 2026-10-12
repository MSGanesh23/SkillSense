import { useState, useEffect } from "react";
import { updateSubTopic } from "../services/api";
import "./AddSkillModal.css";

function EditSubTopicModal({
  isOpen,
  onClose,
  topicId,
  subtopic,
  onSubTopicUpdated,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (subtopic) {
      setName(subtopic.name || "");
      setDescription(subtopic.description || "");
      setError("");
    }
  }, [subtopic, isOpen]);

  if (!isOpen || !subtopic) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Subtopic name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const updated = await updateSubTopic(
        topicId || subtopic.topic_id,
        subtopic.id,
        {
          name: name.trim(),
          description: description.trim() || null,
        }
      );

      if (onSubTopicUpdated) onSubTopicUpdated(updated);
      onClose();
    } catch (err) {
      console.error("Failed to update subtopic:", err);
      setError(err.message || "Failed to update subtopic. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Edit Subtopic</h3>
          <button type="button" className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="edit-subtopic-name">
              Subtopic Name <span className="required-star">*</span>
            </label>
            <input
              id="edit-subtopic-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-subtopic-description">Description</label>
            <textarea
              id="edit-subtopic-description"
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

export default EditSubTopicModal;
