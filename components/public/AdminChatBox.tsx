'use client';

import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { X, Send, Minimize2, Maximize2, User, UserSquare2 } from "lucide-react";
import { addShowroomDoc, SHOWROOM_CHAT } from "@/lib/showroom-firebase";

interface AdminChatBoxProps {
  activeSessionId: string | null;
  onClose: () => void;
}

export const AdminChatBox: React.FC<AdminChatBoxProps> = ({ activeSessionId, onClose }) => {
  const { chatMessages } = useStore();
  const [inputText, setInputText] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeMessages = chatMessages
    .filter(m => (m.sessionId || "default") === activeSessionId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    if (!isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages, isMinimized]);

  if (!activeSessionId) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: "Marco Polo", // Identifies as admin
      text: inputText,
      timestamp: new Date().toISOString(),
      sessionId: activeSessionId
    };

    try {
      await addShowroomDoc(SHOWROOM_CHAT, newMessage);
      setInputText("");
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const customerName = activeMessages.find(m => m.sender === 'customer')?.customerName || "Customer";

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-t-lg shadow-xl cursor-pointer flex items-center justify-between w-64 z-[10000]"
        onClick={() => setIsMinimized(false)}
      >
        <span className="font-bold text-sm truncate">Chat: {customerName}</span>
        <div className="flex items-center gap-2">
          <Maximize2 size={16} />
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="hover:text-red-400">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border border-gray-200 shadow-2xl rounded-t-lg z-[10000] flex flex-col pointer-events-auto" style={{ height: '400px' }}>
      {/* Header */}
      <div className="bg-gray-900 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserSquare2 size={18} />
          <div>
            <div className="font-bold text-sm uppercase tracking-wider truncate">{customerName}</div>
            <div className="text-[10px] text-gray-400">Session: {activeSessionId.substring(0,8)}...</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-300">
          <button onClick={() => setIsMinimized(true)} className="hover:text-white"><Minimize2 size={16} /></button>
          <button onClick={onClose} className="hover:text-red-400"><X size={16} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto bg-gray-50 flex flex-col gap-3">
        {activeMessages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-10">No messages found.</div>
        ) : (
          activeMessages.map((msg) => {
            const isAdmin = msg.sender === 'Marco Polo' || msg.sender === 'admin';
            return (
              <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                <div 
                  className={`p-2.5 rounded-lg max-w-[85%] text-sm shadow-sm ${
                    isAdmin 
                      ? 'bg-gray-900 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <div className="text-[9px] text-gray-400 mt-1 px-1 uppercase tracking-wider">
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a reply..."
            className="flex-1 bg-gray-100 border-none rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 text-gray-900"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="bg-gray-900 text-white p-2 flex items-center justify-center hover:bg-gray-800 transition disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
