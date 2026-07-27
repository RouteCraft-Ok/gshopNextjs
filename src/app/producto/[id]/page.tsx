"use client";

import { useState } from 'react';
import { useGlobal } from '@/context/CartContext';
import { useParams } from 'next/navigation';
import './product.css';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { productos, addToCart, isMaintenance } = useGlobal();
  const [displayImage, setDisplayImage] = useState<string | null>(null);

  const product = productos.find((p: any) => String(p.id) === String(id));

  if (!product) {
    return <div className="glitch">[!] PRODUCTO NO ENCONTRADO</div>;
  }

  const prod = product as any;
  const mainImg = displayImage || prod.image_url;
  
  const basePrice = Number(prod.price ?? prod.precio ?? 0);
  const discount = Number(prod.discount_percentage ?? prod.discountPercentage ?? prod.descuento ?? 0);
  
  const rawOnSale = prod.on_sale ?? prod.onSale ?? prod.en_oferta;
  const isOnSale = (
    rawOnSale === true || 
    rawOnSale === 'true' || 
    rawOnSale === 1 || 
    rawOnSale === '1' ||
    rawOnSale === 'on'
  ) && discount > 0;

  const finalPrice = isOnSale ? basePrice * (1 - discount / 100) : basePrice;
  const stockCount = Number(prod.stock) || 0;

  return (
    <div className="product-layout">
      <div className="product-detail-container">
        <div className="product-layout-grid">
          
          {/* COLUMNA IZQUIERDA: IMÁGENES */}
          <div className="image-sector">
            <div className="main-image-container glass">
              <img src={mainImg} alt={prod.name} className="main-product-img" />
            </div>
            
            <div className="gallery-grid">
              <img 
                src={prod.image_url} 
                className={`gallery-thumb ${mainImg === prod.image_url ? 'active' : ''}`}
                onClick={() => setDisplayImage(prod.image_url)}
              />
              {(Array.isArray(prod.images_extras) ? prod.images_extras : prod.images_extras?.split(',') || [])
                .filter((url: string) => url.trim() !== "")
                .map((url: string, idx: number) => (
                  <img key={idx} src={url.trim()} className={`gallery-thumb ${mainImg === url.trim() ? 'active' : ''}`}
                    onClick={() => setDisplayImage(url.trim())} />
                ))
              }
            </div>
          </div>

          {/* COLUMNA DERECHA: INFO */}
          <div className="info-sector">
            <div className={`stock-tag ${stockCount > 5 ? 'in-stock' : stockCount > 0 ? 'low-stock' : 'no-stock'}`}>
              {stockCount > 0 ? `DISPONIBLE: ${stockCount} UNIDADES` : 'FUERA DE SERVICIO'}
            </div>

            <h1 className="glow-title product-title">
              {prod.name}
            </h1>
            
            <p className="product-serial">
              SERIAL_NUMBER: #{prod.id} // CAT: {prod.cat}
            </p>

            {/* SECCIÓN DE PRECIO */}
            <div className="price-container">
              {isOnSale ? (
                <>
                  <span className="price-old-detail">
                    ${basePrice.toLocaleString()}
                  </span>
                  <span className="price-main-detail">
                    ${finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <div className="discount-badge-home">
                    -{discount}% OFF
                  </div>
                </>
              ) : (
                <span className="price-main-detail">
                  ${basePrice.toLocaleString()}
                </span>
              )}
            </div>

            <p className="product-desc glass">
              {prod.description || 'Sin descripción técnica disponible para este modelo.'}
            </p>

            <button 
              className="btn-primary product-buy-btn" 
              disabled={stockCount <= 0 || isMaintenance}
              onClick={() => addToCart(product)}
            >
              {stockCount > 0 ? 'ADQUIRIR EQUIPAMIENTO' : 'UNIDADES AGOTADAS'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}