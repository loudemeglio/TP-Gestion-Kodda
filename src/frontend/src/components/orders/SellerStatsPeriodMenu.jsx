import { SELLER_STATS_PRESETS } from '../../utils/sellerStatsPeriod';

export default function SellerStatsPeriodMenu({
  activePreset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
}) {
  return (
    <div className="kodda-seller-period" aria-label="Período de estadísticas">
      <div className="kodda-seller-period-pills" role="group">
        {SELLER_STATS_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`kodda-seller-period-pill${
              activePreset === p.id ? ' kodda-seller-period-pill--active' : ''
            }`}
            onClick={() => onPresetChange(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activePreset === 'custom' ? (
        <div className="kodda-seller-period-custom">
          <label className="kodda-seller-period-field">
            <span>Desde</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
            />
          </label>
          <label className="kodda-seller-period-field">
            <span>Hasta</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
            />
          </label>
          <button type="button" className="kodda-btn-primary kodda-btn-sm" onClick={onApplyCustom}>
            Aplicar
          </button>
        </div>
      ) : null}
    </div>
  );
}
