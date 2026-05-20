import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ConnectionsContextType {
  pendingConnectionsCount: number;
  pendingPhoneRequestsCount: number;
  totalPendingCount: number;
  loading: boolean;
  refreshConnections: () => Promise<void>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export function ConnectionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);
  const [pendingPhoneRequestsCount, setPendingPhoneRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingCounts = async () => {
    if (!user) {
      setPendingConnectionsCount(0);
      setPendingPhoneRequestsCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch pending connection requests
      const { count: connectionsCount, error: connectionsError } = await (supabase as any)
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      if (connectionsError) throw connectionsError;

      // Fetch pending phone number requests
      const { count: phoneRequestsCount, error: phoneRequestsError } = await (supabase as any)
        .from('phone_number_requests')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', user.id)
        .eq('request_status', 'pending');

      if (phoneRequestsError) throw phoneRequestsError;
      
      setPendingConnectionsCount(connectionsCount || 0);
      setPendingPhoneRequestsCount(phoneRequestsCount || 0);
    } catch (error) {
      console.error('Error fetching pending counts:', error);
      setPendingConnectionsCount(0);
      setPendingPhoneRequestsCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshConnections = async () => {
    setLoading(true);
    await fetchPendingCounts();
  };

  useEffect(() => {
    fetchPendingCounts();

    // Set up real-time subscriptions
    if (user) {
      const connectionsSubscription = (supabase as any)
        .channel('connections')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            fetchPendingCounts();
          }
        )
        .subscribe();

      const phoneRequestsSubscription = (supabase as any)
        .channel('phone_number_requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'phone_number_requests',
            filter: `target_user_id=eq.${user.id}`,
          },
          () => {
            fetchPendingCounts();
          }
        )
        .subscribe();

      return () => {
        connectionsSubscription.unsubscribe();
        phoneRequestsSubscription.unsubscribe();
      };
    }
  }, [user]);

  const totalPendingCount = pendingConnectionsCount + pendingPhoneRequestsCount;

  return (
    <ConnectionsContext.Provider value={{ 
      pendingConnectionsCount, 
      pendingPhoneRequestsCount, 
      totalPendingCount,
      loading, 
      refreshConnections 
    }}>
      {children}
    </ConnectionsContext.Provider>
  );
}

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};
