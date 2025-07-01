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
    this.restartQuiz();
  }

  showAddQuestionForm() {
    this.showAddQuestion = true;
  }

  showBulkImportForm() {
    this.showBulkImport = true;
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
    const blocks = text.split(/\n\s*\n/).filter(block => block.trim());
    
    for (const block of blocks) {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length < 6) continue;
      
      const answerLine = lines[lines.length - 1];
      const correctAnswer = answerLine.match(/^[ABCD]$/)?.[0];
      
      if (!correctAnswer) continue;
      
      const questionLines = [];
      const options = { A: '', B: '', C: '', D: '' };
      let foundOptions = false;
      
      for (const line of lines.slice(0, -1)) {
        const optionMatch = line.match(/^([ABCD])\. (.+)$/);
        if (optionMatch) {
          foundOptions = true;
          options[optionMatch[1] as 'A'|'B'|'C'|'D'] = optionMatch[2];
        } else if (!foundOptions) {
          questionLines.push(line);
        }
      }
      
      if (options.A && options.B && options.C && options.D) {
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