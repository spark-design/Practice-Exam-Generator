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
  selectedAnswers = new Set<string>();
  score = 0;
  showResult = false;
  quizCompleted = false;
  showQuiz = false;

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
    if (this.isMultiSelect) {
      if (this.selectedAnswers.has(option)) {
        this.selectedAnswers.delete(option);
      } else {
        this.selectedAnswers.add(option);
      }
    } else {
      this.selectedAnswers.clear();
      this.selectedAnswers.add(option);
    }
  }

  submitAnswer() {
    if (this.selectedAnswers.size === 0) return;
    
    const correctAnswers = new Set(this.questions[this.currentQuestionIndex].correctAnswer.split(''));
    const isCorrect = this.selectedAnswers.size === correctAnswers.size && 
                     [...this.selectedAnswers].every(answer => correctAnswers.has(answer));
    
    if (isCorrect) {
      this.score++;
    }
    
    this.showResult = true;
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.selectedAnswers.clear();
    this.showResult = false;
    
    if (this.currentQuestionIndex >= this.questions.length) {
      this.quizCompleted = true;
    }
  }

  restartQuiz() {
    this.currentQuestionIndex = 0;
    this.selectedAnswers.clear();
    this.score = 0;
    this.showResult = false;
    this.quizCompleted = false;
  }

  startQuiz() {
    this.showQuiz = true;
  }

  backToMain() {
    this.showQuiz = false;
    this.showBulkImport = false;
    this.showManageQuestions = false;
    this.selectedQuestions.clear();
    this.expandedQuestions.clear();
    this.restartQuiz();
  }

  showBulkImportForm() {
    this.showBulkImport = true;
  }

  showManageQuestionsForm() {
    this.showManageQuestions = true;
  }



  async importBulkQuestions() {
    if (!this.bulkQuestions.trim()) return;
    
    const questions = this.parseBulkQuestions(this.bulkQuestions);
    console.log(`Parsed ${questions.length} questions from input`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const question of questions) {
      try {
        await client.models.Question.create(question);
        successCount++;
      } catch (error) {
        console.error('Error adding question:', error);
        errorCount++;
      }
    }
    
    console.log(`Successfully added ${successCount} questions, ${errorCount} errors`);
    alert(`Added ${successCount} questions successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    
    this.bulkQuestions = '';
    this.showBulkImport = false;
  }

  parseBulkQuestions(text: string) {
    const questions = [];
    const lines = text.split('\n').map(line => line.trim());
    console.log(`Processing ${lines.length} lines of input`);
    
    let i = 0;
    let questionCount = 0;
    
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
        } else {
          console.warn(`Missing option ${optionLetter} at line ${i + 1}`);
          break;
        }
      }
      
      // Read correct answer (can be multiple letters like AC, BD, etc.)
      let correctAnswer = '';
      if (i < lines.length && lines[i].match(/^[ABCD]+$/)) {
        correctAnswer = lines[i];
        i++;
      } else {
        console.warn(`Missing or invalid answer at line ${i + 1}: "${lines[i]}"`);
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
        questionCount++;
      } else {
        console.warn(`Skipped invalid question ${questionCount + 1}:`, {
          questionLines: questionLines.length,
          options,
          correctAnswer
        });
      }
    }
    
    console.log(`Successfully parsed ${questions.length} valid questions`);
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

  selectAllQuestions() {
    if (this.selectedQuestions.size === this.questions.length) {
      this.selectedQuestions.clear();
    } else {
      this.questions.forEach(q => this.selectedQuestions.add(q.id));
    }
  }

  get allQuestionsSelected(): boolean {
    return this.questions.length > 0 && this.selectedQuestions.size === this.questions.length;
  }

  get currentQuestion() {
    return this.questions[this.currentQuestionIndex];
  }

  get isCorrect() {
    const correctAnswers = new Set(this.currentQuestion?.correctAnswer.split('') || []);
    return this.selectedAnswers.size === correctAnswers.size && 
           [...this.selectedAnswers].every(answer => correctAnswers.has(answer));
  }

  get isMultiSelect() {
    return this.currentQuestion?.correctAnswer.length > 1;
  }

  isAnswerSelected(option: string): boolean {
    return this.selectedAnswers.has(option);
  }

  async loadSampleQuestions() {
    await addSampleQuestions();
    this.loadQuestions();
  }
}