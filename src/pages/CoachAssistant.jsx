import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useSubscriptionGuard } from '@/components/useSubscriptionGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, MessageSquare, Loader2, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import TeamSelector from '../components/team/TeamSelector';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useLang } from '@/lib/LanguageContext';

const QUICK_QUESTIONS_HE = [
  { icon: '⚽', text: 'איך לשפר התקפה' },
  { icon: '🛡', text: 'איך לשפר הגנה' },
  { icon: '📊', text: 'איזה מערך מתאים לסגל' },
  { icon: '⚡', text: 'איך להתמודד עם לחץ גבוה' },
];
const QUICK_QUESTIONS_EN = [
  { icon: '⚽', text: 'How to improve attack' },
  { icon: '🛡', text: 'How to improve defense' },
  { icon: '📊', text: 'Which formation fits the squad' },
  { icon: '⚡', text: 'How to handle high press' },
];

function ExpandableResponse({ message, isHe }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* Key point */}
      {message.key_point && (
        <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <span className="font-semibold">🎯 נקודה מרכזית: </span>{message.key_point}
        </div>
      )}

      {/* Short answer */}
      <div className="bg-slate-800 rounded-2xl px-4 py-3 text-slate-100 leading-relaxed text-sm">
        {message.short_answer}
      </div>

      {/* Expand button */}
      {message.detailed && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors px-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? (isHe ? 'הסתר הסבר' : 'Hide details') : (isHe ? '📖 הסבר מפורט' : '📖 Detailed explanation')}
        </button>
      )}

      {/* Detailed expansion */}
      <AnimatePresence>
        {expanded && message.detailed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3 text-sm">
              {message.detailed.situation_analysis && (
                <div>
                  <p className="text-emerald-400 font-semibold text-xs mb-1">ניתוח המצב</p>
                  <p className="text-slate-200 leading-relaxed">{message.detailed.situation_analysis}</p>
                </div>
              )}
              {message.detailed.what_to_change && (
                <div>
                  <p className="text-blue-400 font-semibold text-xs mb-1">מה כדאי לשנות</p>
                  <p className="text-slate-200 leading-relaxed">{message.detailed.what_to_change}</p>
                </div>
              )}
              {message.detailed.game_impact && (
                <div>
                  <p className="text-amber-400 font-semibold text-xs mb-1">השפעה על המשחק</p>
                  <p className="text-slate-200 leading-relaxed">{message.detailed.game_impact}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CoachAssistant() {
  const hasPlan = useSubscriptionGuard();
  const { t: langT, dir } = useLang();
  const isHe = langT.lang === 'he';
  const QUICK_QUESTIONS = isHe ? QUICK_QUESTIONS_HE : QUICK_QUESTIONS_EN;
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.entities.Team.list().then(data => {
      setTeams(data);
      if (data.length > 0) setSelectedTeamId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadConversations();
      base44.auth.me().then(user =>
        base44.entities.Player.filter({ team_id: selectedTeamId }).then(setPlayers)
      );
    }
  }, [selectedTeamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const user = await base44.auth.me();
    const data = await base44.entities.Conversation.filter({ team_id: selectedTeamId }, '-updated_date');
    setConversations(data);
  };

  const startNewConversation = async () => {
    const newConv = await base44.entities.Conversation.create({
      team_id: selectedTeamId,
      title: 'שיחה חדשה',
      messages: [],
    });
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversation(newConv);
    setMessages([]);
  };

  const selectConversation = (conv) => {
    setCurrentConversation(conv);
    setMessages(conv.messages || []);
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    await base44.entities.Conversation.delete(convId);
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    loadConversations();
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const sendMessage = async (text) => {
    const question = text || input;
    if (!question.trim() || loading) return;

    let conversation = currentConversation;
    if (!conversation) {
      const newConv = await base44.entities.Conversation.create({
        team_id: selectedTeamId,
        title: question.slice(0, 50),
        messages: [],
      });
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
      conversation = newConv;
    }

    const userMessage = { role: 'user', content: question, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const teamInfo = selectedTeam ? `קבוצה: ${selectedTeam.name}, מערך: ${selectedTeam.formation || 'לא הוגדר'}, סגנון: ${selectedTeam.playing_style || 'לא הוגדר'}` : '';
    const playersInfo = players.length > 0
      ? `שחקנים: ${players.slice(0, 12).map(p => `${p.name} (${p.position})`).join(', ')}`
      : '';

    const TACTICAL_TOPICS = ['ניתוח טקטי', 'מערכים', 'סגנון משחק', 'שימוש בשחקנים', 'התאמות למשחקים', 'הבנת נתוני קבוצה', 'הגנה', 'התקפה', 'מעברים', 'לחץ', 'בנייה מאחור'];
    const FORBIDDEN_TOPICS = ['תרגיל', 'תרגול', 'תוכנית אימון', 'drill'];

    const isForbidden = FORBIDDEN_TOPICS.some(t => question.includes(t));

    let prompt;
    if (isForbidden) {
      const assistantMessage = {
        role: 'assistant',
        short_answer: 'העוזר הטקטי מתמקד בניתוח משחק וטקטיקה בלבד.',
        key_point: null,
        detailed: null,
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      setLoading(false);
      await base44.entities.Conversation.update(conversation.id, { messages: updatedMessages });
      return;
    }

    prompt = `אתה יועץ טקטי מקצועי לכדורגל. תפקידך לתת ייעוץ טקטי קצר, ברור וממוקד.

${teamInfo}
${playersInfo}

שאלת המאמן: ${question}

חוקים:
- ענה רק על נושאים טקטיים: ${TACTICAL_TOPICS.join(', ')}
- אל תספק תרגילי אימון, תוכניות אימון, או תרגולים
- short_answer: תשובה קצרה ב-2-3 משפטים מקסימום
- key_point: משפט אחד קצר שמסכם את הנקודה המרכזית
- detailed.situation_analysis: הסבר מה הבעיה הטקטית (2-3 משפטים)
- detailed.what_to_change: שינוי טקטי מומלץ (2-3 משפטים)
- detailed.game_impact: איך השינוי ישפיע על המשחק (2 משפטים)

אם השאלה לא טקטית, short_answer: "העוזר הטקטי מתמקד בניתוח משחק וטקטיקה בלבד."`;

    const schema = {
      type: 'object',
      properties: {
        short_answer: { type: 'string' },
        key_point: { type: 'string' },
        detailed: {
          type: 'object',
          properties: {
            situation_analysis: { type: 'string' },
            what_to_change: { type: 'string' },
            game_impact: { type: 'string' },
          }
        }
      }
    };

    const response = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });

    const assistantMessage = {
      role: 'assistant',
      short_answer: response.short_answer || '',
      key_point: response.key_point || null,
      detailed: response.detailed || null,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...newMessages, assistantMessage];
    setMessages(updatedMessages);
    setLoading(false);

    const title = newMessages.length === 1 ? question.slice(0, 50) : conversation.title;
    await base44.entities.Conversation.update(conversation.id, { messages: updatedMessages, title });
    setCurrentConversation(prev => prev ? { ...prev, title } : null);
    await loadConversations();
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  if (hasPlan === null) return null;
  if (hasPlan === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-2">אין לך גישה לדף זה</h1>
          <p className="text-slate-400">אנא פנה למנהל המערכת להפעלת הגישה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 overflow-hidden flex flex-col" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">{isHe ? 'עוזר מאמן' : 'Coach Assistant'}</h1>
          <p className="text-xs text-slate-400">{isHe ? 'ייעוץ טקטי מותאם לקבוצה' : 'Personalized tactical advice for your team'}</p>
        </div>
        <TeamSelector teams={teams} selectedTeamId={selectedTeamId} onSelect={setSelectedTeamId} />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-slate-800 flex flex-col bg-slate-900/50">
          <div className="p-3 space-y-2 flex-shrink-0">
            <Button
              onClick={startNewConversation}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm h-8"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 ml-1.5" />
              {isHe ? 'שיחה חדשה' : 'New Chat'}
            </Button>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isHe ? 'חיפוש שיחות...' : 'Search chats...'}
                className="pr-8 h-8 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-2 pb-2">
            <div className="space-y-1">
              {filteredConversations.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">{isHe ? 'אין שיחות' : 'No chats'}</p>
              )}
              {filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`group flex items-start justify-between gap-1 p-2.5 rounded-lg cursor-pointer transition-all ${
                    currentConversation?.id === conv.id
                      ? 'bg-emerald-500/15 border border-emerald-500/25'
                      : 'hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <MessageSquare className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{conv.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {conv.updated_date
                          ? formatDistanceToNow(new Date(conv.updated_date), { addSuffix: true, locale: he })
                          : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={e => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white mb-1">{isHe ? 'שאל את העוזר הטקטי' : 'Ask the Tactical Assistant'}</h3>
                  <p className="text-slate-500 text-sm">{isHe ? 'ייעוץ בנושאי מערכים, טקטיקה, וניתוח קבוצה' : 'Advice on formations, tactics, and team analysis'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'user' ? (
                        <div className="max-w-[70%] bg-emerald-600 text-white rounded-2xl px-4 py-2.5 text-sm">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="max-w-[80%] w-full">
                          <ExpandableResponse message={msg} isHe={isHe} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900 p-3">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Quick questions */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q.text}
                    onClick={() => sendMessage(q.text)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors disabled:opacity-40"
                  >
                    <span>{q.icon}</span>
                    <span>{q.text}</span>
                  </button>
                ))}
              </div>

              {/* Input row */}
              <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={isHe ? 'שאל משהו על הקבוצה שלך…' : 'Ask something about your team…'}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}