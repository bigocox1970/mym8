import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message } from '@/pages/AI/types';
import { getConfig } from '@/lib/configManager';

interface UseConversationsProps {
  userId: string | undefined;
}

export function useConversations({ userId }: UseConversationsProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user conversations
  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  // Initialize conversation when conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Fetch all conversations for the user
  const fetchConversations = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }
      
      setConversations(data || []);
      
      // If no current conversation is selected and there are conversations, select the most recent one
      if (!currentConversationId && data && data.length > 0) {
        setCurrentConversationId(data[0].id);
      } else if (!currentConversationId && (!data || data.length === 0)) {
        // If no conversations exist, create a new one
        createNewConversation("New Conversation");
      }
    } catch (error) {
      console.error('Error in fetchConversations:', error);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (convId: string) => {
    if (!userId || !convId) return;

    setIsLoading(true);
    try {
      // Fetch messages for the conversation
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Convert database records to Message format
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        conversation_id: msg.conversation_id,
        timestamp: msg.timestamp || msg.created_at
      }));

      setMessages(formattedMessages);
      
    } catch (err) {
      console.error('Error in loadMessages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new conversation
  const createNewConversation = async (title: string) => {
    if (!userId) return;

    try {
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: title || "New Conversation",
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      // Update local state
      setCurrentConversationId(data.id);
      
      // For Set Up conversations, don't add a welcome message
      // since we'll use the handleWelcomeConversation function
      if (title.startsWith('Set Up')) {
        // For Set Up, initialize with empty messages array
        setMessages([]);
        console.log('Set Up conversation created without default welcome message');
      } else {
        // Get assistant name from config
        const config = getConfig();
        const assistantName = config.assistant_name || "AI assistant";
        
        // Add welcome message with the assistant's name
        const welcomeMessage = `Hi there! I'm ${assistantName}. How can I help you today?`;
        
        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: data.id,
            user_id: userId,
            role: 'assistant',
            content: welcomeMessage,
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString()
          });

        if (messageError) {
          console.error('Error adding welcome message:', messageError);
        }
        
        // Set welcome message in UI
        setMessages([{
          id: uuidv4(),
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date().toISOString(),
          conversation_id: data.id
        }]);
      }
      
      // Refresh conversations list
      fetchConversations();
      
      // Return the conversation ID so it can be used by the caller
      return data.id;
      
    } catch (err) {
      console.error('Error in createNewConversation:', err);
    }
  };
  
  // Delete conversation by ID
  const deleteConversation = async (conversationId: string) => {
    if (!userId || !conversationId) return;
    
    try {
      // First delete all messages in this conversation
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);
        
      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        return;
      }
      
      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
        
      if (conversationError) {
        console.error('Error deleting conversation:', conversationError);
        return;
      }
      
      // Update UI
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If we deleted the current conversation, select another one
      if (conversationId === currentConversationId) {
        if (conversations.length > 1) {
          const nextConversation = conversations.find(conv => conv.id !== conversationId);
          if (nextConversation) {
            setCurrentConversationId(nextConversation.id);
          }
        } else {
          createNewConversation("New Conversation");
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      return false;
    }
  };
  
  // Delete current conversation
  const deleteCurrentConversation = async () => {
    if (!userId || !currentConversationId) return;
    
    const success = await deleteConversation(currentConversationId);
    if (success) {
      toast.success("Conversation deleted");
    } else {
      toast.error("Failed to delete conversation");
    }
  };

  // Clear current conversation (keep conversation but remove messages)
  const clearCurrentConversation = async () => {
    if (!userId || !currentConversationId) return;
    
    try {
      // Delete all messages in this conversation
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', currentConversationId);
        
      if (error) {
        console.error('Error clearing messages:', error);
        toast.error("Failed to clear conversation");
        return;
      }
      
      // Reset UI
      setMessages([]);
      
      // Get assistant name from config
      const config = getConfig();
      const assistantName = config.assistant_name || "AI assistant";
      
      // Add welcome message with the assistant's name
      const welcomeMessage = `I've cleared our conversation. I'm ${assistantName}, how can I help you now?`;
      
      // Add new welcome message
      const welcomeMsg: Message = {
        id: "welcome-" + Date.now().toString(),
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
      };
      
      setMessages([welcomeMsg]);
      
      // Save welcome message to database
      await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: welcomeMsg.role,
          content: welcomeMsg.content,
          timestamp: welcomeMsg.timestamp,
          conversation_id: currentConversationId
        });
      
      toast.success("Conversation cleared");
    } catch (error) {
      console.error('Error in clearCurrentConversation:', error);
      toast.error("Failed to clear conversation");
    }
  };

  // Update conversation title
  const updateConversationTitle = async (conversationId: string, newTitle: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conversationId);
        
      if (error) {
        console.error('Error updating conversation title:', error);
        return;
      }
      
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, title: newTitle } : conv
      ));
    } catch (error) {
      console.error('Error in updateConversationTitle:', error);
    }
  };

  // Save message to database
  const saveMessage = async (message: Message) => {
    if (!userId || !currentConversationId) return;
    
    console.log(`[saveMessage] Saving ${message.role} message:`, message.content);
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          conversation_id: currentConversationId
        });
        
      if (error) {
        console.error('Error saving message:', error);
      }
      
      // Update conversation last message time
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversationId);
        
      // Update conversation title if it's the first user message
      if (message.role === 'user' && messages.length <= 1) {
        const title = message.content.length > 30 
          ? message.content.substring(0, 30) + '...' 
          : message.content;
        await updateConversationTitle(currentConversationId, title);
      }
      
      // Refresh conversations list to update the order
      fetchConversations();
    } catch (error) {
      console.error('Error in saveMessage:', error);
    }
  };

  // Add a message to the UI and save to database
  const addMessage = async (message: Message) => {
    // Add to UI
    setMessages(prev => [...prev, message]);
    
    // Save to database
    await saveMessage(message);
    
    return message;
  };

  // Get current conversation title
  const getCurrentConversationTitle = () => {
    if (!currentConversationId) return "New Conversation";
    
    const conversation = conversations.find(c => c.id === currentConversationId);
    return conversation?.title || "Untitled Conversation";
  };

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    messages,
    setMessages,
    isLoading,
    fetchConversations,
    loadMessages,
    createNewConversation,
    deleteConversation,
    deleteCurrentConversation,
    clearCurrentConversation,
    updateConversationTitle,
    saveMessage,
    addMessage,
    getCurrentConversationTitle,
    setConversations
  };
}
