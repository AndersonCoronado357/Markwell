# Markwell — Hoja de ruta de desarrollo

Documento **vivo** que guía cómo construimos la app, por fases e hitos. Desarrollamos **de a pocos**: un hito a la vez, cada uno se **verifica** (correr la app / prueba automatizada) antes de pasar al siguiente, y este archivo se actualiza al cerrarlo.

> La visión de producto y el diseño UI/UX están en `PLAN.md` (la idea original). Este `ROADMAP.md` es el **plan de ejecución** y el rastreador de progreso.

---

## Estado actual

| Fase | Hito | Estado |
|------|------|--------|
| 1 | **M0** — Andamiaje + demo instalable | ✅ Hecho y verificado |
| 1 | **M1** — Capa de datos (SQLite + FTS + IPC) | ✅ Hecho y verificado |
| 1 | **M2** — Barra lateral + lista de notas | Hecho |
| 1 | **M3** — Editor por bloques + autoguardado | Hecho |
| 1 | **M4** — Búsqueda full-text | Hecho |
| 1 | **M5** — Etiquetas + favoritos + papelera | Hecho |
| 1 | M6 — Tema completo + paleta de comandos + respaldo | Pendiente |
| 2 | Formas extra | ⏳ Pendiente |
| 3 | IA (nube) | ⏳ Pendiente |

---

## Stack confirmado (con ajustes del entorno)

- **Escritorio**: Electron **41.7.1** · empaquetado con **electron-vite** (dev + build) + **electron-builder** (instalador **NSIS**).
- **UI**: React 19 + TypeScript 6 · **Vite 7** · **Tailwind CSS v4** (tus tokens pastel/neutros) · **Zustand** (estado) · **Radix UI** (primitivos accesibles).
- **Editor**: **TipTap v3** (a partir de M3).
- **Datos**: **better-sqlite3 12** (proceso main) · **FTS5** (búsqueda) · **sqlite-vec** (vectores, Fase 3) · archivo único en `userData`.
- **Seguridad**: `contextIsolation` + `sandbox` + sin `nodeIntegration`; clave de IA con `safeStorage` (Fase 3).

**Notas del entorno (esta máquina):**
- Sin compilador C++/Python → usamos **binarios precompilados**. Por eso Electron está fijado a **41** (ABI 145, con prebuild de better-sqlite3); subiremos a 42+ cuando haya prebuild o Build Tools.
- `extract-zip` está roto aquí → se eligió electron-vite + electron-builder (no Electron Forge).
- Instalador **sin firmar** → SmartScreen avisa la 1ª vez ("Más información → Ejecutar de todas formas").

---

## Fase 1 — Núcleo (reemplazo completo del block)

- [x] **M0 — Andamiaje + demo** · *Hecho.* App arranca, abre ventana, **instalador NSIS** (`dist-installer/Markwell-Setup-*.exe`). Arquitectura main/preload/renderer + IPC tipado.
- [x] **M1 — Capa de datos** · *Hecho.* Conexión (WAL + sqlite-vec), migraciones (`user_version`), esquema `001_init` (notas/carpetas/etiquetas/ajustes + FTS5 + triggers), repos notas/carpetas (CRUD, papelera, favoritos), handlers IPC + validación zod. **Búsqueda en español con acentos** verificada.
- [x] **M2 — Barra lateral + lista de notas** · Rediseño completo con Plus Jakarta Sans, layout fluido 3 columnas, iconos lucide, menús contextuales (Radix) en carpetas y notas. Lista de etiquetas en sidebar.
- [x] **M3 — Editor por bloques + autoguardado** · TipTap v3: párrafos, títulos H1–H3, listas, listas numeradas, checklists, citas, código (inline + bloque), separadores, enlaces. Barra de bloques bajo el título + barra flotante (BubbleMenu) para marcas en línea. Título editable. Autoguardado con debounce 800ms + indicador "Guardando…/Guardado · HH:mm". Flush al cambiar de nota y al cerrar.
- [x] **M4 — Búsqueda full-text** · `SearchService` con `bm25()` + `snippet()` sobre la tabla FTS5 (saneamiento contra inyección, plegado de acentos para español). Buscador en la barra lateral con atajo Ctrl/Cmd+K, panel de resultados con resaltado del término.
- [x] **M5 — Etiquetas, papelera, favoritos** · CRUD completo de etiquetas (crear/renombrar/eliminar) con colores pastel. Filtrar notas por etiqueta. Papelera: restaurar + eliminar para siempre. Favoritos ya integrados desde M2.
- [x] **Ajustes** · Modal Radix Dialog con selector de tema claro/oscuro persistido en `settings` (SQLite), selector de color de acento. El tema se carga al iniciar.
- [ ] **M6 — Tema completo + paleta de comandos + respaldo** · Tema "sistema" automático, paleta de comandos Ctrl+K (más amplia), atajos globales, respaldo diario `VACUUM INTO`.
- [ ] **M6 — Tema + paleta de comandos + atajos + respaldo** · claro/oscuro/sistema; **Ctrl+K**; tabla de atajos; respaldo diario `VACUUM INTO` + retención. *Verificación: tema persiste, comandos corren, copia generada.*
- [ ] **Pulido** · estados vacíos, foco/ARIA, rendimiento en docs grandes, toasts de error, reabrir última sesión.

## Fase 2 — Formas extra (aditivo, sin rearquitectura)

- [ ] **Plantillas** (diario, reunión, idea, lista) · migración `002` + repo + canales + comando "Nueva desde plantilla".
- [ ] **Mural de tarjetas** · `notes.type='wall'`; layout dentro del JSON.
- [ ] **Lienzo libre** · `notes.type='canvas'`; librería a decidir (**tldraw** vs **React Flow**).
- [ ] **Exportar** a PDF / HTML / Markdown (`webContents.printToPDF` + serializadores TipTap).
- [ ] **Actualizaciones automáticas** · `electron-updater` + **GitHub Releases** (descargas delta vía `.blockmap`).

## Fase 3 — IA en la nube (aditivo; no toca la frontera de confianza)

- [ ] **Clave de API cifrada** (`safeStorage`) configurable en ajustes; nunca expuesta al renderer.
- [ ] **Migración `003`** (note_chunks + tabla `vec0`) · trocear + generar embeddings al guardar (fuera de la ruta crítica).
- [ ] **Chat con notas** · recuperación híbrida (FTS ∪ kNN vectorial) + respuesta con contexto, streaming.
- [ ] **Resumen / auto-etiquetado / asistente de escritura** (mejorar, continuar, acortar).
- [ ] **Proveedor intercambiable** (OpenAI / Voyage para Anthropic / local con transformers.js).

---

## Cómo trabajamos

1. **Un hito a la vez**, en incrementos pequeños y verificables.
2. Cada hito termina con una **verificación real** (correr la app y/o prueba headless) antes de avanzar.
3. Al cerrar un hito, **se marca aquí** y se anota lo relevante.
4. Commits/repo: se inicializa al empezar a iterar la Fase 1 (pendiente de tu OK sobre local vs remoto).

## Decisiones abiertas

- **Repositorio**: inicializar git (¿solo local o remoto en GitHub, público/privado?).
- **Electron 42**: subir cuando better-sqlite3 publique prebuild para ABI 146 (o instalemos Build Tools).
- **Fase 2**: librería del lienzo libre (tldraw vs React Flow).
- **Fase 3**: modelo de chat por defecto y dimensión de embeddings.
- **Firma de código**: certificado para evitar el aviso de SmartScreen (opcional, a futuro).
