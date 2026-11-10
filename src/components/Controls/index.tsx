import { useId } from "react";

import styles from "./styles.module.css";

type Props = {
    jsonProcessLabel: string;
    onJsonProcess: () => void;
};

export function Controls(
    {
        jsonProcessLabel,
        onJsonProcess,
    }: Props
) {
    const id = useId();

    return (
        <div className={styles.wrapper}>
            <input
                id={id}
                className={styles.button}
                onClick={() => onJsonProcess()}
                value={jsonProcessLabel}
                type="button"
            />
        </div>
    );
}