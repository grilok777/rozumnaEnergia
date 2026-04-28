import { type AppNode, isHeatPump, isTankNode, isHouseNode, type HouseNodeData, type TankNodeData } from '../types/types';

export interface ChartDataPoint {
    time: number;
    vWater: number;
    qSource: number;
    qWaterHeating: number;
    deltaQTank: number;

    qPipeLoss: number;
    qTankLoss: number;

    tTank: number;
    tPipeOut: number;

    sourceOn: 0 | 1;
    cop: number;
}

const copTable = [
    [0,  -25,  -15,  -7,   -5,   0,    2,    7,    12,   20], // tOutside
    [30, 1.60, 1.85, 2.10, 2.20, 2.36, 2.55, 2.90, 3.20, 3.80],
    [35, 1.50, 1.75, 2.00, 2.10, 2.26, 2.45, 2.80, 3.10, 3.65],
    [45, 1.30, 1.50, 1.70, 1.80, 1.95, 2.10, 2.40, 2.70, 3.20],
    [55, 1.10, 1.25, 1.40, 1.45, 1.55, 1.70, 1.90, 2.15, 2.50],
];

/**
 * Функція отримання COP для будь-яких температур
 * @param tW - поточна температура води в баку
 * @param tO - поточна температура зовні
 * @param copTable - таблиця COP
 */
export const getCOP = (tW: number, tO: number, copTable: number[][]): number => {
    const tOutsides = copTable[0].slice(1);
    const tWaters = copTable.slice(1).map(row => row[0]);

    // 1. Обмежуємо вхідні дані межами таблиці (щоб не було помилок)
    const currentTW = Math.max(tWaters[0], Math.min(tWaters[tWaters.length - 1], tW));
    const currentTO = Math.max(tOutsides[0], Math.min(tOutsides[tOutsides.length - 1], tO));

    // 2. Знаходимо індекси найближчих значень (m1 та m2)
    const findNeighbors = (val: number, arr: number[]) => {
        for (let i = 0; i < arr.length - 1; i++) {
            if (val <= arr[i + 1]) return { idx1: i, idx2: i + 1 };
        }
        return { idx1: arr.length - 2, idx2: arr.length - 1 };
    };

    const nO = findNeighbors(currentTO, tOutsides);
    const nW = findNeighbors(currentTW, tWaters);

    // 3. Отримуємо 4 опорні точки (прямокутник навколо цільового значення)
    const q11 = copTable[nW.idx1 + 1][nO.idx1 + 1]; // [tW1, tO1]
    const q12 = copTable[nW.idx1 + 1][nO.idx2 + 1]; // [tW1, tO2]
    const q21 = copTable[nW.idx2 + 1][nO.idx1 + 1]; // [tW2, tO1]
    const q22 = copTable[nW.idx2 + 1][nO.idx2 + 1]; // [tW2, tO2]

    // 4. Лінійна інтерполяція по осі tOutside (горизонтальна)
    const interpolate = (x: number, x1: number, x2: number, y1: number, y2: number) =>
        y1 + (x - x1) * (y2 - y1) / (x2 - x1);

    const copAtTW1 = interpolate(currentTO, tOutsides[nO.idx1], tOutsides[nO.idx2], q11, q12);
    const copAtTW2 = interpolate(currentTO, tOutsides[nO.idx1], tOutsides[nO.idx2], q21, q22);

    // 5. Фінальна інтерполяція по осі tWater (вертикальна)
    return interpolate(currentTW, tWaters[nW.idx1], tWaters[nW.idx2], copAtTW1, copAtTW2);
};

const CP_WATER = 4.187; // кДж/(кг·°C)
const RHO_WATER = 1000;  // кг/м3
const SIGMA = 5.67e-8;   // Постійна Стефана-Больцмана



export const runSimulation = ( house: AppNode, tankNode: AppNode, heatPump: AppNode, totalTime: number, deltaTime: number): ChartDataPoint[] => {

    console.error("start data", {
        heatPump,
        tankNode,
        house
    });

    if (!heatPump || !tankNode || !house) {
        console.error("Simulation error: missing required nodes", {
            heatPump,
            tankNode,
            house
        });
        throw new Error("Simulation error: missing required nodes");
    }

    let time: number = 0; // Початковий час годин
    let sourceEnabled: boolean = true;
    let vWaterTotal: number = 0;

    const result: ChartDataPoint[] = [];

    const {
        lPipe, dOutPipe, sWallPipe, kThermalPipe, epsilonPipe,
        vFlowPipe, tBasement, tWaterCold, tOutside
    } = house.data as HouseNodeData;

    const {
        vTank, kLostTank, deltaMax, deltaMin, tWaterNorm
    } = tankNode.data as TankNodeData;

    const {
        qCop235, cop235, electricPower
    } = (heatPump.data.pumpParams as { qCop235: number; cop235: number; electricPower: number });

    console.log({ qCop235, cop235, electricPower });

    let tTankWater: number = tWaterNorm;

    const dIn: number = dOutPipe - 2 * sWallPipe;


    let qSource: number = 0;
    let deltaVWater: number = 0;

    while (time <= totalTime) {
        console.log(`\n================ TIME: ${time.toFixed(1)}s ================`);

        console.log("STATE:");
        console.log({
            tOutside,
            tTankWater: tTankWater.toFixed(2),
            tBasement,
            sourceEnabled,
        });

        // ============================================
        // 1. ОБЧИСЛЕННЯ КІЛЬКОСТІ ТЕПЛОТИ, ЩО ВИРОБЛЯЄТЬСЯ ДЖЕРЕЛОМ (Q source)
        // ============================================

        let cop: number = getCOP(tOutside, tTankWater, copTable);

        if (sourceEnabled ) {
            qSource = (qCop235 / cop235) * cop * deltaTime; // Фактична теплова потужність теплового насоса (кВт) за поточних умов (T_i). Це та кількість тепла, яку пристрій реально видає в систему в даний момент.
        } else {
            qSource = 0;
        }


        // ============================================
        // 2. ВИТРАТИ ВОДИ ЗА ЧАС ΔT (ΔVwater)
        // ============================================

        // let qWaterHeating =
        //     flowRate * RHO_WATER *          // kg/s
        //     CP_WATER *                    // теплоємність
        //     (tTankWater - tWaterCold);
        let qWaterHeating: number =
            vFlowPipe * (tTankWater - tWaterCold) * CP_WATER * deltaTime; // кількості теплоти необхідне для нагріву V water води від tWaterCold до tTankWater за час ΔT

        deltaVWater = vFlowPipe * deltaTime;

        vWaterTotal = vFlowPipe * deltaTime * time;

        // console.log("WATER:");
        // console.log({
        //     vFlowPipe: vFlowPipe.toFixed(4),
        //     qWaterHeating: qWaterHeating.toFixed(2),
        //     deltaVWater: deltaVWater.toFixed(4),
        //     vWaterTotal: vWaterTotal.toFixed(4),
        // });

        // ============================================
        // 3. ОБЧИСЛЕННЯ ВТРАТ КІЛЬКОСТІ ТЕПЛОТИ БАКОМ (Q tank lost)
        // ============================================
        const qTankLoss: number = (tTankWater - tOutside) * kLostTank * deltaTime;

        // Діаметр внутрішній труби (d in) для обчислення гідравлічного радіуса та інших параметрів

        // Кінематична в'язкість води обчислюється за формулою
        const nuWater: number = 1.78e-6 / (1 + 0.0337 * tTankWater + 0.000221 * Math.pow(tTankWater, 2));


        // ============================================
        // 4. ОБЧИСЛЕННЯ ВТРАТ КІЛЬКОСТІ ТЕПЛОТИ ЦИРКУЛЯЦІЙНОЮ ТРУБОЮ (Q pipe lost)
        // ============================================

        // температуропровідність води
        const alphaWater: number = 1.32e-7 * (1 + 0.003 * tTankWater);

        // Число Прандтля для води (Pr water)
        const pr: number = nuWater / alphaWater;

        // Re water – число Рейнольдса для води, що рухається;
        const re: number = (vFlowPipe * dIn) / nuWater;

        // Nu water – критерій Нуссельта;
        const nusselt: number = 0.023 * Math.pow(re, 0.8) * Math.pow(pr, 0.4);

        const alphaIn: number = nusselt * 0.665 / dIn;
        const rIn: number = 1 / (alphaIn * Math.PI * dIn * lPipe);


        // R теплового опору труби (R thermal pipe)
        const rThr: number = Math.log(dOutPipe / dIn) / (kThermalPipe * 2 * Math.PI * lPipe);

        // need more research
        const qRad: number = epsilonPipe * SIGMA * (Math.pow(273 + tBasement, 4) - Math.pow(273 + tOutside, 4));
        const alphaRad: number = qRad / (tTankWater - tBasement || 1);

        // коефіцієнта конвективної тепловіддачі з зовнішнього боку труби (alpha out)
        const nuAir: number = 1.48e-5 / (1 + 0.003 * tOutside + 0.000221 * tOutside ** 2);
        // теплопровідність повітря (lambda air)
        const lambdaAir: number = 0.0257 * (1 + 0.003 * tOutside + 0.000221 * tOutside ** 2);

        const alphaOut: number = (nuAir * lambdaAir) / dOutPipe;

        // Конвективний та променистий теплообміни між твердою циліндричною стінкою труби та навколишнім повітрям
        const rOut: number = 1 / ((alphaOut + alphaRad) * Math.PI * dOutPipe * lPipe);


        // R тотальний = R внутрішній + R теплового опору труби + R зовнішній
        const rTotal: number = rIn + rThr + rOut;


        // Обчислення втрат кількості теплоти циркуляційною трубою (Q pipe lost)
        const qPipeLoss: number = ((tTankWater - tBasement) / rTotal) * deltaTime;


        // console.log("LOSSES:");

        // console.log({
        //     qTankLoss: qTankLoss.toFixed(2),
        //     qPipeLoss: qPipeLoss.toFixed(2),
        //     rTotal,
        // });

        // ============================================
        // ОБЧИСЛЕННЯ ТЕМПЕРАТУРИ НА ВИХОДІ ЦИРКУЛЯЦІЙНОЇ ТРУБИ (t pipe out)
        // ============================================

        // Обчислення температури на виході циркуляційної труби
        const tPipeOut: number = tTankWater - ((qPipeLoss / deltaTime) / (vFlowPipe * CP_WATER));



        // console.log("PIPE:");
        // console.log({
        //     tPipeOut: tPipeOut.toFixed(2),
        // });

        // ============================================
        // 9. КІЛЬКІСТЬ ТЕПЛОТИ, ЩО НАДХОДИТЬ У БАК (ΔQ tank)
        // ============================================
        let deltaQTank: number = 0;

        if (sourceEnabled) {
            // Джерело підключено
            deltaQTank = qSource - qWaterHeating - qTankLoss - qPipeLoss;
        } else {
            // Джерело НЕ підключено
            deltaQTank = - qWaterHeating - qTankLoss - qPipeLoss;
        }

        // console.log("ENERGY BALANCE:");
        // console.log({
        //     deltaQTank: deltaQTank.toFixed(2),
        //     newTankTemp: tTankWater.toFixed(2),
        // });
        // ============================================
        // 10. ОБЧИСЛЕННЯ ТЕМПЕРАТУРИ ВОДИ У БАКУ (t water tank)
        // ============================================
        tTankWater = tTankWater + deltaQTank / (CP_WATER * vTank);

        // ============================================
        // 11. ЛОГІКА КЕРУВАННЯ ДЖЕРЕЛОМ
        // ============================================
        console.log("CONTROL LOGIC:");
        console.log({
            tTankWater: tTankWater.toFixed(2),
            deltaMin: deltaMin.toFixed(2),
            deltaMax: deltaMax.toFixed(2),
            tWaterNorm: tWaterNorm.toFixed(2),
        });
        console.log((tTankWater < (tWaterNorm - deltaMin)));
        console.log((tTankWater > (tWaterNorm + deltaMax)));

        if (tTankWater < (tWaterNorm - deltaMin)) {
            sourceEnabled = true;   // Вимкнути джерело? Ні - увімкнути
            console.log("Контроль: температура в баку занизька, увімкнути джерело");
            console.log({
                tTankWater: tTankWater.toFixed(2),
                deltaMin: deltaMin.toFixed(2),
            });
        }
        if (tTankWater > (tWaterNorm + deltaMax)) {
            sourceEnabled = false;  // Увімкнути джерело? Ні - вимкнути
            console.log("Контроль: температура в баку завищена, вимкнути джерело");
            console.log({
                tTankWater: tTankWater.toFixed(2),
                deltaMax: deltaMax.toFixed(2),
            });
        }


        console.log("CONTROL:");
        console.log({
            sourceEnabled,
            qSource: qSource.toFixed(2),
            tTankWater: tTankWater.toFixed(2),
            deltaQTank: deltaQTank.toFixed(2),
        });

        // ============================================
        // 12. ЗБЕРЕЖЕННЯ РЕЗУЛЬТАТІВ (out.yout)
        // ============================================
        result.push({
            time,
            vWater: vWaterTotal, // Витрати води

            // qSource: sourceEnabled ? qSource : 0,
            qSource: qSource, // Джерело тепла
            qWaterHeating: qWaterHeating, // Нагрівання холодної води
            deltaQTank: deltaQTank, // Зміна кількості теплоти в баку(догрівання або охолодження)

            qPipeLoss: qPipeLoss,
            qTankLoss: qTankLoss,

            tTank: tTankWater,
            tPipeOut: tPipeOut,

            sourceOn: sourceEnabled ? 1 : 0,
            // cop: sourceEnabled ? cop : 0
            cop: cop,
        });

        // ============================================
        // 13. T = T + ΔT
        // ============================================
        time += deltaTime;
    }

    console.log(result);
    return result;
};


export const logSystemTree = (nodes: AppNode[], edges: any[]) => {
    const houses = nodes.filter(isHouseNode);

    console.log("\n🌲 СТРУКТУРА ТЕПЛОВОЇ МЕРЕЖІ:");
    console.log("================================\n");

    if (houses.length === 0) {
        console.log("  (Будинків не знайдено)");
        return;
    }

    houses.forEach((house, index) => {
        // Вивід Будинку
        console.log(`${index + 1}. 🏠 БУДИНОК: "${house.data.label}" (ID: ${house.id})`);
        console.log(`   └─ Параметри: Потік ${house.data.vFlowPipe} м/с, Труба ${house.data.lPipe} м`);

        // Пошук підключень
        const incomingEdges = edges.filter(e => e.target === house.id);

        if (incomingEdges.length === 0) {
            console.log("      ⚠️  НЕ ПІДКЛЮЧЕНО ДО ЖОДНОГО ДЖЕРЕЛА");
        }

        incomingEdges.forEach(edge => {
            const supplier = nodes.find(n => n.id === edge.source);

            if (supplier && isTankNode(supplier)) {
                // Вивід Бака
                console.log(`      ├── 🧊 БАК: "${supplier.data.label}"`);
                console.log(`      │   └─ Т-норма: ${supplier.data.tWaterNorm}°C, Об'єм: ${supplier.data.vTank}л`);

                // Пошук ТН для цього бака
                const sourceEdges = edges.filter(e => e.target === supplier.id);

                if (sourceEdges.length === 0) {
                    console.log("      │       ⚠️  БАК НЕ МАЄ ДЖЕРЕЛ НАГРІВУ");
                }

                sourceEdges.forEach((sEdge, sIdx) => {
                    const source = nodes.find(n => n.id === sEdge.source);
                    const isLastSource = sIdx === sourceEdges.length - 1;
                    const prefix = isLastSource ? "└──" : "├──";

                    if (source && isHeatPump(source)) {
                        // Вивід Теплового насоса
                        console.log(`      │       ${prefix} 🔥 ДЖЕРЕЛО: "${source.data.label}"`);
                        console.log(`      │           └─ Потужність: ${source.data.pumpParams.qCop235}кВт, COP: ${source.data.pumpParams.cop235}`);
                    }
                });
            } else if (supplier) {
                // Якщо будинок підключений напряму до чогось іншого (напр. ТН без бака)
                console.log(`      ├── ⚡ ПРЯМЕ ПІДКЛЮЧЕННЯ: "${supplier.data.label}" (${supplier.type})`);
            }
        });
        console.log(""); // Пропуск рядка між будинками
    });
    console.log("================================\n");
};
