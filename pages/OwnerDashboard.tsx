import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Property, BillStatus, UserRole, BillType, PropertyStatus, ApplicationStatus, Application, Occupant, PropertyCategory, VerificationStatus } from '../types';
import { Plus, Users, Activity, Search, AlertCircle, Clock, Mail, UserPlus, X, Home, FileText, Download, TrendingUp, PieChart as PieIcon, BarChart3, Phone, ShieldCheck, Check, BadgeCheck, Image as ImageIcon, Loader2, Edit2, Trash2, Save, FileQuestion, XCircle, CheckCircle, Eye, Calendar, ArrowRight, MoreHorizontal, Undo2, Ban, ExternalLink, ArrowUpRight, BedDouble, Warehouse, Building, Square, ChevronDown, ChevronUp, StickyNote, MoreVertical, Flag, MessageSquare, Sparkles, MapPin, Upload, Filter, ArrowUpDown, Info, History, Building2, TrendingDown, Target, CreditCard, Receipt, ClipboardCheck, FileSpreadsheet, Shield, BarChart4, PieChart, Bell, EyeOff } from 'lucide-react';
import PesoSign from '../components/PesoSign';
import { ApplicationManagement } from '../components/ApplicationManagement';
import { usePropertyPostingVerification } from '../lib/verification';
import { useDialogs, addDialogStyles } from '../components/CustomDialogs';
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

export const OwnerDashboard = () => {
  const { properties, addProperty, updateProperty, deleteProperty, propertyCategories, addPropertyCategory, users, bookings, bills, searchUserByEmail, payBill, updateBill, createBill, verifyUser, applications, processApplication, addBooking, updateBooking } = useData();
  const { currentUser } = useAuth();
  const { canPostProperty } = usePropertyPostingVerification();
  const location = useLocation();
  const navigate = useNavigate();
  const { showConfirm, showInfo, ConfirmComponent, InfoComponent } = useDialogs();

  useEffect(() => {
      addDialogStyles();
  }, []);

  const isPropertiesView = location.pathname === '/my-properties';
  const isTenantsView = location.pathname === '/tenants';
  const isApplicationsView = location.pathname === '/applications';
  const isDashboardView = location.pathname === '/';

  const myProperties = useMemo(() => properties.filter(p => p.owner_id === currentUser?.id), [properties, currentUser]);
  const myPropertyIds = useMemo(() => myProperties.map(p => p.id), [myProperties]);

  const myBookings = useMemo(() => bookings.filter(b => myPropertyIds.includes(b.property_id) && b.is_active), [bookings, myPropertyIds]);

  const renters = useMemo(() => {
      const renterIds = myBookings.map(b => b.renter_id);
      const applicantIds = applications.filter(a => myPropertyIds.includes(a.property_id)).map(a => a.renter_id);
      const uniqueIds = Array.from(new Set([...renterIds, ...applicantIds]));
      return users.filter(u => uniqueIds.includes(u.id));
  }, [users, myBookings, applications, myPropertyIds]);

  const totalRevenue = useMemo(() => bills
    .filter(b => myPropertyIds.includes(b.property_id) && b.status === BillStatus.PAID)
    .reduce((acc, curr) => acc + curr.amount, 0), [bills, myPropertyIds]);

  const totalOccupancy = myProperties.length > 0 ? (myBookings.length / myProperties.length) * 100 : 0;

  const expiringLeases = useMemo(() => myBookings.filter(b => {
      if (!b.end_date) return false;
      const days = Math.ceil((new Date(b.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days <= 30 && days >= 0;
  }), [myBookings]);

  const allApplications = useMemo(() => applications.filter(a => myPropertyIds.includes(a.property_id)), [applications, myPropertyIds]);

  const sortedApplications = useMemo(() => [...allApplications].sort((a, b) => {
    if (a.status === ApplicationStatus.PENDING && b.status !== ApplicationStatus.PENDING) return -1;
    if (a.status !== ApplicationStatus.PENDING && b.status === ApplicationStatus.PENDING) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [allApplications]);

  const [propertyFilter, setPropertyFilter] = useState('');
  const [propertySort, setPropertySort] = useState('newest');

  const filteredProperties = useMemo(() => {
      let result = [...myProperties];

      if (propertyFilter) {
          const lowerFilter = propertyFilter.toLowerCase();
          result = result.filter(p =>
              p.title.toLowerCase().includes(lowerFilter) ||
              p.address.toLowerCase().includes(lowerFilter)
          );
      }

      result.sort((a, b) => {
          if (propertySort === 'price-high') return b.price - a.price;
          if (propertySort === 'price-low') return a.price - b.price;

          return b.title.localeCompare(a.title);
      });

      return result;
  }, [myProperties, propertyFilter, propertySort]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddRenterModalOpen, setIsAddRenterModalOpen] = useState(false);

  const [selectedRenterId, setSelectedRenterId] = useState<string | null>(null);
  const [tenantProfileTab, setTenantProfileTab] = useState<'overview' | 'history'>('overview');

  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [managingAppId, setManagingAppId] = useState<string | null>(null);

  const [newProp, setNewProp] = useState<Partial<Property>>({ title: '', address: '', price: 0, amenities: [], image: '', category: PropertyCategory.APARTMENT, maxOccupancy: 2, description: '' });
  const [customAmenity, setCustomAmenity] = useState('');
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [onboardStep, setOnboardStep] = useState(1);
  const [newRenterEmail, setNewRenterEmail] = useState('');
  const [foundRenter, setFoundRenter] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const [selectedPropId, setSelectedPropId] = useState('');
  const [leaseDetails, setLeaseDetails] = useState({ startDate: '', endDate: '' });
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [tempOccupant, setTempOccupant] = useState<Occupant>({ name: '', relation: '', age: undefined });

  const [expandedOccupantIndex, setExpandedOccupantIndex] = useState<number | null>(null);
  const [isAddingNewOccupant, setIsAddingNewOccupant] = useState(false);
  const [newOccupantForm, setNewOccupantForm] = useState<Occupant>({ name: '', relation: '', age: undefined, notes: '' });

  const [isEditingLease, setIsEditingLease] = useState(false);
  const [editLeaseForm, setEditLeaseForm] = useState({ startDate: '', endDate: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const addPropImageInputRef = useRef<HTMLInputElement>(null);
  const editPropImageInputRef = useRef<HTMLInputElement>(null);

  const [showBillForm, setShowBillForm] = useState(false);
  const [newBillDetails, setNewBillDetails] = useState({ amount: '', type: BillType.RENT, dueDate: '' });

  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({});
  const [billErrors, setBillErrors] = useState<Record<string, string>>({});

  const selectedRenter = useMemo(() => users.find(u => u.id === selectedRenterId), [users, selectedRenterId]);
  const selectedRenterBooking = useMemo(() => myBookings.find(b => b.renter_id === selectedRenterId), [myBookings, selectedRenterId]);
  const selectedRenterProp = useMemo(() => selectedRenterBooking ? myProperties.find(p => p.id === selectedRenterBooking.property_id) : null, [selectedRenterBooking, myProperties]);
  const selectedRenterBills = useMemo(() => bills.filter(b => b.renter_id === selectedRenterId), [bills, selectedRenterId]);
  const pendingBillCount = useMemo(() => selectedRenterBills.filter(b => b.status !== BillStatus.PAID).length, [selectedRenterBills]);

  const renterAppHistory = useMemo(() => {
    if (!selectedRenterId) return [];
    return allApplications
        .filter(a => a.renter_id === selectedRenterId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allApplications, selectedRenterId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reviewId = params.get('reviewId');
    if (reviewId) setReviewingAppId(reviewId);
  }, [location.search]);

  useEffect(() => {
      if (selectedRenterId) {
          setIsAddingNewOccupant(false);
          setShowBillForm(false);
          setExpandedOccupantIndex(null);
          setTenantProfileTab('overview');

          if (selectedRenterBooking) {
              setEditLeaseForm({
                  startDate: selectedRenterBooking.start_date,
                  endDate: selectedRenterBooking.end_date
              });
          }
      }
  }, [selectedRenterId, selectedRenterBooking]);

  const validatePropertyForm = (prop: Partial<Property>) => {
    const errors: Record<string, string> = {};
    if (!prop.title?.trim()) errors.title = "Title is required";
    if (!prop.address?.trim()) errors.address = "Address is required";
    if (!prop.price || prop.price <= 0) errors.price = "Valid price is required";
    return errors;
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();

    const verification = canPostProperty();
    if (!verification.allowed) {
        setPropertyErrors({ general: verification.message });
        return;
    }

    const errors = validatePropertyForm(newProp);
    if (Object.keys(errors).length > 0) {
        setPropertyErrors(errors);
        return;
    }

    setIsSubmitting(true);
    try {
        const finalImage = newProp.image;
        const finalDesc = newProp.description;

        await addProperty({
            owner_id: currentUser?.id || '',
            title: newProp.title || 'Untitled Property',
            description: finalDesc || '',
            address: newProp.address || '',
            price: Number(newProp.price),
            bedrooms: Number(newProp.bedrooms) || 1,
            bathrooms: Number(newProp.bathrooms) || 1,
            sqft: Number(newProp.sqft) || 500,
            image: finalImage || '/img/default-property-img.png',
            status: PropertyStatus.AVAILABLE,
            amenities: newProp.amenities || [],
            category: newProp.category || PropertyCategory.APARTMENT
        });

        setIsAddModalOpen(false);
        setNewProp({ title: '', address: '', price: 0, amenities: [], image: '', category: PropertyCategory.APARTMENT, maxOccupancy: 2 });
        setPropertyErrors({});
        setCustomAmenity('');
    } catch (err: any) {
        const message = err?.message || 'Failed to create property. Please try again.';
        setPropertyErrors({ general: message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const openEditModal = (prop: Property) => {
      setEditingProp({ ...prop });
      setIsEditModalOpen(true);
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingProp) return;

      const errors = validatePropertyForm(editingProp);
      if (Object.keys(errors).length > 0) {
          setPropertyErrors(errors);
          return;
      }

      updateProperty(editingProp);
      setIsEditModalOpen(false);
      setEditingProp(null);
      setPropertyErrors({});
  };

  const handleDeleteProperty = async () => {
      if (!editingProp) return;

      await showConfirm(
          'Delete Property',
          'Are you sure you want to delete this property? This action cannot be undone.',
          async () => {
              try {
                  await deleteProperty(editingProp.id);
                  setIsEditModalOpen(false);
                  setEditingProp(null);
                  showInfo('Deleted', 'Property deleted successfully.', 'success');
              } catch (e: any) {
                  const details = (e as any)?.details;
                  if ((e as any)?.code === 'PROPERTY_DELETE_BLOCKED' && details) {
                      const msg = `This property cannot be deleted yet.\n\n` +
                        `Bookings: ${details.bookingsCount}\n` +
                        `Bills: ${details.billsCount}\n` +
                        `Applications: ${details.applicationsCount}\n\n` +
                        `Settle/close these first, then try again.\n` +
                        `Link: ${details.link}`;
                      showInfo('Cannot Delete Property', msg, 'error');
                      return;
                  }
                  showInfo('Error', (e as any)?.message || 'Failed to delete property.', 'error');
              }
          },
          () => undefined,
          { confirmText: 'Delete', cancelText: 'Cancel' }
      );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    if (e.target.files && e.target.files[0]) {
        setIsImageUploading(true);
        const file = e.target.files[0];
        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                if (isEdit && editingProp) {
                    setEditingProp({ ...editingProp, image: result });
                } else {
                    setNewProp({ ...newProp, image: result });
                }
                setIsImageUploading(false);
            };
            reader.readAsDataURL(file);
        }, 1000);
    }
  };

  const handleUserSearch = async () => {
      setSearchError('');
      setFoundRenter(null);
      if (!newRenterEmail) {
          setSearchError('Please enter an email address.');
          return;
      }
      setIsSearchingUser(true);
      const user = await searchUserByEmail(newRenterEmail);
      setIsSearchingUser(false);

      if (user) {
          setFoundRenter(user);
          setSearchError('');
      } else {
          setSearchError('User not found. Please ask the tenant to create a Lagkaw account first.');
      }
  };

  const handleOnboardTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundRenter || !selectedPropId || !leaseDetails.startDate) return;

    await addBooking({
        property_id: selectedPropId,
        renter_id: foundRenter.id,
        start_date: leaseDetails.startDate,
        end_date: leaseDetails.endDate || '',
        is_active: true,
        occupants: occupants
    });

    const prop = myProperties.find(p => p.id === selectedPropId);
    if (prop) {
        updateProperty({ ...prop, status: PropertyStatus.OCCUPIED });
    }

    setIsAddRenterModalOpen(false);
    setOnboardStep(1);
    setNewRenterEmail('');
    setFoundRenter(null);
    setSelectedPropId('');
    setLeaseDetails({ startDate: '', endDate: '' });
    setOccupants([]);
  };

  const addOccupantToOnboarding = () => {
    if(!tempOccupant.name) return;
    setOccupants([...occupants, tempOccupant]);
    setTempOccupant({ name: '', relation: '', age: undefined });
  };

  const removeOccupant = async (index: number) => {
    if (!selectedRenterBooking) return;

    await showConfirm(
        'Remove Occupant',
        'Are you sure you want to remove this occupant?',
        async () => {
            try {
                const newOccupants = [...(selectedRenterBooking.occupants || [])];
                newOccupants.splice(index, 1);
                await updateBooking({ ...selectedRenterBooking, occupants: newOccupants });
                showInfo('Removed', 'Occupant removed successfully.', 'success');
            } catch (e) {
                showInfo('Error', 'Failed to remove occupant.', 'error');
            }
        },
        () => undefined,
        { confirmText: 'Remove', cancelText: 'Cancel' }
    );
  };

  const addNewOccupantToBooking = () => {
      if (!selectedRenterBooking) return;
      if (!newOccupantForm.name) return;

      const newOccupants = [...(selectedRenterBooking.occupants || []), newOccupantForm];
      updateBooking({ ...selectedRenterBooking, occupants: newOccupants });
      setNewOccupantForm({ name: '', relation: '', age: undefined, notes: '' });
      setIsAddingNewOccupant(false);
  };

  const handleUpdateLease = () => {
      if (!selectedRenterBooking) return;
      if (!editLeaseForm.startDate) return;

      updateBooking({
          ...selectedRenterBooking,
          start_date: editLeaseForm.startDate,
          end_date: editLeaseForm.endDate || ''
      });
      setIsEditingLease(false);
  };

  const handleRenewLease = () => {
      if (!selectedRenterBooking) return;
      setEditLeaseForm({
          startDate: selectedRenterBooking.start_date,
          endDate: selectedRenterBooking.end_date || ''
      });
      setIsEditingLease(true);

      if (!selectedRenterId) {
          setSelectedRenterId(selectedRenterBooking.renter_id);
      }
  };

  const extendLease = (months: number) => {
      const currentEnd = editLeaseForm.endDate ? new Date(editLeaseForm.endDate) : new Date();
      const newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + months));
      setEditLeaseForm({
          ...editLeaseForm,
          endDate: newEnd.toISOString().split('T')[0]
      });
  };

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case PropertyCategory.HOUSE: return <Home size={18}/>;
          case PropertyCategory.APARTMENT: return <Building size={18}/>;
          case PropertyCategory.ROOM: return <BedDouble size={18}/>;
          case PropertyCategory.BEDSPACER: return <Users size={18}/>;
          case PropertyCategory.PAD: return <Square size={18}/>;
          case PropertyCategory.BOARDING_HOUSE: return <Warehouse size={18}/>;
          default: return <Building size={18}/>;
      }
  };

  const revenueData = [
    { month: 'Jan', revenue: 42000 },
    { month: 'Feb', revenue: 45000 },
    { month: 'Mar', revenue: 43000 },
    { month: 'Apr', revenue: 47000 },
    { month: 'May', revenue: 46000 },
    { month: 'Jun', revenue: 49000 },
  ];

  const propertyStatsData = [
    { name: 'Occupied', value: myBookings.length, color: '#22C55E' },
    { name: 'Available', value: myProperties.filter(p => p.status === PropertyStatus.AVAILABLE).length, color: '#8B5A2B' },
    { name: 'Maintenance', value: myProperties.filter(p => p.status === PropertyStatus.MAINTENANCE).length, color: '#EF4444' },
  ];

  const renderDashboardOverview = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary to-primary/90 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
                <PesoSign size={24} />
            </div>
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
              +12.5%
            </span>
          </div>
          <p className="text-white/90 text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold">₱{totalRevenue.toLocaleString()}</p>
          <div className="mt-4 text-xs text-white/80">
            Last 30 days
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <Building2 size={24} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{myProperties.length}</p>
              <p className="text-xs text-gray-500">Properties</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${totalOccupancy}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {totalOccupancy.toFixed(0)}% occupancy rate
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl text-green-600">
              <Users size={24} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{renters.length}</p>
              <p className="text-xs text-gray-500">Active Tenants</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Target size={16} />
            <span>{myBookings.length} active leases</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <FileText size={24} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {sortedApplications.filter(a => a.status === ApplicationStatus.PENDING).length}
              </p>
              <p className="text-xs text-gray-500">Pending Apps</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} />
            <span>Requires review</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Revenue Trend
            </h3>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
              <option>Last 6 months</option>
              <option>Last year</option>
              <option>All time</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₱${value/1000}k`} />
                <Tooltip formatter={(value) => [`₱${value}`, 'Revenue']} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8B5A2B" 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5A2B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8B5A2B" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PieChart size={20} className="text-primary" />
              Property Status
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs">Occupied</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-xs">Available</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartPie>
                <Pie
                  data={propertyStatsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {propertyStatsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartPie>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expiring Leases & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring Leases */}
        {expiringLeases.length > 0 && (
          <div className="lg:col-span-2 bg-gradient-to-r from-amber-50 to-amber-50/50 rounded-2xl border border-amber-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900">Expiring Leases</h3>
                <p className="text-sm text-amber-700">{expiringLeases.length} lease(s) ending soon</p>
              </div>
            </div>
            <div className="space-y-3">
              {expiringLeases.slice(0, 3).map(lease => {
                const prop = myProperties.find(p => p.id === lease.property_id);
                const renter = users.find(u => u.id === lease.renter_id);
                const daysLeft = Math.ceil((new Date(lease.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={lease.id} className="bg-white p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{prop?.title}</p>
                      <p className="text-sm text-gray-600">{renter?.full_name} • {daysLeft} days left</p>
                    </div>
                    <button
                      onClick={() => {
                        if (renter) {
                          setSelectedRenterId(renter.id);
                          setIsEditingLease(true);
                        }
                      }}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Renew
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full p-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center gap-3 transition-all hover:shadow-lg"
            >
              <Plus size={20} />
              Add Property
            </button>
            <button
              onClick={() => setIsAddRenterModalOpen(true)}
              className="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold flex items-center gap-3 transition-all hover:shadow-lg"
            >
              <UserPlus size={20} />
              Onboard Tenant
            </button>
            <Link
              to="/applications"
              className="block w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-3 transition-all hover:shadow-lg"
            >
              <FileText size={20} />
              View Applications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPropertiesView = () => (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Properties</h2>
            <p className="text-gray-600 mt-1">Manage your rental properties and their status</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Add Property
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search properties by name or address..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <select
                className="appearance-none pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-sm font-medium text-gray-700 min-w-[180px]"
                value={propertySort}
                onChange={(e) => setPropertySort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building size={48} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-6">Start by adding your first property</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Add Property
            </button>
          </div>
        ) : (
          filteredProperties.map(prop => {
            const booking = myBookings.find(b => b.property_id === prop.id);
            const tenant = booking ? users.find(u => u.id === booking.renter_id) : null;
            return (
              <div key={prop.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={prop.image || '/img/default-property-img.png'}
                    alt={prop.title}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src.includes('/img/default-property-img.png')) return;
                      img.src = '/img/default-property-img.png';
                    }}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      prop.status === PropertyStatus.AVAILABLE 
                        ? 'bg-green-100 text-green-700' 
                        : prop.status === PropertyStatus.OCCUPIED 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                      {prop.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-lg truncate">
                      <Link to={`/property/${prop.id}`} className="hover:text-primary transition-colors">
                        {prop.title}
                      </Link>
                    </h3>
                    <span className="text-lg font-bold text-primary">₱{prop.price.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <MapPin size={16} />
                    <span className="truncate">{prop.address}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      <BedDouble size={16} />
                      {prop.bedrooms || 1} beds
                    </span>
                    <span className="flex items-center gap-1">
                      <Square size={16} />
                      {prop.sqft || 500} sqft
                    </span>
                  </div>
                  
                  {tenant && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                      <img 
                        src={tenant.avatar_url || '/img/default-profile.png'} 
                        className="w-8 h-8 rounded-full"
                        alt={tenant.full_name}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{tenant.full_name}</p>
                        <p className="text-xs text-gray-500">Current tenant</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEditModal(prop)}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      Manage
                    </button>
                    <Link
                      to={`/property/${prop.id}`}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-center transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderTenantsView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tenant Directory</h2>
            <p className="text-gray-600 mt-1">Manage your tenants and their leases</p>
          </div>
          <button
            onClick={() => setIsAddRenterModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg flex items-center gap-2"
          >
            <UserPlus size={20} />
            Onboard Tenant
          </button>
        </div>
      </div>

      {/* Tenants Grid */}
      {renters.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={48} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-3">No tenants yet</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Add your first tenant to start managing leases, payments, and maintenance requests.
          </p>
          <button
            onClick={() => setIsAddRenterModalOpen(true)}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Onboard Your First Tenant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renters.map(renter => {
            const booking = myBookings.find(b => b.renter_id === renter.id);
            const prop = booking ? myProperties.find(p => p.id === booking.property_id) : null;
            if (!booking) return null;

            return (
              <div 
                key={renter.id} 
                onClick={() => { setSelectedRenterId(renter.id); setIsEditingLease(false); }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img 
                      src={renter.avatar_url || '/img/default-profile.png'} 
                      alt={renter.full_name}
                      className="w-16 h-16 rounded-full border-4 border-white shadow-md"
                    />
                    {renter.is_verified === 1 && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-white">
                        <BadgeCheck size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg truncate group-hover:text-primary transition-colors">
                      {renter.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{renter.email}</p>
                  </div>
                </div>

                {prop && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-primary font-semibold mb-1">
                      {getCategoryIcon(String(prop.category))}
                      <span>{String(prop.category).replace('_', ' ')}</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{prop.title}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <span>Lease ends: {booking.end_date || 'Ongoing'}</span>
                      <span>•</span>
                      <span>{booking.occupants?.length || 1} occupants</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900">
                      ₱{prop?.price?.toLocaleString() || '0'}/mo
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    renter.status_type_id === VerificationStatus.PENDING 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {renter.status_type_id === VerificationStatus.PENDING ? 'Pending' : 'Verified'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderApplicationsView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
            <p className="text-gray-600 mt-1">Review and manage property applications</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {sortedApplications.filter(a => a.status === ApplicationStatus.PENDING).length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {sortedApplications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText size={48} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-3">No applications yet</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            When tenants apply for your properties, they'll appear here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedApplications.map(app => {
            const prop = myProperties.find(p => p.id === app.property_id);
            const applicant = users.find(u => u.id === app.renter_id);
            const isPending = app.status === ApplicationStatus.PENDING;

            return (
              <div 
                key={app.id} 
                className={`bg-white rounded-2xl border shadow-sm p-6 transition-all hover:shadow-md ${
                  isPending ? 'border-l-4 border-l-primary' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Applicant Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <img 
                      src={applicant?.avatar_url || '/img/default-profile.png'} 
                      className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
                      alt={applicant?.full_name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-gray-900 text-lg truncate">
                          {applicant?.full_name}
                        </h4>
                        {isPending && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Applied {app.created_at?.slice(0, 10)}
                        </span>
                        <span className="flex items-center gap-1">
                          <PesoSign size={14} />
                          ₱{(app.income || 0).toLocaleString()}/mo
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        "{app.message}"
                      </p>
                    </div>
                  </div>

                  {/* Property & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4">
                    {prop && (
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{prop.title}</p>
                        <p className="text-sm text-gray-500">₱{prop.price.toLocaleString()}/mo</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        app.status === ApplicationStatus.APPROVED ? 'bg-green-100 text-green-700' :
                        app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-700' :
                        app.status === ApplicationStatus.CANCELLED ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {app.status}
                      </span>
                      
                      {isPending ? (
                        <button
                          onClick={() => setReviewingAppId(app.id)}
                          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => setReviewingAppId(app.id)}
                          className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6 lg:p-8">
      <ConfirmComponent />
      <InfoComponent />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {isPropertiesView ? 'My Properties' : 
               isTenantsView ? 'Tenant Directory' : 
               isApplicationsView ? 'Applications' : 
               'Owner Dashboard'}
            </h1>
            <p className="text-gray-600">
              {isPropertiesView ? 'Manage your rental properties and their status' :
               isTenantsView ? 'View and manage your current tenants' :
               isApplicationsView ? 'Review and process tenant applications' :
               'Overview of your rental business performance'}
            </p>
          </div>
          
          {isTenantsView && (
            <button
              onClick={() => setIsAddRenterModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg flex items-center gap-2"
            >
              <UserPlus size={20} />
              Onboard Tenant
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-1 pb-2">
          <Link
            to="/"
            className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              isDashboardView 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/my-properties"
            className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              isPropertiesView 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Properties
          </Link>
          <Link
            to="/tenants"
            className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              isTenantsView 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Tenants
          </Link>
          <Link
            to="/applications"
            className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-colors ${
              isApplicationsView 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Applications
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {isDashboardView && renderDashboardOverview()}
      {isPropertiesView && renderPropertiesView()}
      {isTenantsView && renderTenantsView()}
      {isApplicationsView && renderApplicationsView()}

      {/* Add Property Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New Property</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddProperty} className="space-y-6">
              {propertyErrors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {propertyErrors.general}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Property Title
                  </label>
                  <input
                    required
                    type="text"
                    className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                      propertyErrors.title ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="e.g. Sunset Apartments"
                    value={newProp.title}
                    onChange={(e) => setNewProp({...newProp, title: e.target.value})}
                  />
                  {propertyErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{propertyErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                    value={newProp.category}
                    onChange={(e) => setNewProp({ ...newProp, category: e.target.value as any })}
                  >
                    {Object.values(PropertyCategory).filter(cat => cat !== PropertyCategory.BOARDING_HOUSE).map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                    {propertyCategories
                      .filter(c => !Object.values(PropertyCategory).includes(c as any))
                      .map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      required
                      type="text"
                      className={`w-full border rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                        propertyErrors.address ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Full street address"
                      value={newProp.address}
                      onChange={(e) => setNewProp({...newProp, address: e.target.value})}
                    />
                  </div>
                  {propertyErrors.address && (
                    <p className="mt-1 text-sm text-red-600">{propertyErrors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Rent (₱)
                  </label>
                  <input
                    required
                    type="number"
                    className={`w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none ${
                      propertyErrors.price ? 'border-red-300' : ''
                    }`}
                    value={newProp.price || ''}
                    onChange={(e) => setNewProp({...newProp, price: parseFloat(e.target.value)})}
                  />
                  {propertyErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{propertyErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Occupancy
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={newProp.maxOccupancy || ''}
                    onChange={(e) => setNewProp({...newProp, maxOccupancy: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Bedrooms
                  </label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5"
                    value={newProp.bedrooms || ''} 
                    onChange={(e) => setNewProp({...newProp, bedrooms: parseInt(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Bathrooms
                  </label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5"
                    value={newProp.bathrooms || ''} 
                    onChange={(e) => setNewProp({...newProp, bathrooms: parseInt(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Square Feet
                  </label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5"
                    value={newProp.sqft || ''} 
                    onChange={(e) => setNewProp({...newProp, sqft: parseInt(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Amenities
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['WiFi', 'Free Water', 'Electricity Included', 'Parking', 'Aircon', 'Laundry', 'Security', 'Furnished'].map((a) => {
                    const selected = (newProp.amenities || []).includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          const current = newProp.amenities || [];
                          setNewProp({
                            ...newProp,
                            amenities: selected ? current.filter(x => x !== a) : [...current, a]
                          });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selected 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Add custom amenity"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = customAmenity.trim();
                      if (!value) return;
                      const current = newProp.amenities || [];
                      if (current.includes(value)) return;
                      setNewProp({ ...newProp, amenities: [...current, value] });
                      setCustomAmenity('');
                    }}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Property Image
                </label>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img
                      src={newProp.image || '/img/default-property-img.png'}
                      alt="Preview"
                      className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200"
                    />
                    {isImageUploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={addPropImageInputRef}
                      onChange={(e) => handleImageUpload(e, false)}
                      className="hidden"
                      accept="image/*"
                    />
                    <button
                      type="button"
                      onClick={() => addPropImageInputRef.current?.click()}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Upload Image
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: 800x600px or larger
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isImageUploading}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Property
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {isEditModalOpen && editingProp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Property</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateProperty} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium"
                    value={editingProp.status}
                    onChange={(e) => setEditingProp({...editingProp, status: e.target.value as PropertyStatus})}
                  >
                    <option value={PropertyStatus.AVAILABLE}>Available</option>
                    <option value={PropertyStatus.OCCUPIED}>Rented</option>
                    <option value={PropertyStatus.MAINTENANCE}>Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price (₱)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={editingProp.price}
                    onChange={(e) => setEditingProp({...editingProp, price: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Property Title
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={editingProp.title}
                    onChange={(e) => setEditingProp({...editingProp, title: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Update Image
                  </label>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img
                        src={editingProp.image || '/img/default-property-img.png'}
                        alt="Preview"
                        className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200"
                      />
                      {isImageUploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <Loader2 size={24} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        ref={editPropImageInputRef}
                        onChange={(e) => handleImageUpload(e, true)}
                        className="hidden"
                        accept="image/*"
                      />
                      <button
                        type="button"
                        onClick={() => editPropImageInputRef.current?.click()}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
                      >
                        <Upload size={16} />
                        Upload New Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleDeleteProperty}
                  className="px-6 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors"
                >
                  Delete Property
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isImageUploading}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard Tenant Modal */}
      {isAddRenterModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Onboard Tenant</h2>
                <div className="flex gap-2 mt-3">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`w-8 h-1.5 rounded-full ${onboardStep >= step ? 'bg-primary' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setIsAddRenterModalOpen(false)} 
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleOnboardTenant} id="onboard-form">
                {onboardStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Find Tenant</h3>
                        <p className="text-gray-600 text-sm">Search for existing Lagkaw user by email</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="flex gap-3">
                        <Info size={20} className="text-blue-600 shrink-0" />
                        <p className="text-sm text-blue-700">
                          Tenants must have a Lagkaw account. Enter their email to link them to your property.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tenant Email Address
                      </label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="email"
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                          value={newRenterEmail}
                          onChange={e => setNewRenterEmail(e.target.value)}
                          placeholder="tenant@example.com"
                        />
                        <button
                          type="button"
                          onClick={handleUserSearch}
                          disabled={isSearchingUser || !newRenterEmail}
                          className="bg-primary text-white px-5 rounded-xl font-bold disabled:opacity-70 transition-colors"
                        >
                          {isSearchingUser ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Search size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    {searchError && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <div className="flex gap-2">
                          <AlertCircle size={18} className="shrink-0" />
                          <p>{searchError}</p>
                        </div>
                      </div>
                    )}

                    {foundRenter && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-in fade-in">
                        <div className="flex items-center gap-3">
                          <img 
                            src={foundRenter.avatar_url || '/img/default-profile.png'} 
                            className="w-12 h-12 rounded-full"
                            alt={foundRenter.full_name}
                          />
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{foundRenter.full_name}</p>
                            <p className="text-sm text-green-700">User found successfully</p>
                          </div>
                          <CheckCircle size={20} className="text-green-600" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {onboardStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        2
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Assign Property</h3>
                        <p className="text-gray-600 text-sm">Select property and set lease terms</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Property <span className="text-red-500">*</span>
                      </label>
                      <select 
                        required 
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                        value={selectedPropId} 
                        onChange={e => setSelectedPropId(e.target.value)}
                      >
                        <option value="">Choose a property</option>
                        {myProperties.filter(p => p.status === PropertyStatus.AVAILABLE || p.status === PropertyStatus.OCCUPIED).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Lease Start <span className="text-red-500">*</span>
                        </label>
                        <input 
                          required 
                          type="date" 
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                          value={leaseDetails.startDate} 
                          onChange={e => setLeaseDetails({...leaseDetails, startDate: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Lease End
                        </label>
                        <input 
                          type="date" 
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none"
                          value={leaseDetails.endDate} 
                          onChange={e => setLeaseDetails({...leaseDetails, endDate: e.target.value})} 
                        />
                        <p className="text-xs text-gray-500 mt-2">Leave empty for ongoing lease</p>
                      </div>
                    </div>
                  </div>
                )}

                {onboardStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        3
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Occupant Details</h3>
                        <p className="text-gray-600 text-sm">Add additional occupants (Optional)</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input 
                          className="border rounded-lg px-3 py-2 text-sm" 
                          placeholder="Full Name" 
                          value={tempOccupant.name} 
                          onChange={e => setTempOccupant({...tempOccupant, name: e.target.value})} 
                        />
                        <input 
                          className="border rounded-lg px-3 py-2 text-sm" 
                          placeholder="Relation" 
                          value={tempOccupant.relation} 
                          onChange={e => setTempOccupant({...tempOccupant, relation: e.target.value})} 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={addOccupantToOnboarding}
                        className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        + Add Occupant
                      </button>
                    </div>

                    <div className="space-y-3">
                      {occupants.map((occ, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-white">
                          <div>
                            <p className="font-medium text-gray-900">{occ.name}</p>
                            <p className="text-sm text-gray-500">Relation: {occ.relation}</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setOccupants(occupants.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      {occupants.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">
                          No additional occupants added
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-between">
              {onboardStep > 1 ? (
                <button 
                  onClick={() => setOnboardStep(onboardStep - 1)} 
                  className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {onboardStep < 3 ? (
                <button 
                  onClick={() => {
                    if(onboardStep === 1 && !foundRenter) return;
                    if(onboardStep === 2 && (!selectedPropId || !leaseDetails.startDate)) return;
                    setOnboardStep(onboardStep + 1);
                  }} 
                  disabled={(onboardStep === 1 && !foundRenter) || (onboardStep === 2 && (!selectedPropId || !leaseDetails.startDate))}
                  className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  onClick={handleOnboardTenant}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                >
                  Complete Onboarding
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Review Modal */}
      {reviewingAppId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {(() => {
              const app = applications.find(a => a.id === reviewingAppId);
              if (!app) return null;
              const applicant = users.find(u => u.id === app.renter_id);
              const prop = myProperties.find(p => p.id === app.property_id);
              const isPending = app.status === ApplicationStatus.PENDING;

              return (
                <>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-gray-900">
                      {isPending ? 'Review Application' : 'Application Details'}
                    </h2>
                    <button 
                      onClick={() => setReviewingAppId(null)} 
                      className="p-2 hover:bg-white rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Applicant Info */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <img 
                          src={applicant?.avatar_url || '/img/default-profile.png'} 
                          className="w-16 h-16 rounded-full border border-gray-100"
                          alt={applicant?.full_name}
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {applicant?.full_name}
                            <button 
                              onClick={() => { 
                                setSelectedRenterId(applicant?.id || null); 
                                setIsEditingLease(false);
                                setReviewingAppId(null);
                              }} 
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink size={16} />
                            </button>
                          </h3>
                          <div className="flex gap-3 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Mail size={14} />
                              {applicant?.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={14} />
                              {applicant?.phone || 'No phone'}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            {applicant?.is_verified === 1 ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                                <ShieldCheck size={12} />
                                Verified User
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1">
                                <AlertCircle size={12} />
                                Unverified
                              </span>
                            )}
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                              Income: ₱{app.income?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Property Info */}
                    {prop && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <h4 className="text-sm font-bold text-gray-500 uppercase">Applying For</h4>
                        </div>
                        <Link
                          to={`/property/${prop.id}`}
                          state={{ from: `/applications?reviewId=${app.id}` }}
                          className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group"
                        >
                          <img
                            src={prop.image || '/img/default-property-img.png'}
                            className="w-20 h-20 rounded-lg object-cover"
                            alt={prop.title}
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                              {prop.title}
                            </h4>
                            <p className="text-sm text-gray-600">{prop.address}</p>
                            <p className="text-lg font-bold text-primary mt-1">
                              ₱{prop.price.toLocaleString()}/month
                            </p>
                          </div>
                          <ArrowUpRight size={20} className="text-gray-400 group-hover:text-primary" />
                        </Link>
                      </div>
                    )}

                    {/* Message */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <h4 className="text-sm font-bold text-gray-500 uppercase">Cover Message</h4>
                      </div>
                      <div className="p-6">
                        <div className="bg-gray-50 p-4 rounded-lg text-gray-700 italic border-l-4 border-l-primary">
                          "{app.message}"
                        </div>
                      </div>
                    </div>

                    {/* Status Info */}
                    <div className={`p-4 rounded-xl border ${
                      isPending 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}>
                      <div className="flex gap-3">
                        <Info size={20} className="shrink-0" />
                        <p className="text-sm">
                          {isPending 
                            ? 'Approving this application will automatically create an active lease for 1 year and mark the property as RENTED.'
                            : `This application is currently ${app.status}.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-6 border-t border-gray-100 bg-white">
                    {isPending ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => { 
                            processApplication(app.id, ApplicationStatus.REJECTED); 
                            setReviewingAppId(null); 
                          }}
                          className="py-3.5 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => { 
                            processApplication(app.id, ApplicationStatus.APPROVED); 
                            setReviewingAppId(null); 
                          }}
                          className="py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                        >
                          Approve Lease
                        </button>
                        <button
                          onClick={() => { 
                            processApplication(app.id, ApplicationStatus.CANCELLED); 
                            setReviewingAppId(null); 
                          }}
                          className="col-span-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Mark as Unresponsive / Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingAppId(null)}
                        className="w-full py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tenant Profile Modal */}
      {selectedRenterId && selectedRenter && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">Tenant Profile</h2>
              <button 
                onClick={() => { setSelectedRenterId(null); setIsEditingLease(false); }} 
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-6 md:p-8">
                {/* Tenant Header */}
                <div className="flex flex-col md:flex-row gap-6 mb-8">
                  <div className="relative">
                    <img 
                      src={selectedRenter.avatar_url || '/img/default-profile.png'} 
                      className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-200 object-cover"
                      alt={selectedRenter.full_name}
                    />
                    {selectedRenter.is_verified === 1 ? (
                      <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
                        <BadgeCheck size={20} className="text-primary fill-primary/20" />
                      </div>
                    ) : (
                      <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
                        <AlertCircle size={20} className="text-amber-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{selectedRenter.full_name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail size={16} />
                            {selectedRenter.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={16} />
                            {selectedRenter.phone || 'No phone'}
                          </span>
                        </div>
                      </div>
                      {selectedRenter.status_type_id === VerificationStatus.PENDING && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                          VERIFICATION PENDING
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-green-700 font-bold uppercase mb-1">
                          Reliability
                        </div>
                        <div className="text-lg font-bold text-green-800">
                          {(() => {
                            const totalBills = selectedRenterBills.length;
                            const paidBills = selectedRenterBills.filter(b => b.status === BillStatus.PAID).length;
                            return totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 0;
                          })()}%
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] text-blue-700 font-bold uppercase mb-1">
                          Total Paid
                        </div>
                        <div className="text-lg font-bold text-blue-800">
                          ₱{selectedRenterBills
                            .filter(b => b.status === BillStatus.PAID)
                            .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
                            .toLocaleString()}
                        </div>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${
                        pendingBillCount > 0 ? 'bg-red-50' : 'bg-gray-50'
                      }`}>
                        <div className={`text-[10px] font-bold uppercase mb-1 ${
                          pendingBillCount > 0 ? 'text-red-700' : 'text-gray-500'
                        }`}>
                          Outstanding
                        </div>
                        <div className={`text-lg font-bold ${
                          pendingBillCount > 0 ? 'text-red-800' : 'text-gray-800'
                        }`}>
                          ₱{selectedRenterBills
                            .filter(b => b.status !== BillStatus.PAID)
                            .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
                            .toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 mb-6">
                  <button
                    onClick={() => setTenantProfileTab('overview')}
                    className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                      tenantProfileTab === 'overview' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setTenantProfileTab('history')}
                    className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                      tenantProfileTab === 'history' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <History size={16} />
                      Application History
                    </span>
                  </button>
                </div>

                {/* Tab Content */}
                {tenantProfileTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Lease & Occupants */}
                    <div className="space-y-6">
                      {/* Active Lease */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Home size={20} className="text-primary" />
                            Active Lease
                          </h4>
                          {selectedRenterBooking && (
                            <button
                              onClick={handleRenewLease}
                              className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                              Renew Lease
                            </button>
                          )}
                        </div>

                        {selectedRenterProp && selectedRenterBooking ? (
                          <div className="space-y-4">
                            <Link to={`/property/${selectedRenterProp.id}`} className="block group">
                              <div className="aspect-video rounded-xl bg-gray-100 overflow-hidden relative">
                                <img
                                  src={selectedRenterProp.image || '/img/default-property-img.png'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  alt={selectedRenterProp.title}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                  <div>
                                    <h5 className="text-white font-bold text-lg">{selectedRenterProp.title}</h5>
                                    <p className="text-white/90 text-sm">₱{selectedRenterProp.price.toLocaleString()}/month</p>
                                  </div>
                                </div>
                              </div>
                            </Link>

                            {isEditingLease ? (
                              <div className="bg-beige/10 p-4 rounded-xl border border-beige/30 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                      Start Date
                                    </label>
                                    <input 
                                      type="date" 
                                      className="w-full p-2 text-sm border rounded-lg" 
                                      value={editLeaseForm.startDate} 
                                      onChange={e => setEditLeaseForm({...editLeaseForm, startDate: e.target.value})} 
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                                      End Date
                                    </label>
                                    <div className="space-y-2">
                                      <input
                                        type="date"
                                        className="w-full p-2 text-sm border rounded-lg"
                                        value={editLeaseForm.endDate}
                                        onChange={e => setEditLeaseForm({...editLeaseForm, endDate: e.target.value})}
                                        disabled={!editLeaseForm.endDate}
                                      />
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={!editLeaseForm.endDate}
                                          onChange={e => setEditLeaseForm({
                                            ...editLeaseForm,
                                            endDate: e.target.checked ? '' : new Date().toISOString().split('T')[0]
                                          })}
                                          className="rounded"
                                        />
                                        <span className="text-xs text-gray-500">No end date</span>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => extendLease(6)} 
                                    className="flex-1 text-xs border border-gray-200 rounded-lg py-2 hover:bg-gray-50"
                                  >
                                    +6 Months
                                  </button>
                                  <button 
                                    onClick={() => extendLease(12)} 
                                    className="flex-1 text-xs border border-gray-200 rounded-lg py-2 hover:bg-gray-50"
                                  >
                                    +1 Year
                                  </button>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                  <button 
                                    onClick={() => setIsEditingLease(false)} 
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={handleUpdateLease}
                                    className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                                    Start Date
                                  </div>
                                  <div className="font-medium">{selectedRenterBooking.start_date}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                                    End Date
                                  </div>
                                  <div className="font-medium">{selectedRenterBooking.end_date || 'Ongoing'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-center py-8">No active lease found</p>
                        )}
                      </div>

                      {/* Occupants */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Users size={20} className="text-primary" />
                            Occupants
                          </h4>
                          {selectedRenterBooking && (
                            <button
                              onClick={() => setIsAddingNewOccupant(!isAddingNewOccupant)}
                              className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                              + Add Occupant
                            </button>
                          )}
                        </div>

                        {isAddingNewOccupant && (
                          <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 space-y-3">
                            <input
                              className="w-full p-2 text-sm border rounded-lg"
                              placeholder="Full Name"
                              value={newOccupantForm.name}
                              onChange={e => setNewOccupantForm({...newOccupantForm, name: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                className="p-2 text-sm border rounded-lg" 
                                placeholder="Relation" 
                                value={newOccupantForm.relation} 
                                onChange={e => setNewOccupantForm({...newOccupantForm, relation: e.target.value})}
                              />
                              <input 
                                className="p-2 text-sm border rounded-lg" 
                                placeholder="Age" 
                                type="number" 
                                value={newOccupantForm.age || ''} 
                                onChange={e => setNewOccupantForm({...newOccupantForm, age: e.target.value ? parseInt(e.target.value) : undefined})}
                              />
                            </div>
                            <textarea
                              className="w-full p-2 text-sm border rounded-lg"
                              placeholder="Notes (optional)"
                              value={newOccupantForm.notes || ''}
                              onChange={e => setNewOccupantForm({ ...newOccupantForm, notes: e.target.value })}
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setIsAddingNewOccupant(false)} 
                                className="text-sm text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={addNewOccupantToBooking}
                                className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {(selectedRenterBooking?.occupants || []).map((occ, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                              <div
                                className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => setExpandedOccupantIndex(expandedOccupantIndex === idx ? null : idx)}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900">{occ.name}</span>
                                  <span className="text-sm text-gray-500">({occ.relation})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); removeOccupant(idx); }} 
                                    className="text-gray-400 hover:text-red-500 p-1"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  {expandedOccupantIndex === idx ? (
                                    <ChevronUp size={16} className="text-gray-400" />
                                  ) : (
                                    <ChevronDown size={16} className="text-gray-400" />
                                  )}
                                </div>
                              </div>
                              {expandedOccupantIndex === idx && (
                                <div className="p-3 bg-white text-sm text-gray-600 border-t border-gray-100">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-xs font-bold text-gray-400 uppercase">Age</div>
                                      <div>{occ.age || 'Not specified'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-gray-400 uppercase">Relation</div>
                                      <div>{occ.relation}</div>
                                    </div>
                                  </div>
                                  {occ.notes && (
                                    <div className="mt-3">
                                      <div className="text-xs font-bold text-gray-400 uppercase">Notes</div>
                                      <div>{occ.notes}</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          {(!selectedRenterBooking?.occupants || selectedRenterBooking.occupants.length === 0) && (
                            <p className="text-center text-gray-400 py-4">No additional occupants listed</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Billing */}
                    <div>
                      <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard size={20} className="text-primary" />
                            Billing & Payments
                          </h4>
                          <button
                            onClick={() => setShowBillForm(!showBillForm)}
                            className="text-sm text-primary hover:text-primary/80 font-medium"
                          >
                            + Add Charge
                          </button>
                        </div>

                        {showBillForm && (
                          <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 space-y-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">
                                Amount (₱)
                              </label>
                              <input 
                                type="number" 
                                className="w-full border rounded-lg p-2 text-sm" 
                                value={newBillDetails.amount} 
                                onChange={e => setNewBillDetails({...newBillDetails, amount: e.target.value})} 
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">
                                  Type
                                </label>
                                <select 
                                  className="w-full border rounded-lg p-2 text-sm bg-white" 
                                  value={newBillDetails.type} 
                                  onChange={e => setNewBillDetails({...newBillDetails, type: e.target.value as BillType})}
                                >
                                  {Object.values(BillType).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">
                                  Due Date
                                </label>
                                <input 
                                  type="date" 
                                  className="w-full border rounded-lg p-2 text-sm" 
                                  value={newBillDetails.dueDate} 
                                  onChange={e => setNewBillDetails({...newBillDetails, dueDate: e.target.value})} 
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">
                                Notes (Optional)
                              </label>
                              <input
                                type="text"
                                className="w-full border rounded-lg p-2 text-sm"
                                value={(newBillDetails as any).notes || ''}
                                onChange={e => setNewBillDetails({ ...(newBillDetails as any), notes: e.target.value })}
                              />
                            </div>
                            {billErrors.general && (
                              <p className="text-xs text-red-500">{billErrors.general}</p>
                            )}
                            <button
                              onClick={() => {
                                if (!newBillDetails.amount || !newBillDetails.dueDate) { 
                                  setBillErrors({general: 'All fields required'}); 
                                  return; 
                                }
                                createBill({
                                  property_id: selectedRenterBooking?.property_id || '',
                                  renter_id: selectedRenter.id,
                                  type: newBillDetails.type,
                                  amount: Number(newBillDetails.amount),
                                  due_date: newBillDetails.dueDate,
                                  status: BillStatus.PENDING,
                                  notes: (newBillDetails as any).notes || undefined
                                });
                                setShowBillForm(false);
                                setNewBillDetails({ amount: '', type: BillType.RENT, dueDate: '' } as any);
                                setBillErrors({});
                              }}
                              className="w-full bg-primary text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                            >
                              Create Bill
                            </button>
                          </div>
                        )}

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {selectedRenterBills.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map(bill => (
                            <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                              <div>
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                  <span className="capitalize">{bill.type.toLowerCase()} Bill</span>
                                  {bill.status === BillStatus.PENDING && (
                                    <Clock size={14} className="text-amber-500" />
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">Due {bill.dueDate}</div>
                              </div>
                              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                <span className="font-bold text-gray-900">₱{bill.amount.toLocaleString()}</span>
                                {bill.status !== BillStatus.PAID ? (
                                  <button
                                    onClick={() => updateBill({...bill, status: BillStatus.PAID})}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                  >
                                    <Check size={14} />
                                    Record Payment
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                      Paid
                                    </span>
                                    <button
                                      onClick={() => updateBill({...bill, status: BillStatus.PENDING})}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                      title="Mark as unpaid"
                                    >
                                      <Undo2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {selectedRenterBills.length === 0 && (
                            <p className="text-center text-gray-400 py-8">No bills created yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tenantProfileTab === 'history' && (
                  <div className="space-y-4">
                    {renterAppHistory.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                        <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-600 mb-2">No Application History</h4>
                        <p className="text-gray-500">This tenant has no previous applications</p>
                      </div>
                    ) : (
                      renterAppHistory.map(app => {
                        const prop = myProperties.find(p => p.id === app.property_id);
                        return (
                          <div key={app.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
                            <div className="flex items-start gap-4">
                              {prop && (
                                <img
                                  src={prop.image || '/img/default-property-img.png'}
                                  className="w-20 h-20 rounded-lg object-cover"
                                  alt={prop.title}
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-gray-900">
                                    {prop?.title || 'Property'}
                                  </h4>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    app.status === ApplicationStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                    app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                    app.status === ApplicationStatus.CANCELLED ? 'bg-gray-100 text-gray-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {app.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    Applied: {app.date}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <PesoSign size={14} />
                                    Stated Income: ₱{(app.income || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <p className="text-sm text-gray-600 italic">"{app.message}"</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};