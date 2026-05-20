import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const loadCart = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    try {
      const { data } = await api.get('/api/cart');
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const agregarAlCarrito = useCallback(
    async (producto) => {
      if (!user?.id) return;

      setItems((prevItems) => {
        const itemExistente = prevItems.find((item) => item.id === producto.id);
        if (itemExistente) {
          return prevItems.map((item) =>
            item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
          );
        }
        return [...prevItems, { ...producto, cantidad: 1 }];
      });

      try {
        const { data } = await api.post(`/api/cart/items/${producto.id}`);
        setItems(data.items ?? []);
      } catch {
        await loadCart();
      }
    },
    [user?.id, loadCart]
  );

  const eliminarDelCarrito = useCallback(
    async (productId) => {
      if (!user?.id) return;

      setItems((prevItems) => prevItems.filter((item) => item.id !== productId));

      try {
        const { data } = await api.delete(`/api/cart/items/${productId}`);
        setItems(data.items ?? []);
      } catch {
        await loadCart();
      }
    },
    [user?.id, loadCart]
  );

  const decrementarCantidad = useCallback(
    async (productId) => {
      if (!user?.id) return;

      const item = items.find((i) => i.id === productId);
      if (!item) return;
      const nuevaCantidad = item.cantidad - 1;

      setItems((prevItems) =>
        prevItems
          .map((i) => (i.id === productId ? { ...i, cantidad: nuevaCantidad } : i))
          .filter((i) => i.cantidad > 0)
      );

      try {
        const { data } = await api.patch(`/api/cart/items/${productId}`, {
          cantidad: nuevaCantidad,
        });
        setItems(data.items ?? []);
      } catch {
        await loadCart();
      }
    },
    [user?.id, items, loadCart]
  );

  const incrementarCantidad = useCallback(
    async (productId) => {
      if (!user?.id) return;

      const item = items.find((i) => i.id === productId);
      if (!item) return;
      const nuevaCantidad = item.cantidad + 1;

      setItems((prevItems) =>
        prevItems.map((i) => (i.id === productId ? { ...i, cantidad: nuevaCantidad } : i))
      );

      try {
        const { data } = await api.patch(`/api/cart/items/${productId}`, {
          cantidad: nuevaCantidad,
        });
        setItems(data.items ?? []);
      } catch {
        await loadCart();
      }
    },
    [user?.id, items, loadCart]
  );

  const vaciarCarrito = useCallback(async () => {
    if (!user?.id) return;

    setItems([]);

    try {
      const { data } = await api.delete('/api/cart');
      setItems(data.items ?? []);
    } catch {
      await loadCart();
    }
  }, [user?.id, loadCart]);

  const obtenerTotal = useCallback(() => {
    return items.reduce((total, item) => total + item.price * item.cantidad, 0);
  }, [items]);

  const obtenerCantidadTotal = useCallback(() => {
    return items.reduce((total, item) => total + item.cantidad, 0);
  }, [items]);

  return (
    <CarritoContext.Provider
      value={{
        items,
        agregarAlCarrito,
        eliminarDelCarrito,
        decrementarCantidad,
        incrementarCantidad,
        vaciarCarrito,
        obtenerTotal,
        obtenerCantidadTotal,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error('useCarrito debe ser usado dentro de CarritoProvider');
  }
  return context;
}
