import { useApp } from '../context/AppContext';

export function Toast() {
    const { toasts } = useApp();

    return (
        <div className="toast-container" id="toastContainer">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    {toast.message}
                </div>
            ))}
        </div>
    );
}
