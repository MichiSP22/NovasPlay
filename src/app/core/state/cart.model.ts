export interface Paquete {
  id: number;
  cant: string;
  precio: string;
  simbolo: string;
  imageUrl?: string;
  promotion: boolean;
  promotionPrice: string;
}

export interface ItemCarrito {
  idInterno: number;
  juego: string;
  idUsuario: string;
  accountLabel?: string;
  accountData?: Array<{
    key: string;
    value: string;
  }>;
  paquete: Paquete;
  metodoPagoId: number;
  metodoPagoNombre: string;
}
