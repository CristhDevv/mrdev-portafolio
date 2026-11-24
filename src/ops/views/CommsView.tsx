import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Send } from 'lucide-react';
import { opsApi } from '../services/opsApi';
import { OpsAgent, OpsConversation, OpsMessage, OpsWorkspace } from '../types/ops';

interface CommsViewProps {
  workspaces: OpsWorkspace[];
  agents: OpsAgent[];
}

export const CommsView: React.FC<CommsViewProps> = ({ workspaces, agents }) => {
  const [wsId, setWsId] = useState(workspaces[0]?.id ?? '');
  const [conversations, setConversations] = useState<OpsConversation[]>([]);
  const [activeConv, setActiveConv] = useState<OpsConversation | null>(null);
  const [messages, setMessages] = useState<OpsMessage[]>([]);
  const [targetAgentId, setTargetAgentId] = useState('');
  const [content, setContent] = useState('');
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (!wsId && workspaces[0]?.id) setWsId(workspaces[0].id);
  }, [wsId, workspaces]);

  useEffect(() => {
    if (!wsId) return;
    opsApi.getConversations(wsId).then((res) => {
      setConversations(res.conversations);
      if (res.conversations[0]) setActiveConv(res.conversations[0]);
    }).catch(() => {});
  }, [wsId]);

  useEffect(() => {
    if (!activeConv) return;
    opsApi.getMessages(activeConv.id).then((res) => setMessages(res.messages)).catch(() => {});
  }, [activeConv]);

  const handleCreateConv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsId || !newTitle.trim()) return;
    const res = await opsApi.createConversation({
      workspace_id: wsId,
      title: newTitle,
      kind: 'group',
      participant_agent_ids: agents.map((a) => a.id),
    });
    setConversations((prev) => [res.conversation, ...prev]);
    setActiveConv(res.conversation);
    setNewTitle('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !content.trim()) return;
    const res = await opsApi.sendMessage({
      workspace_id: activeConv.workspace_id,
      conversation_id: activeConv.id,
      target_agent_id: targetAgentId || null,
      message_type: 'instruction',
      content,
    });
    setMessages((prev) => [...prev, res.message]);
    setContent('');
  };

  return (
    <div className="ops-comms-layout">
      <div className="ops-panel ops-comms-sidebar">
        <select value={wsId} onChange={(e) => setWsId(e.target.value)}>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <form onSubmit={handleCreateConv} className="ops-form-row compact">
          <input
            type="text"
            placeholder="Nueva sala..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button type="submit" className="ops-primary-btn sm"><Plus size={14} /></button>
        </form>

        <div className="ops-list">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ops-conv-btn ${activeConv?.id === c.id ? 'active' : ''}`}
              onClick={() => setActiveConv(c)}
            >
              <MessageSquare size={14} /> <span>{c.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ops-panel ops-comms-thread">
        {!activeConv ? (
          <p className="ops-empty">Crea o selecciona una conversación dentro del espacio de trabajo.</p>
        ) : (
          <>
            <div className="ops-panel-head">
              <strong>{activeConv.title}</strong>
              <code>{activeConv.kind}</code>
            </div>

            <div className="ops-messages-scroll">
              {messages.map((m) => (
                <div key={m.id} className={`ops-msg-bubble ${m.sender_type}`}>
                  <div className="ops-msg-meta">
                    <strong>{m.sender_type === 'human' ? 'mrdev (Admin)' : m.sender_agent_id?.slice(0, 8)}</strong>
                    <span>{m.message_type} · {new Date(m.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p>{m.content}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} className="ops-form-row">
              <select value={targetAgentId} onChange={(e) => setTargetAgentId(e.target.value)}>
                <option value="">Difusión al grupo</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>Para: {a.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Enviar instrucción o mensaje mediado..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button type="submit" className="ops-primary-btn">
                <Send size={14} /> Enviar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
