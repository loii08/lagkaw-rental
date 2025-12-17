import React, { useEffect, useMemo, useState } from 'react';
import { Property, PropertyStatus } from '../types';
import { MapPin, Bed, Bath, Square, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PropertyCardProps {
  property: Property;
  showStatus?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, showStatus = false }) => {
  const fallbackImage = '/img/default-property-img.png';
  const initialImageSrc = useMemo(() => property.image || fallbackImage, [property.image]);
  const [imgSrc, setImgSrc] = useState(initialImageSrc);

  useEffect(() => {
    setImgSrc(initialImageSrc);
  }, [initialImageSrc]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={imgSrc}
          alt={property.title}
          onError={() => setImgSrc(fallbackImage)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {showStatus && (
            <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm
                ${property.status === PropertyStatus.AVAILABLE ? 'bg-green-100 text-green-700' :
                  property.status === PropertyStatus.OCCUPIED ? 'bg-blue-100 text-blue-700' : 'bg-secondary/30 text-primary'}`}>
                {property.status}
            </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-semibold text-lg truncate">{property.title}</h3>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center text-gray-500 text-sm mb-3">
            <MapPin size={16} className="mr-1" />
            <span className="truncate">{property.address}</span>
        </div>

        <div className="flex justify-between items-center text-gray-700 text-sm mb-4">
            <div className="flex items-center gap-1"><Bed size={16} /> {property.bedrooms} Beds</div>
            <div className="flex items-center gap-1"><Bath size={16} /> {property.bathrooms} Baths</div>
            <div className="flex items-center gap-1"><Square size={16} /> {property.sqft} sqft</div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div>
                <span className="text-2xl font-bold text-primary">₱{property.price.toLocaleString()}</span>
                <span className="text-gray-500 text-sm">/mo</span>
            </div>
            <Link to={`/property/${property.id}`} className="p-2 bg-gray-50 text-primary rounded-full hover:bg-beige/30 transition-colors">
                <ArrowRight size={20} />
            </Link>
        </div>
      </div>
    </div>
  );
};