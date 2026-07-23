\version "2.24.0"
\language "english"

\header {
  title = "Two-Part Inventions"
  composer = "Johann Sebastian Bach"
  opus = "BWV 772"
  tagline = ##f
}

global = {
  \time 4/4
  \key c \major
  \accidentalStyle piano
}

rightHand = \relative c' {
  \global
  \set Score.tempoHideNote = ##t
  r16 c d e  f d e c  g'8 c b\mordent c |
  d16 g, a b  c a b g  d'8 g f\mordent g |
  e16 a g f  e g f a  g f e d  c e d f |
  e16 d c b  a c b d  c b a g  fs a g b |
  a8 d, c'8.\mordent d16  b a g fs  e g fs a |
  g16 b a c  b d c e  d b32 c d16 g  b,8\prall a16 g |
  g8 r r4 r16 g a b  c a b g |
  fs8 r r4 r16 a b c  d b c a |

  \barNumberCheck 9
  b8 r r4 r16 d c b  a c b d |
  c8 r r4 r16 e d c  b d cs e |
  d8 cs d e  f a, b cs |
  d8 fs, gs a  b c d4~ |
  d16 e, fs gs  a fs gs e  e' d c e  d c b d |
  c16 a' gs b a e f d  gs, f' e d  c8\prall b16 a |
  a16 a' g f  e g f a  g2~ |
  g16 e f g  a f g e  f2~ |

  \barNumberCheck 17
  f16 g f e  d f e g f2~ |
  f16 d e f  g e f d  e2~ |
  e16 c d e  f d e c  d e f g  a f g e |
  f16 g a b  c a b g  c8 g e\prall d16 c |
  c16 bf a g  f a g bf  \tempo 4 = 82 a b c e,  \tempo 4 = 72 d c' f, b |
  <e, g c>1\arpeggio\fermata |
  \bar "|."
}

leftHand = \relative c {
  \clef bass
  \global
  r2 r16 c d e  f d e c |
  g'8 g, r4 r16 g' a b  c a b g |
  c8 b c d  e g, a b |
  c8 e, fs g  a b c4~ |
  c16 d, e fs  g e fs d  g8 b, c d |
  e8 fs g e  b8. c16 d8 d, |
  r16 g a b  c a b g  d'8 g fs g |
  a16 d, e fs g e fs d  a'8 d c d |

  \barNumberCheck 9
  \clef treble
  g,16 g' f e  d f e g  f8 e f d |
  e16 a g f  e g f a  g8 f g e |
  f16 bf a g  f a g bf  a g f e  d f e g |
  f16 e d c  b d c e  \clef bass d c b a  gs b a c |
  b8 e, d'8.\mordent e16  c b a g  fs a gs b |
  a16 c b d  c e d f  e8 a, e' e, |
  a8 a, r4 r16 e'' d c  b d cs e |
  d2~ d16 a b c  d b c a |

  \barNumberCheck 17
  b2~ b16 d c b  a c b d |
  c2~ c16 g a bf  c a bf g |
  a8 bf a g  f d' c bf |
  a8 f' e d  e16 d, e f  g e f d |
  e8 c d e  f16 d e f  g8 g, |
  <c, c'>1\arpeggio\fermata
}

\score {
  \new PianoStaff \with {
    instrumentName = \markup \huge "No. 1"
  } <<
    \new Staff = "upper" \rightHand
    \new Staff = "lower" \leftHand
  >>
  \layout {}
}
