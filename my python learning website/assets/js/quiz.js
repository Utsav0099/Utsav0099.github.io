/**
 * Quiz System for Utsav's Python Learning Hub
 * Handles loading, displaying, and scoring quizzes
 */

class QuizSystem {
    constructor() {
        this.quizzes = {};
        this.currentQuiz = null;
        this.currentQuizId = null;
        this.userAnswers = {};
        this.quizScores = JSON.parse(localStorage.getItem('quizScores')) || {};
        this.quizBody = document.getElementById('quiz-body');
    }

    /**
     * Initialize the quiz system
     */
    async init() {
        try {
            const response = await fetch('assets/data/quizzes.json');
            const data = await response.json();
            this.quizzes = data.quizzes.reduce((acc, quiz) => {
                acc[quiz.id] = quiz;
                return acc;
            }, {});
            console.log('Quiz system initialized with', Object.keys(this.quizzes).length, 'quizzes');
        } catch (error) {
            console.error('Failed to load quizzes:', error);
        }
    }

    /**
     * Load a quiz by ID
     * @param {string} quizId - The ID of the quiz to load
     */
    loadQuiz(quizId) {
        if (!this.quizzes[quizId]) {
            console.error('Quiz not found:', quizId);
            return;
        }

        this.currentQuiz = this.quizzes[quizId];
        this.currentQuizId = quizId;
        this.userAnswers = {};
        this.renderQuiz();
    }

    /**
     * Render the current quiz in the quiz body
     */
    renderQuiz() {
        if (!this.currentQuiz) {
            this.quizBody.innerHTML = '<p class="muted">Select a lesson to see related quiz questions.</p>';
            return;
        }

        let html = `
            <h3>${this.currentQuiz.title}</h3>
            <p>${this.currentQuiz.description}</p>
            <form id="quiz-form">
        `;

        this.currentQuiz.questions.forEach((question, index) => {
            html += `<div class="quiz-question">
                <p class="quiz-q">${index + 1}. ${question.question}</p>`;

            if (question.type === 'multiple-choice') {
                question.options.forEach((option, optIndex) => {
                    const id = `q${index}_opt${optIndex}`;
                    html += `
                        <div class="radio">
                            <input type="radio" id="${id}" name="q${index}" value="${optIndex}">
                            <label for="${id}">${option}</label>
                        </div>
                    `;
                });
            } else if (question.type === 'code') {
                html += `
                    <div class="code-editor-mini" id="code_q${index}">
                        <pre>${question.codeSnippet}</pre>
                    </div>
                    <textarea id="answer_q${index}" rows="3" class="code-answer" 
                        placeholder="Write your corrected code here...">${question.codeSnippet}</textarea>
                `;
            }

            html += `</div>`;
        });

        html += `
            <div style="margin-top:20px">
                <button type="button" class="btn primary" id="submit-quiz">Submit Answers</button>
                <button type="button" class="btn" id="reset-quiz">Reset</button>
            </div>
            </form>
            <div id="quiz-results" style="margin-top:15px;"></div>
        `;

        this.quizBody.innerHTML = html;

        // Set up event listeners
        document.getElementById('submit-quiz').addEventListener('click', () => this.submitQuiz());
        document.getElementById('reset-quiz').addEventListener('click', () => this.resetQuiz());

        // Initialize code editors if needed
        this.currentQuiz.questions.forEach((question, index) => {
            if (question.type === 'code') {
                // If using Ace editor for code questions:
                if (window.ace) {
                    const editor = ace.edit(`code_q${index}`);
                    editor.setTheme("ace/theme/monokai");
                    editor.session.setMode("ace/mode/python");
                    editor.setReadOnly(true);
                }
            }
        });
    }

    /**
     * Submit the quiz and calculate score
     */
    submitQuiz() {
        if (!this.currentQuiz) return;

        const form = document.getElementById('quiz-form');
        let correctAnswers = 0;
        let totalQuestions = this.currentQuiz.questions.length;
        let results = [];

        this.currentQuiz.questions.forEach((question, index) => {
            let userAnswer, isCorrect;

            if (question.type === 'multiple-choice') {
                const selectedOption = form.querySelector(`input[name="q${index}"]:checked`);
                userAnswer = selectedOption ? parseInt(selectedOption.value) : null;
                isCorrect = userAnswer === question.correctAnswer;
            } else if (question.type === 'code') {
                const codeAnswer = document.getElementById(`answer_q${index}`).value.trim();
                userAnswer = codeAnswer;
                // Simple string comparison - in a real app, you might want more sophisticated code evaluation
                isCorrect = codeAnswer === question.correctAnswer.trim();
            }

            this.userAnswers[question.id] = userAnswer;

            if (isCorrect) correctAnswers++;

            results.push({
                question: question.question,
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                explanation: question.explanation
            });
        });

        const score = Math.round((correctAnswers / totalQuestions) * 100);
        
        // Save the score
        if (!this.quizScores[this.currentQuizId] || score > this.quizScores[this.currentQuizId]) {
            this.quizScores[this.currentQuizId] = score;
            localStorage.setItem('quizScores', JSON.stringify(this.quizScores));
            
            // Update high score display if it exists
            const scoreElement = document.getElementById('kpi-score');
            if (scoreElement) {
                const highestScore = Math.max(...Object.values(this.quizScores));
                scoreElement.textContent = `${highestScore}%`;
            }
        }

        // Display results
        this.displayResults(results, score);
    }

    /**
     * Display quiz results
     * @param {Array} results - Array of question results
     * @param {number} score - Overall score percentage
     */
    displayResults(results, score) {
        const resultsDiv = document.getElementById('quiz-results');
        
        let html = `
            <div class="quiz-score ${score >= 70 ? 'success' : 'warning'}">
                <h3>Your Score: ${score}%</h3>
                <p>${score >= 70 ? 'Great job!' : 'Keep practicing!'}</p>
            </div>
            <div class="quiz-feedback">
        `;

        results.forEach((result, index) => {
            html += `
                <div class="quiz-result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                    <p><strong>Question ${index + 1}:</strong> ${result.question}</p>
                    <p>Your answer: ${result.userAnswer !== null ? result.userAnswer : 'Not answered'}</p>
                    ${!result.isCorrect ? `<p>Correct answer: ${result.correctAnswer}</p>` : ''}
                    <p><em>${result.explanation}</em></p>
                </div>
            `;
        });

        html += `</div>`;
        resultsDiv.innerHTML = html;
    }

    /**
     * Reset the current quiz
     */
    resetQuiz() {
        if (this.currentQuiz) {
            this.renderQuiz();
        }
    }

    /**
     * Get the highest quiz score
     * @returns {number} The highest quiz score percentage
     */
    getHighestScore() {
        if (Object.keys(this.quizScores).length === 0) return 0;
        return Math.max(...Object.values(this.quizScores));
    }
}

// Initialize quiz system when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizSystem = new QuizSystem();
    window.quizSystem.init();
});