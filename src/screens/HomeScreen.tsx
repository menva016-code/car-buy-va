import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Sun, Moon, RefreshCw, FileEdit, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import type { Appraisal } from '../types';
import { AppraisalCard, togglePurchasedInDB, fetchFrontPhotos } from './AppraisalCard';
import { AllAppraisalsScreen } from './AllAppraisalsScreen';

function todayRange() {
  const now = new Date();
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}T00:00:00`, to: `${y}-${m}-${d}T23:59:59` };
}

function formatTodayLabel() {
  return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

interface HomeScreenProps {
  onNewAppraisal: () => void;
  onOpenDetail: (id: string) => void;
  refreshKey: number;
  hasDraft?: boolean;
  onDiscardDraft?: () => void;
}

export function HomeScreen({ onNewAppraisal, onOpenDetail, refreshKey, hasDraft, onDiscardDraft }: HomeScreenProps) {
  const { isDark, toggleTheme } = useTheme();
  const [tab, setTab] = useState<'today' | 'all'>('today');
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [frontPhotos, setFrontPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    const { from, to } = todayRange();
    const { data, error } = await supabase
      .from('appraisals')
      .select('*')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setAppraisals(data as Appraisal[]);
      const photos = await fetchFrontPhotos((data as Appraisal[]).map(a => a.id));
      setFrontPhotos(photos);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday, refreshKey]);

  function handleTogglePurchased(id: string, current: boolean) {
    togglePurchasedInDB(id, current).then(ok => {
      if (ok) setAppraisals(prev => prev.map(a => a.id === id ? { ...a, is_purchased: !current } : a));
    });
  }

  const dateLabel = formatTodayLabel();
  const capitalised = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-md lg:max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-[17px] font-semibold leading-tight ${isDark ? 'text-white' : 'text-ink'}`}>Оценка авто</h1>
            <p className={`text-[12px] capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{capitalised}</p>
          </div>
          {tab === 'today' && (
            <button onClick={fetchToday} aria-label="Обновить"
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors mr-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
              <RefreshCw className={`w-[17px] h-[17px] ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button onClick={toggleTheme} aria-label="Переключить тему"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-md lg:max-w-5xl mx-auto px-4 pb-0 flex">
          {(['today', 'all'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[14px] font-medium border-b-2 transition-colors ${
                tab === t
                  ? `border-brand-500 ${isDark ? 'text-brand-400' : 'text-brand-600'}`
                  : `border-transparent ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
              }`}>
              {t === 'today' ? 'Сегодня' : 'Все оценки'}
            </button>
          ))}
        </div>
      </div>

      {/* Draft banner */}
      {hasDraft && (
        <div className="max-w-md lg:max-w-5xl mx-auto w-full px-4 pt-3">
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm ${isDark ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-amber-50 border border-amber-200'}`}>
            <FileEdit className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Есть незавершённая оценка</p>
              <button onClick={onNewAppraisal}
                className={`text-[12px] font-medium underline underline-offset-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                Продолжить заполнение
              </button>
            </div>
            <button onClick={onDiscardDraft}
              className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'text-amber-500 hover:text-amber-300 hover:bg-amber-900/40' : 'text-amber-500 hover:text-amber-700 hover:bg-amber-100'}`}
              aria-label="Удалить черновик">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {tab === 'today' ? (
        <div className="flex-1 px-4 py-4 max-w-md lg:max-w-5xl mx-auto w-full pb-24">
          {/* Stats */}
          <div className="flex gap-3 mb-4">
            <div className={`flex-1 rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Оценок сегодня</p>
              <p className={`text-[26px] font-bold mt-0.5 ${isDark ? 'text-white' : 'text-ink'}`}>{loading ? '—' : appraisals.length}</p>
            </div>
            <div className={`flex-1 rounded-2xl px-4 py-3 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Выкуплено</p>
              <p className="text-[26px] font-bold mt-0.5 text-green-500">{loading ? '—' : appraisals.filter(a => a.is_purchased).length}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map(i => <div key={i} className={`rounded-2xl h-36 animate-pulse ${isDark ? 'bg-gray-800' : 'bg-white'}`} />)}
            </div>
          ) : appraisals.length === 0 ? (
            <div className={`rounded-2xl p-8 text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <ClipboardList className={`w-6 h-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <p className={`text-[15px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Оценок пока нет</p>
              <p className={`text-[13px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нажмите «+» чтобы создать первую оценку за сегодня</p>
            </div>
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {appraisals.map(a => (
                <AppraisalCard key={a.id} appraisal={a} frontPhotoUrl={frontPhotos[a.id]} onOpen={onOpenDetail} onTogglePurchased={handleTogglePurchased}
                  onDelete={id => setAppraisals(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-md lg:max-w-5xl mx-auto w-full">
          <AllAppraisalsScreen onOpenDetail={onOpenDetail} />
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-6 right-0 left-0 flex justify-center pointer-events-none">
        <button onClick={hasDraft ? onNewAppraisal : onNewAppraisal}
          className="pointer-events-auto flex items-center gap-2.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 active:scale-95 text-white font-semibold text-[15px] px-6 py-3.5 rounded-2xl shadow-lg transition-all duration-150">
          <Plus className="w-5 h-5" />
          Новая оценка
        </button>
      </div>
    </div>
  );
}
