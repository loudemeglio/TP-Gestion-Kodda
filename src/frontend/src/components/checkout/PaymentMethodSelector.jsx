import PaymentMethodDetailsForm from './PaymentMethodDetailsForm';
import { PAYMENT_METHODS } from './paymentMethods';

export default function PaymentMethodSelector({
  value,
  onChange,
  paymentDetails,
  onPaymentDetailsChange,
  disabled = false,
}) {
  return (
    <fieldset className="kodda-payment-methods" disabled={disabled}>
      <legend className="kodda-profile-edit-section-title">Medio de pago</legend>
      <p className="kodda-profile-edit-section-desc">
        Seleccioná cómo querés pagar tu compra.
      </p>
      <div className="kodda-payment-methods-list">
        {PAYMENT_METHODS.map(({ value: methodValue, label }) => (
          <label
            key={methodValue}
            className={`kodda-payment-method-option${
              value === methodValue ? ' kodda-payment-method-option--selected' : ''
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              value={methodValue}
              checked={value === methodValue}
              onChange={() => onChange(methodValue)}
              disabled={disabled}
            />
            <span className="kodda-payment-method-option-label">{label}</span>
          </label>
        ))}
      </div>

      {value ? (
        <PaymentMethodDetailsForm
          method={value}
          details={paymentDetails}
          onChange={onPaymentDetailsChange}
          disabled={disabled}
        />
      ) : null}
    </fieldset>
  );
}
