import {lob} from "./LOB";
import {Accounts} from "./Accounts";
import {handleUnknownEthereumError} from "./ErrorHandling";
import {formatDate} from "./utils";

const xScale = 100;
const yScale = 100;


function pixelRatio() {
    return window.devicePixelRatio || 1;
}

function xCoord(x) {
    return (x * xScale + 20) * pixelRatio();
}
function yCoord(y) {
    return (y * yScale + 120) * pixelRatio();
}

function drawPoint(context, x, y, radius) {
    context.beginPath();
    context.arc(xCoord(x), yCoord(y), radius * pixelRatio(), 0, 2 * Math.PI);
    context.fill();
}

function drawText(context, x, y, text, pos = 'above', angle = 0) {
    let offsetX = 0;
    let offsetY = 0;
    if (pos === 'right') {
        context.textAlign = 'left';
        offsetY = 0.05 * xScale;
        offsetX = 0.05 * yScale;
    } else if (pos === 'above') {
        context.textAlign = 'center';
        offsetY = -0.04 * yScale;
    } else {
        throw 'Unknown position specifier';
    }
    offsetX *= pixelRatio();
    offsetY *= pixelRatio();

    context.save();
    context.translate(xCoord(x) + offsetX, yCoord(y) + offsetY);
    context.rotate(angle);
    context.fillText(text, 0, 0);
    context.restore();
}

function drawBezierPath(context, fromX, fromY, toX, toY, label = "", arrowTip = false) {
    // Approximate the bezier path as a line with 0.55 (magic number) of the original x difference
    const angle = Math.atan2((toY - fromY), (toX - fromX) * 0.55);
    if (label) {
        if (fromY === toY) {
            drawText(context, (fromX + toX) / 2, (fromY + toY) / 2, label);
        } else {
            drawText(context, (fromX + toX) / 2, (fromY + toY) / 2, label, 'above', angle);
        }
    }

    fromX = xCoord(fromX);
    fromY = yCoord(fromY);
    toX = xCoord(toX);
    toY = yCoord(toY);

    // Interpolation coordinates for steeper or shallower curves
    const i1 = 0.5;
    const i2 = 0.5;

    context.beginPath();
    context.moveTo(fromX, fromY);
    context.bezierCurveTo(
        i1 * fromX + (1 - i1) * toX, fromY,
        i2 * fromX + (1 - i2) * toX, toY,
        toX, toY);
    context.stroke();

    if (arrowTip) {
        const arrowSizeX = 0.1 * xScale;
        const arrowSizeY = 0.06 * yScale;

        context.beginPath();
        context.moveTo(toX - arrowSizeX, toY - arrowSizeY);
        context.lineTo(toX, toY);
        context.lineTo(toX - arrowSizeX, toY + arrowSizeY);
        context.fill();
    }
}

function adjustCanvasForHiResDisplays(canvas, font, fontSize, canvasHeight, canvasWidth) {
    canvas.width = canvasWidth * pixelRatio();
    canvas.height = canvasHeight * pixelRatio();
    $(canvas).css('width', canvasWidth);
    $(canvas).css('height', canvasHeight);
    // canvas.getContext('2d').scale(pixelRatio(), pixelRatio());

    canvas.getContext('2d').font = fontSize * pixelRatio() + "px " + font;
}

function computeRelevantAddresses(snapshots, transfers, initiallyRelevantAccounts) {
    const relevantAddresses = {};
    relevantAddresses[snapshots.length] = new Set(initiallyRelevantAccounts);

    for (let t = snapshots.length - 1; t >= 0; t--) {
        const transfer = transfers[t];
        relevantAddresses[t] = new Set(relevantAddresses[t+1]);
        if (relevantAddresses[t+1].has(transfer.args.to)) {
            relevantAddresses[t].add(transfer.args.from);
        }
    }

    return relevantAddresses;
}

function setColor(context, color) {
    context.strokeStyle = color;
    context.fillStyle = color;
}

let addressRows;
let nextFreeRow = 1;

function getAddressRow(address) {
    if (typeof addressRows[address] === 'undefined') {
        addressRows[address] = nextFreeRow;
        nextFreeRow++;
    }
    return addressRows[address];
}

const __blockDates = {};
function getBlockDate(blockNumber) {
    if (__blockDates[blockNumber] === undefined) {
        __blockDates[blockNumber] = new ReactiveVar(null);
    }
    web3.eth.getBlock(blockNumber, (error, block) => {
        if (error) { handleUnknownEthereumError(error); return; }
        __blockDates[blockNumber].set(block.timestamp);
    });
    return __blockDates[blockNumber].get();
}

export function drawLicenseHistory(canvas, transfers, issuanceLocation, issuerName, initialOwnerName) {
    addressRows = {
        "0x0000000000000000000000000000000000000000": 0
    };
    nextFreeRow = 1;

    const snapshots = lob.computeBalanceSnapshots(transfers, issuanceLocation);
    const initialOwnerAddress = transfers[0].args.to;

    const relevantAddresses = computeRelevantAddresses(snapshots, transfers, Accounts.get());

    const height = Object.keys(snapshots[snapshots.length - 1].balances).length * yScale + 200;
    const width = snapshots.length * xScale + 800;
    adjustCanvasForHiResDisplays(canvas, 'Helvetica', 15, height, width);

    const context = canvas.getContext('2d');
    context.lineWidth = 1 * pixelRatio();
    let black = '#000000';
    let grey = '#888888';

    for (let t = 0; t < snapshots.length; t++) {
        const snapshot = snapshots[t].balances;

        for (const [address, balance] of Object.entries(snapshot)) {
            const {from, to, amount} = transfers[t].args;

            // Continue existing lines not affected by transfer
            if (balance > 0) {
                if (t > 0 && snapshots[t - 1].balances[address] > 0) {
                    setColor(context, relevantAddresses[t + 1].has(address) ? black : grey);
                    const hasArrow = t === snapshots.length - 1; // Draw arrow at end of line
                    drawBezierPath(context, t, getAddressRow(address), t + 1, getAddressRow(address), "", hasArrow);
                }
            }

            setColor(context, relevantAddresses[t + 1].has(to) || relevantAddresses[t].has(from) ? black : grey);
            drawBezierPath(context, t, getAddressRow(from), t + 1, getAddressRow(to), amount, true);
            drawPoint(context, t + 1, getAddressRow(to), 0.02 * yScale);
            Tracker.autorun(() => {
                const timestamp = getBlockDate(snapshots[t].blockNumber);
                if (timestamp !== null) {
                    drawText(context, t + 0.4, -0.2, formatDate(new Date(timestamp * 1000)), 'right', -Math.PI * 0.3);
                }
            });
        }
    }

    setColor(context, black);

    const licenseContractAddress = transfers[0].address;

    drawText(context, snapshots.length + 1, 0, issuerName, 'right');
    drawText(context, snapshots.length + 1, 0.2, "(" + TAPi18n.__("licenseHistory.license_contract") + ": " + licenseContractAddress + ")", 'right');

    // Draw final balances and addresses
    for (const [address, balance] of Object.entries(snapshots[snapshots.length - 1].balances)) {
        if (balance > 0) {
            drawText(context, snapshots.length + 0.1, getAddressRow(address), balance, 'right');
        }
        drawText(context, snapshots.length + 1, getAddressRow(address), address, 'right');

        let addressDescriptions = [];
        if (address === initialOwnerAddress) {
            addressDescriptions.push(initialOwnerName);
        }
        if (Accounts.get().indexOf(address) !== -1) {
            addressDescriptions.push(TAPi18n.__("licenseHistory.your_address"));
        }
        if (addressDescriptions.length > 0) {
            const description = "(" + addressDescriptions.join(", ") + ")";
            drawText(context, snapshots.length + 1, getAddressRow(address) + 0.2, description, 'right');
        }
    }
}