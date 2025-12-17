import React, { useState } from 'react';
import { XCircle, Send } from 'lucide-react';

export interface RejectionDialogProps {
    isOpen: boolean;
    userName: string;
    onSubmit: (reason: string) => void;
    onCancel: () => void;
}

export const RejectionDialog: React.FC<RejectionDialogProps> = ({
    isOpen,
    userName,
    onSubmit,
    onCancel
}) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!reason.trim()) {
            return;
        }

        setIsSubmitting(true);
        await onSubmit(reason.trim());
        setIsSubmitting(false);
        setReason('');
    };

    const handleClose = () => {
        setReason('');
        setIsSubmitting(false);
        onCancel();
    };

    const commonReasons = [
        'ID document is unclear or blurry',
        'ID document appears to be altered or fake',
        'Information on ID does not match profile',
        'ID document is expired',
        'Inappropriate or offensive content',
        'Other (please specify below)'
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all animate-scaleIn">
                <div className="flex flex-col">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-3">
                            <XCircle size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                            Reject Verification
                        </h3>
                    </div>

                    <p className="text-gray-600 mb-4">
                        Please provide a reason for rejecting <strong>{userName}</strong>'s verification:
                    </p>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Common reasons:
                        </label>
                        <div className="space-y-2">
                            {commonReasons.map((commonReason, index) => (
                                <button
                                    key={index}
                                    onClick={() => setReason(commonReason)}
                                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    {commonReason}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional details (optional):
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Provide specific details about why this verification is being rejected..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!reason.trim() || isSubmitting}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Send size={16} />
                            )}
                            Reject Verification
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
