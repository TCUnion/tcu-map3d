import { create } from "zustand";

type Sampler = (lat: number, lng: number) => number;

type TerrainStore = {
  sampler: Sampler | null;
  baseElevation: number;
  setSampler: (sampler: Sampler | null, baseElevation: number) => void;
};

export const useTerrainStore = create<TerrainStore>((set) => ({
  sampler: null,
  baseElevation: 0,
  setSampler: (sampler, baseElevation) => set(() => ({ sampler, baseElevation })),
}));
