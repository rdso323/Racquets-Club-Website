import { createContext, useContext, useState, type ReactNode } from 'react';

interface UIContextValue {
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    feedbackOpen: boolean;
    openFeedback: () => void;
    closeFeedback: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export const UIProvider = ({ children }: { children: ReactNode }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    return (
        <UIContext.Provider
            value={{
                menuOpen,
                setMenuOpen,
                feedbackOpen,
                openFeedback: () => setFeedbackOpen(true),
                closeFeedback: () => setFeedbackOpen(false),
            }}
        >
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used within UIProvider');
    return ctx;
};
