import bpy, bmesh, math, random, sys, os
from PIL import Image, ImageDraw
OUT = sys.argv[-1]
D = os.path.dirname(OUT)
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------- pixel textures (PIL) ----------
def stone_tex(path, n=96, tile=12, base=(196,150,96)):
    im = Image.new('RGB', (n, n)); d = ImageDraw.Draw(im)
    for ty in range(0, n, tile):
        off = (tile//2) if (ty//tile) % 2 else 0
        for tx in range(-tile, n, tile):
            k = random.randint(-18, 14)
            c = tuple(max(0, min(255, v+k)) for v in base)
            d.rectangle((tx+off, ty, tx+off+tile-1, ty+tile-1), fill=c)
            d.line((tx+off, ty, tx+off+tile-1, ty), fill=tuple(min(255,v+22) for v in c))
            d.line((tx+off+tile-1, ty, tx+off+tile-1, ty+tile-1), fill=tuple(int(v*.62) for v in base))
            d.line((tx+off, ty+tile-1, tx+off+tile-1, ty+tile-1), fill=tuple(int(v*.62) for v in base))
            for _ in range(2):
                x, y = tx+off+random.randint(1, tile-3), ty+random.randint(1, tile-3)
                d.point((x, y), fill=tuple(int(v*.8) for v in c))
    im.save(path); return path

def brick_tex(path, n=64, base=(176,128,84)):
    im = Image.new('RGB', (n, n)); d = ImageDraw.Draw(im)
    bh, bw = 4, 8
    for y in range(0, n, bh):
        off = bw//2 if (y//bh) % 2 else 0
        for x in range(-bw, n, bw):
            k = random.randint(-16, 12)
            c = tuple(max(0, min(255, v+k)) for v in base)
            d.rectangle((x+off, y, x+off+bw-1, y+bh-1), fill=c)
            d.line((x+off, y+bh-1, x+off+bw-1, y+bh-1), fill=tuple(int(v*.6) for v in base))
            d.line((x+off+bw-1, y, x+off+bw-1, y+bh-1), fill=tuple(int(v*.7) for v in base))
    im.save(path); return path

def mat_img(name, path, scale):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(path)
    it.interpolation = 'Closest'; it.projection = 'BOX'; it.projection_blend = 0.0
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], it.inputs['Vector'])
    nt.links.new(it.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.9
    return m

def mat_emit(name, col, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    return m

M_FLOOR = mat_img('floor', stone_tex(os.path.join(D, 'tx_floor.png'), base=(222,176,116)), 0.14)
M_WALL = mat_img('wall', brick_tex(os.path.join(D, 'tx_wall.png'), base=(206,156,104)), 0.35)
M_GLOW = mat_emit('glow', (0.15, 0.95, 1.0), 4)
M_HOLO = mat_emit('holo', (0.2, 0.8, 1.0), 2.5)

def add(obj, mat):
    obj.data.materials.append(mat); return obj

def ring_obj(name, r_in, r_out, z0, z1, mat, seg=128):
    bm = bmesh.new(); loops = []
    for (r, z) in ((r_in, z0), (r_in, z1), (r_out, z1), (r_out, z0)):
        loops.append([bm.verts.new((r*math.cos(2*math.pi*k/seg), r*math.sin(2*math.pi*k/seg), z)) for k in range(seg)])
    for i in range(4):
        A, B = loops[i], loops[(i+1) % 4]
        for k in range(seg):
            bm.faces.new((A[k], A[(k+1) % seg], B[(k+1) % seg], B[k]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return add(o, mat)

def box(cx, cy, cz, sx, sy, sz, rotz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
    o = bpy.context.object; o.scale = (sx, sy, sz); o.rotation_euler.z = rotz; return add(o, mat)

# ---------- geometry ----------
R = 20.0
bpy.ops.mesh.primitive_plane_add(size=120, location=(0, 0, 0)); add(bpy.context.object, M_FLOOR)
ring_obj('podium', R, R+1.2, 0, 3.2, M_WALL)
ring_obj('podium_glow', R-0.03, R+0.03, 2.65, 2.72, M_GLOW)
# stands: stepped tiers
TIERS = 9
for i in range(TIERS):
    r0 = R+1.2+i*1.4; z = 3.2+i*1.05
    ring_obj(f'tier{i}', r0, r0+1.4, 0, z+0.5, M_WALL, seg=96)
# crowd: one mesh of tiny boxes with colour attribute
bm = bmesh.new(); cl = bm.loops.layers.color.new('col')
pal = [(.55,.2,.18),(.2,.25,.5),(.7,.6,.4),(.35,.4,.3),(.8,.75,.6),(.45,.3,.5),(.25,.2,.18)]
for i in range(1, TIERS):
    r = R+1.2+i*1.4+0.7; z = 3.2+i*1.05+0.5
    n = int(2*math.pi*r/0.55)
    for k in range(n):
        if random.random() < 0.18: continue
        a = 2*math.pi*k/n + random.uniform(-.01, .01)
        h = random.uniform(.45, .7)
        res = bmesh.ops.create_cube(bm, size=1)
        col = (*random.choice(pal), 1)
        for v in res['verts']:
            v.co.x *= .32; v.co.y *= .32; v.co.z = (v.co.z+.5)*h
            x, y = v.co.x, v.co.y
            v.co.x = x+r*math.cos(a); v.co.y = y+r*math.sin(a); v.co.z += z
        for f in {f for v in res['verts'] for f in v.link_faces}:
            for l in f.loops: l[cl] = col
me = bpy.data.meshes.new('crowd'); bm.to_mesh(me); bm.free()
crowd = bpy.data.objects.new('crowd', me); bpy.context.collection.objects.link(crowd)
mc = bpy.data.materials.new('crowd'); mc.use_nodes = True
at = mc.node_tree.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'col'
mc.node_tree.links.new(at.outputs['Color'], mc.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
crowd.data.materials.append(mc)
# outer arcade: pillars + arches + bands
RO = R+1.2+TIERS*1.4; ZB = 3.2+TIERS*1.05
ring_obj('arcade_base', RO, RO+1.5, 0, ZB+0.6, M_WALL)
for lvl, (z0, hgt) in enumerate(((ZB+0.6, 5.5), (ZB+6.9, 4.6))):
    n = 40; rr = RO+.75; bay = 2*math.pi*rr/n; ow = bay*0.62; ro = ow/2; sh = hgt-ro-0.9
    for k in range(n):
        a = 2*math.pi*k/n; t = a+math.pi/2
        def at(u, z, sx, sz):
            ang = a+u/rr
            box(rr*math.cos(ang), rr*math.sin(ang), z, sx, 1.3, sz, ang+math.pi/2, M_WALL)
        pw = (bay-ow)/2
        at(-bay/2+pw/2, z0+hgt/2, pw+0.02, hgt)   # pillar
        at(bay/2-pw/2, z0+hgt/2, pw+0.02, hgt)
        S = 10
        for j in range(S):
            u0 = -ro+ow*j/S; u1 = u0+ow/S; uc = (u0+u1)/2
            top = z0+sh+math.sqrt(max(0, ro*ro-uc*uc)); zt = z0+hgt
            at(uc, (top+zt)/2, ow/S+0.02, zt-top)
    ring_obj(f'band{lvl}', RO, RO+1.5, z0+hgt, z0+hgt+0.7, M_WALL)
    ring_obj(f'bandglow{lvl}', RO-0.06, RO+0.02, z0+hgt+0.2, z0+hgt+0.35, M_GLOW)
# light towers + holo banners on the podium
for k in range(14):
    a = 2*math.pi*k/14 + 0.1
    x, y = (R+0.6)*math.cos(a), (R+0.6)*math.sin(a)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 5)); t = bpy.context.object; t.scale = (.35, .35, 4.0); add(t, M_WALL)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, 7.1)); add(bpy.context.object, M_GLOW).scale = (.5, .5, .25)
    if k % 2 == 0:
        bpy.ops.mesh.primitive_plane_add(size=1, location=(x*0.985, y*0.985, 9.5), rotation=(math.pi/2, 0, a+math.pi/2))
        b = bpy.context.object; b.scale = (1.4, 2.0, 1); add(b, M_HOLO)
# energy dome: wireframe sphere
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=RO+2, location=(0, 0, 0))
dome = bpy.context.object; w = dome.modifiers.new('w', 'WIREFRAME'); w.thickness = 0.06
dm = mat_emit('dome', (0.35, 0.9, 1.0), 0.6); add(dome, dm)
# ---------- light / world ----------
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(72), 0, math.radians(-70)))
sun = bpy.context.object.data; sun.energy = 7; sun.color = (1.0, 0.72, 0.45); sun.angle = math.radians(3)
wd = bpy.data.worlds.new('w'); sc.world = wd; wd.use_nodes = True; nt = wd.node_tree
bg = nt.nodes['Background']; tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
cr = nt.nodes.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].position = 0.0; cr.color_ramp.elements[0].color = (1.0, 0.55, 0.28, 1)
cr.color_ramp.elements[1].position = 0.45; cr.color_ramp.elements[1].color = (0.25, 0.35, 0.65, 1)
nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], cr.inputs[0])
nt.links.new(cr.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.45
# ---------- camera ----------
bpy.ops.object.camera_add(location=(0, -17.5, 7.5))
cam = bpy.context.object; sc.camera = cam
cam.rotation_euler = (math.radians(79), 0, 0)
cam.data.lens = 20
cam.data.dof.use_dof = True; cam.data.dof.focus_distance = 12.5; cam.data.dof.aperture_fstop = 0.12
# ---------- render ----------
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(os.environ.get('SAMPLES', 48))
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 960, 540
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('DONE', OUT)
