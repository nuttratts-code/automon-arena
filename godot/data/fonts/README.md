# Fonts (set 196, user pick B1 — HARD RULE 9 ②)
Same fonts as the web game page (src/game/run.template.html loads them from Google Fonts). Here they are shipped inside the Godot build.
- Source: github.com/google/fonts at commit 5bb28733cec313b63fbd415b574b5ae35c8aa8b8 (ofl/mitr · ofl/ibmplexsansthai · ofl/ibmplexmono), raw files unchanged.
- Licence: SIL Open Font License 1.1 (free to use, embed and ship in a commercial game; the font files may not be sold on their own; licence text must travel with them → OFL-*.txt beside each font, credits screen at step 7f).
- Copyright: Mitr — 2015 The Mitr Project Authors (github.com/cadsondemak/mitr) · IBM Plex Sans Thai + IBM Plex Mono — 2017 IBM Corp., Reserved Font Name "Plex".
- SHA-256: Mitr-Medium 847340933424d473… · Mitr-SemiBold 257e8612923ed138… · IBMPlexSansThai-Regular eee061d1bac39be4… · IBMPlexSansThai-SemiBold 9d7526a0c8dfad63… · IBMPlexMono-Medium a9b4c49bb299e05b… (`sha256sum *.ttf`).
- Loaded at run time by scripts/ui/theme.gd (FileAccess bytes → FontFile); export include_filter ships data/fonts/*.ttf + *.txt.
