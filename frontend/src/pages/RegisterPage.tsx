import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Zap } from 'lucide-react';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(email, fullName, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: 14,
    transition: 'border-color 150ms ease',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 400,
          maxWidth: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 40,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={18} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20 }}>
            Agile<span style={{ color: '#2563EB' }}>Rush</span>
          </span>
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>Create your account</h2>
        <p style={{ textAlign: 'center', color: '#64748B', marginBottom: 24, fontSize: 14 }}>
          Start managing your projects for free
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                color: '#EF4444',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 6 }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; }}
            />
          </div>

          <Button type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748B' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, textDecoration: 'none' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
