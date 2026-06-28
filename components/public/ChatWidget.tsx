/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { MessageSquare, X, Send, Phone, MessageCircle } from "lucide-react";

export const ChatWidget: React.FC = () => {
  const { chatMessages, sendChatMessage, clearChat, currentUser } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Stable guest chat session state loaded/stored in localStorage
  const [guestSession, setGuestSession] = useState<{ id: string; name: string }>(() => {
    try {
      const savedId = localStorage.getItem("marcopolo_chat_session_id");
      const savedName = localStorage.getItem("marcopolo_chat_customer_name");
      if (savedId && savedName) {
        return { id: savedId, name: savedName };
      }
      const newId = `guest-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newName = `Guest Customer #${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem("marcopolo_chat_session_id", newId);
      localStorage.setItem("marcopolo_chat_customer_name", newName);
      return { id: newId, name: newName };
    } catch {
      const newId = `guest-${Date.now()}`;
      return { id: newId, name: "Guest Customer" };
    }
  });

  // Calculate current active session ID and customer name
  const activeSessionId = currentUser ? `user-${currentUser.id}` : guestSession.id;
  const activeCustomerName = currentUser ? currentUser.name : guestSession.name;

  // Filter messages specifically for this active session
  const filteredMessages = chatMessages.filter(
    (msg) => msg.sessionId === activeSessionId
  );

  // Fallback to a single welcome placeholder if conversation is fresh (empty)
  const displayMessages = filteredMessages.length > 0 ? filteredMessages : [
    {
      id: "welcome-placeholder",
      sender: "admin" as const,
      text: "Welcome to Marco Polo Oriental Rugs! I am Cyrus, your personal concierge. How may I assist you with our luxury hand-knotted collection or tracking an active order today?",
      timestamp: new Date().toISOString()
    }
  ];

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isOpen]);

  // Listen to global programmatically triggered inquiries
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail && customEvent.detail.initialMessage) {
        sendChatMessage(customEvent.detail.initialMessage, "customer", undefined, activeSessionId, activeCustomerName);
      }
    };
    window.addEventListener("open-marcopolo-chat", handleOpenChat);
    return () => {
      window.removeEventListener("open-marcopolo-chat", handleOpenChat);
    };
  }, [sendChatMessage, activeSessionId, activeCustomerName]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(inputText, "customer", undefined, activeSessionId, activeCustomerName);
    setInputText("");
  };

  const handleEndChat = () => {
    // Clear and delete this session's messages completely
    clearChat(activeSessionId);
    setShowEndConfirm(false);
    setIsOpen(false);
    
    // If guest, rotate the session ID and name to guarantee a completely "fresh page" (new conversation)
    if (!currentUser) {
      const newId = `guest-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newName = `Guest Customer #${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        localStorage.setItem("marcopolo_chat_session_id", newId);
        localStorage.setItem("marcopolo_chat_customer_name", newName);
      } catch (e) {
        console.error(e);
      }
      setGuestSession({ id: newId, name: newName });
    }
  };

  const handleCloseChat = () => {
    // Just close the view, do NOT delete the session automatically so users can resume conversation
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans text-xs">
      
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 bg-editorial-accent hover:bg-[#8E7453] text-white rounded-none shadow-lg transition transform hover:-translate-y-0.5 flex items-center justify-center border border-white focus:outline-none focus:ring-2 focus:ring-editorial-accent/30 cursor-pointer relative"
        >
          <MessageSquare className="h-5.5 w-5.5" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-editorial-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-editorial-accent"></span>
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="bg-white text-editorial-text rounded-none shadow-2xl border border-editorial-border w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden animate-fadeIn text-left">
          
          {/* Header Panel */}
          <div className="bg-editorial-aside p-4 border-b border-editorial-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 bg-editorial-accent rounded-none flex items-center justify-center text-white font-serif font-bold text-sm">
                  MP
                </div>
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-none bg-emerald-500 ring-2 ring-editorial-aside" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-editorial-text text-sm">Marco Polo Concierge</h3>
                <p className="text-xs text-emerald-600 font-medium">{activeCustomerName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {showEndConfirm ? (
                <div className="flex items-center gap-1 bg-red-50 p-1 border border-red-200">
                  <span className="text-xs text-red-600 font-bold uppercase tracking-wide mr-1 font-sans">Clear chat?</span>
                  <button
                    onClick={handleEndChat}
                    className="px-1.5 py-0.5 bg-red-600 text-white text-xs font-bold uppercase cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="px-1.5 py-0.5 bg-stone-200 text-neutral-700 text-xs font-bold uppercase cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  title="End session and clear conversation"
                  className="px-2 py-1 bg-white border border-editorial-border hover:border-red-500 text-gray-500 hover:text-red-500 text-sm uppercase font-bold tracking-wider rounded-none transition cursor-pointer font-mono"
                >
                  End Chat
                </button>
              )}
              <button
                onClick={handleCloseChat}
                title="Minimize chat"
                className="p-1.5 hover:bg-editorial-aside text-gray-400 hover:text-neutral-600 rounded-none transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white px-4 py-2 border-b border-editorial-border flex items-center justify-between gap-1 text-sm text-gray-500">
            <span className="font-serif uppercase tracking-widest text-xs font-bold text-editorial-accent">Direct Options:</span>
            <div className="flex gap-2">
              <a
                href="https://wa.me/18005557831"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-600 hover:underline font-bold"
              >
                <MessageCircle className="h-3 w-3" />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:+18005557831"
                className="flex items-center gap-1 text-editorial-accent hover:underline font-bold"
              >
                <Phone className="h-3 w-3" />
                <span>Call Advisor</span>
              </a>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-editorial-bg">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "customer" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-none text-xs leading-relaxed ${
                    msg.sender === "customer"
                      ? "bg-editorial-accent text-white"
                      : "bg-white text-editorial-text border border-editorial-border shadow-xs"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-sm text-gray-400 mt-1 px-1 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested FAQs Tags */}
          <div className="px-4 py-2 bg-white border-t border-editorial-border flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                sendChatMessage("How do I track my active order status?", "customer", undefined, activeSessionId, activeCustomerName);
              }}
              className="px-2 py-1 bg-editorial-aside border border-editorial-border rounded-none text-gray-600 hover:text-editorial-accent hover:border-editorial-accent text-sm transition font-medium cursor-pointer"
            >
              How to track my order?
            </button>
            <button
              onClick={() => {
                sendChatMessage("What is your professional rug cleaning cost?", "customer", undefined, activeSessionId, activeCustomerName);
              }}
              className="px-2 py-1 bg-editorial-aside border border-editorial-border rounded-none text-gray-600 hover:text-editorial-accent hover:border-editorial-accent text-sm transition font-medium cursor-pointer"
            >
              Rug wash services?
            </button>
            <button
              onClick={() => {
                sendChatMessage("Are all your Persian rugs handmade and certified?", "customer", undefined, activeSessionId, activeCustomerName);
              }}
              className="px-2 py-1 bg-editorial-aside border border-editorial-border rounded-none text-gray-600 hover:text-editorial-accent hover:border-editorial-accent text-sm transition font-medium cursor-pointer"
            >
              Are rugs certified?
            </button>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-editorial-aside border-t border-editorial-border flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask our rug advisors..."
              className="flex-1 bg-white border border-editorial-border rounded-none py-2 px-3 outline-none text-xs focus:border-editorial-accent text-editorial-text"
            />
            <button
              type="submit"
              className="p-2.5 bg-editorial-accent hover:bg-[#8E7453] text-white rounded-none transition flex items-center justify-center cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
