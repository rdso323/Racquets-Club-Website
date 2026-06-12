import { createContext, useContext, useState } from 'react';

interface UIContextType {
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    feedbackOpen: boolean;
    openFeedback: () => void;
    closeFeedback: () => void;
}

const UIContext = createContext<UIContextType>({} as UIContextType);

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    return (
        <UIContext.Provider
            value={{
                menuOpen,
                setMenuOpen,
                feedbackOpen,
                openFeedback: () => {
                    setMenuOpen(false);
                    setFeedbackOpen(true);
                },
                closeFeedback: () => setFeedbackOpen(false),
            }}
        >
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);
