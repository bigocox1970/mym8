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
    const userMessages = messages.filter(m => m.role === 'user');
    for (const message of userMessages) {
      if (isSignificantMessage(message.content)) {
        const truncatedMessage = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
        await addUserConversationHighlight(userId, truncatedMessage);
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
  if (!content || content.length < 30) return false;
  
  // Look for personal pronouns and statements
  const personalPhrases = ['I am', 'I\'m', 'I have', 'I\'ve', 'I want', 'I need', 'I feel', 'My'];
  const hasPersonalPhrases = personalPhrases.some(phrase => 
    content.toLowerCase().includes(phrase.toLowerCase())
  );
  
  return hasPersonalPhrases;
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