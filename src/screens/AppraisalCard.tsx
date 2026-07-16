import { useState } from 'react';
import { Car, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import type { Appraisal } from '../types';
import { TRANSMISSION_LABELS, DRIVE_LABELS, FUEL_LABELS } from '../types';

function formatPrice(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
}

function formatMileage(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('ru-RU').format(value) + ' км';
}

function formatPower(value: number | null): string {
  if (value === null) return null;
  return value + ' л.с.';
}

function formatVolume(value: string | null): string {
  if (!value) return null;
  return value;
}

export interface AppraisalCardProps {
  appraisal: Appraisal;
  frontPhotoUrl?: string | null;
  onOpen: (id: string) => void;
  onTogglePurchased: (id: string, current: boolean) => void;
  onDelete?: (id: string) => void;
}

export function AppraisalCard({ appraisal, frontPhotoUrl, onOpen, onTogglePurchased, onDelete }: AppraisalCardProps) {
  const { isDark } = useTheme();
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setToggling(true);
    await onTogglePurchased(appraisal.id, appraisal.is_purchased);
    setToggling(false);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    await supabase.from('appraisals').delete().eq('id', appraisal.id);
    setDeleting(false);
    setConfirmDelete(false);
    onDelete?.(appraisal.id);
  }

  function handleTrashClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  const title = [appraisal.make, appraisal.model, appraisal.year].filter(Boolean).join(' ') || 'Без названия';
  const vin = appraisal.vin || appraisal.license_plate || null;
  const showPhoto = frontPhotoUrl && !imgError;

  // Build spec chips: КПП, топливо, привод, объём, мощность
  const specChips: string[] = [];
  if (appraisal.transmission) specChips.push(TRANSMISSION_LABELS[appraisal.transmission]);
  if (appraisal.fuel_type) specChips.push(FUEL_LABELS[appraisal.fuel_type]);
  if (appraisal.drive_type) specChips.push(DRIVE_LABELS[appraisal.drive_type]);
  const vol = formatVolume(appraisal.engine_volume);
  if (vol) specChips.push(vol);
  const power = formatPower(appraisal.power_hp);
  if (power) specChips.push(power);

  return (
    <div className={`w-full rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <button
        type="button"
        onClick={() => onOpen(appraisal.id)}
        className="w-full text-left active:scale-[0.98] transition-transform duration-100"
      >
        {/* Photo — 4:3 aspect ratio, object-contain so it's never cropped */}
        <div className={`relative w-full aspect-[4/3] overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          {showPhoto ? (
            <img
              src={frontPhotoUrl!}
              alt={title}
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Car className={`w-10 h-10 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            </div>
          )}
          {/* Status badge over photo */}
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-sm ${
              appraisal.is_purchased
                ? isDark ? 'bg-green-900/70 text-green-300' : 'bg-green-500/85 text-white'
                : isDark ? 'bg-red-900/70 text-red-300' : 'bg-red-500/85 text-white'
            }`}>
              {appraisal.is_purchased ? 'Выкуплен' : 'Не выкуплен'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-3.5 pt-3 pb-1">
          {/* Title + toggle + chevron */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-semibold truncate ${isDark ? 'text-white' : 'text-ink'}`}>{title}</p>
              {vin && (
                <p className={`text-[12px] font-mono mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {appraisal.vin ? `VIN: ${vin}` : vin}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  appraisal.is_purchased
                    ? isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                    : isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'
                } ${toggling ? 'opacity-50' : 'active:scale-95'}`}
              >
                {appraisal.is_purchased ? 'Выкуплен' : 'Не выкуплен'}
              </button>
              <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            </div>
          </div>

          {/* Spec chips: АКПП · Бензин · Полный · 2.0 · 251 л.с. */}
          {specChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {specChips.map((chip, i) => (
                <span key={i} className={`px-2 py-0.5 rounded-md text-[12px] font-medium ${
                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {chip}
                </span>
              ))}
            </div>
          )}

          {/* Prices + mileage */}
          <div className="grid grid-cols-3 gap-3 mt-3 pb-1">
            <div>
              <p className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Пробег</p>
              <p className={`text-[14px] font-semibold mt-0.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatMileage(appraisal.mileage)}</p>
            </div>
            <div>
              <p className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Цена владельца</p>
              <p className={`text-[14px] font-semibold mt-0.5 ${isDark ? 'text-brand-400' : 'text-brand-600'}`}>{formatPrice(appraisal.owner_price)}</p>
            </div>
            <div>
              <p className={`text-[11px] font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Цена выкупа</p>
              <p className={`text-[14px] font-semibold mt-0.5 text-green-500`}>{formatPrice(appraisal.purchase_price)}</p>
            </div>
          </div>
        </div>
      </button>

      <div className={`px-3.5 py-2.5 border-t flex items-center justify-between gap-3 ${isDark ? 'border-gray-700' : 'border-gray-50'}`}>
        <p className={`text-[12px] flex-1 min-w-0 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Владелец: <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{appraisal.owner_name}</span>
          {' · '}
          <span>{new Date(appraisal.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </p>
        {onDelete && !confirmDelete && (
          <button type="button" onClick={handleTrashClick} className={`flex-shrink-0 p-1 transition-colors ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {onDelete && confirmDelete && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Удалить?</span>
            <button type="button" onClick={handleDelete} disabled={deleting} className="px-2 py-0.5 rounded text-[12px] font-semibold bg-red-500 text-white disabled:opacity-50">Да</button>
            <button type="button" onClick={handleCancelDelete} className={`px-2 py-0.5 rounded text-[12px] font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Нет</button>
          </div>
        )}
      </div>
    </div>
  );
}

export async function togglePurchasedInDB(id: string, current: boolean): Promise<boolean> {
  const { error } = await supabase.from('appraisals').update({ is_purchased: !current }).eq('id', id);
  return !error;
}

/**
 * Batch-fetch the front photo URL for a list of appraisal IDs.
 * Returns a map of appraisalId -> photo URL.
 */
export async function fetchFrontPhotos(appraisalIds: string[]): Promise<Record<string, string>> {
  if (appraisalIds.length === 0) return {};
  const { data, error } = await supabase
    .from('appraisal_photos')
    .select('appraisal_id, url')
    .in('appraisal_id', appraisalIds)
    .eq('slot', 'front');
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const row of data) {
    if (!map[row.appraisal_id]) map[row.appraisal_id] = row.url;
  }
  return map;
}
