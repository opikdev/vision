import type { VisionApi } from '../shared/contract';

declare global {
  interface Window {
    vision: VisionApi;
  }
}
