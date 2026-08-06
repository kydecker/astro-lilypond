% e2e fixture: lives outside src/scores, only reachable via the
% includePaths config option (not the score's own directory).
hornNotes = \relative {
  \time 2/4
  r4 f8 a | cis4 f | e4 d |
}
