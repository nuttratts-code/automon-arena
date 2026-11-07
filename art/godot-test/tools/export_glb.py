# Runs runeplaza_scene.py without rendering, then exports the scene as .glb + board/camera json for Godot.
import os, sys, json, math
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
out = os.path.abspath(sys.argv[-1])
os.environ.setdefault('FAST', '1'); os.environ['NORENDER'] = '1'
sys.argv = [sys.argv[0], out[:-4] + '.png']
g = {'__name__': '__main__', '__file__': os.path.join(here, 'runeplaza_scene.py')}
exec(open(g['__file__']).read(), g)
import bpy
sc = g['sc']; cam = g['cam']
mats = sorted({m.name for o in bpy.data.objects if o.type == 'MESH' for m in o.data.materials if m})
print('materials', mats, 'objects', len(bpy.data.objects))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_cameras=False,
                          export_lights=False, export_vertex_color='ACTIVE', export_all_vertex_colors=True)
def gd(p): return [round(p[0], 4), round(p[2], 4), round(-p[1], 4)]   # blender z-up -> godot y-up
cells = []
for side, sx in (('P', -1), ('E', 1)):
    for li, ly in enumerate(g['LANES']):
        for ci, cx in enumerate(g['COLS']):
            x = sx * cx; z = float(g['height'](x, ly)) + .09
            cells.append({'side': side, 'lane': li, 'col': ci, 'pos': gd((x, ly, z))})
d = cam.data
json.dump({'cells': cells, 'cam': {'pos': gd(cam.location), 'pitch_deg': 90 - math.degrees(cam.rotation_euler.x),
           'lens': d.lens, 'sensor': d.sensor_width, 'shift_y': d.shift_y},
           'sun_rot_deg': [math.degrees(a) for a in bpy.data.objects['Sun'].rotation_euler] if 'Sun' in bpy.data.objects else None},
          open(out[:-4] + '_board.json', 'w'), indent=1)
print('EXPORTED', out)
