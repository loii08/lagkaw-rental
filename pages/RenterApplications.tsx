import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ApplicationStatus } from '../types';
import { Calendar, ExternalLink } from 'lucide-react';

export const RenterApplications = () => {
  const { currentUser } = useAuth();
  const { applications, properties } = useData();

  const fallbackImage = '/img/default-property-img.png';

  const myApplications = useMemo(() => {
    if (!currentUser) return [];

    const latestByProperty = new Map<string, any>();
    const sorted = [...applications]
      .filter(a => a.renter_id === currentUser.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    sorted.forEach(app => {
      if (!latestByProperty.has(app.property_id)) {
        latestByProperty.set(app.property_id, app);
      }
    });

    return Array.from(latestByProperty.values());
  }, [applications, currentUser]);

  const [imageErrorIds, setImageErrorIds] = useState<Record<string, boolean>>({});

  return (
    <div className="p-4 md:p-8 pb-16">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-dark">My Applications</h1>
        <p className="text-gray-500">Track the status of properties you applied for.</p>
      </header>

      {myApplications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-medium">No applications yet.</p>
          <Link to="/properties" className="text-primary font-bold hover:underline">
            Browse properties
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {myApplications.map(app => {
            const prop = properties.find(p => p.id === app.property_id);
            const imgSrc = imageErrorIds[app.id] ? fallbackImage : (prop?.image || fallbackImage);

            return (
              <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-44 relative">
                  <img
                    src={imgSrc}
                    alt={prop?.title || 'Property'}
                    onError={() => setImageErrorIds(prev => ({ ...prev, [app.id]: true }))}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${app.status === ApplicationStatus.APPROVED ? 'bg-green-100 text-green-700' :
                        app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-700' :
                        app.status === ApplicationStatus.CANCELLED ? 'bg-gray-100 text-gray-600' :
                        'bg-amber-100 text-amber-700'}`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-dark truncate">{prop?.title || 'Unknown Property'}</h3>
                      <p className="text-sm text-gray-500 truncate">{prop?.address || 'Address unavailable'}</p>
                    </div>
                    {prop && (
                      <Link
                        to={`/property/${prop.id}`}
                        className="p-2 rounded-xl bg-gray-50 hover:bg-beige/30 text-primary transition"
                        title="View property"
                      >
                        <ExternalLink size={18} />
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                    <Calendar size={14} />
                    Applied {app.created_at?.slice(0, 10)}
                  </div>

                  <div className="mt-3 text-sm text-gray-700 line-clamp-3">
                    “{app.message}”
                  </div>

                  {prop && (
                    <div className="mt-5">
                      <Link
                        to={`/property/${prop.id}`}
                        className="block text-center w-full bg-primary text-white rounded-xl py-2.5 font-bold hover:bg-[#6D4C2D] transition"
                      >
                        View Details
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
