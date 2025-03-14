import { Suspense } from "react";
import LoginPage from "./LoginPage";
import ErrorBoundary from "./ErrorBoundary";
export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <div>
          <LoginPage />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
