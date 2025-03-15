import { Suspense } from "react";
import LoginPage from "./LoginPage";
import ErrorBoundary from "./ErrorBoundary";
import { Provider } from "./ui/provider";

export function App() {
  return (
    <Provider>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <div>
            <LoginPage>You are logged in.</LoginPage>
          </div>
        </Suspense>
      </ErrorBoundary>
    </Provider>
  );
}
