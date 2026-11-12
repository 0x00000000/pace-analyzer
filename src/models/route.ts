type RenkeeperPoint = {
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
    private _trackData: TrackData[] = [];

    private _paceTimeLimit: number = 30;
    private _smoothNeighboursCount: number = 4;
    private _smoothMaxDeviation: number = 10;

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
        const totalSeconds = Math.round(pace * 60); // min to sec
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return minutes.toString() + ":" + seconds.toString().padStart(2, '0');
    }

    public loadData(data: string): void {
        this.loadRunkeeperData(data);
    }

    private loadRunkeeperData(jsonString: string): void {
        this.clearTrackData();
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed.points && Array.isArray(parsed.points)) {
                const points: Point[] = parsed.points.map(
                    (item: RenkeeperPoint) => ({
                        deltaTime: item.deltaTime,
                        deltaDistance: item.deltaDistance,
                        lat: item.latitude,
                        lon: item.longitude,
                    })
                );
                this.initTrackData(points);
            }
        } catch (e) {
            console.log("Couldn't load data. " + (e as Error).message);
        }
    }

    private clearTrackData(): void {
        this._trackData = [];
    }

    private initTrackData(points: Point[]): void {
        let totalTime = 0;
        let totalDistance = 0;
        let paceData: Point[] = [];
        this._trackData = points.map(item => {
            totalTime += item.deltaTime;
            totalDistance += item.deltaDistance;
            const limitMilliseconds = this.getPaceTimeLimit() * 1000;

            paceData.push(item);
            let paceTime: number = this.getTotalTime(paceData);
            if (paceTime > limitMilliseconds) {
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