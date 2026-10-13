// Motor de voz que corre dentro del teléfono: texto -> fonemas (espeak-ng) -> audio (Piper/VITS con onnxruntime).
// Recibe {tipo:'iniciar', modelo, voz} una vez y luego {tipo:'sintetizar', id, texto, ritmo}.
importScripts('ort/ort.wasm-core.min.js', 'phon/piper_phonemize.js');

let sesion = null;
let fonemizador = null;
let usosFonemizador = 0;
let recursosFonemas = null;
let salidaFonemas = null;
let voz = null;

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = new URL('ort/', self.location.href).href;

// El paquete de datos va con extensión .wasm porque el artifact solo sirve tipos web conocidos.
const rutaFonemas = (archivo) => new URL('phon/' + (archivo.endsWith('.data') ? 'datos-espeak.wasm' : archivo), self.location.href).href;

// espeak compilado a WebAssembly se daña después de unas 70 llamadas seguidas a main(),
// así que el fonemizador se crea de nuevo cada MAX_USOS frases (crearlo toma unos milisegundos).
const MAX_USOS = 40;
async function nuevoFonemizador() {
  if (!recursosFonemas) {
    const [wasm, datos] = await Promise.all([
      fetch(rutaFonemas('piper_phonemize.wasm')).then((r) => r.arrayBuffer()),
      fetch(rutaFonemas('piper_phonemize.data')).then((r) => r.arrayBuffer()),
    ]);
    recursosFonemas = { wasm, datos };
  }
  fonemizador = await createPiperPhonemize({
    print: (linea) => { salidaFonemas = linea; },
    printErr: () => {},
    wasmBinary: recursosFonemas.wasm,
    getPreloadedPackage: () => recursosFonemas.datos.slice(0),
    locateFile: rutaFonemas,
  });
  usosFonemizador = 0;
}

async function iniciar(modelo, datosVoz) {
  voz = datosVoz;
  await nuevoFonemizador();
  sesion = await ort.InferenceSession.create(new Uint8Array(modelo), {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
}

// espeak puede devolver varias oraciones unidas (… 2, 1 …); el modelo rinde mejor una por una.
function separarOraciones(ids) {
  const grupos = [];
  let actual = [];
  for (let i = 0; i < ids.length; i++) {
    actual.push(ids[i]);
    if (ids[i] === 2 && ids[i + 1] === 1) { grupos.push(actual); actual = []; }
  }
  if (actual.length) grupos.push(actual);
  return grupos.filter((g) => g.length > 4);
}

async function fonemizar(texto) {
  for (let intento = 0; intento < 2; intento++) {
    if (!fonemizador || usosFonemizador >= MAX_USOS) await nuevoFonemizador();
    salidaFonemas = null;
    usosFonemizador++;
    try {
      fonemizador.callMain(['-l', voz.espeak, '--input', JSON.stringify([{ text: texto }]), '--espeak_data', '/espeak-ng-data']);
      return salidaFonemas ? separarOraciones(JSON.parse(salidaFonemas).phoneme_ids) : [];
    } catch (err) {
      fonemizador = null;
      if (intento === 1) throw err;
    }
  }
  return [];
}

async function sintetizar(texto, ritmo) {
  const grupos = await fonemizar(texto);
  const pausa = new Float32Array(Math.round(voz.frecuencia * 0.12));
  const trozos = [];
  for (const ids of grupos) {
    const entrada = new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
    const largo = new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]);
    const escalas = new ort.Tensor('float32', Float32Array.from([voz.inferencia.noise_scale, ritmo || voz.inferencia.length_scale, voz.inferencia.noise_w]), [3]);
    const r = await sesion.run({ input: entrada, input_lengths: largo, scales: escalas });
    trozos.push(r.output.data, pausa);
    entrada.dispose?.(); largo.dispose?.(); escalas.dispose?.(); r.output.dispose?.();
  }
  let total = 0;
  for (const t of trozos) total += t.length;
  const pcm = new Float32Array(total);
  let pos = 0;
  for (const t of trozos) { pcm.set(t, pos); pos += t.length; }
  return pcm;
}

// Un trabajo a la vez: la sesión de onnxruntime y espeak no admiten llamadas simultáneas.
let cola = Promise.resolve();
self.onmessage = (e) => { cola = cola.then(() => atender(e.data)); };

async function atender(m) {
  try {
    if (m.tipo === 'iniciar') {
      const t0 = performance.now();
      await iniciar(m.modelo, m.voz);
      self.postMessage({ tipo: 'listo', ms: Math.round(performance.now() - t0) });
    } else if (m.tipo === 'sintetizar') {
      const t0 = performance.now();
      const pcm = await sintetizar(m.texto, m.ritmo);
      self.postMessage({ tipo: 'audio', id: m.id, pcm, ms: Math.round(performance.now() - t0) }, [pcm.buffer]);
    }
  } catch (err) {
    self.postMessage({ tipo: 'error', id: m.id, mensaje: String((err && err.message) || err) });
  }
}
