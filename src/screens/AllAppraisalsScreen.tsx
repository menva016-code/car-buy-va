import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { loadMarks, loadModels, filterMarks, filterModels } from '../lib/carsApi';
import { searchModels as staticSearchModels } from '../lib/carDatabase';
import type { CarMark, CarModel } from '../lib/carsApi';
import type { Appraisal, TransmissionType, DriveType, FuelType } from '../types';
import { AppraisalCard, togglePurchasedInDB, fetchFrontPhotos } from './AppraisalCard';

const PAGE_SIZE = 15;

interface FilterState {
  makeId: string;    // API mark id used for models query
  makeName: string;  // displayed + used in DB filter
  modelName: string;
  yearMin: string;
  yearMax: string;
  dateFrom: string;
  dateTo: string;
  transmissions: TransmissionType[];
  driveTypes: DriveType[];
  fuelTypes: FuelType[];
}

const EMPTY_FILTERS: FilterState = {
  makeId: '', makeName: '', modelName: '', yearMin: '', yearMax: '',
  dateFrom: '', dateTo: '',
  transmissions: [], driveTypes: [], fuelTypes: [],
};

function activeCount(f: FilterState): number {
  let n = 0;
  if (f.makeName) n++;
  if (f.modelName) n++;
  if (f.yearMin || f.yearMax) n++;
  if (f.dateFrom || f.dateTo) n++;
  n += f.transmissions.length + f.driveTypes.length + f.fuelTypes.length;
  return n;
}

function toggleArr<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

// ---- Autocomplete ----

interface AutocompleteProps<T extends { name: string }> {
  value: string;
  onType: (v: string) => void;
  onSelect: (item: T) => void;
  onClear: () => void;
  suggestions: T[];
  placeholder: string;
  confirmed: boolean;
  loading?: boolean;
}

function Autocomplete<T extends { name: string; id: string }>({
  value, onType, onSelect, onClear, suggestions, placeholder, confirmed, loading,
}: AutocompleteProps<T>) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const showDropdown = open && (suggestions.length > 0 || loading);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center rounded-xl border transition-all ${
        confirmed
          ? isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-300'
          : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
      } ${open ? isDark ? 'ring-1 ring-blue-500' : 'ring-1 ring-blue-400' : ''}`}>
        <input
          type="text"
          value={value}
          onChange={e => { onType(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`flex-1 min-w-0 bg-transparent px-3 py-2.5 text-[14px] outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
        />
        {loading && <Loader2 className={`w-3.5 h-3.5 mr-2.5 animate-spin flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
        {!loading && value && (
          <button type="button" onClick={() => { onClear(); setOpen(false); }} className="pr-2.5 flex-shrink-0">
            <X className={`w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </button>
        )}
      </div>
      {showDropdown && (
        <div className={`absolute top-full left-0 right-0 mt-1 z-30 rounded-xl shadow-xl border overflow-hidden max-h-52 overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          {loading ? (
            <div className={`px-3.5 py-3 text-[13px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Загрузка...</div>
          ) : suggestions.map(s => (
            <button key={s.id} type="button" onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(s); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-[14px] transition-colors border-b last:border-0 ${isDark ? 'text-gray-200 hover:bg-gray-700 border-gray-700' : 'text-gray-800 hover:bg-blue-50 border-gray-50'}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Pill ----

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const { isDark } = useTheme();
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-[13px] font-medium border transition-all ${
        active ? 'bg-blue-500 text-white border-blue-500' : isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-600 border-gray-200'
      }`}>
      {label}
    </button>
  );
}

function FilterLabel({ text }: { text: string }) {
  const { isDark } = useTheme();
  return <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{text}</p>;
}

// ---- Main ----

interface AllAppraisalsScreenProps {
  onOpenDetail: (id: string) => void;
}

export function AllAppraisalsScreen({ onOpenDetail }: AllAppraisalsScreenProps) {
  const { isDark } = useTheme();

  // Data
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [frontPhotos, setFrontPhotos] = useState<Record<string, string>>({});
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offsetRef] = useState({ value: 0 });

  // Search + Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // Autocomplete data from API
  const [allMarks, setAllMarks] = useState<CarMark[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [loadedModels, setLoadedModels] = useState<CarModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Autocomplete input state
  const [makeInput, setMakeInput] = useState('');
  const [makeConfirmed, setMakeConfirmed] = useState(false);
  const [modelInput, setModelInput] = useState('');
  const [modelConfirmed, setModelConfirmed] = useState(false);

  // Load marks from API once on mount
  useEffect(() => {
    setMarksLoading(true);
    loadMarks().then(marks => { setAllMarks(marks); setMarksLoading(false); });
  }, []);

  // Derived suggestions
  const makeSuggestions = !makeConfirmed ? filterMarks(allMarks, makeInput) : [];
  const modelSuggestionsApi = !modelConfirmed ? filterModels(loadedModels, modelInput) : [];
  const modelSuggestionsStatic = (!modelConfirmed && !filters.makeId && modelInput)
    ? staticSearchModels(modelInput).map(n => ({ id: n, name: n, mark_id: '' }))
    : [];
  const modelSuggestions = filters.makeId ? modelSuggestionsApi : modelSuggestionsStatic;

  // Build Supabase query
  function buildQuery(offset: number) {
    let q = supabase
      .from('appraisals')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const s = search.trim();
    if (s) {
      const sNorm = s.replace(/\s+/g, '').toLowerCase();
      q = q.or(`owner_name.ilike.%${s}%,owner_phone.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%,vin.ilike.%${s}%,license_plate.ilike.%${s}%,license_plate_search.ilike.%${sNorm}%`);
    }

    if (filters.makeName) q = q.ilike('make', filters.makeConfirmed ? filters.makeName : `%${filters.makeName}%`);
    if (filters.modelName) q = q.ilike('model', modelConfirmed ? filters.modelName : `%${filters.modelName}%`);
    if (filters.yearMin) q = q.gte('year', parseInt(filters.yearMin));
    if (filters.yearMax) q = q.lte('year', parseInt(filters.yearMax));
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom + 'T00:00:00');
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');
    if (filters.transmissions.length) q = q.in('transmission', filters.transmissions);
    if (filters.driveTypes.length) q = q.in('drive_type', filters.driveTypes);
    if (filters.fuelTypes.length) q = q.in('fuel_type', filters.fuelTypes);

    return q.range(offset, offset + PAGE_SIZE - 1);
  }

  const loadData = useCallback(async (reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const offset = reset ? 0 : offsetRef.value;
    const { data, count, error } = await buildQuery(offset);
    if (!error && data) {
      if (reset) setAppraisals(data as Appraisal[]);
      else setAppraisals(prev => [...prev, ...(data as Appraisal[])]);
      offsetRef.value = offset + data.length;
      setHasMore(data.length === PAGE_SIZE);
      if (reset && count !== null) setTotalCount(count);
      // Fetch front photos for newly loaded items
      const photos = await fetchFrontPhotos((data as Appraisal[]).map(a => a.id));
      setFrontPhotos(prev => ({ ...prev, ...photos }));
    }
    if (reset) setLoading(false); else setLoadingMore(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters, modelConfirmed]);

  useEffect(() => {
    const t = setTimeout(() => { offsetRef.value = 0; loadData(true); }, 350);
    return () => clearTimeout(t);
  }, [loadData]);

  function handleTogglePurchased(id: string, current: boolean) {
    togglePurchasedInDB(id, current).then(ok => {
      if (ok) setAppraisals(prev => prev.map(a => a.id === id ? { ...a, is_purchased: !current } : a));
    });
  }

  // Make autocomplete handlers
  function handleMakeType(v: string) {
    setMakeInput(v);
    setMakeConfirmed(false);
    setModelInput(''); setModelConfirmed(false);
    setFilters(prev => ({ ...prev, makeId: '', makeName: v, modelName: '' }));
    setLoadedModels([]);
  }

  function handleMakeSelect(mark: CarMark) {
    setMakeInput(mark.name);
    setMakeConfirmed(true);
    setModelInput(''); setModelConfirmed(false);
    setFilters(prev => ({ ...prev, makeId: mark.id, makeName: mark.name, modelName: '' }));
    // Load models for this mark
    setModelsLoading(true);
    loadModels(mark.id).then(models => { setLoadedModels(models); setModelsLoading(false); });
  }

  function handleMakeClear() {
    setMakeInput(''); setMakeConfirmed(false);
    setModelInput(''); setModelConfirmed(false);
    setFilters(prev => ({ ...prev, makeId: '', makeName: '', modelName: '' }));
    setLoadedModels([]);
  }

  // Model autocomplete handlers
  function handleModelType(v: string) {
    setModelInput(v);
    setModelConfirmed(false);
    setFilters(prev => ({ ...prev, modelName: v }));
  }

  function handleModelSelect(model: CarModel) {
    setModelInput(model.name);
    setModelConfirmed(true);
    setFilters(prev => ({ ...prev, modelName: model.name }));
  }

  function handleModelClear() {
    setModelInput(''); setModelConfirmed(false);
    setFilters(prev => ({ ...prev, modelName: '' }));
  }

  function clearAll() {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setMakeInput(''); setMakeConfirmed(false);
    setModelInput(''); setModelConfirmed(false);
    setLoadedModels([]);
  }

  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  const ac = activeCount(filters);
  const hasAny = ac > 0 || search.trim().length > 0;

  const inputCls = `w-full rounded-xl px-3 py-2.5 text-[14px] outline-none focus:ring-1 focus:ring-blue-400 transition-all ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'}`;
  const divCls = `border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`;

  return (
    <div className="flex flex-col flex-1">
      {/* Sticky search + filter controls */}
      <div className={`sticky top-0 z-20 px-4 py-3 ${isDark ? 'bg-gray-900' : 'bg-[#f0f2f5]'}`}>
        <div className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 mb-2.5 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <Search className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, марке, ГРЗ, VIN…"
            className={`flex-1 bg-transparent text-[14px] outline-none ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'}`}
          />
          {search && <button onClick={() => setSearch('')}><X className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} /></button>}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-colors shadow-sm ${
              showFilters || ac > 0 ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'
            }`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Фильтры
            {ac > 0 && (
              <span className={`w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center ${showFilters ? 'bg-white text-blue-500' : 'bg-blue-400 text-white'}`}>{ac}</span>
            )}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {hasAny && (
            <button onClick={clearAll}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium shadow-sm transition-colors ${isDark ? 'bg-gray-800 text-gray-400 hover:text-red-400' : 'bg-white text-gray-500 hover:text-red-500'}`}>
              <RotateCcw className="w-3.5 h-3.5" />Сбросить
            </button>
          )}

          <div className="flex-1" />
          {totalCount !== null && !loading && (
            <span className={`text-[12px] font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{totalCount} оценок</span>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className={`mx-4 mb-3 rounded-2xl shadow-sm overflow-visible ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Make + Model */}
          <div className={`px-4 py-3.5 ${divCls} grid grid-cols-2 gap-3`}>
            <div>
              <FilterLabel text="Марка" />
              <Autocomplete<CarMark>
                value={makeInput}
                onType={handleMakeType}
                onSelect={handleMakeSelect}
                onClear={handleMakeClear}
                suggestions={makeSuggestions}
                placeholder="Toyota…"
                confirmed={makeConfirmed}
                loading={marksLoading && !allMarks.length}
              />
            </div>
            <div>
              <FilterLabel text="Модель" />
              <Autocomplete<CarModel>
                value={modelInput}
                onType={handleModelType}
                onSelect={handleModelSelect}
                onClear={handleModelClear}
                suggestions={modelSuggestions}
                placeholder="Camry…"
                confirmed={modelConfirmed}
                loading={modelsLoading}
              />
            </div>
          </div>

          {/* Year range */}
          <div className={`px-4 py-3.5 ${divCls} grid grid-cols-2 gap-3`}>
            <div><FilterLabel text="Год от" />
              <input type="number" value={filters.yearMin} onChange={e => setFilter('yearMin', e.target.value)} placeholder="2010" min="1990" max="2030" className={inputCls} />
            </div>
            <div><FilterLabel text="Год до" />
              <input type="number" value={filters.yearMax} onChange={e => setFilter('yearMax', e.target.value)} placeholder="2025" min="1990" max="2030" className={inputCls} />
            </div>
          </div>

          {/* Date range */}
          <div className={`px-4 py-3.5 ${divCls} grid grid-cols-2 gap-3`}>
            <div><FilterLabel text="Дата от" />
              <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} className={inputCls} />
            </div>
            <div><FilterLabel text="Дата до" />
              <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Transmission */}
          <div className={`px-4 py-3.5 ${divCls}`}>
            <FilterLabel text="КПП" />
            <div className="flex flex-wrap gap-2">
              {(['automatic','manual','robot','cvt'] as const).map((v,i) => (
                <Pill key={v} label={['АКПП','МКПП','Робот','CVT'][i]} active={filters.transmissions.includes(v)} onClick={() => setFilter('transmissions', toggleArr(filters.transmissions, v))} />
              ))}
            </div>
          </div>

          {/* Drive */}
          <div className={`px-4 py-3.5 ${divCls}`}>
            <FilterLabel text="Привод" />
            <div className="flex flex-wrap gap-2">
              {(['front','rear','all'] as const).map((v,i) => (
                <Pill key={v} label={['Передний','Задний','Полный'][i]} active={filters.driveTypes.includes(v)} onClick={() => setFilter('driveTypes', toggleArr(filters.driveTypes, v))} />
              ))}
            </div>
          </div>

          {/* Fuel */}
          <div className="px-4 py-3.5">
            <FilterLabel text="Тип топлива" />
            <div className="flex flex-wrap gap-2">
              {(['petrol','diesel','gas','hybrid','electric'] as const).map((v,i) => (
                <Pill key={v} label={['Бензин','Дизель','Газ','Гибрид','Электро'][i]} active={filters.fuelTypes.includes(v)} onClick={() => setFilter('fuelTypes', toggleArr(filters.fuelTypes, v))} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 px-4 pb-24 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className={`rounded-2xl h-32 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-white'}`} />
          ))
        ) : appraisals.length === 0 ? (
          <div className={`rounded-2xl p-8 text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Search className={`w-8 h-8 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-[15px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Ничего не найдено</p>
            <p className={`text-[13px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <>
            {appraisals.map(a => (
              <AppraisalCard key={a.id} appraisal={a} frontPhotoUrl={frontPhotos[a.id]} onOpen={onOpenDetail} onTogglePurchased={handleTogglePurchased}
                onDelete={id => setAppraisals(prev => prev.filter(x => x.id !== id))} />
            ))}
            {hasMore && (
              <button onClick={() => loadData(false)} disabled={loadingMore}
                className={`w-full py-3.5 rounded-2xl text-[14px] font-medium transition-colors shadow-sm ${isDark ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}>
                {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
