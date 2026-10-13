"""Deja en el paquete de datos de espeak-ng solo el diccionario de español.

El paquete original (piper_phonemize.data) trae los diccionarios de ~100 idiomas (18 MB).
Para leer en español basta el diccionario es_dict más los archivos comunes (<1 MB).
Uso: python3 recortar-espeak.py <carpeta-origen> <carpeta-destino>
"""
import json
import re
import shutil
import sys

origen, destino = sys.argv[1:3]
js = open(f'{origen}/piper_phonemize.js', encoding='utf-8').read()
datos = open(f'{origen}/piper_phonemize.data', 'rb').read()
m = re.search(r'loadPackage\((\{"files":.*?\})\)', js)
meta = json.loads(m.group(1))

conservar = [f for f in meta['files'] if not (f['filename'].endswith('_dict') and not f['filename'].endswith('/es_dict'))]
salida, archivos = bytearray(), []
for f in conservar:
    trozo = datos[f['start']:f['end']]
    archivos.append({'filename': f['filename'], 'start': len(salida), 'end': len(salida) + len(trozo)})
    salida += trozo

nuevo = json.dumps({'files': archivos, 'remote_package_size': len(salida)}, separators=(',', ':'))
js = js[:m.start(1)] + nuevo + js[m.end(1):]
assert str(meta['remote_package_size']) not in js, 'quedó una referencia al tamaño original'

open(f'{destino}/piper_phonemize.js', 'w', encoding='utf-8').write(js)
# Se guarda como .wasm porque el artifact solo sirve tipos web conocidos (el worker lo pide con ese nombre).
open(f'{destino}/datos-espeak.wasm', 'wb').write(salida)
shutil.copy(f'{origen}/piper_phonemize.wasm', f'{destino}/piper_phonemize.wasm')
print(f'espeak-ng: {len(conservar)} archivos, {len(salida):,} bytes')
