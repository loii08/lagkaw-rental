import React, { useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BillStatus, BillType } from '../types';
import { Home, Calendar, AlertCircle, CheckCircle, Clock, FileText, Info, BadgeCheck, Zap, Wifi } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
              return <Home size={16} className="text-primary"/>;
          case BillType.UTILITY:
              return <Zap size={16} className="text-amber-500"/>;
          case BillType.OTHER:
              return <Wifi size={16} className="text-purple-500"/>;
          default:
              return <FileText size={16} className="text-gray-500"/>;
      }
  };

  const getStatusBadge = (status: BillStatus) => {
      switch(status) {
          case BillStatus.PAID:
              return <span className="flex items-center justify-end gap-1 text-green-600 text-xs font-bold uppercase tracking-wide"><CheckCircle size={14}/> Paid</span>;
          case BillStatus.PENDING:
              return <span className="flex items-center justify-end gap-1 text-primary text-xs font-bold uppercase tracking-wide"><Clock size={14}/> Pending</span>;
          case BillStatus.OVERDUE:
              return <span className="flex items-center justify-end gap-1 text-red-600 text-xs font-bold uppercase tracking-wide"><AlertCircle size={14}/> Overdue</span>;
      }
  };

  return (
    <div className="p-4 md:p-8 pb-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
            Welcome back, {currentUser?.full_name}
            {currentUser?.is_verified === 1 && <BadgeCheck size={24} className="text-primary fill-beige" />}
        </h1>
        <p className="text-gray-500">Here's what's happening with your home.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         {}
         <div className="bg-gradient-to-br from-primary to-[#6D4C2D] rounded-2xl p-6 text-white shadow-lg md:col-span-1">
            <h2 className="text-lg font-semibold opacity-90 mb-2">Current Residence</h2>
            {myProperty ? (
                <>
                    <div className="text-2xl font-bold mb-1">{myProperty.title}</div>
                    <div className="text-beige text-sm mb-6 flex items-center gap-2">
                        <Home size={16} /> {myProperty.address}
                    </div>
                    <div className="flex justify-between items-end border-t border-white/20 pt-4">
                        <div>
                            <div className="text-xs text-beige/80">Lease Ends</div>
                            <div className="font-medium">{myBooking?.end_date}</div>
                        </div>
                        <Link
                            to={`/property/${myProperty.id}`}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm transition font-medium text-white no-underline"
                        >
                            Details
                        </Link>
                    </div>
                </>
            ) : (
                <div className="py-8 text-center text-beige">
                    No active booking. <br/><a href="#/properties" className="underline">Find a home</a>
                </div>
            )}
         </div>

         {}
         <div id="bills-section" className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm md:col-span-2 scroll-mt-24">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-gray-800">Outstanding Bills</h2>
                {overdueCount > 0 && (
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <AlertCircle size={14} /> {overdueCount} Overdue
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {pendingBills.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">All caught up! No pending bills.</div>
                ) : (
                    pendingBills.map(bill => (
                        <div key={bill.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${bill.status === BillStatus.OVERDUE ? 'bg-red-100' : 'bg-beige/30'}`}>
                                    {getBillIcon(bill.type)}
                                </div>
                                <div>
                                    <p className="font-semibold text-dark capitalize">{bill.type.toLowerCase()} Bill</p>
                                    <p className="text-xs text-gray-500">Due {bill.due_date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-dark">₱{bill.amount.toLocaleString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
         </div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <h3 className="font-bold text-gray-800 mb-6">Spending Overview</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                        <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#8C6239' : '#E5E7EB'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">Notifications</h3>
              <div className="space-y-4">
                  {showExpiryAlert && (
                       <div className="flex gap-4 items-start p-3 bg-amber-50 rounded-xl">
                          <Calendar className="text-amber-500 mt-1" size={20} />
                          <div>
                              <p className="text-sm font-semibold text-amber-900">Lease Expiring Soon</p>
                              <p className="text-xs text-amber-700 mt-1">
                                Your lease for {myProperty?.title} ends in {daysUntilExpiry} days ({myBooking?.end_date}). Contact the owner to renew.
                              </p>
                          </div>
                      </div>
                  )}

                  <div className="flex gap-4 items-start p-3 bg-gray-50 rounded-xl">
                      <Home className="text-gray-500 mt-1" size={20} />
                      <div>
                          <p className="text-sm font-semibold text-dark">Building Maintenance</p>
                          <p className="text-xs text-gray-500 mt-1">Scheduled elevator maintenance on Oct 25th from 9 AM to 2 PM.</p>
                      </div>
                  </div>

                  {!showExpiryAlert && (
                      <div className="p-2 text-center text-xs text-gray-400">No other new notifications.</div>
                  )}
              </div>
          </div>
      </div>

      {}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h3 className="font-bold text-gray-800">Billing & Payment History</h3>
             <button className="text-primary hover:text-[#6D4C2D] text-sm font-medium flex items-center gap-1">
                <FileText size={16} /> Export Statement
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                        <th className="px-6 py-4">Transaction Description</th>
                        <th className="px-6 py-4">Issued Date</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {historyBills.length > 0 ? (
                        historyBills.map(bill => (
                            <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">
                                            {getBillIcon(bill.type)}
                                        </div>
                                        <span className="font-medium text-dark capitalize">{bill.type.toLowerCase()} Bill</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{bill.created_at?.slice(0, 10)}</td>
                                <td className="px-6 py-4 text-gray-500">{bill.due_date}</td>
                                <td className="px-6 py-4 font-semibold text-dark">₱{bill.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                    {getStatusBadge(bill.status)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-400 italic">No payment history available.</td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

    </div>
  );
};