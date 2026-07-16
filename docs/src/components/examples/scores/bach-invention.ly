\version "2.11.46"

voiceone =
\relative c' {
  r16  c[ d e]  f[ d e c]  g'8[ c b^\prall c]               | % 1
  d16[ g, a b]  c[ a b g]  d'8[ g f^\prall g]               | % 2
}

voicetwo =
\relative c {
  \clef "bass"
  r2          r16   c[ d e]  f[ d e c]                      | % 1
  g'8[ g,] r4 r16  g'[ a b]  c[ a b g]                      | % 2
}

\score {
  \context PianoStaff <<
    \set PianoStaff.connectArpeggios = ##t
    \context Staff = "one" << \voiceone >>
    \context Staff = "two" << \voicetwo >>
  >>
}
