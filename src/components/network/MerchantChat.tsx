import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";
import { useMerchantMessages, Conversation } from "@/hooks/use-merchant-messages";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface MerchantChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPartnerId?: string;
  initialPartnerName?: string;
  requestId?: string;
  requestName?: string;
}

export function MerchantChat({
  open,
  onOpenChange,
  initialPartnerId,
  initialPartnerName,
  requestId,
  requestName,
}: MerchantChatProps) {
  const { user } = useAuth();
  const [selectedPartner, setSelectedPartner] = useState<{
    id: string;
    name: string;
  } | null>(
    initialPartnerId && initialPartnerName
      ? { id: initialPartnerId, name: initialPartnerName }
      : null
  );
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    conversations,
    loading,
    sending,
    sendMessage,
  } = useMerchantMessages(selectedPartner?.id, requestId);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset selection when dialog opens with initial values
  useEffect(() => {
    if (open && initialPartnerId && initialPartnerName) {
      setSelectedPartner({ id: initialPartnerId, name: initialPartnerName });
    }
  }, [open, initialPartnerId, initialPartnerName]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const success = await sendMessage(message);
    if (success) {
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderConversationsList = () => (
    <div className="space-y-2">
      {loading ? (
        <div className="text-center text-muted-foreground py-8">
          Chargement...
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune conversation</p>
          <p className="text-sm mt-2">
            Contactez un marchand depuis une demande pour démarrer
          </p>
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.partnerId}
            onClick={() =>
              setSelectedPartner({ id: conv.partnerId, name: conv.partnerName })
            }
            className="w-full p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {conv.partnerName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{conv.partnerName}</span>
                  {conv.unreadCount > 0 && (
                    <Badge variant="default" className="ml-2">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {conv.lastMessage}
                </p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedPartner(null)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {selectedPartner?.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium text-sm">{selectedPartner?.name}</p>
          {requestName && (
            <p className="text-xs text-muted-foreground">
              Re: {requestName}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Votre message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>
            {selectedPartner ? "Conversation" : "Messages"}
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-5rem)]">
          {selectedPartner ? (
            renderChat()
          ) : (
            <div className="p-4">{renderConversationsList()}</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
