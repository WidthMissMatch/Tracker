import { Component } from 'react';
import { StatusScreen } from './StatusScreen.jsx';

// Last-resort guard: a render error shows a recoverable message instead of a
// blank page (important inside an iframe, where the host can't see the console).
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[app] render failed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <StatusScreen
        error
        title="Something went wrong while drawing the console."
        detail={String(this.state.error.message || this.state.error)}
        action={{ label: 'Reload', onClick: () => window.location.reload() }}
      />
    );
  }
}
