import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from '../pages/Landing'
import Score from '../pages/Score'
import Navbar from "../components/Navbar.js"

export const AppRoutes = () => (
  <BrowserRouter>
    <Navbar/>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/score" element={<Score />} />
    </Routes>
  </BrowserRouter>
)
