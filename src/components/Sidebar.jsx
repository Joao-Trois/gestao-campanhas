import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Tags, MessageSquare, Users, Settings, Megaphone } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Tags', path: '/tags', icon: Tags },
    { name: 'Templates', path: '/templates', icon: MessageSquare },
    { name: 'Listas', path: '/listas', icon: Users },
    { name: 'Campanhas', path: '/campanhas', icon: Megaphone },
    { name: 'Configurações', path: '/configuracoes', icon: Settings },
  ];

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
    </div>
  );
}
