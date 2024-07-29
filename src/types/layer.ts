export interface Layer {
    digest?: string,
    size?: number,
    command: string,
    vulns?: {
        critical: number,
        high: number,
        medium: number,
        low: number,
        negligible: number
    },
    baseImage: Array<string> | []
}