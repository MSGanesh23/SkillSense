import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import "./AssessmentProgress.css";

const API_URL = "http://127.0.0.1:8000/assessments/history";

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssessmentProgress() {
  const [assessments, setAssessments] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAssessments();
  }, []);

  async function loadAssessments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setAssessments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Assessment history error:", err);
      setError(
        "Unable to load assessment history. Make sure FastAPI is running on http://127.0.0.1:8000."
      );
    } finally {
      setLoading(false);
    }
  }

  // Only completed assessments are used for progress.
  const completedAssessments = useMemo(() => {
    return assessments
      .filter(
        (item) =>
          String(item.status).toLowerCase() === "completed" &&
          item.total_score !== null &&
          item.total_score !== undefined &&
          item.max_score !== null &&
          item.max_score !== undefined &&
          Number(item.max_score) > 0
      )
      .sort((a, b) => {
        const dateA = new Date(a.completed_at || a.created_at).getTime();
        const dateB = new Date(b.completed_at || b.created_at).getTime();

        return dateA - dateB;
      });
  }, [assessments]);

  // Unique skill IDs from completed assessments.
  const skillIds = useMemo(() => {
    return [...new Set(completedAssessments.map((item) => item.skill_id))];
  }, [completedAssessments]);

  const filteredAssessments = useMemo(() => {
    if (selectedSkill === "all") {
      return completedAssessments;
    }

    return completedAssessments.filter(
      (item) => String(item.skill_id) === String(selectedSkill)
    );
  }, [completedAssessments, selectedSkill]);

  // Data used by Recharts.
  const chartData = useMemo(() => {
    return filteredAssessments.map((item, index) => {
      const score = Number(item.total_score);
      const maxScore = Number(item.max_score);
      const percentage = Number(((score / maxScore) * 100).toFixed(2));

      return {
        attempt: index + 1,
        label: formatDate(item.completed_at || item.created_at),
        title: item.title || "Assessment",
        score,
        maxScore,
        percentage,
      };
    });
  }, [filteredAssessments]);

  const averageScore = useMemo(() => {
    if (chartData.length === 0) return 0;

    const total = chartData.reduce(
      (sum, item) => sum + item.percentage,
      0
    );

    return (total / chartData.length).toFixed(1);
  }, [chartData]);

  const bestScore = useMemo(() => {
    if (chartData.length === 0) return 0;

    return Math.max(...chartData.map((item) => item.percentage)).toFixed(1);
  }, [chartData]);

  const latestScore = useMemo(() => {
    if (chartData.length === 0) return 0;

    return chartData[chartData.length - 1].percentage.toFixed(1);
  }, [chartData]);

  const improvement = useMemo(() => {
    if (chartData.length < 2) return "0.0";

    return (
      chartData[chartData.length - 1].percentage -
      chartData[0].percentage
    ).toFixed(1);
  }, [chartData]);

  if (loading) {
    return (
      <div className="assessment-progress-page">
        <div className="progress-loading">
          <div className="loading-spinner"></div>
          <p>Loading assessment progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-progress-page">
      <div className="assessment-progress-container">

        <div className="progress-header">
          <div>
            <h1>Assessment Progress</h1>
            <p>
              Track your performance across completed SkillSense assessments.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadAssessments}
            type="button"
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="progress-error">
            {error}
          </div>
        )}

        <div className="progress-filter-row">
          <label htmlFor="skill-filter">Skill</label>

          <select
            id="skill-filter"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
          >
            <option value="all">All Skills</option>

            {skillIds.map((skillId) => (
              <option key={skillId} value={skillId}>
                Skill {skillId}
              </option>
            ))}
          </select>
        </div>

        <div className="progress-summary-grid">
          <div className="summary-card">
            <span className="summary-label">Completed</span>
            <strong>{chartData.length}</strong>
            <span className="summary-description">
              assessments
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">Average Score</span>
            <strong>{averageScore}%</strong>
            <span className="summary-description">
              overall performance
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">Best Score</span>
            <strong>{bestScore}%</strong>
            <span className="summary-description">
              highest performance
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">Improvement</span>
            <strong className={Number(improvement) >= 0 ? "positive" : "negative"}>
              {Number(improvement) > 0 ? "+" : ""}
              {improvement}%
            </strong>
            <span className="summary-description">
              first to latest
            </span>
          </div>
        </div>

        <section className="chart-card">
          <div className="section-heading">
            <div>
              <h2>Performance Over Time</h2>
              <p>
                Your score percentage from the first completed assessment.
              </p>
            </div>

            {chartData.length > 0 && (
              <div className="latest-score">
                Latest: <strong>{latestScore}%</strong>
              </div>
            )}
          </div>

          {chartData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No completed assessments</h3>
              <p>
                Complete an assessment to start tracking your progress.
              </p>
            </div>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 5,
                    bottom: 15,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="chart-grid"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 12 }}
                    width={50}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                  />

                  <Line
                    type="monotone"
                    dataKey="percentage"
                    name="Score"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      strokeWidth: 2,
                      fill: "#ffffff",
                    }}
                    activeDot={{
                      r: 7,
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="history-card">
          <div className="section-heading">
            <div>
              <h2>Assessment History</h2>
              <p>Completed assessments used in the progress graph.</p>
            </div>
          </div>

          {filteredAssessments.length === 0 ? (
            <div className="empty-table">
              No completed assessments found.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Assessment</th>
                    <th>Skill ID</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Completed At</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAssessments.map((item, index) => {
                    const score = Number(item.total_score);
                    const maxScore = Number(item.max_score);
                    const percentage = ((score / maxScore) * 100).toFixed(1);

                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>

                        <td className="assessment-title">
                          {item.title}
                        </td>

                        <td>
                          <span className="skill-badge">
                            {item.skill_id}
                          </span>
                        </td>

                        <td>
                          {score} / {maxScore}
                        </td>

                        <td>
                          <span className="score-badge">
                            {percentage}%
                          </span>
                        </td>

                        <td>
                          {formatDateTime(
                            item.completed_at || item.created_at
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <p className="tooltip-title">{data.title}</p>

      <p>
        Score:{" "}
        <strong>
          {data.score} / {data.maxScore}
        </strong>
      </p>

      <p>
        Percentage:{" "}
        <strong>{data.percentage}%</strong>
      </p>

      <p>
        Assessment {data.attempt}
      </p>
    </div>
  );
}
