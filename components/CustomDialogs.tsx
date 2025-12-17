import React from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';


export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-fadeIn">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all animate-scaleIn">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={32} className="text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                        {title}
                    </h3>
                    <p className="text-gray-600 text-center mb-6 leading-relaxed">
                        {message}
                    </p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export interface InfoDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'error' | 'success';
    onClose: () => void;
    buttonText?: string;
}

export const InfoDialog: React.FC<InfoDialogProps> = ({
    isOpen,
    title,
    message,
    type,
    onClose,
    buttonText = 'OK'
}) => {
    if (!isOpen) return null;

    const getIconAndColor = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <CheckCircle size={32} className="text-green-600" />,
                    bgColor: 'bg-green-100',
                    animation: 'animate-bounceIn'
                };
            case 'error':
                return {
                    icon: <XCircle size={32} className="text-red-600" />,
                    bgColor: 'bg-red-100',
                    animation: 'animate-shake'
                };
            case 'info':
            default:
                return {
                    icon: <AlertCircle size={32} className="text-blue-600" />,
                    bgColor: 'bg-blue-100',
                    animation: 'animate-pulse'
                };
        }
    };

    const { icon, bgColor, animation } = getIconAndColor();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-fadeIn">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all animate-scaleIn">
                <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mb-4 ${animation}`}>
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                        {title}
                    </h3>
                    <p className="text-gray-600 text-center mb-6 leading-relaxed">
                        {message}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
};


export const useDialogs = () => {
    const [confirmDialog, setConfirmDialog] = React.useState<Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>>({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel'
    });

    const [infoDialog, setInfoDialog] = React.useState<Omit<InfoDialogProps, 'onClose'>>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        buttonText: 'OK'
    });

    const showConfirm = React.useCallback((
        title: string,
        message: string,
        onConfirm: () => void | Promise<void>,
        onCancel?: () => void,
        options?: { confirmText?: string; cancelText?: string }
    ) => {
        return new Promise<boolean>((resolve) => {
            setConfirmDialog({
                isOpen: true,
                title,
                message,
                confirmText: options?.confirmText || 'Confirm',
                cancelText: options?.cancelText || 'Cancel'
            });

            const handleConfirm = async () => {
                try {
                    await onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                } catch {

                    resolve(false);
                }
            };

            const handleCancel = () => {
                onCancel?.();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                resolve(false);
            };


            (window as any).__confirmHandlers = { handleConfirm, handleCancel };
        });
    }, []);

    const showInfo = React.useCallback((
        title: string,
        message: string,
        type: 'info' | 'error' | 'success' = 'info',
        buttonText?: string
    ) => {
        setInfoDialog({
            isOpen: true,
            title,
            message,
            type,
            buttonText: buttonText || 'OK'
        });


        if (type === 'success') {
            setTimeout(() => {
                setInfoDialog(prev => ({ ...prev, isOpen: false }));
            }, 3000);
        }
    }, []);

    const closeInfo = React.useCallback(() => {
        setInfoDialog(prev => ({ ...prev, isOpen: false }));
    }, []);

    const ConfirmComponent = React.useCallback(() => {
        const handlers = (window as any).__confirmHandlers;
        return (
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                cancelText={confirmDialog.cancelText}
                onConfirm={handlers?.handleConfirm || (() => {})}
                onCancel={handlers?.handleCancel || (() => {})}
            />
        );
    }, [confirmDialog]);

    const InfoComponent = React.useCallback(() => (
        <InfoDialog
            isOpen={infoDialog.isOpen}
            title={infoDialog.title}
            message={infoDialog.message}
            type={infoDialog.type}
            buttonText={infoDialog.buttonText}
            onClose={closeInfo}
        />
    ), [infoDialog, closeInfo]);

    return {
        showConfirm,
        showInfo,
        closeInfo,
        ConfirmComponent,
        InfoComponent
    };
};


const dialogStyles = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes bounceIn {
    0% {
        opacity: 0;
        transform: scale(0.3);
    }
    50% {
        transform: scale(1.05);
    }
    70% {
        transform: scale(0.9);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
    20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
}

.animate-scaleIn {
    animation: scaleIn 0.3s ease-out;
}

.animate-bounceIn {
    animation: bounceIn 0.6s ease-out;
}

.animate-shake {
    animation: shake 0.5s ease-out;
}

.animate-pulse {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
`;


export const addDialogStyles = () => {
    if (!document.getElementById('custom-dialog-styles')) {
        const style = document.createElement('style');
        style.id = 'custom-dialog-styles';
        style.textContent = dialogStyles;
        document.head.appendChild(style);
    }
};
