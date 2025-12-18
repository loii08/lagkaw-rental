import React, { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { RenterDashboard } from './pages/RenterDashboard';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PropertyDetails } from './pages/PropertyDetails';
import { Properties } from './pages/Properties';
import { RenterApplications } from './pages/RenterApplications';
import { Settings } from './pages/Settings';
import { EmailVerification } from './pages/EmailVerification';
import { UserRole } from './types';
import { Menu, Bell, AlertCircle, CheckCircle, Clock, ChevronLeft, Home, Search, Building2, Settings as SettingsIcon, ShieldCheck, X, FileQuestion } from 'lucide-react';

const MainLayout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileNotifs, setShowMobileNotifs] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<{ title: string; message: string } | null>(null);
  const { notifications, unreadNotificationCount, markAsRead, clearNotifications } = useData();
  const { currentUser } = useAuth();
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isRootPath = location.pathname === '/';

  // Helper to check active link state
  const isActive = (path: string) => {
      if (path === '/') return location.pathname === '/';
      return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col md:block">
      {/* Mobile Header - Always Show Brand */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm h-[73px]">
          <div className="flex items-center gap-3 overflow-hidden">
             {/* Logo: Transparent Offset Style for Mobile */}
             <div className="w-8 h-8 border-2 border-primary bg-transparent rounded-lg flex items-center justify-center text-primary font-bold shrink-0 shadow-[3px_3px_0px_0px_#F4D9B4]">
                <Home size={16} strokeWidth={2.5}/>
             </div>
             <span className="text-xl font-bold text-dark tracking-tight">Lagkaw</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
             {/* Mobile Notification Bell */}
             <div className="relative" ref={notificationRef}>
                <button 
                    onClick={() => setShowMobileNotifs(!showMobileNotifs)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg relative transition-colors"
                >
                    <Bell size={24} />
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </button>
                {showMobileNotifs && (
                    <div className="absolute right-0 top-12 w-72 bg-white border border-gray-200 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <div className="font-bold text-xs text-gray-500 uppercase">Notifications</div>
                            <button
                                onClick={async () => {
                                    await clearNotifications();
                                    setShowMobileNotifs(false);
                                }}
                                className="text-xs px-2 py-1 rounded-md transition text-gray-500 hover:bg-gray-200"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-xs">No notifications</div>
                            ) : (
                                notifications.map((n, idx) => (
                                    <Link 
                                        key={idx} 
                                        to={n.link} 
                                        onClick={(e) => {
                                            const isVerificationResult = n.title === 'Verification Approved!' || n.title === 'Verification Rejected';
                                            markAsRead(n.id);
                                            setShowMobileNotifs(false);

                                            if (isVerificationResult) {
                                                e.preventDefault();
                                                setSelectedNotification({ title: n.title, message: n.message });
                                            }
                                        }} 
                                        className={`block p-3 border-b border-gray-50 hover:bg-gray-50 last:border-0 ${n.isRead ? 'opacity-70' : 'bg-beige/20'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={n.type === 'alert' ? 'text-red-500' : n.type === 'success' ? 'text-green-500' : 'text-primary'}>
                                                {n.type === 'alert' ? <AlertCircle size={18}/> : n.type === 'success' ? <CheckCircle size={18}/> : <Clock size={18}/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-xs text-dark ${n.isRead ? 'font-medium' : 'font-bold'}`}>{n.title}</p>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-1">{n.timestamp}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{n.message}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                )}
             </div>

            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Menu size={24} />
            </button>
          </div>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 md:ml-64 min-h-[calc(100vh-73px)] md:min-h-screen transition-all duration-300 pb-24 md:pb-0">
        {/* Global Back Button (Mobile & Desktop) */}
        {!isRootPath && (
            <div className="px-4 pt-4 md:px-8 md:pt-6">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-gray-500 hover:text-dark font-medium transition-colors"
                >
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                        <ChevronLeft size={18} />
                    </div>
                    Back
                </button>
            </div>
        )}
        {children}
      </main>

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

      {/* Mobile Sticky Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 px-6 py-2 pb-safe shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] flex justify-between items-center h-[70px]">
          <Link 
            to="/" 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
             <div className={`p-1 rounded-lg ${isActive('/') ? 'bg-beige/30' : ''}`}>
                 <Home size={22} strokeWidth={isActive('/') ? 2.8 : 2} />
             </div>
             <span className="text-[10px] font-bold">Home</span>
          </Link>

          {currentUser?.role === UserRole.RENTER ? (
             <>
               <Link 
                  to="/properties" 
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/properties') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
               >
                  <div className={`p-1 rounded-lg ${isActive('/properties') ? 'bg-beige/30' : ''}`}>
                      <Search size={22} strokeWidth={isActive('/properties') ? 2.8 : 2} />
                  </div>
                  <span className="text-[10px] font-bold">Browse</span>
               </Link>
               <Link 
                  to="/my-applications" 
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/my-applications') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
               >
                  <div className={`p-1 rounded-lg ${isActive('/my-applications') ? 'bg-beige/30' : ''}`}>
                      <FileQuestion size={22} strokeWidth={isActive('/my-applications') ? 2.8 : 2} />
                  </div>
                  <span className="text-[10px] font-bold">Apps</span>
               </Link>
             </>
          ) : currentUser?.role === UserRole.OWNER ? (
             <Link 
                to="/my-properties" 
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/my-properties') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
             >
                <div className={`p-1 rounded-lg ${isActive('/my-properties') ? 'bg-beige/30' : ''}`}>
                    <Building2 size={22} strokeWidth={isActive('/my-properties') ? 2.8 : 2} />
                </div>
                <span className="text-[10px] font-bold">My Props</span>
             </Link>
          ) : currentUser?.role === UserRole.ADMIN ? (
             // Admin navigation with Properties and Verifications
             <>
                <Link 
                   to="/?tab=properties" 
                   className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/?tab=properties') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <div className={`p-1 rounded-lg ${isActive('/?tab=properties') ? 'bg-beige/30' : ''}`}>
                       <Building2 size={22} strokeWidth={isActive('/?tab=properties') ? 2.8 : 2} />
                   </div>
                   <span className="text-[10px] font-bold">Properties</span>
                </Link>
                <Link 
                   to="/?tab=verifications" 
                   className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/?tab=verifications') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                   <div className={`p-1 rounded-lg ${isActive('/?tab=verifications') ? 'bg-beige/30' : ''}`}>
                       <ShieldCheck size={22} strokeWidth={isActive('/?tab=verifications') ? 2.8 : 2} />
                   </div>
                   <span className="text-[10px] font-bold">Verify</span>
                </Link>
             </>
          ) : (
             // Fallback for other roles
             <Link 
                to="/?tab=users" 
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/?tab=users') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
             >
                <div className={`p-1 rounded-lg ${isActive('/?tab=users') ? 'bg-beige/30' : ''}`}>
                    <Search size={22} strokeWidth={isActive('/?tab=users') ? 2.8 : 2} />
                </div>
                <span className="text-[10px] font-bold">Users</span>
             </Link>
          )}

          <Link 
            to="/profile" 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${isActive('/profile') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
             <div className={`p-1 rounded-lg ${isActive('/profile') ? 'bg-beige/30' : ''}`}>
                 <SettingsIcon size={22} strokeWidth={isActive('/profile') ? 2.8 : 2} />
             </div>
             <span className="text-[10px] font-bold">Settings</span>
          </Link>
      </div>
    </div>
  );
};

const DashboardRouter = () => {
  const { currentUser, loading, login } = useAuth();
  const { fetchUserRole } = useData();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleFetched, setRoleFetched] = useState(false);

  useEffect(() => {
    const updateUserRole = async () => {
      if (currentUser && !roleFetched) {
        try {
          const role = await fetchUserRole(currentUser.id);
          setUserRole(role);
          // Update the current user with the correct role
          login({ ...currentUser, role });
          setRoleFetched(true);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(UserRole.RENTER); // Default fallback
          setRoleFetched(true);
        } finally {
          setRoleLoading(false);
        }
      } else if (!currentUser) {
        setRoleLoading(false);
        setRoleFetched(false);
      }
    };

    if (!loading && currentUser) {
      updateUserRole();
    } else if (!loading) {
      setRoleLoading(false);
    }
  }, [currentUser, loading, roleFetched]); // Removed fetchUserRole and login from dependencies

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" />;

  const actualRole = userRole || currentUser.role;

  let DashboardComponent;
  if (actualRole === UserRole.RENTER) {
      DashboardComponent = <RenterDashboard />;
  } else if (actualRole === UserRole.OWNER) {
      DashboardComponent = <OwnerDashboard />;
  } else if (actualRole === UserRole.ADMIN) {
      DashboardComponent = <AdminDashboard />;
  } else {
      DashboardComponent = <div className="p-8">Unknown Role</div>;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={DashboardComponent} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/my-applications" element={<RenterApplications />} />
        <Route path="/verify-email" element={<EmailVerification />} />

        {/* Owner Routes */}
        <Route path="/my-properties" element={<OwnerDashboard />} />
        <Route path="/tenants" element={<OwnerDashboard />} />
        <Route path="/applications" element={<OwnerDashboard />} />
        
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </MainLayout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<DashboardRouter />} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
