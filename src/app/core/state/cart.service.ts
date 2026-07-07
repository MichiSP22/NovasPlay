import { Injectable, signal, computed } from '@angular/core';
import { ItemCarrito } from './cart.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  
  // Estado global del carrito
  private cartItems = signal<ItemCarrito[]>([]);

  // Computed: Items expuestos
  items = computed(() => this.cartItems());

  // Computed: Totales agrupados por símbolo (Multi-moneda)
  totalsBySymbol = computed(() => {
    const totalsMap = new Map<string, number>();
    this.cartItems().forEach(item => {
      const symbol = item.paquete.simbolo || '$';
      // Si tiene promoción, usamos el precio promocional, si no el original
      const priceToUse = item.paquete.promotion ? item.paquete.promotionPrice : item.paquete.precio;
      let val = parseFloat(priceToUse.toString().replace(',', '.'));
      if (isNaN(val)) val = 0;
      totalsMap.set(symbol, (totalsMap.get(symbol) || 0) + val);
    });
    
    return Array.from(totalsMap.entries()).map(([symbol, amount]) => ({ symbol, amount }));
  });

  // Computed: Contar Elementos
  itemCount = computed(() => this.cartItems().length);

  // Computed: Saber si hay alguna promoción en el carrito
  hasPromotion = computed(() => this.cartItems().some(item => item.paquete.promotion));

  // Computed: Descuento total del carrito (Ahorro)
  totalDiscount = computed(() => {
    const discountsMap = new Map<string, number>();
    this.cartItems().forEach(item => {
      if (item.paquete.promotion) {
        const symbol = item.paquete.simbolo || '$';
        const originalPrice = parseFloat(item.paquete.precio.toString().replace(',', '.'));
        const promoPrice = parseFloat(item.paquete.promotionPrice.toString().replace(',', '.'));
        const diff = originalPrice - promoPrice;
        if (diff > 0) {
          discountsMap.set(symbol, (discountsMap.get(symbol) || 0) + diff);
        }
      }
    });
    return Array.from(discountsMap.entries()).map(([symbol, amount]) => ({ symbol, amount }));
  });

  constructor() {
    this.initHeartbeat();
    this.loadCartFromStorage();
    this.initStorageListener();
  }

  private initHeartbeat() {
    if (typeof window === 'undefined') return;
    
    // Establecer latido inicial
    localStorage.setItem('yona_cart_last_active', Date.now().toString());
    
    // Actualizarlatido cada segundo para indicar que esta pestaña sigue activa
    setInterval(() => {
      localStorage.setItem('yona_cart_last_active', Date.now().toString());
    }, 1000);
  }

  private loadCartFromStorage() {
    if (typeof window !== 'undefined' && localStorage) {
      const lastActive = localStorage.getItem('yona_cart_last_active');
      const now = Date.now();
      
      // Si el último latido fue hace más de 5 segundos, consideramos que todas las pestañas 
      // anteriores se cerraron y es una sesión nueva, por lo que limpiamos el carrito.
      if (lastActive && (now - parseInt(lastActive)) > 5000) {
        localStorage.removeItem('yona_cart');
      }

      const saved = localStorage.getItem('yona_cart');
      if (saved) {
        try {
          this.cartItems.set(JSON.parse(saved));
        } catch (e) {
          console.error("Error cargando carrito", e);
        }
      }
    }
  }

  private initStorageListener() {
    if (typeof window === 'undefined') return;
    
    // Escuchar cambios en otras pestañas para mantener el carrito sincronizado
    window.addEventListener('storage', (event) => {
      if (event.key === 'yona_cart') {
        const saved = event.newValue;
        try {
          if (saved) {
            this.cartItems.set(JSON.parse(saved));
          } else {
            this.cartItems.set([]);
          }
        } catch (e) {
          console.error("Error sincronizando carrito entre pestañas", e);
        }
      }
    });
  }

  private saveCartToStorage() {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('yona_cart', JSON.stringify(this.cartItems()));
    }
  }

  addItem(item: Omit<ItemCarrito, 'idInterno'>) {
    const nuevoItem: ItemCarrito = {
      ...item,
      idInterno: Date.now() + Math.random()
    };
    this.cartItems.update(items => [...items, nuevoItem]);
    this.saveCartToStorage();
  }

  removeItem(idInterno: number) {
    this.cartItems.update(items => items.filter(i => i.idInterno !== idInterno));
    this.saveCartToStorage();
  }

  clearCart() {
    this.cartItems.set([]);
    this.saveCartToStorage();
  }
}
