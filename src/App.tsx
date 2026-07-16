import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useTelegram } from './hooks/useTelegram';
import { HomeScreen } from './screens/HomeScreen';
import { AppraisalForm } from './screens/AppraisalForm';
import { VehicleForm } from './screens/VehicleForm';
import { PhotosForm } from './screens/PhotosForm';
import { InteriorPhotosForm } from './screens/InteriorPhotosForm';
import { AppraisalDetail } from './screens/AppraisalDetail';
import type { AppraisalFormData, VehicleFormData } from './types';

type Screen = 'home' | 'owner-info' | 'vehicle-info' | 'photos' | 'interior-photos' | 'detail';

const DRAFT_KEY = 'appraisal_draft';

interface Draft {
  ownerData: AppraisalFormData;
  vehicleData: VehicleFormData | null;
  step: 'owner-info' | 'vehicle-info' | 'photos' | 'interior-photos';
}

function saveDraft(ownerData: AppraisalFormData, vehicleData: VehicleFormData | null, step: Draft['step']) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ownerData, vehicleData, step })); } catch { /* ignore */ }
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

function AppInner() {
  const [screen, setScreen] = useState<Screen>('home');
  const [ownerData, setOwnerData] = useState<AppraisalFormData | null>(null);
  const [vehicleData, setVehicleData] = useState<VehicleFormData | null>(null);
  const [appraisalId, setAppraisalId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasDraft, setHasDraft] = useState(() => !!loadDraft());
  const { tg } = useTelegram();

  function haptic() {
    tg?.HapticFeedback?.impactOccurred('light');
  }

  function handleNewAppraisal() {
    haptic();
    const draft = loadDraft();
    if (draft) {
      setOwnerData(draft.ownerData);
      setVehicleData(draft.vehicleData);
      setScreen(draft.step);
    } else {
      setOwnerData(null);
      setVehicleData(null);
      setAppraisalId(null);
      setScreen('owner-info');
    }
  }

  function handleOwnerNext(data: AppraisalFormData) {
    haptic();
    setOwnerData(data);
    saveDraft(data, vehicleData, 'vehicle-info');
    setHasDraft(true);
    setScreen('vehicle-info');
  }

  function handleVehicleNext(data: VehicleFormData) {
    haptic();
    setVehicleData(data);
    saveDraft(ownerData!, data, 'photos');
    setHasDraft(true);
    setScreen('photos');
  }

  function handlePhotosNext(id: string) {
    haptic();
    setAppraisalId(id);
    saveDraft(ownerData!, vehicleData, 'interior-photos');
    setHasDraft(true);
    setScreen('interior-photos');
  }

  function handleOpenDetail(id: string) {
    haptic();
    setSelectedId(id);
    setScreen('detail');
  }

  function handleBackToHome() {
    haptic();
    // Keep draft — don't clear on back
    setOwnerData(null);
    setVehicleData(null);
    setScreen('home');
  }

  function handleBackToOwner() {
    haptic();
    setScreen('owner-info');
  }

  function handleBackToVehicle() {
    haptic();
    setScreen('vehicle-info');
  }

  function handleBackToPhotos() {
    haptic();
    setScreen('photos');
  }

  function handleSuccess() {
    tg?.HapticFeedback?.notificationOccurred('success');
    clearDraft();
    setHasDraft(false);
    setOwnerData(null);
    setVehicleData(null);
    setAppraisalId(null);
    setRefreshKey((k) => k + 1);
    setScreen('home');
  }

  if (screen === 'owner-info') {
    return (
      <AppraisalForm
        onBack={handleBackToHome}
        onNext={handleOwnerNext}
        initial={ownerData ?? undefined}
      />
    );
  }

  if (screen === 'vehicle-info' && ownerData) {
    return (
      <VehicleForm
        onBack={handleBackToOwner}
        onNext={handleVehicleNext}
        ownerData={ownerData}
        initial={vehicleData ?? undefined}
      />
    );
  }

  if (screen === 'photos' && ownerData && vehicleData) {
    return (
      <PhotosForm
        ownerData={ownerData}
        vehicleData={vehicleData}
        onBack={handleBackToVehicle}
        onNext={handlePhotosNext}
        onSuccess={handleSuccess}
      />
    );
  }

  if (screen === 'interior-photos' && ownerData && vehicleData) {
    return (
      <InteriorPhotosForm
        ownerData={ownerData}
        vehicleData={vehicleData}
        appraisalId={appraisalId}
        onBack={handleBackToPhotos}
        onSuccess={handleSuccess}
      />
    );
  }

  if (screen === 'detail' && selectedId) {
    return (
      <AppraisalDetail
        appraisalId={selectedId}
        onBack={() => { haptic(); setScreen('home'); }}
        onDelete={() => { haptic(); setRefreshKey(k => k + 1); setScreen('home'); }}
      />
    );
  }

  return (
    <HomeScreen
      onNewAppraisal={handleNewAppraisal}
      onOpenDetail={handleOpenDetail}
      refreshKey={refreshKey}
      hasDraft={hasDraft}
      onDiscardDraft={() => { clearDraft(); setHasDraft(false); setOwnerData(null); setVehicleData(null); setScreen('owner-info'); }}
    />
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
