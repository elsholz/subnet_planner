let canvas = document.getElementById("canvas")
let blocks = document.getElementById("blocks")
let grid = document.getElementById("grid")
let table = document.getElementById("table")
let networkMask = document.getElementById("networkmask")
let occupancy = "0".repeat(256)
let mouse_move_timeout = null

const blockSizeSelect = document.getElementById("scaleselect")
const networkInput = document.getElementById("networkinput")
const fileFormatSelect = document.getElementById("formatselect")
const dataTextField = document.getElementById("datatextfield")
const displayWhichToggle = document.getElementById("displaywhichtoggle")

let network = networkInput.value
let subnets = {}

const blockSizeMapping = {
    "/24": {
        24: "/24",
        23: "/23",
        22: "/22",
        21: "/21",
        20: "/20",
        19: "/19",
        18: "/18",
    },
    "/32": {
        24: "/32",
        23: "/31",
        22: "/30",
        21: "/29",
        20: "/28",
        19: "/27",
        18: "/26",
    }
}

function inputData() {
    let format = fileFormatSelect.value
    try {
        if (format === "json") {
            let output = {}
            let data = JSON.parse(dataTextField.value)
            for (let [k, v] of Object.entries(data)) {
                let mask = parseInt(v.mask.slice(1,)) - (isClassC() ? 0 : 8)
                let addr = parseInt(k.split(".")[isClassC() ? 2 : 3])
                if (addr % 2 ** (24 - mask)) {
                    throw "Invalid address for mask"
                }
                output[addr] = {
                    mask: mask,
                    description: v.description
                }
            }
            subnets = output

            renderBlocks()
        }
        unsetTextfieldError()
        return
    } catch (e) {
        setTextfieldError()
        console.log(e)
        return
    }
    alert("This format is currently not supported for input.")
}

function getBlockDisplay(blk) {
    if (displayWhichToggle.checked) {
        let res = subnets[blk.getAttribute("block_begins_at")].description
        return res
    }
    return getSlashNotation(subnets[blk.getAttribute("block_begins_at")].mask)
}

function toggleAddrVisibility() {
    for (let addr of document.getElementsByClassName("addr")) {
        let op = parseFloat(addr.style.opacity)
        addr.style.opacity = op === 0 ? 1 : op == 0.5 ? 0 : 0.5
    }
}

function changeDisplayWhich() {
    let displayDescription = displayWhichToggle.checked === true
    changeBlockSize()
}

function getSlashNotation(cidr) {
    return blockSizeMapping[blockSizeSelect.value][cidr]
}

function setTextfieldError() {
    if (!dataTextField.classList.contains("error"))
        dataTextField.classList.toggle("error")
}
function unsetTextfieldError() {
    if (dataTextField.classList.contains("error"))
        dataTextField.classList.toggle("error")
}

function outputData() {
    let format = fileFormatSelect.value
    if (format === "json") {
        let data = {}
        for (let [k, v] of Object.entries(subnets)) {
            // data[networkBaseString + k + (isClassC() ? ".0" : "") + subnets[k].mask] = subnets[k].name || ""
            data[networkBaseString + k + (isClassC() ? ".0" : "")] = {
                mask: getSlashNotation(subnets[k].mask),
                description: subnets[k].description,
            }
        }
        dataTextField.value = JSON.stringify(data, false, 4)
        unsetTextfieldError()
        return
    } else if (format === "csv") {

    } else if (format === "scsv") {

    }
    alert(`Cannot ourput data in format "${format}", please choose another format.`)
}

outputData()

function reset() {
    let conf = confirm("Do you really want to reset the canvas?")
    if (conf) {
        occupancy = "0".repeat(256)
        while (blocks.firstChild) {
            blocks.removeChild(blocks.lastChild)
        }
        subnets = {}
        outputData()
    }
}

function blockFits(num_blocks) {
    console.log("Num Blocks for fit:", num_blocks, occupancy.length)
    let block_width = num_blocks
    let fitsAt = new Array()

    for (let i = 0; i < 256 / num_blocks; i++) {
        let block_begins_at = block_width * i
        let occ = occupancy.substring(block_begins_at, block_begins_at + block_width)
        if (occ === "0".repeat(block_width))
            fitsAt.push(block_begins_at)
        else
            continue
    }
    return fitsAt
}

function insertBlock(num_blocks, at) {
    occupancy = occupancy.substring(0, at) + "1".repeat(num_blocks) + occupancy.substring(at + num_blocks, 256)
}

function renderBlocks() {
    blocks.innerHTML = ''
    occupancy = "0".repeat(257)
    for (let [at, v] of Object.entries(subnets)) {
        at = parseInt(at)
        let copy = templateBlocks[v.mask].cloneNode(true)
        let num_blocks = 2 ** (24 - v.mask)
        // console.log(at, v.mask, num_blocks)
        insertBlock(num_blocks, at)
        copy.style.left = (at % 16) * 50 + "px"
        copy.style.top = Math.floor(at / 16) * 50 + "px"
        copy.classList += " cursorDrag"
        copy.setAttribute("block_begins_at", at)
        copy.textContent = getBlockDisplay(copy)
        // makeBlockDraggable(copy)

        blocks.appendChild(copy)
    }
}

let templateBlocks = {

}

for (let i = 0; i <= 6; i++) {
    let mask = [24, 23, 22, 21, 20, 19, 18][i]
    let num_blocks = 2 ** (24 - mask)

    let square = document.createElement("div")
    square.classList = `square sq${mask} unselectable`

    square.textContent = blockSizeMapping[blockSizeSelect.value][mask]
    table.appendChild(square)

    templateBlocks[mask] = square

    square.onclick = function (e) {
        let availableFits = blockFits(num_blocks)
        console.log("available fits:", availableFits)

        if (availableFits.length !== 0) {
            let at = availableFits[0]
            subnets[at.toString()] = { mask: mask, description: "n/a" }

            renderBlocks()
            outputData()
        } else
            alert("No free space found!")
    }
}

function makeBlockDraggable(block) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0

    let offsetTop = null
    let offsetLeft = null

    block.onmousedown = dragMouseDown

    function dragMouseDown(e) {
        offsetTop = block.offsetTop
        offsetLeft = block.offsetLeft
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        offsetTop = (offsetTop - pos2);
        offsetLeft = (offsetLeft - pos1);
        block.style.top = Math.floor(offsetTop / 50 + 0.5) * 50 + "px"
        block.style.left = Math.floor(offsetLeft / 50 + 0.5) * 50 + "px"
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// add subnet addresses to grid
for (let x = 0; x < 16; x++)
    for (let y = 0; y < 16; y++) {
        let addr = document.createElement("div")
        addr.classList = `addr unselectable`
        addr.innerHTML = `.${x * 16 + y}`
        addr.style.top = y * 50 + " px"
        addr.style.left = x * 50 + " px"
        grid.appendChild(addr)
    }

document.addEventListener('keydown', (e) => {
    if (e.key === "Shift") {
        let blocks = document.getElementById("blocks").children
        for (let b of blocks) {
            b.classList.toggle("cursorRemove")
            b.classList.toggle("cursorDrag")
        }
    }
})
document.addEventListener('keyup', (e) => {
    if (e.key === "Shift") {
        let blocks = document.getElementById("blocks").children
        for (let b of blocks) {
            b.classList.toggle("cursorRemove")
            b.classList.toggle("cursorDrag")
        }
    }
})

function isClassC() {
    return blockSizeSelect.value === "/24"
}

function changeNetwork() {
    networkMask.innerText = isClassC() ? "/16" : "/24"
    network = networkInput.value
    networkBaseString = network.split(".").slice(0, isClassC() ? 2 : 3).join(".") + "."
    outputData()
}

changeNetwork()

function changeBlockSize() {
    for (let cidr of [24, 23, 22, 21, 20, 19, 18]) {
        let blocks = document.getElementsByClassName("sq" + cidr)
        for (let blk of blocks) {
            blk.textContent = getSlashNotation(cidr)
        }
    }

    for (let blk of blocks.childNodes) {
        blk.innerText = getBlockDisplay(blk)
    }

    changeNetwork()
    outputData()
}        
