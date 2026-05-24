import { formatCardNumber, formatExpiry } from './paymentMethods';
import WalletQrPayment from './WalletQrPayment';

function Field({ label, children, hint, className = '' }) {
  return (
    <label className={`kodda-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {hint ? <span className="kodda-field-hint">{hint}</span> : null}
    </label>
  );
}

function CardForm({ data, onChange, disabled, isCredit }) {
  return (
    <div className="kodda-payment-details-form">
      <p className="kodda-payment-details-lead">
        {isCredit
          ? 'Completá los datos de tu tarjeta de crédito.'
          : 'Completá los datos de tu tarjeta de débito.'}
      </p>
      <div className="kodda-payment-details-grid">
        <Field label="Titular de la tarjeta *" className="kodda-payment-details-grid-full">
          <input
            className="kodda-input"
            type="text"
            name="card_holder"
            value={data.card_holder}
            onChange={onChange}
            required
            disabled={disabled}
            maxLength={120}
            placeholder="Como figura en la tarjeta"
          />
        </Field>
        <Field label="Número de tarjeta *" className="kodda-payment-details-grid-full">
          <input
            className="kodda-input"
            type="text"
            name="card_number"
            value={data.card_number}
            onChange={onChange}
            required
            disabled={disabled}
            inputMode="numeric"
            autoComplete="cc-number"
            maxLength={23}
            placeholder="0000 0000 0000 0000"
          />
        </Field>
        <Field label="Vencimiento *" hint="MM/AA">
          <input
            className="kodda-input"
            type="text"
            name="expiry"
            value={data.expiry}
            onChange={onChange}
            required
            disabled={disabled}
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={5}
            placeholder="12/28"
          />
        </Field>
        <Field label="Código de seguridad *">
          <input
            className="kodda-input"
            type="password"
            name="cvv"
            value={data.cvv}
            onChange={onChange}
            required
            disabled={disabled}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            placeholder="123"
          />
        </Field>
      </div>
    </div>
  );
}

export default function PaymentMethodDetailsForm({
  method,
  details,
  onChange,
  orderTotal = 0,
  disabled,
}) {
  if (!method) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    let next = value;

    if (name === 'card_number') next = formatCardNumber(value);
    if (name === 'expiry') next = formatExpiry(value);
    if (name === 'cvv') next = value.replace(/\D/g, '').slice(0, 4);

    onChange(method, name, next);
  }

  const sectionTitles = {
    mercado_pago: 'Pago con billetera virtual',
    tarjeta_credito: 'Datos de la tarjeta',
    tarjeta_debito: 'Datos de la tarjeta',
  };

  return (
    <div className="kodda-payment-details-panel">
      <h3 className="kodda-payment-details-title">{sectionTitles[method]}</h3>
      {method === 'mercado_pago' ? (
        <WalletQrPayment
          total={orderTotal}
          walletPaid={details.mercado_pago?.walletPaid === true}
          onWalletPaidChange={(paid) => onChange('mercado_pago', 'walletPaid', paid)}
          disabled={disabled}
        />
      ) : null}
      {method === 'tarjeta_credito' ? (
        <CardForm
          data={details.tarjeta_credito}
          onChange={handleChange}
          disabled={disabled}
          isCredit
        />
      ) : null}
      {method === 'tarjeta_debito' ? (
        <CardForm
          data={details.tarjeta_debito}
          onChange={handleChange}
          disabled={disabled}
          isCredit={false}
        />
      ) : null}
    </div>
  );
}
