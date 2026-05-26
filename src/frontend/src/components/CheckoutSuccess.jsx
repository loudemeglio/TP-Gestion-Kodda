import { useLocation, useParams } from 'react-router-dom';
import PurchaseOrderDetail from './orders/PurchaseOrderDetail';

export default function CheckoutSuccess() {
  const { orderId } = useParams();
  const location = useLocation();

  return (
    <PurchaseOrderDetail
      orderId={orderId}
      initialOrder={location.state?.order ?? null}
      showSuccessHero
    />
  );
}
