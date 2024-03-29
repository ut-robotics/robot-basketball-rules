export default {
    court: {
        length: 4600,
        width: 3100,
        lineWidth: 50,
    },
    playArea: {
        length: 6100,
        width: 4000,
    },
    competitionArea: {
        length: 7800,
        width: 5000,
        lengthMinPadding: 200,
        widthMinPadding: 200,
    },
    freeThrow: {
        fromBasket: 1300
    },
    baskets: {
        innerDiameter: 148,
        outerDiameter: 160,
        height: 500,
    },
    backboard: {
        height: 800,
        width: 660,
        thickness: 16,
    },
    markers: {
        width: 160,
        height: 160,
        offset: 20,
        basket1IDs: [11, 12],
        basket2IDs: [21, 22],
    },
    walls: {
        height: 450,
        thickness: 20,
    },
    colors: {
        court: 'darkorange',
        insideLine: 'white',
        outsideLine: 'black',
        outsideCourt: 'black',
        basket1: 'rgb(188, 64, 119)', // RAL 4010
        basket2: 'rgb(0,124,176)', // RAL 5015
        backboard: 'white',
        walls: 'rgb(200, 200, 200)',
    },
    translations: {
        competitionArea: {
            en: 'Competition area',
            et: 'Võistlusala',
        },
        playArea: {
            en: 'Playing area',
            et: 'Mänguala',
        },
        court: {
            en: 'Playing court',
            et: 'Mänguväljak',
        },
        ballLocationBeforeFreeThrow: {
            en: 'Ball location before free throw',
            et: 'Palli asukoht enne vabaviset',
        },
    }
}