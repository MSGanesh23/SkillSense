import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const slides = [
  {
    eyebrow: "01 — DISCOVER",
    title: "See what you actually know.",
    description:
      "SkillSense maps a skill into the concepts that matter, so learning starts with evidence instead of assumptions.",
    visual: "map",
  },
  {
    eyebrow: "02 — ASSESS",
    title: "Test understanding. Not memory.",
    description:
      "Take focused assessments built around the skill you want to master.",
    visual: "assessment",
  },
  {
    eyebrow: "03 — DIAGNOSE",
    title: "Find the gap behind the score.",
    description:
      "A single percentage is not enough. SkillSense identifies the concepts where your understanding breaks down.",
    visual: "diagnosis",
  },
  {
    eyebrow: "04 — REMEDIATE",
    title: "Learn exactly what comes next.",
    description:
      "Get a targeted learning path built around your weakest concepts.",
    visual: "remediation",
  },
  {
    eyebrow: "05 — MASTER",
    title: "Retest. Improve. Know for sure.",
    description:
      "Measure your progress over time and turn every assessment into a clearer picture of mastery.",
    visual: "mastery",
  },
];

function SkillMapVisual() {
  return (
    <div className="home-visual home-map">
      <div className="home-visual-header">
        <span>Skill map</span>
        <span className="home-status">LIVE ANALYSIS</span>
      </div>

      <div className="skill-map">
        <div className="skill-root">
          <span>PYTHON</span>
          <strong>82%</strong>
        </div>

        <div className="skill-line line-one" />
        <div className="skill-line line-two" />
        <div className="skill-line line-three" />
        <div className="skill-line line-four" />

        <div className="skill-node node-one">
          <span>Fundamentals</span>
          <strong>92%</strong>
        </div>

        <div className="skill-node node-two">
          <span>Control Flow</span>
          <strong>84%</strong>
        </div>

        <div className="skill-node node-three">
          <span>Functions</span>
          <strong>76%</strong>
        </div>

        <div className="skill-node node-four weak">
          <span>Data Structures</span>
          <strong>58%</strong>
          <small>FOCUS AREA</small>
        </div>
      </div>
    </div>
  );
}

function AssessmentVisual() {
  return (
    <div className="home-visual">
      <div className="home-visual-header">
        <span>Python assessment</span>
        <span>04 / 12</span>
      </div>

      <div className="assessment-demo">
        <div className="demo-label">QUESTION 04</div>

        <h3>What does this expression return?</h3>

        <div className="code-demo">
          <span>17</span>
          <b>//</b>
          <span>5</span>
        </div>

        <div className="answer-demo">
          <div>
            <span>A</span>
            2
          </div>

          <div className="selected">
            <span>B</span>
            3
            <i>✓</i>
          </div>

          <div>
            <span>C</span>
            3.4
          </div>

          <div>
            <span>D</span>
            4
          </div>
        </div>

        <div className="demo-progress">
          <span />
        </div>
      </div>
    </div>
  );
}

function DiagnosisVisual() {
  return (
    <div className="home-visual">
      <div className="home-visual-header">
        <span>Skill diagnosis</span>
        <span className="home-status">ANALYZED</span>
      </div>

      <div className="diagnosis-demo">
        <div className="diagnosis-score">
          <div>
            <small>OVERALL SCORE</small>
            <strong>74%</strong>
          </div>

          <div className="score-ring">
            <span>74</span>
          </div>
        </div>

        <div className="diagnosis-bars">
          {[
            ["Fundamentals", 92],
            ["Control Flow", 84],
            ["Functions", 76],
            ["Data Structures", 58],
          ].map(([name, score]) => (
            <div className="diagnosis-row" key={name}>
              <div>
                <span>{name}</span>
                <b>{score}%</b>
              </div>

              <div className="diagnosis-bar">
                <span style={{ width: `${score}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="gap-callout">
          <span />
          <div>
            <strong>Gap detected</strong>
            <p>Nested data structures need attention.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemediationVisual() {
  return (
    <div className="home-visual">
      <div className="home-visual-header">
        <span>Your learning path</span>
        <span>3 STEPS</span>
      </div>

      <div className="learning-demo">
        <div className="learning-line" />

        <div className="learning-step complete">
          <div className="learning-icon">✓</div>

          <div>
            <small>STEP 01</small>
            <strong>Review dictionaries</strong>
            <span>12 min · Reading</span>
          </div>
        </div>

        <div className="learning-step active">
          <div className="learning-icon">02</div>

          <div>
            <small>STEP 02 · CURRENT</small>
            <strong>Nested structures</strong>
            <span>18 min · Practice</span>
          </div>
        </div>

        <div className="learning-step">
          <div className="learning-icon">03</div>

          <div>
            <small>STEP 03</small>
            <strong>Targeted practice</strong>
            <span>10 min · Assessment</span>
          </div>
        </div>
      </div>

      <div className="learning-footer">
        <span>1 of 3 complete</span>

        <div>
          <span />
        </div>
      </div>
    </div>
  );
}

function MasteryVisual() {
  return (
    <div className="home-visual">
      <div className="home-visual-header">
        <span>Mastery progress</span>
        <span>5 ASSESSMENTS</span>
      </div>

      <div className="mastery-demo">
        <div className="mastery-heading">
          <div>
            <small>CURRENT MASTERY</small>
            <strong>76%</strong>
            <span>+21% since your first assessment</span>
          </div>
        </div>

        <div className="mastery-chart">
          <div className="chart-lines">
            <span />
            <span />
            <span />
          </div>

          <svg viewBox="0 0 600 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id="masteryFill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgba(0,229,255,.24)"
                />
                <stop
                  offset="100%"
                  stopColor="rgba(0,229,255,0)"
                />
              </linearGradient>
            </defs>

            <path
              className="chart-fill"
              d="M0 175 C100 160, 120 145, 180 135 S280 120, 340 95 S440 100, 600 45 L600 220 L0 220 Z"
            />

            <path
              className="chart-line"
              d="M0 175 C100 160, 120 145, 180 135 S280 120, 340 95 S440 100, 600 45"
            />

            <circle cx="0" cy="175" r="5" />
            <circle cx="150" cy="142" r="5" />
            <circle cx="300" cy="110" r="5" />
            <circle cx="450" cy="98" r="5" />
            <circle cx="600" cy="45" r="6" />
          </svg>

          <div className="chart-labels">
            <span>01</span>
            <span>02</span>
            <span>03</span>
            <span>04</span>
            <span>05</span>
          </div>
        </div>

        <div className="mastery-stats">
          <span>
            Best <b>81%</b>
          </span>

          <span>
            Average <b>70.8%</b>
          </span>

          <span>
            Recent <b>76%</b>
          </span>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;

    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [paused]);

  const slide = slides[activeSlide];

  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
  };

  const previousSlide = () => {
    setActiveSlide(
      (current) => (current - 1 + slides.length) % slides.length,
    );
  };

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-intro">
          <span className="home-eyebrow">
            <i />
            INTELLIGENT SKILL ASSESSMENT
          </span>

          <h1>
            Know what you know.
            <br />
            <span>Discover what you don't.</span>
          </h1>

          <p>
            SkillSense measures your understanding, finds the concepts holding
            you back, and shows you exactly what to learn next.
          </p>

          <Link to="/dashboard" className="home-primary-button">
            Let's Get Started
            <span>→</span>
          </Link>

          <div className="home-loop-label">
            LEARN <i>→</i> ASSESS <i>→</i> DIAGNOSE <i>→</i> MASTER
          </div>
        </div>

        <div
          className="home-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="home-carousel-glow" />

          <div className="home-carousel-card">
            <div className="home-carousel-top">
              <div>
                <span className="home-product-dot" />
                SkillSense
              </div>

              <span>
                {String(activeSlide + 1).padStart(2, "0")} / 05
              </span>
            </div>

            <div className="home-carousel-heading">
              <div>
                <small>{slide.eyebrow}</small>
                <h2>{slide.title}</h2>
              </div>

              <p>{slide.description}</p>
            </div>

            <div className="home-visual-stage" key={slide.visual}>
              {slide.visual === "map" && <SkillMapVisual />}
              {slide.visual === "assessment" && <AssessmentVisual />}
              {slide.visual === "diagnosis" && <DiagnosisVisual />}
              {slide.visual === "remediation" && <RemediationVisual />}
              {slide.visual === "mastery" && <MasteryVisual />}
            </div>
          </div>
        </div>
      </section>

      <section className="home-carousel-controls">
        <div className="home-slide-tabs">
          {slides.map((item, index) => (
            <button
              type="button"
              key={item.eyebrow}
              className={index === activeSlide ? "active" : ""}
              onClick={() => setActiveSlide(index)}
            >
              <span />
              {item.eyebrow.split("—")[1]}
            </button>
          ))}
        </div>

        <div className="home-slide-arrows">
          <button type="button" onClick={previousSlide}>
            ←
          </button>

          <button type="button" onClick={nextSlide}>
            →
          </button>
        </div>
      </section>
    </main>
  );
}

export default Home;