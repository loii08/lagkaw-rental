
export enum UserRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  RENTER = 'RENTER'
}

export enum VerificationStatus {
  UNVERIFIED = 0,
  PENDING = 1,
  VERIFIED = 2,
  REJECTED = 3
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  phone?: string;
  status_type_id: VerificationStatus;
  is_verified: number;
  email_verified: number;
  phone_verified: number;
  id_document_url?: string;
  id_document_back_url?: string | null;
  id_type?: string | null;
  inactive: number;
  allow_reactivation_request?: number;
  created_at: string;
  updated_at: string;
}

export enum PropertyCategory {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  STUDIO = 'studio',
  ROOM = 'room',
  BEDSPACER = 'bedspacer',
  PAD = 'pad',
  BOARDING_HOUSE = 'boarding_house',
  OTHER = 'other'
}

export interface PropertyCategoryItem {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export enum PropertyStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance'
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  image: string;
  status: PropertyStatus;
  amenities: string[];
  category: string;
  available_date?: string;
  reserved_until?: string;
  current_renter_id?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  security_deposit?: number;
  monthly_rent?: number;
  created_at: string;
  updated_at: string;
}

export enum BillType {
  RENT = 'rent',
  UTILITY = 'utility',
  OTHER = 'other'
}

export enum BillStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

export interface Bill {
  id: string;
  property_id: string;
  renter_id: string;
  type: BillType;
  amount: number;
  due_date: string;
  status: BillStatus;
  paid_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Occupant {
  id: string;
  booking_id: string;
  name: string;
  relationship?: string;
  age?: number;
  contact?: string;
  notes?: string;
  dob?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  property_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes?: string;
  occupants?: Occupant[];
  created_at: string;
  updated_at: string;
}

export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  LEASE_SIGNED = 'lease_signed',
  ACTIVE = 'active'
}

export interface Application {
  id: string;
  property_id: string;
  renter_id: string;
  status: ApplicationStatus;
  message?: string;
  move_in_date?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent?: number;
  security_deposit?: number;
  documents?: ApplicationDocument[];
  owner_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: string;
  file_url: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'alert' | 'success' | 'info';
  link: string;
  timestamp: string;
  isRead: boolean;
  created_at?: string;
}

export interface DashboardStats {
  revenue: number;
  occupancyRate: number;
  pendingBills: number;
  totalProperties: number;
}
