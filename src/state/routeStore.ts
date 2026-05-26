import { create } from "zustand";

export type RoutePoint = {
  lat: number;
  lng: number;
  ele?: number;
};

type RouteStore = {
  points: RoutePoint[];
  name: string;
  setRoute: (points: RoutePoint[], name?: string) => void;
  clearRoute: () => void;
};

export const useRouteStore = create<RouteStore>((set) => ({
  points: [],
  name: "",
  setRoute: (points, name = "") => set(() => ({ points, name })),
  clearRoute: () => set(() => ({ points: [], name: "" })),
}));
