import constants from "./constants.mjs";
import {generateMarkerSVGContent, dictionaries} from "./aruco.mjs";
import prettier from 'prettier';
import fs from 'fs';
import Color from 'color';

const prettierOptions = {
    parser: 'html',
    printWidth: 120
}

const translations = constants.translations;

const lineWidth = constants.court.lineWidth;
const courtWidth = constants.court.width;
const courtLength = constants.court.length;
const playAreaWidth = constants.playArea.width;
const playAreaLength = constants.playArea.length;
const competitionAreaWidth = constants.competitionArea.width;
const competitionAreaLength = constants.competitionArea.length;
const competitionAreaWidthMinPadding = constants.competitionArea.widthMinPadding;
const competitionAreaLengthMinPadding = constants.competitionArea.lengthMinPadding;
const competitionAreaWidthPaddingActual = (competitionAreaWidth - playAreaWidth) / 2;
const competitionAreaLengthPaddingActual = (competitionAreaLength - playAreaLength) / 2;
const wallThickness = constants.walls.thickness;
const totalLength = competitionAreaLength + 2 * wallThickness;
const totalWidth = competitionAreaWidth + 2 * wallThickness;
const basketRadius = (constants.baskets.outerDiameter + constants.baskets.innerDiameter) / 4;
const basketThickness = (constants.baskets.outerDiameter - constants.baskets.innerDiameter) / 2;
const markerOnBackboardOffsetY = constants.backboard.height - constants.markers.height - constants.markers.offset;
const rightMarkerOnBackboardOffsetX = constants.backboard.width - constants.markers.width - constants.markers.offset;
const markerWidth = constants.markers.width;
const markerHeight = constants.markers.height;
const dimensionLineColor = 'rgba(0,0,0,0.5)';
const dimensionTextColor = 'rgba(0,0,0,0.7)';
const dimensionLineColorLight = 'rgba(255,255,255,0.5)';
const dimensionTextColorLight = 'rgba(255,255,255,0.7)';

const LabelSide = {
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
};

const TextAnchor = {
    middle: 'middle',
    start: 'start',
    end: 'end',
}

const TextDominantBaseline = {
    baseline: 'baseline',
    central: 'central',
    hanging: 'hanging',
}

const moveX = (point, rx) => {
    return {x: point.x + rx, y: point.y};
}

const moveY = (point, ry) => {
    return {x: point.x, y: point.y + ry};
}

const moveXY = (point, rPoint) => {
    return {x: point.x + rPoint.x, y: point.y + rPoint.y};
}

const mirrorX = (point, center) => {
    return {x: 2 * center.x - point.x, y: point.y};
}

const mirrorY = (point, center) => {
    return {x: point.x, y: 2 * center.y - point.y};
}

const mirrorXY = (point, center) => {
    return {x: 2 * center.x - point.x, y: 2 * center.y - point.y};
}

const toSVG = (content, width, height) =>
    prettier.format(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${content}</svg>`, prettierOptions);

const rect = (x, y, width, height, fill, stroke, strokeWidth) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
const circle = (center, r, fill, stroke, strokeWidth, strokeDashArray = 'none') =>
    `<circle cx="${center.x}" cy="${center.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDashArray}"/>`;
const line = (from, to, stroke, strokeWidth) =>
    `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
const text = (label, point, size, color, anchor, dominantBaseline) =>
    `<text x="${point.x}" y="${point.y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" dominant-baseline="${dominantBaseline}" font-family="sans-serif">${label}</text>`;

const arrowHead = (x, y, angle, color) => {
    return `<path d="M${x},${y} L${x + 3},${y + 5} L${x - 3},${y + 5} z" transform="rotate(${angle},${x},${y})" stroke=${color} stroke-width="2"/>`;
}

const arrow = (from, to, color, width) => {
    const angle = 180 * Math.atan2(to.y - from.y, to.x - from.x) / Math.PI;

    return `<g>
        ${line(from, to, color, width)}
        ${arrowHead(from.x, from.y, angle + 270, color, width / 2)}
        ${arrowHead(to.x, to.y, angle + 90, color, width / 2)}
        </g>`;
}

const lineAtAnAngle = (center, angle, length, color, lineWidth = 2, startCap = false, endCap = false) => {
    const halfLength = length / 2;
    const startLength = halfLength + (startCap ? 0.5 * lineWidth : 0);
    const endLength = halfLength + (endCap ? 0.5 * lineWidth : 0);
    const start = {x: -Math.cos(angle) * startLength + center.x, y: -Math.sin(angle) * startLength + center.y};
    const end = {x: Math.cos(angle) * endLength + center.x, y: Math.sin(angle) * endLength + center.y};

    return `${line(start, end, color, lineWidth)}`;
}

const dimensionLine = (
    from, to, color, lineWidth = 2, width = 10,
    startLine = true, endLine = true, startCap = false, endCap = false
) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const center = {x: (from.x + to.x) / 2, y: (from.y + to.y) / 2};
    const length = Math.sqrt(Math.pow(to.y - from.y, 2) + Math.pow(to.x - from.x, 2));

    return `<g>
        ${lineAtAnAngle(center, angle, length - lineWidth, color, lineWidth, startCap, endCap)}
        ${startLine ? lineAtAnAngle(from, angle + Math.PI / 2, width, color, lineWidth) : ''}
        ${endLine ? lineAtAnAngle(to, angle + Math.PI / 2, width, color, lineWidth) : ''}
        </g>`;
}

const dimension = (
    {
        from, to, lineColor, labelColor, label, labelSize, labelSide,
        lineWidth = 2, width = 10, startLine = true, endLine = true, startCap = false, endCap = false
    }) => {
    const labelOffset = width;
    let labelPoint = {x: (from.x + to.x) / 2, y: (from.y + to.y) / 2};
    let textAnchor = TextAnchor.middle;
    let dominantBaseline = TextDominantBaseline.central;

    switch (labelSide) {
        case LabelSide.top:
            labelPoint.y -= labelOffset;
            dominantBaseline = TextDominantBaseline.baseline;
            break;
        case LabelSide.right:
            labelPoint.x += labelOffset;
            textAnchor = TextAnchor.start;
            break;
        case LabelSide.bottom:
            labelPoint.y += labelOffset;
            dominantBaseline = TextDominantBaseline.hanging;
            break;
        case LabelSide.left:
            labelPoint.x -= labelOffset;
            textAnchor = TextAnchor.end;
            break;
    }

    return `<g>
        ${dimensionLine(from, to, lineColor, lineWidth, width, startLine, endLine, startCap, endCap)}
        ${text(label, labelPoint, labelSize, labelColor, textAnchor, dominantBaseline)}
        </g>`;
}

const court = (offsetX, offsetY) => `<g transform="translate(${offsetX}, ${offsetY})">
    ${rect(0, 0, courtLength, courtWidth, constants.colors.court, 'none', 0)}
    ${rect(0.5 * lineWidth, 0.5 * lineWidth, courtLength - lineWidth, courtWidth - lineWidth, 'none', constants.colors.outsideLine, lineWidth)}
    ${rect(1.5 * lineWidth, 1.5 * lineWidth, courtLength - 3 * lineWidth, courtWidth - 3 * lineWidth, 'none', constants.colors.insideLine, lineWidth)}
    ${line({x: 0.5 * courtLength, y: 2 * lineWidth}, {x: 0.5 * courtLength, y: courtWidth - 2 * lineWidth}, constants.colors.insideLine, lineWidth)}
    </g>`;

const playArea = (offsetX, offsetY) => `<g transform="translate(${offsetX}, ${offsetY})">
    ${rect(0, 0, playAreaLength, playAreaWidth, constants.colors.court, 'none', 0)}
    </g>`;

const competitionArea = (offsetX, offsetY) => `<g transform="translate(${offsetX}, ${offsetY})">
    ${rect(0, 0, competitionAreaLength, competitionAreaWidth, constants.colors.outsideCourt, 'none', 0)}
    </g>`;

const walls = (offsetX, offsetY) => `<g transform="translate(${offsetX}, ${offsetY})">
    ${rect(0.5 * wallThickness, 0.5 * wallThickness, competitionAreaLength + wallThickness, competitionAreaWidth + wallThickness, constants.colors.outsideCourt, constants.colors.walls, wallThickness)}
    </g>`;

const basketTop = (offsetX, offsetY, rotation, color) => `<g transform="translate(${offsetX}, ${offsetY}) rotate(${rotation})">
    ${rect(0, 0, constants.backboard.thickness, constants.backboard.width, constants.colors.backboard, 'none', 0)}
    ${circle({x: constants.backboard.thickness + 0.5 * constants.baskets.outerDiameter, y: constants.backboard.width / 2}, basketRadius, 'none', color, basketThickness)}
    </g>`;

const basketMarker = (id, width, height, offsetX, offsetY) => {
    const dictionaryOptions = dictionaries.aruco;
    const xScale = width / (dictionaryOptions.width + 2);
    const yScale = height / (dictionaryOptions.height + 2);

    return `<g shape-rendering="crispEdges" transform="translate(${offsetX}, ${offsetY}) scale(${xScale}, ${yScale})">
        ${generateMarkerSVGContent(dictionaries.aruco, id)}
        </g>`;
}

const basketFront = (offsetX, offsetY, color, markerIDs) => `<g transform="translate(${offsetX}, ${offsetY})">
    ${rect(0, 0, constants.backboard.width, constants.backboard.height, constants.colors.backboard, Color('#FFF').darken(0.5).rgb(), 2)}
    ${rect((constants.backboard.width - constants.baskets.outerDiameter) / 2, constants.backboard.height - constants.baskets.height, constants.baskets.outerDiameter, constants.baskets.height, color, Color(color).darken(0.5).rgb(), 2)}
    ${basketMarker(markerIDs[0], constants.markers.width, constants.markers.height, constants.markers.offset, markerOnBackboardOffsetY)}
    ${basketMarker(markerIDs[1], constants.markers.width, constants.markers.height, rightMarkerOnBackboardOffsetX, markerOnBackboardOffsetY)}
    </g>`;

const basketFrontWithDimensions = (color, markerIDs) => {
    const offset = {x: 2, y: 2};
    const backboardZero = {x: offset.x, y: offset.y + constants.backboard.height}; // bottom left coordinate
    const backboardBottomRight = moveX(backboardZero, constants.backboard.width);
    const firstDimensionOffset = 20;
    const secondDimensionOffsetX = 100;
    const secondDimensionOffsetY = 80;
    const lineColor = dimensionLineColor;
    const labelColor = dimensionTextColor;
    const labelSize = 30;

    const createDimension = ({from, to, labelSide, startLine = true}) => {
        const length = Math.sqrt(Math.pow(to.y - from.y, 2) + Math.pow(to.x - from.x, 2));
        return dimension({from, to, lineColor, labelColor, label: length, labelSize, labelSide, startLine});
    };

    const markerOffsetXFrom = moveY(backboardBottomRight, firstDimensionOffset);
    const markerOffsetXTo = moveX(markerOffsetXFrom, -constants.markers.offset);
    const dimensionMarkerOffsetX = createDimension({
        from: markerOffsetXFrom,
        to: markerOffsetXTo,
        labelSide: LabelSide.bottom,
    });

    const markerWidthTo = moveX(markerOffsetXTo, -constants.markers.width);
    const dimensionMarkerWidth = createDimension({
        from: markerOffsetXTo,
        to: markerWidthTo,
        labelSide: LabelSide.bottom,
        startLine: false,
    });

    const markerOffsetYFrom = moveX(backboardBottomRight, firstDimensionOffset);
    const markerOffsetYTo = moveY(markerOffsetYFrom, -constants.markers.offset);
    const dimensionMarkerOffsetY = createDimension({
        from: markerOffsetYFrom,
        to: markerOffsetYTo,
        labelSide: LabelSide.right,
    });

    const markerHeightTo = moveY(markerOffsetYTo, -constants.markers.width);
    const dimensionMarkerHeight = createDimension({
        from: markerOffsetYTo,
        to: markerHeightTo,
        labelSide: LabelSide.right,
        startLine: false,
    });

    const basketBottomRight = moveX(backboardZero, (constants.backboard.width + constants.baskets.outerDiameter) / 2);
    const basketWidthFrom = moveY(basketBottomRight, firstDimensionOffset);
    const basketWidthTo = moveX(basketWidthFrom, -constants.baskets.outerDiameter);
    const dimensionBasketWidth = createDimension({
        from: basketWidthFrom,
        to: basketWidthTo,
        labelSide: LabelSide.bottom,
    });

    const basketHeightFrom = moveX(basketBottomRight, firstDimensionOffset);
    const basketHeightTo = moveY(basketHeightFrom, -constants.baskets.height);
    const dimensionBasketHeight = createDimension({
        from: basketHeightFrom,
        to: basketHeightTo,
        labelSide: LabelSide.right,
    });

    const backboardWidthFrom = moveY(backboardZero, secondDimensionOffsetY);
    const backboardWidthTo = moveX(backboardWidthFrom, constants.backboard.width);
    const dimensionBackboardWidth = createDimension({
        from: backboardWidthFrom,
        to: backboardWidthTo,
        labelSide: LabelSide.bottom,
    });

    const backboardHeightFrom = moveX(backboardBottomRight, secondDimensionOffsetX);
    const backboardHeightTo = moveY(backboardHeightFrom, -constants.backboard.height);
    const dimensionBackboardHeight = createDimension({
        from: backboardHeightFrom,
        to: backboardHeightTo,
        labelSide: LabelSide.right,
    });

    return `<g>
        ${basketFront(offset.x, offset.y, color, markerIDs)}
        <g>
        ${dimensionMarkerOffsetX}
        ${dimensionMarkerWidth}
        ${dimensionMarkerOffsetY}
        ${dimensionMarkerHeight}
        ${dimensionBasketWidth}
        ${dimensionBasketHeight}
        ${dimensionBackboardWidth}
        ${dimensionBackboardHeight}
        </g>
        </g>`;
}

const basketSide = (offsetX, offsetY, color) => `<g transform="translate(${offsetX}, ${offsetY})">
    ${rect(0, 0, constants.backboard.thickness, constants.backboard.height, constants.colors.backboard, 'none', 0)}
    ${rect(constants.backboard.thickness, constants.backboard.height - constants.baskets.height, constants.baskets.outerDiameter, constants.baskets.height, color, 'none', 0)}
    </g>`;

const competitionAreaTop = (offsetX, offsetY, addBaskets = true) => {
    const courtOffsetX = (totalLength - courtLength) / 2;
    const courtOffsetY = (totalWidth - courtWidth) / 2;

    const backboardThickness = constants.backboard.thickness;
    const backboardWidth = constants.backboard.width;
    const basket1Color = constants.colors.basket1;
    const basket2Color = constants.colors.basket2;
    const baskets = addBaskets
        ? `${basketTop(courtOffsetX - backboardThickness, (totalWidth - backboardWidth) / 2, 0, basket1Color)}
            ${basketTop(courtOffsetX + courtLength + backboardThickness, (totalWidth + backboardWidth) / 2, 180, basket2Color)}`
        : '';

    return `<g transform="translate(${offsetX}, ${offsetY})">
        ${competitionArea(wallThickness, wallThickness)}
        ${walls(0, 0)}
        ${playArea((totalLength - playAreaLength) / 2, (totalWidth - playAreaWidth) / 2)}
        ${court(courtOffsetX, courtOffsetY)}
        ${baskets}
        </g>`;
}

const playAreaWithMarkingsTop = () => {
    const courtOffsetX = (playAreaLength - courtLength) / 2;
    const courtOffsetY = (playAreaWidth - courtWidth) / 2;

    return `<g>
        ${playArea(0, 0)}
        ${court(courtOffsetX, courtOffsetY)}
        </g>`;
}

const courtTopWithDimensions = (locale = 'en') => {
    const offset = {x: 0, y: 0};
    const competitionAreaTopLeft = {x: offset.x + wallThickness, y: offset.y + wallThickness};
    const competitionAreaBottomRight = moveXY(competitionAreaTopLeft, {x: competitionAreaLength, y: competitionAreaWidth});
    const competitionAreaZero = moveY(competitionAreaTopLeft, competitionAreaWidth); // bottom left coordinate
    const playAreaTopLeft = moveXY(
        competitionAreaTopLeft,
        {x: (competitionAreaLength - playAreaLength) / 2, y: (competitionAreaWidth - playAreaWidth) / 2}
        );
    const playAreaBottomRight = moveXY(playAreaTopLeft, {x: playAreaLength, y: playAreaWidth});
    const playAreaZero = moveY(playAreaTopLeft, playAreaWidth);
    const courtTopLeft = moveXY(
        playAreaTopLeft,
        {x: (playAreaLength - courtLength) / 2, y: (playAreaWidth - courtWidth) / 2}
    );
    const courtBottomRight = moveXY(courtTopLeft, {x: courtLength, y: courtWidth});
    const courtZero = moveY(courtTopLeft, courtWidth);

    const labelSize = 240;

    const createDimension = (
        {
            from, to, labelSide, label = null, lineColor = dimensionLineColor,
            labelColor = dimensionTextColor, startLine = true, endLine = true, startCap = false, endCap = false
        }
    ) => {
        if (label == null) {
            // label = length
            label = Math.sqrt(Math.pow(to.y - from.y, 2) + Math.pow(to.x - from.x, 2));
        }

        return dimension({
            from,
            to,
            lineColor,
            labelColor,
            label,
            labelSize,
            labelSide,
            lineWidth: 16,
            width: 100,
            startLine,
            endLine,
            startCap,
            endCap,
        });
    };

    const competitionAreaLengthFrom = moveY(competitionAreaZero, 160);
    const competitionAreaLengthTo = moveX(competitionAreaLengthFrom, competitionAreaLength);
    const dimensionCompetitionAreaLength = createDimension({
        from: competitionAreaLengthFrom,
        to: competitionAreaLengthTo,
        labelSide: LabelSide.bottom,
        label: `${playAreaLength + competitionAreaLengthMinPadding * 2}+`,
    });

    const competitionAreaWidthFrom = moveX(competitionAreaBottomRight, 160);
    const competitionAreaWidthTo = moveY(competitionAreaWidthFrom, -competitionAreaWidth);
    const dimensionCompetitionAreaWidth = createDimension({
        from: competitionAreaWidthFrom,
        to: competitionAreaWidthTo,
        labelSide: LabelSide.right,
        label: `${playAreaWidth + competitionAreaWidthMinPadding * 2}+`,
    });

    const playAreaLengthFrom = moveY(playAreaZero, 160);
    const playAreaLengthTo = moveX(playAreaLengthFrom, playAreaLength);
    const dimensionPlayAreaLength = createDimension({
        from: playAreaLengthFrom,
        to: playAreaLengthTo,
        labelSide: LabelSide.bottom,
        lineColor: dimensionLineColorLight,
        labelColor: dimensionTextColorLight,
    });

    const dimensionCompetitionAreaLengthPadding = createDimension({
        from: moveX(playAreaLengthFrom, -competitionAreaLengthPaddingActual),
        to: playAreaLengthFrom,
        labelSide: LabelSide.bottom,
        label: `${competitionAreaLengthMinPadding}+`,
        lineColor: dimensionLineColorLight,
        labelColor: dimensionTextColorLight,
        startLine: false,
        endLine: false,
        startCap: true,
    });

    const playAreaWidthFrom = moveX(playAreaBottomRight, 160);
    const playAreaWidthTo = moveY(playAreaWidthFrom, -playAreaWidth);
    const dimensionPlayAreaWidth = createDimension({
        from: playAreaWidthFrom,
        to: playAreaWidthTo,
        labelSide: LabelSide.right,
        lineColor: dimensionLineColorLight,
        labelColor: dimensionTextColorLight,
    });

    const dimensionCompetitionAreaWidthPadding = createDimension({
        from: playAreaWidthTo,
        to: moveY(playAreaWidthTo, -competitionAreaWidthPaddingActual),
        labelSide: LabelSide.right,
        label: `${competitionAreaWidthMinPadding}+`,
        lineColor: dimensionLineColorLight,
        labelColor: dimensionTextColorLight,
        startLine: false,
        endLine: false,
        endCap: true,
    });

    const courtLengthFrom = moveY(courtZero, 80);
    const courtLengthTo = moveX(courtLengthFrom, courtLength);
    const dimensionCourtLength = createDimension({
        from: courtLengthFrom,
        to: courtLengthTo,
        labelSide: LabelSide.bottom,
    });

    const courtWidthFrom = moveX(courtBottomRight, 80);
    const courtWidthTo = moveY(courtWidthFrom, -courtWidth);
    const dimensionCourtWidth = createDimension({
        from: courtWidthFrom,
        to: courtWidthTo,
        labelSide: LabelSide.right,
    });

    const courtCenter = moveXY(courtZero, {x: 0.5 * courtLength, y: -0.5 * courtWidth});
    const leftFreeThrow = moveXY(courtZero, {
        x: constants.baskets.outerDiameter + constants.freeThrow.fromBasket,
        y: -0.5 * courtWidth
    });
    const rightFreeThrow = mirrorX(leftFreeThrow, courtCenter);

    const dimensionFreeThrow = createDimension({
        from: moveXY(leftFreeThrow,  {x: -constants.freeThrow.fromBasket, y: 160}),
        to: moveY(leftFreeThrow, 160),
        labelSide: LabelSide.bottom,
    });

    return `<g>
        ${competitionAreaTop(offset.x, offset.y)}
        <g>
        ${dimensionCompetitionAreaLength}
        ${dimensionCompetitionAreaWidth}
        ${dimensionCompetitionAreaLengthPadding}
        ${dimensionCompetitionAreaWidthPadding}
        ${dimensionPlayAreaLength}
        ${dimensionPlayAreaWidth}
        ${dimensionCourtLength}
        ${dimensionCourtWidth}
        ${circle(leftFreeThrow, 40, 'none', 'black', 10, "30")}
        ${circle(rightFreeThrow, 40, 'none', 'black', 10, "30")}
        ${dimensionFreeThrow}
        ${text(translations.ballLocationBeforeFreeThrow[locale], moveY(leftFreeThrow, -80), 120, dimensionTextColor, TextAnchor.middle, TextDominantBaseline.baseline)}
        ${text(translations.competitionArea[locale], moveXY(competitionAreaTopLeft, {x: 100, y: 100}), 200, dimensionTextColorLight, TextAnchor.start, TextDominantBaseline.hanging)}
        ${text(translations.playArea[locale], moveXY(playAreaTopLeft, {x: 100, y: 100}), 200, dimensionTextColor, TextAnchor.start, TextDominantBaseline.hanging)}
        ${text(translations.court[locale], moveXY(courtTopLeft, {x: 200, y: 200}), 200, dimensionTextColor, TextAnchor.start, TextDominantBaseline.hanging)}
        </g>
        </g>`;
}

const courtSVG = toSVG(court(0, 0), courtLength, courtWidth);
const playAreaWithMarkingsTopSVG = toSVG(playAreaWithMarkingsTop(0, 0), playAreaLength, playAreaWidth);
const competitionAreaSVG = toSVG(competitionAreaTop(0, 0), totalLength, totalWidth);
const courtWithDimensionsEnglishSVG = toSVG(courtTopWithDimensions('en'), totalLength + 900, totalWidth + 500);
const courtWithDimensionsEstonianSVG = toSVG(courtTopWithDimensions('et'), totalLength + 900, totalWidth + 500);
const basket1FrontSVG = toSVG(basketFront(0, 0, constants.colors.basket1, constants.markers.basket1IDs), constants.backboard.width, constants.backboard.height);
const basket2FrontSVG = toSVG(basketFront(0, 0, constants.colors.basket2, constants.markers.basket2IDs), constants.backboard.width, constants.backboard.height);
const basket1FrontWithDimensionsSVG = toSVG(basketFrontWithDimensions(constants.colors.basket1, constants.markers.basket1IDs), constants.backboard.width + 180, constants.backboard.height + 120);
const basket2FrontWithDimensionsSVG = toSVG(basketFrontWithDimensions(constants.colors.basket2, constants.markers.basket2IDs), constants.backboard.width + 180, constants.backboard.height + 120);
const markerBasket1LeftSVG = toSVG(basketMarker(constants.markers.basket1IDs[0], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);
const markerBasket1RightSVG = toSVG(basketMarker(constants.markers.basket1IDs[1], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);
const markerBasket2LeftSVG = toSVG(basketMarker(constants.markers.basket2IDs[0], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);
const markerBasket2RightSVG = toSVG(basketMarker(constants.markers.basket2IDs[1], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);


fs.writeFileSync('court_markings.svg', playAreaWithMarkingsTopSVG);
fs.writeFileSync('competition_area_top.svg', competitionAreaSVG);
fs.writeFileSync('competition_area_top_with_dimensions_en.svg', courtWithDimensionsEnglishSVG);
fs.writeFileSync('competition_area_top_with_dimensions_et.svg', courtWithDimensionsEstonianSVG);
fs.writeFileSync('basket_1_front.svg', basket1FrontSVG);
fs.writeFileSync('basket_2_front.svg', basket2FrontSVG);
fs.writeFileSync('basket_1_front_with_dimensions.svg', basket1FrontWithDimensionsSVG);
fs.writeFileSync('basket_2_front_with_dimensions.svg', basket2FrontWithDimensionsSVG);
fs.writeFileSync('marker_basket_1_left.svg', markerBasket1LeftSVG);
fs.writeFileSync('marker_basket_1_right.svg', markerBasket1RightSVG);
fs.writeFileSync('marker_basket_2_left.svg', markerBasket2LeftSVG);
fs.writeFileSync('marker_basket_2_right.svg', markerBasket2RightSVG);
