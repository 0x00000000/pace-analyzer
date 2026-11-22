import { useEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

import styles from "./styles.module.css";

type Props = {
    open: boolean;
    onClose: () => void;
    closeLabel: string;
    children?: ReactNode;
};

// A modal dialog built on the native <dialog>. showModal() gives the backdrop, focus
// trapping, Esc to close and inert page content behind it.
export function InfoBox({ open, onClose, closeLabel, children }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    // The `open` prop drives the dialog. Opening it with the `open` attribute instead
    // would show it as non-modal, without the backdrop or focus trapping.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }
        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    // The dialog has no padding, so a click on the <dialog> element itself
    // (not on its content) is a click on the backdrop.
    const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className={styles.box}
            // Fires when the dialog closes for any reason, including Esc, so the parent's state stays in sync.
            onClose={onClose}
            onClick={handleClick}
        >
            <div className={styles.inner}>
                <div className={styles.content}>{children}</div>
                <button type="button" className={styles.button} onClick={onClose}>
                    {closeLabel}
                </button>
            </div>
        </dialog>
    );
}
