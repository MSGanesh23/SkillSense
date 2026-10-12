import { useState, useEffect } from "react";
import { updateSkill } from "../services/api";
import "./AddSkillModal.css";

function EditSkillModal({ isOpen, onClose, skill, onSkillUpdated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (skill) {
      setName(skill.name || "");
      setDescription(skill.description || "");
      setError("");
    }
  }, [skill, isOpen]);

  if (!isOpen || !skill) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Skill name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const updated = await updateSkill(skill.id, {
        name: name.trim(),
        description: description.trim() || null,
      });

      if (onSkillUpdated) onSkillUpdated(updated);
      onClose();
    } catch (err) {
      console.error("Failed to update skill:", err);
      setError(err.message || "Failed to update skill. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Edit Skill</h3>
          <button type="button" className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="edit-skill-name">
              Skill Name <span className="required-star">*</span>
            </label>
            <input
              id="edit-skill-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-skill-description">Description</label>
            <textarea
              id="edit-skill-description"
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

export default EditSkillModal;
