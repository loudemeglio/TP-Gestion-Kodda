import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  EMPTY_BILLING_FORM,
  billingToForm,
  buildBillingPayload,
  formatBillingApiError,
} from '../components/billing/billingUtils';

/**
 * Estados: loading | empty | view | edit | error
 * `billingReady` = hay datos guardados (view o tras guardar).
 */
export function useBilling() {
  const [billing, setBilling] = useState(null);
  const [form, setForm] = useState(EMPTY_BILLING_FORM);
  const [mode, setMode] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/users/me/billing');
      setBilling(data);
      setForm(billingToForm(data));
      setMode('view');
    } catch (err) {
      if (err.response?.status === 404) {
        setBilling(null);
        setForm(EMPTY_BILLING_FORM);
        setMode('empty');
      } else {
        setError(err.response?.data?.detail || 'No se pudieron cargar los datos de facturación.');
        setMode('error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const startEditing = useCallback(() => {
    setForm(billing ? billingToForm(billing) : EMPTY_BILLING_FORM);
    setSaveError('');
    setMode('edit');
  }, [billing]);

  const cancelEditing = useCallback(() => {
    setSaveError('');
    if (billing) {
      setForm(billingToForm(billing));
      setMode('view');
    } else {
      setMode('empty');
    }
  }, [billing]);

  const saveBilling = useCallback(async () => {
    setSaveError('');
    setSaving(true);
    try {
      const { data } = await api.put('/api/users/me/billing', buildBillingPayload(form));
      setBilling(data);
      setForm(billingToForm(data));
      setMode('view');
      return data;
    } catch (err) {
      setSaveError(formatBillingApiError(err));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [form]);

  const billingReady = Boolean(billing) && mode === 'view';

  return {
    billing,
    form,
    mode,
    setMode,
    loading,
    saving,
    error,
    saveError,
    billingReady,
    loadBilling,
    handleChange,
    startEditing,
    cancelEditing,
    saveBilling,
  };
}
