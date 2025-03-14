import { Component, ErrorInfo } from "react";

export default class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | undefined }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: undefined };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo);
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div>
          <h1>Error</h1>
          <pre>{error.message}</pre>
          <pre>{error.stack}</pre>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
