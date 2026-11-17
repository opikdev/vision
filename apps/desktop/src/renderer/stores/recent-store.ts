import { create } from 'zustand';
import type { RecentFile } from '../../shared/contract';

export const useRecentStore = create<{ files: RecentFile[] }>()(() => ({ files: [] }));
