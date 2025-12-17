
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Property, BillStatus, UserRole, BillType, PropertyStatus, ApplicationStatus, Application, Occupant, PropertyCategory, VerificationStatus } from '../types';
import { Plus, Users, DollarSign, Activity, Search, AlertCircle, Clock, Mail, UserPlus, X, Home, FileText, Download, TrendingUp, PieChart as PieIcon, BarChart3, Phone, ShieldCheck, Check, BadgeCheck, Image as ImageIcon, Loader2, Edit2, Trash2, Save, FileQuestion, XCircle, CheckCircle, Eye, Calendar, ArrowRight, MoreHorizontal, Undo2, Ban, ExternalLink, ArrowUpRight, DollarSign as DollarIcon, BedDouble, Warehouse, Building, Square, ChevronDown, ChevronUp, StickyNote, MoreVertical, Flag, MessageSquare, Sparkles, MapPin, Upload, Filter, ArrowUpDown, Info, History } from 'lucide-react';
import { usePropertyPostingVerification } from '../lib/verification';
import { useDialogs, addDialogStyles } from '../components/CustomDialogs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
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
          case PropertyCategory.HOUSE: return <Home size={16}/>;
          case PropertyCategory.APARTMENT: return <Building size={16}/>;
          case PropertyCategory.ROOM: return <BedDouble size={16}/>;
          case PropertyCategory.BEDSPACER: return <Users size={16}/>;
          case PropertyCategory.PAD: return <Square size={16}/>;
          case PropertyCategory.BOARDING_HOUSE: return <Warehouse size={16}/>;
          default: return <Building size={16}/>;
      }
  };

  const renderDashboardOverview = () => (
      <div className="space-y-6">
        {}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-dark mt-1">₱{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-beige/30 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <DollarSign size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-dark mt-1">{totalOccupancy.toFixed(0)}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Properties</p>
                    <p className="text-2xl font-bold text-dark mt-1">{myProperties.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                    <Building size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                    <p className="text-gray-500 text-sm font-medium">Pending Apps</p>
                    <p className="text-2xl font-bold text-dark mt-1">{sortedApplications.filter(a => a.status === ApplicationStatus.PENDING).length}</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                    <FileQuestion size={24} />
                </div>
            </div>
        </div>

        {}
        {expiringLeases.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="text-amber-600" size={20} />
                    <h3 className="font-bold text-amber-900">Attention Required</h3>
                </div>
                <div className="space-y-3">
                    {expiringLeases.map(lease => {
                         const prop = myProperties.find(p => p.id === lease.property_id);
                         const renter = users.find(u => u.id === lease.renter_id);
                         const daysLeft = Math.ceil((new Date(lease.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                         return (
                            <div key={lease.id} className="bg-white p-4 rounded-xl border border-amber-200 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="font-bold text-dark">Lease Expiring: {prop?.title}</p>
                                    <p className="text-sm text-gray-600">Tenant: {renter?.full_name} • Ends in {daysLeft} days ({lease.end_date})</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (renter) {
                                            setSelectedRenterId(renter.id);
                                            setEditLeaseForm({
                                                startDate: lease.start_date,
                                                endDate: lease.end_date
                                            });
                                            setIsEditingLease(true);
                                        }
                                    }}
                                    className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-semibold hover:bg-amber-200 transition"
                                >
                                    Renew Lease
                                </button>
                            </div>
                         );
                    })}
                </div>
            </div>
        )}

        {}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-dark mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary"/> Revenue Overview
                </h3>
                <div className="h-64 min-h-[256px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{name: 'Jun', value: 40000}, {name: 'Jul', value: 42000}, {name: 'Aug', value: 45000}, {name: 'Sep', value: 43000}]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#F9FAFB'}} />
                            <Bar dataKey="value" fill="#8C6239" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

             <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-dark mb-6 flex items-center gap-2">
                    <PieIcon size={20} className="text-primary"/> Payment Status
                </h3>
                <div className="h-64 min-h-[256px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie data={[{name: 'Paid', value: 85}, {name: 'Pending', value: 10}, {name: 'Overdue', value: 5}]} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                <Cell fill="#22C55E" />
                                <Cell fill="#8C6239" />
                                <Cell fill="#EF4444" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
  );

  const renderPropertiesView = () => (
      <div className="space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex-1 w-full md:w-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search properties..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-beige outline-none transition-all"
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative">
                    <select
                        className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-beige outline-none cursor-pointer text-sm font-medium text-gray-700"
                        value={propertySort}
                        onChange={(e) => setPropertySort(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="price-low">Price: Low to High</option>
                    </select>
                    <ArrowUpDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-[#6D4C2D] transition shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                >
                    <Plus size={18} /> <span className="hidden sm:inline">Add Property</span>
                </button>
            </div>
         </div>

         {}
         <div className="md:hidden space-y-4">
             {filteredProperties.map(prop => {
                const booking = myBookings.find(b => b.property_id === prop.id);
                const tenant = booking ? users.find(u => u.id === booking.renter_id) : null;
                 return (
                     <div key={prop.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                         <div className="flex gap-4">
                            <img
                              src={prop.image || '/img/default-property-img.png'}
                              alt={prop.title}
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (img.src.includes('/img/default-property-img.png')) return;
                                img.src = '/img/default-property-img.png';
                              }}
                              className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-dark truncate mb-1">
                                    <Link to={`/property/${prop.id}`} className="hover:underline">{prop.title}</Link>
                                </h3>
                                <p className="text-xs text-gray-500 truncate mb-2">{prop.address}</p>
                                <div className="flex items-center gap-2">
                                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${prop.status === PropertyStatus.AVAILABLE ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {prop.status}
                                     </span>
                                     <span className="text-xs font-bold text-primary">₱{prop.price.toLocaleString()}</span>
                                </div>
                            </div>
                         </div>
                         {tenant && (
                             <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                 <button onClick={() => { setSelectedRenterId(tenant.id); setIsEditingLease(false); }} className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-primary">
                                     <img src={tenant.avatar_url || '/img/default-profile.png'} className="w-5 h-5 rounded-full" /> {tenant.full_name}
                                 </button>
                             </div>
                         )}
                         <div className="mt-3 grid grid-cols-2 gap-2">
                             <button onClick={() => openEditModal(prop)} className="py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">Manage</button>
                             <Link to={`/property/${prop.id}`} className="py-2 bg-beige/30 rounded-lg text-xs font-semibold text-primary flex items-center justify-center">View Details</Link>
                         </div>
                     </div>
                 );
             })}
         </div>

         {}
         <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                    <tr>
                        <th className="px-6 py-4">Property</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Tenant</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredProperties.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">No properties found.</td></tr>
                    ) : (
                        filteredProperties.map(prop => {
                            const booking = myBookings.find(b => b.property_id === prop.id);
                            const tenant = booking ? users.find(u => u.id === booking.renter_id) : null;
                            return (
                                <tr key={prop.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                              src={prop.image || '/img/default-property-img.png'}
                                              alt=""
                                              onError={(e) => {
                                                const img = e.currentTarget;
                                                if (img.src.includes('/img/default-property-img.png')) return;
                                                img.src = '/img/default-property-img.png';
                                              }}
                                              className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                            />
                                            <div>
                                                <Link to={`/property/${prop.id}`} className="font-bold text-dark block hover:text-primary transition">{prop.title}</Link>
                                                <span className="text-xs text-gray-500">{prop.address}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${prop.status === PropertyStatus.AVAILABLE ? 'bg-green-100 text-green-700' : prop.status === PropertyStatus.OCCUPIED ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {prop.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 capitalize">
                                            <span className="p-1 bg-gray-100 rounded text-gray-500">{getCategoryIcon(String(prop.category))}</span>
                                            {String(prop.category).replace('_', ' ').toLowerCase()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {tenant ? (
                                            <button onClick={() => { setSelectedRenterId(tenant.id); setIsEditingLease(false); }} className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded-lg transition pr-3">
                                                <img src={tenant.avatar_url || '/img/default-profile.png'} alt="" className="w-6 h-6 rounded-full" />
                                                <span className="text-sm font-medium text-primary underline decoration-dotted underline-offset-4">{tenant.full_name}</span>
                                            </button>
                                        ) : <span className="text-gray-400 text-sm italic">Vacant</span>}
                                    </td>
                                    <td className="px-6 py-4 font-semibold">₱{prop.price.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openEditModal(prop)}
                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-dark transition"
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
             </table>
         </div>
      </div>
  );

  const renderTenantsView = () => (
      <div>
         <div className="flex justify-between items-center mb-6">
             {}
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {renters.length === 0 ? (
                 <div className="col-span-full text-center py-12 text-gray-400">No tenants yet. Add one to get started.</div>
             ) : (
                renters.map(renter => {
                    const booking = myBookings.find(b => b.renter_id === renter.id);
                    const prop = booking ? myProperties.find(p => p.id === booking.property_id) : null;
                    if (!booking) return null;
                    return (
                        <div key={renter.id} onClick={() => { setSelectedRenterId(renter.id); setIsEditingLease(false); }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group relative overflow-hidden">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={renter.avatar_url || '/img/default-profile.png'} alt={renter.full_name} className="w-14 h-14 rounded-full border-2 border-white shadow-sm" />
                                <div>
                                    <h3 className="font-bold text-dark text-lg group-hover:text-primary transition-colors flex items-center gap-1">
                                        {renter.full_name}
                                        {renter.is_verified === 1 && <BadgeCheck size={16} className="text-primary fill-beige" />}
                                    </h3>
                                    <p className="text-sm text-gray-500">{renter.email}</p>
                                </div>
                            </div>

                            {prop ? (
                                <div className="bg-beige/20 rounded-xl p-3 border border-beige/30 mb-3">
                                    <div className="text-xs text-primary font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                                        {getCategoryIcon(String(prop.category))} {String(prop.category)}
                                    </div>
                                    <div className="font-semibold text-dark truncate">{prop.title}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                        <span>Lease ends: {booking.end_date || 'Ongoing'}</span>
                                        <span>•</span>
                                        <span>{booking.occupants?.length || 1} Pax</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400 italic mb-4">No active property assignment</div>
                            )}

                            {renter.status_type_id === VerificationStatus.PENDING && (
                                <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-bl-xl">
                                    VERIFICATION PENDING
                                </div>
                            )}
                        </div>
                    );
                })
             )}
         </div>
      </div>
  );

  const renderApplicationsView = () => (
      <div className="space-y-4">
        {sortedApplications.length === 0 ? (
            <div className="text-center py-20 text-gray-400">No applications received yet.</div>
        ) : (
            sortedApplications.map(app => {
                const prop = myProperties.find(p => p.id === app.property_id);
                const applicant = users.find(u => u.id === app.renter_id);
                return (
                    <div key={app.id} className={`bg-white rounded-xl p-4 md:p-6 border shadow-sm transition-all flex flex-col md:flex-row justify-between gap-4 ${app.status === ApplicationStatus.PENDING ? 'border-l-4 border-l-primary' : 'border-gray-100 opacity-80 hover:opacity-100'}`}>
                         <div className="flex gap-4">
                             <img src={applicant?.avatar_url || '/img/default-profile.png'} className="w-12 h-12 rounded-full bg-gray-100" />
                             <div>
                                 <h4 className="font-bold text-dark text-lg flex items-center gap-2">
                                     {applicant?.full_name}
                                     {app.status === ApplicationStatus.PENDING && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">New</span>}
                                 </h4>
                                 <p className="text-sm text-gray-600 mb-1">Applied for <span className="font-semibold text-primary">{prop?.title}</span></p>
                                 <div className="flex items-center gap-4 text-xs text-gray-500">
                                     <span className="flex items-center gap-1"><Calendar size={12}/> {app.created_at?.slice(0, 10)}</span>
                                 </div>
                             </div>
                         </div>
                         <div className="flex items-center gap-3 self-end md:self-center">
                             {}
                             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                 ${app.status === ApplicationStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                   app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                   app.status === ApplicationStatus.CANCELLED ? 'bg-gray-100 text-gray-500' :
                                   'bg-blue-100 text-blue-700'}`}>
                                 {app.status}
                             </span>

                             {app.status === ApplicationStatus.PENDING ? (
                                 <button
                                     onClick={(e) => { e.stopPropagation(); setReviewingAppId(app.id); }}
                                     className="px-5 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#6D4C2D] transition shadow-md shadow-primary/20 relative z-10"
                                 >
                                     Review
                                 </button>
                             ) : (
                                 <div className="relative">
                                     <button
                                        onClick={(e) => { e.stopPropagation(); setManagingAppId(managingAppId === app.id ? null : app.id); }}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-dark transition"
                                     >
                                         <MoreVertical size={20} />
                                     </button>
                                     {managingAppId === app.id && (
                                         <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 animate-in fade-in zoom-in-95">
                                            <button
                                                 onClick={() => { setReviewingAppId(app.id); setManagingAppId(null); }}
                                                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl font-medium flex items-center gap-2"
                                             >
                                                 <Eye size={14} /> View Details
                                             </button>
                                             <button
                                                 onClick={() => { processApplication(app.id, ApplicationStatus.CANCELLED); setManagingAppId(null); }}
                                                 className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                             >
                                                 Mark Cancelled
                                             </button>
                                             {app.status === ApplicationStatus.REJECTED && (
                                                <button
                                                    onClick={() => { processApplication(app.id, ApplicationStatus.APPROVED); setManagingAppId(null); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 last:rounded-b-xl font-medium"
                                                >
                                                    Reconsider (Approve)
                                                </button>
                                             )}
                                             {app.status === ApplicationStatus.APPROVED && (
                                                <button
                                                    onClick={() => { processApplication(app.id, ApplicationStatus.REJECTED); setManagingAppId(null); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-xl font-medium"
                                                >
                                                    Revoke Approval
                                                </button>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             )}
                         </div>
                    </div>
                );
            })
        )}
      </div>
  );

  return (
    <div className="p-4 md:p-8 pb-20">
      <ConfirmComponent />
      <InfoComponent />
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-dark mb-1">
                {isPropertiesView ? 'My Properties' : isTenantsView ? 'Tenants Directory' : isApplicationsView ? 'Applications' : 'Owner Overview'}
            </h1>
            <p className="text-gray-500">Manage your rental business efficiently.</p>
        </div>
        {}
        {isTenantsView && (
             <button
                onClick={() => setIsAddRenterModalOpen(true)}
                className="bg-primary text-white px-5 py-3 rounded-xl font-bold hover:bg-[#6D4C2D] transition shadow-lg shadow-primary/20 flex items-center gap-2"
            >
                <UserPlus size={20} /> Onboard Tenant
            </button>
        )}
      </header>

      {isDashboardView && renderDashboardOverview()}
      {isPropertiesView && renderPropertiesView()}
      {isTenantsView && renderTenantsView()}
      {isApplicationsView && renderApplicationsView()}

      {}

      {}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-dark">Add New Property</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                </div>

                <form onSubmit={handleAddProperty} className="space-y-6">
                    {propertyErrors.general && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                            {propertyErrors.general}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Property Title</label>
                            <input
                                required
                                type="text"
                                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none ${propertyErrors.title ? 'border-red-300' : 'border-gray-200'}`}
                                placeholder="e.g. Sunset Apartments"
                                value={newProp.title}
                                onChange={(e) => setNewProp({...newProp, title: e.target.value})}
                            />
                            {propertyErrors.title && <p className="text-red-500 text-xs">{propertyErrors.title}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Category</label>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none bg-white"
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

                            {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OWNER) && (
                              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  placeholder="Add new category"
                                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-beige outline-none bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const name = newCategoryName.trim();
                                      if (!name) {
                                        showInfo('Error', 'Please enter a category name.', 'error');
                                        return;
                                      }
                                      await addPropertyCategory(name);
                                      setNewCategoryName('');
                                      showInfo('Success', 'Category added.', 'success');
                                    } catch (e: any) {
                                      showInfo('Error', e?.message || 'Failed to add category.', 'error');
                                    }
                                  }}
                                  className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black"
                                >
                                  Add
                                </button>
                              </div>
                            )}
                        </div>

                        <div className="col-span-full space-y-1">
                            <label className="text-sm font-bold text-gray-700">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                <input
                                    required
                                    type="text"
                                    className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-beige outline-none ${propertyErrors.address ? 'border-red-300' : 'border-gray-200'}`}
                                    placeholder="Full street address"
                                    value={newProp.address}
                                    onChange={(e) => setNewProp({...newProp, address: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Monthly Rent (₱)</label>
                            <input
                                required
                                type="number"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                value={newProp.price || ''}
                                onChange={(e) => setNewProp({...newProp, price: parseFloat(e.target.value)})}
                            />
                        </div>

                         <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Max Occupancy</label>
                            <input
                                type="number"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                value={newProp.maxOccupancy || ''}
                                onChange={(e) => setNewProp({...newProp, maxOccupancy: parseInt(e.target.value)})}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3 col-span-full md:col-span-1">
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Beds</label>
                                <input type="number" className="w-full border border-gray-200 rounded-xl px-2 py-2" value={newProp.bedrooms || ''} onChange={(e) => setNewProp({...newProp, bedrooms: parseInt(e.target.value)})} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Baths</label>
                                <input type="number" className="w-full border border-gray-200 rounded-xl px-2 py-2" value={newProp.bathrooms || ''} onChange={(e) => setNewProp({...newProp, bathrooms: parseInt(e.target.value)})} />
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Sqft</label>
                                <input type="number" className="w-full border border-gray-200 rounded-xl px-2 py-2" value={newProp.sqft || ''} onChange={(e) => setNewProp({...newProp, sqft: parseInt(e.target.value)})} />
                             </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Amenities</label>
                        <div className="flex flex-wrap gap-2">
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
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${selected ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        {a}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-beige outline-none"
                                placeholder="Add additional amenity (e.g. Free water)"
                                value={customAmenity}
                                onChange={(e) => setCustomAmenity(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    const value = customAmenity.trim();
                                    if (!value) return;
                                    const current = newProp.amenities || [];
                                    if (current.includes(value)) return;
                                    setNewProp({ ...newProp, amenities: [...current, value] });
                                    setCustomAmenity('');
                                }}
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
                                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition"
                            >
                                Add
                            </button>
                        </div>

                        {(newProp.amenities || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {(newProp.amenities || []).map((a) => (
                                    <button
                                        key={a}
                                        type="button"
                                        onClick={() => setNewProp({ ...newProp, amenities: (newProp.amenities || []).filter(x => x !== a) })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-beige/30 text-primary text-xs font-bold border border-beige/40 hover:bg-beige/50 transition"
                                        title="Remove amenity"
                                    >
                                        {a}
                                        <X size={14} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                         <label className="text-sm font-bold text-gray-700">Property Image</label>
                         <div className="flex gap-4 items-center">
                             <img
                               src={newProp.image || '/img/default-property-img.png'}
                               alt="Preview"
                               onError={(e) => {
                                 const img = e.currentTarget;
                                 if (img.src.includes('/img/default-property-img.png')) return;
                                 img.src = '/img/default-property-img.png';
                               }}
                               className="w-20 h-20 rounded-lg object-cover border"
                             />
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
                                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium text-gray-700 flex items-center gap-1"
                                >
                                    <Upload size={12}/> Upload File
                                </button>
                             </div>
                         </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isImageUploading}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#6D4C2D] transition shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            Create Property
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {isEditModalOpen && editingProp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-dark">Edit Property</h2>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
                </div>

                <form onSubmit={handleUpdateProperty} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Status</label>
                            <select
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none bg-white font-medium"
                                value={editingProp.status}
                                onChange={(e) => setEditingProp({...editingProp, status: e.target.value as PropertyStatus})}
                            >
                                <option value={PropertyStatus.AVAILABLE}>Available</option>
                                <option value={PropertyStatus.OCCUPIED}>Rented</option>
                                <option value={PropertyStatus.MAINTENANCE}>Maintenance</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700">Price (₱)</label>
                            <input
                                type="number"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                value={editingProp.price}
                                onChange={(e) => setEditingProp({...editingProp, price: parseFloat(e.target.value)})}
                            />
                        </div>

                        <div className="col-span-full space-y-1">
                            <label className="text-sm font-bold text-gray-700">Title</label>
                            <input
                                type="text"
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                value={editingProp.title}
                                onChange={(e) => setEditingProp({...editingProp, title: e.target.value})}
                            />
                        </div>

                         <div className="col-span-full space-y-2">
                             <label className="text-sm font-bold text-gray-700">Update Image</label>
                             <div className="flex gap-4 items-center">
                                 <img
                                   src={editingProp.image || '/img/default-property-img.png'}
                                   alt="Preview"
                                   onError={(e) => {
                                     const img = e.currentTarget;
                                     if (img.src.includes('/img/default-property-img.png')) return;
                                     img.src = '/img/default-property-img.png';
                                   }}
                                   className="w-20 h-20 rounded-lg object-cover border"
                                 />
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
                                       className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium text-gray-700 flex items-center gap-1"
                                   >
                                       <Upload size={12}/> Upload New File
                                   </button>
                                 </div>
                             </div>
                         </div>
                    </div>

                    <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isImageUploading}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#6D4C2D] transition shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {isAddRenterModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-lg p-0 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                     <div>
                        <h2 className="text-xl font-bold text-dark">Onboard Tenant</h2>
                        <div className="flex gap-2 mt-1">
                            <div className={`w-8 h-1 rounded-full ${onboardStep >= 1 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                            <div className={`w-8 h-1 rounded-full ${onboardStep >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                            <div className={`w-8 h-1 rounded-full ${onboardStep >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
                        </div>
                     </div>
                     <button onClick={() => setIsAddRenterModalOpen(false)} className="p-2 hover:bg-white rounded-full"><X size={20}/></button>
                 </div>

                 <div className="p-6 overflow-y-auto flex-1">
                     <form onSubmit={handleOnboardTenant} id="onboard-form">
                         {onboardStep === 1 && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                 <h3 className="font-bold text-lg">Step 1: Find Existing Tenant</h3>
                                 <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 flex gap-2">
                                     <Info size={18} className="shrink-0 mt-0.5" />
                                     <p>Tenants must create a Lagkaw account first. Enter their email below to link them to your property.</p>
                                 </div>
                                 <div className="space-y-1">
                                     <label className="text-sm font-bold text-gray-700">Tenant Email Address</label>
                                     <div className="flex gap-2">
                                         <input
                                            required
                                            type="email"
                                            className="w-full border rounded-xl px-4 py-3"
                                            value={newRenterEmail}
                                            onChange={e => setNewRenterEmail(e.target.value)}
                                            placeholder="tenant@example.com"
                                         />
                                         <button
                                            type="button"
                                            onClick={handleUserSearch}
                                            disabled={isSearchingUser || !newRenterEmail}
                                            className="bg-primary text-white px-4 rounded-xl font-bold disabled:opacity-70"
                                         >
                                             {isSearchingUser ? <Loader2 className="animate-spin"/> : <Search size={20}/>}
                                         </button>
                                     </div>
                                 </div>

                                 {searchError && (
                                     <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in">
                                         <AlertCircle size={16}/> {searchError}
                                     </div>
                                 )}

                                 {foundRenter && (
                                     <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3 animate-in fade-in">
                                         <img src={foundRenter.avatar_url || '/img/default-profile.png'} className="w-10 h-10 rounded-full" />
                                         <div>
                                             <p className="font-bold text-dark">{foundRenter.full_name}</p>
                                             <p className="text-xs text-green-700">User found successfully</p>
                                         </div>
                                         <CheckCircle className="ml-auto text-green-600" size={20} />
                                     </div>
                                 )}
                             </div>
                         )}

                         {onboardStep === 2 && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                 <h3 className="font-bold text-lg">Step 2: Assign Property</h3>
                                 <div className="space-y-1">
                                     <label className="text-sm font-bold text-gray-700">Select Property <span className="text-red-500">*</span></label>
                                     <select required className="w-full border rounded-xl px-4 py-3 bg-white" value={selectedPropId} onChange={e => setSelectedPropId(e.target.value)}>
                                         <option value="">-- Choose --</option>
                                         {myProperties.filter(p => p.status === PropertyStatus.AVAILABLE || p.status === PropertyStatus.OCCUPIED).map(p => (
                                             <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
                                         ))}
                                     </select>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                         <label className="text-sm font-bold text-gray-700">Lease Start <span className="text-red-500">*</span></label>
                                         <input required type="date" className="w-full border rounded-xl px-4 py-3" value={leaseDetails.startDate} onChange={e => setLeaseDetails({...leaseDetails, startDate: e.target.value})} />
                                     </div>
                                     <div className="space-y-1">
                                         <label className="text-sm font-bold text-gray-700">Lease End</label>
                                         <input type="date" className="w-full border rounded-xl px-4 py-3" value={leaseDetails.endDate} onChange={e => setLeaseDetails({...leaseDetails, endDate: e.target.value})} />
                                         <p className="text-xs text-gray-500 mt-1">Leave empty for indefinite/ongoing</p>
                                     </div>
                                 </div>
                             </div>
                         )}

                         {onboardStep === 3 && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                 <h3 className="font-bold text-lg">Step 3: Occupants (Optional)</h3>
                                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                     <div className="flex gap-2 mb-2">
                                         <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Name" value={tempOccupant.name} onChange={e => setTempOccupant({...tempOccupant, name: e.target.value})} />
                                         <input className="w-24 border rounded-lg px-3 py-2 text-sm" placeholder="Relation" value={tempOccupant.relation} onChange={e => setTempOccupant({...tempOccupant, relation: e.target.value})} />
                                     </div>
                                     <button type="button" onClick={addOccupantToOnboarding} className="w-full bg-white border border-gray-200 text-primary font-bold py-2 rounded-lg text-sm hover:bg-beige/20">+ Add Occupant</button>
                                 </div>

                                 <div className="space-y-2">
                                     {occupants.map((occ, idx) => (
                                         <div key={idx} className="flex justify-between items-center p-3 border rounded-xl bg-white">
                                             <span className="text-sm font-medium">{occ.name} ({occ.relation})</span>
                                             <button type="button" onClick={() => setOccupants(occupants.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                                         </div>
                                     ))}
                                     {occupants.length === 0 && <p className="text-sm text-gray-400 italic text-center">No additional occupants added.</p>}
                                 </div>
                             </div>
                         )}
                     </form>
                 </div>

                 <div className="p-4 border-t border-gray-100 flex justify-between">
                     {onboardStep > 1 ? (
                         <button onClick={() => setOnboardStep(onboardStep - 1)} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Back</button>
                     ) : <div></div>}

                     {onboardStep < 3 ? (
                         <button onClick={() => {
                             if(onboardStep === 1 && !foundRenter) return;
                             if(onboardStep === 2 && (!selectedPropId || !leaseDetails.startDate)) return;
                             setOnboardStep(onboardStep + 1);
                         }} disabled={onboardStep === 1 && !foundRenter} className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-[#6D4C2D] disabled:opacity-50 disabled:cursor-not-allowed">Next Step</button>
                     ) : (
                         <button onClick={handleOnboardTenant} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200">Complete Onboarding</button>
                     )}
                 </div>
             </div>
          </div>
      )}

      {}
      {reviewingAppId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center backdrop-blur-sm p-0 md:p-4">
            <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl h-[90vh] md:h-auto overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
                 {(() => {
                     const app = applications.find(a => a.id === reviewingAppId);
                     if (!app) return null;
                     const applicant = users.find(u => u.id === app.renter_id);
                     const prop = myProperties.find(p => p.id === app.property_id);
                     const isPending = app.status === ApplicationStatus.PENDING;

                     return (
                         <>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-xl font-bold text-dark">{isPending ? 'Review Application' : 'Application Details'}</h2>
                                <button onClick={() => setReviewingAppId(null)} className="p-2 bg-white rounded-full text-gray-500 shadow-sm"><X size={20}/></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {}
                                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                     <div className={`absolute top-0 left-0 w-1 h-full ${isPending ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                     <div className="flex items-center gap-4 mb-3">
                                         <img src={applicant?.avatar_url || '/img/default-profile.png'} className="w-14 h-14 rounded-full border border-gray-100" />
                                         <div className="flex-1">
                                             <button onClick={() => { setSelectedRenterId(applicant?.id || null); setIsEditingLease(false); }} className="text-lg font-bold text-dark hover:underline decoration-primary decoration-2 underline-offset-2 flex items-center gap-2">
                                                 {applicant?.full_name} <ExternalLink size={14} className="text-gray-400"/>
                                             </button>
                                             <div className="flex gap-2 text-xs mt-1">
                                                 {applicant?.is_verified === 1 ?
                                                     <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><ShieldCheck size={10}/> Verified</span>
                                                     : <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1"><AlertCircle size={10}/> Unverified</span>
                                                 }
                                                 <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Income: ₱{app.income?.toLocaleString()}</span>
                                             </div>
                                         </div>
                                     </div>
                                </div>

                                {}
                                <Link
                                    to={`/property/${prop?.id}`}
                                    state={{ from: `/applications?reviewId=${app.id}` }}
                                    className="flex gap-4 p-3 bg-beige/10 border border-beige/30 rounded-xl hover:bg-beige/20 transition group"
                                >
                                    <img
                                      src={prop?.image || '/img/default-property-img.png'}
                                      onError={(e) => {
                                        const img = e.currentTarget;
                                        if (img.src.includes('/img/default-property-img.png')) return;
                                        img.src = '/img/default-property-img.png';
                                      }}
                                      className="w-20 h-20 rounded-lg object-cover"
                                    />
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">Applying For</p>
                                        <h3 className="font-bold text-dark group-hover:text-primary transition">{prop?.title}</h3>
                                        <p className="text-sm text-gray-500">₱{prop?.price.toLocaleString()}/mo</p>
                                    </div>
                                    <ArrowUpRight size={20} className="ml-auto text-gray-400 group-hover:text-primary" />
                                </Link>

                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase">Cover Message</h3>
                                    <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed border border-gray-100 relative">
                                        <MessageSquare size={40} className="absolute right-4 bottom-4 text-gray-200 -z-10" />
                                        "{app.message}"
                                    </div>
                                </div>

                                {isPending ? (
                                    <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-sm text-blue-800 border border-blue-100">
                                        <Info className="shrink-0 mt-0.5" />
                                        <p>Approving this application will automatically create an active lease for 1 year and mark the property as <strong>RENTED</strong>.</p>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-4 rounded-xl flex gap-3 text-sm text-gray-600 border border-gray-100">
                                        <Info className="shrink-0 mt-0.5" />
                                        <p>This application is currently <strong>{app.status}</strong>.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3 pb-8 md:pb-4">
                                {isPending ? (
                                    <>
                                        <button
                                            onClick={() => { processApplication(app.id, ApplicationStatus.CANCELLED); setReviewingAppId(null); }}
                                            className="col-span-2 text-xs text-gray-400 font-medium hover:text-gray-600 mb-1"
                                        >
                                            Mark as Unresponsive / Cancel
                                        </button>
                                        <button
                                            onClick={() => { processApplication(app.id, ApplicationStatus.REJECTED); setReviewingAppId(null); }}
                                            className="py-3.5 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            onClick={() => { processApplication(app.id, ApplicationStatus.APPROVED); setReviewingAppId(null); }}
                                            className="py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-[#6D4C2D] transition shadow-lg shadow-primary/20"
                                        >
                                            Approve Lease
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setReviewingAppId(null)}
                                        className="col-span-2 py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
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

      {}
      {selectedRenterId && selectedRenter && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">

                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                    <h2 className="text-xl font-bold text-dark">Tenant Profile</h2>
                    <button onClick={() => { setSelectedRenterId(null); setIsEditingLease(false); }} className="p-2 hover:bg-white rounded-full transition"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {}
                    <div className="flex flex-col md:flex-row gap-6 mb-8">
                        <div className="relative">
                            <img src={selectedRenter.avatar_url || '/img/default-profile.png'} className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-200 object-cover" />
                            {selectedRenter.is_verified === 1 ? (
                                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm text-primary"><BadgeCheck size={20} className="fill-beige"/></div>
                            ) : (
                                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm text-amber-500"><AlertCircle size={20} className="fill-amber-100"/></div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold text-dark">{selectedRenter.full_name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1"><Mail size={14}/> {selectedRenter.email}</span>
                                        <span className="flex items-center gap-1"><Phone size={14}/> {selectedRenter.phone || 'No phone'}</span>
                                    </div>
                                </div>
                                {selectedRenter.status_type_id === VerificationStatus.PENDING && (
                                    <div className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-lg">
                                        VERIFICATION PENDING
                                    </div>
                                )}
                            </div>

                            {}
                            {(() => {
                                const totalPaid = selectedRenterBills
                                  .filter(b => b.status === BillStatus.PAID)
                                  .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                                const outstanding = selectedRenterBills
                                  .filter(b => b.status !== BillStatus.PAID)
                                  .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                                const totalBills = selectedRenterBills.length;
                                const paidBills = selectedRenterBills.filter(b => b.status === BillStatus.PAID).length;
                                const reliability = totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 0;

                                return (
                                  <div className="grid grid-cols-3 gap-3 mt-4">
                                      <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                                          <div className="text-[10px] text-green-700 font-bold uppercase">Reliability</div>
                                          <div className="text-lg font-bold text-green-800">{reliability}%</div>
                                      </div>
                                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
                                          <div className="text-[10px] text-blue-700 font-bold uppercase">Total Paid</div>
                                          <div className="text-lg font-bold text-blue-800">₱{totalPaid.toLocaleString()}</div>
                                      </div>
                                      <div className={`rounded-lg p-2 border text-center ${outstanding > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                          <div className={`text-[10px] font-bold uppercase text-red-700 ${outstanding > 0 ? 'text-red-700' : 'text-gray-500'}`}>Outstanding</div>
                                          <div className={`text-lg font-bold ${outstanding > 0 ? 'text-red-800' : 'text-gray-800'}`}>₱{outstanding.toLocaleString()}</div>
                                      </div>
                                  </div>
                                );
                            })()}
                        </div>
                    </div>

                    {}
                    <div className="flex border-b border-gray-100 mb-6">
                        <button
                            onClick={() => setTenantProfileTab('overview')}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${tenantProfileTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-dark'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setTenantProfileTab('history')}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${tenantProfileTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-dark'}`}
                        >
                            <History size={16} /> Application History
                        </button>
                    </div>

                    {tenantProfileTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
                            {}
                            <div className="space-y-6">
                                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Home size={18} className="text-primary"/> Active Lease</h4>
                                    {selectedRenterProp && selectedRenterBooking ? (
                                        <div className="space-y-4">
                                            <Link to={`/property/${selectedRenterProp.id}`} className="block group">
                                                <div className="aspect-video rounded-xl bg-gray-100 overflow-hidden relative mb-3">
                                                    <img
                                                      src={selectedRenterProp.image || '/img/default-property-img.png'}
                                                      onError={(e) => {
                                                        const img = e.currentTarget;
                                                        if (img.src.includes('/img/default-property-img.png')) return;
                                                        img.src = '/img/default-property-img.png';
                                                      }}
                                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                                        <span className="text-white font-bold">{selectedRenterProp.title}</span>
                                                    </div>
                                                </div>
                                            </Link>

                                            {!isEditingLease ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-end">
                                                        <button
                                                            onClick={() => {
                                                                setEditLeaseForm({
                                                                    startDate: selectedRenterBooking.start_date,
                                                                    endDate: selectedRenterBooking.end_date || ''
                                                                });
                                                                setIsEditingLease(true);
                                                            }}
                                                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                                                        >
                                                            <Edit2 size={12}/> Edit Dates
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div className="bg-gray-50 p-2 rounded-lg">
                                                        <span className="text-xs text-gray-500 block">Start Date</span>
                                                        <span className="font-medium">{selectedRenterBooking.start_date}</span>
                                                    </div>
                                                    <div className="bg-gray-50 p-2 rounded-lg">
                                                        <span className="text-xs text-gray-500 block">End Date</span>
                                                        <span className="font-medium">{selectedRenterBooking.end_date || 'Ongoing'}</span>
                                                    </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 bg-beige/10 p-3 rounded-xl border border-beige/30">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Start</label>
                                                            <input type="date" className="w-full p-1 text-xs border rounded" value={editLeaseForm.startDate} onChange={e => setEditLeaseForm({...editLeaseForm, startDate: e.target.value})} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase">End</label>
                                                            <input
                                                                type="date"
                                                                className="w-full p-1 text-xs border rounded"
                                                                value={editLeaseForm.endDate}
                                                                onChange={e => setEditLeaseForm({...editLeaseForm, endDate: e.target.value})}
                                                                disabled={!editLeaseForm.endDate}
                                                            />
                                                            <label className="flex items-center gap-2 pt-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!editLeaseForm.endDate}
                                                                    onChange={e => setEditLeaseForm({
                                                                        ...editLeaseForm,
                                                                        endDate: e.target.checked ? '' : new Date().toISOString().split('T')[0]
                                                                    })}
                                                                />
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase">No end date</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    {}
                                                    <div className="flex gap-2">
                                                        <button onClick={() => extendLease(6)} className="flex-1 bg-white text-[10px] border border-gray-200 rounded py-1 hover:bg-gray-50">+6 Mo</button>
                                                        <button onClick={() => extendLease(12)} className="flex-1 bg-white text-[10px] border border-gray-200 rounded py-1 hover:bg-gray-50">+1 Yr</button>
                                                    </div>
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button onClick={() => setIsEditingLease(false)} className="text-xs text-gray-500">Cancel</button>
                                                        <button
                                                            onClick={() => {
                                                                handleUpdateLease();
                                                            }}
                                                            className="bg-primary text-white text-xs font-bold px-3 py-1 rounded"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : <p className="text-gray-400 italic text-sm">No active lease found.</p>}
                                </div>

                                {}
                                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18} className="text-primary"/> Occupants</h4>
                                        {selectedRenterBooking && <button onClick={() => setIsAddingNewOccupant(!isAddingNewOccupant)} className="text-xs font-bold text-primary hover:bg-beige/30 px-2 py-1 rounded transition">+ Add</button>}
                                    </div>

                                    {isAddingNewOccupant && (
                                        <div className="bg-gray-50 p-3 rounded-xl mb-3 border border-gray-200 animate-in slide-in-from-top-2">
                                            <div className="space-y-2 mb-3">
                                                <input
                                                    className="w-full p-2 text-sm border rounded-lg"
                                                    placeholder="Full Name"
                                                    value={newOccupantForm.name}
                                                    onChange={e => setNewOccupantForm({...newOccupantForm, name: e.target.value})}
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input className="p-2 text-sm border rounded-lg" placeholder="Relation" value={newOccupantForm.relation} onChange={e => setNewOccupantForm({...newOccupantForm, relation: e.target.value})}/>
                                                    <input className="p-2 text-sm border rounded-lg" placeholder="Age" type="number" value={newOccupantForm.age || ''} onChange={e => setNewOccupantForm({...newOccupantForm, age: e.target.value ? parseInt(e.target.value) : undefined})}/>
                                                </div>
                                                <textarea
                                                    className="w-full p-2 text-sm border rounded-lg"
                                                    placeholder="Notes (optional)"
                                                    value={newOccupantForm.notes || ''}
                                                    onChange={e => setNewOccupantForm({ ...newOccupantForm, notes: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setIsAddingNewOccupant(false)} className="text-xs text-gray-500">Cancel</button>
                                                <button onClick={addNewOccupantToBooking} className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg">Save</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {(selectedRenterBooking?.occupants || []).map((occ, idx) => (
                                            <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                                                <div
                                                    className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition"
                                                    onClick={() => setExpandedOccupantIndex(expandedOccupantIndex === idx ? null : idx)}
                                                >
                                                    <div>
                                                        <span className="font-bold text-sm text-dark">{occ.name}</span>
                                                        <span className="text-xs text-gray-500 ml-2">({occ.relation})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={(e) => {e.stopPropagation(); removeOccupant(idx);}} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                                        {expandedOccupantIndex === idx ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                                    </div>
                                                </div>
                                                {expandedOccupantIndex === idx && (
                                                    <div className="p-3 bg-white text-sm text-gray-600 border-t border-gray-100 space-y-1">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div><span className="text-xs font-bold text-gray-400 uppercase">Age:</span> {occ.age || '-'}</div>
                                                            <div><span className="text-xs font-bold text-gray-400 uppercase">Relation:</span> {occ.relationship || (occ as any).relation || '-'}</div>
                                                        </div>
                                                        {occ.notes && <div className="pt-1"><span className="text-xs font-bold text-gray-400 uppercase">Notes:</span> {occ.notes}</div>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {(!selectedRenterBooking?.occupants || selectedRenterBooking.occupants.length === 0) && <p className="text-xs text-gray-400 italic">No additional occupants listed.</p>}
                                    </div>
                                </div>
                            </div>

                            {}
                            <div className="space-y-6">
                                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><DollarIcon size={18} className="text-primary"/> Billing</h4>
                                            <button
                                            onClick={() => setShowBillForm(!showBillForm)}
                                            className="text-xs font-bold text-primary hover:bg-beige/30 px-2 py-1 rounded transition"
                                            >
                                                + Add Charge
                                            </button>
                                        </div>

                                        {showBillForm && (
                                            <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
                                                <div className="space-y-3 mb-3">
                                                    <div>
                                                    <label className="text-xs font-bold text-gray-500">Amount (₱)</label>
                                                    <input type="number" className="w-full border rounded p-2 text-sm" value={newBillDetails.amount} onChange={e => setNewBillDetails({...newBillDetails, amount: e.target.value})} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500">Type</label>
                                                        <select className="w-full border rounded p-2 text-sm bg-white" value={newBillDetails.type} onChange={e => setNewBillDetails({...newBillDetails, type: e.target.value as BillType})}>
                                                            {Object.values(BillType).map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500">Due Date</label>
                                                        <input type="date" className="w-full border rounded p-2 text-sm" value={newBillDetails.dueDate} onChange={e => setNewBillDetails({...newBillDetails, dueDate: e.target.value})} />
                                                    </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500">Note (Optional)</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border rounded p-2 text-sm"
                                                            value={(newBillDetails as any).notes || ''}
                                                            onChange={e => setNewBillDetails({ ...(newBillDetails as any), notes: e.target.value })}
                                                        />
                                                    </div>
                                                    {billErrors.general && <p className="text-xs text-red-500">{billErrors.general}</p>}
                                                </div>
                                                <button
                                                onClick={() => {
                                                    if (!newBillDetails.amount || !newBillDetails.dueDate) { setBillErrors({general: 'All fields required'}); return; }
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
                                                className="w-full bg-primary text-white font-bold py-2 rounded-lg text-sm"
                                                >
                                                    Create Bill
                                                </button>
                                            </div>
                                        )}

                                        <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                                            {selectedRenterBills.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()).map(bill => (
                                                <div key={bill.id} className="flex flex-col sm:flex-row justify-between items-center p-3 border rounded-xl hover:bg-gray-50 gap-2">
                                                    <div className="w-full sm:w-auto">
                                                        <div className="font-bold text-sm text-dark capitalize flex items-center gap-2">
                                                            {bill.type.toLowerCase()} Bill
                                                            {bill.status === BillStatus.PENDING && <Clock size={12} className="text-amber-500"/>}
                                                        </div>
                                                        <div className="text-xs text-gray-500">Due {bill.dueDate}</div>
                                                    </div>
                                                    <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between">
                                                        <div className="font-bold text-sm">₱{bill.amount.toLocaleString()}</div>

                                                        {bill.status !== BillStatus.PAID ? (
                                                            <button
                                                                onClick={() => updateBill({...bill, status: BillStatus.PAID})}
                                                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 shadow-sm font-bold flex items-center gap-1 transition mt-1"
                                                            >
                                                                <Check size={12}/> Record Payment
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] font-bold uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded">Paid</span>
                                                                <button
                                                                    onClick={() => updateBill({...bill, status: BillStatus.PENDING})}
                                                                    className="text-gray-400 hover:text-red-500"
                                                                    title="Undo (Mark Unpaid)"
                                                                >
                                                                    <Undo2 size={14}/>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                            </div>
                        </div>
                    )}

                    {tenantProfileTab === 'history' && (
                         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                             {renterAppHistory.length === 0 ? (
                                 <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50">
                                     <FileQuestion size={32} className="mx-auto mb-2 opacity-50"/>
                                     <p>No application history found for this tenant.</p>
                                 </div>
                             ) : (
                                 renterAppHistory.map(app => {
                                     const prop = myProperties.find(p => p.id === app.property_id);
                                     return (
                                        <div key={app.id} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:shadow-sm transition-shadow">
                                            <div className="w-full md:w-24 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                                <img
                                                  src={prop?.image || '/img/default-property-img.png'}
                                                  onError={(e) => {
                                                    const img = e.currentTarget;
                                                    if (img.src.includes('/img/default-property-img.png')) return;
                                                    img.src = '/img/default-property-img.png';
                                                  }}
                                                  className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-dark">{prop?.title}</h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${app.status === ApplicationStatus.APPROVED ? 'bg-green-100 text-green-700' : app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-700' : app.status === ApplicationStatus.CANCELLED ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                                                        {app.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                                    <span className="flex items-center gap-1"><Calendar size={12}/> Applied: {app.date}</span>
                                                    <span className="flex items-center gap-1"><DollarSign size={12}/> Stated Income: ₱{(app.income || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-600 italic">
                                                    "{app.message.length > 80 ? app.message.substring(0, 80) + '...' : app.message}"
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
      )}
    </div>
  );
};
