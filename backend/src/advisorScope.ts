export const ADVISOR_OUT_OF_SCOPE_REPLY = "I can only help with FinPilot AI's features and your personal financial data. Ask me about your expenses, budgets, savings, goals, assets, liabilities, or net worth.";

const FINANCIAL_TOPICS = /\b(transactions?|income|salary|expenses?|spend(?:ing)?|cash flow|sav(?:e|ing|ings)|overspend(?:ing)?|budgets?|goals?|assets?|liabilities|debts?|net worth|financial(?:ly| condition| health| situation| summary| status)?|finances|money|funds|forecast|insights?|recurring payments?|emi|emergency fund|afford(?:able)?)\b/i;
const APP_FEATURES = /\b(finpilot(?: ai)?|dashboard|overview|transactions?|budgets?|goals?|forecast|insights?|assets?|liabilities|settings|demo mode|csv(?: import)?|advisor|chat)\b/i;
const APP_USAGE_INTENT = /\b(how (?:do|can|should|would) i|how does|how can i|where (?:do|can) i|where is|how to|help me|show me how|what can i do|how .* work|how .* use|add|edit|create|delete|change|find|open|use)\b/i;
const PERSONAL_CONTEXT = /\b(my|mine|me|i|our|ours|account|recorded|in this app|in finpilot|in the dashboard|this month|last month|this year|last year|monthly)\b/i;
const DATA_QUESTION_INTENT = /\b(what|where|when|which|how(?: much| many| is| are| does| do)?|am|is|are|can|have|show|give|tell|explain|recommend|suggest|summary|summari[sz](?:e|y)|analy[sz]e|compare|review|calculate|list|track|doing|progress|progressing|higher|lower|most|highest|total|current|recorded|remaining|left|spent|saved|sav(?:e|ing)|overspending|earn(?:ed|ing)?|paid|owe|value|balance|worth|afford|forecast)\b/i;
const CLEARLY_UNRELATED = /\b(docker|programming|code|coding|javascript|typescript|python|recipe|weather|sports?|movie|film|music|song|celebrity|capital of|write an essay|translate|joke|poem|video game)\b/i;

/**
 * Backend allowlist-style scope check. A question must clearly refer to the user's
 * financial records or to a FinPilot feature/help task; unknown topics are denied.
 */
export function isAdvisorQuestionInScope(question: string): boolean {
  const text = question.trim();
  if (!text || CLEARLY_UNRELATED.test(text)) return false;
  const financial = FINANCIAL_TOPICS.test(text);
  const feature = APP_FEATURES.test(text);
  if (!feature && !financial) return false;

  const appSpecific = /\b(finpilot(?: ai)?|this app|the app|the dashboard|this dashboard|demo mode|account page)\b/i.test(text);
  const helpIntent = APP_USAGE_INTENT.test(text);
  const personalReference = PERSONAL_CONTEXT.test(text);
  const questionIntent = DATA_QUESTION_INTENT.test(text);
  const broadFinancialStatus = /\b(?:how am i doing financially|financial condition|financial health|financial situation|summary of (?:my )?finances|how much money do i have|where did my money go|am i (?:saving|overspending)|can i afford (?:my )?budget)\b/i.test(text);
  const personalDataQuestion = financial && personalReference && questionIntent;
  const contextualMetricQuestion = financial && questionIntent && /\b(this month|last month|this year|last year|monthly|recorded|current|my|our|i|me|account)\b/i.test(text);
  const featureHelpQuestion = feature && helpIntent;
  const appFeatureQuestion = appSpecific && feature;
  return broadFinancialStatus || personalDataQuestion || contextualMetricQuestion || featureHelpQuestion || appFeatureQuestion;
}
