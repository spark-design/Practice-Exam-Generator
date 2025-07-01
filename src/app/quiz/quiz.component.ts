import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { addSampleQuestions } from './sample-questions';

const client = generateClient<Schema>();

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css',
})
export class QuizComponent implements OnInit {
  questions: any[] = [];
  currentQuestionIndex = 0;
  selectedAnswer = '';
  score = 0;
  showResult = false;
  quizCompleted = false;
  showQuiz = false;
  showAddQuestion = false;
  newQuestion = {
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A'
  };
  bulkQuestions = '';
  showBulkImport = false;
  showManageQuestions = false;
  selectedQuestions = new Set<string>();
  expandedQuestions = new Set<string>();

  ngOnInit(): void {
    this.loadQuestions();
  }

  loadQuestions() {
    try {
      client.models.Question.observeQuery().subscribe({
        next: ({ items }) => {
          this.questions = items;
        },
      });
    } catch (error) {
      console.error('error fetching questions', error);
    }
  }

  selectAnswer(option: string) {
    this.selectedAnswer = option;
  }

  submitAnswer() {
    if (!this.selectedAnswer) return;
    
    if (this.selectedAnswer === this.questions[this.currentQuestionIndex].correctAnswer) {
      this.score++;
    }
    
    this.showResult = true;
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.selectedAnswer = '';
    this.showResult = false;
    
    if (this.currentQuestionIndex >= this.questions.length) {
      this.quizCompleted = true;
    }
  }

  restartQuiz() {
    this.currentQuestionIndex = 0;
    this.selectedAnswer = '';
    this.score = 0;
    this.showResult = false;
    this.quizCompleted = false;
  }

  startQuiz() {
    this.showQuiz = true;
  }

  backToMain() {
    this.showQuiz = false;
    this.showAddQuestion = false;
    this.showBulkImport = false;
    this.showManageQuestions = false;
    this.selectedQuestions.clear();
    this.expandedQuestions.clear();
    this.restartQuiz();
  }

  showAddQuestionForm() {
    this.showAddQuestion = true;
  }

  showBulkImportForm() {
    this.showBulkImport = true;
  }

  showManageQuestionsForm() {
    this.showManageQuestions = true;
  }

  async addQuestion() {
    if (!this.newQuestion.question.trim()) return;
    
    try {
      await client.models.Question.create(this.newQuestion);
      this.newQuestion = {
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A'
      };
      this.showAddQuestion = false;
    } catch (error) {
      console.error('Error adding question:', error);
    }
  }

  async importBulkQuestions() {
    if (!this.bulkQuestions.trim()) return;
    
    const questions = this.parseBulkQuestions(this.bulkQuestions);
    
    for (const question of questions) {
      try {
        await client.models.Question.create(question);
      } catch (error) {
        console.error('Error adding question:', error);
      }
    }
    
    this.bulkQuestions = '';
    this.showBulkImport = false;
  }

  parseBulkQuestions(text: string) {
    const questions = [];
    const lines = text.split('\n').map(line => line.trim());
    
    let i = 0;
    while (i < lines.length) {
      const questionLines = [];
      const options = { A: '', B: '', C: '', D: '' };
      
      // Read question text until we hit option A
      while (i < lines.length && !lines[i].match(/^A\. /)) {
        if (lines[i]) questionLines.push(lines[i]);
        i++;
      }
      
      // Read options A, B, C, D
      for (const optionLetter of ['A', 'B', 'C', 'D']) {
        if (i < lines.length && lines[i].startsWith(`${optionLetter}. `)) {
          options[optionLetter as 'A'|'B'|'C'|'D'] = lines[i].substring(3);
          i++;
        }
      }
      
      // Read correct answer
      let correctAnswer = '';
      if (i < lines.length && lines[i].match(/^[ABCD]$/)) {
        correctAnswer = lines[i];
        i++;
      }
      
      // Skip empty lines
      while (i < lines.length && !lines[i]) {
        i++;
      }
      
      // Add question if valid
      if (questionLines.length > 0 && options.A && options.B && options.C && options.D && correctAnswer) {
        questions.push({
          question: questionLines.join(' '),
          optionA: options.A,
          optionB: options.B,
          optionC: options.C,
          optionD: options.D,
          correctAnswer
        });
      }
    }
    
    return questions;
  }

  toggleQuestionSelection(questionId: string) {
    if (this.selectedQuestions.has(questionId)) {
      this.selectedQuestions.delete(questionId);
    } else {
      this.selectedQuestions.add(questionId);
    }
  }

  toggleQuestionExpansion(questionId: string) {
    if (this.expandedQuestions.has(questionId)) {
      this.expandedQuestions.delete(questionId);
    } else {
      this.expandedQuestions.add(questionId);
    }
  }

  async deleteSelectedQuestions() {
    if (this.selectedQuestions.size === 0) return;
    
    for (const questionId of this.selectedQuestions) {
      try {
        await client.models.Question.delete({ id: questionId });
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
    
    this.selectedQuestions.clear();
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedQuestions.has(questionId);
  }

  isQuestionExpanded(questionId: string): boolean {
    return this.expandedQuestions.has(questionId);
  }

  get currentQuestion() {
    return this.questions[this.currentQuestionIndex];
  }

  get isCorrect() {
    return this.selectedAnswer === this.currentQuestion?.correctAnswer;
  }

  async loadSampleQuestions() {
    await addSampleQuestions();
    this.loadQuestions();
  }
}