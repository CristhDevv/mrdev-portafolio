import React, { useState } from 'react';
import { Check, Copy, Mail, MessageCircle, X } from 'lucide-react';
import { MRDEV_CONTACT } from '../data/projects';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  activeProjectName: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  open,
  onClose,
  activeProjectName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const quickMessage = `Hola mrdev (${MRDEV_CONTACT.owner}), vi tu portafolio (estaba viendo ${activeProjectName}) y me gustaría cotizar o conversar contigo.`;

  const copyContacts = async () => {
    try {
      await navigator.clipboard.writeText(
        `mrdev (${MRDEV_CONTACT.owner}) · WhatsApp: ${MRDEV_CONTACT.whatsappDisplay} · Correo: ${MRDEV_CONTACT.email}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="contact-glass-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>

        <span className="modal-eyebrow">Contacto Directo · 1 Clic</span>
        <h3>Hablemos de tu próximo proyecto</h3>
        <p>
          Elige el canal que prefieras para escribirme directamente sin formularios largos.
        </p>

        <div className="modal-cta-stack">
          <a
            href={`https://wa.me/${MRDEV_CONTACT.whatsappRaw}?text=${encodeURIComponent(quickMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="modal-btn-wa"
          >
            <MessageCircle size={18} />
            <div>
              <strong>WhatsApp Directo</strong>
              <span>{MRDEV_CONTACT.whatsappDisplay}</span>
            </div>
          </a>

          <a
            href={`mailto:${MRDEV_CONTACT.email}?subject=${encodeURIComponent(
              `Proyecto con mrdev (desde ${activeProjectName})`,
            )}&body=${encodeURIComponent(quickMessage)}`}
            className="modal-btn-mail"
          >
            <Mail size={18} />
            <div>
              <strong>Correo Electrónico</strong>
              <span>{MRDEV_CONTACT.email}</span>
            </div>
          </a>

          <button type="button" className="modal-btn-copy" onClick={copyContacts}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Datos copiados' : 'Copiar WhatsApp y Correo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
