/**
 * Python Code Editor for Utsav's Python Learning Hub
 * Integrates ACE editor with Skulpt for in-browser Python execution
 */

class PythonEditor {
    constructor(editorId = 'editor', outputId = 'output') {
        this.editorId = editorId;
        this.outputId = outputId;
        this.editor = null;
        this.defaultCode = `print('Hello, Python!')
name = 'Utsav'
print('Welcome, ' + name)

# Try: change variables, loops, functions!`;
        this.savedCode = localStorage.getItem('savedCode') || this.defaultCode;
        this.snippets = JSON.parse(localStorage.getItem('codeSnippets')) || {};
    }

    /**
     * Initialize the editor
     */
    init() {
        if (!window.ace) {
            console.error('ACE editor not loaded');
            return;
        }

        // Initialize ACE editor
        this.editor = ace.edit(this.editorId);
        this.editor.setTheme("ace/theme/monokai");
        this.editor.session.setMode("ace/mode/python");
        this.editor.setValue(this.savedCode);
        this.editor.clearSelection();

        // Set up event listeners
        document.getElementById('run-code')?.addEventListener('click', () => this.runCode());
        document.getElementById('reset-code')?.addEventListener('click', () => this.resetCode());
        document.getElementById('show-answer')?.addEventListener('click', () => this.showAnswer());
        
        // Add save/load snippet UI if container exists
        const editorContainer = document.getElementById(this.editorId).parentElement;
        if (editorContainer) {
            this.addSnippetControls(editorContainer);
        }

        // Auto-save code changes
        this.editor.session.on('change', () => {
            localStorage.setItem('savedCode', this.editor.getValue());
        });

        console.log('Python editor initialized');
    }

    /**
     * Run the Python code using Skulpt
     */
    runCode() {
        const output = document.getElementById(this.outputId);
        output.innerHTML = '';
        output.classList.add('running');
        
        const code = this.editor.getValue();
        
        function outf(text) {
            output.innerHTML += text;
        }
        
        function builtinRead(x) {
            if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
                throw "File not found: '" + x + "'";
            return Sk.builtinFiles["files"][x];
        }
        
        Sk.configure({
            output: outf,
            read: builtinRead,
            __future__: Sk.python3,
            execLimit: 5000 // Prevent infinite loops
        });
        
        try {
            Sk.importMainWithBody("<stdin>", false, code, true);
        } catch (e) {
            output.innerHTML += `<span style="color: #ff6b6b">${e.toString()}</span>`;
        }
        
        setTimeout(() => {
            output.classList.remove('running');
        }, 1500);
    }

    /**
     * Reset the editor to default code
     */
    resetCode() {
        if (confirm('Reset the editor to default code? Your changes will be lost.')) {
            this.editor.setValue(this.defaultCode);
            this.editor.clearSelection();
            localStorage.setItem('savedCode', this.defaultCode);
        }
    }

    /**
     * Show the answer for the current lesson
     */
    showAnswer() {
        // Get the current lesson ID from URL or data attribute
        const lessonId = this.getCurrentLessonId();
        if (!lessonId) {
            alert('No lesson selected');
            return;
        }
        
        // Fetch the answer code from the module data
        fetch('assets/data/modules.json')
            .then(response => response.json())
            .then(data => {
                let answerCode = null;
                
                // Find the lesson in modules
                data.modules.forEach(module => {
                    module.lessons.forEach(lesson => {
                        if (lesson.id === lessonId && lesson.codeExample) {
                            answerCode = lesson.codeExample;
                        }
                    });
                });
                
                if (answerCode) {
                    if (confirm('Show the example solution? This will replace your current code.')) {
                        this.editor.setValue(answerCode);
                        this.editor.clearSelection();
                    }
                } else {
                    alert('No example solution available for this lesson');
                }
            })
            .catch(error => {
                console.error('Error fetching answer:', error);
                alert('Failed to load example solution');
            });
    }

    /**
     * Get the current lesson ID
     * @returns {string|null} The current lesson ID or null
     */
    getCurrentLessonId() {
        // Try to get from URL hash
        const hash = window.location.hash.substring(1);
        if (hash && hash.startsWith('lesson-')) {
            return hash.replace('lesson-', '');
        }
        
        // Try to get from data attribute
        const lessonTitle = document.getElementById('lesson-title');
        if (lessonTitle && lessonTitle.dataset.lessonId) {
            return lessonTitle.dataset.lessonId;
        }
        
        // Try to get from URL path in lesson pages
        const pathMatch = window.location.pathname.match(/\/lessons\/([^\/]+)\.html/);
        if (pathMatch && pathMatch[1]) {
            return pathMatch[1];
        }
        
        return null;
    }

    /**
     * Add snippet save/load controls to the editor
     * @param {HTMLElement} container - The container to add controls to
     */
    addSnippetControls(container) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'snippet-controls';
        controlsDiv.style.display = 'flex';
        controlsDiv.style.gap = '10px';
        controlsDiv.style.marginTop = '10px';
        
        // Create snippet name input
        const snippetNameInput = document.createElement('input');
        snippetNameInput.type = 'text';
        snippetNameInput.placeholder = 'Snippet name';
        snippetNameInput.className = 'snippet-name';
        snippetNameInput.style.padding = '8px';
        snippetNameInput.style.borderRadius = '8px';
        snippetNameInput.style.border = '1px solid rgba(124,156,255,.25)';
        snippetNameInput.style.background = 'rgba(18,25,56,.6)';
        snippetNameInput.style.color = 'var(--text)';
        
        // Create save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Snippet';
        saveButton.className = 'btn';
        saveButton.addEventListener('click', () => this.saveSnippet(snippetNameInput.value));
        
        // Create snippet select
        const snippetSelect = document.createElement('select');
        snippetSelect.className = 'btn';
        snippetSelect.style.padding = '8px 10px';
        this.populateSnippetSelect(snippetSelect);
        
        // Create load button
        const loadButton = document.createElement('button');
        loadButton.textContent = 'Load Snippet';
        loadButton.className = 'btn';
        loadButton.addEventListener('click', () => {
            const snippetName = snippetSelect.value;
            if (snippetName && this.snippets[snippetName]) {
                if (confirm(`Load snippet "${snippetName}"? This will replace your current code.`)) {
                    this.editor.setValue(this.snippets[snippetName]);
                    this.editor.clearSelection();
                }
            }
        });
        
        // Add controls to container
        controlsDiv.appendChild(snippetNameInput);
        controlsDiv.appendChild(saveButton);
        controlsDiv.appendChild(snippetSelect);
        controlsDiv.appendChild(loadButton);
        
        // Insert after the existing controls
        const existingControls = container.querySelector('[style*="display:flex; gap:10px; margin:10px 0"]');
        if (existingControls) {
            existingControls.after(controlsDiv);
        } else {
            container.appendChild(controlsDiv);
        }
    }

    /**
     * Populate the snippet select dropdown
     * @param {HTMLSelectElement} select - The select element to populate
     */
    populateSnippetSelect(select) {
        select.innerHTML = '<option value="">-- Select Snippet --</option>';
        
        Object.keys(this.snippets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    /**
     * Save the current code as a named snippet
     * @param {string} name - The name for the snippet
     */
    saveSnippet(name) {
        if (!name) {
            alert('Please enter a name for your snippet');
            return;
        }
        
        const code = this.editor.getValue();
        this.snippets[name] = code;
        localStorage.setItem('codeSnippets', JSON.stringify(this.snippets));
        
        // Update snippet select if it exists
        const select = document.querySelector('.snippet-controls select');
        if (select) {
            this.populateSnippetSelect(select);
            select.value = name;
        }
        
        alert(`Snippet "${name}" saved successfully!`);
    }
}

// Initialize the editor when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
        window.pythonEditor = new PythonEditor();
        window.pythonEditor.init();
    }
});