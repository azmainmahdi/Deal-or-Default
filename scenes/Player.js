export default class Player {
    constructor(color, startCapital = 5) {
        this.color   = color;       // e.g. 0xff0000
        this.capital = startCapital;
        this.debt    = 0;
        this.square  = 0;           // 0–99
        this.activeProjects = [];   // will hold {ttm, chips, delta, profit}
        this.tariffWaivers = 1;
        this.pendingRewards = []; // array of { amount: 10, turnsLeft: 1 }
        this.willSkipTurn = 0; 
        
    }

    netWorth() {
        const matured = this.activeProjects
                            .filter(p => p.ttm === 0)
                            .reduce((sum, p) => sum + p.profit, 0);
        return this.capital + matured - (this.debt * 1.5);
    }
}