\version "2.24.0"

\layout {
  indent = #0
  line-width = #100
  ragged-last = ##f

}

upper = {
  \clef treble
  s1 s
}

lower = {
  \clef bass
  s1 s
}

\score {
  \new PianoStaff

  \with {
    \omit TimeSignature
    \remove "System_start_delimiter_engraver"
  }
  <<
    \new Staff = "upper" \upper
    \new Staff = "lower" \lower
  >>
}
