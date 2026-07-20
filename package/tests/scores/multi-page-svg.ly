\version "2.24.0"

% Minimal fixture for multi-page/crop-merge behavior: two pages, each with
% enough short systems that the crop-merged output ends up taller than it
% is wide. Content is deliberately trivial to keep integration test
% runtime low — only the page/system count matters here, not the music.

\header {
  tagline = ##f
}

\paper {
  #(set-paper-size "letter")
}

music = \relative c' {
  c4 d \break
  c4 d \break
  c4 d \break
  c4 d
}

\score {
  \new Staff {
    \music
    \pageBreak
    \music
  }
  \layout {
    ragged-right = ##t
  }
}
