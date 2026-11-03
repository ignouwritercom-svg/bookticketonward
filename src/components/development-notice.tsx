"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowUpRight, Construction, X } from "lucide-react";
import { business } from "@/config/business";

type Notice = "contact" | "policy";
const NoticeContext = createContext<(notice: Notice) => void>(() => {});

export function DevelopmentNoticeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState<Notice>("contact");
  const titles = {
    contact: "Contact details are being finalised",
    policy: "Our policies are being prepared",
  };
  function open(value: Notice) {
    setNotice(value);
    dialog.current?.showModal();
  }
  return (
    <NoticeContext.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        className="notice-dialog"
        aria-labelledby="notice-title"
        aria-describedby="notice-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="notice-inner">
          <button
            className="icon-button dialog-close"
            aria-label="Close development notice"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
          <span className="feature-icon">
            <Construction size={24} />
          </span>
          <p className="eyebrow mt-6">
            Phase {business.phase} · Development preview
          </p>
          <h2 id="notice-title">{titles[notice]}</h2>
          <p id="notice-description">
            {notice === "contact"
                  ? "Verified business email, phone and address will appear here before launch. Support messaging is not available in this preview."
                  : "Terms, privacy and refund policies will be published before ordering opens. They are not available in this development preview."}
          </p>
          <button
            className="button button-primary mt-6"
            onClick={() => dialog.current?.close()}
          >
            Back to exploring <ArrowUpRight size={17} />
          </button>
        </div>
      </dialog>
    </NoticeContext.Provider>
  );
}

export function useDevelopmentNotice() {
  return useContext(NoticeContext);
}

export function DevelopmentAction({
  children,
  notice = "contact",
  className = "button button-primary",
}: {
  children: ReactNode;
  notice?: Notice;
  className?: string;
}) {
  const open = useDevelopmentNotice();
  return (
    <button type="button" className={className} onClick={() => open(notice)}>
      {children}
    </button>
  );
}
