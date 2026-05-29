// Importación de archivos .sql como texto crudo (Vite `?raw`).
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
