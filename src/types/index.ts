export type OwnershipType = 'individual' | 'reseller';
export type SaleType = 'buyout' | 'trade_in';
export type TransmissionType = 'automatic' | 'manual' | 'robot' | 'cvt';
export type DriveType = 'front' | 'rear' | 'all';
export type FuelType = 'petrol' | 'diesel' | 'gas' | 'hybrid' | 'electric';

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  automatic: 'АКПП',
  manual: 'МКПП',
  robot: 'РКПП',
  cvt: 'CVT',
};

export const DRIVE_LABELS: Record<DriveType, string> = {
  front: 'Передний',
  rear: 'Задний',
  all: 'Полный',
};

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: 'Бензин',
  diesel: 'Дизель',
  gas: 'Газ',
  hybrid: 'Гибрид',
  electric: 'Электро',
};

export const OWNERSHIP_LABELS: Record<OwnershipType, string> = {
  individual: 'Физ. лицо',
  reseller: 'Перекуп',
};

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  buyout: 'Выкуп',
  trade_in: 'Трейд-ин',
};

export const MESSENGER_OPTIONS = [
  { value: 'max', label: 'MAX' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
] as const;

export const MESSENGER_LABELS: Record<string, string> = {
  max: 'MAX',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};

export interface PresaleCost {
  id: string;
  type: string;
  cost: number;
}

export interface AdditionalContact {
  name: string;
  phone: string;
  contact_type: string;
  messengers: string[];
  messenger_phone: string;
}

export interface AppraisalFormData {
  owner_name: string;
  owner_phone: string;
  owner_messengers: string[];
  owner_messenger_phone: string;
  ownership_type: OwnershipType;
  sale_type: SaleType;
  sale_reason: string;
  additional_contact: AdditionalContact | null;
}

export interface VehicleFormData {
  make: string;
  model: string;
  year: string;
  vin: string;
  license_plate: string;
  engine_volume: string;
  power_hp: string;
  transmission: TransmissionType;
  drive_type: DriveType;
  fuel_type: FuelType;
  mileage: string;
  owner_price: string;
}

export type SinglePhotoSlot =
  | 'sts'
  | 'front'
  | 'left'
  | 'rear'
  | 'right'
  | 'front_light_left'
  | 'front_light_right'
  | 'rear_light_left'
  | 'rear_light_right'
  | 'tire_specs'
  | 'tire_date'
  | 'windshield'
  | 'interior_driver'
  | 'interior_left_pass'
  | 'interior_right_rear'
  | 'interior_front_pass'
  | 'interior_dashboard'
  | 'interior_console'
  | 'interior_extras';

export type MultiPhotoSlot = 'body_extra' | 'body_defects' | 'interior_extras' | 'interior_defects';

export interface PhotoState {
  single: Record<SinglePhotoSlot, File | null>;
  multi: Record<MultiPhotoSlot, File[]>;
}

export const INITIAL_PHOTOS: PhotoState = {
  single: {
    sts: null,
    front: null,
    left: null,
    rear: null,
    right: null,
    front_light_left: null,
    front_light_right: null,
    rear_light_left: null,
    rear_light_right: null,
    tire_specs: null,
    tire_date: null,
    windshield: null,
  },
  multi: {
    body_extra: [],
    body_defects: [],
    interior_extras: [],
    interior_defects: [],
  },
};

export interface AppraisalPhoto {
  id: string;
  appraisal_id: string;
  slot: string;
  url: string;
  created_at: string;
}

export interface Appraisal {
  id: string;
  owner_name: string;
  owner_phone: string;
  owner_messengers: string[] | null;
  owner_messenger_phone: string | null;
  ownership_type: OwnershipType;
  sale_type: SaleType;
  sale_reason: string | null;
  additional_contact: AdditionalContact | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  license_plate: string | null;
  engine_volume: string | null;
  power_hp: number | null;
  transmission: TransmissionType | null;
  drive_type: DriveType | null;
  fuel_type: FuelType | null;
  mileage: number | null;
  owner_price: number | null;
  purchase_price: number | null;
  is_purchased: boolean;
  sale_price: number | null;
  car_condition_comment: string | null;
  car_condition_pdf_url: string | null;
  autoteka_url: string | null;
  autoteka_pdf_url: string | null;
  presale_costs: PresaleCost[] | null;
  sts_photo_url: string | null;
  created_at: string;
}
