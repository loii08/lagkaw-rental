
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Bed, Bath, Square, X, CheckCircle, Clock, Phone, Mail, BadgeCheck, Shield, AlertTriangle } from 'lucide-react';
import { ApplicationStatus, UserRole, PropertyStatus, VerificationStatus } from '../types';
import { useApplicationVerification } from '../lib/verification';

export const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { properties, applications, submitApplication, users } = useData();
  const { currentUser } = useAuth();
  const { canApply } = useApplicationVerification();
  const property = properties.find(p => p.id === id);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fallbackImage = '/img/default-property-img.png';
  const initialImageSrc = useMemo(() => property?.image || fallbackImage, [property?.image]);
  const [imgSrc, setImgSrc] = useState(initialImageSrc);

  useEffect(() => {
    setImgSrc(initialImageSrc);
  }, [initialImageSrc]);

  if (!property) return <div className="p-8">Property not found.</div>;

  const owner = users.find(u => u.id === property.owner_id);

  const existingApplication = currentUser
    ? [...applications]
        .filter(a => a.property_id === property.id && a.renter_id === currentUser.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null
    : null;
  const isOwner = currentUser?.id === property.owner_id;
  const isRented = property.status === PropertyStatus.OCCUPIED;

  const isVerified = currentUser?.is_verified === 1;
  const hasPhone = !!currentUser?.phone;
  const applyVerification = canApply();
  const isEmailVerified = Number((currentUser as any)?.email_verified ?? 0) === 1;
  const canApplyAction = applyVerification.allowed && isVerified && hasPhone && isEmailVerified;
  const requirementsMessage = !applyVerification.allowed ? applyVerification.message : '';

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!applyVerification.allowed) {
        setError(applyVerification.message);
        return;
    }

    if (!hasPhone) {
        setError('Please add a valid phone number to your profile before applying.');
        return;
    }

    Promise.resolve(submitApplication({
        property_id: property.id,
        renter_id: currentUser.id,
        status: ApplicationStatus.PENDING,
        message: message,
        move_in_date: new Date().toISOString().split('T')[0]
    }))
      .then(() => {
          setIsApplyModalOpen(false);
          setMessage('');
          setError('');
      })
      .catch((err: any) => {
          setError(err?.message || 'Failed to submit application. Please try again.');
      });
  };

  const renderActionButton = () => {
      if (!currentUser || isOwner) return null;
      if (currentUser.role !== UserRole.RENTER) return null;

      if (existingApplication) {
          if (existingApplication.status === ApplicationStatus.APPROVED) {
              return (
                  <button disabled className="w-full md:w-auto bg-green-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-default opacity-90">
                      <CheckCircle size={20} /> Lease Approved
                  </button>
              );
          } else if (existingApplication.status === ApplicationStatus.REJECTED) {
             return (
                  <button disabled className="w-full md:w-auto bg-red-100 text-red-500 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-default">
                      <X size={20} /> Application Declined
                  </button>
              );
          } else {
               return (
                  <button disabled className="w-full md:w-auto bg-amber-100 text-amber-700 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-default border border-amber-200">
                      <Clock size={20} /> Application Pending
                  </button>
              );
          }
      }

      if (isRented) {
           return (
              <button disabled className="w-full md:w-auto bg-gray-100 text-gray-500 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                  Off Market
              </button>
          );
      }

      return (
          <button
            onClick={() => {
                setError('');
                setIsApplyModalOpen(true);
            }}
            className="w-full md:w-auto bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#6D4C2D] transition shadow-lg shadow-beige flex items-center justify-center gap-2"
          >
              Apply to Rent
          </button>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] md:h-screen overflow-hidden bg-[#FDFBF7] relative">
      {}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8 relative no-scrollbar">

        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-8 max-w-5xl mx-auto">
            <div className="h-64 md:h-96 relative">
                <img
                  src={imgSrc}
                  alt={property.title}
                  onError={() => setImgSrc(fallbackImage)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-dark shadow-sm">
                    ₱{property.price}/month
                </div>
            </div>

            <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-dark mb-2">{property.title}</h1>
                        <div className="flex items-center text-gray-500">
                            <MapPin size={18} className="mr-2" />
                            {property.address}
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 capitalize">
                            {String(property.category || 'other').replaceAll('_', ' ')}
                          </span>
                        </div>
                        {owner && (
                          <div className="text-sm text-gray-500 mt-1">
                            Owned by <span className="font-semibold text-gray-700">{owner.full_name}</span>
                          </div>
                        )}
                    </div>
                    {renderActionButton()}
                </div>

                <div className="flex gap-4 md:gap-8 border-y border-gray-100 py-6 mb-6 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 text-gray-700 whitespace-nowrap"><Bed size={24} className="text-primary" /> <span className="font-semibold">{property.bedrooms}</span> Beds</div>
                    <div className="flex items-center gap-2 text-gray-700 whitespace-nowrap"><Bath size={24} className="text-primary" /> <span className="font-semibold">{property.bathrooms}</span> Bathrooms</div>
                    <div className="flex items-center gap-2 text-gray-700 whitespace-nowrap"><Square size={24} className="text-primary" /> <span className="font-semibold">{property.sqft}</span> Sqft</div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">About this home</h3>
                    <p className="text-gray-600 leading-relaxed">
                        {property.description}
                    </p>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                        {property.amenities.map(a => (
                            <span key={a} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">{a}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {}
      {isApplyModalOpen && currentUser && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Apply for {property.title}</h2>
                      <button onClick={() => setIsApplyModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                  </div>

                  {}
                  <div className="bg-beige/30 border border-beige rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-primary text-sm">Profile Details to be Shared</h3>
                        <Link to="/profile?tab=profile" className="text-xs font-bold text-primary underline">Edit Profile</Link>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                          <img src={currentUser.avatar_url || '/img/default-profile.png'} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                          <div>
                              <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                                  {currentUser.full_name}
                                  {currentUser.is_verified === 1 && <BadgeCheck size={14} className="text-primary fill-beige" />}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">{currentUser.role.toLowerCase()}</p>
                          </div>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-2"><Mail size={12}/> {currentUser.email}</div>
                          <div className="flex items-center gap-2">
                                <Phone size={12}/>
                                {currentUser.phone ? (
                                    <span>{currentUser.phone}</span>
                                ) : (
                                    <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={10}/> Missing Phone Number</span>
                                )}
                          </div>
                          <div className="flex items-center gap-2">
                              <Shield size={12}/>
                              {currentUser.is_verified === 1 ? (
                                  <span className="text-green-600 font-medium">Verified Applicant</span>
                              ) : (
                                  <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={10}/> Unverified Account</span>
                              )}
                          </div>
                      </div>
                  </div>

                  {}
                  {(!canApplyAction || !!error) && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-700 animate-in slide-in-from-top-2">
                          <AlertTriangle className="shrink-0" size={20} />
                          <div className="text-sm">
                              <p className="font-bold">Application requirements missing</p>
                              <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                                  {!isEmailVerified && <li>Email verification (admin approval) required</li>}
                                  {!isVerified && <li>Identity verification required</li>}
                                  {!hasPhone && <li>Phone number required</li>}
                              </ul>
                              <p className="mt-2 text-xs">Please update your <Link to="/profile?tab=profile" className="underline font-bold">Profile Settings</Link>.</p>
                              {!!requirementsMessage && <p className="mt-2 text-xs font-bold">{requirementsMessage}</p>}
                              {!!error && <p className="mt-2 text-xs font-bold">{error}</p>}
                          </div>
                      </div>
                  )}

                  <form onSubmit={handleApply} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Message to Owner</label>
                          <textarea
                              required
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 focus:ring-2 focus:ring-beige outline-none resize-none disabled:bg-gray-50 disabled:text-gray-400"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Introduce yourself and share why you'd be a great tenant..."
                              disabled={!canApplyAction}
                          ></textarea>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                          <button
                              type="button"
                              onClick={() => setIsApplyModalOpen(false)}
                              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          >
                              Cancel
                          </button>
                          <button
                              type="submit"
                              disabled={!canApplyAction}
                              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-[#6D4C2D] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                              {!canApplyAction ? <X size={16}/> : <CheckCircle size={16}/>}
                              Submit Application
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
