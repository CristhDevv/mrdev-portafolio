import React, { useState } from 'react';
import { Check, Copy, Terminal, X } from 'lucide-react';

interface PairingModalProps {
  pairing: { otp_token: string; expires_at: string; cli_command: string } | null;
  onClose: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({ pairing, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!pairing) return null;

  const copyCommand = async () => {
    await navigator.clipboard.writeText(pairing.cli_command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="contact-glass-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <span className="modal-eyebrow">Token de Un Solo Uso (TTL 10 min)</span>
        <h3>Emparejar Conector Local</h3>
        <p>Ejecuta este comando en el computador donde reside el agente. Nunca abras puertos entrantes.</p>

        <pre className="ops-code-block">
          <Terminal size={14} /> {pairing.cli_command}
        </pre>

        <button type="button" className="ops-primary-btn full" onClick={copyCommand}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Comando copiado' : 'Copiar comando de emparejamiento'}
        </button>
      </div>
    </div>
  );
};
