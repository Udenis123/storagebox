import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageSkeleton } from "@/components/shared/States";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/lib/api";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";

const OverviewPage = lazy(() => import("@/pages/OverviewPage"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const ApiKeysPage = lazy(() => import("@/pages/ApiKeysPage"));
const WebhooksPage = lazy(() => import("@/pages/WebhooksPage"));
const DocsPage = lazy(() => import("@/pages/DocsPage"));
const ActivityPage = lazy(() => import("@/pages/ActivityPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) =>
        !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/overview" element={<OverviewPage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/keys" element={<ApiKeysPage />} />
                  <Route path="/webhooks" element={<WebhooksPage />} />
                  <Route path="/docs" element={<DocsPage />} />
                  <Route path="/activity" element={<ActivityPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route element={<RequireAuth adminOnly />}>
                    <Route path="/admin" element={<AdminPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
