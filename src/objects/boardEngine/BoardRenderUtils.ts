export function parseHex(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const normalized = value.replace("#", "");
    const parsed = Number.parseInt(normalized, 16);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function mixColors(base: number, overlay: number, amount: number): number {
    const t = Math.max(0, Math.min(1, amount));
    const br = (base >> 16) & 0xff;
    const bg = (base >> 8) & 0xff;
    const bb = base & 0xff;
    const or = (overlay >> 16) & 0xff;
    const og = (overlay >> 8) & 0xff;
    const ob = overlay & 0xff;
    return (Math.round(br + (or - br) * t) << 16)
        | (Math.round(bg + (og - bg) * t) << 8)
        | Math.round(bb + (ob - bb) * t);
}
