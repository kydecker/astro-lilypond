\version "2.24.0"

\layout {
  indent = #0
  line-width = #100
  ragged-last = ##f
}

\score {
  \new Staff
  \with {
    \omit TimeSignature
  }
  { s1 s s \bar "|." }
}
