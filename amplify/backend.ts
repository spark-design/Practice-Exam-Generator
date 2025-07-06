import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { aiExplain } from './functions/ai-explain/resource';

const backend = defineBackend({
  auth,
  data,
  aiExplain
});

backend.aiExplain.addToRolePolicy({
  Effect: 'Allow',
  Action: 'bedrock:InvokeModel',
  Resource: 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0'
});
