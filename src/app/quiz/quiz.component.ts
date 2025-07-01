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
    this.restartQuiz();
  }

  showAddQuestionForm() {
    this.showAddQuestion = true;
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