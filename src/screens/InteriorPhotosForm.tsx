import { useState } from 'react';
import {
  ChevronLeft, Camera, X, Plus, AlertCircle, CheckCircle2, Upload,
  Armchair, Gauge, Wrench, MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import type {
  AppraisalFormData,
  VehicleFormData,
  InteriorPhotoState,
  InteriorSingleSlot,
  InteriorMultiSlot,
} from '../types';
import { INITIAL_INTERIOR_PHOTOS } from '../types';

interface InteriorPhotosFormProps {
  ownerData: AppraisalFormData;
  vehicleData: VehicleFormData;
  appraisalId: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

// ---- Photo Card (single slot) ----

interface SinglePhotoCardProps {
  slot: InteriorSingleSlot;
  file: File | null;
  label: string;
  onSelect: (slot: InteriorSingleSlot, file: File) => void;
  onRemove: (slot: InteriorSingleSlot) => void;
}

function SinglePhotoCard({ slot, file, label, onSelect, onRemove }: SinglePhotoCardProps) {
  const { isDark } = useTheme();
  const inputId = `interior-photo-single-${slot}`;

  return (
    <div className="relative aspect-square">
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(slot, f);
          e.target.value = '';
        }}
      />
      {file ? (
        <div className="w-full h-full rounded-xl overflow-hidden relative">
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(slot)}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
            <p className="text-white text-[10px] font-medium truncate">{label}</p>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            isDark
              ? 'border-gray-600 bg-gray-800 hover:border-blue-500 hover:bg-gray-700'
              : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/30'
          }`}
        >
          <Camera className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={`text-[11px] font-medium text-center leading-tight px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {label}
          </span>
        </label>
      )}
    </div>
  );
}

// ---- Multi-photo grid ----

interface MultiPhotoGridProps {
  slot: InteriorMultiSlot;
  files: File[];
  onAdd: (slot: InteriorMultiSlot, files: File[]) => void;
  onRemove: (slot: InteriorMultiSlot, index: number) => void;
}

function MultiPhotoGrid({ slot, files, onAdd, onRemove }: MultiPhotoGridProps) {
  const { isDark } = useTheme();
  const inputId = `interior-photo-multi-${slot}`;

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file, i) => (
        <div key={i} className="relative w-[30%] aspect-square">
          <img
            src={URL.createObjectURL(file)}
            alt={`photo ${i + 1}`}
            className="w-full h-full object-cover rounded-xl"
          />
          <button
            type="button"
            onClick={() => onRemove(slot, i)}
            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          if (picked.length) onAdd(slot, picked);
          e.target.value = '';
        }}
      />
      <label
        htmlFor={inputId}
        className={`w-[30%] aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          isDark
            ? 'border-gray-600 bg-gray-800 hover:border-blue-500'
            : 'border-gray-200 bg-gray-50 hover:border-blue-400'
        }`}
      >
        <Plus className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        <span className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Добавить</span>
      </label>
    </div>
  );
}

// ---- Section wrapper ----

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  const { isDark } = useTheme();
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      </div>
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm p-4`}>
        {children}
      </div>
    </div>
  );
}

function SubLabel({ text }: { text: string }) {
  const { isDark } = useTheme();
  return (
    <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
      {text}
    </p>
  );
}

// ---- Upload progress ----

interface UploadProgressProps {
  done: number;
  total: number;
}

function UploadProgress({ done, total }: UploadProgressProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-8">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-xs text-center">
        <Upload className="w-10 h-10 text-blue-500 mx-auto mb-4" />
        <p className="text-[16px] font-semibold text-gray-900 dark:text-white mb-1">Загрузка фотографий</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">{done} из {total}</p>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[13px] font-semibold text-blue-500 mt-2">{pct}%</p>
      </div>
    </div>
  );
}

// ---- Main component ----

export function InteriorPhotosForm({ ownerData, vehicleData, appraisalId: existingId, onBack, onSuccess }: InteriorPhotosFormProps) {
  const { isDark } = useTheme();
  const [photos, setPhotos] = useState<InteriorPhotoState>(INITIAL_INTERIOR_PHOTOS);
  const [interiorComment, setInteriorComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function countFiles(): number {
    let count = 0;
    for (const f of Object.values(photos.single)) { if (f) count++; }
    for (const arr of Object.values(photos.multi)) { count += arr.length; }
    return count;
  }

  function setSingle(slot: InteriorSingleSlot, file: File) {
    setPhotos((prev) => ({
      ...prev,
      single: { ...prev.single, [slot]: file },
    }));
  }

  function removeSingle(slot: InteriorSingleSlot) {
    setPhotos((prev) => ({
      ...prev,
      single: { ...prev.single, [slot]: null },
    }));
  }

  function addMulti(slot: InteriorMultiSlot, files: File[]) {
    setPhotos((prev) => ({
      ...prev,
      multi: { ...prev.multi, [slot]: [...prev.multi[slot], ...files] },
    }));
  }

  function removeMulti(slot: InteriorMultiSlot, index: number) {
    setPhotos((prev) => ({
      ...prev,
      multi: { ...prev.multi, [slot]: prev.multi[slot].filter((_, i) => i !== index) },
    }));
  }

  async function uploadFile(
    bucket: string,
    path: string,
    file: File,
  ): Promise<string | null> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setServerError(null);

    const totalFiles = countFiles();
    setUploadProgress({ done: 0, total: totalFiles });
    let done = 0;
    const tick = () => { done++; setUploadProgress({ done, total: totalFiles }); };

    // 1. Insert appraisal record (if not already created by PhotosForm)
    let appraisalId = existingId;

    if (!appraisalId) {
      const { data: inserted, error: insertError } = await supabase
        .from('appraisals')
        .insert({
          owner_name: ownerData.owner_name.trim(),
          owner_phone: ownerData.owner_phone.trim(),
          owner_messengers: ownerData.owner_messengers,
          owner_messenger_phone: ownerData.owner_messenger_phone.trim() || null,
          ownership_type: ownerData.ownership_type,
          sale_type: ownerData.sale_type,
          sale_reason: ownerData.sale_reason.trim() || null,
          additional_contact: ownerData.additional_contact ?? null,
          make: vehicleData.make.trim() || null,
          model: vehicleData.model.trim() || null,
          year: vehicleData.year ? parseInt(vehicleData.year) : null,
          vin: vehicleData.vin.trim() || null,
          license_plate: vehicleData.license_plate.trim().toUpperCase() || null,
          engine_volume: vehicleData.engine_volume.trim() || null,
          power_hp: vehicleData.power_hp ? parseInt(vehicleData.power_hp) : null,
          transmission: vehicleData.transmission,
          drive_type: vehicleData.drive_type,
          fuel_type: vehicleData.fuel_type,
          mileage: vehicleData.mileage ? parseInt(vehicleData.mileage) : null,
          owner_price: vehicleData.owner_price ? parseFloat(vehicleData.owner_price) : null,
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        setServerError('Не удалось сохранить оценку. Попробуйте ещё раз.');
        setSubmitting(false);
        setUploadProgress(null);
        return;
      }
      appraisalId = inserted.id as string;
    }

    // 2. Upload interior photos and collect records
    const photoRecords: { appraisal_id: string; slot: string; url: string }[] = [];

    const singleSlots = Object.entries(photos.single) as [InteriorSingleSlot, File | null][];
    for (const [slot, file] of singleSlots) {
      if (!file) continue;
      const ext = file.name.split('.').pop();
      const url = await uploadFile('car-photos', `${slot}/${Date.now()}-${appraisalId.slice(0, 8)}.${ext}`, file);
      tick();
      if (url) photoRecords.push({ appraisal_id: appraisalId, slot, url });
    }

    const multiSlots = Object.entries(photos.multi) as [InteriorMultiSlot, File[]][];
    for (const [slot, files] of multiSlots) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const url = await uploadFile('car-photos', `${slot}/${Date.now()}-${i}-${appraisalId.slice(0, 8)}.${ext}`, file);
        tick();
        if (url) photoRecords.push({ appraisal_id: appraisalId, slot, url });
      }
    }

    // 3. Insert photo records
    if (photoRecords.length > 0) {
      const { error: photoInsertError } = await supabase.from('appraisal_photos').insert(photoRecords);
      if (photoInsertError) {
        console.error('Photo records insert failed:', photoInsertError);
      }
    }

    // 4. Update appraisal with interior comment
    if (interiorComment.trim()) {
      await supabase.from('appraisals').update({ interior_comment: interiorComment.trim() }).eq('id', appraisalId);
    }

    setSubmitting(false);
    setUploadProgress(null);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-6 ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl p-8 shadow-sm w-full max-w-md text-center`}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className={`text-[20px] font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Оценка сохранена</h2>
          <p className={`text-[15px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Данные и фотографии салона успешно переданы в систему</p>
          <button
            type="button"
            onClick={onSuccess}
            className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-2xl transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {submitting && uploadProgress && (
        <UploadProgress done={uploadProgress.done} total={uploadProgress.total} />
      )}

      <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} -ml-1`}
            >
              <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className={`text-[17px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Новая оценка</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
              <div className={`w-5 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
              <div className={`w-5 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
              <div className="w-5 h-1.5 rounded-full bg-blue-500" />
            </div>
          </div>
          <div className={`px-5 pb-2 text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            Шаг 4 из 4 — Фотографии салона
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-4 py-4 max-w-md mx-auto w-full pb-8">

          {/* Interior — door angles */}
          <Section title="Салон — ракурсы дверей" icon={<Armchair className="w-3.5 h-3.5 text-white" />}>
            <div className="grid grid-cols-2 gap-2.5">
              <SinglePhotoCard slot="interior_driver" file={photos.single.interior_driver} label="С водительской двери" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="interior_left_pass" file={photos.single.interior_left_pass} label="С левой пассажирской двери" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="interior_right_rear" file={photos.single.interior_right_rear} label="С правой задней двери" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="interior_front_pass" file={photos.single.interior_front_pass} label="С передней пассажирской стороны" onSelect={setSingle} onRemove={removeSingle} />
            </div>
          </Section>

          {/* Interior — dashboard & console */}
          <Section title="Приборная панель и консоль" icon={<Gauge className="w-3.5 h-3.5 text-white" />}>
            <div className="grid grid-cols-2 gap-2.5">
              <SinglePhotoCard slot="interior_dashboard" file={photos.single.interior_dashboard} label="Приборная панель с пробегом" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="interior_console" file={photos.single.interior_console} label="Центральная консоль" onSelect={setSingle} onRemove={removeSingle} />
            </div>
          </Section>

          {/* Interior extras */}
          <Section title="Дополнительная комплектация" icon={<Camera className="w-3.5 h-3.5 text-white" />}>
            <MultiPhotoGrid
              slot="interior_extras"
              files={photos.multi.interior_extras}
              onAdd={addMulti}
              onRemove={removeMulti}
            />
            {photos.multi.interior_extras.length === 0 && (
              <p className={`text-[12px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Добавьте фото дополнительной комплектации
              </p>
            )}
          </Section>

          {/* Interior defects */}
          <Section title="Дефекты салона" icon={<Wrench className="w-3.5 h-3.5 text-white" />}>
            <MultiPhotoGrid
              slot="interior_defects"
              files={photos.multi.interior_defects}
              onAdd={addMulti}
              onRemove={removeMulti}
            />
            {photos.multi.interior_defects.length === 0 && (
              <p className={`text-[12px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Добавьте фото дефектов салона: потёртости, поломки, пятна
              </p>
            )}
          </Section>

          {/* Interior comment */}
          <Section title="Комментарии по салону" icon={<MessageSquare className="w-3.5 h-3.5 text-white" />}>
            <textarea
              value={interiorComment}
              onChange={e => setInteriorComment(e.target.value)}
              placeholder="Опишите состояние салона: чистота, износ, запах, особенности комплектации..."
              rows={4}
              className={`w-full rounded-xl px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-all ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'}`}
            />
          </Section>

          {serverError && (
            <div className={`mb-4 border rounded-2xl px-4 py-3 flex items-start gap-2.5 ${isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-100'}`}>
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-500">{serverError}</p>
            </div>
          )}

          {/* Summary badge */}
          {countFiles() > 0 && (
            <div className={`mb-3 px-4 py-3 rounded-2xl flex items-center gap-2.5 ${isDark ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-100'}`}>
              <Camera className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
              <p className={`text-[13px] font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                Выбрано фотографий: {countFiles()}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-60 text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all duration-150 active:scale-[0.98]"
          >
            {submitting ? 'Сохранение...' : 'Сохранить оценку'}
          </button>
        </form>
      </div>
    </>
  );
}
