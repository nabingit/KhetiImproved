import React from 'react';
import { Home, Briefcase, Plus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) {
    return <div className="min-h-screen bg-green-50">{children}</div>;
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Briefcase, label: 'My Jobs', path: '/my-jobs' },
    ...(user.userType === 'farmer' ? [{ icon: Plus, label: 'Post Job', path: '/post-job' }] : []),
    { icon: User, label: 'Profile', path: '/profile' }
  ];

  // Different background colors based on user type
  const bgColor = user.userType === 'farmer' ? 'bg-green-50' : 'bg-blue-50';
  const navBorderColor = user.userType === 'farmer' ? 'border-green-100' : 'border-blue-100';
  const activeColor = user.userType === 'farmer' ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50';
  const hoverColor = user.userType === 'farmer' ? 'hover:text-green-600' : 'hover:text-blue-600';

  return (
    <div className={`min-h-screen ${bgColor} pb-20`}>
      <main className="max-w-md mx-auto bg-white min-h-screen">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t ${navBorderColor} px-4 py-2`}>
        <div className="max-w-md mx-auto flex justify-around">
          {navItems.map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                location.pathname === path
                  ? activeColor
                  : `text-gray-500 ${hoverColor}`
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}