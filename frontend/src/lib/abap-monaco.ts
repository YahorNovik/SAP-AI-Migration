"use client";

import type * as Monaco from "monaco-editor";

/**
 * Register ABAP language support with the given Monaco instance.
 * Extracts the previously-duplicated Monarch tokenizer into a single shared location.
 */
export function registerAbapLanguage(monaco: typeof Monaco): void {
  if (monaco.languages.getLanguages().some((l) => l.id === "abap")) {
    return;
  }

  monaco.languages.register({ id: "abap" });

  monaco.languages.setMonarchTokensProvider("abap", {
    ignoreCase: true,
    tokenizer: {
      root: [
        [/^\*.*$/, "comment"],
        [/".*$/, "comment"],
        [
          /\b(REPORT|PROGRAM|DATA|TYPES|CONSTANTS|FIELD-SYMBOLS|CLASS|ENDCLASS|METHOD|ENDMETHOD|METHODS|INTERFACE|ENDINTERFACE|FORM|ENDFORM|PERFORM|FUNCTION|ENDFUNCTION|MODULE|ENDMODULE|IF|ELSE|ELSEIF|ENDIF|CASE|WHEN|ENDCASE|DO|ENDDO|WHILE|ENDWHILE|LOOP|ENDLOOP|AT|ENDAT|SELECT|ENDSELECT|INSERT|UPDATE|DELETE|MODIFY|INTO|FROM|WHERE|AND|OR|NOT|TABLE|RETURNING|IMPORTING|EXPORTING|CHANGING|VALUE|TYPE|REF|TO|LIKE|BEGIN|END|OF|WRITE|MOVE|CLEAR|FREE|APPEND|READ|SORT|DESCRIBE|CALL|RAISE|TRY|CATCH|ENDTRY|CLEANUP|CREATE|OBJECT|NEW|ABSTRACT|FINAL|PUBLIC|PRIVATE|PROTECTED|SECTION|DEFINITION|IMPLEMENTATION|INHERITING|REDEFINITION|RAISING|OPTIONAL|DEFAULT|RECEIVING|ABAP_TRUE|ABAP_FALSE|SY-SUBRC|AUTHORITY-CHECK|COMMIT|ROLLBACK|WORK|CONCATENATE|SPLIT|REPLACE|CONDENSE|TRANSLATE|ASSIGN|UNASSIGN|INITIAL|IS|SPACE|LINES|CORRESPONDING|MOVE-CORRESPONDING|INCLUDE|TABLES|USING|CHECK)\b/,
          "keyword",
        ],
        [/<\w+>/, "variable.name"],
        [/'[^']*'/, "string"],
        [/`[^`]*`/, "string"],
        [/\b\d+\b/, "number"],
      ],
    },
  });
}

/**
 * Enable abaplint-powered diagnostics on a Monaco editor model.
 * Lazily loads @abaplint/core (large bundle) on first call.
 * Fire-and-forget — failures are silently ignored.
 */
export async function enableAbapDiagnostics(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
): Promise<void> {
  try {
    const { Registry, MemoryFile, LanguageServer } = await import("@abaplint/core");

    const reg = new Registry();
    const filename = "source.prog.abap";
    reg.addFile(new MemoryFile(filename, model.getValue()));
    await reg.parseAsync();

    const ls = new LanguageServer(reg);
    const diagnostics = ls.diagnostics({ uri: filename });

    const markers: Monaco.editor.IMarkerData[] = diagnostics.map((d) => ({
      severity:
        d.severity === 1
          ? monaco.MarkerSeverity.Error
          : d.severity === 2
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      message: d.message,
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
    }));

    monaco.editor.setModelMarkers(model, "abaplint", markers);
  } catch {
    // Silently fail — diagnostics are an optional enhancement
  }
}
