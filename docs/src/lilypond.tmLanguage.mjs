export default {
  "name": "lilypond",
  "displayName": "LilyPond",
  "aliases": ["lilypondtext"],
  "scopeName": "source.lilypond",
  "fileTypes": ["ly", "lily", "ily"],
  "patterns": [
    { "include": "#comments" },
    { "include": "#g_header" },
    { "include": "#groupings" },
    { "include": "#strings" },
    { "include": "#scheme" },
    { "include": "#functions" }
  ],
  "repository": {
    "comments": {
      "patterns": [
        {
          "name": "comment.block.lilypond",
          "begin": "%{",
          "end": "%}",
          "captures": {
            "0": { "name": "punctuation.definition.comment.lilypond" }
          }
        },
        {
          "begin": "(^[ \\t]+)?(?=%)",
          "beginCaptures": {
            "1": { "name": "punctuation.whitespace.comment.leading.lilypond" }
          },
          "end": "(?!\\G)",
          "patterns": [
            {
              "name": "comment.line.percentage.lilypond",
              "begin": "%",
              "beginCaptures": {
                "0": { "name": "punctuation.definition.comment.lilypond" }
              },
              "end": "\\n"
            }
          ]
        }
      ]
    },
    "strings": {
      "name": "string.quoted.double.lilypond",
      "begin": "\"",
      "end": "\"",
      "captures": {
        "0": { "name": "punctuation.definition.string.lilypond" }
      },
      "patterns": [
        {
          "name": "constant.character.escape.lilypond",
          "match": "\\\\."
        }
      ]
    },
    "scheme": {
      "begin": "(^[ \\t])?(?=#)",
      "beginCaptures": {
        "0": { "name": "punctuation.whitespace.embedded.leading.scheme" }
      },
      "end": "(?!\\G)",
      "patterns": [
        {
          "name": "meta.embedded.line.scheme",
          "contentName": "source.scheme",
          "begin": "#",
          "end": "(?=[\\s%])|(?<=\\n)",
          "patterns": [
            { "include": "source.scheme" }
          ]
        }
      ]
    },
    "functions": {
      "patterns": [
        { "include": "#f_clef" },
        { "include": "#f_time-signature" },
        { "include": "#f_key-signature" },
        { "include": "#f_keywords" },
        { "include": "#f_generic" }
      ]
    },
    "f_clef": {
      "name": "meta.element.clef.lilypond",
      "match": "(?x)\n  ((\\\\) clef) \\s+\n  (?:\n    (\"?)\n    (?:\n        ( (?:\n            treble | violin | G | french |\n            alto | C | tenor | (?:mezzo)?soprano | baritone |\n            (?:sub)?bass | F | varbaritone |\n            percussion | tab |\n            (?:neo)?mensural-c[1-4] | mensural-[fg] |\n            petrucci-(?: [fg] | c[1-5] ) |\n            (?: vaticana | medicaea | hufnagel ) - (?: do[1-3] | fa[12] ) |\n            hufnagel-do-fa\n          )\n          ([_^](?:8|15)?)?\n        ) |\n        ( (?:\\w+) ([_^](?:8|15))? )\n    )\n    (\\3)\n  )?",
      "captures": {
        "1": { "name": "support.function.element.lilypond" },
        "2": { "name": "punctuation.definition.function.lilypond" },
        "3": { "name": "punctuation.definition.string.lilypond" },
        "4": { "name": "constant.language.clef-name.lilypond" },
        "5": { "name": "constant.other.modifier.clef.lilypond" },
        "6": { "name": "meta.fixme.unknown-clef-name.lilypond" },
        "7": { "name": "constant.other.modifier.clef.lilypond" },
        "8": { "name": "punctuation.definition.string.lilypond" }
      }
    },
    "f_time-signature": {
      "name": "meta.element.time-signature.lilypond",
      "match": "(?x)\n  ((\\\\) time) \\s+\n  ([1-9][0-9]*/[1-9][0-9]*)?",
      "captures": {
        "1": { "name": "support.function.element.lilypond" },
        "2": { "name": "punctuation.definition.function.lilypond" },
        "3": { "name": "constant.numeric.time-signature.lilypond" }
      }
    },
    "f_key-signature": {
      "name": "meta.element.key-signature.lilypond"
    },
    "f_keywords": {
      "name": "keyword.control.lilypond",
      "match": "(?x)\n  (?: (\\\\)\n      (?: set | new | override | revert)\\b\n  )",
      "captures": {
        "1": { "name": "punctuation.definition.function.lilypond" }
      }
    },
    "f_generic": {
      "name": "support.function.general.lilypond",
      "match": "(\\\\)[a-zA-Z-]+\\b",
      "captures": {
        "1": { "name": "punctuation.definition.function.lilypond" }
      }
    },
    "groupings": {
      "patterns": [
        { "include": "#g_system" },
        { "include": "#g_relative" },
        { "include": "#g_times" },
        { "include": "#group" }
      ]
    },
    "g_system": {
      "name": "meta.system.lilypond",
      "begin": "<<",
      "beginCaptures": {
        "0": { "name": "punctuation.section.system.begin.lilypond" }
      },
      "end": ">>",
      "endCaptures": {
        "0": { "name": "punctuation.section.system.end.lilypond" }
      },
      "patterns": [
        { "include": "$self" }
      ]
    },
    "g_relative": {
      "begin": "((\\\\)relative)\\s*(?:([a-h][',]*)\\s*)?(?={)",
      "beginCaptures": {
        "1": { "name": "support.function.section.lilypond" },
        "2": { "name": "punctuation.definition.function.lilypond" },
        "3": { "name": "storage.type.pitch.lilypond" }
      },
      "end": "(?<=})",
      "patterns": [
        { "include": "#group" }
      ]
    },
    "g_times": {
      "begin": "((\\\\)times)\\s*(?:([1-9][0-9]*/[1-9][0-9])\\s*)(?={)",
      "beginCaptures": {
        "1": { "name": "support.function.section.lilypond" },
        "2": { "name": "punctuation.definition.function.lilypond" },
        "3": { "name": "constant.numeric.fraction.lilypond" }
      },
      "end": "(?<=})",
      "patterns": [
        { "include": "#group" }
      ]
    },
    "group": {
      "name": "meta.music-expression.lilypond",
      "begin": "\\{",
      "beginCaptures": {
        "0": { "name": "punctuation.section.group.begin.lilypond" }
      },
      "end": "\\}",
      "endCaptures": {
        "0": { "name": "punctuation.section.group.end.lilypond" }
      },
      "patterns": [
        { "include": "#music-expr" }
      ]
    },
    "g_header": {
      "name": "meta.header.lilypond",
      "begin": "((\\\\)header)\\s*({)",
      "beginCaptures": {
        "1": { "name": "support.function.section.header.lilypond" },
        "2": { "name": "punctuation.definition.function.lilypond" },
        "3": { "name": "punctuation.section.group.begin.lilypond" }
      },
      "end": "\\}",
      "endCaptures": {
        "0": { "name": "punctuation.section.group.end.lilypond" }
      },
      "patterns": [
        { "include": "#comments" },
        { "include": "#strings" },
        { "include": "#scheme" },
        { "include": "#g_markup" },
        {
          "name": "punctuation.separator.key-value.lilypond",
          "match": "="
        },
        {
          "name": "support.constant.header.lilypond",
          "match": "(?x)\n  dedication | title | subtitle | subsubtitle | poet |\n  composer | meter | opus | arranger | instrument |\n  piece | breakbefore | copyright | tagline | enteredby"
        },
        {
          "name": "support.constant.header.mutopia.lilypond",
          "match": "(?x)\n  mutopiatitle | mutopiacomposer | mutopiapoet |\n  mutopiaopus | mutopiainstrument | date | source |\n  style | maintainer | maintainerEmail |\n  maintainerWeb | lastupdated"
        }
      ]
    },
    "g_markup": {
      "name": "meta.element.markup.lilypond",
      "begin": "(?x)\n  ((\\\\) markup) \\s+\n  (?={)",
      "beginCaptures": {
        "1": { "name": "support.function.element.markup.lilypond" },
        "2": { "name": "punctuation.definition.function.markup" }
      },
      "end": "(?<=})",
      "patterns": [
        { "include": "#g_m_group" }
      ]
    },
    "g_m_group": {
      "name": "meta.group.lilypond",
      "begin": "\\{",
      "beginCaptures": {
        "0": { "name": "punctuation.section.group.begin.lilypond" }
      },
      "end": "\\}",
      "endCaptures": {
        "0": { "name": "punctuation.section.group.end.lilypond" }
      },
      "patterns": [
        { "include": "#f_generic" },
        { "include": "#strings" },
        { "include": "#comments" },
        { "include": "#scheme" },
        { "include": "#g_m_group" }
      ]
    },
    "music-expr": {
      "patterns": [
        { "include": "#comments" },
        { "include": "#groupings" },
        { "include": "#strings" },
        { "include": "#functions" },
        { "include": "#scheme" },
        { "include": "#notes" }
      ]
    },
    "notes": {
      "patterns": [
        {
          "name": "meta.element.note.lilypond",
          "begin": "(?x)\\b\n  (\n    ( [a-h]\n      ( (?:i[sh]){1,2} |\n        (?:e[sh]|s){1,2}\n      )?\n      (?:(!)|(?:\\?))?\n      (''+|,+)?\n    )\n    ( ( ((\\\\)breve)|\n        64|32|16|8|4|2|1\n      )\n      (\\.+)?\n      ((?:(\\*)(\\d+(?:/\\d+)?))*)\n    )?\n  )(?![a-z])",
          "beginCaptures": {
            "2": { "name": "storage.type.pitch.lilypond" },
            "4": { "name": "meta.note-modifier.accidental.reminder.lilypond" },
            "5": { "name": "meta.note-modifier.accidental.cautionary.lilypond" },
            "6": { "name": "meta.note-modifier.octave.lilypond" },
            "7": { "name": "storage.type.duration.lilypond" },
            "9": { "name": "punctuation.definition.function.lilypond" },
            "12": { "name": "keyword.operator.duration-scale.lilypond" },
            "13": { "name": "constant.numeric.fraction.lilypond" }
          },
          "end": "(?=[\\s}~a-z]|$)",
          "patterns": [
            { "include": "#n_articulations" }
          ]
        },
        {
          "name": "meta.element.pause.rest.lilypond",
          "begin": "(?x)\\b\n  (?:(r)|(R))\n  ( ( (\\\\)breve|\n      64|32|16|8|4|2|1\n    )\n    (\\.+)?\n    ((?:(\\*)(\\d+(?:/\\d+)?))*)\n  )?\n  (?![a-z])",
          "beginCaptures": {
            "1": { "name": "storage.type.pause.rest.lilypond" },
            "2": { "name": "storage.type.pause.rest.multi-measure.lilypond" },
            "3": { "name": "storage.type.duration.lilypond" },
            "5": { "name": "punctuation.definition.function.lilypond" },
            "7": { "name": "keyword.operator.duration-scale.lilypond" },
            "9": { "name": "constant.numeric.fraction.lilypond" }
          },
          "end": "(?=[\\s}~a-z])",
          "patterns": [
            { "include": "#n_articulations" }
          ]
        },
        {
          "name": "meta.element.pause.skip.lilypond",
          "begin": "(?x)\\b\n  (s)\n  ( ( (\\\\)breve|\n      64|32|16|8|4|2|1\n    )\n    (\\.+)?\n    ((?:(\\*)(\\d+(?:/\\d+)?))*)\n  )?\n  (?![a-z])",
          "beginCaptures": {
            "1": { "name": "storage.type.pause.skip.lilypond" },
            "2": { "name": "storage.type.duration.lilypond" },
            "4": { "name": "punctuation.definition.function.lilypond" },
            "6": { "name": "keyword.operator.duration-scale.lilypond" },
            "8": { "name": "constant.numeric.fraction.lilypond" }
          },
          "end": "(?=[\\s}~a-z]|$)",
          "patterns": [
            { "include": "#n_articulations" }
          ]
        },
        {
          "name": "meta.element.pause.skip.lilypond",
          "match": "((\\\\)skip)\\s+(64|32|16|8|4|2|1)",
          "captures": {
            "1": { "name": "storage.type.pause.skip.lilypond" },
            "2": { "name": "punctuation.definition.function.lilypond" },
            "3": { "name": "storage.type.duration.lilypond" }
          }
        },
        {
          "name": "meta.element.chord.lilypond",
          "begin": "<",
          "beginCaptures": {
            "0": { "name": "punctuation.definition.chord.lilypond" }
          },
          "end": ">",
          "endCaptures": {
            "0": { "name": "punctuation.definition.chord.lilypond" }
          },
          "patterns": [
            {
              "match": "(?x)\\b\n  ( [a-h]\n    ( (?:i[sh]){1,2} |\n      (?:e[sh]|s){1,2}\n    )?\n    (?:(!)|(?:\\?))?\n    (''+|,+)?\n  )",
              "captures": {
                "1": { "name": "storage.type.pitch.lilypond" },
                "3": { "name": "meta.note-modifier.accidental.reminder.lilypond" },
                "4": { "name": "meta.note-modifier.accidental.cautionary.lilypond" },
                "5": { "name": "meta.note-modifier.octave.lilypond" }
              }
            }
          ]
        },
        {
          "name": "meta.element.chord.lilypond",
          "begin": "(?x)\n  (?<!-)\n  (?<=>)\n  (\n    ( ( ((\\\\)breve)|\n        64|32|16|8|4|2|1\n      )\n      (\\.+)?\n    ) |\n    (?![\\s}~a-z]|$)\n  )",
          "beginCaptures": {
            "1": { "name": "storage.type.duration.lilypond" },
            "4": { "name": "punctuation.definition.function.lilypond" }
          },
          "end": "(?=[\\s}~a-z]|$)(?<![^-]>)",
          "patterns": [
            { "include": "#n_articulations" }
          ]
        },
        {
          "name": "storage.type.tie.lilypond",
          "match": "~"
        },
        {
          "name": "storage.type.breath-mark.lilypond",
          "match": "(\\\\)breathe",
          "captures": {
            "1": { "name": "punctuation.definition.function.lilypond" }
          }
        }
      ]
    },
    "n_articulations": {
      "patterns": [
        {
          "name": "storage.modifier.articulation.accent.lilypond",
          "match": "(?x)\n  ([_^-])\n  (?:[.>^+|_-])"
        },
        {
          "name": "storage.modifier.articulation.named.lilypond",
          "match": "(?x)\n  (\\\\)\n  (?: accent | markato | staccatissimo |\n      espressivo | staccato | tenuto | portato |\n      (?:up|down)bow | flageolet | thumb |\n      [lr](?:heel|toe) | open | stopped |\n      (?:reverse)?turn | trill |\n      prall(?: prall | mordent | down | up)? |\n      (?: up | down | line ) prall |\n      (?: up | down )? mordent |\n      signumcongruentiae |\n      (?: (?:very)? long | short)?fermata(Markup)? |\n      segno | (?:var)?coda\n  )",
          "captures": {
            "1": { "name": "punctuation.definition.function.lilypond" }
          }
        },
        {
          "name": "storage.modifier.articulation.dynamics.lilypond",
          "match": "(?x)\n  (\\\\)\n  (?:\n      p{1,5} | m[pf] | f{1,4} | fp |\n      [sr]fz | sff? | spp? |\n      < | > | ! | espressivo\n  )"
        },
        {
          "name": "storage.modifier.beam.lilypond",
          "match": "\\[|\\]"
        },
        {
          "name": "storage.modifier.slur.lilypond",
          "match": "\\(|\\)"
        },
        {
          "name": "storage.modifier.slur.phrasing.lilypond",
          "match": "\\\\\\(|\\\\\\)"
        }
      ]
    }
  }
}
