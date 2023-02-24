
// Copyright (c) 4Sight http://github.com/4s1ght (24.02.2023)

import EventEmitter from "events";
import os from "os"


interface CPUValues {
    /** Represents total CPU core usage. */
    total: number
    /** Represents CPU usage by the system. */
    sys: number
    /** Represents CPU usage by the user like time spent on applications. */
    user: number
    /** Represents CPU usage caused by system interrupts. */
    irq: number
}

interface CPUUsage extends CPUValues {
    /** Represents per-core CPU usage. */
    cores: CPUValues[];
}

type CPUEventCallback = (data: CPUUsage) => any


export default class CPUMonitor extends EventEmitter {

    public declare on: (event: "data", listener: CPUEventCallback) => this
    
    private timer?: NodeJS.Timer;
    private lastUsage: os.CpuInfo[] = [];

    constructor() {
        super()
    }

    /** 
     * Starts monitoring the CPU and reporting the readouts through a `data` event.
     * Correct values are calculated starting from the second readout.  
     * The frequency of readouts defaults to 1 second.
     */
    public start(intervals: number = 1000) {
        this.timer = setInterval(this.tick(this, intervals), intervals);
        return this;
    }

    /** Stops monitoring CPU usage. */
    public stop() {
        clearInterval(this.timer);
        return this;
    }

    private tick(self: CPUMonitor, intervals: number) {
        
        // Get the usage values per CPU thread
        function getCoreUsage(cpuN: os.CpuInfo, cpuO: os.CpuInfo) {
            const tN = cpuN.times, tO = cpuO.times;
            const totalN = tN.user + tN.nice + tN.sys + tN.irq;
            const totalO = tO.user + tO.nice + tO.sys + tO.irq;

            return {
                total: (totalN - totalO)   / intervals * 100,
                sys:   (tN.sys - tO.sys)   / intervals * 100,
                user:  (tN.user - tO.user) / intervals * 100,
                irq:   (tN.irq - tO.irq)   / intervals * 100
            }
        }

        return () => {

            const cpuNew = os.cpus();

            let whole = { total: 0, sys: 0, user: 0, irq: 0 }
            
            const cores = self.lastUsage.map((cpuOld, i) => {
                const core = getCoreUsage(cpuNew[i], cpuOld);
                whole.total += core.total;
                whole.sys   += core.sys;
                whole.user  += core.user;
                whole.irq   += core.irq;
                return core;
            });

            const data: CPUUsage = { 
                total:  whole.total / cores.length,
                sys:    whole.sys   / cores.length,
                user:   whole.user  / cores.length,
                irq:    whole.irq   / cores.length,
                cores 
            }

            self.lastUsage = cpuNew;
            self.emit('data', data);
        }
    }

}
