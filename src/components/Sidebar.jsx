import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Tags, MessageSquare, Users, Settings as SettingsIcon, Megaphone, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error('Erro ao sair:', error);
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Campanhas', path: '/campanhas', icon: Megaphone },
    { name: 'Templates', path: '/templates', icon: MessageSquare },
    { name: 'Listas', path: '/listas', icon: Users },
    { name: 'Tags', path: '/tags', icon: Tags },
  ];

  // Mostra enquanto carrega (!profile?.role) e mantém se for admin
  if (!profile?.role || profile.role === 'admin') {
    menuItems.push({ name: 'Configurações', path: '/configuracoes', icon: SettingsIcon });
  }

  return (
    <div className="w-[260px] h-screen bg-[var(--color-sidebar)] flex flex-col py-8 px-4 gap-4 flex-shrink-0">
      <div className="flex items-center gap-3 px-2 mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-[18px] font-bold text-[var(--color-text-sidebar)] leading-tight">
          Gestão de<br />Campanhas
        </h1>
      </div>

      <nav className="flex flex-col gap-2.5 flex-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-semibold ${isActive
                ? 'bg-[var(--color-sidebar-active)] text-white'
                : 'text-[var(--color-text-sidebar)] hover:bg-white/10'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-semibold w-full text-[var(--color-text-sidebar)] hover:bg-white/10"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  );
}