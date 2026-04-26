import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from '../pages/Landing'
import Score from '../pages/Score'
import Navbar from "../components/Navbar.js"
import ScrollToTop from "../components/ScrollToTop.js"
import NovedadPage from '../pages/NovedadPage.js'
import AdminDashboard from '../pages/AdminDashboard.js'
import Booking from '../pages/Booking.js'
import TableMenu from '../pages/TableMenu.js'
import AdminRoute from '../components/AdminRoute.js'
import AdminLogin from '../pages/AdminLogin.js'



export const AppRoutes = () => (
  <BrowserRouter>
    <ScrollToTop />
    <Navbar/>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/score" element={<Score />} />
      <Route path="/reservas" element={<Booking />} />
      <Route path="/menu/mesa/:tableCode" element={<TableMenu />} />
      <Route path="/NovedadPage" element={<NovedadPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
    </Routes>
  </BrowserRouter>
)
