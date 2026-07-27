"use client";
import { useState, useEffect } from 'react';
import { useGlobal } from '@/context/CartContext';
import { saveProduct, deleteProduct } from '@/app/actions'; 
import './admin.css';

interface ProductFormState {
  name: string;
  price: string;
  stock: string;
  description: string;
  category: string;
  sub_cat: string;
  on_sale: boolean;
  discount_percentage: number;
  image_url: string;
  images_extras: string[]; 
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);

  const globalContext = useGlobal() as any;
  const { updateSingleProductInState, setProductos } = globalContext || {};
  const { productos, isMaintenance, setIsMaintenance } = globalContext || {};
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ventas, setVentas] = useState<any[]>([]);
  const [stockPage, setStockPage] = useState(1);
  const itemsPerStockPage = 10; 

  const [productData, setProductData] = useState<ProductFormState>({
    name: '', 
    price: '', 
    stock: '', 
    description: '',
    category: 'JUEGOS', 
    sub_cat: '', 
    on_sale: false, 
    discount_percentage: 0, 
    image_url: '', 
    images_extras: [] 
  });

  const cargarVentas = () => {
    if (typeof window === 'undefined') return;
    const localVentas = localStorage.getItem("gshop_ventas");

    if (!localVentas) {
      setVentas([]);
      return;
    }

    try {
      const parsed = JSON.parse(localVentas);
      setVentas(parsed.filter((v: any) => v.metodo_pago !== "WhatsApp"));
    } catch {
      setVentas([]);
    }
  };

  useEffect(() => {
    setMounted(true);
    cargarVentas();
    const handleStorageChange = () => cargarVentas();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!mounted) {
    return <div className="admin-container" style={{ color: '#fff', textAlign: 'center' }}>Cargando Panel de Control...</div>;
  }

  const totalVendido = ventas.reduce((acc, v) => acc + Number(v?.total || 0), 0);

  const formatCurrency = (amount: number | string) => {
    return Number(amount).toLocaleString('es-AR', {
      style: 'currency', currency: 'ARS',
      minimumFractionDigits: 2
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMain: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);

    if (isMain) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductData(prev => ({ ...prev, image_url: reader.result as string }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } else {
      const totalFiles = Array.from(files);
      const cargadas: string[] = [];

      let procesados = 0;
      totalFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cargadas.push(reader.result as string);
          procesados += 1;

          if (procesados === totalFiles.length) {
            let actuales: string[] = [];
            if (Array.isArray(productData.images_extras)) {
              actuales = productData.images_extras;
            }

            const combinadas = [...actuales, ...cargadas].flat(Infinity) as string[];
            setProductData(prev => ({ ...prev, images_extras: combinadas }));
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleEdit = (p: any) => {
    setIsEditing(true);
    setEditingId(p.id);
    
    let parsedExtras: string[] = [];
    if (Array.isArray(p.images_extras)) {
      parsedExtras = p.images_extras.flat(Infinity);
    } else if (typeof p.images_extras === 'string') {
      try {
        const parsed = JSON.parse(p.images_extras);
        parsedExtras = Array.isArray(parsed) ? parsed.flat(Infinity) : [p.images_extras];
      } catch {
        parsedExtras = p.images_extras ? p.images_extras.split(',').map((img: string) => img.trim()) : [];
      }
    }

    setProductData({
      name: p.name || '',
      price: (p.price || 0).toString(),
      stock: (p.stock || 0).toString(),
      description: p.description || '',
      category: p.category || p.cat || 'JUEGOS', 
      sub_cat: p.sub_cat || '',
      on_sale: p.on_sale || false,
      discount_percentage: p.discount_percentage || 0,
      image_url: p.image_url || '',
      images_extras: parsedExtras
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number | string, name: string) => {
    if (!id) {
      alert("⚠️ ERROR FRONTEND: El producto no tiene un ID válido.");
      return;
    }

    if (confirm(`¿ELIMINAR PRODUCTO: ${name.toUpperCase()}?`)) {
      try {
        await deleteProduct(id);
        
        if (typeof setProductos === 'function') {
          setProductos((prevProps: any[]) => {
            const filtrados = (prevProps || []).filter((p: any) => p && String(p.id) !== String(id));
            if (typeof window !== 'undefined') {
              localStorage.setItem('inventory_gamer_v2', JSON.stringify(filtrados));
            }
            return filtrados;
          });
          setStockPage(1);
        }

        alert("🗑️ ELIMINADO CON ÉXITO");
      } catch (error: any) {
        console.error("[FRONTEND] Error:", error);
        alert(`❌ ERROR AL ELIMINAR:\n${error?.message || error}`);
      }
    }
  };

  const handleSave = async () => {
    if (!productData.name || !productData.price) {
      alert("⚠️ DATOS INSUFICIENTES");
      return;
    }

    let cleanExtras: string[] = [];
    if (Array.isArray(productData.images_extras)) {
      cleanExtras = productData.images_extras
        .flat(Infinity)
        .map(img => (typeof img === 'string' ? img.trim() : ''))
        .filter(img => img.length > 0);
    }

    const productToSave = {
      id: editingId ? Number(editingId) : null,
      name: String(productData.name),
      price: Number(productData.price),
      stock: Number(productData.stock || 0),
      description: String(productData.description || ''),
      category: String(productData.category),
      cat: String(productData.category),
      sub_cat: String(productData.sub_cat || ''),
      on_sale: Boolean(productData.on_sale),
      discount_percentage: Number(productData.discount_percentage || 0),
      image_url: String(productData.image_url || ''),
      images_extras: JSON.stringify(cleanExtras) 
    };

    try {
      const res = await saveProduct(productToSave);

      if (res && res.success && res.product) {
        if (typeof updateSingleProductInState === 'function') {
          updateSingleProductInState(res.product);
        }

        alert("🚀 PROCESADO Y SELLADO");
        setIsEditing(false);
        setEditingId(null);
        setProductData({
          name: '', 
          price: '', 
          stock: '', 
          description: '',
          category: 'JUEGOS', 
          sub_cat: '', 
          on_sale: false, 
          discount_percentage: 0, 
          image_url: '', 
          images_extras: []
        });
      } else {
        alert(`❌ Hubo un error al guardar: ${res?.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error("[SERVER ACTION ERROR]:", err);
      alert(`❌ Error del servidor: ${err.message || 'Fallo al procesar el envío'}`);
    }
  };

  const cleanDuplicateSales = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gshop_ventas');
    }
    setVentas([]);
    alert("¡Registros duplicados eliminados del storage!");
  };

  const safeProductos = Array.isArray(productos) ? productos : [];

  const filteredItems = safeProductos
    .filter((p: any) => {
      const productName = p && p.name ? p.name.toLowerCase() : "";
      return productName.includes(searchTerm.toLowerCase());
    })
    .slice().reverse();

  const totalStockPages = Math.ceil(filteredItems.length / itemsPerStockPage);
  const currentPage = stockPage > totalStockPages ? Math.max(1, totalStockPages) : stockPage;
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerStockPage, currentPage * itemsPerStockPage);

  return (
    <div className="admin-container">
      
      {/* KPI DASHBOARD */}
      <div className="admin-kpi-grid">
        <div className="glass" style={{ padding: '20px' }}>
          <p style={{ fontSize: '10px', color: 'var(--electric-blue)', margin: 0 }}>VENTAS NETAS</p>
          <h2 style={{ color: 'var(--neon-cyan)', margin: '5px 0' }}>{formatCurrency(totalVendido)}</h2>
          <button onClick={cleanDuplicateSales} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: '9px', padding: 0 }}>[LIMPIAR DUPLICADOS]</button>
        </div>
        <div className="glass" style={{ padding: '20px', border: isMaintenance ? '1px solid var(--neon-pink)' : '1px solid var(--neon-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '10px', color: isMaintenance ? 'var(--neon-pink)' : 'var(--neon-blue)', margin: 0 }}>MODO VACACIONES</p>
              <h4 style={{ margin: '5px 0', color: 'white' }}>{isMaintenance ? 'SISTEMA OFFLINE' : 'SISTEMA ONLINE'}</h4>
            </div>
            <label className="gamer-switch">
              <input type="checkbox" checked={!!isMaintenance} onChange={(e) => setIsMaintenance && setIsMaintenance(e.target.checked)} />
              <span className="gamer-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* FORMULARIO DE CARGA */}
      <div className="glass" style={{ padding: '25px', marginBottom: '40px', border: isEditing ? '1px solid var(--neon-pink)' : '1px solid rgba(0, 210, 255, 0.2)' }}>
        <h3 className="glitch-small" style={{ fontSize: '14px', marginBottom: '20px' }}>
          {isEditing ? `[!] EDITANDO ID: ${editingId}` : '[+] NUEVO REGISTRO'}
        </h3>
        <div className="admin-form-grid">
          <input type="text" placeholder="NOMBRE" value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} className="admin-input" />
          <div className="admin-flex-mobile-col" style={{ display: 'flex', gap: '10px' }}>
            <select className="admin-input" value={productData.category} onChange={e => setProductData({...productData, category: e.target.value})} style={{flex: 1}}>
              <option value="JUEGOS">JUEGOS</option>
              <option value="CONSOLAS">CONSOLAS</option>
              <option value="PC GAMER">PC GAMER</option>
              <option value="PERIFÉRICOS">PERIFÉRICOS</option>
            </select>
            <input type="text" placeholder="SUB-CAT" value={productData.sub_cat} onChange={e => setProductData({...productData, sub_cat: e.target.value.toUpperCase()})} className="admin-input" style={{flex: 1}} />
          </div>
          <input type="number" placeholder="PRECIO BASE" value={productData.price} onChange={e => setProductData({...productData, price: e.target.value})} className="admin-input" />
          <input type="number" placeholder="STOCK" value={productData.stock} onChange={e => setProductData({...productData, stock: e.target.value})} className="admin-input" />
          
          <div className="admin-span-2 admin-flex-mobile-col" style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '15px' }}>
             <label style={{ color: 'white', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={productData.on_sale} onChange={e => setProductData({...productData, on_sale: e.target.checked})} /> ¿EN OFERTA?
            </label>
            {productData.on_sale && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input type="number" placeholder="%" value={productData.discount_percentage} onChange={e => setProductData({...productData, discount_percentage: parseInt(e.target.value) || 0})} className="admin-input" style={{ width: '80px' }} />
                <span style={{ color: 'var(--neon-green)', fontSize: '12px' }}>
                  PRECIO FINAL: {formatCurrency(Number(productData.price) * (1 - (productData.discount_percentage / 100)))}
                </span>
              </div>
            )}
          </div>

          <div className="admin-span-2 admin-form-grid" style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '5px' }}>
            <div>
              <label style={{ color: 'var(--neon-cyan)', fontSize: '10px', display: 'block', marginBottom: '5px' }}>FOTO PRINCIPAL (CARDS)</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="admin-input" style={{ fontSize: '10px' }} />
              {productData.image_url && <p style={{ fontSize: '9px', color: 'var(--neon-green)', marginTop: '5px' }}>✓ Cargada</p>}
            </div>
            <div>
              <label style={{ color: 'var(--neon-cyan)', fontSize: '10px', display: 'block', marginBottom: '5px' }}>FOTOS EXTRAS (GALERÍA)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, false)} className="admin-input" style={{ fontSize: '10px' }} />
              <p style={{ fontSize: '9px', opacity: 0.6, marginTop: '5px' }}>{Array.isArray(productData.images_extras) && productData.images_extras.length > 0 ? `${productData.images_extras.length} archivos detectados` : 'Sin extras'}</p>
            </div>
          </div>

          <textarea placeholder="DESCRIPCIÓN" value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})} className="admin-input admin-span-2" style={{ gridColumn: 'span 2', minHeight: '80px' }} />
          <button className="nav-btn admin-span-2" style={{ gridColumn: 'span 2', height: '50px' }} onClick={handleSave} disabled={isUploading}>
            {isEditing ? '⚡ ACTUALIZAR DATOS' : '🚀 LANZAR PRODUCTO'}
          </button>
        </div>
      </div>

      {/* LOG DE VENTAS REALES */}
      <div className="admin-inventory-section" style={{ marginBottom: '50px' }}>
        <h2 className="sidebar-title" style={{ color: 'var(--neon-green)', fontSize: '1.2rem', wordBreak: 'break-word', marginBottom: '15px' }}>
          LOG DE VENTAS CONFIRMADAS
        </h2>
        <div className="table-responsive-wrapper">
          <table className="admin-table ventas-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>CLIENTE</th>
                <th>PRODUCTOS</th>
                <th>TOTAL PAGADO</th>
                <th>MÉTODO</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length > 0 ? ventas.map((v, i) => (
                <tr key={i} className="admin-card-row">
                  <td className="cell-fecha">
                    <span className="mobile-label">📅 FECHA:</span>
                    {v?.fecha ? new Date(v.fecha).toLocaleDateString() : '---'}
                  </td>
                  <td className="cell-cliente">
                    <span className="mobile-label">👤 CLIENTE:</span>
                    {v?.cliente_email}
                  </td>
                  <td className="cell-productos">
                    <span className="mobile-label">🛒 PRODUCTOS:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {v?.productos && Array.isArray(v.productos) ? (
                        v.productos.map((p: any, idx: number) => (
                          <span key={idx} style={{ color: 'rgba(255,255,255,0.8)' }}>
                            • {p?.name} <b style={{ color: 'var(--neon-cyan)' }}>(x{p?.quantity || 1})</b>
                          </span>
                        ))
                      ) : (
                        <span style={{ opacity: 0.5 }}>Sin datos de items</span>
                      )}
                    </div>
                  </td>
                  <td className="cell-total">
                    <span className="mobile-label">💲 TOTAL:</span>
                    <strong style={{ color: 'var(--electric-blue)' }}>{formatCurrency(v?.total || 0)}</strong>
                  </td>
                  <td className="cell-metodo">
                    <span className="mobile-label">💳 MÉTODO:</span>
                    <span className="discount-badge" style={{ background: '#009EE3', color: 'black', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {v?.metodo_pago || '---'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>NO HAY VENTAS CONFIRMADAS</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTROL DE STOCK */}
      <div className="admin-inventory-section">
        <div className="admin-header-flex">
          <h2 className="sidebar-title" style={{ fontSize: '1.2rem', margin: 0 }}>CONTROL_STOCK</h2>
          <div>
            <input 
              type="text" 
              placeholder="🔍 BUSCAR PRODUCTO..." 
              className="admin-input admin-input-search" 
              style={{ width: '100%', maxWidth: '300px', border: '1px solid var(--neon-cyan)' }} 
              onChange={(e) => { setSearchTerm(e.target.value); setStockPage(1); }} 
            />
          </div>
        </div>
        
        <div className="table-responsive-wrapper">
          <table className="admin-table stock-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th style={{ width: '50px' }}>IMG</th>
                <th>PRODUCTO</th>
                <th style={{ width: '90px' }}>STOCK</th>
                <th style={{ width: '120px' }}>PRECIO BASE</th>
                <th style={{ textAlign: 'right', width: '140px' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((p: any) => (
                <tr key={p?.id || Math.random()} className="admin-card-row">
                  <td className="cell-id">
                    <span className="mobile-label">🆔 ID:</span>
                    #{String(p?.id || '').slice(0, 8)}
                  </td>
                  <td className="cell-img">
                    <img 
                      src={p?.image_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop"} 
                      alt="thumb" 
                      className="card-thumb"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; 
                        target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop";
                      }}
                    />
                  </td>
                  <td className="cell-title">
                    <span className="mobile-label">🎮 PRODUCTO:</span>
                    <strong>{p?.name || 'Sin nombre'}</strong>
                  </td>
                  <td className="cell-stock">
                    <span className="mobile-label">📦 STOCK:</span>
                    <span style={{ color: Number(p?.stock) <= 3 ? 'var(--neon-pink)' : 'var(--neon-green)', fontWeight: 'bold' }}>
                      {p?.stock ?? 0} u.
                    </span>
                  </td>
                  <td className="cell-price">
                    <span className="mobile-label">💲 PRECIO:</span>
                    <strong style={{ color: 'var(--neon-cyan)' }}>{formatCurrency(p?.price || 0)}</strong>
                  </td>
                  <td className="cell-actions">
                    <div className="action-buttons-wrapper">
                      <button onClick={() => handleEdit(p)} className="nav-btn btn-edit">EDITAR</button>
                      <button onClick={() => handleDelete(p?.id, p?.name || '')} className="nav-btn btn-delete">ELIMINAR</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalStockPages > 1 && (
            <div className="pagination-container">
              <button className="nav-btn" disabled={currentPage === 1} onClick={() => setStockPage(currentPage - 1)}>ATRÁS</button>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '13px', color: 'var(--neon-cyan)' }}>{currentPage} / {totalStockPages}</span>
              <button className="nav-btn" disabled={currentPage >= totalStockPages} onClick={() => setStockPage(currentPage + 1)}>SIGUIENTE</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}