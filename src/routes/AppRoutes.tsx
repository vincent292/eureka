import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from '../pages/Landing'
import Score from '../pages/Score'
import Navbar from "../components/Navbar.js"
import NovedadPage from '../pages/NovedadPage.js'
import AdminDashboard from '../pages/AdminDashboard.js'



export const AppRoutes = () => (
  <BrowserRouter>
    <Navbar/>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/score" element={<Score />} />
      <Route path="/NovedadPage" element={<NovedadPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  </BrowserRouter>
)
