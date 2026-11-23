// Formats milliseconds as m:ss, or h:mm:ss for an hour and longer.
export function formatTime(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ss = String(seconds).padStart(2, "0");
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
    }
    return `${minutes}:${ss}`;
}

// Formats a pace in min/km as m:ss.
export function formatPace(pace: number): string {
    const totalSeconds = Math.round(pace * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatKilometers(meters: number): string {
    return (meters / 1000).toFixed(2);
}
