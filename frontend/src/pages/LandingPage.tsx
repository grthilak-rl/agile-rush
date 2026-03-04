import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// ─── Color Constants ───────────────────────────────────────────────
const COLORS = {
  blue: '#2563EB',
  purple: '#8B5CF6',
  orange: '#F97316',
  green: '#10B981',
  rose: '#F43F5E',
  yellow: '#EAB308',
  slate900: '#0F172A',
  slate700: '#334155',
  slate400: '#94A3B8',
  slate100: '#F1F5F9',
  white: '#FFFFFF',
  gold: '#F59E0B',
};

// ─── Navbar ────────────────────────────────────────────────────────
function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks: { label: string; id: string }[] = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'About', id: 'about' },
  ];

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    transition: 'all 300ms ease',
    background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
    borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  };

  const logoSquareStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.white,
    fontFamily: 'Sora, sans-serif',
    fontWeight: 800,
    fontSize: 18,
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    fontSize: 15,
    color: COLORS.slate700,
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    transition: 'color 150ms ease',
  };

  const ctaBtnStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: COLORS.white,
    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  };

  return (
    <nav style={navStyle}>
      <div style={innerStyle}>
        {/* Logo */}
        <div style={logoStyle} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={logoSquareStyle}>A</div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20, color: '#000' }}>
            Agile
          </span>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20, color: COLORS.blue, marginLeft: -6 }}>
            Rush
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {navLinks.map((l) => (
            <button key={l.id} className="nav-link" style={linkStyle} onClick={() => scrollTo(l.id)}>
              {l.label}
            </button>
          ))}
          <button className="nav-link" style={{ ...linkStyle, marginLeft: 8 }} onClick={() => navigate('/login')}>
            Log In
          </button>
          <button className="cta-btn" style={ctaBtnStyle} onClick={() => navigate('/register')}>
            Get Started Free
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="nav-mobile-toggle"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={28} color={COLORS.slate700} /> : <Menu size={28} color={COLORS.slate700} />}
        </button>
      </div>

      {/* Mobile Panel */}
      {mobileOpen && (
        <div
          className="nav-mobile-panel"
          style={{
            background: COLORS.white,
            padding: '16px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          {navLinks.map((l) => (
            <button
              key={l.id}
              style={{ ...linkStyle, fontSize: 16, textAlign: 'left' }}
              onClick={() => scrollTo(l.id)}
            >
              {l.label}
            </button>
          ))}
          <button style={{ ...linkStyle, fontSize: 16, textAlign: 'left' }} onClick={() => { setMobileOpen(false); navigate('/login'); }}>
            Log In
          </button>
          <button style={{ ...ctaBtnStyle, width: '100%', textAlign: 'center', padding: '14px 20px' }} onClick={() => { setMobileOpen(false); navigate('/register'); }}>
            Get Started Free
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/register?email=${encodeURIComponent(email)}`);
  };

  const sectionStyle: React.CSSProperties = {
    position: 'relative',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 25%, #F5F3FF 50%, #FFF7ED 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 100,
    paddingBottom: 80,
  };

  const circleBase: React.CSSProperties = {
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
  };

  return (
    <section style={sectionStyle}>
      {/* Floating circles */}
      <div
        style={{
          ...circleBase,
          width: 400,
          height: 400,
          top: '-5%',
          right: '-5%',
          background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
          opacity: 0.3,
          filter: 'blur(80px)',
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <div
        style={{
          ...circleBase,
          width: 300,
          height: 300,
          bottom: '10%',
          left: '-3%',
          background: 'linear-gradient(135deg, #8B5CF6, #F97316)',
          opacity: 0.2,
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />
      <div
        style={{
          ...circleBase,
          width: 250,
          height: 250,
          top: '40%',
          right: '15%',
          background: 'linear-gradient(135deg, #2563EB, #10B981)',
          opacity: 0.15,
          filter: 'blur(70px)',
          animation: 'float 10s ease-in-out infinite',
          animationDelay: '4s',
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 1000, padding: '0 24px' }}>
        {/* Badge */}
        <div className="hero-animate-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 13,
              color: COLORS.green,
              background: 'rgba(16,185,129,0.15)',
              padding: '4px 12px',
              borderRadius: 999,
            }}
          >
            NEW
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 15, color: COLORS.slate700 }}>
            Scrum done right. Finally.
          </span>
        </div>

        {/* Headline */}
        <h1
          className="hero-animate-2"
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 800,
            fontSize: 64,
            lineHeight: 1.1,
            color: COLORS.slate900,
            margin: '0 0 24px',
          }}
        >
          Ship Faster.
          <br />
          <span
            style={{
              background: 'linear-gradient(90deg, #2563EB, #8B5CF6, #F97316)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              animation: 'gradientMove 3s linear infinite',
            }}
          >
            Sprint Smarter.
          </span>
        </h1>

        {/* Subheading */}
        <p
          className="hero-animate-3"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 18,
            color: '#64748B',
            maxWidth: 600,
            margin: '0 auto 40px',
            lineHeight: 1.7,
          }}
        >
          The agile project management tool that's fast, focused, and free of bloat. Backlog, sprints, boards, and
          retros — everything your team needs, nothing it doesn't.
        </p>

        {/* Email capture */}
        <form
          className="hero-animate-4"
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            maxWidth: 480,
            margin: '0 auto 16px',
            background: COLORS.white,
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <input
            type="email"
            placeholder="Enter your work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              padding: '14px 20px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              color: COLORS.slate700,
              background: 'transparent',
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: COLORS.white,
              border: 'none',
              padding: '14px 28px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Start Free &rarr;
          </button>
        </form>

        {/* Trust text */}
        <p className="hero-animate-5" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: COLORS.slate400 }}>
          Free forever for solo users. No credit card required.
        </p>
      </div>

      {/* App Preview */}
      <div
        className="hero-animate-6"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 900,
          width: '100%',
          margin: '60px auto 0',
          padding: '0 24px',
        }}
      >
        <AppPreview />
      </div>
    </section>
  );
}

// ─── App Preview (Browser Mockup) ──────────────────────────────────
function AppPreview() {
  const columns = [
    {
      title: 'To Do',
      color: COLORS.blue,
      tasks: [
        { name: 'User auth flow', points: '5' },
        { name: 'API docs', points: '3' },
        { name: 'Setup CI pipeline', points: '2' },
      ],
    },
    {
      title: 'In Progress',
      color: COLORS.purple,
      tasks: [
        { name: 'Dashboard widgets', points: '8' },
        { name: 'Design review', points: '3' },
      ],
    },
    {
      title: 'In Review',
      color: COLORS.orange,
      tasks: [
        { name: 'Fix WebSocket leak', points: '5' },
        { name: 'Update nav styles', points: '2' },
      ],
    },
    {
      title: 'Done',
      color: COLORS.green,
      tasks: [
        { name: 'Project setup', points: '1' },
        { name: 'Auth middleware', points: '3' },
        { name: 'Landing page', points: '5' },
      ],
    },
  ];

  return (
    <div
      style={{
        background: COLORS.slate900,
        borderRadius: '12px 12px 12px 12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}
    >
      {/* Browser Chrome */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
        <div
          style={{
            marginLeft: 12,
            flex: 1,
            background: '#1E293B',
            borderRadius: 6,
            padding: '6px 14px',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            color: COLORS.slate400,
          }}
        >
          app.agilerush.com
        </div>
      </div>

      {/* Sprint Board */}
      <div
        className="app-preview-board"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          padding: '8px 16px 20px',
        }}
      >
        {columns.map((col) => (
          <div key={col.title} style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 11,
                color: col.color,
                marginBottom: 8,
                padding: '4px 8px',
                background: `${col.color}15`,
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {col.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {col.tasks.map((task) => (
                <div
                  key={task.name}
                  style={{
                    background: COLORS.white,
                    borderRadius: 6,
                    padding: '8px 10px',
                    borderLeft: `3px solid ${col.color}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 10,
                      color: COLORS.slate700,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 9,
                      color: COLORS.slate400,
                      fontWeight: 600,
                      marginLeft: 4,
                      flexShrink: 0,
                    }}
                  >
                    {task.points}pt
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Features Section ──────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: '\u{1F4CB}',
      title: 'Product Backlog',
      color: COLORS.blue,
      desc: 'Prioritize and organize your work with a powerful, drag-and-drop backlog.',
    },
    {
      icon: '\u{1F3C3}',
      title: 'Sprint Board',
      color: COLORS.purple,
      desc: 'Visualize your sprint with a beautiful Kanban board. Drag cards between columns.',
    },
    {
      icon: '\u{1F4C5}',
      title: 'Sprint Planning',
      color: COLORS.orange,
      desc: 'Plan sprints with capacity tracking and automatic story point calculations.',
    },
    {
      icon: '\u{1F504}',
      title: 'Retrospectives',
      color: COLORS.green,
      desc: 'Run effective retros with three-column boards, voting, and action items.',
    },
    {
      icon: '\u{1F4C8}',
      title: 'Reports & Analytics',
      color: COLORS.rose,
      desc: 'Burndown charts, velocity tracking, and sprint summaries at a glance.',
    },
    {
      icon: '\u26A1',
      title: 'Lightning Fast',
      color: COLORS.yellow,
      desc: 'Built for speed. No loading spinners, no waiting. Just instant productivity.',
    },
  ];

  return (
    <section id="features" style={{ background: COLORS.white, padding: '100px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: COLORS.blue,
            marginBottom: 12,
          }}
        >
          FEATURES
        </p>
        <h2
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 700,
            fontSize: 40,
            color: COLORS.slate900,
            margin: '0 0 16px',
          }}
        >
          Everything you need. Nothing you don't.
        </h2>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 18,
            color: '#64748B',
            maxWidth: 620,
            margin: '0 auto 56px',
            lineHeight: 1.6,
          }}
        >
          Built for developers and product teams who want to move fast without fighting their tools.
        </p>

        <div
          className="features-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, color, desc }: { icon: string; title: string; color: string; desc: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${color}08` : COLORS.white,
        borderRadius: 16,
        padding: 32,
        border: `1px solid ${hovered ? `${color}4D` : '#E2E8F0'}`,
        textAlign: 'left',
        transition: 'all 200ms ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        cursor: 'default',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}1A`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontFamily: 'Sora, sans-serif',
          fontWeight: 600,
          fontSize: 18,
          color: COLORS.slate900,
          margin: '16px 0 0',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: 15,
          color: '#64748B',
          margin: '8px 0 0',
          lineHeight: 1.6,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

// ─── How It Works Section ──────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Create a Project',
      desc: 'Set up your project in seconds. Name it, configure sprints, invite your team.',
      color: COLORS.blue,
    },
    {
      num: '02',
      title: 'Build Your Backlog',
      desc: 'Add stories, tasks, and bugs. Prioritize with drag-and-drop. Estimate with story points.',
      color: COLORS.purple,
    },
    {
      num: '03',
      title: 'Plan & Sprint',
      desc: 'Pull items into sprints. Track capacity. Start your sprint and watch progress flow.',
      color: COLORS.orange,
    },
    {
      num: '04',
      title: 'Ship & Reflect',
      desc: 'Complete sprints, run retros, and continuously improve your team\'s velocity.',
      color: COLORS.green,
    },
  ];

  return (
    <section
      id="how-it-works"
      style={{
        background: COLORS.slate900,
        padding: '100px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floating blobs */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          top: '-10%',
          left: '20%',
          background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
          opacity: 0.08,
          filter: 'blur(80px)',
          animation: 'float 8s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 250,
          height: 250,
          borderRadius: '50%',
          bottom: '5%',
          right: '10%',
          background: 'linear-gradient(135deg, #F97316, #F43F5E)',
          opacity: 0.06,
          filter: 'blur(70px)',
          animation: 'float 10s ease-in-out infinite',
          animationDelay: '3s',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#60A5FA',
            marginBottom: 12,
          }}
        >
          HOW IT WORKS
        </p>
        <h2
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 700,
            fontSize: 40,
            color: COLORS.white,
            margin: '0 0 56px',
          }}
        >
          From zero to shipping in four steps
        </h2>

        <div
          className="steps-grid"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            justifyContent: 'center',
          }}
        >
          {steps.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'stretch' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 32,
                  textAlign: 'left',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontWeight: 800,
                    fontSize: 48,
                    color: `${s.color}33`,
                  }}
                >
                  {s.num}
                </div>
                <h3
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontWeight: 600,
                    fontSize: 20,
                    color: COLORS.white,
                    margin: '16px 0 0',
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.6)',
                    margin: '8px 0 0',
                    lineHeight: 1.6,
                  }}
                >
                  {s.desc}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="step-arrow"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: 24,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  &rarr;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials Section ──────────────────────────────────────────
function TestimonialsSection() {
  const testimonials = [
    {
      stars: 5,
      quote:
        'AgileRush replaced three tools for us. The backlog management is incredible \u2014 finally, drag-and-drop that actually works.',
      initials: 'JM',
      color: COLORS.blue,
      name: 'Jamie Morrison',
      role: 'Engineering Lead at Stripe',
    },
    {
      stars: 5,
      quote:
        "We shipped our MVP two weeks faster after switching to AgileRush. The sprint board is chef's kiss.",
      initials: 'SL',
      color: COLORS.purple,
      name: 'Sarah Liu',
      role: 'Product Manager at Vercel',
    },
    {
      stars: 5,
      quote:
        'The retro feature alone is worth it. Our team communication improved 10x since we started using AgileRush.',
      initials: 'RK',
      color: COLORS.green,
      name: 'Ryan Kim',
      role: 'CTO at LaunchDarkly',
    },
  ];

  return (
    <section id="testimonials" style={{ background: '#F8FAFC', padding: '100px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: COLORS.purple,
            marginBottom: 12,
          }}
        >
          TESTIMONIALS
        </p>
        <h2
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 700,
            fontSize: 40,
            color: COLORS.slate900,
            margin: '0 0 56px',
          }}
        >
          Loved by teams who ship fast
        </h2>

        <div
          className="testimonials-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}
        >
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                background: COLORS.white,
                borderRadius: 16,
                padding: 32,
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                textAlign: 'left',
              }}
            >
              {/* Stars */}
              <div style={{ marginBottom: 16 }}>
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} style={{ color: COLORS.gold, fontSize: 18, marginRight: 2 }}>
                    {'\u2605'}
                  </span>
                ))}
              </div>
              {/* Quote */}
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: 16,
                  color: COLORS.slate700,
                  lineHeight: '28px',
                  fontStyle: 'italic',
                  margin: '0 0 24px',
                }}
              >
                "{t.quote}"
              </p>
              {/* Person */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: t.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.white,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: 15,
                      color: COLORS.slate900,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 400,
                      fontSize: 14,
                      color: '#64748B',
                    }}
                  >
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ───────────────────────────────────────────────
function PricingSection() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      badge: null,
      features: [
        'Up to 3 projects',
        '1 team member',
        'Basic backlog & board',
        'Sprint planning',
        'Community support',
      ],
      cta: 'Get Started',
      ctaStyle: 'outlined' as const,
      highlighted: false,
      onClick: () => navigate('/register'),
    },
    {
      name: 'Pro',
      price: '$8',
      period: '/user/mo',
      badge: 'MOST POPULAR',
      features: [
        'Unlimited projects',
        'Unlimited members',
        'Advanced analytics',
        'Retrospectives',
        'Priority support',
        'Custom workflows',
      ],
      cta: 'Start Free Trial',
      ctaStyle: 'filled' as const,
      highlighted: true,
      onClick: () => navigate('/register?plan=pro'),
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      badge: null,
      features: [
        'Everything in Pro',
        'SSO & SAML',
        'Audit logs',
        'Dedicated support',
        'SLA guarantee',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      ctaStyle: 'outlined' as const,
      highlighted: false,
      onClick: () => navigate('/contact'),
    },
  ];

  return (
    <section id="pricing" style={{ background: COLORS.white, padding: '100px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: COLORS.orange,
            marginBottom: 12,
          }}
        >
          PRICING
        </p>
        <h2
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 700,
            fontSize: 40,
            color: COLORS.slate900,
            margin: '0 0 56px',
          }}
        >
          Start free. Scale when ready.
        </h2>

        <div
          className="pricing-grid"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: COLORS.white,
                borderRadius: 16,
                padding: 40,
                border: plan.highlighted ? `2px solid ${COLORS.blue}` : '1px solid #E2E8F0',
                textAlign: 'left',
                width: 340,
                position: 'relative',
                transform: plan.highlighted ? 'scale(1.05)' : 'scale(1)',
                boxShadow: plan.highlighted ? '0 12px 40px rgba(37,99,235,0.15)' : 'none',
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: COLORS.blue,
                    color: COLORS.white,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    fontSize: 12,
                    padding: '4px 16px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {plan.badge}
                </div>
              )}
              <h3
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontWeight: 700,
                  fontSize: 22,
                  color: COLORS.slate900,
                  margin: '0 0 8px',
                }}
              >
                {plan.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontWeight: 800,
                    fontSize: 48,
                    color: COLORS.slate900,
                  }}
                >
                  {plan.price}
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: 16,
                    color: '#64748B',
                  }}
                >
                  {plan.period}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
                {plan.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 15,
                      color: COLORS.slate700,
                      padding: '6px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span style={{ color: COLORS.green, fontWeight: 700, fontSize: 16 }}>{'\u2713'}</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.onClick}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: 10,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  ...(plan.ctaStyle === 'filled'
                    ? {
                        background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                        color: COLORS.white,
                        border: 'none',
                      }
                    : {
                        background: 'transparent',
                        color: COLORS.slate900,
                        border: `2px solid #E2E8F0`,
                      }),
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA Section ─────────────────────────────────────────────
function FinalCTASection() {
  const navigate = useNavigate();

  return (
    <section
      style={{
        background: COLORS.slate900,
        padding: '80px 0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floating blobs */}
      <div
        style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          top: '-20%',
          right: '10%',
          background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
          opacity: 0.08,
          filter: 'blur(80px)',
          animation: 'float 7s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: '50%',
          bottom: '-15%',
          left: '15%',
          background: 'linear-gradient(135deg, #F97316, #F43F5E)',
          opacity: 0.06,
          filter: 'blur(70px)',
          animation: 'float 9s ease-in-out infinite',
          animationDelay: '2s',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <h2
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 700,
            fontSize: 40,
            color: COLORS.white,
            margin: '0 0 16px',
          }}
        >
          Ready to ship faster?
        </h2>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: 18,
            color: 'rgba(255,255,255,0.6)',
            margin: '0 0 40px',
            lineHeight: 1.7,
          }}
        >
          Join thousands of teams who've ditched bloated tools for something that actually works.
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            color: COLORS.white,
            border: 'none',
            padding: '16px 40px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 16,
            borderRadius: 12,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          Get Started Free &rarr;
        </button>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 16,
          }}
        >
          No credit card required &middot; Free forever for solo users
        </p>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────
function Footer() {
  const footerLinks = [
    {
      heading: 'Product',
      links: ['Features', 'Pricing', 'Changelog', 'Roadmap'],
    },
    {
      heading: 'Resources',
      links: ['Documentation', 'Blog', 'Support', 'API'],
    },
    {
      heading: 'Company',
      links: ['About', 'Careers', 'Contact', 'Privacy'],
    },
  ];

  const linkStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    display: 'block',
    marginBottom: 12,
    transition: 'color 200ms ease',
  };

  return (
    <footer
      id="about"
      style={{
        background: COLORS.slate900,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '60px 0 30px',
      }}
    >
      <div
        className="footer-grid"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 40,
        }}
      >
        {/* Logo Column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.white,
                fontFamily: 'Sora, sans-serif',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              A
            </div>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20, color: COLORS.white }}>
              Agile
            </span>
            <span
              style={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: 800,
                fontSize: 20,
                color: COLORS.blue,
                marginLeft: -6,
              }}
            >
              Rush
            </span>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
            }}
          >
            Ship faster. Together.
          </p>
        </div>

        {/* Link Columns */}
        {footerLinks.map((col) => (
          <div key={col.heading}>
            <h4
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 14,
                color: COLORS.white,
                margin: '0 0 20px',
              }}
            >
              {col.heading}
            </h4>
            {col.links.map((link) => (
              <a key={link} href="#" style={linkStyle} className="footer-link">
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '30px 24px 0',
          marginTop: 40,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.3)',
            margin: 0,
          }}
        >
          &copy; 2026 AgileRush. All rights reserved.
        </p>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.3)',
            margin: 0,
          }}
        >
          Built by Rajthilak
        </p>
      </div>
    </footer>
  );
}

// ─── Main Landing Page Component ───────────────────────────────────
export default function LandingPage() {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Override body background for landing page
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#FFFFFF';
    return () => { document.body.style.background = prev; };
  }, []);

  useEffect(() => {
    if (styleRef.current) return;
    const style = document.createElement('style');
    style.textContent = `
      /* ── Keyframe Animations ── */
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes gradientMove {
        0% { background-position: 0% center; }
        100% { background-position: 200% center; }
      }

      /* ── Hero Stagger Animations ── */
      .hero-animate-1 {
        animation: fadeUp 0.6s ease forwards;
        animation-delay: 0s;
        opacity: 0;
      }
      .hero-animate-2 {
        animation: fadeUp 0.6s ease forwards;
        animation-delay: 0.1s;
        opacity: 0;
      }
      .hero-animate-3 {
        animation: fadeUp 0.6s ease forwards;
        animation-delay: 0.2s;
        opacity: 0;
      }
      .hero-animate-4 {
        animation: fadeUp 0.6s ease forwards;
        animation-delay: 0.3s;
        opacity: 0;
      }
      .hero-animate-5 {
        animation: fadeUp 0.6s ease forwards;
        animation-delay: 0.4s;
        opacity: 0;
      }
      .hero-animate-6 {
        animation: fadeUp 0.6s ease forwards;
        animation-delay: 0.5s;
        opacity: 0;
      }

      /* ── Nav Link Hover ── */
      .nav-link:hover {
        color: #2563EB !important;
      }

      /* ── CTA Button Hover ── */
      .cta-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      }

      /* ── Footer Link Hover ── */
      .footer-link:hover {
        color: rgba(255,255,255,1) !important;
      }

      /* ── Responsive: Tablet (768–1024px) ── */
      @media (max-width: 1024px) {
        .features-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .steps-grid {
          flex-wrap: wrap !important;
          gap: 16px !important;
        }
        .steps-grid > div {
          flex-basis: calc(50% - 8px) !important;
        }
        .step-arrow {
          display: none !important;
        }
        .testimonials-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .pricing-grid > div {
          width: 300px !important;
        }
        .footer-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }

      /* ── Responsive: Mobile (<768px) ── */
      @media (max-width: 767px) {
        .nav-desktop {
          display: none !important;
        }
        .nav-mobile-toggle {
          display: block !important;
        }
        .features-grid {
          grid-template-columns: 1fr !important;
        }
        .steps-grid {
          flex-direction: column !important;
        }
        .steps-grid > div {
          flex-basis: 100% !important;
        }
        .step-arrow {
          display: none !important;
        }
        .testimonials-grid {
          grid-template-columns: 1fr !important;
        }
        .pricing-grid {
          flex-direction: column !important;
          align-items: center !important;
        }
        .pricing-grid > div {
          width: 100% !important;
          max-width: 400px !important;
          transform: scale(1) !important;
        }
        .footer-grid {
          grid-template-columns: 1fr !important;
        }
        .app-preview-board {
          grid-template-columns: repeat(2, 1fr) !important;
        }

        /* Hero heading size */
        .hero-animate-2 {
          font-size: 42px !important;
        }
      }

      /* ── Desktop default: hide mobile toggle ── */
      @media (min-width: 768px) {
        .nav-mobile-toggle {
          display: none !important;
        }
        .nav-mobile-panel {
          display: none !important;
        }
      }

      /* ── Smooth scrolling ── */
      html {
        scroll-behavior: smooth;
      }

      /* ── Reset for landing page ── */
      *, *::before, *::after {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: COLORS.slate900, overflowX: 'hidden' }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}
