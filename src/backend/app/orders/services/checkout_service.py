from sqlalchemy.orm import Session

from app.cart.repositories.cart_repository import CartRepository
from app.orders.models import Order, PaymentMethod
from app.orders.repositories.order_repository import OrderRepository
from app.orders.schemas import InvoiceDTO, OrderDetailDTO, OrderItemDTO, OrderSummaryDTO
from app.ratings.services.rating_service import RatingService
from app.users.repositories.billing_repository import BillingRepository
from app.users.schemas import BillingInfoUpsertDTO
from app.users.services.billing_service import BillingService


class CheckoutService:
    @staticmethod
    def _order_to_detail(order: Order, db: Session | None = None) -> OrderDetailDTO:
        items = [
            OrderItemDTO(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product_name,
                unit_price=item.unit_price,
                quantity=item.quantity,
                seller_id=item.seller_id,
                line_total=round(item.unit_price * item.quantity, 2),
            )
            for item in order.items
        ]
        payment = order.payment_method
        if isinstance(payment, PaymentMethod):
            payment_value = payment.value
        else:
            payment_value = str(payment)

        rated_seller_ids: list[int] = []
        if db is not None:
            rated_seller_ids = RatingService.rated_seller_ids_for_order(db, order.id, order.user_id)

        return OrderDetailDTO(
            id=order.id,
            user_id=order.user_id,
            status=order.status.value,
            subtotal=order.subtotal,
            total=order.total,
            payment_method=payment_value,
            created_at=order.created_at,
            items=items,
            invoice=InvoiceDTO.model_validate(order.invoice),
            rated_seller_ids=rated_seller_ids,
        )

    @staticmethod
    def checkout(
        db: Session,
        user_id: int,
        payment_method: PaymentMethod,
        billing_override: BillingInfoUpsertDTO | None = None,
    ) -> OrderDetailDTO:
        cart_items = CartRepository.get_by_user(db, user_id)
        if not cart_items:
            raise ValueError("Tu carrito está vacío.")

        if billing_override is not None:
            BillingService.upsert_own_billing(db, user_id, billing_override)

        billing_row = BillingRepository.get_by_user_id(db, user_id)
        if not billing_row:
            raise ValueError(
                "Completá tus datos de facturación antes de confirmar la compra."
            )

        items_data: list[dict] = []
        subtotal = 0.0

        for cart_item in cart_items:
            product = cart_item.product
            if not product:
                raise ValueError("Hay un producto en tu carrito que ya no existe.")
            if product.is_paused:
                raise ValueError(f'"{product.name}" no está disponible para la compra.')
            if product.seller_id == user_id:
                raise ValueError("No podés comprar tus propias publicaciones.")
            if cart_item.quantity > product.stock:
                raise ValueError(
                    f'Stock insuficiente para "{product.name}" (disponible: {product.stock}).'
                )

            line_total = product.price * cart_item.quantity
            subtotal += line_total
            items_data.append(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "unit_price": product.price,
                    "quantity": cart_item.quantity,
                    "seller_id": product.seller_id,
                    "stock_delta": cart_item.quantity,
                    "product": product,
                }
            )

        subtotal = round(subtotal, 2)
        total = subtotal

        invoice_data = {
            "legal_name": billing_row.legal_name,
            "tax_id": billing_row.tax_id,
            "tax_condition": billing_row.tax_condition,
            "billing_address": billing_row.billing_address,
            "city": billing_row.city,
            "province": billing_row.province,
            "postal_code": billing_row.postal_code,
            "billing_email": billing_row.billing_email,
        }

        for entry in items_data:
            entry["product"].stock -= entry["stock_delta"]

        repo_items = [
            {
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "unit_price": item["unit_price"],
                "quantity": item["quantity"],
                "seller_id": item["seller_id"],
            }
            for item in items_data
        ]

        order = OrderRepository.create_order_with_items_and_invoice(
            db,
            user_id,
            subtotal,
            total,
            repo_items,
            invoice_data,
            payment_method,
        )

        CartRepository.clear(db, user_id)

        return CheckoutService._order_to_detail(order, db)

    @staticmethod
    def get_order(db: Session, user_id: int, order_id: int) -> OrderDetailDTO:
        order = OrderRepository.get_by_id_for_user(db, order_id, user_id)
        if not order:
            raise LookupError("Orden no encontrada.")
        return CheckoutService._order_to_detail(order, db)

    @staticmethod
    def list_my_orders(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[OrderSummaryDTO]:
        orders = OrderRepository.list_by_user(db, user_id, skip, limit)
        return [
            OrderSummaryDTO(
                id=o.id,
                status=o.status.value,
                total=o.total,
                payment_method=o.payment_method.value
                if isinstance(o.payment_method, PaymentMethod)
                else str(o.payment_method),
                created_at=o.created_at,
                item_count=sum(i.quantity for i in o.items),
            )
            for o in orders
        ]
