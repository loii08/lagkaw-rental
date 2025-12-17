import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Property, PropertyCategory, PropertyStatus, UserRole, VerificationStatus, User } from '../types';
import { useDialogs, addDialogStyles } from '../components/CustomDialogs';
import { RejectionDialog } from '../components/RejectionDialog';
import { supabase } from '../lib/supabase';
import {
    Users, ShieldCheck, Building2, TrendingUp, AlertCircle,
    Search, Check, X, Trash2, Edit2, MoreVertical, Filter,
    BadgeCheck, Mail, Phone, LayoutDashboard, FileText, CheckCircle, ChevronRight, XCircle
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

export const AdminDashboard = () => {
    const { users, properties, bills, bookings, propertyCategories, addPropertyCategory, addProperty, updateProperty, verifyUser, verifyUserPhone, verifyUserEmail, deleteUser, deleteProperty, updateUserFields } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showConfirm, showInfo, ConfirmComponent, InfoComponent } = useDialogs();

    const amenities = ['WiFi', 'Free Water', 'Electricity Included', 'Parking', 'Aircon', 'Laundry', 'Security', 'Furnished'];

    const isPendingVerificationUser = (u: User) => {
        if (u.role === UserRole.ADMIN) return false;
        return (
            u.status_type_id === VerificationStatus.PENDING ||
            (!!u.id_document_url && u.status_type_id !== VerificationStatus.VERIFIED && u.status_type_id !== VerificationStatus.REJECTED)
        );
    };

    React.useEffect(() => {
        addDialogStyles();
    }, []);

    const [activeTab, setActiveTab] = useState('overview');
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [propSearch, setPropSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
    const [selectedVerificationUser, setSelectedVerificationUser] = useState<User | null>(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [showRejectionDialog, setShowRejectionDialog] = useState(false);

    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [propertyForm, setPropertyForm] = useState<Partial<Property>>({
        owner_id: '',
        title: '',
        description: '',
        address: '',
        price: 0,
        bedrooms: 1,
        bathrooms: 1,
        sqft: 500,
        image: '',
        status: PropertyStatus.AVAILABLE,
        amenities: [],
        category: PropertyCategory.APARTMENT
    });
    const [isEditingProperty, setIsEditingProperty] = useState(false);

    const [newCategoryName, setNewCategoryName] = useState('');

    const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const [autoOpenedVerificationUserId, setAutoOpenedVerificationUserId] = useState<string | null>(null);

    React.useEffect(() => {
        const loadSignedUrl = async () => {
            if (!selectedVerificationUser?.id_document_url) {
                setSignedUrl(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            const getSignedUrl = async (bucket: string, path: string) => {
                try {
                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .createSignedUrl(path, 3600);

                    if (error) throw error;
                    return data.signedUrl;
                } catch (error) {
                    console.error(`Failed to get signed URL for ${bucket}:`, error);
                    return null;
                }
            };

            const url = await getSignedUrl('documents', selectedVerificationUser.id_document_url);

            setSignedUrl(url);
            setIsLoading(false);
        };

        loadSignedUrl();
    }, [selectedVerificationUser?.id_document_url]);

    const query = new URLSearchParams(location.search);
    const tabFromUrl = query.get('tab') || 'overview';
    const userFromUrl = query.get('user');

    React.useEffect(() => {
        setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

    React.useEffect(() => {
        if (tabFromUrl !== 'verifications') return;
        if (!userFromUrl) return;
        if (autoOpenedVerificationUserId === userFromUrl) return;

        const targetUser = users.find(u => u.id === userFromUrl);
        if (!targetUser) return;

        if (!isPendingVerificationUser(targetUser)) {
            setAutoOpenedVerificationUserId(userFromUrl);
            navigate('/?tab=verifications', { replace: true });
            return;
        }

        openVerificationModal(targetUser);
        setAutoOpenedVerificationUserId(userFromUrl);
    }, [tabFromUrl, userFromUrl, users, autoOpenedVerificationUserId]);

    const stats = useMemo(() => {
        const totalRevenue = bills.filter(b => b.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);

        const pendingVerificationUsers = users.filter(isPendingVerificationUser);

        return {
            totalUsers: users.length,
            owners: users.filter(u => u.role === UserRole.OWNER).length,
            renters: users.filter(u => u.role === UserRole.RENTER).length,
            totalProperties: properties.length,
            occupancyRate: properties.length ? (properties.filter(p => p.status === PropertyStatus.OCCUPIED).length / properties.length) * 100 : 0,
            pendingVerifications: pendingVerificationUsers.length,
            totalRevenue
        };
    }, [users, properties, bills]);

    const handleTabChange = (tab: string) => {
        navigate(`/?tab=${tab}`);
    };

    const openUserDetailsModal = (user: User) => {
        setSelectedUser(user);
        setShowUserDetailsModal(true);
    };

    const closeUserDetailsModal = () => {
        setShowUserDetailsModal(false);
        setSelectedUser(null);
    };

    const openAddPropertyModal = () => {
        setIsEditingProperty(false);
        setPropertyForm({
            owner_id: '',
            title: '',
            description: '',
            address: '',
            price: 0,
            bedrooms: 1,
            bathrooms: 1,
            sqft: 500,
            image: '',
            status: PropertyStatus.AVAILABLE,
            amenities: [],
            category: PropertyCategory.APARTMENT
        });
        setShowPropertyModal(true);
    };

    const openEditPropertyModal = (prop: Property) => {
        setIsEditingProperty(true);
        setPropertyForm({ ...prop });
        setShowPropertyModal(true);
    };

    const closePropertyModal = () => {
        setShowPropertyModal(false);
        setIsEditingProperty(false);
    };

    const openVerificationModal = (user: User) => {
        setSelectedVerificationUser(user);
        setShowVerificationModal(true);
    };

    const closeVerificationModal = () => {
        setShowVerificationModal(false);
        setSelectedVerificationUser(null);
    };

    const handleApproveVerification = async () => {
        if (selectedVerificationUser) {
            const confirmed = await showConfirm(
                'Approve Verification',
                `Are you sure you want to approve ${selectedVerificationUser.full_name || 'this user'}'s verification?`,
                async () => {
                    try {
                        await verifyUser(selectedVerificationUser.id, true);
                        showInfo('Success!', 'Verification approved successfully', 'success');
                        closeVerificationModal();
                    } catch (error) {
                        showInfo('Error', 'Failed to approve verification', 'error');
                    }
                },
                () => {

                },
                { confirmText: 'Approve', cancelText: 'Cancel' }
            );
        }
    };

    const handleRejectVerification = () => {
        setShowRejectionDialog(true);
    };

    const handleRejectionSubmit = async (reason: string) => {
        if (selectedVerificationUser) {
            try {
                await verifyUser(selectedVerificationUser.id, false, reason);
                showInfo('Rejected', 'Verification has been rejected', 'error');
                closeVerificationModal();
                setShowRejectionDialog(false);
            } catch (error) {
                showInfo('Error', 'Failed to reject verification', 'error');
            }
        }
    };

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Total Users</p>
                            <h3 className="text-2xl font-bold text-dark mt-1">{stats.totalUsers}</h3>
                        </div>
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Users size={20}/></div>
                    </div>
                    <div className="flex gap-4 mt-4 text-xs text-gray-500">
                        <span>{stats.owners} Owners</span>
                        <span>{stats.renters} Renters</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Properties</p>
                            <h3 className="text-2xl font-bold text-dark mt-1">{stats.totalProperties}</h3>
                        </div>
                        <div className="bg-green-50 text-green-600 p-2 rounded-lg"><Building2 size={20}/></div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                        Occupancy: <span className="font-bold text-dark">{stats.occupancyRate.toFixed(0)}%</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Platform Revenue</p>
                            <h3 className="text-2xl font-bold text-dark mt-1">₱{stats.totalRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="bg-amber-50 text-amber-600 p-2 rounded-lg"><TrendingUp size={20}/></div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                        Total processed
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-primary/50 transition" onClick={() => handleTabChange('verifications')}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Pending Verifications</p>
                            <h3 className="text-2xl font-bold text-dark mt-1">{stats.pendingVerifications}</h3>
                        </div>
                        <div className="bg-red-50 text-red-600 p-2 rounded-lg"><ShieldCheck size={20}/></div>
                    </div>
                    <div className="mt-4 text-xs text-red-600 font-bold">
                        {stats.pendingVerifications > 0 ? 'Action Required' : 'All clear'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-dark mb-6">User Growth</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{name: 'Jun', value: 10}, {name: 'Jul', value: 15}, {name: 'Aug', value: 25}, {name: 'Sep', value: 30}]}>
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
                    <h3 className="font-bold text-dark mb-6">Property Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        {name: 'Rented', value: properties.filter(p => p.status === PropertyStatus.RENTED).length},
                                        {name: 'Available', value: properties.filter(p => p.status === PropertyStatus.AVAILABLE).length},
                                        {name: 'Maintenance', value: properties.filter(p => p.status === PropertyStatus.MAINTENANCE).length}
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#22C55E" />
                                    <Cell fill="#8C6239" />
                                    <Cell fill="#9CA3AF" />
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

    const renderUsers = () => {
        const filteredUsers = users.filter(u => {
            const matchesSearch = (u.full_name?.toLowerCase() || '').includes(userSearch.toLowerCase()) || (u.email?.toLowerCase() || '').includes(userSearch.toLowerCase());
            const matchesRole = roleFilter === 'ALL' ? true : u.role === roleFilter;
            return matchesSearch && matchesRole;
        });

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="ALL">All Roles</option>
                            <option value={UserRole.OWNER}>Owners</option>
                            <option value={UserRole.RENTER}>Renters</option>
                            <option value={UserRole.ADMIN}>Admins</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openUserDetailsModal(user)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar_url || '/img/default-profile.png'} className="w-10 h-10 rounded-full bg-gray-100" />
                                            <div>
                                                <div className="font-bold text-dark text-sm">{user.full_name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            user.role === UserRole.OWNER ? 'bg-primary/10 text-primary' :
                                            user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.is_verified ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={14}/> Verified</span>
                                        ) : user.status_type_id === 1 ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><AlertCircle size={14}/> Pending</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">Unverified</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.phone || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
    const confirmed = await showConfirm(
        'Delete User',
        'Are you sure you want to delete this user? This action cannot be undone.',
        () => deleteUser(user.id),
        () => {},
        { confirmText: 'Delete', cancelText: 'Cancel' }
    );
}}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Delete User"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderVerifications = () => {
        const pendingUsers = users.filter(isPendingVerificationUser);

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {pendingUsers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <ShieldCheck size={48} className="mx-auto text-green-200 mb-4" />
                        <h3 className="text-lg font-bold text-dark">All Caught Up!</h3>
                        <p className="text-gray-500">No pending identity verifications.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {pendingUsers.map(user => (
                                <div
                                    key={user.id}
                                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => openVerificationModal(user)}
                                >
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={user.avatar_url || '/img/default-profile.png'}
                                            className="w-12 h-12 rounded-full border-2 border-gray-100"
                                            onError={(e) => {
                                                e.currentTarget.src = '/img/default-profile.png';
                                            }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-dark">{user.full_name}</h3>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                    user.role === UserRole.OWNER ? 'bg-primary/10 text-primary' :
                                                    user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1 min-w-0">
                                                    <Mail size={14} />
                                                    <span className="truncate">{user.email}</span>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Phone size={14} />
                                                    {user.phone || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                                    <AlertCircle size={12} />
                                                    ID Document Verification
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <ChevronRight size={20} className="text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderProperties = () => {
        const filteredProps = properties.filter(p => p.title.toLowerCase().includes(propSearch.toLowerCase()) || p.address.toLowerCase().includes(propSearch.toLowerCase()));

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search properties..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                            value={propSearch}
                            onChange={(e) => setPropSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={openAddPropertyModal}
                        className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition shrink-0 w-full sm:w-auto"
                    >
                        Add Property
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProps.map(prop => {
                        const owner = users.find(u => u.id === prop.owner_id);
                        return (
                            <div key={prop.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
                                <div className="h-40 bg-gray-200 relative">
                                    <img
                                        src={prop.image || '/img/default-property-img.png'}
                                        onError={(e) => {
                                            const img = e.currentTarget;
                                            if (img.src.includes('/img/default-property-img.png')) return;
                                            img.src = '/img/default-property-img.png';
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                                        {prop.status}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-dark truncate mb-1">{prop.title}</h4>
                                    <p className="text-xs text-gray-500 mb-3 truncate">{prop.address}</p>

                                    <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                                        <img src={owner?.avatar_url || '/img/default-profile.png'} className="w-6 h-6 rounded-full" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-dark truncate">{owner?.full_name}</p>
                                            <p className="text-[10px] text-gray-500">Owner</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Link to={`/property/${prop.id}`} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200">View</Link>
                                        <button
                                            type="button"
                                            onClick={() => openEditPropertyModal(prop)}
                                            className="px-3 py-1.5 bg-beige/30 text-primary text-xs font-bold rounded-lg hover:bg-beige/40"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={async () => {
    await showConfirm(
        'Delete Property',
        'Are you sure you want to delete this property? This action cannot be undone.',
        async () => {
            try {
                await deleteProperty(prop.id);
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
        () => {},
        { confirmText: 'Delete', cancelText: 'Cancel' }
    );
}}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-dark mb-1 flex items-center gap-2">
                    <ShieldCheck size={32} className="text-primary"/> Admin Console
                </h1>
                <p className="text-gray-500">System oversight and management.</p>
            </header>

            {}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-1">
                <button
                    onClick={() => handleTabChange('overview')}
                    className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary hover:bg-gray-50'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => handleTabChange('users')}
                    className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary hover:bg-gray-50'}`}
                >
                    Users Management
                </button>
                <button
                    onClick={() => handleTabChange('verifications')}
                    className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'verifications' ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary hover:bg-gray-50'}`}
                >
                    Verifications
                    {stats.pendingVerifications > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{stats.pendingVerifications}</span>}
                </button>
                <button
                    onClick={() => handleTabChange('properties')}
                    className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-all ${activeTab === 'properties' ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary hover:bg-gray-50'}`}
                >
                    Properties
                </button>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'verifications' && renderVerifications()}
            {activeTab === 'properties' && renderProperties()}

            {showPropertyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-dark">{isEditingProperty ? 'Edit Property' : 'Add Property'}</h2>
                                    <p className="text-sm text-gray-600 mt-1">Manage property listing details</p>
                                </div>
                                <button
                                    onClick={closePropertyModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <form
                            className="p-6 space-y-4"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    if (!propertyForm.title?.trim() || !propertyForm.address?.trim() || !propertyForm.owner_id) {
                                        showInfo('Missing fields', 'Owner, title, and address are required', 'error');
                                        return;
                                    }

                                    const payload: any = {
                                        ...propertyForm,
                                        price: Number(propertyForm.price || 0),
                                        bedrooms: Number(propertyForm.bedrooms || 1),
                                        bathrooms: Number(propertyForm.bathrooms || 1),
                                        sqft: Number(propertyForm.sqft || 500),
                                        amenities: Array.isArray(propertyForm.amenities) ? propertyForm.amenities : [],
                                        image: propertyForm.image || '/img/default-property-img.png'
                                    };

                                    if (isEditingProperty && payload.id) {
                                        await updateProperty(payload);
                                        showInfo('Updated', 'Property updated successfully', 'success');
                                    } else {
                                        delete payload.id;
                                        await addProperty(payload);
                                        showInfo('Created', 'Property added successfully', 'success');
                                    }

                                    closePropertyModal();
                                } catch {
                                    showInfo('Error', 'Failed to save property', 'error');
                                }
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Owner</label>
                                    <select
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none bg-white"
                                        value={propertyForm.owner_id || ''}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, owner_id: e.target.value }))}
                                    >
                                        <option value="">Select owner</option>
                                        {users.filter(u => u.role === UserRole.OWNER).map(o => (
                                            <option key={o.id} value={o.id}>{o.full_name} ({o.email})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                                    <input
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                        value={propertyForm.title || ''}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
                                    <input
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                        value={propertyForm.address || ''}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Price (₱)</label>
                                    <input
                                        type="number"
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                        value={propertyForm.price ?? 0}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                    <select
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none bg-white"
                                        value={(propertyForm.status as any) || PropertyStatus.AVAILABLE}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, status: e.target.value as any }))}
                                    >
                                        <option value={PropertyStatus.AVAILABLE}>Available</option>
                                        <option value={PropertyStatus.OCCUPIED}>Occupied</option>
                                        <option value={PropertyStatus.MAINTENANCE}>Maintenance</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                    <select
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none bg-white"
                                        value={(propertyForm.category as any) || PropertyCategory.APARTMENT}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, category: e.target.value as any }))}
                                    >
                                        {Object.values(PropertyCategory)
                                          .filter(c => c !== PropertyCategory.BOARDING_HOUSE)
                                          .map(c => (
                                            <option key={c} value={c}>{String(c).replaceAll('_', ' ')}</option>
                                          ))}
                                        {propertyCategories
                                          .filter(c => !Object.values(PropertyCategory).includes(c as any))
                                          .map(c => (
                                            <option key={c} value={c}>{c}</option>
                                          ))}
                                    </select>

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
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Beds</label>
                                    <input
                                        type="number"
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                        value={propertyForm.bedrooms ?? 1}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Baths</label>
                                    <input
                                        type="number"
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                        value={propertyForm.bathrooms ?? 1}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Sqft</label>
                                    <input
                                        type="number"
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-beige outline-none"
                                        value={propertyForm.sqft ?? 500}
                                        onChange={(e) => setPropertyForm(prev => ({ ...prev, sqft: Number(e.target.value) }))}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Image</label>
                                    <div className="mt-1 flex items-center gap-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="admin-property-image-upload"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const result = ev.target?.result as string;
                                                    setPropertyForm(prev => ({ ...prev, image: result }));
                                                };
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const el = document.getElementById('admin-property-image-upload') as HTMLInputElement | null;
                                                el?.click();
                                            }}
                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl font-bold text-gray-700"
                                        >
                                            Upload New File
                                        </button>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Amenities</label>
                                    <div className="flex flex-wrap gap-2">
                                        {amenities.map(a => (
                                            <div key={a} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={propertyForm.amenities?.includes(a)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setPropertyForm(prev => {
                                                            const amenities = prev.amenities || [];
                                                            if (checked) {
                                                                amenities.push(a);
                                                            } else {
                                                                const index = amenities.indexOf(a);
                                                                if (index !== -1) {
                                                                    amenities.splice(index, 1);
                                                                }
                                                            }
                                                            return { ...prev, amenities };
                                                        });
                                                    }}
                                                />
                                                <span className="text-sm">{a}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition px-4 py-2"
                            >
                                {isEditingProperty ? 'Update Property' : 'Add Property'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {showUserDetailsModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-dark">User Details</h2>
                                    <p className="text-sm text-gray-600 mt-1">Manage user information and actions</p>
                                </div>
                                <button
                                    onClick={closeUserDetailsModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <img
                                    src={selectedUser.avatar_url || '/img/default-profile.png'}
                                    className="w-16 h-16 rounded-full border-2 border-gray-100"
                                />
                                <div>
                                    <h3 className="font-bold text-dark text-lg">{selectedUser.full_name}</h3>
                                    <p className="text-gray-600">{selectedUser.email}</p>
                                    <p className="text-sm text-gray-500">ID: {selectedUser.id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-700 mb-2">User Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Role:</span>
                                            <span className="font-medium">{selectedUser.role}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Phone:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{selectedUser.phone || 'N/A'}</span>
                                                {Number(selectedUser.phone_verified) === 1 && (
                                                    <CheckCircle size={14} className="text-green-600" />
                                                )}
                                                {selectedUser.role !== UserRole.ADMIN && selectedUser.phone && Number(selectedUser.phone_verified) !== 1 && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const updated = await verifyUserPhone(selectedUser.id, true);
                                                                    showInfo('Success!', 'Phone number verified successfully', 'success');
                                                                    setSelectedUser(updated);
                                                                } catch {
                                                                    showInfo('Error', 'Failed to verify phone number', 'error');
                                                                }
                                                            }}
                                                            className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 transition"
                                                            title="Approve phone verification"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const reason = window.prompt('Rejection reason (optional):') || '';
                                                                const confirmed = await showConfirm(
                                                                    'Reject Phone Verification',
                                                                    'Are you sure you want to reject this phone verification? This will mark the phone as not verified.',
                                                                    async () => {
                                                                        try {
                                                                            const updated = await verifyUserPhone(selectedUser.id, false, reason);
                                                                            showInfo('Updated', 'Phone verification rejected', 'success');
                                                                            setSelectedUser(updated);
                                                                        } catch {
                                                                            showInfo('Error', 'Failed to reject phone verification', 'error');
                                                                        }
                                                                    },
                                                                    () => {},
                                                                    { confirmText: 'Reject', cancelText: 'Cancel' }
                                                                );
                                                            }}
                                                            className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                            title="Reject phone verification"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Account Status:</span>
                                            <span className={`font-medium ${selectedUser.inactive ? 'text-red-600' : 'text-green-600'}`}>
                                                {selectedUser.inactive ? 'Inactive' : 'Active'}
                                            </span>
                                        </div>
                                        {Number(selectedUser.inactive) === 1 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">Allow Reactivation Request:</span>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={Number((selectedUser as any)?.allow_reactivation_request ?? 1) === 1}
                                                    onClick={async () => {
                                                        try {
                                                            const current = Number((selectedUser as any)?.allow_reactivation_request ?? 1);
                                                            const next = current === 1 ? 0 : 1;
                                                            const updated = await updateUserFields(selectedUser.id, { allow_reactivation_request: next } as any);
                                                            setSelectedUser(updated);
                                                        } catch {
                                                            showInfo('Error', 'Failed to update reactivation request setting', 'error');
                                                        }
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${Number((selectedUser as any)?.allow_reactivation_request ?? 1) === 1 ? 'bg-green-600' : 'bg-gray-300'}`}
                                                    title="Toggle whether this user can request account reactivation"
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${Number((selectedUser as any)?.allow_reactivation_request ?? 1) === 1 ? 'translate-x-5' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-700 mb-2">Verification Status</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Email:</span>
                                            <div className="flex items-center gap-2">
                                                {Number(selectedUser.email_verified) === 1 ? (
                                                    <CheckCircle size={16} className="text-green-600" title="Verified" />
                                                ) : (
                                                    <span className={`font-medium ${Number(selectedUser.email_verified) === 2 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {Number(selectedUser.email_verified) === 2 ? 'Pending' : 'Not Verified'}
                                                    </span>
                                                )}
                                                {selectedUser.role !== UserRole.ADMIN && Number(selectedUser.email_verified) !== 1 && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const updated = await verifyUserEmail(selectedUser.id, true);
                                                                    showInfo('Success!', 'Email verified successfully', 'success');
                                                                    setSelectedUser(updated);
                                                                } catch {
                                                                    showInfo('Error', 'Failed to verify email', 'error');
                                                                }
                                                            }}
                                                            className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 transition"
                                                            title="Approve email verification"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const reason = window.prompt('Rejection reason (optional):') || '';
                                                                await showConfirm(
                                                                    'Reject Email Verification',
                                                                    'Are you sure you want to reject this email verification? This will mark the email as not verified.',
                                                                    async () => {
                                                                        try {
                                                                            const updated = await verifyUserEmail(selectedUser.id, false, reason);
                                                                            showInfo('Updated', 'Email verification rejected', 'success');
                                                                            setSelectedUser(updated);
                                                                        } catch {
                                                                            showInfo('Error', 'Failed to reject email verification', 'error');
                                                                        }
                                                                    },
                                                                    () => {},
                                                                    { confirmText: 'Reject', cancelText: 'Cancel' }
                                                                );
                                                            }}
                                                            className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                            title="Reject email verification"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Phone:</span>
                                            {Number(selectedUser.phone_verified) === 1 ? (
                                                <CheckCircle size={16} className="text-green-600" title="Verified" />
                                            ) : (
                                                <span className={`font-medium ${
                                                    Number(selectedUser.phone_verified) === 2 ? 'text-amber-600' :
                                                    'text-red-600'
                                                }`}>
                                                    {Number(selectedUser.phone_verified) === 2 ? 'Pending' : 'Not Verified'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">ID Document:</span>
                                            {selectedUser.status_type_id === 2 ? (
                                                <CheckCircle size={16} className="text-green-600" title="Verified" />
                                            ) : (
                                                <span className={`font-medium ${
                                                    selectedUser.status_type_id === 1 ? 'text-amber-600' :
                                                    selectedUser.status_type_id === 3 ? 'text-red-600' :
                                                    'text-gray-500'
                                                }`}>
                                                    {selectedUser.status_type_id === 0 ? 'Unverified' : selectedUser.status_type_id === 1 ? 'Pending' : 'Rejected'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                <button
                                    onClick={async () => {
                                        const isCurrentlyInactive = Number(selectedUser.inactive) === 1;
                                        const newInactive = isCurrentlyInactive ? 0 : 1;
                                        const action = newInactive === 1 ? 'deactivate' : 'activate';
                                        const message = newInactive === 1
                                            ? `Are you sure you want to deactivate this user? They will not be able to access the application.`
                                            : `Are you sure you want to activate this user? They will be able to access the application.`;

                                        await showConfirm(
                                            `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
                                            message,
                                            async () => {
                                                try {
                                                    const updates: Partial<User> = { inactive: newInactive };

                                                    if (newInactive === 1) {
                                                        updates.is_verified = 0;
                                                        updates.email_verified = 0;
                                                        updates.phone_verified = 0;
                                                        updates.status_type_id = VerificationStatus.UNVERIFIED;
                                                        updates.id_document_url = null as any;
                                                        updates.id_document_back_url = null;
                                                        updates.id_type = null;
                                                    }

                                                    const updated = await updateUserFields(selectedUser.id, updates);
                                                    setSelectedUser(updated);
                                                } catch {
                                                    showInfo('Error', 'Failed to update user status', 'error');
                                                }
                                            },
                                            () => {},
                                            { confirmText: action.charAt(0).toUpperCase() + action.slice(1), cancelText: 'Cancel' }
                                        );
                                    }}
                                    className={`px-4 py-2 rounded-lg font-bold transition ${
                                        selectedUser.inactive
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-amber-600 text-white hover:bg-amber-700'
                                    }`}
                                >
                                    {selectedUser.inactive ? 'Activate User' : 'Deactivate User'}
                                </button>
                                <button
                                    onClick={closeUserDetailsModal}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {}
            {showVerificationModal && selectedVerificationUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-dark">Identity Verification Review</h2>
                                    <p className="text-sm text-gray-600 mt-1">Review submitted verification documents</p>
                                </div>
                                <button
                                    onClick={closeVerificationModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <img
                                    src={selectedVerificationUser.avatar_url || '/img/default-profile.png'}
                                    className="w-16 h-16 rounded-full border-2 border-gray-100"
                                />
                                <div>
                                    <h3 className="font-bold text-dark text-lg">{selectedVerificationUser.full_name}</h3>
                                    <p className="text-gray-600">{selectedVerificationUser.email}</p>
                                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                        selectedVerificationUser.role === UserRole.OWNER ? 'bg-primary/10 text-primary' :
                                        selectedVerificationUser.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {selectedVerificationUser.role}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-700 mb-3">User Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Phone:</span>
                                            <span className="font-medium">{selectedVerificationUser.phone || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Account Status:</span>
                                            <span className={`font-medium ${selectedVerificationUser.inactive ? 'text-red-600' : 'text-green-600'}`}>
                                                {selectedVerificationUser.inactive ? 'Inactive' : 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-700 mb-3">Verification Status</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Email:</span>
                                            <span className={`font-medium ${selectedVerificationUser.email_verified ? 'text-green-600' : 'text-red-600'}`}>
                                                {selectedVerificationUser.email_verified ? 'Verified' : 'Not Verified'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Phone:</span>
                                            <span className={`font-medium ${selectedVerificationUser.phone_verified ? 'text-green-600' : 'text-red-600'}`}>
                                                {selectedVerificationUser.phone_verified ? 'Verified' : 'Not Verified'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">ID Document:</span>
                                            <span className={`font-medium text-amber-600`}>
                                                Pending Review
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <h4 className="font-medium text-gray-700 mb-3">Submitted ID Document</h4>
                                {selectedVerificationUser.id_document_url ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                        <div className="h-48 bg-gray-100 rounded-lg overflow-hidden relative">
                                            {(() => {
                                                const isImageUrl = selectedVerificationUser.id_document_url.match(/\.(jpg|jpeg|png|gif)$/i);

                                                if (isLoading) {
                                                    return (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <div className="text-center">
                                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                                                <p className="text-sm">Loading document...</p>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                if (!signedUrl) {
                                                    return (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <div className="text-center">
                                                                <AlertCircle size={48} className="mx-auto mb-2" />
                                                                <p className="text-sm">Document not available</p>
                                                                <p className="text-xs text-gray-500 mt-1">Unable to load document</p>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return isImageUrl ? (
                                                    <img
                                                        src={signedUrl}
                                                        alt="ID Document"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `
                                                                    <div class="w-full h-full flex items-center justify-center text-gray-400">
                                                                        <div class="text-center">
                                                                            <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                                            </svg>
                                                                            <p class="text-sm">Document Preview</p>
                                                                            <p class="text-xs text-gray-500 mt-1">Image failed to load</p>
                                                                        </div>
                                                                    </div>
                                                                `;
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <div className="text-center">
                                                            <FileText size={48} className="mx-auto mb-2" />
                                                            <p className="text-sm">ID Document</p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {selectedVerificationUser.id_document_url.split('.').pop()?.toUpperCase() || 'PDF'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="mt-3 flex justify-center">
                                            <button
                                                onClick={async () => {
                                                    const docUrl = selectedVerificationUser.id_document_url;

                                                    try {
                                                        const { data, error } = await supabase.storage
                                                            .from('documents')
                                                            .createSignedUrl(docUrl, 3600);

                                                        if (error) throw error;
                                                        window.open(data.signedUrl, '_blank');
                                                    } catch (error) {
                                                        console.error('Failed to get signed URL:', error);
                                                        showInfo('Document Error', 'Unable to open document', 'error');
                                                    }
                                                }}
                                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition inline-flex items-center gap-2"
                                            >
                                                <FileText size={16} />
                                                View Full Document
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-red-300 rounded-lg p-4">
                                        <div className="h-32 bg-red-50 rounded-lg flex items-center justify-center text-red-400">
                                            <div className="text-center">
                                                <AlertCircle size={48} className="mx-auto mb-2" />
                                                <p className="text-sm">No ID Document Uploaded</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleApproveVerification}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                                >
                                    <CheckCircle size={16} className="inline mr-2" />
                                    Approve Verification
                                </button>
                                <button
                                    onClick={handleRejectVerification}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
                                >
                                    <XCircle size={16} className="inline mr-2" />
                                    Reject Verification
                                </button>
                                <button
                                    onClick={closeVerificationModal}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {}
            <ConfirmComponent />
            <InfoComponent />

            {}
            <RejectionDialog
                isOpen={showRejectionDialog}
                userName={selectedVerificationUser?.full_name || 'this user'}
                onSubmit={handleRejectionSubmit}
                onCancel={() => setShowRejectionDialog(false)}
            />
        </div>
    );
};
