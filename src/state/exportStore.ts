import { create } from "zustand";

export type ExportCategory = "route" | "buildings" | "terrain";

type ActionStore = {
  action: boolean;
  fleetSpaceId: string;
  exportType: "glb" | "fleet";
  selected: Record<ExportCategory, boolean>;

  setAction: (action: boolean) => void;
  setFleet: (fleetSpaceId: string, exportType: "glb" | "fleet") => void;
  toggleCategory: (cat: ExportCategory) => void;
};

export const useActionStore = create<ActionStore>((set) => ({
  action: false,
  fleetSpaceId: "",
  exportType: "glb",
  selected: { route: true, buildings: true, terrain: true },
  setAction: (action) => set(() => ({ action: action })),
  setFleet: (fleetSpaceId, exportType) =>
    set(() => ({ fleetSpaceId: fleetSpaceId, exportType: exportType })),
  toggleCategory: (cat) =>
    set((s) => ({ selected: { ...s.selected, [cat]: !s.selected[cat] } })),
}));
