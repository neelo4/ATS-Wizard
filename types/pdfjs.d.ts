declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc: any }
  export function getDocument(params: any): { promise: Promise<any> }
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const workerSrc: any
  export default workerSrc
}

