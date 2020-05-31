import constants from "./constants.mjs";
import {generateMarkerSVGContent, dictionaries} from "./aruco.mjs";
import prettier from 'prettier';
import fs from 'fs';
import Color from 'color';

const prettierOptions = {
    parser: 'html',
    printWidth: 120
}

const lineWidth = constants.court.lineWidth;
const courtWidth = constants.court.width;
const courtLength = constants.court.length;
const playAreaWidth = constants.playArea.width;
const playAreaLength = constants.playArea.length;
const competitionAreaWidth = constants.competitionArea.width;
const competitionAreaLength = constants.competitionArea.length;
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

const toSVG = (content, width, height) =>
    prettier.format(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${content}</svg>`, prettierOptions);

const rect = (x, y, width, height, fill, stroke, strokeWidth) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
const circle = (cx, cy, r, fill, stroke, strokeWidth) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
const line = (x1, y1, x2, y2, stroke, strokeWidth) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

const arrowHead = (x, y, angle, color) => {
    return `<path d="M${x},${y} L${x + 3},${y + 5} L${x - 3},${y + 5} z" transform="rotate(${angle},${x},${y})" stroke=${color} stroke-width="2"/>`;
}

const arrow = (from, to, color, width) => {
    const angle = 180 * Math.atan2(to.y - from.y, to.x - from.x) / Math.PI;

    return `<g>
        ${line(from.x, from.y, to.x, to.y, color, width)}
        ${arrowHead(from.x, from.y, angle + 270, color, width / 2)}
        ${arrowHead(to.x, to.y, angle + 90, color, width / 2)}
        </g>`;
}

const lineAtAnAngle = (center, angle, length, color, lineWidth = 2) => {
    const halfLength = length / 2;
    const start = {x: Math.cos(angle) * halfLength + center.x, y: Math.sin(angle) * halfLength + center.y};
    const end = {x: -Math.cos(angle) * halfLength + center.x, y: -Math.sin(angle) * halfLength + center.y};

    return `${line(start.x, start.y, end.x, end.y, color, lineWidth)}`;
}

const dimensionLine = (from, to, color, lineWidth = 2, width = 10, startLine = true, endLine = true) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const center = {x: (from.x + to.x) / 2, y: (from.y + to.y) / 2};;
    const length = Math.sqrt(Math.pow(to.y - from.y, 2) + Math.pow(to.x - from.x, 2));

    return `<g>
        ${lineAtAnAngle(center, angle, length - lineWidth, color, lineWidth)}
        ${startLine ? lineAtAnAngle(from, angle + Math.PI / 2, width, color, lineWidth) : ''}
        ${endLine ? lineAtAnAngle(to, angle + Math.PI / 2, width, color, lineWidth) : ''}
        </g>`;
}

const dimension = ({from, to, lineColor, labelColor, label, labelSize, labelSide, lineWidth = 2, width = 10, startLine = true, endLine = true}) => {
    const labelOffset = width;
    let labelPoint = {x: (from.x + to.x) / 2, y: (from.y + to.y) / 2};
    let textAnchor = 'middle';
    let alignmentBaseline = 'middle';

    switch (labelSide) {
        case LabelSide.top:
            labelPoint.y -= labelOffset;
            textAnchor = 'middle';
            alignmentBaseline = 'baseline';
            break;
        case LabelSide.right:
            labelPoint.x += labelOffset;
            textAnchor = 'start';
            alignmentBaseline = 'central';
            break;
        case LabelSide.bottom:
            labelPoint.y += labelOffset;
            textAnchor = 'middle';
            alignmentBaseline = 'hanging';
            break;
        case LabelSide.left:
            labelPoint.x -= labelOffset;
            textAnchor = 'end';
            alignmentBaseline = 'central';
            break;
    }

    return `<g>
        ${dimensionLine(from, to, lineColor, lineWidth, width, startLine, endLine)}
        <text x="${labelPoint.x}" y="${labelPoint.y}" font-size="${labelSize}" fill="${labelColor}" text-anchor="${textAnchor}" alignment-baseline="${alignmentBaseline}" font-family="sans-serif">${label}</text>
        </g>`;
}

const court = (offsetX, offsetY) => `<g transform="translate(${offsetX}, ${offsetY})">
    ${rect(0, 0, courtLength, courtWidth, constants.colors.court, 'none', 0)}
    ${rect(0.5 * lineWidth, 0.5 * lineWidth, courtLength - lineWidth, courtWidth - lineWidth, 'none', constants.colors.outsideLine, lineWidth)}
    ${rect(1.5 * lineWidth, 1.5 * lineWidth, courtLength - 3 * lineWidth, courtWidth - 3 * lineWidth, 'none', constants.colors.insideLine, lineWidth)}
    ${line(0.5 * courtLength, 2 * lineWidth, 0.5 * courtLength, courtWidth - 2 * lineWidth, constants.colors.insideLine, lineWidth)}
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
    ${circle(constants.backboard.thickness + 0.5 * constants.baskets.outerDiameter, constants.backboard.width / 2, basketRadius, 'none', color, basketThickness)}
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
    const offset = {x: 180, y: 20};
    const backboardZero = {x: offset.x, y: offset.y + constants.backboard.height}; // bottom left coordinate
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

    const markerOffsetXFrom = moveY(backboardZero, firstDimensionOffset);
    const markerOffsetXTo = moveX(markerOffsetXFrom, constants.markers.offset);
    const dimensionMarkerOffsetX = createDimension({
        from: markerOffsetXFrom,
        to: markerOffsetXTo,
        labelSide: LabelSide.bottom,
    });

    const markerWidthTo = moveX(markerOffsetXTo, constants.markers.width);
    const dimensionMarkerWidth = createDimension({
        from: markerOffsetXTo,
        to: markerWidthTo,
        labelSide: LabelSide.bottom,
        startLine: false,
    });

    const markerOffsetYFrom = moveX(backboardZero, -firstDimensionOffset);
    const markerOffsetYTo = moveY(markerOffsetYFrom, -constants.markers.offset);
    const dimensionMarkerOffsetY = createDimension({
        from: markerOffsetYFrom,
        to: markerOffsetYTo,
        labelSide: LabelSide.left,
    });

    const markerHeightTo = moveY(markerOffsetYTo, -constants.markers.width);
    const dimensionMarkerHeight = createDimension({
        from: markerOffsetYTo,
        to: markerHeightTo,
        labelSide: LabelSide.left,
        startLine: false,
    });

    const basketZero = moveX(backboardZero, (constants.backboard.width - constants.baskets.outerDiameter) / 2);
    const basketWidthFrom = moveY(basketZero, firstDimensionOffset);
    const basketWidthTo = moveX(basketWidthFrom, constants.baskets.outerDiameter);
    const dimensionBasketWidth = createDimension({
        from: basketWidthFrom,
        to: basketWidthTo,
        labelSide: LabelSide.bottom,
    });

    const basketHeightFrom = moveX(basketZero, -firstDimensionOffset);
    const basketHeightTo = moveY(basketHeightFrom, -constants.baskets.height);
    const dimensionBasketHeight = createDimension({
        from: basketHeightFrom,
        to: basketHeightTo,
        labelSide: LabelSide.left,
    });

    const backboardWidthFrom = moveY(backboardZero, secondDimensionOffsetY);
    const backboardWidthTo = moveX(backboardWidthFrom, constants.backboard.width);
    const dimensionBackboardWidth = createDimension({
        from: backboardWidthFrom,
        to: backboardWidthTo,
        labelSide: LabelSide.bottom,
    });

    const backboardHeightFrom = moveX(backboardZero, -secondDimensionOffsetX);
    const backboardHeightTo = moveY(backboardHeightFrom, -constants.backboard.height);
    const dimensionBackboardHeight = createDimension({
        from: backboardHeightFrom,
        to: backboardHeightTo,
        labelSide: LabelSide.left,
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



const courtTop = (offsetX, offsetY) => {
    const courtOffsetX = (totalLength - courtLength) / 2;
    const courtOffsetY = (totalWidth - courtWidth) / 2;

    return `<g transform="translate(${offsetX}, ${offsetY})">
        ${competitionArea(wallThickness, wallThickness)}
        ${walls(0, 0)}
        ${playArea((totalLength - playAreaLength) / 2, (totalWidth - playAreaWidth) / 2)}
        ${court(courtOffsetX, courtOffsetY)}
        ${basketTop(courtOffsetX - constants.backboard.thickness, (totalWidth - constants.backboard.width) / 2, 0, constants.colors.basket1)}
        ${basketTop(courtOffsetX + courtLength + constants.backboard.thickness, (totalWidth + constants.backboard.width) / 2, 180, constants.colors.basket2)}
        </g>`;
}

const courtTopWithDimensions = () => {
    const offset = {x: 900, y: 0};
    const competitionAreaZero = {
        x: offset.x + wallThickness,
        y: offset.y + wallThickness + competitionAreaWidth
    }; // bottom left coordinate
    const playAreaZero = moveXY(
        competitionAreaZero,
        {x: (competitionAreaLength - playAreaLength) / 2, y: -(competitionAreaWidth - playAreaWidth) / 2}
        );
    const courtZero = moveXY(
        playAreaZero,
        {x: (playAreaLength - courtLength) / 2, y: -(playAreaWidth - courtWidth) / 2}
    );
    const labelSize = 240;

    const createDimension = ({from, to, labelSide, lineColor = dimensionLineColor, labelColor = dimensionTextColor, startLine = true}) => {
        const length = Math.sqrt(Math.pow(to.y - from.y, 2) + Math.pow(to.x - from.x, 2));
        return dimension({
            from,
            to,
            lineColor,
            labelColor,
            label: length,
            labelSize,
            labelSide,
            lineWidth: 20,
            width: 100,
            startLine
        });
    };

    const competitionAreaLengthFrom = moveY(competitionAreaZero, 160);
    const competitionAreaLengthTo = moveX(competitionAreaLengthFrom, competitionAreaLength);
    const dimensionCompetitionAreaLength = createDimension({
        from: competitionAreaLengthFrom,
        to: competitionAreaLengthTo,
        labelSide: LabelSide.bottom,
    });

    const competitionAreaWidthFrom = moveX(competitionAreaZero, -160);
    const competitionAreaWidthTo = moveY(competitionAreaWidthFrom, -competitionAreaWidth);
    const dimensionCompetitionAreaWidth = createDimension({
        from: competitionAreaWidthFrom,
        to: competitionAreaWidthTo,
        labelSide: LabelSide.left,
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

    const playAreaWidthFrom = moveX(playAreaZero, -160);
    const playAreaWidthTo = moveY(playAreaWidthFrom, -playAreaWidth);
    const dimensionPlayAreaWidth = createDimension({
        from: playAreaWidthFrom,
        to: playAreaWidthTo,
        labelSide: LabelSide.left,
        lineColor: dimensionLineColorLight,
        labelColor: dimensionTextColorLight,
    });

    const courtLengthFrom = moveY(courtZero, 80);
    const courtLengthTo = moveX(courtLengthFrom, courtLength);
    const dimensionCourtLength = createDimension({
        from: courtLengthFrom,
        to: courtLengthTo,
        labelSide: LabelSide.bottom,
    });

    const courtWidthFrom = moveX(courtZero, -80);
    const courtWidthTo = moveY(courtWidthFrom, -courtWidth);
    const dimensionCourtWidth = createDimension({
        from: courtWidthFrom,
        to: courtWidthTo,
        labelSide: LabelSide.left,
    });

    return `<g>
        ${courtTop(offset.x, offset.y)}
        <g>
        ${dimensionCompetitionAreaLength}
        ${dimensionCompetitionAreaWidth}
        ${dimensionPlayAreaLength}
        ${dimensionPlayAreaWidth}
        ${dimensionCourtLength}
        ${dimensionCourtWidth}
        </g>
        </g>`;
}

const courtSVG = toSVG(courtTop(), totalLength, totalWidth);
const courtWithDimensionsSVG = toSVG(courtTopWithDimensions(), totalLength + 900, totalWidth + 500);
const basket1FrontSVG = toSVG(basketFront(0, 0, constants.colors.basket1, constants.markers.basket1IDs), constants.backboard.width, constants.backboard.height);
const basket2FrontSVG = toSVG(basketFront(0, 0, constants.colors.basket2, constants.markers.basket2IDs), constants.backboard.width, constants.backboard.height);
const basket1FrontWithDimensionsSVG = toSVG(basketFrontWithDimensions(constants.colors.basket1, constants.markers.basket1IDs), constants.backboard.width + 200, constants.backboard.height + 180);
const basket2FrontWithDimensionsSVG = toSVG(basketFrontWithDimensions(constants.colors.basket2, constants.markers.basket1IDs), constants.backboard.width + 200, constants.backboard.height + 180);
const markerBasket1LeftSVG = toSVG(basketMarker(constants.markers.basket1IDs[0], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);
const markerBasket1RightSVG = toSVG(basketMarker(constants.markers.basket1IDs[1], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);
const markerBasket2LeftSVG = toSVG(basketMarker(constants.markers.basket2IDs[0], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);
const markerBasket2RightSVG = toSVG(basketMarker(constants.markers.basket2IDs[1], markerWidth, markerHeight, 0, 0), markerWidth, markerHeight);


fs.writeFileSync('competition_area_top.svg', courtSVG);
fs.writeFileSync('competition_area_top_with_dimensions.svg', courtWithDimensionsSVG);
fs.writeFileSync('basket_1_front.svg', basket1FrontSVG);
fs.writeFileSync('basket_2_front.svg', basket2FrontSVG);
fs.writeFileSync('basket_1_front_with_dimensions.svg', basket1FrontWithDimensionsSVG);
fs.writeFileSync('basket_2_front_with_dimensions.svg', basket2FrontWithDimensionsSVG);
fs.writeFileSync('marker_basket_1_left.svg', markerBasket1LeftSVG);
fs.writeFileSync('marker_basket_1_right.svg', markerBasket1RightSVG);
fs.writeFileSync('marker_basket_2_left.svg', markerBasket2LeftSVG);
fs.writeFileSync('marker_basket_2_right.svg', markerBasket2RightSVG);
