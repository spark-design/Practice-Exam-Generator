import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export async function addSampleQuestions() {
  const sampleQuestions = [
    {
      question: "What is the capital of France?",
      optionA: "London",
      optionB: "Berlin",
      optionC: "Paris",
      optionD: "Madrid",
      correctAnswer: "C"
    },
    {
      question: "Which planet is known as the Red Planet?",
      optionA: "Venus",
      optionB: "Mars",
      optionC: "Jupiter",
      optionD: "Saturn",
      correctAnswer: "B"
    },
    {
      question: "What is 2 + 2?",
      optionA: "3",
      optionB: "4",
      optionC: "5",
      optionD: "6",
      correctAnswer: "B"
    }
  ];

  for (const question of sampleQuestions) {
    try {
      await client.models.Question.create(question);
      console.log('Added question:', question.question);
    } catch (error) {
      console.error('Error adding question:', error);
    }
  }
}