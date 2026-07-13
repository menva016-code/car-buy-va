import { useState } from 'react';
import { ChevronLeft, User, Phone, AlertCircle, Check, Plus, X, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { formatPhone, isPhoneValid } from '../lib/phone';
import type { AppraisalFormData, AdditionalContact, OwnershipType, SaleType } from '../types';
import { MESSENGER_OPTIONS } from '../types';

interface AppraisalFormProps {
  onBack: () => void;
  onNext: (data: AppraisalFormData) => void;
  initial?: AppraisalFormData;
}

const defaultAdditional = (): AdditionalContact => ({
  name: '',
  phone: '',
  contact_type: '',
  messengers: [],
  messenger_phone: '',
});

const defaultData: AppraisalFormData = {
  owner_name: '',
  owner_phone: '',
  owner_messengers: [],
  owner_messenger_phone: '',
  ownership_type: 'individual',
  sale_type: 'buyout',
  sale_reason: '',
  additional_contact: null,
};

// ---- Shared primitives ----

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}

function Field({ label, required, children, error }: FieldProps) {
  const { isDark } = useTheme();
  return (
    <div>
      <label className={`block text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-[12px] text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

interface ToggleGroupProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function ToggleGroup<T extends string>({ value, options, onChange }: ToggleGroupProps<T>) {
  const { isDark } = useTheme();
  return (
    <div className={`flex rounded-xl p-1 gap-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-[14px] font-medium transition-all duration-200 ${
            value === opt.value
              ? isDark ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
              : isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MessengerPills({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const { isDark } = useTheme();
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {MESSENGER_OPTIONS.map(({ value, label }) => (
        <button key={value} type="button" onClick={() => toggle(value)}
          className={`px-4 py-2 rounded-xl text-[14px] font-medium border transition-all duration-200 ${
            selected.includes(value)
              ? 'bg-blue-500 text-white border-blue-500'
              : isDark ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-blue-400' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { isDark } = useTheme();
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 py-1 w-full">
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
        checked ? 'bg-blue-500 border-blue-500' : isDark ? 'border-gray-500' : 'border-gray-300'
      }`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-[14px] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
    </button>
  );
}

// ---- Inline contact fields (used for both owner and additional) ----

interface ContactFieldsProps {
  nameValue: string; onNameChange: (v: string) => void;
  phoneValue: string; onPhoneChange: (v: string) => void;
  messengers: string[]; onMessengersChange: (v: string[]) => void;
  hasDiffPhone: boolean; onHasDiffPhoneChange: (v: boolean) => void;
  messengerPhone: string; onMessengerPhoneChange: (v: string) => void;
  contactType?: string; onContactTypeChange?: (v: string) => void;
  nameLabel?: string; nameError?: string; phoneError?: string;
  inputCls: (err?: boolean) => string;
  divCls: string;
}

function ContactFields({
  nameValue, onNameChange, phoneValue, onPhoneChange,
  messengers, onMessengersChange, hasDiffPhone, onHasDiffPhoneChange,
  messengerPhone, onMessengerPhoneChange,
  contactType, onContactTypeChange,
  nameLabel = 'Имя', nameError, phoneError,
  inputCls, divCls,
}: ContactFieldsProps) {
  return (
    <>
      <div className={`px-4 py-3.5 ${divCls}`}>
        <Field label={nameLabel} required error={nameError}>
          <input type="text" value={nameValue} onChange={(e) => onNameChange(e.target.value)}
            placeholder="Иван" className={inputCls(!!nameError)} />
        </Field>
      </div>
      <div className={`px-4 py-3.5 ${divCls}`}>
        <Field label="Номер телефона" required error={phoneError}>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="tel" inputMode="tel" value={phoneValue}
              onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
              placeholder="+7 999 222 22 22"
              className={`${inputCls(!!phoneError)} pl-10`} />
          </div>
        </Field>
      </div>
      {onContactTypeChange && (
        <div className={`px-4 py-3.5 ${divCls}`}>
          <Field label="Тип контакта">
            <input type="text" value={contactType ?? ''} onChange={(e) => onContactTypeChange(e.target.value)}
              placeholder="Супруг(а), родственник, агент…" className={inputCls()} />
          </Field>
        </div>
      )}
      <div className={`px-4 py-3.5 ${divCls}`}>
        <Field label="Мессенджеры">
          <MessengerPills selected={messengers} onChange={onMessengersChange} />
          {messengers.length > 0 && (
            <div className="mt-3">
              <CheckRow
                checked={hasDiffPhone}
                onChange={(v) => { onHasDiffPhoneChange(v); if (!v) onMessengerPhoneChange(''); }}
                label="Другой номер для мессенджера"
              />
              {hasDiffPhone && (
                <div className="mt-2.5 relative">
                  <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="tel" inputMode="tel" value={messengerPhone}
                    onChange={(e) => onMessengerPhoneChange(formatPhone(e.target.value))}
                    placeholder="+7 999 222 22 22"
                    className={`${inputCls()} pl-10`} />
                </div>
              )}
            </div>
          )}
        </Field>
      </div>
    </>
  );
}

// ---- Main Form ----

export function AppraisalForm({ onBack, onNext, initial }: AppraisalFormProps) {
  const { isDark } = useTheme();

  const [form, setForm] = useState<AppraisalFormData>(() => initial ?? defaultData);
  const [hasDiffPhone, setHasDiffPhone] = useState(() => !!(initial?.owner_messenger_phone));
  const [showAdditional, setShowAdditional] = useState(() => !!initial?.additional_contact);
  const [hasDiffAdditionalPhone, setHasDiffAdditionalPhone] = useState(() => !!(initial?.additional_contact?.messenger_phone));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof AppraisalFormData>(key: K, value: AppraisalFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => { const n = { ...prev }; delete n[key as string]; return n; });
  }

  function updateAdditional<K extends keyof AdditionalContact>(key: K, value: AdditionalContact[K]) {
    setForm((prev) => ({
      ...prev,
      additional_contact: { ...(prev.additional_contact ?? defaultAdditional()), [key]: value },
    }));
  }

  function addAdditional() {
    setShowAdditional(true);
    setForm((prev) => ({ ...prev, additional_contact: prev.additional_contact ?? defaultAdditional() }));
  }

  function removeAdditional() {
    setShowAdditional(false);
    setForm((prev) => ({ ...prev, additional_contact: null }));
    setHasDiffAdditionalPhone(false);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.owner_name.trim()) next.owner_name = 'Введите имя';
    if (!form.owner_phone.trim()) {
      next.owner_phone = 'Введите номер телефона';
    } else if (!isPhoneValid(form.owner_phone)) {
      next.owner_phone = 'Номер должен быть в формате +7 999 222 22 22';
    }
    if (showAdditional && form.additional_contact) {
      if (!form.additional_contact.name.trim()) next.additional_name = 'Введите имя';
      if (!form.additional_contact.phone.trim()) {
        next.additional_phone = 'Введите номер';
      } else if (!isPhoneValid(form.additional_contact.phone)) {
        next.additional_phone = 'Некорректный номер';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const data: AppraisalFormData = {
      ...form,
      owner_messenger_phone: hasDiffPhone ? form.owner_messenger_phone : '',
      additional_contact: showAdditional && form.additional_contact
        ? {
            ...form.additional_contact,
            messenger_phone: hasDiffAdditionalPhone ? form.additional_contact.messenger_phone : '',
          }
        : null,
    };
    onNext(data);
  }

  const cardCls = `${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm overflow-hidden`;
  const inputCls = (err?: boolean) =>
    `w-full rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 transition-all ${
      isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'
    } ${err ? 'ring-2 ring-red-300 focus:ring-red-400' : 'focus:ring-blue-400'}`;
  const dividerCls = `border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`;

  const ac = form.additional_contact;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onBack}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} -ml-1`}>
            <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-[17px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Новая оценка</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-1.5 rounded-full bg-blue-500" />
            <div className={`w-5 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
            <div className={`w-5 h-1.5 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`} />
          </div>
        </div>
        <div className={`px-5 pb-2 text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Шаг 1 из 3 — Информация о владельце
        </div>
      </div>

      <form onSubmit={handleNext} className="flex-1 px-4 py-4 max-w-md mx-auto w-full pb-8">

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Информация о владельце</h2>
          </div>

          <div className={cardCls}>
            {/* Owner fields: name, phone, messengers */}
            <ContactFields
              nameValue={form.owner_name}
              onNameChange={(v) => update('owner_name', v)}
              phoneValue={form.owner_phone}
              onPhoneChange={(v) => update('owner_phone', v)}
              messengers={form.owner_messengers}
              onMessengersChange={(v) => update('owner_messengers', v)}
              hasDiffPhone={hasDiffPhone}
              onHasDiffPhoneChange={setHasDiffPhone}
              messengerPhone={form.owner_messenger_phone}
              onMessengerPhoneChange={(v) => update('owner_messenger_phone', v)}
              nameLabel="Имя владельца"
              nameError={errors.owner_name}
              phoneError={errors.owner_phone}
              inputCls={inputCls}
              divCls={dividerCls}
            />

            {/* Additional contact — right after messengers */}
            {!showAdditional ? (
              <div className={`px-4 py-3 ${dividerCls}`}>
                <button type="button" onClick={addAdditional}
                  className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-dashed transition-colors ${
                    isDark ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400' : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500'
                  }`}>
                  <Plus className="w-4 h-4" />
                  <span className="text-[14px] font-medium">Дополнительный номер для связи</span>
                </button>
              </div>
            ) : (
              <div className={dividerCls}>
                <div className={`px-4 py-3 flex items-center justify-between ${dividerCls}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${isDark ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
                      <User className="w-3 h-3 text-blue-500" />
                    </div>
                    <p className={`text-[13px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Дополнительный контакт</p>
                  </div>
                  <button type="button" onClick={removeAdditional}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg ${isDark ? 'bg-gray-700 text-gray-400 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:text-red-500'}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {ac && (
                  <ContactFields
                    nameValue={ac.name}
                    onNameChange={(v) => updateAdditional('name', v)}
                    phoneValue={ac.phone}
                    onPhoneChange={(v) => updateAdditional('phone', v)}
                    messengers={ac.messengers}
                    onMessengersChange={(v) => updateAdditional('messengers', v)}
                    hasDiffPhone={hasDiffAdditionalPhone}
                    onHasDiffPhoneChange={setHasDiffAdditionalPhone}
                    messengerPhone={ac.messenger_phone}
                    onMessengerPhoneChange={(v) => updateAdditional('messenger_phone', v)}
                    contactType={ac.contact_type}
                    onContactTypeChange={(v) => updateAdditional('contact_type', v)}
                    nameLabel="Имя"
                    nameError={errors.additional_name}
                    phoneError={errors.additional_phone}
                    inputCls={inputCls}
                    divCls={dividerCls}
                  />
                )}
              </div>
            )}

            {/* Ownership / sale type / reason */}
            <div className={`px-4 py-3.5 ${dividerCls}`}>
              <Field label="Тип владения">
                <ToggleGroup<OwnershipType>
                  value={form.ownership_type}
                  options={[{ value: 'individual', label: 'Физ. лицо' }, { value: 'reseller', label: 'Перекуп' }]}
                  onChange={(v) => update('ownership_type', v)}
                />
              </Field>
            </div>

            <div className={`px-4 py-3.5 ${dividerCls}`}>
              <Field label="Тип продажи">
                <ToggleGroup<SaleType>
                  value={form.sale_type}
                  options={[{ value: 'buyout', label: 'Выкуп' }, { value: 'trade_in', label: 'Трейд-ин' }]}
                  onChange={(v) => update('sale_type', v)}
                />
              </Field>
            </div>

            <div className="px-4 py-3.5">
              <Field label="Причина продажи">
                <textarea value={form.sale_reason} onChange={(e) => update('sale_reason', e.target.value)}
                  placeholder="Опишите причину (необязательно)" rows={3}
                  className={`${inputCls()} resize-none`} />
              </Field>
            </div>
          </div>
        </div>

        <button type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-[16px] py-4 rounded-2xl shadow-sm transition-all duration-150 active:scale-[0.98]">
          Далее →
        </button>
      </form>
    </div>
  );
}
