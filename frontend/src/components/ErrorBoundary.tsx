import { Component, type ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
          <h2 style={{ color: '#0F172A', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#64748B', fontSize: 15, maxWidth: 400, marginBottom: 24 }}>
            An unexpected error occurred. Try refreshing the page.
          </p>
          {this.state.error && (
            <pre
              style={{
                padding: 16,
                backgroundColor: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                fontSize: 12,
                color: '#64748B',
                maxWidth: 500,
                overflow: 'auto',
                marginBottom: 24,
                textAlign: 'left',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
