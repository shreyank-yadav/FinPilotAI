import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADVISOR_OUT_OF_SCOPE_REPLY, isAdvisorQuestionInScope } from './advisorScope.js';

test('allows questions about authenticated personal financial records', () => {
  for (const question of [
    'Where did I spend the most this month?',
    'What is my current financial condition?',
    'How am I doing financially?',
    'Give me a summary of my finances.',
    'Am I saving or overspending?',
    'How much money do I have?',
    'What are my expenses?',
    'Where did my money go?',
    'Can I afford my budget?',
    'What is my net worth?',
    'How much income did I record this month?',
    'Show my budget progress',
    'Explain my budget',
    'How much can I save this month?',
    'How is my savings goal progressing?',
    'Summarize my assets and liabilities',
    'What does my cash-flow forecast show?',
  ]) assert.equal(isAdvisorQuestionInScope(question), true, question);
});

test('allows help with FinPilot features and workflows', () => {
  for (const question of [
    'How do I create a budget in FinPilot AI?',
    'Where can I find the forecast on the dashboard?',
    'How do I import a CSV in this app?',
    'What can I do on the Goals page?',
  ]) assert.equal(isAdvisorQuestionInScope(question), true, question);
});

test('denies unrelated, general-knowledge, coding, and entertainment questions', () => {
  for (const question of [
    'What is Docker?',
    'Explain Docker',
    'What is Python?',
    'Write a Python script that tracks expenses',
    'Tell me a joke about my budget',
    'Tell me a joke',
    'Who won the cricket match?',
    'What is the capital of France?',
  ]) assert.equal(isAdvisorQuestionInScope(question), false, question);
  assert.equal(ADVISOR_OUT_OF_SCOPE_REPLY, "I can only help with FinPilot AI's features and your personal financial data. Ask me about your expenses, budgets, savings, goals, assets, liabilities, or net worth.");
});
