import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let friendlyHint = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && parsed.error) {
          friendlyHint = `${parsed.error} (Operation: ${parsed.operationType}, Path: ${parsed.path})`;
        }
      } catch {
        // Not a JSON error string
      }

      return (
        <div className="min-h-screen bg-[#F4F6F7] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold">Application Notice / سسٹم پیغام</h2>
            </div>
            <p className="text-sm text-slate-600 break-words leading-relaxed">
              {friendlyHint}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#136168] text-white text-sm font-medium rounded-lg hover:bg-[#0e4b51] transition-colors whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page / دوبارہ لوڈ کریں</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
