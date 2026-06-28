'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, ArrowLeft, MessageCircle, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { messageAPI, userAPI } from '@/lib/api';
import { getUser, isAuthenticated, getDeviceId } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: any;
}

interface Conversation {
  user: any;
  last_message?: any;
  unread_count: number;
}

type PinStep = 'check' | 'create' | 'verify' | 'unlocked';

export default function MessagesPage() {
  const router = useRouter();
  const [pinStep, setPinStep] = useState<PinStep>('check');
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const currentUser = getUser();

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    checkPinStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkPinStatus = async () => {
    setPinLoading(true);
    try {
      const deviceId = getDeviceId();
      const res = await messageAPI.getPinStatus(deviceId);
      if (!res.data.has_pin) {
        setPinStep('create');
      } else if (!res.data.device_verified) {
        setPinStep('verify');
      } else {
        setPinStep('unlocked');
        loadConversations();
      }
    } catch {
      setPinStep('create');
    }
    setPinLoading(false);
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data);
    } catch {}
    setLoading(false);
  };

  const handlePinInput = (index: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 1);
    const newPin = [...pin];
    newPin[index] = v;
    setPin(newPin);
    if (v && index < 3) {
      pinRefs[index + 1]?.current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1]?.current?.focus();
    }
  };

  const getPinString = () => pin.join('');

  const handleCreatePin = async () => {
    const pinStr = getPinString();
    if (pinStr.length !== 4) { toast.error('Enter 4 digits'); return; }
    setPinLoading(true);
    try {
      await messageAPI.createPin(pinStr, getDeviceId());
      toast.success('PIN created! Messages unlocked.');
      setPinStep('unlocked');
      loadConversations();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create PIN');
    }
    setPinLoading(false);
  };

  const handleVerifyPin = async () => {
    const pinStr = getPinString();
    if (pinStr.length !== 4) { toast.error('Enter 4 digits'); return; }
    setPinLoading(true);
    try {
      await messageAPI.verifyPin(pinStr, getDeviceId());
      toast.success('PIN verified!');
      setPinStep('unlocked');
      setPin(['', '', '', '']);
      loadConversations();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid PIN');
      setPin(['', '', '', '']);
      pinRefs[0]?.current?.focus();
    }
    setPinLoading(false);
  };

  const selectConversation = async (user: any) => {
    setSelectedUser(user);
    try {
      const res = await messageAPI.getMessages(user.id);
      setMessages(res.data);
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    setSending(true);
    try {
      const res = await messageAPI.sendMessage(selectedUser.id, newMessage.trim());
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');

      setConversations(prev => {
        const existing = prev.find(c => c.user.id === selectedUser.id);
        const newConv = {
          user: selectedUser,
          last_message: res.data,
          unread_count: 0,
        };
        if (existing) {
          return [newConv, ...prev.filter(c => c.user.id !== selectedUser.id)];
        }
        return [newConv, ...prev];
      });
    } catch {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  // PIN Screen
  if (pinStep !== 'unlocked') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="h-28" />
        <div className="flex items-center justify-center min-h-[calc(100vh-7rem)] p-4">
          <div className="w-full max-w-sm card shadow-card-hover text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-brand rounded-2xl flex items-center justify-center mx-auto shadow-button">
              <Shield size={36} className="text-white" />
            </div>

            {pinStep === 'create' && (
              <>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Create Message PIN</h2>
                  <p className="text-sm text-gray-500 mt-1">Set a 4-digit PIN to secure your messages on this device</p>
                </div>
              </>
            )}

            {pinStep === 'verify' && (
              <>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Enter Your PIN</h2>
                  <p className="text-sm text-gray-500 mt-1">Enter your 4-digit PIN to access messages</p>
                </div>
              </>
            )}

            {pinLoading && pinStep === 'check' ? (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Checking PIN status...</span>
              </div>
            ) : (
              <>
                {/* PIN Input */}
                <div className="flex justify-center gap-3">
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      type={pinVisible ? 'text' : 'password'}
                      maxLength={1}
                      value={digit}
                      onChange={e => handlePinInput(i, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(i, e)}
                      className="pin-input"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setPinVisible(!pinVisible)}
                  className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1.5 mx-auto"
                >
                  {pinVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  {pinVisible ? 'Hide' : 'Show'} PIN
                </button>

                <button
                  onClick={pinStep === 'create' ? handleCreatePin : handleVerifyPin}
                  disabled={getPinString().length !== 4 || pinLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {pinLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  {pinLoading ? 'Processing...' : pinStep === 'create' ? 'Create PIN' : 'Unlock Messages'}
                </button>

                <p className="text-xs text-gray-400">
                  {pinStep === 'create'
                    ? 'Your PIN protects your messages on new devices'
                    : 'This device needs PIN verification'
                  }
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="h-28" />

      <div className="max-w-6xl mx-auto px-4 py-4 h-[calc(100vh-8rem)]">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Conversations List */}
          <div className={`col-span-12 md:col-span-4 card p-0 overflow-hidden flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <MessageCircle size={20} className="text-primary-500" />
                Messages
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-primary-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No conversations yet</p>
                  <p className="text-gray-300 text-xs mt-1">Follow users to start messaging</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.user.id}
                    onClick={() => selectConversation(conv.user)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selectedUser?.id === conv.user.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden">
                        <img
                          src={conv.user.profile_picture
                            ? `http://localhost:8000${conv.user.profile_picture}`
                            : `https://ui-avatars.com/api/?name=${conv.user.first_name}+${conv.user.last_name}&background=667eea&color=fff`
                          }
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${conv.user.first_name}&background=667eea&color=fff`; }}
                        />
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 truncate">{conv.user.first_name} {conv.user.last_name}</p>
                        {conv.last_message && <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(conv.last_message.created_at)}</span>}
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {conv.last_message.sender_id === currentUser?.id ? 'You: ' : ''}{conv.last_message.content}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={`col-span-12 md:col-span-8 card p-0 overflow-hidden flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden text-gray-400 hover:text-gray-600">
                    <ArrowLeft size={20} />
                  </button>
                  <Link href={`/profile/${selectedUser.id}`} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden">
                      <img
                        src={selectedUser.profile_picture
                          ? `http://localhost:8000${selectedUser.profile_picture}`
                          : `https://ui-avatars.com/api/?name=${selectedUser.first_name}+${selectedUser.last_name}&background=667eea&color=fff`
                        }
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${selectedUser.first_name}&background=667eea&color=fff`; }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{selectedUser.first_name} {selectedUser.last_name}</p>
                    </div>
                  </Link>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender_id !== currentUser?.id && (
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 self-end">
                          <img src={selectedUser.profile_picture ? `http://localhost:8000${selectedUser.profile_picture}` : `https://ui-avatars.com/api/?name=${selectedUser.first_name}&background=667eea&color=fff&size=28`} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        <div className={msg.sender_id === currentUser?.id ? 'msg-bubble-sent' : 'msg-bubble-received'}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-gray-400 ${msg.sender_id === currentUser?.id ? 'text-right' : ''}`}>
                          {timeAgo(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder={`Message ${selectedUser.first_name}...`}
                      className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="w-10 h-10 bg-primary-500 text-white rounded-xl flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-gradient-brand rounded-2xl flex items-center justify-center mb-4 shadow-button">
                  <MessageCircle size={36} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-700 text-lg">Your Messages</h3>
                <p className="text-gray-400 text-sm mt-1">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
