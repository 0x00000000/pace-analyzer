import {useId} from "react";
import styles from "./styles.module.css";

type Props = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

export function JsonInput(
    {
        label,
        value,
        onChange,
    }: Props
) {
    const id = useId();

    return (
        <div className={styles.wrapper}>
            <label htmlFor={id} className={styles.label}>{label}</label>
            <textarea
                className={styles.textarea}
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}