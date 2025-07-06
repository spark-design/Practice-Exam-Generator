import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';


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
  randomizedQuestions: any[] = [];
  currentQuestionIndex = 0;
  selectedAnswers = new Set<string>();
  score = 0;
  answeredCount = 0;
  showResult = false;
  quizCompleted = false;
  showQuiz = false;
  
  // Track answers and results for each question
  questionAnswers = new Map<number, Set<string>>();
  questionResults = new Map<number, { isCorrect: boolean; submitted: boolean }>();

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
    
    const correctAnswers = new Set(this.randomizedQuestions[this.currentQuestionIndex].correctAnswer.split(''));
    const isCorrect = this.selectedAnswers.size === correctAnswers.size && 
                     [...this.selectedAnswers].every(answer => correctAnswers.has(answer));
    
    // Store the answer and result for this question
    this.questionAnswers.set(this.currentQuestionIndex, new Set(this.selectedAnswers));
    this.questionResults.set(this.currentQuestionIndex, { isCorrect, submitted: true });
    
    if (isCorrect) {
      this.score++;
    }
    
    this.answeredCount++;
    this.showResult = true;
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.loadQuestionState();
    
    if (this.currentQuestionIndex >= this.randomizedQuestions.length) {
      this.quizCompleted = true;
    }
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.loadQuestionState();
    }
  }

  goToQuestion(index: number) {
    if (index >= 0 && index < this.randomizedQuestions.length) {
      this.currentQuestionIndex = index;
      this.loadQuestionState();
    }
  }

  restartQuiz() {
    this.currentQuestionIndex = 0;
    this.selectedAnswers.clear();
    this.score = 0;
    this.answeredCount = 0;
    this.showResult = false;
    this.quizCompleted = false;
    this.questionAnswers.clear();
    this.questionResults.clear();
  }

  startQuiz() {
    this.randomizeQuestions();
    this.showQuiz = true;
    this.loadQuestionState();
  }

  randomizeQuestions() {
    // Add original index to each question
    const questionsWithIndex = this.questions.map((q, index) => ({
      ...q,
      originalNumber: index + 1
    }));
    
    // Shuffle the array
    this.randomizedQuestions = [...questionsWithIndex].sort(() => Math.random() - 0.5);
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
    let questionNumber = 0;
    
    while (i < lines.length) {
      // Look for question start (Q followed by number and dot)
      if (!lines[i] || !lines[i].match(/^Q\d+\./)) {
        i++;
        continue;
      }
      
      questionNumber++;
      const startLine = i;
      console.log(`\n=== Processing Question ${questionNumber} starting at line ${i + 1}: ${lines[i].substring(0, 50)}... ===`);
      
      const questionLines = [];
      const options = { A: '', B: '', C: '', D: '', E: '', F: '' };
      
      // Read question text until we hit option A
      while (i < lines.length && !lines[i].match(/^A\. /)) {
        if (lines[i]) {
          questionLines.push(lines[i]);
          console.log(`  Question line ${i + 1}: ${lines[i].substring(0, 80)}...`);
        }
        i++;
      }
      console.log(`  Found ${questionLines.length} question lines, now at line ${i + 1}`);
      
      // Read options A, B, C, D, E, F (some questions have up to 6 options)
      for (const optionLetter of ['A', 'B', 'C', 'D', 'E', 'F']) {
        if (i < lines.length && lines[i].startsWith(`${optionLetter}. `)) {
          // Clean option text by removing extra annotations like "Most Voted", "Show Suggested Answer"
          let optionText = lines[i].substring(3);
          optionText = optionText.replace(/\s+(Most Voted|Show Suggested Answer)\s*$/i, '').trim();
          options[optionLetter as 'A'|'B'|'C'|'D'|'E'|'F'] = optionText;
          console.log(`  Option ${optionLetter} at line ${i + 1}: ${optionText.substring(0, 50)}...`);
          i++;
        } else if (optionLetter === 'E' || optionLetter === 'F') {
          // Options E and F are optional, don't warn if missing
          console.log(`  Optional option ${optionLetter} not found, stopping option search`);
          break;
        } else {
          console.warn(`  Missing required option ${optionLetter} at line ${i + 1}: "${lines[i]}"`);
          break;
        }
      }
      console.log(`  Finished reading options, now at line ${i + 1}`);
      
      // Read correct answer (can be multiple letters like AC, BD, etc.)
      let correctAnswer = '';
      
      console.log(`  Looking for answer starting at line ${i + 1}`);
      
      // Skip any empty lines or lines with extra text
      while (i < lines.length && (!lines[i] || lines[i].match(/^(Show Suggested Answer|Most Voted)\s*$/i))) {
        console.log(`  Skipping line ${i + 1}: "${lines[i]}"`);
        i++;
      }
      
      if (i < lines.length) {
        const answerLine = lines[i].trim();
        console.log(`  Checking potential answer line ${i + 1}: "${answerLine}"`);
        
        if (answerLine.match(/^[ABCDEF]+$/)) {
          correctAnswer = answerLine;
          console.log(`  ✅ Found valid answer: "${correctAnswer}" (${correctAnswer.length > 1 ? 'multi-select' : 'single'})`);
          i++;
        } else {
          console.warn(`  ⚠️ Invalid answer format: "${answerLine}"`);
          // Try to extract valid answer from the line if it contains other text
          const match = answerLine.match(/^([ABCDEF]+)/); 
          if (match) {
            correctAnswer = match[1];
            console.log(`  ✅ Extracted answer from mixed content: "${correctAnswer}"`);
            i++;
          } else {
            console.error(`  ❌ Could not extract valid answer from: "${answerLine}"`);
          }
        }
      } else {
        console.error(`  ❌ No answer found after options (reached end of input)`);
      }
      
      // Skip empty lines and any remaining annotation text
      while (i < lines.length && (!lines[i] || lines[i].match(/^(Show Suggested Answer|Most Voted|\s*)$/i))) {
        i++;
      }
      
      // Add question if valid (E and F are optional)
      const isValid = questionLines.length > 0 && options.A && options.B && options.C && options.D && correctAnswer;
      
      if (isValid) {
        // Remove the Q number from the first line to get clean question text
        const cleanQuestion = questionLines[0].replace(/^Q\d+\.\s*/, '') + 
                             (questionLines.length > 1 ? ' ' + questionLines.slice(1).join(' ') : '');
        
        const questionData: any = {
          question: cleanQuestion,
          optionA: options.A,
          optionB: options.B,
          optionC: options.C,
          optionD: options.D,
          correctAnswer
        };
        
        // Add optional options E and F if they exist
        if (options.E) {
          questionData.optionE = options.E;
        }
        if (options.F) {
          questionData.optionF = options.F;
        }
        
        questions.push(questionData);
        console.log(`✅ Successfully added Question ${questionNumber} with answer: ${correctAnswer}`);
      } else {
        console.error(`❌ SKIPPED Question ${questionNumber} (lines ${startLine + 1}-${i}):`);
        console.error(`  - Question text: ${questionLines.length > 0 ? 'YES' : 'NO'} (${questionLines.length} lines)`);
        console.error(`  - Option A: ${options.A ? 'YES' : 'NO'} - "${options.A}"`);
        console.error(`  - Option B: ${options.B ? 'YES' : 'NO'} - "${options.B}"`);
        console.error(`  - Option C: ${options.C ? 'YES' : 'NO'} - "${options.C}"`);
        console.error(`  - Option D: ${options.D ? 'YES' : 'NO'} - "${options.D}"`);
        console.error(`  - Option E: ${options.E ? 'YES' : 'NO'} - "${options.E}"`);
        console.error(`  - Option F: ${options.F ? 'YES' : 'NO'} - "${options.F}"`);
        console.error(`  - Answer: ${correctAnswer ? 'YES' : 'NO'} - "${correctAnswer}"`);
        console.error(`  - Raw question lines:`, questionLines);
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
    return this.randomizedQuestions[this.currentQuestionIndex];
  }

  get isCorrect() {
    const correctAnswers = new Set(this.currentQuestion?.correctAnswer.split('') || []);
    return this.selectedAnswers.size === correctAnswers.size && 
           [...this.selectedAnswers].every(answer => correctAnswers.has(answer));
  }

  getCorrectAnswerText(): string {
    if (!this.currentQuestion) return '';
    
    const correctLetters = this.currentQuestion.correctAnswer.split('');
    const answerTexts = correctLetters.map((letter: string) => {
      const optionKey = `option${letter}` as keyof typeof this.currentQuestion;
      return `${letter}) ${this.currentQuestion[optionKey]}`;
    });
    
    return `The correct answer is: ${this.currentQuestion.correctAnswer} - ${answerTexts.join(' AND ')}`;
  }

  get isMultiSelect() {
    return this.currentQuestion?.correctAnswer.length > 1;
  }

  get canGoPrevious() {
    return this.currentQuestionIndex > 0;
  }

  isAnswerSelected(option: string): boolean {
    return this.selectedAnswers.has(option);
  }
  
  loadQuestionState() {
    // Load saved answers for current question
    const savedAnswers = this.questionAnswers.get(this.currentQuestionIndex);
    if (savedAnswers) {
      this.selectedAnswers = new Set(savedAnswers);
    } else {
      this.selectedAnswers.clear();
    }
    
    // Load result state
    const result = this.questionResults.get(this.currentQuestionIndex);
    this.showResult = result?.submitted || false;
  }
  
  isQuestionAnswered(questionIndex: number): boolean {
    return this.questionResults.has(questionIndex);
  }
  
  isQuestionCorrect(questionIndex: number): boolean {
    const result = this.questionResults.get(questionIndex);
    return result?.isCorrect || false;
  }
  
  getAnswerClass(option: string): string {
    if (!this.showResult) return '';
    
    const correctAnswers = this.currentQuestion?.correctAnswer.split('') || [];
    const isCorrectAnswer = correctAnswers.includes(option);
    const isSelectedAnswer = this.selectedAnswers.has(option);
    
    if (isSelectedAnswer && isCorrectAnswer) {
      return 'correct-selected';
    } else if (isSelectedAnswer && !isCorrectAnswer) {
      return 'incorrect-selected';
    } else if (!isSelectedAnswer && isCorrectAnswer) {
      return 'correct-unselected';
    }
    
    return '';
  }


}