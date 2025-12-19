import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ApplicationStatus, Property, ApplicationDocument } from '../types';
import { Upload, FileText, Calendar, AlertCircle, CheckCircle, X } from 'lucide-react';
import PesoSign from './PesoSign';

interface RentalApplicationProps {
  property: Property;
  onClose: () => void;
  onSuccess: () => void;
}

export const RentalApplication: React.FC<RentalApplicationProps> = ({ property, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const { createApplication } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    message: '',
    move_in_date: '',
    agree_to_terms: false
  });
  
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newDocuments = files.map((file: File) => ({
      id: Math.random().toString(36).substr(2, 9),
      application_id: '',
      document_type: file.name,
      file_url: URL.createObjectURL(file),
      uploaded_at: new Date().toISOString(),
      status: 'pending'
    }));
    
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    
    if (!formData.move_in_date) {
      newErrors.move_in_date = 'Move-in date is required';
    }
    
    if (!formData.agree_to_terms) {
      newErrors.agree_to_terms = 'You must agree to terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const application = {
        property_id: property.id,
        renter_id: currentUser!.id,
        status: ApplicationStatus.PENDING,
        message: formData.message,
        move_in_date: formData.move_in_date,
        documents: documents.map(doc => ({
          application_id: '', // Will be set after application is created
          document_type: doc.document_type,
          file_url: doc.file_url,
          uploaded_at: doc.uploaded_at,
          status: doc.status
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await createApplication(application);
      onSuccess();
      onClose();
    } catch (error) {
      setErrors({ submit: 'Failed to submit application. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPropertyAvailable = property.status === 'available' && !property.reserved_until;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Rental Application</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Property Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-4">
              <img
                src={property.image || '/img/default-property-img.png'}
                alt={property.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{property.title}</h3>
                <p className="text-sm text-gray-600">{property.address}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-2xl font-bold text-primary">₱{property.price}/month</span>
                  <span className="text-sm text-gray-500">
                    {property.bedrooms} bed • {property.bathrooms} bath • {property.sqft} sqft
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Status */}
        <div className="p-6">
          {!isPropertyAvailable ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="text-amber-600" size={20} />
              <span className="text-amber-800 font-medium">This property is not available for rent</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
              <span className="text-green-800 font-medium">Property is available for application</span>
            </div>
          )}
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Property Owner
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                rows={4}
                placeholder="Introduce yourself, explain why you'd be a great tenant, and any relevant details..."
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desired Move-in Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={formData.move_in_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, move_in_date: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {errors.move_in_date && (
                <p className="mt-1 text-sm text-red-600">{errors.move_in_date}</p>
              )}
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supporting Documents</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <div className="text-center">
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 mb-2">Upload supporting documents</p>
                <p className="text-sm text-gray-500">
                  Upload ID, proof of income, employment verification, or other relevant documents
                </p>
                
                {documents.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Uploaded Documents:</p>
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.document_type}</p>
                            <p className="text-xs text-gray-500">Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-primary text-white rounded-lg py-3 font-medium hover:bg-primary/90 transition-colors"
                >
                  <Upload size={20} className="mr-2" />
                  Upload Documents
                </button>
              </div>
            </div>
          </div>

          {/* Terms and Submit */}
          <div className="space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.agree_to_terms}
                onChange={(e) => setFormData(prev => ({ ...prev, agree_to_terms: e.target.checked }))}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary/20 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                I agree to the terms and conditions and privacy policy
              </span>
            </label>
            {errors.agree_to_terms && (
              <p className="mt-1 text-sm text-red-600">{errors.agree_to_terms}</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !isPropertyAvailable}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
