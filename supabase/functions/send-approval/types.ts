export interface PresaleCost {
  type: string;
  amount: number;
}

export interface Appraisal {
  id: string;

  owner_name: string;
  owner_phone: string;
  ownership_type: string;
  sale_type: string;
  sale_reason: string | null;

  make: string | null;
  model: string | null;
  year: number | null;

  engine_volume: string | null;
  power_hp: number | null;

  transmission: string | null;
  drive_type: string | null;
  fuel_type: string | null;

  mileage: number | null;

  owner_price: number | string | null;
  purchase_price: number | string | null;

  car_condition_comment: string | null;

  car_condition_pdf_url: string | null;

  autoteka_url: string | null;
  autoteka_pdf_url: string | null;

  approval_status: string;
  approval_sent_at: string | null;

  presale_costs: PresaleCost[] | null;
}

export interface AppraisalPhoto {
  id: string;
  appraisal_id: string;
  slot: string;
  url: string;
}