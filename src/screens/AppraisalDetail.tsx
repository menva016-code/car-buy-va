import { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, X, Phone, Car, User,
  AlertCircle, Camera, Pencil,
  Check, MessageCircle, ClipboardList, FileText, Wrench, Plus,
  Trash2, ExternalLink, Link, Send, Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { formatPhone } from '../lib/phone';
import type { Appraisal, AppraisalPhoto, AdditionalContact, OwnershipType, SaleType, TransmissionType, DriveType, FuelType, PresaleCost } from '../types';
import {
  TRANSMISSION_LABELS, DRIVE_LABELS, FUEL_LABELS,
  OWNERSHIP_LABELS, SALE_TYPE_LABELS, MESSENGER_LABELS, MESSENGER_OPTIONS,
} from '../types';

interface AppraisalDetailProps {
  appraisalId: string;
  onBack: () => void;
  onDelete?: () => void;
}

type EditSection = 'purchase' | 'owner' | 'vehicle' | 'condition';

// ---- Formatters ----

function fPrice(v: number | null) {
  if (v === null) return null;
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v);
}
function fMileage(v: number | null) {
  if (v === null) return null;
  return new Intl.NumberFormat('ru-RU').format(v) + ' км';
}
function fDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---- Lightbox ----

interface LightboxState { urls: string[]; captions: string[]; index: number; }

function Lightbox({ state, onClose }: { state: LightboxState; onClose: () => void }) {
  const [index, setIndex] = useState(state.index);
  const [sendingApproval, setSendingApproval] = useState(false);
  const canPrev = index > 0, canNext = index < state.urls.length - 1;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && canPrev) setIndex(i => i - 1);
      if (e.key === 'ArrowRight' && canNext) setIndex(i => i + 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [canPrev, canNext, onClose]);
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10"><X className="w-5 h-5 text-white" /></button>
        <span className="text-white text-[14px] font-medium">{index + 1} / {state.urls.length}</span>
        <div className="w-9" />
      </div>
      <div className="flex-1 flex items-center justify-center px-2 relative overflow-hidden">
        <img src={state.urls[index]} alt={state.captions[index]} className="max-w-full max-h-full object-contain rounded-xl" />
        {canPrev && <button onClick={() => setIndex(i => i - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-white" /></button>}
        {canNext && <button onClick={() => setIndex(i => i + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"><ChevronRight className="w-5 h-5 text-white" /></button>}
      </div>
      {state.captions[index] && <div className="px-4 py-3 text-center"><p className="text-white/70 text-[13px]">{state.captions[index]}</p></div>}
    </div>
  );
}

// ---- Shared UI ----

function SectionHeader({ icon, title, onEdit }: { icon: React.ReactNode; title: string; onEdit?: () => void }) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">{icon}</div>
        <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-400 hover:text-blue-400' : 'bg-gray-100 text-gray-500 hover:text-blue-500'}`}>
          <Pencil className="w-3 h-3" />Изменить
        </button>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, full }: { label: string; value?: string | null; mono?: boolean; full?: boolean }) {
  const { isDark } = useTheme();
  if (!value) return null;
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-[14px] font-medium mt-0.5 break-all ${mono ? 'font-mono' : ''} ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function PhotoTile({ url, caption, onClick, size = 'md' }: { url: string; caption?: string; onClick: () => void; size?: 'md' | 'sm' }) {
  return (
    <button type="button" onClick={onClick} className={`relative overflow-hidden rounded-xl active:scale-95 transition-transform ${size === 'sm' ? 'aspect-square' : 'aspect-[4/3]'}`}>
      <img src={url} alt={caption ?? ''} className="w-full h-full object-cover" />
      {caption && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5"><p className="text-white text-[11px] font-medium truncate">{caption}</p></div>}
    </button>
  );
}

function SubLabel({ text }: { text: string }) {
  const { isDark } = useTheme();
  return <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{text}</p>;
}

// ---- Edit Helpers ----

interface ToggleGroupProps<T extends string> { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; }
function ToggleGroup<T extends string>({ value, options, onChange }: ToggleGroupProps<T>) {
  const { isDark } = useTheme();
  return (
    <div className={`flex rounded-xl p-1 gap-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-2 rounded-lg text-[13px] font-medium transition-all ${value === opt.value ? isDark ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { isDark } = useTheme();
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 py-1 w-full">
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${checked ? 'bg-blue-500 border-blue-500' : isDark ? 'border-gray-500' : 'border-gray-300'}`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className={`text-[14px] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
    </button>
  );
}

// ---- Price formatting helpers ----

function formatPriceInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('ru-RU').format(Number(digits));
}

function parsePriceDigits(display: string): number | null {
  const digits = display.replace(/\D/g, '');
  return digits ? parseFloat(digits) : null;
}

// ---- Main Component ----

export function AppraisalDetail({ appraisalId, onBack, onDelete }: AppraisalDetailProps) {
  const { isDark } = useTheme();
  const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
  const [urlsBySlot, setUrlsBySlot] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [editSection, setEditSection] = useState<EditSection | null>(null);
  const [editData, setEditData] = useState<Appraisal | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingApproval, setSendingApproval] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // edit UI state
  const [editDiffPhone, setEditDiffPhone] = useState(false);
  const [editShowAdditional, setEditShowAdditional] = useState(false);
  const [editDiffAdditionalPhone, setEditDiffAdditionalPhone] = useState(false);

  // price display state for edit forms
  const [purchasePriceDisplay, setPurchasePriceDisplay] = useState('');
  const [ownerPriceDisplay, setOwnerPriceDisplay] = useState('');
  const [costAmountDisplay, setCostAmountDisplay] = useState('');

  // presale costs state
  const [costs, setCosts] = useState<PresaleCost[]>([]);
  const [addingCost, setAddingCost] = useState(false);
  const [newCostType, setNewCostType] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');
  const [savingCosts, setSavingCosts] = useState(false);

  // delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // PDF re-upload state
  const [uploadingConditionPdf, setUploadingConditionPdf] = useState(false);
  const [uploadingAutotekaPdf, setUploadingAutotekaPdf] = useState(false);
  const [editAutotekaUrl, setEditAutotekaUrl] = useState('');

  // Photo editing state
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: ap }, { data: ph }] = await Promise.all([
      supabase.from('appraisals').select('*').eq('id', appraisalId).single(),
      supabase.from('appraisal_photos').select('*').eq('appraisal_id', appraisalId).order('created_at'),
    ]);
    if (ap) {
      setAppraisal(ap as Appraisal);
      setCosts((ap as Appraisal).presale_costs ?? []);
    }
    const slots: Record<string, string[]> = {};
    if ((ap as Appraisal)?.sts_photo_url) slots['sts'] = [(ap as Appraisal).sts_photo_url!];
    (ph as AppraisalPhoto[] ?? []).forEach(p => { if (!slots[p.slot]) slots[p.slot] = []; slots[p.slot].push(p.url); });
    setUrlsBySlot(slots);
    setLoading(false);
  }, [appraisalId]);
  
  const sendToApproval = async () => {
  if (!appraisal) return;

  try {
    setSendingApproval(true);

    const photos = Object.values(urlsBySlot).flat();

    const { error } = await supabase.functions.invoke("send-approval", {
      body: {
        appraisal,
        photos
      }
    });

    if (error) throw error;

    alert("Автомобиль успешно отправлен на согласование.");

  } catch (err) {

    console.error(err);

    alert("Ошибка при отправке в Telegram.");

  } finally {

    setSendingApproval(false);

  }
};

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(section: EditSection) {
    if (!appraisal) return;
    const copy = { ...appraisal };
    setEditData(copy);
    setEditSection(section);
    setSaveError(null);
    if (section === 'purchase') {
      setPurchasePriceDisplay(appraisal.purchase_price != null ? new Intl.NumberFormat('ru-RU').format(appraisal.purchase_price) : '');
    }
    if (section === 'vehicle') {
      setOwnerPriceDisplay(appraisal.owner_price != null ? new Intl.NumberFormat('ru-RU').format(appraisal.owner_price) : '');
    }
    if (section === 'owner') {
      setEditDiffPhone(!!(appraisal.owner_messenger_phone));
      setEditShowAdditional(!!(appraisal.additional_contact));
      setEditDiffAdditionalPhone(!!(appraisal.additional_contact?.messenger_phone));
    }
  }

  function cancelEdit() { setEditSection(null); setEditData(null); setSaveError(null); }

  function setEdit<K extends keyof Appraisal>(key: K, value: Appraisal[K]) {
    setEditData(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function setEditAdditional<K extends keyof AdditionalContact>(key: K, value: AdditionalContact[K]) {
    setEditData(prev => {
      if (!prev) return prev;
      const ac = prev.additional_contact ?? { name: '', phone: '', contact_type: '', messengers: [], messenger_phone: '' };
      return { ...prev, additional_contact: { ...ac, [key]: value } };
    });
  }

  async function saveEdit() {
    if (!editData || !appraisal) return;
    setSaving(true); setSaveError(null);
    let updatePayload: Partial<Appraisal>;
    if (editSection === 'purchase') {
      updatePayload = { purchase_price: editData.purchase_price, is_purchased: editData.is_purchased };
    } else if (editSection === 'owner') {
      updatePayload = {
        owner_name: editData.owner_name,
        owner_phone: editData.owner_phone,
        owner_messengers: editData.owner_messengers,
        owner_messenger_phone: editDiffPhone ? editData.owner_messenger_phone : null,
        ownership_type: editData.ownership_type,
        sale_type: editData.sale_type,
        sale_reason: editData.sale_reason,
        additional_contact: editShowAdditional && editData.additional_contact
          ? { ...editData.additional_contact, messenger_phone: editDiffAdditionalPhone ? editData.additional_contact.messenger_phone : '' }
          : null,
      };
    } else if (editSection === 'condition') {
      updatePayload = {
        car_condition_comment: editData.car_condition_comment,
      };
    } else {
      updatePayload = {
        make: editData.make, model: editData.model, year: editData.year,
        vin: editData.vin, license_plate: editData.license_plate,
        engine_volume: editData.engine_volume, power_hp: editData.power_hp,
        transmission: editData.transmission, drive_type: editData.drive_type,
        fuel_type: editData.fuel_type, mileage: editData.mileage, owner_price: editData.owner_price,
      };
    }
    const { error } = await supabase.from('appraisals').update(updatePayload).eq('id', appraisalId);
    setSaving(false);
    if (error) { setSaveError('Ошибка при сохранении. Попробуйте ещё раз.'); return; }
    setAppraisal(prev => prev ? { ...prev, ...updatePayload } : prev);
    setEditSection(null); setEditData(null);
  }

  async function addCost() {
    if (!newCostType.trim() || !newCostAmount.trim()) return;
    const newCost: PresaleCost = { id: crypto.randomUUID(), type: newCostType.trim(), cost: parseFloat(newCostAmount) };
    const updated = [...costs, newCost];
    setSavingCosts(true);
    await supabase.from('appraisals').update({ presale_costs: updated }).eq('id', appraisalId);
    setCosts(updated);
    setAppraisal(prev => prev ? { ...prev, presale_costs: updated } : prev);
    setNewCostType(''); setNewCostAmount(''); setCostAmountDisplay(''); setAddingCost(false);
    setSavingCosts(false);
  }

  async function removeCost(id: string) {
    const updated = costs.filter(c => c.id !== id);
    await supabase.from('appraisals').update({ presale_costs: updated }).eq('id', appraisalId);
    setCosts(updated);
    setAppraisal(prev => prev ? { ...prev, presale_costs: updated } : prev);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('appraisals').delete().eq('id', appraisalId);
    setDeleting(false);
    setShowDeleteConfirm(false);
    onDelete ? onDelete() : onBack();
  }

  function openLightbox(urls: string[], captions: string[], index: number) { setLightbox({ urls, captions, index }); }

  async function uploadFileToStorage(bucket: string, path: string, file: File): Promise<string | null> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function handleConditionPdfReplace(file: File) {
    setUploadingConditionPdf(true);
    const ext = file.name.split('.').pop();
    const url = await uploadFileToStorage('documents', `condition/${Date.now()}-${appraisalId.slice(0, 8)}.${ext}`, file);
    if (url) {
      await supabase.from('appraisals').update({ car_condition_pdf_url: url }).eq('id', appraisalId);
      setAppraisal(prev => prev ? { ...prev, car_condition_pdf_url: url } : prev);
    }
    setUploadingConditionPdf(false);
  }

  async function handleAutotekaPdfReplace(file: File) {
    setUploadingAutotekaPdf(true);
    const ext = file.name.split('.').pop();
    const url = await uploadFileToStorage('documents', `autoteka/${Date.now()}-${appraisalId.slice(0, 8)}.${ext}`, file);
    if (url) {
      await supabase.from('appraisals').update({ autoteka_pdf_url: url }).eq('id', appraisalId);
      setAppraisal(prev => prev ? { ...prev, autoteka_pdf_url: url } : prev);
    }
    setUploadingAutotekaPdf(false);
  }

  async function handleAutotekaUrlSave() {
    const trimmed = editAutotekaUrl.trim();
    await supabase.from('appraisals').update({ autoteka_url: trimmed || null }).eq('id', appraisalId);
    setAppraisal(prev => prev ? { ...prev, autoteka_url: trimmed || null } : prev);
    setEditAutotekaUrl('');
  }

  async function handleAddPhoto(slot: string, file: File, isMulti: boolean) {
    setUploadingPhoto(slot);
    const ext = file.name.split('.').pop();
    const bucket = slot === 'sts' ? 'sts-photos' : 'car-photos';
    const path = slot === 'sts'
      ? `${Date.now()}-sts.${ext}`
      : `${slot}/${Date.now()}-${appraisalId.slice(0, 8)}.${ext}`;
    const url = await uploadFileToStorage(bucket, path, file);
    if (url) {
      if (slot === 'sts') {
        await supabase.from('appraisals').update({ sts_photo_url: url }).eq('id', appraisalId);
        setAppraisal(prev => prev ? { ...prev, sts_photo_url: url } : prev);
        setUrlsBySlot(prev => ({ ...prev, sts: [url] }));
      } else {
        await supabase.from('appraisal_photos').insert({ appraisal_id: appraisalId, slot, url });
        setUrlsBySlot(prev => ({
          ...prev,
          [slot]: isMulti ? [...(prev[slot] ?? []), url] : [url],
        }));
      }
    }
    setUploadingPhoto(null);
  }

  async function handleDeletePhoto(slot: string, url: string) {
    if (slot === 'sts') {
      await supabase.from('appraisals').update({ sts_photo_url: null }).eq('id', appraisalId);
      setAppraisal(prev => prev ? { ...prev, sts_photo_url: null } : prev);
      setUrlsBySlot(prev => { const n = { ...prev }; delete n.sts; return n; });
    } else {
      await supabase.from('appraisal_photos').delete().eq('appraisal_id', appraisalId).eq('url', url);
      setUrlsBySlot(prev => {
        const updated = (prev[slot] ?? []).filter(u => u !== url);
        if (updated.length === 0) { const n = { ...prev }; delete n[slot]; return n; }
        return { ...prev, [slot]: updated };
      });
    }
  }

  const cardCls = `${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm p-4`;
  const divCls = `border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`;
  const inputCls = `w-full rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-400 transition-all ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'}`;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
        <div className={`sticky top-0 z-10 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button
  type="button"
  onClick={handleSendApproval}
  disabled={
    sendingApproval ||
    appraisal?.approval_status === "sent"
  }
  className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-[15px] transition-all ${
    isDark
      ? "bg-blue-900/30 border border-blue-700/60 text-blue-400"
      : "bg-blue-50 border border-blue-200 text-blue-600"
  }`}
>
  <Send className="w-4 h-4" />

  {sendingApproval
    ? "Отправка..."
    : appraisal?.approval_status === "sent"
      ? "✓ Отправлено"
      : "Отправить на согласование"}

</button>
          </div>
        </div>
        <div className="px-4 py-4 max-w-md mx-auto space-y-3">
          {[80, 120, 200, 160].map((h, i) => <div key={i} className={`rounded-2xl animate-pulse ${isDark ? 'bg-gray-800' : 'bg-white'}`} style={{ height: h }} />)}
        </div>
      </div>
    );
  }

  if (!appraisal) {
	  
	const handleSendApproval = async () => {
  if (!appraisal) return;

  try {
    setSendingApproval(true);

    const { error } = await supabase.functions.invoke(
      "send-approval",
      {
        body: {
          appraisalId: appraisal.id,
        },
      }
    );

    if (error) throw error;

    alert("Автомобиль успешно отправлен на согласование.");

    fetchData();

  } catch (err: any) {

    alert(err.message ?? "Ошибка отправки");

  } finally {

    setSendingApproval(false);

  }
};  
	  
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
        <div className="text-center px-6">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className={`text-[16px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Оценка не найдена</p>
          <button onClick={onBack} className="mt-4 text-blue-500 text-[14px] font-medium">Назад</button>
        </div>
      </div>
    );
  }

  const title = [appraisal.make, appraisal.model, appraisal.year].filter(Boolean).join(' ') || 'Без названия';
  const totalPhotos = Object.values(urlsBySlot).reduce((s, arr) => s + arr.length, 0);
  const ed = editData;

  // ---- Render Sections ----

  const renderPurchaseSection = () => {
    const isEditing = editSection === 'purchase';
    if (isEditing && ed) {
      return (
        <div>
          <SectionHeader icon={<Check className="w-3.5 h-3.5 text-white" />} title="Условия выкупа" />
          <div className={cardCls}>
            <div className={`pb-3.5 mb-3.5 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Цена выкупа (₽)</p>
              <input
                type="text"
                inputMode="numeric"
                value={purchasePriceDisplay}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setPurchasePriceDisplay(raw ? new Intl.NumberFormat('ru-RU').format(Number(raw)) : '');
                  setEdit('purchase_price', raw ? parseFloat(raw) : null);
                }}
                placeholder="1 200 000"
                className={inputCls}
              />
            </div>
            <div className={`pb-3.5 mb-3.5 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Статус выкупа</p>
              <ToggleGroup<'purchased' | 'not_purchased'>
                value={ed.is_purchased ? 'purchased' : 'not_purchased'}
                options={[{ value: 'not_purchased', label: 'Не выкуплен' }, { value: 'purchased', label: 'Выкуплен' }]}
                onChange={v => setEdit('is_purchased', v === 'purchased')}
              />
            </div>
            {saveError && <p className="text-red-500 text-[12px] mb-3">{saveError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={cancelEdit} className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Отмена</button>
              <button type="button" onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-blue-500 text-white disabled:opacity-60 transition-colors">{saving ? 'Сохранение...' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div>
        <SectionHeader icon={<Check className="w-3.5 h-3.5 text-white" />} title="Условия выкупа" onEdit={() => startEdit('purchase')} />
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm overflow-hidden`}>
          <div className="grid grid-cols-2 divide-x">
            <div className="px-4 py-3.5">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Цена выкупа</p>
              <p className="text-[17px] font-bold mt-0.5 text-green-500">{fPrice(appraisal.purchase_price) ?? '—'}</p>
            </div>
            <div className="px-4 py-3.5">
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Статус</p>
              <span className={`inline-flex mt-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold ${appraisal.is_purchased ? isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700' : isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
                {appraisal.is_purchased ? 'Выкуплен' : 'Не выкуплен'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOwnerSection = () => {
    const isEditing = editSection === 'owner';
    const messengers = appraisal.owner_messengers ?? [];

    if (isEditing && ed) {
      const edMessengers = ed.owner_messengers ?? [];
      const edAc = ed.additional_contact;
      return (
        <div>
          <SectionHeader icon={<User className="w-3.5 h-3.5 text-white" />} title="Владелец" />
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm overflow-hidden mb-3`}>
            <div className={`px-4 py-3.5 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Имя</p>
              <input value={ed.owner_name} onChange={e => setEdit('owner_name', e.target.value)} placeholder="Иван" className={inputCls} />
            </div>
            <div className={`px-4 py-3.5 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Телефон</p>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="tel" inputMode="tel" value={ed.owner_phone} onChange={e => setEdit('owner_phone', formatPhone(e.target.value))} placeholder="+7 999 222 22 22" className={`${inputCls} pl-10`} />
              </div>
            </div>
            <div className={`px-4 py-3.5 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Мессенджеры</p>
              <div className="flex gap-2 flex-wrap">
                {MESSENGER_OPTIONS.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setEdit('owner_messengers', edMessengers.includes(value) ? edMessengers.filter(v => v !== value) : [...edMessengers, value])}
                    className={`px-3 py-1.5 rounded-xl text-[13px] font-medium border transition-all ${edMessengers.includes(value) ? 'bg-blue-500 text-white border-blue-500' : isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {edMessengers.length > 0 && (
                <div className="mt-3">
                  <CheckRow checked={editDiffPhone} onChange={v => { setEditDiffPhone(v); if (!v) setEdit('owner_messenger_phone', null); }} label="Другой номер для мессенджера" />
                  {editDiffPhone && (
                    <div className="mt-2 relative">
                      <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input type="tel" inputMode="tel" value={ed.owner_messenger_phone ?? ''} onChange={e => setEdit('owner_messenger_phone', formatPhone(e.target.value))} placeholder="+7 999 222 22 22" className={`${inputCls} pl-10`} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={`px-4 py-3.5 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип владения</p>
              <ToggleGroup<OwnershipType> value={ed.ownership_type} options={[{ value: 'individual', label: 'Физ. лицо' }, { value: 'reseller', label: 'Перекуп' }]} onChange={v => setEdit('ownership_type', v)} />
            </div>
            <div className={`px-4 py-3.5 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип продажи</p>
              <ToggleGroup<SaleType> value={ed.sale_type} options={[{ value: 'buyout', label: 'Выкуп' }, { value: 'trade_in', label: 'Трейд-ин' }]} onChange={v => setEdit('sale_type', v)} />
            </div>
            <div className="px-4 py-3.5">
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Причина продажи</p>
              <textarea value={ed.sale_reason ?? ''} onChange={e => setEdit('sale_reason', e.target.value)} placeholder="Необязательно" rows={2} className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* Additional contact in edit mode */}
          {editShowAdditional && edAc && (
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm overflow-hidden mb-3`}>
              <div className={`px-4 py-3 border-b ${divCls} flex items-center justify-between`}>
                <p className={`text-[14px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Доп. контакт</p>
                <button type="button" onClick={() => { setEditShowAdditional(false); setEdit('additional_contact', null); }} className={`w-6 h-6 flex items-center justify-center rounded ${isDark ? 'text-gray-500' : 'text-gray-400'}`}><X className="w-4 h-4" /></button>
              </div>
              {(['name', 'phone', 'contact_type'] as const).map(k => (
                <div key={k} className={`px-4 py-3.5 border-b ${divCls}`}>
                  <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{k === 'name' ? 'Имя' : k === 'phone' ? 'Телефон' : 'Тип контакта'}</p>
                  {k === 'phone' ? (
                    <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /><input type="tel" inputMode="tel" value={edAc[k]} onChange={e => setEditAdditional(k, formatPhone(e.target.value))} placeholder="+7 999 222 22 22" className={`${inputCls} pl-10`} /></div>
                  ) : (
                    <input value={edAc[k]} onChange={e => setEditAdditional(k, e.target.value)} placeholder={k === 'name' ? 'Иван' : 'Родственник, агент…'} className={inputCls} />
                  )}
                </div>
              ))}
              <div className="px-4 py-3.5">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Мессенджеры</p>
                <div className="flex gap-2 flex-wrap">
                  {MESSENGER_OPTIONS.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setEditAdditional('messengers', edAc.messengers.includes(value) ? edAc.messengers.filter(v => v !== value) : [...edAc.messengers, value])}
                      className={`px-3 py-1.5 rounded-xl text-[13px] font-medium border transition-all ${edAc.messengers.includes(value) ? 'bg-blue-500 text-white border-blue-500' : isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {edAc.messengers.length > 0 && (
                  <div className="mt-3">
                    <CheckRow checked={editDiffAdditionalPhone} onChange={v => { setEditDiffAdditionalPhone(v); if (!v) setEditAdditional('messenger_phone', ''); }} label="Другой номер для мессенджера" />
                    {editDiffAdditionalPhone && (
                      <div className="mt-2 relative"><MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /><input type="tel" inputMode="tel" value={edAc.messenger_phone} onChange={e => setEditAdditional('messenger_phone', formatPhone(e.target.value))} placeholder="+7 999 222 22 22" className={`${inputCls} pl-10`} /></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {!editShowAdditional && (
            <button type="button" onClick={() => { setEditShowAdditional(true); setEdit('additional_contact', { name: '', phone: '', contact_type: '', messengers: [], messenger_phone: '' }); }}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed mb-3 text-[14px] font-medium transition-colors ${isDark ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400' : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500'}`}>
              + Дополнительный контакт
            </button>
          )}

          {saveError && <p className="text-red-500 text-[12px] mb-3">{saveError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={cancelEdit} className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Отмена</button>
            <button type="button" onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-blue-500 text-white disabled:opacity-60">{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </div>
      );
    }

    // View mode
    return (
      <div>
        <SectionHeader icon={<User className="w-3.5 h-3.5 text-white" />} title="Владелец" onEdit={() => startEdit('owner')} />
        <div className={cardCls}>
          <div className={`pb-3.5 mb-3.5 border-b ${divCls}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Имя</p>
            <p className={`text-[15px] font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{appraisal.owner_name}</p>
          </div>
          <a href={`tel:${appraisal.owner_phone}`} className={`flex items-center gap-2 py-1 mb-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="text-[15px] font-medium">{appraisal.owner_phone}</span>
          </a>
          {messengers.length > 0 && (
            <div className={`py-3.5 mb-3.5 border-y ${divCls}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Мессенджеры</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {messengers.map(m => <span key={m} className={`px-2.5 py-1 rounded-lg text-[12px] font-medium ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{MESSENGER_LABELS[m] ?? m}</span>)}
              </div>
              {appraisal.owner_messenger_phone && (
                <a href={`tel:${appraisal.owner_messenger_phone}`} className={`flex items-center gap-1.5 text-[13px] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  <MessageCircle className="w-3.5 h-3.5" />{appraisal.owner_messenger_phone}
                </a>
              )}
            </div>
          )}
          <div className={`pt-3.5 border-t ${divCls} grid grid-cols-2 gap-3`}>
            <InfoRow label="Тип владения" value={OWNERSHIP_LABELS[appraisal.ownership_type]} />
            <InfoRow label="Тип продажи" value={SALE_TYPE_LABELS[appraisal.sale_type]} />
            {appraisal.sale_reason && <InfoRow label="Причина продажи" value={appraisal.sale_reason} full />}
          </div>
        </div>
        {appraisal.additional_contact && (
          <div className={`${cardCls} mt-3`}>
            <p className={`text-[12px] font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Дополнительный контакт</p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Имя" value={appraisal.additional_contact.name} />
              <InfoRow label="Тип контакта" value={appraisal.additional_contact.contact_type} />
            </div>
            <a href={`tel:${appraisal.additional_contact.phone}`} className={`flex items-center gap-2 mt-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span className="text-[15px] font-medium">{appraisal.additional_contact.phone}</span>
            </a>
            {appraisal.additional_contact.messengers?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {appraisal.additional_contact.messengers.map(m => <span key={m} className={`px-2.5 py-1 rounded-lg text-[12px] font-medium ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{MESSENGER_LABELS[m] ?? m}</span>)}
              </div>
            )}
            {appraisal.additional_contact.messenger_phone && (
              <a href={`tel:${appraisal.additional_contact.messenger_phone}`} className={`flex items-center gap-1.5 mt-1.5 text-[13px] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                <MessageCircle className="w-3.5 h-3.5" />{appraisal.additional_contact.messenger_phone}
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderVehicleSection = () => {
    const isEditing = editSection === 'vehicle';
    if (isEditing && ed) {
      const fOpts = [{ value: 'petrol', label: 'Бензин' }, { value: 'diesel', label: 'Дизель' }, { value: 'gas', label: 'Газ' }, { value: 'hybrid', label: 'Гибрид' }, { value: 'electric', label: 'Электро' }];
      return (
        <div>
          <SectionHeader icon={<Car className="w-3.5 h-3.5 text-white" />} title="Характеристики" />
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-sm overflow-hidden mb-3`}>
            {([['make', 'Марка', 'Toyota'], ['model', 'Модель', 'Camry']] as const).map(([k, l, p]) => (
              <div key={k} className={`px-4 py-3 border-b ${divCls}`}>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{l}</p>
                <input value={ed[k] ?? ''} onChange={e => setEdit(k, e.target.value || null)} placeholder={p} className={inputCls} />
              </div>
            ))}
            <div className={`px-4 py-3 border-b ${divCls} grid grid-cols-2 gap-3`}>
              <div>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Год</p>
                <input type="number" value={ed.year ?? ''} onChange={e => setEdit('year', e.target.value ? parseInt(e.target.value) : null)} placeholder="2020" className={inputCls} />
              </div>
              <div>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Пробег (км)</p>
                <input type="number" value={ed.mileage ?? ''} onChange={e => setEdit('mileage', e.target.value ? parseInt(e.target.value) : null)} placeholder="85000" className={inputCls} />
              </div>
            </div>
            <div className={`px-4 py-3 border-b ${divCls} grid grid-cols-2 gap-3`}>
              <div>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>VIN</p>
                <input value={ed.vin ?? ''} onChange={e => setEdit('vin', e.target.value.toUpperCase() || null)} placeholder="XTA…" maxLength={17} className={`${inputCls} font-mono text-[13px]`} />
              </div>
              <div>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ГРЗ</p>
                <input value={ed.license_plate ?? ''} onChange={e => setEdit('license_plate', e.target.value.toUpperCase() || null)} placeholder="А001АА 77" className={`${inputCls} font-mono uppercase`} />
              </div>
            </div>
            <div className={`px-4 py-3 border-b ${divCls} grid grid-cols-2 gap-3`}>
              <div>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Объём</p>
                <input value={ed.engine_volume ?? ''} onChange={e => setEdit('engine_volume', e.target.value || null)} placeholder="2.0 л" className={inputCls} />
              </div>
              <div>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Мощность (л.с.)</p>
                <input type="number" value={ed.power_hp ?? ''} onChange={e => setEdit('power_hp', e.target.value ? parseInt(e.target.value) : null)} placeholder="150" className={inputCls} />
              </div>
            </div>
            <div className={`px-4 py-3 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>КПП</p>
              <ToggleGroup<TransmissionType> value={ed.transmission ?? 'automatic'} options={[{ value: 'automatic', label: 'Автомат' }, { value: 'manual', label: 'Механика' }, { value: 'robot', label: 'Робот' }, { value: 'cvt', label: 'Вариатор' }]} onChange={v => setEdit('transmission', v)} />
            </div>
            <div className={`px-4 py-3 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Привод</p>
              <ToggleGroup<DriveType> value={ed.drive_type ?? 'front'} options={[{ value: 'front', label: 'Передний' }, { value: 'rear', label: 'Задний' }, { value: 'all', label: 'Полный' }]} onChange={v => setEdit('drive_type', v)} />
            </div>
            <div className={`px-4 py-3 border-b ${divCls}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип топлива</p>
              <div className="flex flex-wrap gap-2">
                {fOpts.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setEdit('fuel_type', value as FuelType)}
                    className={`px-3 py-1.5 rounded-xl text-[13px] font-medium border transition-all ${ed.fuel_type === value ? 'bg-blue-500 text-white border-blue-500' : isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 py-3">
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Цена владельца (₽)</p>
              <input
                type="text"
                inputMode="numeric"
                value={ownerPriceDisplay}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setOwnerPriceDisplay(raw ? new Intl.NumberFormat('ru-RU').format(Number(raw)) : '');
                  setEdit('owner_price', raw ? parseFloat(raw) : null);
                }}
                placeholder="1 500 000"
                className={inputCls}
              />
            </div>
          </div>
          {saveError && <p className="text-red-500 text-[12px] mb-3">{saveError}</p>}
          <div className="flex gap-2 mb-4">
            <button type="button" onClick={cancelEdit} className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Отмена</button>
            <button type="button" onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-blue-500 text-white disabled:opacity-60">{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </div>
        </div>
      );
    }
    return (
      <div>
        <SectionHeader icon={<Car className="w-3.5 h-3.5 text-white" />} title="Характеристики" onEdit={() => startEdit('vehicle')} />
        <div className={cardCls}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <InfoRow label="VIN" value={appraisal.vin} mono />
            <InfoRow label="ГРЗ" value={appraisal.license_plate} mono />
            <InfoRow label="Объём двигателя" value={appraisal.engine_volume} />
            <InfoRow label="Мощность" value={appraisal.power_hp ? `${appraisal.power_hp} л.с.` : null} />
            <InfoRow label="КПП" value={appraisal.transmission ? TRANSMISSION_LABELS[appraisal.transmission] : null} />
            <InfoRow label="Привод" value={appraisal.drive_type ? DRIVE_LABELS[appraisal.drive_type] : null} />
            <InfoRow label="Тип топлива" value={appraisal.fuel_type ? FUEL_LABELS[appraisal.fuel_type] : null} />
            <InfoRow label="Пробег" value={fMileage(appraisal.mileage)} />
            <InfoRow label="Цена владельца" value={fPrice(appraisal.owner_price)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {lightbox && <Lightbox state={lightbox} onClose={() => setLightbox(null)} />}

      <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={onBack} className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} -ml-1`}>
              <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className={`text-[16px] font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
              <p className={`text-[12px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fDate(appraisal.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 max-w-md mx-auto w-full pb-10 space-y-4">

          {/* Hero */}
          <div className={cardCls}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className={`text-[22px] font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {[appraisal.make, appraisal.model].filter(Boolean).join(' ') || '—'}
                </p>
                <p className={`text-[15px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{appraisal.year ?? '—'}</p>
              </div>
              {totalPhotos > 0 && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Camera className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-[12px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{totalPhotos}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {appraisal.transmission && <span className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{TRANSMISSION_LABELS[appraisal.transmission]}</span>}
              {appraisal.fuel_type && <span className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{FUEL_LABELS[appraisal.fuel_type]}</span>}
              {appraisal.drive_type && <span className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{DRIVE_LABELS[appraisal.drive_type]}</span>}
              {appraisal.engine_volume && <span className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{appraisal.engine_volume}</span>}
              {appraisal.power_hp && <span className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{appraisal.power_hp} л.с.</span>}
            </div>
          </div>

          {/* Approval button */}
        <button
			type="button"
			onClick={sendToApproval}
			disabled={sendingApproval}
			className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-[15px] transition-all ${
				isDark
					? "bg-blue-900/30 border border-blue-700/60 text-blue-400 hover:bg-blue-900/50"
					: "bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100"
			} ${sendingApproval ? "opacity-60 cursor-not-allowed" : ""}`}
		>
			<Send className="w-4 h-4" />

			{sendingApproval
				? "Отправка..."
				: "Отправить на согласование"}
		</button>

          {renderPurchaseSection()}
          {renderOwnerSection()}
          {renderVehicleSection()}

          {/* Presale costs */}
          <div>
            <SectionHeader icon={<Wrench className="w-3.5 h-3.5 text-white" />} title="Затраты на предпродажную подготовку" />
            <div className={cardCls}>
              {costs.length === 0 && !addingCost && (
                <p className={`text-[13px] mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Услуги не добавлены</p>
              )}
              {costs.map(c => (
                <div key={c.id} className={`flex items-center gap-3 py-3 border-b ${divCls}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{c.type}</p>
                  </div>
                  <p className={`text-[14px] font-semibold flex-shrink-0 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{new Intl.NumberFormat('ru-RU').format(c.cost)} ₽</p>
                  <button type="button" onClick={() => removeCost(c.id)} className="flex-shrink-0 p-1">
                    <X className={`w-4 h-4 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-300 hover:text-red-500'}`} />
                  </button>
                </div>
              ))}
              {costs.length > 0 && (
                <div className={`flex items-center justify-between py-2.5 border-b ${divCls} mb-3`}>
                  <p className={`text-[13px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Итого</p>
                  <p className={`text-[16px] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{new Intl.NumberFormat('ru-RU').format(costs.reduce((s, c) => s + c.cost, 0))} ₽</p>
                </div>
              )}
              {addingCost ? (
                <div className="space-y-2">
                  <input value={newCostType} onChange={e => setNewCostType(e.target.value)} placeholder="Тип услуги (полировка, детейлинг…)" className={`${inputCls} text-[14px]`} />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={costAmountDisplay}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setCostAmountDisplay(raw ? new Intl.NumberFormat('ru-RU').format(Number(raw)) : '');
                      setNewCostAmount(raw);
                    }}
                    placeholder="Стоимость (₽)"
                    className={`${inputCls} text-[14px]`}
                  />
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setAddingCost(false); setNewCostType(''); setNewCostAmount(''); setCostAmountDisplay(''); }} className={`flex-1 py-2 rounded-xl text-[13px] font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Отмена</button>
                    <button type="button" onClick={addCost} disabled={savingCosts || !newCostType.trim() || !newCostAmount.trim()} className="flex-1 py-2 rounded-xl text-[13px] font-semibold bg-blue-500 text-white disabled:opacity-50">Добавить</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingCost(true)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-[13px] font-medium transition-colors ${isDark ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400' : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500'}`}>
                  <Plus className="w-4 h-4" />Добавить услугу
                </button>
              )}
            </div>
          </div>

          {/* Condition section */}
          <div>
            <SectionHeader icon={<ClipboardList className="w-3.5 h-3.5 text-white" />} title="Состояние автомобиля" onEdit={() => startEdit('condition')} />
            {editSection === 'condition' && editData ? (
              <div className={cardCls}>
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Комментарий</p>
                <textarea value={editData.car_condition_comment ?? ''} onChange={e => setEdit('car_condition_comment', e.target.value || null)} placeholder="Опишите состояние…" rows={4} className={`${inputCls} resize-none mb-3`} />
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Отчёт толщинометра (PDF)</p>
                {appraisal.car_condition_pdf_url ? (
                  <div className={`flex items-center gap-3 px-4 py-3 -mx-4 rounded-xl mb-3 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <a href={appraisal.car_condition_pdf_url} target="_blank" rel="noopener noreferrer" className={`flex-1 text-[13px] font-medium truncate ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Отчёт толщинометра</a>
                    <label className="cursor-pointer">
                      <input type="file" accept="application/pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleConditionPdfReplace(f); e.target.value = ''; }} />
                      <span className={`text-[12px] font-medium ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-500'}`}>
                        {uploadingConditionPdf ? 'Загрузка...' : 'Заменить'}
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors mb-3 ${isDark ? 'border-gray-600 bg-gray-700/40 hover:border-blue-500' : 'border-gray-200 bg-gray-50 hover:border-blue-400'}`}>
                    <input type="file" accept="application/pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleConditionPdfReplace(f); e.target.value = ''; }} />
                    <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <span className={`text-[13px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {uploadingConditionPdf ? 'Загрузка...' : 'Прикрепить PDF файл'}
                    </span>
                  </label>
                )}
                {saveError && <p className="text-red-500 text-[12px] mb-3">{saveError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={cancelEdit} className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Отмена</button>
                  <button type="button" onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-blue-500 text-white disabled:opacity-60">{saving ? 'Сохранение...' : 'Сохранить'}</button>
                </div>
              </div>
            ) : (
              <div className={cardCls}>
                {appraisal.car_condition_pdf_url && (
                  <a href={appraisal.car_condition_pdf_url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-4 py-3 -mx-4 -mt-4 mb-3 rounded-t-2xl border-b transition-colors ${isDark ? 'bg-gray-700/50 border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                    <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`flex-1 text-[13px] font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Отчёт толщинометра (PDF)</span>
                    <ExternalLink className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </a>
                )}
                {appraisal.car_condition_comment ? (
                  <p className={`text-[14px] leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{appraisal.car_condition_comment}</p>
                ) : (
                  <p className={`text-[13px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Комментарий не добавлен</p>
                )}
              </div>
            )}
          </div>

          {/* Autoteka section */}
          <div>
            <SectionHeader icon={<Link className="w-3.5 h-3.5 text-white" />} title="Автотека" />
            <div className={cardCls}>
              {appraisal.autoteka_pdf_url && (
                <a href={appraisal.autoteka_pdf_url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-4 py-3 -mx-4 -mt-4 mb-3 rounded-t-2xl border-b transition-colors ${isDark ? 'bg-gray-700/50 border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                  <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                  <span className={`flex-1 text-[13px] font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Отчёт Автотеки (PDF)</span>
                  <ExternalLink className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </a>
              )}
              {appraisal.autoteka_url && (
                <a href={appraisal.autoteka_url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 mb-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  <Link className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[14px] font-medium truncate">Ссылка на Автотеку</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
              )}
              {!appraisal.autoteka_url && !appraisal.autoteka_pdf_url && (
                <p className={`text-[13px] mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Данные не добавлены</p>
              )}
              {/* URL input */}
              <div className="mb-3">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Обновить ссылку</p>
                <div className="flex gap-2">
                  <input type="url" value={editAutotekaUrl} onChange={e => setEditAutotekaUrl(e.target.value)}
                    placeholder="https://autoteka.ru/..." className={`${inputCls} flex-1 text-[13px]`} />
                  <button type="button" onClick={handleAutotekaUrlSave} disabled={!editAutotekaUrl.trim()}
                    className="px-3 py-2 bg-blue-500 text-white rounded-xl text-[13px] font-medium disabled:opacity-40">ОК</button>
                </div>
              </div>
              {/* PDF upload */}
              <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>PDF Автотеки</p>
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 bg-gray-700/40 hover:border-blue-500' : 'border-gray-200 bg-gray-50 hover:border-blue-400'}`}>
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAutotekaPdfReplace(f); e.target.value = ''; }} />
                {uploadingAutotekaPdf ? <Upload className={`w-5 h-5 flex-shrink-0 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <FileText className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                <span className={`text-[13px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {uploadingAutotekaPdf ? 'Загрузка...' : appraisal.autoteka_pdf_url ? 'Заменить PDF' : 'Прикрепить PDF файл'}
                </span>
              </label>
            </div>
          </div>

          {/* Photo sections */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0"><Camera className="w-3.5 h-3.5 text-white" /></div>
                <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Фотографии</h2>
              </div>
              <button type="button" onClick={() => setEditingPhotos(p => !p)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${editingPhotos ? isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600' : isDark ? 'bg-gray-700 text-gray-400 hover:text-blue-400' : 'bg-gray-100 text-gray-500 hover:text-blue-500'}`}>
                <Pencil className="w-3 h-3" />{editingPhotos ? 'Готово' : 'Изменить'}
              </button>
            </div>

            {/* STS */}
            {(urlsBySlot['sts']?.length || editingPhotos) && (
              <div className="mb-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Документы</p>
                <div className={cardCls}>
                  <div className="grid grid-cols-2 gap-2">
                    {(urlsBySlot['sts'] ?? []).map(url => (
                      <div key={url} className="relative aspect-[4/3]">
                        <PhotoTile url={url} caption="Фото СТС" onClick={() => openLightbox([url], ['Фото СТС'], 0)} />
                        {editingPhotos && (
                          <button type="button" onClick={() => handleDeletePhoto('sts', url)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></button>
                        )}
                      </div>
                    ))}
                    {editingPhotos && (
                      <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhoto('sts', f, false); e.target.value = ''; }} />
                        {uploadingPhoto === 'sts' ? <Upload className={`w-5 h-5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                        <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Добавить</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Exterior */}
            {((['front','left','rear','right'] as const).some(s => urlsBySlot[s]?.length) || editingPhotos) && (
              <div className="mb-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Кузов — основные ракурсы</p>
                <div className={cardCls}>
                  <div className="grid grid-cols-2 gap-2">
                    {(['front','left','rear','right'] as const).map(slot => (
                      <div key={slot}>
                        {(urlsBySlot[slot] ?? []).map(url => (
                          <div key={url} className="relative aspect-[4/3] mb-2">
                            <PhotoTile url={url} caption={{front:'Передняя',left:'Левая',rear:'Задняя',right:'Правая'}[slot]} onClick={() => { const all = ['front','left','rear','right'].flatMap(s => urlsBySlot[s]??[]); openLightbox(all, ['front','left','rear','right'].flatMap(s => (urlsBySlot[s]??[]).map(()=>({front:'Передняя',left:'Левая',rear:'Задняя',right:'Правая'}[s]!))), all.indexOf(url)); }} />
                            {editingPhotos && <button type="button" onClick={() => handleDeletePhoto(slot, url)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></button>}
                          </div>
                        ))}
                        {editingPhotos && !(urlsBySlot[slot]?.length) && (
                          <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhoto(slot, f, false); e.target.value = ''; }} />
                            {uploadingPhoto === slot ? <Upload className={`w-5 h-5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                            <span className={`text-[11px] text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{{front:'Передняя',left:'Левая',rear:'Задняя',right:'Правая'}[slot]}</span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Optics */}
            {((['front_light_left','front_light_right','rear_light_left','rear_light_right'] as const).some(s => urlsBySlot[s]?.length) || editingPhotos) && (
              <div className="mb-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оптика</p>
                <div className={cardCls}>
                  <SubLabel text="Передняя оптика" />
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(['front_light_left','front_light_right'] as const).map(slot => (
                      <div key={slot}>
                        {(urlsBySlot[slot] ?? []).map(url => (
                          <div key={url} className="relative aspect-[4/3] mb-2">
                            <PhotoTile url={url} caption={slot === 'front_light_left' ? 'Левая' : 'Правая'} onClick={() => openLightbox([url],[slot === 'front_light_left' ? 'Левая' : 'Правая'],0)} />
                            {editingPhotos && <button type="button" onClick={() => handleDeletePhoto(slot, url)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></button>}
                          </div>
                        ))}
                        {editingPhotos && !(urlsBySlot[slot]?.length) && (
                          <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhoto(slot, f, false); e.target.value = ''; }} />
                            {uploadingPhoto === slot ? <Upload className={`w-5 h-5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                            <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{slot === 'front_light_left' ? 'Левая' : 'Правая'}</span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                  <SubLabel text="Задняя оптика" />
                  <div className="grid grid-cols-2 gap-2">
                    {(['rear_light_left','rear_light_right'] as const).map(slot => (
                      <div key={slot}>
                        {(urlsBySlot[slot] ?? []).map(url => (
                          <div key={url} className="relative aspect-[4/3] mb-2">
                            <PhotoTile url={url} caption={slot === 'rear_light_left' ? 'Левая' : 'Правая'} onClick={() => openLightbox([url],[slot === 'rear_light_left' ? 'Левая' : 'Правая'],0)} />
                            {editingPhotos && <button type="button" onClick={() => handleDeletePhoto(slot, url)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></button>}
                          </div>
                        ))}
                        {editingPhotos && !(urlsBySlot[slot]?.length) && (
                          <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhoto(slot, f, false); e.target.value = ''; }} />
                            {uploadingPhoto === slot ? <Upload className={`w-5 h-5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                            <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{slot === 'rear_light_left' ? 'Левая' : 'Правая'}</span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tires */}
            {((['tire_specs','tire_date'] as const).some(s => urlsBySlot[s]?.length) || editingPhotos) && (
              <div className="mb-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Резина</p>
                <div className={cardCls}>
                  <div className="grid grid-cols-2 gap-2">
                    {(['tire_specs','tire_date'] as const).map(slot => (
                      <div key={slot}>
                        {(urlsBySlot[slot] ?? []).map(url => (
                          <div key={url} className="relative aspect-[4/3] mb-2">
                            <PhotoTile url={url} caption={slot === 'tire_specs' ? 'Параметры' : 'Дата выпуска'} onClick={() => openLightbox([url],[slot === 'tire_specs' ? 'Параметры' : 'Дата выпуска'],0)} />
                            {editingPhotos && <button type="button" onClick={() => handleDeletePhoto(slot, url)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></button>}
                          </div>
                        ))}
                        {editingPhotos && !(urlsBySlot[slot]?.length) && (
                          <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhoto(slot, f, false); e.target.value = ''; }} />
                            {uploadingPhoto === slot ? <Upload className={`w-5 h-5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                            <span className={`text-[11px] text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{slot === 'tire_specs' ? 'Параметры' : 'Дата выпуска'}</span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Windshield */}
            {((urlsBySlot['windshield']?.length ?? 0) > 0 || editingPhotos) && (
              <div className="mb-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Лобовое стекло</p>
                <div className={cardCls}>
                  <div className="grid grid-cols-2 gap-2">
                    {(urlsBySlot['windshield'] ?? []).map(url => (
                      <div key={url} className="relative aspect-[4/3]">
                        <PhotoTile url={url} caption="Маркировка стекла" onClick={() => openLightbox([url],['Маркировка стекла'],0)} />
                        {editingPhotos && <button type="button" onClick={() => handleDeletePhoto('windshield', url)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5 text-white" /></button>}
                      </div>
                    ))}
                    {editingPhotos && !(urlsBySlot['windshield']?.length) && (
                      <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhoto('windshield', f, false); e.target.value = ''; }} />
                        {uploadingPhoto === 'windshield' ? <Upload className={`w-5 h-5 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                        <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Добавить</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Extra body photos */}
            {((urlsBySlot['body_extra']?.length ?? 0) > 0 || editingPhotos) && (
              <div className="mb-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дополнительные фото кузова</p>
                <div className={cardCls}>
                  <div className="grid grid-cols-3 gap-2">
                    {(urlsBySlot['body_extra'] ?? []).map((url, i) => (
                      <div key={url} className="relative aspect-square">
                        <PhotoTile url={url} size="sm" onClick={() => openLightbox(urlsBySlot['body_extra']??[], (urlsBySlot['body_extra']??[]).map((_,j)=>`Фото ${j+1}`), i)} />
                        {editingPhotos && <button type="button" onClick={() => handleDeletePhoto('body_extra', url)} className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>}
                      </div>
                    ))}
                    {editingPhotos && (
                      <label className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = Array.from(e.target.files ?? []); files.forEach(f => handleAddPhoto('body_extra', f, true)); e.target.value = ''; }} />
                        {uploadingPhoto === 'body_extra' ? <Upload className={`w-4 h-4 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Добавить</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Body defects */}
            {((urlsBySlot['body_defects']?.length ?? 0) > 0 || editingPhotos) && (
              <div className="mb-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дефекты кузова</p>
                <div className={cardCls}>
                  <div className="grid grid-cols-3 gap-2">
                    {(urlsBySlot['body_defects'] ?? []).map((url, i) => (
                      <div key={url} className="relative aspect-square">
                        <PhotoTile url={url} size="sm" onClick={() => openLightbox(urlsBySlot['body_defects']??[], (urlsBySlot['body_defects']??[]).map((_,j)=>`Дефект ${j+1}`), i)} />
                        {editingPhotos && <button type="button" onClick={() => handleDeletePhoto('body_defects', url)} className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>}
                      </div>
                    ))}
                    {editingPhotos && (
                      <label className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-600 hover:border-blue-500' : 'border-gray-200 hover:border-blue-400'}`}>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = Array.from(e.target.files ?? []); files.forEach(f => handleAddPhoto('body_defects', f, true)); e.target.value = ''; }} />
                        {uploadingPhoto === 'body_defects' ? <Upload className={`w-4 h-4 animate-pulse ${isDark ? 'text-blue-400' : 'text-blue-500'}`} /> : <Plus className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Добавить</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Delete button */}
          <button type="button" onClick={() => setShowDeleteConfirm(true)}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-[14px] font-medium transition-colors ${isDark ? 'border-red-800 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
            <Trash2 className="w-4 h-4" />Удалить оценку
          </button>

        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center px-4 pb-8">
          <div className={`w-full max-w-md rounded-3xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className={`text-[18px] font-semibold text-center mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Удалить оценку?</h3>
            <p className={`text-[14px] text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Это действие нельзя отменить. Все данные и фотографии будут удалены.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className={`flex-1 py-3 rounded-2xl text-[15px] font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>Отмена</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 py-3 rounded-2xl text-[15px] font-semibold bg-red-500 text-white disabled:opacity-60 transition-colors">{deleting ? 'Удаление...' : 'Удалить'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
