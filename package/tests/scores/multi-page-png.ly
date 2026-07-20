\version "2.24.0"

% Minimal fixture for multi-page PNG naming/rendering. Two pages of
% trivial content — only the page count matters here, not the music.

\header {
  tagline = ##f
}

\paper {
  #(set-paper-size "letter")
}

music = \relative c' { c4 d e f }

\score {
  \new Staff {
    \music
    \pageBreak
    \music
  }
  \layout { }
}
