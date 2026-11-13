# Read a .glb header without loading it (skill asset-3d step 3). Plain Python, no Blender:
#   python -I art/blender/glb_info.py <file.glb>
# Prints generator, meshes, triangles, bounds (glTF is Y-up: height = Y), textures, extensions.
import sys, struct, json

p = sys.argv[1]
with open(p, 'rb') as f:
    magic, ver, length = struct.unpack('<4sII', f.read(12))
    if magic != b'glTF':
        sys.exit("not a glb file")
    clen, ctype = struct.unpack('<II', f.read(8))
    j = json.loads(f.read(clen))
print("size MB", round(length / 1e6, 1), "· generator", j.get('asset', {}).get('generator'))
acc = j.get('accessors', [])
tris = 0
for m in j.get('meshes', []):
    for pr in m['primitives']:
        pa = acc[pr['attributes']['POSITION']]
        n = acc[pr['indices']]['count'] // 3 if 'indices' in pr else pa['count'] // 3
        tris += n
        print("mesh", m.get('name'), "tris", n, "min", [round(v, 3) for v in pa.get('min', [])],
              "max", [round(v, 3) for v in pa.get('max', [])], "attrs", list(pr['attributes']))
print("TOTAL tris", tris, "· nodes", len(j.get('nodes', [])), "· anims", len(j.get('animations', [])),
      "· skins", len(j.get('skins', [])))
print("materials", [m.get('name') for m in j.get('materials', [])])
print("images", [(i.get('name'), i.get('mimeType')) for i in j.get('images', [])])
print("extensions", j.get('extensionsUsed'))
