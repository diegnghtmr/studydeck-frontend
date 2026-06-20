import { QueryProvider } from "./providers/QueryProvider";
import { OidcProvider } from "@shared/auth/OidcProvider";
import { AppRouter } from "./router/AppRouter";

export function App() {
  return (
    <QueryProvider>
      <OidcProvider>
        <AppRouter />
      </OidcProvider>
    </QueryProvider>
  );
}
