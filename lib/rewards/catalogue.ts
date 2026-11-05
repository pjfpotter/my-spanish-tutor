/**
 * What coins buy (task 13.3). Every item has one fixed price and the student gets exactly the item they pay
 * for. There are no packs, no chances and no real-money path anywhere: this file is the whole shop.
 */
export type ItemKind = 'wallpaper' | 'object' | 'sticker' | 'freeze';

export interface ShopItem {
  id: string;
  kind: ItemKind;
  es: string;
  en: string;
  price: number;
  /** Wallpapers: the CSS background. Drawn in CSS so there is nothing to download. */
  css?: string;
}

export const FREEZE_ID = 'freeze';
/** Unused freezes a student can hold at once, so they cannot be hoarded to make a streak unbreakable. */
export const MAX_FREEZES = 2;

export const CATALOGUE: readonly ShopItem[] = [
  { id: 'wall-caramelo', kind: 'wallpaper', es: 'Cielo de caramelo', en: 'Candy sky', price: 40, css: 'linear-gradient(#4fa9f0, #9ad6ff 60%, #ddf3ff)' },
  { id: 'wall-colinas', kind: 'wallpaper', es: 'Colinas sin fin', en: 'Endless hills', price: 60, css: 'linear-gradient(#9ad6ff 55%, #8fdb4a 55%, #5bbb2e)' },
  { id: 'wall-estatica', kind: 'wallpaper', es: 'Estática rosa', en: 'Pink static', price: 60, css: 'repeating-linear-gradient(0deg, #ff5fa8 0 3px, #ffd0e6 3px 6px)' },

  { id: 'obj-lampara', kind: 'object', es: 'La luz encendida', en: 'The light left on', price: 50 },
  { id: 'obj-reloj', kind: 'object', es: 'El reloj que miente', en: 'The clock that lies', price: 80 },
  { id: 'obj-planta', kind: 'object', es: 'La planta que escucha', en: 'The plant that listens', price: 50 },

  { id: 'stk-ojo', kind: 'sticker', es: 'Ojo', en: 'Eye', price: 20 },
  { id: 'stk-antena', kind: 'sticker', es: 'Antena', en: 'Antenna', price: 20 },
  { id: 'stk-nube', kind: 'sticker', es: 'Nube', en: 'Cloud', price: 20 },
  { id: 'stk-sol', kind: 'sticker', es: 'Sol con ojos', en: 'Sun with eyes', price: 30 },

  { id: FREEZE_ID, kind: 'freeze', es: 'Congelador de racha', en: 'Streak freeze', price: 30 },
];

export const itemById = (id: string): ShopItem | undefined => CATALOGUE.find((i) => i.id === id);
