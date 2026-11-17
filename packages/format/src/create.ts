import type { VisionDocument } from './schema';

export function createDocument(): VisionDocument {
  return {
    format: 'vision',
    version: 1,
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        artboards: [
          {
            id: 'desktop',
            name: 'Desktop',
            x: 0,
            y: 0,
            width: 1440,
            height: 900,
            class: 'bg-white',
            children: [],
          },
        ],
      },
    ],
  };
}
