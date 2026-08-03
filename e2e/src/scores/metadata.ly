% Fixture exercising full \header metadata pass-through for the direct .ly
% import e2e scenario, including a non-standard custom field (LilyPond
% \header blocks accept arbitrary user-defined fields).
\header {
  title = "Metadata Fixture"
  composer = "Ada Fixture"
  poet = "Grace Header"
  instrument = "Glass Harmonica"
  opus = "Op. 1"
  customtag = "Custom Value"
  tagline = ##f
}

{ c'4 d' e' f' }
