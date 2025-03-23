import { Suspense } from "react";
import LoginPage from "./LoginPage";
import { Boundary } from "./Boundary";
import { Provider } from "./ui/provider";
import { Home } from "./Home";
export function App() {
  return (
    <Provider>
      <Boundary>
        <div>
          <LoginPage>
            <Home />
          </LoginPage>
        </div>
      </Boundary>
    </Provider>
  );
}
