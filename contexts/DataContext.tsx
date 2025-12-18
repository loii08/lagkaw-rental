import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Property, Bill, Booking, User, BillStatus, Application, ApplicationStatus, PropertyStatus, Notification, UserRole, VerificationStatus, Occupant } from '../types';
import { useAuth } from './AuthContext';
import { supabase, supabaseAdmin } from '../lib/supabase';

const billTypeToDB = (type: Bill['type']): string => {
  if (type === 'utility') return 'utilities';
  return type;
};

const normalizePropertyStatusFromDb = (status: any): PropertyStatus => {
  const raw = String(status || '').trim();
  const normalized = raw.toLowerCase();

  if (normalized === 'available') return PropertyStatus.AVAILABLE;
  if (normalized === 'occupied' || normalized === 'rented') return PropertyStatus.OCCUPIED;
  if (normalized === 'maintenance') return PropertyStatus.MAINTENANCE;

  return PropertyStatus.AVAILABLE;
};

const normalizePropertyStatusToDb = (status: any): string => {
  // Postgres enum values are case-sensitive; this project uses lowercase enum values in DB.
  const ui = normalizePropertyStatusFromDb(status);
  return String(ui).toLowerCase();
};

const normalizePropertyFromDb = (raw: any): Property => {
  return {
    ...(raw as Property),
    status: normalizePropertyStatusFromDb((raw as any)?.status)
  };
};

const normalizeProfile = (raw: any): User => {
  return {
    ...(raw as User),
    status_type_id: Number(raw?.status_type_id ?? VerificationStatus.UNVERIFIED) as any,
    is_verified: Number(raw?.is_verified ?? 0),
    email_verified: Number(raw?.email_verified ?? 0),
    phone_verified: Number(raw?.phone_verified ?? 0),
    inactive: Number(raw?.inactive ?? 0),
    allow_reactivation_request: Number(raw?.allow_reactivation_request ?? 1)
  };
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const created = new Date(timestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

interface DataContextType {
  properties: Property[];
  bills: Bill[];
  bookings: Booking[];
  users: User[];
  applications: Application[];
  propertyCategories: string[];
  readNotificationIds: string[];
  notifications: Notification[];
  unreadNotificationCount: number;
  addProperty: (property: Omit<Property, 'id'>) => Promise<void>;
  updateProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
  addPropertyCategory: (name: string) => Promise<void>;
  payBill: (billId: string) => Promise<void>;
  updateBill: (bill: Bill) => Promise<void>;
  createBill: (bill: Omit<Bill, 'id'>) => Promise<void>;
  searchUserByEmail: (email: string) => Promise<User | null>;
  fetchUserRole: (userId: string) => Promise<UserRole>;
  updateUser: (user: User) => Promise<void>;
  updateUserFields: (userId: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  requestVerification: (userId: string) => Promise<void>;
  verifyUser: (userId: string, isApproved: boolean, rejectionReason?: string) => Promise<void>;
  verifyUserPhone: (userId: string, isApproved: boolean, rejectionMessage?: string) => Promise<User>;
  verifyUserEmail: (userId: string, isApproved: boolean, rejectionMessage?: string) => Promise<User>;
  submitApplication: (application: Omit<Application, 'id'>) => Promise<void>;
  processApplication: (appId: string, status: ApplicationStatus) => Promise<void>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateBooking: (booking: Booking) => Promise<void>;
  isLoadingData: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children?: ReactNode }) => {
  const { currentUser } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [propertyCategories, setPropertyCategories] = useState<string[]>([]);
  const [dbNotifications, setDbNotifications] = useState<Notification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setDismissedNotificationIds([]);
      return;
    }

    try {
      const key = `dismissedNotifications:${currentUser.id}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      setDismissedNotificationIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDismissedNotificationIds([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const key = `dismissedNotifications:${currentUser.id}`;
      localStorage.setItem(key, JSON.stringify(dismissedNotificationIds));
    } catch {

    }
  }, [dismissedNotificationIds, currentUser?.id]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {

      const [propsRes, billsRes, bookingsRes, usersRes, appsRes, notifsRes, categoriesRes] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('bills').select('*'),

        supabase.from('bookings').select('*, occupants(*)'),
        supabaseAdmin.from('profiles').select('*'),
        supabase.from('applications').select('*'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        supabase.from('property_categories').select('*')
      ]);

      if (propsRes.error) console.error('Properties error:', propsRes.error);
      if (billsRes.error) console.error('Bills error:', billsRes.error);
      if (bookingsRes.error) console.error('Bookings error:', bookingsRes.error);
      if (usersRes.error) console.error('Users error:', usersRes.error);
      if (appsRes.error) console.error('Applications error:', appsRes.error);
      if (notifsRes.error) console.error('Notifications error:', notifsRes.error);
      if (categoriesRes.error) console.error('Property categories error:', categoriesRes.error);

      if (propsRes.data) setProperties((propsRes.data as any[]).map(normalizePropertyFromDb));
      if (billsRes.data) setBills(billsRes.data as Bill[]);

      if (bookingsRes.data) {
          setBookings(bookingsRes.data as Booking[]);
      }
      if (usersRes.data) setUsers((usersRes.data as any[]).map(normalizeProfile));
      if (appsRes.data) setApplications(appsRes.data as Application[]);
      if (categoriesRes.data) {
        const names = (categoriesRes.data as any[])
          .map((c: any) => c?.name)
          .filter(Boolean)
          .map((n: any) => String(n).trim())
          .filter((n: string) => n.length > 0);
        setPropertyCategories(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
      }
      if (notifsRes.data) {
        const formattedNotifications = notifsRes.data.map((notif: any) => ({
          id: notif.id,
          user_id: notif.user_id,
          title: notif.title,
          message: notif.message,
          type: notif.type || 'info',
          link: notif.link || '/',
          timestamp: formatTimeAgo(notif.created_at),
          isRead: !!notif.is_read,
          created_at: notif.created_at
        }));
        setDbNotifications(formattedNotifications);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const notifs: Notification[] = [];

    notifs.push(...dbNotifications.filter(n => n.user_id === currentUser.id));

    if (currentUser.role === UserRole.RENTER) {
        const myBills = bills.filter(b => b.renter_id === currentUser.id);
        const overdue = myBills.filter(b => b.status === BillStatus.OVERDUE);
        const pending = myBills.filter(b => b.status === BillStatus.PENDING);

        if (overdue.length > 0) {
            notifs.push({
                id: 'overdue-bills',
                title: 'Action Required',
                message: `You have ${overdue.length} overdue bill(s).`,
                type: 'alert',
                link: '/?section=bills',
                timestamp: 'Just now',
                isRead: readNotificationIds.includes('overdue-bills')
            });
        } else if (pending.length > 0) {
            const earliest = [...pending].sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
            const notifId = `pending-${earliest?.id || 'bills'}`;
            notifs.push({
                id: notifId,
                title: 'New Bills',
                message: `You have ${pending.length} pending bill(s) due soon.`,
                type: 'info',
                link: '/?section=bills',
                timestamp: earliest ? earliest.created_at : 'Recently',
                isRead: readNotificationIds.includes(notifId)
            });
        }

        const myApps = applications.filter(a => a.renter_id === currentUser.id && a.status !== ApplicationStatus.PENDING);
        myApps.forEach(app => {
             const prop = properties.find(p => p.id === app.property_id);
             notifs.push({
                 id: `app-${app.id}`,
                 title: 'Application Update',
                 message: `Your application for ${prop?.title} was ${app.status.toLowerCase()}.`,
                 type: app.status === ApplicationStatus.APPROVED ? 'success' : 'alert',
                 link: `/property/${app.property_id}`,
                 timestamp: app.created_at,
                 isRead: readNotificationIds.includes(`app-${app.id}`)
             });
        });
    }

    if (currentUser.role === UserRole.OWNER) {
        const myPropIds = properties.filter(p => p.owner_id === currentUser.id).map(p => p.id);

        const pendingApps = applications.filter(a => myPropIds.includes(a.property_id) && a.status === ApplicationStatus.PENDING);
        pendingApps.forEach(app => {
            const prop = properties.find(p => p.id === app.property_id);
            const renter = users.find(u => u.id === app.renter_id);
            notifs.push({
                id: `new-app-${app.id}`,
                title: 'New Application',
                message: `${renter?.full_name} applied for ${prop?.title}.`,
                type: 'info',
                link: `/applications?reviewId=${app.id}`,
                timestamp: app.created_at,
                isRead: readNotificationIds.includes(`new-app-${app.id}`)
            });
        });

        const myBookings = bookings.filter(b => myPropIds.includes(b.property_id) && b.is_active);
        const expiring = myBookings.filter(b => {
             if (!b.end_date) return false;
             const days = Math.ceil((new Date(b.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
             return days <= 30 && days >= 0;
        });

        if (expiring.length > 0) {
             notifs.push({
                id: 'expiring-lease',
                title: 'Leases Expiring',
                message: `${expiring.length} lease(s) are expiring within 30 days.`,
                type: 'alert',
                link: '/',
                timestamp: 'Today',
                isRead: readNotificationIds.includes('expiring-lease')
            });
        }
    }

    return notifs
      .filter(n => !dismissedNotificationIds.includes(n.id))
      .sort((a, b) => {
        if (a.isRead === b.isRead) return 0;
        return a.isRead ? 1 : -1;
      });
  }, [currentUser, bills, applications, properties, bookings, users, readNotificationIds, dbNotifications, dismissedNotificationIds]);

  const unreadNotificationCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const normalizePropertyCategory = (category: any) => {
    if (!category) return 'apartment';
    if (category === 'boarding_house') return 'other';
    return category;
  };

  const addProperty = async (property: Omit<Property, 'id'>) => {

    const dbProperty = {
      owner_id: property.owner_id,
      title: property.title,
      description: property.description,
      address: property.address,
      price: property.price,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.sqft,
      image: property.image || '/img/default-property-img.png',
      status: normalizePropertyStatusToDb(property.status),
      amenities: property.amenities,
      category: normalizePropertyCategory(property.category)
    };

    const { data, error } = await supabase.from('properties').insert(dbProperty).select().single();
    if (error) {
      console.error('Error adding property:', error);
      throw error;
    }
    if (data) setProperties(prev => [...prev, normalizePropertyFromDb(data)]);
  };

  const updateProperty = async (updatedProperty: Property) => {

    const dbProperty = {
      owner_id: updatedProperty.owner_id,
      title: updatedProperty.title,
      description: updatedProperty.description,
      address: updatedProperty.address,
      price: updatedProperty.price,
      bedrooms: updatedProperty.bedrooms,
      bathrooms: updatedProperty.bathrooms,
      sqft: updatedProperty.sqft,
      image: updatedProperty.image || '/img/default-property-img.png',
      status: normalizePropertyStatusToDb(updatedProperty.status),
      amenities: updatedProperty.amenities,
      category: normalizePropertyCategory(updatedProperty.category)
    };

    const { error } = await supabase.from('properties').update(dbProperty).eq('id', updatedProperty.id);
    if (error) {
      console.error('Error updating property:', error);
      throw error;
    }
    if (!error) {
        setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p));
    }
  };

  const deleteProperty = async (id: string) => {
    const relatedBookings = bookings.filter(b => b.property_id === id);
    const relatedBills = bills.filter(b => b.property_id === id);
    const relatedApplications = applications.filter(a => a.property_id === id);

    if (relatedBookings.length || relatedBills.length || relatedApplications.length) {
      const prop = properties.find(p => p.id === id);
      const title = prop?.title || 'this property';
      const details = [
        relatedBookings.length ? `Bookings: ${relatedBookings.length}` : null,
        relatedBills.length ? `Bills: ${relatedBills.length}` : null,
        relatedApplications.length ? `Applications: ${relatedApplications.length}` : null
      ].filter(Boolean).join(' | ');

      const err: any = new Error(
        `Cannot delete ${title}. This property has existing records (${details}). Please settle/close them first. View: /property/${id}`
      );
      err.code = 'PROPERTY_DELETE_BLOCKED';
      err.details = {
        propertyId: id,
        link: `/property/${id}`,
        bookingsCount: relatedBookings.length,
        billsCount: relatedBills.length,
        applicationsCount: relatedApplications.length,
        bookingIds: relatedBookings.slice(0, 5).map(b => b.id),
        billIds: relatedBills.slice(0, 5).map(b => b.id),
        applicationIds: relatedApplications.slice(0, 5).map(a => a.id)
      };
      throw err;
    }

    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const addPropertyCategory = async (name: string) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('Category name is required.');
    if (currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.OWNER) {
      throw new Error('You are not allowed to add categories.');
    }

    const { data, error } = await supabase
      .from('property_categories')
      .insert({ name: trimmed })
      .select()
      .single();

    if (error) throw error;

    const created = (data as any)?.name ? String((data as any).name) : trimmed;
    setPropertyCategories(prev => Array.from(new Set([...prev, created])).sort((a, b) => a.localeCompare(b)));
  };

  const payBill = async (billId: string) => {
    const { error } = await supabase.from('bills').update({ status: BillStatus.PAID, paid_date: new Date().toISOString() }).eq('id', billId);
    if (error) {
      console.error('Error paying bill:', error);
      throw error;
    }
    if (!error) {
        setBills(prev => prev.map(b => b.id === billId ? { ...b, status: BillStatus.PAID, paid_date: new Date().toISOString() } : b));
    }
  };

  const updateBill = async (updatedBill: Bill) => {
    const { error } = await supabase.from('bills').update(updatedBill).eq('id', updatedBill.id);
    if (!error) {
        setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
    }
  };

  const createBill = async (bill: Omit<Bill, 'id'>) => {

    const dbBill = {
      property_id: bill.property_id,
      renter_id: bill.renter_id,
      type: billTypeToDB(bill.type),
      amount: bill.amount,
      due_date: bill.due_date,
      status: bill.status,
      notes: bill.notes
    };

    const { data, error } = await supabase.from('bills').insert(dbBill).select().single();
    if (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
    if (data) setBills(prev => [...prev, data as Bill]);
  };

  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return UserRole.RENTER;
      }
      
      if (!data) {
        console.log('No profile found for user, defaulting to RENTER role');
        return UserRole.RENTER;
      }
      
      return data.role as UserRole || UserRole.RENTER;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return UserRole.RENTER;
    }
  };

  const searchUserByEmail = async (email: string): Promise<User | null> => {
     const { data, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
     if (error) {
       console.error('Error searching user by email:', error);
       return null;
     }
     if (data) return data as User;
     return null;
  };

  const updateUser = async (user: User) => {

    const dbUser = {
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
      phone: user.phone,
      status_type_id: user.status_type_id,
      is_verified: user.is_verified
    };

    const { error } = await supabase.from('profiles').update(dbUser).eq('id', user.id);
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    if (!error) {
        setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    }
  };

  const updateUserFields = async (userId: string, updates: Partial<User>): Promise<User> => {
    try {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user fields:', updateError);
        throw updateError;
      }

      const { data: refreshedProfile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error refreshing profile after updateUserFields:', fetchError);
        throw fetchError;
      }

      if (Number((updates as any)?.inactive) === 1) {
        try {
          const adminAuth = (supabaseAdmin as any)?.auth?.admin;
          if (adminAuth?.signOut) {
            await adminAuth.signOut(userId);
          }
        } catch (signOutError) {
          console.error('Failed to revoke user sessions after deactivation:', signOutError);
        }
      }

      const updatedUser = normalizeProfile(refreshedProfile) as User;
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      return updatedUser;
    } catch (error) {
      console.error('updateUserFields failed:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (!error) {
          setUsers(prev => prev.filter(u => u.id !== userId));
      }
  };

  const requestVerification = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ status_type_id: VerificationStatus.PENDING }).eq('id', userId);
    if (error) {
      console.error('Error requesting verification:', error);
      throw error;
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status_type_id: VerificationStatus.PENDING } : u));
  };

  const verifyUserPhone = async (userId: string, isApproved: boolean, rejectionMessage?: string): Promise<User> => {
    try {
      const { error: updatePhoneError } = await supabaseAdmin
        .from('profiles')
        .update({ phone_verified: isApproved ? 1 : 0 })
        .eq('id', userId);

      if (updatePhoneError) {
        console.error('Error updating phone verification:', updatePhoneError);
        throw updatePhoneError;
      }

      const { data: refreshedProfile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error refreshing profile after phone verification:', fetchError);
        throw fetchError;
      }

      const emailOk = Number(refreshedProfile?.email_verified) === 1;
      const phoneOk = Number(refreshedProfile?.phone_verified) === 1;
      const idOk = Number(refreshedProfile?.status_type_id) === VerificationStatus.VERIFIED;

      const fullyVerified = emailOk && phoneOk && idOk;

      const { error: updateFullError } = await supabaseAdmin
        .from('profiles')
        .update({ is_verified: fullyVerified ? 1 : 0 })
        .eq('id', userId);

      if (updateFullError) {
        console.error('Error updating is_verified after phone verification:', updateFullError);
        throw updateFullError;
      }

      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          title: isApproved ? 'Phone Verification Approved' : 'Phone Verification Rejected',
          message: isApproved
            ? 'Your phone number has been verified by an administrator.'
            : (rejectionMessage || 'Your phone verification was rejected. Please ensure your phone number is correct and request verification again.'),
          type: isApproved ? 'success' : 'alert',
          link: '/settings',
          is_read: false
        });
      } catch (notifyError) {
        console.error('Failed to create phone verification notification:', notifyError);
      }

      const updatedUser = normalizeProfile({ ...refreshedProfile, is_verified: fullyVerified ? 1 : 0 }) as User;
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      return updatedUser;
    } catch (error) {
      console.error('verifyUserPhone failed:', error);
      throw error;
    }
  };

  const verifyUserEmail = async (userId: string, isApproved: boolean, rejectionMessage?: string): Promise<User> => {
    try {
      const { error: updateEmailError } = await supabaseAdmin
        .from('profiles')
        .update({ email_verified: isApproved ? 1 : 0 })
        .eq('id', userId);

      if (updateEmailError) {
        console.error('Error updating email verification:', updateEmailError);
        throw updateEmailError;
      }

      const { data: refreshedProfile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error refreshing profile after email verification:', fetchError);
        throw fetchError;
      }

      const emailOk = Number(refreshedProfile?.email_verified) === 1;
      const phoneOk = Number(refreshedProfile?.phone_verified) === 1;
      const idOk = Number(refreshedProfile?.status_type_id) === VerificationStatus.VERIFIED;
      const fullyVerified = emailOk && phoneOk && idOk;

      const { error: updateFullError } = await supabaseAdmin
        .from('profiles')
        .update({ is_verified: fullyVerified ? 1 : 0 })
        .eq('id', userId);

      if (updateFullError) {
        console.error('Error updating is_verified after email verification:', updateFullError);
        throw updateFullError;
      }

      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: userId,
          title: isApproved ? 'Email Verification Approved' : 'Email Verification Rejected',
          message: isApproved
            ? 'Your email address has been verified by an administrator.'
            : (rejectionMessage || 'Your email verification was rejected. Please ensure your email address is correct and request verification again.'),
          type: isApproved ? 'success' : 'alert',
          link: '/settings',
          is_read: false
        });
      } catch (notifyError) {
        console.error('Failed to create email verification notification:', notifyError);
      }

      const updatedUser = normalizeProfile({ ...refreshedProfile, is_verified: fullyVerified ? 1 : 0 }) as User;
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      return updatedUser;
    } catch (error) {
      console.error('verifyUserEmail failed:', error);
      throw error;
    }
  };

  const verifyUser = async (userId: string, isApproved: boolean, rejectionReason?: string) => {
    const finalStatus = isApproved ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const existingUser = users.find(u => u.id === userId);
    const emailOk = Number(existingUser?.email_verified) === 1;
    const phoneOk = Number(existingUser?.phone_verified) === 1;
    const fullyVerified = isApproved && emailOk && phoneOk;

    const updates = {
      is_verified: fullyVerified ? 1 : 0,
      status_type_id: finalStatus
    };

    try {
        const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', userId);
        if (error) {
            console.error('Error verifying user:', error);
            throw error;
        }

        try {
          const { data: refreshedProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (refreshedProfile) {
            setUsers(prev => prev.map(u => u.id === userId ? normalizeProfile(refreshedProfile) : u));
          } else {

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
          }
        } catch {

          setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        }

        const user = users.find(u => u.id === userId);
        if (user) {

            if (!isApproved && user.id_document_url) {
                try {

                    const { error: deleteError } = await supabaseAdmin
                        .storage
                        .from('documents')
                        .remove([user.id_document_url]);

                    if (deleteError) {
                        console.error('Failed to delete document:', deleteError);
                    } else {
                        console.log('Successfully deleted document from documents bucket');
                    }
                } catch (error) {
                    console.error('Error deleting document:', error);
                }

                await supabaseAdmin
                    .from('profiles')
                    .update({ id_document_url: null })
                    .eq('id', userId);

                setUsers(prev => prev.map(u => u.id === userId ? {
                    ...u,
                    id_document_url: null
                } : u));
            }

                const notification = {
              user_id: userId,
              title: isApproved ? 'Verification Approved!' : 'Verification Rejected',
              message: isApproved
                ? 'Your identity verification has been approved. You can now access all features.'
                : (rejectionReason || 'Your identity verification was rejected. Please review your submitted documents and try again.'),
              type: isApproved ? 'success' : 'alert',
              link: '/profile?tab=verification',
              is_read: false
            };

            const { error: notifError } = await supabaseAdmin
              .from('notifications')
              .insert([notification]);

            if (notifError) {
                console.error('Error creating user notification:', notifError);
            } else {

                const { data: refreshedNotifs } = await supabase
                  .from('notifications')
                  .select('*')
                  .order('created_at', { ascending: false });

                if (refreshedNotifs) {
                    const formattedNotifications = refreshedNotifs.map((notif: any) => ({
                      id: notif.id,
                      user_id: notif.user_id,
                      title: notif.title,
                      message: notif.message,
                      type: notif.type || 'info',
                      link: notif.link || '/',
                      timestamp: formatTimeAgo(notif.created_at),
                      isRead: !!notif.is_read,
                      created_at: notif.created_at
                    }));
                    setDbNotifications(formattedNotifications);
                }
            }
        }

    } catch (error: any) {
        throw error;
    }
  };

  const addBooking = async (booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => {

    const { occupants, ...bookingData } = booking;

    const dbBooking = {
      property_id: bookingData.property_id,
      renter_id: bookingData.renter_id,
      start_date: bookingData.start_date,
      end_date: bookingData.end_date ? bookingData.end_date : null,
      is_active: bookingData.is_active,
      notes: bookingData.notes
    };

    const { data: newBooking, error } = await supabase.from('bookings').insert(dbBooking).select().single();

    if (error) {
      console.error('Error adding booking:', error);
      throw error;
    }

    if (newBooking) {
        let savedOccupants: Occupant[] = [];

        if (occupants && occupants.length > 0) {
            const occupantsToInsert = occupants.map(o => ({
                booking_id: newBooking.id,
                name: o.name,
                relationship: o.relationship,
                age: o.age,
                contact: o.contact,
                notes: o.notes,
                dob: o.dob
            }));
            const { data: occData, error: occError } = await supabase.from('occupants').insert(occupantsToInsert).select();
            if (occError) {
              console.error('Error adding occupants:', occError);
            } else if (occData) {
              savedOccupants = occData;
            }
        }

        const fullBooking: Booking = { ...newBooking, occupants: savedOccupants };
        setBookings(prev => [...prev, fullBooking]);

        const prop = properties.find(p => p.id === booking.property_id);
        if (prop) {
            updateProperty({ ...prop, status: PropertyStatus.OCCUPIED });
        }
    }
  };

  const updateBooking = async (updatedBooking: Booking) => {
    const { occupants, ...bookingData } = updatedBooking;

    const dbBooking = {
      property_id: bookingData.property_id,
      renter_id: bookingData.renter_id,
      start_date: bookingData.start_date,
      end_date: bookingData.end_date ? bookingData.end_date : null,
      is_active: bookingData.is_active,
      notes: bookingData.notes
    };

    const { error } = await supabase.from('bookings').update(dbBooking).eq('id', updatedBooking.id);

    if (error) {
      console.error('Error updating booking:', error);
      throw error;
    }

    if (!error) {

        const { error: deleteError } = await supabase.from('occupants').delete().eq('booking_id', updatedBooking.id);
        if (deleteError) {
          console.error('Error deleting occupants:', deleteError);
        }

        if (occupants && occupants.length > 0) {
            const occupantsToInsert = occupants.map(o => ({
                booking_id: updatedBooking.id,
                name: o.name,
                relationship: o.relationship ?? (o as any).relation,
                age: o.age ?? null,
                notes: o.notes ?? null
            }));
            const { error: insertError } = await supabase.from('occupants').insert(occupantsToInsert);
            if (insertError) {
              console.error('Error inserting occupants:', insertError);
            }
        }

        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
    }
  };

  const submitApplication = async (application: Omit<Application, 'id'>) => {
    const existingPending = applications
      .filter(a => a.property_id === application.property_id && a.renter_id === application.renter_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (existingPending && existingPending.status === ApplicationStatus.PENDING) {
      return;
    }

    const dbApplication = {
      property_id: application.property_id,
      renter_id: application.renter_id,
      status: application.status,
      message: application.message,
      move_in_date: application.move_in_date
    };

    const { data, error } = await supabase.from('applications').insert(dbApplication).select().single();
    if (error) {
      console.error('Error submitting application:', error);
      throw error;
    }

    if (data) {
      setApplications(prev => [...prev, data as Application]);

      const prop = properties.find(p => p.id === application.property_id);
      if (prop?.owner_id) {
        supabase
          .from('notifications')
          .insert({
            user_id: prop.owner_id,
            title: 'New Application',
            message: 'You received a new rental application.',
            type: 'info',
            link: '/?section=applications',
            is_read: false
          })
          .then(
            () => fetchData(),
            () => undefined
          );
      }
    }
  };

  const processApplication = async (appId: string, status: ApplicationStatus) => {
    const app = applications.find(a => a.id === appId);
    if (!app) return;

    const { error } = await supabase.from('applications').update({ status }).eq('id', appId);
    if (error) {
      console.error('Error processing application:', error);
      throw error;
    }

    if (app.status === ApplicationStatus.APPROVED && status !== ApplicationStatus.APPROVED) {
        const relatedBooking = bookings.find(b => b.property_id === app.property_id && b.renter_id === app.renter_id && b.is_active);
        if (relatedBooking) {
            await supabase.from('bookings').update({ is_active: false }).eq('id', relatedBooking.id);
            setBookings(prev => prev.map(b => b.id === relatedBooking.id ? { ...b, is_active: false } : b));
        }
        const property = properties.find(p => p.id === app.property_id);
        if (property) updateProperty({ ...property, status: PropertyStatus.AVAILABLE });
    }

    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));

    if (status === ApplicationStatus.APPROVED || status === ApplicationStatus.REJECTED) {
      const { error: notifError } = await supabase.rpc('notify_application_update', {
        p_application_id: app.id,
        p_new_status: status
      });

      if (notifError) {

        console.error('Error creating application notification:', notifError);
      } else {
        fetchData();
      }
    }

    if (status === ApplicationStatus.APPROVED && app.status !== ApplicationStatus.APPROVED) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        const newBooking: Omit<Booking, 'id' | 'created_at' | 'updated_at'> = {
            property_id: app.property_id,
            renter_id: app.renter_id,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_active: true,
            occupants: []
        };

        await addBooking(newBooking);

        const property = properties.find(p => p.id === app.property_id);
        if (property) updateProperty({ ...property, status: PropertyStatus.OCCUPIED });
    }
  };

  const markAsRead = async (notificationId: string) => {

    setReadNotificationIds(prev => {
        if (!prev.includes(notificationId)) {
            return [...prev, notificationId];
        }
        return prev;
    });

    const dbNotif = dbNotifications.find(n => n.id === notificationId);
    if (dbNotif && currentUser) {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', currentUser.id);

            fetchData();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
  };

  const markAllAsRead = () => {
      const allIds = notifications.map(n => n.id);
      setReadNotificationIds(allIds);
  };

  const clearNotifications = async () => {
    if (!currentUser) return;

    try {

      const allCurrentIds = notifications.map(n => n.id);
      setDismissedNotificationIds(prev => Array.from(new Set([...prev, ...allCurrentIds])));

      const userNotifIds = dbNotifications
        .filter(n => n.user_id === currentUser.id)
        .map(n => n.id);

      const { error } = await supabase.from('notifications').delete().eq('user_id', currentUser.id);
      if (error) {
        const { error: adminError } = await supabaseAdmin.from('notifications').delete().eq('user_id', currentUser.id);
        if (adminError) {
          console.error('Error clearing notifications:', adminError);
          throw adminError;
        }
      }

      setDbNotifications(prev => prev.filter(n => n.user_id !== currentUser.id));
      setReadNotificationIds(prev => prev.filter(id => !userNotifIds.includes(id)));
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      properties, bills, bookings, users, applications,
      propertyCategories,
      readNotificationIds, notifications, unreadNotificationCount, isLoadingData,
      refreshData: fetchData,
      addProperty, updateProperty, deleteProperty,
      addPropertyCategory,
      payBill, updateBill, createBill,
      searchUserByEmail, fetchUserRole, updateUser, updateUserFields, deleteUser,
      requestVerification, verifyUser, verifyUserPhone, verifyUserEmail,
      submitApplication, processApplication,
      markAsRead, markAllAsRead, clearNotifications,
      addBooking, updateBooking
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
