import { useId } from "react";

import styles from "./styles.module.css";

type Props = {
    jsonProcessLabel: string;
    onJsonProcess: () => void;
    helpLabel: string;
    onHelp: () => void;
    paceWindowLabel: string;
    paceWindow: string;
    onPaceWindowChange: (value: string) => void;
    smoothNeighboursCountLabel: string;
    smoothNeighboursCount: string;
    onSmoothNeighboursCountChange: (value: string) => void;
    smoothMaxDeviationLabel: string;
    smoothMaxDeviation: string;
    onSmoothMaxDeviationChange: (value: string) => void;
    paceLimitLabel: string;
    paceLimit: string;
    onPaceLimitChange: (value: string) => void;
};

export function Controls(
    {
        jsonProcessLabel,
        onJsonProcess,
        helpLabel,
        onHelp,
        paceWindowLabel,
        paceWindow,
        onPaceWindowChange,
        smoothNeighboursCountLabel,
        smoothNeighboursCount,
        onSmoothNeighboursCountChange,
        smoothMaxDeviationLabel,
        smoothMaxDeviation,
        onSmoothMaxDeviationChange,
        paceLimitLabel,
        paceLimit,
        onPaceLimitChange,
    }: Props
) {
    const id = useId();

    return (
        <div className={styles.wrapper}>
            <input
                className={styles.button}
                onClick={() => onJsonProcess()}
                value={jsonProcessLabel}
                type="button"
            />

            <div className="styles.textWrapper">
                <label htmlFor={id} className={styles.label}>{paceWindowLabel}</label>
                <input
                    id={id}
                    className={styles.text}
                    value={paceWindow}
                    onChange={(e) => onPaceWindowChange(e.target.value)}
                    type="text"
                    inputMode="numeric"
                />
            </div>

            <div className="styles.textWrapper">
                <label htmlFor={id} className={styles.label}>{smoothNeighboursCountLabel}</label>
                <input
                    id={id}
                    className={styles.text}
                    value={smoothNeighboursCount}
                    onChange={(e) => onSmoothNeighboursCountChange(e.target.value)}
                    type="text"
                    inputMode="numeric"
                />
            </div>
                
            <div className="styles.textWrapper">
                <label htmlFor={id} className={styles.label}>{smoothMaxDeviationLabel}</label>
                <input
                    id={id}
                    className={styles.text}
                    value={smoothMaxDeviation}
                    onChange={(e) => onSmoothMaxDeviationChange(e.target.value)}
                    type="text"
                    inputMode="numeric"
                />
            </div>
            
            <div className="styles.textWrapper">
                <label htmlFor={id} className={styles.label}>{paceLimitLabel}</label>
                <input
                    id={id}
                    className={styles.text}
                    value={paceLimit}
                    onChange={(e) => onPaceLimitChange(e.target.value)}
                    type="text"
                    inputMode="numeric"
                />
            </div>

            <input
                className={styles.button}
                onClick={() => onHelp()}
                value={helpLabel}
                type="button"
            />

        </div>
    );
}
