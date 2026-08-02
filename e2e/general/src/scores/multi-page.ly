% Two-page fixture for the uncropped / cropped / pageLimit e2e scenarios.
% Content is deliberately trivial to keep real `lilypond` render time low.
\header {
  title = "Multi-Page Fixture"
  tagline = ##f
}

\paper {
  #(set-paper-size "a6")
}

music = \relative c' {
  c4 d
}

\score {
  \new Staff {
    \music
    \pageBreak
    \music
  }
  \layout { }
}
