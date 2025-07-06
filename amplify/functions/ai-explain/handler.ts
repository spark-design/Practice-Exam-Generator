export const handler = async (event: any) => {
  try {
    const { question, options, correctAnswer, userAnswer, isCorrect } = event;
    
    const prompt = isCorrect 
      ? `Explain why the correct answer "${correctAnswer}" is right for this question: "${question}". Options: ${options}`
      : `Explain why "${userAnswer}" is wrong and why "${correctAnswer}" is the correct answer for this question: "${question}". Options: ${options}`;

    // For now, return a simple explanation until Bedrock is properly configured
    const explanation = isCorrect
      ? `Great job! You selected the correct answer (${correctAnswer}). This demonstrates your understanding of the concept.`
      : `You selected ${userAnswer}, but the correct answer is ${correctAnswer}. Review the question and options to understand why ${correctAnswer} is the better choice.`;
    
    return {
      explanation
    };
  } catch (error: any) {
    throw new Error(`AI explanation failed: ${error.message}`);
  }
};