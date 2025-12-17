

import { Property, Bill, Booking, User, Application, Occupant } from '../types';


export const propertyToDB = (property: Omit<Property, 'id' | 'created_at' | 'updated_at'>) => ({
  owner_id: property.owner_id,
  title: property.title,
  description: property.description,
  address: property.address,
  price: property.price,
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  sqft: property.sqft,
  image: property.image,
  status: property.status,
  amenities: property.amenities,
  category: property.category
});


export const billToDB = (bill: Omit<Bill, 'id' | 'created_at' | 'updated_at'>) => ({
  property_id: bill.property_id,
  renter_id: bill.renter_id,
  type: bill.type,
  amount: bill.amount,
  due_date: bill.due_date,
  status: bill.status,
  paid_date: bill.paid_date,
  notes: bill.notes
});


export const bookingToDB = (booking: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'occupants'>) => ({
  property_id: booking.property_id,
  renter_id: booking.renter_id,
  start_date: booking.start_date,
  end_date: booking.end_date,
  is_active: booking.is_active,
  notes: booking.notes
});


export const applicationToDB = (application: Omit<Application, 'id' | 'created_at' | 'updated_at'>) => ({
  property_id: application.property_id,
  renter_id: application.renter_id,
  status: application.status,
  message: application.message,
  move_in_date: application.move_in_date
});


export const userToDB = (user: Omit<User, 'id' | 'email' | 'created_at' | 'updated_at'>) => ({
  full_name: user.full_name,
  avatar_url: user.avatar_url,
  role: user.role,
  phone: user.phone,
  status_type_id: user.status_type_id,
  is_verified: user.is_verified
});


export const occupantToDB = (occupant: Omit<Occupant, 'id' | 'created_at'> & { booking_id: string }) => ({
  booking_id: occupant.booking_id,
  name: occupant.name,
  relationship: occupant.relationship,
  age: occupant.age,
  contact: occupant.contact,
  notes: occupant.notes,
  dob: occupant.dob
});


export const rlsQueries = {

  getProperties: (role: string, userId?: string) => {
    const query = '*';

    return query;
  },


  getBills: (role: string, userId?: string) => {
    const query = '*';

    return query;
  },


  getBookings: (role: string, userId?: string) => {
    const query = '*, occupants(*)';

    return query;
  },


  getApplications: (role: string, userId?: string) => {
    const query = '*';

    return query;
  },


  getProfiles: (role: string, userId?: string) => {
    const query = '*';

    return query;
  }
};
