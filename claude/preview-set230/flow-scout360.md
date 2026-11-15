# Google Flow / Scout360 test (15 Nov 2026, side chat, no code)

- Question: can Google Flow make 3D? **No 3D model export.** Flow = images (Nano Banana), video (Veo 3.1 / Gemini Omni), community tools. Nearest to 3D: **Scout360** (image → 360° panorama, by another user, uses Flow credits) and Surface (textures on room walls). Gemini (Pro) can make interactive 3D models in chat (Apr 2026) — export to file not confirmed.
- Test: owner ran Scout360 on the owner's Gemini arena painting (rune-stone meadow, clean, no UI) in Flow project "Nov 15 - 12:26" (owner's account, owner's Chrome).
- Result: style/colour/rune stones match the painting well; back side invented coherently. Problems: sky swirls overhead (zenith pinch), near stones + paving baked into the panorama (would read as giant stones behind the real 3D ones), one floating rock + a seam. Soft resolution. Download/file format not checked.
- Use in game: only as a far sky/backdrop (Godot PanoramaSkyMaterial + ambient tint). Fixed camera (FOV 19) sees ~1/10 of it, so 360° is worth it only if the camera moves later. Cheaper option then: crop the painting's top half as a flat far backdrop.
- **Owner decision: note only, do nothing now.** If revisited: regenerate with a far-view-only prompt (no near stones/paving), or use the flat backdrop crop; test in the scratch Godot copy (art-look §8).
