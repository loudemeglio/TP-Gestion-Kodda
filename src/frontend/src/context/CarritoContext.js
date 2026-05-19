import React, { createContext, useCallback, useContext, useState } from 'react';

const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const [items, setItems] = useState([]);

  const agregarAlCarrito = useCallback((producto) => {
    setItems((prevItems) => {
      // Verificar si el producto ya existe en el carrito
      const itemExistente = prevItems.find((item) => item.id === producto.id);

      if (itemExistente) {
        // Si existe, incrementar la cantidad
        return prevItems.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      } else {
        // Si no existe, agregar el producto con cantidad 1
        return [
          ...prevItems,
          {
            ...producto,
            cantidad: 1,
          },
        ];
      }
    });
  }, []);

  const eliminarDelCarrito = useCallback((productId) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);

  const decrementarCantidad = useCallback((productId) => {
    setItems((prevItems) => {
      return prevItems
        .map((item) =>
          item.id === productId ? { ...item, cantidad: item.cantidad - 1 } : item
        )
        .filter((item) => item.cantidad > 0);
    });
  }, []);

  const incrementarCantidad = useCallback((productId) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, cantidad: item.cantidad + 1 } : item
      )
    );
  }, []);

  const vaciarCarrito = useCallback(() => {
    setItems([]);
  }, []);

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
