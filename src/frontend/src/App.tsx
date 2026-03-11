import { Toaster } from "@/components/ui/sonner";
import { AdminProvider } from "@/context/AdminContext";
import { ClassProvider } from "@/context/ClassContext";
import { AdminPage } from "@/pages/AdminPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

// ─── Route Tree ─────────────────────────────────────────────

const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LoginPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  adminRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App ─────────────────────────────────────────────────────

export default function App() {
  return (
    <AdminProvider>
      <ClassProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </ClassProvider>
    </AdminProvider>
  );
}
