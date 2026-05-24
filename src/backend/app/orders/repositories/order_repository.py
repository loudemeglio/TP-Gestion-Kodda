from sqlalchemy.orm import Session, joinedload

from app.orders.models import Invoice, Order, OrderItem, PaymentMethod


class OrderRepository:
    @staticmethod
    def get_by_id_for_user(db: Session, order_id: int, user_id: int) -> Order | None:
        return (
            db.query(Order)
            .options(joinedload(Order.items), joinedload(Order.invoice))
            .filter(Order.id == order_id, Order.user_id == user_id)
            .first()
        )

    @staticmethod
    def list_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[Order]:
        return (
            db.query(Order)
            .options(joinedload(Order.items))
            .filter(Order.user_id == user_id)
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create_order_with_items_and_invoice(
        db: Session,
        user_id: int,
        subtotal: float,
        total: float,
        items_data: list[dict],
        invoice_data: dict,
        payment_method: PaymentMethod,
    ) -> Order:
        order = Order(
            user_id=user_id,
            subtotal=subtotal,
            total=total,
            payment_method=payment_method,
        )
        db.add(order)
        db.flush()

        for item in items_data:
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=item["product_id"],
                    product_name=item["product_name"],
                    unit_price=item["unit_price"],
                    quantity=item["quantity"],
                    seller_id=item["seller_id"],
                )
            )

        db.add(
            Invoice(
                order_id=order.id,
                legal_name=invoice_data["legal_name"],
                tax_id=invoice_data["tax_id"],
                tax_condition=invoice_data["tax_condition"],
                billing_address=invoice_data["billing_address"],
                city=invoice_data.get("city"),
                province=invoice_data.get("province"),
                postal_code=invoice_data.get("postal_code"),
                billing_email=invoice_data["billing_email"],
            )
        )

        db.commit()
        db.refresh(order)
        return OrderRepository.get_by_id_for_user(db, order.id, user_id)
