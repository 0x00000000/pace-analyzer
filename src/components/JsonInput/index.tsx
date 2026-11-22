import {useId} from "react";
import styles from "./styles.module.css";

type Props = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    // Shown under the textarea when set, e.g. why the pasted JSON couldn't be loaded.
    error?: string | null;
};

export function JsonInput(
    {
        label,
        value,
        onChange,
        error = null,
    }: Props
) {
    const id = useId();
    const errorId = `${id}-error`;

    return (
        <div className={styles.wrapper}>
            <label htmlFor={id} className={styles.label}>{label}</label>
            <textarea
                className={`${styles.textarea} ${error ? styles.invalid : ""}`}
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
            />
            {error && (
                <div id={errorId} className={styles.error} role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}
