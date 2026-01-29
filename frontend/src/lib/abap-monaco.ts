"use client";

import type * as Monaco from "monaco-editor";

/**
 * Register ABAP language support with the given Monaco instance.
 * Pure Monarch tokenizer — no external dependencies.
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
