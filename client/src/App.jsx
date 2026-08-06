import { Routes, Route, Navigate } from 'react-router';

// Import page components
import EditForm from './components/EditForm'
import Index from './components/Index'
import CaseLibrary from './components/CaseLibrary'
import Schedule from './components/Schedule'
import DndExample from './components/DndExample'
import PersonnelLibary from './components/PersonnelLibrary'
import IndividualPersonnel from './components/IndividualPersonnel';
import AttorneyView from './components/AttorneyView';
import AccessManagement from './components/AccessManagement';
import ResetPassword from './components/ResetPassword';
import { useAuth } from './auth/useAuth';

/**
 * ProtectedRoute — wraps a route and enforces role-based access.
 * allowedRoles: array of roles that are permitted (e.g. ["Admin", "Staff", "Attorney"])
 * fallback: path to redirect to when access is denied
 */
function ProtectedRoute({ element, allowedRoles, fallback }) {
  const { role, loading } = useAuth();

  if (loading) return <div className="app-auth-loading">Loading...</div>;

  // Not logged in → back to login
  if (!role) return <Navigate to="/" replace />;

  // Role not permitted → redirect to their home page
  if (!allowedRoles.includes(role)) return <Navigate to={fallback} replace />;

  return element;
}

/** Returns the home path for a given role */
function roleHome(role) {
  if (role === "Staff") return "/case-library";
  if (role === "Attorney" || role === "Legal Student") return "/attorney-view";
  return "/schedule"; // Admin or unknown
}

function App() {
  const attorney = true;
  const { role, loading } = useAuth();

  return (
    <div>
      <Routes>
        {/* Login page — if already logged in, redirect to role home */}
        <Route
          index
          element={loading ? <div className="app-auth-loading">Loading...</div> : role ? <Navigate to={roleHome(role)} replace /> : <Index />}
        />

        {/* Admin + Staff */}
        <Route
          path="case-library"
          element={
            <ProtectedRoute
              element={<CaseLibrary />}
              allowedRoles={["Admin", "Staff"]}
              fallback={roleHome(role)}
            />
          }
        />

        {/* Admin + Staff */}
        <Route
          path="new-form"
          element={
            <ProtectedRoute
              element={<EditForm newForm={true} attorney={attorney} />}
              allowedRoles={["Admin", "Staff"]}
              fallback={roleHome(role)}
            />
          }
        />
        <Route
          path="edit-form/:id?"
          element={
            <ProtectedRoute
              element={<EditForm newForm={false} attorney={attorney} />}
              allowedRoles={["Admin", "Staff", "Attorney", "Legal Student"]}
              fallback={roleHome(role)}
            />
          }
        />
        <Route
          path="personnel-library"
          element={
            <ProtectedRoute
              element={<PersonnelLibary individual={false} />}
              allowedRoles={["Admin"]}
              fallback={roleHome(role)}
            />
          }
        />
        <Route
          path="personnel-library/:id?"
          element={
            <ProtectedRoute
              element={<IndividualPersonnel individual={true} />}
              allowedRoles={["Admin"]}
              fallback={roleHome(role)}
            />
          }
        />
        <Route
          path="schedule"
          element={
            <ProtectedRoute
              element={<Schedule />}
              allowedRoles={["Admin"]}
              fallback={roleHome(role)}
            />
          }
        />
        <Route
          path="access-management"
          element={
            <ProtectedRoute
              element={<AccessManagement />}
              allowedRoles={["Admin"]}
              fallback={roleHome(role)}
            />
          }
        />

        {/* Admin + Attorney */}
        <Route
          path="attorney-view"
          element={
            <ProtectedRoute
              element={<AttorneyView />}
              allowedRoles={["Admin", "Attorney", "Legal Student"]}
              fallback={roleHome(role)}
            />
          }
        />

        {/* Public — reached via the emailed password-reset link, no login required */}
        <Route path="reset-password" element={<ResetPassword />} />

        <Route path="example" element={<DndExample />} />
      </Routes>
    </div>
  );
}

export default App;
