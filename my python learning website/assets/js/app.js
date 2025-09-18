/**
 * Safe bootstrapper for Utsav's Python Learning Hub.
 * This file intentionally avoids conflicting with the inline implementation in index.html.
 * If the inline app is present, this becomes a no-op. If not, it minimally wires up quiz and editors.
 */

(function () {
    // Guard: if inline app already initialized, do nothing
    if (window.learningHub || document.getElementById('main-content') == null) {
        return;
    }

    function initEditorsIfPresent() {
        if (!window.ace || typeof Sk === 'undefined') return;
        if (!window.mainEditor && document.getElementById('editor-main')) {
            try {
                window.mainEditor = new (window.PythonEditor || function () { })('editor-main', 'output-main');
                if (window.mainEditor && typeof window.mainEditor.init === 'function') {
                    window.mainEditor.init();
                }
            } catch (_) { }
        }
        if (!window.compilerEditor && document.getElementById('editor-compiler')) {
            try {
                window.compilerEditor = new (window.PythonEditor || function () { })('editor-compiler', 'output-compiler');
                if (window.compilerEditor && typeof window.compilerEditor.init === 'function') {
                    window.compilerEditor.init();
                }
            } catch (_) { }
        }
    }

    function initQuizIfPresent() {
        if (!window.quizSystem && document.getElementById('quiz-body')) {
            try {
                fetch('assets/data/quizzes.json')
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        window.quizSystem = {
                            quizzes: (data && data.quizzes) ? data.quizzes.reduce(function (acc, q) { acc[q.id] = q; return acc; }, {}) : {},
                            getHighestScore: function () { return 0; }
                        };
                    })
                    .catch(function () { /* ignore */ });
            } catch (_) { }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initEditorsIfPresent();
        initQuizIfPresent();
    });
})();



