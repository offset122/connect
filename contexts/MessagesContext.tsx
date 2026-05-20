import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface MessagesContextType {
  unreadMessagesCount: number;
  loading: boolean;
  refreshMessages: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadMessagesCount = async () => {
    if (!user) {
      setUnreadMessagesCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await (supabase as any)
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .neq('status', 'read');

      if (error) throw error;
      
      setUnreadMessagesCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
      setUnreadMessagesCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshMessages = async () => {
    setLoading(true);
    await fetchUnreadMessagesCount();
  };

  useEffect(() => {
    fetchUnreadMessagesCount();

    // Set up real-time subscription for new messages
    if (user) {
      const subscription = (supabase as any)
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadMessagesCount();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  return (
    <MessagesContext.Provider value={{ unreadMessagesCount, loading, refreshMessages }}>
      {children}
    </MessagesContext.Provider>
  );
}

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};