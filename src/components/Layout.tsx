import { NavLink, Outlet } from 'react-router-dom'
import { ShieldAlert, Code2, BookOpen, Layers, Database } from 'lucide-react'

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-emerald-400" size={22} />
            <span className="font-semibold text-white tracking-tight">DevSec Tools</span>
            <span className="text-xs text-gray-500 ml-1">v1 · for own-app testing only</span>
          </div>
          <nav className="flex items-center gap-1 ml-4">
            <NavLink to="/scanner" className={navClass}>
              <Code2 size={15} />
              XSS Scanner
            </NavLink>
            <NavLink to="/hpp" className={navClass}>
              <Layers size={15} />
              HPP Scanner
            </NavLink>
            <NavLink to="/sqli" className={navClass}>
              <Database size={15} />
              SQLi Scanner
            </NavLink>
            <NavLink to="/payloads" className={navClass}>
              <BookOpen size={15} />
              Payload Library
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-800 bg-gray-900 text-center py-3 text-xs text-gray-600">
        For authorized testing of your own applications only. Never test systems you don't own or have explicit permission to test.
      </footer>
    </div>
  )
}
