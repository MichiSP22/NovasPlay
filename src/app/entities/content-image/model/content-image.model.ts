export enum ContentImageCategory {
  Announcements = 'anuncios',
  News = 'novedades',
  Promotions = 'promociones',
}

export const CONTENT_IMAGE_CATEGORY_OPTIONS = [
  {
    value: ContentImageCategory.Announcements,
    label: 'Anuncios',
    description: 'Popup principal al cargar la pagina.',
  },
  {
    value: ContentImageCategory.News,
    label: 'Novedades',
    description: 'Imagenes para secciones informativas.',
  },
  {
    value: ContentImageCategory.Promotions,
    label: 'Promociones',
    description: 'Banners y piezas de ofertas especiales.',
  },
] as const;

export interface ContentImage {
  id?: number;
  category: ContentImageCategory | string;
  link?: string;
  targetLink?: string;
  startsAt?: string;
  expiresAt?: string;
  active: boolean;
  createdAt?: string;
  imageFile?: File;
}
