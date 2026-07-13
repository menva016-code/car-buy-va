import { getAllMarksWithIds, getModelsForMarkId } from './carDatabase';

export interface CarMark {
  id: string;
  name: string;
}

export interface CarModel {
  id: string;
  name: string;
  mark_id: string;
}

// Module-level cache
let marksCache: CarMark[] | null = null;
const modelsCache: Record<string, CarModel[]> = {};

export async function loadMarks(): Promise<CarMark[]> {
  if (marksCache) return marksCache;
  marksCache = getAllMarksWithIds();
  return marksCache;
}

export async function loadModels(markId: string): Promise<CarModel[]> {
  if (modelsCache[markId]) return modelsCache[markId];
  const models: CarModel[] = getModelsForMarkId(markId).map(name => ({
    id: `${markId}_${name.toUpperCase().replace(/\s+/g, '_')}`,
    name,
    mark_id: markId,
  }));
  modelsCache[markId] = models;
  return models;
}

export function filterMarks(marks: CarMark[], query: string): CarMark[] {
  if (!query.trim()) return marks.slice(0, 15);
  const q = query.toLowerCase();
  const starts: CarMark[] = [], contains: CarMark[] = [];
  for (const m of marks) {
    const n = m.name.toLowerCase();
    if (n.startsWith(q)) starts.push(m);
    else if (n.includes(q)) contains.push(m);
  }
  return [...starts, ...contains].slice(0, 12);
}

export function filterModels(models: CarModel[], query: string): CarModel[] {
  if (!query.trim()) return models.slice(0, 20);
  const q = query.toLowerCase();
  const starts: CarModel[] = [], contains: CarModel[] = [];
  for (const m of models) {
    const n = m.name.toLowerCase();
    if (n.startsWith(q)) starts.push(m);
    else if (n.includes(q)) contains.push(m);
  }
  return [...starts, ...contains].slice(0, 15);
}
