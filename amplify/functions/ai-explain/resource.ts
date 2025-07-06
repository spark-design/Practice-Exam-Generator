import { defineFunction } from '@aws-amplify/backend';

export const aiExplain = defineFunction({
  name: 'ai-explain',
  entry: './handler.ts'
});