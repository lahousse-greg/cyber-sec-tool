import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import XSSScanner from './pages/XSSScanner'
import PayloadLibrary from './pages/PayloadLibrary'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/scanner" replace />} />
          <Route path="scanner" element={<XSSScanner />} />
          <Route path="payloads" element={<PayloadLibrary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
