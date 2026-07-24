\version "2.26.0"

% Minimal fixture exercising a \header nested inside \score with a
% \markup-valued field, per the real-world structure lilypondLoader's header
% parsing needs to handle.
\score {
  \header {
    piece = \markup { \bold "Prelude" }
  }
  { c4 }
}
