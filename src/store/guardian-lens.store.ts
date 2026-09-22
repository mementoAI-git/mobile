import { create } from 'zustand';
import type { IBeneficiary } from '@/types';

interface GuardianLensState {
  simulatedBeneficiary: IBeneficiary | null;
  setSimulation: (beneficiary: IBeneficiary | null) => void;
  clearSimulation: () => void;
}

export const useGuardianLensStore = create<GuardianLensState>((set) => ({
  simulatedBeneficiary: null,
  setSimulation: (beneficiary) => set({ simulatedBeneficiary: beneficiary }),
  clearSimulation: () => set({ simulatedBeneficiary: null }),
}));
