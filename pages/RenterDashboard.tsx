import React, { useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BillStatus, BillType } from '../types';
import { Home, Calendar, AlertCircle, CheckCircle, Clock, FileText, Info, BadgeCheck, Zap, Wifi, TrendingUp, Bell, ChevronRight, Download, Receipt } from 'lucide-react';
import PesoSign from '../components/PesoSign';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useLocation, Link } from 'react-router-dom';

export const RenterDashboard = () => {
  const { currentUser } = useAuth();
  const { bills, properties, bookings } = useData();
  const location = useLocation();

  const myBooking = bookings.find(b => b.renter_id === currentUser?.id && b.is_active);
  const myProperty = myBooking ? properties.find(p => p.id === myBooking.property_id) : null;
  const myBills = bills.filter(b => b.renter_id === currentUser?.id);

  const pendingBills = myBills.filter(b => b.status === BillStatus.PENDING || b.status === BillStatus.OVERDUE);
  const overdueCount = myBills.filter(b => b.status === BillStatus.OVERDUE).length;

  const historyBills = [...myBills].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  const today = new Date();
  const daysUntilExpiry = myBooking ? Math.ceil((new Date(myBooking.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const showExpiryAlert = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('section') === 'bills') {
        const element = document.getElementById('bills-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }
  }, [location]);

  const chartData = useMemo(() => {
     return [
        { name: 'May', amount: 2600 },
        { name: 'Jun', amount: 2550 },
        { name: 'Jul', amount: 2700 },
        { name: 'Aug', amount: 2600 },
        { name: 'Sep', amount: 2650 },
        { name: 'Oct', amount: 2500 },
     ];
  }, [myBills]);

  const getBillIcon = (type: BillType) => {
      switch(type) {
          case BillType.RENT:
              return <Home size={18} className="text-primary"/>;
          case BillType.UTILITY:
              return <Zap size={18} className="text-amber-500"/>;
          case BillType.OTHER:
              return <Wifi size={18} className="text-purple-500"/>;
          default:
              return <FileText size={18} className="text-gray-500"/>;
      }
  };

  const getStatusBadge = (status: BillStatus) => {
      switch(status) {
          case BillStatus.PAID:
              return <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold"><CheckCircle size={12}/> Paid</span>;
          case BillStatus.PENDING:
              return <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold"><Clock size={12}/> Pending</span>;
          case BillStatus.OVERDUE:
              return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold"><AlertCircle size={12}/> Overdue</span>;
      }
  };

  const totalPendingAmount = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalPaidAmount = myBills.filter(b => b.status === BillStatus.PAID).reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              Welcome back, {currentUser?.full_name}
              {currentUser?.is_verified === 1 && (
                <BadgeCheck size={24} className="text-primary fill-primary/20" />
              )}
            </h1>
            <p className="text-gray-600 mt-2">Here's an overview of your rental activity</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <Link
              to="/profile"
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pending</p>
                <p className="text-2xl font-bold text-gray-900">₱{totalPendingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock size={20} className="text-amber-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min((pendingBills.length / 6) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500">
                {pendingBills.length} {pendingBills.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">₱{totalPaidAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              All time payments
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Residence</p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {myProperty ? myProperty.title : 'No Active Lease'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Home size={20} className="text-blue-600" />
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-500 truncate">
              {myProperty ? myProperty.address : 'Find a property'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Lease Status</p>
                <p className="text-lg font-bold text-gray-900">
                  {myBooking ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar size={20} className="text-purple-600" />
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              {myBooking ? `Ends ${myBooking.end_date}` : 'No active lease'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Property & Bills */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Property Card */}
          <div className="bg-gradient-to-br from-primary via-primary to-primary/90 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Current Residence</h2>
                {myProperty && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    Active Lease
                  </span>
                )}
              </div>
              
              {myProperty ? (
                <>
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{myProperty.title}</h3>
                      <div className="flex items-center gap-2 text-white/90 mb-4">
                        <Home size={18} />
                        <span>{myProperty.address}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-white/70 mb-1">Lease Start</p>
                          <p className="font-medium">{myBooking?.start_date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/70 mb-1">Lease End</p>
                          <p className="font-medium">{myBooking?.end_date}</p>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/property/${myProperty.id}`}
                      className="bg-white text-primary hover:bg-gray-100 px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
                    >
                      View Details
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home size={32} className="text-white" />
                  </div>
                  <p className="text-lg font-medium mb-3">No Active Booking</p>
                  <p className="text-white/80 mb-6">Start your rental journey today</p>
                  <Link
                    to="/properties"
                    className="inline-block bg-white text-primary hover:bg-gray-100 px-6 py-3 rounded-xl font-bold transition-colors"
                  >
                    Browse Properties
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Bills Section */}
          <div id="bills-section" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Receipt size={24} className="text-primary" />
                  Outstanding Bills
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {pendingBills.length === 0 ? 'All bills are settled' : `${pendingBills.length} pending ${pendingBills.length === 1 ? 'bill' : 'bills'}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {overdueCount > 0 && (
                  <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-600" />
                      <span className="text-red-700 font-bold">{overdueCount} Overdue</span>
                    </div>
                  </div>
                )}
                <Link
                  to="/bills"
                  className="px-4 py-2 text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1"
                >
                  View All
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {pendingBills.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <p className="text-gray-700 font-medium">All caught up!</p>
                  <p className="text-gray-500 text-sm mt-1">No pending bills to pay</p>
                </div>
              ) : (
                pendingBills.map(bill => (
                  <div 
                    key={bill.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-sm ${
                      bill.status === BillStatus.OVERDUE 
                        ? 'bg-red-50 border-red-100' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${bill.status === BillStatus.OVERDUE ? 'bg-red-100' : 'bg-white border border-gray-200'}`}>
                        {getBillIcon(bill.type)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {bill.type.toLowerCase()} Bill
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-500">
                            Due {bill.due_date}
                          </span>
                          {bill.status === BillStatus.OVERDUE && (
                            <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-gray-900">
                        ₱{bill.amount.toLocaleString()}
                      </span>
                      <Link
                        to={`/bill/${bill.id}`}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        Pay Now
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Spending Overview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={24} className="text-primary" />
                  Spending Overview
                </h3>
                <p className="text-gray-600 text-sm mt-1">Monthly rental and utility expenses</p>
              </div>
              <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option>Last 6 months</option>
                <option>Last year</option>
                <option>All time</option>
              </select>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(value) => `₱${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`₱${value}`, 'Amount']}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'white'
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[8, 8, 0, 0]}
                    fill="url(#colorGradient)"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5A2B" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#8B5A2B" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column - Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bell size={24} className="text-primary" />
                Notifications
              </h3>
              <span className="text-sm text-gray-500">
                {showExpiryAlert ? '1 new' : 'Up to date'}
              </span>
            </div>
            
            <div className="space-y-4">
              {showExpiryAlert && (
                <div className="bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Calendar size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-amber-900">Lease Expiring Soon</h4>
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                          Important
                        </span>
                      </div>
                      <p className="text-sm text-amber-800 mt-2">
                        Your lease for {myProperty?.title} ends in {daysUntilExpiry} days ({myBooking?.end_date}).
                      </p>
                      <div className="flex gap-3 mt-3">
                        <button className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors">
                          Contact Owner
                        </button>
                        <button className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Home size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Building Maintenance</h4>
                    <p className="text-sm text-gray-600 mt-2">
                      Scheduled elevator maintenance on Oct 25th from 9 AM to 2 PM.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Payment Confirmed</h4>
                    <p className="text-sm text-gray-600 mt-2">
                      Your October rent payment has been processed successfully.
                    </p>
                  </div>
                </div>
              </div>

              {!showExpiryAlert && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No new notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/bills"
                className="p-4 bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/20 rounded-xl transition-all group"
              >
                <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3 group-hover:bg-primary/20">
                  <PesoSign size={20} className="text-primary" />
                </div>
                <p className="font-medium text-gray-900">Pay Bills</p>
                <p className="text-xs text-gray-500 mt-1">Settle outstanding payments</p>
              </Link>

              <Link
                to="/maintenance"
                className="p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all group"
              >
                <div className="p-2 bg-blue-100 rounded-lg w-fit mb-3 group-hover:bg-blue-200">
                  <Home size={20} className="text-blue-600" />
                </div>
                <p className="font-medium text-gray-900">Maintenance</p>
                <p className="text-xs text-gray-500 mt-1">Request repairs</p>
              </Link>

              <Link
                to="/documents"
                className="p-4 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 rounded-xl transition-all group"
              >
                <div className="p-2 bg-amber-100 rounded-lg w-fit mb-3 group-hover:bg-amber-200">
                  <FileText size={20} className="text-amber-600" />
                </div>
                <p className="font-medium text-gray-900">Documents</p>
                <p className="text-xs text-gray-500 mt-1">View lease & receipts</p>
              </Link>

              <Link
                to="/profile?tab=security"
                className="p-4 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 rounded-xl transition-all group"
              >
                <div className="p-2 bg-purple-100 rounded-lg w-fit mb-3 group-hover:bg-purple-200">
                  <Zap size={20} className="text-purple-600" />
                </div>
                <p className="font-medium text-gray-900">Settings</p>
                <p className="text-xs text-gray-500 mt-1">Account preferences</p>
              </Link>
            </div>
          </div>

          {/* Payment History Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Transactions</h3>
              <button className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1">
                <Download size={16} />
                Export
              </button>
            </div>
            <div className="space-y-4">
              {historyBills.slice(0, 3).map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getBillIcon(bill.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm capitalize">
                        {bill.type.toLowerCase()} Bill
                      </p>
                      <p className="text-xs text-gray-500">{bill.due_date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-sm">
                      ₱{bill.amount.toLocaleString()}
                    </p>
                    {getStatusBadge(bill.status)}
                  </div>
                </div>
              ))}
              {historyBills.length > 3 && (
                <Link
                  to="/bills/history"
                  className="block text-center py-3 text-primary hover:text-primary/80 font-medium text-sm border-t border-gray-200"
                >
                  View All Transactions
                  <ChevronRight size={16} className="inline ml-1" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};