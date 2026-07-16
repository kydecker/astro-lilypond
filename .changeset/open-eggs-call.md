---
"astro-lilypond": patch
---

Use LilyPond's `cairo` backend renderer instead of the default `ps` renderer. From LilyPond v2.26.0's [major changes](https://lilypond.org/doc/v2.26/Documentation/changes/major-changes-in-lilypond):

> Instead of generating PostScript or SVG output by itself, LilyPond can now use the Cairo library to produce its output. This is referred to as the ‘Cairo backend’, and can be turned on using the -dbackend=cairo command-line option. This works for all output formats (PDF, SVG, PNG, PostScript), and brings speed and rendering fidelity improvements in SVG output in particular. However, keep in mind that this backend does not yet implement all features of the default backends. Among the features not currently supported are PDF outlines, the -dembed-source-code option for PDF, and the output-attributes property for SVG.
