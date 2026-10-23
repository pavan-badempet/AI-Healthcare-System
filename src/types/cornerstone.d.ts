declare module 'cornerstone-core' {
  export interface CornerstoneVOI {
    windowWidth: number;
    windowCenter: number;
  }

  export interface CornerstoneTranslation {
    x: number;
    y: number;
  }

  export interface CornerstoneViewport {
    scale: number;
    translation: CornerstoneTranslation;
    voi: CornerstoneVOI;
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
  }

  export interface CornerstoneImage {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    getPixelData: () => Uint8Array | Uint16Array | Int16Array;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
    invert: boolean;
    sizeInBytes: number;
  }

  export function enable(element: HTMLElement, options?: Record<string, any>): void;
  export function disable(element: HTMLElement): void;
  export function registerImageLoader(
    scheme: string,
    imageLoader: (imageId: string) => { promise: Promise<CornerstoneImage>; cancelFn?: () => void }
  ): void;
  export function loadImage(imageId: string): Promise<CornerstoneImage>;
  export function loadAndCacheImage(imageId: string): Promise<CornerstoneImage>;
  export function displayImage(
    element: HTMLElement,
    image: CornerstoneImage,
    viewport?: Partial<CornerstoneViewport>
  ): void;
  export function getDefaultViewportForImage(
    element: HTMLElement,
    image: CornerstoneImage
  ): CornerstoneViewport;
  export function getViewport(element: HTMLElement): CornerstoneViewport | undefined;
  export function setViewport(element: HTMLElement, viewport: Partial<CornerstoneViewport>): void;
  export function reset(element: HTMLElement): void;
  export function resize(element: HTMLElement, forceFitToWindow?: boolean): void;
}

declare module 'dicom-parser' {
  export interface DataSet {
    elements: Record<string, { dataOffset: number; length: number }>;
    string: (tag: string) => string | undefined;
    uint16: (tag: string) => number | undefined;
    int16: (tag: string) => number | undefined;
    floatString: (tag: string) => number | undefined;
    byteArray: Uint8Array;
  }

  export function parseDicom(byteArray: Uint8Array, options?: Record<string, any>): DataSet;
}
