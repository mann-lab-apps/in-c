# Studio R3 Implementation Contract

Base HEAD: `827ad18203e673b1e923d00cbcf0fd7f3af755d7`, original `in-c` worktree. R2 implementation is already dirty and must remain intact. Its starting sources were copied to `out/ddirori/studio-r3-baseline` for an R3-only comparison; the copied test source has a `.snapshot` suffix so Vitest does not collect it.

R3 design manifest SHA256: `a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36`. Initial revision check differs only in concurrent Play/Score `main.dart` files. Studio matches the R3 recorded source. Historical R1/R2/R3 manifests and captures are not rewritten.

| Acceptance | Evidence required |
| --- | --- |
| R3-T01 creation | Actual start screen, full existing wizard/templates, cancellation and dirty replacement protection |
| First note | Existing N/A-G input and actual score commands, undo/redo; no one-note demo command |
| First save | Native `.chromatics` snapshot with real notes, current generation/snapshot only; no celebration for cancel/failure/empty/XML/PDF/recovery request |
| Async | New edits remain dirty; late results cannot target a new document; save/reopen preserves the score |
| Wizard | Local composition, global shortcut containment, invalid handling and focus return using actual Dialog |
| R3-J01 | Real PDF export success, then a manual desktop-to-mobile/Score import guide; source/receiver outcomes kept separate |
| Output boundary | Project, MusicXML copy, PDF and recovery snapshot remain separate; PDF cannot clean project history |
| UI | 960/1400, light/dark, measured text200%, fine32/coarse48, keyboard and actual screenshots |
| Gates | Product-only, root-wide, shared-native and Node tests reported separately; no hidden baseline rewrite |

Scope excludes engine/schema/bridge replacement, new deep links/sync, other worktrees, shared API changes and desktop-unrelated iOS metadata. Real disk QA uses an isolated temporary directory and production renderer/preload with controlled IPC file destinations; OS dialogs and actual Score/mobile receipt remain separate manual checks.
