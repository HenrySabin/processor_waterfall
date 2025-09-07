import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@shopify/polaris";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import "@shopify/polaris/build/esm/styles.css";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider 
        i18n={{}}
      >
        <Router />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
