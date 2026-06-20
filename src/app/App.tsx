import { QueryProvider } from "./providers/QueryProvider";
import { AppRouter } from "./router/AppRouter";

export function App() {
  return (
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  );
}
