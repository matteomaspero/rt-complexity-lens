import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Structure } from '@/lib/dicom/types';
import { pickDefaultTargetIndex } from '@/lib/dicom/conformality';

interface StructureContextType {
  structures: Structure[] | null;
  fileName: string | null;
  selectedIndex: number | null;
  selectedStructure: Structure | undefined;
  setStructures: (
    structures: Structure[],
    fileName: string,
    isocenter?: [number, number, number] | null
  ) => void;
  setSelectedIndex: (index: number | null) => void;
  clearStructures: () => void;
}

const StructureContext = createContext<StructureContextType | undefined>(undefined);

export function StructureProvider({ children }: { children: React.ReactNode }) {
  const [structures, setStructuresState] = useState<Structure[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const setStructures = useCallback(
    (next: Structure[], name: string, isocenter?: [number, number, number] | null) => {
      setStructuresState(next);
      setFileName(name);
      setSelectedIndex(next.length > 0 ? pickDefaultTargetIndex(next, isocenter) : null);
    },
    []
  );


  const clearStructures = useCallback(() => {
    setStructuresState(null);
    setFileName(null);
    setSelectedIndex(null);
  }, []);

  const selectedStructure =
    structures && selectedIndex !== null ? structures[selectedIndex] : undefined;

  const value = useMemo(
    () => ({
      structures,
      fileName,
      selectedIndex,
      selectedStructure,
      setStructures,
      setSelectedIndex,
      clearStructures,
    }),
    [structures, fileName, selectedIndex, selectedStructure, setStructures, clearStructures]
  );

  return <StructureContext.Provider value={value}>{children}</StructureContext.Provider>;
}

export function useStructures() {
  const context = useContext(StructureContext);
  if (!context) {
    throw new Error('useStructures must be used within a StructureProvider');
  }
  return context;
}
