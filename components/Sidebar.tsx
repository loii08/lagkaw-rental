
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { UserRole } from '../types';
import { LayoutDashboard, Building2, LogOut, Settings, X, BadgeCheck, Bell, AlertCircle, CheckCircle, Clock, Users, FileQuestion, Filter, Home, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { currentUser, logout } = useAuth();
  const { notifications, unreadNotificationCount, markAsRead, clearNotifications } = useData();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<{ title: string; message: string } | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const displayNotifications = notifications
    .filter(n => filterUnread ? !n.isRead : true);

  const isActive = (path: string) => {

      if (path === '/') return location.pathname === '/' && !location.search.includes('tab=');
      if (path.includes('?tab=')) return location.search.includes(path.split('?')[1]);
      return location.pathname === path;
  };

  const linkClass = (path: string) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive(path) ? "bg-beige/30 text-primary font-bold" : "text-gray-600 hover:bg-gray-50"}`;

  const sidebarClasses = `
    fixed top-0 h-screen bg-white z-40 w-64
    transform transition-transform duration-300 ease-in-out
    right-0 border-l border-gray-200
    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    md:left-0 md:right-auto md:border-r md:border-l-0 md:translate-x-0
  `;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={sidebarClasses}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center relative">
          <div className="flex items-center gap-4">
              {}
              <div className="w-9 h-9 border-2 border-primary bg-transparent rounded-lg flex items-center justify-center text-primary shadow-[3px_3px_0px_0px_#F4D9B4]">
                  <Home size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold text-dark tracking-tight">Lagkaw</span>
          </div>

          <div className="flex items-center gap-2 md:gap-0">
             {}
             <div className="relative mr-2 hidden md:block" ref={notificationRef}>
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition relative"
                >
                    <Bell size={20} />
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </button>

                {}
                {showNotifications && (
                    <div className="absolute left-0 md:left-auto md:right-[-100px] lg:right-auto lg:left-0 top-12 w-80 bg-white border border-gray-200 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 flex flex-col max-h-[400px]">
                        <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                            <h4 className="font-bold text-gray-800 text-sm">Notifications</h4>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        await clearNotifications();
                                        setShowNotifications(false);
                                    }}
                                    className="text-xs px-2 py-1 rounded-md transition text-gray-500 hover:bg-gray-200"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => setFilterUnread(!filterUnread)}
                                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition ${filterUnread ? 'bg-beige text-primary font-bold' : 'text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <Filter size={12} /> {filterUnread ? 'Unread Only' : 'All'}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto">
                            {displayNotifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs">
                                    {filterUnread ? 'No unread notifications' : 'No new notifications'}
                                </div>
                            ) : (
                                displayNotifications.map((n, idx) => (
                                    <Link
                                        key={idx}
                                        to={n.link}
                                        onClick={(e) => {
                                            const isVerificationResult = n.title === 'Verification Approved!' || n.title === 'Verification Rejected';
                                            markAsRead(n.id);
                                            setShowNotifications(false);

                                            if (isVerificationResult) {
                                                e.preventDefault();
                                                setSelectedNotification({ title: n.title, message: n.message });
                                                return;
                                            }

                                            onClose();
                                        }}
                                        className={`block p-3 border-b border-gray-50 last:border-0 transition relative ${n.isRead ? 'bg-white hover:bg-gray-50' : 'bg-beige/20 hover:bg-beige/40'}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 ${n.type === 'alert' ? 'text-red-500' : n.type === 'success' ? 'text-green-500' : 'text-primary'}`}>
                                                {n.type === 'alert' ? <AlertCircle size={16}/> : n.type === 'success' ? <CheckCircle size={16}/> : <Clock size={16}/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-sm text-gray-800 ${n.isRead ? 'font-medium' : 'font-bold'}`}>{n.title}</p>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{n.timestamp}</span>
                                                </div>
                                                <p className={`text-xs mt-0.5 truncate ${n.isRead ? 'text-gray-500' : 'text-gray-700'}`}>{n.message}</p>
                                            </div>
                                            {!n.isRead && (
                                                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0"></div>
                                            )}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                )}
             </div>

             <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700">
                <X size={24} />
             </button>
          </div>
        </div>

        {}
        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
          <Link
            to="/profile?tab=profile"
            onClick={onClose}
            className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
          >
              <img src={currentUser.avatar_url || '/img/default-profile.png'} alt="User" className="w-10 h-10 rounded-full object-cover border border-gray-200 group-hover:border-primary transition-colors" />
              <div className="overflow-hidden">
                  <p className="text-sm font-bold text-dark flex items-center gap-1 group-hover:text-primary transition-colors">
                      <span className="truncate">{currentUser.full_name}</span>
                      {currentUser.is_verified === 1 && <BadgeCheck size={14} className="text-primary fill-beige shrink-0" />}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser.role.toLowerCase()}</p>
              </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {currentUser.role === UserRole.RENTER && (
              <>
                  <Link to="/" onClick={onClose} className={linkClass('/')}>
                      <LayoutDashboard size={20} /> Dashboard
                  </Link>
                  <Link to="/properties" onClick={onClose} className={linkClass('/properties')}>
                      <Building2 size={20} /> Browse
                  </Link>
                  <Link to="/my-applications" onClick={onClose} className={linkClass('/my-applications')}>
                      <FileQuestion size={20} /> My Applications
                  </Link>
              </>
          )}

          {currentUser.role === UserRole.OWNER && (
              <>
                  <Link to="/" onClick={onClose} className={linkClass('/')}>
                      <LayoutDashboard size={20} /> Overview
                  </Link>
                  <Link to="/my-properties" onClick={onClose} className={linkClass('/my-properties')}>
                      <Building2 size={20} /> My Properties
                  </Link>
                  <Link to="/tenants" onClick={onClose} className={linkClass('/tenants')}>
                      <Users size={20} /> Tenants Directory
                  </Link>
                  <Link to="/applications" onClick={onClose} className={linkClass('/applications')}>
                      <FileQuestion size={20} /> Applications
                  </Link>
              </>
          )}

          {currentUser.role === UserRole.ADMIN && (
              <>
                  <Link to="/" onClick={onClose} className={linkClass('/')}>
                      <LayoutDashboard size={20} /> Overview
                  </Link>
                  <Link to="/?tab=users" onClick={onClose} className={linkClass('/?tab=users')}>
                      <Users size={20} /> Manage Users
                  </Link>
                  <Link to="/?tab=verifications" onClick={onClose} className={linkClass('/?tab=verifications')}>
                      <ShieldCheck size={20} /> Verifications
                  </Link>
                  <Link to="/?tab=properties" onClick={onClose} className={linkClass('/?tab=properties')}>
                      <Building2 size={20} /> All Properties
                  </Link>
              </>
          )}

          <Link to="/profile" onClick={onClose} className={linkClass('/profile')}>
              <Settings size={20} /> Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={() => { logout(); onClose(); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors">
              <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-bold text-dark">{selectedNotification.title}</h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedNotification.message}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-[#6D4C2D] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
