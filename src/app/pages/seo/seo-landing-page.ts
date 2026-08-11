import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type SeoPageKey = 'catalog' | 'free-fire' | 'blood-strike';

interface SeoLink {
  label: string;
  href: string;
}

interface SeoPage {
  kicker: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  highlights: string[];
  steps: string[];
  faq: Array<{ question: string; answer: string }>;
  related: SeoLink[];
}

const SEO_PAGES: Record<SeoPageKey, SeoPage> = {
  catalog: {
    kicker: 'Catalogo NovasPlay',
    title: 'Recargas online para juegos con pagos verificados y soporte directo',
    description:
      'Explora el catalogo de NovasPlay para comprar recargas digitales, diamantes, monedas, pases y saldo gamer con seguimiento de tu pedido.',
    image: 'novasplay-icon.png',
    imageAlt: 'Logo de NovasPlay',
    highlights: [
      'Catalogo gamer con productos activos y precios organizados.',
      'Pagos revisados antes de procesar cada orden.',
      'Soporte por NovaBot para dudas, errores visuales o seguimiento.',
    ],
    steps: [
      'Elige el juego o producto que quieres recargar.',
      'Selecciona el paquete disponible y coloca los datos de tu cuenta.',
      'Confirma el pago y revisa el estado de tu pedido desde tu perfil.',
    ],
    faq: [
      {
        question: 'Que puedo comprar en NovasPlay?',
        answer:
          'Puedes encontrar recargas digitales para juegos, como diamantes, oro, monedas, pases y saldo segun la disponibilidad del catalogo.',
      },
      {
        question: 'NovasPlay muestra seguimiento de pedidos?',
        answer:
          'Si. Al comprar con tu cuenta puedes consultar tus ordenes, referencias, estado de pago y detalle de cada recarga.',
      },
    ],
    related: [
      { label: 'Recargas Free Fire', href: '/recargas-free-fire/' },
      { label: 'Recargas Blood Strike', href: '/recargas-blood-strike/' },
      { label: 'Terminos y condiciones', href: '/terms-view/' },
    ],
  },
  'free-fire': {
    kicker: 'Recargas Free Fire',
    title: 'Recarga Free Fire en NovasPlay de forma clara y segura',
    description:
      'Compra diamantes y paquetes para Free Fire desde NovasPlay. Selecciona tu recarga, registra tu ID de jugador y confirma tu pago con seguimiento.',
    image: 'novix-hero-peek-small.png',
    imageAlt: 'Novix presentando recargas de juegos',
    highlights: [
      'Proceso guiado para colocar el ID de jugador antes de comprar.',
      'Paquetes disponibles segun metodo de pago y moneda activa.',
      'Resumen de compra con total, descuento y estado de la orden.',
    ],
    steps: [
      'Busca Free Fire dentro del catalogo.',
      'Coloca correctamente tu ID de jugador.',
      'Elige el paquete, metodo de pago y confirma la orden.',
    ],
    faq: [
      {
        question: 'Necesito mi ID para recargar Free Fire?',
        answer:
          'Si. El ID de jugador ayuda a procesar la recarga correctamente y evitar errores en la entrega.',
      },
      {
        question: 'Puedo revisar mi compra despues de pagar?',
        answer:
          'Si. En tu perfil puedes ver el historial de compras, el estado de cada orden y los datos de referencia.',
      },
    ],
    related: [
      { label: 'Catalogo de recargas', href: '/catalogo/' },
      { label: 'Recargas Blood Strike', href: '/recargas-blood-strike/' },
      { label: 'Inicio NovasPlay', href: '/' },
    ],
  },
  'blood-strike': {
    kicker: 'Recargas Blood Strike',
    title: 'Compra recargas para Blood Strike con soporte y pago verificado',
    description:
      'Encuentra recargas para Blood Strike en NovasPlay. Revisa paquetes disponibles, confirma tus datos y lleva seguimiento de tu orden.',
    image: 'novasplay-feature-game.png',
    imageAlt: 'Producto destacado de recargas gamer en NovasPlay',
    highlights: [
      'Catalogo organizado para encontrar paquetes activos rapidamente.',
      'Pagos verificados para reducir errores en el proceso.',
      'Atencion directa si necesitas ayuda antes o despues de comprar.',
    ],
    steps: [
      'Entra al catalogo y selecciona Blood Strike.',
      'Revisa los paquetes activos para tu metodo de pago.',
      'Confirma la compra y consulta el avance de la orden.',
    ],
    faq: [
      {
        question: 'Blood Strike esta disponible en el catalogo?',
        answer:
          'La disponibilidad puede cambiar segun inventario y configuracion del administrador. Si aparece activo, puedes iniciar la compra desde el catalogo.',
      },
      {
        question: 'Que hago si tengo una duda con mi recarga?',
        answer:
          'Puedes escribir por NovaBot para que el equipo revise contigo el detalle de tu compra o cualquier error visual.',
      },
    ],
    related: [
      { label: 'Catalogo de recargas', href: '/catalogo/' },
      { label: 'Recargas Free Fire', href: '/recargas-free-fire/' },
      { label: 'Inicio NovasPlay', href: '/' },
    ],
  },
};

@Component({
  selector: 'app-seo-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seo-landing-page.html',
  styleUrl: './seo-landing-page.css',
})
export class SeoLandingPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly page = this.resolvePage();

  private resolvePage(): SeoPage {
    const key = this.route.snapshot.data['seoPage'] as SeoPageKey | undefined;
    return SEO_PAGES[key || 'catalog'] || SEO_PAGES.catalog;
  }
}
