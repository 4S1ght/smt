
import os from 'os'

interface CPUValues {
    /** Represents total CPU core usage. */
    total: number
    /** Represents CPU usage by the system. */
    sys: number
    /** Represents CPU usage by the user like time spent on applications. */
    user: number
    /** Represents CPU usage caused by system interrupts. */
    irq: number
    /** Represents CPU usage caused by low priority processes. */
    nice: number
}

interface CPUUsage extends CPUValues {
    /** Represents per-core CPU usage. */
    cores: CPUValues[],
    /** 
     * Represents CPU usage of this NodeJS process. The value can differ 
     * from the actual ones as NodeJS can offload async tasks to separate threads. 
     * */
    process: {
        system: number
        user: number
    }
}

class CPU {

    private constructor() {}
    public static getInstance = () => new this()

    private lastCall = 0
    private lastGlobalUsage: os.CpuInfo[] = []
    private lastProcessUsage: NodeJS.CpuUsage = { user: 0, system: 0 }

    // Gets per-thread usage values
    private getCoreUsage(cpuN: os.CpuInfo, cpuO: os.CpuInfo, interval: number) {
        const tN = cpuN.times, tO = cpuO.times;
        const totalN = tN.user + tN.nice + tN.sys + tN.irq + tN.nice
        const totalO = tO.user + tO.nice + tO.sys + tO.irq + tO.nice

        return {
            total: (totalN - totalO)    / interval * 100,
            sys:   (tN.sys - tO.sys)    / interval * 100,
            user:  (tN.user - tO.user)  / interval * 100,
            irq:   (tN.irq - tO.irq)    / interval * 100,
            nice:  (tN.nice - tO.nice)  / interval * 100
        }
    }

    /**
     * Process CPU usage is represented in microsecond, unlike the global usage in milliseconds.
     */
    private getprocessCpuUsage(cpuN: NodeJS.CpuUsage, cpuO: NodeJS.CpuUsage, interval: number): NodeJS.CpuUsage {
        return {
            system: (cpuN.system - cpuO.system) / (interval * 1000) * 100,
            user:   (cpuN.user   - cpuO.user)   / (interval * 1000) * 100
        }
    }

    public getUsage() {

        const now = Date.now()
        const interval = now - this.lastCall
        const cpuNewGlobal = os.cpus()
        const cpuNewProcess = process.cpuUsage()

        let $global = { 
            total: 0, 
            sys: 0, 
            user: 0, 
            irq: 0, 
            nice: 0 
        }

        const cores = this.lastGlobalUsage.map((cpuOld, i) => {
            const core = this.getCoreUsage(cpuNewGlobal[i], cpuOld, interval)
            $global.total += core.total
            $global.sys   += core.sys
            $global.user  += core.user
            $global.irq   += core.irq
            $global.nice  += core.nice
            return core;
        });


        const data: CPUUsage = { 
            total:  $global.total / cores.length,
            sys:    $global.sys   / cores.length,
            user:   $global.user  / cores.length,
            irq:    $global.irq   / cores.length,
            nice:   $global.nice  / cores.length,
            process: this.getprocessCpuUsage(cpuNewProcess, this.lastProcessUsage, interval),
            cores
        }

        this.lastGlobalUsage = cpuNewGlobal
        this.lastProcessUsage = cpuNewProcess
        this.lastCall = now

        return data

    }

}

export default CPU.getInstance
