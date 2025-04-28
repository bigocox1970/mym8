/**
 * Context Extractor
 * Extracts context from user and assistant messages to build user profile
 */

import { 
  addUserConversationHighlight, 
  addUserInterest, 
  addUserDislike, 
  updateUserPersonalInfo, 
  updateUserPreferences,
  PersonalInfoItem,
  UserPreference 
} from '@/lib/userProfileManager';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Personal info categories to extract
const PERSONAL_INFO_CATEGORIES = [
  'job', 'occupation', 'profession', 'career', 
  'family', 'children', 'kids', 'spouse', 'partner', 'wife', 'husband', 'married',
  'location', 'city', 'country', 'live', 'lives', 'living',
  'age', 'birthday', 'years old',
  'education', 'school', 'college', 'university', 'degree',
  'health', 'condition', 'diagnosis',
  'hobby', 'hobbies', 'passion',
  'name', 'call me', 'nickname', 'identity'
];

// Interest indicators
const INTEREST_INDICATORS = [
  'interested in', 'like', 'love', 'enjoy', 'passion for', 'fan of', 
  'enthusiast', 'hobby', 'hobbies', 'favorite'
];

// Dislike indicators
const DISLIKE_INDICATORS = [
  'dislike', 'hate', 'don\'t like', 'cannot stand', 'not a fan of', 
  'annoyed by', 'bothered by', 'tired of'
];

// Preference indicators
const PREFERENCE_INDICATORS = [
  'prefer', 'preference', 'rather', 'choice', 'favorite', 'ideal', 'best'
];

/**
 * Analyze conversation and extract context
 * @param userId User ID
 * @param messages Recent conversation messages
 */
export async function analyzeConversation(userId: string, messages: Message[]): Promise<void> {
  if (!userId || !messages || messages.length === 0) return;

  try {
    // First look for personal information in user messages
    for (const message of messages) {
      if (message.role === 'user') {
        await extractPersonalInfo(userId, message.content);
        await extractInterests(userId, message.content);
        await extractDislikes(userId, message.content);
        await extractPreferences(userId, message.content);
      }
    }

    // Extract highlights from meaningful messages
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (message.role === 'user' && isSignificantMessage(message.content)) {
        // Save the user message
        const truncatedUserMessage = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
        await addUserConversationHighlight(userId, truncatedUserMessage);
        
        // If there's an assistant response following this message, save that too
        if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
          const assistantResponse = messages[i + 1].content;
          
          // Extract a meaningful summary from the assistant response
          const assistantSummary = extractAssistantSummary(assistantResponse);
          if (assistantSummary) {
            await addUserConversationHighlight(userId, `Assistant: ${assistantSummary}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing conversation:', error);
  }
}

/**
 * Check if a message contains significant content worth saving
 * @param content Message content
 * @returns True if message is significant
 */
function isSignificantMessage(content: string): boolean {
  if (!content || content.length < 15) return false;
  
  // Look for personal pronouns and statements
  const personalPhrases = ['I am', 'I\'m', 'I have', 'I\'ve', 'I want', 'I need', 'I feel', 'My'];
  const hasPersonalPhrases = personalPhrases.some(phrase => 
    content.toLowerCase().includes(phrase.toLowerCase())
  );
  
  // Look for questions and requests
  const questionPatterns = [
    /\?$/, // Ends with question mark
    /^(can|could|would|will|how|what|when|where|why|who|is|are)/i, // Starts with question words
    /help me/i, // Help requests
  ];
  const hasQuestions = questionPatterns.some(pattern => pattern.test(content));
  
  // Look for learning/education related terms
  const learningTerms = ['learn', 'learning', 'study', 'teach', 'education', 'course', 'training'];
  const hasLearningTerms = learningTerms.some(term =>
    content.toLowerCase().includes(term)  
  );
  
  // Look for goal/project related terms
  const goalTerms = ['goal', 'plan', 'project', 'build', 'create', 'develop', 'start', 'code', 'programming', 'app', 'application'];
  const hasGoalTerms = goalTerms.some(term =>
    content.toLowerCase().includes(term)
  );
  
  // Check for commands or clear intentions
  const intentPatterns = [
    /^(show|tell|find|get|update|give|list)/i, // Command-like starts
    /\b(update|progress|status)\b/i, // Status requests
  ];
  const hasIntentions = intentPatterns.some(pattern => pattern.test(content));
  
  return hasPersonalPhrases || hasQuestions || hasLearningTerms || hasGoalTerms || hasIntentions;
}

/**
 * Extract personal information from a message
 * @param userId User ID
 * @param content Message content
 */
async function extractPersonalInfo(userId: string, content: string): Promise<void> {
  const sentences = content.split(/[.!?]+/);
  
  for (const category of PERSONAL_INFO_CATEGORIES) {
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (lowerSentence.includes(category)) {
        const personalInfoExtracted = extractPersonalStatement(lowerSentence, category);
        
        if (personalInfoExtracted) {
          const categoryKey = category.replace(/[^a-zA-Z0-9]/g, '_');
          const infoItem: PersonalInfoItem = {
            value: personalInfoExtracted,
            source: 'user',
            confidence: 0.8,
            last_updated: new Date().toISOString()
          };
          
          const personalInfoUpdate = {
            [categoryKey]: infoItem
          };
          
          await updateUserPersonalInfo(userId, personalInfoUpdate);
        }
      }
    }
  }
}

/**
 * Extract a personal statement based on a category
 * @param sentence Sentence to analyze
 * @param category Category to extract
 * @returns Extracted statement or null
 */
function extractPersonalStatement(sentence: string, category: string): string | null {
  // Look for common patterns
  const patterns = [
    new RegExp(`my ${category} (is|are) ([^.,]+)`, 'i'),
    new RegExp(`i (am|work as|have been) a ([^.,]+${category})`, 'i'),
    new RegExp(`i work as a[n]? ([^.,]+)`, 'i'),
    new RegExp(`i have ([0-9]+) ([^.,]+)`, 'i'),
    new RegExp(`i live in ([^.,]+)`, 'i'),
    new RegExp(`i am ([0-9]+) years old`, 'i'),
    new RegExp(`my name is ([^.,]+)`, 'i'),
    new RegExp(`call me ([^.,]+)`, 'i'),
    new RegExp(`i go by ([^.,]+)`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    if (match && match.length > 1) {
      return match[match.length - 1].trim();
    }
  }
  
  return null;
}

/**
 * Extract interests from a message
 * @param userId User ID
 * @param content Message content
 */
async function extractInterests(userId: string, content: string): Promise<void> {
  const sentences = content.split(/[.!?]+/);
  
  for (const indicator of INTEREST_INDICATORS) {
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (lowerSentence.includes(indicator)) {
        const interestMatch = lowerSentence.match(
          new RegExp(`${indicator} ([^.,]+)`, 'i')
        );
        
        if (interestMatch && interestMatch[1]) {
          const interest = interestMatch[1].trim();
          if (interest.length > 2 && interest.length < 30) {
            await addUserInterest(userId, interest);
          }
        }
      }
    }
  }
}

/**
 * Extract dislikes from a message
 * @param userId User ID
 * @param content Message content
 */
async function extractDislikes(userId: string, content: string): Promise<void> {
  const sentences = content.split(/[.!?]+/);
  
  for (const indicator of DISLIKE_INDICATORS) {
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (lowerSentence.includes(indicator)) {
        const dislikeMatch = lowerSentence.match(
          new RegExp(`${indicator} ([^.,]+)`, 'i')
        );
        
        if (dislikeMatch && dislikeMatch[1]) {
          const dislike = dislikeMatch[1].trim();
          if (dislike.length > 2 && dislike.length < 30) {
            await addUserDislike(userId, dislike);
          }
        }
      }
    }
  }
}

/**
 * Extract preferences from a message
 * @param userId User ID
 * @param content Message content
 */
async function extractPreferences(userId: string, content: string): Promise<void> {
  const sentences = content.split(/[.!?]+/);
  
  for (const indicator of PREFERENCE_INDICATORS) {
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (lowerSentence.includes(indicator)) {
        const preferenceMatch = lowerSentence.match(
          new RegExp(`${indicator} ([^.,]+)`, 'i')
        );
        
        if (preferenceMatch && preferenceMatch[1]) {
          const preference = preferenceMatch[1].trim();
          if (preference.length > 2 && preference.length < 50) {
            const prefCategory = indicator;
            const prefItem: UserPreference = {
              value: preference,
              last_updated: new Date().toISOString()
            };
            
            const preferenceUpdate = {
              [prefCategory]: prefItem
            };
            
            await updateUserPreferences(userId, preferenceUpdate);
          }
        }
      }
    }
  }
}

/**
 * Extract a meaningful summary from assistant responses
 * @param content Assistant message content
 * @returns A summarized version of the response or null
 */
function extractAssistantSummary(content: string): string | null {
  if (!content || content.length < 10) return null;
  
  // Try to get the first meaningful sentence
  const sentences = content.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim();
  
  if (firstSentence && firstSentence.length > 10) {
    // Truncate if too long
    return firstSentence.substring(0, 100) + (firstSentence.length > 100 ? '...' : '');
  }
  
  // If we can't get a good first sentence, just truncate the content
  return content.substring(0, 100) + (content.length > 100 ? '...' : '');
}