import { useState } from "react";

const PRODUCTS = [
  { id: 1, name: "Panel solar 620W", price: 1850000 },
  { id: 2, name: "Estructura para techo", price: 350000 },
  { id: 3, name: "Controlador MPPT", price: 780000 },
];

// Número de WhatsApp - Cambia este número por el de tu negocio
const WHATSAPP_NUMBER = "573245737413";

export default function CarritoWhatsApp() {
  const [cart, setCart] = useState<{id:number; name:string; price:number; qty:number}[]>([]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");

  const addToCart = (product: (typeof PRODUCTS)[number]) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: number, qty: number) => {
    setCart(prev =>
      prev
        .map(item => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item))
        .filter(item => item.qty > 0)
    );
  };

  const formatCOP = (num: number) =>
    num.toLocaleString("es-CO", { style: "currency", currency: "COP" });

  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const handleWhatsApp = () => {
    if (!cart.length) return;
    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      alert("Por favor completa tu nombre y teléfono");
      return;
    }

    const lineas = cart
      .map(
        (item, idx) =>
          `${idx + 1}) ${item.name} x ${item.qty} = ${formatCOP(item.price * item.qty)}`
      )
      .join("\n");

    const mensaje =
      `Hola, quiero hacer este pedido:\n` +
      lineas +
      `\nTotal: ${formatCOP(total)}\n` +
      `Nombre: ${clienteNombre}\n` +
      `Teléfono: ${clienteTelefono}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <style>{`
        .carrito-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .products-section {
          margin-bottom: 3rem;
        }
        .products-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #1f2937;
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .product-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .product-name {
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }
        .product-price {
          font-size: 1rem;
          color: #6b2181;
          font-weight: 700;
          margin-bottom: 1rem;
        }
        .btn-add {
          background: linear-gradient(135deg, #6b2181, #8b2a9b);
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          width: 100%;
          transition: all 0.2s ease;
        }
        .btn-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(107, 33, 129, 0.4);
        }
        .cart-section {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 2rem;
          background: #f9fafb;
        }
        .cart-title {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #1f2937;
        }
        .cart-empty {
          text-align: center;
          color: #6b7280;
          padding: 2rem;
        }
        .cart-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .cart-item-info {
          flex: 1;
        }
        .cart-item-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1f2937;
          font-size: 1rem;
        }
        .cart-item-price {
          font-size: 0.9rem;
          color: #6b7280;
        }
        .qty-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .qty-btn {
          background: white;
          border: 2px solid #e5e7eb;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          font-size: 1.1rem;
          color: #6b2181;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qty-btn:hover {
          background: #6b2181;
          color: white;
          border-color: #6b2181;
        }
        .qty-value {
          font-weight: 700;
          min-width: 40px;
          text-align: center;
          font-size: 1rem;
          color: #1f2937;
        }
        .cart-item-subtotal {
          font-weight: 700;
          color: #6b2181;
          font-size: 1rem;
          min-width: 120px;
          text-align: right;
        }
        .cart-total {
          font-weight: 700;
          font-size: 1.5rem;
          color: #1f2937;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
        }
        .client-inputs {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }
        .input-field {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          transition: border-color 0.2s ease;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .input-field:focus {
          outline: none;
          border-color: #6b2181;
        }
        .btn-whatsapp {
          background: linear-gradient(135deg, #25D366, #128C7E);
          color: white;
          padding: 1rem 2rem;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 1.1rem;
          width: 100%;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .btn-whatsapp:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);
        }
        .btn-whatsapp:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .carrito-container {
            padding: 1rem;
          }
          .products-grid {
            grid-template-columns: 1fr;
          }
          .cart-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .qty-controls {
            width: 100%;
            justify-content: space-between;
          }
          .cart-item-subtotal {
            width: 100%;
            text-align: left;
          }
        }
      `}</style>
      
      <div className="carrito-container">
        <div className="products-section">
          <h1 className="products-title">Productos</h1>
          <div className="products-grid">
            {PRODUCTS.map(prod => (
              <div key={prod.id} className="product-card">
                <h2 className="product-name">{prod.name}</h2>
                <p className="product-price">{formatCOP(prod.price)}</p>
                <button
                  onClick={() => addToCart(prod)}
                  className="btn-add"
                >
                  Agregar al carrito
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-section">
          <h2 className="cart-title">Carrito</h2>
          {!cart.length && <p className="cart-empty">No hay productos en el carrito.</p>}
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <p className="cart-item-name">{item.name}</p>
                <p className="cart-item-price">{formatCOP(item.price)} c/u</p>
              </div>
              <div className="qty-controls">
                <button
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  className="qty-btn"
                >
                  -
                </button>
                <span className="qty-value">{item.qty}</span>
                <button
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  className="qty-btn"
                >
                  +
                </button>
              </div>
              <p className="cart-item-subtotal">{formatCOP(item.price * item.qty)}</p>
            </div>
          ))}
          {cart.length > 0 && (
            <>
              <div className="cart-total">
                <span>Total:</span>
                <span>{formatCOP(total)}</span>
              </div>

              <div className="client-inputs">
                <input
                  className="input-field"
                  placeholder="Nombre del cliente"
                  value={clienteNombre}
                  onChange={e => setClienteNombre(e.target.value)}
                />
                <input
                  className="input-field"
                  placeholder="Teléfono del cliente"
                  value={clienteTelefono}
                  onChange={e => setClienteTelefono(e.target.value)}
                />
                <button
                  onClick={handleWhatsApp}
                  className="btn-whatsapp"
                  disabled={!cart.length}
                >
                  <span>📱</span>
                  Enviar pedido por WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

