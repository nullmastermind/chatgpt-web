import { fromUint8Array, toUint8Array } from 'js-base64';
import { deflate, inflate } from 'pako';

const formatJSON = (data: unknown): string => JSON.stringify(data, undefined, 2);

const serialize = (state: string): string => {
  const data = new TextEncoder().encode(state);
  const compressed = deflate(data, { level: 9 });
  return fromUint8Array(compressed, true);
};

export const deserialize = (state: string): string => {
  const data = toUint8Array(state);
  return inflate(data, { to: 'string' });
};

export const getMermaidLiveUrl = (code: string, type: 'view' | 'edit' = 'view'): string => {
  return `https://mermaid.live/${type}#pako:${serialize(
    JSON.stringify({
      code,
      mermaid: formatJSON({
        theme: 'dark',
      }),
      autoSync: true,
      updateDiagram: true,
      panZoom: true,
    }),
  )}`;
};

export const getMermaidImageUrl = (code: string): string => {
  return `https://mermaid.ink/img/pako:${serialize(
    JSON.stringify({
      code,
      mermaid: formatJSON({
        theme: 'dark',
      }),
      autoSync: true,
      updateDiagram: true,
      panZoom: true,
    }),
  )}?bgColor=1a1b1e`;
};
