import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Car, AlertCircle, X, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { loadMarks, loadModels, filterMarks, filterModels } from '../lib/carsApi';
import { searchModels as staticSearchModels } from '../lib/carDatabase';
import type { AppraisalFormData, VehicleFormData, TransmissionType, DriveType, FuelType } from '../types';

interface VehicleFormProps {
  onBack: () => void;
  onNext: (data: VehicleFormData) => void;
  ownerData: AppraisalFormData;
  initial?: VehicleFormData;
}

const defaultVehicle: VehicleFormData = {
  make: '', model: '', year: '', vin: '', license_plate: '',
  engine_volume: '', power_hp: '', transmission: 'automatic',
  drive_type: 'front', fuel_type: 'petrol', mileage: '', owner_price: '',
};

// ---- Price formatting helpers ----

function formatPriceDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('ru-RU').format(Number(digits));
}

function parsePriceRaw(display: string): string {
  return display.replace(/\D/g, '');
}

// ---- License plate helpers ----

const CYRILLIC_RU = 'АВЕКМНОРСТУХ'; // valid Russian plate letters

function formatLicensePlate(input: string): string {
  // Strip everything except alphanumeric and spaces, uppercase
  const clean = input.toUpperCase().replace(/[^А-ЯA-Z0-9\s]/g, '');
  const digits = clean.replace(/\D/g, '');
  const letters = clean.replace(/[^А-ЯA-Z]/g, '');

  // Extract digits only from raw input for the numeric parts
  const raw = input.toUpperCase().replace(/\s/g, '');
  let result = '';
  let pos = 0;

  // Build character by character based on expected plate positions:
  // Pos 0: letter, 1-3: digits, 4-5: letters, 6-8: region digits
  for (const char of raw) {
    if (pos === 0) {
      if (/[А-ЯA-Z]/.test(char)) { result += char; pos++; }
    } else if (pos >= 1 && pos <= 3) {
      if (/\d/.test(char)) { result += char; pos++; }
    } else if (pos >= 4 && pos <= 5) {
      if (/[А-ЯA-Z]/.test(char)) { result += char; pos++; }
    } else if (pos >= 6 && pos <= 8) {
      if (/\d/.test(char)) { result += char; pos++; }
    }
    if (pos > 8) break;
  }

  // Insert spaces: А 111 АА 123
  if (result.length === 0) return '';
  let formatted = result[0];
  if (result.length > 1) formatted += ' ' + result.slice(1, 4);
  if (result.length > 4) formatted += ' ' + result.slice(4, 6);
  if (result.length > 6) formatted += ' ' + result.slice(6);
  return formatted;
}

function isLicensePlateValid(plate: string): boolean {
  // A 111 AA 123 format: 1 letter + 3 digits + 2 letters + 2-3 digits
  const raw = plate.replace(/\s/g, '');
  return /^[А-ЯA-Z]\d{3}[А-ЯA-Z]{2}\d{2,3}$/.test(raw);
}

// ---- VIN / body number helpers ----

// Body number format for Japanese RHD cars:
// Part 1 (model code): alphanumeric 3-8 chars, may contain hyphen (e.g. CBA-AZR60 or ZVW30)
// Part 2 (serial): digits only
//   Toyota/Mitsubishi/Honda: 7 digits
//   Nissan/Mazda/Subaru: 6 digits
const BODY_BRANDS_7 = ['TOYOTA', 'MITSUBISHI', 'HONDA'];
const BODY_BRANDS_6 = ['NISSAN', 'MAZDA', 'SUBARU'];

function detectBodyNumber(value: string, make: string): boolean {
  // If it contains a hyphen and no standard VIN chars at known positions, likely body number
  return value.includes('-') || (value.length > 0 && value.length < 17 && !/^[0-9A-HJ-NPR-Z]{17}$/i.test(value));
}

function validateVinOrBody(value: string, make: string): string | null {
  if (!value.trim()) return null;

  const trimmed = value.trim().toUpperCase();
  const upperMake = make.trim().toUpperCase();

  // Classic 17-char VIN
  if (/^[0-9A-HJ-NPR-Z]{17}$/i.test(trimmed)) {
    if (trimmed.length !== 17) return 'VIN должен содержать 17 символов';
    return null;
  }

  // Over 17 chars is always wrong
  if (trimmed.replace(/-/g, '').length > 17) return 'VIN не может быть длиннее 17 символов';

  // Body number: ModelCode-SerialNumber or ModelCodeSerialNumber
  const isBodyMake = BODY_BRANDS_7.includes(upperMake) || BODY_BRANDS_6.includes(upperMake);

  // Try body number format
  // Allow: XXXXX-NNNNNNN or XXXXXNNNNNNN (model code 3-8 alnum chars, then serial digits)
  const bodyMatch = trimmed.match(/^([A-Z0-9]{3,8})-?(\d+)$/);
  if (bodyMatch) {
    const serial = bodyMatch[2];
    if (BODY_BRANDS_7.includes(upperMake)) {
      if (serial.length !== 7) return `Для ${make} серийный номер кузова должен содержать 7 цифр`;
      return null;
    }
    if (BODY_BRANDS_6.includes(upperMake)) {
      if (serial.length !== 6) return `Для ${make} серийный номер кузова должен содержать 6 цифр`;
      return null;
    }
    // Unknown brand but looks like body number — accept if serial 6-7 digits
    if (serial.length >= 6 && serial.length <= 7) return null;
    return 'Серийный номер кузова должен содержать 6–7 цифр';
  }

  // Could still be a partial input — only show error if length >= 8 and doesn't match
  if (trimmed.length >= 8) {
    return 'Некорректный VIN или номер кузова';
  }

  return null;
}

// ---- Shared primitives ----

interface FieldProps { label: string; required?: boolean; children: React.ReactNode; error?: string; hint?: string; }
function Field({ label, required, children, error, hint }: FieldProps) {
  const { isDark } = useTheme();
  return (
    <div>
      <label className={`block text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className={`mt-1.5 text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{hint}</p>}
      {error && <p className="mt-1.5 text-[12px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}</p>}
    </div>
  );
}

interface ToggleGroupProps<T extends string> { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; }
function ToggleGroup<T extends string>({ value, options, onChange }: ToggleGroupProps<T>) {
  const { isDark } = useTheme();
  return (
    <div className={`flex rounded-xl p-1 gap-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-1 rounded-lg text-[13px] font-medium transition-all duration-200 ${value === opt.value ? isDark ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface PillGridProps<T extends string> { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; }
function PillGrid<T extends string>({ value, options, onChange }: PillGridProps<T>) {
  const { isDark } = useTheme();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-xl text-[14px] font-medium border transition-all duration-200 ${value === opt.value ? 'bg-blue-500 text-white border-blue-500' : isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-600 border-gray-200'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---- Car Autocomplete ----

interface CarAutoCompleteProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
  suggestions: { id: string; name: string }[];
  loading?: boolean;
  placeholder: string;
  confirmed: boolean;
  error?: boolean;
}

function CarAutocomplete({ value, onChange, onSelect, onClear, suggestions, loading, placeholder, confirmed, error }: CarAutoCompleteProps) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const show = open && (suggestions.length > 0 || loading);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center rounded-xl border transition-all overflow-hidden ${
        confirmed ? isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-300'
          : error ? 'ring-2 ring-red-300 border-transparent' : isDark ? 'border-gray-600' : 'border-gray-200'
      } ${open && !error ? isDark ? 'ring-1 ring-blue-500' : 'ring-1 ring-blue-400' : ''}`}>
        <input type="text" value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`flex-1 min-w-0 px-4 py-3 text-[15px] outline-none bg-transparent ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'} ${!confirmed && !error && !open ? isDark ? 'bg-gray-700' : 'bg-gray-50' : ''}`}
        />
        {loading ? <Loader2 className={`w-4 h-4 mr-3 animate-spin flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /> : null}
        {!loading && value && (
          <button type="button" onClick={() => { onClear(); setOpen(false); }} className="pr-3 flex-shrink-0">
            <X className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </button>
        )}
      </div>
      {show && (
        <div className={`absolute top-full left-0 right-0 mt-1 z-30 rounded-xl shadow-xl border overflow-hidden max-h-52 overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          {loading ? (
            <div className={`px-4 py-3 text-[13px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Загрузка марок...</div>
          ) : suggestions.map(s => (
            <button key={s.id} type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(s.id, s.name); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors border-b last:border-0 ${isDark ? 'text-gray-200 hover:bg-gray-700 border-gray-700' : 'text-gray-800 hover:bg-blue-50 border-gray-50'}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Main ----

export function VehicleForm({ onBack, onNext, initial }: VehicleFormProps) {
  const { isDark } = useTheme();
  const [form, setForm] = useState<VehicleFormData>(initial ?? defaultVehicle);
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData | 'vin_body', string>>>({});

  // Display values for formatted inputs
  const [ownerPriceDisplay, setOwnerPriceDisplay] = useState(() =>
    initial?.owner_price ? formatPriceDisplay(initial.owner_price) : ''
  );
  const [mileageDisplay, setMileageDisplay] = useState(() =>
    initial?.mileage ? new Intl.NumberFormat('ru-RU').format(Number(initial.mileage)) : ''
  );

  // Autocomplete state
  const [allMarks, setAllMarks] = useState<{ id: string; name: string }[]>([]);
  const [loadedModels, setLoadedModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedMarkId, setSelectedMarkId] = useState('');
  const [makeConfirmed, setMakeConfirmed] = useState(!!initial?.make);
  const [modelConfirmed, setModelConfirmed] = useState(!!initial?.model);
  const [marksLoading, setMarksLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    setMarksLoading(true);
    loadMarks().then(marks => { setAllMarks(marks); setMarksLoading(false); });
  }, []);

  useEffect(() => {
    if (initial?.make && allMarks.length > 0) {
      const mark = allMarks.find(m => m.name.toLowerCase() === initial.make.toLowerCase());
      if (mark) {
        setSelectedMarkId(mark.id);
        loadModels(mark.id).then(setLoadedModels);
      }
    }
  }, [allMarks]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof VehicleFormData>(key: K, value: VehicleFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof VehicleFormData | 'vin_body', string>> = {};
    if (!form.make.trim()) next.make = 'Укажите марку';
    if (!form.model.trim()) next.model = 'Укажите модель';
    if (!form.year.trim()) next.year = 'Укажите год выпуска';
    else { const y = parseInt(form.year); if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 1) next.year = 'Некорректный год'; }
    if (form.license_plate && !isLicensePlateValid(form.license_plate)) {
      next.license_plate = 'Формат: А 111 АА 77';
    }
    const vinErr = validateVinOrBody(form.vin, form.make);
    if (vinErr) next.vin_body = vinErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext(e: React.FormEvent) { e.preventDefault(); if (validate()) onNext(form); }

  // Autocomplete handlers
  function handleMakeType(v: string) {
    update('make', v);
    setMakeConfirmed(false); setSelectedMarkId('');
    update('model', ''); setModelConfirmed(false); setLoadedModels([]);
  }
  function handleMakeSelect(id: string, name: string) {
    update('make', name); setMakeConfirmed(true); setSelectedMarkId(id);
    update('model', ''); setModelConfirmed(false); setLoadedModels([]);
    setModelsLoading(true);
    loadModels(id).then(m => { setLoadedModels(m); setModelsLoading(false); });
  }
  function handleMakeClear() {
    update('make', ''); setMakeConfirmed(false); setSelectedMarkId('');
    update('model', ''); setModelConfirmed(false); setLoadedModels([]);
  }
  function handleModelType(v: string) { update('model', v); setModelConfirmed(false); }
  function handleModelSelect(_id: string, name: string) { update('model', name); setModelConfirmed(true); }
  function handleModelClear() { update('model', ''); setModelConfirmed(false); }

  const makeSuggestions = !makeConfirmed ? filterMarks(allMarks, form.make) : [];
  const modelSuggestions = !modelConfirmed
    ? (selectedMarkId ? filterModels(loadedModels, form.model) : staticSearchModels(form.model).map(n => ({ id: n, name: n })))
    : [];

  // License plate input handler
  function handlePlateChange(raw: string) {
    const formatted = formatLicensePlate(raw);
    update('license_plate', formatted);
    if (errors.license_plate) setErrors(prev => ({ ...prev, license_plate: undefined }));
  }

  // VIN input handler
  function handleVinChange(raw: string) {
    const upper = raw.toUpperCase();
    update('vin', upper);
    if (errors.vin_body) setErrors(prev => ({ ...prev, vin_body: undefined }));
  }

  const inputCls = (hasError?: boolean) =>
    `w-full rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 transition-all ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'} ${hasError ? 'ring-2 ring-red-300 focus:ring-red-400' : 'focus:ring-blue-400'}`;
  const cardCls = `${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm overflow-hidden`;
  const divCls = `border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`;

  // Determine if the make supports body numbers
  const upperMake = form.make.trim().toUpperCase();
  const isBodyMake = BODY_BRANDS_7.includes(upperMake) || BODY_BRANDS_6.includes(upperMake);
  const bodyDigits = BODY_BRANDS_7.includes(upperMake) ? 7 : BODY_BRANDS_6.includes(upperMake) ? 6 : null;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
      <div className={`sticky top-0 z-10 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onBack} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} -ml-1`}>
            <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-[17px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Новая оценка</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
            <div className="w-5 h-1.5 rounded-full bg-blue-500" />
            <div className={`w-5 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
          </div>
        </div>
        <div className={`px-5 pb-2 text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Шаг 2 из 3 — Информация об автомобиле</div>
      </div>

      <form onSubmit={handleNext} className="flex-1 px-4 py-4 max-w-md mx-auto w-full pb-8">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center"><Car className="w-3.5 h-3.5 text-white" /></div>
            <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Информация об автомобиле</h2>
          </div>

          <div className={cardCls}>
            {/* Make + Model (autocomplete) */}
            <div className={`px-4 py-3.5 ${divCls} grid grid-cols-2 gap-3`}>
              <Field label="Марка" required error={errors.make}>
                <CarAutocomplete
                  value={form.make} onChange={handleMakeType}
                  onSelect={handleMakeSelect} onClear={handleMakeClear}
                  suggestions={makeSuggestions}
                  loading={marksLoading && allMarks.length === 0}
                  placeholder="Toyota" confirmed={makeConfirmed} error={!!errors.make}
                />
              </Field>
              <Field label="Модель" required error={errors.model}>
                <CarAutocomplete
                  value={form.model} onChange={handleModelType}
                  onSelect={handleModelSelect} onClear={handleModelClear}
                  suggestions={modelSuggestions}
                  loading={modelsLoading}
                  placeholder="Camry" confirmed={modelConfirmed} error={!!errors.model}
                />
              </Field>
            </div>

            {/* Year + Mileage */}
            <div className={`px-4 py-3.5 ${divCls} grid grid-cols-2 gap-3`}>
              <Field label="Год выпуска" required error={errors.year}>
                <input type="number" value={form.year} onChange={e => update('year', e.target.value)} placeholder="2020" min="1900" max={new Date().getFullYear() + 1} className={inputCls(!!errors.year)} />
              </Field>
              <Field label="Пробег (км)">
                <input type="text" inputMode="numeric" value={mileageDisplay}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setMileageDisplay(raw ? new Intl.NumberFormat('ru-RU').format(Number(raw)) : '');
                    update('mileage', raw);
                  }}
                  placeholder="125 000" className={inputCls()} />
              </Field>
            </div>

            {/* VIN / body number + License plate */}
            <div className={`px-4 py-3.5 ${divCls} grid grid-cols-2 gap-3`}>
              <Field
                label="VIN / Номер кузова"
                error={errors.vin_body}
                hint={isBodyMake ? `Кузов: Код-${bodyDigits ?? '?'} цифр` : 'До 17 символов'}
              >
                <input
                  type="text"
                  value={form.vin}
                  onChange={e => handleVinChange(e.target.value)}
                  placeholder={isBodyMake ? 'ZVW30-1234567' : 'XTA210990Y…'}
                  maxLength={20}
                  className={`${inputCls(!!errors.vin_body)} font-mono text-[13px]`}
                />
              </Field>
              <Field label="ГРЗ" error={errors.license_plate} hint="А 111 АА 77">
                <input
                  type="text"
                  value={form.license_plate}
                  onChange={e => handlePlateChange(e.target.value)}
                  placeholder="А 111 АА 77"
                  maxLength={12}
                  className={`${inputCls(!!errors.license_plate)} font-mono uppercase`}
                />
              </Field>
            </div>

            {/* Engine + Power */}
            <div className={`px-4 py-3.5 ${divCls} grid grid-cols-2 gap-3`}>
              <Field label="Объём двигателя">
                <input type="text" inputMode="decimal" value={form.engine_volume}
                  onChange={e => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = v.split('.');
                    const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : v;
                    update('engine_volume', clean);
                  }}
                  placeholder="2.0" className={inputCls()} />
              </Field>
              <Field label="Мощность (л.с.)">
                <input type="number" value={form.power_hp} onChange={e => update('power_hp', e.target.value)} placeholder="150" min="1" className={inputCls()} />
              </Field>
            </div>

            <div className={`px-4 py-3.5 ${divCls}`}>
              <Field label="Тип КПП">
                <ToggleGroup<TransmissionType> value={form.transmission}
                  options={[{value:'automatic',label:'Автомат'},{value:'manual',label:'Механика'},{value:'robot',label:'Робот'},{value:'cvt',label:'Вариатор'}]}
                  onChange={v => update('transmission', v)} />
              </Field>
            </div>

            <div className={`px-4 py-3.5 ${divCls}`}>
              <Field label="Привод">
                <ToggleGroup<DriveType> value={form.drive_type}
                  options={[{value:'front',label:'Передний'},{value:'rear',label:'Задний'},{value:'all',label:'Полный'}]}
                  onChange={v => update('drive_type', v)} />
              </Field>
            </div>

            <div className={`px-4 py-3.5 ${divCls}`}>
              <Field label="Тип топлива">
                <PillGrid<FuelType> value={form.fuel_type}
                  options={[{value:'petrol',label:'Бензин'},{value:'diesel',label:'Дизель'},{value:'gas',label:'Газ'},{value:'hybrid',label:'Гибрид'},{value:'electric',label:'Электро'}]}
                  onChange={v => update('fuel_type', v)} />
              </Field>
            </div>

            <div className={`px-4 py-3.5 ${divCls}`}>
              <Field label="Цена владельца (₽)">
                <input
                  type="text"
                  inputMode="numeric"
                  value={ownerPriceDisplay}
                  onChange={e => {
                    const raw = parsePriceRaw(e.target.value);
                    setOwnerPriceDisplay(raw ? formatPriceDisplay(raw) : '');
                    update('owner_price', raw);
                  }}
                  placeholder="1 500 000"
                  className={inputCls()}
                />
              </Field>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all duration-150 active:scale-[0.98] mt-2">
          Далее →
        </button>
      </form>
    </div>
  );
}
