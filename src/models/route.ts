type RunkeeperPoint = {
    accuracy: number;
    altitude: number;
    deltaDistance: number;
    deltaPause: number;
    deltaTime: number;
    latitude: number;
    longitude: number;
    timestamp: number;
    type: string;
};

type Point = {
    deltaDistance: number;
    deltaTime: number;
    lat: number;
    lon: number;
};

type TrackData = {
    time: number;
    distance: number;
    pace: number;
    lat: number;
    lon: number;
};

// Checks the fields the track is built from. The rest of the point isn't used.
function isRunkeeperPoint(item: unknown): item is RunkeeperPoint {
    if (typeof item !== "object" || item === null) {
        return false;
    }
    const p = item as Record<string, unknown>;
    return ["deltaTime", "deltaDistance", "latitude", "longitude"]
        .every(key => typeof p[key] === "number" && Number.isFinite(p[key]));
}

class Route {
    private _trackData: TrackData[] = [];

    private _paceWindow: number = 30;
    private _smoothNeighboursCount: number = 4;
    private _smoothMaxDeviation: number = 10;
    private _paceLimit: number = 10;

    public getPaceWindow(): number {
        return this._paceWindow;
    }

    public setPaceWindow(paceWindow: number): void {
        this._paceWindow = paceWindow;
    }

    public getSmoothNeighboursCount(): number {
        return this._smoothNeighboursCount;
    }

    public setSmoothNeighboursCount(neighboursCount: number): void {
        this._smoothNeighboursCount = neighboursCount;
    }

    public getSmoothMaxDeviation(): number {
        return this._smoothMaxDeviation;
    }

    public setSmoothMaxDeviation(maxDeviation: number): void {
        this._smoothMaxDeviation = maxDeviation;
    }

    public getPaceLimit(): number {
        return this._paceLimit;
    }

    public setPaceLimit(paceLimit: number): void {
        this._paceLimit = paceLimit;
    }

    public getTrackData(): TrackData[] {
        return this._trackData;
    }

    public getPaceAsString(pace: number): string {
        const totalSeconds = Math.round(pace * 60); // min to sec
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return minutes.toString() + ":" + seconds.toString().padStart(2, '0');
    }

    // Throws an Error with a message meant for the user when the data can't be loaded.
    // The track data is cleared first, so it's empty after a failed load.
    public loadData(data: string): void {
        this.loadRunkeeperData(data);
    }

    private loadRunkeeperData(jsonString: string): void {
        this.clearTrackData();
        if (jsonString.trim() === "") {
            throw new Error("Paste the JSON of a Runkeeper activity first.");
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            throw new Error("This isn't valid JSON: " + (e as Error).message, { cause: e });
        }

        const rawPoints = typeof parsed === "object" && parsed !== null
            ? (parsed as { points?: unknown }).points
            : undefined;
        if (!Array.isArray(rawPoints)) {
            throw new Error("No \"points\" list found. Paste the JSON from Runkeeper's /ajax/pointData.");
        }
        if (rawPoints.length === 0) {
            throw new Error("The activity has no GPS points.");
        }

        const points: Point[] = rawPoints.map((item: unknown, i: number) => {
            if (!isRunkeeperPoint(item)) {
                throw new Error(`Point ${i + 1} is missing deltaTime, deltaDistance, latitude or longitude.`);
            }
            return {
                deltaTime: item.deltaTime,
                deltaDistance: item.deltaDistance,
                lat: item.latitude,
                lon: item.longitude,
            };
        });
        this.initTrackData(points);
    }

    private clearTrackData(): void {
        this._trackData = [];
    }

    private initTrackData(points: Point[]): void {
        let totalTime = 0;
        let totalDistance = 0;
        const paceData: Point[] = [];
        this._trackData = points.map(item => {
            totalTime += item.deltaTime;
            totalDistance += item.deltaDistance;
            const limitMilliseconds = this.getPaceWindow() * 1000;

            paceData.push(item);
            let paceTime: number = this.getTotalTime(paceData);
            while (paceTime > limitMilliseconds && paceData.length > 1) {
                paceData.shift();
                paceTime = this.getTotalTime(paceData);
            }
            const paceDistance = this.getTotalDistance(paceData);
            return {
                time: totalTime,
                distance: totalDistance,
                pace: this.calculatePace(paceTime, paceDistance),
                lat: item.lat,
                lon: item.lon,
            };
        });

        const smoothMaxDeviationAsNumber: number = this.getSmoothMaxDeviation() / 100;
        this.smoothTrackData(this.getSmoothNeighboursCount(), smoothMaxDeviationAsNumber);
    }

    private getTotalTime(points: Point[]): number {
        return points.reduce(
            (previousValue, currentValue) => previousValue + currentValue.deltaTime,
            0
        );
    }

    private getTotalDistance(points: Point[]): number {
        return points.reduce(
            (previousValue, currentValue) => previousValue + currentValue.deltaDistance,
            0
        );
    }

    private smoothTrackData(neighboursCount: number, maxDeviation: number) {
        if (neighboursCount < 1 || maxDeviation <= 0)
            return;
        const pointsCount = neighboursCount * 2 + 1;
        if (this._trackData.length < pointsCount)
            return;

        const averagePace: number[] = this.calculateEveragePaceList(neighboursCount);

        for (let i = neighboursCount; i < this._trackData.length - neighboursCount; i++) {
            if (averagePace[i] === 0)
                continue;
            const prevDeviation: number = Math.abs((averagePace[i - 1] - averagePace[i]) / averagePace[i]);
            const nextDeviation: number = Math.abs((averagePace[i + 1] - averagePace[i]) / averagePace[i]);
            if (prevDeviation < maxDeviation || nextDeviation < maxDeviation) {
                this._trackData[i].pace = averagePace[i];
            }
        }
    }

    private calculatePace(time: number, distance: number): number {
        return distance ? ((time / 60000) / (distance / 1000)) : 0;
    }

    private calculateEveragePaceList(neighboursCount: number): number[] {
        const averagePace: number[] = [];
        const pointsCount = neighboursCount * 2 + 1;
        for (let i = 0; i < this._trackData.length; i++) {
            let startIndex = i - neighboursCount;
            if (startIndex < 0) {
                startIndex = 0;
            }
            if (startIndex > this._trackData.length - pointsCount) {
                startIndex = this._trackData.length - pointsCount;
            }
            let sum: number = 0;
            for (let k = startIndex; k < startIndex + pointsCount; k++) {
                sum += this._trackData[k].pace;
            }
            averagePace[i] = sum / pointsCount;
        }
        return averagePace;
    }
}

export type { TrackData };

export default Route;