"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageStillLoadingError = exports.UnsupportedLanguageError = void 0;
class UnsupportedLanguageError extends Error {
    constructor(language) {
        super(`Language '${language}' not supported by parse tree extension.  See https://github.com/pokey/vscode-parse-tree#adding-a-new-language`);
        this.name = "UnsupportedLanguageError";
    }
}
exports.UnsupportedLanguageError = UnsupportedLanguageError;
class LanguageStillLoadingError extends Error {
    constructor(language) {
        super(`Language '${language}' is still loading; please wait and try again`);
        this.name = "LanguageStillLoadingError";
    }
}
exports.LanguageStillLoadingError = LanguageStillLoadingError;
//# sourceMappingURL=errors.js.map