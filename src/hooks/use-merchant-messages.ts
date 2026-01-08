import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "@/hooks/use-toast";

export interface MerchantMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  request_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  requestId?: string;
}

export function useMerchantMessages(partnerId?: string, requestId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MerchantMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async () => {
    if (!user || !partnerId) return;
    
    try {
      let query = supabase
        .from("merchant_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (requestId) {
        query = query.eq("request_id", requestId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      if (data && data.length > 0) {
        const unreadIds = data
          .filter((m) => m.receiver_id === user.id && !m.is_read)
          .map((m) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from("merchant_messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, partnerId, requestId]);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data: messagesData, error } = await supabase
        .from("merchant_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationMap = new Map<string, Conversation>();

      for (const msg of messagesData || []) {
        const isMe = msg.sender_id === user.id;
        const partnerId = isMe ? msg.receiver_id : msg.sender_id;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            partnerName: "", // Will be filled later
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: !isMe && !msg.is_read ? 1 : 0,
            requestId: msg.request_id || undefined,
          });
        } else {
          const conv = conversationMap.get(partnerId)!;
          if (!isMe && !msg.is_read) {
            conv.unreadCount++;
          }
        }
      }

      // Fetch partner names
      const partnerIds = Array.from(conversationMap.keys());
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, shop_name, owner_name")
          .in("user_id", partnerIds);

        for (const profile of profiles || []) {
          const conv = conversationMap.get(profile.user_id);
          if (conv) {
            conv.partnerName = profile.shop_name || profile.owner_name || "Marchand";
          }
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send a message
  const sendMessage = async (content: string) => {
    if (!user || !partnerId || !content.trim()) return false;

    setSending(true);
    try {
      const { error } = await supabase.from("merchant_messages").insert({
        sender_id: user.id,
        receiver_id: partnerId,
        request_id: requestId || null,
        content: content.trim(),
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
      return false;
    } finally {
      setSending(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("merchant-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "merchant_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as MerchantMessage;
          
          // If we're in a specific conversation, add the message
          if (partnerId && (newMessage.sender_id === partnerId || newMessage.receiver_id === partnerId)) {
            setMessages((prev) => [...prev, newMessage]);
          }
          
          // Refresh conversations list
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partnerId, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    if (partnerId) {
      fetchMessages();
    } else {
      fetchConversations();
    }
  }, [partnerId, fetchMessages, fetchConversations]);

  return {
    messages,
    conversations,
    loading,
    sending,
    sendMessage,
    refetch: partnerId ? fetchMessages : fetchConversations,
  };
}
