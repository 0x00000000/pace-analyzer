type Point = {
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

type TrackData = {
    time: number;
    distance: number;
    pace: number;
    deltaDistance: number;
    lat: number;
    lon: number;
};

class Route {
    private _points: Point[] = [];
    private _trackData: TrackData[] = [];

    private _paceTimeLimit: number = 30000;
    private _smoothNeighboursCount: number = 3;
    private _smoothMaxDeviation: number = 0.1;

    constructor() {

    }

    public getPaceTimeLimit(): number {
        return this._paceTimeLimit;
    }

    public setPaceTimeLimit(limit: number): void {
        this._paceTimeLimit = limit;
    }

    public getSmoothNeighboursCount(): number {
        return this._smoothNeighboursCount;
    }

    public setSmoothNeighboursCount(limit: number): void {
        this._smoothNeighboursCount = limit;
    }

    public getSmoothMaxDeviation(): number {
        return this._smoothMaxDeviation;
    }

    public setSmoothMaxDeviation(limit: number): void {
        this._smoothMaxDeviation = limit;
    }

    public getTrackData(): TrackData[] {
        return this._trackData;
    }

    public getPaceAsString(pace: number): string {
        // Round to whole seconds first, so 5.999 becomes 6:00 and not 5:60.
        const totalSeconds = Math.round(pace * 60);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return minutes.toString() + ":" + seconds.toString().padStart(2, '0');
    }

    public loadData(jsonString: string): void {
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
            if (parsed.points) {
                this._points = parsed.points;
            } else {
                this._points = [];
            }
            this.initTrackData();
        } catch (e) {
            console.log((e as Error).message);
        }
    }

    private initTrackData(): void {
        let totalTime = 0;
        let totalDistance = 0;
        let paceData: Point[] = [];
        this._trackData = this._points.map(item => {
            totalTime += item.deltaTime;
            totalDistance += item.deltaDistance;
            paceData.push(item);
            let paceTime: number = paceData.reduce(
                (previousValue, currentValue) => previousValue + currentValue.deltaTime,
                0
            );
            if (paceTime > this._paceTimeLimit) {
                paceData.shift();
                paceTime = paceData.reduce(
                    (previousValue, currentValue) => previousValue + currentValue.deltaTime,
                    0
                );
            }
            let paceDistance = paceData.reduce(
                (previousValue, currentValue) => previousValue + currentValue.deltaDistance,
                0
            );
            return {
                time: totalTime,
                distance: totalDistance,
                pace: this.calculatePace(paceTime, paceDistance),
                deltaDistance: item.deltaDistance,
                lat: item.latitude,
                lon: item.longitude,
            };
        });

        this.smoothTrackData(this.getSmoothNeighboursCount(), this.getSmoothMaxDeviation());
    }

    private smoothTrackData(neighboursCount: number = 3, maxDeviation: number = 0.1) {
        if (neighboursCount < 1 || maxDeviation <= 0)
            return;
        const pointsCount = neighboursCount * 2 + 1;
        if (this._trackData.length < pointsCount)
            return;

        let averagePace: number[] = this.calculageEveragePaceList(neighboursCount);

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

    private calculageEveragePaceList(neighboursCount: number): number[] {
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