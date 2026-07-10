import { CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Toast() {
  const { toastMessage } = useCart();

  if (!toastMessage) return null;

  return (
    <div className="toast-container animate-fade-in">
      <CheckCircle className="text-primary" size={24} />
      <span className="font-medium text-sm">{toastMessage}</span>
    </div>
  );
}
