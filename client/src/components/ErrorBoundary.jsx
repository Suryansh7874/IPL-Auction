import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container">
          <h2>Something went wrong</h2>
          <pre className="error">{String(this.state.error)}</pre>
          <button
            onClick={() => {
              sessionStorage.clear();
              location.reload();
            }}
          >
            Log out and reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}