import { useEffect } from "react";
import type { ReactNode } from "react";

import styles from "./styles.module.css";

type Props = {
    open: boolean;
    onClose: () => void;
    closeLabel: string;
    children?: ReactNode;
};

export function InfoBox({ open, onClose, closeLabel, children }: Props) {
    useEffect(() => {
        if (!open) {
            return;
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div className={styles.overlay} onClick={() => onClose()}>
            <div
                className={styles.box}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.content}>{children}</div>
                <input
                    className={styles.button}
                    onClick={() => onClose()}
                    value={closeLabel}
                    type="button"
                />
            </div>
        </div>
    );
}
