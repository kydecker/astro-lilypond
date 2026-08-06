% validate that the `includePaths` config option resolves
% \include from ../snippets
\include "horn-music.ly"

\header {
  instrument = "Horn in F"
  tagline = ##f
}

{
  \transpose f c' \hornNotes
}
