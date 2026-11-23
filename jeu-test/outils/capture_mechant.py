# Animation « capture » du Méchant pour le jeu test (La Nuit de l'EHPAD) — Allan BIM
# ---------------------------------------------------------------------------------
# À lancer dans Blender (onglet Scripting > Ouvrir > Exécuter). Marche de Blender 3.6 à 5.x.
# Le script crée une NOUVELLE scène « Capture_Mechant » : il ne touche à aucun objet déjà présent.
#   - le Méchant (mêmes articulations que dans le jeu : corps, tête, bras, coudes, jambes, genoux) ;
#   - la caméra « cam_victime » : ce que voit le joueur attrapé ;
#   - 75 images à 30 images/s : menace, élan, bond, étranglement, torsion, chute.
# Pour changer l'animation : déplace les clés dans Blender, puis lance exporter() (en bas du fichier) :
# le fichier anim_capture.js obtenu remplace jeu/anim_capture.js dans le dossier du jeu.
import bpy, bmesh, json, math, os
from mathutils import Vector, Quaternion, Euler

FPS, N = 30, 75
JOINTS = {"body": "corps", "head": "tete", "aL": "bras_G", "eL": "coude_G", "aR": "bras_D", "eR": "coude_D",
          "lL": "jambe_G", "kL": "genou_G", "lR": "jambe_D", "kR": "genou_D"}


def construire():
    sc = bpy.data.scenes.new("Capture_Mechant")
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, N
    col = sc.collection
    mats = {}

    def mat(nom, rgb, rough=0.8):
        if nom not in mats:
            m = bpy.data.materials.new("capt_" + nom)
            m.diffuse_color = (rgb[0], rgb[1], rgb[2], 1)
            m.use_nodes = True
            b = m.node_tree.nodes.get("Principled BSDF")
            if b:
                b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1)
                b.inputs["Roughness"].default_value = rough
            mats[nom] = m
        return mats[nom]

    C = {"marine": (0.035, 0.05, 0.1), "sombre": (0.012, 0.014, 0.02), "fourrure": (0.45, 0.3, 0.12), "peau": (0.2, 0.115, 0.07),
         "jean": (0.055, 0.13, 0.32), "bleu": (0.1, 0.48, 0.8), "blanc": (0.85, 0.87, 0.88), "noir": (0.008, 0.008, 0.01), "semelle": (0.22, 0.68, 0.65),
         "sol": (0.16, 0.11, 0.07), "mur": (0.3, 0.3, 0.3)}

    def vide(nom, parent, loc):
        o = bpy.data.objects.new(nom, None)
        o.empty_display_size = 0.06
        o.empty_display_type = 'SPHERE'
        o.location = loc
        o.rotation_mode = 'XYZ'
        o.parent = parent
        col.objects.link(o)
        return o

    def forme(nom, parent, kind, dims, loc, couleur, rot=(0, 0, 0), ech=(1, 1, 1)):
        me = bpy.data.meshes.new(nom)
        bm = bmesh.new()
        if kind == "cyl":   # dims = (rayon haut, rayon bas, longueur), axe Z
            bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=16, radius1=dims[1], radius2=dims[0], depth=dims[2])
        elif kind == "sph":
            bmesh.ops.create_uvsphere(bm, u_segments=18, v_segments=12, radius=dims[0])
        else:
            bmesh.ops.create_cube(bm, size=1.0)
            bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
        for f in bm.faces:
            f.smooth = kind != "box"
        bm.to_mesh(me)
        bm.free()
        o = bpy.data.objects.new(nom, me)
        o.location, o.rotation_euler, o.scale, o.parent = loc, rot, ech, parent
        me.materials.append(mat(couleur, C[couleur]))
        col.objects.link(o)
        return o

    racine = vide("Mechant", None, (0, 0, 0))
    racine.empty_display_type = 'ARROWS'
    racine.empty_display_size = 0.3
    corps = vide("corps", racine, (0, 0, 0))
    # buste (parka), bassin (jean), col de fourrure, tour de cou et badge
    forme("parka", corps, "cyl", (0.225, 0.215, 0.62), (0, 0, 1.17), "marine", ech=(0.68, 1, 1))
    forme("epaules", corps, "sph", (0.23,), (0, 0, 1.42), "marine", ech=(0.62, 1.02, 0.42))
    forme("ceinture", corps, "cyl", (0.228, 0.226, 0.08), (0, 0, 0.87), "sombre", ech=(0.7, 1, 1))
    forme("bassin", corps, "cyl", (0.2, 0.19, 0.16), (0, 0, 0.82), "jean", ech=(0.68, 1, 1))
    forme("fourrure", corps, "sph", (0.17,), (-0.03, 0, 1.49), "fourrure", ech=(1.0, 1.05, 0.42))
    forme("tee_shirt", corps, "box", (0.02, 0.105, 0.6), (0.146, 0, 1.2), "sombre")
    forme("cordon_G", corps, "box", (0.008, 0.02, 0.36), (0.161, 0.042, 1.31), "bleu", rot=(-0.15, 0.05, 0))
    forme("cordon_D", corps, "box", (0.008, 0.02, 0.36), (0.161, -0.042, 1.31), "bleu", rot=(0.15, 0.05, 0))
    forme("badge", corps, "box", (0.008, 0.086, 0.062), (0.167, 0, 1.12), "blanc")
    tete = vide("tete", corps, (0.012, 0, 1.54))
    forme("cou", tete, "cyl", (0.05, 0.056, 0.12), (0, 0, 0.0), "peau")
    forme("crane", tete, "sph", (0.105,), (0.01, 0, 0.14), "peau", ech=(1.02, 0.88, 1.15))
    forme("machoire", tete, "sph", (0.085,), (0.03, 0, 0.078), "peau", ech=(0.98, 0.86, 0.82))
    forme("nez", tete, "sph", (0.022,), (0.113, 0, 0.115), "peau", ech=(0.9, 1.35, 0.85))
    forme("cheveux", tete, "sph", (0.108,), (-0.014, 0, 0.158), "noir", ech=(1.02, 0.9, 1.08))
    for s, n in ((1, "G"), (-1, "D")):
        forme("oeil_" + n, tete, "sph", (0.016,), (0.093, 0.036 * s, 0.156), "blanc")
        forme("iris_" + n, tete, "sph", (0.0095,), (0.1045, 0.036 * s, 0.156), "noir")
        forme("ecouteur_" + n, tete, "sph", (0.012,), (0.012, 0.098 * s, 0.128), "blanc")
    forme("bouche", tete, "box", (0.014, 0.072, 0.024), (0.1, 0, 0.068), "noir")
    forme("dents", tete, "box", (0.012, 0.06, 0.01), (0.104, 0, 0.074), "blanc")
    J = {"body": corps, "head": tete}
    for s, n in ((1, "G"), (-1, "D")):
        bras = vide("bras_" + n, corps, (0, 0.222 * s, 1.44))
        forme("haut_bras_" + n, bras, "cyl", (0.063, 0.054, 0.31), (0, 0, -0.15), "marine")
        coude = vide("coude_" + n, bras, (0, 0, -0.3))
        forme("avant_bras_" + n, coude, "cyl", (0.054, 0.046, 0.26), (0, 0, -0.13), "marine")
        forme("poignet_" + n, coude, "cyl", (0.049, 0.049, 0.05), (0, 0, -0.265), "sombre")
        forme("main_" + n, coude, "sph", (0.045,), (0.006, 0, -0.335), "peau", ech=(0.75, 0.55, 1.25))
        jambe = vide("jambe_" + n, racine, (0, 0.097 * s, 0.93))
        forme("cuisse_" + n, jambe, "cyl", (0.09, 0.068, 0.45), (0, 0, -0.225), "jean")
        genou = vide("genou_" + n, jambe, (0, 0, -0.45))
        forme("tibia_" + n, genou, "cyl", (0.067, 0.062, 0.42), (0, 0, -0.21), "jean")
        forme("basket_" + n, genou, "box", (0.25, 0.096, 0.07), (0.055, 0, -0.452), "noir")
        forme("semelle_" + n, genou, "box", (0.27, 0.1, 0.016), (0.06, 0, -0.49), "semelle")
        k = "L" if n == "G" else "R"
        J["a" + k], J["e" + k], J["l" + k], J["k" + k] = bras, coude, jambe, genou

    # décor minimal, lumière, caméras
    forme("sol", None, "box", (8, 6, 0.02), (1, 0, -0.011), "sol")
    forme("mur", None, "box", (0.05, 6, 3), (-2.2, 0, 1.5), "mur")
    ld = bpy.data.lights.new("lampe_victime", 'SPOT')
    ld.energy, ld.spot_size, ld.spot_blend = 900, 1.0, 0.5
    lampe = bpy.data.objects.new("lampe_victime", ld)
    col.objects.link(lampe)
    cd = bpy.data.cameras.new("cam_victime")
    cd.lens, cd.clip_start = 16, 0.03
    cam = bpy.data.objects.new("cam_victime", cd)
    cam.rotation_mode = 'QUATERNION'
    col.objects.link(cam)
    lampe.parent = cam
    lampe.location = (0.12, -0.14, 0.0)
    cd2 = bpy.data.cameras.new("cam_cote")
    cd2.lens = 28
    cote = bpy.data.objects.new("cam_cote", cd2)
    cote.location = (1.0, -4.2, 1.35)
    cote.rotation_euler = (math.radians(88), 0, 0)
    col.objects.link(cote)
    l2 = bpy.data.lights.new("ambiance", 'AREA')
    l2.energy, l2.size = 260, 4
    amb = bpy.data.objects.new("ambiance", l2)
    amb.location = (1.0, -2.5, 2.8)
    amb.rotation_euler = (math.radians(50), 0, 0)
    col.objects.link(amb)
    w = bpy.data.worlds.new("nuit")
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.004, 0.006, 0.012, 1)
    sc.world = w
    sc.camera = cam
    return sc, racine, J, cam


def animer(sc, racine, J, cam):
    def cle(o, f, rot=None, loc=None):
        if rot is not None:
            o.rotation_euler = rot
            o.keyframe_insert("rotation_euler", frame=f)
        if loc is not None:
            o.location = loc
            o.keyframe_insert("location", frame=f)

    def corps(f, penche, tors=0.0, dz=0.0):   # le buste pivote autour des hanches
        cle(J["body"], f, rot=(0, penche, tors), loc=(-0.93 * math.sin(penche), 0, 0.93 * (1 - math.cos(penche)) + dz))

    def bras(f, yg, yd, coude_g, coude_d, serre=0.0, xg=0.0, xd=0.0):
        cle(J["aL"], f, rot=(0.09 - serre + xg, yg, 0)); cle(J["aR"], f, rot=(-0.09 + serre + xd, yd, 0))
        cle(J["eL"], f, rot=(0, coude_g, 0)); cle(J["eR"], f, rot=(0, coude_d, 0))

    def jambes(f, cg, gg, cd, gd):
        cle(J["lL"], f, rot=(0, cg, 0)); cle(J["kL"], f, rot=(0, gg, 0)); cle(J["lR"], f, rot=(0, cd, 0)); cle(J["kR"], f, rot=(0, gd, 0))

    def tete(f, incline, menton, tourne=0.0):
        cle(J["head"], f, rot=(incline, menton, tourne))

    # 1 — il te fixe, tête penchée
    for f in (1, 4):
        cle(racine, f, loc=(0, 0, 0)); corps(f, 0.06); bras(f, 0.05, 0.05, -0.2, -0.2); jambes(f, 0, 0.04, 0, 0.04); tete(f, 0.28 + 0.02 * (f - 1), 0.05)
    # 9 — élan : il se ramasse, bras en arrière
    th = 0.38
    cle(racine, 9, loc=(-0.05, 0, -0.93 * (1 - math.cos(th)))); corps(9, -0.1); bras(9, 0.6, 0.6, -1.1, -1.1); jambes(9, -th, 2 * th, -th, 2 * th); tete(9, 0.12, 0.28)
    # 15 — bond : fente avant, bras tendus vers le cou
    cle(racine, 15, loc=(0.85, 0, -0.13)); corps(15, 0.42); bras(15, -2.0, -2.0, -0.1, -0.1, serre=0.1); jambes(15, -0.75, 0.55, 0.45, 0.35); tete(15, 0.3, -0.45)
    # 18 — prise : les mains se referment
    cle(racine, 18, loc=(0.9, 0, -0.13)); corps(18, 0.44); bras(18, -1.95, -1.95, -0.38, -0.38, serre=0.3); jambes(18, -0.78, 0.6, 0.42, 0.4); tete(18, 0.36, -0.5)
    # 18 → 52 — il serre et secoue, la tête se penche de plus en plus
    for i, f in enumerate(range(22, 53, 4)):
        s = 1 if i % 2 == 0 else -1
        k = i / 7.0
        cle(racine, f, loc=(0.9 + 0.02 * s, 0.012 * s, -0.13 + 0.01 * s)); corps(f, 0.44 + 0.03 * s, tors=0.06 * s)
        bras(f, -1.95 + 0.07 * s, -1.95 - 0.07 * s, -0.42 - 0.08 * s, -0.42 + 0.08 * s, serre=0.3)
        jambes(f, -0.78, 0.6, 0.42, 0.4); tete(f, 0.36 + 0.3 * k, -0.5 + 0.05 * s, 0.12 * s)
    # 57 — torsion sèche
    cle(racine, 57, loc=(0.92, 0, -0.12)); corps(57, 0.4, tors=0.38); bras(57, -1.55, -2.3, -0.95, -0.7, serre=0.3, xg=0.25, xd=0.2); jambes(57, -0.78, 0.6, 0.42, 0.4); tete(57, 0.75, -0.42, -0.2)
    # 63 → 75 — il lâche, se redresse et regarde sa victime à terre
    cle(racine, 63, loc=(0.9, 0, -0.08)); corps(63, 0.3, tors=0.15); bras(63, -0.9, -1.1, -0.5, -0.5, serre=0.0); jambes(63, -0.6, 0.45, 0.3, 0.3); tete(63, 0.5, 0.2, -0.1)
    cle(racine, 75, loc=(0.86, 0, 0)); corps(75, 0.14); bras(75, 0.02, 0.02, -0.22, -0.22); jambes(75, -0.12, 0.1, 0.08, 0.06); tete(75, 0.34, 0.55)

    # caméra de la victime : elle regarde le visage du Méchant, tremble, puis tombe
    import random
    rnd = random.Random(7)
    cles = [(1, (1.75, 0, 1.5), 0.0), (9, (1.77, 0, 1.5), 0.0), (15, (1.81, 0, 1.47), 0.02), (18, (1.72, 0, 1.5), 0.05)]
    for i, f in enumerate(range(21, 53, 3)):
        k = i / 10.0
        cles.append((f, (1.72 - 0.06 * k + rnd.uniform(-0.02, 0.02), rnd.uniform(-0.025, 0.025), 1.5 + 0.08 * k + rnd.uniform(-0.015, 0.015)), rnd.uniform(-0.07, 0.07)))
    cles += [(57, (1.7, 0.09, 1.5), 0.95), (63, (1.85, 0.2, 0.8), 1.3), (67, (1.95, 0.26, 0.26), 1.47), (70, (1.95, 0.26, 0.33), 1.42), (75, (1.96, 0.27, 0.25), 1.5)]
    sc.frame_set(2)
    sc.view_layers[0].update()   # première évaluation, sinon la tête n'a pas encore sa position
    prev = None
    for f, pos, roulis in cles:
        sc.frame_set(f)
        sc.view_layers[0].update()
        cible = J["head"].matrix_world @ Vector((0.09, 0, 0.13))
        q = (cible - Vector(pos)).to_track_quat('-Z', 'Y') @ Quaternion((0, 0, 1), roulis)
        if prev is not None and q.dot(prev) < 0:
            q.negate()
        prev = q.copy()
        cam.location = pos
        cam.rotation_quaternion = q
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
    sc.frame_set(1)


def exporter(chemin=None):
    """Écrit anim_capture.js (positions et rotations image par image) pour le jeu."""
    sc = bpy.data.scenes["Capture_Mechant"]
    o = bpy.data.objects
    out = {"fps": FPS, "n": N, "j": {k: [] for k in JOINTS}, "root": [], "body": [], "cam": []}
    r3 = lambda v: round(v, 4)
    for f in range(1, N + 1):
        sc.frame_set(f)
        for k, nom in JOINTS.items():
            q = o[nom].matrix_basis.to_quaternion()
            out["j"][k] += [r3(q.x), r3(q.y), r3(q.z), r3(q.w)]
        out["root"] += [r3(v) for v in o["Mechant"].matrix_basis.translation]
        out["body"] += [r3(v) for v in o["corps"].matrix_basis.translation]
        m = o["cam_victime"].matrix_world
        q = m.to_quaternion()
        out["cam"] += [r3(v) for v in m.translation] + [r3(q.x), r3(q.y), r3(q.z), r3(q.w)]
    sc.frame_set(1)
    if chemin is None:
        chemin = os.path.join(os.path.dirname(bpy.data.filepath) or os.path.expanduser("~"), "anim_capture.js")
    with open(chemin, "w", encoding="utf-8") as fh:
        fh.write("window.JEU_ANIM=window.JEU_ANIM||{};window.JEU_ANIM.capture=" + json.dumps(out, separators=(",", ":")) + ";\n")
    print("Animation exportée :", chemin)
    return chemin


if __name__ == "__main__":
    if "Capture_Mechant" in bpy.data.scenes:
        print("La scène Capture_Mechant existe déjà : pour réexporter après tes changements, lance exporter().")
    else:
        scene, racine, J, cam = construire()
        animer(scene, racine, J, cam)
        if bpy.context.window:
            bpy.context.window.scene = scene
        print("Scène Capture_Mechant créée : lecture avec la barre d'espace, vue caméra avec la touche 0 du pavé numérique.")
