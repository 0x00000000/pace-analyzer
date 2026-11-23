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

class Route {
    private trackData: TrackData[] = [];

    private paceWindow: number = 30;
    private smoothNeighboursCount: number = 4;
    private smoothMaxDeviation: number = 10;
    private paceLimit: number = 10;

    public setSettings(
        paceWindow: string,
        smoothNeighboursCount: string,
        smoothMaxDeviation: string,
        paceLimit: string,
    ): void {
        const paceWindowSave: number = Math.round(Number(paceWindow));
        if (Number.isFinite(paceWindowSave) && paceWindowSave > 0) {
            this.setPaceWindow(paceWindowSave);
        }
        const smoothNeighboursCountSave: number = Math.round(Number(smoothNeighboursCount));
        if (Number.isFinite(smoothNeighboursCountSave) && smoothNeighboursCount.trim() !== "") {
            this.setSmoothNeighboursCount(smoothNeighboursCountSave);
        }
        const saveSmoothMaxDeviation: number = Number(smoothMaxDeviation);
        if (Number.isFinite(saveSmoothMaxDeviation) && smoothMaxDeviation.trim() !== "") {
            this.setSmoothMaxDeviation(saveSmoothMaxDeviation);
        }
        const savePaceLimit = Number(paceLimit);
        if (Number.isFinite(savePaceLimit) && savePaceLimit > 0) {
            this.setPaceLimit(savePaceLimit);
        }
   }

    public getTrackData(): TrackData[] {
        return this.trackData;
    }

    private setTrackData(trackData: TrackData[]): void {
        this.trackData = trackData;
    }

    private clearTrackData(): void {
        this.setTrackData([]);
    }

    public getPaceWindow(): number {
        return this.paceWindow;
    }

    public setPaceWindow(paceWindow: number): void {
        this.paceWindow = paceWindow;
    }

    public getSmoothNeighboursCount(): number {
        return this.smoothNeighboursCount;
    }

    public setSmoothNeighboursCount(neighboursCount: number): void {
        this.smoothNeighboursCount = neighboursCount;
    }

    public getSmoothMaxDeviation(): number {
        return this.smoothMaxDeviation;
    }

    public setSmoothMaxDeviation(maxDeviation: number): void {
        this.smoothMaxDeviation = maxDeviation;
    }

    public getPaceLimit(): number {
        return this.paceLimit;
    }

    public setPaceLimit(paceLimit: number): void {
        this.paceLimit = paceLimit;
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
            if (!this.isRunkeeperPoint(item)) {
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

    private initTrackData(points: Point[]): void {
        let totalTime = 0;
        let totalDistance = 0;
        const paceData: Point[] = [];
        this.setTrackData(points.map(item => {
            totalTime += item.deltaTime;
            totalDistance += item.deltaDistance;
            const limitMilliseconds = this.getPaceWindow() * 1000;

            paceData.push(item);
            let paceTime: number = this.getTotalTime(paceData);
            while (paceTime > limitMilliseconds && paceData.length > 1) {
                const removedPoint: Point | undefined = paceData.shift();
                paceTime = this.getReducedTotalTime(paceTime, removedPoint);
            }
            const paceDistance = this.getTotalDistance(paceData);
            return {
                time: totalTime,
                distance: totalDistance,
                pace: this.calculatePace(paceTime, paceDistance),
                lat: item.lat,
                lon: item.lon,
            };
        }));

        const smoothMaxDeviationAsNumber: number = this.getSmoothMaxDeviation() / 100;
        this.updateTrackDataSmooth(this.getSmoothNeighboursCount(), smoothMaxDeviationAsNumber);
    }

    private getTotalTime(points: Point[]): number {
        return points.reduce(
            (previousValue, currentValue) => previousValue + currentValue.deltaTime,
            0
        );
    }

    private getReducedTotalTime(time: number, removedPoint: Point | undefined): number {
        if (!removedPoint)
            return time;

        return time - removedPoint.deltaTime;
    }

    private getTotalDistance(points: Point[]): number {
        return points.reduce(
            (previousValue, currentValue) => previousValue + currentValue.deltaDistance,
            0
        );
    }

    private updateTrackDataSmooth(neighboursCount: number, maxDeviation: number): void {
        const trackData: TrackData[] = this.getTrackData();

        if (neighboursCount < 1 || maxDeviation <= 0)
            return;

        const pointsCount = neighboursCount * 2 + 1;
        if (trackData.length < pointsCount)
            return;

        const averagePaceList: number[] = this.getAveragePaceList(neighboursCount);

        for (let i = neighboursCount; i < trackData.length - neighboursCount; i++) {
            // A point with no distance stays at pace 0, so it isn't plotted.
            if (trackData[i].pace === 0 || averagePaceList[i] === 0)
                continue;
            const prevDeviation: number = Math.abs((averagePaceList[i - 1] - averagePaceList[i]) / averagePaceList[i]);
            const nextDeviation: number = Math.abs((averagePaceList[i + 1] - averagePaceList[i]) / averagePaceList[i]);
            if (prevDeviation < maxDeviation || nextDeviation < maxDeviation) {
                trackData[i].pace = averagePaceList[i];
            }
        }
    }

    private calculatePace(time: number, distance: number): number {
        return distance ? ((time / 60000) / (distance / 1000)) : 0;
    }

    private getAveragePaceList(neighboursCount: number): number[] {
        const averagePace: number[] = [];
        const pointsCount = neighboursCount * 2 + 1;
        const trackData: TrackData[] = this.getTrackData();

        for (let i = 0; i < trackData.length; i++) {
            let startIndex = i - neighboursCount;
            if (startIndex < 0) {
                startIndex = 0;
            }
            if (startIndex > trackData.length - pointsCount) {
                startIndex = trackData.length - pointsCount;
            }
            // Pace 0 means "no distance covered", not a pace, so those points are left out.
            let sum: number = 0;
            let count: number = 0;
            for (let k = startIndex; k < startIndex + pointsCount; k++) {
                if (trackData[k].pace > 0) {
                    sum += trackData[k].pace;
                    count++;
                }
            }
            averagePace[i] = count > 0 ? sum / count : 0;
        }
        return averagePace;
    }

    private isRunkeeperPoint(item: unknown): item is RunkeeperPoint {
        if (typeof item !== "object" || item === null) {
            return false;
        }
        const testItem = item as Record<string, unknown>;
        const keys: string[] = ["deltaTime", "deltaDistance", "latitude", "longitude"];

        return keys.every(key => typeof testItem[key] === "number" && Number.isFinite(testItem[key]));
    }

}

export type { TrackData };

export default Route;