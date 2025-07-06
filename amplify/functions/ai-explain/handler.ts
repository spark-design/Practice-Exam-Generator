import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

export const handler = async (event: any) => {
  try {
    const { question, options, correctAnswer, userAnswer, isCorrect } = JSON.parse(event.body);
    
    const prompt = isCorrect 
      ? `Explain why the correct answer "${correctAnswer}" is right for this question: "${question}". Options: ${options}`
      : `Explain why "${userAnswer}" is wrong and why "${correctAnswer}" is the correct answer for this question: "${question}". Options: ${options}`;

    const input = {
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    };

    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({
        explanation: responseBody.content[0].text
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};