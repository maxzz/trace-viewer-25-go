import { atom } from 'jotai';

export const dialogEditHighlightsOpenAtom = atom(false);
export const dialogEditFiltersOpenAtom = atom(false);
export const dialogBlockLoadFiltersOpenAtom = atom(false);
export const dialogOptionsOpenAtom = atom(false);
export const dialogAboutOpenAtom = atom(false);

export const dialogFileHeaderOpenAtom = atom<string | null>(null);

export const dialogTimelineCancelOpenAtom = atom(false);
export const isZipProcessingAtom = atom(false);
