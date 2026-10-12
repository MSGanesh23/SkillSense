import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

import { useAuth } from "../context/AuthContext";
import {
  getUsersPerformanceSummary,
  getUserAssessments,
  getSkills,
  getTopicsBySkill,
  getSubTopicsByTopic,
  deleteSkill,
  deleteTopic,
  deleteSubTopic,
} from "../services/api";

import AddSkillModal from "../components/AddSkillModal";
import EditSkillModal from "../components/EditSkillModal";
import AddTopicModal from "../components/AddTopicModal";
import EditTopicModal from "../components/EditTopicModal";
import AddSubTopicModal from "../components/AddSubTopicModal";
import EditSubTopicModal from "../components/EditSubTopicModal";

import "./AdminDashboard.css";

function formatDate(dateValue) {
  if (!dateValue) return "No activity yet";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Sparkline({ data = [], width = 110, height = 30 }) {
  if (!data || data.length === 0) {
    return <span className="sparkline-empty">—</span>;
  }
  if (data.length === 1) {
    const val = data[0].percentage ?? 0;
    const color = val >= 75 ? "#22c55e" : val >= 50 ? "#00e5ff" : "#ef4444";
    return (
      <div className="sparkline-single">
        <span style={{ color }}>●</span> {val}%
      </div>
    );
  }

  const padding = 3;
  const min = 0;
  const max = 100;
  const points = data.map((d, i) => {
    const val = d.percentage ?? 0;
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / (max - min)) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastVal = data[data.length - 1].percentage ?? 0;
  const strokeColor = lastVal >= 75 ? "#22c55e" : lastVal >= 50 ? "#00e5ff" : "#ef4444";
  const lastPoint = points[points.length - 1].split(",");

  return (
    <div className="sparkline-wrap" title={`Recent score: ${lastVal}%`}>
      <svg width={width} height={height} className="sparkline-svg">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(" ")}
        />
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r="3"
          fill={strokeColor}
        />
      </svg>
      <span className="sparkline-latest" style={{ color: strokeColor }}>
        {lastVal}%
      </span>
    </div>
  );
}

function CustomChartTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="admin-chart-tooltip">
      <p className="admin-tooltip-title">{data.title || "Assessment"}</p>
      {data.skillName && (
        <div className="admin-tooltip-row">
          <span>Skill:</span>
          <span style={{ color: "#93c5fd" }}>{data.skillName}</span>
        </div>
      )}
      <div className="admin-tooltip-row">
        <span>Score:</span>
        <strong>
          {data.score} / {data.maxScore}
        </strong>
      </div>
      <div className="admin-tooltip-row">
        <span>Accuracy:</span>
        <strong style={{ color: "#00e5ff" }}>{data.percentage}%</strong>
      </div>
      <div className="admin-tooltip-date">
        {data.date} (Attempt #{data.attempt})
      </div>
    </div>
  );
}

function DistributionTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="admin-chart-tooltip">
      <p className="admin-tooltip-title">{data.bracket}</p>
      <div className="admin-tooltip-row">
        <span>Assessments:</span>
        <strong style={{ color: data.fill }}>{data.count}</strong>
      </div>
      <div className="admin-tooltip-row">
        <span>Proportion:</span>
        <span style={{ color: "#94a3b8" }}>{data.ratio}% of attempts</span>
      </div>
    </div>
  );
}

function CohortTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="admin-chart-tooltip">
      <p className="admin-tooltip-title">{data.name}</p>
      <div className="admin-tooltip-row">
        <span>Avg Score:</span>
        <strong style={{ color: "#00e5ff" }}>{data.average}%</strong>
      </div>
      <div className="admin-tooltip-row">
        <span>Best Score:</span>
        <strong style={{ color: "#22c55e" }}>{data.best}%</strong>
      </div>
      <div className="admin-tooltip-row">
        <span>Completed:</span>
        <strong>{data.count} assessments</strong>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState("users"); // "users" | "crud"
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [summaryError, setSummaryError] = useState("");

  // Graph state in dashboard
  const [graphMode, setGraphMode] = useState("trajectory"); // "trajectory" | "cohort"
  const [chartUserId, setChartUserId] = useState(null);
  const [chartUserAssessments, setChartUserAssessments] = useState([]);
  const [chartUserLoading, setChartUserLoading] = useState(false);

  // Inspect specific user modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAssessments, setUserAssessments] = useState([]);
  const [loadingUserHistory, setLoadingUserHistory] = useState(false);

  // Curriculum CRUD state
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [expandedSkillId, setExpandedSkillId] = useState(null);
  const [skillTopicsMap, setSkillTopicsMap] = useState({}); // skillId -> list of topics
  const [expandedTopicId, setExpandedTopicId] = useState(null);
  const [topicSubtopicsMap, setTopicSubtopicsMap] = useState({}); // topicId -> list of subtopics

  // Modal states
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);

  const [addTopicSkillId, setAddTopicSkillId] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);

  const [addSubTopicTopicId, setAddSubTopicTopicId] = useState(null);
  const [editingSubTopic, setEditingSubTopic] = useState(null);

  useEffect(() => {
    loadSummary();
    loadSkillsList();
  }, []);

  async function loadSummary() {
    try {
      setLoadingSummary(true);
      setSummaryError("");
      const data = await getUsersPerformanceSummary();
      setSummaryData(data);

      // Pick default user for the performance chart (prefer user with assessments)
      const defaultUser =
        data?.users?.find((u) => u.assessments_count > 0) ||
        data?.users?.[0];
      if (defaultUser && !chartUserId) {
        setChartUserId(defaultUser.id);
      }
    } catch (err) {
      console.error("Failed to load users performance summary:", err);
      setSummaryError(err.message || "Failed to load performance summary.");
    } finally {
      setLoadingSummary(false);
    }
  }

  // Load detailed assessments whenever chartUserId changes
  useEffect(() => {
    if (!chartUserId) return;
    async function loadChartData() {
      setChartUserLoading(true);
      try {
        const data = await getUserAssessments(chartUserId);
        setChartUserAssessments(data.assessments || []);
      } catch (err) {
        console.error("Failed to load chart assessments:", err);
      } finally {
        setChartUserLoading(false);
      }
    }
    loadChartData();
  }, [chartUserId]);

  async function loadSkillsList() {
    try {
      setSkillsLoading(true);
      const data = await getSkills();
      setSkills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load skills:", err);
    } finally {
      setSkillsLoading(false);
    }
  }

  async function toggleExpandSkill(skillId) {
    if (expandedSkillId === skillId) {
      setExpandedSkillId(null);
      return;
    }
    setExpandedSkillId(skillId);
    if (!skillTopicsMap[skillId]) {
      try {
        const topics = await getTopicsBySkill(skillId);
        setSkillTopicsMap((prev) => ({ ...prev, [skillId]: topics }));
      } catch (err) {
        console.error("Failed to load topics:", err);
      }
    }
  }

  async function toggleExpandTopic(topicId) {
    if (expandedTopicId === topicId) {
      setExpandedTopicId(null);
      return;
    }
    setExpandedTopicId(topicId);
    if (!topicSubtopicsMap[topicId]) {
      try {
        const subtopics = await getSubTopicsByTopic(topicId);
        setTopicSubtopicsMap((prev) => ({ ...prev, [topicId]: subtopics }));
      } catch (err) {
        console.error("Failed to load subtopics:", err);
      }
    }
  }

  async function handleViewUserDetails(targetUser) {
    setSelectedUser(targetUser);
    setUserAssessments([]);
    setLoadingUserHistory(true);
    try {
      const data = await getUserAssessments(targetUser.id);
      setUserAssessments(data.assessments || []);
    } catch (err) {
      console.error("Failed to fetch user assessments:", err);
    } finally {
      setLoadingUserHistory(false);
    }
  }

  /* CRUD Actions */
  async function handleDeleteSkill(skill) {
    if (
      !window.confirm(
        `Are you sure you want to delete skill "${skill.name}"? This removes all topics, subtopics, and questions.`
      )
    ) {
      return;
    }
    try {
      await deleteSkill(skill.id);
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      loadSummary();
    } catch (err) {
      alert("Failed to delete skill: " + err.message);
    }
  }

  async function handleDeleteTopic(skillId, topic) {
    if (!window.confirm(`Are you sure you want to delete topic "${topic.name}"?`)) {
      return;
    }
    try {
      await deleteTopic(skillId, topic.id);
      setSkillTopicsMap((prev) => ({
        ...prev,
        [skillId]: (prev[skillId] || []).filter((t) => t.id !== topic.id),
      }));
    } catch (err) {
      alert("Failed to delete topic: " + err.message);
    }
  }

  async function handleDeleteSubTopic(topicId, subtopic) {
    if (
      !window.confirm(
        `Are you sure you want to delete subtopic "${subtopic.name}"?`
      )
    ) {
      return;
    }
    try {
      await deleteSubTopic(topicId, subtopic.id);
      setTopicSubtopicsMap((prev) => ({
        ...prev,
        [topicId]: (prev[topicId] || []).filter((s) => s.id !== subtopic.id),
      }));
    } catch (err) {
      alert("Failed to delete subtopic: " + err.message);
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="admin-access-denied">
          <h2>🔒 Administrator Access Required</h2>
          <p>
            You do not have administrative privileges to access this dashboard.
          </p>
          <Link to="/dashboard" className="return-link">
            Return to Learner Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  const usersList = summaryData?.users || [];
  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const kpis = summaryData?.kpis || {
    total_users: 0,
    total_assessments: 0,
    platform_average_score: 0,
    total_skills: 0,
  };

  // Selected chart user object
  const activeChartUser =
    usersList.find((u) => u.id === chartUserId) || usersList[0] || null;

  // Chronologically sorted trajectory chart data for the selected user
  const trajectoryChartData = useMemo(() => {
    return [...chartUserAssessments]
      .filter(
        (a) =>
          a.status === "completed" &&
          a.percentage !== null &&
          a.percentage !== undefined
      )
      .sort((a, b) => {
        const dateA = new Date(a.completed_at || a.created_at).getTime();
        const dateB = new Date(b.completed_at || b.created_at).getTime();
        return dateA - dateB;
      })
      .map((item, idx) => ({
        attempt: idx + 1,
        label: `Attempt ${idx + 1}`,
        title: item.title || `Assessment #${idx + 1}`,
        skillName: item.skill_name || null,
        percentage: Number(item.percentage),
        score: Number(item.total_score || 0),
        maxScore: Number(item.max_score || 0),
        date: formatDate(item.completed_at || item.created_at),
      }));
  }, [chartUserAssessments]);

  // Selected user summary stats
  const chartUserAverage = useMemo(() => {
    if (trajectoryChartData.length === 0) return 0;
    const sum = trajectoryChartData.reduce((acc, curr) => acc + curr.percentage, 0);
    return (sum / trajectoryChartData.length).toFixed(1);
  }, [trajectoryChartData]);

  const chartUserBest = useMemo(() => {
    if (trajectoryChartData.length === 0) return 0;
    return Math.max(...trajectoryChartData.map((d) => d.percentage)).toFixed(1);
  }, [trajectoryChartData]);

  const chartUserImprovement = useMemo(() => {
    if (trajectoryChartData.length < 2) return "0.0";
    const first = trajectoryChartData[0].percentage;
    const last = trajectoryChartData[trajectoryChartData.length - 1].percentage;
    return (last - first).toFixed(1);
  }, [trajectoryChartData]);

  const chartUserPassRate = useMemo(() => {
    if (trajectoryChartData.length === 0) return "0.0";
    const passed = trajectoryChartData.filter((d) => d.percentage >= 60).length;
    return ((passed / trajectoryChartData.length) * 100).toFixed(1);
  }, [trajectoryChartData]);

  const distributionData = useMemo(() => {
    if (!trajectoryChartData.length) return [];
    let mastered = 0;
    let proficient = 0;
    let developing = 0;

    trajectoryChartData.forEach((d) => {
      if (d.percentage >= 80) mastered++;
      else if (d.percentage >= 60) proficient++;
      else developing++;
    });

    const total = trajectoryChartData.length;
    return [
      {
        bracket: "Mastered (≥80%)",
        count: mastered,
        ratio: ((mastered / total) * 100).toFixed(0),
        fill: "#22c55e",
      },
      {
        bracket: "Proficient (60-79%)",
        count: proficient,
        ratio: ((proficient / total) * 100).toFixed(0),
        fill: "#00e5ff",
      },
      {
        bracket: "Needs Practice (<60%)",
        count: developing,
        ratio: ((developing / total) * 100).toFixed(0),
        fill: "#ef4444",
      },
    ];
  }, [trajectoryChartData]);

  // Cohort comparison chart data
  const cohortData = useMemo(() => {
    return usersList.map((u) => ({
      name: u.name,
      average: u.average_score,
      best: u.best_score,
      count: u.assessments_count,
    }));
  }, [usersList]);

  // Modal user chart data
  const modalChartData = useMemo(() => {
    return [...userAssessments]
      .filter(
        (a) =>
          a.status === "completed" &&
          a.percentage !== null &&
          a.percentage !== undefined
      )
      .sort((a, b) => {
        const dateA = new Date(a.completed_at || a.created_at).getTime();
        const dateB = new Date(b.completed_at || b.created_at).getTime();
        return dateA - dateB;
      })
      .map((item, idx) => ({
        attempt: idx + 1,
        label: `Attempt ${idx + 1}`,
        title: item.title || `Assessment #${idx + 1}`,
        percentage: Number(item.percentage),
        score: Number(item.total_score || 0),
        maxScore: Number(item.max_score || 0),
        date: formatDate(item.completed_at || item.created_at),
      }));
  }, [userAssessments]);

  return (
    <main className="admin-dashboard">
      {/* Header */}
      <section className="admin-header">
        <div>
          <span className="admin-eyebrow">ADMINISTRATOR PORTAL</span>
          <h1>Admin Control & Analytics</h1>
          <p>
            Review all learner performances, inspect score breakdowns, and
            manage curriculum with full CRUD update features.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-refresh-button"
            onClick={() => {
              loadSummary();
              loadSkillsList();
            }}
          >
            ↻ Refresh Data
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="admin-kpis-grid">
        <div className="admin-kpi-card">
          <span className="kpi-label">Total Users</span>
          <strong>{kpis.total_users}</strong>
          <span className="kpi-desc">Registered across platform</span>
        </div>

        <div className="admin-kpi-card">
          <span className="kpi-label">Completed Assessments</span>
          <strong>{kpis.total_assessments}</strong>
          <span className="kpi-desc">Evaluations recorded</span>
        </div>

        <div className="admin-kpi-card">
          <span className="kpi-label">Platform Avg Score</span>
          <strong>{kpis.platform_average_score}%</strong>
          <span className="kpi-desc">Overall learner accuracy</span>
        </div>

        <div className="admin-kpi-card">
          <span className="kpi-label">Total Skills</span>
          <strong>{kpis.total_skills}</strong>
          <span className="kpi-desc">Active learning modules</span>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="admin-tabs-bar">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          📊 All Users Performance Summary
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "crud" ? "active" : ""}`}
          onClick={() => setActiveTab("crud")}
        >
          🛠️ Content & CRUD Management (Update / Edit)
        </button>
      </div>

      {/* TAB 1: All Users Performance Summary */}
      {activeTab === "users" && (
        <section className="admin-content-section">
          {/* USER PERFORMANCE GRAPH SECTION */}
          <div className="admin-graph-card">
            <div className="admin-graph-header">
              <div className="admin-graph-title-block">
                <span className="graph-badge">📈 PERFORMANCE METRICS GRAPH</span>
                <h2>
                  {graphMode === "cohort"
                    ? "Cohort Performance Comparison"
                    : graphMode === "distribution"
                    ? `Score Accuracy Distribution: ${
                        activeChartUser ? activeChartUser.name : "Learner"
                      }`
                    : `Performance Trajectory: ${
                        activeChartUser ? activeChartUser.name : "Learner"
                      }`}
                </h2>
                <p>
                  {graphMode === "cohort"
                    ? "Side-by-side comparison of average accuracy and peak scores across all users."
                    : graphMode === "distribution"
                    ? "Distribution of completed assessments across mastery proficiency brackets."
                    : "Interactive chronological assessment score progression for each learner."}
                </p>
              </div>

              <div className="admin-graph-controls">
                {graphMode !== "cohort" && usersList.length > 0 && (
                  <div className="user-select-wrapper">
                    <label htmlFor="user-select">Select User:</label>
                    <select
                      id="user-select"
                      className="chart-user-select"
                      value={chartUserId || ""}
                      onChange={(e) => setChartUserId(Number(e.target.value))}
                    >
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) — {u.assessments_count} assessments
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="graph-mode-toggle">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${
                      graphMode === "trajectory" ? "active" : ""
                    }`}
                    onClick={() => setGraphMode("trajectory")}
                  >
                    📈 User Trajectory
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${
                      graphMode === "distribution" ? "active" : ""
                    }`}
                    onClick={() => setGraphMode("distribution")}
                  >
                    📊 Score Distribution
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${
                      graphMode === "cohort" ? "active" : ""
                    }`}
                    onClick={() => setGraphMode("cohort")}
                  >
                    👥 Cohort Comparison
                  </button>
                </div>
              </div>
            </div>

            {/* Quick User Chips */}
            {graphMode !== "cohort" && usersList.length > 0 && (
              <div className="user-chips-row">
                <span className="chips-label">Learners:</span>
                <div className="chips-scroll-container">
                  {usersList.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`user-chip ${u.id === chartUserId ? "active" : ""}`}
                      onClick={() => setChartUserId(u.id)}
                    >
                      <span className="chip-avatar">
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </span>
                      <span className="chip-name">{u.name}</span>
                      <span className="chip-count">{u.assessments_count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trajectory Mode */}
            {graphMode === "trajectory" && (
              <div className="graph-body">
                {chartUserLoading && (
                  <div className="chart-loading-state">
                    Loading performance trajectory...
                  </div>
                )}

                {!chartUserLoading && trajectoryChartData.length === 0 && (
                  <div className="chart-empty-state">
                    <div className="empty-chart-icon">📉</div>
                    <h3>No Completed Assessments</h3>
                    <p>
                      {activeChartUser?.name || "This user"} has not completed any
                      evaluations yet. Once assessments are submitted, the trend
                      graph will plot automatically.
                    </p>
                  </div>
                )}

                {!chartUserLoading && trajectoryChartData.length > 0 && (
                  <>
                    <div className="chart-metrics-row">
                      <div className="chart-metric-pill">
                        <span className="metric-lbl">Total Attempts</span>
                        <strong>{trajectoryChartData.length}</strong>
                      </div>
                      <div className="chart-metric-pill">
                        <span className="metric-lbl">Average Score</span>
                        <strong style={{ color: "#00e5ff" }}>
                          {chartUserAverage}%
                        </strong>
                      </div>
                      <div className="chart-metric-pill">
                        <span className="metric-lbl">Peak Score</span>
                        <strong style={{ color: "#22c55e" }}>
                          {chartUserBest}%
                        </strong>
                      </div>
                      <div className="chart-metric-pill">
                        <span className="metric-lbl">Passing Rate (≥60%)</span>
                        <strong style={{ color: "#a855f7" }}>
                          {chartUserPassRate}%
                        </strong>
                      </div>
                      <div className="chart-metric-pill">
                        <span className="metric-lbl">Overall Improvement</span>
                        <strong
                          className={
                            Number(chartUserImprovement) >= 0
                              ? "positive-growth"
                              : "negative-growth"
                          }
                        >
                          {Number(chartUserImprovement) > 0 ? "+" : ""}
                          {chartUserImprovement}%
                        </strong>
                      </div>
                    </div>

                    <div className="chart-canvas-container">
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart
                          data={trajectoryChartData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                        >
                          <defs>
                            <linearGradient
                              id="cyanAreaGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#00e5ff"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="100%"
                                stopColor="#00e5ff"
                                stopOpacity={0.0}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255, 255, 255, 0.08)"
                          />

                          <XAxis
                            dataKey="label"
                            stroke="#94a3b8"
                            tick={{ fontSize: 12, fill: "#94a3b8" }}
                            tickMargin={8}
                          />

                          <YAxis
                            domain={[0, 100]}
                            stroke="#94a3b8"
                            tickFormatter={(v) => `${v}%`}
                            tick={{ fontSize: 12, fill: "#94a3b8" }}
                            width={45}
                          />

                          <Tooltip content={<CustomChartTooltip />} />

                          <ReferenceLine
                            y={Number(chartUserAverage)}
                            stroke="#eab308"
                            strokeDasharray="4 4"
                            label={{
                              value: `Avg: ${chartUserAverage}%`,
                              fill: "#fde047",
                              fontSize: 12,
                              position: "top",
                            }}
                          />

                          <Area
                            type="monotone"
                            dataKey="percentage"
                            stroke="#00e5ff"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#cyanAreaGradient)"
                            dot={{
                              r: 5,
                              fill: "#090e1c",
                              stroke: "#00e5ff",
                              strokeWidth: 2,
                            }}
                            activeDot={{
                              r: 7,
                              fill: "#00e5ff",
                              stroke: "#ffffff",
                              strokeWidth: 2,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Score Distribution Mode */}
            {graphMode === "distribution" && (
              <div className="graph-body">
                {chartUserLoading && (
                  <div className="chart-loading-state">
                    Loading distribution metrics...
                  </div>
                )}

                {!chartUserLoading && trajectoryChartData.length === 0 && (
                  <div className="chart-empty-state">
                    <div className="empty-chart-icon">📊</div>
                    <h3>No Completed Assessments</h3>
                    <p>
                      {activeChartUser?.name || "This user"} has not completed any
                      evaluations yet.
                    </p>
                  </div>
                )}

                {!chartUserLoading && trajectoryChartData.length > 0 && (
                  <>
                    <div className="chart-metrics-row distribution-metrics-row">
                      {distributionData.map((d) => (
                        <div key={d.bracket} className="chart-metric-pill">
                          <span className="metric-lbl">{d.bracket}</span>
                          <strong style={{ color: d.fill }}>
                            {d.count} ({d.ratio}%)
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div className="chart-canvas-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={distributionData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255, 255, 255, 0.08)"
                          />
                          <XAxis
                            dataKey="bracket"
                            stroke="#94a3b8"
                            tick={{ fontSize: 12, fill: "#cbd5e1" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            stroke="#94a3b8"
                            tick={{ fontSize: 12, fill: "#94a3b8" }}
                            width={40}
                          />
                          <Tooltip content={<DistributionTooltip />} />
                          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                            {distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Cohort Comparison Mode */}
            {graphMode === "cohort" && (
              <div className="graph-body">
                <div className="chart-canvas-container">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={cohortData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255, 255, 255, 0.08)"
                      />

                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fontSize: 12, fill: "#cbd5e1" }}
                        tickMargin={8}
                      />

                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        width={45}
                      />

                      <Tooltip content={<CohortTooltip />} />

                      <Bar
                        dataKey="average"
                        name="Average Score (%)"
                        fill="#00e5ff"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey="best"
                        name="Peak Score (%)"
                        fill="#22c55e"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* TABLE SECTION */}
          <div className="section-toolbar">
            <div>
              <h2>Users Performance Summary Table</h2>
              <p>
                Aggregated metrics, completed attempts, trajectory trends, and
                accuracy scores per registered user.
              </p>
            </div>

            <div className="search-box">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loadingSummary && (
            <div className="admin-loading-state">Loading user summaries...</div>
          )}
          {summaryError && (
            <div className="admin-error-banner">{summaryError}</div>
          )}

          {!loadingSummary && !summaryError && (
            <div className="admin-table-container">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Assessments</th>
                    <th>Average Score</th>
                    <th>Highest Score</th>
                    <th>Performance Trend</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-table-row">
                        No users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const avg = u.average_score;
                      let badgeClass = "badge-neutral";
                      if (u.assessments_count > 0) {
                        if (avg >= 75) badgeClass = "badge-success";
                        else if (avg >= 50) badgeClass = "badge-warning";
                        else badgeClass = "badge-danger";
                      }

                      const isSelected = u.id === chartUserId;

                      return (
                        <tr
                          key={u.id}
                          className={isSelected ? "selected-user-row" : ""}
                        >
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar">
                                {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <strong>{u.name}</strong>
                                <span>{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className={`role-pill role-${u.role}`}>
                              {u.role === "admin" ? "👑 Admin" : "🎓 Learner"}
                            </span>
                          </td>

                          <td>
                            <strong>{u.assessments_count}</strong>
                          </td>

                          <td>
                            <div className="score-cell">
                              <span className={`score-pill ${badgeClass}`}>
                                {u.assessments_count > 0 ? `${avg}%` : "—"}
                              </span>
                              {u.assessments_count > 0 && u.pass_rate !== undefined && (
                                <small className="pass-rate-sub">
                                  {u.pass_rate}% pass
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            <strong>
                              {u.assessments_count > 0 ? `${u.best_score}%` : "—"}
                            </strong>
                          </td>

                          {/* Sparkline column */}
                          <td className="sparkline-cell">
                            <Sparkline data={u.score_history} />
                          </td>

                          <td className="date-cell">
                            {formatDate(u.last_active)}
                          </td>

                          <td>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                className={`view-details-btn ${
                                  isSelected ? "active-plot-btn" : ""
                                }`}
                                onClick={() => {
                                  setChartUserId(u.id);
                                  if (graphMode === "cohort") {
                                    setGraphMode("trajectory");
                                  }
                                  window.scrollTo({
                                    top: 320,
                                    behavior: "smooth",
                                  });
                                }}
                                title="Plot performance on graph"
                              >
                                {isSelected ? "✓ Active Graph" : "📈 Plot Graph"}
                              </button>
                              <button
                                type="button"
                                className="view-details-btn"
                                onClick={() => handleViewUserDetails(u)}
                                title="View detailed assessment history"
                              >
                                Inspect →
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Content & CRUD Management */}
      {activeTab === "crud" && (
        <section className="admin-content-section">
          <div className="section-toolbar">
            <div>
              <h2>Curriculum CRUD Management</h2>
              <p>
                Add, edit, and delete Skills, Topics, and Subtopics with full
                update support.
              </p>
            </div>

            <button
              type="button"
              className="admin-create-btn"
              onClick={() => setIsAddSkillOpen(true)}
            >
              + Add New Skill
            </button>
          </div>

          {skillsLoading && (
            <div className="admin-loading-state">
              Loading curriculum hierarchy...
            </div>
          )}

          {!skillsLoading && skills.length === 0 && (
            <div className="admin-empty-state">
              <p>No skills created yet. Click "+ Add New Skill" to begin.</p>
            </div>
          )}

          {!skillsLoading && skills.length > 0 && (
            <div className="admin-crud-tree">
              {skills.map((skill) => {
                const isExpanded = expandedSkillId === skill.id;
                const topics = skillTopicsMap[skill.id] || [];

                return (
                  <div key={skill.id} className="crud-skill-card">
                    {/* Skill Header */}
                    <div className="crud-skill-header">
                      <div
                        className="crud-skill-title-block"
                        onClick={() => toggleExpandSkill(skill.id)}
                      >
                        <span className="expand-chevron">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                        <div>
                          <h3>{skill.name}</h3>
                          <p>
                            {skill.description || "No description provided."}
                          </p>
                        </div>
                      </div>

                      <div className="crud-actions-group">
                        <Link
                          to={`/skills/${skill.id}`}
                          className="crud-btn-view"
                        >
                          👁️ View
                        </Link>
                        <button
                          type="button"
                          className="crud-btn-add"
                          onClick={() => setAddTopicSkillId(skill.id)}
                        >
                          + Add Topic
                        </button>
                        <button
                          type="button"
                          className="crud-btn-edit"
                          onClick={() => setEditingSkill(skill)}
                        >
                          ✏️ Edit Skill
                        </button>
                        <button
                          type="button"
                          className="crud-btn-delete"
                          onClick={() => handleDeleteSkill(skill)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>

                    {/* Topics List */}
                    {isExpanded && (
                      <div className="crud-topics-container">
                        {topics.length === 0 ? (
                          <p className="crud-no-items">
                            No topics under this skill yet. Click "+ Add Topic"
                            above.
                          </p>
                        ) : (
                          topics.map((topic) => {
                            const isTopicExpanded =
                              expandedTopicId === topic.id;
                            const subtopics =
                              topicSubtopicsMap[topic.id] || [];

                            return (
                              <div key={topic.id} className="crud-topic-card">
                                <div className="crud-topic-header">
                                  <div
                                    className="crud-topic-title-block"
                                    onClick={() => toggleExpandTopic(topic.id)}
                                  >
                                    <span className="expand-chevron">
                                      {isTopicExpanded ? "▼" : "▶"}
                                    </span>
                                    <div>
                                      <strong>{topic.name}</strong>
                                      <p>
                                        {topic.description ||
                                          "No description."}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="crud-actions-group">
                                    <button
                                      type="button"
                                      className="crud-btn-add"
                                      onClick={() =>
                                        setAddSubTopicTopicId(topic.id)
                                      }
                                    >
                                      + Add Subtopic
                                    </button>
                                    <button
                                      type="button"
                                      className="crud-btn-edit"
                                      onClick={() => setEditingTopic(topic)}
                                    >
                                      ✏️ Edit Topic
                                    </button>
                                    <button
                                      type="button"
                                      className="crud-btn-delete"
                                      onClick={() =>
                                        handleDeleteTopic(skill.id, topic)
                                      }
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </div>

                                {/* Subtopics List */}
                                {isTopicExpanded && (
                                  <div className="crud-subtopics-container">
                                    {subtopics.length === 0 ? (
                                      <p className="crud-no-items">
                                        No subtopics yet. Click "+ Add Subtopic".
                                      </p>
                                    ) : (
                                      subtopics.map((sub) => (
                                        <div
                                          key={sub.id}
                                          className="crud-subtopic-row"
                                        >
                                          <div>
                                            <span>◈ {sub.name}</span>
                                            {sub.description && (
                                              <small>
                                                {" "}
                                                — {sub.description}
                                              </small>
                                            )}
                                          </div>

                                          <div className="crud-actions-group">
                                            <button
                                              type="button"
                                              className="crud-btn-edit"
                                              onClick={() =>
                                                setEditingSubTopic(sub)
                                              }
                                            >
                                              ✏️ Edit
                                            </button>
                                            <button
                                              type="button"
                                              className="crud-btn-delete"
                                              onClick={() =>
                                                handleDeleteSubTopic(
                                                  topic.id,
                                                  sub
                                                )
                                              }
                                            >
                                              🗑️ Delete
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* User History Inspection Modal with Embedded Mini Chart */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="modal-container user-history-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Learner Performance Details</h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "#94a3b8",
                    fontSize: "0.85rem",
                  }}
                >
                  {selectedUser.name} ({selectedUser.email}) — Role:{" "}
                  {selectedUser.role}
                </p>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setSelectedUser(null)}
              >
                ✕
              </button>
            </div>

            <div className="user-history-content">
              {loadingUserHistory && <p>Loading assessment history...</p>}

              {!loadingUserHistory && userAssessments.length === 0 && (
                <div className="empty-user-history">
                  <p>This user has not completed any assessments yet.</p>
                </div>
              )}

              {!loadingUserHistory && userAssessments.length > 0 && (
                <>
                  {/* Embedded Modal Chart */}
                  {modalChartData.length > 0 && (
                    <div className="modal-chart-box">
                      <div className="modal-chart-header">
                        <span>Score Progression Over Time</span>
                        <strong style={{ color: "#00e5ff" }}>
                          Latest: {modalChartData[modalChartData.length - 1].percentage}%
                        </strong>
                      </div>
                      <div style={{ width: "100%", height: "200px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={modalChartData}
                            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient
                                id="modalCyanGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#00e5ff"
                                  stopOpacity={0.35}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#00e5ff"
                                  stopOpacity={0.0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(255, 255, 255, 0.08)"
                            />
                            <XAxis
                              dataKey="label"
                              stroke="#94a3b8"
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              stroke="#94a3b8"
                              tickFormatter={(v) => `${v}%`}
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              width={40}
                            />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="percentage"
                              stroke="#00e5ff"
                              strokeWidth={2.5}
                              fill="url(#modalCyanGradient)"
                              dot={{ r: 4, fill: "#090e1c", stroke: "#00e5ff" }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="history-table-wrapper">
                    <table className="user-history-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Assessment</th>
                          <th>Status</th>
                          <th>Score</th>
                          <th>Percentage</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userAssessments.map((a, idx) => (
                          <tr key={a.id}>
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{a.title}</strong>
                            </td>
                            <td>
                              <span className={`status-pill status-${a.status}`}>
                                {a.status}
                              </span>
                            </td>
                            <td>
                              {a.total_score !== null
                                ? `${a.total_score} / ${a.max_score}`
                                : "—"}
                            </td>
                            <td>
                              <strong>
                                {a.percentage !== null &&
                                a.percentage !== undefined
                                  ? `${a.percentage}%`
                                  : "—"}
                              </strong>
                            </td>
                            <td>{formatDate(a.completed_at || a.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddSkillModal
        isOpen={isAddSkillOpen}
        onClose={() => setIsAddSkillOpen(false)}
        onSkillCreated={(newSkill) => {
          setSkills((prev) => [...prev, newSkill]);
          loadSummary();
        }}
      />

      <EditSkillModal
        isOpen={!!editingSkill}
        skill={editingSkill}
        onClose={() => setEditingSkill(null)}
        onSkillUpdated={(updatedSkill) => {
          setSkills((prev) =>
            prev.map((s) => (s.id === updatedSkill.id ? updatedSkill : s))
          );
        }}
      />

      <AddTopicModal
        isOpen={!!addTopicSkillId}
        skillId={addTopicSkillId}
        onClose={() => setAddTopicSkillId(null)}
        onTopicCreated={(newTopic) => {
          setSkillTopicsMap((prev) => ({
            ...prev,
            [addTopicSkillId]: [...(prev[addTopicSkillId] || []), newTopic],
          }));
        }}
      />

      <EditTopicModal
        isOpen={!!editingTopic}
        topic={editingTopic}
        skillId={editingTopic?.skill_id}
        onClose={() => setEditingTopic(null)}
        onTopicUpdated={(updatedTopic) => {
          const sId = updatedTopic.skill_id;
          setSkillTopicsMap((prev) => ({
            ...prev,
            [sId]: (prev[sId] || []).map((t) =>
              t.id === updatedTopic.id ? updatedTopic : t
            ),
          }));
        }}
      />

      <AddSubTopicModal
        isOpen={!!addSubTopicTopicId}
        topicId={addSubTopicTopicId}
        onClose={() => setAddSubTopicTopicId(null)}
        onSubTopicCreated={(newSub) => {
          setTopicSubtopicsMap((prev) => ({
            ...prev,
            [addSubTopicTopicId]: [...(prev[addSubTopicTopicId] || []), newSub],
          }));
        }}
      />

      <EditSubTopicModal
        isOpen={!!editingSubTopic}
        subtopic={editingSubTopic}
        topicId={editingSubTopic?.topic_id}
        onClose={() => setEditingSubTopic(null)}
        onSubTopicUpdated={(updatedSub) => {
          const tId = updatedSub.topic_id;
          setTopicSubtopicsMap((prev) => ({
            ...prev,
            [tId]: (prev[tId] || []).map((s) =>
              s.id === updatedSub.id ? updatedSub : s
            ),
          }));
        }}
      />
    </main>
  );
}

export default AdminDashboard;
