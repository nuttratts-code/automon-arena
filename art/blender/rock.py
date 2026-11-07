# Shared rock look for the rune plaza (set 134): real-looking procedural rock material, a "weathering" modifier
# stack, and the rebuilt ruined arch (irregular masonry, 13 voussoirs, square shoulders, sagging crown,
# broken right shoulder with its fallen blocks). Used by runeplaza_scene.py and stone_test.py.
import bpy, bmesh, math
import numpy as np
from mathutils import Vector

def node(nt, t, **kw):
    n = nt.nodes.new(t)
    for k, v in kw.items():
        if k.startswith('i_'): n.inputs[k[2:].replace('_', ' ')].default_value = v
        else: setattr(n, k, v)
    return n

def ramp(nt, stops):
    r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
    while len(el) < len(stops): el.new(0.5)
    for e, (p, c) in zip(el, stops): e.position = p; e.color = (*c, 1)
    return r

def lin(c): return tuple(v ** 2.2 for v in c)

def _mix(nt, a, b, fac=1.0, blend='MIX'):
    m = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type=blend)
    if isinstance(fac, float): m.inputs['Factor'].default_value = fac
    else: nt.links.new(fac, m.inputs['Factor'])
    nt.links.new(a, m.inputs['A']); nt.links.new(b, m.inputs['B']); return m.outputs['Result']

def rock_mat(name, moss=.5, tint=(1, 1, 1), scale=1.0, wrap=None):
    """colour patches, grain, soft vertical rain streaks, darker crevices (pointiness), sparse cracks,
    irregular lichen crusts (pale + orange), moss on up-facing parts, layered bump.
    scale < 1 = bigger features (for large/far rocks). wrap(nt, shader_socket) may add haze etc."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; L = nt.links
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = .88
    tc = node(nt, 'ShaderNodeTexCoord'); obj = tc.outputs['Object']
    if scale != 1.0:
        sm = node(nt, 'ShaderNodeMapping'); sm.inputs['Scale'].default_value = (scale,) * 3; L.new(obj, sm.inputs['Vector']); obj = sm.outputs[0]
    big = node(nt, 'ShaderNodeTexNoise', i_Scale=1.2, i_Detail=4.0, i_Roughness=.55); L.new(obj, big.inputs['Vector'])
    fine = node(nt, 'ShaderNodeTexNoise', i_Scale=38.0, i_Detail=12.0, i_Roughness=.65); L.new(obj, fine.inputs['Vector'])
    vor = node(nt, 'ShaderNodeTexVoronoi', i_Scale=3.0); L.new(obj, vor.inputs['Vector'])
    crk = node(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE', i_Scale=1.6); L.new(obj, crk.inputs['Vector'])
    base = ramp(nt, [(.25, lin((.33, .32, .29))), (.55, lin((.55, .53, .48))), (.8, lin((.68, .66, .60)))])
    L.new(big.outputs['Fac'], base.inputs[0])
    col = _mix(nt, base.outputs[0], fine.outputs['Color'], .35, 'MULTIPLY')
    mp = node(nt, 'ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.2, 2.2, .6); L.new(obj, mp.inputs['Vector'])
    st = node(nt, 'ShaderNodeTexNoise', i_Scale=2.0, i_Detail=3.0); L.new(mp.outputs[0], st.inputs['Vector'])
    sr = ramp(nt, [(.5, (1, 1, 1)), (.72, lin((.7, .68, .64)))]); L.new(st.outputs['Fac'], sr.inputs[0])
    col = _mix(nt, col, sr.outputs[0], 1.0, 'MULTIPLY')
    geo = node(nt, 'ShaderNodeNewGeometry')
    pt = ramp(nt, [(.44, lin((.38, .37, .36))), (.5, (1, 1, 1)), (.58, lin((1.18, 1.16, 1.1)))]); L.new(geo.outputs['Pointiness'], pt.inputs[0])
    col = _mix(nt, col, pt.outputs[0], 1.0, 'MULTIPLY')
    cm = node(nt, 'ShaderNodeTexNoise', i_Scale=1.1, i_Detail=2.0); L.new(obj, cm.inputs['Vector'])
    cmr = ramp(nt, [(.55, (0, 0, 0)), (.65, (.85, .85, .85))]); L.new(cm.outputs['Fac'], cmr.inputs[0])
    ck = ramp(nt, [(.0, lin((.2, .19, .18))), (.02, (1, 1, 1))]); L.new(crk.outputs['Distance'], ck.inputs[0])
    col = _mix(nt, col, ck.outputs[0], cmr.outputs[0], 'MULTIPLY')
    # lichen: irregular crusty patches (thresholded detailed noise), colour varies pale grey-green -> orange
    ln = node(nt, 'ShaderNodeTexNoise', i_Scale=6.0, i_Detail=12.0, i_Roughness=.75); L.new(obj, ln.inputs['Vector'])
    lr = ramp(nt, [(.6, (0, 0, 0)), (.64, (.9, .9, .9))]); L.new(ln.outputs['Fac'], lr.inputs[0])
    lc_n = node(nt, 'ShaderNodeTexNoise', i_Scale=1.5, i_Detail=2.0); L.new(obj, lc_n.inputs['Vector'])
    lc = ramp(nt, [(.45, lin((.76, .75, .64))), (.62, lin((.80, .58, .30)))]); L.new(lc_n.outputs['Fac'], lc.inputs[0])
    col = _mix(nt, col, lc.outputs[0], lr.outputs[0])
    sep = node(nt, 'ShaderNodeSeparateXYZ'); L.new(geo.outputs['Normal'], sep.inputs[0])
    mn = node(nt, 'ShaderNodeTexNoise', i_Scale=4.0, i_Detail=8.0, i_Roughness=.7); L.new(obj, mn.inputs['Vector'])
    ad = node(nt, 'ShaderNodeMath', operation='ADD'); L.new(sep.outputs['Z'], ad.inputs[0]); L.new(mn.outputs['Fac'], ad.inputs[1])
    mr = node(nt, 'ShaderNodeMapRange'); mr.inputs[1].default_value = 1.25 - moss * .3; mr.inputs[2].default_value = 1.4 - moss * .3
    L.new(ad.outputs[0], mr.inputs[0])
    mc = ramp(nt, [(.3, lin((.24, .31, .09))), (.7, lin((.44, .50, .17)))]); L.new(fine.outputs['Fac'], mc.inputs[0])
    col = _mix(nt, col, mc.outputs[0], mr.outputs[0])
    tn = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); tn.inputs['Factor'].default_value = 1
    tn.inputs['B'].default_value = (*tint, 1); L.new(col, tn.inputs['A'])
    L.new(tn.outputs['Result'], b.inputs['Base Color'])
    h1 = node(nt, 'ShaderNodeMath', operation='MULTIPLY'); h1.inputs[1].default_value = .5; L.new(vor.outputs['Distance'], h1.inputs[0])
    h2 = node(nt, 'ShaderNodeMath', operation='MULTIPLY'); h2.inputs[1].default_value = .25; L.new(fine.outputs['Fac'], h2.inputs[0])
    h3 = node(nt, 'ShaderNodeMath', operation='MINIMUM'); h3.inputs[1].default_value = .04; L.new(crk.outputs['Distance'], h3.inputs[0])
    h4 = node(nt, 'ShaderNodeMath', operation='MULTIPLY'); L.new(h3.outputs[0], h4.inputs[0]); L.new(cmr.outputs[0], h4.inputs[1])
    s1 = node(nt, 'ShaderNodeMath', operation='ADD'); L.new(h1.outputs[0], s1.inputs[0]); L.new(h2.outputs[0], s1.inputs[1])
    s2 = node(nt, 'ShaderNodeMath', operation='ADD'); L.new(s1.outputs[0], s2.inputs[0]); L.new(h4.outputs[0], s2.inputs[1])
    bm = node(nt, 'ShaderNodeBump', i_Strength=.55, i_Distance=.08 / scale); L.new(s2.outputs[0], bm.inputs['Height'])
    L.new(bm.outputs[0], b.inputs['Normal'])
    if wrap: wrap(nt, b.outputs[0])
    return m

_TEX = {}
def _tex():
    if not _TEX:
        v = bpy.data.textures.new('rk_vor', 'VORONOI'); v.noise_scale = .9
        c = bpy.data.textures.new('rk_cld', 'CLOUDS'); c.noise_scale = .6; c.noise_depth = 4
        f = bpy.data.textures.new('rk_fine', 'CLOUDS'); f.noise_scale = .12; f.noise_depth = 2
        _TEX.update(v=v, c=c, f=f)
    return _TEX

def weather(o, sub=4, vs=.18, cs=.12, fs=.03, bevel=.0, coords='GLOBAL'):
    t = _tex()
    if bevel:
        bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 2
    ss = o.modifiers.new('ss', 'SUBSURF'); ss.levels = ss.render_levels = sub
    for tx, s in ((t['v'], vs), (t['c'], cs), (t['f'], fs)):
        if s <= 0: continue
        d = o.modifiers.new('d', 'DISPLACE'); d.texture = tx; d.strength = s; d.mid_level = .5; d.texture_coords = coords
    for p in o.data.polygons: p.use_smooth = True

def build_arch(AX, AY, gz, mats, S=1.0, seed=7, link=None):
    """ruined arch standing on ground height gz at (AX, AY), facing -y. S scales it (S=1: opening 3.4 m, spring 3.9 m).
    Returns the list of objects. Block displacement uses OBJECT coords scaled with S so far copies keep their detail."""
    ar = np.random.default_rng(seed); objs = []
    def pick(): return mats[0] if ar.random() < .5 else mats[1]
    def blk(cx, cy, cz, sx, sy, sz, rot=(0, 0, 0), mat=None):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz), rotation=rot); o = bpy.context.object
        o.scale = (sx, sy, sz); bpy.ops.object.transform_apply(scale=True)
        o.data.materials.append(mat or pick())
        weather(o, sub=2, vs=.05 * S, cs=.05 * S, fs=.015 * S, bevel=min(sx, sy, sz) * .1); objs.append(o); return o
    OW, PT, PD = 3.4 * S, 1.25 * S, 1.1 * S
    SPR = 3.9 * S; spring = gz + SPR
    for side in (-1, 1):
        z = gz; k = 0
        while z < spring - .05 * S:
            hh = ar.uniform(.55, .95) * S; hh = spring - z if spring - z - hh < .35 * S else hh
            blk(AX + side * (OW / 2 + PT / 2) + ar.uniform(-.06, .06) * S + side * k * .015 * S, AY + ar.uniform(-.05, .05) * S, z + hh / 2,
                PT * ar.uniform(.92, 1.12), PD * ar.uniform(.9, 1.05), hh * 1.01,
                rot=(ar.uniform(-.03, .03), ar.uniform(-.03, .03), ar.uniform(-.06, .06)))
            z += hh; k += 1
    def vous(a0, a1, ri, ro, drop=0.0):
        bm = bmesh.new()
        for a in (a0, a1):
            for rr in (ri, ro):
                for yy in (-PD / 2, PD / 2):
                    bm.verts.new(Vector((AX + math.cos(a) * rr, AY + yy, spring + math.sin(a) * rr - drop)))
        bmesh.ops.convex_hull(bm, input=bm.verts)
        me = bpy.data.meshes.new('v'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('vous', me); (link or bpy.context.scene.collection).objects.link(o)
        o.data.materials.append(pick()); weather(o, sub=2, vs=.04 * S, cs=.04 * S, fs=.012 * S, bevel=.07 * S); objs.append(o)
    ri = OW / 2; ro = OW / 2 + PT * .85; NV = 13
    edges = np.cumsum(np.r_[0, ar.uniform(.85, 1.15, NV)]); edges = edges / edges[-1] * math.pi
    for k in range(NV):
        mid = (edges[k] + edges[k + 1]) / 2
        vous(edges[k] + .012, edges[k + 1] - .012, ri + ar.uniform(-.04, .04) * S, ro + ar.uniform(-.08, .12) * S, drop=.08 * S * math.sin(mid) ** 4)
    TOP = spring + ro + .45 * S
    for side in (-1, 1):
        top = TOP if side < 0 else TOP - 1.0 * S
        for (xc, wdt) in ((OW / 2 + PT / 2, PT * 1.05), (OW / 2 - .35 * S, .75 * S)):
            z = spring + math.sqrt(max(0, ro ** 2 - (xc - wdt / 2) ** 2)) - .05 * S if xc < OW / 2 else spring
            while z < top - .15 * S:
                hh = min(ar.uniform(.5, .75) * S, top - z)
                blk(AX + side * xc + ar.uniform(-.04, .04) * S, AY + ar.uniform(-.04, .04) * S, z + hh / 2, wdt * ar.uniform(.95, 1.05),
                    PD * ar.uniform(.92, 1.0), hh * 1.01, rot=(0, ar.uniform(-.03, .03), ar.uniform(-.04, .04)))
                z += hh
    for (xx, wdt) in ((-1.1, 1.0), (-.1, 1.0), (.75, .6)):
        xx *= S; wdt *= S
        zb = max(spring + math.sqrt(max(0, ro ** 2 - (abs(xx) + wdt / 2) ** 2)), spring + ro - .1 * S)
        hh = TOP - zb - (.35 * S if xx > 0 else 0)
        if hh > .2 * S: blk(AX + xx, AY, zb + hh / 2, wdt, PD * .96, hh, rot=(0, ar.uniform(-.03, .03), 0))
    blk(AX + OW / 2 + PT + 1.0 * S, AY - 1.0 * S, gz + .3 * S, 1.1 * S, .9 * S, .6 * S, rot=(.3, .2, .8), mat=mats[1])
    blk(AX + OW / 2 + PT + 1.9 * S, AY - .4 * S, gz + .18 * S, .6 * S, .5 * S, .35 * S, rot=(.1, .5, 2.1), mat=mats[1])
    return objs
