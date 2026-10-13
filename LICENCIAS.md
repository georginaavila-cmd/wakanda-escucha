# Componentes de terceros

| Componente | Uso | Licencia | Fuente |
|---|---|---|---|
| onnxruntime-web 1.18.0 | Corre el modelo de voz (`ort/`) | MIT | https://github.com/microsoft/onnxruntime |
| piper-phonemize + espeak-ng (compilados a WebAssembly) | Convierte texto en fonemas (`phon/`) | GPL-3.0 | https://github.com/rhasspy/piper-phonemize · https://github.com/espeak-ng/espeak-ng · compilación: https://www.npmjs.com/package/@diffusionstudio/piper-wasm |
| Voz «Claude» es_MX (Piper) | Modelo de voz (`voces/es_MX-claude-high/`) | Apache-2.0 | https://huggingface.co/spaces/HirCoir/Piper-TTS-Spanish |
| Voz «Ald» es_MX (Piper) | Modelo de voz (`voces/es_MX-ald-medium/`) | Unlicense (datos) | https://huggingface.co/datasets/rmcpantoja/Ald_Mexican_Spanish_speech_dataset |
| pdf.js 3.11.174 | Lee PDF (`lib/pdfjs-dist@3.11.174/`) | Apache-2.0 | https://github.com/mozilla/pdf.js |
| mammoth 1.6.0 | Lee Word .docx (`lib/mammoth@1.6.0/`) | BSD-2-Clause | https://github.com/mwilliamson/mammoth.js |
| JSZip 3.10.1 | Abre los .zip de Notion (`lib/jszip@3.10.1/`) | MIT o GPL-3.0 | https://github.com/Stuk/jszip |
| Lato y Jost | Tipografías (`fuentes/`) | SIL Open Font License 1.1 | Google Fonts |

Los modelos de voz se tomaron de los paquetes `vits-piper-*` de https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models y se partieron en trozos de 13 MB (`modelo.parteN.wasm`; la extensión es solo para el servidor, son bytes del modelo ONNX).

El paquete de datos de espeak-ng (`phon/datos-espeak.wasm`) es el original de piper-wasm con solo el diccionario de español; el resto de diccionarios se quitó con `recortar-espeak.py`, incluido en `herramientas/`.
