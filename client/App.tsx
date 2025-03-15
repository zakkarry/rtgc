import { Suspense } from "react";
import LoginPage from "./LoginPage";
import ErrorBoundary from "./ErrorBoundary";
import { Provider } from "./ui/provider";
import { Home } from "./Home";
export function App() {
  return (
    <Provider>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <div>
            <LoginPage>
              <Home />
            </LoginPage>
          </div>
        </Suspense>
      </ErrorBoundary>
    </Provider>
  );
}
