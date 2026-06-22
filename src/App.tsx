import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import XSSScanner from './pages/XSSScanner'
import PayloadLibrary from './pages/PayloadLibrary'
import HPPScanner from './pages/HPPScanner'
import SQLiScanner from './pages/SQLiScanner'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/scanner" replace />} />
          <Route path="scanner" element={<XSSScanner />} />
          <Route path="hpp" element={<HPPScanner />} />
          <Route path="sqli" element={<SQLiScanner />} />
          <Route path="payloads" element={<PayloadLibrary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
