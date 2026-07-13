import { useState } from 'react';
import {
  ChevronLeft, Camera, X, Plus, AlertCircle, CheckCircle2, Upload,
  FileImage, Eye, Car, Zap, CircleDot, Layers, FileText, ClipboardList, Link,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import type {
  AppraisalFormData,
  VehicleFormData,
  PhotoState,
  SinglePhotoSlot,
  MultiPhotoSlot,
} from '../types';
import { INITIAL_PHOTOS } from '../types';

interface PhotosFormProps {
  ownerData: AppraisalFormData;
  vehicleData: VehicleFormData;
  onBack: () => void;
  onSuccess: () => void;
}

// ---- Photo Card (single slot) ----

interface SinglePhotoCardProps {
  slot: SinglePhotoSlot;
  file: File | null;
  label: string;
  onSelect: (slot: SinglePhotoSlot, file: File) => void;
  onRemove: (slot: SinglePhotoSlot) => void;
}

function SinglePhotoCard({ slot, file, label, onSelect, onRemove }: SinglePhotoCardProps) {
  const { isDark } = useTheme();
  const inputId = `photo-single-${slot}`;

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
  slot: MultiPhotoSlot;
  files: File[];
  onAdd: (slot: MultiPhotoSlot, files: File[]) => void;
  onRemove: (slot: MultiPhotoSlot, index: number) => void;
}

function MultiPhotoGrid({ slot, files, onAdd, onRemove }: MultiPhotoGridProps) {
  const { isDark } = useTheme();
  const inputId = `photo-multi-${slot}`;

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

// ---- Sub-label ----
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

export function PhotosForm({ ownerData, vehicleData, onBack, onSuccess }: PhotosFormProps) {
  const { isDark } = useTheme();
  const [photos, setPhotos] = useState<PhotoState>(INITIAL_PHOTOS);
  const [conditionPdf, setConditionPdf] = useState<File | null>(null);
  const [conditionComment, setConditionComment] = useState('');
  const [autotekaUrl, setAutotekaUrl] = useState('');
  const [autotekaPdf, setAutotekaPdf] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Count total files to upload
  function countFiles(): number {
    let count = 0;
    for (const f of Object.values(photos.single)) { if (f) count++; }
    for (const arr of Object.values(photos.multi)) { count += arr.length; }
    if (conditionPdf) count++;
    if (autotekaPdf) count++;
    return count;
  }

  function setSingle(slot: SinglePhotoSlot, file: File) {
    setPhotos((prev) => ({
      ...prev,
      single: { ...prev.single, [slot]: file },
    }));
  }

  function removeSingle(slot: SinglePhotoSlot) {
    setPhotos((prev) => ({
      ...prev,
      single: { ...prev.single, [slot]: null },
    }));
  }

  function addMulti(slot: MultiPhotoSlot, files: File[]) {
    setPhotos((prev) => ({
      ...prev,
      multi: { ...prev.multi, [slot]: [...prev.multi[slot], ...files] },
    }));
  }

  function removeMulti(slot: MultiPhotoSlot, index: number) {
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

    const tick = () => {
      done++;
      setUploadProgress({ done, total: totalFiles });
    };

    // 1. Upload STS photo (goes to appraisals.sts_photo_url)
    let stsPhotoUrl: string | null = null;
    if (photos.single.sts) {
      const ext = photos.single.sts.name.split('.').pop();
      stsPhotoUrl = await uploadFile('sts-photos', `${Date.now()}-sts.${ext}`, photos.single.sts);
      tick();
      if (!stsPhotoUrl) {
        setServerError('Не удалось загрузить фото СТС. Попробуйте ещё раз.');
        setSubmitting(false);
        setUploadProgress(null);
        return;
      }
    }

    // 2. Insert appraisal record
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
        sts_photo_url: stsPhotoUrl,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      setServerError('Не удалось сохранить оценку. Попробуйте ещё раз.');
      setSubmitting(false);
      setUploadProgress(null);
      return;
    }

    const appraisalId = inserted.id as string;

    // 3. Upload car photos and collect records
    const photoRecords: { appraisal_id: string; slot: string; url: string }[] = [];

    // Single slots (excluding sts which was already handled)
    const singleSlots = Object.entries(photos.single) as [SinglePhotoSlot, File | null][];
    for (const [slot, file] of singleSlots) {
      if (!file || slot === 'sts') continue;
      const ext = file.name.split('.').pop();
      const url = await uploadFile('car-photos', `${slot}/${Date.now()}-${appraisalId.slice(0, 8)}.${ext}`, file);
      tick();
      if (url) photoRecords.push({ appraisal_id: appraisalId, slot, url });
    }

    // Multi slots
    const multiSlots = Object.entries(photos.multi) as [MultiPhotoSlot, File[]][];
    for (const [slot, files] of multiSlots) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const url = await uploadFile('car-photos', `${slot}/${Date.now()}-${i}-${appraisalId.slice(0, 8)}.${ext}`, file);
        tick();
        if (url) photoRecords.push({ appraisal_id: appraisalId, slot, url });
      }
    }

    // 4. Upload condition PDF
    let conditionPdfUrl: string | null = null;
    if (conditionPdf) {
      const ext = conditionPdf.name.split('.').pop();
      conditionPdfUrl = await uploadFile('documents', `condition/${Date.now()}-${appraisalId.slice(0, 8)}.${ext}`, conditionPdf);
      tick();
    }

    // 5. Upload autoteka PDF
    let autotekaPdfUrl: string | null = null;
    if (autotekaPdf) {
      const ext = autotekaPdf.name.split('.').pop();
      autotekaPdfUrl = await uploadFile('documents', `autoteka/${Date.now()}-${appraisalId.slice(0, 8)}.${ext}`, autotekaPdf);
      tick();
    }

    // 6. Update appraisal with condition + autoteka fields
    const updateFields: Record<string, unknown> = {};
    if (conditionPdfUrl || conditionComment.trim()) {
      updateFields.car_condition_pdf_url = conditionPdfUrl;
      updateFields.car_condition_comment = conditionComment.trim() || null;
    }
    if (autotekaPdfUrl || autotekaUrl.trim()) {
      updateFields.autoteka_pdf_url = autotekaPdfUrl;
      updateFields.autoteka_url = autotekaUrl.trim() || null;
    }
    if (Object.keys(updateFields).length > 0) {
      await supabase.from('appraisals').update(updateFields).eq('id', appraisalId);
    }

    // 7. Insert photo records
    if (photoRecords.length > 0) {
      const { error: photoInsertError } = await supabase.from('appraisal_photos').insert(photoRecords);
      if (photoInsertError) {
        // Appraisal is saved — just warn but don't block
        console.error('Photo records insert failed:', photoInsertError);
      }
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
          <p className={`text-[15px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Данные и фотографии успешно переданы в систему</p>
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
              <div className="w-5 h-1.5 rounded-full bg-blue-500" />
            </div>
          </div>
          <div className={`px-5 pb-2 text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
            Шаг 3 из 3 — Фотографии автомобиля
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-4 py-4 max-w-md mx-auto w-full pb-8">

          {/* Documents */}
          <Section title="Документы" icon={<FileImage className="w-3.5 h-3.5 text-white" />}>
            <div className="grid grid-cols-2 gap-2.5">
              <SinglePhotoCard slot="sts" file={photos.single.sts} label="Фото СТС" onSelect={setSingle} onRemove={removeSingle} />
              <div className={`aspect-square rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <span className={`text-[11px] text-center px-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Слот для документа</span>
              </div>
            </div>
          </Section>

          {/* Exterior */}
          <Section title="Кузов — основные ракурсы" icon={<Car className="w-3.5 h-3.5 text-white" />}>
            <div className="grid grid-cols-2 gap-2.5">
              <SinglePhotoCard slot="front" file={photos.single.front} label="Передняя часть" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="left" file={photos.single.left} label="Левая сторона" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="rear" file={photos.single.rear} label="Задняя часть" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="right" file={photos.single.right} label="Правая сторона" onSelect={setSingle} onRemove={removeSingle} />
            </div>
          </Section>

          {/* Optics */}
          <Section title="Оптика" icon={<Zap className="w-3.5 h-3.5 text-white" />}>
            <SubLabel text="Передняя оптика" />
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <SinglePhotoCard slot="front_light_left" file={photos.single.front_light_left} label="Левая" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="front_light_right" file={photos.single.front_light_right} label="Правая" onSelect={setSingle} onRemove={removeSingle} />
            </div>
            <SubLabel text="Задняя оптика" />
            <div className="grid grid-cols-2 gap-2.5">
              <SinglePhotoCard slot="rear_light_left" file={photos.single.rear_light_left} label="Левая" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="rear_light_right" file={photos.single.rear_light_right} label="Правая" onSelect={setSingle} onRemove={removeSingle} />
            </div>
          </Section>

          {/* Tires */}
          <Section title="Резина" icon={<CircleDot className="w-3.5 h-3.5 text-white" />}>
            <div className="grid grid-cols-2 gap-2.5">
              <SinglePhotoCard slot="tire_specs" file={photos.single.tire_specs} label="Параметры резины" onSelect={setSingle} onRemove={removeSingle} />
              <SinglePhotoCard slot="tire_date" file={photos.single.tire_date} label="Дата выпуска" onSelect={setSingle} onRemove={removeSingle} />
            </div>
          </Section>

          {/* Windshield */}
          <Section title="Лобовое стекло" icon={<Eye className="w-3.5 h-3.5 text-white" />}>
            <div className="grid grid-cols-2 gap-2.5">
              <SinglePhotoCard slot="windshield" file={photos.single.windshield} label="Маркировка стекла" onSelect={setSingle} onRemove={removeSingle} />
              <div className={`aspect-square rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`} />
            </div>
          </Section>

          {/* Additional body photos */}
          <Section title="Дополнительные фото кузова" icon={<Layers className="w-3.5 h-3.5 text-white" />}>
            <MultiPhotoGrid
              slot="body_extra"
              files={photos.multi.body_extra}
              onAdd={addMulti}
              onRemove={removeMulti}
            />
            {photos.multi.body_extra.length === 0 && (
              <p className={`text-[12px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Добавьте любое количество дополнительных фото кузова
              </p>
            )}
          </Section>

          {/* Body defects */}
          <Section title="Фото дефектов кузова" icon={<AlertCircle className="w-3.5 h-3.5 text-white" />}>
            <MultiPhotoGrid
              slot="body_defects"
              files={photos.multi.body_defects}
              onAdd={addMulti}
              onRemove={removeMulti}
            />
            {photos.multi.body_defects.length === 0 && (
              <p className={`text-[12px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Добавьте фото царапин, вмятин и других дефектов
              </p>
            )}
          </Section>

          {/* Condition */}
          <Section title="Состояние автомобиля" icon={<ClipboardList className="w-3.5 h-3.5 text-white" />}>
            <SubLabel text="Отчёт толщинометра (PDF)" />
            {conditionPdf ? (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <span className={`flex-1 min-w-0 text-[13px] truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{conditionPdf.name}</span>
                <button type="button" onClick={() => setConditionPdf(null)}>
                  <X className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>
              </div>
            ) : (
              <>
                <input id="condition-pdf" type="file" accept="application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setConditionPdf(f); e.target.value = ''; }} />
                <label htmlFor="condition-pdf"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors mb-4 ${isDark ? 'border-gray-600 bg-gray-700/40 hover:border-blue-500' : 'border-gray-200 bg-gray-50 hover:border-blue-400'}`}>
                  <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={`text-[13px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Прикрепить PDF файл</span>
                </label>
              </>
            )}
            <SubLabel text="Комментарий по состоянию" />
            <textarea
              value={conditionComment}
              onChange={e => setConditionComment(e.target.value)}
              placeholder="Опишите состояние автомобиля, выявленные дефекты, особенности..."
              rows={4}
              className={`w-full rounded-xl px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-all ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'}`}
            />
          </Section>

          {/* Autoteka */}
          <Section title="Автотека" icon={<Link className="w-3.5 h-3.5 text-white" />}>
            <SubLabel text="Ссылка на отчёт" />
            <div className="relative mb-4">
              <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="url"
                inputMode="url"
                value={autotekaUrl}
                onChange={e => setAutotekaUrl(e.target.value)}
                placeholder="https://autoteka.ru/..."
                className={`w-full rounded-xl px-4 py-3 pl-10 text-[14px] outline-none focus:ring-2 focus:ring-blue-400 transition-all ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'}`}
              />
            </div>
            <SubLabel text="PDF файл Автотеки" />
            {autotekaPdf ? (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                <span className={`flex-1 min-w-0 text-[13px] truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{autotekaPdf.name}</span>
                <button type="button" onClick={() => setAutotekaPdf(null)}>
                  <X className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </button>
              </div>
            ) : (
              <>
                <input id="autoteka-pdf" type="file" accept="application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setAutotekaPdf(f); e.target.value = ''; }} />
                <label htmlFor="autoteka-pdf"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 bg-gray-700/40 hover:border-blue-500' : 'border-gray-200 bg-gray-50 hover:border-blue-400'}`}>
                  <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={`text-[13px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Прикрепить PDF файл</span>
                </label>
              </>
            )}
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
