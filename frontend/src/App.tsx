import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LadingPage'
import LoginPage from './pages/LoginPage'
import InventarioPage from './pages/InventarioPage'
import MazosPage from './pages/MazosPage'
import InformationCardPage from './pages/InformationCardPage'
import NotFoundPage from './pages/NotFoundPage'
import RutaProtegida from './routing/RutaProtegida'
import Navbar from './components/Navbar'
import ListadoCartasPage from './pages/ListadoCartasPage'

function App() {

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/buscar" element={<ListadoCartasPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/inventario" element={
          <RutaProtegida>
            <InventarioPage />
          </RutaProtegida>
        } />
        <Route path="/mazos" element={
          <RutaProtegida>
            <MazosPage />
          </RutaProtegida>
        } />
        <Route path="/carta/:scryfallId" element={<InformationCardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
