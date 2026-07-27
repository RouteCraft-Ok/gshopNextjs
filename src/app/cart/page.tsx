"use client";

import { useGlobal } from '@/context/CartContext';
import { processStockUpdate, registrarVenta } from '@/app/actions';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import './cart.css'; 

export default function CartPage() {
  const globalContext = useGlobal() as any;
  const { cart, user, removeFromCart, clearCart, refreshProducts, setProductos } = globalContext;
  
  const [deliveryMethod, setDeliveryMethod] = useState<'sucursal' | 'domicilio'>('sucursal');
  const [address, setAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 🛠️ Control de hidratación: Evita discrepancias SSR vs Cliente
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const cartItems = Array.isArray(cart) ? cart : [];

  const calcularPrecioItem = (item: any) => {
    const precioBase = Number(item.price) || 0;
    if (item.on_sale === true && Number(item.discount_percentage) > 0) {
      return precioBase * (1 - Number(item.discount_percentage) / 100);
    }
    return precioBase;
  };

  const total = cartItems.reduce((acc, item: any) => acc + (calcularPrecioItem(item) * (item.quantity || 1)), 0);
  const formatCurrency = (val: number) => 
    val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

  const ejecutarCompra = async (metodo: string) => {
    if (isProcessing || cartItems.length === 0) return;

    setIsProcessing(true);

    try {
      if (metodo !== "WhatsApp") {
        const stockRes = await processStockUpdate(cartItems);
        if (stockRes.success === false) {
          throw new Error("Error actualizando stock en el servidor simulado.");
        }
      }

      const ventaRes = await registrarVenta({
        productos: cartItems,
        total: total,
        metodo: metodo,
        cliente_email: user?.email || "Invitado", 
      });

      if (ventaRes.success === false) {
        alert("No se pudo registrar el pedido en el servidor.");
        return;
      }

      const productosOptimizados = cartItems.map((item: any) => ({
        id: String(item.id),
        name: String(item.name || ''),
        price: calcularPrecioItem(item),
        quantity: Number(item.quantity) || 1
      }));

      const nuevaVenta = {
        fecha: new Date().toISOString(),
        cliente_email: user?.email || "Invitado",
        productos: productosOptimizados,
        total: total,
        metodo_pago: metodo
      };

      try {
        const ventasGuardadas = JSON.parse(
          localStorage.getItem("gshop_ventas") || "[]"
        );
        const ventasActualizadas = [nuevaVenta, ...ventasGuardadas].slice(0, 20);
        localStorage.setItem("gshop_ventas", JSON.stringify(ventasActualizadas));
      } catch (storageErr) {
        console.warn("⚠️ No se pudo guardar la venta en localStorage por cuota excedida:", storageErr);
        try {
          localStorage.setItem("gshop_ventas", JSON.stringify([nuevaVenta]));
        } catch (e) {
          console.error("Error crítico de almacenamiento:", e);
        }
      }

      if (typeof setProductos === "function") {
        setProductos((prevProductos: any[]) => {
          const stockActualizado = prevProductos.map((p: any) => {
            const itemEnCarrito = cartItems.find(
              (item: any) => String(item.id) === String(p.id)
            );

            if (!itemEnCarrito) return p;

            return {
              ...p,
              stock: Math.max(
                0,
                Number(p.stock) - Number(itemEnCarrito.quantity || 1)
              )
            };
          });

          try {
            localStorage.setItem(
              "inventory_gamer_v3",
              JSON.stringify(stockActualizado)
            );
          } catch (e) {
            console.warn("No se pudo persistir inventario actualizado en localStorage:", e);
          }

          return stockActualizado;
        });
      }

      if (metodo === "WhatsApp") {
        const phoneNumber = "5491100000000"; 
        let message = `🎮 *NUEVO PEDIDO*%0A%0A`;

        cartItems.forEach((item: any) => {
          const pFinal = calcularPrecioItem(item);
          message += `- ${item.name} (x${item.quantity || 1}) - ${formatCurrency(pFinal)}%0A`;
        });

        message += `%0A*TOTAL FINAL:* ${formatCurrency(total)}%0A*ENTREGA:* ${
          deliveryMethod === "sucursal" ? "Retiro en Local" : address
        }`;

        window.open(
          `https://wa.me/${phoneNumber}?text=${message}`,
          "_blank"
        );
      } else {
        alert(
          "💳 Pago procesado con éxito (Simulación Mercado Pago) y Stock Descontado"
        );
      }

      clearCart();

      if (typeof refreshProducts === "function") {
        await refreshProducts();
      }

    } catch (error: any) {
      console.error("[FRONTEND] Error procesando la compra:", error);
      alert(`Hubo un error al procesar tu pedido:\n${error?.message || error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🛠️ Renderizado preventivo antes del montaje en cliente para evitar Mismatch
  if (!isMounted) {
    return (
      <div className="cart-page-container glass">
        <h1 className="cart-title">TU <span>INVENTARIO</span></h1>
        <div className="cart-empty-state">
          <p>Cargando mochila...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container glass">
      <h1 className="cart-title">TU <span>INVENTARIO</span></h1>
      
      {cartItems.length === 0 ? (
        <div className="cart-empty-state">
          <p>Mochila vacía. ¿Buscas loot?</p>
          <Link href="/" className="nav-btn btn-home-link">VOLVER A LA TIENDA</Link>
        </div>
      ) : (
        <div className="cart-grid">
          
          {/* LISTA DE PRODUCTOS */}
          <div className="cart-items-list">
            {cartItems.map((item: any, index: number) => {
              const precioBase = Number(item.price) || 0;
              const precioFinal = calcularPrecioItem(item);
              const tieneDescuento = item.on_sale === true && Number(item.discount_percentage) > 0;

              return (
                <div key={index} className="cart-item glass">
                  <div className="cart-item-info">
                    <img src={item.image_url} alt={item.name} className="cart-item-img" />
                    <div className="cart-item-details">
                      <h4>{item.name}</h4>
                      <div className="cart-item-prices">
                        {tieneDescuento ? (
                          <>
                            <span className="price-old">{formatCurrency(precioBase)}</span>
                            <span className="price-final">{formatCurrency(precioFinal)}</span>
                            <span className="discount-tag">-{item.discount_percentage}%</span>
                          </>
                        ) : (
                          <span className="price-final">{formatCurrency(precioBase)}</span>
                        )}
                      </div>
                      <p className="cart-item-qty">Cantidad: {item.quantity || 1}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(index)} className="btn-remove-cart" title="Eliminar ítem">✕</button>
                </div>
              );
            })}
          </div>

          {/* RESUMEN DE COMPRA */}
          <div className="cart-summary glass">
            <h3>RESUMEN DE MISIÓN</h3>
            
            <div className="summary-field">
              <label>MÉTODO DE ENTREGA</label>
              <select className="admin-input delivery-select" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as any)}>
                <option value="sucursal">RETIRO EN PUNTO DE GUARDADO (LOCAL)</option>
                <option value="domicilio">ENVÍO POR MENSAJERÍA</option>
              </select>
              
              {deliveryMethod === 'domicilio' && (
                <input type="text" placeholder="Tu dirección de entrega..." className="admin-input address-input" value={address} onChange={(e) => setAddress(e.target.value)} />
              )}
            </div>

            <div className="summary-total-row">
              <span>TOTAL:</span>
              <span className="total-amount">{formatCurrency(total)}</span>
            </div>

            <button onClick={() => ejecutarCompra('WhatsApp')} disabled={isProcessing} className="nav-btn btn-whatsapp">
              {isProcessing ? 'PROCESANDO...' : 'PEDIR POR WHATSAPP'}
            </button>
            
            <button onClick={() => ejecutarCompra('Mercado Pago')} disabled={isProcessing} className="nav-btn btn-mercadopago">
              PAGAR CON MERCADO PAGO
            </button>
          </div>

        </div>
      )}
    </div>
  );
}