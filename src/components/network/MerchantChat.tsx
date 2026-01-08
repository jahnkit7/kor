import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, MessageCircle, X } from "lucide-react";
import { useMerchantMessages, Conversation } from "@/hooks/use-merchant-messages";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  const handleClose = () => {
    setSelectedPartner(null);
    onOpenChange(false);
  };

  const renderConversationsList = () => (
    <div className="p-4 space-y-2">
      {loading ? (
        <div className="text-center text-muted-foreground py-12">
          Chargement...
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <p className="font-medium text-foreground">Aucune conversation</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
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
            className="w-full p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {conv.partnerName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{conv.partnerName}</span>
                  {conv.unreadCount > 0 && (
                    <Badge variant="default" className="flex-shrink-0">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedPartner(null)}
          className="h-9 w-9 rounded-xl flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {selectedPartner?.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{selectedPartner?.name}</p>
          {requestName && (
            <p className="text-xs text-muted-foreground truncate">
              Re: {requestName}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Démarrez la conversation
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isMe ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex gap-2">
          <Input
            placeholder="Votre message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="h-11 rounded-xl flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={sending || !message.trim()}
            size="icon"
            className="h-11 w-11 rounded-xl flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-left">
              {selectedPartner ? "Conversation" : "Messages"}
            </SheetTitle>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          {selectedPartner ? renderChat() : renderConversationsList()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
