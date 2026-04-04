import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/common/Navbar'
import Sidebar from './components/common/Sidebar'
import { useAuth } from './hooks/useAuth'
import Alerts from './pages/Alerts'
import Dashboard from './pages/Dashboard'
import DCBDetail from './pages/DCBDetail'
import DeviceDetail from './pages/DeviceDetail'
import Devices from './pages/Devices'
import Energy from './pages/Energy'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import SelectRole from './pages/SelectRole'
import Settings from './pages/Settings'

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-bg text-textPrimary">
      <div className="mx-auto flex w-full max-w-[1700px]">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/devices/:id" element={<DeviceDetail />} />
              <Route path="/dcb/:id" element={<DCBDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/energy" element={<Energy />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-bg" />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        path="/select-role"
        element={isAuthenticated ? <SelectRole /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/*"
        element={isAuthenticated ? <ProtectedLayout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App
