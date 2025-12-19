import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ApplicationStatus, Application, User, Property } from '../types';
import { 
  User as UserIcon, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare,
  Eye,
  Download,
  Calendar as CalendarIcon
} from 'lucide-react';

interface ApplicationManagementProps {
  property: Property;
  onStatusUpdate: () => void;
}

export const ApplicationManagement: React.FC<ApplicationManagementProps> = ({ 
  property, 
  onStatusUpdate 
}) => {
  const { currentUser } = useAuth();
  const { applications, users, updateApplication, updateProperty } = useData();
  
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get applications for this property
  const propertyApplications = useMemo(() => {
    return applications
      .filter(app => app.property_id === property.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications, property.id]);

  // Get applicant info
  const getApplicantInfo = (renterId: string): User | undefined => {
    return users.find(user => user.id === renterId);
  };

  // Handle application status updates
  const handleApproveApplication = async (application: Application) => {
    if (!currentUser) return;
    
    setActionLoading(application.id);
    try {
      // Update application status to approved
      await updateApplication({
        ...application,
        status: ApplicationStatus.APPROVED,
        updated_at: new Date().toISOString()
      });

      // Update property status to reserved
      await updateProperty({
        ...property,
        status: 'reserved' as any,
        reserved_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days reservation
        updated_at: new Date().toISOString()
      });

      // Send notification to applicant (would integrate with notification system)
      console.log(`Application approved for ${application.renter_id}`);
      
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to approve application:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectApplication = async (application: Application, reason: string) => {
    if (!currentUser) return;
    
    setActionLoading(application.id);
    try {
      await updateApplication({
        ...application,
        status: ApplicationStatus.REJECTED,
        owner_notes: reason,
        updated_at: new Date().toISOString()
      });

      // Send notification to applicant
      console.log(`Application rejected for ${application.renter_id}: ${reason}`);
      
      onStatusUpdate();
    } catch (error) {
      console.error('Failed to reject application:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetLeaseStartDate = async (application: Application, startDate: string) => {
    if (!currentUser) return;
    
    setActionLoading(application.id);
    try {
      await updateApplication({
        ...application,
        status: ApplicationStatus.LEASE_SIGNED,
        lease_start_date: startDate,
        updated_at: new Date().toISOString()
      });

      // Update property status to occupied
      await updateProperty({
        ...property,
        status: 'occupied' as any,
        current_renter_id: application.renter_id,
        lease_start_date: startDate,
        lease_end_date: new Date(new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year lease
        updated_at: new Date().toISOString()
      });

      onStatusUpdate();
    } catch (error) {
      console.error('Failed to set lease start date:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING:
        return 'bg-amber-100 text-amber-800';
      case ApplicationStatus.UNDER_REVIEW:
        return 'bg-blue-100 text-blue-800';
      case ApplicationStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case ApplicationStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case ApplicationStatus.LEASE_SIGNED:
        return 'bg-purple-100 text-purple-800';
      case ApplicationStatus.ACTIVE:
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING:
        return <Clock size={16} />;
      case ApplicationStatus.UNDER_REVIEW:
        return <Eye size={16} />;
      case ApplicationStatus.APPROVED:
        return <CheckCircle size={16} />;
      case ApplicationStatus.REJECTED:
        return <XCircle size={16} />;
      case ApplicationStatus.LEASE_SIGNED:
        return <FileText size={16} />;
      case ApplicationStatus.ACTIVE:
        return <CheckCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  if (propertyApplications.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <FileText className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
        <p className="text-gray-600">Applications for this property will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Applications ({propertyApplications.length})
      </h3>
      
      {propertyApplications.map((application) => {
        const applicant = getApplicantInfo(application.renter_id);
        
        return (
          <div key={application.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Application Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon size={20} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {applicant?.full_name || 'Unknown Applicant'}
                    </h4>
                    <p className="text-sm text-gray-600">{applicant?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(application.status)}`}>
                    {getStatusIcon(application.status)}
                    {application.status.replace('_', ' ').toUpperCase()}
                  </span>
                  
                  <button
                    onClick={() => {
                      setSelectedApplication(application);
                      setShowDetails(true);
                    }}
                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Eye size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Application Summary */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Applied Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(application.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                {application.monthly_income && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Monthly Income</p>
                    <p className="font-medium text-gray-900">
                      ${application.monthly_income.toFixed(2)}
                    </p>
                  </div>
                )}
                
                {application.move_in_date && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Desired Move-in</p>
                    <p className="font-medium text-gray-900">
                      {new Date(application.move_in_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {application.lease_start_date && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Lease Start Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(application.lease_start_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {application.message && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Message to Owner</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    "{application.message}"
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {application.status === ApplicationStatus.PENDING && (
                  <>
                    <button
                      onClick={() => handleApproveApplication(application)}
                      disabled={actionLoading === application.id}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === application.id ? 'Processing...' : 'Approve'}
                    </button>
                    
                    <button
                      onClick={() => {
                        const reason = prompt('Please provide reason for rejection:');
                        if (reason) handleRejectApplication(application, reason);
                      }}
                      disabled={actionLoading === application.id}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === application.id ? 'Processing...' : 'Reject'}
                    </button>
                  </>
                )}

                {application.status === ApplicationStatus.APPROVED && (
                  <button
                    onClick={() => {
                      const date = prompt('Set lease start date (YYYY-MM-DD):');
                      if (date) handleSetLeaseStartDate(application, date);
                    }}
                    disabled={actionLoading === application.id}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === application.id ? 'Processing...' : 'Set Lease Start Date'}
                  </button>
                )}

                {application.documents && application.documents.length > 0 && (
                  <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    <Download size={16} className="mr-2" />
                    View Documents
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Application Details Modal */}
      {showDetails && selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          applicant={getApplicantInfo(selectedApplication.renter_id)}
          property={property}
          onClose={() => {
            setShowDetails(false);
            setSelectedApplication(null);
          }}
          onStatusUpdate={onStatusUpdate}
        />
      )}
    </div>
  );
};

// Application Details Modal Component
interface ApplicationDetailsModalProps {
  application: Application;
  applicant?: User;
  property: Property;
  onClose: () => void;
  onStatusUpdate: () => void;
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  application,
  applicant,
  property,
  onClose,
  onStatusUpdate
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Application Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Applicant Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Applicant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Name</p>
                <p className="font-medium text-gray-900">{applicant?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-900">{applicant?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="font-medium text-gray-900">{applicant?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Verification Status</p>
                <p className="font-medium text-gray-900">
                  {applicant?.is_verified === 1 ? 'Verified' : 'Not Verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h3>
            <div className="space-y-3">
              {application.message && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Message to Owner</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    "{application.message}"
                  </p>
                </div>
              )}
              
              {application.monthly_income && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Monthly Income</p>
                  <p className="font-medium text-gray-900">${application.monthly_income.toFixed(2)}</p>
                </div>
              )}
              
              {application.move_in_date && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Desired Move-in Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(application.move_in_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Application Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  application.status === ApplicationStatus.PENDING ? 'bg-amber-100 text-amber-800' :
                  application.status === ApplicationStatus.APPROVED ? 'bg-green-100 text-green-800' :
                  application.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {application.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Documents */}
          {application.documents && application.documents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
              <div className="space-y-2">
                {application.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.document_type}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 transition-colors">
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
