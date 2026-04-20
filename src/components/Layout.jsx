import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { HiOutlineHome, HiOutlineViewGrid, HiOutlineShoppingBag, HiOutlineUsers, HiOutlineChartBar, HiOutlineClipboardList, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import useAuthStore from '../stores/authStore';

const navItems = [
  { to: '/', icon: HiOutlineHome, label: 'Dashboard', roles: ['SUPER_ADMIN'] },
  { to: '/rooms', icon: HiOutlineViewGrid, label: 'Phòng bàn', roles: ['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
  { to: '/products', icon: HiOutlineShoppingBag, label: 'Sản phẩm', roles: ['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
  { to: '/users', icon: HiOutlineUsers, label: 'Nhân viên', roles: ['SUPER_ADMIN'] },
  { to: '/reports', icon: HiOutlineChartBar, label: 'Báo cáo', roles: ['SUPER_ADMIN'] },
  { to: '/session-history', icon: HiOutlineClipboardList, label: 'Lịch sử phiên', roles: ['SUPER_ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/settings', icon: HiOutlineCog, label: 'Cài đặt', roles: ['SUPER_ADMIN', 'MANAGER'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filtered = navItems.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">LV</div>
          <span className="font-bold text-lg text-gray-800">KARAOKE LASVEGAS 434</span>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          {filtered.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-500">
                {user?.role === 'SUPER_ADMIN' ? 'Admin' : user?.role === 'MANAGER' ? 'Quản lý' : user?.role === 'CASHIER' ? 'Thu ngân' : 'Nhân viên'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors">
            <HiOutlineLogout className="w-5 h-5" /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-semibold text-gray-800">KARAOKE LASVEGAS 434</h1>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
