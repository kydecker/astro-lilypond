% e2e fixture: validates that the includePaths config option resolves
% \include from ../snippets, a directory other than this file's own.
\include "horn-music.ly"

\header {
  instrument = "Horn in F"
  tagline = ##f
}

{
  \transpose f c' \hornNotes
}
