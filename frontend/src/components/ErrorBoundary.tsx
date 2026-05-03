import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          gap: "16px",
          padding: "32px",
          background: "#13131c",
          borderRadius: "12px",
          border: "1px solid #2a2a3a",
        }}>
          <span style={{ fontSize: "24px" }}>⚠️</span>
          <p style={{ color: "#e2e2e8", fontSize: "14px", textAlign: "center" }}>
            Something went wrong
          </p>
          {this.state.error && (
            <p style={{ color: "#E67E22", fontSize: "12px", maxWidth: "400px", textAlign: "center" }}>
              {this.state.error}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#222232",
              border: "1px solid #2a2a3a",
              color: "#9999b0",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
