import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { clearPersistedState } from '../utils/storage';
import { sanitizeTextInput } from '../utils/security';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Top-Level React Error Boundary
 * Ensures fault tolerance by catching unexpected rendering errors and providing
 * an accessible recovery action without exposing sensitive stack traces.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const rawMessage =
      error instanceof Error
        ? error.message
        : 'An unexpected application error occurred.';
    return {
      hasError: true,
      errorMessage:
        sanitizeTextInput(rawMessage, 180) || 'An unexpected application error occurred.',
    };
  }

  private handleResetAndRecover = (): void => {
    clearPersistedState();
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          aria-live="assertive"
          className="app-shell min-h-screen flex items-center justify-center bg-[#F7F3EA] p-6 text-[#2B241D]"
        >
          <div className="beige-panel max-w-md rounded-3xl p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF1EC] border border-[#EBC5B5] text-[#9A3412]">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-extrabold text-[#231D17]">
              Something went wrong
            </h1>
            <p className="text-xs text-[#5C5246] leading-relaxed">
              AeroGuard AI encountered a display issue ({this.state.errorMessage}). Click below to reset saved view preferences and recover immediately.
            </p>
            <button
              type="button"
              onClick={this.handleResetAndRecover}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] px-5 py-2.5 text-xs font-bold text-[#FFFDF8] hover:bg-[#1B4D35] transition"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset &amp; Recover Application</span>
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
