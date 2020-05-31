import arucoDictionary from "./aruco-dictionary.mjs"

// https://github.com/okalachev/arucogen

export const dictionaries = {
    aruco: {width: 5, height: 5, dict: arucoDictionary.aruco},
    '4x4_1000': {width: 4, height: 4, dict: arucoDictionary["4x4_1000"]},
    '5x5_1000': {width: 5, height: 5, dict: arucoDictionary["5x5_1000"]},
    '6x6_1000': {width: 6, height: 6, dict: arucoDictionary["6x6_1000"]},
    '7x7_1000': {width: 7, height: 7, dict: arucoDictionary["7x7_1000"]},
}

function createWhiteBitRects(bits, width, height) {
    const rects = [];

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (bits[i * height + j]) {
                rects.push(`<rect x="${j + 1}" y="${i + 1}" width="1" height="1" fill="white"/>`);
            }
        }
    }

    return rects;
}

export function createMarkerSVGContent(dictionaryOptions, bits) {
    const {width: bitsWidth, height: bitsHeight} = dictionaryOptions;

    return `<rect x="0" y="0" width="${bitsWidth + 2}" height="${bitsHeight + 2}" fill="black"/>
        ${createWhiteBitRects(bits, bitsWidth, bitsHeight).join('\n')}`
        .replace(/^\s+/gm, '');
}

export function createMarkerSVG(dictionaryOptions, bits, width, height) {
    const {width: bitsWidth, height: bitsHeight} = dictionaryOptions;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bitsWidth + 2} ${bitsHeight + 2}" width="${width}" height="${height}" shape-rendering="crispEdges">
        ${createMarkerSVGContent(dictionaryOptions, bits)}
        </svg>`.replace(/^\s+/gm, '');
}

export function generateMarkerBits(dictionaryOptions, id) {
    const {width, height, dict} = dictionaryOptions;

    const bytes = dict[id];
    const bits = [];
    const bitsCount = width *  height;

    for (const byte of bytes) {
        const start = bitsCount - bits.length;

        for (let i = Math.min(7, start - 1); i >= 0; i--) {
            bits.push((byte >> i) & 1);
        }
    }

    return bits;
}

export function generateMarkerSVG(dictionaryOptions, id, size) {
    const markerBits = generateMarkerBits(dictionaryOptions, id);
    return createMarkerSVG(dictionaryOptions, markerBits, `${size}mm`, `${size}mm`);
}

export function generateMarkerSVGContent(dictionaryOptions, id, size) {
    const markerBits = generateMarkerBits(dictionaryOptions, id);
    return createMarkerSVGContent(dictionaryOptions, markerBits);
}