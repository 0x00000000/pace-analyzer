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

type TimeDistance = {
    time: number;
    distance: number;
}

class Route {
    private _points: Point[] = [];
    private _timeDistance: TimeDistance[] = [];

    constructor() {

    }

    public loadData(jsonString: string): void {
        console.log(jsonString);

        let parsed;
        try {
            parsed = JSON.parse(jsonString);
            if (parsed.points) {
                this._points = parsed.points;
            } else {
                this._points = [];
            }
            this.initTimeDistance();
        } catch (e) {
            console.log((e as Error).message);
        }
        console.log(this.getTimeDistance());
    }

    private initTimeDistance(): void {
        let totalTime = 0;
        this._timeDistance = this._points.map(item => {
            totalTime += item.deltaTime;
            return {time: totalTime, distance: item.deltaDistance};
        });
    }

    public getTimeDistance(): TimeDistance[] {
        return this._timeDistance;
    }
}

export default Route;